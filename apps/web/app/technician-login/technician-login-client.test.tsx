import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TechnicianLoginClient } from "./technician-login-client";

const establishPasswordRecoverySession = vi.fn();
const signIn = vi.fn();
const updatePassword = vi.fn();

vi.mock("../technician-web-auth-context", () => ({
  useTechnicianWebAuth: () => ({
    establishPasswordRecoverySession,
    signIn,
    status: "signed_out",
    updatePassword,
  }),
}));

describe("TechnicianLoginClient", () => {
  beforeEach(() => {
    establishPasswordRecoverySession.mockReset();
    signIn.mockReset();
    updatePassword.mockReset();
    window.history.replaceState(null, "", "/technician-login");
    window.location.hash = "";
  });

  it("shows technician sign-in when opened without an invite link", () => {
    render(<TechnicianLoginClient />);

    expect(screen.getByRole("heading", { name: "Technician sign-in" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("signs in technicians with email and password", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue(undefined);

    render(<TechnicianLoginClient />);

    await user.type(screen.getByLabelText("Email"), "tech@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("tech@example.com", "password123");
  });

  it("accepts technician invite links before showing password setup", async () => {
    window.location.hash =
      "#type=invite&access_token=token&refresh_token=refresh";
    establishPasswordRecoverySession.mockResolvedValue(undefined);

    render(<TechnicianLoginClient />);

    expect(await screen.findByRole("heading", { name: "Set technician password" }))
      .toBeInTheDocument();
    expect(establishPasswordRecoverySession).toHaveBeenCalledWith(
      "token",
      "refresh",
    );
    expect(window.location.hash).toBe("");
  });

  it("rejects recovery links on the technician login page", () => {
    window.location.hash =
      "#type=recovery&access_token=token&refresh_token=refresh";

    render(<TechnicianLoginClient />);

    expect(
      screen.getByText(
        "This technician invite link is invalid or expired. Ask your dispatcher for a new invite.",
      ),
    ).toBeInTheDocument();
    expect(establishPasswordRecoverySession).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("updates password for a technician invite session", async () => {
    const user = userEvent.setup();
    window.location.hash =
      "#type=invite&access_token=token&refresh_token=refresh";
    establishPasswordRecoverySession.mockResolvedValue(undefined);
    updatePassword.mockResolvedValue(undefined);

    render(<TechnicianLoginClient />);

    await user.type(await screen.findByLabelText("New password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Set password" }));

    expect(updatePassword).toHaveBeenCalledWith("password123", "password123");
    expect(
      screen.getByText(
        "Password set. You can now sign in here with your technician account.",
      ),
    ).toBeInTheDocument();
  });
});
