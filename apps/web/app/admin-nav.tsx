"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./brand";
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
  { href: "/compliance", label: "Compliance" },
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
    <nav className="sticky top-0 z-30 border-b border-theme-border-subtle bg-theme-background-surface/95 px-4 py-2 shadow-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            aria-label="Pest Patrol OS — Home"
            className="inline-flex items-center rounded-md bg-primitive-navy-950 px-3 py-1.5"
            href="/"
          >
            <Wordmark
              label="decorative"
              variant="dark"
              width={156}
            />
          </Link>
          <span className="rounded-md bg-primitive-yellow-400/30 px-2 py-1 text-xs font-bold uppercase text-primitive-navy-950">
            Field command
          </span>
          {profile ? (
            <span className="text-xs font-bold uppercase text-theme-text-muted">
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
                className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-primitive-sky-500 text-theme-text-inverse shadow-sm"
                    : "text-theme-text-secondary hover:bg-primitive-slate-100 hover:text-primitive-navy-950"
                }`}
                href={route.href}
                key={route.href}
              >
                {route.label}
              </Link>
            );
          })}
          <button
            className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-bold text-theme-text-secondary transition hover:bg-primitive-slate-100 hover:text-primitive-navy-950"
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
