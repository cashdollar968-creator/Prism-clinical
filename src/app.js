import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "https://esm.sh/react@18.3.1";

import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

import { db } from "./supabase.js";

import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Patients from "./pages/Patients.js";
import Patient from "./pages/Patient.js";
import SpecialistQueue from "./pages/SpecialistQueue.js";
import Administration from "./pages/Administration.js";

const h = React.createElement;


/* =========================================================
   APP
========================================================= */

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [page, setPage] = useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const [patients, setPatients] = useState([]);
  const [activeAdmissions, setActiveAdmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);

  const [sessionId, setSessionId] = useState(null);


  /* =======================================================
     PROFILE
  ======================================================= */

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile loading error:", error);
      setProfile(null);
      return null;
    }

    setProfile(data || null);

    return data || null;
  }, []);


  /* =======================================================
     ACTIVITY MONITORING
  ======================================================= */

  const recordActivity = useCallback(
    async (
      action,
      {
        entityType = null,
        entityId = null,
        patientId = null,
        route = null,
        metadata = {}
      } = {}
    ) => {
      if (!session?.user?.id) {
        return;
      }

      try {
        await db
          .from("activity_events")
          .insert({
            actor_id: session.user.id,
            session_id: sessionId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            patient_id: patientId,
            route,
            metadata
          });
      } catch (error) {
        console.error(
          "Activity recording error:",
          error
        );
      }
    },
    [session, sessionId]
  );


  /* =======================================================
     PRISM SESSION
  ======================================================= */

  const startPrismSession = useCallback(
    async (user, userProfile) => {
      if (!user?.id) {
        return null;
      }

      try {
        const { data, error } = await db
          .from("user_sessions")
          .insert({
            user_id: user.id,
            role_snapshot:
              userProfile?.role || "unknown",
            location_label: "Web",
            session_type: "web",
            user_agent: navigator.userAgent,
            metadata: {
              source: "PRISM"
            }
          })
          .select("id")
          .single();

        if (error) {
          console.error(
            "Session start error:",
            error
          );

          return null;
        }

        setSessionId(data?.id || null);

        return data?.id || null;
      } catch (error) {
        console.error(
          "Session start exception:",
          error
        );

        return null;
      }
    },
    []
  );


  const heartbeatSession = useCallback(
    async () => {
      if (!sessionId) {
        return;
      }

      try {
        await db
          .from("user_sessions")
          .update({
            last_seen_at:
              new Date().toISOString()
          })
          .eq("id", sessionId);
      } catch (error) {
        console.error(
          "Session heartbeat error:",
          error
        );
      }
    },
    [sessionId]
  );


  const endPrismSession = useCallback(
    async () => {
      if (!sessionId) {
        return;
      }

      try {
        await db
          .from("user_sessions")
          .update({
            ended_at:
              new Date().toISOString(),
            last_seen_at:
              new Date().toISOString()
          })
          .eq("id", sessionId);
      } catch (error) {
        console.error(
          "Session end error:",
          error
        );
      }

      setSessionId(null);
    },
    [sessionId]
  );


  /* =======================================================
     LOAD PATIENTS
  ======================================================= */

  const loadPatients = useCallback(
    async () => {
      setPatientsLoading(true);

      try {
        const {
          data: patientRows,
          error: patientError
        } = await db
          .from("patients")
          .select("*")
          .order("created_at", {
            ascending: false
          });

        if (patientError) {
          console.error(
            "Patients loading error:",
            patientError
          );

          setPatients([]);
          setActiveAdmissions([]);

          return;
        }

        const rows = patientRows || [];

        if (!rows.length) {
          setPatients([]);
          setActiveAdmissions([]);

          return;
        }

        const patientIds = rows.map(
          (patient) => patient.id
        );

        const {
          data: admissions,
          error: admissionError
        } = await db
          .from("admissions")
          .select("*")
          .in("patient_id", patientIds)
          .order("admission_datetime", {
            ascending: false
          });

        if (admissionError) {
          console.error(
            "Admissions loading error:",
            admissionError
          );
        }

        const admissionRows =
          admissions || [];


        /* -----------------------------------------------
           Build patient objects
        ------------------------------------------------ */

        const enrichedPatients =
          rows.map((patient) => {
            const patientAdmissions =
              admissionRows.filter(
                (admission) =>
                  admission.patient_id ===
                  patient.id
              );

            const activeAdmission =
              patientAdmissions.find(
                (admission) =>
                  admission.status ===
                  "active"
              ) || null;

            return {
              ...patient,

              admissions:
                patientAdmissions,

              activeAdmission
            };
          });


        setPatients(enrichedPatients);


        /* -----------------------------------------------
           Dashboard / Specialist compatible structure

           IMPORTANT:
           Dashboard expects:

           {
             patient,
             admission
           }

           so we deliberately create that structure.
        ------------------------------------------------ */

        setActiveAdmissions(
          enrichedPatients
            .filter(
              (patient) =>
                !!patient.activeAdmission
            )
            .map((patient) => ({
              patient,

              admission:
                patient.activeAdmission
            }))
        );
      } catch (error) {
        console.error(
          "Unexpected patients loading error:",
          error
        );

        setPatients([]);
        setActiveAdmissions([]);
      } finally {
        setPatientsLoading(false);
      }
    },
    []
  );


  /* =======================================================
     AUTH INITIALIZATION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      setLoading(true);

      try {
        const {
          data: {
            session: currentSession
          }
        } = await db.auth.getSession();

        if (!mounted) {
          return;
        }

        if (currentSession) {
          setSession(currentSession);

          const currentProfile =
            await loadProfile(
              currentSession.user.id
            );

          if (!mounted) {
            return;
          }

          await startPrismSession(
            currentSession.user,
            currentProfile
          );

          await loadPatients();
        } else {
          setSession(null);
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "Auth initialization error:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }


    initializeAuth();


    const {
      data: {
        subscription
      }
    } = db.auth.onAuthStateChange(
      async (
        event,
        newSession
      ) => {
        if (!mounted) {
          return;
        }

        if (
          event === "SIGNED_IN" &&
          newSession
        ) {
          setSession(newSession);

          const currentProfile =
            await loadProfile(
              newSession.user.id
            );

          await startPrismSession(
            newSession.user,
            currentProfile
          );

          await loadPatients();

          setPage("dashboard");
        }


        if (
          event === "SIGNED_OUT"
        ) {
          setSession(null);
          setProfile(null);

          setPatients([]);
          setActiveAdmissions([]);

          setSelectedPatientId(null);
          setSessionId(null);

          setPage("dashboard");
        }
      }
    );


    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [
    loadProfile,
    startPrismSession,
    loadPatients
  ]);


  /* =======================================================
     SESSION HEARTBEAT
  ======================================================= */

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    heartbeatSession();

    const interval =
      setInterval(
        heartbeatSession,
        60000
      );

    return () => {
      clearInterval(interval);
    };
  }, [
    sessionId,
    heartbeatSession
  ]);


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigate = useCallback(
    async (targetPage) => {
      setPage(targetPage);

      if (
        targetPage === "patients" ||
        targetPage === "dashboard"
      ) {
        await loadPatients();
      }
    },
    [loadPatients]
  );


  const openPatient = useCallback(
    async (patientOrId) => {
      const patientId =
        typeof patientOrId === "string"
          ? patientOrId
          : patientOrId?.id;

      if (!patientId) {
        console.error(
          "Cannot open patient: missing patient ID"
        );

        return;
      }

      setSelectedPatientId(patientId);

      setPage("patient");

      await recordActivity(
        "patient_opened",
        {
          entityType: "patient",
          entityId: patientId,
          patientId,
          route: "patient"
        }
      );
    },
    [recordActivity]
  );


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(
    async () => {
      try {
        await endPrismSession();

        await db.auth.signOut();

        setSession(null);
        setProfile(null);

        setPatients([]);
        setActiveAdmissions([]);

        setSelectedPatientId(null);
        setPage("dashboard");
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      }
    },
    [endPrismSession]
  );


  /* =======================================================
     LOGIN CALLBACK
  ======================================================= */

  const handleLogin =
    useCallback(
      async () => {
        const {
          data: {
            session: newSession
          }
        } =
          await db.auth.getSession();

        if (!newSession) {
          return;
        }

        setSession(newSession);

        const currentProfile =
          await loadProfile(
            newSession.user.id
          );

        await startPrismSession(
          newSession.user,
          currentProfile
        );

        await loadPatients();

        setPage("dashboard");
      },
      [
        loadProfile,
        startPrismSession,
        loadPatients
      ]
    );


  /* =======================================================
     COMMON PROPS
  ======================================================= */

  const commonProps =
    useMemo(
      () => ({
        session,
        profile,

        patients,
        setPatients,

        activeAdmissions,

        loading:
          patientsLoading,

        patientsLoading,

        onRefresh:
          loadPatients,

        onNavigate:
          navigate,

        onOpenPatient:
          openPatient,

        onLogout:
          logout,

        recordActivity
      }),
      [
        session,
        profile,
        patients,
        activeAdmissions,
        patientsLoading,
        loadPatients,
        navigate,
        openPatient,
        logout,
        recordActivity
      ]
    );


  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {
    return h(
      "div",
      {
        className:
          "prism-loading-screen"
      },

      h(
        "div",
        {
          className:
            "prism-loading-card"
        },

        h(
          "div",
          {
            className:
              "prism-loading-title"
          },
          "PRISM"
        ),

        h(
          "div",
          {
            className:
              "prism-loading-text"
          },
          "Loading clinical workspace..."
        )
      )
    );
  }


  /* =======================================================
     LOGIN
  ======================================================= */

  if (!session) {
    return h(Login, {
      onLogin:
        handleLogin
    });
  }


  /* =======================================================
     APPLICATION SHELL
  ======================================================= */

  function navButton(
    target,
    label
  ) {
    return h(
      "button",
      {
        type: "button",

        className:
          "nav-btn" +
          (
            page === target
              ? " active"
              : ""
          ),

        onClick: () =>
          navigate(target)
      },

      label
    );
  }


  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.email ||
    session?.user?.email ||
    "User";


  const role =
    profile?.role ||
    "medical_officer";


  return h(
    React.Fragment,
    null,


    /* =====================================================
       TOP BAR
    ===================================================== */

    h(
      "header",
      {
        className:
          "topbar"
      },

      h(
        "div",
        {
          className:
            "topbar-left"
        },

        h(
          "div",
          {
            className:
              "topbar-title"
          },
          "PRISM"
        ),

        h(
          "div",
          {
            className:
              "role-badge"
          },
          role
        )
      ),


      h(
        "div",
        {
          className:
            "topbar-right"
        },

        h(
          "span",
          {
            className:
              "small muted"
          },
          displayName
        ),

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-secondary",
            onClick:
              logout
          },
          "Logout"
        )
      )
    ),


    /* =====================================================
       MAIN LAYOUT
    ===================================================== */

    h(
      "div",
      {
        className:
          "layout"
      },


      /* ===================================================
         SIDEBAR
      =================================================== */

      h(
        "aside",
        {
          className:
            "sidebar"
        },

        h(
          "div",
          {
            className:
              "section-title"
          },
          "Clinical Workspace"
        ),

        navButton(
          "dashboard",
          "Dashboard"
        ),

        navButton(
          "patients",
          "Patients"
        ),

        navButton(
          "specialist",
          "Specialist Queue"
        ),

        profile?.role === "admin"
          ? navButton(
              "administration",
              "Administration"
            )
          : null
      ),


      /* ===================================================
         CONTENT
      =================================================== */

      h(
        "main",
        {
          className:
            "content"
        },

        page === "dashboard"
          ? h(
              Dashboard,
              commonProps
            )

          : page === "patients"
            ? h(
                Patients,
                commonProps
              )

            : page === "patient"
              ? h(
                  Patient,
                  {
                    session,
                    profile,
                    patientId:
                      selectedPatientId,
                    onNavigate:
                      navigate,
                    recordActivity
                  }
                )

              : page === "specialist"
                ? h(
                    SpecialistQueue,
                    commonProps
                  )

                : page === "administration"
                  ? h(
                      Administration,
                      commonProps
                    )

                  : h(
                      Dashboard,
                      commonProps
                    )
      )
    )
  );
}


/* =========================================================
   MOUNT
========================================================= */

const rootElement =
  document.getElementById(
    "root"
  );


if (!rootElement) {
  throw new Error(
    "PRISM root element was not found."
  );
}


createRoot(
  rootElement
).render(
  h(App)
);
