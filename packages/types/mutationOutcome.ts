/**
 * Provider-independent vocabulary for how a durable mutation ended.
 *
 * These two unions live here rather than in `packages/application`, which owns
 * the semantics, because `OfflineQueueItem` records the resolved outcome and
 * `packages/types` may depend on nothing. The policy that maps one to the other,
 * and the retry budget applied on the way, stay in `packages/application`.
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
