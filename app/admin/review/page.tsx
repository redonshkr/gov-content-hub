import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";

export default async function AdminReviewPage() {
  const session = await auth();
  requireRole(session, ["EDITOR", "PUBLISHER", "ADMIN"]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Review Queue</h1>
      <p>Allowed: EDITOR, PUBLISHER, ADMIN</p>
    </main>
  );
}
