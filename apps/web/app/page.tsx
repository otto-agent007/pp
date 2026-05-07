import { translations } from "@pest-patrol/i18n";
import { getDemoWorkflowSteps } from "@pest-patrol/domain";
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
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Demo readiness
          </p>
          <h2 className="mt-1 text-2xl font-bold text-neutralDark">
            Demo workflow
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Use this live-data path for a concise customer-to-closeout
            walkthrough. Add only the records you want to keep.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {demoWorkflowSteps.map((step, index) => (
            <Link
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
              href={step.href}
              key={step.id}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary">
                {step.label}
              </p>
              <p className="mt-2 text-sm text-gray-600">{step.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
