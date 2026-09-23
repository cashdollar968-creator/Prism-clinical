import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "https://esm.sh/react@18.3.1";

import { db } from "../supabase.js";
import FollowupModal from "../components/FollowupModal.js";

const h = React.createElement;

function text(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
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
    return String(value);
  }

  return date.toLocaleString();
}

function statusClass(value) {
  const v = String(value || "").toLowerCase();

  if (
    v.includes("deteriorat") ||
    v.includes("unstable") ||
    v.includes("urgent") ||
    v.includes("critical")
  ) {
    return "badge badge-danger";
  }

  if (
    v.includes("stable") ||
    v.includes("improv") ||
    v.includes("completed") ||
    v.includes("resolved")
  ) {
    return "badge badge-success";
  }

  if (
    v.includes("pending") ||
    v.includes("review")
  ) {
    return "badge badge-warning";
  }

  return "badge";
}

function Section({
  title,
  children,
  action = null
}) {
  return h(
    "section",
    {
      className: "card",
      style: {
        marginBottom: "16px"
      }
    },

    h(
      "div",
      {
        className: "row wrap",
        style: {
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px"
        }
      },

      h(
        "div",
        {
          className: "section-title"
        },
        title
      ),

      action
    ),

    children
  );
}

function Field({
  label,
  value
}) {
  return h(
    "div",
    {
      className: "detail-box"
    },

    h(
      "div",
      {
        className: "detail-label"
      },
      label
    ),

    h(
      "div",
      {
        className: "detail-value"
      },
      text(value)
    )
  );
}

function EmptyState({
  message
}) {
  return h(
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

function ErrorState({
  message
}) {
  return h(
    "div",
    {
      className: "card",
      style: {
        borderColor: "#b91c1c",
        color: "#b91c1c"
      }
    },
    message
  );
}

function LoadingState() {
  return h(
    "div",
    {
      className: "card"
    },
    "Loading clinical workspace..."
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

  const [admission, setAdmission] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const [specialistRequests, setSpecialistRequests] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [activeTab, setActiveTab] =
    useState("overview");

  const [showFollowup, setShowFollowup] =
    useState(false);

  const [showSpecialistRequest, setShowSpecialistRequest] =
    useState(false);

  const [specialistId, setSpecialistId] =
    useState("");

  const [requestReason, setRequestReason] =
    useState("");

  const [clinicalQuestion, setClinicalQuestion] =
    useState("");

  const [priority, setPriority] =
    useState("routine");

  const [requestSaving, setRequestSaving] =
    useState(false);

  const [requestError, setRequestError] =
    useState("");

  const [requestSuccess, setRequestSuccess] =
    useState("");

  /*
   * ========================================================
   * PDF STATE
   * ========================================================
   */

  const [pdfLoading, setPdfLoading] =
    useState(false);

  /*
   * ========================================================
   * LOAD PATIENT
   * ========================================================
   */

  const loadPatient = useCallback(
    async () => {
      if (!patientId) {
        setError("No patient selected.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const {
          data,
          error: rpcError
        } = await db.rpc(
          "prism_get_patient",
          {
            p_patient_id: patientId
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        const result = data || {};

        setPatient(
          result.patient ||
          result
        );

        const rows =
          result.admissions ||
          [];

        setAdmissions(rows);

        const active =
          rows.find(
            (item) =>
              item.status === "active" ||
              item.discharge_datetime === null
          ) ||
          rows[0] ||
          null;

        setSelectedAdmissionId(
          active?.admission_id ||
          active?.id ||
          null
        );
      } catch (err) {
        console.error(
          "Patient loading error:",
          err
        );

        setPatient(null);
        setAdmissions([]);

        setError(
          err?.message ||
          "Unable to load patient."
        );
      } finally {
        setLoading(false);
      }
    },
    [patientId]
  );

  /*
   * ========================================================
   * LOAD ADMISSION
   * ========================================================
   */

  const loadAdmission = useCallback(
    async (admissionId) => {
      if (!admissionId) {
        setAdmission(null);
        return;
      }

      try {
        const {
          data,
          error: rpcError
        } = await db.rpc(
          "prism_get_admission",
          {
            p_admission_id:
              admissionId
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        setAdmission(
          data?.admission ||
          data ||
          null
        );
      } catch (err) {
        console.error(
          "Admission loading error:",
          err
        );

        setAdmission(null);

        setError(
          err?.message ||
          "Unable to load admission."
        );
      }
    },
    []
  );

  /*
   * ========================================================
   * LOAD TIMELINE
   * ========================================================
   */

  const loadTimeline = useCallback(
    async (admissionId) => {
      if (!admissionId) {
        setTimeline([]);
        return;
      }

      setTimelineLoading(true);

      try {
        const {
          data,
          error: rpcError
        } = await db.rpc(
          "prism_get_admission_timeline",
          {
            p_admission_id:
              admissionId
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        const result =
          data || {};

        const events = [];

        /*
         * Workflow responses
         */

        (
          result.workflow_responses ||
          []
        ).forEach(
          (item) => {
            events.push({
              id:
                `workflow-${item.id}`,
              type:
                "Daily Follow-up",
              date:
                item.created_at ||
                item.submitted_at,
              title:
                "Clinical follow-up submitted",
              body:
                null,
              raw:
                item
            });
          }
        );

        /*
         * Activity events
         */

        (
          result.activity_events ||
          []
        ).forEach(
          (item) => {
            events.push({
              id:
                `activity-${item.id}`,
              type:
                item.action ||
                "Clinical Activity",
              date:
                item.created_at ||
                item.occurred_at,
              title:
                item.action ||
                "Clinical activity",
              body:
                item.metadata
                  ? JSON.stringify(
                      item.metadata
                    )
                  : null,
              raw:
                item
            });
          }
        );

        events.sort(
          (a, b) =>
            new Date(
              b.date || 0
            ) -
            new Date(
              a.date || 0
            )
        );

        setTimeline(events);
      } catch (err) {
        console.error(
          "Timeline loading error:",
          err
        );

        setTimeline([]);

        setError(
          err?.message ||
          "Unable to load clinical timeline."
        );
      } finally {
        setTimelineLoading(false);
      }
    },
    []
  );

  /*
   * ========================================================
   * LOAD SPECIALIST REQUESTS
   *
   * The secure queue API returns requests accessible to
   * the current user. We filter it locally to this admission.
   * ========================================================
   */

  const loadSpecialistRequests =
    useCallback(
      async (admissionId) => {
        if (!admissionId) {
          setSpecialistRequests([]);
          return;
        }

        try {
          const {
            data,
            error: rpcError
          } = await db.rpc(
            "prism_get_specialist_queue"
          );

          if (rpcError) {
            throw rpcError;
          }

          const rows =
            Array.isArray(data)
              ? data
              : data?.requests || [];

          setSpecialistRequests(
            rows.filter(
              (item) =>
                item.admission_id ===
                admissionId
            )
          );
        } catch (err) {
          console.error(
            "Specialist queue loading error:",
            err
          );

          setSpecialistRequests([]);
        }
      },
      []
    );

  /*
   * ========================================================
   * INITIAL LOAD
   * ========================================================
   */

  useEffect(
    () => {
      loadPatient();
    },
    [loadPatient]
  );

  /*
   * ========================================================
   * ADMISSION CONTEXT LOAD
   * ========================================================
   */

  useEffect(
    () => {
      if (!selectedAdmissionId) {
        return;
      }

      loadAdmission(
        selectedAdmissionId
      );

      loadTimeline(
        selectedAdmissionId
      );

      loadSpecialistRequests(
        selectedAdmissionId
      );
    },
    [
      selectedAdmissionId,
      loadAdmission,
      loadTimeline,
      loadSpecialistRequests
    ]
  );

  /*
   * ========================================================
   * PATIENT ACTIVITY
   * ========================================================
   */

  useEffect(
    () => {
      if (
        patientId &&
        recordActivity
      ) {
        recordActivity(
          "patient_workspace_opened",
          {
            entityType:
              "patient",
            entityId:
              patientId,
            patientId,
            route:
              "patient"
          }
        );
      }
    },
    [
      patientId,
      recordActivity
    ]
  );

  /*
   * ========================================================
   * CURRENT ADMISSION
   * ========================================================
   */

  const selectedAdmission =
    useMemo(
      () =>
        admissions.find(
          (item) =>
            (
              item.admission_id ||
              item.id
            ) ===
            selectedAdmissionId
        ) ||
        admission ||
        null,
      [
        admissions,
        selectedAdmissionId,
        admission
      ]
    );

  /*
   * ========================================================
   * REFRESH
   * ========================================================
   */

  async function refreshWorkspace() {
    await loadPatient();

    if (selectedAdmissionId) {
      await loadAdmission(
        selectedAdmissionId
      );

      await loadTimeline(
        selectedAdmissionId
      );

      await loadSpecialistRequests(
        selectedAdmissionId
      );
    }
  }

  /*
   * ========================================================
   * DETAILED HANDOVER PDF
   *
   * Generates the current admission's Detailed Handover
   * through the deployed Supabase Edge Function.
   * ========================================================
   */

  async function openDetailedHandoverPdf() {
    const admissionId =
      selectedAdmission?.admission_id ||
      selectedAdmission?.id ||
      selectedAdmissionId;

    if (!admissionId) {
      setError(
        "No admission selected."
      );
      return;
    }

    if (pdfLoading) {
      return;
    }

    setPdfLoading(true);
    setError("");

    let pdfUrl = null;

    try {
      /*
       * Get the current authenticated Supabase session.
       */

      const {
        data: sessionData,
        error: sessionError
      } = await db.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const currentSession =
        sessionData?.session;

      if (
        !currentSession?.access_token
      ) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      /*
       * Deployed PRISM PDF Edge Function.
       */

      const functionUrl =
        "https://rcikgkdesnlfewkfeybv.supabase.co/functions/v1/prism-handover-pdf";

      const response =
        await fetch(
          functionUrl,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${currentSession.access_token}`
            },

            body:
              JSON.stringify({
                admission_id:
                  admissionId
              })
          }
        );

      /*
       * Handle HTTP/API errors.
       */

      if (!response.ok) {
        let message =
          `Unable to generate PDF (${response.status}).`;

        try {
          const contentType =
            response.headers.get(
              "content-type"
            ) || "";

          if (
            contentType.includes(
              "application/json"
            )
          ) {
            const errorBody =
              await response.json();

            if (
              errorBody?.error
            ) {
              message =
                errorBody.error;
            } else if (
              errorBody?.message
            ) {
              message =
                errorBody.message;
            }
          } else {
            const errorText =
              await response.text();

            if (
              errorText?.trim()
            ) {
              message =
                errorText;
            }
          }
        } catch (_) {
          /*
           * Keep the default HTTP error.
           */
        }

        throw new Error(
          message
        );
      }

      /*
       * Convert the response to a PDF Blob.
       */

      const blob =
        await response.blob();

      if (
        !blob ||
        blob.size === 0
      ) {
        throw new Error(
          "The PDF response was empty."
        );
      }

      /*
       * Create a temporary browser URL.
       */

      pdfUrl =
        URL.createObjectURL(
          blob
        );

      /*
       * Open the PDF in a new browser tab.
       */

      const openedWindow =
        window.open(
          pdfUrl,
          "_blank",
          "noopener,noreferrer"
        );

      /*
       * Some browsers block window.open.
       * Provide a fallback link.
       */

      if (!openedWindow) {
        const link =
          document.createElement(
            "a"
          );

        link.href =
          pdfUrl;

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();
      }

      /*
       * Audit/activity event.
       */

      if (recordActivity) {
        recordActivity(
          "handover_pdf_opened",
          {
            entityType:
              "admission",

            entityId:
              admissionId,

            admissionId,

            mode:
              "detailed",

            source:
              "patient_workspace"
          }
        );
      }

      /*
       * Keep the object URL alive long enough for the
       * browser PDF viewer to finish opening it.
       */

      window.setTimeout(
        () => {
          if (pdfUrl) {
            URL.revokeObjectURL(
              pdfUrl
            );
          }
        },
        60000
      );

    } catch (pdfError) {
      console.error(
        "Detailed Handover PDF error:",
        pdfError
      );

      /*
       * Revoke the URL if an error happened after
       * creating it.
       */

      if (pdfUrl) {
        URL.revokeObjectURL(
          pdfUrl
        );
      }

      setError(
        pdfError?.message ||
        "Unable to generate the Detailed Handover PDF."
      );
    } finally {
      setPdfLoading(false);
    }
  }

  /*
   * ========================================================
   * SPECIALIST REQUEST
   * ========================================================
   */

  async function submitSpecialistRequest(
    event
  ) {
    event.preventDefault();

    setRequestError("");
    setRequestSuccess("");

    if (!selectedAdmissionId) {
      setRequestError(
        "No active admission selected."
      );
      return;
    }

    if (!specialistId) {
      setRequestError(
        "Specialist is required."
      );
      return;
    }

    if (!requestReason.trim()) {
      setRequestError(
        "Reason is required."
      );
      return;
    }

    if (!clinicalQuestion.trim()) {
      setRequestError(
        "Clinical question is required."
      );
      return;
    }

    setRequestSaving(true);

    try {
      const {
        data,
        error: rpcError
      } = await db.rpc(
        "prism_create_specialist_request",
        {
          p_admission_id:
            selectedAdmissionId,

          p_specialist_id:
            specialistId,

          p_reason:
            requestReason.trim(),

          p_clinical_question:
            clinicalQuestion.trim(),

          p_priority:
            priority
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setRequestSuccess(
        "Specialist request submitted."
      );

      setSpecialistId("");
      setRequestReason("");
      setClinicalQuestion("");
      setPriority("routine");

      setShowSpecialistRequest(
        false
      );

      await loadSpecialistRequests(
        selectedAdmissionId
      );

      await loadTimeline(
        selectedAdmissionId
      );
    } catch (err) {
      console.error(
        "Specialist request error:",
        err
      );

      setRequestError(
        err?.message ||
        "Unable to submit specialist request."
      );
    } finally {
      setRequestSaving(false);
    }
  }

  /*
   * ========================================================
   * TAB BUTTON
   * ========================================================
   */

  function tabButton(
    key,
    label
  ) {
    return h(
      "button",
      {
        type: "button",

        className:
          "btn " +
          (
            activeTab === key
              ? "btn-primary"
              : "btn-secondary"
          ),

        onClick: () =>
          setActiveTab(key)
      },

      label
    );
  }

  /*
   * ========================================================
   * LOADING
   * ========================================================
   */

  if (loading) {
    return h(
      LoadingState
    );
  }

  /*
   * ========================================================
   * ERROR / NOT FOUND
   * ========================================================
   */

  if (
    error &&
    !patient
  ) {
    return h(
      React.Fragment,
      null,

      h(
        "div",
        {
          className:
            "row wrap",
          style: {
            justifyContent:
              "space-between",
            marginBottom:
              "16px"
          }
        },

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-secondary",
            onClick: () =>
              onNavigate("patients")
          },
          "← Back to Patients"
        )
      ),

      h(
        ErrorState,
        {
          message: error
        }
      )
    );
  }

  /*
   * ========================================================
   * HEADER
   * ========================================================
   */

  return h(
    React.Fragment,
    null,

    h(
      "div",
      {
        className:
          "row wrap",
        style: {
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          marginBottom:
            "16px"
        }
      },

      h(
        "div",
        null,

        h(
          "div",
          {
            className:
              "page-title"
          },
          text(
            patient?.full_name ||
            patient?.name ||
            patient?.patient_name
          )
        ),

        h(
          "div",
          {
            className:
              "page-subtitle"
          },

          text(
            patient?.patient_code ||
            patient?.code ||
            patientId
          )
        )
      ),

      h(
        "div",
        {
          className:
            "row wrap"
        },

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-secondary",
            onClick: () =>
              onNavigate("patients")
          },
          "← Patients"
        ),

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-secondary",
            onClick:
              refreshWorkspace
          },
          "Refresh"
        )
      )
    ),

    error
      ? h(
          "div",
          {
            className:
              "card",
            style: {
              marginBottom:
                "16px",
              borderColor:
                "#b45309"
            }
          },
          error
        )
      : null,

    /*
     * ======================================================
     * PATIENT / ADMISSION SUMMARY
     * ======================================================
     */

    h(
      Section,
      {
        title:
          "Patient & Admission"
      },

      h(
        "div",
        {
          className:
            "grid grid-3"
        },

        h(
          Field,
          {
            label:
              "Patient",
            value:
              patient?.full_name ||
              patient?.name
          }
        ),

        h(
          Field,
          {
            label:
              "Patient Code",
            value:
              patient?.patient_code ||
              patient?.code
          }
        ),

        h(
          Field,
          {
            label:
              "Age",
            value:
              patient?.age
          }
        ),

        h(
          Field,
          {
            label:
              "Sex",
            value:
              patient?.sex
          }
        ),

        h(
          Field,
          {
            label:
              "Admission Status",
            value:
              selectedAdmission?.status
          }
        ),

        h(
          Field,
          {
            label:
              "Admission Date",
            value:
              formatDate(
                selectedAdmission?.admission_datetime
              )
          }
        ),

        h(
          Field,
          {
            label:
              "Ward / Unit",
            value:
              selectedAdmission?.unit_name ||
              selectedAdmission?.ward_name ||
              selectedAdmission?.ward
          }
        ),

        h(
          Field,
          {
            label:
              "Bed",
            value:
              selectedAdmission?.bed_name ||
              selectedAdmission?.bed
          }
        ),

        h(
          Field,
          {
            label:
              "Responsible Medical Officer",
            value:
              selectedAdmission?.responsible_mo_name ||
              selectedAdmission?.responsible_mo_id
          }
        ),

        h(
          Field,
          {
            label:
              "Specialist",
            value:
              selectedAdmission?.specialist_name ||
              selectedAdmission?.specialist_id
          }
        ),

        h(
          Field,
          {
            label:
              "Reason for Admission",
            value:
              selectedAdmission?.reason_for_admission
          }
        ),

        h(
          Field,
          {
            label:
              "Working Diagnosis",
            value:
              selectedAdmission?.working_diagnosis
          }
        )
      )
    ),

    /*
     * ======================================================
     * ADMISSION SELECTOR
     * ======================================================
     */

    admissions.length > 1
      ? h(
          Section,
          {
            title:
              "Patient Encounters / Admissions"
          },

          h(
            "div",
            {
              className:
                "row wrap"
            },

            admissions.map(
              (item) => {
                const id =
                  item.admission_id ||
                  item.id;

                return h(
                  "button",
                  {
                    key: id,
                    type: "button",

                    className:
                      "btn " +
                      (
                        id ===
                        selectedAdmissionId
                          ? "btn-primary"
                          : "btn-secondary"
                      ),

                    onClick: () =>
                      setSelectedAdmissionId(
                        id
                      )
                  },

                  `${text(
                    item.status
                  )} — ${formatDate(
                    item.admission_datetime
                  )}`
                );
              }
            )
          )
        )
      : null,

    /*
     * ======================================================
     * WORKSPACE ACTIONS
     * ======================================================
     */

    h(
      Section,
      {
        title:
          "Clinical Actions"
      },

      h(
        "div",
        {
          className:
            "row wrap"
        },

        /*
         * Daily Follow-up
         */

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-primary",

            disabled:
              !selectedAdmission,

            onClick: () =>
              setShowFollowup(true)
          },
          "＋ Daily Follow-up"
        ),

        /*
         * Detailed Handover PDF
         */

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-secondary",

            disabled:
              !selectedAdmission ||
              pdfLoading,

            onClick:
              openDetailedHandoverPdf
          },

          pdfLoading
            ? "Generating PDF..."
            : "Detailed Handover PDF"
        ),

        /*
         * Specialist Review
         */

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-secondary",

            disabled:
              !selectedAdmission,

            onClick: () => {
              setRequestError("");
              setRequestSuccess("");
              setShowSpecialistRequest(
                true
              );
            }
          },
          "Request Specialist Review"
        ),

        /*
         * Timeline
         */

        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-secondary",

            onClick: () =>
              setActiveTab(
                "timeline"
              )
          },
          "Clinical Timeline"
        )
      ),

      requestSuccess
        ? h(
            "div",
            {
              style: {
                marginTop:
                  "12px",
                color:
                  "#166534"
              }
            },
            requestSuccess
          )
        : null
    ),

    /*
     * ======================================================
     * TABS
     * ======================================================
     */

    h(
      "div",
      {
        className:
          "row wrap",
        style: {
          marginBottom:
            "16px"
        }
      },

      tabButton(
        "overview",
        "Overview"
      ),

      tabButton(
        "timeline",
        "Timeline"
      ),

      tabButton(
        "specialist",
        "Specialist"
      )
    ),

    /*
     * ======================================================
     * OVERVIEW
     * ======================================================
     */

    activeTab === "overview"
      ? h(
          React.Fragment,
          null,

          h(
            Section,
            {
              title:
                "Current Clinical Status"
            },

            h(
              "div",
              {
                className:
                  "grid grid-3"
              },

              h(
                Field,
                {
                  label:
                    "Admission Status",
                  value:
                    selectedAdmission?.status
                }
              ),

              h(
                Field,
                {
                  label:
                    "Current Unit",
                  value:
                    selectedAdmission?.unit_name ||
                    selectedAdmission?.ward_name
                }
              ),

              h(
                Field,
                {
                  label:
                    "Bed",
                  value:
                    selectedAdmission?.bed_name ||
                    selectedAdmission?.bed
                }
              )
            )
          ),

          h(
            Section,
            {
              title:
                `Specialist Requests (${specialistRequests.length})`,
              action:
                h(
                  "button",
                  {
                    type: "button",
                    className:
                      "btn btn-secondary",

                    onClick: () =>
                      setActiveTab(
                        "specialist"
                      )
                  },
                  "View all"
                )
            },

            specialistRequests.length
              ? specialistRequests.map(
                  (request) =>
                    h(
                      "div",
                      {
                        key:
                          request.id,
                        className:
                          "card",
                        style: {
                          marginBottom:
                            "10px"
                        }
                      },

                      h(
                        "div",
                        {
                          className:
                            "row wrap",
                          style: {
                            justifyContent:
                              "space-between"
                          }
                        },

                        h(
                          "strong",
                          null,
                          text(
                            request.clinical_question
                          )
                        ),

                        h(
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

                      h(
                        "div",
                        {
                          className:
                            "muted",
                          style: {
                            marginTop:
                              "8px"
                          }
                        },
                        `${text(
                          request.priority
                        )} · ${formatDate(
                          request.requested_at
                        )}`
                      )
                    )
                )
              : h(
                  EmptyState,
                  {
                    message:
                      "No specialist requests for this admission."
                  }
                )
          ),

          h(
            Section,
            {
              title:
                "Recent Clinical Activity"
            },

            timeline.length
              ? timeline
                  .slice(0, 5)
                  .map(
                    (event) =>
                      h(
                        "div",
                        {
                          key:
                            event.id,
                          style: {
                            borderLeft:
                              "3px solid #0f766e",
                            paddingLeft:
                              "12px",
                            marginBottom:
                              "14px"
                          }
                        },

                        h(
                          "div",
                          {
                            className:
                              "muted"
                          },
                          formatDate(
                            event.date
                          )
                        ),

                        h(
                          "div",
                          {
                            style: {
                              fontWeight:
                                "700",
                              marginTop:
                                "3px"
                            }
                          },
                          text(
                            event.title
                          )
                        ),

                        event.body
                          ? h(
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
              : h(
                  EmptyState,
                  {
                    message:
                      "No clinical activity recorded yet."
                  }
                )
          )
        )
      : null,

    /*
     * ======================================================
     * TIMELINE
     * ======================================================
     */

    activeTab === "timeline"
      ? h(
          Section,
          {
            title:
              `Clinical Timeline (${timeline.length})`
          },

          timelineLoading
            ? h(
                "div",
                {
                  className:
                    "muted"
                },
                "Loading timeline..."
              )

            : timeline.length
              ? timeline.map(
                  (event) =>
                    h(
                      "div",
                      {
                        key:
                          event.id,
                        style: {
                          position:
                            "relative",
                          borderLeft:
                            "3px solid #0f766e",
                          paddingLeft:
                            "16px",
                          marginBottom:
                            "20px"
                        }
                      },

                      h(
                        "div",
                        {
                          className:
                            "muted"
                        },
                        formatDate(
                          event.date
                        )
                      ),

                      h(
                        "div",
                        {
                          style: {
                            fontWeight:
                              "700",
                            marginTop:
                              "4px"
                          }
                        },
                        text(
                          event.type
                        )
                      ),

                      h(
                        "div",
                        {
                          style: {
                            marginTop:
                              "3px"
                          }
                        },
                        text(
                          event.title
                        )
                      ),

                      event.body
                        ? h(
                            "div",
                            {
                              className:
                                "muted",
                              style: {
                                marginTop:
                                  "5px",
                                wordBreak:
                                  "break-word"
                              }
                            },
                            event.body
                          )
                        : null
                    )
                )

              : h(
                  EmptyState,
                  {
                    message:
                      "No clinical timeline events recorded."
                  }
                )
        )
      : null,

    /*
     * ======================================================
     * SPECIALIST TAB
     * ======================================================
     */

    activeTab === "specialist"
      ? h(
          Section,
          {
            title:
              `Specialist Requests (${specialistRequests.length})`,
            action:
              h(
                "button",
                {
                  type: "button",
                  className:
                    "btn btn-primary",
                  onClick: () => {
                    setRequestError("");
                    setRequestSuccess("");
                    setShowSpecialistRequest(
                      true
                    );
                  }
                },
                "＋ New Request"
              )
          },

          specialistRequests.length
            ? specialistRequests.map(
                (request) =>
                  h(
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

                    h(
                      "div",
                      {
                        className:
                          "row wrap",
                        style: {
                          justifyContent:
                            "space-between"
                        }
                      },

                      h(
                        "strong",
                        null,
                        text(
                          request.clinical_question
                        )
                      ),

                      h(
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

                    h(
                      "div",
                      {
                        className:
                          "grid grid-3",
                        style: {
                          marginTop:
                            "12px"
                        }
                      },

                      h(
                        Field,
                        {
                          label:
                            "Priority",
                          value:
                            request.priority
                        }
                      ),

                      h(
                        Field,
                        {
                          label:
                            "Reason",
                          value:
                            request.reason
                        }
                      ),

                      h(
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

            : h(
                EmptyState,
                {
                  message:
                    "No specialist requests for this admission."
                }
              )
        )
      : null,

    /*
     * ======================================================
     * FOLLOW-UP MODAL
     * ======================================================
     */

    showFollowup &&
    selectedAdmission
      ? h(
          FollowupModal,
          {
            admission:
              selectedAdmission,

            user:
              session?.user ||
              profile,

            onClose: () =>
              setShowFollowup(false),

            onSaved: async () => {
              setShowFollowup(false);

              await loadTimeline(
                selectedAdmissionId
              );

              await loadSpecialistRequests(
                selectedAdmissionId
              );
            }
          }
        )
      : null,

    /*
     * ======================================================
     * SPECIALIST REQUEST MODAL
     * ======================================================
     */

    showSpecialistRequest
      ? h(
          "div",
          {
            className:
              "modal-backdrop"
          },

          h(
            "div",
            {
              className:
                "modal"
            },

            h(
              "div",
              {
                className:
                  "row wrap",
                style: {
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "16px"
                }
              },

              h(
                "div",
                {
                  className:
                    "section-title"
                },
                "Request Specialist Review"
              ),

              h(
                "button",
                {
                  type:
                    "button",
                  className:
                    "btn btn-secondary",
                  onClick: () =>
                    setShowSpecialistRequest(
                      false
                    )
                },
                "Close"
              )
            ),

            requestError
              ? h(
                  "div",
                  {
                    style: {
                      color:
                        "#b91c1c",
                      marginBottom:
                        "12px"
                    }
                  },
                  requestError
                )
              : null,

            h(
              "form",
              {
                onSubmit:
                  submitSpecialistRequest
              },

              h(
                "div",
                {
                  className:
                    "field"
                },

                h(
                  "label",
                  null,
                  "Specialist User ID"
                ),

                h(
                  "input",
                  {
                    value:
                      specialistId,
                    onChange:
                      (e) =>
                        setSpecialistId(
                          e.target.value
                        ),
                    placeholder:
                      "Enter specialist user ID",
                    required:
                      true
                  }
                )
              ),

              h(
                "div",
                {
                  className:
                    "field"
                },

                h(
                  "label",
                  null,
                  "Priority"
                ),

                h(
                  "select",
                  {
                    value:
                      priority,
                    onChange:
                      (e) =>
                        setPriority(
                          e.target.value
                        )
                  },

                  h(
                    "option",
                    {
                      value:
                        "routine"
                    },
                    "Routine"
                  ),

                  h(
                    "option",
                    {
                      value:
                        "high"
                    },
                    "High"
                  ),

                  h(
                    "option",
                    {
                      value:
                        "urgent"
                    },
                    "Urgent"
                  )
                )
              ),

              h(
                "div",
                {
                  className:
                    "field"
                },

                h(
                  "label",
                  null,
                  "Reason"
                ),

                h(
                  "textarea",
                  {
                    value:
                      requestReason,
                    onChange:
                      (e) =>
                        setRequestReason(
                          e.target.value
                        ),
                    rows:
                      4,
                    required:
                      true
                  }
                )
              ),

              h(
                "div",
                {
                  className:
                    "field"
                },

                h(
                  "label",
                  null,
                  "Clinical Question"
                ),

                h(
                  "textarea",
                  {
                    value:
                      clinicalQuestion,
                    onChange:
                      (e) =>
                        setClinicalQuestion(
                          e.target.value
                        ),
                    rows:
                      4,
                    required:
                      true
                  }
                )
              ),

              h(
                "div",
                {
                  className:
                    "row wrap",
                  style: {
                    justifyContent:
                      "flex-end",
                    marginTop:
                      "16px"
                  }
                },

                h(
                  "button",
                  {
                    type:
                      "button",
                    className:
                      "btn btn-secondary",
                    onClick: () =>
                      setShowSpecialistRequest(
                        false
                      )
                  },
                  "Cancel"
                ),

                h(
                  "button",
                  {
                    type:
                      "submit",
                    className:
                      "btn btn-primary",
                    disabled:
                      requestSaving
                  },
                  requestSaving
                    ? "Submitting..."
                    : "Submit Request"
                )
              )
            )
          )
        )
      : null
  );
          }
