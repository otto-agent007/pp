import { CustomersClient } from "./customers-client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const requestedCustomerId = Array.isArray(params.customer_id)
    ? (params.customer_id[0] ?? null)
    : (params.customer_id ?? null);

  return <CustomersClient requestedCustomerId={requestedCustomerId} />;
}
