import {
  archiveTechnicianLicenseRecord,
  createTechnicianLicenseRecord,
  listTechnicianLicenseRecords,
  updateTechnicianLicenseRecord,
} from "@pest-patrol/api-client";
import type { TechnicianLicenseInput } from "@pest-patrol/types";
import { validateTechnicianLicenseInput } from "@pest-patrol/domain";

export function listTechnicianLicenses(technicianId?: string) {
  return listTechnicianLicenseRecords(technicianId);
}

export function createTechnicianLicense(input: TechnicianLicenseInput) {
  return createTechnicianLicenseRecord(validateTechnicianLicenseInput(input));
}

export function updateTechnicianLicense(
  id: string,
  input: TechnicianLicenseInput,
) {
  return updateTechnicianLicenseRecord(
    id,
    validateTechnicianLicenseInput(input),
  );
}

export function archiveTechnicianLicense(id: string) {
  return archiveTechnicianLicenseRecord(id);
}
