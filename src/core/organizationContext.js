/**
 * Organization context helpers.
 *
 * An organization may own or operate
 * multiple hospitals, campuses, or facilities.
 *
 * This layer intentionally does not assume
 * that one organization equals one hospital
 * or one country.
 */

export function getOrganization(context) {
  return (
    context?.organization ||
    context?.authorization?.context
      ?.organization ||
    null
  );
}

export function getOrganizationId(context) {
  return (
    getOrganization(context)?.id ||
    null
  );
}

export function getOrganizationName(context) {
  return (
    getOrganization(context)?.name ||
    null
  );
}

export function getOrganizationHospitals(
  context
) {
  const organization =
    getOrganization(context);

  if (
    !Array.isArray(
      organization?.hospitals
    )
  ) {
    return [];
  }

  return organization.hospitals;
}

export function getOrganizationCountries(
  context
) {
  const hospitals =
    getOrganizationHospitals(context);

  const countries = new Map();

  for (const hospital of hospitals) {
    const country =
      hospital?.country;

    if (!country?.id) {
      continue;
    }

    if (!countries.has(country.id)) {
      countries.set(country.id, country);
    }
  }

  return Array.from(
    countries.values()
  );
}

export function hasMultipleHospitals(
  context
) {
  return (
    getOrganizationHospitals(context)
      .length > 1
  );
}

export function hasMultipleCountries(
  context
) {
  return (
    getOrganizationCountries(context)
      .length > 1
  );
}
