import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDemoSeedStatusRecord,
  runDemoSeedActionRecord,
} from "@pest-patrol/api-client";

import { useDemoSeedStatus, useRunDemoSeedAction } from "./useDemoSeed";

vi.mock("@pest-patrol/api-client", () => ({
  getDemoSeedStatusRecord: vi.fn(),
  prepareLocalDemoLoginRecord: vi.fn(),
  runDemoSeedActionRecord: vi.fn(),
}));

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

describe("useDemoSeed local fixture mode", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.mocked(getDemoSeedStatusRecord).mockRejectedValue(
      new Error("Authentication is required"),
    );
    vi.mocked(runDemoSeedActionRecord).mockRejectedValue(
      new Error("Authentication is required"),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("reports fixture demo status without calling the authenticated seed route", () => {
    const { result } = renderHook(() => useDemoSeedStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data?.status).toMatchObject({
      available: true,
      environment_label: "Local fixture demo",
      reason: null,
      target: "local",
    });
    expect(result.current.data?.summary.media_items).toBe(3);
    expect(result.current.error).toBeNull();
    expect(getDemoSeedStatusRecord).not.toHaveBeenCalled();
  });

  it("treats fixture seed/reset actions as local no-ops without auth", async () => {
    const { result } = renderHook(() => useRunDemoSeedAction(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      action: "seed",
      confirm: "seed-demo-data",
      target: "local",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      action: "seed",
      status: {
        available: true,
        environment_label: "Local fixture demo",
        reason: null,
        target: "local",
      },
      summary: {
        media_items: 3,
      },
    });
    expect(runDemoSeedActionRecord).not.toHaveBeenCalled();
  });
});
