import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";

export default async function AdminUsersPage() {
  const session = await auth();
  requireRole(session, ["ADMIN"]);

  return (
    <main style={{ padding: 24 }}>
      <h1>User Management</h1>
      <p>Allowed: ADMIN only</p>
    </main>
  );
}
