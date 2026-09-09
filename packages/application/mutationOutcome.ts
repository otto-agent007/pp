import type { OfflineQueueItem } from "@pest-patrol/types";

/**
 * Provider-independent semantics for the outcome of a durable mutation.
 *
 * `docs/architecture.md` makes this package the owner of conflict and
 * terminal-failure semantics, and requires that they stay provider-independent:
 * nothing here may know what a Supabase error, an HTTP status, or a Stripe
 * decline looks like. Adapters map their provider's answer onto a
 * `MutationFailureReason`; this module decides what that means for the queue,
 * for intent identity, and for the technician looking at the screen.
 *
 * The distinction that matters is not "did it fail" but "can it still succeed":
 * `packages/domain`'s queue can already mark an item `failed`, but nothing
 * decided when retrying should stop, and nothing distinguished a write that
 * lost a race from one that can never apply.
 */

/** What an adapter observed, expressed without reference to any provider. */
export type MutationFailureReason =
  /** The device could not reach the provider at all. */
  | "network-unavailable"
  /** The provider was reachable but could not serve the request. */
  | "provider-unavailable"
  /** The provider asked the caller to slow down. */
  | "rate-limited"
  /** The provider gave no usable answer; the write may or may not have applied. */
  | "ambiguous-response"
  /** Current state disagrees with the precondition the intent was built on. */
  | "precondition-conflict"
  /** The intent itself is not valid and no retry can change that. */
  | "invalid-intent"
  /** The caller may not perform this write. */
  | "unauthorized"
  /** The target of the write does not exist. */
  | "target-missing";

export type MutationOutcomeKind =
  /** The provider confirmed the write. */
  | "applied"
  /** Current state disagrees with the intent; a person has to decide. */
  | "conflict"
  /** Unknown whether the write applied; replay under the same identity. */
  | "ambiguous"
  /** Transient; the same intent can be attempted again. */
  | "retryable"
  /** No further attempt can succeed; the technician must recover it. */
  | "terminal";

export interface MutationOutcomePolicy {
  /**
   * Attempts allowed before a retryable failure is treated as terminal.
   *
   * A budget is what keeps an offline queue from retrying forever against a
   * provider that will never accept the write, which would hide the failure
   * from the technician indefinitely.
   */
  maxAttempts: number;
}

export const DEFAULT_MUTATION_OUTCOME_POLICY: MutationOutcomePolicy = {
  maxAttempts: 5,
};

export interface MutationOutcome {
  kind: MutationOutcomeKind;
  /** Whether the queue should attempt this intent again on its own. */
  retryable: boolean;
  /**
   * Whether a replay must reuse the intent's existing stable identity.
   *
   * True for every outcome that leaves the provider's state uncertain or
   * unchanged. Minting a fresh identity there is what turns one logical write
   * into two, which `docs/architecture.md` forbids.
   */
  reusesIntentIdentity: boolean;
  /** Whether the technician has to see this and act on it. */
  requiresUserRecovery: boolean;
}

const FAILURE_KINDS: Record<MutationFailureReason, MutationOutcomeKind> = {
  "network-unavailable": "retryable",
  "provider-unavailable": "retryable",
  "rate-limited": "retryable",
  "ambiguous-response": "ambiguous",
  "precondition-conflict": "conflict",
  "invalid-intent": "terminal",
  unauthorized: "terminal",
  "target-missing": "terminal",
};

/** The outcome a reason implies, before any retry budget is applied. */
export function classifyMutationFailure(
  reason: MutationFailureReason,
): MutationOutcomeKind {
  return FAILURE_KINDS[reason];
}

export function isTerminalOutcome(kind: MutationOutcomeKind) {
  return kind === "terminal" || kind === "conflict";
}

export function describeMutationOutcome(
  kind: MutationOutcomeKind,
): MutationOutcome {
  return {
    kind,
    retryable: kind === "retryable" || kind === "ambiguous",
    reusesIntentIdentity: kind !== "applied",
    requiresUserRecovery: isTerminalOutcome(kind),
  };
}

/**
 * Resolve a failed attempt into an outcome, applying the retry budget.
 *
 * `attempts` counts attempts already made including the one that just failed,
 * which is how `OfflineQueueItem.attempts` is maintained.
 */
export function resolveMutationOutcome(
  reason: MutationFailureReason,
  attempts: number,
  policy: MutationOutcomePolicy = DEFAULT_MUTATION_OUTCOME_POLICY,
): MutationOutcome {
  const kind = classifyMutationFailure(reason);

  if (isTerminalOutcome(kind)) {
    return describeMutationOutcome(kind);
  }

  // A retryable or ambiguous failure that has exhausted its budget stops being
  // retryable: it becomes terminal so the technician is shown it rather than
  // the queue hiding it behind another attempt.
  if (attempts >= policy.maxAttempts) {
    return describeMutationOutcome("terminal");
  }

  return describeMutationOutcome(kind);
}

/** Resolve the outcome for a queue item that has just failed an attempt. */
export function resolveQueueItemOutcome(
  item: Pick<OfflineQueueItem, "attempts">,
  reason: MutationFailureReason,
  policy: MutationOutcomePolicy = DEFAULT_MUTATION_OUTCOME_POLICY,
): MutationOutcome {
  return resolveMutationOutcome(reason, item.attempts, policy);
}
