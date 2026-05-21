import { describe, expect, it, vi } from "vitest";
import { buildDemoSeedPlan } from "@pest-patrol/domain";

import {
  getDemoSeedStatusRecord,
  prepareLocalDemoLoginRecord,
  replaceDemoSeedRecords,
  resetDemoSeedRecords,
  runDemoSeedActionRecord,
  seedDemoRecords,
  validateDemoSeedExecution,
  type DemoSeedSupabaseClient,
} from "./demoSeed";

class MockQuery {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: unknown = { data: [], error: null }) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  upsert(...args: unknown[]) {
    this.calls.push(["upsert", args]);
    return this;
  }

  delete(...args: unknown[]) {
    this.calls.push(["delete", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  in(...args: unknown[]) {
    this.calls.push(["in", args]);
    return this;
  }

  like(...args: unknown[]) {
    this.calls.push(["like", args]);
    return this;
  }

  ilike(...args: unknown[]) {
    this.calls.push(["ilike", args]);
    return this;
  }

  or(...args: unknown[]) {
    this.calls.push(["or", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(
    resolve: (value: unknown) => unknown,
    reject: (error: unknown) => unknown,
  ) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function createMockClient() {
  const calls: string[] = [];
  const queries: MockQuery[] = [];
  const users = new Map<string, { id: string; email: string }>();

  const client = {
    auth: {
      admin: {
        createUser: vi.fn(async ({ email }: { email: string }) => {
          calls.push(`auth.createUser:${email}`);
          const user = { id: `user-${users.size + 1}`, email };
          users.set(email, user);
          return { data: { user }, error: null };
        }),
        deleteUser: vi.fn(async (id: string) => {
          calls.push(`auth.deleteUser:${id}`);
          return { data: { user: null }, error: null };
        }),
        listUsers: vi.fn(async () => ({
          data: {
            users: [
              { id: "user-demo-admin", email: "demo@email.com" },
              { id: "user-1", email: "demo+tech-maya@example.test" },
              { id: "user-real", email: "real@example.com" },
            ],
          },
          error: null,
        })),
      },
    },
    from: vi.fn((table: string) => {
      calls.push(`from:${table}`);
      const query = new MockQuery({ data: [], error: null });
      queries.push(query);
      return query;
    }),
    storage: {
      from: vi.fn((bucket: string) => {
        calls.push(`storage.from:${bucket}`);
        return {
          remove: vi.fn(async (paths: string[]) => {
            calls.push(`storage.remove:${paths.join(",")}`);
            return { data: [], error: null };
          }),
          upload: vi.fn(async (path: string) => {
            calls.push(`storage.upload:${path}`);
            return { data: {}, error: null };
          }),
        };
      }),
    },
  };

  return { calls, client, queries };
}

describe("demo seed api client", () => {
  it("refuses unsafe execution before touching Supabase", () => {
    const { client } = createMockClient();

    expect(() =>
      validateDemoSeedExecution(client as unknown as DemoSeedSupabaseClient, {
        confirm: "seed-demo-data",
        serviceRoleKey: "service-role",
        supabaseUrl: "https://example.supabase.co",
        target: "production",
      }),
    ).toThrow("Demo seed target must be local or preview.");

    expect(client.from).not.toHaveBeenCalled();
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("seeds records in dependency order through the provided service-role client", async () => {
    const { calls, client } = createMockClient();
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
      technicianPassword: "demo-pass-123",
    });

    const summary = await seedDemoRecords(
      client as unknown as DemoSeedSupabaseClient,
      plan,
    );

    expect(summary).toMatchObject({
      adminUsers: 1,
      technicians: 3,
      customers: 4,
      inventory: 6,
      jobs: 5,
      media: 3,
      invoices: 2,
    });
    expect(
      calls.filter((call) => call.startsWith("auth.createUser")),
    ).toHaveLength(4);
    expect(calls[0]).toBe("auth.createUser:demo@email.com");
    expect(calls).toEqual(
      expect.arrayContaining([
        "from:profiles",
        "from:customers",
        "from:locations",
        "from:chemical_inventory",
        "from:jobs",
        "from:chemical_logs",
        "from:job_form_submissions",
        "from:job_media",
        "from:invoices",
        "from:invoice_line_items",
        "from:payments",
      ]),
    );
    expect(calls.indexOf("from:customers")).toBeLessThan(
      calls.indexOf("from:jobs"),
    );
    expect(calls.indexOf("from:jobs")).toBeLessThan(
      calls.indexOf("from:invoices"),
    );
  });

  it("replaces demo records by resetting before seeding", async () => {
    const { calls, client } = createMockClient();
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
      technicianPassword: "demo-pass-123",
    });

    const result = await replaceDemoSeedRecords(
      client as unknown as DemoSeedSupabaseClient,
      plan,
    );

    expect(result.reset.jobs).toBe(5);
    expect(result.seed.jobs).toBe(5);
    expect(calls.indexOf("from:payments")).toBeLessThan(
      calls.indexOf("auth.createUser:demo@email.com"),
    );
    expect(calls.indexOf("auth.createUser:demo@email.com")).toBeLessThan(
      calls.indexOf("auth.createUser:demo+tech-maya@example.test"),
    );
  });

  it("resets only demo-owned records in reverse dependency order", async () => {
    const { calls, client, queries } = createMockClient();
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
    });

    await resetDemoSeedRecords(
      client as unknown as DemoSeedSupabaseClient,
      plan,
    );

    expect(calls.slice(0, 8)).toEqual([
      "from:customers",
      "from:jobs",
      "from:invoices",
      "from:payments",
      "from:invoice_line_items",
      "from:invoices",
      "from:job_form_submissions",
      "from:chemical_logs",
    ]);
    expect(calls).toContain("auth.deleteUser:user-1");
    expect(calls).toContain("auth.deleteUser:user-demo-admin");
    expect(calls).not.toContain("auth.deleteUser:user-real");
    expect(
      queries.some((query) =>
        query.calls.some(
          ([method, args]) =>
            method === "eq" &&
            args[0] === "email" &&
            args[1] === "demo@email.com",
        ),
      ),
    ).toBe(true);
    expect(
      queries.some((query) =>
        query.calls.some(
          ([method, args]) =>
            method === "like" &&
            args[0] === "email" &&
            args[1] === "demo+tech-%",
        ),
      ),
    ).toBe(true);
  });

  it("uses admin-authenticated routes for dashboard status and actions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: { available: true, target: "local" },
          summary: { customers: 4 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          action: "seed",
          result: { seed: { customers: 4 } },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const authClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "admin-token" } },
          error: null,
        }),
      },
    };

    await getDemoSeedStatusRecord(authClient);
    await runDemoSeedActionRecord(authClient, {
      action: "seed",
      confirm: "seed-demo-data",
      target: "local",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/demo-seed",
      expect.objectContaining({
        headers: { Authorization: "Bearer admin-token" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/demo-seed",
      expect.objectContaining({
        body: JSON.stringify({
          action: "seed",
          confirm: "seed-demo-data",
          target: "local",
        }),
        headers: {
          Authorization: "Bearer admin-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("prepares local demo login without requiring an admin session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        action: "seed",
        result: { seed: { customers: 4 } },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await prepareLocalDemoLoginRecord();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/demo-seed/local-login",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
