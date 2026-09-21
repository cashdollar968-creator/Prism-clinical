/**
 * Country context helpers.
 *
 * Country is treated as a deployment / regulatory /
 * localization context, not as a tenant.
 */

export function getCountry(context) {
  return (
    context?.country ||
    context?.hospital?.country ||
    context?.authorization?.context?.country ||
    context?.authorization?.context?.hospital?.country ||
    null
  );
}

export function getCountryId(context) {
  return getCountry(context)?.id || null;
}

export function getCountryCode(context) {
  return getCountry(context)?.code || null;
}

export function getCountryName(context) {
  return getCountry(context)?.name || null;
}

export function getCountryConfiguration(context) {
  return (
    getCountry(context)?.configuration ||
    {}
  );
}

export function getCountryRegulatoryProfile(context) {
  return (
    getCountry(context)?.regulatory_profile ||
    null
  );
}

export function getCountryLocalization(context) {
  return (
    getCountry(context)?.localization ||
    {}
  );
}
