import { CustomerPortalClient } from "./portal-client";

export default async function CustomerPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ access_token?: string | string[] }>;
}) {
  const { customerId } = await params;
  const { access_token: accessTokenParam } = await searchParams;
  const accessToken = Array.isArray(accessTokenParam)
    ? accessTokenParam[0] ?? ""
    : accessTokenParam ?? "";

  return <CustomerPortalClient accessToken={accessToken} customerId={customerId} />;
}
