"use client";

interface FocusBox {
    id: string;
    type: "det" | "bbox";
    bbox: number[];            // [x1, y1, x2, y2] in image pixels
    track_id: string | null;
}

interface TrackFocusControlProps {
    box: FocusBox | null;
    transform: { scale: number; ox: number; oy: number };
    canvasSize: { width: number; height: number };
    focusedTrackId: string | null;
    focusedTrackPresent: boolean;
    onFocus: (trackId: string) => void;
    onExitFocus: () => void;
}

const CHIP_HEIGHT = 24;
const CHIP_EST_WIDTH = 78;
const MARGIN = 4;

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

export default function TrackFocusControl({
    box,
    transform,
    canvasSize,
    focusedTrackId,
    focusedTrackPresent,
    onFocus,
    onExitFocus,
}: TrackFocusControlProps) {
    // Focus mode on → show the banner instead of the chip.
    if (focusedTrackId) {
        return (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
                <div
                    style={{
                        position: "absolute",
                        top: 10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        pointerEvents: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 8px 7px 12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        boxShadow: "0 6px 20px rgba(20,30,60,0.22)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: focusedTrackPresent ? "var(--text1)" : "var(--text3)",
                        whiteSpace: "nowrap",
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: focusedTrackPresent ? "var(--success)" : "var(--text3)",
                            flexShrink: 0,
                        }}
                    />
                    {focusedTrackPresent
                        ? "Following this track"
                        : "Track not detected on this frame"}
                    <button
                        onClick={onExitFocus}
                        style={{
                            fontFamily: "inherit",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--surface2)",
                            color: "var(--text1)",
                            cursor: "pointer",
                        }}
                    >
                        Exit
                    </button>
                </div>
            </div>
        );
    }

    // Focus mode off → show the "Track" chip on the selected box (if any).
    if (!box || canvasSize.width === 0) return null;

    const x1 = box.bbox[0];
    const y2 = box.bbox[3];
    const sx1 = x1 * transform.scale + transform.ox;
    const sy2 = y2 * transform.scale + transform.oy;
    const chipLeft = clamp(sx1, MARGIN, canvasSize.width - CHIP_EST_WIDTH - MARGIN);
    const chipTop = clamp(sy2 + 6, MARGIN, canvasSize.height - CHIP_HEIGHT - MARGIN);

    const isTracked = box.track_id != null;
    const trackId = box.track_id;

    return (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
            <button
                onClick={() => { if (trackId) onFocus(trackId); }}
                disabled={!isTracked}
                title={isTracked ? "Focus this track" : "This box isn't on a track"}
                style={{
                    position: "absolute",
                    left: chipLeft,
                    top: chipTop,
                    height: CHIP_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 10px",
                    pointerEvents: "auto",
                    background: "var(--surface)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 6,
                    boxShadow: "0 3px 10px rgba(20,30,60,0.18)",
                    cursor: isTracked ? "pointer" : "not-allowed",
                    opacity: isTracked ? 1 : 0.5,
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
                Track
            </button>
        </div>
    );
}
