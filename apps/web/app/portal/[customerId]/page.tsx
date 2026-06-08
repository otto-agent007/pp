import { redirect } from "next/navigation";

import { CustomerPortalClient } from "./portal-client";

export default async function CustomerPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ grant?: string | string[] }>;
}) {
  const { customerId } = await params;
  const { grant: grantParam } = await searchParams;
  const grant = Array.isArray(grantParam)
    ? grantParam[0] ?? ""
    : grantParam ?? "";

  if (grant.trim()) {
    redirect(
      `/api/portal/${encodeURIComponent(customerId)}/sessions?grant=${encodeURIComponent(grant)}`,
    );
  }

  return <CustomerPortalClient customerId={customerId} />;
}
