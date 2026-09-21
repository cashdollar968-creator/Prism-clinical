export const CAPABILITIES = Object.freeze({
  PATIENT_VIEW: "patient.view",
  PATIENT_HISTORY_VIEW: "patient.history.view",
  PATIENT_HISTORY_VIEW_LIMITED: "patient.history.view_limited",
  PATIENT_TIMELINE_VIEW: "patient.timeline.view",

  NOTE_VIEW: "note.view",
  NOTE_CREATE: "note.create",
  NOTE_EDIT_OWN: "note.edit_own",

  DUTY_VIEW: "duty.view",
  DUTY_UPDATE: "duty.update",

  INVESTIGATION_VIEW: "investigation.view",
  INVESTIGATION_CREATE: "investigation.create",

  DAILY_FOLLOWUP_VIEW: "daily_followup.view",
  DAILY_FOLLOWUP_START: "daily_followup.start",
  DAILY_FOLLOWUP_EDIT: "daily_followup.edit",
  DAILY_FOLLOWUP_SUBMIT: "daily_followup.submit",

  SPECIALIST_REQUEST_VIEW: "specialist.request.view",
  SPECIALIST_REQUEST_CREATE: "specialist.request.create",

  SPECIALIST_REVIEW_VIEW: "specialist.review.view",
  SPECIALIST_REVIEW_SUBMIT: "specialist.review.submit",

  MEDICATION_VIEW: "medication.view",
  MEDICATION_CHANGE: "medication.change",

  ADMISSION_VIEW: "admission.view",
  ADMISSION_CREATE: "admission.create",
  ADMISSION_EDIT: "admission.edit",
  ADMISSION_DISCHARGE: "admission.discharge",
});

export const ALL_CAPABILITIES = Object.freeze(
  Object.values(CAPABILITIES)
);
