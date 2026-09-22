import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "https://esm.sh/react@18.3.1";

import {
  createRoot,
} from "https://esm.sh/react-dom@18.3.1/client";

import { db } from "./supabase.js";

import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Patients from "./pages/Patients.js";
import Patient from "./pages/Patient.js";
import SpecialistQueue from "./pages/SpecialistQueue.js";
import Administration from "./pages/Administration.js";

const h = React.createElement;

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [clinicalContext, setClinicalContext] = useState(null);

  const [page, setPage] = useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] =
    useState(null);

  const [patients, setPatients] = useState([]);
  const [activeAdmissions, setActiveAdmissions] =
    useState([]);

  const [specialistQueue, setSpecialistQueue] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] =
    useState(false);

  const [dataError, setDataError] = useState("");
  const [sessionId, setSessionId] = useState(null);


  /* =====================================================
     PROFILE
  ===================================================== */

  const loadProfile = useCallback(
    async (userId) => {
      if (!userId) {
        setProfile(null);
        return null;
      }

      const {
        data,
        error,
      } = await db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "Profile loading error:",
          error
        );

        setProfile(null);
        return null;
      }

      setProfile(data || null);
      return data || null;
    },
    []
  );


  /* =====================================================
     CLINICAL CONTEXT
  ===================================================== */

  const loadClinicalContext =
    useCallback(async () => {
      const {
        data,
        error,
      } = await db.rpc(
        "prism_get_my_clinical_context"
      );

      if (error) {
        console.error(
          "Clinical context error:",
          error
        );

        throw new Error(
          error.message ||
          "Unable to load clinical context."
        );
      }

      setClinicalContext(
        data || null
      );

      return data || null;
    }, []);


  /* =====================================================
     PATIENTS
  ===================================================== */

  const loadPatients =
    useCallback(async () => {
      setPatientsLoading(true);
      setDataError("");

      try {
        const {
          data,
          error,
        } = await db.rpc(
          "prism_get_my_patient_list"
        );

        if (error) {
          throw new Error(
            error.message ||
            "Unable to load patients."
          );
        }

        const rows =
          Array.isArray(data)
            ? data
            : [];

        const patientMap =
          new Map();

        const admissions =
          rows.map((row) => {
            const patientId =
              row.patient_id;

            const admission = {
              id:
                row.admission_id,

              patient_id:
                row.patient_id,

              ward_id:
                row.ward_id ??
                null,

              ward:
                row.ward ??
                null,

              unit_id:
                row.unit_id ??
                null,

              unit:
                row.unit ??
                null,

              bed_id:
                row.bed_id ??
                null,

              bed:
                row.bed ??
                null,

              status:
                row.status ??
                "active",

              admission_datetime:
                row.admission_datetime ??
                null,

              reason_for_admission:
                row.reason_for_admission ??
                null,

              working_diagnosis:
                row.working_diagnosis ??
                null,

              responsible_mo_id:
                row.responsible_mo_id ??
                null,

              specialist_id:
                row.specialist_id ??
                null,

              latest_stability:
                row.latest_stability ??
                null,
            };

            const patient = {
              id:
                patientId,

              patient_code:
                row.patient_code ??
                null,

              full_name:
                row.full_name ??
                null,

              age:
                row.age ??
                null,

              sex:
                row.sex ??
                null,
            };

            if (
              !patientMap.has(
                patientId
              )
            ) {
              patientMap.set(
                patientId,
                {
                  ...patient,
                  admissions: [],
                  activeAdmission: null,
                }
              );
            }

            const entry =
              patientMap.get(
                patientId
              );

            entry.admissions.push(
              admission
            );

            if (
              admission.status ===
              "active"
            ) {
              entry.activeAdmission =
                admission;
            }

            return {
              patient,
              admission,
            };
          });

        const patientList =
          Array.from(
            patientMap.values()
          );

        setPatients(
          patientList
        );

        setActiveAdmissions(
          admissions
        );

        return {
          patients:
            patientList,

          activeAdmissions:
            admissions,
        };
      } catch (error) {
        console.error(
          "Patient loading error:",
          error
        );

        setPatients([]);
        setActiveAdmissions([]);

        setDataError(
          error?.message ||
          "Unable to load patient list."
        );

        return {
          patients: [],
          activeAdmissions: [],
        };
      } finally {
        setPatientsLoading(false);
      }
    }, []);


  /* =====================================================
     SPECIALIST QUEUE
  ===================================================== */

  const loadSpecialistQueue =
    useCallback(async () => {
      try {
        const {
          data,
          error,
        } = await db.rpc(
          "prism_get_specialist_queue"
        );

        if (error) {
          console.error(
            "Specialist queue error:",
            error
          );

          setSpecialistQueue([]);
          return [];
        }

        const rows =
          Array.isArray(data)
            ? data
            : [];

        setSpecialistQueue(
          rows
        );

        return rows;
      } catch (error) {
        console.error(
          "Specialist queue error:",
          error
        );

        setSpecialistQueue([]);
        return [];
      }
    }, []);


  /* =====================================================
     WORKSPACE
  ===================================================== */

  const loadWorkspace =
    useCallback(async () => {
      setDataError("");

      try {
        await loadClinicalContext();

        await Promise.all([
          loadPatients(),
          loadSpecialistQueue(),
        ]);
      } catch (error) {
        console.error(
          "Workspace loading error:",
          error
        );

        setDataError(
          error?.message ||
          "Unable to load PRISM."
        );
      }
    }, [
      loadClinicalContext,
      loadPatients,
      loadSpecialistQueue,
    ]);


  /* =====================================================
     SESSION
  ===================================================== */

  const startSession =
    useCallback(
      async (
        user,
        userProfile
      ) => {
        if (!user?.id) {
          return;
        }

        try {
          const {
            data,
            error,
          } = await db
            .from("user_sessions")
            .insert({
              user_id:
                user.id,

              role_snapshot:
                userProfile?.role ||
                "unknown",

              location_label:
                "Web",

              session_type:
                "web",

              user_agent:
                navigator.userAgent,

              metadata: {
                source:
                  "PRISM",
              },
            })
            .select("id")
            .single();

          if (error) {
            console.error(
              "Session start error:",
              error
            );

            return;
          }

          setSessionId(
            data?.id ||
            null
          );
        } catch (error) {
          console.error(
            "Session start error:",
            error
          );
        }
      },
      []
    );


  const endSession =
    useCallback(async () => {
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
              new Date().toISOString(),
          })
          .eq(
            "id",
            sessionId
          );
      } catch (error) {
        console.error(
          "Session end error:",
          error
        );
      }

      setSessionId(null);
    }, [
      sessionId,
    ]);


  const heartbeat =
    useCallback(async () => {
      if (!sessionId) {
        return;
      }

      try {
        await db
          .from("user_sessions")
          .update({
            last_seen_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            sessionId
          );
      } catch (error) {
        console.error(
          "Heartbeat error:",
          error
        );
      }
    }, [
      sessionId,
    ]);


  /* =====================================================
     ACTIVITY
  ===================================================== */

  const recordActivity =
    useCallback(
      async (
        action,
        {
          entityType = null,
          entityId = null,
          patientId = null,
          route = null,
          metadata = {},
        } = {}
      ) => {
        if (
          !session?.user?.id
        ) {
          return;
        }

        try {
          const {
            error,
          } = await db
            .from("activity_events")
            .insert({
              actor_id:
                session.user.id,

              session_id:
                sessionId,

              action,

              entity_type:
                entityType,

              entity_id:
                entityId,

              patient_id:
                patientId,

              route,

              metadata,
            });

          if (error) {
            console.error(
              "Activity error:",
              error
            );
          }
        } catch (error) {
          console.error(
            "Activity error:",
            error
          );
        }
      },
      [
        session,
        sessionId,
      ]
    );


  /* =====================================================
     AUTH INITIALIZATION
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      setLoading(true);

      try {
        const {
          data: {
            session:
              currentSession,
          },
        } =
          await db.auth.getSession();

        if (!mounted) {
          return;
        }

        if (!currentSession) {
          setSession(null);
          setProfile(null);
          setClinicalContext(null);
          setLoading(false);
          return;
        }

        setSession(
          currentSession
        );

        const currentProfile =
          await loadProfile(
            currentSession.user.id
          );

        if (!mounted) {
          return;
        }

        setProfile(
          currentProfile
        );

        await startSession(
          currentSession.user,
          currentProfile
        );

        await loadWorkspace();
      } catch (error) {
        console.error(
          "Initialization error:",
          error
        );

        if (mounted) {
          setDataError(
            error?.message ||
            "Unable to initialize PRISM."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: {
        subscription,
      },
    } =
      db.auth.onAuthStateChange(
        async (
          event,
          newSession
        ) => {
          if (!mounted) {
            return;
          }

          if (
            event ===
              "SIGNED_IN" &&
            newSession
          ) {
            setSession(
              newSession
            );

            const currentProfile =
              await loadProfile(
                newSession.user.id
              );

            setProfile(
              currentProfile
            );

            await startSession(
              newSession.user,
              currentProfile
            );

            await loadWorkspace();

            setPage(
              "dashboard"
            );
          }

          if (
            event ===
            "SIGNED_OUT"
          ) {
            setSession(null);
            setProfile(null);
            setClinicalContext(null);

            setPatients([]);
            setActiveAdmissions([]);
            setSpecialistQueue([]);

            setSelectedPatientId(null);
            setSessionId(null);

            setPage(
              "dashboard"
            );
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [
    loadProfile,
    startSession,
    loadWorkspace,
  ]);


  /* =====================================================
     HEARTBEAT
  ===================================================== */

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    heartbeat();

    const timer =
      setInterval(
        heartbeat,
        60000
      );

    return () => {
      clearInterval(
        timer
      );
    };
  }, [
    sessionId,
    heartbeat,
  ]);


  /* =====================================================
     NAVIGATION
  ===================================================== */

  const navigate =
    useCallback(
      async (target) => {
        setPage(
          target
        );

        if (
          target ===
            "dashboard" ||
          target ===
            "patients" ||
          target ===
            "specialist"
        ) {
          await loadWorkspace();
        }
      },
      [
        loadWorkspace,
      ]
    );


  /* =====================================================
     OPEN PATIENT
  ===================================================== */

  const openPatient =
    useCallback(
      async (
        patientOrId
      ) => {
        const patientId =
          typeof patientOrId ===
          "string"
            ? patientOrId
            : patientOrId?.id;

        if (!patientId) {
          return;
        }

        setSelectedPatientId(
          patientId
        );

        setPage(
          "patient"
        );

        await recordActivity(
          "patient_opened",
          {
            entityType:
              "patient",

            entityId:
              patientId,

            patientId,

            route:
              "patient",
          }
        );
      },
      [
        recordActivity,
      ]
    );


  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout =
    useCallback(async () => {
      try {
        await endSession();

        await db.auth.signOut();
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      }
    }, [
      endSession,
    ]);


  /* =====================================================
     LOGIN
  ===================================================== */

  const handleLogin =
    useCallback(async () => {
      const {
        data: {
          session:
            newSession,
        },
      } =
        await db.auth.getSession();

      if (!newSession) {
        return;
      }

      setSession(
        newSession
      );

      const currentProfile =
        await loadProfile(
          newSession.user.id
        );

      setProfile(
        currentProfile
      );

      await startSession(
        newSession.user,
        currentProfile
      );

      await loadWorkspace();

      setPage(
        "dashboard"
      );
    }, [
      loadProfile,
      startSession,
      loadWorkspace,
    ]);


  /* =====================================================
     ADMIN
  ===================================================== */

  const isAdmin =
    profile?.role ===
    "admin";


  /* =====================================================
     COMMON PROPS
  ===================================================== */

  const commonProps =
    useMemo(
      () => ({
        session,
        profile,
        clinicalContext,

        patients,
        setPatients,

        activeAdmissions,

        specialistQueue,

        loading:
          patientsLoading,

        patientsLoading,

        dataError,

        onRefresh:
          loadWorkspace,

        onNavigate:
          navigate,

        onOpenPatient:
          openPatient,

        onLogout:
          logout,

        recordActivity,
      }),
      [
        session,
        profile,
        clinicalContext,
        patients,
        activeAdmissions,
        specialistQueue,
        patientsLoading,
        dataError,
        loadWorkspace,
        navigate,
        openPatient,
        logout,
        recordActivity,
      ]
    );


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return h(
      "div",
      {
        className:
          "prism-loading-screen",
      },

      h(
        "div",
        {
          className:
            "prism-loading-card",
        },

        h(
          "div",
          {
            className:
              "prism-loading-title",
          },
          "PRISM"
        ),

        h(
          "div",
          {
            className:
              "prism-loading-text",
          },
          "Loading clinical workspace..."
        )
      )
    );
  }


  /* =====================================================
     LOGIN
  ===================================================== */

  if (!session) {
    return h(
      Login,
      {
        onLogin:
          handleLogin,
      }
    );
  }


  /* =====================================================
     NAV BUTTON
  ===================================================== */

  function navButton(
    target,
    label
  ) {
    return h(
      "button",
      {
        type:
          "button",

        className:
          "nav-btn" +
          (
            page ===
            target
              ? " active"
              : ""
          ),

        onClick:
          () =>
            navigate(
              target
            ),
      },
      label
    );
  }


  /* =====================================================
     DISPLAY
  ===================================================== */

  const displayName =
    clinicalContext?.display_name ||
    clinicalContext?.user?.display_name ||
    profile?.display_name ||
    profile?.email ||
    session?.user?.email ||
    "User";

  const systemRole =
    clinicalContext?.system_role ||
    clinicalContext?.user?.system_role ||
    profile?.role ||
    "medical_officer";

  const departmentName =
    clinicalContext?.department?.name ||
    clinicalContext?.department_name ||
    "—";

  const unitName =
    clinicalContext?.home_unit?.name ||
    clinicalContext?.home_unit_name ||
    "—";


  /* =====================================================
     APP
  ===================================================== */

  return h(
    React.Fragment,
    null,

    h(
      "header",
      {
        className:
          "topbar",
      },

      h(
        "div",
        {
          className:
            "topbar-left",
        },

        h(
          "div",
          {
            className:
              "topbar-title",
          },
          "PRISM"
        ),

        h(
          "div",
          {
            className:
              "role-badge",
          },
          systemRole
        )
      ),

      h(
        "div",
        {
          className:
            "topbar-right",
        },

        h(
          "div",
          {
            style: {
              textAlign:
                "right",
            },
          },

          h(
            "div",
            {
              className:
                "small",
            },
            displayName
          ),

          h(
            "div",
            {
              className:
                "small muted",
            },
            `${departmentName} · ${unitName}`
          )
        ),

        h(
          "button",
          {
            type:
              "button",

            className:
              "btn btn-secondary",

            onClick:
              logout,
          },
          "Logout"
        )
      )
    ),

    dataError
      ? h(
          "div",
          {
            className:
              "alert alert-error",

            style: {
              margin:
                "12px 16px",
            },
          },

          h(
            "strong",
            null,
            "PRISM Error"
          ),

          h(
            "div",
            {
              style: {
                marginTop:
                  "4px",
              },
            },
            dataError
          ),

          h(
            "button",
            {
              type:
                "button",

              className:
                "btn btn-secondary",

              style: {
                marginTop:
                  "10px",
              },

              onClick:
                loadWorkspace,
            },
            "Retry"
          )
        )
      : null,

    h(
      "div",
      {
        className:
          "layout",
      },

      h(
        "aside",
        {
          className:
            "sidebar",
        },

        h(
          "div",
          {
            className:
              "section-title",
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

        isAdmin
          ? navButton(
              "administration",
              "Administration"
            )
          : null
      ),

      h(
        "main",
        {
          className:
            "content",
        },

        page ===
          "dashboard"

          ? h(
              Dashboard,
              commonProps
            )

          : page ===
            "patients"

            ? h(
                Patients,
                commonProps
              )

            : page ===
              "patient"

              ? h(
                  Patient,
                  {
                    session,
                    profile,
                    clinicalContext,

                    patientId:
                      selectedPatientId,

                    onNavigate:
                      navigate,

                    recordActivity,
                  }
                )

              : page ===
                "specialist"

                ? h(
                    SpecialistQueue,
                    commonProps
                  )

                : page ===
                  "administration"

                  ? isAdmin
                    ? h(
                        Administration,
                        commonProps
                      )
                    : h(
                        Dashboard,
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


/* =====================================================
   START PRISM
===================================================== */

const root =
  document.getElementById(
    "root"
  );

if (!root) {
  throw new Error(
    "PRISM root element not found."
  );
}

createRoot(
  root
).render(
  h(App)
);
