"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ContentType, ContentStatus } from "@prisma/client";

function makeSlug(type: ContentType) {
  const prefix = type.toLowerCase(); // "news" | "policy" | "service"
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

function defaultDataForType(type: ContentType) {
  if (type === ContentType.NEWS) return { title: "", summary: "", body: "" };
  if (type === ContentType.POLICY) return { title: "", body: "" };
  return { title: "", steps: [] as string[] }; // SERVICE
}

/**
 * Creates a ContentItem + ContentRevision #1, sets currentRevisionId,
 * then redirects to /admin/content/:id/edit
 */
export async function createDraftAction(type: ContentType) {
  const session = await auth();
  const email = session?.user?.email ?? null;

  const appUser = email
    ? await prisma.appUser.findUnique({ where: { email }, select: { id: true } })
    : null;

  const slug = makeSlug(type);
  const data = defaultDataForType(type);

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.contentItem.create({
      data: {
        type,
        slug,
        status: ContentStatus.DRAFT,
        createdByUserId: appUser?.id ?? null,
      },
      select: { id: true },
    });

    const rev = await tx.contentRevision.create({
      data: {
        itemId: item.id,
        revisionNumber: 1,
        changeSummary: "Initial draft",
        data,
        createdByUserId: appUser?.id ?? null,
      },
      select: { id: true },
    });

    await tx.contentItem.update({
      where: { id: item.id },
      data: { currentRevisionId: rev.id },
      select: { id: true },
    });

    return item;
  });

  redirect(`/admin/content/${created.id}/edit`);
}
