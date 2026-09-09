import { describe, expect, it, vi } from "vitest";

import { MutationFailure } from "@pest-patrol/application";

import { classifySupabaseFailure, withMutationFailure } from "./mutationFailures";

/**
 * Where provider knowledge is allowed to live.
 *
 * The durable queue used to decide what a failure meant by looking at the
 * message string an adapter rethrew, which made a PostgREST code part of
 * `packages/sync`'s behaviour. These tests pin the translation on this side of
 * the port: a Supabase answer in, a provider-independent reason out.
 */
describe("classifying a Supabase failure", () => {
  it("reads the SQLSTATE the database reports", () => {
    expect(classifySupabaseFailure({ code: "42501" })).toBe("unauthorized");
    expect(classifySupabaseFailure({ code: "23503" })).toBe("target-missing");
    expect(classifySupabaseFailure({ code: "23505" })).toBe(
      "precondition-conflict",
    );
    expect(classifySupabaseFailure({ code: "23514" })).toBe("invalid-intent");
    expect(classifySupabaseFailure({ code: "22P02" })).toBe("invalid-intent");
    expect(classifySupabaseFailure({ code: "23502" })).toBe("invalid-intent");
  });

  it("reads the application codes the technician RPCs raise", () => {
    expect(classifySupabaseFailure({ code: "PP400" })).toBe("invalid-intent");
    expect(classifySupabaseFailure({ code: "PP401" })).toBe("unauthorized");
    expect(classifySupabaseFailure({ code: "PP404" })).toBe("target-missing");
    expect(classifySupabaseFailure({ code: "PP409" })).toBe(
      "precondition-conflict",
    );
  });

  it("does not depend on the wording once a code is present", () => {
    // The point of CR20. Change the message to anything at all and the reason
    // has to hold, because the code decided it. If this test can be broken by
    // editing prose, the codes are not being read.
    for (const message of [
      "Assigned job status transition is not allowed",
      "Se rechaza la transicion",
      "wibble",
      "",
    ]) {
      expect(classifySupabaseFailure({ code: "PP409", message })).toBe(
        "precondition-conflict",
      );
    }
  });

  it("prefers the code over the message when both could match", () => {
    // A message that the compatibility matcher would read as unauthorized,
    // carrying a code that says otherwise. The code wins.
    expect(
      classifySupabaseFailure({
        code: "PP409",
        message: "Assigned job geofence event is not allowed",
      }),
    ).toBe("precondition-conflict");
  });

  it("still reads a database that has not applied the codes migration", () => {
    // The skew this compatibility path exists for: this app against a database
    // still raising bare P0001. Every message the two technician RPCs raise has
    // to land somewhere better than the default.
    const reasons = [
      ["Assigned job status transition is not allowed", "precondition-conflict"],
      ["Authentication is required", "unauthorized"],
      ["Job status is not available to technicians", "invalid-intent"],
      ["Previous job status is required", "invalid-intent"],
      ["Assigned job was not found", "target-missing"],
      ["Assigned job geofence event is not allowed", "unauthorized"],
      ["Geofence event type is invalid", "invalid-intent"],
      ["Geofence coordinates are invalid", "invalid-intent"],
      ["Geofence accuracy is invalid", "invalid-intent"],
      ["Geofence capture time is outside the allowed window", "invalid-intent"],
    ] as const;

    for (const [message, reason] of reasons) {
      expect(classifySupabaseFailure({ code: "P0001", message }), message).toBe(
        reason,
      );
    }
  });

  it("reads PostgREST's own codes", () => {
    expect(classifySupabaseFailure({ code: "PGRST116" })).toBe("target-missing");
    expect(classifySupabaseFailure({ code: "PGRST301" })).toBe("unauthorized");
  });

  it("separates a lost race from a bad intent among the raised exceptions", () => {
    // update_assigned_job_status enforces its precondition with a bare
    // `raise exception`, so every one of these arrives as P0001 carrying only
    // the message. The precondition failure is the one that matters most: the
    // technician's device lost a race, and a person has to decide.
    expect(
      classifySupabaseFailure({
        code: "P0001",
        message: "Assigned job status transition is not allowed",
      }),
    ).toBe("precondition-conflict");
    expect(
      classifySupabaseFailure({
        code: "P0001",
        message: "Authentication is required",
      }),
    ).toBe("unauthorized");
    expect(
      classifySupabaseFailure({
        code: "P0001",
        message: "Job status is not available to technicians",
      }),
    ).toBe("invalid-intent");
    // A raised exception this map has not seen is still the database refusing
    // the intent, not the provider being unreachable.
    expect(
      classifySupabaseFailure({ code: "P0001", message: "Something else" }),
    ).toBe("invalid-intent");
  });

  it("reads an HTTP status where there is no database code", () => {
    expect(classifySupabaseFailure({ status: 401 })).toBe("unauthorized");
    expect(classifySupabaseFailure({ status: 404 })).toBe("target-missing");
    expect(classifySupabaseFailure({ status: 409 })).toBe(
      "precondition-conflict",
    );
    expect(classifySupabaseFailure({ status: 429 })).toBe("rate-limited");
  });

  it("treats an abandoned request as ambiguous rather than failed", () => {
    // The request was accepted and then abandoned, so the write may have
    // applied. Calling it a plain failure is what turns one logical write into
    // two on the replay.
    expect(classifySupabaseFailure({ status: 504 })).toBe("ambiguous-response");
    expect(classifySupabaseFailure(new Error("The operation timed out"))).toBe(
      "ambiguous-response",
    );
    expect(classifySupabaseFailure(new Error("The request was aborted"))).toBe(
      "ambiguous-response",
    );
  });

  it("recognises the device having no network at all", () => {
    expect(classifySupabaseFailure(new TypeError("Failed to fetch"))).toBe(
      "network-unavailable",
    );
    expect(classifySupabaseFailure(new Error("Network request failed"))).toBe(
      "network-unavailable",
    );
  });

  it("leaves anything it has not been taught retryable", () => {
    // An unmapped failure means this function does not know the case, not that
    // the write can never apply. Guessing terminal here would discard field
    // work the technician cannot recapture.
    expect(classifySupabaseFailure(new Error("Who knows"))).toBe(
      "provider-unavailable",
    );
    expect(classifySupabaseFailure(undefined)).toBe("provider-unavailable");
    expect(classifySupabaseFailure({ code: 500 })).toBe("provider-unavailable");
  });
});

describe("wrapping a provider call", () => {
  it("returns the value when the call succeeds", async () => {
    await expect(withMutationFailure(async () => "ok")).resolves.toBe("ok");
  });

  it("rethrows a rejection as an interpreted failure that keeps its cause", async () => {
    const provider = { code: "23505", message: "duplicate key value" };

    const thrown = await withMutationFailure(() =>
      Promise.reject(provider),
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(MutationFailure);
    expect((thrown as MutationFailure).reason).toBe("precondition-conflict");
    expect((thrown as MutationFailure).message).toBe("duplicate key value");
    expect((thrown as MutationFailure).cause).toBe(provider);
  });

  it("passes an already-interpreted failure through unchanged", async () => {
    const already = new MutationFailure("rate-limited", "Slow down");

    const thrown = await withMutationFailure(() =>
      Promise.reject(already),
    ).catch((error: unknown) => error);

    expect(thrown).toBe(already);
  });

  it("does not call the provider more than once", async () => {
    const call = vi.fn().mockResolvedValue("ok");

    await withMutationFailure(call);

    expect(call).toHaveBeenCalledTimes(1);
  });
});
