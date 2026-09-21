import {
  loadAuthorizationContext,
} from "./clinicalContext.js";

/**
 * PRISM Tenant / Hospital / Department / Unit Context
 *
 * Current canonical hierarchy:
 *
 * Tenant
 *   ↓
 * Hospital
 *   ↓
 * Department
 *   ↓
 * Unit
 *
 * Organization and Campus are intentionally not
 * assumed because they are not first-class backend
 * entities yet.
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

  const backendContext =
    authorizationContext?.context || {};

  return {
    authorization: authorizationContext,

    tenant:
      backendContext.tenant || null,

    hospital:
      backendContext.hospital || null,

    department:
      backendContext.department || null,

    unit:
      backendContext.unit || null,

    organization: null,
    country: null,
    campus: null,
  };
}

export function getCurrentTenant(context) {
  return context?.tenant || null;
}

export function getCurrentHospital(context) {
  return context?.hospital || null;
}

export function getCurrentDepartment(context) {
  return context?.department || null;
}

export function getCurrentUnit(context) {
  return context?.unit || null;
}

export function getCurrentOrganization(context) {
  return context?.organization || null;
}

export function getCurrentCountry(context) {
  return context?.country || null;
}

export function getCurrentCampus(context) {
  return context?.campus || null;
}

export function getClinicalHierarchy(context) {
  return {
    tenant:
      getCurrentTenant(context),

    hospital:
      getCurrentHospital(context),

    department:
      getCurrentDepartment(context),

    unit:
      getCurrentUnit(context),
  };
}

export function getClinicalContextIds(context) {
  return {
    tenantId:
      getCurrentTenant(context)?.id || null,

    hospitalId:
      getCurrentHospital(context)?.id || null,

    departmentId:
      getCurrentDepartment(context)?.id || null,

    unitId:
      getCurrentUnit(context)?.id || null,
  };
}

export function getClinicalLocationLabel(context) {
  return [
    getCurrentHospital(context)?.name,
    getCurrentDepartment(context)?.name,
    getCurrentUnit(context)?.name,
  ]
    .filter(Boolean)
    .join(" → ");
}
