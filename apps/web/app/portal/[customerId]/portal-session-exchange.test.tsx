import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
});
