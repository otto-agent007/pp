"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClassName } from "@pest-patrol/ui";
import { Wordmark } from "./brand";
import { useAdminAuth } from "./admin-auth-context";

// Minimal inline SVG icons for the collapsed nav rail.
// Keeps zero extra dependencies while making the collapsed state readable.
function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    Overview: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <rect height="7" rx="1" width="7" x="3" y="3" /><rect height="7" rx="1" width="7" x="14" y="3" />
        <rect height="7" rx="1" width="7" x="3" y="14" /><rect height="7" rx="1" width="7" x="14" y="14" />
      </svg>
    ),
    Dispatch: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    Jobs: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    Technicians: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    Customers: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    "Escrow/RE": (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    Payments: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    Closeouts: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Inventory: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    Automation: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    Compliance: (
      <svg aria-hidden="true" fill="none" height={16} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  };

  return <>{icons[name] ?? <span aria-hidden="true" className="h-4 w-4" />}</>;
}

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
    routes: [
      { href: "/customers", label: "Customers" },
      { href: "/escrow-re", label: "Escrow/RE" },
    ],
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
    "group inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition md:w-full md:px-2.5",
    active
      ? "bg-primitive-sky-500 text-theme-text-inverse shadow-sm"
      : "text-primitive-sky-100 hover:bg-primitive-navy-800 hover:text-theme-text-inverse",
  ].join(" ");
}

const railRevealClassName =
  "md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover/admin-nav:max-w-44 md:group-hover/admin-nav:opacity-100 md:group-focus-within/admin-nav:max-w-44 md:group-focus-within/admin-nav:opacity-100";

function MobileBrandRow({ role }: { role: string | null | undefined }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-theme-text-inverse/10 px-3 py-2 md:block md:border-0 md:px-0 md:py-0">
      <Link
        aria-label="Pest Patrol OS — Home"
        className="inline-flex min-w-0 items-center rounded-md bg-primitive-navy-900 px-2 py-1 md:h-10 md:w-full md:px-1"
        href="/"
      >
        <span
          className={`hidden shrink-0 md:block ${railRevealClassName}`}
          data-testid="admin-nav-desktop-wordmark"
        >
          <Wordmark label="decorative" variant="dark" width={156} />
        </span>
        <span className="shrink-0 md:hidden" data-testid="admin-nav-mobile-wordmark">
          <Wordmark label="decorative" variant="dark" width={200} />
        </span>
      </Link>
      <div
        className={`hidden min-w-0 flex-col md:mt-3 md:flex ${railRevealClassName}`}
      >
        <span className="text-xs font-bold uppercase text-primitive-sky-100">
          Admin console
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:hidden">
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
    <nav className="group/admin-nav sticky top-0 z-30 flex flex-col border-b border-primitive-navy-800 bg-primitive-navy-900 text-theme-text-inverse shadow-sm md:fixed md:inset-y-0 md:left-0 md:z-40 md:h-screen md:w-52 md:-translate-x-[calc(100%-1rem)] md:overflow-hidden md:border-b-0 md:border-r md:px-3 md:py-4 md:transition-transform md:duration-200 md:ease-out md:hover:translate-x-0 md:focus-within:translate-x-0 motion-reduce:transition-none">
      <div
        className="flex min-h-0 flex-1 flex-col md:opacity-0 md:transition-opacity md:duration-150 md:group-hover/admin-nav:opacity-100 md:group-focus-within/admin-nav:opacity-100 motion-reduce:transition-none"
        data-testid="admin-nav-content"
      >
        <MobileBrandRow role={profile?.role} />
        <div
          className="flex min-w-0 max-w-full flex-1 gap-2 overflow-x-auto px-3 py-2 md:mt-6 md:flex-col md:gap-5 md:overflow-visible md:px-0 md:py-0"
          data-testid="admin-nav-route-strip"
        >
          {adminRouteGroups.map((group) => (
            <div
              className="flex shrink-0 items-center gap-1 md:block"
              key={group.label}
            >
              <p
                className={`hidden px-2 text-[10px] font-bold uppercase text-primitive-sky-100 md:mb-1 md:block ${railRevealClassName}`}
              >
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
                      title={route.label}
                    >
                      {/* Icon always visible — gives the collapsed rail meaning */}
                      <span
                        className={`shrink-0 ${
                          active
                            ? "text-theme-text-inverse"
                            : "text-primitive-sky-100/70"
                        }`}
                      >
                        <NavIcon name={route.label} />
                      </span>
                      <span className={railRevealClassName}>
                        {route.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-theme-text-inverse/10 px-3 py-2 md:px-0 md:pt-4">
          <div className={railRevealClassName}>
            <p className="truncate text-sm font-bold">
              {profile?.display_name ?? profile?.email ?? "Admin operator"}
            </p>
            {profile ? (
              <p className="mt-1 text-xs font-bold uppercase text-primitive-sky-100">
                {profile.role}
              </p>
            ) : null}
          </div>
          <button
            className={buttonClassName({
              className:
                `mt-3 justify-start border-transparent px-2 text-primitive-sky-100 hover:bg-primitive-navy-800 hover:text-theme-text-inverse ${railRevealClassName}`,
              fullWidth: true,
              size: "sm",
              variant: "inverse",
            })}
            onClick={() => void signOut()}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
      {/* Collapsed-rail edge — shows a subtle chevron so users know the rail expands */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-4 items-center justify-center border-r border-primitive-sky-100/20 bg-primitive-navy-800/70 md:flex md:transition-opacity md:duration-150 md:group-hover/admin-nav:opacity-0 md:group-focus-within/admin-nav:opacity-0 motion-reduce:transition-none"
        data-testid="admin-nav-reveal-edge"
      >
        <svg fill="none" height={10} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={10}>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
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
    <div className="min-h-screen bg-theme-background-canvas">
      <AdminNav />
      <div className="min-w-0 md:pl-4">{children}</div>
    </div>
  );
}
