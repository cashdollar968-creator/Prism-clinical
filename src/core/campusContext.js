/**
 * Campus context helpers.
 *
 * A hospital may operate one or multiple campuses.
 * Campus is kept separate from hospital so the
 * architecture can support large health systems.
 */

export function getCampus(context) {
  return (
    context?.campus ||
    context?.hospital?.campus ||
    context?.authorization?.context?.campus ||
    context?.authorization?.context?.hospital?.campus ||
    null
  );
}

export function getCampusId(context) {
  return getCampus(context)?.id || null;
}

export function getCampusName(context) {
  return getCampus(context)?.name || null;
}

export function getCampusCode(context) {
  return getCampus(context)?.code || null;
}

export function getCampusType(context) {
  return getCampus(context)?.type || null;
}

export function getCampusDepartments(context) {
  const campus = getCampus(context);

  if (!Array.isArray(campus?.departments)) {
    return [];
  }

  return campus.departments;
}

export function hasMultipleDepartments(context) {
  return (
    getCampusDepartments(context).length > 1
  );
}
