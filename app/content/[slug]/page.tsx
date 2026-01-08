import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PublicContentPage({ params }: { params: any }) {
  const { slug } = await params;
  if (!slug) notFound();

  const item = await prisma.contentItem.findUnique({
    where: { slug },
    select: {
      status: true,
      type: true,
      slug: true,
      publishedAt: true,
      currentRevision: { select: { data: true } },
    },
  });

  // ✅ key rule: drafts/review never render publicly
  if (!item || item.status !== "PUBLISHED") notFound();

  const data = (item.currentRevision?.data as any) ?? {};

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <p style={{ opacity: 0.7 }}>
        {item.type} •{" "}
        {item.publishedAt ? item.publishedAt.toISOString() : "Published"}
      </p>

      <h1>{data.title ?? item.slug}</h1>
      {data.summary && <p style={{ fontSize: 18 }}>{data.summary}</p>}

      {data.body && <div style={{ whiteSpace: "pre-wrap" }}>{data.body}</div>}

      {Array.isArray(data.steps) && data.steps.length > 0 && (
        <>
          <h2>Steps</h2>
          <ol>
            {data.steps.map((s: string, i: number) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
