"use client";

import { useEffect, useRef, useState } from "react";
import { X, Pencil, Check, Loader2 } from "lucide-react";
import { Detection } from "../../types/project";
import * as api from "../../lib/api";

interface ReviewModalProps {
    detection: Detection;
    onClose: () => void;
    onMarkReviewed: (id: string, newLabel: string) => void;
}

const VOCAB_DISPLAY_LABELS = [
    "Fish", "Shark Ray", "Sea Cucumber", "Sea Star", "Brittle Star",
    "Sea Urchin", "Crab", "Lobster Crayfish", "Shrimp Prawn", "Octopus",
    "Squid", "Cuttlefish", "Gastropod", "Bivalve", "Jellyfish",
    "Anemone", "Hard Coral", "Soft Coral", "Sponge", "Worm",
    "Whale", "Sea Lion", "Dolphin", "Eel", "Turtle", "Seahorse",
];

function deriveAccentColor(score: number): string {
    if (score >= 0.75) return "#00b4a0";
    if (score >= 0.5) return "#0090cc";
    return "#e8613a";
}

function deriveAccentRgb(score: number): string {
    if (score >= 0.75) return "0,180,160";
    if (score >= 0.5) return "0,144,204";
    return "232,97,58";
}

export default function ReviewModal({ detection: d, onClose, onMarkReviewed }: ReviewModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [labelValue, setLabelValue] = useState(d.display_label);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isReviewed = d.status === "reviewed";
    const isDirty = labelValue.trim() !== d.display_label;

    const accentColor = deriveAccentColor(d.score);
    const accentRgb = deriveAccentRgb(d.score);
    const confColor = accentColor;

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

        const draw = (imgSrc?: string) => {
            ctx.fillStyle = "#040c14";
            ctx.fillRect(0, 0, W, H);

            const doOverlay = (scaleX: number, scaleY: number) => {
                const [x1, y1, x2, y2] = d.bbox;
                const bx = x1 * scaleX;
                const by = y1 * scaleY;
                const bw = (x2 - x1) * scaleX;
                const bh = (y2 - y1) * scaleY;

                ctx.shadowColor = accentColor;
                ctx.shadowBlur = 16;
                ctx.strokeStyle = accentColor;
                ctx.lineWidth = 2.5;
                ctx.strokeRect(bx, by, bw, bh);
                ctx.shadowBlur = 0;

                const cl = 14;
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]].forEach(([cx, cy], i) => {
                    ctx.beginPath();
                    const dx = i % 2 === 0 ? 1 : -1;
                    const dy = i < 2 ? 1 : -1;
                    ctx.moveTo(cx, cy + dy * cl);
                    ctx.lineTo(cx, cy);
                    ctx.lineTo(cx + dx * cl, cy);
                    ctx.stroke();
                });

                const lbl = `${labelValue || d.display_label}  ${Math.round(d.score * 100)}%`;
                ctx.font = "bold 11px system-ui";
                ctx.textBaseline = "bottom";
                const tw = ctx.measureText(lbl).width;
                ctx.fillStyle = accentColor;
                ctx.fillRect(bx, Math.max(0, by - 22), tw + 12, 22);
                ctx.fillStyle = "#fff";
                ctx.fillText(lbl, bx + 6, by - 3);
            };

            if (imgSrc) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, W, H);
                    const scaleX = W / img.naturalWidth;
                    const scaleY = H / img.naturalHeight;
                    doOverlay(scaleX, scaleY);
                };
                img.src = imgSrc;
            } else {
                doOverlay(1, 1);
            }
        };

        api.getFramePreview(d.frame_id).then(blob => {
            draw(URL.createObjectURL(blob));
        }).catch(() => {
            draw();
        });
    }, [d.frame_id, d.bbox, d.score, labelValue, accentColor, d.display_label]);

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(2, 8, 18, 0.82)", backdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-xl overflow-hidden rounded-2xl flex flex-col"
                style={{
                    background: "linear-gradient(160deg, #0d1e30 0%, #081525 100%)",
                    border: `1px solid rgba(${accentRgb},0.22)`,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset",
                }}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: accentColor, opacity: 0.8 }}>
                            Detection Review
                        </p>
                        <h2
                            className="text-[1.25rem] font-black text-white leading-tight"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            {d.display_label || "Unknown"}
                        </h2>
                        <p className="text-[0.74rem] mt-0.5" style={{ color: "#4a6880", fontStyle: "italic" }}>{d.taxon ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5">
                        <span
                            className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                            style={isReviewed
                                ? { background: "rgba(0,180,160,0.12)", color: "#00b4a0", border: "1px solid rgba(0,180,160,0.25)" }
                                : { background: "rgba(232,97,58,0.12)", color: "#e8613a", border: "1px solid rgba(232,97,58,0.25)" }
                            }
                        >
                            {isReviewed ? "Reviewed" : "Needs Review"}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: "#4a6880" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#4a6880")}
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Canvas preview */}
                <div style={{ background: "#040c14", position: "relative" }}>
                    <canvas ref={canvasRef} width={576} height={240} className="w-full block" />
                    <div
                        className="absolute bottom-2.5 left-2.5 text-[10px] font-semibold px-2.5 py-1 rounded-md"
                        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.65)" }}
                    >
                        {d.source_filename}
                    </div>
                </div>

                {/* Label review section */}
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em]" style={{ color: "#4a6880" }}>
                            Label
                        </p>
                        <button
                            onClick={() => setIsEditing(v => !v)}
                            className="flex items-center gap-1.5 text-[0.72rem] font-semibold px-2.5 py-1 rounded-md transition-all"
                            style={isEditing
                                ? { background: `rgba(${accentRgb},0.15)`, color: accentColor }
                                : { background: "rgba(255,255,255,0.05)", color: "#4a6880" }
                            }
                        >
                            <Pencil size={11} />
                            {isEditing ? "Editing" : "Edit label"}
                        </button>
                    </div>

                    {isEditing ? (
                        <div className="relative">
                            <input
                                ref={inputRef}
                                list="vocab-labels"
                                value={labelValue}
                                onChange={e => setLabelValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !loading) handleConfirm(); }}
                                placeholder="Enter or select a label…"
                                className="w-full text-[0.9rem] font-semibold text-white rounded-xl px-4 py-2.5 outline-none transition-all"
                                style={{
                                    background: "rgba(255,255,255,0.05)",
                                    border: `1.5px solid ${accentColor}`,
                                    boxShadow: `0 0 0 3px ${accentColor}22`,
                                    caretColor: accentColor,
                                }}
                            />
                            <datalist id="vocab-labels">
                                {VOCAB_DISPLAY_LABELS.map(l => <option key={l} value={l} />)}
                            </datalist>
                            {isDirty && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                                    <span className="text-[0.7rem]" style={{ color: accentColor }}>
                                        Label changed from &ldquo;{d.display_label}&rdquo;
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
                            />
                            <span className="text-[0.92rem] font-semibold text-white">{labelValue || d.display_label}</span>
                        </div>
                    )}
                </div>

                {/* Metrics row */}
                <div className="px-6 py-4">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "#4a6880" }}>Confidence</p>
                    <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${d.score * 100}%`, background: confColor }}
                            />
                        </div>
                        <span className="text-[0.82rem] font-black tabular-nums" style={{ color: confColor }}>
                            {Math.round(d.score * 100)}%
                        </span>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl text-[0.8rem]" style={{ background: "rgba(232,97,58,0.12)", border: "1px solid rgba(232,97,58,0.25)", color: "#e8613a" }}>
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl text-[0.85rem] font-semibold transition-all"
                        style={{
                            border: "1px solid rgba(0,144,204,0.18)",
                            color: "#4a6880",
                        }}
                        onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(0,144,204,0.35)"; }}}
                        onMouseLeave={e => { e.currentTarget.style.color = "#4a6880"; e.currentTarget.style.borderColor = "rgba(0,144,204,0.18)"; }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={loading || !labelValue.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.85rem] font-bold transition-all"
                        style={{
                            background: loading || !labelValue.trim()
                                ? "rgba(255,255,255,0.07)"
                                : `linear-gradient(135deg, #006d9e 0%, ${accentColor} 100%)`,
                            color: loading || !labelValue.trim() ? "#4a6880" : "#fff",
                            cursor: loading || !labelValue.trim() ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Check size={14} />
                                {isDirty ? "Save & Confirm" : isReviewed ? "Update Review" : "Confirm Review"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
