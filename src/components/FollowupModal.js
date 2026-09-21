import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

const h = React.createElement;

export default function FollowupModal({ admission, onClose, onSaved }) {
  const [definition, setDefinition] = useState(null);
  const [form, setForm] = useState({
    clinical_change: "",
    new_results: "",
    problems_assessment: "",
    clinical_stability: "stable",
    response_to_treatment: "",
    management_changes: "",
    remaining_inpatient_needs: "",
    recommendation_next_steps: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWorkflow() {
      const { data, error: rpcError } = await db.rpc(
        "prism_get_workflow_definition",
        {
          p_workflow_code: "prism_daily_followup"
        }
      );

      if (!active) return;

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setDefinition(data);
      }

      setLoading(false);
    }

    loadWorkflow();

    return () => {
      active = false;
    };
  }, []);

  function updateField(key, value) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setError("");

    if (!admission?.id) {
      setError("No admission selected.");
      return;
    }

    if (!form.problems_assessment.trim()) {
      setError("Problems / Assessment is required.");
      return;
    }

    if (!form.clinical_stability) {
      setError("Clinical Stability is required.");
      return;
    }

    if (!form.remaining_inpatient_needs.trim()) {
      setError("Remaining Inpatient Needs is required.");
      return;
    }

    if (!form.recommendation_next_steps.trim()) {
      setError("Recommendation / Next Steps is required.");
      return;
    }

    setSaving(true);

    const { error: rpcError } = await db.rpc(
      "prism_submit_workflow_response",
      {
        p_admission_id: admission.id,
        p_workflow_code: "prism_daily_followup",
        p_response_data: form,
        p_session_id: null,
        p_amendment_of: null
      }
    );

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (onSaved) {
      await onSaved();
    }
  }

  function textarea(label, key, placeholder, required = false) {
    return h(
      "div",
      { className: "field" },

      h(
        "label",
        null,
        label,
        required ? " *" : ""
      ),

      h("textarea", {
        value: form[key] || "",
        placeholder,
        required,
        onChange: event =>
          updateField(key, event.target.value)
      })
    );
  }

  return h(
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
            justifyContent: "space-between"
          }
        },

        h(
          "div",
          null,

          h(
            "h2",
            null,
            "Daily Follow-up"
          ),

          h(
            "div",
            { className: "small muted" },
            "PRISM structured clinical review — append-only clinical record."
          )
        ),

        h(
          "button",
          {
            className: "btn btn-secondary",
            type: "button",
            onClick: onClose,
            disabled: saving
          },
          "Close"
        )
      ),

      error
        ? h(
            "div",
            {
              className: "alert alert-error",
              style: { marginTop: "14px" }
            },
            error
          )
        : null,

      loading

        ? h(
            "div",
            {
              className: "loading",
              style: { marginTop: "18px" }
            },
            "Loading workflow definition..."
          )

        : h(
            "form",
            {
              onSubmit: submit,
              style: { marginTop: "18px" }
            },

            textarea(
              "Clinical Change / Events",
              "clinical_change",
              "What changed since the previous review?"
            ),

            textarea(
              "New Results",
              "new_results",
              "Important new laboratory, ECG, echo, imaging or other results."
            ),

            textarea(
              "Problems / Assessment",
              "problems_assessment",
              "Current assessment and clinical reasoning for active problems.",
              true
            ),

            h(
              "div",
              { className: "field" },

              h(
                "label",
                null,
                "Clinical Stability *"
              ),

              h(
                "select",
                {
                  value: form.clinical_stability,
                  onChange: event =>
                    updateField(
                      "clinical_stability",
                      event.target.value
                    ),
                  required: true
                },

                h(
                  "option",
                  { value: "stable" },
                  "Stable"
                ),

                h(
                  "option",
                  { value: "improving" },
                  "Improving"
                ),

                h(
                  "option",
                  { value: "deteriorating" },
                  "Deteriorating"
                ),

                h(
                  "option",
                  { value: "unstable" },
                  "Unstable"
                )
              )
            ),

            textarea(
              "Response to Treatment",
              "response_to_treatment",
              "Response to treatment/interventions."
            ),

            textarea(
              "Management Changes",
              "management_changes",
              "What changed in management, medications, monitoring or investigations?"
            ),

            textarea(
              "Remaining Inpatient Needs",
              "remaining_inpatient_needs",
              "What still requires inpatient care, and why?",
              true
            ),

            textarea(
              "Recommendation / Next Steps",
              "recommendation_next_steps",
              "What should happen next? Include monitoring and escalation instructions where relevant.",
              true
            ),

            h(
              "div",
              { className: "form-actions" },

              h(
                "button",
                {
                  className: "btn btn-secondary",
                  type: "button",
                  onClick: onClose,
                  disabled: saving
                },
                "Cancel"
              ),

              h(
                "button",
                {
                  className: "btn btn-primary",
                  type: "submit",
                  disabled: saving
                },
                saving
                  ? "Saving..."
                  : "Submit Follow-up"
              )
            )
          )
    )
  );
                }
