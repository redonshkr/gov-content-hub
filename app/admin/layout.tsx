import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const roles = (session.user as any)?.roles ?? [];
  const has = (r: string) => roles.includes(r);

  const canContent =
    has("AUTHOR") || has("EDITOR") || has("PUBLISHER") || has("ADMIN");
  const canReview = has("EDITOR") || has("PUBLISHER") || has("ADMIN");
  const canPublish = has("PUBLISHER") || has("ADMIN");
  const canUsers = has("ADMIN");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          padding: 16,
          borderRight: "1px solid #333",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Admin</h2>
        <p style={{ fontSize: 12, opacity: 0.8, marginTop: 0 }}>
          {session.user?.email}
        </p>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {canContent && <Link href="/admin/content">Content</Link>}
          {canReview && <Link href="/admin/review">Review queue</Link>}
          {canPublish && <Link href="/admin/publish">Publishing</Link>}
          {canUsers && <Link href="/admin/users">Users</Link>}

          <hr style={{ width: "100%", opacity: 0.3 }} />
          <Link href="/admin">Dashboard</Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
