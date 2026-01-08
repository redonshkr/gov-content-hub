import Link from "next/link";
import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { approve, requestChanges } from "../content/[id]/workflow/actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function AdminReviewPage() {
  const session = await auth();
  requireRole(session, ["EDITOR", "PUBLISHER", "ADMIN"]);

  const items = await prisma.contentItem.findMany({
    where: { status: "IN_REVIEW" },
    orderBy: { submittedAt: "desc" },
    include: {
      submittedBy: true,
      currentRevision: true,
    },
  });

  async function doApprove(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;

    await approve(id);
    revalidatePath("/admin/review");
    redirect("/admin/review");
  }

  async function doRequestChanges(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const feedback = String(formData.get("feedback") ?? "");
    if (!id) return;

    await requestChanges(id, feedback);
    revalidatePath("/admin/review");
    redirect("/admin/review");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Review Queue</h1>
      <p style={{ opacity: 0.75, marginTop: 4 }}>
        Items currently <b>IN_REVIEW</b>
      </p>

      <div style={{ marginTop: 12 }}>
        <Link href="/admin/content">← Back to content list</Link>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {items.length === 0 ? (
        <p>No items in review.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid #333" }}>Title</th>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid #333" }}>Type</th>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid #333" }}>Submitted by</th>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid #333" }}>Submitted at</th>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid #333" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const data = (item.currentRevision?.data as any) ?? {};
              const title =
                typeof data?.title === "string" && data.title.trim()
                  ? data.title.trim()
                  : "(no title)";

              const submittedBy =
                item.submittedBy?.name || item.submittedBy?.email || "(unknown)";

              const submittedAt = item.submittedAt
                ? new Date(item.submittedAt).toLocaleString()
                : "-";

              return (
                <tr key={item.id}>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid #222" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <Link href={`/admin/content/${item.id}/edit`}>
                        <b>{title}</b>
                      </Link>
                      <span style={{ opacity: 0.7 }}>
                        slug: <code>{item.slug}</code>
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "10px 6px", borderBottom: "1px solid #222" }}>
                    {item.type}
                  </td>

                  <td style={{ padding: "10px 6px", borderBottom: "1px solid #222" }}>
                    {submittedBy}
                  </td>

                  <td style={{ padding: "10px 6px", borderBottom: "1px solid #222" }}>
                    {submittedAt}
                  </td>

                  <td style={{ padding: "10px 6px", borderBottom: "1px solid #222" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <form action={doApprove}>
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit">Approve</button>
                        </form>

                        <Link href={`/admin/content/${item.id}/revisions`}>Revisions</Link>
                      </div>

                      <form action={doRequestChanges} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          name="feedback"
                          placeholder="Feedback for author…"
                          style={{ minWidth: 320 }}
                        />
                        <button type="submit">Request changes</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
