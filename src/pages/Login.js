import React, { useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

export default function Login({ onLogin }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    const cleanLoginId = loginId.trim();

    if (!cleanLoginId || !password) {
      setError("Please enter your PRISM Login ID and password.");
      return;
    }

    setLoading(true);

    try {
      // Resolve PRISM Login ID to the internal Supabase email.
      const { data: resolvedEmail, error: resolveError } =
        await db.rpc("resolve_login_email", {
          p_login_id: cleanLoginId,
        });

      if (resolveError) {
        console.error("Login ID resolution error:", resolveError);
        setError("Unable to resolve Login ID.");
        setLoading(false);
        return;
      }

      if (!resolvedEmail) {
        setError("Invalid Login ID or inactive account.");
        setLoading(false);
        return;
      }

      // Supabase Auth still authenticates using its internal email,
      // while the user only needs to know their PRISM Login ID.
      const { data, error: signInError } =
        await db.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });

      if (signInError) {
        setError("Invalid Login ID or password.");
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("Authentication succeeded but no user was returned.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onLogin(data.user);
    } catch (err) {
      console.error("Login error:", err);
      setLoading(false);
      setError("Unable to sign in. Please try again.");
    }
  }

  return React.createElement(
    "div",
    { className: "login-page" },

    React.createElement(
      "div",
      { className: "login-card" },

      React.createElement(
        "div",
        { className: "brand" },

        React.createElement(
          "div",
          { className: "brand-mark" },
          "P"
        ),

        React.createElement(
          "div",
          null,

          React.createElement(
            "div",
            { className: "brand-title" },
            "PRISM"
          ),

          React.createElement(
            "div",
            { className: "brand-subtitle" },
            "Problem-oriented Inpatient Review & Structured Monitoring"
          )
        )
      ),

      React.createElement(
        "h2",
        { className: "login-title" },
        "Sign in"
      ),

      error
        ? React.createElement(
            "div",
            { className: "error" },
            error
          )
        : null,

      React.createElement(
        "form",
        { onSubmit: submit },

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "PRISM Login ID"
          ),

          React.createElement("input", {
            type: "text",
            value: loginId,
            autoComplete: "username",
            autoCapitalize: "none",
            spellCheck: false,
            onChange: (e) => setLoginId(e.target.value),
            placeholder: "Enter your Login ID"
          })
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Password"
          ),

          React.createElement("input", {
            type: "password",
            value: password,
            autoComplete: "current-password",
            onChange: (e) => setPassword(e.target.value),
            placeholder: "Password"
          })
        ),

        React.createElement(
          "button",
          {
            className: "btn btn-primary",
            type: "submit",
            disabled: loading,
            style: { width: "100%" }
          },
          loading ? "Signing in..." : "Sign in"
        )
      )
    )
  );
            }
