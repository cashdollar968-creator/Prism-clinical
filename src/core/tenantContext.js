import {
  loadAuthorizationContext,
} from "./clinicalContext.js";

/**
 * Load the complete tenant / organization /
 * hospital clinical context for the current user.
 *
 * The backend remains the source of truth.
 */
export async function loadTenantContext(
  departmentId = null,
  unitId = null
) {
  const authorizationContext =
    await loadAuthorizationContext(
      departmentId,
      unitId
    );

  return {
    authorization: authorizationContext,

    tenant:
      authorizationContext?.context
        ?.tenant || null,

    organization:
      authorizationContext?.context
        ?.organization || null,

    hospital:
      authorizationContext?.context
        ?.hospital || null,

    campus:
      authorizationContext?.context
        ?.campus || null,

    department:
      authorizationContext?.context
        ?.department || null,

    unit:
      authorizationContext?.context
        ?.unit || null,
  };
}

/**
 * Return the currently selected tenant.
 */
export function getCurrentTenant(context) {
  return context?.tenant || null;
}

/**
 * Return the currently selected organization.
 */
export function getCurrentOrganization(context) {
  return context?.organization || null;
}

/**
 * Return the currently selected hospital.
 */
export function getCurrentHospital(context) {
  return context?.hospital || null;
}

/**
 * Return the currently selected campus.
 */
export function getCurrentCampus(context) {
  return context?.campus || null;
}

/**
 * Return the currently selected department.
 */
export function getCurrentDepartment(context) {
  return context?.department || null;
}

/**
 * Return the currently selected unit.
 */
export function getCurrentUnit(context) {
  return context?.unit || null;
}
