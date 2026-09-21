import { loadTenantContext } from "./tenantContext.js";
import {
  getOrganization,
  getOrganizationId,
  getOrganizationName,
} from "./organizationContext.js";
import {
  getCountry,
  getCountryId,
  getCountryCode,
  getCountryName,
} from "./countryContext.js";
import {
  getHospital,
  getHospitalId,
  getHospitalName,
  getHospitalCode,
} from "./hospitalContext.js";
import {
  getCampus,
  getCampusId,
  getCampusName,
  getCampusCode,
} from "./campusContext.js";

export async function loadPRISMContext(
  departmentId = null,
  unitId = null
) {
  const context = await loadTenantContext(
    departmentId,
    unitId
  );

  return {
    ...context,

    organization: getOrganization(context),
    country: getCountry(context),
    hospital: getHospital(context),
    campus: getCampus(context),

    identifiers: {
      organizationId:
        getOrganizationId(context),

      countryId:
        getCountryId(context),

      countryCode:
        getCountryCode(context),

      hospitalId:
        getHospitalId(context),

      hospitalCode:
        getHospitalCode(context),

      campusId:
        getCampusId(context),
    },

    labels: {
      organization:
        getOrganizationName(context),

      country:
        getCountryName(context),

      hospital:
        getHospitalName(context),

      campus:
        getCampusName(context),
    },
  };
}

export function getPRISMContext(context) {
  return context || null;
      }
