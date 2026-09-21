import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";
import { formatDate } from "../helpers.js";

export default function SpecialistQueue({ profile }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");

    let query = db
      .from("specialist_requests")
      .select("*")
      .order("requested_at", {
        ascending: false
      });

    if (profile?.role === "specialist") {
      query = query.eq(
        "specialist_id",
        profile.id
      );
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
      setRequests([]);
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, [profile?.id, profile?.role]);

  function priorityClass(priority) {
    if (priority === "urgent") {
      return "badge-unstable";
    }

    if (priority === "review_today") {
      return "badge-deteriorating";
    }

    return "badge-improving";
  }

  return React.createElement(
    React.Fragment,
    null,

    React.createElement(
      "div",
      { className: "row wrap" },

      React.createElement(
        "div",
        null,

        React.createElement(
          "div",
          { className: "page-title" },
          "Specialist Queue"
        ),

        React.createElement(
          "div",
          { className: "page-subtitle" },
          profile?.role === "specialist"
            ? "Patients requiring your specialist review"
            : "Specialist consultation requests"
        )
      ),

      React.createElement(
        "button",
        {
          className: "btn btn-secondary",
          onClick: loadRequests,
          disabled: loading
        },
        loading ? "Refreshing..." : "Refresh"
      )
    ),

    error
      ? React.createElement(
          "div",
          { className: "error" },
          error
        )
      : null,

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Requests"
      ),

      loading
        ? React.createElement(
            "div",
            { className: "loading" },
            "Loading specialist queue..."
          )

        : requests.length === 0

          ? React.createElement(
              "div",
              { className: "empty" },
              "No specialist requests found."
            )

          : React.createElement(
              "div",
              { className: "table-wrap" },

              React.createElement(
                "table",
                null,

                React.createElement(
                  "thead",
                  null,

                  React.createElement(
                    "tr",
                    null,

                    React.createElement(
                      "th",
                      null,
                      "Priority"
                    ),

                    React.createElement(
                      "th",
                      null,
                      "Status"
                    ),

                    React.createElement(
                      "th",
                      null,
                      "Patient / Admission"
                    ),

                    React.createElement(
                      "th",
                      null,
                      "Reason"
                    ),

                    React.createElement(
                      "th",
                      null,
                      "Clinical Question"
                    ),

                    React.createElement(
                      "th",
                      null,
                      "Requested"
                    )
                  )
                ),

                React.createElement(
                  "tbody",
                  null,

                  requests.map((request) =>
                    React.createElement(
                      "tr",
                      {
                        key: request.id
                      },

                      React.createElement(
                        "td",
                        null,

                        React.createElement(
                          "span",
                          {
                            className:
                              "badge " +
                              priorityClass(
                                request.priority
                              )
                          },
                          request.priority ||
                            "routine"
                        )
                      ),

                      React.createElement(
                        "td",
                        null,
                        request.status || "—"
                      ),

                      React.createElement(
                        "td",
                        null,

                        React.createElement(
                          "div",
                          null,
                          request.patient_id || "—"
                        ),

                        React.createElement(
                          "div",
                          {
                            className:
                              "small muted"
                          },
                          request.admission_id || "—"
                        )
                      ),

                      React.createElement(
                        "td",
                        null,
                        request.reason || "—"
                      ),

                      React.createElement(
                        "td",
                        null,
                        request.clinical_question || "—"
                      ),

                      React.createElement(
                        "td",
                        null,
                        formatDate(
                          request.requested_at
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
