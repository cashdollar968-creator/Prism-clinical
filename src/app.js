import React from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";

import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Patients from "./pages/Patients.js?v=8904a26";
import Patient from "./pages/Patient.js";
import SpecialistQueue from "./pages/SpecialistQueue.js";
import Administration from "./pages/Administration.js";

import { db } from "./supabase.js";


function App() {
  const [session, setSession] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [page, setPage] = React.useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] = React.useState(null);
  const [patients, setPatients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const prismSessionIdRef = React.useRef(null);
  const heartbeatTimerRef = React.useRef(null);


  /* ========================================================
     PROFILE
     ======================================================== */

  async function loadProfile(userId) {
    if (!userId) return null;

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


  /* ========================================================
     ACTIVITY
     ======================================================== */

  async function recordActivity({
    action,
    entityType = null,
    entityId = null,
    patientId = null,
    route = null,
    metadata = {}
  }) {
    const userId = session?.user?.id;

    if (!userId) return;

    try {
      const { error } = await db
        .from("activity_events")
        .insert({
          actor_id: userId,
          session_id: prismSessionIdRef.current || null,
          action,
          entity_type: entityType,
          entity_id: entityId,
          patient_id: patientId,
          route,
          metadata
        });

      if (error) {
        console.error(
          "Activity logging error:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Activity logging exception:",
        error
      );
    }
  }


  /* ========================================================
     PRISM SESSION
     ======================================================== */

  async function startPrismSession(user, userProfile) {
    if (!user?.id) return null;

    try {
      const { data, error } = await db
        .from("user_sessions")
        .insert({
          user_id: user.id,
          role_snapshot:
            userProfile?.role || "unknown",
          location_label: "Web",
          session_type: "web",
          user_agent:
            typeof navigator !== "undefined"
              ? navigator.userAgent
              : null
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          "PRISM session creation error:",
          error
        );

        return null;
      }

      prismSessionIdRef.current = data.id;

      /*
       * Login activity is optional.
       * If it fails, it must never stop the application.
       */
      try {
        await db
          .from("activity_events")
          .insert({
            actor_id: user.id,
            session_id: data.id,
            action: "login",
            entity_type: "session",
            entity_id: data.id,
            route: "login",
            metadata: {
              role:
                userProfile?.role || "unknown"
            }
          });
      } catch (error) {
        console.error(
          "Login activity error:",
          error
        );
      }

      return data.id;

    } catch (error) {
      console.error(
        "PRISM session exception:",
        error
      );

      return null;
    }
  }


  async function heartbeatSession() {
    const sessionId =
      prismSessionIdRef.current;

    if (!sessionId) return;

    try {
      await db
        .from("user_sessions")
        .update({
          last_seen_at:
            new Date().toISOString()
        })
        .eq("id", sessionId)
        .is("ended_at", null);
    } catch (error) {
      console.error(
        "Heartbeat error:",
        error
      );
    }
  }


  async function endPrismSession() {
    const sessionId =
      prismSessionIdRef.current;

    if (!sessionId) return;

    const now =
      new Date().toISOString();

    try {
      await db
        .from("user_sessions")
        .update({
          ended_at: now,
          last_seen_at: now
        })
        .eq("id", sessionId)
        .is("ended_at", null);
    } catch (error) {
      console.error(
        "Session closing error:",
        error
      );
    }

    prismSessionIdRef.current = null;
  }


  /* ========================================================
     AUTHENTICATION
     ======================================================== */

  React.useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const {
          data: {
            session: currentSession
          }
        } = await db.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          const userProfile =
            await loadProfile(
              currentSession.user.id
            );

          if (
            mounted &&
            userProfile
          ) {
            await startPrismSession(
              currentSession.user,
              userProfile
            );
          }
        }

      } catch (error) {
        console.error(
          "PRISM initialization error:",
          error
        );
      }

      if (mounted) {
        setLoading(false);
      }
    }

    initialize();


    const {
      data: {
        subscription
      }
    } = db.auth.onAuthStateChange(
      (event, newSession) => {

        /*
         * Do not perform large async Supabase
         * operations directly inside the auth callback.
         */
        setTimeout(async () => {

          if (!mounted) return;

          setSession(newSession);

          if (!newSession?.user) {
            setProfile(null);
            return;
          }

          const userProfile =
            await loadProfile(
              newSession.user.id
            );

          if (
            mounted &&
            userProfile &&
            !prismSessionIdRef.current
          ) {
            await startPrismSession(
              newSession.user,
              userProfile
            );
          }

        }, 0);
      }
    );


    return () => {
      mounted = false;

      subscription.unsubscribe();

      if (heartbeatTimerRef.current) {
        clearInterval(
          heartbeatTimerRef.current
        );

        heartbeatTimerRef.current = null;
      }
    };

  }, []);


  /* ========================================================
     HEARTBEAT
     ======================================================== */

  React.useEffect(() => {
    if (!session?.user) return;

    if (heartbeatTimerRef.current) {
      clearInterval(
        heartbeatTimerRef.current
      );
    }

    heartbeatTimerRef.current =
      setInterval(
        heartbeatSession,
        60 * 1000
      );

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(
          heartbeatTimerRef.current
        );

        heartbeatTimerRef.current = null;
      }
    };

  }, [session]);


  /* ========================================================
     PATIENTS
     ======================================================== */

  async function loadPatients() {
    if (!session?.user) return;

    setLoading(true);

    try {
      const { data, error } =
        await db
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
          .order(
            "created_at",
            {
              ascending: false
            }
          );

      if (error) {
        console.error(
          "Patients loading error:",
          error
        );

        setPatients([]);
      } else {
        setPatients(data || []);
      }

    } catch (error) {
      console.error(
        "Patients loading exception:",
        error
      );

      setPatients([]);

    } finally {
      setLoading(false);
    }
  }


  React.useEffect(() => {
    if (session?.user) {
      loadPatients();
    }
  }, [session]);


  /* ========================================================
     NAVIGATION
     ======================================================== */

  async function openPatient(patientId) {
    if (!patientId) return;

    setSelectedPatientId(patientId);
    setPage("patient");

    await recordActivity({
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
      action: "view_page",
      entityType: "page",
      route: targetPage
    });
  }


  /* ========================================================
     LOGOUT
     ======================================================== */

  async function logout() {
    await endPrismSession();

    await db.auth.signOut();

    setSession(null);
    setProfile(null);
    setPatients([]);
    setPage("dashboard");
    setSelectedPatientId(null);
  }


  /* ========================================================
     LOADING SCREEN
     ======================================================== */

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


  /* ========================================================
     LOGIN
     ======================================================== */

  if (!session) {
    return <Login />;
  }


  /* ========================================================
     APPLICATION
     ======================================================== */

  return (
    <div className="app-shell">

      <header className="topbar">

        <div className="brand">

          <div className="brand-title">
            PRISM
          </div>

          <div className="brand-subtitle">
            Problem-oriented Inpatient Review
            & Structured Monitoring
          </div>

        </div>


        <div className="topbar-user">

          <div>

            <strong>
              {profile?.display_name ||
                "User"}
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
          onClick={() =>
            navigate("dashboard")
          }
        >
          Dashboard
        </button>


        <button
          className={
            page === "patients"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("patients")
          }
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
            navigate(
              "specialist-queue"
            )
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
              navigate(
                "administration"
              )
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
              patientId={
                selectedPatientId
              }
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


/* ========================================================
   ROOT
   ======================================================== */

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
