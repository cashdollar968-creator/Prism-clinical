import React from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";

import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Patients from "./pages/Patients.js?v=8904a26";
import Patient from "./pages/Patient.js";
import SpecialistQueue from "./pages/SpecialistQueue.js";
import Administration from "./pages/Administration.js";

import { db } from "./supabase.js";


/* =========================================================
   PRISM SESSION + ACTIVITY MONITORING
   ========================================================= */

const SESSION_STORAGE_KEY = "prism_session_id";
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute


function getStoredSessionId() {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}


function storeSessionId(sessionId) {
  try {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
  } catch {
    // Ignore storage failures.
  }
}


function clearStoredSessionId() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}


/*
 * Create a new PRISM application session.
 *
 * Important:
 * This is NOT the Supabase authentication session.
 * It is PRISM's own activity/session record.
 */
async function startPrismSession(user, profile) {
  if (!user?.id) return null;

  /*
   * If there is already a session stored locally, do not
   * automatically reuse it as a new active session.
   *
   * We create a new PRISM session after a fresh application load.
   */
  const roleSnapshot = profile?.role || "unknown";

  const { data, error } = await db
    .from("user_sessions")
    .insert({
      user_id: user.id,
      role_snapshot: roleSnapshot,
      session_type: "web",
      location_label: profile?.department_id
        ? `Department: ${profile.department_id}`
        : "Web",
      user_agent: navigator.userAgent,
      metadata: {
        source: "prism_web_app"
      }
    })
    .select("id")
    .single();

  if (error) {
    console.error("PRISM session creation failed:", error);
    return null;
  }

  storeSessionId(data.id);

  await recordActivity({
    userId: user.id,
    sessionId: data.id,
    action: "login",
    entityType: "session",
    entityId: data.id,
    metadata: {
      role: roleSnapshot
    }
  });

  return data.id;
}


/*
 * Update session heartbeat.
 */
async function heartbeatSession(sessionId) {
  if (!sessionId) return;

  const { error } = await db
    .from("user_sessions")
    .update({
      last_seen_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .is("ended_at", null);

  if (error) {
    console.error("PRISM heartbeat failed:", error);
  }
}


/*
 * Close the current PRISM session.
 */
async function endPrismSession(userId) {
  const sessionId = getStoredSessionId();

  if (!sessionId) return;

  if (userId) {
    await recordActivity({
      userId,
      sessionId,
      action: "logout",
      entityType: "session",
      entityId: sessionId
    });
  }

  const { error } = await db
    .from("user_sessions")
    .update({
      ended_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .is("ended_at", null);

  if (error) {
    console.error("PRISM session close failed:", error);
  }

  clearStoredSessionId();
}


/*
 * Record an application activity event.
 *
 * Do NOT put clinical content in metadata.
 * Patient identifiers should only be represented by
 * the database patient_id field where applicable.
 */
async function recordActivity({
  userId,
  sessionId,
  action,
  entityType = null,
  entityId = null,
  patientId = null,
  route = null,
  metadata = {}
}) {
  if (!userId || !action) return;

  const { error } = await db
    .from("activity_events")
    .insert({
      actor_id: userId,
      session_id: sessionId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      patient_id: patientId,
      route,
      metadata
    });

  if (error) {
    /*
     * Activity monitoring must never crash the clinical app.
     * If activity logging fails, the clinical workflow continues.
     */
    console.error("PRISM activity logging failed:", error);
  }
}


/* =========================================================
   MAIN APPLICATION
   ========================================================= */

function App() {
  const [session, setSession] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [page, setPage] = React.useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] = React.useState(null);
  const [patients, setPatients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const prismSessionIdRef = React.useRef(null);
  const heartbeatTimerRef = React.useRef(null);


  /* -------------------------------------------------------
     Load profile
     ------------------------------------------------------- */

  async function loadProfile(userId) {
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

    setProfile(data);
    return data;
  }


  /* -------------------------------------------------------
     Start monitoring for authenticated user
     ------------------------------------------------------- */

  async function startMonitoring(user, userProfile) {
    if (!user?.id) return;

    /*
     * Avoid creating duplicate PRISM sessions if this function
     * is accidentally called more than once during auth events.
     */
    if (prismSessionIdRef.current) {
      return;
    }

    const sessionId = await startPrismSession(user, userProfile);

    prismSessionIdRef.current = sessionId;

    if (!sessionId) {
      return;
    }

    /*
     * Clear any previous heartbeat timer.
     */
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    /*
     * Keep the activity session alive while the application
     * remains open.
     */
    heartbeatTimerRef.current = setInterval(() => {
      heartbeatSession(sessionId);
    }, HEARTBEAT_INTERVAL);
  }


  /* -------------------------------------------------------
     Stop monitoring
     ------------------------------------------------------- */

  async function stopMonitoring(userId) {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    await endPrismSession(userId);

    prismSessionIdRef.current = null;
  }


  /* -------------------------------------------------------
     Initial authentication
     ------------------------------------------------------- */

  React.useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session: authSession }
      } = await db.auth.getSession();

      if (!mounted) return;

      setSession(authSession);

      if (authSession?.user) {
        const userProfile = await loadProfile(authSession.user.id);

        if (mounted) {
          await startMonitoring(
            authSession.user,
            userProfile
          );
        }
      }

      if (mounted) {
        setLoading(false);
      }
    }

    loadSession();

    /*
     * Listen for Supabase authentication changes.
     */
    const {
      data: { subscription }
    } = db.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          const userProfile = await loadProfile(
            newSession.user.id
          );

          if (mounted) {
            await startMonitoring(
              newSession.user,
              userProfile
            );
          }
        } else {
          setProfile(null);
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;

      subscription.unsubscribe();

      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, []);


  /* -------------------------------------------------------
     Load patients
     ------------------------------------------------------- */

  async function loadPatients() {
    if (!session?.user) return;

    setLoading(true);

    const { data, error } = await db
      .from("patients")
      .select(`
        *,
        admissions (
          id,
          admission_datetime,
          discharge_datetime,
          status,
          ward_id,
          bed_id,
          responsible_mo_id,
          specialist_id,
          reason_for_admission,
          brief_summary,
          working_diagnosis
        )
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error(
        "Patients loading error:",
        error
      );

      setPatients([]);
    } else {
      setPatients(data || []);
    }

    setLoading(false);
  }


  React.useEffect(() => {
    if (session?.user) {
      loadPatients();
    }
  }, [session]);


  /* -------------------------------------------------------
     Navigation
     ------------------------------------------------------- */

  async function openPatient(patientId) {
    if (!patientId) return;

    setSelectedPatientId(patientId);
    setPage("patient");

    await recordActivity({
      userId: session?.user?.id,
      sessionId: prismSessionIdRef.current,
      action: "view_patient",
      entityType: "patient",
      entityId: patientId,
      patientId,
      route: "patient"
    });
  }


  async function navigate(targetPage) {
    setSelectedPatientId(null);
    setPage(targetPage);

    await recordActivity({
      userId: session?.user?.id,
      sessionId: prismSessionIdRef.current,
      action: "view_page",
      entityType: "page",
      route: targetPage
    });
  }


  /* -------------------------------------------------------
     Logout
     ------------------------------------------------------- */

  async function logout() {
    const userId = session?.user?.id;

    await stopMonitoring(userId);

    await db.auth.signOut();

    setSession(null);
    setProfile(null);
    setPatients([]);
    setPage("dashboard");
    setSelectedPatientId(null);
  }


  /* -------------------------------------------------------
     Loading
     ------------------------------------------------------- */

  if (loading && !session) {
    return (
      <div className="app-loading">
        <div className="loading-card">
          <h2>PRISM</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }


  /* -------------------------------------------------------
     Not authenticated
     ------------------------------------------------------- */

  if (!session) {
    return <Login />;
  }


  /* -------------------------------------------------------
     Application
     ------------------------------------------------------- */

  return (
    <div className="app-shell">

      <header className="topbar">

        <div className="brand">

          <div className="brand-title">
            PRISM
          </div>

          <div className="brand-subtitle">
            Problem-oriented Inpatient Review & Structured Monitoring
          </div>

        </div>


        <div className="topbar-user">

          <div>

            <strong>
              {profile?.display_name || "User"}
            </strong>

            <div className="user-role">
              {profile?.role || ""}
            </div>

          </div>


          <button
            className="btn btn-secondary"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>


      <nav className="main-nav">

        <button
          className={
            page === "dashboard"
              ? "nav-active"
              : ""
          }
          onClick={() => navigate("dashboard")}
        >
          Dashboard
        </button>


        <button
          className={
            page === "patients"
              ? "nav-active"
              : ""
          }
          onClick={() => navigate("patients")}
        >
          Patients
        </button>


        <button
          className={
            page === "specialist-queue"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("specialist-queue")
          }
        >
          Consultant Queue
        </button>


        {profile?.role === "admin" && (
          <button
            className={
              page === "administration"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              navigate("administration")
            }
          >
            Administration
          </button>
        )}

      </nav>


      <main className="main-content">

        {page === "dashboard" && (
          <Dashboard
            patients={patients}
            onOpenPatient={openPatient}
            onNavigate={navigate}
          />
        )}


        {page === "patients" && (
          <Patients
            patients={patients}
            loading={loading}
            onRefresh={loadPatients}
            onOpenPatient={openPatient}
          />
        )}


        {page === "patient" &&
          selectedPatientId && (
            <Patient
              patientId={selectedPatientId}
              onBack={() =>
                navigate("patients")
              }
            />
          )}


        {page === "specialist-queue" && (
          <SpecialistQueue />
        )}


        {page === "administration" &&
          profile?.role === "admin" && (
            <Administration
              profile={profile}
            />
          )}

      </main>

    </div>
  );
}


/* =========================================================
   ROOT
   ========================================================= */

const rootElement =
  document.getElementById("root");


if (!rootElement) {
  throw new Error(
    "PRISM root element not found."
  );
}


createRoot(rootElement).render(
  <App />
);
