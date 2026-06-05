"use client";

import {
  buildTechnicianRouteLoadSummaries,
  getBranchCredentialSummary,
  getTechnicianLabel,
  validateTechnicianLicenseInput,
  validateTechnicianInviteInput,
} from "@pest-patrol/domain";
import type {
  TechnicianInviteInput,
  TechnicianLicense,
  TechnicianLicenseBranch,
  TechnicianLicenseInput,
  TechnicianLicenseStatus,
  TechnicianLicenseType,
} from "@pest-patrol/types";
import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  StatTile,
  StatusPill,
  buttonClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useJobs } from "../../hooks/useJobs";
import {
  useArchiveTechnicianLicense,
  useCreateTechnicianLicense,
  useInviteTechnician,
  useTechnicianDirectory,
  useTechnicianLicenses,
  useUpdateTechnicianLicense,
} from "../../hooks/useTechnicians";
import { adminWorkspaceClassName } from "../admin-workspace";

const emptyForm: TechnicianInviteInput = {
  email: "",
  display_name: "",
};

const emptyCredentialForm: TechnicianLicenseInput = {
  branch: "branch_3",
  expires_at: "",
  issuing_authority: "spcb",
  license_number: "",
  license_type: "operator",
  notes: "",
  status: "active",
  technician_id: "",
};

const licenseTypeOptions: Array<{
  label: string;
  value: TechnicianLicenseType;
}> = [
  { label: "Operator", value: "operator" },
  { label: "Field representative", value: "field_representative" },
  { label: "Applicator", value: "applicator" },
  { label: "Registered company", value: "registered_company" },
  { label: "Other", value: "other" },
];

const licenseBranchOptions: Array<{
  label: string;
  value: TechnicianLicenseBranch;
}> = [
  { label: "Branch 3", value: "branch_3" },
  { label: "Branch 2", value: "branch_2" },
  { label: "General", value: "general" },
];

const licenseStatusOptions: Array<{
  label: string;
  value: TechnicianLicenseStatus;
}> = [
  { label: "Active", value: "active" },
  { label: "Expiring soon", value: "expiring_soon" },
  { label: "Expired", value: "expired" },
  { label: "Suspended", value: "suspended" },
  { label: "Unknown", value: "unknown" },
];

function technicianStatusTone(status: string): StatusPillTone {
  return status === "active" ? "success" : "neutral";
}

function licenseTypeLabel(value: TechnicianLicenseType) {
  return (
    licenseTypeOptions.find((option) => option.value === value)?.label ?? value
  );
}

function licenseBranchLabel(value: TechnicianLicenseBranch) {
  return (
    licenseBranchOptions.find((option) => option.value === value)?.label ??
    value
  );
}

function credentialTone(status: string): StatusPillTone {
  if (status === "ready" || status === "active") return "success";
  if (status === "expiring_soon") return "warning";
  if (status === "expired" || status === "suspended") return "danger";
  return "warning";
}

function compactDate(value: string | null) {
  return value ?? "No expiration";
}

export function TechniciansClient() {
  const techniciansQuery = useTechnicianDirectory();
  const jobsQuery = useJobs();
  const technicianLicensesQuery = useTechnicianLicenses();
  const inviteTechnician = useInviteTechnician();
  const createTechnicianLicense = useCreateTechnicianLicense();
  const updateTechnicianLicense = useUpdateTechnicianLicense();
  const archiveTechnicianLicense = useArchiveTechnicianLicense();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<TechnicianInviteInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<string | null>(null);
  const [credentialForm, setCredentialForm] =
    useState<TechnicianLicenseInput>(emptyCredentialForm);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null,
  );
  const [credentialArchiveConfirmationId, setCredentialArchiveConfirmationId] =
    useState<string | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [credentialMessage, setCredentialMessage] = useState<string | null>(
    null,
  );

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
  const selectedCredentialTechnician = useMemo(
    () =>
      (techniciansQuery.data ?? []).find(
        (technician) => technician.id === credentialForm.technician_id,
      ) ?? null,
    [credentialForm.technician_id, techniciansQuery.data],
  );
  const routeLoadSummaries = useMemo(
    () =>
      buildTechnicianRouteLoadSummaries(
        techniciansQuery.data ?? [],
        jobsQuery.data ?? [],
      ),
    [jobsQuery.data, techniciansQuery.data],
  );
  const routeLoadByTechnician = useMemo(() => {
    return new Map(
      routeLoadSummaries.map((summary) => [summary.technician_id, summary]),
    );
  }, [routeLoadSummaries]);
  useEffect(() => {
    if (credentialForm.technician_id || visibleTechnicians.length === 0) {
      return;
    }

    setCredentialForm((current) => ({
      ...current,
      technician_id: visibleTechnicians[0]?.id || "",
    }));
  }, [credentialForm.technician_id, visibleTechnicians]);
  const activeTechnicianCount = useMemo(
    () =>
      (techniciansQuery.data ?? []).filter(
        (technician) => technician.status === "active",
      ).length,
    [techniciansQuery.data],
  );
  const assignedTodayCount = routeLoadSummaries.reduce(
    (total, summary) => total + summary.today_assigned_job_count,
    0,
  );
  const upcomingAssignedCount = routeLoadSummaries.reduce(
    (total, summary) => total + summary.upcoming_assigned_job_count,
    0,
  );
  const noRouteTodayCount = routeLoadSummaries.filter(
    (summary) => summary.today_assigned_job_count === 0,
  ).length;
  const activeLicenses = useMemo(
    () => technicianLicensesQuery.data ?? [],
    [technicianLicensesQuery.data],
  );
  const licensesByTechnician = useMemo(() => {
    const map = new Map<string, TechnicianLicense[]>();

    for (const license of activeLicenses) {
      map.set(license.technician_id, [
        ...(map.get(license.technician_id) ?? []),
        license,
      ]);
    }

    return map;
  }, [activeLicenses]);
  const expiringCredentialCount = useMemo(
    () =>
      activeLicenses.filter(
        (license) =>
          license.status === "expiring_soon" ||
          (license.expires_at &&
            new Date(license.expires_at).getTime() <=
              Date.now() + 45 * 24 * 60 * 60 * 1000 &&
            new Date(license.expires_at).getTime() >= Date.now()),
      ).length,
    [activeLicenses],
  );

  function updateForm(update: Partial<TechnicianInviteInput>) {
    setForm((current) => ({
      ...current,
      ...update,
    }));
  }

  function updateCredentialForm(update: Partial<TechnicianLicenseInput>) {
    setCredentialForm((current) => ({
      ...current,
      ...update,
    }));
  }

  function resetCredentialForm() {
    setCredentialForm({
      ...emptyCredentialForm,
      technician_id: visibleTechnicians[0]?.id ?? "",
    });
    setEditingCredentialId(null);
    setCredentialArchiveConfirmationId(null);
  }

  function editCredential(license: TechnicianLicense) {
    setCredentialError(null);
    setCredentialMessage(null);
    setCredentialArchiveConfirmationId(null);
    setEditingCredentialId(license.id);
    setCredentialForm({
      branch: license.branch,
      expires_at: license.expires_at ?? "",
      issuing_authority: license.issuing_authority,
      license_number: license.license_number,
      license_type: license.license_type,
      notes: license.notes ?? "",
      status: license.status,
      technician_id: license.technician_id,
    });
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

  async function submitCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredentialError(null);
    setCredentialMessage(null);

    try {
      const input = validateTechnicianLicenseInput({
        ...credentialForm,
        technician_id:
          credentialForm.technician_id || visibleTechnicians[0]?.id || "",
      });

      if (editingCredentialId) {
        await updateTechnicianLicense.mutateAsync({
          id: editingCredentialId,
          input,
        });
        setCredentialMessage("Credential updated for review.");
      } else {
        await createTechnicianLicense.mutateAsync(input);
        setCredentialMessage("Credential saved for review.");
      }

      resetCredentialForm();
    } catch (error) {
      setCredentialError(
        error instanceof Error ? error.message : "Unable to save credential",
      );
    }
  }

  function requestArchiveCredential(licenseId: string) {
    setCredentialArchiveConfirmationId(licenseId);
  }

  async function confirmArchiveCredential(licenseId: string) {
    setCredentialError(null);
    setCredentialMessage(null);

    try {
      await archiveTechnicianLicense.mutateAsync(licenseId);
      setCredentialMessage("Credential archived for review.");
    } catch (error) {
      setCredentialError(
        error instanceof Error ? error.message : "Unable to archive credential",
      );
    }
  }

  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-theme-text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-theme-text-primary">
            Technicians
          </h1>
        </div>
        <input
          aria-label="Search technicians"
          className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search technicians"
          value={search}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          detail="Available in demo roster"
          label="Active techs"
          tone="success"
          value={activeTechnicianCount}
        />
        <StatTile
          detail="Scheduled route work"
          label="Assigned today"
          tone="warning"
          value={assignedTodayCount}
        />
        <StatTile
          detail="Future assigned jobs"
          label="Upcoming"
          tone="info"
          value={upcomingAssignedCount}
        />
        <StatTile
          detail="Ready for dispatch"
          label="No route today"
          tone="neutral"
          value={noRouteTodayCount}
        />
        <StatTile
          detail="45-day expiration review"
          label="Expiring credentials"
          tone={expiringCredentialCount > 0 ? "warning" : "success"}
          value={expiringCredentialCount}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          <div>
            <Eyebrow tone="accent">Technician roster</Eyebrow>
            <h2 className="mt-1 text-2xl font-bold text-theme-text-primary">
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
              const technicianLicenses =
                licensesByTechnician.get(technician.id) ?? [];
              const credentialSummary = getBranchCredentialSummary(
                technician,
                activeLicenses,
              );
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
                          <h2 className="text-lg font-semibold text-theme-text-primary">
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
                          <div className="mt-4 rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-semibold text-theme-text-primary">
                                Credential tracking
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <StatusPill
                                  dot={false}
                                  tone={credentialTone(
                                    credentialSummary.branch2.status,
                                  )}
                                >
                                  Branch 2 {credentialSummary.branch2.summary}
                                </StatusPill>
                                <StatusPill
                                  dot={false}
                                  tone={credentialTone(
                                    credentialSummary.branch3.status,
                                  )}
                                >
                                  Branch 3 {credentialSummary.branch3.summary}
                                </StatusPill>
                              </div>
                            </div>
                            {technicianLicenses.length === 0 ? (
                              <p className="mt-3 text-sm text-theme-text-secondary">
                                No license evidence on record
                              </p>
                            ) : (
                              <details
                                className="group mt-3 rounded-md border border-theme-border-subtle"
                              >
                                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-theme-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
                                  Credential details
                                </summary>
                                <div className="grid gap-2 border-t border-theme-border-subtle bg-theme-background-surface p-2">
                                  {technicianLicenses.map((license) => (
                                    <div
                                      className="rounded-md border border-theme-border-default bg-theme-background-surface p-3 text-sm"
                                      key={license.id}
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="font-semibold text-theme-text-primary">
                                            {license.license_number}
                                          </p>
                                          <p className="mt-1 text-theme-text-secondary">
                                            {licenseBranchLabel(license.branch)} |{" "}
                                            {licenseTypeLabel(
                                              license.license_type,
                                            )}
                                          </p>
                                          <p className="mt-1 text-xs text-theme-text-muted">
                                            Expires{" "}
                                            {compactDate(license.expires_at)}
                                          </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <div className="flex flex-wrap gap-2">
                                            <StatusPill
                                              dot={false}
                                              tone={credentialTone(
                                                license.status,
                                              )}
                                            >
                                              {license.status.replace(/_/g, " ")}
                                            </StatusPill>
                                            <button
                                              aria-label={`Edit credential ${license.license_number}`}
                                              className={buttonClassName({
                                                size: "sm",
                                                variant: "ghost",
                                              })}
                                              onClick={() =>
                                                editCredential(license)
                                              }
                                              type="button"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              aria-label={`Archive credential ${license.license_number}`}
                                              className={buttonClassName({
                                                size: "sm",
                                                variant: "ghost",
                                              })}
                                              onClick={() =>
                                                requestArchiveCredential(
                                                  license.id,
                                                )
                                              }
                                              type="button"
                                            >
                                              Archive
                                            </button>
                                          </div>
                                          {credentialArchiveConfirmationId ===
                                          license.id ? (
                                            <div
                                              aria-label={`Confirm archive for ${license.license_number}`}
                                              className="rounded-md border border-status-alert-warning-border bg-status-alert-warning-bg p-3 text-sm"
                                            >
                                              <p className="font-semibold text-status-alert-warning-fg">
                                                Archive this credential?
                                              </p>
                                              <p className="mt-1 text-status-alert-warning-fg">
                                                Archiving removes this license from
                                                active review and prevents it from
                                                being used in scheduling checks.
                                              </p>
                                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                <Button
                                                  disabled={
                                                    archiveTechnicianLicense.isPending
                                                  }
                                                  onClick={() =>
                                                    setCredentialArchiveConfirmationId(
                                                      null,
                                                    )
                                                  }
                                                  size="sm"
                                                  variant="ghost"
                                                >
                                                  Cancel archive
                                                </Button>
                                                <Button
                                                  disabled={
                                                    archiveTechnicianLicense.isPending
                                                  }
                                                  onClick={() =>
                                                    void confirmArchiveCredential(
                                                      license.id,
                                                    )
                                                  }
                                                  size="sm"
                                                  variant="danger"
                                                >
                                                  Confirm archive
                                                </Button>
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
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

        <div className="flex h-fit flex-col gap-4">
          <form
            className="flex flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitTechnician}
          >
            <div>
              <h2 className="text-xl font-semibold text-theme-text-primary">
                Invite technician
              </h2>
            </div>

            <div
              className={`rounded-md border p-3 ${statusSurfaceClassName(
                "info",
              )}`}
            >
              <p className="text-sm font-bold text-theme-text-primary">
                Technician access handoff
              </p>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Sends a password setup link through the configured email
                delivery path.
              </p>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Confirm the email, send the invite, then open dispatch to assign
                the first route.
              </p>
              <a
                className={buttonClassName({
                  className:
                    "mt-3 border-status-alert-info-border text-status-alert-info-fgStrong hover:bg-status-alert-info-bg",
                  size: "sm",
                  variant: "ghost",
                })}
                href="/dispatch"
              >
                Open dispatch after invite
              </a>
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

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Display name
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateForm({ display_name: event.target.value })
                }
                placeholder="Testnician"
                value={form.display_name ?? ""}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Email
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
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
          <form
            className="flex flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitCredential}
          >
            <div>
              <h2 className="text-xl font-semibold text-theme-text-primary">
                Credential tracking
              </h2>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Add branch license evidence for internal credential review.
              </p>
            </div>

            {technicianLicensesQuery.setupWarning ? (
              <p
                className={`rounded-md border p-3 text-sm ${statusSurfaceClassName(
                  "warning",
                )}`}
              >
                {technicianLicensesQuery.setupWarning}
              </p>
            ) : null}

            {credentialError ? (
              <p
                className={`rounded-md border p-3 text-sm text-status-alert-danger-fg ${statusSurfaceClassName(
                  "danger",
                )}`}
              >
                {credentialError}
              </p>
            ) : null}

            {credentialMessage ? (
              <p
                className={`rounded-md border p-3 text-sm text-status-alert-success-fg ${statusSurfaceClassName(
                  "success",
                )}`}
              >
                {credentialMessage}
              </p>
            ) : null}

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Credential technician
              <select
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({ technician_id: event.target.value })
                }
                value={
                  credentialForm.technician_id ||
                  visibleTechnicians[0]?.id ||
                  ""
                }
              >
                {selectedCredentialTechnician &&
                !visibleTechnicians.some(
                  (technician) =>
                    technician.id === selectedCredentialTechnician.id,
                ) ? (
                  <option
                    hidden
                    value={selectedCredentialTechnician.id}
                  >
                    {getTechnicianLabel(selectedCredentialTechnician)}
                  </option>
                ) : null}
                {visibleTechnicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {getTechnicianLabel(technician)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              License type
              <select
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({
                    license_type: event.target.value as TechnicianLicenseType,
                  })
                }
                value={credentialForm.license_type}
              >
                {licenseTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Credential branch
              <select
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({
                    branch: event.target.value as TechnicianLicenseBranch,
                  })
                }
                value={credentialForm.branch}
              >
                {licenseBranchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              License number
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({ license_number: event.target.value })
                }
                value={credentialForm.license_number}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Expiration date
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({ expires_at: event.target.value })
                }
                type="date"
                value={credentialForm.expires_at ?? ""}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Issuing authority
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({
                    issuing_authority: event.target.value,
                  })
                }
                value={credentialForm.issuing_authority ?? ""}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Credential status
              <select
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({
                    status: event.target.value as TechnicianLicenseStatus,
                  })
                }
                value={credentialForm.status ?? "active"}
              >
                {licenseStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Credential notes
              <textarea
                className="min-h-20 rounded-md border border-theme-border-default px-3 py-2 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  updateCredentialForm({ notes: event.target.value })
                }
                value={credentialForm.notes ?? ""}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  createTechnicianLicense.isPending ||
                  updateTechnicianLicense.isPending
                }
                type="submit"
              >
                {editingCredentialId ? "Update credential" : "Save credential"}
              </Button>
              {editingCredentialId ? (
                <button
                  className={buttonClassName({ variant: "ghost" })}
                  onClick={resetCredentialForm}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
