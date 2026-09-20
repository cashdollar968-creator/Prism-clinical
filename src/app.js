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

  React.useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await db.auth.getSession();

      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        await loadProfile(session.user.id);
      }

      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile loading error:", error);
      setProfile(null);
      return;
    }

    setProfile(data);
  }

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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Patients loading error:", error);
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

  function openPatient(patientId) {
    setSelectedPatientId(patientId);
    setPage("patient");
  }

  function navigate(targetPage) {
    setSelectedPatientId(null);
    setPage(targetPage);
  }

  async function logout() {
    await db.auth.signOut();
    setSession(null);
    setProfile(null);
    setPatients([]);
    setPage("dashboard");
    setSelectedPatientId(null);
  }

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

  if (!session) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-title">PRISM</div>
          <div className="brand-subtitle">
            Problem-oriented Inpatient Review & Structured Monitoring
          </div>
        </div>

        <div className="topbar-user">
          <div>
            <strong>{profile?.display_name || "User"}</strong>
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
          className={page === "dashboard" ? "nav-active" : ""}
          onClick={() => navigate("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={page === "patients" ? "nav-active" : ""}
          onClick={() => navigate("patients")}
        >
          Patients
        </button>

        <button
          className={page === "specialist-queue" ? "nav-active" : ""}
          onClick={() => navigate("specialist-queue")}
        >
          Specialist Queue
        </button>

        {profile?.role === "admin" && (
          <button
            className={page === "administration" ? "nav-active" : ""}
            onClick={() => navigate("administration")}
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

        {page === "patient" && selectedPatientId && (
          <Patient
            patientId={selectedPatientId}
            onBack={() => navigate("patients")}
          />
        )}

        {page === "specialist-queue" && (
          <SpecialistQueue />
        )}

        {page === "administration" &&
          profile?.role === "admin" && (
            <Administration />
          )}
      </main>
    </div>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("PRISM root element not found.");
}

createRoot(rootElement).render(<App />);
