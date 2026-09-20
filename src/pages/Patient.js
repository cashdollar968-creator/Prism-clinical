import React, {
  useEffect,
  useMemo,
  useState
} from "https://esm.sh/react@18.3.1";

import { db } from "../supabase.js";

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

  function handleCreated() {
    setShowNewPatient(false);

    if (onRefresh) {
      onRefresh();
    }
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
          className: "row wrap",
          style: {
            gap: "8px"
          }
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
          onChange: (e) =>
            setSearch(e.target.value),
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
                        className:
                          "patient-name"
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
                    className:
                      "detail-grid",
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
                      ?.working_diagnosis ||
                      "—"
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

function NewPatientModal({
  onClose,
  onCreated
}) {
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [medicalOfficers, setMedicalOfficers] =
    useState([]);
  const [specialists, setSpecialists] =
    useState([]);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    admission_datetime:
      toLocalDateTimeValue(new Date()),

    reason_for_admission: "",
    brief_summary: "",
    working_diagnosis: "",
    relevant_background: "",
    baseline_clinical_status: "",
    baseline_investigations: "",
    initial_plan: "",
    goals_targets: ""
  });

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    setLoadingOptions(true);
    setError("");

    const [
      wardsResult,
      bedsResult,
      moResult,
      specialistResult
    ] = await Promise.all([
      db
        .from("wards")
        .select("id,name")
        .eq("active", true)
        .order("name"),

      db
        .from("beds")
        .select(
          "id,name,ward_id"
        )
        .eq("active", true)
        .order("name"),

      db
        .from("profiles")
        .select(
          "id,display_name,email,role"
        )
        .eq("active", true)
        .eq(
          "role",
          "medical_officer"
        )
        .order("display_name"),

      db
        .from("profiles")
        .select(
          "id,display_name,email,role"
        )
        .eq("active", true)
        .eq(
          "role",
          "specialist"
        )
        .order("display_name")
    ]);

    if (wardsResult.error) {
      setError(
        wardsResult.error.message
      );
      setLoadingOptions(false);
      return;
    }

    if (bedsResult.error) {
      setError(
        bedsResult.error.message
      );
      setLoadingOptions(false);
      return;
    }

    if (moResult.error) {
      setError(
        moResult.error.message
      );
      setLoadingOptions(false);
      return;
    }

    if (specialistResult.error) {
      setError(
        specialistResult.error.message
      );
      setLoadingOptions(false);
      return;
    }

    const wardData =
      wardsResult.data || [];

    const bedData =
      bedsResult.data || [];

    const moData =
      moResult.data || [];

    const specialistData =
      specialistResult.data || [];

    setWards(wardData);
    setBeds(bedData);
    setMedicalOfficers(moData);
    setSpecialists(
      specialistData
    );

    const {
      data: {
        user
      } = {}
    } = await db.auth.getUser();

    const currentMO =
      moData.find(
        (profile) =>
          profile.id === user?.id
      );

    setForm((current) => ({
      ...current,

      responsible_mo_id:
        currentMO?.id ||
        current.responsible_mo_id ||
        "",

      ward_id:
        current.ward_id ||
        wardData[0]?.id ||
        ""
    }));

    setLoadingOptions(false);
  }

  const availableBeds =
    beds.filter(
      (bed) =>
        !form.ward_id ||
        bed.ward_id ===
          form.ward_id
    );

  function updateField(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateWard(value) {
    setForm((current) => ({
      ...current,
      ward_id: value,
      bed_id: ""
    }));
  }

  function textField(
    label,
    key,
    options = {}
  ) {
    const {
      required = false,
      type = "text",
      placeholder = ""
    } = options;

    return React.createElement(
      "div",
      { className: "field" },

      React.createElement(
        "label",
        null,
        label,
        required
          ? React.createElement(
              "span",
              {
                style: {
                  color: "var(--danger, #b42318)"
                }
              },
              " *"
            )
          : null
      ),

      React.createElement(
        "input",
        {
          type,
          value: form[key],
          required,
          placeholder,
          onChange: (e) =>
            updateField(
              key,
              e.target.value
            )
        }
      )
    );
  }

  function textareaField(
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

      React.createElement(
        "textarea",
        {
          value: form[key],
          placeholder,
          onChange: (e) =>
            updateField(
              key,
              e.target.value
            )
        }
      )
    );
  }

  function selectField(
    label,
    key,
    options,
    placeholder,
    required = false,
    onChangeOverride = null
  ) {
    return React.createElement(
      "div",
      { className: "field" },

      React.createElement(
        "label",
        null,
        label,
        required
          ? React.createElement(
              "span",
              {
                style: {
                  color:
                    "var(--danger, #b42318)"
                }
              },
              " *"
            )
          : null
      ),

      React.createElement(
        "select",
        {
          value: form[key],
          required,
          onChange: (e) => {
            if (onChangeOverride) {
              onChangeOverride(
                e.target.value
              );
            } else {
              updateField(
                key,
                e.target.value
              );
            }
          }
        },

        React.createElement(
          "option",
          { value: "" },
          placeholder
        ),

        options.map(
          (option) =>
            React.createElement(
              "option",
              {
                key: option.id,
                value: option.id
              },
              option.label
            )
        )
      )
    );
  }

  async function submit(e) {
    e.preventDefault();

    setError("");

    if (!form.patient_code.trim()) {
      setError(
        "Patient code is required."
      );
      return;
    }

    if (!form.full_name.trim()) {
      setError(
        "Full name is required."
      );
      return;
    }

    if (!form.sex) {
      setError(
        "Sex is required."
      );
      return;
    }

    if (!form.ward_id) {
      setError(
        "Ward is required."
      );
      return;
    }

    if (!form.reason_for_admission.trim()) {
      setError(
        "Reason for admission is required."
      );
      return;
    }

    if (!form.responsible_mo_id) {
      setError(
        "Responsible Medical Officer is required."
      );
      return;
    }

    setSaving(true);

    const {
      data: {
        user
      } = {}
    } = await db.auth.getUser();

    if (!user?.id) {
      setError(
        "No authenticated user found."
      );
      setSaving(false);
      return;
    }

    const patientPayload = {
      patient_code:
        form.patient_code.trim(),
      full_name:
        form.full_name.trim(),
      age: form.age
        ? Number(form.age)
        : null,
      sex: form.sex,
      demo: form.demo,
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
      setError(
        patientError.message
      );
      setSaving(false);
      return;
    }

    const admissionPayload = {
      patient_id: patient.id,
      ward_id: form.ward_id,
      bed_id:
        form.bed_id || null,
      admission_datetime:
        form.admission_datetime
          ? new Date(
              form.admission_datetime
            ).toISOString()
          : new Date().toISOString(),
      status: "active",
      responsible_mo_id:
        form.responsible_mo_id,
      specialist_id:
        form.specialist_id || null,
      reason_for_admission:
        form.reason_for_admission.trim(),
      brief_summary:
        form.brief_summary.trim() ||
        null,
      working_diagnosis:
        form.working_diagnosis.trim() ||
        null,
      relevant_background:
        form.relevant_background.trim() ||
        null,
      baseline_clinical_status:
        form.baseline_clinical_status.trim() ||
        null,
      baseline_investigations:
        form.baseline_investigations.trim() ||
        null,
      initial_plan:
        form.initial_plan.trim() ||
        null,
      goals_targets:
        form.goals_targets.trim() ||
        null,
      created_by: user.id
    };

    const {
      error: admissionError
    } = await db
      .from("admissions")
      .insert(admissionPayload);

    if (admissionError) {
      setError(
        "Patient was created, but the admission could not be created: " +
          admissionError.message
      );
      setSaving(false);
      return;
    }

    setSaving(false);

    if (onCreated) {
      onCreated();
    }
  }

  return React.createElement(
    "div",
    {
      className:
        "modal-backdrop"
    },

    React.createElement(
      "div",
      {
        className: "modal"
      },

      React.createElement(
        "div",
        {
          className: "row"
        },

        React.createElement(
          "div",
          null,

          React.createElement(
            "h2",
            null,
            "New Patient & Admission"
          ),

          React.createElement(
            "div",
            {
              className:
                "small muted"
            },
            "Create the patient record and active admission."
          )
        ),

        React.createElement(
          "button",
          {
            className:
              "btn btn-secondary",
            type: "button",
            onClick: onClose,
            disabled: saving
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

      loadingOptions
        ? React.createElement(
            "div",
            {
              className: "loading",
              style: {
                marginTop: "18px"
              }
            },
            "Loading wards, beds and clinicians..."
          )
        : React.createElement(
            "form",
            {
              onSubmit: submit,
              style: {
                marginTop: "18px"
              }
            },

            React.createElement(
              "div",
              {
                className: "grid grid-2"
              },

              textField(
                "Patient Code",
                "patient_code",
                {
                  required: true,
                  placeholder:
                    "e.g. P-0001"
                }
              ),

              textField(
                "Full Name",
                "full_name",
                {
                  required: true,
                  placeholder:
                    "Patient full name"
                }
              ),

              textField(
                "Age",
                "age",
                {
                  type: "number",
                  placeholder:
                    "Age"
                }
              ),

              selectField(
                "Sex",
                "sex",
                [
                  {
                    id: "male",
                    label: "Male"
                  },
                  {
                    id: "female",
                    label: "Female"
                  },
                  {
                    id: "other",
                    label: "Other"
                  }
                ],
                "Select sex",
                true
              ),

              selectField(
                "Ward",
                "ward_id",
                wards.map(
                  (ward) => ({
                    id: ward.id,
                    label: ward.name
                  })
                ),
                "Select ward",
                true,
                updateWard
              ),

              selectField(
                "Bed",
                "bed_id",
                availableBeds.map(
                  (bed) => ({
                    id: bed.id,
                    label: bed.name
                  })
                ),
                availableBeds.length
                  ? "Select bed"
                  : "No beds available"
              ),

              selectField(
                "Responsible Medical Officer",
                "responsible_mo_id",
                medicalOfficers.map(
                  (profile) => ({
                    id: profile.id,
                    label:
                      profile.display_name ||
                      profile.email ||
                      "Medical Officer"
                  })
                ),
                "Select medical officer",
                true
              ),

              selectField(
                "Specialist",
                "specialist_id",
                specialists.map(
                  (profile) => ({
                    id: profile.id,
                    label:
                      profile.display_name ||
                      profile.email ||
                      "Specialist"
                  })
                ),
                "Select specialist"
              )
            ),

            textField(
              "Admission Date & Time",
              "admission_datetime",
              {
                type: "datetime-local",
                required: true
              }
            ),

            React.createElement(
              "div",
              {
                className:
                  "field"
              },

              React.createElement(
                "label",
                null,
                "Demo Patient"
              ),

              React.createElement(
                "label",
                {
                  style: {
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "8px"
                  }
                },

                React.createElement(
                  "input",
                  {
                    type: "checkbox",
                    checked: form.demo,
                    onChange: (e) =>
                      updateField(
                        "demo",
                        e.target.checked
                      ),
                    style: {
                      width: "auto"
                    }
                  },

                  "Mark as demo/test patient"
                )
              )
            ),

            textareaField(
              "Reason for Admission",
              "reason_for_admission",
              "Why is the patient being admitted?"
            ),

            textareaField(
              "Brief Summary",
              "brief_summary",
              "Concise clinical summary."
            ),

            textareaField(
              "Working Diagnosis",
              "working_diagnosis",
              "Current working diagnosis."
            ),

            textareaField(
              "Relevant Background",
              "relevant_background",
              "Relevant medical history, comorbidities and context."
            ),

            textareaField(
              "Baseline Clinical Status",
              "baseline_clinical_status",
              "Baseline clinical condition at admission."
            ),

            textareaField(
              "Baseline Investigations",
              "baseline_investigations",
              "Important initial investigations and findings."
            ),

            textareaField(
              "Initial Plan",
              "initial_plan",
              "Initial management plan."
            ),

            textareaField(
              "Goals / Targets",
              "goals_targets",
              "Clinical goals and measurable targets for admission."
            ),

            React.createElement(
              "div",
              {
                className:
                  "form-actions"
              },

              React.createElement(
                "button",
                {
                  className:
                    "btn btn-secondary",
                  type: "button",
                  onClick: onClose,
                  disabled: saving
                },
                "Cancel"
              ),

              React.createElement(
                "button",
                {
                  className:
                    "btn btn-primary",
                  type: "submit",
                  disabled: saving
                },
                saving
                  ? "Creating..."
                  : "Create Patient & Admission"
              )
            )
          )
    )
  );
}

function toLocalDateTimeValue(
  date
) {
  const pad = (value) =>
    String(value).padStart(2, "0");

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
                        }
