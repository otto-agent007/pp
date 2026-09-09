import type {
  MutationFailureReason,
  MutationOutcomeKind,
  OfflineQueueItem,
} from "@pest-patrol/types";

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

/**
 * `MutationFailureReason` and `MutationOutcomeKind` are declared in
 * `packages/types`, because `OfflineQueueItem` records the resolved outcome and
 * that package may depend on nothing. They are re-exported here so this module
 * stays the single place a caller reads mutation-outcome semantics from.
 */
export type { MutationFailureReason, MutationOutcomeKind };

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

/**
 * A provider failure an adapter has already interpreted.
 *
 * The queue used to infer what a failure meant from the error message an
 * adapter happened to rethrow, which made every provider-specific string part
 * of `packages/sync`'s behaviour. Adapters now map their provider's answer onto
 * a `MutationFailureReason` and throw this instead, so the reason crosses the
 * port without the port's seven signatures changing.
 */
export class MutationFailure extends Error {
  readonly reason: MutationFailureReason;

  constructor(
    reason: MutationFailureReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "MutationFailure";
    this.reason = reason;
  }
}

export function isMutationFailure(error: unknown): error is MutationFailure {
  return error instanceof MutationFailure;
}

/**
 * The reason a thrown value carries, or the reason to assume when it carries
 * none.
 *
 * An unmapped error means an adapter did not interpret its provider, not that
 * the write can never apply. Assuming `provider-unavailable` keeps such a
 * failure retryable, which is how the queue behaved before any of this existed;
 * assuming a terminal reason would silently turn an adapter's omission into
 * lost field work.
 */
export function mutationFailureReason(error: unknown): MutationFailureReason {
  return isMutationFailure(error) ? error.reason : "provider-unavailable";
}
