"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ContentType } from "@prisma/client";

/**
 * Basic required-field validation (server-side safety net).
 * The client popup prevents most invalid submits, but keep this anyway.
 */
function validate(type: ContentType, data: any) {
  const errors: string[] = [];

  const title = typeof data?.title === "string" ? data.title.trim() : "";
  if (!title) errors.push("Title is required");

  if (type === "NEWS") {
    const summary = typeof data?.summary === "string" ? data.summary.trim() : "";
    const body = typeof data?.body === "string" ? data.body.trim() : "";
    if (!summary) errors.push("Summary is required");
    if (!body) errors.push("Body is required");
  }

  if (type === "POLICY") {
    const body = typeof data?.body === "string" ? data.body.trim() : "";
    if (!body) errors.push("Body is required");
  }

  if (type === "SERVICE") {
    const steps = Array.isArray(data?.steps) ? data.steps : [];
    const validSteps = steps.filter((s: any) => typeof s === "string" && s.trim());
    if (validSteps.length === 0) errors.push("At least 1 step is required");
  }

  return errors;
}

/**
 * Optional helper (you can still use it elsewhere).
 * Creates a new revision and updates currentRevisionId.
 */
export async function saveRevisionAction(args: {
  itemId: string;
  type: ContentType;
  data: any;
  changeSummary?: string;
}) {
  const session = await auth();
  const email = session?.user?.email ?? null;

  const appUser = email
    ? await prisma.appUser.findUnique({ where: { email }, select: { id: true } })
    : null;

  const latest = await prisma.contentRevision.findFirst({
    where: { itemId: args.itemId },
    orderBy: { revisionNumber: "desc" },
    select: { revisionNumber: true },
  });

  const nextNumber = (latest?.revisionNumber ?? 0) + 1;

  const newRev = await prisma.contentRevision.create({
    data: {
      itemId: args.itemId,
      revisionNumber: nextNumber,
      changeSummary: args.changeSummary,
      data: args.data,
      createdByUserId: appUser?.id ?? null,
    },
    select: { id: true },
  });

  await prisma.contentItem.update({
    where: { id: args.itemId },
    data: { currentRevisionId: newRev.id },
  });

  return { revisionId: newRev.id };
}

/**
 * MAIN server action used by EditClient form submissions.
 * IMPORTANT: does NOT save a revision when validation fails.
 */
export async function handleEditAction(
  _prevState: { ok: boolean; error?: string; ts?: number },
  formData: FormData
): Promise<{ ok: boolean; error?: string; ts: number }> {
  try {
    const session = await auth();
    if (!session) return { ok: false, error: "Not signed in", ts: Date.now() };

    const itemId = String(formData.get("itemId") ?? "");
    const intent = String(formData.get("intent") ?? "save");
    const type = String(formData.get("type") ?? "") as ContentType;

    if (!itemId) return { ok: false, error: "Missing itemId", ts: Date.now() };

    // Build data from submitted fields
    let data: any = {};
    if (type === "NEWS") {
      data = {
        title: String(formData.get("title") ?? "").trim(),
        summary: String(formData.get("summary") ?? "").trim(),
        body: String(formData.get("body") ?? "").trim(),
      };
    } else if (type === "POLICY") {
      data = {
        title: String(formData.get("title") ?? "").trim(),
        body: String(formData.get("body") ?? "").trim(),
      };
    } else {
      const stepsText = String(formData.get("stepsText") ?? "");
      const steps = stepsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      data = {
        title: String(formData.get("title") ?? "").trim(),
        steps,
      };
    }

    // Validate ONLY for forward workflow steps
    const requiresValidation =
      intent === "submit" || intent === "approve" || intent === "publish";

    if (requiresValidation) {
      const errors = validate(type, data);
      if (errors.length) return { ok: false, error: errors.join(", "), ts: Date.now() };
    }

    // Identify AppUser id (optional)
    const email = session?.user?.email ?? null;
    const appUser = email
      ? await prisma.appUser.findUnique({ where: { email }, select: { id: true } })
      : null;

    const changeSummary = String(formData.get("changeSummary") ?? "").trim();

    await prisma.$transaction(async (tx) => {
      const item = await tx.contentItem.findUnique({
        where: { id: itemId },
        select: { status: true },
      });
      if (!item) throw new Error("Item not found");

      // Save revision for: save/submit/approve/publish
      // Do NOT save revision for: archive/restore/sendBack
      const shouldSaveRevision =
        intent === "save" || intent === "submit" || intent === "approve" || intent === "publish";

      if (shouldSaveRevision) {
        // ✅ compute next revision number INSIDE the transaction
        const latest = await tx.contentRevision.findFirst({
          where: { itemId },
          orderBy: { revisionNumber: "desc" },
          select: { revisionNumber: true },
        });
        const revNo = (latest?.revisionNumber ?? 0) + 1;

        const rev = await tx.contentRevision.create({
          data: {
            itemId,
            revisionNumber: revNo,
            changeSummary: changeSummary || `Action: ${intent}`,
            data,
            createdByUserId: appUser?.id ?? null,
          },
          select: { id: true },
        });

        await tx.contentItem.update({
          where: { id: itemId },
          data: { currentRevisionId: rev.id },
        });
      }

      // Workflow transitions
      if (intent === "submit") {
        if (item.status !== "DRAFT") throw new Error("Must be DRAFT to submit");
        await tx.contentItem.update({
          where: { id: itemId },
          data: { status: "IN_REVIEW" },
        });
      }

      if (intent === "approve") {
        if (item.status !== "IN_REVIEW") throw new Error("Must be IN_REVIEW to approve");
        await tx.contentItem.update({
          where: { id: itemId },
          data: { status: "APPROVED" },
        });
      }

      if (intent === "publish") {
        if (item.status !== "APPROVED") throw new Error("Must be APPROVED to publish");
        await tx.contentItem.update({
          where: { id: itemId },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      }

      if (intent === "sendBack") {
        if (item.status !== "IN_REVIEW") throw new Error("Must be IN_REVIEW to send back");
        await tx.contentItem.update({
          where: { id: itemId },
          data: { status: "DRAFT" },
        });
      }

      if (intent === "archive") {
        await tx.contentItem.update({
          where: { id: itemId },
          data: { status: "ARCHIVED" },
        });
      }

      if (intent === "restore") {
        if (item.status !== "ARCHIVED") throw new Error("Item is not archived");
        await tx.contentItem.update({
          where: { id: itemId },
          data: { status: "DRAFT", publishedAt: null },
        });
      }
    });

    return { ok: true, ts: Date.now() };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ? String(e.message) : "Action failed",
      ts: Date.now(),
    };
  }
}
