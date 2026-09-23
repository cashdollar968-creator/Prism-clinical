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
import Login from "./pages/Login.jsx";

const h = React.createElement;

/* =========================================================
   GLOBAL ERROR SCREEN
========================================================= */

function ErrorScreen({
  title = "PRISM Error",
  error = null,
  onRetry = null,
}) {
  const message =
    error?.message ||
    String(error || "Unknown error");

  return h(
    "div",
    {
      style: {
        minHeight: "100vh",
        padding: "24px",
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
      },
    },
    h(
      "div",
      {
        style: {
          maxWidth: "760px",
          margin: "60px auto",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "28px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        },
      },
      h(
        "div",
        {
          style: {
            fontSize: "24px",
            fontWeight: "700",
            color: "#0f766e",
            marginBottom: "8px",
          },
        },
        "PRISM"
      ),
      h(
        "h2",
        {
          style: {
            margin: "0 0 12px",
            color: "#b91c1c",
          },
        },
        title
      ),
      h(
        "div",
        {
          style: {
            color: "#475569",
            whiteSpace: "pre-wrap",
            lineHeight: "1.6",
          },
        },
        message
      ),
      onRetry
        ? h(
            "button",
            {
              type: "button",
              onClick: onRetry,
              style: {
                marginTop: "18px",
                padding: "10px 18px",
                border: "none",
                borderRadius: "8px",
                background: "#0f766e",
                color: "#ffffff",
                cursor: "pointer",
              },
            },
            "Retry"
          )
        : null
    )
  );
}

/* =========================================================
   LOADING SCREEN
========================================================= */

function LoadingScreen({
  message = "Loading PRISM...",
}) {
  return h(
    "div",
    {
      style: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      },
    },
    h(
      "div",
      {
        style: {
          textAlign: "center",
          color: "#334155",
        },
      },
      h(
        "div",
        {
          style: {
            fontSize: "30px",
            fontWeight: "700",
            color: "#0f766e",
            marginBottom: "10px",
          },
        },
        "PRISM"
      ),
      h("div", null, message)
    )
  );
}

/* =========================================================
   SAFE DASHBOARD
========================================================= */

function SafeDashboard({
  activeAdmissions = [],
  onOpenPatient,
}) {
  const patientsCount =
    new Set(
      activeAdmissions
        .map(({ patient }) => patient?.id)
        .filter(Boolean)
    ).size;

  const specialistCount =
    activeAdmissions.filter(
      ({ admission }) =>
        Boolean(admission?.specialist_id)
    ).length;

  return h(
    React.Fragment,
    null,

    h(
      "div",
      {
        className: "page-title",
      },
      "Dashboard"
    ),

    h(
      "div",
      {
        className: "page-subtitle",
      },
      "Current inpatient overview"
    ),

    h(
      "div",
      {
        className: "grid grid-4",
      },

      h(
        "div",
        {
          className: "card",
        },
        h(
          "div",
          {
            className: "stat-label",
          },
          "Active Admissions"
        ),
        h(
          "div",
          {
            className: "stat-number",
          },
          activeAdmissions.length
        )
      ),

      h(
        "div",
        {
          className: "card",
        },
        h(
          "div",
          {
            className: "stat-label",
          },
          "Current Patients"
        ),
        h(
          "div",
          {
            className: "stat-number",
          },
          patientsCount
        )
      ),

      h(
        "div",
        {
          className: "card",
        },
        h(
          "div",
          {
            className: "stat-label",
          },
          "With Specialist"
        ),
        h(
          "div",
          {
            className: "stat-number",
          },
          specialistCount
        )
      ),

      h(
        "div",
        {
          className: "card",
        },
        h(
          "div",
          {
            className: "stat-label",
          },
          "System"
        ),
        h(
          "div",
          {
            className: "stat-number",
            style: {
              fontSize: "18px",
            },
          },
          "Ready"
        )
      )
    ),

    h(
      "div",
      {
        className: "card",
      },

      h(
        "div",
        {
          className: "section-title",
        },
        "Current Inpatients"
      ),

      activeAdmissions.length === 0
        ? h(
            "div",
            {
              className: "empty",
            },
            "No active admissions."
          )
        : h(
            "div",
            {
              className: "table-wrap",
            },

            h(
              "table",
              null,

              h(
                "thead",
                null,

                h(
                  "tr",
                  null,
                  h("th", null, "Patient"),
                  h("th", null, "Bed"),
                  h("th", null, "Diagnosis"),
                  h("th", null, "Action")
                )
              ),

              h(
                "tbody",
                null,

                activeAdmissions.map(
                  ({
                    patient,
                    admission,
                  }) =>
                    h(
                      "tr",
                      {
                        key:
                          admission?.id ||
                          patient?.id,
                      },

                      h(
                        "td",
                        null,

                        h(
                          "strong",
                          null,
                          patient?.full_name || "—"
                        ),

                        h(
                          "div",
                          {
                            className:
                              "small muted",
                          },
                          patient?.patient_code || "—"
                        )
                      ),

                      h(
                        "td",
                        null,
                        admission?.bed_id || "—"
                      ),

                      h(
                        "td",
                        null,
                        admission?.working_diagnosis ||
                          "—"
                      ),

                      h(
                        "td",
                        null,

                        h(
                          "button",
                          {
                            type: "button",
                            className:
                              "btn btn-secondary",
                            onClick: () =>
                              onOpenPatient?.(
                                patient
                              ),
                          },
                          "Open"
                        )
                      )
                    )
                )
              )
            )
          )
    )
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [session, setSession] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [clinicalContext, setClinicalContext] =
    useState(null);

  const [patients, setPatients] =
    useState([]);

  const [activeAdmissions, setActiveAdmissions] =
    useState([]);

  const [specialistQueue, setSpecialistQueue] =
    useState([]);

  const [page, setPage] =
    useState("dashboard");

  const [selectedPatientId, setSelectedPatientId] =
    useState(null);

  const [pageComponent, setPageComponent] =
    useState(null);

  const [pageLoading, setPageLoading] =
    useState(false);

  const [pageError, setPageError] =
    useState(null);

  const [dataError, setDataError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

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
        throw new Error(
          error.message ||
            "Unable to load profile."
        );
      }

      const result =
        data || null;

      setProfile(result);

      return result;
    },
    []
  );

  /* =======================================================
     CLINICAL CONTEXT
  ======================================================= */

  const loadClinicalContext =
    useCallback(async () => {
      try {
        const {
          data,
          error,
        } = await db.rpc(
          "prism_get_my_clinical_context"
        );

        if (error) {
          throw new Error(
            error.message ||
              "Unable to load clinical context."
          );
        }

        setClinicalContext(
          data || null
        );

        return data || null;

      } catch (error) {
        console.error(
          "Clinical context error:",
          error
        );

        setDataError(
          error?.message ||
            "Unable to load clinical context."
        );

        return null;
      }
    }, []);

  /* =======================================================
     PATIENTS
  ======================================================= */

  const loadPatients =
    useCallback(async () => {
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

        const admissions = [];

        for (const row of rows) {
          const patientId =
            row.patient_id;

          if (!patientId) {
            continue;
          }

          const patient = {
            id: patientId,
            patient_code:
              row.patient_code ?? null,
            full_name:
              row.full_name ?? null,
            age:
              row.age ?? null,
            sex:
              row.sex ?? null,
          };

          const admission = {
            id:
              row.admission_id,
            patient_id:
              patientId,
            ward_id:
              row.ward_id ?? null,
            ward:
              row.ward ?? null,
            unit_id:
              row.unit_id ?? null,
            unit:
              row.unit ?? null,
            bed_id:
              row.bed_id ?? null,
            bed:
              row.bed ?? null,
            status:
              row.status ?? "active",
            admission_datetime:
              row.admission_datetime ?? null,
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

          if (!patientMap.has(patientId)) {
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

          const entry =
            patientMap.get(patientId);

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

          admissions.push({
            patient,
            admission,
          });
        }

        const list =
          Array.from(
            patientMap.values()
          );

        setPatients(list);
        setActiveAdmissions(
          admissions
        );

        return {
          patients: list,
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
            "Unable to load patients."
        );

        return {
          patients: [],
          activeAdmissions: [],
        };
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
          throw new Error(
            error.message ||
              "Unable to load specialist queue."
          );
        }

        const rows =
          Array.isArray(data)
            ? data
            : [];

        setSpecialistQueue(rows);

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

  /* =======================================================
     WORKSPACE DATA
  ======================================================= */

  const loadWorkspaceData =
    useCallback(async () => {
      await Promise.allSettled([
        loadClinicalContext(),
        loadPatients(),
        loadSpecialistQueue(),
      ]);
    }, [
      loadClinicalContext,
      loadPatients,
      loadSpecialistQueue,
    ]);

  /* =======================================================
     SESSION LOG
  ======================================================= */

  const startSession =
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
                source: "PRISM",
              },
            })
            .select("id")
            .single();

          if (error) {
            console.error(
              "Session logging error:",
              error
            );

            return null;
          }

          const id =
            data?.id || null;

          setSessionId(id);

          return id;

        } catch (error) {
          console.error(
            "Session logging error:",
            error
          );

          return null;
        }
      },
      []
    );

  /* =======================================================
     ACTIVITY
  ======================================================= */

  const recordActivity =
    useCallback(
      async (
        action,
        options = {}
      ) => {
        if (!session?.user?.id) {
          return;
        }

        try {
          await db
            .from("activity_events")
            .insert({
              actor_id:
                session.user.id,

              session_id:
                sessionId,

              action,

              entity_type:
                options.entityType ??
                null,

              entity_id:
                options.entityId ??
                null,

              patient_id:
                options.patientId ??
                null,

              route:
                options.route ??
                null,

              metadata:
                options.metadata ??
                {},
            });

        } catch (error) {
          console.error(
            "Activity logging error:",
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
     PAGE LOADER
  ======================================================= */

  const loadCurrentPage =
    useCallback(
      async (targetPage) => {
        if (
          targetPage ===
          "dashboard"
        ) {
          return;
        }

        setPageLoading(true);
        setPageError(null);

        try {
          let Component = null;

          if (
            targetPage ===
            "patients"
          ) {
            Component =
              (
                await import(
                  "./pages/Patients.jsx"
                )
              ).default;
          }

          else if (
            targetPage ===
            "patient"
          ) {
            Component =
              (
                await import(
                  "./pages/Patient.jsx"
                )
              ).default;
          }

          else if (
            targetPage ===
            "specialist"
          ) {
            Component =
              (
                await import(
                  "./pages/SpecialistQueue.jsx"
                )
              ).default;
          }

          else if (
            targetPage ===
            "administration"
          ) {
            Component =
              (
                await import(
                  "./pages/Administration.jsx"
                )
              ).default;
          }

          else {
            throw new Error(
              `Unknown page: ${targetPage}`
            );
          }

          if (
            typeof Component !==
            "function"
          ) {
            throw new Error(
              `Page "${targetPage}" did not export a valid React component.`
            );
          }

          setPageComponent(
            () => Component
          );

        } catch (error) {
          console.error(
            "Page loading error:",
            error
          );

          setPageError(error);

        } finally {
          setPageLoading(false);
        }
      },
      []
    );

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigate =
    useCallback(
      async (target) => {
        setPageError(null);
        setPage(target);

        if (
          target ===
          "dashboard"
        ) {
          setPageComponent(null);
          setPageLoading(false);
          return;
        }

        await loadCurrentPage(
          target
        );

        if (
          target === "patients" ||
          target === "specialist"
        ) {
          loadWorkspaceData();
        }
      },
      [
        loadCurrentPage,
        loadWorkspaceData,
      ]
    );

  /* =======================================================
     OPEN PATIENT
  ======================================================= */

  const openPatient =
    useCallback(
      async (patientOrId) => {
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

        setPage("patient");

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

        await loadCurrentPage(
          "patient"
        );
      },
      [
        recordActivity,
        loadCurrentPage,
      ]
    );

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout =
    useCallback(async () => {
      try {
        await db.auth.signOut();
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      }
    }, []);

  /* =======================================================
     AUTH INITIALIZATION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);

        const {
          data,
          error,
        } =
          await db.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        const currentSession =
          data?.session || null;

        if (!currentSession) {
          setSession(null);
          setProfile(null);
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

        setPage("dashboard");
        setLoading(false);

        loadWorkspaceData();

        startSession(
          currentSession.user,
          currentProfile
        );

      } catch (error) {
        console.error(
          "PRISM initialization error:",
          error
        );

        if (!mounted) {
          return;
        }

        setDataError(
          error?.message ||
            "Unable to initialize PRISM."
        );

        setLoading(false);
      }
    }

    initialize();

    const {
      data,
    } =
      db.auth.onAuthStateChange(
        (event, newSession) => {
          if (!mounted) {
            return;
          }

          if (
            event ===
            "SIGNED_IN"
          ) {
            if (!newSession) {
              return;
            }

            setSession(
              newSession
            );

            setLoading(true);

            Promise.resolve()
              .then(async () => {
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

                setPage(
                  "dashboard"
                );

                setLoading(false);

                loadWorkspaceData();

                startSession(
                  newSession.user,
                  currentProfile
                );
              })
              .catch((error) => {
                console.error(
                  "Post-login error:",
                  error
                );

                if (!mounted) {
                  return;
                }

                setDataError(
                  error?.message ||
                    "Unable to open workspace."
                );

                setLoading(false);
              });
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

            setPage("dashboard");
            setPageComponent(null);

            setPageError(null);
            setDataError("");

            setLoading(false);
          }
        }
      );

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };

  }, [
    loadProfile,
    loadWorkspaceData,
    startSession,
  ]);

  /* =======================================================
     LOGIN CALLBACK
  ======================================================= */

  const handleLogin =
    useCallback(
      async () => {
        try {
          const {
            data,
            error,
          } =
            await db.auth.getSession();

          if (error) {
            throw error;
          }

          const newSession =
            data?.session;

          if (!newSession) {
            throw new Error(
              "Authentication completed but no session was found."
            );
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

          setPage(
            "dashboard"
          );

          setLoading(false);

          loadWorkspaceData();

          startSession(
            newSession.user,
            currentProfile
          );

        } catch (error) {
          console.error(
            "Login workspace error:",
            error
          );

          setDataError(
            error?.message ||
              "Unable to open workspace."
          );

          setLoading(false);
        }
      },
      [
        loadProfile,
        loadWorkspaceData,
        startSession,
      ]
    );

  /* =======================================================
     ADMIN
  ======================================================= */

  const isAdmin =
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

        patients,
        setPatients,

        activeAdmissions,

        specialistQueue,

        loading,

        dataError,

        onRefresh:
          loadWorkspaceData,

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
        loading,
        dataError,
        loadWorkspaceData,
        navigate,
        openPatient,
        logout,
        recordActivity,
      ]
    );

  /* =======================================================
     GLOBAL LOADING
  ======================================================= */

  if (loading) {
    return h(
      LoadingScreen,
      {
        message:
          "Loading PRISM...",
      }
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
     PAGE ERROR
  ======================================================= */

  if (pageError) {
    return h(
      ErrorScreen,
      {
        title:
          `Unable to load "${page}"`,
        error:
          pageError,
        onRetry:
          () =>
            loadCurrentPage(
              page
            ),
      }
    );
  }

  /* =======================================================
     PAGE RESOLUTION
  ======================================================= */

  let CurrentPage =
    SafeDashboard;

  if (
    page !==
    "dashboard"
  ) {
    CurrentPage =
      pageComponent;
  }

  if (
    page !==
      "dashboard" &&
    (
      pageLoading ||
      !CurrentPage
    )
  ) {
    return h(
      LoadingScreen,
      {
        message:
          `Loading ${page}...`,
      }
    );
  }

  /* =======================================================
     MAIN APPLICATION
  ======================================================= */

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
          profile?.role ||
            "user"
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
            profile?.display_name ||
              session?.user?.email ||
              "User"
          ),

          h(
            "div",
            {
              className:
                "small muted",
            },
            [
              clinicalContext?.department?.name ||
                clinicalContext?.department_name,

              clinicalContext?.home_unit?.name ||
                clinicalContext?.unit_name,
            ]
              .filter(Boolean)
              .join(" · ")
          )
        ),

        h(
          "button",
          {
            type: "button",
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
          dataError
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

        h(
          "button",
          {
            type: "button",

            className:
              "nav-btn" +
              (
                page ===
                "dashboard"
                  ? " active"
                  : ""
              ),

            onClick:
              () =>
                navigate(
                  "dashboard"
                ),
          },
          "Dashboard"
        ),

        h(
          "button",
          {
            type: "button",

            className:
              "nav-btn" +
              (
                page ===
                "patients"
                  ? " active"
                  : ""
              ),

            onClick:
              () =>
                navigate(
                  "patients"
                ),
          },
          "Patients"
        ),

        h(
          "button",
          {
            type: "button",

            className:
              "nav-btn" +
              (
                page ===
                "specialist"
                  ? " active"
                  : ""
              ),

            onClick:
              () =>
                navigate(
                  "specialist"
                ),
          },
          "Specialist Queue"
        ),

        isAdmin
          ? h(
              "button",
              {
                type: "button",

                className:
                  "nav-btn" +
                  (
                    page ===
                    "administration"
                      ? " active"
                      : ""
                  ),

                onClick:
                  () =>
                    navigate(
                      "administration"
                    ),
              },
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

        h(
          CurrentPage,
          {
            ...commonProps,

            ...(page ===
            "patient"
              ? {
                  patientId:
                    selectedPatientId,
                }
              : {}),
          }
        )
      )
    )
  );
}

/* =========================================================
   MOUNT
========================================================= */

const root =
  document.getElementById(
    "root"
  );

if (!root) {
  document.body.innerHTML =
    `
      <div style="
        padding:24px;
        font-family:Arial,sans-serif;
        color:#b91c1c;
      ">
        <h2>PRISM failed to start</h2>
        <p>Root element #root was not found.</p>
      </div>
    `;
} else {
  try {
    createRoot(root).render(
      h(App)
    );
  } catch (error) {
    console.error(
      "PRISM mount error:",
      error
    );

    root.innerHTML = "";

    root.appendChild(
      document.createTextNode(
        "PRISM failed to start: " +
          (
            error?.message ||
            String(error)
          )
      )
    );
  }
                }
