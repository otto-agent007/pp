import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDemoWorkflowFixtures } from "@pest-patrol/domain";

import {
  useCustomerPortalBilling,
  useCustomerPortalCloseouts,
} from "./useCustomerPortal";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function riveraCustomerId() {
  const fixtures = buildDemoWorkflowFixtures();
  const customer = fixtures.customers.find(
    (item) => item.name === "Demo - Rivera Cafe",
  );

  if (!customer) {
    throw new Error("Demo - Rivera Cafe fixture customer is missing");
  }

  return customer.id;
}

describe("useCustomerPortal local fixture mode", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns customer-safe closeouts and proof media from local fixtures", () => {
    const { result } = renderHook(
      () => useCustomerPortalCloseouts(riveraCustomerId(), "portal-token"),
      { wrapper: createWrapper() },
    );

    const riveraCloseout = result.current.closeouts.find(
      (closeout) => closeout.job.customer?.name === "Demo - Rivera Cafe",
    );

    expect(result.current.error).toBeNull();
    expect(riveraCloseout?.photos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signed_url: "/demo-media/demo-rivera-cafe-dry-storage.svg",
        }),
        expect.objectContaining({
          signed_url: "/demo-media/demo-rivera-cafe-rear-entry.svg",
        }),
      ]),
    );
    expect(riveraCloseout?.signatures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signed_url: "/demo-media/demo-rivera-cafe-signature.svg",
        }),
      ]),
    );
  });

  it("returns customer-safe billing from local fixtures", () => {
    const { result } = renderHook(
      () => useCustomerPortalBilling(riveraCustomerId(), "portal-token"),
      { wrapper: createWrapper() },
    );

    expect(result.current.error).toBeNull();
    expect(result.current.invoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          job: expect.objectContaining({
            customer: expect.objectContaining({ name: "Demo - Rivera Cafe" }),
          }),
          line_items: expect.any(Array),
        }),
      ]),
    );
  });
});
