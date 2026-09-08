import type { TechniciansPort } from "./ports";
import type { TechnicianInviteInput } from "@pest-patrol/types";
import { validateTechnicianInviteInput } from "@pest-patrol/domain";

export async function listTechnicianDirectory(port: TechniciansPort) {
  return port.listTechnicianProfileRecords();
}

export async function inviteTechnician(
  port: TechniciansPort,
  input: TechnicianInviteInput,
) {
  return port.inviteTechnicianRecord(validateTechnicianInviteInput(input));
}
