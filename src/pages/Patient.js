import React, {
  useEffect,
  useMemo,
  useState
} from "https://esm.sh/react@18.3.1";

import { db } from "../supabase.js";
import FollowupModal from "../components/FollowupModal.js";

function text(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatDateOnly(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("deteriorat") ||
    value.includes("unstable") ||
    value.includes("urgent") ||
    value.includes("critical")
  ) {
    return "badge badge-danger";
  }

  if (
    value.includes("improv") ||
    value.includes("stable") ||
    value.includes("resolved") ||
    value.includes("completed")
  ) {
    return "badge badge-success";
  }

  if (
    value.includes("pending") ||
    value.includes("review")
  ) {
    return "badge badge-warning";
  }

  return "badge";
}

function Section({ title, children, action }) {
  return React.createElement(
    "section",
    { className: "card", style: { marginBottom: "16px" } },

    React.createElement(
      "div",
      {
        className: "row wrap",
        style: {
          justifyContent: "space-between",
          marginBottom: "14px"
        }
      },

      React.createElement(
        "div",
        { className: "section-title" },
        title
      ),

      action || null
    ),

    children
  );
}

function Field({ label, value }) {
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
      text(value)
    )
  );
}

function EmptyState({ message }) {
  return React.createElement(
    "div",
    {
      className: "muted",
      style: {
        padding: "20px 0"
      }
    },
    message
  );
}

export default function Patient({
  patientId,
  session,
  profile,
  onNavigate,
  recordActivity
}) {
  const [patient, setPatient] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [selectedAdmissionId, setSelectedAdmissionId] =
    useState(null);

  const [problems, setProblems] = useState([]);
  const [problemAssessments, setProblemAssessments] =
    useState([]);

  const [dailyUpdates, setDailyUpdates] =
    useState([]);

  const [investigations, setInvestigations] =
    useState([]);

  const [specialistRequests, setSpecialistRequests] =
    useState([]);

  const [specialistReviews, setSpecialistReviews] =
    useState([]);

  const [profiles, setProfiles] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showFollowup, setShowFollowup] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("overview");

  async function loadPatient() {
    if (!patientId) {
      setError("No patient selected.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        patientResult,
        admissionsResult,
        profilesResult,
        wardsResult,
        bedsResult
      ] = await Promise.all([
        db
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .single(),

        db
          .from("admissions")
          .select("*")
          .eq("patient_id", patientId)
          .order(
            "admission_datetime",
            { ascending: false }
          ),

        db
          .from("profiles")
          .select(
            "id, display_name, email, role, active"
          )
          .eq("active", true),

        db
          .from("wards")
          .select(
            "id, name, active, department_id"
          ),

        db
          .from("beds")
          .select(
            "id, name, active, ward_id"
          )
      ]);

      if (patientResult.error) {
        throw patientResult.error;
      }

      if (admissionsResult.error) {
        throw admissionsResult.error;
      }

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      if (wardsResult.error) {
        throw wardsResult.error;
      }

      if (bedsResult.error) {
        throw bedsResult.error;
      }

      const admissionRows =
        admissionsResult.data || [];

      setPatient(patientResult.data);
      setAdmissions(admissionRows);
      setProfiles(profilesResult.data || []);
      setWards(wardsResult.data || []);
      setBeds(bedsResult.data || []);

      const activeAdmission =
        admissionRows.find(
          (admission) =>
            admission.status === "active"
        );

      const firstAdmission =
        activeAdmission ||
        admissionRows[0] ||
        null;

      setSelectedAdmissionId(
        firstAdmission?.id || null
      );

      if (recordActivity) {
        recordActivity(
          "patient_view",
          {
            patient_id: patientId
          }
        );
      }

    } catch (loadError) {
      setError(
        loadError?.message ||
        "Unable to load patient."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmissionData(admissionId) {
    if (!admissionId) {
      setProblems([]);
      setProblemAssessments([]);
      setDailyUpdates([]);
      setInvestigations([]);
      setSpecialistRequests([]);
      setSpecialistReviews([]);
      return;
    }

    setError("");

    try {
      const [
        problemsResult,
        updatesResult,
        investigationsResult,
        requestsResult,
        reviewsResult
      ] = await Promise.all([
        db
          .from("problems")
          .select("*")
          .eq("admission_id", admissionId)
          .order("problem_no"),

        db
          .from("daily_updates")
          .select("*")
          .eq("admission_id", admissionId)
          .order(
            "occurred_at",
            { ascending: false }
          ),

        db
          .from("investigations")
          .select("*")
          .eq("admission_id", admissionId)
          .order(
            "performed_at",
            { ascending: false }
          ),

        db
          .from("specialist_requests")
          .select("*")
          .eq("admission_id", admissionId)
          .order(
            "requested_at",
            { ascending: false }
          ),

        db
          .from("specialist_reviews")
          .select("*")
          .eq("admission_id", admissionId)
          .order(
            "reviewed_at",
            { ascending: false }
          )
      ]);

      if (problemsResult.error) {
        throw problemsResult.error;
      }

      if (updatesResult.error) {
        throw updatesResult.error;
      }

      if (investigationsResult.error) {
        throw investigationsResult.error;
      }

      if (requestsResult.error) {
        throw requestsResult.error;
      }

      if (reviewsResult.error) {
        throw reviewsResult.error;
      }

      const problemRows =
        problemsResult.data || [];

      setProblems(problemRows);
      setDailyUpdates(updatesResult.data || []);
      setInvestigations(
        investigationsResult.data || []
      );
      setSpecialistRequests(
        requestsResult.data || []
      );
      setSpecialistReviews(
        reviewsResult.data || []
      );

      if (problemRows.length === 0) {
        setProblemAssessments([]);
        return;
      }

      const problemIds =
        problemRows.map(
          (problem) => problem.id
        );

      const assessmentsResult =
        await db
          .from("problem_assessments")
          .select("*")
          .in("problem_id", problemIds)
          .order(
            "created_at",
            { ascending: false }
          );

      if (assessmentsResult.error) {
        throw assessmentsResult.error;
      }

      setProblemAssessments(
        assessmentsResult.data || []
      );

    } catch (loadError) {
      setError(
        loadError?.message ||
        "Unable to load admission data."
      );
    }
  }

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  useEffect(() => {
    loadAdmissionData(selectedAdmissionId);
  }, [selectedAdmissionId]);

  const selectedAdmission = useMemo(
    () =>
      admissions.find(
        (admission) =>
          admission.id === selectedAdmissionId
      ) || null,
    [admissions, selectedAdmissionId]
  );

  const profileMap = useMemo(() => {
    const map = {};

    profiles.forEach((item) => {
      map[item.id] = item;
    });

    return map;
  }, [profiles]);

  const wardMap = useMemo(() => {
    const map = {};

    wards.forEach((item) => {
      map[item.id] = item;
    });

    return map;
  }, [wards]);

  const bedMap = useMemo(() => {
    const map = {};

    beds.forEach((item) => {
      map[item.id] = item;
    });

    return map;
  }, [beds]);

  const responsibleMO =
    selectedAdmission
      ? profileMap[
          selectedAdmission.responsible_mo_id
        ]
      : null;

  const specialist =
    selectedAdmission
      ? profileMap[
          selectedAdmission.specialist_id
        ]
      : null;

  const selectedWard =
    selectedAdmission
      ? wardMap[selectedAdmission.ward_id]
      : null;

  const selectedBed =
    selectedAdmission
      ? bedMap[selectedAdmission.bed_id]
      : null;

  const activeProblems =
    problems.filter(
      (problem) => problem.active
    );

  const timeline = useMemo(() => {
    const events = [];

    dailyUpdates.forEach((update) => {
      events.push({
        id: `update-${update.id}`,
        date: update.occurred_at,
        type: "Daily Follow-up",
        status: update.clinical_stability,
        title:
          update.clinical_changes ||
          "Clinical follow-up recorded.",
        body:
          update.problems_assessment ||
          update.recommendation_next_steps ||
          ""
      });
    });

    investigations.forEach((investigation) => {
      events.push({
        id: `investigation-${investigation.id}`,
        date:
          investigation.performed_at ||
          investigation.created_at,
        type: "Investigation",
        status: null,
        title:
          investigation.test_name,
        body:
          investigation.result
      });
    });

    specialistReviews.forEach((review) => {
      events.push({
        id: `review-${review.id}`,
        date: review.reviewed_at,
        type: "Specialist Review",
        status: null,
        title:
          "Specialist review",
        body:
          review.clinical_assessment
      });
    });

    return events.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );
  }, [
    dailyUpdates,
    investigations,
    specialistReviews
  ]);

  async function refreshAdmission() {
    await loadAdmissionData(
      selectedAdmissionId
    );
  }

  function goBack() {
    if (onNavigate) {
      onNavigate("patients");
    }
  }

  if (loading) {
    return React.createElement(
      "div",
      { className: "page" },

      React.createElement(
        "div",
        { className: "card" },
        React.createElement(
          "div",
          { className: "muted" },
          "Loading patient..."
        )
      )
    );
  }

  if (error && !patient) {
    return React.createElement(
      "div",
      { className: "page" },

      React.createElement(
        "div",
        {
          className: "card",
          style: {
            borderColor: "#dc2626"
          }
        },

        React.createElement(
          "div",
          { className: "error" },
          error
        ),

        React.createElement(
          "button",
          {
            className: "btn btn-secondary",
            style: { marginTop: "16px" },
            onClick: goBack
          },
          "Back to Patients"
        )
      )
    );
  }

  if (!patient) {
    return React.createElement(
      "div",
      { className: "page" },

      React.createElement(
        "div",
        { className: "card" },

        React.createElement(
          "div",
          { className: "muted" },
          "Patient not found."
        ),

        React.createElement(
          "button",
          {
            className: "btn btn-secondary",
            style: { marginTop: "16px" },
            onClick: goBack
          },
          "Back to Patients"
        )
      )
    );
  }

  return React.createElement(
    "div",
    { className: "page" },

    React.createElement(
      "div",
      {
        className: "row wrap",
        style: {
          justifyContent: "space-between",
          marginBottom: "16px"
        }
      },

      React.createElement(
        "div",
        null,

        React.createElement(
          "div",
          { className: "page-title" },
          patient.full_name
        ),

        React.createElement(
          "div",
          { className: "page-subtitle" },
          `${text(patient.patient_code)} • Patient Detail`
        )
      ),

      React.createElement(
        "div",
        { className: "row wrap" },

        React.createElement(
          "button",
          {
            className: "btn btn-secondary",
            onClick: goBack
          },
          "← Patients"
        ),

        selectedAdmission
          ? React.createElement(
              "button",
              {
                className: "btn btn-primary",
                onClick: () =>
                  setShowFollowup(true)
              },
              "＋ Daily Follow-up"
            )
          : null
      )
    ),

    error
      ? React.createElement(
          "div",
          {
            className: "card",
            style: {
              borderColor: "#dc2626",
              marginBottom: "16px"
            }
          },
          React.createElement(
            "div",
            { className: "error" },
            error
          )
        )
      : null,

    React.createElement(
      "div",
      {
        className: "card",
        style: { marginBottom: "16px" }
      },

      React.createElement(
        "div",
        { className: "grid grid-4" },

        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "detail-label" },
            "Patient Code"
          ),
          React.createElement(
            "div",
            { className: "detail-value" },
            text(patient.patient_code)
          )
        ),

        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "detail-label" },
            "Age"
          ),
          React.createElement(
            "div",
            { className: "detail-value" },
            text(patient.age)
          )
        ),

        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "detail-label" },
            "Sex"
          ),
          React.createElement(
            "div",
            { className: "detail-value" },
            text(patient.sex)
          )
        ),

        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "detail-label" },
            "Patient Type"
          ),
          React.createElement(
            "div",
            { className: "detail-value" },
            patient.demo
              ? "Demo"
              : "Clinical"
          )
        )
      )
    ),

    admissions.length > 0
      ? React.createElement(
          Section,
          {
            title: "Admission"
          },

          React.createElement(
            "div",
            {
              className: "field",
              style: { marginBottom: "16px" }
            },

            React.createElement(
              "label",
              null,
              "Admission Record"
            ),

            React.createElement(
              "select",
              {
                value:
                  selectedAdmissionId || "",
                onChange: (event) =>
                  setSelectedAdmissionId(
                    event.target.value
                  )
              },

              admissions.map(
                (admission) =>
                  React.createElement(
                    "option",
                    {
                      key: admission.id,
                      value: admission.id
                    },
                    `${formatDateOnly(
                      admission.admission_datetime
                    )} — ${text(
                      admission.working_diagnosis ||
                      admission.reason_for_admission
                    )} — ${text(
                      admission.status
                    )}`
                  )
              )
            )
          ),

          selectedAdmission
            ? React.createElement(
                React.Fragment,
                null,

                React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-3"
                  },

                  React.createElement(
                    Field,
                    {
                      label: "Status",
                      value:
                        selectedAdmission.status
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label: "Admission Date",
                      value:
                        formatDate(
                          selectedAdmission.admission_datetime
                        )
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label: "Discharge Date",
                      value:
                        selectedAdmission.discharge_datetime
                          ? formatDate(
                              selectedAdmission.discharge_datetime
                            )
                          : "Still admitted"
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label: "Ward",
                      value:
                        selectedWard?.name
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label: "Bed",
                      value:
                        selectedBed?.name
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label: "Responsible MO",
                      value:
                        responsibleMO?.display_name
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label: "Specialist",
                      value:
                        specialist?.display_name
                    }
                  )
                ),

                React.createElement(
                  "div",
                  {
                    className: "grid grid-2",
                    style: {
                      marginTop: "16px"
                    }
                  },

                  React.createElement(
                    Field,
                    {
                      label:
                        "Reason for Admission",
                      value:
                        selectedAdmission.reason_for_admission
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Working Diagnosis",
                      value:
                        selectedAdmission.working_diagnosis
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Brief Summary",
                      value:
                        selectedAdmission.brief_summary
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Relevant Background",
                      value:
                        selectedAdmission.relevant_background
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Baseline Clinical Status",
                      value:
                        selectedAdmission.baseline_clinical_status
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Baseline Investigations",
                      value:
                        selectedAdmission.baseline_investigations
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Initial Plan",
                      value:
                        selectedAdmission.initial_plan
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Goals / Targets",
                      value:
                        selectedAdmission.goals_targets
                    }
                  )
                )
              )
            : null
        )
      : React.createElement(
          Section,
          {
            title: "Admission"
          },
          React.createElement(
            EmptyState,
            {
              message:
                "No admission record is linked to this patient."
            }
          )
        ),

    React.createElement(
      "div",
      {
        className: "row wrap",
        style: {
          gap: "8px",
          marginBottom: "16px"
        }
      },

      [
        ["overview", "Overview"],
        ["problems", "Problems"],
        ["followup", "Daily Follow-up"],
        ["investigations", "Investigations"],
        ["specialist", "Specialist"],
        ["timeline", "Timeline"]
      ].map(([key, label]) =>
        React.createElement(
          "button",
          {
            key,
            className:
              activeTab === key
                ? "btn btn-primary"
                : "btn btn-secondary",
            onClick: () =>
              setActiveTab(key)
          },
          label
        )
      )
    ),

    activeTab === "overview"
      ? React.createElement(
          React.Fragment,
          null,

          React.createElement(
            Section,
            {
              title: "Current Clinical State"
            },

            selectedAdmission
              ? React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-3"
                  },

                  React.createElement(
                    Field,
                    {
                      label: "Admission Status",
                      value:
                        selectedAdmission.status
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Active Problems",
                      value:
                        activeProblems.length
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Latest Clinical Stability",
                      value:
                        dailyUpdates[0]
                          ?.clinical_stability ||
                        "No daily review yet"
                    }
                  )
                )
              : React.createElement(
                  EmptyState,
                  {
                    message:
                      "Select an admission to view the current clinical state."
                  }
                )
          ),

          React.createElement(
            Section,
            {
              title:
                "Latest Clinical Information"
            },

            dailyUpdates.length > 0
              ? React.createElement(
                  "div",
                  null,

                  React.createElement(
                    "div",
                    {
                      className:
                        "row wrap",
                      style: {
                        justifyContent:
                          "space-between",
                        marginBottom:
                          "8px"
                      }
                    },

                    React.createElement(
                      "strong",
                      null,
                      formatDate(
                        dailyUpdates[0]
                          .occurred_at
                      )
                    ),

                    React.createElement(
                      "span",
                      {
                        className:
                          statusClass(
                            dailyUpdates[0]
                              .clinical_stability
                          )
                      },
                      text(
                        dailyUpdates[0]
                          .clinical_stability
                      )
                    )
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Clinical Change / Events",
                      value:
                        dailyUpdates[0]
                          .clinical_changes
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Problems / Assessment",
                      value:
                        dailyUpdates[0]
                          .problems_assessment
                    }
                  ),

                  React.createElement(
                    Field,
                    {
                      label:
                        "Recommendation / Next Steps",
                      value:
                        dailyUpdates[0]
                          .recommendation_next_steps
                    }
                  )
                )
              : React.createElement(
                  EmptyState,
                  {
                    message:
                      "No daily follow-up has been recorded."
                  }
                )
          )
        )
      : null,

    activeTab === "problems"
      ? React.createElement(
          Section,
          {
            title:
              `Active Problems (${activeProblems.length})`
          },

          activeProblems.length > 0
            ? activeProblems.map(
                (problem) => {
                  const assessments =
                    problemAssessments.filter(
                      (item) =>
                        item.problem_id ===
                        problem.id
                    );

                  return React.createElement(
                    "div",
                    {
                      key: problem.id,
                      className: "card",
                      style: {
                        marginBottom:
                          "12px",
                        background:
                          "rgba(0,0,0,0.02)"
                      }
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "row wrap",
                        style: {
                          justifyContent:
                            "space-between"
                        }
                      },

                      React.createElement(
                        "strong",
                        null,
                        `Problem ${
                          problem.problem_no
                        }: ${
                          problem.problem
                        }`
                      ),

                      React.createElement(
                        "span",
                        {
                          className:
                            statusClass(
                              problem.current_status
                            )
                        },
                        text(
                          problem.current_status
                        )
                      )
                    ),

                    React.createElement(
                      "div",
                      {
                        className:
                          "grid grid-2",
                        style: {
                          marginTop:
                            "12px"
                        }
                      },

                      React.createElement(
                        Field,
                        {
                          label:
                            "Goal / Target",
                          value:
                            problem.goal_target
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Monitoring",
                          value:
                            problem.monitoring
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Initial Management",
                          value:
                            problem.initial_management
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Current Status",
                          value:
                            problem.current_status
                        }
                      )
                    ),

                    assessments.length > 0
                      ? React.createElement(
                          "div",
                          {
                            style: {
                              marginTop:
                                "14px"
                            }
                          },

                          React.createElement(
                            "strong",
                            null,
                            "Assessments"
                          ),

                          assessments.map(
                            (assessment) =>
                              React.createElement(
                                "div",
                                {
                                  key:
                                    assessment.id,
                                  className:
                                    "card",
                                  style: {
                                    marginTop:
                                      "8px"
                                  }
                                },

                                React.createElement(
                                  "div",
                                  {
                                    className:
                                      "muted"
                                  },
                                  formatDate(
                                    assessment.created_at
                                  )
                                ),

                                React.createElement(
                                  "div",
                                  {
                                    style: {
                                      marginTop:
                                        "6px"
                                    }
                                  },
                                  assessment.assessment
                                ),

                                assessment.response
                                  ? React.createElement(
                                      "div",
                                      {
                                        style: {
                                          marginTop:
                                            "6px"
                                        }
                                      },
                                      React.createElement(
                                        "strong",
                                        null,
                                        "Response: "
                                      ),
                                      assessment.response
                                    )
                                  : null
                              )
                          )
                        )
                      : null
                  );
                }
              )
            : React.createElement(
                EmptyState,
                {
                  message:
                    "No active problems recorded for this admission."
                }
              )
        )
      : null,

    activeTab === "followup"
      ? React.createElement(
          Section,
          {
            title:
              "PRISM Daily Follow-up",

            action:
              selectedAdmission
                ? React.createElement(
                    "button",
                    {
                      className:
                        "btn btn-primary",
                      onClick: () =>
                        setShowFollowup(
                          true
                        )
                    },
                    "＋ New Review"
                  )
                : null
          },

          dailyUpdates.length > 0
            ? dailyUpdates.map(
                (update) =>
                  React.createElement(
                    "div",
                    {
                      key: update.id,
                      className: "card",
                      style: {
                        marginBottom:
                          "12px"
                      }
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "row wrap",
                        style: {
                          justifyContent:
                            "space-between"
                        }
                      },

                      React.createElement(
                        "strong",
                        null,
                        formatDate(
                          update.occurred_at
                        )
                      ),

                      React.createElement(
                        "span",
                        {
                          className:
                            statusClass(
                              update.clinical_stability
                            )
                        },
                        text(
                          update.clinical_stability
                        )
                      )
                    ),

                    React.createElement(
                      "div",
                      {
                        className:
                          "grid grid-2",
                        style: {
                          marginTop:
                            "12px"
                        }
                      },

                      React.createElement(
                        Field,
                        {
                          label:
                            "Clinical Change / Events",
                          value:
                            update.clinical_changes
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "New Results",
                          value:
                            update.new_results
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Problems / Assessment",
                          value:
                            update.problems_assessment
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Response to Treatment",
                          value:
                            update.response
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Management Changes",
                          value:
                            update.management_changes
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Remaining Inpatient Needs",
                          value:
                            update.remaining_inpatient_needs
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Why Still Admitted",
                          value:
                            update.why_still_admitted
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Recommendation / Next Steps",
                          value:
                            update.recommendation_next_steps
                        }
                      ),

                      React.createElement(
                        Field,
                        {
                          label:
                            "Escalation / Red Flags",
                          value:
                            update.escalation_red_flags
                        }
                      )
                    )
                  )
              )
            : React.createElement(
                EmptyState,
                {
                  message:
                    "No daily follow-up records yet."
                }
              )
        )
      : null,

    activeTab === "investigations"
      ? React.createElement(
          Section,
          {
            title:
              `Investigations (${investigations.length})`
          },

          investigations.length > 0
            ? React.createElement(
                "div",
                {
                  style: {
                    overflowX:
                      "auto"
                  }
                },

                React.createElement(
                  "table",
                  {
                    className:
                      "clinical-table"
                  },

                  React.createElement(
                    "thead",
                    null,

                    React.createElement(
                      "tr",
                      null,

                      React.createElement(
                        "th",
                        null,
                        "Date"
                      ),

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
                      (item) =>
                        React.createElement(
                          "tr",
                          { key: item.id },

                          React.createElement(
                            "td",
                            null,
                            formatDate(
                              item.performed_at ||
                              item.created_at
                            )
                          ),

                          React.createElement(
                            "td",
                            null,
                            text(
                              item.category
                            )
                          ),

                          React.createElement(
                            "td",
                            null,
                            text(
                              item.test_name
                            )
                          ),

                          React.createElement(
                            "td",
                            null,
                            text(
                              item.result
                            )
                          ),

                          React.createElement(
                            "td",
                            null,
                            text(
                              item.clinical_significance
                            )
                          )
                        )
                    )
                  )
                )
              )
            : React.createElement(
                EmptyState,
                {
                  message:
                    "No investigations recorded for this admission."
                }
              )
        )
      : null,

    activeTab === "specialist"
      ? React.createElement(
          React.Fragment,
          null,

          React.createElement(
            Section,
            {
              title:
                `Specialist Requests (${specialistRequests.length})`
            },

            specialistRequests.length > 0
              ? specialistRequests.map(
                  (request) =>
                    React.createElement(
                      "div",
                      {
                        key:
                          request.id,
                        className:
                          "card",
                        style: {
                          marginBottom:
                            "12px"
                        }
                      },

                      React.createElement(
                        "div",
                        {
                          className:
                            "row wrap",
                          style: {
                            justifyContent:
                              "space-between"
                          }
                        },

                        React.createElement(
                          "strong",
                          null,
                          text(
                            request.clinical_question
                          )
                        ),

                        React.createElement(
                          "span",
                          {
                            className:
                              statusClass(
                                request.status
                              )
                          },
                          text(
                            request.status
                          )
                        )
                      ),

                      React.createElement(
                        "div",
                        {
                          className:
                            "grid grid-3",
                          style: {
                            marginTop:
                              "10px"
                          }
                        },

                        React.createElement(
                          Field,
                          {
                            label:
                              "Priority",
                            value:
                              request.priority
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Reason",
                            value:
                              request.reason
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Requested",
                            value:
                              formatDate(
                                request.requested_at
                              )
                          }
                        )
                      )
                    )
                )
              : React.createElement(
                  EmptyState,
                  {
                    message:
                      "No specialist requests recorded."
                  }
                )
          ),

          React.createElement(
            Section,
            {
              title:
                `Specialist Reviews (${specialistReviews.length})`
            },

            specialistReviews.length > 0
              ? specialistReviews.map(
                  (review) =>
                    React.createElement(
                      "div",
                      {
                        key: review.id,
                        className:
                          "card",
                        style: {
                          marginBottom:
                            "12px"
                        }
                      },

                      React.createElement(
                        "div",
                        {
                          className:
                            "row wrap",
                          style: {
                            justifyContent:
                              "space-between"
                          }
                        },

                        React.createElement(
                          "strong",
                          null,
                          "Specialist Review"
                        ),

                        React.createElement(
                          "span",
                          {
                            className:
                              "muted"
                          },
                          formatDate(
                            review.reviewed_at
                          )
                        )
                      ),

                      React.createElement(
                        "div",
                        {
                          className:
                            "grid grid-2",
                          style: {
                            marginTop:
                              "12px"
                          }
                        },

                        React.createElement(
                          Field,
                          {
                            label:
                              "Clinical Assessment",
                            value:
                              review.clinical_assessment
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Problem Assessment",
                            value:
                              review.problem_assessment
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Recommendations",
                            value:
                              review.recommendations
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Management Plan",
                            value:
                              review.management_plan
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Monitoring Instructions",
                            value:
                              review.monitoring_instructions
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Follow-up Timing",
                            value:
                              review.follow_up_timing
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Escalation Instructions",
                            value:
                              review.escalation_instructions
                          }
                        ),

                        React.createElement(
                          Field,
                          {
                            label:
                              "Signature",
                            value:
                              review.signature
                          }
                        )
                      )
                    )
                )
              : React.createElement(
                  EmptyState,
                  {
                    message:
                      "No specialist reviews recorded."
                  }
                )
          )
        )
      : null,

    activeTab === "timeline"
      ? React.createElement(
          Section,
          {
            title:
              `Clinical Timeline (${timeline.length})`
          },

          timeline.length > 0
            ? timeline.map(
                (event) =>
                  React.createElement(
                    "div",
                    {
                      key: event.id,
                      style: {
                        borderLeft:
                          "3px solid #0f766e",
                        paddingLeft:
                          "14px",
                        marginBottom:
                          "18px"
                      }
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "muted"
                      },
                      formatDate(
                        event.date
                      )
                    ),

                    React.createElement(
                      "div",
                      {
                        style: {
                          marginTop:
                            "3px",
                          fontWeight:
                            "700"
                        }
                      },
                      event.type
                    ),

                    React.createElement(
                      "div",
                      {
                        style: {
                          marginTop:
                            "4px"
                        }
                      },
                      text(
                        event.title
                      )
                    ),

                    event.body
                      ? React.createElement(
                          "div",
                          {
                            className:
                              "muted",
                            style: {
                              marginTop:
                                "4px"
                            }
                          },
                          event.body
                        )
                      : null
                  )
              )
            : React.createElement(
                EmptyState,
                {
                  message:
                    "No clinical timeline events recorded."
                }
              )
        )
      : null,

    showFollowup &&
    selectedAdmission
      ? React.createElement(
          FollowupModal,
          {
            admission:
              selectedAdmission,
            user:
              session?.user || profile,
            onClose: () =>
              setShowFollowup(false),
            onSaved: async () => {
              setShowFollowup(false);
              await refreshAdmission();
            }
          }
        )
      : null
  );
      }
