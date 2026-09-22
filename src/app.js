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

import {
  loadPRISMContext,
} from "./core/context.js";

import {
  isSystemAdmin,
} from "./core/authorization.js";

const h = React.createElement;


/* =========================================================
   PRISM APPLICATION SHELL

   Architecture:

   User
     ↓
   PRISM Authorization Context
     ↓
   Tenant
     ↓
   Hospital
     ↓
   Department
     ↓
   Unit
     ↓
   Role
     ↓
   Capabilities

   Backend remains the security boundary.
   Frontend authorization controls UI behavior only.
========================================================= */


function App() {
  const [session, setSession] = useState(null);

  const [profile, setProfile] = useState(null);

  /*
   * Legacy clinical context is retained because
   * existing pages may still consume its fields.
   */
  const [clinicalContext, setClinicalContext] =
    useState(null);

  /*
   * New canonical PRISM context.
   */
  const [prismContext, setPrismContext] =
    useState(null);

  const [page, setPage] =
    useState("dashboard");

  const [selectedPatientId, setSelectedPatientId] =
    useState(null);

  const [patients, setPatients] =
    useState([]);

  const [activeAdmissions, setActiveAdmissions] =
    useState([]);

  const [specialistQueue, setSpecialistQueue] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [patientsLoading, setPatientsLoading] =
    useState(false);

  const [dataError, setDataError] =
    useState("");

  const [sessionId, setSessionId] =
    useState(null);


  /* =======================================================
     PROFILE
  ======================================================= */

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


  /* =======================================================
     LEGACY CLINICAL CONTEXT
  ======================================================= */

  const loadLegacyClinicalContext =
    useCallback(async () => {
      const {
        data,
        error,
      } = await db.rpc(
        "prism_get_my_clinical_context"
      );

      if (error) {
        console.error(
          "Legacy clinical context error:",
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
    }, []);


  /* =======================================================
     NEW PRISM CONTEXT
  ======================================================= */

  const loadPRISMAuthorizationContext =
    useCallback(async () => {
      const context =
        await loadPRISMContext();

      setPrismContext(context);

      return context;
    }, []);


  /* =======================================================
     COMPLETE CONTEXT
  ======================================================= */

  const loadAllContext =
    useCallback(async () => {
      const [
        legacyContext,
        newContext,
      ] = await Promise.all([
        loadLegacyClinicalContext(),
        loadPRISMAuthorizationContext(),
      ]);

      /*
       * Keep backward compatibility for existing pages.
       *
       * The new PRISM context becomes the canonical
       * authorization/context layer.
       */
      const mergedContext = {
        ...legacyContext,

        ...newContext,

        authorization:
          newContext?.authorization ||
          null,

        tenant:
          newContext?.tenant ||
          null,

        hospital:
          newContext?.hospital ||
          null,

        department:
          newContext?.department ||
          legacyContext?.department ||
          null,

        unit:
          newContext?.unit ||
          null,

        country:
          newContext?.country ||
          null,

        organization:
          newContext?.organization ||
          null,

        campus:
          newContext?.campus ||
          null,
      };

      setClinicalContext(
        mergedContext
      );

      return mergedContext;
    }, [
      loadLegacyClinicalContext,
      loadPRISMAuthorizationContext,
    ]);


  /* =======================================================
     PATIENT ACCESS
  ======================================================= */

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
          console.error(
            "Patient access RPC error:",
            error
          );

          throw new Error(
            `Patient list failed: ${error.message}`
          );
        }

        const rows =
          Array.isArray(data)
            ? data
            : [];

        const patientMap =
          new Map();

        const normalizedAdmissions =
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

                  activeAdmission:
                    null,
                }
              );
            }

            const patientEntry =
              patientMap.get(
                patientId
              );

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
              admission,
            };
          });

        const normalizedPatients =
          Array.from(
            patientMap.values()
          );

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

            if (
              aUnit !==
              bUnit
            ) {
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

            if (
              aBed !==
              bBed
            ) {
              return aBed.localeCompare(
                bBed,
                undefined,
                {
                  numeric:
                    true,
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
            normalizedAdmissions,
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
          "Unable to load the clinical patient list."
        );

        return {
          patients: [],
          activeAdmissions: [],
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
          "Specialist queue exception:",
          error
        );

        setSpecialistQueue([]);

        return [];
      }
    }, []);


  /* =======================================================
     COMPLETE WORKSPACE
  ======================================================= */

  const loadClinicalWorkspace =
    useCallback(async () => {
      setDataError("");

      try {
        await loadAllContext();

        await Promise.all([
          loadPatients(),
          loadSpecialistQueue(),
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
      loadAllContext,
      loadPatients,
      loadSpecialistQueue,
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
        sessionId,
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
    useCallback(async () => {
      if (!sessionId) {
        return;
      }

      try {
        const {
          error,
        } = await db
          .from("user_sessions")
          .update({
            last_seen_at:
              new Date().toISOString(),
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
    }, [
      sessionId,
    ]);


  const endPrismSession =
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
              currentSession,
          },
        } =
          await db.auth.getSession();

        if (!mounted) {
          return;
        }

        if (currentSession) {
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
          setPrismContext(null);
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
            setPrismContext(null);

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
    loadClinicalWorkspace,
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
    heartbeatSession,
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
      [
        loadClinicalWorkspace,
      ]
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
              "patient",
          }
        );
      },
      [
        recordActivity,
      ]
    );


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout =
    useCallback(async () => {
      try {
        await endPrismSession();

        await db.auth.signOut();

        setSession(null);
        setProfile(null);
        setClinicalContext(null);
        setPrismContext(null);

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
    }, [
      endPrismSession,
    ]);


  /* =======================================================
     LOGIN CALLBACK
  ======================================================= */

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

      await startPrismSession(
        newSession.user,
        currentProfile
      );

      await loadClinicalWorkspace();

      setPage(
        "dashboard"
      );
    }, [
      loadProfile,
      startPrismSession,
      loadClinicalWorkspace,
    ]);


  /* =======================================================
     EFFECTIVE SYSTEM ADMIN
  ======================================================= */

  const effectiveIsAdmin =
    isSystemAdmin(
      prismContext?.authorization
    ) ||
    profile?.role ===
      "admin";


  /* =======================================================
     COMMON PROPS
  ======================================================= */

  const commonProps =
    useMemo(
      () => ({
        session,

        profile,

        clinicalContext,

        prismContext,

        authorization:
          prismContext?.authorization ||
          null,

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

        recordActivity,
      }),
      [
        session,
        profile,
        clinicalContext,
        prismContext,
        patients,
        activeAdmissions,
        specialistQueue,
        patientsLoading,
        dataError,
        loadClinicalWorkspace,
        navigate,
        openPatient,
        logout,
        recordActivity,
      ]
    );


  /* =======================================================
     LOADING
  ======================================================= */

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


  /* =======================================================
     LOGIN
  ======================================================= */

  if (!session) {
    return h(
      Login,
      {
        onLogin:
          handleLogin,
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
   
