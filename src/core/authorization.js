import { CAPABILITIES } from "./capabilities.js";

function normalizeCapabilities(capabilities = {}) {
  if (!capabilities || typeof capabilities !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(capabilities).map(([key, value]) => [
      key,
      Boolean(value),
    ])
  );
}

export function createAuthorizationContext(rawContext = {}) {
  const context = rawContext || {};

  const user = context.user || {};
  const currentContext = context.context || {};

  return {
    user,
    context: currentContext,
    assignments: Array.isArray(context.assignments)
      ? context.assignments
      : [],
    capabilities: normalizeCapabilities(context.capabilities),
  };
}

export function can(context, capability) {
  if (!context || !capability) {
    return false;
  }

  /*
   * Frontend authorization is for UI behavior only.
   * The backend remains the actual security boundary.
   */
  if (context.user?.system_role === "admin") {
    return true;
  }

  return context.capabilities?.[capability] === true;
}

export function cannot(context, capability) {
  return !can(context, capability);
}

export function canAny(context, capabilities = []) {
  return capabilities.some((capability) =>
    can(context, capability)
  );
}

export function canAll(context, capabilities = []) {
  return capabilities.every((capability) =>
    can(context, capability)
  );
}

export function isSystemAdmin(context) {
  return context?.user?.system_role === "admin";
}

export function getCurrentAssignment(context) {
  const departmentId =
    context?.context?.department_id;

  const unitId =
    context?.context?.unit_id;

  if (!departmentId && !unitId) {
    return null;
  }

  return (
    context.assignments?.find(
      (assignment) =>
        (!departmentId ||
          assignment.department_id === departmentId) &&
        (!unitId ||
          assignment.unit_id === unitId)
    ) || null
  );
}

export function getCurrentRole(context) {
  const assignment =
    getCurrentAssignment(context);

  if (!assignment) {
    return null;
  }

  return {
    id: assignment.role_id,
    code: assignment.role_code,
    name: assignment.role_name,
  };
}

export function getCurrentDepartment(context) {
  const departmentId =
    context?.context?.department_id;

  if (!departmentId) {
    return null;
  }

  return {
    id: departmentId,
    name:
      context.context.department_name || null,
  };
}

export function getCurrentUnit(context) {
  const unitId =
    context?.context?.unit_id;

  if (!unitId) {
    return null;
  }

  return {
    id: unitId,
    code:
      context.context.unit_code || null,
    name:
      context.context.unit_name || null,
  };
}

export function getCurrentAssignmentLabel(context) {
  const assignment =
    getCurrentAssignment(context);

  if (!assignment) {
    return null;
  }

  return [
    assignment.department_name,
    assignment.unit_name,
    assignment.role_name,
  ]
    .filter(Boolean)
    .join(" → ");
}

/* Convenience authorization helpers */

export function canViewPatient(context) {
  return can(
    context,
    CAPABILITIES.PATIENT_VIEW
  );
}

export function canViewFullHistory(context) {
  return can(
    context,
    CAPABILITIES.PATIENT_HISTORY_VIEW
  );
}

export function canViewLimitedHistory(context) {
  return can(
    context,
    CAPABILITIES.PATIENT_HISTORY_VIEW_LIMITED
  );
}

export function canViewTimeline(context) {
  return can(
    context,
    CAPABILITIES.PATIENT_TIMELINE_VIEW
  );
}

export function canCreateNote(context) {
  return can(
    context,
    CAPABILITIES.NOTE_CREATE
  );
}

export function canUpdateDuty(context) {
  return can(
    context,
    CAPABILITIES.DUTY_UPDATE
  );
}

export function canSubmitDailyFollowup(context) {
  return can(
    context,
    CAPABILITIES.DAILY_FOLLOWUP_SUBMIT
  );
}

export function canCreateSpecialistRequest(context) {
  return can(
    context,
    CAPABILITIES.SPECIALIST_REQUEST_CREATE
  );
}

export function canSubmitSpecialistReview(context) {
  return can(
    context,
    CAPABILITIES.SPECIALIST_REVIEW_SUBMIT
  );
    }
