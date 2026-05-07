import { describe, expect, it } from "vitest";

import {
  getTechnicianLabel,
  normalizeTechnicianInviteInput,
  validateTechnicianInviteInput,
} from "./technicians";

describe("technician domain", () => {
  it("rejects missing technician email", () => {
    expect(() =>
      validateTechnicianInviteInput({ email: " ", display_name: "Testnician" }),
    ).toThrow("Technician email is required");
  });

  it("rejects invalid technician email", () => {
    expect(() =>
      validateTechnicianInviteInput({ email: "testnician", display_name: null }),
    ).toThrow("Technician email must be valid");
  });

  it("normalizes invite input", () => {
    expect(
      normalizeTechnicianInviteInput({
        email: " TESTNICIAN@EXAMPLE.COM ",
        display_name: " Testnician ",
      }),
    ).toEqual({
      email: "testnician@example.com",
      display_name: "Testnician",
    });
  });

  it("labels technicians by display name, email, then id fallback", () => {
    expect(
      getTechnicianLabel({
        id: "technician-123456",
        email: "testnician@example.com",
        display_name: "Testnician",
      }),
    ).toBe("Testnician");

    expect(
      getTechnicianLabel({
        id: "technician-123456",
        email: "testnician@example.com",
        display_name: null,
      }),
    ).toBe("testnician@example.com");

    expect(
      getTechnicianLabel({
        id: "technician-123456",
        email: null,
        display_name: null,
      }),
    ).toBe("Technician technici");
  });
});
