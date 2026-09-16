import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { GET, POST } from "./route";

let rateLimited = false;
const rateLimitKeys: string[] = [];

vi.mock("../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({ id: "service-client" })),
  getAdminAccess: vi.fn(),
}));

vi.mock("../_lib/rate-limit", () => ({
  checkApiRateLimit: ({ key }: { key?: string }) => {
    rateLimitKeys.push(key ?? "");

    return Promise.resolve(rateLimited);
  },
  rateLimitResponse: () =>
    Response.json(
      { error: "Too many requests. Please retry later." },
      { status: 429 },
    ),
}));

vi.mock("@pest-patrol/api-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@pest-patrol/api-client")>();

  return {
    ...actual,
    inviteTechnicianWithAdminClientRecord: vi.fn(),
    listTechnicianProfileRecords: vi.fn(),
  };
});

import {
  inviteTechnicianWithAdminClientRecord,
  listTechnicianProfileRecords,
} from "@pest-patrol/api-client";
import { getAdminAccess } from "../_lib/server-auth";

const now = "2026-05-07T00:00:00.000Z";
const technician = {
  id: "technician-1",
  role: "technician",
  email: "testnician@example.com",
  display_name: "Testnician",
  status: "active",
  created_at: now,
  updated_at: now,
};

describe("technicians route", () => {
  beforeEach(() => {
    rateLimited = false;
    rateLimitKeys.length = 0;
    vi.mocked(getAdminAccess).mockReset();
    vi.mocked(listTechnicianProfileRecords).mockReset();
    vi.mocked(inviteTechnicianWithAdminClientRecord).mockReset();
    vi.mocked(getAdminAccess).mockResolvedValue({
      access: {
        profile: {
          id: "admin-user",
          role: "admin",
          email: "admin@example.com",
          display_name: "Admin User",
          status: "active",
          created_at: now,
          updated_at: now,
        },
        userId: "admin-user",
      },
      response: null,
    });
  });

  it("requires admin authentication", async () => {
    vi.mocked(getAdminAccess).mockResolvedValue({
      access: null,
      response: NextResponse.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    });

    const response = await POST(
      new Request("http://localhost/api/technicians", {
        body: JSON.stringify({ email: "testnician@example.com" }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("lists technician profiles for admins", async () => {
    vi.mocked(listTechnicianProfileRecords).mockResolvedValue([
      technician,
    ] as never);

    const response = await GET(new Request("http://localhost/api/technicians"));
    const body = (await response.json()) as { technicians: unknown[] };

    expect(response.status).toBe(200);
    expect(body.technicians).toHaveLength(1);
  });

  it("invites a technician with the technician password setup redirect", async () => {
    vi.mocked(inviteTechnicianWithAdminClientRecord).mockResolvedValue({
      technician,
    } as never);

    const response = await POST(
      new Request("https://app.example.com/api/technicians", {
        body: JSON.stringify({
          email: " TESTNICIAN@EXAMPLE.COM ",
          display_name: " Testnician ",
        }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as { technician: typeof technician };

    expect(response.status).toBe(200);
    expect(body.technician.display_name).toBe("Testnician");
    expect(inviteTechnicianWithAdminClientRecord).toHaveBeenCalledWith(
      expect.anything(),
      {
        email: "testnician@example.com",
        display_name: "Testnician",
        redirect_to: "https://app.example.com/technician-login",
      },
    );
  });

  // Every call here sends an invite email to an address the caller chooses, so
  // an unlimited route lends the project's mail reputation to whoever holds an
  // admin token. The key uses the normalized email so case and padding cannot
  // be varied to buy a fresh bucket per attempt.
  it("rate limits invites per admin and target address", async () => {
    vi.mocked(inviteTechnicianWithAdminClientRecord).mockResolvedValue({
      technician,
    } as never);

    await POST(
      new Request("https://app.example.com/api/technicians", {
        body: JSON.stringify({ email: " TESTNICIAN@EXAMPLE.COM " }),
        method: "POST",
      }),
    );

    expect(rateLimitKeys).toEqual([
      "technician-invite:admin-user:testnician@example.com",
    ]);
  });

  it("does not send an invite once the limit is reached", async () => {
    rateLimited = true;

    const response = await POST(
      new Request("https://app.example.com/api/technicians", {
        body: JSON.stringify({ email: "testnician@example.com" }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(429);
    expect(inviteTechnicianWithAdminClientRecord).not.toHaveBeenCalled();
  });
});
