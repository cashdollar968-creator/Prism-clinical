import React, {
  useEffect,
  useMemo,
  useState
} from "https://esm.sh/react@18.3.1";

import { db } from "../supabase.js";

function toLocalDateTimeValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  );
}

function NewPatientModal({ onClose, onCreated }) {
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [medicalOfficers, setMedicalOfficers] = useState([]);
  const [specialists, setSpecialists] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
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

    admission_datetime: toLocalDateTimeValue(),

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

    try {
      const [
        wardsResult,
        bedsResult,
        profilesResult,
        userResult
      ] = await Promise.all([
        db
          .from("wards")
          .select("id,name,department_id")
          .eq("active", true)
          .order("name"),

        db
          .from("beds")
          .select("id,name,ward_id")
          .eq("active", true)
          .order("name"),

        db
          .from("profiles")
          .select("id,display_name,email,role,department_id")
          .eq("active", true)
          .order("display_name"),

        db.auth.getUser()
      ]);

      if (wardsResult.error) {
        throw wardsResult.error;
      }

      if (bedsResult.error) {
        throw bedsResult.error;
      }

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      setWards(wardsResult.data || []);
      setBeds(bedsResult.data || []);

      const profiles = profilesResult.data || [];

      const mos = profiles.filter(
        (profile) => profile.role === "medical_officer"
      );

      const specs = profiles.filter(
        (profile) => profile.role === "specialist"
      );

      setMedicalOfficers(mos);
      setSpecialists(specs);

      const currentUserId = userResult?.data?.user?.id;

      if (currentUserId) {
        const currentProfile = profiles.find(
          (profile) => profile.id === currentUserId
        );

        if (
          currentProfile &&
          currentProfile.role === "medical_officer"
        ) {
          setForm((previous) => ({
            ...previous,
            responsible_mo_id: currentUserId
          }));
        }
      }

      if ((wardsResult.data || []).length === 1) {
        setForm((previous) => ({
          ...previous,
          ward_id: wardsResult.data[0].id
        }));
      }
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load wards, beds, or clinical staff."
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  const availableBeds = useMemo(() => {
    if (!form.ward_id) {
      return [];
    }

    return beds.filter(
      (bed) => bed.ward_id === form.ward_id
    );
  }, [beds, form.ward_id]);

  function handleWardChange(value) {
    setForm((previous) => ({
      ...previous,
      ward_id: value,
      bed_id: ""
    }));
  }

  async function submit(event) {
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

    if (
      form.age !== "" &&
      (
        Number.isNaN(Number(form.age)) ||
        Number(form.age) < 0 ||
        Number(form.age) > 130
      )
    ) {
      setError("Age must be between 0 and 130.");
      return;
    }

    setSaving(true);

    try {
      const userResult = await db.auth.getUser();
      const currentUser = userResult?.data?.user;

      if (!currentUser) {
        throw new Error(
          "You must be signed in to create a patient."
        );
      }

      const patientPayload = {
        patient_code: form.patient_code.trim(),
        full_name: form.full_name.trim(),
        age:
          form.age === ""
            ? null
            : Number(form.age),
        sex: form.sex,
        demo: form.demo,
        created_by: currentUser.id
      };

      const patientResult = await db
        .from("patients")
        .insert(patientPayload)
        .select("id")
        .single();

      if (patientResult.error) {
        throw patientResult.error;
      }

      const admissionPayload = {
        patient_id: patientResult.data.id,
        ward_id: form.ward_id,
        bed_id: form.bed_id || null,

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

        created_by: currentUser.id
      };

      const admissionResult = await db
        .from("admissions")
        .insert(admissionPayload)
        .select("id")
        .single();

      if (admissionResult.error) {
        throw admissionResult.error;
      }

      if (onCreated) {
        await onCreated();
      }

      onClose();
    } catch (err) {
      setError(
        err?.message ||
          "Unable to create patient and admission."
      );
    } finally {
      setSaving(false);
    }
  }

  return React.createElement(
    "div",
    {
      className: "modal-backdrop",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }
    },

    React.createElement(
      "div",
      {
        className: "modal",
        role: "dialog",
        "aria-modal": "true"
      },

      React.createElement(
        "div",
        { className: "modal-header" },

        React.createElement(
          "div",
          null,

          React.createElement(
            "div",
            { className: "modal-title" },
            "New Patient"
          ),

          React.createElement(
            "div",
            { className: "page-subtitle" },
            "Create patient and active admission"
          )
        ),

        React.createElement(
          "button",
          {
            type: "button",
            className: "btn btn-secondary",
            onClick: onClose,
            disabled: saving
          },
          "Close"
        )
      ),

      loadingOptions

        ? React.createElement(
            "div",
            { className: "loading" },
            "Loading clinical options..."
          )

        : React.createElement(
            "form",
            {
              onSubmit: submit
            },

            error
              ? React.createElement(
                  "div",
                  {
                    className: "alert alert-error",
                    style: {
                      marginBottom: "16px"
                    }
                  },
                  error
                )
              : null,

            React.createElement(
              "div",
              { className: "section-title" },
              "Patient Identity"
            ),

            React.createElement(
              "div",
              { className: "form-grid" },

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
                  onChange: (e) =>
                    updateField(
                      "patient_code",
                      e.target.value
                    ),
                  placeholder: "e.g. PT-0001",
                  required: true
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
                  onChange: (e) =>
                    updateField(
                      "full_name",
                      e.target.value
                    ),
                  placeholder: "Patient full name",
                  required: true
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
                  onChange: (e) =>
                    updateField(
                      "age",
                      e.target.value
                    ),
                  placeholder: "Age"
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
                    onChange: (e) =>
                      updateField(
                        "sex",
                        e.target.value
                      ),
                    required: true
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
              )
            ),

            React.createElement(
              "label",
              {
                className: "checkbox-row"
              },

              React.createElement("input", {
                type: "checkbox",
                checked: form.demo,
                onChange: (e) =>
                  updateField(
                    "demo",
                    e.target.checked
                  )
              }),

              React.createElement(
                "span",
                null,
                "Demo patient"
              )
            ),

            React.createElement(
              "div",
              {
                className: "section-title",
                style: {
                  marginTop: "24px"
                }
              },
              "Admission"
            ),

            React.createElement(
              "div",
              { className: "form-grid" },

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
                    onChange: (e) =>
                      handleWardChange(
                        e.target.value
                      ),
                    required: true
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
                    onChange: (e) =>
                      updateField(
                        "bed_id",
                        e.target.value
                      ),
                    disabled:
                      !form.ward_id
                  },

                  React.createElement(
                    "option",
                    { value: "" },
                    form.ward_id
                      ? "Select bed"
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
                    value:
                      form.responsible_mo_id,
                    onChange: (e) =>
                      updateField(
                        "responsible_mo_id",
                        e.target.value
                      ),
                    required: true
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
                        profile.email ||
                        "Medical Officer"
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
                  "Specialist"
                ),

                React.createElement(
                  "select",
                  {
                    value:
                      form.specialist_id,
                    onChange: (e) =>
                      updateField(
                        "specialist_id",
                        e.target.value
                      )
                  },

                  React.createElement(
                    "option",
                    { value: "" },
                    "Not assigned"
                  ),

                  specialists.map((profile) =>
                    React.createElement(
                      "option",
                      {
                        key: profile.id,
                        value: profile.id
                      },
                      profile.display_name ||
                        profile.email ||
                        "Specialist"
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
                  "Admission Date & Time *"
                ),

                React.createElement("input", {
                  type: "datetime-local",
                  value:
                    form.admission_datetime,
                  onChange: (e) =>
                    updateField(
                      "admission_datetime",
                      e.target.value
                    ),
                  required: true
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

                React.createElement("input", {
                  value:
                    form.reason_for_admission,
                  onChange: (e) =>
                    updateField(
                      "reason_for_admission",
                      e.target.value
                    ),
                  placeholder:
                    "Why is the patient being admitted?",
                  required: true
                })
              )
            ),

            React.createElement(
              "div",
              {
                className: "section-title",
                style: {
                  marginTop: "24px"
                }
              },
              "Admission Baseline"
            ),

            React.createElement(
              "div",
              { className: "form-grid" },

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
                    onChange: (e) =>
                      updateField(
                        "brief_summary",
                        e.target.value
                      ),
                    rows: 3,
                    placeholder:
                      "Concise admission summary"
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
                    value:
                      form.working_diagnosis,
                    onChange: (e) =>
                      updateField(
                        "working_diagnosis",
                        e.target.value
                      ),
                    rows: 3,
                    placeholder:
                      "Initial working diagnosis"
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
                    value:
                      form.relevant_background,
                    onChange: (e) =>
                      updateField(
                        "relevant_background",
                        e.target.value
                      ),
                    rows: 3,
                    placeholder:
                      "Relevant comorbidities, history, medications, etc."
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
                    value:
                      form.baseline_clinical_status,
                    onChange: (e) =>
                      updateField(
                        "baseline_clinical_status",
                        e.target.value
                      ),
                    rows: 3,
                    placeholder:
                      "Baseline vitals, examination and clinical state"
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
                    value:
                      form.baseline_investigations,
                    onChange: (e) =>
                      updateField(
                        "baseline_investigations",
                        e.target.value
                      ),
                    rows: 3,
                    placeholder:
                      "ECG, labs, imaging and other available results"
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
                    onChange: (e) =>
                      updateField(
                        "initial_plan",
                        e.target.value
                      ),
                    rows: 3,
                    placeholder:
                      "Initial management plan"
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
                    value:
                      form.goals_targets,
                    onChange: (e) =>
                      updateField(
                        "goals_targets",
                        e.target.value
                      ),
                    rows: 3,
                    placeholder:
                      "What needs to improve or be achieved before discharge?"
                  }
                )
              )
            ),

            React.createElement(
              "div",
              {
                className: "row wrap",
                style: {
                  justifyContent: "flex-end",
                  marginTop: "24px",
                  gap: "10px"
                }
              },

              React.createElement(
                "button",
                {
                  type: "button",
                  className: "btn btn-secondary",
                  onClick: onClose,
                  disabled: saving
                },
                "Cancel"
              ),

              React.createElement(
                "button",
                {
                  type: "submit",
                  className: "btn btn-primary",
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
    if (onRefresh) {
      await onRefresh();
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
                    activeAdmission?.working_diagnosis ||
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
