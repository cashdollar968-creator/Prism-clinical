import React, { useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

export default function FollowupModal({
  admission,
  user,
  onClose,
  onSaved
}) {
  const [form, setForm] = useState({
    clinical_changes: "",
    new_results: "",
    problems_assessment: "",
    clinical_stability: "stable",
    response: "",
    management_changes: "",
    remaining_inpatient_needs: "",
    why_still_admitted: "",
    recommendation_next_steps: "",
    escalation_red_flags: ""
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function submit(e) {
    e.preventDefault();

    setError("");

    if (!form.clinical_stability) {
      setError("Clinical stability is required.");
      return;
    }

    if (!admission?.id) {
      setError("No admission selected.");
      return;
    }

    if (!user?.id) {
      setError("No authenticated user found.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await db
      .from("daily_updates")
      .insert({
        admission_id: admission.id,
        author_id: user.id,
        occurred_at: new Date().toISOString(),
        clinical_changes: form.clinical_changes,
        new_results: form.new_results,
        problems_assessment: form.problems_assessment,
        clinical_stability: form.clinical_stability,
        response: form.response,
        management_changes: form.management_changes,
        remaining_inpatient_needs:
          form.remaining_inpatient_needs,
        why_still_admitted:
          form.why_still_admitted,
        recommendation_next_steps:
          form.recommendation_next_steps,
        escalation_red_flags:
          form.escalation_red_flags
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (onSaved) {
      onSaved();
    }
  }

  function field(
    label,
    key,
    placeholder = ""
  ) {
    return React.createElement(
      "div",
      { className: "field" },

      React.createElement(
        "label",
        null,
        label
      ),

      React.createElement("textarea", {
        value: form[key],
        placeholder,
        onChange: (e) =>
          updateField(key, e.target.value)
      })
    );
  }

  return React.createElement(
    "div",
    { className: "modal-backdrop" },

    React.createElement(
      "div",
      { className: "modal" },

      React.createElement(
        "div",
        { className: "row" },

        React.createElement(
          "div",
          null,

          React.createElement(
            "h2",
            null,
            "Daily Follow-up"
          ),

          React.createElement(
            "div",
            { className: "small muted" },
            "Append a new clinical review to the patient timeline."
          )
        ),

        React.createElement(
          "button",
          {
            className: "btn btn-secondary",
            type: "button",
            onClick: onClose
          },
          "Close"
        )
      ),

      error
        ? React.createElement(
            "div",
            {
              className: "error",
              style: {
                marginTop: "15px"
              }
            },
            error
          )
        : null,

      React.createElement(
        "form",
        {
          onSubmit: submit,
          style: {
            marginTop: "18px"
          }
        },

        field(
          "Clinical Changes / Events",
          "clinical_changes",
          "What changed since the previous review?"
        ),

        field(
          "New Important Results",
          "new_results",
          "Important new laboratory, ECG, echo or imaging results."
        ),

        field(
          "Problems / Assessment",
          "problems_assessment",
          "Current assessment of the active problems."
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Clinical Stability"
          ),

          React.createElement(
            "select",
            {
              value: form.clinical_stability,
              onChange: (e) =>
                updateField(
                  "clinical_stability",
                  e.target.value
                )
            },

            React.createElement(
              "option",
              { value: "stable" },
              "Stable"
            ),

            React.createElement(
              "option",
              { value: "improving" },
              "Improving"
            ),

            React.createElement(
              "option",
              { value: "deteriorating" },
              "Deteriorating"
            ),

            React.createElement(
              "option",
              { value: "unstable" },
              "Unstable"
            )
          )
        ),

        field(
          "Response",
          "response",
          "Response to treatment or interventions."
        ),

        field(
          "Management Changes",
          "management_changes",
          "What was changed in management?"
        ),

        field(
          "Remaining Inpatient Needs",
          "remaining_inpatient_needs",
          "What still requires inpatient care?"
        ),

        field(
          "Why Still Admitted",
          "why_still_admitted",
          "Why does the patient still need admission?"
        ),

        field(
          "Recommendation / Next Steps",
          "recommendation_next_steps",
          "What should happen next?"
        ),

        field(
          "Escalation / Red Flags",
          "escalation_red_flags",
          "What should trigger escalation?"
        ),

        React.createElement(
          "div",
          { className: "form-actions" },

          React.createElement(
            "button",
            {
              className: "btn btn-secondary",
              type: "button",
              onClick: onClose,
              disabled: saving
            },
            "Cancel"
          ),

          React.createElement(
            "button",
            {
              className: "btn btn-primary",
              type: "submit",
              disabled: saving
            },
            saving
              ? "Saving..."
              : "Save Follow-up"
          )
        )
      )
    )
  );
      }
