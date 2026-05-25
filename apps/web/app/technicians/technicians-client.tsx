"use client";

import {
  buildTechnicianRouteLoadSummaries,
  getTechnicianLabel,
  validateTechnicianInviteInput,
} from "@pest-patrol/domain";
import type { TechnicianInviteInput } from "@pest-patrol/types";
import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  StatusPill,
  buttonClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { FormEvent, useMemo, useState } from "react";

import { useJobs } from "../../hooks/useJobs";
import {
  useInviteTechnician,
  useTechnicianDirectory,
} from "../../hooks/useTechnicians";

const emptyForm: TechnicianInviteInput = {
  email: "",
  display_name: "",
};

function technicianStatusTone(status: string): StatusPillTone {
  return status === "active" ? "success" : "neutral";
}

export function TechniciansClient() {
  const techniciansQuery = useTechnicianDirectory();
  const jobsQuery = useJobs();
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
  const routeLoadByTechnician = useMemo(() => {
    const summaries = buildTechnicianRouteLoadSummaries(
      techniciansQuery.data ?? [],
      jobsQuery.data ?? [],
    );

    return new Map(
      summaries.map((summary) => [summary.technician_id, summary]),
    );
  }, [jobsQuery.data, techniciansQuery.data]);

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
          className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-primary"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search technicians"
          value={search}
        />
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          <div>
            <Eyebrow tone="accent">Technician roster</Eyebrow>
            <h2 className="mt-1 text-2xl font-bold text-neutralDark">
              Dispatch-ready crew
            </h2>
          </div>
          {techniciansQuery.isLoading ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              Loading technicians
            </Card>
          ) : visibleTechnicians.length === 0 ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              No technicians found
            </Card>
          ) : (
            visibleTechnicians.map((technician) => {
              const routeLoad = routeLoadByTechnician.get(technician.id);
              const routeLoadTone: StatusPillTone =
                (routeLoad?.today_assigned_job_count ?? 0) > 0
                  ? "warning"
                  : (routeLoad?.upcoming_assigned_job_count ?? 0) > 0
                    ? "info"
                    : "neutral";

              return (
                <article key={technician.id}>
                  <Card padding="lg">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <Avatar
                          name={getTechnicianLabel(technician)}
                          size="lg"
                        />
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-neutralDark">
                            {getTechnicianLabel(technician)}
                          </h2>
                          <p className="mt-1 text-sm text-theme-text-secondary">
                            {technician.email ?? "No email saved"}
                          </p>
                          <p className="mt-2 text-xs text-theme-text-muted">
                            ID {technician.id}
                          </p>
                          <div
                            className={`mt-4 flex flex-wrap gap-2 rounded-md border p-2 ${statusSurfaceClassName(
                              routeLoadTone,
                            )}`}
                          >
                            <StatusPill dot={false} tone="info">
                              {routeLoad?.today_assigned_job_count ?? 0} today
                            </StatusPill>
                            <StatusPill dot={false} tone="neutral">
                              {routeLoad?.upcoming_assigned_job_count ?? 0}{" "}
                              upcoming
                            </StatusPill>
                            <StatusPill dot={false} tone="warning">
                              {routeLoad?.route_status_label ??
                                "No route today"}
                            </StatusPill>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3 sm:items-end">
                        <StatusPill
                          tone={technicianStatusTone(technician.status)}
                        >
                          {technician.status}
                        </StatusPill>
                        <a
                          className={buttonClassName({ variant: "ghost" })}
                          href={`/dispatch?technician=${encodeURIComponent(technician.id)}`}
                        >
                          Open in dispatch
                        </a>
                      </div>
                    </div>
                  </Card>
                </article>
              );
            })
          )}
        </div>

        <form
          className="flex h-fit flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
          onSubmit={submitTechnician}
        >
          <div>
            <h2 className="text-xl font-semibold text-neutralDark">
              Invite technician
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              Supabase will send a setup email so the technician can choose
              their own password.
            </p>
          </div>

          {formError ? (
            <p
              className={`rounded-md border p-3 text-sm text-status-alert-danger-fg ${statusSurfaceClassName(
                "danger",
              )}`}
            >
              {formError}
            </p>
          ) : null}

          {inviteSent ? (
            <p
              className={`rounded-md border p-3 text-sm text-status-alert-success-fg ${statusSurfaceClassName(
                "success",
              )}`}
            >
              {inviteSent}
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Display name
            <input
              className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
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
              className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
              onChange={(event) => updateForm({ email: event.target.value })}
              placeholder="testnician@example.com"
              type="email"
              value={form.email}
            />
          </label>

          <Button disabled={inviteTechnician.isPending} type="submit">
            {inviteTechnician.isPending ? "Inviting..." : "Send invite"}
          </Button>
        </form>
      </section>
    </main>
  );
}
