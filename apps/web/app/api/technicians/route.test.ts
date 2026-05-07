import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { GET, POST } from "./route";

vi.mock("../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({ id: "service-client" })),
  requireAdminAccess: vi.fn(),
}));

vi.mock("@pest-patrol/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pest-patrol/api-client")>();

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
import { requireAdminAccess } from "../_lib/server-auth";

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
    vi.mocked(requireAdminAccess).mockReset();
    vi.mocked(listTechnicianProfileRecords).mockReset();
    vi.mocked(inviteTechnicianWithAdminClientRecord).mockReset();
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
  });

  it("requires admin authentication", async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      NextResponse.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    );

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
    vi.mocked(listTechnicianProfileRecords).mockResolvedValue([technician] as never);

    const response = await GET(new Request("http://localhost/api/technicians"));
    const body = (await response.json()) as { technicians: unknown[] };

    expect(response.status).toBe(200);
    expect(body.technicians).toHaveLength(1);
  });

  it("invites a technician with the app password setup redirect", async () => {
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
        redirect_to: "https://app.example.com/auth/update-password",
      },
    );
  });
});
