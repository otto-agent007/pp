import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSignIn } from "./admin-sign-in";

const signIn = vi.fn();
let authError: string | null = null;
let authStatus: "loading" | "signed_in" | "signed_out" = "signed_out";

vi.mock("./admin-auth-context", () => ({
  useAdminAuth: () => ({
    error: authError,
    signIn,
    status: authStatus,
  }),
}));

describe("AdminSignIn", () => {
  beforeEach(() => {
    authError = null;
    authStatus = "signed_out";
    signIn.mockReset();
  });

  it("validates required fields before sign-in", async () => {
    const user = userEvent.setup();

    render(<AdminSignIn />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Email and password are required."))
      .toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("submits admin credentials", async () => {
    const user = userEvent.setup();

    render(<AdminSignIn />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("admin@example.com", "secret-password");
  });

  it("shows auth errors", () => {
    authError = "Admin or dispatcher access is required";

    render(<AdminSignIn />);

    expect(screen.getByText("Admin or dispatcher access is required"))
      .toBeInTheDocument();
  });
});
