/**
 * Hospital context helpers.
 *
 * A hospital belongs to an organization,
 * but an organization may contain multiple hospitals.
 */

export function getHospital(context) {
  return (
    context?.hospital ||
    context?.authorization?.context
      ?.hospital ||
    null
  );
}

export function getHospitalId(context) {
  return getHospital(context)?.id || null;
}

export function getHospitalName(context) {
  return getHospital(context)?.name || null;
}

export function getHospitalCode(context) {
  return getHospital(context)?.code || null;
}

export function getHospitalCountry(context) {
  return (
    getHospital(context)?.country ||
    null
  );
}

export function getHospitalCampuses(context) {
  const hospital = getHospital(context);

  if (!Array.isArray(hospital?.campuses)) {
    return [];
  }

  return hospital.campuses;
}

export function getHospitalDepartments(context) {
  const hospital = getHospital(context);

  if (!Array.isArray(hospital?.departments)) {
    return [];
  }

  return hospital.departments;
}

export function hasMultipleCampuses(context) {
  return getHospitalCampuses(context).length > 1;
}

export function hasMultipleDepartments(context) {
  return getHospitalDepartments(context).length > 1;
}
