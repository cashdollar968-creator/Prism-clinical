import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

function NewPatientModal({ onClose, onCreated }) {
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [medicalOfficers, setMedicalOfficers] = useState([]);
  const [specialists, setSpecialists] = useState([]);

  const [form, setForm] = useState({
    patient_code: "",
    full_name: "",
    age: "",
    sex: "",
    demo: false,

    ward_id: "",
    bed_id: "",
    responsible_mo_id: "",
    specialist_id: "",

    admission_datetime: "",
    reason_for_admission: "",
    brief_summary: "",
    working_diagnosis: "",
    relevant_background: "",
    baseline_clinical_status: "",
    baseline_investigations: "",
    initial_plan: "",
    goals_targets: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReferenceData() {
      const [
        wardsResult,
        bedsResult,
        profilesResult
      ] = await Promise.all([
        db
          .from("wards")
          .select("id, name, active, department_id")
          .eq("active", true)
          .order("name"),

        db
          .from("beds")
          .select("id, name, active, ward_id")
          .eq("active", true)
          .order("name"),

        db
          .from("profiles")
          .select("id, display_name, email, role, active")
          .eq("active", true)
          .order("display_name")
      ]);

      if (wardsResult.error) {
        setError(wardsResult.error.message);
        return;
      }

      if (bedsResult.error) {
        setError(bedsResult.error.message);
        return;
      }

      if (profilesResult.error) {
        setError(profilesResult.error.message);
        return;
      }

      setWards(wardsResult.data || []);
      setBeds(bedsResult.data || []);

      const profiles = profilesResult.data || [];

      setMedicalOfficers(
        profiles.filter(
          (profile) => profile.role === "medical_officer"
        )
      );

      setSpecialists(
        profiles.filter(
          (profile) => profile.role === "specialist"
        )
      );
    }

    loadReferenceData();
  }, []);

  const availableBeds = useMemo(() => {
    if (!form.ward_id) {
      return [];
    }

    return beds.filter(
      (bed) => bed.ward_id === form.ward_id
    );
  }, [beds, form.ward_id]);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateWard(value) {
    setForm((current) => ({
      ...current,
      ward_id: value,
      bed_id: ""
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!form.patient_code.trim()) {
      setError("Patient code is required.");
      return;
    }

    if (!form.full_name.trim()) {
      setError("Patient name is required.");
      return;
    }

    if (!form.sex) {
      setError("Sex is required.");
      return;
    }

    if (!form.ward_id) {
      setError("Ward is required.");
      return;
    }

    if (!form.reason_for_admission.trim()) {
      setError("Reason for admission is required.");
      return;
    }

    if (!form.responsible_mo_id) {
      setError("Responsible Medical Officer is required.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: authData,
        error: authError
      } = await db.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData?.user;

      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const patientPayload = {
        patient_code: form.patient_code.trim(),
        full_name: form.full_name.trim(),
        age: form.age === "" ? null : Number(form.age),
        sex: form.sex,
        demo: Boolean(form.demo),
        created_by: user.id
      };

      const {
        data: patient,
        error: patientError
      } = await db
        .from("patients")
        .insert(patientPayload)
        .select()
        .single();

      if (patientError) {
        throw patientError;
      }

      const admissionPayload = {
        patient_id: patient.id,
        ward_id: form.ward_id,
        bed_id: form.bed_id || null,

        admission_datetime:
          form.admission_datetime ||
          new Date().toISOString(),

        status: "active",

        responsible_mo_id:
          form.responsible_mo_id,

        specialist_id:
          form.specialist_id || null,

        reason_for_admission:
          form.reason_for_admission.trim(),

        brief_summary:
          form.brief_summary.trim() || null,

        working_diagnosis:
          form.working_diagnosis.trim() || null,

        relevant_background:
          form.relevant_background.trim() || null,

        baseline_clinical_status:
          form.baseline_clinical_status.trim() || null,

        baseline_investigations:
          form.baseline_investigations.trim() || null,

        initial_plan:
          form.initial_plan.trim() || null,

        goals_targets:
          form.goals_targets.trim() || null,

        created_by: user.id
      };

      const {
        error: admissionError
      } = await db
        .from("admissions")
        .insert(admissionPayload);

      if (admissionError) {
        throw admissionError;
      }

      await onCreated();
      onClose();

    } catch (submitError) {
      setError(
        submitError?.message ||
        "Unable to create patient."
      );
    } finally {
      setLoading(false);
    }
  }

  return React.createElement(
    "div",
    { className: "modal-backdrop" },

    React.createElement(
      "div",
      {
        className: "modal",
        style: {
          maxWidth: "900px",
          width: "96%",
          maxHeight: "92vh",
          overflowY: "auto"
        }
      },

      React.createElement(
        "div",
        { className: "row wrap" },

        React.createElement(
          "div",
          null,

          React.createElement(
            "div",
            { className: "page-title" },
            "New Patient"
          ),

          React.createElement(
            "div",
            { className: "page-subtitle" },
            "Create patient and initial admission record"
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
              className: "card",
              style: {
                marginTop: "16px",
                borderColor: "#dc2626"
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
        "form",
        {
          onSubmit: handleSubmit,
          style: {
            marginTop: "18px"
          }
        },

        React.createElement(
          "div",
          { className: "grid grid-2" },

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Patient Code *"
            ),

            React.createElement("input", {
              value: form.patient_code,
              onChange: (event) =>
                updateField(
                  "patient_code",
                  event.target.value
                ),
              placeholder: "e.g. P-0001"
            })
          ),

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Full Name *"
            ),

            React.createElement("input", {
              value: form.full_name,
              onChange: (event) =>
                updateField(
                  "full_name",
                  event.target.value
                ),
              placeholder: "Patient full name"
            })
          ),

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Age"
            ),

            React.createElement("input", {
              type: "number",
              min: "0",
              max: "130",
              value: form.age,
              onChange: (event) =>
                updateField(
                  "age",
                  event.target.value
                )
            })
          ),

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Sex *"
            ),

            React.createElement(
              "select",
              {
                value: form.sex,
                onChange: (event) =>
                  updateField(
                    "sex",
                    event.target.value
                  )
              },

              React.createElement(
                "option",
                { value: "" },
                "Select sex"
              ),

              React.createElement(
                "option",
                { value: "male" },
                "Male"
              ),

              React.createElement(
                "option",
                { value: "female" },
                "Female"
              ),

              React.createElement(
                "option",
                { value: "other" },
                "Other"
              )
            )
          ),

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Ward *"
            ),

            React.createElement(
              "select",
              {
                value: form.ward_id,
                onChange: (event) =>
                  updateWard(
                    event.target.value
                  )
              },

              React.createElement(
                "option",
                { value: "" },
                "Select ward"
              ),

              wards.map((ward) =>
                React.createElement(
                  "option",
                  {
                    key: ward.id,
                    value: ward.id
                  },
                  ward.name
                )
              )
            )
          ),

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Bed"
            ),

            React.createElement(
              "select",
              {
                value: form.bed_id,
                onChange: (event) =>
                  updateField(
                    "bed_id",
                    event.target.value
                  ),
                disabled: !form.ward_id
              },

              React.createElement(
                "option",
                { value: "" },
                form.ward_id
                  ? "No bed / Select later"
                  : "Select ward first"
              ),

              availableBeds.map((bed) =>
                React.createElement(
                  "option",
                  {
                    key: bed.id,
                    value: bed.id
                  },
                  bed.name
                )
              )
            )
          ),

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Responsible Medical Officer *"
            ),

            React.createElement(
              "select",
              {
                value: form.responsible_mo_id,
                onChange: (event) =>
                  updateField(
                    "responsible_mo_id",
                    event.target.value
                  )
              },

              React.createElement(
                "option",
                { value: "" },
                "Select Medical Officer"
              ),

              medicalOfficers.map((profile) =>
                React.createElement(
                  "option",
                  {
                    key: profile.id,
                    value: profile.id
                  },
                  profile.display_name ||
                    profile.email
                )
              )
            )
          ),

          React.createElement(
            "div",
            { className: "field" },

            React.createElement(
              "label",
              null,
              "Assigned Specialist"
            ),

            React.createElement(
              "select",
              {
                value: form.specialist_id,
                onChange: (event) =>
                  updateField(
                    "specialist_id",
                    event.target.value
                  )
              },

              React.createElement(
                "option",
                { value: "" },
                "No specialist assigned"
              ),

              specialists.map((profile) =>
                React.createElement(
                  "option",
                  {
                    key: profile.id,
                    value: profile.id
                  },
                  profile.display_name ||
                    profile.email
                )
              )
            )
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Admission Date / Time"
          ),

          React.createElement("input", {
            type: "datetime-local",
            value: form.admission_datetime,
            onChange: (event) =>
              updateField(
                "admission_datetime",
                event.target.value
              )
          })
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Reason for Admission *"
          ),

          React.createElement(
            "textarea",
            {
              value: form.reason_for_admission,
              onChange: (event) =>
                updateField(
                  "reason_for_admission",
                  event.target.value
                ),
              rows: 3,
              placeholder:
                "Why is the patient being admitted?"
            }
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Brief Summary"
          ),

          React.createElement(
            "textarea",
            {
              value: form.brief_summary,
              onChange: (event) =>
                updateField(
                  "brief_summary",
                  event.target.value
                ),
              rows: 3
            }
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Working Diagnosis"
          ),

          React.createElement(
            "textarea",
            {
              value: form.working_diagnosis,
              onChange: (event) =>
                updateField(
                  "working_diagnosis",
                  event.target.value
                ),
              rows: 3
            }
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Relevant Background"
          ),

          React.createElement(
            "textarea",
            {
              value: form.relevant_background,
              onChange: (event) =>
                updateField(
                  "relevant_background",
                  event.target.value
                ),
              rows: 3
            }
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Baseline Clinical Status"
          ),

          React.createElement(
            "textarea",
            {
              value: form.baseline_clinical_status,
              onChange: (event) =>
                updateField(
                  "baseline_clinical_status",
                  event.target.value
                ),
              rows: 3
            }
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Baseline Investigations"
          ),

          React.createElement(
            "textarea",
            {
              value: form.baseline_investigations,
              onChange: (event) =>
                updateField(
                  "baseline_investigations",
                  event.target.value
                ),
              rows: 3
            }
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Initial Plan"
          ),

          React.createElement(
            "textarea",
            {
              value: form.initial_plan,
              onChange: (event) =>
                updateField(
                  "initial_plan",
                  event.target.value
                ),
              rows: 4
            }
          )
        ),

        React.createElement(
          "div",
          { className: "field" },

          React.createElement(
            "label",
            null,
            "Goals / Targets"
          ),

          React.createElement(
            "textarea",
            {
              value: form.goals_targets,
              onChange: (event) =>
                updateField(
                  "goals_targets",
                  event.target.value
                ),
              rows: 4
            }
          )
        ),

        React.createElement(
          "label",
          {
            style: {
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginTop: "10px"
            }
          },

          React.createElement("input", {
            type: "checkbox",
            checked: form.demo,
            onChange: (event) =>
              updateField(
                "demo",
                event.target.checked
              )
          }),

          "Demo patient"
        ),

        React.createElement(
          "div",
          {
            className: "row wrap",
            style: {
              marginTop: "20px",
              justifyContent: "flex-end"
            }
          },

          React.createElement(
            "button",
            {
              type: "button",
              className: "btn btn-secondary",
              onClick: onClose,
              disabled: loading
            },
            "Cancel"
          ),

          React.createElement(
            "button",
            {
              type: "submit",
              className: "btn btn-primary",
              disabled: loading
            },
            loading
              ? "Creating..."
              : "Create Patient"
          )
        )
      )
    )
  );
}

export default function Patients({
  patients,
  loading,
  onRefresh,
  onOpenPatient
}) {
  const [search, setSearch] = useState("");
  const [showNewPatient, setShowNewPatient] =
    useState(false);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return patients;
    }

    return patients.filter((patient) => {
      const code = String(
        patient.patient_code || ""
      ).toLowerCase();

      const name = String(
        patient.full_name || ""
      ).toLowerCase();

      return (
        name.includes(term) ||
        code.includes(term)
      );
    });
  }, [patients, search]);

  async function handleCreated() {
    await onRefresh();
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
          "Patients"
        ),

        React.createElement(
          "div",
          { className: "page-subtitle" },
          "Patient and admission overview"
        )
      ),

      React.createElement(
        "div",
        {
          className: "row wrap"
        },

        React.createElement(
          "button",
          {
            className: "btn btn-primary",
            onClick: () =>
              setShowNewPatient(true)
          },
          "+ New Patient"
        ),

        React.createElement(
          "button",
          {
            className: "btn btn-secondary",
            onClick: onRefresh,
            disabled: loading
          },
          loading
            ? "Refreshing..."
            : "Refresh"
        )
      )
    ),

    React.createElement(
      "div",
      {
        className: "card"
      },

      React.createElement(
        "div",
        { className: "field" },

        React.createElement(
          "label",
          null,
          "Search"
        ),

        React.createElement("input", {
          type: "search",
          value: search,
          onChange: (event) =>
            setSearch(event.target.value),
          placeholder:
            "Search patient or patient code"
        })
      )
    ),

    loading
      ? React.createElement(
          "div",
          { className: "loading" },
          "Loading patients..."
        )

      : filteredPatients.length === 0

        ? React.createElement(
            "div",
            { className: "card" },

            React.createElement(
              "div",
              { className: "empty" },

              search
                ? "No patients match your search."
                : "No patients found."
            )
          )

        : React.createElement(
            "div",
            { className: "grid grid-2" },

            filteredPatients.map((patient) => {
              const admissions =
                patient.admissions || [];

              const activeAdmission =
                admissions.find(
                  (admission) =>
                    admission.status === "active"
                ) || admissions[0];

              return React.createElement(
                "div",
                {
                  key: patient.id,
                  className:
                    "card patient-card",
                  onClick: () =>
                    onOpenPatient(patient)
                },

                React.createElement(
                  "div",
                  { className: "row wrap" },

                  React.createElement(
                    "div",
                    null,

                    React.createElement(
                      "div",
                      {
                        className: "patient-name"
                      },
                      patient.full_name ||
                        "Unnamed patient"
                    ),

                    React.createElement(
                      "div",
                      {
                        className:
                          "muted small"
                      },
                      patient.patient_code ||
                        "No patient code"
                    )
                  ),

                  patient.demo
                    ? React.createElement(
                        "span",
                        {
                          className:
                            "badge badge-improving"
                        },
                        "Demo"
                      )
                    : null
                ),

                React.createElement(
                  "div",
                  {
                    className: "detail-grid",
                    style: {
                      marginTop: "14px"
                    }
                  },

                  React.createElement(
                    "div",
                    {
                      className:
                        "detail-box"
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-label"
                      },
                      "Age / Sex"
                    ),

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-value"
                      },
                      `${patient.age ?? "—"} / ${
                        patient.sex || "—"
                      }`
                    )
                  ),

                  React.createElement(
                    "div",
                    {
                      className:
                        "detail-box"
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-label"
                      },
                      "Admission Status"
                    ),

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-value"
                      },
                      activeAdmission?.status ||
                        "—"
                    )
                  ),

                  React.createElement(
                    "div",
                    {
                      className:
                        "detail-box"
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-label"
                      },
                      "Ward"
                    ),

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-value"
                      },
                      activeAdmission?.ward_id ||
                        "—"
                    )
                  ),

                  React.createElement(
                    "div",
                    {
                      className:
                        "detail-box"
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-label"
                      },
                      "Bed"
                    ),

                    React.createElement(
                      "div",
                      {
                        className:
                          "detail-value"
                      },
                      activeAdmission?.bed_id ||
                        "—"
                    )
                  )
                ),

                React.createElement(
                  "div",
                  {
                    style: {
                      marginTop: "14px"
                    }
                  },

                  React.createElement(
                    "div",
                    {
                      className:
                        "detail-label"
                    },
                    "Working Diagnosis"
                  ),

                  React.createElement(
                    "div",
                    {
                      className:
                        "detail-value"
                    },
                    activeAdmission
                      ?.working_diagnosis || "—"
                  )
                )
              );
            })
          ),

    showNewPatient
      ? React.createElement(
          NewPatientModal,
          {
            onClose: () =>
              setShowNewPatient(false),

            onCreated: handleCreated
          }
        )
      : null
  );
          }
