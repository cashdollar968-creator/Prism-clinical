import {
  loadTenantContext,
} from "./tenantContext.js";

/**
 * Load the complete PRISM context.
 *
 * Canonical hierarchy:
 *
 * Tenant
 *   ↓
 * Hospital
 *   ↓
 * Department
 *   ↓
 * Unit
 *
 * Country is currently derived from the backend
 * tenant context.
 *
 * Organization and Campus remain reserved for
 * future first-class backend entities.
 */

export async function loadPRISMContext(
  departmentId = null,
  unitId = null
) {
  const context =
    await loadTenantContext(
      departmentId,
      unitId
    );

  const tenant =
    context?.tenant || null;

  const hospital =
    context?.hospital || null;

  const department =
    context?.department || null;

  const unit =
    context?.unit || null;

  const country =
    context?.country || null;

  return {
    ...context,

    identifiers: {
      tenantId:
        tenant?.id || null,

      hospitalId:
        hospital?.id || null,

      departmentId:
        department?.id || null,

      unitId:
        unit?.id || null,

      countryCode:
        country?.code || null,
    },

    labels: {
      tenant:
        tenant?.name || null,

      hospital:
        hospital?.name || null,

      department:
        department?.name || null,

      unit:
        unit?.name || null,

      country:
        country?.code || null,
    },

    hierarchy: {
      tenant,
      hospital,
      department,
      unit,
    },
  };
}

export function getPRISMContext(
  context
) {
  return context || null;
}

export function getContextHierarchy(
  context
) {
  return {
    tenant:
      context?.tenant || null,

    hospital:
      context?.hospital || null,

    department:
      context?.department || null,

    unit:
      context?.unit || null,
  };
}

export function getContextIdentifiers(
  context
) {
  return {
    tenantId:
      context?.identifiers?.tenantId ||
      null,

    hospitalId:
      context?.identifiers?.hospitalId ||
      null,

    departmentId:
      context?.identifiers?.departmentId ||
      null,

    unitId:
      context?.identifiers?.unitId ||
      null,

    countryCode:
      context?.identifiers?.countryCode ||
      null,
  };
}

export function getContextLabels(
  context
) {
  return {
    tenant:
      context?.labels?.tenant ||
      null,

    hospital:
      context?.labels?.hospital ||
      null,

    department:
      context?.labels?.department ||
      null,

    unit:
      context?.labels?.unit ||
      null,

    country:
      context?.labels?.country ||
      null,
  };
    }
