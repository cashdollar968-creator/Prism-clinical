import React, { useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

export default function Login({ onLogin }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();

    setError("");

    const normalizedLoginId = loginId.trim();

    if (!normalizedLoginId || !password) {
      setError("Please enter your PRISM Login ID and password.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Resolve the PRISM Login ID to the internal
       * authentication email.
       *
       * This function is intentionally exposed through
       * the public invoker wrapper so it can be called
       * before authentication.
       */

      const {
        data: resolvedEmail,
        error: resolveError
      } = await db.rpc(
        "resolve_login_email",
        {
          p_login_id: normalizedLoginId
        }
      );

      if (resolveError) {
        throw new Error(
          resolveError.message ||
          "Unable to resolve PRISM Login ID."
        );
      }

      if (!resolvedEmail) {
        throw new Error(
          "Invalid PRISM Login ID or password."
        );
      }

      /*
       * Authenticate through Supabase Auth
       * using the internally resolved email.
       */

      const {
        data,
        error: signInError
      } = await db.auth.signInWithPassword({
        email: resolvedEmail,
        password
      });

      if (signInError) {
        throw new Error(
          "Invalid PRISM Login ID or password."
        );
      }

      if (!data?.user) {
        throw new Error(
          "Authentication succeeded but no user was returned."
        );
      }

      onLogin(data.user);

    } catch (err) {
      console.error(
        "PRISM login error:",
        err
      );

      setError(
        err?.message ||
        "Unable to sign in."
      );

    } finally {
      setLoading(false);
    }
  }

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

      /*
       * PRISM BRAND
       */

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

      /*
       * TITLE
       */

      React.createElement(
        "h2",
        {
          className: "login-title"
        },
        "Sign in"
      ),

      /*
       * ERROR
       */

      error
        ? React.createElement(
            "div",
            {
              className: "error"
            },
            error
          )
        : null,

      /*
       * LOGIN FORM
       */

      React.createElement(
        "form",
        {
          onSubmit: submit
        },

        /*
         * PRISM LOGIN ID
         */

        React.createElement(
          "div",
          {
            className: "field"
          },

          React.createElement(
            "label",
            null,
            "PRISM Login ID"
          ),

          React.createElement(
            "input",
            {
              type: "text",

              value: loginId,

              autoComplete: "username",

              autoCapitalize: "none",

              autoCorrect: "off",

              spellCheck: false,

              onChange: (event) =>
                setLoginId(
                  event.target.value
                ),

              placeholder: "e.g. ADMIN"
            }
          )
        ),

        /*
         * PASSWORD
         */

        React.createElement(
          "div",
          {
            className: "field"
          },

          React.createElement(
            "label",
            null,
            "Password"
          ),

          React.createElement(
            "input",
            {
              type: "password",

              value: password,

              autoComplete:
                "current-password",

              onChange: (event) =>
                setPassword(
                  event.target.value
                ),

              placeholder: "Password"
            }
          )
        ),

        /*
         * SUBMIT
         */

        React.createElement(
          "button",
          {
            className:
              "btn btn-primary",

            type: "submit",

            disabled: loading,

            style: {
              width: "100%"
            }
          },

          loading
            ? "Signing in..."
            : "Sign in"
        )
      )
    )
  );
      }
