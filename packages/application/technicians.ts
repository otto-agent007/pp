import {
  inviteTechnicianRecord,
  listTechnicianProfileRecords,
} from "@pest-patrol/api-client";
import type { TechnicianInviteInput } from "@pest-patrol/types";
import { validateTechnicianInviteInput } from "@pest-patrol/domain";

export async function listTechnicianDirectory() {
  return listTechnicianProfileRecords();
}

export async function inviteTechnician(input: TechnicianInviteInput) {
  return inviteTechnicianRecord(validateTechnicianInviteInput(input));
}
