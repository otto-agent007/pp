import { CustomerPortalClient } from "./portal-client";
import { PortalSessionExchange } from "./portal-session-exchange";

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
    // Rendering this page performs no session mutation on its own — the
    // actual grant exchange only fires from client-side JS below, so a
    // stateless GET (link-preview crawlers, email scanners) can no longer
    // burn a customer's one-time portal link.
    return <PortalSessionExchange customerId={customerId} grant={grant} />;
  }

  return <CustomerPortalClient customerId={customerId} />;
}
