import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSignIn } from "./admin-sign-in";

const signIn = vi.fn();
const signInLocalDemo = vi.fn();
const prepareLocalDemoLogin = vi.fn();
let authError: string | null = null;
let authStatus: "loading" | "signed_in" | "signed_out" = "signed_out";

vi.mock("./admin-auth-context", () => ({
  useAdminAuth: () => ({
    error: authError,
    signIn,
    signInLocalDemo,
    status: authStatus,
  }),
}));

vi.mock("../hooks/useDemoSeed", () => ({
  usePrepareLocalDemoLogin: () => ({
    isPending: false,
    mutateAsync: prepareLocalDemoLogin,
  }),
}));

describe("AdminSignIn", () => {
  beforeEach(() => {
    authError = null;
    authStatus = "signed_out";
    prepareLocalDemoLogin.mockReset();
    prepareLocalDemoLogin.mockResolvedValue({});
    signIn.mockReset();
    signInLocalDemo.mockReset();
  });

  it("validates required fields before sign-in", async () => {
    const user = userEvent.setup();

    render(<AdminSignIn />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      screen.getByText("Email and password are required."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("uses the themed sign-in surface and shared form controls", () => {
    render(<AdminSignIn />);

    expect(screen.getByRole("main")).toHaveClass("bg-theme-background-canvas");
    expect(
      screen.getByRole("img", { name: "Pest Patrol OS" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Run the day from one field-ready workspace/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveClass(
      "focus:border-theme-action-primary",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveClass(
      "bg-theme-action-primary",
    );
  });

  it("submits admin credentials", async () => {
    const user = userEvent.setup();

    render(<AdminSignIn />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("admin@example.com", "secret-password");
  });

  it("signs in with the easy local demo credentials", async () => {
    const user = userEvent.setup();

    render(<AdminSignIn />);

    await user.click(screen.getByRole("button", { name: "Log in as demo" }));

    expect(screen.getByLabelText("Email")).toHaveValue("demo@email.com");
    expect(screen.getByLabelText("Password")).toHaveValue("password");
    expect(prepareLocalDemoLogin).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith("demo@email.com", "password");
  });

  it("falls back to a local fixture demo session when seed env is unavailable", async () => {
    const user = userEvent.setup();
    prepareLocalDemoLogin.mockRejectedValue(
      new Error("NEXT_PUBLIC_SUPABASE_URL is required."),
    );

    render(<AdminSignIn />);

    await user.click(screen.getByRole("button", { name: "Log in as demo" }));

    expect(prepareLocalDemoLogin).toHaveBeenCalledTimes(1);
    expect(signIn).not.toHaveBeenCalled();
    expect(signInLocalDemo).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("NEXT_PUBLIC_SUPABASE_URL is required."),
    ).not.toBeInTheDocument();
  });

  it("uses the prepared local fixture demo session without Supabase sign-in", async () => {
    const user = userEvent.setup();
    prepareLocalDemoLogin.mockResolvedValue({
      status: { environment_label: "Local fixture demo" },
    });

    render(<AdminSignIn />);

    await user.click(screen.getByRole("button", { name: "Log in as demo" }));

    expect(prepareLocalDemoLogin).toHaveBeenCalledTimes(1);
    expect(signIn).not.toHaveBeenCalled();
    expect(signInLocalDemo).toHaveBeenCalledTimes(1);
  });

  it("links to password reset", () => {
    render(<AdminSignIn />);

    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("shows auth errors", () => {
    authError = "Admin or dispatcher access is required";

    render(<AdminSignIn />);

    expect(
      screen.getByText("Admin or dispatcher access is required"),
    ).toBeInTheDocument();
  });
});
