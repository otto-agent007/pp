import { describe, expect, it } from "vitest";

import {
  DEFAULT_MUTATION_OUTCOME_POLICY,
  type MutationFailureReason,
  classifyMutationFailure,
  describeMutationOutcome,
  isTerminalOutcome,
  resolveMutationOutcome,
  resolveQueueItemOutcome,
} from "./mutationOutcome";

const RETRYABLE: MutationFailureReason[] = [
  "network-unavailable",
  "provider-unavailable",
  "rate-limited",
];

const TERMINAL: MutationFailureReason[] = [
  "invalid-intent",
  "unauthorized",
  "target-missing",
];

describe("mutation outcome policy", () => {
  it("treats unreachable and throttled providers as retryable", () => {
    for (const reason of RETRYABLE) {
      expect(classifyMutationFailure(reason), reason).toBe("retryable");
    }
  });

  it("treats intents that can never apply as terminal", () => {
    for (const reason of TERMINAL) {
      expect(classifyMutationFailure(reason), reason).toBe("terminal");
    }
  });

  it("separates a lost race from a failure", () => {
    expect(classifyMutationFailure("precondition-conflict")).toBe("conflict");
    expect(classifyMutationFailure("ambiguous-response")).toBe("ambiguous");
  });

  it("requires user recovery exactly for terminal outcomes and conflicts", () => {
    expect(describeMutationOutcome("terminal").requiresUserRecovery).toBe(true);
    expect(describeMutationOutcome("conflict").requiresUserRecovery).toBe(true);
    expect(describeMutationOutcome("retryable").requiresUserRecovery).toBe(false);
    expect(describeMutationOutcome("ambiguous").requiresUserRecovery).toBe(false);
    expect(describeMutationOutcome("applied").requiresUserRecovery).toBe(false);
    expect(isTerminalOutcome("conflict")).toBe(true);
    expect(isTerminalOutcome("ambiguous")).toBe(false);
  });

  it("reuses the stable intent identity for every replay", () => {
    // This is the rule that keeps one logical write from becoming two: any
    // outcome that leaves provider state uncertain or unchanged must replay
    // under the identity the intent already has.
    for (const kind of ["conflict", "ambiguous", "retryable", "terminal"] as const) {
      expect(describeMutationOutcome(kind).reusesIntentIdentity, kind).toBe(true);
    }

    expect(describeMutationOutcome("applied").reusesIntentIdentity).toBe(false);
  });

  it("keeps an ambiguous response retryable rather than terminal", () => {
    // An ambiguous response may have applied. Treating it as terminal would
    // surface a failure for a write that actually succeeded.
    const outcome = resolveMutationOutcome("ambiguous-response", 1);

    expect(outcome.kind).toBe("ambiguous");
    expect(outcome.retryable).toBe(true);
    expect(outcome.reusesIntentIdentity).toBe(true);
  });

  it("turns a retryable failure terminal once the budget is spent", () => {
    const { maxAttempts } = DEFAULT_MUTATION_OUTCOME_POLICY;

    expect(resolveMutationOutcome("network-unavailable", maxAttempts - 1).kind).toBe(
      "retryable",
    );
    expect(resolveMutationOutcome("network-unavailable", maxAttempts).kind).toBe(
      "terminal",
    );
    expect(
      resolveMutationOutcome("network-unavailable", maxAttempts)
        .requiresUserRecovery,
    ).toBe(true);
  });

  it("spends the budget on ambiguous responses too", () => {
    expect(resolveMutationOutcome("ambiguous-response", 99).kind).toBe("terminal");
  });

  it("never lets the budget rescue an already-terminal reason", () => {
    for (const reason of [...TERMINAL, "precondition-conflict" as const]) {
      expect(resolveMutationOutcome(reason, 0).retryable, reason).toBe(false);
    }
  });

  it("honours a caller-supplied budget", () => {
    const policy = { maxAttempts: 2 };

    expect(resolveMutationOutcome("rate-limited", 1, policy).kind).toBe("retryable");
    expect(resolveMutationOutcome("rate-limited", 2, policy).kind).toBe("terminal");
  });

  it("resolves the outcome for a queue item from its attempt count", () => {
    expect(resolveQueueItemOutcome({ attempts: 1 }, "provider-unavailable").kind).toBe(
      "retryable",
    );
    expect(
      resolveQueueItemOutcome(
        { attempts: DEFAULT_MUTATION_OUTCOME_POLICY.maxAttempts },
        "provider-unavailable",
      ).kind,
    ).toBe("terminal");
  });
});
