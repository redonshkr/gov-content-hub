import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";

export default async function AdminPublishPage() {
  const session = await auth();
  requireRole(session, ["PUBLISHER", "ADMIN"]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Publishing</h1>
      <p>Allowed: PUBLISHER, ADMIN</p>
    </main>
  );
}
