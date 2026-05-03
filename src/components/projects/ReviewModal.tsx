"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Pencil } from "lucide-react";
import { Detection } from "../../types/project";
import * as api from "../../lib/api";

interface ReviewModalProps {
    detection: Detection;
    onClose: () => void;
    onMarkReviewed: (id: string, newLabel: string) => void;
}

const VOCAB_DISPLAY_LABELS = [
    "Fish",
    "Shark Ray",
    "Sea Cucumber",
    "Sea Star",
    "Brittle Star",
    "Sea Urchin",
    "Crab",
    "Lobster Crayfish",
    "Shrimp Prawn",
    "Octopus",
    "Squid",
    "Cuttlefish",
    "Gastropod",
    "Bivalve",
    "Jellyfish",
    "Anemone",
    "Hard Coral",
    "Soft Coral",
    "Sponge",
    "Worm",
    "Whale",
    "Sea Lion",
    "Dolphin",
    "Eel",
    "Turtle",
    "Seahorse",
];

function deriveAccent(score: number): string {
    if (score >= 0.75) return "var(--success)";
    if (score >= 0.5) return "var(--warning)";
    return "var(--danger)";
}

export default function ReviewModal({
    detection: d,
    onClose,
    onMarkReviewed,
}: ReviewModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [labelValue, setLabelValue] = useState(d.display_label);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isReviewed = d.status === "reviewed";
    const isDirty = labelValue.trim() !== d.display_label;
    const accent = deriveAccent(d.score);

    useEffect(() => {
        setLabelValue(d.display_label);
        setIsEditing(false);
        setError(null);
    }, [d.id, d.display_label]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;

        const drawOverlay = (scaleX: number, scaleY: number) => {
            const [x1, y1, x2, y2] = d.bbox;
            const bx = x1 * scaleX;
            const by = y1 * scaleY;
            const bw = (x2 - x1) * scaleX;
            const bh = (y2 - y1) * scaleY;

            // Compute color in raw hex for canvas (CSS vars don't apply on canvas).
            const accentColor =
                d.score >= 0.75 ? "#5ec99a" : d.score >= 0.5 ? "#f5bc62" : "#f07070";

            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.shadowBlur = 0;

            const lbl = `${labelValue || d.display_label}  ${Math.round(d.score * 100)}%`;
            ctx.font = "bold 11px 'DM Mono', ui-monospace, monospace";
            ctx.textBaseline = "bottom";
            const tw = ctx.measureText(lbl).width;
            ctx.fillStyle = accentColor;
            ctx.fillRect(bx, Math.max(0, by - 22), tw + 12, 22);
            ctx.fillStyle = "#fff";
            ctx.fillText(lbl, bx + 6, by - 3);
        };

        const draw = (imgSrc?: string) => {
            ctx.fillStyle = "#11293f";
            ctx.fillRect(0, 0, W, H);

            if (imgSrc) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, W, H);
                    drawOverlay(W / img.naturalWidth, H / img.naturalHeight);
                };
                img.src = imgSrc;
            } else {
                drawOverlay(1, 1);
            }
        };

        api
            .getFramePreview(d.frame_id)
            .then(blob => {
                draw(URL.createObjectURL(blob));
            })
            .catch(() => {
                draw(d.frame_url);
            });
    }, [d.frame_id, d.bbox, d.score, labelValue, d.display_label, d.frame_url]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    async function handleConfirm() {
        const finalLabel = labelValue.trim() || d.display_label;
        setLoading(true);
        setError(null);
        try {
            await api.reviewDetectionLabel(d.id, finalLabel);
            onMarkReviewed(d.id, finalLabel);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save review");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                background: "rgba(20,30,60,0.5)",
                backdropFilter: "blur(4px)",
                padding: 16,
            }}
            onClick={e => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="overflow-hidden flex flex-col"
                style={{
                    background: "var(--surface)",
                    borderRadius: 18,
                    width: "100%",
                    maxWidth: 560,
                    border: "1px solid var(--border)",
                    boxShadow: "0 20px 60px rgba(20,30,60,0.2)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-start justify-between"
                    style={{
                        padding: "18px 22px 14px",
                        borderBottom: "1px solid var(--border)",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text3)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 4,
                            }}
                        >
                            Detection Review
                        </div>
                        <h2
                            style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: "var(--text1)",
                                letterSpacing: "-0.02em",
                                fontStyle: "italic",
                            }}
                        >
                            {d.display_label || "Unknown"}
                        </h2>
                        {d.taxon && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "var(--text3)",
                                    marginTop: 2,
                                }}
                            >
                                {d.taxon}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center" style={{ gap: 8 }}>
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "3px 10px",
                                borderRadius: 99,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                background: isReviewed
                                    ? "rgba(94,201,154,0.12)"
                                    : "rgba(245,188,98,0.15)",
                                color: isReviewed ? "var(--success)" : "var(--warning)",
                            }}
                        >
                            {isReviewed ? "Reviewed" : "Needs Review"}
                        </span>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="flex items-center justify-center"
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 7,
                                border: "1.5px solid var(--border)",
                                background: "var(--surface)",
                                cursor: "pointer",
                            }}
                        >
                            <X size={14} color="var(--text3)" />
                        </button>
                    </div>
                </div>

                {/* Canvas preview */}
                <div style={{ background: "#11293f", position: "relative" }}>
                    <canvas ref={canvasRef} width={576} height={260} className="w-full block" />
                    <div
                        style={{
                            position: "absolute",
                            bottom: 8,
                            left: 8,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "3px 9px",
                            borderRadius: 5,
                            background: "rgba(0,0,0,0.6)",
                            color: "rgba(255,255,255,0.85)",
                            fontFamily: "var(--font-dm-mono), 'DM Mono', monospace",
                            backdropFilter: "blur(4px)",
                        }}
                    >
                        {d.source_filename}
                    </div>
                </div>

                {/* Label section */}
                <div
                    style={{
                        padding: "16px 22px",
                        borderBottom: "1px solid var(--border)",
                    }}
                >
                    <div
                        className="flex items-center justify-between"
                        style={{ marginBottom: 10 }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text3)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}
                        >
                            Label
                        </div>
                        <button
                            onClick={() => setIsEditing(v => !v)}
                            className="flex items-center"
                            style={{
                                gap: 5,
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1.5px solid var(--border)",
                                background: isEditing ? "var(--primary-pale)" : "var(--surface)",
                                color: isEditing ? "var(--primary-dark)" : "var(--text2)",
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            <Pencil size={11} />
                            {isEditing ? "Editing" : "Edit"}
                        </button>
                    </div>
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            list="vocab-labels"
                            value={labelValue}
                            onChange={e => setLabelValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && !loading) handleConfirm();
                            }}
                            placeholder="Enter or select a label…"
                            className="w-full"
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                padding: "10px 12px",
                                borderRadius: 9,
                                border: "1.5px solid var(--primary)",
                                background: "var(--surface)",
                                color: "var(--text1)",
                                outline: "none",
                                fontFamily: "inherit",
                            }}
                        />
                    ) : (
                        <div
                            className="flex items-center"
                            style={{
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: 9,
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: accent,
                                }}
                            />
                            <span
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "var(--text1)",
                                    fontStyle: "italic",
                                }}
                            >
                                {labelValue || d.display_label}
                            </span>
                        </div>
                    )}
                    {isDirty && (
                        <div
                            style={{
                                marginTop: 8,
                                fontSize: 12,
                                color: "var(--primary-dark)",
                            }}
                        >
                            Changed from <strong>{d.display_label}</strong>
                        </div>
                    )}
                    <datalist id="vocab-labels">
                        {VOCAB_DISPLAY_LABELS.map(l => (
                            <option key={l} value={l} />
                        ))}
                    </datalist>
                </div>

                {/* Confidence */}
                <div style={{ padding: "16px 22px" }}>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 8,
                        }}
                    >
                        Confidence
                    </div>
                    <div className="flex items-center" style={{ gap: 10 }}>
                        <div
                            style={{
                                flex: 1,
                                height: 5,
                                background: "var(--border)",
                                borderRadius: 99,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    height: "100%",
                                    width: `${d.score * 100}%`,
                                    background: accent,
                                    borderRadius: 99,
                                }}
                            />
                        </div>
                        <span
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: accent,
                                fontFamily: "var(--font-dm-mono), 'DM Mono', monospace",
                            }}
                        >
                            {Math.round(d.score * 100)}%
                        </span>
                    </div>
                </div>

                {error && (
                    <div
                        style={{
                            margin: "0 22px 12px",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "#fff0f0",
                            border: "1px solid #ffd0d0",
                            color: "var(--danger)",
                            fontSize: 12,
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div
                    className="flex items-center"
                    style={{
                        gap: 10,
                        padding: "16px 22px",
                        borderTop: "1px solid var(--border)",
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 9,
                            border: "1.5px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--text2)",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: loading ? "wait" : "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || !labelValue.trim()}
                        className="flex items-center justify-center"
                        style={{
                            flex: 1,
                            gap: 6,
                            padding: 10,
                            borderRadius: 9,
                            border: "none",
                            background:
                                loading || !labelValue.trim()
                                    ? "var(--primary-light)"
                                    : "var(--success)",
                            color: "#fff",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor:
                                loading || !labelValue.trim() ? "not-allowed" : "pointer",
                        }}
                    >
                        <Check size={14} />
                        {loading
                            ? "Saving…"
                            : isDirty
                                ? "Save & confirm"
                                : isReviewed
                                    ? "Update review"
                                    : "Confirm review"}
                    </button>
                </div>
            </div>
        </div>
    );
}
