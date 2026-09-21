export function getAssignments(context) {
  if (!Array.isArray(context?.assignments)) {
    return [];
  }

  return context.assignments;
}

export function getDepartmentAssignments(
  context,
  departmentId
) {
  return getAssignments(context).filter(
    (assignment) =>
      assignment.department_id === departmentId
  );
}

export function getUnitAssignments(
  context,
  unitId
) {
  return getAssignments(context).filter(
    (assignment) =>
      assignment.unit_id === unitId
  );
}

export function getAssignment(
  context,
  departmentId,
  unitId,
  roleCode = null
) {
  return (
    getAssignments(context).find(
      (assignment) =>
        assignment.department_id === departmentId &&
        assignment.unit_id === unitId &&
        (!roleCode ||
          assignment.role_code === roleCode)
    ) || null
  );
}

export function hasAssignment(
  context,
  departmentId,
  unitId,
  roleCode = null
) {
  return Boolean(
    getAssignment(
      context,
      departmentId,
      unitId,
      roleCode
    )
  );
}

export function getAssignedDepartments(context) {
  const assignments =
    getAssignments(context);

  const map = new Map();

  for (const assignment of assignments) {
    if (!assignment.department_id) {
      continue;
    }

    if (!map.has(assignment.department_id)) {
      map.set(assignment.department_id, {
        id: assignment.department_id,
        name: assignment.department_name,
        assignments: [],
      });
    }

    map
      .get(assignment.department_id)
      .assignments
      .push(assignment);
  }

  return Array.from(map.values());
}

export function getAssignedUnits(
  context,
  departmentId = null
) {
  const assignments = departmentId
    ? getDepartmentAssignments(
        context,
        departmentId
      )
    : getAssignments(context);

  const map = new Map();

  for (const assignment of assignments) {
    if (!assignment.unit_id) {
      continue;
    }

    if (!map.has(assignment.unit_id)) {
      map.set(assignment.unit_id, {
        id: assignment.unit_id,
        name: assignment.unit_name,
        department_id:
          assignment.department_id,
        assignments: [],
      });
    }

    map
      .get(assignment.unit_id)
      .assignments
      .push(assignment);
  }

  return Array.from(map.values());
}

export function getRolesForUnit(
  context,
  unitId
) {
  return getUnitAssignments(
    context,
    unitId
  ).map((assignment) => ({
    id: assignment.role_id,
    code: assignment.role_code,
    name: assignment.role_name,
    assignment_id:
      assignment.assignment_id,
  }));
}

export function formatAssignment(
  assignment
) {
  if (!assignment) {
    return "";
  }

  return [
    assignment.department_name,
    assignment.unit_name,
    assignment.role_name,
  ]
    .filter(Boolean)
    .join(" → ");
    }
