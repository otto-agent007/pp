"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./brand";
import { useAdminAuth } from "./admin-auth-context";

const adminRouteGroups = [
  {
    label: "Operations",
    routes: [
      { href: "/", label: "Overview" },
      { href: "/dispatch", label: "Dispatch" },
      { href: "/jobs", label: "Jobs" },
      { href: "/technicians", label: "Technicians" },
    ],
  },
  {
    label: "Customers",
    routes: [{ href: "/customers", label: "Customers" }],
  },
  {
    label: "Billing",
    routes: [
      { href: "/payments", label: "Payments" },
      { href: "/closeouts", label: "Closeouts" },
      { href: "/inventory", label: "Inventory" },
    ],
  },
  {
    label: "System",
    routes: [
      { href: "/automation", label: "Automation" },
      { href: "/compliance", label: "Compliance" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isPublicRoute(pathname: string) {
  return (
    pathname.startsWith("/portal") ||
    pathname === "/forgot-password" ||
    pathname === "/auth/update-password" ||
    pathname === "/technician-login"
  );
}

function adminLinkClassName(active: boolean) {
  return [
    "group inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition",
    active
      ? "bg-primitive-sky-500 text-theme-text-inverse shadow-sm"
      : "text-primitive-sky-100 hover:bg-primitive-navy-800 hover:text-theme-text-inverse",
  ].join(" ");
}

function MobileBrandRow({
  role,
}: {
  role: string | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-theme-text-inverse/10 px-3 py-2 md:block md:border-0 md:px-0 md:py-0">
      <Link
        aria-label="Pest Patrol OS — Home"
        className="inline-flex items-center rounded-md bg-primitive-navy-900 px-2 py-1"
        href="/"
      >
        <Wordmark
          label="decorative"
          variant="dark"
          width={156}
        />
      </Link>
      <div className="hidden min-w-0 flex-col md:mt-3 md:flex">
        <span className="text-xs font-bold uppercase text-primitive-sky-100">
          Admin console
        </span>
        <span className="mt-1 w-fit rounded-md bg-primitive-yellow-400 px-2 py-1 text-xs font-bold uppercase text-primitive-navy-950">
          Field command
        </span>
      </div>
      <div className="flex items-center gap-2 md:hidden">
        {role ? (
          <span className="rounded-md bg-primitive-navy-800 px-2 py-1 text-xs font-bold uppercase text-primitive-sky-100">
            {role}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const { profile, signOut, status } = useAdminAuth();

  if (isPublicRoute(pathname) || status !== "signed_in") {
    return null;
  }

  return (
    <nav className="sticky top-0 z-30 flex flex-col border-b border-primitive-navy-800 bg-primitive-navy-950 text-theme-text-inverse shadow-sm md:h-screen md:border-b-0 md:border-r md:px-3 md:py-4">
      <MobileBrandRow role={profile?.role} />
      <div className="flex flex-1 gap-2 overflow-x-auto px-3 py-2 md:mt-6 md:flex-col md:gap-5 md:overflow-visible md:px-0 md:py-0">
        {adminRouteGroups.map((group) => (
          <div
            className="flex shrink-0 items-center gap-1 md:block"
            key={group.label}
          >
            <p className="px-2 text-[10px] font-bold uppercase text-primitive-sky-100 md:mb-1">
              {group.label}
            </p>
            <div className="flex gap-1 md:flex-col">
              {group.routes.map((route) => {
                const active = isActive(pathname, route.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={adminLinkClassName(active)}
                    href={route.href}
                    key={route.href}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-theme-text-inverse" : "bg-primitive-sky-100/35"
                      }`}
                    />
                    {route.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-theme-text-inverse/10 px-3 py-2 md:px-0 md:pt-4">
        <p className="truncate text-sm font-bold">
          {profile?.display_name ?? profile?.email ?? "Admin operator"}
        </p>
        {profile ? (
          <p className="mt-1 text-xs font-bold uppercase text-primitive-sky-100">
            {profile.role}
          </p>
        ) : null}
        <button
          className="mt-3 w-full rounded-md border border-theme-text-inverse/15 px-3 py-2 text-left text-sm font-bold text-theme-text-inverse transition hover:bg-primitive-navy-800"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAdminAuth();

  if (isPublicRoute(pathname) || status !== "signed_in") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-theme-background-canvas md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <AdminNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
