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
   PRISM APP
   Secure clinical-context driven application shell.

   Important:
   - Clinical patient access is loaded through secure RPCs.
   - Frontend does NOT directly query patients/admissions.
   - Effective access comes from backend clinical context.
========================================================= */

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [clinicalContext, setClinicalContext] = useState(null);

  const [page, setPage] = useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const [patients, setPatients] = useState([]);
  const [activeAdmissions, setActiveAdmissions] = useState([]);

  const [specialistQueue, setSpecialistQueue] = useState([]);

  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);

  const [dataError, setDataError] = useState("");

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
     CLINICAL CONTEXT
  ======================================================= */

  const loadClinicalContext = useCallback(async () => {
    try {
      const {
        data,
        error
      } = await db.rpc(
        "prism_get_my_clinical_context"
      );

      if (error) {
        console.error(
          "Clinical context error:",
          error
        );

        throw new Error(
          `Clinical context failed: ${error.message}`
        );
      }

      if (!data) {
        throw new Error(
          "Clinical context returned no data."
        );
      }

      setClinicalContext(data);

      return data;
    } catch (error) {
      console.error(
        "Clinical context exception:",
        error
      );

      setClinicalContext(null);

      throw error;
    }
  }, []);


  /* =======================================================
     PATIENT ACCESS
  ======================================================= */

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    setDataError("");

    try {
      /*
       * IMPORTANT:
       * Do NOT query patients/admissions directly here.
       *
       * Backend decides what the current user is allowed
       * to see.
       */

      const {
        data,
        error
      } = await db.rpc(
        "prism_get_my_patient_list"
      );

      if (error) {
        console.error(
          "Patient access RPC error:",
          error
        );

        throw new Error(
          `Patient list failed: ${error.message}`
        );
      }

      const rows = Array.isArray(data)
        ? data
        : [];

      /*
       * The RPC returns a flat admission-oriented list:
       *
       * {
       *   admission_id,
       *   patient_id,
       *   patient_code,
       *   full_name,
       *   age,
       *   sex,
       *   ward,
       *   unit,
       *   bed,
       *   status,
       *   admission_datetime,
       *   reason_for_admission,
       *   working_diagnosis,
       *   responsible_mo_id,
       *   specialist_id
       * }
       *
       * Existing Dashboard / Patients pages expect:
       *
       * {
       *   patient,
       *   admission
       * }
       *
       * Therefore we normalize it here.
       */

      const patientMap = new Map();

      const normalizedAdmissions = rows.map(
        (row) => {
          const patientId =
            row.patient_id;

          const admission = {
            id:
              row.admission_id,

            patient_id:
              row.patient_id,

            ward_id:
              row.ward_id ??
              row.ward ??
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
              row.bed ??
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
              null
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
              null
          };

          if (!patientMap.has(patientId)) {
            patientMap.set(
              patientId,
              {
                ...patient,
                admissions: [],
                activeAdmission: null
              }
            );
          }

          const patientEntry =
            patientMap.get(patientId);

          patientEntry.admissions.push(
            admission
          );

          if (
            admission.status ===
            "active"
          ) {
            patientEntry.activeAdmission =
              admission;
          }

          return {
            patient,
            admission
          };
        }
      );

      const normalizedPatients =
        Array.from(
          patientMap.values()
        );

      /*
       * Sort active admissions by:
       * unit → bed → admission time.
       *
       * This is compatible with the Duty/Handover
       * direction and prevents random database order.
       */

      normalizedAdmissions.sort(
        (a, b) => {
          const aUnit =
            String(
              a.admission.unit ||
              ""
            ).toLowerCase();

          const bUnit =
            String(
              b.admission.unit ||
              ""
            ).toLowerCase();

          if (aUnit !== bUnit) {
            return aUnit.localeCompare(
              bUnit
            );
          }

          const aBed =
            String(
              a.admission.bed ||
              ""
            ).toLowerCase();

          const bBed =
            String(
              b.admission.bed ||
              ""
            ).toLowerCase();

          if (aBed !== bBed) {
            return aBed.localeCompare(
              bBed,
              undefined,
              {
                numeric: true
              }
            );
          }

          return String(
            a.patient.full_name ||
            ""
          ).localeCompare(
            String(
              b.patient.full_name ||
              ""
            )
          );
        }
      );

      setPatients(
        normalizedPatients
      );

      setActiveAdmissions(
        normalizedAdmissions
      );

      return {
        patients:
          normalizedPatients,

        activeAdmissions:
          normalizedAdmissions
      };
    } catch (error) {
      console.error(
        "Unexpected patient loading error:",
        error
      );

      setPatients([]);
      setActiveAdmissions([]);

      setDataError(
        error?.message ||
        "Unable to load the clinical patient list."
      );

      return {
        patients: [],
        activeAdmissions: []
      };
    } finally {
      setPatientsLoading(false);
    }
  }, []);


  /* =======================================================
     SPECIALIST QUEUE
  ======================================================= */

  const loadSpecialistQueue =
    useCallback(async () => {
      try {
        const {
          data,
          error
        } = await db.rpc(
          "prism_get_specialist_queue"
        );

        if (error) {
          console.error(
            "Specialist queue error:",
            error
          );

          /*
           * Specialist queue should not make the
           * entire clinical workspace unusable.
           */
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
          "Specialist queue exception:",
          error
        );

        setSpecialistQueue([]);

        return [];
      }
    }, []);


  /* =======================================================
     LOAD COMPLETE CLINICAL WORKSPACE
  ======================================================= */

  const loadClinicalWorkspace =
    useCallback(async () => {
      setDataError("");

      try {
        await loadClinicalContext();

        await Promise.all([
          loadPatients(),
          loadSpecialistQueue()
        ]);
      } catch (error) {
        console.error(
          "Clinical workspace loading error:",
          error
        );

        setDataError(
          error?.message ||
          "Unable to load the clinical workspace."
        );
      }
    }, [
      loadClinicalContext,
      loadPatients,
      loadSpecialistQueue
    ]);


  /* =======================================================
     ACTIVITY
  ======================================================= */

  const recordActivity =
    useCallback(
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
          const {
            error
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

              metadata
            });

          if (error) {
            console.error(
              "Activity recording error:",
              error
            );
          }
        } catch (error) {
          console.error(
            "Activity recording exception:",
            error
          );
        }
      },
      [
        session,
        sessionId
      ]
    );


  /* =======================================================
     PRISM SESSION
  ======================================================= */

  const startPrismSession =
    useCallback(
      async (
        user,
        userProfile
      ) => {
        if (!user?.id) {
          return null;
        }

        try {
          const {
            data,
            error
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
                  "PRISM"
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

          setSessionId(
            data?.id ||
            null
          );

          return (
            data?.id ||
            null
          );
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


  const heartbeatSession =
    useCallback(
      async () => {
        if (!sessionId) {
          return;
        }

        try {
          const {
            error
          } = await db
            .from("user_sessions")
            .update({
              last_seen_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              sessionId
            );

          if (error) {
            console.error(
              "Session heartbeat error:",
              error
            );
          }
        } catch (error) {
          console.error(
            "Session heartbeat exception:",
            error
          );
        }
      },
      [sessionId]
    );


  const endPrismSession =
    useCallback(
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
      },
      [sessionId]
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
            session:
              currentSession
          }
        } =
          await db.auth.getSession();

        if (!mounted) {
          return;
        }

        if (
          currentSession
        ) {
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

          await startPrismSession(
            currentSession.user,
            currentProfile
          );

          await loadClinicalWorkspace();
        } else {
          setSession(null);
          setProfile(null);
          setClinicalContext(null);
        }
      } catch (error) {
        console.error(
          "Auth initialization error:",
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

    initializeAuth();


    const {
      data: {
        subscription
      }
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

            if (!mounted) {
              return;
            }

            setProfile(
              currentProfile
            );

            await startPrismSession(
              newSession.user,
              currentProfile
            );

            await loadClinicalWorkspace();

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

            setDataError("");

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
    startPrismSession,
    loadClinicalWorkspace
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
      clearInterval(
        interval
      );
    };
  }, [
    sessionId,
    heartbeatSession
  ]);


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigate =
    useCallback(
      async (targetPage) => {
        setPage(
          targetPage
        );

        /*
         * Refresh the clinical workspace when entering
         * dashboard/patients/specialist.
         */
        if (
          targetPage ===
            "dashboard" ||
          targetPage ===
            "patients" ||
          targetPage ===
            "specialist"
        ) {
          await loadClinicalWorkspace();
        }
      },
      [loadClinicalWorkspace]
    );


  /* =======================================================
     OPEN PATIENT
  ======================================================= */

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
          console.error(
            "Cannot open patient: missing patient ID"
          );

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
              "patient"
          }
        );
      },
      [recordActivity]
    );


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout =
    useCallback(
      async () => {
        try {
          await endPrismSession();

          await db.auth.signOut();

          setSession(null);
          setProfile(null);
          setClinicalContext(null);

          setPatients([]);
          setActiveAdmissions([]);
          setSpecialistQueue([]);

          setSelectedPatientId(null);

          setPage(
            "dashboard"
          );
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
            session:
              newSession
          }
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

        await startPrismSession(
          newSession.user,
          currentProfile
        );

        await loadClinicalWorkspace();

        setPage(
          "dashboard"
        );
      },
      [
        loadProfile,
        startPrismSession,
        loadClinicalWorkspace
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
          loadClinicalWorkspace,

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
        clinicalContext,
        patients,
        activeAdmissions,
        specialistQueue,
        patientsLoading,
        dataError,
        loadClinicalWorkspace,
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
    return h(
      Login,
      {
        onLogin:
          handleLogin
      }
    );
  }


  /* =======================================================
     NAVIGATION BUTTON
  ======================================================= */

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
            page === target
              ? " active"
              : ""
          ),

        onClick:
          () =>
            navigate(
              target
            )
      },

      label
    );
  }


  /* =======================================================
     DISPLAY CONTEXT
  ======================================================= */

  const displayName =
    clinicalContext?.display_name ||
    profile?.display_name ||
    profile?.full_name ||
    profile?.email ||
    session?.user?.email ||
    "User";

  const systemRole =
    clinicalContext?.system_role ||
    profile?.role ||
    "medical_officer";

  const departmentName =
    clinicalContext?.department?.name ||
    "—";

  const homeUnitName =
    clinicalContext?.home_unit?.name ||
    "—";


  /* =======================================================
     APPLICATION SHELL
  ======================================================= */

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
          systemRole
        )
      ),


      h(
        "div",
        {
          className:
            "topbar-right"
        },

        h(
          "div",
          {
            style: {
              textAlign:
                "right"
            }
          },

          h(
            "div",
            {
              className:
                "small"
            },
            displayName
          ),

          h(
            "div",
            {
              className:
                "small muted"
            },
            `${departmentName} · ${homeUnitName}`
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
              logout
          },
          "Logout"
        )
      )
    ),


    /* =====================================================
       GLOBAL DATA ERROR
    ===================================================== */

    dataError
      ? h(
          "div",
          {
            className:
              "alert alert-error",
            style: {
              margin:
                "12px 16px"
            }
          },

          h(
            "strong",
            null,
            "Clinical workspace error"
          ),

          h(
            "div",
            {
              style: {
                marginTop:
                  "4px"
              }
            },
            dataError
          ),

          h(
            "div",
            {
              style: {
                marginTop:
                  "10px"
              }
            },

            h(
              "button",
              {
                type:
                  "button",

                className:
                  "btn btn-secondary",

                onClick:
                  loadClinicalWorkspace
              },
              "Retry"
            )
          )
        )
      : null,


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

        systemRole ===
          "admin"
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

                    recordActivity
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
