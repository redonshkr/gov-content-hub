"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/rbac";
import { ContentStatus, ContentType } from "@prisma/client";

type SessionLike = any;

async function getOrCreateAppUser(session: SessionLike) {
    const email: string | null = session?.user?.email ?? null;
    if (!email) return null;

    const name: string | null = session?.user?.name ?? null;
    const image: string | null = session?.user?.image ?? null;

    // Upsert so submittedBy/feedback always has a user id when email exists
    const user = await prisma.appUser.upsert({
        where: { email },
        update: {
            name: name ?? undefined,
            image: image ?? undefined,
        },
        create: {
            email,
            name: name ?? undefined,
            image: image ?? undefined,
        },
        select: { id: true, email: true },
    });

    return user; // { id, email }
}

export async function loadItemWithCurrent(itemId: string) {
    return prisma.contentItem.findUnique({
        where: { id: itemId },
        include: { currentRevision: true },
    });
}

function validateRequired(type: ContentType, data: any) {
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
        const validSteps = steps.filter((s: unknown) => typeof s === "string" && s.trim().length > 0);
        if (validSteps.length === 0) errors.push("At least 1 step is required");
    }

    return errors;
}

export async function submitForReview(itemId: string) {
    const session = await auth();
    requireRole(session, ["AUTHOR", "EDITOR", "PUBLISHER", "ADMIN"]);

    const appUser = await getOrCreateAppUser(session);

    const item = await loadItemWithCurrent(itemId);
    if (!item) throw new Error("Content item not found");

    if (
        item.status !== ContentStatus.DRAFT &&
        item.status !== ContentStatus.AWAITING_CHANGES
    ) {
        throw new Error("Must be DRAFT or AWAITING_CHANGES to submit");
    }


    const data = (item.currentRevision?.data as any) ?? {};
    const errors = validateRequired(item.type, data);
    if (errors.length) throw new Error(`Cannot submit: ${errors.join(", ")}`);

    await prisma.$transaction(async (tx) => {
        // Resolve any open feedback when resubmitting (optional but clean)
        await tx.reviewFeedback.updateMany({
            where: { itemId, resolvedAt: null },
            data: { resolvedAt: new Date(), resolvedByUserId: appUser?.id ?? null },
        });

        await tx.contentItem.update({
            where: { id: itemId },
            data: {
                status: ContentStatus.IN_REVIEW,
                submittedAt: new Date(),
                submittedByUserId: appUser?.id ?? null,
            },
        });
    });
}

export async function approve(itemId: string) {
    const session = await auth();
    requireRole(session, ["EDITOR", "PUBLISHER", "ADMIN"]);

    const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { status: true } });
    if (!item) throw new Error("Content item not found");
    if (item.status !== ContentStatus.IN_REVIEW) throw new Error("Must be IN_REVIEW to approve");

    await prisma.contentItem.update({
        where: { id: itemId },
        data: { status: ContentStatus.APPROVED },
    });
}

export async function publish(itemId: string) {
    const session = await auth();
    requireRole(session, ["PUBLISHER", "ADMIN"]);

    const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { status: true } });
    if (!item) throw new Error("Content item not found");
    if (item.status !== ContentStatus.APPROVED) throw new Error("Must be APPROVED to publish");

    await prisma.contentItem.update({
        where: { id: itemId },
        data: { status: ContentStatus.PUBLISHED, publishedAt: new Date() },
    });
}

export async function requestChanges(itemId: string, message: string) {
    const session = await auth();
    requireRole(session, ["EDITOR", "PUBLISHER", "ADMIN"]);

    const appUser = await getOrCreateAppUser(session);

    const item = await prisma.contentItem.findUnique({
        where: { id: itemId },
        select: { status: true },
    });
    if (!item) throw new Error("Content item not found");
    if (item.status !== ContentStatus.IN_REVIEW) throw new Error("Must be IN_REVIEW to request changes");

    const trimmed = (message ?? "").trim();
    if (!trimmed) throw new Error("Feedback message is required");

    await prisma.$transaction(async (tx) => {
        await tx.reviewFeedback.create({
            data: {
                itemId,
                message: trimmed,
                createdByUserId: appUser?.id ?? null,
            },
        });

        await tx.contentItem.update({
            where: { id: itemId },
            data: {
                status: ContentStatus.AWAITING_CHANGES,
                submittedAt: null,
                submittedByUserId: null,
            },
        });
    });
}

export async function sendBackToDraft(itemId: string) {
    // (Optional legacy helper if you still use it anywhere)
    const session = await auth();
    requireRole(session, ["EDITOR", "PUBLISHER", "ADMIN"]);

    const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { status: true } });
    if (!item) throw new Error("Content item not found");
    if (item.status !== ContentStatus.IN_REVIEW) throw new Error("Must be IN_REVIEW to send back");

    await prisma.contentItem.update({
        where: { id: itemId },
        data: {
            status: ContentStatus.DRAFT,
            submittedAt: null,
            submittedByUserId: null,
        },
    });
}

export async function archive(itemId: string) {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    await prisma.contentItem.update({
        where: { id: itemId },
        data: { status: ContentStatus.ARCHIVED },
    });
}

export async function restoreToDraft(itemId: string) {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { status: true } });
    if (!item) throw new Error("Content item not found");
    if (item.status !== ContentStatus.ARCHIVED) throw new Error("Item is not archived");

    await prisma.contentItem.update({
        where: { id: itemId },
        data: { status: ContentStatus.DRAFT, publishedAt: null },
    });
}
