import {
  inviteTechnicianRecord,
  listTechnicianProfileRecords,
} from "@pest-patrol/api-client";
import type {
  TechnicianInviteInput,
  TechnicianProfile,
} from "@pest-patrol/types";

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeEmail(value: string) {
  const email = requireNonEmpty(value, "Technician email").toLowerCase();

  if (!email.includes("@")) {
    throw new Error("Technician email must be valid");
  }

  return email;
}

export function normalizeTechnicianInviteInput(
  input: TechnicianInviteInput,
): TechnicianInviteInput {
  return {
    email: normalizeEmail(input.email),
    display_name: normalizeOptional(input.display_name),
  };
}

export function validateTechnicianInviteInput(input: TechnicianInviteInput) {
  return normalizeTechnicianInviteInput(input);
}

export function getTechnicianLabel(technician: Pick<
  TechnicianProfile,
  "display_name" | "email" | "id"
>) {
  return (
    technician.display_name ||
    technician.email ||
    `Technician ${technician.id.slice(0, 8)}`
  );
}

export async function listTechnicianDirectory() {
  return listTechnicianProfileRecords();
}

export async function inviteTechnician(input: TechnicianInviteInput) {
  return inviteTechnicianRecord(validateTechnicianInviteInput(input));
}
