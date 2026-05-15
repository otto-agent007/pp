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
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded-md bg-[#071A3D] px-3 py-2 text-sm font-bold text-white"
            href="/"
          >
            Pest Patrol OS
          </Link>
          <span className="rounded-md bg-[#FACC15]/30 px-2 py-1 text-xs font-bold uppercase text-[#071A3D]">
            Field command
          </span>
          {profile ? (
            <span className="text-xs font-bold uppercase text-slate-500">
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
                    ? "bg-[#0EA5E9] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#071A3D]"
                }`}
                href={route.href}
                key={route.href}
              >
                {route.label}
              </Link>
            );
          })}
          <button
            className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#071A3D]"
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
