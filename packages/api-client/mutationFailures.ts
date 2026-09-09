import { MutationFailure } from "@pest-patrol/application";
import type { MutationFailureReason } from "@pest-patrol/types";

/**
 * Mapping a Supabase failure onto a provider-independent reason.
 *
 * This is the only place in the workspace that is allowed to know what a
 * PostgREST code or a storage error looks like. `packages/sync` used to infer
 * meaning from whatever message string an adapter happened to rethrow, which
 * made every provider detail part of the queue's behaviour; it now receives a
 * reason and never sees the provider's answer.
 */

/** PostgREST surfaces the database's SQLSTATE directly. */
const SQLSTATE_REASONS: Record<string, MutationFailureReason> = {
  // insufficient_privilege, and the code row-level security denials carry.
  "42501": "unauthorized",
  // foreign_key_violation: the row this write points at is not there.
  "23503": "target-missing",
  // unique_violation: something equivalent already exists.
  "23505": "precondition-conflict",
  // check_violation and invalid_text_representation: the intent is malformed.
  "23514": "invalid-intent",
  "22P02": "invalid-intent",
  // not_null_violation.
  "23502": "invalid-intent",
  // PGRST116: no rows returned where exactly one was required.
  PGRST116: "target-missing",
  // PostgREST's own JWT rejections.
  PGRST301: "unauthorized",
  PGRST302: "unauthorized",
};

/**
 * Messages the technician job RPCs raise, matched here rather than in the queue.
 *
 * `update_assigned_job_status` enforces its precondition with a bare
 * `raise exception`, which reaches the client as SQLSTATE P0001 carrying only
 * the message text. So the one distinction that matters most — a transition
 * another device already made, versus an intent that was never valid — is only
 * recoverable from the message today. Matching it here keeps that fragility
 * inside the package that is allowed to know about the provider; giving those
 * RPCs distinct SQLSTATEs would remove it, and needs a database migration.
 */
const RAISED_MESSAGE_REASONS: [RegExp, MutationFailureReason][] = [
  [/transition is not allowed/i, "precondition-conflict"],
  [/authentication is required/i, "unauthorized"],
  [/not available to technicians/i, "invalid-intent"],
  [/previous job status is required/i, "invalid-intent"],
];

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const { code } = error as { code: unknown };

  return typeof code === "string" ? code : null;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "";
}

function httpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  const { status } = error as { status: unknown };

  return typeof status === "number" ? status : null;
}

/**
 * What a Supabase rejection means, expressed without reference to Supabase.
 *
 * Anything unrecognised is `provider-unavailable`, which is retryable. An
 * unmapped failure means this function has not been taught the case, not that
 * the write can never apply, and assuming otherwise would discard field work
 * the technician cannot get back.
 */
export function classifySupabaseFailure(error: unknown): MutationFailureReason {
  const code = errorCode(error);

  if (code && code in SQLSTATE_REASONS) {
    return SQLSTATE_REASONS[code] as MutationFailureReason;
  }

  if (code === "P0001") {
    const message = errorText(error);
    const matched = RAISED_MESSAGE_REASONS.find(([pattern]) =>
      pattern.test(message),
    );

    return matched ? matched[1] : "invalid-intent";
  }

  const status = httpStatus(error);

  if (status === 401 || status === 403) {
    return "unauthorized";
  }

  if (status === 404) {
    return "target-missing";
  }

  if (status === 409) {
    return "precondition-conflict";
  }

  if (status === 429) {
    return "rate-limited";
  }

  if (status === 408 || status === 504) {
    // The request was accepted and then abandoned, so the write may have
    // applied. Replaying it has to reuse the intent's identity.
    return "ambiguous-response";
  }

  const message = errorText(error);

  // "Network request failed" is what React Native's fetch throws, which is the
  // form the mobile app actually sees when the device drops off the network.
  if (
    /failed to fetch|network ?error|network request failed|networkrequestfailed/i.test(
      message,
    )
  ) {
    return "network-unavailable";
  }

  if (/aborted|timed? ?out/i.test(message)) {
    return "ambiguous-response";
  }

  return "provider-unavailable";
}

/**
 * Run a provider call, rethrowing its failure as one the queue can act on.
 *
 * A `MutationFailure` that reaches here is already interpreted and passes
 * through unchanged, so wrapping twice is harmless.
 */
export async function withMutationFailure<TResult>(
  call: () => Promise<TResult>,
): Promise<TResult> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof MutationFailure) {
      throw error;
    }

    throw new MutationFailure(
      classifySupabaseFailure(error),
      errorText(error) || "Unable to complete the write",
      { cause: error },
    );
  }
}
