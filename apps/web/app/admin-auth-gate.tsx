"use client";

import { usePathname } from "next/navigation";
import { AdminSignIn } from "./admin-sign-in";
import { useAdminAuth } from "./admin-auth-context";

function isPublicRoute(pathname: string) {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/forgot-password" ||
    pathname === "/auth/update-password" ||
    pathname === "/technician-login"
  );
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAdminAuth();

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutralLight px-6">
        <p className="text-sm font-semibold text-theme-text-secondary">
          Checking admin access...
        </p>
      </main>
    );
  }

  if (status !== "signed_in") {
    return <AdminSignIn />;
  }

  return <>{children}</>;
}
