import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TechnicianLoginClient } from "./technician-login-client";

const establishPasswordRecoverySession = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();
const updatePassword = vi.fn();
const authStatus = { value: "signed_out" as "loading" | "signed_in" | "signed_out" };

vi.mock("../technician-web-auth-context", () => ({
  useTechnicianWebAuth: () => ({
    establishPasswordRecoverySession,
    signIn,
    signOut,
    status: authStatus.value,
    updatePassword,
  }),
}));

describe("TechnicianLoginClient", () => {
  beforeEach(() => {
    establishPasswordRecoverySession.mockReset();
    signIn.mockReset();
    signOut.mockReset();
    updatePassword.mockReset();
    authStatus.value = "signed_out";
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

  it("lets a signed-in technician end the session on a shared machine", async () => {
    authStatus.value = "signed_in";
    signOut.mockResolvedValue(undefined);

    render(<TechnicianLoginClient />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("names the account an invite link resolved to", async () => {
    window.location.hash =
      "#type=invite&access_token=token&refresh_token=refresh";
    establishPasswordRecoverySession.mockResolvedValue("tech@example.com");

    render(<TechnicianLoginClient />);

    expect(await screen.findByText("tech@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Setting the password for/)).toBeInTheDocument();
  });

  it("refuses an invite link whose session is not a technician", async () => {
    window.location.hash =
      "#type=invite&access_token=attacker&refresh_token=attacker-refresh";
    establishPasswordRecoverySession.mockRejectedValue(
      new Error("Technician access is required"),
    );

    render(<TechnicianLoginClient />);

    expect(
      await screen.findByText("Technician access is required"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Set technician password" }),
    ).not.toBeInTheDocument();
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
