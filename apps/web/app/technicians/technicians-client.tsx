"use client";

import {
  getTechnicianLabel,
  validateTechnicianInviteInput,
} from "@pest-patrol/domain";
import type { TechnicianInviteInput } from "@pest-patrol/types";
import { FormEvent, useMemo, useState } from "react";

import {
  useInviteTechnician,
  useTechnicianDirectory,
} from "../../hooks/useTechnicians";

const emptyForm: TechnicianInviteInput = {
  email: "",
  display_name: "",
};

export function TechniciansClient() {
  const techniciansQuery = useTechnicianDirectory();
  const inviteTechnician = useInviteTechnician();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<TechnicianInviteInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  const visibleTechnicians = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (techniciansQuery.data ?? []).filter((technician) => {
      if (!query) {
        return true;
      }

      return [
        technician.display_name,
        technician.email,
        technician.status,
        technician.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [search, techniciansQuery.data]);

  function updateForm(update: Partial<TechnicianInviteInput>) {
    setForm((current) => ({
      ...current,
      ...update,
    }));
  }

  async function submitTechnician(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setInviteSent(null);

    try {
      const input = validateTechnicianInviteInput(form);
      const result = await inviteTechnician.mutateAsync(input);

      setInviteSent(
        `${getTechnicianLabel(result.technician)} was invited to set a password.`,
      );
      setForm(emptyForm);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to invite technician",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">Technicians</h1>
        </div>
        <input
          aria-label="Search technicians"
          className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search technicians"
          value={search}
        />
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {techniciansQuery.isLoading ? (
            <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
              Loading technicians
            </p>
          ) : visibleTechnicians.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
              No technicians found
            </p>
          ) : (
            visibleTechnicians.map((technician) => (
              <article
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                key={technician.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-neutralDark">
                      {getTechnicianLabel(technician)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {technician.email ?? "No email saved"}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      ID {technician.id}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-md px-2 py-1 text-xs font-semibold capitalize ${
                      technician.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {technician.status}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>

        <form
          className="flex h-fit flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          onSubmit={submitTechnician}
        >
          <div>
            <h2 className="text-xl font-semibold text-neutralDark">
              Invite technician
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Supabase will send a setup email so the technician can choose
              their own password.
            </p>
          </div>

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          {inviteSent ? (
            <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {inviteSent}
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Display name
            <input
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
              onChange={(event) =>
                updateForm({ display_name: event.target.value })
              }
              placeholder="Testnician"
              value={form.display_name ?? ""}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Email
            <input
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
              onChange={(event) => updateForm({ email: event.target.value })}
              placeholder="testnician@example.com"
              type="email"
              value={form.email}
            />
          </label>

          <button
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={inviteTechnician.isPending}
            type="submit"
          >
            {inviteTechnician.isPending ? "Inviting..." : "Send invite"}
          </button>
        </form>
      </section>
    </main>
  );
}
