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

const h = React.createElement;

/* =====================================================
SAFE ERROR SCREEN
===================================================== */

function ErrorScreen({
title,
error,
onRetry,
}) {
return h(
"div",
{
style: {
minHeight: "100vh",
padding: "24px",
background: "#f8fafc",
fontFamily: "Arial, sans-serif",
},
},

h(
  "div",
  {
    style: {
      maxWidth: "800px",
      margin: "40px auto",
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "24px",
    },
  },

  h(
    "h2",
    {
      style: {
        marginTop: 0,
        color: "#b91c1c",
      },
    },
    title || "PRISM Error"
  ),

  h(
    "p",
    {
      style: {
        color: "#475569",
        whiteSpace: "pre-wrap",
      },
    },
    error?.message ||
      String(error) ||
      "Unknown error"
  ),

  onRetry
    ? h(
        "button",
        {
          type: "button",
          onClick: onRetry,
          style: {
            marginTop: "12px",
            padding: "10px 16px",
            border: 0,
            borderRadius: "8px",
            background: "#0f766e",
            color: "#fff",
            cursor: "pointer",
          },
        },
        "Retry"
      )
    : null
)

);
}

/* =====================================================
LOADING
===================================================== */

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
        fontSize: "28px",
        fontWeight: "700",
        color: "#0f766e",
        marginBottom: "10px",
      },
    },
    "PRISM"
  ),

  h(
    "div",
    null,
    message
  )
)

);
}

/* =====================================================
SAFE DIAGNOSTIC DASHBOARD
===================================================== */

function SafeDashboard({
activeAdmissions = [],
onOpenPatient,
}) {
const uniquePatients =
new Set(
activeAdmissions.map(
({ patient }) =>
patient?.id
)
).size;

const specialistPatients =
activeAdmissions.filter(
({ admission }) =>
!!admission?.specialist_id
).length;

return h(
"div",
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
      uniquePatients
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
      specialistPatients
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
      "System Status"
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

              h(
                "th",
                null,
                "Patient"
              ),

              h(
                "th",
                null,
                "Bed"
              ),

              h(
                "th",
                null,
                "Diagnosis"
              ),

              h(
                "th",
                null,
                "Action"
              )
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
                      patient?.full_name ||
                        "—"
                    ),

                    h(
                      "div",
                      {
                        className:
                          "small muted",
                      },
                      patient?.patient_code ||
                        "—"
                    )
                  ),

                  h(
                    "td",
                    null,
                    admission?.bed_id ||
                      "—"
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
                        className:
                          "btn btn-secondary",

                        type:
                          "button",

                        onClick:
                          () =>
                            onOpenPatient(
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

/* =====================================================
APP
===================================================== */

function App() {
const [
session,
setSession,
] = useState(null);

const [
profile,
setProfile,
] = useState(null);

const [
clinicalContext,
setClinicalContext,
] = useState(null);

const [
page,
setPage,
] = useState("dashboard");

const [
selectedPatientId,
setSelectedPatientId,
] = useState(null);

const [
patients,
setPatients,
] = useState([]);

const [
activeAdmissions,
setActiveAdmissions,
] = useState([]);

const [
specialistQueue,
setSpecialistQueue,
] = useState([]);

const [
loading,
setLoading,
] = useState(true);

const [
pageComponent,
setPageComponent,
] = useState(null);

const [
pageLoading,
setPageLoading,
] = useState(false);

const [
pageError,
setPageError,
] = useState(null);

const [
dataError,
setDataError,
] = useState("");

const [
sessionId,
setSessionId,
] = useState(null);

/* ===================================================
PROFILE
=================================================== */

const loadProfile =
useCallback(
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

    setProfile(
      data || null
    );

    return data || null;
  },
  []
);

/* ===================================================
CLINICAL CONTEXT
=================================================== */

const loadClinicalContext =
useCallback(
async () => {
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
  },
  []
);

/* ===================================================
PATIENTS
=================================================== */

const loadPatients =
useCallback(
async () => {
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

      const map =
        new Map();

      const admissions =
        [];

      for (const row of rows) {
        const patientId =
          row.patient_id;

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

        const admission = {
          id:
            row.admission_id,

          patient_id:
            patientId,

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

        if (
          !map.has(
            patientId
          )
        ) {
          map.set(
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
          map.get(
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

        admissions.push({
          patient,
          admission,
        });
      }

      const list =
        Array.from(
          map.values()
        );

      setPatients(
        list
      );

      setActiveAdmissions(
        admissions
      );

      return {
        patients:
          list,

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
  },
  []
);

/* ===================================================
SPECIALIST QUEUE
=================================================== */

const loadSpecialistQueue =
useCallback(
async () => {
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
  },
  []
);

/* ===================================================
WORKSPACE DATA
=================================================== */

const loadWorkspaceData =
useCallback(
async () => {
await Promise.allSettled([
loadClinicalContext(),
loadPatients(),
loadSpecialistQueue(),
]);
},
[
loadClinicalContext,
loadPatients,
loadSpecialistQueue,
]
);

/* ===================================================
SESSION
=================================================== */

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
        .from(
          "user_sessions"
        )
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
          "Session logging error:",
          error
        );

        return null;
      }

      setSessionId(
        data?.id ||
          null
      );

      return data?.id ||
        null;

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

/* ===================================================
ACTIVITY
=================================================== */

const recordActivity =
useCallback(
async (
action,
options = {}
) => {
if (
!session?.user?.id
) {
return;
}

    try {
      await db
        .from(
          "activity_events"
        )
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

/* ===================================================
NON-DASHBOARD PAGE LOADER
=================================================== */

const loadCurrentPage =
useCallback(
async (
targetPage
) => {
if (
targetPage ===
"dashboard"
) {
return;
}

    setPageLoading(
      true
    );

    setPageError(
      null
    );

    try {
      let Component;

      switch (
        targetPage
      ) {
        case "patients":
          Component =
            (
              await import(
                "./pages/Patients.js"
              )
            ).default;
          break;

        case "patient":
          Component =
            (
              await import(
                "./pages/Patient.js"
              )
            ).default;
          break;

        case "specialist":
          Component =
            (
              await import(
                "./pages/SpecialistQueue.js"
              )
            ).default;
          break;

        case "administration":
          Component =
            (
              await import(
                "./pages/Administration.js"
              )
            ).default;
          break;

        default:
          return;
      }

      if (
        typeof Component !==
        "function"
      ) {
        throw new Error(
          `Page "${targetPage}" is not a valid React component.`
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

      setPageError(
        error
      );

    } finally {
      setPageLoading(
        false
      );
    }
  },
  []
);

/* ===================================================
AUTH INITIALIZATION
=================================================== */

useEffect(() => {
let mounted =
true;

async function initialize() {
  try {
    setLoading(
      true
    );

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

    if (
      !currentSession
    ) {
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

    setPage(
      "dashboard"
    );

    setLoading(
      false
    );

    loadWorkspaceData();

    startSession(
      currentSession.user,
      currentProfile
    );

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

      setLoading(
        false
      );
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
        try {
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

          setPage(
            "dashboard"
          );

          setLoading(
            false
          );

          loadWorkspaceData();

          startSession(
            newSession.user,
            currentProfile
          );

        } catch (error) {
          console.error(
            "Post-login error:",
            error
          );

          if (mounted) {
            setDataError(
              error?.message ||
                "Unable to open workspace."
            );

            setLoading(
              false
            );
          }
        }
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

        setSelectedPatientId(
          null
        );

        setPage(
          "dashboard"
        );

        setPageComponent(
          null
        );

        setPageError(
          null
        );

        setDataError("");

        setLoading(
          false
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
loadWorkspaceData,
startSession,
]);

/* ===================================================
NAVIGATION
=================================================== */

const navigate =
useCallback(
async (
target
) => {
setPage(
target
);

    if (
      target ===
      "dashboard"
    ) {
      setPageComponent(
        null
      );

      setPageError(
        null
      );

      setPageLoading(
        false
      );

      return;
    }

    await loadCurrentPage(
      target
    );

    if (
      target ===
        "patients" ||
      target ===
        "specialist"
    ) {
      loadWorkspaceData();
    }
  },
  [
    loadCurrentPage,
    loadWorkspaceData,
  ]
);

/* ===================================================
OPEN PATIENT
=================================================== */

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

    await loadCurrentPage(
      "patient"
    );
  },
  [
    recordActivity,
    loadCurrentPage,
  ]
);

/* ===================================================
LOGOUT
=================================================== */

const logout =
useCallback(
async () => {
try {
await db.auth.signOut();
} catch (error) {
console.error(
"Logout error:",
error
);
}
},
[]
);

/* ===================================================
LOGIN CALLBACK
=================================================== */

const handleLogin =
useCallback(
async () => {
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

    try {
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

      setLoading(
        false
      );

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

      setLoading(
        false
      );
    }
  },
  [
    loadProfile,
    loadWorkspaceData,
    startSession,
  ]
);

/* ===================================================
ADMIN
=================================================== */

const isAdmin =
profile?.role ===
"admin";

/* ===================================================
COMMON PROPS
=================================================== */

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

/* ===================================================
GLOBAL LOADING
=================================================== */

if (loading) {
return h(
LoadingScreen,
{
message:
"Loading PRISM...",
}
);
}

/* ===================================================
LOGIN
=================================================== */

if (!session) {
return h(
Login,
{
onLogin:
handleLogin,
}
);
}

/* ===================================================
ERROR
=================================================== */

if (pageError) {
return h(
ErrorScreen,
{
title:
"Unable to load "${page}"",

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

/* ===================================================
CURRENT PAGE
=================================================== */

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
"Loading ${page}...",
}
);
}

/* ===================================================
MAIN UI
=================================================== */

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
        type:
          "button",

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
        type:
          "button",

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
        type:
          "button",

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
            type:
              "button",

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

/* =====================================================
MOUNT
===================================================== */

const root =
document.getElementById(
"root"
);

if (!root) {
document.body.innerHTML =
"<h2 style='padding:20px;font-family:Arial'>PRISM: root element not found.</h2>";
} else {
try {
createRoot(
root
).render(
h(App)
);
} catch (error) {
console.error(
"PRISM mount error:",
error
);

root.innerHTML = "";

const message =
  document.createElement(
    "div"
  );

message.style.cssText =
  "padding:24px;font-family:Arial;color:#b91c1c;background:#fff;";

message.innerHTML =
  "<h2>PRISM failed to start</h2>" +
  "<p>" +
  (
    error?.message ||
    String(error)
  ) +
  "</p>";

root.appendChild(
  message
);

}
            }
