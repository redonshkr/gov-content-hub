import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";

export default async function RevisionsPage(props: { params: any }) {
  const session = await auth();
  requireRole(session, ["AUTHOR", "EDITOR", "PUBLISHER", "ADMIN"]);

  // ✅ Works whether params is an object OR a Promise
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
    select: {
      id: true,
      type: true,
      slug: true,
      status: true,
      currentRevisionId: true,
      revisions: {
        orderBy: { revisionNumber: "desc" },
        select: {
          id: true,
          revisionNumber: true,
          changeSummary: true,
          createdAt: true,
        },
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

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Revisions</h1>

      <p style={{ opacity: 0.8 }}>
        {item.type} • {item.status} • slug: <code>{item.slug}</code>
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <Link href={`/admin/content/${item.id}/edit`}>Back to edit</Link>
        <Link href="/admin/content">Back to content list</Link>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {item.revisions.length === 0 ? (
        <p>No revisions yet.</p>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {item.revisions.map((r) => {
            const isCurrent = r.id === item.currentRevisionId;
            return (
              <li key={r.id} style={{ marginBottom: 10 }}>
                <div>
                  <b>Revision #{r.revisionNumber}</b>{" "}
                  {isCurrent && <span style={{ marginLeft: 8 }}>(current)</span>}
                </div>
                <div style={{ opacity: 0.8, fontSize: 13 }}>
                  {r.createdAt.toISOString()} • {r.changeSummary || "(no summary)"}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
