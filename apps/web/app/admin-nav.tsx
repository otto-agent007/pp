"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "./admin-auth-context";

const adminRoutes = [
  { href: "/", label: "Home" },
  { href: "/customers", label: "Customers" },
  { href: "/jobs", label: "Jobs" },
  { href: "/dispatch", label: "Dispatch" },
  { href: "/technicians", label: "Technicians" },
  { href: "/inventory", label: "Inventory" },
  { href: "/closeouts", label: "Closeouts" },
  { href: "/payments", label: "Payments" },
  { href: "/automation", label: "Automation" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  const { profile, signOut, status } = useAdminAuth();

  if (pathname.startsWith("/portal") || status !== "signed_in") {
    return null;
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <Link className="text-base font-bold text-neutralDark" href="/">
            Pest Patrol OS
          </Link>
          {profile ? (
            <span className="text-xs font-semibold uppercase text-gray-500">
              {profile.role}
            </span>
          ) : null}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
          {adminRoutes.map((route) => {
            const active = isActive(pathname, route.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-neutralDark"
                }`}
                href={route.href}
                key={route.href}
              >
                {route.label}
              </Link>
            );
          })}
          <button
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-neutralDark"
            onClick={() => void signOut()}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
