import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Patients from "./pages/Patients.js";
import Patient from "./pages/Patient.js";
import SpecialistQueue from "./pages/SpecialistQueue.js";
import Administration from "./pages/Administration.js";

import { db } from "./supabase.js";

const h = React.createElement;

function App() {
  const [session, setSession] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [page, setPage] = React.useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] = React.useState(null);
  const [patients, setPatients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const prismSessionIdRef = React.useRef(null);
  const heartbeatTimerRef = React.useRef(null);

  async function loadProfile(userId) {
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
  }

  async function recordActivity(eventType, metadata = {}) {
    try {
      if (!session?.user?.id) return;

      await db.from("activity_events").insert({
        user_id: session.user.id,
        session_id: prismSessionIdRef.current,
        event_type: eventType,
        metadata
      });
    } catch (error) {
      console.error("Activity recording error:", error);
    }
  }

  async function startPrismSession(user) {
    if (!user?.id) return;

    try {
      const { data, error } = await db
        .from("user_sessions")
        .insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (error) {
        console.error("Session start error:", error);
        return;
      }

      prismSessionIdRef.current = data?.id || null;

      await recordActivity("session_started");
    } catch (error) {
      console.error("Session initialization error:", error);
    }
  }

  async function heartbeatSession() {
    const sessionId = prismSessionIdRef.current;

    if (!sessionId) return;

    try {
      await db
        .from("user_sessions")
        .update({
          last_seen_at: new Date().toISOString()
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Session heartbeat error:", error);
    }
  }

  async function endPrismSession() {
    const sessionId = prismSessionIdRef.current;

    if (!sessionId) return;

    try {
      await db
        .from("user_sessions")
        .update({
          ended_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      prismSessionIdRef.current = null;
    } catch (error) {
      console.error("Session end error:", error);
    }
  }

  async function initializeAuth() {
    try {
      const {
        data: { session: currentSession }
      } = await db.auth.getSession();

      setSession(currentSession);

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
        await startPrismSession(currentSession.user);
      }
    } catch (error) {
      console.error("Authentication initialization error:", error);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let mounted = true;

    initializeAuth();

    const {
      data: { subscription }
    } = db.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setPatients([]);
        setSelectedPatientId(null);
        setPage("dashboard");
        return;
      }

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();

      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      endPrismSession();
    };
  }, []);

  React.useEffect(() => {
    if (!session?.user) return;

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      heartbeatSession();
    }, 60000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [session?.user?.id]);

  async function loadPatients() {
    try {
      const { data, error } = await db
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Patients loading error:", error);
        return;
      }

      setPatients(data || []);
    } catch (error) {
      console.error("Patients loading exception:", error);
    }
  }

  async function openPatient(patientId) {
    if (!patientId) return;

    setSelectedPatientId(patientId);
    setPage("patient");

    await recordActivity("patient_opened", {
      patient_id: patientId
    });
  }

  async function navigate(nextPage) {
    setPage(nextPage);

    if (nextPage === "patients") {
      await loadPatients();
    }

    await recordActivity("navigation", {
      page: nextPage
    });
  }

  async function logout() {
    try {
      await recordActivity("logout");

      await endPrismSession();

      const { error } = await db.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
      }

      setSession(null);
      setProfile(null);
      setPatients([]);
      setSelectedPatientId(null);
      setPage("dashboard");
    } catch (error) {
      console.error("Logout exception:", error);
    }
  }

  if (loading) {
    return h(
      "div",
      { className: "app-loading" },
      h(
        "div",
        { className: "app-loading-card" },
        h("div", { className: "app-loading-logo" }, "PRISM"),
        h(
          "div",
          { className: "app-loading-text" },
          "Loading clinical workspace..."
        )
      )
    );
  }

  if (!session) {
    return h(Login);
  }

  const commonProps = {
    session,
    profile,
    patients,
    setPatients,
    onNavigate: navigate,
    onOpenPatient: openPatient,
    onLogout: logout,
    recordActivity
  };

  let content = null;

  if (page === "dashboard") {
    content = h(Dashboard, commonProps);
  } else if (page === "patients") {
    content = h(Patients, commonProps);
  } else if (page === "patient") {
    content = h(Patient, {
      ...commonProps,
      patientId: selectedPatientId
    });
  } else if (page === "specialist") {
    content = h(SpecialistQueue, commonProps);
  } else if (page === "administration") {
    content = h(Administration, commonProps);
  } else {
    content = h(Dashboard, commonProps);
  }

  return h(
    "div",
    { className: "prism-app" },

    h(
      "header",
      { className: "topbar" },

      h(
        "div",
        { className: "topbar-left" },

        h(
          "button",
          {
            type: "button",
            className: "brand-button",
            onClick: () => navigate("dashboard")
          },
          h("span", { className: "brand-mark" }, "P"),
          h(
            "span",
            { className: "brand-text" },
            h("strong", null, "PRISM"),
            h("small", null, "Clinical Documentation")
          )
        )
      ),

      h(
        "div",
        { className: "topbar-right" },

        profile
          ? h(
              "div",
              { className: "user-summary" },
              h(
                "div",
                { className: "user-summary-name" },
                profile.full_name ||
                  profile.name ||
                  session.user.email ||
                  "User"
              ),
              h(
                "div",
                { className: "user-summary-role" },
                profile.role || "Medical Officer"
              )
            )
          : null,

        h(
          "button",
          {
            type: "button",
            className: "btn btn-secondary",
            onClick: logout
          },
          "Logout"
        )
      )
    ),

    h(
      "div",
      { className: "app-body" },

      h(
        "aside",
        { className: "sidebar" },

        h(
          "nav",
          { className: "sidebar-nav" },

          h(
            "button",
            {
              type: "button",
              className:
                "nav-item" +
                (page === "dashboard" ? " active" : ""),
              onClick: () => navigate("dashboard")
            },
            h("span", { className: "nav-icon" }, "⌂"),
            h("span", null, "Dashboard")
          ),

          h(
            "button",
            {
              type: "button",
              className:
                "nav-item" +
                (page === "patients" || page === "patient"
                  ? " active"
                  : ""),
              onClick: () => navigate("patients")
            },
            h("span", { className: "nav-icon" }, "◉"),
            h("span", null, "Patients")
          ),

          h(
            "button",
            {
              type: "button",
              className:
                "nav-item" +
                (page === "specialist" ? " active" : ""),
              onClick: () => navigate("specialist")
            },
            h("span", { className: "nav-icon" }, "✚"),
            h("span", null, "Specialist Queue")
          ),

          profile?.role === "admin"
            ? h(
                "button",
                {
                  type: "button",
                  className:
                    "nav-item" +
                    (page === "administration" ? " active" : ""),
                  onClick: () => navigate("administration")
                },
                h("span", { className: "nav-icon" }, "⚙"),
                h("span", null, "Administration")
              )
            : null
        ),

        h(
          "div",
          { className: "sidebar-footer" },
          h("div", null, "PRISM"),
          h("small", null, "Problem-oriented inpatient care")
        )
      ),

      h(
        "main",
        { className: "main-content" },
        content
      )
    )
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("PRISM root element was not found.");
}

createRoot(rootElement).render(h(App));
