import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";
import EditClient from "./EditClient";

export default async function EditContentPage(props: { params: any }) {
  const session = await auth();
  requireRole(session, ["AUTHOR", "EDITOR", "PUBLISHER", "ADMIN"]);

  const roles: string[] = (session?.user as any)?.roles ?? [];
  const { id } = await props.params;

  if (!id) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Bad URL</h1>
        <p>Missing content id in route.</p>
        <Link href="/admin/content">Back to content</Link>
      </main>
    );
  }

  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: {
      currentRevision: true,
      feedback: {
        where: { resolvedAt: null },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!item) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Not found</h1>
        <p>Content item does not exist.</p>
        <Link href="/admin/content">Back to content</Link>
      </main>
    );
  }

  const currentData = (item.currentRevision?.data as any) ?? {};

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Edit</h1>
        <span style={{ opacity: 0.7 }}>
          {item.type} • {item.status} • slug: <code>{item.slug}</code>
        </span>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={`/admin/content/${item.id}/revisions`}>View revisions</Link>
        <Link href="/admin/content">Back to content list</Link>
      </div>

      {item.feedback.length > 0 && (
        <section
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #333",
            borderRadius: 8,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Reviewer feedback</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {item.feedback.map((f) => (
              <li key={f.id} style={{ marginBottom: 10 }}>
                <div>{f.message}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {f.createdBy?.name || f.createdBy?.email || "Reviewer"} •{" "}
                  {new Date(f.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <EditClient
        itemId={item.id}
        type={item.type}
        status={item.status}
        currentRevisionNumber={item.currentRevision?.revisionNumber ?? null}
        initialData={currentData}
        roles={roles}
      />
    </main>
  );
}
