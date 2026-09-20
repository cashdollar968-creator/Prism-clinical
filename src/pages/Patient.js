import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";
import { formatDate, stabilityClass } from "../helpers.js";

function detail(label, value) {
  return React.createElement(
    "div",
    { className: "detail-box" },

    React.createElement(
      "div",
      { className: "detail-label" },
      label
    ),

    React.createElement(
      "div",
      { className: "detail-value" },
      value || "—"
    )
  );
}

export default function Patient({
  patient,
  profile
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [problems, setProblems] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadClinicalData() {
      if (!patient?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const activeAdmission =
        (patient.admissions || []).find(
          (admission) => admission.status === "active"
        ) || (patient.admissions || [])[0];

      if (!activeAdmission?.id) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      const [
        problemsResult,
        updatesResult,
        investigationsResult,
        reviewsResult
      ] = await Promise.all([
        db
          .from("problems")
          .select("*")
          .eq("admission_id", activeAdmission.id)
          .eq("active", true)
          .order("problem_no", {
            ascending: true
          }),

        db
          .from("daily_updates")
          .select("*")
          .eq("admission_id", activeAdmission.id)
          .order("occurred_at", {
            ascending: false
          }),

        db
          .from("investigations")
          .select("*")
          .eq("admission_id", activeAdmission.id)
          .order("performed_at", {
            ascending: false
          }),

        db
          .from("specialist_reviews")
          .select("*")
          .eq("admission_id", activeAdmission.id)
          .order("reviewed_at", {
            ascending: false
          })
      ]);

      const firstError =
        problemsResult.error ||
        updatesResult.error ||
        investigationsResult.error ||
        reviewsResult.error;

      if (firstError) {
        if (mounted) {
          setError(firstError.message);
          setLoading(false);
        }

        return;
      }

      if (!mounted) {
        return;
      }

      setProblems(problemsResult.data || []);
      setUpdates(updatesResult.data || []);
      setInvestigations(investigationsResult.data || []);
      setReviews(reviewsResult.data || []);
      setLoading(false);
    }

    loadClinicalData();

    return () => {
      mounted = false;
    };
  }, [patient]);

  const admissions = patient?.admissions || [];

  const admission =
    admissions.find(
      (item) => item.status === "active"
    ) || admissions[0];

  if (!patient) {
    return React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "empty" },
        "No patient selected."
      )
    );
  }

  return React.createElement(
    React.Fragment,
    null,

    React.createElement(
      "div",
      { className: "page-title" },
      patient.full_name || "Patient"
    ),

    React.createElement(
      "div",
      { className: "page-subtitle" },
      `${patient.patient_code || "No patient code"} · ${
        patient.age ?? "—"
      } / ${patient.sex || "—"}`
    ),

    error
      ? React.createElement(
          "div",
          { className: "error" },
          error
        )
      : null,

    loading
      ? React.createElement(
          "div",
          { className: "loading" },
          "Loading clinical record..."
        )
      : null,

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Admission Overview"
      ),

      React.createElement(
        "div",
        { className: "detail-grid" },

        detail(
          "Patient Code",
          patient.patient_code
        ),

        detail(
          "Age / Sex",
          `${patient.age ?? "—"} / ${patient.sex || "—"}`
        ),

        detail(
          "Ward",
          admission?.ward_id
        ),

        detail(
          "Bed",
          admission?.bed_id
        ),

        detail(
          "Admission Date",
          formatDate(
            admission?.admission_datetime
          )
        ),

        detail(
          "Responsible MO",
          admission?.responsible_mo_id
        ),

        detail(
          "Specialist",
          admission?.specialist_id
        ),

        detail(
          "Status",
          admission?.status
        )
      )
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Why Admitted"
      ),

      React.createElement(
        "div",
        { className: "detail-value" },
        admission?.reason_for_admission || "—"
      ),

      admission?.brief_summary
        ? React.createElement(
            "div",
            {
              className: "detail-value",
              style: {
                marginTop: "10px"
              }
            },
            admission.brief_summary
          )
        : null
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Working Diagnosis"
      ),

      React.createElement(
        "div",
        { className: "detail-value" },
        admission?.working_diagnosis || "—"
      )
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Active Problems"
      ),

      problems.length === 0
        ? React.createElement(
            "div",
            { className: "empty" },
            "No active problems documented."
          )

        : problems.map((problem) =>
            React.createElement(
              "div",
              {
                key: problem.id,
                className: "detail-box",
                style: {
                  marginBottom: "10px"
                }
              },

              React.createElement(
                "div",
                { className: "row wrap" },

                React.createElement(
                  "strong",
                  null,
                  `P${problem.problem_no || ""} ${
                    problem.problem || ""
                  }`
                ),

                problem.current_status
                  ? React.createElement(
                      "span",
                      {
                        className:
                          "badge " +
                          stabilityClass(
                            problem.current_status
                          )
                      },
                      problem.current_status
                    )
                  : null
              ),

              problem.goal_target
                ? React.createElement(
                    "div",
                    {
                      className: "small",
                      style: {
                        marginTop: "8px"
                      }
                    },
                    React.createElement(
                      "strong",
                      null,
                      "Goal: "
                    ),
                    problem.goal_target
                  )
                : null,

              problem.initial_management
                ? React.createElement(
                    "div",
                    {
                      className: "small",
                      style: {
                        marginTop: "6px"
                      }
                    },
                    React.createElement(
                      "strong",
                      null,
                      "Management: "
                    ),
                    problem.initial_management
                  )
                : null,

              problem.monitoring
                ? React.createElement(
                    "div",
                    {
                      className: "small",
                      style: {
                        marginTop: "6px"
                      }
                    },
                    React.createElement(
                      "strong",
                      null,
                      "Monitoring: "
                    ),
                    problem.monitoring
                  )
                : null
            )
          )
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Baseline"
      ),

      React.createElement(
        "div",
        { className: "detail-grid" },

        detail(
          "Relevant Background",
          admission?.relevant_background
        ),

        detail(
          "Baseline Clinical Status",
          admission?.baseline_clinical_status
        ),

        detail(
          "Initial Plan",
          admission?.initial_plan
        ),

        detail(
          "Goals / Targets",
          admission?.goals_targets
        )
      )
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Investigations"
      ),

      investigations.length === 0
        ? React.createElement(
            "div",
            { className: "empty" },
            "No investigations documented."
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
                    "Category"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Test"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Date / Time"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Result"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Clinical Significance"
                  )
                )
              ),

              React.createElement(
                "tbody",
                null,

                investigations.map(
                  (investigation) =>
                    React.createElement(
                      "tr",
                      {
                        key: investigation.id
                      },

                      React.createElement(
                        "td",
                        null,
                        investigation.category || "—"
                      ),

                      React.createElement(
                        "td",
                        null,
                        investigation.test_name || "—"
                      ),

                      React.createElement(
                        "td",
                        null,
                        formatDate(
                          investigation.performed_at
                        )
                      ),

                      React.createElement(
                        "td",
                        null,
                        investigation.result || "—"
                      ),

                      React.createElement(
                        "td",
                        null,
                        investigation.clinical_significance ||
                          "—"
                      )
                    )
                )
              )
            )
          )
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Clinical Timeline"
      ),

      updates.length === 0
        ? React.createElement(
            "div",
            { className: "empty" },
            "No daily follow-up entries documented."
          )

        : React.createElement(
            "div",
            { className: "timeline" },

            updates.map((update) =>
              React.createElement(
                "div",
                {
                  key: update.id,
                  className: "timeline-item"
                },

                React.createElement(
                  "div",
                  {
                    className: "timeline-dot"
                  }
                ),

                React.createElement(
                  "div",
                  {
                    className: "timeline-title"
                  },
                  formatDate(update.occurred_at)
                ),

                React.createElement(
                  "div",
                  {
                    className: "small muted"
                  },
                  update.author_id || "Unknown author"
                ),

                update.clinical_stability
                  ? React.createElement(
                      "div",
                      {
                        style: {
                          marginTop: "7px",
                          marginBottom: "7px"
                        }
                      },

                      React.createElement(
                        "span",
                        {
                          className:
                            "badge " +
                            stabilityClass(
                              update.clinical_stability
                            )
                        },
                        update.clinical_stability
                      )
                    )
                  : null,

                update.clinical_changes
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      update.clinical_changes
                    )
                  : null,

                update.new_results
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `New Results: ${update.new_results}`
                    )
                  : null,

                update.problems_assessment
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `Assessment: ${update.problems_assessment}`
                    )
                  : null,

                update.response
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `Response: ${update.response}`
                    )
                  : null,

                update.management_changes
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `Management: ${update.management_changes}`
                    )
                  : null,

                update.remaining_inpatient_needs
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `Remaining Needs: ${update.remaining_inpatient_needs}`
                    )
                  : null,

                update.why_still_admitted
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `Why Still Admitted: ${update.why_still_admitted}`
                    )
                  : null,

                update.recommendation_next_steps
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `Next Steps: ${update.recommendation_next_steps}`
                    )
                  : null,

                update.escalation_red_flags
                  ? React.createElement(
                      "div",
                      {
                        className: "timeline-body"
                      },
                      `Escalation / Red Flags: ${update.escalation_red_flags}`
                    )
                  : null
              )
            )
          )
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Specialist Reviews"
      ),

      reviews.length === 0
        ? React.createElement(
            "div",
            { className: "empty" },
            "No specialist reviews documented."
          )

        : reviews.map((review) =>
            React.createElement(
              "div",
              {
                key: review.id,
                className: "detail-box",
                style: {
                  marginBottom: "10px"
                }
              },

              React.createElement(
                "div",
                { className: "row wrap" },

                React.createElement(
                  "strong",
                  null,
                  "Specialist Review"
                ),

                React.createElement(
                  "span",
                  { className: "small muted" },
                  formatDate(review.reviewed_at)
                )
              ),

              detail(
                "Clinical Assessment",
                review.clinical_assessment
              ),

              detail(
                "Problem Assessment",
                review.problem_assessment
              ),

              detail(
                "Recommendations",
                review.recommendations
              ),

              detail(
                "Management Plan",
                review.management_plan
              ),

              detail(
                "Monitoring Instructions",
                review.monitoring_instructions
              ),

              detail(
                "Follow-up Timing",
                review.follow_up_timing
              ),

              detail(
                "Escalation Instructions",
                review.escalation_instructions
              )
            )
          )
    )
  );
            }
