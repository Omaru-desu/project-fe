"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Detection } from "../../../types/project";
import * as api from "../../../lib/api";
import styles from "./ProjectPage.module.css";
import UploadMediaModal from "../../../components/projects/UploadMediaModal";
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

    useEffect(() => {
        api.getProjects().then(projects => {
            const found = projects.find(p => p.id === projectId);
            if (!found) router.push("/projects");
            else setProject(found);
        }).catch(() => router.push("/projects"));
    }, [projectId, router]);

    const fetchDetections = async () => {
        const data = await api.getProjectFrames(projectId);
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
                const status = await api.getUploadStatus(uploadId);
                setProcessing({
                    uploadId,
                    totalFrames: status.total_frames,
                    framesProcessed: status.frames_processed,
                    status: status.status,
                });
                await fetchDetections();

                if (status.status === "segmented" || status.status === "failed") {
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
        }).catch(console.error);

        return () => {
            cancelled = true;
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
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

    function markSelectedReviewed() {
        setDetections(prev => prev.map(d => selected.includes(d.id) ? { ...d, status: "reviewed" as const } : d));
        setSelected([]);
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

            {/* GRID */}
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
                            onMarkReviewed={() => markReviewed(d.id)}
                        />
                    ))
                )}
            </div>

            {showUpload && (
                <UploadMediaModal
                    projectId={projectId}
                    onClose={() => setShowUpload(false)}
                    onUploadComplete={handleUploadComplete}
                />
            )}
        </div>
    );
}

/* DETECTION CARD */
function DetectionCard({ detection: d, selected, onToggleSelect, onMarkReviewed }: {
    detection: Detection;
    selected: boolean;
    onToggleSelect: () => void;
    onMarkReviewed: () => void;
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
    }, [d.frame_id, d.bbox, d.display_label]);

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
                        <button className={styles.btnReview} onClick={onMarkReviewed}>Review</button>
                    ) : (
                        <span className={styles.btnReviewed}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5" stroke="var(--teal)" strokeWidth="1.2" />
                                <path d="M3.5 6l2 2 3-3" stroke="var(--teal)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Reviewed
                        </span>
                    )}
                    <button className={styles.btnDetail}>Details →</button>
                </div>
            </div>
        </div>
    );
}