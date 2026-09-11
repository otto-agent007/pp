import type { AuthPort, AuthRecord } from "./ports";
import {
  LoginInput,
  PasswordRecoverySessionInput,
  PasswordResetRequestInput,
  PasswordUpdateInput,
  TechnicianLoginInput,
  validateAdminAccess,
  validateAdminLoginInput,
  validatePasswordRecoverySessionInput,
  validatePasswordResetRequestInput,
  validatePasswordUpdateInput,
  validateTechnicianLoginInput,
} from "@pest-patrol/domain";

export function validateTechnicianAccess<TSession>(
  record: AuthRecord<TSession> | null,
) {
  if (!record) {
    return null;
  }

  if (record.profile.role !== "technician") {
    throw new Error("Technician access is required");
  }

  return record;
}

export async function getCurrentTechnicianAuth<TSession>(
  port: AuthPort<TSession>,
) {
  return validateTechnicianAccess(await port.getCurrentAuthRecord());
}

export async function getCurrentAdminAuth<TSession>(port: AuthPort<TSession>) {
  return validateAdminAccess(await port.getCurrentAuthRecord());
}

export async function signInTechnician<TSession>(
  port: AuthPort<TSession>,
  input: TechnicianLoginInput,
) {
  const normalized = validateTechnicianLoginInput(input);
  const record = await port.signInWithPasswordRecord(
    normalized.email,
    normalized.password,
  );

  try {
    return validateTechnicianAccess(record);
  } catch (error) {
    // Local scope: the credentials were valid, only the audience was wrong.
    // A global sign-out here would end this person's sessions everywhere,
    // so an admin typing their password into the technician form would knock
    // themselves out of every other device.
    await port.signOutRecord("local");
    throw error;
  }
}

export async function signInAdmin<TSession>(
  port: AuthPort<TSession>,
  input: LoginInput,
) {
  const normalized = validateAdminLoginInput(input);
  const record = await port.signInWithPasswordRecord(
    normalized.email,
    normalized.password,
  );

  try {
    return validateAdminAccess(record);
  } catch (error) {
    // Local scope, for the reason given in signInTechnician: a technician who
    // types their password into the admin form must not be signed out of the
    // mobile app they are running their route on.
    await port.signOutRecord("local");
    throw error;
  }
}

export async function signOutTechnician<TSession>(port: AuthPort<TSession>) {
  await port.signOutRecord();
}

export async function signOutAdmin<TSession>(port: AuthPort<TSession>) {
  await port.signOutRecord();
}

export async function requestPasswordReset<TSession>(
  port: AuthPort<TSession>,
  input: PasswordResetRequestInput,
) {
  const normalized = validatePasswordResetRequestInput(input);

  await port.resetPasswordForEmailRecord(
    normalized.email,
    normalized.redirectTo,
  );
}

/**
 * Narrows a recovery session to the audience the page it landed on serves.
 *
 * `validateAdminAccess` for the admin reset page, `validateTechnicianAccess`
 * for the technician invite page.
 */
export type AuthRecordValidator<TSession> = (
  record: AuthRecord<TSession> | null,
) => AuthRecord<TSession> | null;

/**
 * Establishes the session a recovery or invite link carries, and refuses it
 * unless it belongs to someone this page is for.
 *
 * The link's fragment carries a complete access/refresh token pair, and the
 * page previously checked only that `type` said recovery or invite and that
 * both tokens were present. So a link an attacker built from their own tokens
 * was accepted: the victim set a password onto the attacker's account and
 * carried on working inside it, entering customer data into an account the
 * attacker could sign into. Any session already open in the browser was
 * silently replaced on the way.
 *
 * Two things change that. The existing session is signed out first, so
 * establishing a link is never invisible. And the session that results has to
 * resolve to a profile with the right role for this page, which an outsider's
 * account does not have -- profile rows are written only by the service-role
 * invite routes, so an account that signed itself up has none.
 *
 * This is a mitigation, not the whole fix. It does not stop a staff member
 * phishing another staff member, because both have profiles. Closing that
 * needs the PKCE flow: `exchangeCodeForSession` in a route handler, so the
 * browser that finishes a reset has to be the browser that started it. That is
 * a coordinated change to the Supabase Auth email templates as well as this
 * code, and it invalidates every reset link already in flight, so it belongs
 * in a planned node. The caller is handed the record so the page can name the
 * account whose password is about to change.
 */
export async function establishPasswordRecoverySession<TSession>(
  port: AuthPort<TSession>,
  input: PasswordRecoverySessionInput,
  validateAccess: AuthRecordValidator<TSession>,
) {
  const normalized = validatePasswordRecoverySessionInput(input);

  // Local scope: the session being discarded belongs to whoever is signed in
  // on this browser, and may be their own session on another device.
  await port.signOutRecord("local");
  await port.setPasswordRecoverySessionRecord(
    normalized.accessToken,
    normalized.refreshToken,
  );

  try {
    const record = validateAccess(await port.getCurrentAuthRecord());

    if (!record) {
      throw new Error("This link is no longer valid. Request a new one.");
    }

    return record;
  } catch (error) {
    await port.signOutRecord("local");
    throw error;
  }
}

export async function updateCurrentUserPassword<TSession>(
  port: AuthPort<TSession>,
  input: PasswordUpdateInput,
) {
  const normalized = validatePasswordUpdateInput(input);

  await port.updatePasswordRecord(normalized.password);
}
