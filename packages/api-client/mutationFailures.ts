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

/**
 * PostgREST surfaces the database's SQLSTATE directly.
 *
 * The `PP` codes are this application's own, raised by the technician RPCs and
 * mapping one to one onto a reason. Class `PP` is unused by PostgreSQL, whose
 * PL/pgSQL codes live in class `P0`, and is not one of the `PT` codes PostgREST
 * reinterprets as an HTTP status.
 */
const SQLSTATE_REASONS: Record<string, MutationFailureReason> = {
  // Raised by public.update_assigned_job_status and
  // public.record_assigned_job_geofence_event.
  PP400: "invalid-intent",
  PP401: "unauthorized",
  PP404: "target-missing",
  PP409: "precondition-conflict",
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
 * Messages the technician job RPCs raise, for a database without their codes.
 *
 * This is a compatibility path, not the mechanism. A migrated database raises a
 * `PP` code and never reaches here; this matches only when an app that has this
 * mapping talks to a database that has not yet applied
 * `20260909000000_technician_rpc_error_codes_v1.sql`, which is possible because
 * the two deploy independently. The reverse skew needs nothing: that migration
 * left every message byte-identical, so an app released before it still matches
 * the text.
 *
 * Its removal is not scheduled. The condition for removing it is that no client
 * older than the migration is still running, and that is not observable from
 * this repository.
 *
 * One case this cannot get right, and the reason the codes exist.
 * `record_assigned_job_geofence_event` raises `Assigned job geofence event is
 * not allowed` for two different things: the job is not assigned to this
 * technician, and the idempotent upsert matched a row belonging to someone
 * else. No matcher can tell those apart, because they are the same string. Both
 * are non-retryable and both need the technician, so the fallback picks
 * `unauthorized` and the codes separate them properly.
 */
const RAISED_MESSAGE_REASONS: [RegExp, MutationFailureReason][] = [
  [/transition is not allowed/i, "precondition-conflict"],
  [/authentication is required/i, "unauthorized"],
  [/not available to technicians/i, "invalid-intent"],
  [/previous job status is required/i, "invalid-intent"],
  [/assigned job was not found/i, "target-missing"],
  [/geofence event is not allowed/i, "unauthorized"],
  [/geofence (?:event type|coordinates|accuracy) (?:is|are) invalid/i, "invalid-intent"],
  [/capture time is outside the allowed window/i, "invalid-intent"],
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
