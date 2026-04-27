"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Detection } from "../../../types/project";
import * as api from "../../../lib/api";
import styles from "./ProjectPage.module.css";
import UploadMediaModal from "../../../components/projects/UploadMediaModal";
import ReviewModal from "../../../components/projects/ReviewModal";
const frameCache = new Map<string, string>();
interface Props {
    projectId: string;
}

type Filter = "all" | "needs_review" | "reviewed";
type Sort = "conf-asc" | "conf-desc" | "frame";

interface ProcessingStatus {
    uploadId: string;
    totalFrames: number;
    framesProcessed: number;
    status: string;
}

export default function ProjectPage({ projectId }: Props) {
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("conf-asc");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [project, setProject] = useState<any>(null);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [processing, setProcessing] = useState<ProcessingStatus | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const [reviewDetection, setReviewDetection] = useState<Detection | null>(null);

    type Tab = "gallery" | "annotate";
    const [tab, setTab] = useState<Tab>("gallery");
    const [activeFrameIndex, setActiveFrameIndex] = useState(0);
    const [frames, setFrames] = useState<any[]>([]);

    useEffect(() => {
        api.getProjects().then(projects => {
            const found = projects.find(p => p.id === projectId);
            if (!found) router.push("/projects");
            else setProject(found);
        }).catch(() => router.push("/projects"));
    }, [projectId, router]);

    const fetchDetections = async () => {
        const data = await api.getProjectFrames(projectId);
        setFrames(data.frames);
        const allDetections: Detection[] = [];
        for (const frame of data.frames) {
            for (const det of frame.detections) {
                allDetections.push({
                    ...det,
                    frame_id: frame.id,
                    source_filename: frame.source_filename,
                    frame_url: frame.frame_url,
                    display_label: det.display_label ?? "",
                    score: det.score ?? 0,
                    status: (det.status === "reviewed" ? "reviewed" : "needs_review") as "reviewed" | "needs_review",
                });
            }
        }
        setDetections(allDetections);
    };

    function startPolling(uploadId: string, totalFrames: number) {
        setProcessing({ uploadId, totalFrames, framesProcessed: 0, status: "processing" });

        pollingRef.current = setInterval(async () => {
            try {
                const data = await api.getProjectFrames(projectId);
                setFrames(data.frames);
                const total = data.frames.length;
                const processed = data.frames.filter(f => f.status === "segmented").length;

                setProcessing({
                    uploadId,
                    totalFrames: total,
                    framesProcessed: processed,
                    status: processed === total ? "ready" : "processing",
                });

                const allDetections: Detection[] = [];
                for (const frame of data.frames) {
                    for (const det of frame.detections) {
                        allDetections.push({
                            ...det,
                            frame_id: frame.id,
                            source_filename: frame.source_filename,
                            frame_url: frame.frame_url,
                            display_label: det.display_label ?? "",
                            score: det.score ?? 0,
                            status: (det.status === "reviewed" ? "reviewed" : "needs_review") as "reviewed" | "needs_review",
                        });
                    }
                }
                setDetections(allDetections);

                if (processed === total) {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                    setProcessing(null);
                }
            } catch (err) {
                console.error(err);
                clearInterval(pollingRef.current!);
                pollingRef.current = null;
                setProcessing(null);
            }
        }, 3000);
    }

    useEffect(() => {
        let cancelled = false;
        api.getProjectFrames(projectId).then(data => {
            if (cancelled) return;
            setFrames(data.frames);
            const allDetections: Detection[] = [];
            for (const frame of data.frames) {
                for (const det of frame.detections) {
                    allDetections.push({
                        ...det,
                        frame_id: frame.id,
                        source_filename: frame.source_filename,
                        frame_url: frame.frame_url,
                        display_label: det.display_label ?? "",
                        score: det.score ?? 0,
                        status: (det.status === "reviewed" ? "reviewed" : "needs_review") as "reviewed" | "needs_review",
                    });
                }
            }
            setDetections(allDetections);

            const processingFrames = data.frames.filter(f =>
                f.status === "queued" || f.status === "segmenting" || f.status === "processing_frames"
            );
            if (processingFrames.length > 0) {
                const uploadId = processingFrames[0].upload_id;
                startPolling(uploadId, data.frames.length);
            }
        }).catch(console.error);

        return () => {
            cancelled = true;
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    function handleUploadComplete(uploadId: string, totalFrames: number) {
        setShowUpload(false);
        startPolling(uploadId, totalFrames);
    }

    if (!project) return (
        <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
        </div>
    );

    const visible = detections
        .filter(d => {
            const matchFilter = filter === "all" || d.status === filter;
            const q = search.toLowerCase();
            const matchSearch = !q ||
                (d.display_label ?? "").toLowerCase().includes(q) ||
                (d.taxon ?? "").toLowerCase().includes(q) ||
                (d.source_filename ?? "").toLowerCase().includes(q);
            return matchFilter && matchSearch;
        })
        .sort((a, b) => {
            if (sort === "conf-asc") return a.score - b.score;
            if (sort === "conf-desc") return b.score - a.score;
            return a.source_filename.localeCompare(b.source_filename);
        });

    const reviewed = detections.filter(d => d.status === "reviewed").length;
    const needsReview = detections.filter(d => d.status === "needs_review").length;
    const pct = detections.length > 0 ? Math.round((reviewed / detections.length) * 100) : 0;

    function toggleSelect(id: string) {
        setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    }

    function toggleSelectAll() {
        setSelected(selected.length === visible.length ? [] : visible.map(d => d.id));
    }

    function markReviewed(id: string) {
        setDetections(prev => prev.map(d => d.id === id ? { ...d, status: "reviewed" as const } : d));
    }

    function handleModalReviewed(id: string, newLabel: string) {
        setDetections(prev => prev.map(d =>
            d.id === id ? { ...d, status: "reviewed" as const, display_label: newLabel } : d
        ));
        setReviewDetection(null);
    }

    async function markSelectedReviewed() {
        const ids = [...selected];
        setDetections(prev => prev.map(d => ids.includes(d.id) ? { ...d, status: "reviewed" as const } : d));
        setSelected([]);
        await Promise.allSettled(
            ids.map(id => {
                const det = detections.find(d => d.id === id);
                return api.reviewDetectionLabel(id, det?.display_label ?? "");
            })
        );
    }

    return (
        <div className={styles.page}>
            {/* TOPBAR */}
            <nav className={styles.topbar}>
                <div className={styles.topbarLeft}>
                    <button className={styles.backBtn} onClick={() => router.push("/projects")}>
                        <ArrowLeft size={14} />
                        Projects
                    </button>
                    <div className={styles.dividerV} />
                    <div className={styles.logoMark}>🌊</div>
                    <div>
                        <div className={styles.projectTitle}>{project.name}</div>
                    </div>
                </div>
                <div className={styles.topbarRight}>
                    <button className={styles.btnUpload} onClick={() => setShowUpload(true)}>
                        Upload Media
                    </button>
                </div>
            </nav>

            {/* PROCESSING BAR */}
            {processing && (
                <div className={styles.processingBar}>
                    <div className={styles.processingLeft}>
                        <div className={styles.processingSpinner} />
                        <span className={styles.processingLabel}>
                            Analysing frames — {processing.framesProcessed} of {processing.totalFrames} processed
                        </span>
                    </div>
                    <div className={styles.processingTrack}>
                        <div
                            className={styles.processingFill}
                            style={{ width: `${processing.totalFrames > 0 ? (processing.framesProcessed / processing.totalFrames) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* STATS BAR */}
            <div className={styles.statsBar}>
                <div className={styles.statItem}>
                    <div className={`${styles.statDot} ${styles.statDotTotal}`} />
                    <span className={styles.statLbl}>Total</span>
                    <span className={styles.statVal}>{detections.length}</span>
                </div>
                <div className={styles.statDiv} />
                <div className={styles.statItem}>
                    <div className={`${styles.statDot} ${styles.statDotReviewed}`} />
                    <span className={styles.statLbl}>Reviewed</span>
                    <span className={styles.statVal}>{reviewed}</span>
                </div>
                <div className={styles.statDiv} />
                <div className={styles.statItem}>
                    <div className={`${styles.statDot} ${styles.statDotNeeds}`} />
                    <span className={styles.statLbl}>Needs review</span>
                    <span className={styles.statVal}>{needsReview}</span>
                </div>
                <div className={styles.statDiv} />
                <div className={styles.statItem}>
                    <span className={styles.statLbl}>Species</span>
                    <span className={styles.statVal}>{new Set(detections.map(d => d.display_label)).size}</span>
                </div>
                <div className={styles.progressWrap}>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.progressPct}>{pct}% complete</span>
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tabBtn} ${tab === "gallery" ? styles.tabActive : ""}`}
                    onClick={() => setTab("gallery")}
                >
                    Gallery
                </button>
                <button
                    className={`${styles.tabBtn} ${tab === "annotate" ? styles.tabActive : ""}`}
                    onClick={() => setTab("annotate")}
                >
                    Annotate
                </button>
            </div>

            {/* BULK BAR */}
            {selected.length > 0 && (
                <div className={styles.bulkBar}>
                    <span>{selected.length} item{selected.length > 1 ? "s" : ""} selected</span>
                    <div>
                        <button className={styles.bulkBtn} onClick={markSelectedReviewed}>Mark as reviewed</button>
                        <button className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={() => setSelected([])}>Clear selection</button>
                    </div>
                </div>
            )}

            {/* TOOLBAR */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <div className={styles.searchBox}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="7" cy="7" r="4" stroke="var(--slate)" strokeWidth="1.5" />
                            <path d="M11 11l2.5 2.5" stroke="var(--slate)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search species..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    {(["all", "needs_review", "reviewed"] as Filter[]).map(f => (
                        <button
                            key={f}
                            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === "all" ? "All" : f === "needs_review" ? "Needs review" : "Reviewed"}
                        </button>
                    ))}
                </div>
                <div className={styles.toolbarRight}>
                    <label className={styles.selectAllLabel}>
                        <input
                            type="checkbox"
                            className={styles.selectAllCb}
                            checked={visible.length > 0 && selected.length === visible.length}
                            onChange={toggleSelectAll}
                        />
                        Select all
                    </label>
                    <select
                        className={styles.sortSelect}
                        value={sort}
                        onChange={e => setSort(e.target.value as Sort)}
                    >
                        <option value="conf-asc">Confidence: low → high</option>
                        <option value="conf-desc">Confidence: high → low</option>
                    </select>
                </div>
            </div>

            {tab === "gallery" && (
                <div className={styles.grid}>
                    {visible.length === 0 ? (
                        <div className={styles.emptyState}>
                            {processing ? "Waiting for detections…" : "No detections match your filter."}
                        </div>
                    ) : (
                        visible.map(d => (
                            <DetectionCard
                                key={d.id}
                                detection={d}
                                selected={selected.includes(d.id)}
                                onToggleSelect={() => toggleSelect(d.id)}
                                onOpenReview={() => setReviewDetection(d)}
                            />
                        ))
                    )}
                </div>
            )}

            {tab === "annotate" && frames.length > 0 && (
                <AnnotateView
                    frames={frames}
                    activeFrameIndex={activeFrameIndex}
                    setActiveFrameIndex={setActiveFrameIndex}
                    projectId={projectId}
                />
            )}

            {showUpload && (
                <UploadMediaModal
                    projectId={projectId}
                    onClose={() => setShowUpload(false)}
                    onUploadComplete={handleUploadComplete}
                />
            )}

            {reviewDetection && (
                <ReviewModal
                    detection={reviewDetection}
                    onClose={() => setReviewDetection(null)}
                    onMarkReviewed={handleModalReviewed}
                />
            )}
        </div>
    );
}

/* DETECTION CARD */
function DetectionCard({ detection: d, selected, onToggleSelect, onOpenReview }: {
    detection: Detection;
    selected: boolean;
    onToggleSelect: () => void;
    onOpenReview: () => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const drawOnCanvas = (blobUrl: string) => {
            const img = new Image();
            img.onload = () => {
                const [x1, y1, x2, y2] = d.bbox;
                const scaleX = 300 / img.naturalWidth;
                const scaleY = 170 / img.naturalHeight;
                const boxH = (y2 - y1) * scaleY;
                const fontSize = Math.max(8, Math.min(12, boxH * 0.15));

                canvas.width = 300;
                canvas.height = 170;
                ctx.drawImage(img, 0, 0, 300, 170);
                setLoading(false);

                ctx.strokeStyle = "#d91414";
                ctx.lineWidth = 2;
                ctx.strokeRect(x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);

                const lbl = (d.display_label || "Unknown")
                    .split(" ")
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");

                ctx.font = `bold ${fontSize}px system-ui`;
                ctx.textBaseline = "bottom";
                const tw = ctx.measureText(lbl).width;
                ctx.fillStyle = "#d91414";
                ctx.fillRect(x1 * scaleX, Math.max(0, y1 * scaleY - fontSize - 4), tw + 6, fontSize + 4);
                ctx.fillStyle = "#ffffff";
                ctx.fillText(lbl, x1 * scaleX + 3, y1 * scaleY);
            };
            img.src = blobUrl;
        };

        if (frameCache.has(d.frame_id)) {
            drawOnCanvas(frameCache.get(d.frame_id)!);
            return;
        }

        frameCache.set(d.frame_id, d.frame_url);
        drawOnCanvas(d.frame_url);
    }, [d.frame_id, d.bbox, d.display_label, d.frame_url]);

    const cc = d.score >= 0.75 ? "High" : d.score >= 0.5 ? "Mid" : "Low";
    let fillClass = styles.confFillLow;
    if (cc === "High") fillClass = styles.confFillHigh;
    if (cc === "Mid") fillClass = styles.confFillMid;

    let valClass = styles.confValLow;
    if (cc === "High") valClass = styles.confValHigh;
    if (cc === "Mid") valClass = styles.confValMid;

    return (
        <div className={`${styles.card} ${selected ? styles.cardSelected : ""}`}>
            <div
                className={`${styles.cardCheckbox} ${selected ? styles.cardCheckboxChecked : ""}`}
                onClick={e => { e.stopPropagation(); onToggleSelect(); }}
            >
                {selected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            <div className={styles.cardImg}>
                {loading && <div className={styles.cardImgLoading} />}
                <canvas ref={canvasRef} width={300} height={170} className={styles.cardCanvas} />
            </div>

            <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                    <div>
                        <div className={styles.cardLabel}>
                            {(d.display_label || "Unknown")
                                .split(" ")
                                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(" ")}
                        </div>
                        <div className={styles.cardTaxon}>{d.taxon ?? "—"}</div>
                    </div>
                    <span className={`${styles.statusPill} ${d.status === "reviewed" ? styles.statusReviewed : styles.statusNeeds}`}>
                        {d.status === "reviewed" ? "Reviewed" : "Needs review"}
                    </span>
                </div>

                <div className={styles.confRow}>
                    <span className={styles.confLbl}>Conf.</span>
                    <div className={styles.confBar}>
                        <div className={`${styles.confFill} ${fillClass}`} style={{ width: `${d.score * 100}%` }} />
                    </div>
                    <span className={`${styles.confVal} ${valClass}`}>
                        {Math.round(d.score * 100)}%
                    </span>
                </div>

                <div className={styles.cardFooter}>
                    {d.status === "needs_review" ? (
                        <button className={styles.btnReview} onClick={onOpenReview}>Review</button>
                    ) : (
                        <span className={styles.btnReviewed}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5" stroke="var(--teal)" strokeWidth="1.2" />
                                <path d="M3.5 6l2 2 3-3" stroke="var(--teal)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Reviewed
                        </span>
                    )}
                    <button className={styles.btnDetail} onClick={onOpenReview}>Details →</button>
                </div>
            </div>
        </div>
    );
}

function AnnotateView({
    frames,
    activeFrameIndex,
    setActiveFrameIndex,
    projectId,
}: {
    frames: any[];
    activeFrameIndex: number;
    setActiveFrameIndex: (i: number | ((p: number) => number)) => void;
    projectId: string;
}) {
    const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
    const selectedFrame = frames.find(f => f.id === selectedFrameId);
    const selectedFrameIndex = frames.findIndex(f => f.id === selectedFrameId);

    // Frame gallery view
    if (!selectedFrameId) {
        return (
            <div style={{ padding: "24px", flex: 1 }}>
                <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {frames.length} frames — click to annotate
                    </span>
                </div>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 12,
                }}>
                    {frames.map((f, i) => (
                        <div
                            key={f.id}
                            onClick={() => {
                                setSelectedFrameId(f.id);
                                setActiveFrameIndex(i);
                            }}
                            style={{
                                borderRadius: 10,
                                overflow: "hidden",
                                cursor: "pointer",
                                border: "1px solid rgba(255,255,255,0.07)",
                                background: "#0d1e30",
                                transition: "all 0.2s",
                                position: "relative",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = "#00b4a0")}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                        >
                            <img
                                src={f.frame_url}
                                style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
                            />
                            <div style={{ padding: "10px 12px" }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {f.source_filename ?? `Frame ${i + 1}`}
                                </div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                                    {f.detections?.length ?? 0} detections
                                </div>
                            </div>
                            <div style={{
                                position: "absolute", top: 8, right: 8,
                                background: "rgba(0,0,0,0.55)", borderRadius: 5,
                                padding: "2px 8px", fontSize: 10, fontWeight: 600,
                                color: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)"
                            }}>
                                {i + 1} / {frames.length}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Annotate review view
    return (
        <AnnotateReview
            frames={frames}
            initialFrameIndex={selectedFrameIndex}
            projectId={projectId}
            onBack={() => setSelectedFrameId(null)}
            onFrameChange={(i) => setSelectedFrameId(frames[i]?.id ?? null)}
        />
    );
}

function AnnotateReview({
    frames,
    initialFrameIndex,
    projectId,
    onBack,
    onFrameChange,
}: {
    frames: any[];
    initialFrameIndex: number;
    projectId: string;
    onBack: () => void;
    onFrameChange: (i: number) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeFrameIndex, setActiveFrameIndex] = useState(initialFrameIndex);
    const frame = frames[activeFrameIndex];
    const [detections, setDetections] = useState<any[]>([]);
    const [activeDetectionId, setActiveDetectionId] = useState<string | null>(null);
    const [loadingDets, setLoadingDets] = useState(false);
    const [editLabel, setEditLabel] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const detectionGroups = useMemo(() => groupDetections(detections), [detections]);
    const [labelColorMap, setLabelColorMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!frame) return;
        setActiveDetectionId(null);
        setEditLabel("");
        setSaveError(null);
        setLoadingDets(true);
        api.getFrameDetections(projectId, frame.id)
            .then(data => {
                const dets = data.detections ?? data;
                setDetections(dets);
                setLabelColorMap(buildLabelColorMap(dets));
            })
            .catch(console.error)
            .finally(() => setLoadingDets(false));
    }, [frame?.id, projectId]);

    useEffect(() => {
        if (!activeDetectionId) { setEditLabel(""); return; }
        const det = detections.find(d => d.id === activeDetectionId);
        setEditLabel(det?.display_label ?? "");
        setSaveError(null);
    }, [activeDetectionId, detections]);

    // Draw canvas
    useEffect(() => {
        if (!frame) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            const maxW = canvas.parentElement?.clientWidth ?? 800;
            const maxH = canvas.parentElement?.clientHeight ?? 500;
            const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            detectionGroups.forEach(({ primary: d }) => {
                const [x1, y1, x2, y2] = d.bbox;
                const sx1 = x1 * scale, sy1 = y1 * scale;
                const sw = (x2 - x1) * scale, sh = (y2 - y1) * scale;
                const color = labelColorMap.get(d.display_label || "Unknown") ?? "#888";
                const isActive = d.id === activeDetectionId;

                // Glow effect for active
                if (isActive) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = isActive ? 3 : 1.5;
                ctx.strokeRect(sx1, sy1, sw, sh);
                ctx.shadowBlur = 0;

                const label = editLabel && isActive
                    ? `${editLabel} · ${Math.round((d.score ?? 0) * 100)}%`
                    : `${d.display_label || "Unknown"} · ${Math.round((d.score ?? 0) * 100)}%`;
                ctx.font = `bold 11px system-ui`;
                const tw = ctx.measureText(label).width;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(sx1, Math.max(0, sy1 - 20), tw + 10, 18, 4);
                ctx.fill();
                ctx.fillStyle = "#fff";
                ctx.fillText(label, sx1 + 5, sy1 - 5);
            });
        };
        img.src = frame.frame_url;
    }, [frame, detectionGroups, activeDetectionId, labelColorMap, editLabel]);

    function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas || !frame) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        const scale = canvas.width / (frame.natural_width ?? canvas.width);

        for (const d of [...detections].reverse()) {
            const [x1, y1, x2, y2] = d.bbox;
            if (mx >= x1 * scale && mx <= x2 * scale && my >= y1 * scale && my <= y2 * scale) {
                setActiveDetectionId(d.id === activeDetectionId ? null : d.id);
                return;
            }
        }
        setActiveDetectionId(null);
    }

    async function handleApprove() {
        if (!activeDetectionId || !editLabel.trim()) return;
        setSaving(true);
        setSaveError(null);
        try {
            await api.reviewDetectionLabel(activeDetectionId, editLabel.trim());
            setDetections(prev => prev.map(d =>
                d.id === activeDetectionId
                    ? { ...d, display_label: editLabel.trim(), status: "reviewed" }
                    : d
            ));
            setActiveDetectionId(null);
        } catch (err: any) {
            setSaveError(err.message ?? "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    function goToFrame(i: number) {
        setActiveFrameIndex(i);
        onFrameChange(i);
    }
    const activeDetection = detections.find(d => d.id === activeDetectionId);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gridTemplateRows: "1fr 90px", height: "calc(100vh - 230px)", gap: 12, padding: "16px 24px" }}>

            {/* CANVAS VIEWER */}
            <div style={{ background: "#0a1628", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{ maxWidth: "100%", maxHeight: "100%", cursor: "crosshair" }}
                />

                {/* Back button */}
                <button
                    onClick={onBack}
                    style={{ position: "absolute", top: 12, left: 12, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 6 }}
                >
                    ← All frames
                </button>

                <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                        onClick={() => goToFrame(Math.max(0, activeFrameIndex - 1))}
                        disabled={activeFrameIndex === 0}
                        style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: activeFrameIndex === 0 ? 0.4 : 1 }}
                    >← Prev</button>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                        Photo {activeFrameIndex + 1} of {frames.length}
                    </span>
                    <button
                        onClick={() => goToFrame(Math.min(frames.length - 1, activeFrameIndex + 1))}
                        disabled={activeFrameIndex === frames.length - 1}
                        style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                            opacity: activeFrameIndex === frames.length - 1 ? 0.4 : 1
                        }}
                    >Next →</button>
                </div>
                <div style={{ position: "absolute", bottom: 16, right: 16, fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
                    Click detection to select · or draw new bbox
                </div>
            </div>

            {/* SIDEBAR */}
            <div style={{
                background: "#0d1e30", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "flex", justifyContent: "space-between", flexShrink: 0, }}>
                    <span>Detections</span>
                    <span style={{ color: "#3b9eff" }}>{detectionGroups.length} in photo</span>
                </div>

                {/* Scrollable detection list */}
                <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {loadingDets ? (
                        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", paddingTop: 20 }}>
                            Loading…
                        </div>
                    ) : detectionGroups.map(({ primary: d, overlapping }) => (
                        <div key={d.id}>
                            <div
                                onClick={() => setActiveDetectionId(d.id === activeDetectionId ? null : d.id)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                                    transition: "background 0.15s",
                                    background: d.id === activeDetectionId ? "rgba(59,158,255,0.12)" : "transparent",
                                    border: `1px solid ${d.id === activeDetectionId ? "rgba(59,158,255,0.3)" : "transparent"}`,
                                }}
                            >
                                <div style={{
                                    width: 10, height: 10, borderRadius: "50%",
                                    background: labelColorMap.get(d.display_label || "Unknown") ?? "#888",
                                    flexShrink: 0
                                }} />
                                <span style={{
                                    flex: 1, fontSize: 13, color: "#fff",
                                    fontWeight: d.id === activeDetectionId ? 600 : 400
                                }}>
                                    {d.display_label || "Unknown"}
                                </span>
                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                                    {Math.round((d.score ?? 0) * 100)}%
                                </span>
                            </div>

                            {overlapping.map(alt => (
                                <div key={alt.id} style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "5px 10px 5px 28px", opacity: 0.6
                                }}>
                                    <div style={{
                                        width: 6, height: 6, borderRadius: "50%",
                                        background: labelColorMap.get(alt.display_label || "Unknown") ?? "#888",
                                        flexShrink: 0
                                    }} />
                                    <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{alt.display_label || "Unknown"}</span>
                                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{Math.round((alt.score ?? 0) * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    ))}

                    <button style={{ marginTop: 4, padding: "8px 10px", borderRadius: 8, background: "transparent", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontWeight: 600, textAlign: "left" }}>
                        + Draw new bounding box
                    </button>

                </div>


                {activeDetection && (
                    <div style={{
                        borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12,
                        display: "flex", flexDirection: "column", gap: 10,
                        flexShrink: 0,
                    }}>
                        <div style={{
                            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                            <span>Edit Label</span>
                            <span style={{
                                background: activeDetection.status === "reviewed"
                                    ? "rgba(0,180,160,0.15)" : "rgba(255,180,0,0.1)",
                                color: activeDetection.status === "reviewed" ? "#00b4a0" : "#ffb400",
                                border: `1px solid ${activeDetection.status === "reviewed" ? "rgba(0,180,160,0.3)" : "rgba(255,180,0,0.25)"}`,
                                borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700
                            }}>
                                {activeDetection.status === "reviewed" ? "Reviewed" : "Needs review"}
                            </span>
                        </div>

                        <div style={{
                            background: "rgba(59,158,255,0.08)", border: "1px solid rgba(59,158,255,0.2)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                                Original
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                                {activeDetection.display_label || "Unknown"}</span>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                                New Label </div>
                            <input
                                type="text"
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleApprove(); }}
                                placeholder="e.g. fish, sea turtle..."
                                style={{ width: "100%", border: "none", borderRadius: 8, padding: "10px 12px", fontSize: 14, fontWeight: 500, color: "#0d1f2d", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        {saveError && (
                            <div style={{
                                fontSize: 12, color: "#e8613a",
                                background: "rgba(232,97,58,0.1)",
                                border: "1px solid rgba(232,97,58,0.25)",
                                borderRadius: 6, padding: "6px 10px"
                            }}>
                                {saveError}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={handleApprove}
                                disabled={saving || !editLabel.trim()}
                                style={{
                                    flex: 1, padding: "9px 8px", borderRadius: 8,
                                    background: saving || !editLabel.trim()
                                        ? "rgba(0,180,160,0.07)" : "rgba(0,180,160,0.15)",
                                    border: "1px solid rgba(0,180,160,0.3)",
                                    color: saving || !editLabel.trim() ? "rgba(0,180,160,0.4)" : "#00b4a0",
                                    fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer",
                                    transition: "all 0.15s"
                                }}
                            >
                                {saving ? "Saving…" : "✓ Save"}
                            </button>
                            <button
                                onClick={() => setActiveDetectionId(null)}
                                disabled={saving}
                                style={{ flex: 1, padding: "9px 8px", borderRadius: 8, background: "rgba(232,97,58,0.1)", border: "1px solid rgba(232,97,58,0.25)", color: "#e8613a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* FILMSTRIP */}
            <div style={{ gridColumn: "1 / span 2", display: "flex", gap: 8, overflowX: "auto", alignItems: "center", paddingBottom: 4 }}>
                {frames.map((f, i) => (
                    <img
                        key={f.id}
                        src={f.frame_url}
                        onClick={() => goToFrame(i)}
                        style={{
                            height: 68, minWidth: 110, objectFit: "cover", borderRadius: 6, cursor: "pointer",
                            opacity: i === activeFrameIndex ? 1 : 0.45,
                            border: i === activeFrameIndex ? "2px solid #00b4a0" : "2px solid transparent",
                            transition: "all 0.15s", flexShrink: 0
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

// Build this once from all detections in the frame, outside the component or as a useMemo
function buildLabelColorMap(detections: any[]): Map<string, string> {
    const uniqueLabels = [...new Set(detections.map(d => d.display_label || "Unknown"))];
    const map = new Map<string, string>();

    uniqueLabels.forEach((label, i) => {
        // Spread evenly around the wheel, offset by golden angle to avoid similar hues
        const hue = (i * 137.508) % 360;
        map.set(label, `hsl(${hue}, 75%, 58%)`);
    });

    return map;
}

function iou(a: number[], b: number[]): number {
    const [ax1, ay1, ax2, ay2] = a;
    const [bx1, by1, bx2, by2] = b;

    const interX1 = Math.max(ax1, bx1);
    const interY1 = Math.max(ay1, by1);
    const interX2 = Math.min(ax2, bx2);
    const interY2 = Math.min(ay2, by2);

    const interW = Math.max(0, interX2 - interX1);
    const interH = Math.max(0, interY2 - interY1);
    const interArea = interW * interH;

    const aArea = (ax2 - ax1) * (ay2 - ay1);
    const bArea = (bx2 - bx1) * (by2 - by1);

    return interArea / (aArea + bArea - interArea);
}

const IOU_THRESHOLD = 0.85; // tweak this — higher = only merge near-identical boxes

function groupDetections(detections: any[]): { primary: any; overlapping: any[] }[] {
    const sorted = [...detections].sort((a, b) => b.score - a.score);
    const used = new Set<string>();
    const groups: { primary: any; overlapping: any[] }[] = [];

    for (const det of sorted) {
        if (used.has(det.id)) continue;
        const group = { primary: det, overlapping: [] as any[] };
        used.add(det.id);

        for (const other of sorted) {
            if (used.has(other.id)) continue;
            if (iou(det.bbox, other.bbox) >= IOU_THRESHOLD) {
                group.overlapping.push(other);
                used.add(other.id);
            }
        }
        groups.push(group);
    }

    return groups;
}