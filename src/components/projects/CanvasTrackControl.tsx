"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Track, TrackEditAction } from "../../types/project";
import * as api from "../../lib/api";

export interface SelectedBox {
    id: string;
    type: "det" | "bbox";
    bbox: number[];            // [x1, y1, x2, y2] in image pixels
    track_id: string | null;
}

interface CanvasTrackControlProps {
    projectId: string;
    box: SelectedBox | null;
    tracks: Track[];
    tracksLoading: boolean;
    transform: { scale: number; ox: number; oy: number };
    canvasSize: { width: number; height: number };
    onAssigned: (boxId: string, type: "det" | "bbox", trackId: string | null) => void;
    onTracksChanged: () => void;
}

const POPOVER_WIDTH = 168;
const POPOVER_MAX_HEIGHT = 248;
const CHIP_HEIGHT = 24;
const CHIP_EST_WIDTH = 104;
const GAP = 8;
const MARGIN = 4;

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

export default function CanvasTrackControl({
    projectId,
    box,
    tracks,
    tracksLoading,
    transform,
    canvasSize,
    onAssigned,
    onTracksChanged,
}: CanvasTrackControlProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chipRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Reset whenever the selected box changes or selection clears.
    useEffect(() => {
        setOpen(false);
        setError(null);
    }, [box?.id]);

    // Close on outside mousedown — this also covers mousedown on the canvas to
    // start a drag/resize/pan, so the popover closes when box editing begins.
    useEffect(() => {
        if (!open) return;
        function onDown(e: MouseEvent) {
            const t = e.target as Node;
            if (popoverRef.current?.contains(t)) return;
            if (chipRef.current?.contains(t)) return;
            setOpen(false);
        }
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    // Esc closes the popover. Capture phase + stopPropagation so it runs before
    // the AnnotateReview keydown handler (which would otherwise deselect the box).
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.stopPropagation();
                setOpen(false);
            }
        }
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [open]);

    // Collapse the `tracks` view to one entry per track_id.
    const dedupedTracks = useMemo(() => {
        const byId = new Map<string, Track>();
        for (const t of tracks) {
            const existing = byId.get(t.track_id);
            if (!existing) {
                byId.set(t.track_id, { ...t });
                continue;
            }
            const dominant = existing.frame_count >= t.frame_count ? existing : t;
            byId.set(t.track_id, {
                ...dominant,
                frame_count: existing.frame_count + t.frame_count,
            });
        }
        return Array.from(byId.values());
    }, [tracks]);

    if (!box || canvasSize.width === 0) return null;

    // ── Screen geometry ──────────────────────────────────────────────
    const { scale, ox, oy } = transform;
    const [x1, y1, x2, y2] = box.bbox;
    const sx1 = x1 * scale + ox;
    const sy1 = y1 * scale + oy;
    const sx2 = x2 * scale + ox;
    const sy2 = y2 * scale + oy;

    // Chip: just below the box's bottom-left corner, clamped into the panel.
    const chipLeft = clamp(sx1, MARGIN, canvasSize.width - CHIP_EST_WIDTH - MARGIN);
    const chipTop = clamp(sy2 + 6, MARGIN, canvasSize.height - CHIP_HEIGHT - MARGIN);

    // Popover: prefer right of the box, flip left with no room, clamp vertically.
    const fitsRight = sx2 + GAP + POPOVER_WIDTH + MARGIN <= canvasSize.width;
    const popLeft = fitsRight
        ? sx2 + GAP
        : clamp(sx1 - GAP - POPOVER_WIDTH, MARGIN, canvasSize.width - POPOVER_WIDTH - MARGIN);
    const popTop = clamp(
        sy1,
        MARGIN,
        Math.max(MARGIN, canvasSize.height - POPOVER_MAX_HEIGHT - MARGIN),
    );

    const isTracked = box.track_id != null;
    const shortId = box.track_id ? box.track_id.slice(0, 6) : null;

    async function applyAction(action: TrackEditAction) {
        setBusy(true);
        setError(null);
        try {
            const res = await api.editDetectionTrack(projectId, box!.id, action);
            onAssigned(box!.id, box!.type, res.track_id);
            onTracksChanged();
            setOpen(false);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to update track");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
            {/* Track chip — green dot = tracked, grey = untracked */}
            <button
                ref={chipRef}
                onClick={() => setOpen(o => !o)}
                style={{
                    position: "absolute",
                    left: chipLeft,
                    top: chipTop,
                    height: CHIP_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 9px",
                    pointerEvents: "auto",
                    background: "var(--surface)",
                    border: `1.5px solid ${open ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: 6,
                    boxShadow: "0 3px 10px rgba(20,30,60,0.18)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text1)",
                    whiteSpace: "nowrap",
                }}
            >
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isTracked ? "var(--success)" : "var(--text3)",
                        flexShrink: 0,
                    }}
                />
                {isTracked ? `Track ${shortId}` : "Untracked"}
            </button>

            {/* Track popover */}
            {open && (
                <div
                    ref={popoverRef}
                    style={{
                        position: "absolute",
                        left: popLeft,
                        top: popTop,
                        width: POPOVER_WIDTH,
                        maxHeight: POPOVER_MAX_HEIGHT,
                        pointerEvents: "auto",
                        display: "flex",
                        flexDirection: "column",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 9,
                        boxShadow: "0 12px 32px rgba(20,30,60,0.28)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 10px",
                            borderBottom: "1px solid var(--border)",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: "var(--text3)",
                        }}
                    >
                        <span>Track</span>
                        <span>{dedupedTracks.length}</span>
                    </div>

                    <div
                        style={{
                            padding: 8,
                            overflowY: "auto",
                            flex: 1,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            alignContent: "flex-start",
                        }}
                    >
                        {tracksLoading ? (
                            <div style={{ fontSize: 11, color: "var(--text3)", padding: 6 }}>
                                Loading…
                            </div>
                        ) : dedupedTracks.length === 0 ? (
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "var(--text3)",
                                    fontStyle: "italic",
                                    padding: 6,
                                }}
                            >
                                No tracks in this upload yet.
                            </div>
                        ) : (
                            dedupedTracks.map(t => {
                                const isCurrent = t.track_id === box.track_id;
                                return (
                                    <button
                                        key={t.track_id}
                                        title={`${t.track_id.slice(0, 6)} · ${t.frame_count} frame${t.frame_count !== 1 ? "s" : ""}`}
                                        disabled={busy}
                                        onClick={() => {
                                            if (isCurrent) {
                                                setOpen(false);
                                                return;
                                            }
                                            applyAction({ action: "assign", track_id: t.track_id });
                                        }}
                                        style={{
                                            width: 42,
                                            height: 42,
                                            padding: 0,
                                            borderRadius: 6,
                                            cursor: busy ? "default" : "pointer",
                                            border: isCurrent
                                                ? "2px solid var(--success)"
                                                : "1px solid var(--border)",
                                            background: "var(--surface2)",
                                            overflow: "hidden",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {t.representative_crop_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={t.representative_crop_url}
                                                alt={`track ${t.track_id.slice(0, 6)}`}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    display: "block",
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: 14, color: "var(--text3)" }}>?</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {error && (
                        <div
                            style={{
                                fontSize: 11,
                                color: "var(--danger)",
                                background: "#fff0f0",
                                borderTop: "1px solid #ffd0d0",
                                padding: "6px 10px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div
                        style={{
                            display: "flex",
                            gap: 6,
                            padding: 8,
                            borderTop: "1px solid var(--border)",
                        }}
                    >
                        <button
                            disabled={busy}
                            onClick={() => applyAction({ action: "create" })}
                            style={{
                                flex: 1,
                                fontFamily: "inherit",
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "6px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--text1)",
                                cursor: busy ? "default" : "pointer",
                            }}
                        >
                            + New track
                        </button>
                        <button
                            disabled={busy || !isTracked}
                            onClick={() => applyAction({ action: "remove" })}
                            style={{
                                flex: 1,
                                fontFamily: "inherit",
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "6px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: isTracked ? "#B91C1C" : "var(--text3)",
                                opacity: isTracked ? 1 : 0.5,
                                cursor: busy || !isTracked ? "default" : "pointer",
                            }}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
