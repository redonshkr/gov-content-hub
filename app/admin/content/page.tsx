import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";
import { createDraftAction } from "./actions";
import { ContentType } from "@prisma/client";

export default async function AdminContentListPage() {
  const session = await auth();
  requireRole(session, ["AUTHOR", "EDITOR", "PUBLISHER", "ADMIN"]);

  const items = await prisma.contentItem.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      currentRevision: {
        select: { revisionNumber: true },
      },
    },
  });

  async function createNews() {
    "use server";
    await createDraftAction(ContentType.NEWS);
  }

  async function createPolicy() {
    "use server";
    await createDraftAction(ContentType.POLICY);
  }

  async function createService() {
    "use server";
    await createDraftAction(ContentType.SERVICE);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Content</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <form action={createNews}>
          <button type="submit">+ New News Draft</button>
        </form>

        <form action={createPolicy}>
          <button type="submit">+ New Policy Draft</button>
        </form>

        <form action={createService}>
          <button type="submit">+ New Service Draft</button>
        </form>
      </div>

      {items.length === 0 ? (
        <p>No content yet. Create your first draft above.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 800,
            }}
          >
            <thead>
              <tr>
                <th style={th}>Type</th>
                <th style={th}>Status</th>
                <th style={th}>Slug</th>
                <th style={th}>Current rev</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={td}>{item.type}</td>
                  <td style={td}>{item.status}</td>
                  <td style={td}>
                    <code>{item.slug}</code>
                  </td>
                  <td style={td}>
                    {item.currentRevision?.revisionNumber
                      ? `#${item.currentRevision.revisionNumber}`
                      : "(none)"}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <Link href={`/admin/content/${item.id}/edit`}>Edit</Link>
                      <Link href={`/admin/content/${item.id}/revisions`}>
                        Revisions
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Link href="/admin">Back to admin</Link>
      </div>
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #333",
  padding: "10px 8px",
  fontWeight: 600,
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #222",
  padding: "10px 8px",
  verticalAlign: "top",
};
