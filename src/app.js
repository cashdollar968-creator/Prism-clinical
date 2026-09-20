import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

import { db } from "./supabase.js";
import { roleLabel } from "./helpers.js";

import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Patients from "./pages/Patients.js";
import Patient from "./pages/Patient.js";
import SpecialistQueue from "./pages/SpecialistQueue.js";
import Administration from "./pages/Administration.js";

import FollowupModal from "./components/FollowupModal.js";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProfile(user) {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      setProfile(null);
      setError(
        error.message ||
          "Unable to load your PRISM profile."
      );
      return;
    }

    if (!data?.active) {
      setProfile(null);
      setError(
        "Your PRISM account is inactive. Please contact an administrator."
      );
      return;
    }

    setProfile(data);
    setError("");
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { session }
      } = await db.auth.getSession();

      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        await loadProfile(session.user);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    initialize();

    const {
      data: { subscription }
    } = db.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          await loadProfile(newSession.user);
        } else {
          setProfile(null);
          setError("");
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(user) {
    setLoading(true);
    setError("");

    await loadProfile(user);

    setSession({
      user
    });

    setLoading(false);
  }

  async function signOut() {
    await db.auth.signOut();
    setSession(null);
    setProfile(null);
    setError("");
  }

  if (loading) {
    return React.createElement(
      "div",
      { className: "loading" },
      "Loading PRISM..."
    );
  }

  if (!session) {
    return React.createElement(
      Login,
      {
        onLogin: handleLogin
      }
    );
  }

  if (!profile) {
    return React.createElement(
      "div",
      {
        className: "login-page"
      },

      React.createElement(
        "div",
        {
          className: "login-card"
        },

        React.createElement(
          "div",
          {
            className: "brand"
          },

          React.createElement(
            "div",
            {
              className: "brand-mark"
            },
            "P"
          ),

          React.createElement(
            "div",
            null,

            React.createElement(
              "div",
              {
                className: "brand-title"
              },
              "PRISM"
            ),

            React.createElement(
              "div",
              {
                className: "brand-subtitle"
              },
              "Problem-oriented Inpatient Review & Structured Monitoring"
            )
          )
        ),

        React.createElement(
          "div",
          {
            className: "error"
          },
          error ||
            "Your PRISM profile could not be loaded."
        ),

        React.createElement(
          "button",
          {
            className: "btn btn-secondary",
            onClick: signOut,
            style: {
              width: "100%"
            }
          },
          "Sign out"
        )
      )
    );
  }

  return React.createElement(
    MainApp,
    {
      profile,
      user: session.user,
      onSignOut: signOut
    }
  );
}

function MainApp({
  profile,
  user,
  onSignOut
}) {
  const [page, setPage] = useState("dashboard");

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPatient, setSelectedPatient] =
    useState(null);

  async function loadPatients() {
    setLoading(true);
    setError("");

    const {
      data,
      error
    } = await db
      .from("patients")
      .select(`
        id,
        patient_code,
        full_name,
        age,
        sex,
        demo,
        created_at,
        admissions(
          id,
          ward_id,
          bed_id,
          admission_datetime,
          discharge_datetime,
          status,
          responsible_mo_id,
          specialist_id,
          reason_for_admission,
          brief_summary,
          working_diagnosis,
          relevant_background,
          baseline_clinical_status,
          baseline_investigations,
          initial_plan,
          goals_targets,
          created_at
        )
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      setError(error.message);
      setPatients([]);
      setLoading(false);
      return;
    }

    setPatients(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const activeAdmissions = patients.flatMap(
    (patient) =>
      (patient.admissions || [])
        .filter(
          (admission) =>
            admission.status === "active"
        )
        .map((admission) => ({
          patient,
          admission
        }))
  );

  function openPatient(patient) {
    setSelectedPatient(patient);
    setPage("patient");
  }

  function navigate(nextPage) {
    setPage(nextPage);
  }

  function renderPage() {
    if (page === "dashboard") {
      return React.createElement(
        Dashboard,
        {
          activeAdmissions,
          onOpenPatient: openPatient
        }
      );
    }

    if (page === "patients") {
      return React.createElement(
        Patients,
        {
          patients,
          loading,
          onRefresh: loadPatients,
          onOpenPatient: openPatient
        }
      );
    }

    if (page === "patient") {
      return React.createElement(
        Patient,
        {
          patient: selectedPatient,
          profile
        }
      );
    }

    if (page === "specialist") {
      return React.createElement(
        SpecialistQueue,
        {
          profile
        }
      );
    }

    if (
      page === "administration" &&
      profile.role === "admin"
    ) {
      return React.createElement(
        Administration,
        {
          profile
        }
      );
    }

    return React.createElement(
      Dashboard,
      {
        activeAdmissions,
        onOpenPatient: openPatient
      }
    );
  }

  return React.createElement(
    "div",
    {
      className: "app"
    },

    React.createElement(
      "header",
      {
        className: "topbar"
      },

      React.createElement(
        "div",
        {
          className: "topbar-left"
        },

        React.createElement(
          "div",
          {
            className: "topbar-title"
          },
          "PRISM"
        ),

        React.createElement(
          "span",
          {
            className: "role-badge"
          },
          roleLabel(profile.role)
        )
      ),

      React.createElement(
        "div",
        {
          className: "topbar-left"
        },

        React.createElement(
          "span",
          {
            className: "small muted"
          },
          profile.display_name ||
            profile.email ||
            "User"
        ),

        React.createElement(
          "button",
          {
            className: "btn btn-secondary",
            onClick: onSignOut
          },
          "Sign out"
        )
      )
    ),

    React.createElement(
      "div",
      {
        className: "layout"
      },

      React.createElement(
        "aside",
        {
          className: "sidebar"
        },

        React.createElement(
          "button",
          {
            className:
              "nav-btn " +
              (page === "dashboard"
                ? "active"
                : ""),
            onClick: () =>
              navigate("dashboard")
          },
          "Dashboard"
        ),

        React.createElement(
          "button",
          {
            className:
              "nav-btn " +
              (page === "patients"
                ? "active"
                : ""),
            onClick: () =>
              navigate("patients")
          },
          "Patients"
        ),

        React.createElement(
          "button",
          {
            className:
              "nav-btn " +
              (page === "specialist"
                ? "active"
                : ""),
            onClick: () =>
              navigate("specialist")
          },
          "Specialist Queue"
        ),

        profile.role === "admin"
          ? React.createElement(
              "button",
              {
                className:
                  "nav-btn " +
                  (page === "administration"
                    ? "active"
                    : ""),
                onClick: () =>
                  navigate(
                    "administration"
                  )
              },
              "Administration"
            )
          : null
      ),

      React.createElement(
        "main",
        {
          className: "content"
        },

        error
          ? React.createElement(
              "div",
              {
                className: "error"
              },
              error
            )
          : null,

        renderPage()
      )
    )
  );
}

const root = createRoot(
  document.getElementById("root")
);

root.render(
  React.createElement(App)
);
