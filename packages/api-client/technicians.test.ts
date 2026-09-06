import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  inviteTechnicianRecord,
  inviteTechnicianWithAdminClientRecord,
  listTechnicianProfileRecords,
} from "./technicians";
import {
  archiveTechnicianLicenseRecord,
  createTechnicianLicenseRecord,
  listTechnicianLicenseRecords,
  updateTechnicianLicenseRecord,
} from "./technicianLicenses";
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

  is(...args: unknown[]) {
    this.calls.push(["is", args]);
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

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  maybeSingle() {
    this.calls.push(["maybeSingle", []]);
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
const technicianLicense = {
  id: "license-1",
  technician_id: "technician-1",
  license_type: "operator",
  branch: "branch_3",
  license_number: "OPR-123",
  issuing_authority: "spcb",
  status: "active",
  expires_at: "2026-12-31",
  notes: null,
  archived_at: null,
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
    const existingProfileQuery = new MockQuery({ data: null, error: null });
    const upsertQuery = new MockQuery({ data: technician, error: null });
    const clientFrom = vi
      .fn()
      .mockReturnValueOnce(existingProfileQuery)
      .mockReturnValueOnce(upsertQuery);
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
    expect(existingProfileQuery.calls).toContainEqual([
      "eq",
      ["email", "testnician@example.com"],
    ]);
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
    expect(upsertQuery.calls[0]).toEqual([
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

  it("rejects inviting an email that belongs to an existing non-technician profile", async () => {
    const existingProfileQuery = new MockQuery({
      data: { id: "admin-1", role: "admin" },
      error: null,
    });
    const clientFrom = vi.fn().mockReturnValue(existingProfileQuery);
    const inviteUserByEmail = vi.fn();
    const client = {
      auth: {
        admin: {
          inviteUserByEmail,
        },
      },
      from: clientFrom,
    } as never;

    await expect(
      inviteTechnicianWithAdminClientRecord(client, {
        email: "admin@example.com",
        display_name: "Someone",
        redirect_to: "https://app.example.com/auth/update-password",
      }),
    ).rejects.toThrow(
      "This email belongs to an existing admin or dispatcher account and cannot be invited as a technician",
    );

    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("lists non-archived technician license records", async () => {
    const licensesQuery = new MockQuery({
      data: [technicianLicense],
      error: null,
    });
    from.mockReturnValue(licensesQuery as never);

    const records = await listTechnicianLicenseRecords("technician-1");

    expect(records).toEqual([technicianLicense]);
    expect(from).toHaveBeenCalledWith("technician_licenses");
    expect(licensesQuery.calls).toContainEqual(["select", ["*"]]);
    expect(licensesQuery.calls).toContainEqual(["is", ["archived_at", null]]);
    expect(licensesQuery.calls).toContainEqual([
      "eq",
      ["technician_id", "technician-1"],
    ]);
    expect(licensesQuery.calls).toContainEqual([
      "order",
      ["expires_at", { ascending: true }],
    ]);
  });

  it("creates and updates technician license records", async () => {
    const createQuery = new MockQuery({ data: technicianLicense, error: null });
    const updateQuery = new MockQuery({
      data: { ...technicianLicense, license_number: "OPR-456" },
      error: null,
    });
    from
      .mockReturnValueOnce(createQuery as never)
      .mockReturnValueOnce(updateQuery as never);

    await createTechnicianLicenseRecord({
      technician_id: "technician-1",
      license_type: "operator",
      branch: "branch_3",
      license_number: "OPR-123",
      issuing_authority: "spcb",
      status: "active",
      expires_at: "2026-12-31",
      notes: null,
    });
    await updateTechnicianLicenseRecord("license-1", {
      technician_id: "technician-1",
      license_type: "operator",
      branch: "branch_3",
      license_number: "OPR-456",
      issuing_authority: "spcb",
      status: "active",
      expires_at: "2026-12-31",
      notes: null,
    });

    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          branch: "branch_3",
          technician_id: "technician-1",
        }),
      ],
    ]);
    expect(updateQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          license_number: "OPR-456",
        }),
      ],
    ]);
    expect(updateQuery.calls).toContainEqual(["eq", ["id", "license-1"]]);
  });

  it("archives technician license records with archived_at instead of hard delete", async () => {
    const archiveQuery = new MockQuery({
      data: { ...technicianLicense, archived_at: now },
      error: null,
    });
    from.mockReturnValue(archiveQuery as never);

    const archived = await archiveTechnicianLicenseRecord("license-1");

    expect(archived.archived_at).toBeTruthy();
    expect(archiveQuery.calls[0][0]).toBe("update");
    expect(archiveQuery.calls[0][1][0]).toEqual({
      archived_at: expect.any(String),
    });
    expect(archiveQuery.calls).toContainEqual(["eq", ["id", "license-1"]]);
    expect(JSON.stringify(archiveQuery.calls)).not.toContain("delete");
  });
});
