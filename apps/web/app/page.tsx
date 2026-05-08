import { translations } from "@pest-patrol/i18n";
import {
  getDemoWorkflowSteps,
  getProductionSmokeChecklist,
  getRemainingProductionReadinessActions,
} from "@pest-patrol/domain";
import Link from "next/link";

const roadmapItems = [
  { href: "/customers", label: "Customers" },
  { href: "/jobs", label: "Jobs" },
  { href: "/dispatch", label: "Dispatch" },
  { href: "/inventory", label: "Inventory" },
  { href: "/closeouts", label: "Closeouts" },
  { href: "/payments", label: "Payments" },
  { href: "/automation", label: "Automation" },
];

export default function HomePage() {
  const demoWorkflowSteps = getDemoWorkflowSteps();
  const productionSmokeChecklist = getProductionSmokeChecklist();
  const remainingReadinessActions = getRemainingProductionReadinessActions();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Operations platform
        </p>
        <h1 className="max-w-3xl text-4xl font-bold text-neutralDark">
          {translations.en.dashboard.title}
        </h1>
        <p className="max-w-2xl text-lg text-gray-600">
          Offline-first pest control operations for dispatchers, technicians,
          and customers.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {roadmapItems.map((item) => (
          <Link
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-md"
            href={item.href}
            key={item.href}
          >
            <p className="text-sm font-semibold text-primary">{item.label}</p>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Demo readiness
          </p>
          <h2 className="text-2xl font-bold text-neutralDark">
            Ops demo command center
          </h2>
          <p className="max-w-3xl text-sm text-gray-600">
            Use live production data intentionally. This walkthrough keeps the
            demo focused on records you are comfortable keeping or archiving
            later.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Manual smoke checklist
            </p>
            <h3 className="mt-2 text-base font-semibold text-neutralDark">
              Readiness snapshot
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {productionSmokeChecklist.length} operator-run checks ready for
              live-data demos.
            </p>
          </div>
          {remainingReadinessActions.map((action) => (
            <div
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              key={action.id}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Dashboard action
              </p>
              <h3 className="mt-2 text-base font-semibold text-neutralDark">
                {action.label}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{action.action}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          {demoWorkflowSteps.map((step, index) => (
            <Link
              className="flex min-h-64 flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
              href={step.href}
              key={step.id}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {step.label}
                </p>
                <p className="mt-2 text-sm text-gray-600">{step.summary}</p>
              </div>
              <div className="flex flex-1 flex-col justify-end gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Route
                  </p>
                  <p className="mt-1 font-semibold text-neutralDark">
                    {step.routeLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </p>
                  <p className="mt-1 text-gray-600">{step.action}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Success signal
                  </p>
                  <p className="mt-1 text-gray-600">{step.successSignal}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
