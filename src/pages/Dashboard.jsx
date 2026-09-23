import React from "https://esm.sh/react@18.3.1";
import { formatDate, stabilityClass } from "../helpers.js";

export default function Dashboard({
  activeAdmissions,
  onOpenPatient
}) {
  return React.createElement(
    React.Fragment,
    null,

    React.createElement(
      "div",
      { className: "page-title" },
      "Dashboard"
    ),

    React.createElement(
      "div",
      { className: "page-subtitle" },
      "Current inpatient overview"
    ),

    React.createElement(
      "div",
      { className: "grid grid-4" },

      React.createElement(
        "div",
        { className: "card" },

        React.createElement(
          "div",
          { className: "stat-label" },
          "Active Admissions"
        ),

        React.createElement(
          "div",
          { className: "stat-number" },
          activeAdmissions.length
        )
      ),

      React.createElement(
        "div",
        { className: "card" },

        React.createElement(
          "div",
          { className: "stat-label" },
          "CCU Patients"
        ),

        React.createElement(
          "div",
          { className: "stat-number" },
          activeAdmissions.filter(
            ({ admission }) =>
              String(admission.ward_id || "")
                .toLowerCase()
                .includes("ccu")
          ).length
        )
      ),

      React.createElement(
        "div",
        { className: "card" },

        React.createElement(
          "div",
          { className: "stat-label" },
          "With Specialist"
        ),

        React.createElement(
          "div",
          { className: "stat-number" },
          activeAdmissions.filter(
            ({ admission }) => !!admission.specialist_id
          ).length
        )
      ),

      React.createElement(
        "div",
        { className: "card" },

        React.createElement(
          "div",
          { className: "stat-label" },
          "Current Patients"
        ),

        React.createElement(
          "div",
          { className: "stat-number" },
          new Set(
            activeAdmissions.map(({ patient }) => patient.id)
          ).size
        )
      )
    ),

    React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "section-title" },
        "Current Inpatients"
      ),

      activeAdmissions.length === 0
        ? React.createElement(
            "div",
            { className: "empty" },
            "No active admissions."
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
                    "Patient"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Bed"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Admission"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Diagnosis"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Status"
                  ),

                  React.createElement(
                    "th",
                    null,
                    "Action"
                  )
                )
              ),

              React.createElement(
                "tbody",
                null,

                activeAdmissions.map(
                  ({ patient, admission }) =>
                    React.createElement(
                      "tr",
                      {
                        key: admission.id
                      },

                      React.createElement(
                        "td",
                        null,

                        React.createElement(
                          "strong",
                          null,
                          patient.full_name || "—"
                        ),

                        React.createElement(
                          "div",
                          {
                            className: "small muted"
                          },
                          patient.patient_code || "—"
                        ),

                        React.createElement(
                          "div",
                          {
                            className: "small muted"
                          },
                          `${patient.age ?? "—"} / ${
                            patient.sex || "—"
                          }`
                        )
                      ),

                      React.createElement(
                        "td",
                        null,
                        admission.bed_id || "—"
                      ),

                      React.createElement(
                        "td",
                        null,
                        formatDate(
                          admission.admission_datetime
                        )
                      ),

                      React.createElement(
                        "td",
                        null,
                        admission.working_diagnosis || "—"
                      ),

                      React.createElement(
                        "td",
                        null,

                        admission.latest_stability
                          ? React.createElement(
                              "span",
                              {
                                className:
                                  "badge " +
                                  stabilityClass(
                                    admission.latest_stability
                                  )
                              },
                              admission.latest_stability
                            )

                          : React.createElement(
                              "span",
                              {
                                className: "badge"
                              },
                              "No update"
                            )
                      ),

                      React.createElement(
                        "td",
                        null,

                        React.createElement(
                          "button",
                          {
                            className:
                              "btn btn-secondary",
                            onClick: () =>
                              onOpenPatient(patient)
                          },
                          "Open"
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
