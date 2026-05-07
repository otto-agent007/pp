import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpdatePasswordClient } from "./update-password-client";

const establishPasswordRecoverySession = vi.fn();
const updatePassword = vi.fn();

vi.mock("../../admin-auth-context", () => ({
  useAdminAuth: () => ({
    establishPasswordRecoverySession,
    updatePassword,
  }),
}));

describe("UpdatePasswordClient", () => {
  beforeEach(() => {
    establishPasswordRecoverySession.mockReset();
    updatePassword.mockReset();
    window.history.replaceState(null, "", "/auth/update-password");
    window.location.hash = "";
  });

  it("rejects non-recovery auth links", () => {
    window.location.hash = "#type=magiclink&access_token=token";

    render(<UpdatePasswordClient />);

    expect(
      screen.getByText(
        "This password reset link is invalid. Request a new password reset link.",
      ),
    ).toBeInTheDocument();
    expect(establishPasswordRecoverySession).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("shows a missing or expired link message without a recovery session", () => {
    render(<UpdatePasswordClient />);

    expect(
      screen.getByText(
        "This password reset link is missing or expired. Request a new password reset link.",
      ),
    ).toBeInTheDocument();
  });

  it("rejects spoofed recovery links without session tokens", () => {
    window.location.hash = "#type=recovery";

    render(<UpdatePasswordClient />);

    expect(
      screen.getByText(
        "This password reset link is missing or expired. Request a new password reset link.",
      ),
    ).toBeInTheDocument();
    expect(establishPasswordRecoverySession).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("scrubs recovery tokens even when session setup fails", async () => {
    window.location.hash =
      "#type=recovery&access_token=token&refresh_token=refresh";
    establishPasswordRecoverySession.mockRejectedValue(
      new Error("Recovery link expired"),
    );

    render(<UpdatePasswordClient />);

    expect(await screen.findByText("Recovery link expired")).toBeInTheDocument();
    expect(window.location.hash).toBe("");
  });

  it("establishes the recovery session before showing the update form", async () => {
    window.location.hash =
      "#type=recovery&access_token=token&refresh_token=refresh";
    establishPasswordRecoverySession.mockResolvedValue(undefined);

    render(<UpdatePasswordClient />);

    expect(await screen.findByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(establishPasswordRecoverySession).toHaveBeenCalledWith(
      "token",
      "refresh",
    );
    expect(window.location.hash).toBe("");
  });

  it("validates password confirmation before update", async () => {
    const user = userEvent.setup();
    window.location.hash =
      "#type=recovery&access_token=token&refresh_token=refresh";
    establishPasswordRecoverySession.mockResolvedValue(undefined);

    render(<UpdatePasswordClient />);

    await user.type(await screen.findByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("updates the password for a recovery session", async () => {
    const user = userEvent.setup();
    window.location.hash =
      "#type=recovery&access_token=token&refresh_token=refresh";
    establishPasswordRecoverySession.mockResolvedValue(undefined);
    updatePassword.mockResolvedValue(undefined);

    render(<UpdatePasswordClient />);

    await user.type(await screen.findByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm password"), "new-password");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(updatePassword).toHaveBeenCalledWith("new-password", "new-password");
    expect(screen.getByText("Password updated. You can now sign in."))
      .toBeInTheDocument();
  });
});
