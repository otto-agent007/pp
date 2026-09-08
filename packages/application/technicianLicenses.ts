import type { TechnicianLicensesPort } from "./ports";
import type { TechnicianLicenseInput } from "@pest-patrol/types";
import { validateTechnicianLicenseInput } from "@pest-patrol/domain";

export function listTechnicianLicenses(
  port: TechnicianLicensesPort,
  technicianId?: string,
) {
  return port.listTechnicianLicenseRecords(technicianId);
}

export function createTechnicianLicense(
  port: TechnicianLicensesPort,
  input: TechnicianLicenseInput,
) {
  return port.createTechnicianLicenseRecord(
    validateTechnicianLicenseInput(input),
  );
}

export function updateTechnicianLicense(
  port: TechnicianLicensesPort,
  id: string,
  input: TechnicianLicenseInput,
) {
  return port.updateTechnicianLicenseRecord(
    id,
    validateTechnicianLicenseInput(input),
  );
}

export function archiveTechnicianLicense(
  port: TechnicianLicensesPort,
  id: string,
) {
  return port.archiveTechnicianLicenseRecord(id);
}
