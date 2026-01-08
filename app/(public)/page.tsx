import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const items = await prisma.contentItem.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      type: true,
      slug: true,
      publishedAt: true,
      currentRevision: { select: { data: true } },
    },
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Published content</h1>

      {items.length === 0 ? (
        <p>No published content yet.</p>
      ) : (
        <ul>
          {items.map((it) => {
            const data = (it.currentRevision?.data as any) ?? {};
            const title = data.title ?? it.slug;

            return (
              <li key={it.id}>
                <Link href={`/content/${it.slug}`}>{title}</Link>{" "}
                <span style={{ opacity: 0.7 }}>
                  ({it.type})
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p style={{ marginTop: 16 }}>
        <Link href="/admin">Admin</Link>
      </p>
    </main>
  );
}
