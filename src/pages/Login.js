import React, { useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Unable to sign in.");
      return;
    }

    if (!data?.user) {
      setError("Authentication succeeded but no user was returned.");
      return;
    }

    onLogin(data.user);
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
            "Email"
          ),

          React.createElement("input", {
            type: "email",
            value: email,
            autoComplete: "username",
            onChange: (e) => setEmail(e.target.value),
            placeholder: "name@example.com"
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
