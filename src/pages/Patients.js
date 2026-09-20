import React, { useMemo, useState } from "https://esm.sh/react@18.3.1";

export default function Patients({
  patients,
  loading,
  onRefresh,
  onOpenPatient
}) {
  const [search, setSearch] = useState("");

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return patients;
    }

    return patients.filter((patient) => {
      const code = String(patient.patient_code || "").toLowerCase();
      const name = String(patient.full_name || "").toLowerCase();

      return (
        name.includes(term) ||
        code.includes(term)
      );
    });
  }, [patients, search]);

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
        "button",
        {
          className: "btn btn-secondary",
          onClick: onRefresh,
          disabled: loading
        },
        loading ? "Refreshing..." : "Refresh"
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
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Search patient or patient code"
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
              const admissions = patient.admissions || [];

              const activeAdmission =
                admissions.find(
                  (admission) =>
                    admission.status === "active"
                ) || admissions[0];

              return React.createElement(
                "div",
                {
                  key: patient.id,
                  className: "card patient-card",
                  onClick: () => onOpenPatient(patient)
                },

                React.createElement(
                  "div",
                  { className: "row wrap" },

                  React.createElement(
                    "div",
                    null,

                    React.createElement(
                      "div",
                      { className: "patient-name" },
                      patient.full_name || "Unnamed patient"
                    ),

                    React.createElement(
                      "div",
                      { className: "muted small" },
                      patient.patient_code || "No patient code"
                    )
                  ),

                  patient.demo
                    ? React.createElement(
                        "span",
                        {
                          className: "badge badge-improving"
                        },
                        "Demo"
                      )
                    : null
                ),

                React.createElement(
                  "div",
                  {
                    className: "detail-grid",
                    style: { marginTop: "14px" }
                  },

                  React.createElement(
                    "div",
                    { className: "detail-box" },

                    React.createElement(
                      "div",
                      { className: "detail-label" },
                      "Age / Sex"
                    ),

                    React.createElement(
                      "div",
                      { className: "detail-value" },
                      `${patient.age ?? "—"} / ${
                        patient.sex || "—"
                      }`
                    )
                  ),

                  React.createElement(
                    "div",
                    { className: "detail-box" },

                    React.createElement(
                      "div",
                      { className: "detail-label" },
                      "Admission Status"
                    ),

                    React.createElement(
                      "div",
                      { className: "detail-value" },
                      activeAdmission?.status || "—"
                    )
                  ),

                  React.createElement(
                    "div",
                    { className: "detail-box" },

                    React.createElement(
                      "div",
                      { className: "detail-label" },
                      "Ward"
                    ),

                    React.createElement(
                      "div",
                      { className: "detail-value" },
                      activeAdmission?.ward_id || "—"
                    )
                  ),

                  React.createElement(
                    "div",
                    { className: "detail-box" },

                    React.createElement(
                      "div",
                      { className: "detail-label" },
                      "Bed"
                    ),

                    React.createElement(
                      "div",
                      { className: "detail-value" },
                      activeAdmission?.bed_id || "—"
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
                    { className: "detail-label" },
                    "Working Diagnosis"
                  ),

                  React.createElement(
                    "div",
                    { className: "detail-value" },
                    activeAdmission?.working_diagnosis || "—"
                  )
                )
              );
            })
          )
  );
}
