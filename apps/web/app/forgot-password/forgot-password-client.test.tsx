import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordClient } from "./forgot-password-client";

const requestPasswordReset = vi.fn();

vi.mock("../admin-auth-context", () => ({
  useAdminAuth: () => ({
    requestPasswordReset,
  }),
}));

describe("ForgotPasswordClient", () => {
  beforeEach(() => {
    requestPasswordReset.mockReset();
  });

  it("validates email before requesting a reset", async () => {
    const user = userEvent.setup();

    render(<ForgotPasswordClient />);

    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("requests a recovery email with the update-password redirect", async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockResolvedValue(undefined);

    render(<ForgotPasswordClient />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(requestPasswordReset).toHaveBeenCalledWith(
      "admin@example.com",
      expect.stringContaining("/auth/update-password"),
    );
    expect(screen.getByText("Check your email for a password reset link."))
      .toBeInTheDocument();
  });
});
