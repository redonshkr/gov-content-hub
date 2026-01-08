import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";

export default async function AdminContentPage() {
  const session = await auth();
  requireRole(session, ["AUTHOR", "EDITOR", "PUBLISHER", "ADMIN"]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Content</h1>
      <p>Allowed: AUTHOR, EDITOR, PUBLISHER, ADMIN</p>
    </main>
  );
}
