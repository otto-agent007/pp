import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  inviteTechnicianRecord,
  inviteTechnicianWithAdminClientRecord,
  listTechnicianProfileRecords,
} from "./technicians";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  upsert(...args: unknown[]) {
    this.calls.push(["upsert", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-07T00:00:00.000Z";
const technician = {
  id: "technician-1",
  role: "technician",
  email: "testnician@example.com",
  display_name: "Testnician",
  status: "active",
  created_at: now,
  updated_at: now,
} as const;

describe("technician api client", () => {
  const from = vi.mocked(supabase.from);
  const getSession = vi.mocked(supabase.auth.getSession);
  const fetchMock = vi.fn();

  beforeEach(() => {
    from.mockReset();
    getSession.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists active technician profiles", async () => {
    const profilesQuery = new MockQuery({ data: [technician], error: null });
    from.mockReturnValue(profilesQuery as never);

    const technicians = await listTechnicianProfileRecords("active");

    expect(technicians).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(profilesQuery.calls).toContainEqual(["eq", ["role", "technician"]]);
    expect(profilesQuery.calls).toContainEqual(["eq", ["status", "active"]]);
  });

  it("invites a technician through the server route with admin auth", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ technician }),
    });

    const result = await inviteTechnicianRecord({
      email: "testnician@example.com",
      display_name: "Testnician",
    });

    expect(result.technician.display_name).toBe("Testnician");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/technicians",
      expect.objectContaining({
        body: JSON.stringify({
          email: "testnician@example.com",
          display_name: "Testnician",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
        method: "POST",
      }),
    );
  });

  it("uses Supabase admin invite and upserts technician profile metadata", async () => {
    const profilesQuery = new MockQuery({ data: technician, error: null });
    const clientFrom = vi.fn().mockReturnValue(profilesQuery);
    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: { id: "technician-1" } },
      error: null,
    });
    const client = {
      auth: {
        admin: {
          inviteUserByEmail,
        },
      },
      from: clientFrom,
    } as never;

    const result = await inviteTechnicianWithAdminClientRecord(client, {
      email: "testnician@example.com",
      display_name: "Testnician",
      redirect_to: "https://app.example.com/auth/update-password",
    });

    expect(result.technician.id).toBe("technician-1");
    expect(inviteUserByEmail).toHaveBeenCalledWith(
      "testnician@example.com",
      expect.objectContaining({
        data: {
          display_name: "Testnician",
          role: "technician",
        },
        redirectTo: "https://app.example.com/auth/update-password",
      }),
    );
    expect(clientFrom).toHaveBeenCalledWith("profiles");
    expect(profilesQuery.calls[0]).toEqual([
      "upsert",
      [
        expect.objectContaining({
          id: "technician-1",
          email: "testnician@example.com",
          display_name: "Testnician",
          role: "technician",
          status: "active",
        }),
        { onConflict: "id" },
      ],
    ]);
  });
});
