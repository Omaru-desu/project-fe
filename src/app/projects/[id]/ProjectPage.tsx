"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Detection, ProjectDetail } from "../../../types/project";
import * as api from "../../../lib/api";
import styles from "./ProjectPage.module.css";
import UploadMediaModal from "../../../components/projects/UploadMediaModal";

interface Props {
    projectId: string;
}

type Filter = "all" | "needs_review" | "reviewed";
type Sort = "conf-asc" | "conf-desc" | "frame";

export default function ProjectPage({ projectId }: Props) {
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("conf-asc");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [showUpload, setShowUpload] = useState(false);

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [detections, setDetections] = useState<Detection[]>([]);

    useEffect(() => {
        api.getProjects().then(projects => {
            const found = projects.find(p => p.id === projectId);
            if (!found) router.push("/projects");
            else setProject(found as any);
        }).catch(() => router.push("/projects"));
    }, [projectId]);

    if (!project) return (
        <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
        </div>
    );

    const visible = detections
        .filter(d => {
            const matchFilter = filter === "all" || d.status === filter;
            const q = search.toLowerCase();
            const matchSearch = !q || d.label.toLowerCase().includes(q) || d.frameId.toLowerCase().includes(q) || d.taxon.toLowerCase().includes(q);
            return matchFilter && matchSearch;
        })
        .sort((a, b) => {
            if (sort === "conf-asc") return a.confidence - b.confidence;
            if (sort === "conf-desc") return b.confidence - a.confidence;
            return a.frameId.localeCompare(b.frameId);
        });

    const reviewed = detections.filter(d => d.status === "reviewed").length;
    const needsReview = detections.filter(d => d.status === "needs_review").length;
    const pct = detections.length > 0 ? Math.round((reviewed / detections.length) * 100) : 0;

    function toggleSelect(id: string) {
        const isSelected = selected.includes(id);
        if (isSelected) {
            setSelected(selected.filter(s => s !== id)); // delete
        } else {
            setSelected([...selected, id]); // add
        }
    }

    function toggleSelectAll() {
        if (selected.length === visible.length) {
            setSelected([]); // clear
        } else {
            setSelected(visible.map(d => d.id)); // select all
        }
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
                    <span className={styles.statVal}>{new Set(detections.map(d => d.label)).size}</span>
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
                        <button className={styles.bulkBtn} onClick={markSelectedReviewed}>
                            Mark as reviewed
                        </button>
                        <button
                            className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
                            onClick={() => setSelected([])}
                        >
                            Clear selection
                        </button>
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
                            placeholder="Search species, frame ID…"
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
                        <option value="frame">Frame ID</option>
                    </select>
                </div>
            </div>

            {/* GRID */}
            <div className={styles.grid}>
                {visible.length === 0 ? (
                    <div className={styles.emptyState}>No detections match your filter.</div>
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
    const cc = d.confidence >= 0.75 ? "High" : d.confidence >= 0.5 ? "Mid" : "Low";
    let fillClass = styles.confFillLow;
    if (cc === "High") fillClass = styles.confFillHigh;
    if (cc === "Mid") fillClass = styles.confFillMid;

    let valClass = styles.confValLow;
    if (cc === "High") valClass = styles.confValHigh;
    if (cc === "Mid") valClass = styles.confValMid;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawFrame(ctx, canvas.width, canvas.height, d);
    }, [d]);

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
                <canvas ref={canvasRef} width={300} height={170} className={styles.cardCanvas} />
                <div className={styles.frameBadge}>{d.frameId} · {d.timestamp}</div>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                    <div>
                        <div className={styles.cardLabel}>{d.label}</div>
                        <div className={styles.cardTaxon}>{d.taxon}</div>
                    </div>
                    <span className={`${styles.statusPill} ${d.status === "reviewed" ? styles.statusReviewed : styles.statusNeeds}`}>
                        {d.status === "reviewed" ? "Reviewed" : "Needs review"}
                    </span>
                </div>

                <div className={styles.confRow}>
                    <span className={styles.confLbl}>Conf.</span>
                    <div className={styles.confBar}>
                        <div className={`${styles.confFill} ${fillClass}`} style={{ width: `${d.confidence * 100}%` }} />

                    </div>
                    <span className={`${styles.confVal} ${valClass}`}>
                        {Math.round(d.confidence * 100)}%
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

/* CANVAS DRAW */
function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, d: Detection) {
    const col: Record<Detection["color"], string> = {
        teal: "#00b4a0",
        coral: "#e8613a",
        ocean: "#0090cc"
    };
    const c = col[d.color];

    // background
    ctx.fillStyle = "#040c14";
    ctx.fillRect(0, 0, w, h);

    // bounding box
    const bx = w * d.bbox.x / 100, by = h * d.bbox.y / 100;
    const bw = w * d.bbox.w / 100, bh = h * d.bbox.h / 100;

    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // label
    ctx.fillStyle = c;
    ctx.font = "bold 10px system-ui";
    ctx.textBaseline = "bottom";
    const lbl = `${d.label} ${Math.round(d.confidence * 100)}%`;
    const tw = ctx.measureText(lbl).width;
    ctx.fillRect(bx, by - 16, tw + 8, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(lbl, bx + 4, by);
}