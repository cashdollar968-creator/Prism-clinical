import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

const h = React.createElement;

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function priorityClass(priority) {
  if (priority === "urgent") {
    return "badge badge-danger";
  }

  if (priority === "high") {
    return "badge badge-warning";
  }

  return "badge";
}

export default function SpecialistQueue({
  profile,
  onOpenPatient
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    clinical_assessment: "",
    problem_assessment: "",
    recommendations: "",
    management_plan: "",
    monitoring_instructions: "",
    follow_up_timing: "",
    escalation_instructions: "",
    signature: ""
  });

  const [saving, setSaving] = useState(false);

  async function loadQueue() {
    setLoading(true);
    setError("");

    const {
      data,
      error: rpcError
    } = await db.rpc(
      "prism_get_specialist_queue"
    );

    if (rpcError) {
      setError(rpcError.message);
      setRequests([]);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, [profile?.id, profile?.role]);

  function updateField(key, value) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }

  function resetForm() {
    setForm({
      clinical_assessment: "",
      problem_assessment: "",
      recommendations: "",
      management_plan: "",
      monitoring_instructions: "",
      follow_up_timing: "",
      escalation_instructions: "",
      signature: ""
    });
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!selected) return;

    setError("");

    const hasCoreContent =
      form.clinical_assessment.trim() ||
      form.problem_assessment.trim() ||
      form.recommendations.trim() ||
      form.management_plan.trim();

    if (!hasCoreContent) {
      setError(
        "Enter at least one substantive review field."
      );
      return;
    }

    setSaving(true);

    const {
      error: rpcError
    } = await db.rpc(
      "prism_submit_specialist_review",
      {
        p_request_id: selected.id,

        p_clinical_assessment:
          form.clinical_assessment || null,

        p_problem_assessment:
          form.problem_assessment || null,

        p_recommendations:
          form.recommendations || null,

        p_management_plan:
          form.management_plan || null,

        p_monitoring_instructions:
          form.monitoring_instructions || null,

        p_follow_up_timing:
          form.follow_up_timing || null,

        p_escalation_instructions:
          form.escalation_instructions || null,

        p_signature:
          form.signature || null,

        p_entered_by: null,

        p_entered_on_behalf_reason: null
      }
    );

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSelected(null);
    resetForm();

    await loadQueue();
  }

  function reviewField(label, key) {
    return h(
      "div",
      { className: "field" },

      h(
        "label",
        null,
        label
      ),

      h("textarea", {
        value: form[key],
        onChange: event =>
          updateField(
            key,
            event.target.value
          )
      })
    );
  }

  return h(
    "div",
    { className: "page" },

    h(
      "div",
      {
        className: "row wrap",
        style: {
          justifyContent: "space-between",
          marginBottom: "16px"
        }
      },

      h(
        "div",
        null,

        h(
          "div",
          { className: "page-title" },
          "Specialist Queue"
        ),

        h(
          "div",
          { className: "page-subtitle" },
          "Requests accessible to the current specialist workflow."
        )
      ),

      h(
        "button",
        {
          className: "btn btn-secondary",
          onClick: loadQueue,
          disabled: loading
        },
        loading
          ? "Refreshing..."
          : "Refresh"
      )
    ),

    error
      ? h(
          "div",
          {
            className: "alert alert-error",
            style: { marginBottom: "16px" }
          },
          error
        )
      : null,

    h(
      "div",
      { className: "card" },

      h(
        "div",
        { className: "section-title" },
        `Open Requests (${requests.length})`
      ),

      loading

        ? h(
            "div",
            { className: "loading" },
            "Loading specialist queue..."
          )

        : requests.length === 0

          ? h(
              "div",
              { className: "muted" },
              "No open specialist requests."
            )

          : h(
              "div",
              { className: "table-wrap" },

              h(
                "table",
                null,

                h(
                  "thead",
                  null,

                  h(
                    "tr",
                    null,

                    h("th", null, "Priority"),
                    h("th", null, "Status"),
                    h("th", null, "Patient"),
                    h("th", null, "Reason"),
                    h("th", null, "Clinical Question"),
                    h("th", null, "Requested"),
                    h("th", null, "Action")
                  )
                ),

                h(
                  "tbody",
                  null,

                  requests.map(request =>
                    h(
                      "tr",
                      { key: request.id },

                      h(
                        "td",
                        null,

                        h(
                          "span",
                          {
                            className:
                              priorityClass(
                                request.priority
                              )
                          },
                          request.priority ||
                            "routine"
                        )
                      ),

                      h(
                        "td",
                        null,
                        request.status || "—"
                      ),

                      h(
                        "td",
                        null,

                        h(
                          "div",
                          null,
                          request.patient_code ||
                            request.patient_id ||
                            "—"
                        ),

                        h(
                          "div",
                          {
                            className:
                              "small muted"
                          },
                          request.patient_name ||
                            "—"
                        )
                      ),

                      h(
                        "td",
                        null,
                        request.reason || "—"
                      ),

                      h(
                        "td",
                        null,
                        request.clinical_question ||
                          "—"
                      ),

                      h(
                        "td",
                        null,
                        formatDate(
                          request.requested_at
                        )
                      ),

                      h(
                        "td",
                        null,

                        h(
                          "button",
                          {
                            className:
                              "btn btn-primary",

                            onClick: () =>
                              setSelected(
                                request
                              )
                          },
                          "Review"
                        )
                      )
                    )
                  )
                )
              )
            )
    ),

    selected

      ? h(
          "div",
          { className: "modal-backdrop" },

          h(
            "div",
            {
              className: "modal",
              role: "dialog",
              "aria-modal": "true"
            },

            h(
              "div",
              {
                className: "row wrap",
                style: {
                  justifyContent:
                    "space-between"
                }
              },

              h(
                "div",
                null,

                h(
                  "h2",
                  null,
                  "Specialist Review"
                ),

                h(
                  "div",
                  {
                    className:
                      "small muted"
                  },

                  `${
                    selected.patient_name ||
                    selected.patient_code ||
                    "Patient"
                  } • ${
                    selected.clinical_question ||
                    "Consultation"
                  }`
                )
              ),

              h(
                "button",
                {
                  className:
                    "btn btn-secondary",

                  onClick: () =>
                    setSelected(null),

                  disabled: saving
                },
                "Close"
              )
            ),

            h(
              "form",
              {
                onSubmit: submitReview,
                style: {
                  marginTop: "18px"
                }
              },

              reviewField(
                "Clinical Assessment",
                "clinical_assessment"
              ),

              reviewField(
                "Problem Assessment",
                "problem_assessment"
              ),

              reviewField(
                "Recommendations",
                "recommendations"
              ),

              reviewField(
                "Management Plan",
                "management_plan"
              ),

              reviewField(
                "Monitoring Instructions",
                "monitoring_instructions"
              ),

              reviewField(
                "Follow-up Timing",
                "follow_up_timing"
              ),

              reviewField(
                "Escalation Instructions",
                "escalation_instructions"
              ),

              reviewField(
                "Signature",
                "signature"
              ),

              h(
                "div",
                {
                  className:
                    "form-actions"
                },

                h(
                  "button",
                  {
                    className:
                      "btn btn-secondary",

                    type: "button",

                    onClick: () =>
                      setSelected(null),

                    disabled: saving
                  },
                  "Cancel"
                ),

                h(
                  "button",
                  {
                    className:
                      "btn btn-primary",

                    type: "submit",

                    disabled: saving
                  },

                  saving
                    ? "Submitting..."
                    : "Submit Review"
                )
              )
            )
          )
        )

      : null
  );
               }
