import { db } from "../supabase.js";
import {
  createAuthorizationContext,
} from "./authorization.js";

/**
 * Load the current user's authorization context
 * from the PRISM backend.
 *
 * Optional:
 * departmentId
 * unitId
 *
 * When both are supplied, the backend returns
 * the permissions for that exact clinical context.
 */
export async function loadAuthorizationContext(
  departmentId = null,
  unitId = null
) {
  const { data, error } = await db.rpc(
    "prism_get_my_authorization_context",
    {
      p_department_id: departmentId,
      p_unit_id: unitId,
    }
  );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to load authorization context."
    );
  }

  return createAuthorizationContext(data);
}

/**
 * Load the user's default/current authorization context.
 */
export async function getAuthorizationContext() {
  return loadAuthorizationContext();
}

/**
 * Return all department/unit assignments
 * available to the current user.
 */
export function getContextAssignments(context) {
  return Array.isArray(context?.assignments)
    ? context.assignments
    : [];
}

/**
 * Find a specific assignment.
 */
export function findAssignment(
  context,
  departmentId,
  unitId
) {
  return (
    getContextAssignments(context).find(
      (assignment) =>
        assignment.department_id === departmentId &&
        assignment.unit_id === unitId
    ) || null
  );
}

/**
 * Switch the active clinical context.
 *
 * Example:
 *
 * Cardiology → CCU
 *
 * or:
 *
 * Private ICU → Private ICU
 *
 * The backend recalculates the effective permissions
 * for the selected department + unit.
 */
export async function switchClinicalContext(
  departmentId,
  unitId
) {
  if (!departmentId || !unitId) {
    throw new Error(
      "Department and unit are required to switch context."
    );
  }

  return loadAuthorizationContext(
    departmentId,
    unitId
  );
}
