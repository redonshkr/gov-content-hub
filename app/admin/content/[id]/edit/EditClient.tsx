"use client";

import {
    useActionState,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import type { ContentStatus, ContentType } from "@prisma/client";
import { handleEditAction } from "./actions";

type Props = {
    itemId: string;
    type: ContentType;
    status: ContentStatus;
    currentRevisionNumber: number | null;
    initialData: any;
    roles: string[];
};

function hasAny(roles: string[], allow: string[]) {
    return allow.some((r) => roles.includes(r));
}

function validateForIntent(type: ContentType, intent: string, data: any) {
    // Only block forward steps. Saving is allowed anytime.
    if (
        intent === "save" ||
        intent === "archive" ||
        intent === "restore" ||
        intent === "sendBack"
    ) {
        return [];
    }

    const errors: string[] = [];

    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) errors.push("Title is required");

    if (type === "NEWS") {
        const summary = typeof data.summary === "string" ? data.summary.trim() : "";
        const body = typeof data.body === "string" ? data.body.trim() : "";
        if (!summary) errors.push("Summary is required");
        if (!body) errors.push("Body is required");
    }

    if (type === "POLICY") {
        const body = typeof data.body === "string" ? data.body.trim() : "";
        if (!body) errors.push("Body is required");
    }

    if (type === "SERVICE") {
        const steps = Array.isArray(data.steps) ? data.steps : [];
        const validSteps = steps.filter(
            (s: any) => typeof s === "string" && s.trim()
        );
        if (validSteps.length === 0) errors.push("At least 1 step is required");
    }

    return errors;
}

export default function EditClient(props: Props) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement | null>(null);
    const [isPending, startTransition] = useTransition();

    // Keep what user types in state so refresh/error doesn't “wipe” inputs
    const [changeSummary, setChangeSummary] = useState("");

    const [title, setTitle] = useState(props.initialData?.title ?? "");
    const [summary, setSummary] = useState(props.initialData?.summary ?? "");
    const [body, setBody] = useState(props.initialData?.body ?? "");
    const [stepsText, setStepsText] = useState(
        Array.isArray(props.initialData?.steps)
            ? props.initialData.steps.join("\n")
            : ""
    );

    const [intent, setIntent] = useState<
        "save" | "submit" | "approve" | "publish" | "sendBack" | "archive" | "restore"
    >("save");

    const [popup, setPopup] = useState<{ title: string; lines: string[] } | null>(
        null
    );

    // Prevent double-click + “one render behind” issues
    const [submitting, setSubmitting] = useState(false);

    const data = useMemo(() => {
        if (props.type === "NEWS") return { title, summary, body };
        if (props.type === "POLICY") return { title, body };
        const steps = stepsText
        return { title, steps };
    }, [props.type, title, summary, body, stepsText]);

    // ✅ Server Action binding for client form
    const [state, formAction] = useActionState(handleEditAction, {
        ok: true,
        ts: 0,
    });

    useEffect(() => {
        if (!state) return;

        // stop “double click” window as soon as we receive a result
        setSubmitting(false);

        if (state.ok) {
            setPopup(null);
            router.refresh();
            return;
        }

        if (!state.ok && state.error) {
            setPopup({ title: "Workflow error", lines: [state.error] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.ts]);

    const canSubmit = hasAny(props.roles, [
        "AUTHOR",
        "EDITOR",
        "PUBLISHER",
        "ADMIN",
    ]);
    const canApprove = hasAny(props.roles, ["EDITOR", "PUBLISHER", "ADMIN"]);
    const canPublish = hasAny(props.roles, ["PUBLISHER", "ADMIN"]);
    const canAdmin = hasAny(props.roles, ["ADMIN"]);

    function runIntent(nextIntent: typeof intent) {
        setPopup(null);

        const errors = validateForIntent(props.type, nextIntent, data);
        if (errors.length) {
            setPopup({ title: "Missing required fields", lines: errors });
            return;
        }

        // lock buttons instantly
        setSubmitting(true);

        // ensure hidden input gets updated BEFORE submit
        flushSync(() => setIntent(nextIntent));

        startTransition(() => {
            formRef.current?.requestSubmit();
        });
    }

    function runSave() {
        setPopup(null);
        setSubmitting(true);
        flushSync(() => setIntent("save"));
        startTransition(() => {
            formRef.current?.requestSubmit();
        });
    }

    const disabled = isPending || submitting;

    return (
        <>
            {/* Popup */}
            {popup && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                        zIndex: 50,
                    }}
                    onClick={() => setPopup(null)}
                >
                    <div
                        style={{
                            background: "#111",
                            border: "1px solid #333",
                            borderRadius: 10,
                            padding: 16,
                            width: "min(520px, 100%)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginTop: 0 }}>{popup.title}</h3>
                        <ul style={{ margin: "8px 0 0 18px" }}>
                            {popup.lines.map((l, i) => (
                                <li key={i}>{l}</li>
                            ))}
                        </ul>
                        <div
                            style={{
                                marginTop: 14,
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button type="button" onClick={() => setPopup(null)}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form
                ref={formRef}
                action={formAction}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
                {/* Hidden fields used by server action */}
                <input type="hidden" name="itemId" value={props.itemId} />
                <input type="hidden" name="intent" value={intent} />
                <input type="hidden" name="type" value={props.type} />

                {/* Workflow panel */}
                <section>
                    <h2 style={{ margin: "0 0 8px 0" }}>Workflow</h2>
                    <p style={{ opacity: 0.8, marginTop: 0 }}>
                        Status: <b>{props.status}</b>
                    </p>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {canSubmit && (props.status === "DRAFT" || props.status === "AWAITING_CHANGES") && (
                            <button type="button" disabled={disabled} onClick={() => runIntent("submit")}>
                                Submit for review
                            </button>
                        )}

                        {canApprove && props.status === "IN_REVIEW" && (
                            <>
                                <button type="button" disabled={disabled} onClick={() => runIntent("approve")}>
                                    Approve
                                </button>
                                <button type="button" disabled={disabled} onClick={() => runIntent("sendBack")}>
                                    Send back to draft
                                </button>
                            </>
                        )}

                        {canPublish && props.status === "APPROVED" && (
                            <button type="button" disabled={disabled} onClick={() => runIntent("publish")}>
                                Publish
                            </button>
                        )}

                        {canAdmin && props.status !== "ARCHIVED" && (
                            <button type="button" disabled={disabled} onClick={() => runIntent("archive")}>
                                Archive
                            </button>
                        )}

                        {canAdmin && props.status === "ARCHIVED" && (
                            <button type="button" disabled={disabled} onClick={() => runIntent("restore")}>
                                Restore to draft
                            </button>
                        )}
                    </div>

                    <p style={{ opacity: 0.7, marginTop: 10 }}>
                        Workflow buttons show a popup if required fields are missing (without
                        saving).
                    </p>
                </section>

                <hr style={{ opacity: 0.3 }} />

                {/* Edit fields (controlled inputs) */}
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    Change summary (optional)
                    <input
                        name="changeSummary"
                        value={changeSummary}
                        onChange={(e) => setChangeSummary(e.target.value)}
                    />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    Title
                    <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>

                {props.type === "NEWS" && (
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        Summary
                        <textarea
                            name="summary"
                            rows={3}
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                        />
                    </label>
                )}

                {props.type !== "SERVICE" && (
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        Body
                        <textarea
                            name="body"
                            rows={12}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </label>
                )}

                {props.type === "SERVICE" && (
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        Steps (one per line)
                        <textarea
                            name="stepsText"
                            rows={10}
                            value={stepsText}
                            onChange={(e) => setStepsText(e.target.value)}
                        />
                    </label>
                )}

                <button type="button" disabled={disabled} onClick={runSave} style={{ width: 220 }}>
                    Save (new revision)
                </button>

                <p style={{ opacity: 0.7, marginTop: 8 }}>
                    Current revision:{" "}
                    {props.currentRevisionNumber
                        ? `#${props.currentRevisionNumber}`
                        : "(none yet)"}
                </p>
            </form>
        </>
    );
}
