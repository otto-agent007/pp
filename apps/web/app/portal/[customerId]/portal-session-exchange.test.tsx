import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalSessionExchange } from "./portal-session-exchange";

describe("PortalSessionExchange", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let replaceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    replaceMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace: replaceMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the grant and follows the returned redirect on success", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ redirectTo: "/portal/customer-1" }), {
        status: 200,
      }),
    );

    render(
      <PortalSessionExchange customerId="customer-1" grant="raw-token" />,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/portal/customer-1");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/customer-1/sessions",
      expect.objectContaining({
        body: JSON.stringify({ grant: "raw-token" }),
        method: "POST",
      }),
    );
  });

  it("shows an error message when the grant is rejected", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "This portal link is invalid or expired." }),
        { status: 403 },
      ),
    );

    render(
      <PortalSessionExchange customerId="customer-1" grant="stale-token" />,
    );

    expect(
      await screen.findByText("This portal link is invalid or expired."),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // The grant is one-time and the route claims it with a conditional UPDATE, so
  // the second POST of the same grant is always rejected. Under StrictMode the
  // effect runs, cleans up and runs again on the same instance, and the
  // `cancelled` flag only suppresses the state update -- the first request has
  // already left. That made every portal link fail in `next dev`.
  it("claims the grant exactly once even when the effect runs twice", async () => {
    // A Response body reads once, so a shared instance would make the second
    // call fail for the wrong reason. Each call gets its own, which means only
    // the call count can fail this test.
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ redirectTo: "/portal/customer-1" }), {
          status: 200,
        }),
      ),
    );

    render(
      <StrictMode>
        <PortalSessionExchange customerId="customer-1" grant="raw-token" />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/portal/customer-1");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // activeRef is reset on every run so a StrictMode remount does not discard
  // the one claim in flight -- but a real unmount still has to stop it, or the
  // component navigates a page the visitor has already left.
  it("does not navigate after a real unmount", async () => {
    let settle: (value: Response) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          settle = resolve;
        }),
    );

    const { unmount } = render(
      <PortalSessionExchange customerId="customer-1" grant="raw-token" />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    unmount();
    settle(
      new Response(JSON.stringify({ redirectTo: "/portal/customer-1" }), {
        status: 200,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("claims a genuinely different grant on the same mount", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ redirectTo: "/portal/customer-1" }), {
          status: 200,
        }),
      ),
    );

    const { rerender } = render(
      <PortalSessionExchange customerId="customer-1" grant="first-token" />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(
      <PortalSessionExchange customerId="customer-1" grant="second-token" />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({ grant: "second-token" }),
      }),
    );
  });
});
