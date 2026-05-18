import { UpdatePasswordClient } from "./update-password-client";

// Vercel local packaging expects this auth handoff route to map to a lambda.
export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient />;
}
