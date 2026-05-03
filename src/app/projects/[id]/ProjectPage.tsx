"use client";

import {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    Fragment,
} from "react";
import { useRouter } from "next/navigation";
import {
    Image as ImageIcon,
    Tag,
    Cpu,
    Database,
    ChevronLeft,
    Menu,
    Bell,
    Search,
    X,
    LogOut,
    Plus,
    Activity,
    CheckCircle,
    Eye,
    Zap,
    Download,
    SkipBack,
    ChevronRight,
    Fish,
    type LucideIcon,
} from "lucide-react";
import { Detection } from "../../../types/project";
import * as api from "../../../lib/api";
import type { BoundingBox } from "../../../lib/api";
import { logout } from "../../login/actions";
import styles from "./ProjectPage.module.css";
import UploadMediaModal from "../../../components/projects/UploadMediaModal";
import ReviewModal from "../../../components/projects/ReviewModal";

const frameCache = new Map<string, string>();

interface Props {
    projectId: string;
}

type Screen = "gallery" | "annotate" | "models" | "datasets";
type StatusFilter = "all" | "reviewed" | "needs_review";

interface ProcessingStatus {
    uploadId: string;
    totalFrames: number;
    framesProcessed: number;
    status: string;
}

interface FrameRow {
    id: string;
    upload_id: string;
    source_filename: string;
    frame_gcs_uri: string;
    status: string;
    detections: {
        id: string;
        bbox: number[];
        label_id: string;
        status: string;
        taxon: string | null;
        display_label: string;
        score: number;
        annotation_source: "machine" | "human";
    }[];
    frame_url: string;
}

const STATUS_DOTS: Record<string, string> = {
    reviewed: "var(--success)",
    needs_review: "var(--text3)",
    flagged: "var(--warning)",
};

function StatusBadge({
    label,
    color,
    bg,
}: {
    label: string;
    color: string;
    bg: string;
}) {
    return (
        <span
            className={styles.statusPill}
            style={{ background: bg, color }}
        >
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: color,
                }}
            />
            {label}
        </span>
    );
}

function ProgressBar({
    value,
    color = "var(--primary)",
    height = 5,
}: {
    value: number;
    color?: string;
    height?: number;
}) {
    return (
        <div
            className={styles.progressTrack}
            style={{ height, background: "var(--border)" }}
        >
            <div
                className={styles.progressFill}
                style={{
                    width: `${Math.min(100, Math.max(0, value))}%`,
                    background: color,
                }}
            />
        </div>
    );
}

export default function ProjectPage({ projectId }: Props) {
    const router = useRouter();

    const [project, setProject] = useState<{
        id: string;
        name: string;
        type?: "active" | "test";
    } | null>(null);
    const [frames, setFrames] = useState<FrameRow[]>([]);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [processing, setProcessing] = useState<ProcessingStatus | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const [screen, setScreen] = useState<Screen>("gallery");
    const [collapsed, setCollapsed] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [reviewDetection, setReviewDetection] = useState<Detection | null>(null);

    // Gallery filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [search, setSearch] = useState("");
    const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);


    // Project lookup
    useEffect(() => {
        api
            .getProjects()
            .then(projects => {
                const found = projects.find(p => p.id === projectId);
                if (!found) router.push("/projects");
                else setProject(found);
            })
            .catch(() => router.push("/projects"));
    }, [projectId, router]);

    function rebuildDetections(rows: FrameRow[]) {
        const all: Detection[] = [];
        for (const f of rows) {
            for (const det of f.detections) {
                all.push({
                    ...det,
                    frame_id: f.id,
                    source_filename: f.source_filename,
                    frame_url: f.frame_url,
                    display_label: det.display_label ?? "",
                    score: det.score ?? 0,
                    status:
                        det.status === "reviewed"
                            ? "reviewed"
                            : ("needs_review" as "reviewed" | "needs_review"),
                    annotation_source: det.annotation_source ?? "machine",
                });
            }
        }
        setDetections(all);
    }

    // Initial frames load
    useEffect(() => {
        let cancelled = false;
        api
            .getProjectFrames(projectId)
            .then(data => {
                if (cancelled) return;
                setFrames(data.frames as FrameRow[]);
                rebuildDetections(data.frames as FrameRow[]);

                const inProgress = data.frames.filter(
                    f =>
                        f.status === "queued" ||
                        f.status === "segmenting" ||
                        f.status === "processing_frames"
                );
                if (inProgress.length > 0) {
                    startPolling(inProgress[0].upload_id, data.frames.length);
                }
            })
            .catch(console.error);

        return () => {
            cancelled = true;
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    function startPolling(uploadId: string, totalFrames: number) {
        setProcessing({
            uploadId,
            totalFrames,
            framesProcessed: 0,
            status: "processing",
        });

        pollingRef.current = setInterval(async () => {
            try {
                const data = await api.getProjectFrames(projectId);
                setFrames(data.frames as FrameRow[]);
                rebuildDetections(data.frames as FrameRow[]);

                const total = data.frames.length;
                const processed = data.frames.filter(f => f.status === "segmented").length;

                setProcessing({
                    uploadId,
                    totalFrames: total,
                    framesProcessed: processed,
                    status: processed === total ? "ready" : "processing",
                });

                if (processed === total) {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    pollingRef.current = null;
                    setProcessing(null);
                }
            } catch (err) {
                console.error(err);
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = null;
                setProcessing(null);
            }
        }, 3000);
    }

    function handleUploadComplete(uploadId: string, totalFrames: number) {
        setShowUpload(false);
        startPolling(uploadId, totalFrames);
    }

    function handleModalReviewed(id: string, newLabel: string) {
        setDetections(prev =>
            prev.map(d =>
                d.id === id
                    ? { ...d, status: "reviewed" as const, display_label: newLabel }
                    : d
            )
        );
        setReviewDetection(null);
    }

    // Stats
    const reviewed = detections.filter(d => d.status === "reviewed").length;
    const needsReview = detections.filter(d => d.status === "needs_review").length;
    const total = detections.length;
    const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    // Frame stats (status per-frame derived from detections)
    const frameStatus: Record<string, "reviewed" | "needs_review" | "no_detections"> = {};
    for (const f of frames) {
        const dets = detections.filter(d => d.frame_id === f.id);
        if (dets.length === 0) frameStatus[f.id] = "no_detections";
        else if (dets.every(d => d.status === "reviewed"))
            frameStatus[f.id] = "reviewed";
        else frameStatus[f.id] = "needs_review";
    }

    const visibleFrames = useMemo(() => {
        return frames.filter(f => {
            const fStatus = frameStatus[f.id];
            const matchStatus =
                statusFilter === "all" ||
                (statusFilter === "reviewed" && fStatus === "reviewed") ||
                (statusFilter === "needs_review" &&
                    (fStatus === "needs_review" || fStatus === "no_detections"));
            const q = search.trim().toLowerCase();
            const matchSearch =
                !q ||
                f.source_filename.toLowerCase().includes(q) ||
                detections.some(
                    d =>
                        d.frame_id === f.id &&
                        ((d.display_label ?? "").toLowerCase().includes(q) ||
                            (d.taxon ?? "").toLowerCase().includes(q))
                );
            return matchStatus && matchSearch;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frames, detections, statusFilter, search]);

    if (!project) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner} />
            </div>
        );
    }

    const selectedDetection = detections.find(d => d.id === selectedDetectionId) ?? null;
    const selectedFrame = selectedDetection
        ? frames.find(f => f.id === selectedDetection.frame_id) ?? null
        : null;

    const selectedFrameDetections = selectedFrame
        ? detections.filter(d => d.frame_id === selectedFrame.id)
        : [];

    return (
        <div className={styles.shell}>
            {/* SIDEBAR */}
            <Sidebar
                screen={screen}
                setScreen={setScreen}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                project={project}
                pendingCount={needsReview}
                onBack={() => router.push("/projects")}
            />

            {/* MAIN */}
            <div className={styles.main}>
                {screen === "gallery" && (
                    <GalleryScreen
                        project={project}
                        frames={frames}
                        visibleFrames={visibleFrames}
                        frameStatus={frameStatus}
                        detectionsByFrame={detections}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        search={search}
                        setSearch={setSearch}
                        selectedDetectionId={selectedDetectionId}
                        setSelectedDetectionId={setSelectedDetectionId}
                        selectedFrame={selectedFrame}
                        selectedFrameDetections={selectedFrameDetections}
                        reviewedCount={reviewed}
                        needsReviewCount={needsReview}
                        totalDetections={total}
                        pct={pct}
                        processing={processing}
                        onUpload={() => setShowUpload(true)}
                        onStartAnnotating={() => setScreen("annotate")}
                        onOpenReview={(d) => setReviewDetection(d)}
                    />
                )}
                {screen === "annotate" && (
                    <AnnotateScreen
                        project={project}
                        frames={frames}
                        projectId={projectId}
                    />
                )}
                {screen === "models" && <ModelsScreen />}
                {screen === "datasets" && <DatasetsScreen frames={frames} />}
            </div>

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

/* ──────────────────────────────────────────────────────────────────────────
   SIDEBAR
   ────────────────────────────────────────────────────────────────────────── */
function Sidebar({
    screen,
    setScreen,
    collapsed,
    setCollapsed,
    project,
    pendingCount,
    onBack,
}: {
    screen: Screen;
    setScreen: (s: Screen) => void;
    collapsed: boolean;
    setCollapsed: (b: boolean) => void;
    project: { id: string; name: string; type?: "active" | "test" };
    pendingCount: number;
    onBack: () => void;
}) {
    const navItems: {
        id: Screen;
        label: string;
        Icon: LucideIcon;
        badge?: number;
    }[] = [
            { id: "gallery", label: "Images", Icon: ImageIcon },
            { id: "annotate", label: "Annotate", Icon: Tag, badge: pendingCount },
            { id: "models", label: "Model Performance", Icon: Cpu },
            { id: "datasets", label: "Datasets", Icon: Database },
        ];

    return (
        <aside
            className={styles.sidebar}
            style={{ width: collapsed ? 60 : 220 }}
        >
            <div
                className={`${styles.sidebarHeader} ${collapsed ? styles.sidebarHeaderCollapsed : ""}`}
            >
                <div className={styles.brand}>
                    <div className={styles.logoMark}>
                        <Fish size={17} color="#fff" />
                    </div>
                    {!collapsed && <div className={styles.brandName}>OMarine</div>}
                </div>
                {!collapsed && (
                    <button
                        className={styles.collapseBtn}
                        onClick={() => setCollapsed(true)}
                        aria-label="Collapse sidebar"
                    >
                        <ChevronLeft size={13} color="rgba(255,255,255,0.5)" />
                    </button>
                )}
            </div>

            {collapsed && (
                <button
                    className={styles.expandBtn}
                    onClick={() => setCollapsed(false)}
                    aria-label="Expand sidebar"
                >
                    <Menu size={14} color="rgba(255,255,255,0.5)" />
                </button>
            )}

            <button
                onClick={onBack}
                className={`${styles.backBtn} ${collapsed ? styles.backBtnCollapsed : ""}`}
                title={collapsed ? "All projects" : ""}
            >
                <ChevronLeft size={14} color="rgba(255,255,255,0.5)" />
                {!collapsed && "All Projects"}
            </button>

            {!collapsed && (
                <div className={styles.projectMeta}>
                    <div className={styles.projectMetaLabel}>Current Project</div>
                    <div className={styles.projectMetaName}>{project.name}</div>
                    <div className={styles.projectMetaStatus}>
                        <span
                            className={styles.statusDot}
                            style={{
                                background:
                                    project.type === "active"
                                        ? "var(--success)"
                                        : "var(--warning)",
                            }}
                        />
                        {project.type ?? "active"}
                    </div>
                </div>
            )}

            <nav className={`${styles.nav} ${collapsed ? styles.navCollapsed : ""}`}>
                {navItems.map(item => {
                    const active = screen === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setScreen(item.id)}
                            title={collapsed ? item.label : ""}
                            className={`${styles.navItem} ${active ? styles.navItemActive : ""} ${collapsed ? styles.navItemCollapsed : ""}`}
                        >
                            <item.Icon
                                size={15}
                                color={
                                    active
                                        ? "var(--primary-light)"
                                        : "rgba(255,255,255,0.4)"
                                }
                            />
                            {!collapsed && item.label}
                            {!collapsed && item.badge && item.badge > 0 ? (
                                <span className={styles.navBadge}>{item.badge}</span>
                            ) : null}
                        </button>
                    );
                })}
            </nav>

            <div className={styles.sidebarFooter}>
                <form action={logout}>
                    <button
                        type="submit"
                        className={`${styles.logoutBtn} ${collapsed ? styles.logoutBtnCollapsed : ""}`}
                        title={collapsed ? "Log out" : ""}
                    >
                        <LogOut size={14} color="rgba(255,100,100,0.7)" />
                        {!collapsed && "Log out"}
                    </button>
                </form>
                {collapsed ? (
                    <div className={styles.userPill} style={{ justifyContent: "center" }}>
                        <div className={styles.userAvatar}>JL</div>
                    </div>
                ) : (
                    <div className={styles.userPill}>
                        <div className={styles.userAvatar}>JL</div>
                        <div>
                            <div className={styles.userName}>J. Lambert</div>
                            <div className={styles.userRole}>Marine Ecologist</div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   GALLERY SCREEN (Images)
   ────────────────────────────────────────────────────────────────────────── */
function GalleryScreen({
    project,
    frames,
    visibleFrames,
    frameStatus,
    detectionsByFrame,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    selectedDetectionId,
    setSelectedDetectionId,
    selectedFrame,
    selectedFrameDetections,
    reviewedCount,
    needsReviewCount,
    totalDetections,
    pct,
    processing,
    onUpload,
    onStartAnnotating,
    onOpenReview,
}: {
    project: { name: string };
    frames: FrameRow[];
    visibleFrames: FrameRow[];
    frameStatus: Record<string, "reviewed" | "needs_review" | "no_detections">;
    detectionsByFrame: Detection[];
    statusFilter: StatusFilter;
    setStatusFilter: (s: StatusFilter) => void;
    search: string;
    setSearch: (s: string) => void;
    selectedFrame: FrameRow | null;
    selectedFrameDetections: Detection[];
    selectedDetectionId: string | null;
    setSelectedDetectionId: (id: string | null) => void;
    reviewedCount: number;
    needsReviewCount: number;
    totalDetections: number;
    pct: number;
    processing: ProcessingStatus | null;
    onUpload: () => void;
    onStartAnnotating: () => void;
    onOpenReview: (d: Detection) => void;
}) {
    const stats = [
        {
            key: "needs_review" as StatusFilter,
            label: "Needs review",
            count: needsReviewCount,
            color: "var(--text3)",
            bg: "var(--surface2)",
        },
        {
            key: "reviewed" as StatusFilter,
            label: "Reviewed",
            count: reviewedCount,
            color: "var(--success)",
            bg: "rgba(94,201,154,0.1)",
        },
    ];
    const [sortConf, setSortConf] = useState<"off" | "high" | "low">("off");

    return (
        <>
            {/* Topbar */}
            <div className={styles.topbar}>
                <div>
                    <div className={styles.topbarTitle}>{project.name}</div>
                    <div className={styles.topbarSubtitle}>
                        {frames.length} frame{frames.length !== 1 ? "s" : ""}
                        {totalDetections > 0 && ` · ${pct}% reviewed`}
                    </div>
                </div>
                <div className={styles.topbarActions}>
                    <button onClick={onUpload} className={styles.btnSecondary}>
                        <Plus size={13} />
                        Upload media
                    </button>
                    <button className={styles.bellBtn} aria-label="Notifications">
                        <Bell size={15} />
                    </button>
                </div>
            </div>

            {/* Processing bar */}
            {processing && (
                <div className={styles.processingBar}>
                    <div className={styles.processingSpinner} />
                    <span className={styles.processingLabel}>
                        Analysing frames — {processing.framesProcessed} of{" "}
                        {processing.totalFrames} processed
                    </span>
                    <div className={styles.processingTrack}>
                        <div
                            className={styles.processingFill}
                            style={{
                                width: `${processing.totalFrames > 0
                                    ? (processing.framesProcessed / processing.totalFrames) * 100
                                    : 0
                                    }%`,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Stats strip */}
            <div className={styles.statsStrip}>
                {stats.map(s => {
                    const active = statusFilter === s.key;
                    return (
                        <button
                            key={s.key}
                            onClick={() =>
                                setStatusFilter(active ? "all" : s.key)
                            }
                            className={styles.statChip}
                            style={{
                                borderColor: active ? s.color : "transparent",
                                background: active ? s.bg : "transparent",
                            }}
                        >
                            <span
                                className={styles.statChipDot}
                                style={{ background: s.color }}
                            />
                            <span
                                className={styles.statChipCount}
                                style={{ color: s.color }}
                            >
                                {s.count}
                            </span>
                            <span className={styles.statChipLabel}>{s.label}</span>
                        </button>
                    );
                })}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <div className={styles.searchBox}>
                        <Search size={14} color="var(--text3)" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search frames…"
                            className={styles.searchInput}
                        />
                    </div>
                    {statusFilter !== "all" && (
                        <button
                            onClick={() => setStatusFilter("all")}
                            className={styles.btnSecondary}
                            style={{ padding: "5px 10px", fontSize: 11 }}
                        >
                            Clear filter
                        </button>
                    )}
                    <select
                        value={sortConf}
                        onChange={e => setSortConf(e.target.value as "off" | "high" | "low")}
                        className={styles.btnSecondary}
                        style={{ padding: "5px 10px", fontSize: 11, cursor: "pointer" }}
                    >
                        <option value="off">Sort by confidence</option>
                        <option value="high">Confidence ↓ high</option>
                        <option value="low">Confidence ↑ low</option>
                    </select>
                </div>
            </div>

            {/* Body: frame grid + detail panel */}
            <div className={styles.galleryBody}>
                <div className={styles.frameGrid}>
                    {(() => {
                        const visibleFrameIds = new Set(visibleFrames.map(f => f.id));

                        const visibleDetections = detectionsByFrame.filter(d =>
                            visibleFrameIds.has(d.frame_id)
                        );

                        const sorted = sortConf === "high"
                            ? [...visibleDetections].sort((a, b) => b.score - a.score)
                            : sortConf === "low"
                                ? [...visibleDetections].sort((a, b) => a.score - b.score)
                                : visibleDetections;

                        if (visibleDetections.length === 0) {
                            return (
                                <div className={styles.emptyState}>
                                    {frames.length === 0
                                        ? processing
                                            ? "Waiting for frames…"
                                            : "No frames yet — upload media to get started."
                                        : "No detections match this filter."}
                                </div>
                            );
                        }

                        return sorted.map(det => {
                            const frame = frames.find(f => f.id === det.frame_id);
                            if (!frame) return null;
                            return (
                                <DetectionThumb
                                    key={det.id}
                                    detection={det}
                                    frame={frame}
                                    selected={selectedDetectionId === det.id}
                                    onClick={() =>
                                        setSelectedDetectionId(
                                            selectedDetectionId === det.id ? null : det.id
                                        )
                                    }
                                />
                            );
                        });
                    })()}
                </div>

                {selectedFrame && (
                    <FrameDetailPanel
                        frame={selectedFrame}
                        detections={selectedFrameDetections}
                        status={frameStatus[selectedFrame.id]}
                        selectedDetectionId={selectedDetectionId}
                        onClose={() => setSelectedDetectionId(null)}
                        onAnnotate={onStartAnnotating}
                        onOpenReview={onOpenReview}
                    />
                )}
            </div>
        </>
    );
}

function DetectionThumb({
    detection,
    frame,
    selected,
    onClick,
}: {
    detection: Detection;
    frame: FrameRow;
    selected: boolean;
    onClick: () => void;
}) {
    const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
    const statusColor =
        detection.status === "reviewed" ? "var(--success)" : "var(--warning)";

    const frameDets = frame.detections;

    return (
        <div
            onClick={onClick}
            className={`${styles.frameThumb} ${selected ? styles.frameThumbSelected : ""}`}
        >
            <img
                src={frame.frame_url}
                alt={frame.source_filename}
                className={styles.frameThumbImg}
                loading="lazy"
                onLoad={(e) => {
                    const img = e.currentTarget;
                    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                }}
            />

            {/* selected overlay */}
            {selected && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(127, 163, 232, 0.15)",
                    zIndex: 2,
                    pointerEvents: "none",
                }} />
            )}

            {/* loading overlay */}
            {frame.status !== "segmented" && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(10, 16, 24, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 3,
                    pointerEvents: "none",
                }}>
                    <div className={styles.loadingSpinner} style={{ width: 20, height: 20, borderWidth: 2 }} />
                </div>
            )}

            {/* bbox overlay */}
            {imgSize && (() => {
                const [x1, y1, x2, y2] = detection.bbox;
                const left = (x1 / imgSize.w) * 100;
                const top = (y1 / imgSize.h) * 100;
                const width = ((x2 - x1) / imgSize.w) * 100;
                const height = ((y2 - y1) / imgSize.h) * 100;
                return (
                    <div
                        key={detection.id}
                        style={{
                            position: "absolute",
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                            border: "1.5px solid #ff4444",
                            boxSizing: "border-box",
                            pointerEvents: "none",
                            zIndex: 1,
                        }}
                    />
                );
            })()}
        </div>
    );
}

function FrameDetailPanel({
    frame,
    detections,
    status,
    onClose,
    onAnnotate,
    onOpenReview,
    selectedDetectionId,
}: {
    frame: FrameRow;
    detections: Detection[];
    status: "reviewed" | "needs_review" | "no_detections" | undefined;
    selectedDetectionId: string | null;
    onClose: () => void;
    onAnnotate: () => void;
    onOpenReview: (d: Detection) => void;
}) {
    const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
    const statusBadge =
        status === "reviewed"
            ? { label: "Reviewed", color: "var(--success)", bg: "rgba(94,201,154,0.12)" }
            : status === "needs_review"
                ? { label: "Needs review", color: "var(--warning)", bg: "rgba(245,188,98,0.15)" }
                : { label: "No detections", color: "var(--text3)", bg: "var(--surface2)" };

    return (
        <div className={styles.detailPanel}>
            <div className={styles.detailPanelHeader}>
                <div className={styles.detailPanelTitle}>Frame Detail</div>
                <button
                    onClick={onClose}
                    aria-label="Close detail panel"
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 5,
                        border: "1.5px solid var(--border)",
                        background: "var(--surface)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <X size={12} color="var(--text3)" />
                </button>
            </div>
            <div className={styles.detailPanelBody}>
                <div
                    style={{
                        borderRadius: 8,
                        overflow: "hidden",
                        aspectRatio: "4/3",
                        background: "#11293f",
                        position: "relative",
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={frame.frame_url}
                        alt={frame.source_filename}
                        style={{ width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                        }}
                    />

                    {imgSize && detections
                        .filter(det => selectedDetectionId === null || det.id === selectedDetectionId)
                        .map((det) => {
                            const [x1, y1, x2, y2] = det.bbox;
                            const left = (x1 / imgSize.w) * 100;
                            const top = (y1 / imgSize.h) * 100;
                            const width = ((x2 - x1) / imgSize.w) * 100;
                            const height = ((y2 - y1) / imgSize.h) * 100;
                            return (
                                <div
                                    key={det.id}
                                    style={{
                                        position: "absolute",
                                        left: `${left}%`,
                                        top: `${top}%`,
                                        width: `${width}%`,
                                        height: `${height}%`,
                                        border: "1.5px solid #ff4444",
                                        boxSizing: "border-box",
                                        pointerEvents: "none",
                                        zIndex: 1,
                                    }}
                                />
                            );
                        })}
                </div>

                <div>
                    <div className={styles.detailLabel}>Frame</div>
                    <div className={`${styles.detailValue} ${styles.detailValueMono}`} style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}>
                        {frame.source_filename}
                    </div>
                </div>

                <div>
                    <div className={styles.detailLabel}>Status</div>
                    <StatusBadge
                        label={statusBadge.label}
                        color={statusBadge.color}
                        bg={statusBadge.bg}
                    />
                </div>

                {detections.length > 0 && (
                    <div>
                        <div className={styles.detailLabel}>
                            Detections ({detections.length})
                        </div>
                        <div className="flex flex-col" style={{ gap: 6 }}>
                            {detections.sort((a, b) => b.score - a.score).slice(0, 4).map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => onOpenReview(d)}
                                    style={{
                                        textAlign: "left",
                                        padding: "8px 10px",
                                        borderRadius: 7,
                                        border: "1.5px solid var(--border)",
                                        background: "var(--surface2)",
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                fontStyle: "italic",
                                                color: "var(--text1)",
                                            }}
                                        >
                                            {d.display_label || "Unknown"}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color:
                                                    d.score > 0.75
                                                        ? "var(--success)"
                                                        : d.score > 0.5
                                                            ? "var(--warning)"
                                                            : "var(--danger)",
                                            }}
                                        >
                                            {Math.round(d.score * 100)}%
                                        </span>
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                        <ProgressBar
                                            value={d.score * 100}
                                            color={
                                                d.score > 0.75
                                                    ? "var(--success)"
                                                    : d.score > 0.5
                                                        ? "var(--warning)"
                                                        : "var(--danger)"
                                            }
                                            height={3}
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col" style={{ gap: 6, paddingTop: 4 }}>
                    <button
                        onClick={onAnnotate}
                        className={styles.btnPrimary}
                        style={{ width: "100%", justifyContent: "center" }}
                    >
                        Open in Annotator
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   ANNOTATE SCREEN
   ────────────────────────────────────────────────────────────────────────── */
function AnnotateScreen({
    project,
    frames,
    projectId,
}: {
    project: { name: string };
    frames: FrameRow[];
    projectId: string;
}) {
    const [selectedFrameId, setSelectedFrameId] = useState<string | null>(
        frames[0]?.id ?? null
    );
    const selectedFrame = frames.find(f => f.id === selectedFrameId);
    const selectedFrameIndex = frames.findIndex(f => f.id === selectedFrameId);

    if (!selectedFrameId || !selectedFrame) {
        return (
            <>
                <div className={styles.topbar}>
                    <div>
                        <div className={styles.topbarTitle}>Annotate</div>
                        <div className={styles.topbarSubtitle}>{project.name}</div>
                    </div>
                </div>
                <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
                    <div
                        style={{
                            fontSize: 13,
                            color: "var(--text3)",
                            marginBottom: 12,
                        }}
                    >
                        {frames.length} frame{frames.length !== 1 ? "s" : ""} — click to
                        annotate
                    </div>
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: 12,
                        }}
                    >
                        {frames.map(f => (
                            <div
                                key={f.id}
                                onClick={() => setSelectedFrameId(f.id)}
                                style={{
                                    borderRadius: 10,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface)",
                                    boxShadow: "var(--shadow-sm)",
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={f.frame_url}
                                    alt={f.source_filename}
                                    style={{
                                        width: "100%",
                                        height: 140,
                                        objectFit: "cover",
                                        display: "block",
                                    }}
                                />
                                <div style={{ padding: "8px 10px" }}>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "var(--text1)",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {f.source_filename}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--text3)",
                                            marginTop: 2,
                                        }}
                                    >
                                        {f.detections.length} detection
                                        {f.detections.length !== 1 ? "s" : ""}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    }

    return (
        <AnnotateReview
            project={project}
            frames={frames}
            initialFrameIndex={selectedFrameIndex}
            projectId={projectId}
            onBack={() => setSelectedFrameId(null)}
            onFrameChange={i => setSelectedFrameId(frames[i]?.id ?? null)}
        />
    );
}

function AnnotateReview({
    project,
    frames,
    initialFrameIndex,
    projectId,
    onBack,
    onFrameChange,
}: {
    project: { name: string };
    frames: FrameRow[];
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
    const detectionGroups = useMemo(
        () => groupDetections(detections),
        [detections]
    );
    const [labelColorMap, setLabelColorMap] = useState<Map<string, string>>(
        new Map()
    );

    const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
    const [activeBboxId, setActiveBboxId] = useState<string | null>(null);
    const [loadingBboxes, setLoadingBboxes] = useState(false);

    const [drawMode, setDrawMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const drawStart = useRef<{ x: number; y: number } | null>(null);
    const drawCurrent = useRef<{ x: number; y: number } | null>(null);

    const [pendingBox, setPendingBox] = useState<{
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | null>(null);
    const [labelInput, setLabelInput] = useState("");
    const [savingBbox, setSavingBbox] = useState(false);

    useEffect(() => {
        if (!frame) return;
        setActiveDetectionId(null);
        setActiveBboxId(null);
        setEditLabel("");
        setSaveError(null);
        setPendingBox(null);
        setDrawMode(false);
        setIsDrawing(false);

        setLoadingDets(true);
        api
            .getFrameDetections(projectId, frame.id)
            .then(data => {
                const dets = (data.detections ?? data).filter(
                    (d: any) => d.annotation_source !== "human"
                );
                setDetections(dets);
                setLabelColorMap(buildLabelColorMap(dets));
            })
            .catch(console.error)
            .finally(() => setLoadingDets(false));

        setLoadingBboxes(true);
        api
            .getBoundingBoxes(projectId, frame.id)
            .catch(() => [] as BoundingBox[])
            .then(data => setBoundingBoxes(data))
            .finally(() => setLoadingBboxes(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frame?.id, projectId]);

    useEffect(() => {
        if (!activeDetectionId) {
            setEditLabel("");
            return;
        }
        const det = detections.find(d => d.id === activeDetectionId);
        setEditLabel(det?.display_label ?? "");
        setSaveError(null);
    }, [activeDetectionId, detections]);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !frame) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            const maxW = canvas.parentElement?.clientWidth ?? 800;
            const maxH = canvas.parentElement?.clientHeight ?? 500;
            const scale = Math.min(
                maxW / img.naturalWidth,
                maxH / img.naturalHeight,
                1
            );
            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            detectionGroups.forEach(({ primary: d }) => {
                const [x1, y1, x2, y2] = d.bbox;
                const sx1 = x1 * scale,
                    sy1 = y1 * scale;
                const sw = (x2 - x1) * scale,
                    sh = (y2 - y1) * scale;
                const color =
                    labelColorMap.get(d.display_label || "Unknown") ?? "#888";
                const isActive = d.id === activeDetectionId;

                if (isActive) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = isActive ? 2 : 1.5;
                ctx.setLineDash([]);
                ctx.strokeRect(sx1, sy1, sw, sh);
                ctx.shadowBlur = 0;

                const label =
                    editLabel && isActive
                        ? `${editLabel} · ${Math.round((d.score ?? 0) * 100)}%`
                        : `${d.display_label || "Unknown"} · ${Math.round((d.score ?? 0) * 100)}%`;
                ctx.font = "bold 11px var(--font-dm-mono), 'DM Mono', monospace";
                const tw = ctx.measureText(label).width;
                ctx.fillStyle = color;
                ctx.fillRect(sx1, Math.max(0, sy1 - 18), tw + 10, 18);
                ctx.fillStyle = "#fff";
                ctx.fillText(label, sx1 + 5, sy1 - 4);
            });

            boundingBoxes.forEach(b => {
                const [x1, y1, x2, y2] = b.bbox;
                const sx1 = x1 * scale,
                    sy1 = y1 * scale;
                const sw = (x2 - x1) * scale,
                    sh = (y2 - y1) * scale;
                const isActive = b.id === activeBboxId;
                const color =
                    labelColorMap.get(b.display_label) ?? "var(--teal)";

                ctx.strokeStyle = isActive ? "#fff" : color;
                ctx.lineWidth = isActive ? 2 : 1.5;
                ctx.setLineDash([6, 3]);
                ctx.strokeRect(sx1, sy1, sw, sh);
                ctx.setLineDash([]);
                ctx.font = "bold 11px var(--font-dm-mono), 'DM Mono', monospace";
                const tw = ctx.measureText(b.display_label).width;
                ctx.fillStyle = color;
                ctx.fillRect(sx1, Math.max(0, sy1 - 18), tw + 10, 18);
                ctx.fillStyle = "#fff";
                ctx.fillText(b.display_label, sx1 + 5, sy1 - 4);
            });

            if (isDrawing && drawStart.current && drawCurrent.current) {
                const { x: sx, y: sy } = drawStart.current;
                const { x: ex, y: ey } = drawCurrent.current;
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 3]);
                ctx.strokeRect(sx, sy, ex - sx, ey - sy);
                ctx.setLineDash([]);
            }
        };
        img.src = frame.frame_url;
    }, [
        frame,
        detectionGroups,
        boundingBoxes,
        activeDetectionId,
        activeBboxId,
        labelColorMap,
        editLabel,
        isDrawing,
    ]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    function canvasCoords(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    }

    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!drawMode) return;
        const pos = canvasCoords(e);
        drawStart.current = pos;
        drawCurrent.current = pos;
        setIsDrawing(true);
    }

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!isDrawing || !drawMode) return;
        drawCurrent.current = canvasCoords(e);
        redraw();
    }

    function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!isDrawing || !drawMode || !drawStart.current) return;
        const { x: ex, y: ey } = canvasCoords(e);
        const { x: sx, y: sy } = drawStart.current;
        setIsDrawing(false);
        drawStart.current = null;
        if (Math.abs(ex - sx) < 10 || Math.abs(ey - sy) < 10) return;
        setPendingBox({
            x1: Math.min(sx, ex),
            y1: Math.min(sy, ey),
            x2: Math.max(sx, ex),
            y2: Math.max(sy, ey),
        });
        setLabelInput("");
    }

    function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
        if (drawMode) return;
        const canvas = canvasRef.current!;
        const { x: mx, y: my } = canvasCoords(e);
        const scale = canvas.width / ((frame as any)?.natural_width ?? canvas.width);

        for (const b of [...boundingBoxes].reverse()) {
            const [x1, y1, x2, y2] = b.bbox;
            if (
                mx >= x1 * scale &&
                mx <= x2 * scale &&
                my >= y1 * scale &&
                my <= y2 * scale
            ) {
                setActiveBboxId(b.id === activeBboxId ? null : b.id);
                setActiveDetectionId(null);
                return;
            }
        }
        for (const d of [...detections].reverse()) {
            const [x1, y1, x2, y2] = d.bbox;
            if (
                mx >= x1 * scale &&
                mx <= x2 * scale &&
                my >= y1 * scale &&
                my <= y2 * scale
            ) {
                setActiveDetectionId(d.id === activeDetectionId ? null : d.id);
                setActiveBboxId(null);
                return;
            }
        }
        setActiveDetectionId(null);
        setActiveBboxId(null);
    }

    async function handleSaveBbox() {
        if (!pendingBox || !labelInput.trim() || !frame) return;
        const canvas = canvasRef.current!;
        const img = new Image();
        img.src = frame.frame_url;
        const scale = canvas.width / (img.naturalWidth || canvas.width);

        setSavingBbox(true);
        try {
            const created = await api.createBoundingBox(projectId, frame.id, {
                bbox: [
                    Math.round(pendingBox.x1 / scale),
                    Math.round(pendingBox.y1 / scale),
                    Math.round(pendingBox.x2 / scale),
                    Math.round(pendingBox.y2 / scale),
                ],
                display_label: labelInput.trim(),
            });
            setBoundingBoxes(prev => [...prev, created]);
            setPendingBox(null);
            setDrawMode(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSavingBbox(false);
        }
    }

    async function handleDeleteBbox(bboxId: string) {
        if (!frame) return;
        try {
            await api.deleteBoundingBox(projectId, frame.id, bboxId);
            setBoundingBoxes(prev => prev.filter(b => b.id !== bboxId));
            if (activeBboxId === bboxId) setActiveBboxId(null);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleApprove() {
        if (!activeDetectionId || !editLabel.trim()) return;
        setSaving(true);
        setSaveError(null);
        try {
            await api.reviewDetectionLabel(activeDetectionId, editLabel.trim());
            setDetections(prev =>
                prev.map(d =>
                    d.id === activeDetectionId
                        ? { ...d, display_label: editLabel.trim(), status: "reviewed" }
                        : d
                )
            );
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
    const activeBbox = boundingBoxes.find(b => b.id === activeBboxId);

    return (
        <>
            {/* Slim header */}
            <div
                className={styles.topbar}
                style={{ padding: "10px 20px", height: 54 }}
            >
                <div className="flex items-center" style={{ gap: 12 }}>
                    <button onClick={onBack} className={styles.btnSecondary}>
                        <ChevronLeft size={13} /> All frames
                    </button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>
                        {project.name}
                    </div>
                </div>
                <div className={styles.topbarActions}>
                    <button className={styles.btnSecondary}>
                        <Download size={12} /> Export
                    </button>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 290px",
                    gridTemplateRows: "1fr 86px",
                    gap: 12,
                    padding: "12px 20px",
                    overflow: "hidden",
                }}
            >
                {/* Canvas viewer */}
                <div
                    style={{
                        background: "#0a1018",
                        borderRadius: 12,
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onClick={handleCanvasClick}
                        style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            cursor: drawMode ? "crosshair" : "default",
                        }}
                    />

                    {drawMode && (
                        <div
                            style={{
                                position: "absolute",
                                top: 12,
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "rgba(127,163,232,0.18)",
                                border: "1px solid rgba(127,163,232,0.4)",
                                color: "var(--primary-light)",
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "4px 14px",
                                borderRadius: 20,
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                            }}
                        >
                            Draw mode · drag to place box
                        </div>
                    )}

                    {pendingBox && (
                        <div
                            style={{
                                position: "absolute",
                                top: pendingBox.y2 + 10,
                                left: pendingBox.x1,
                                background: "var(--surface)",
                                border: "1.5px solid var(--primary)",
                                borderRadius: 10,
                                padding: "12px 14px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                minWidth: 240,
                                zIndex: 10,
                                boxShadow: "var(--shadow-md)",
                            }}
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
                                Species label
                            </div>
                            <input
                                autoFocus
                                value={labelInput}
                                onChange={e => setLabelInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") handleSaveBbox();
                                    if (e.key === "Escape") {
                                        setPendingBox(null);
                                        setDrawMode(false);
                                    }
                                }}
                                placeholder="e.g. fish, hard coral…"
                                style={{
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 7,
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                    outline: "none",
                                    color: "var(--text1)",
                                }}
                            />
                            <div className="flex" style={{ gap: 8 }}>
                                <button
                                    onClick={handleSaveBbox}
                                    disabled={!labelInput.trim() || savingBbox}
                                    className={styles.btnPrimary}
                                    style={{ flex: 1, justifyContent: "center" }}
                                >
                                    {savingBbox ? "Saving…" : "Save"}
                                </button>
                                <button
                                    onClick={() => {
                                        setPendingBox(null);
                                        setDrawMode(false);
                                    }}
                                    className={styles.btnSecondary}
                                    style={{ flex: 1, justifyContent: "center" }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating toolbar */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: 10,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            background: "rgba(10,16,24,0.88)",
                            backdropFilter: "blur(8px)",
                            borderRadius: 10,
                            padding: "6px 8px",
                            border: "1px solid rgba(255,255,255,0.12)",
                        }}
                    >
                        <button
                            onClick={() => goToFrame(Math.max(0, activeFrameIndex - 1))}
                            disabled={activeFrameIndex === 0}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 7,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "rgba(255,255,255,0.07)",
                                color: "rgba(255,255,255,0.7)",
                                cursor: activeFrameIndex === 0 ? "not-allowed" : "pointer",
                                opacity: activeFrameIndex === 0 ? 0.4 : 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <SkipBack size={14} />
                        </button>
                        <span
                            style={{
                                fontSize: 12,
                                color: "rgba(255,255,255,0.7)",
                                fontFamily: "var(--font-dm-mono), monospace",
                                padding: "0 8px",
                            }}
                        >
                            {activeFrameIndex + 1} / {frames.length}
                        </span>
                        <button
                            onClick={() =>
                                goToFrame(Math.min(frames.length - 1, activeFrameIndex + 1))
                            }
                            disabled={activeFrameIndex === frames.length - 1}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 7,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "rgba(255,255,255,0.07)",
                                color: "rgba(255,255,255,0.7)",
                                cursor:
                                    activeFrameIndex === frames.length - 1
                                        ? "not-allowed"
                                        : "pointer",
                                opacity: activeFrameIndex === frames.length - 1 ? 0.4 : 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Sidebar */}
                <div
                    style={{
                        background: "var(--surface)",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        overflow: "hidden",
                    }}
                >
                    <div
                        className="flex items-center justify-between"
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            flexShrink: 0,
                        }}
                    >
                        <span>Detections</span>
                        <span
                            style={{
                                color: "var(--text2)",
                                background: "var(--surface2)",
                                padding: "1px 8px",
                                borderRadius: 99,
                                border: "1px solid var(--border)",
                            }}
                        >
                            {detectionGroups.length + boundingBoxes.length}
                        </span>
                    </div>

                    <div
                        style={{
                            overflowY: "auto",
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                        }}
                    >
                        {loadingDets ? (
                            <div
                                style={{
                                    color: "var(--text3)",
                                    fontSize: 12,
                                    textAlign: "center",
                                    padding: 12,
                                }}
                            >
                                Loading…
                            </div>
                        ) : (
                            detectionGroups.map(({ primary: d, overlapping }) => {
                                const active = d.id === activeDetectionId;
                                return (
                                    <div key={d.id}>
                                        <div
                                            onClick={() => {
                                                setActiveDetectionId(active ? null : d.id);
                                                setActiveBboxId(null);
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                padding: "8px 10px",
                                                borderRadius: 7,
                                                cursor: "pointer",
                                                background: active
                                                    ? "var(--primary-pale)"
                                                    : "var(--surface2)",
                                                border: `1.5px solid ${active ? "var(--primary-light)" : "var(--border)"}`,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    background:
                                                        labelColorMap.get(
                                                            d.display_label || "Unknown"
                                                        ) ?? "var(--text3)",
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span
                                                style={{
                                                    flex: 1,
                                                    fontSize: 13,
                                                    color: "var(--text1)",
                                                    fontWeight: active ? 600 : 500,
                                                    fontStyle: "italic",
                                                }}
                                            >
                                                {d.display_label || "Unknown"}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    color: "var(--text2)",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {Math.round((d.score ?? 0) * 100)}%
                                            </span>
                                        </div>
                                        {overlapping.map(alt => (
                                            <div
                                                key={alt.id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    padding: "5px 10px 5px 28px",
                                                    opacity: 0.75,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: "50%",
                                                        background:
                                                            labelColorMap.get(
                                                                alt.display_label || "Unknown"
                                                            ) ?? "var(--text3)",
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        flex: 1,
                                                        fontSize: 12,
                                                        color: "var(--text2)",
                                                    }}
                                                >
                                                    {alt.display_label || "Unknown"}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        color: "var(--text3)",
                                                    }}
                                                >
                                                    {Math.round((alt.score ?? 0) * 100)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })
                        )}

                        {!loadingBboxes &&
                            boundingBoxes.map(b => {
                                const active = b.id === activeBboxId;
                                return (
                                    <div
                                        key={b.id}
                                        onClick={() => {
                                            setActiveBboxId(active ? null : b.id);
                                            setActiveDetectionId(null);
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "8px 10px",
                                            borderRadius: 7,
                                            cursor: "pointer",
                                            background: active
                                                ? "rgba(94,201,154,0.1)"
                                                : "var(--surface2)",
                                            border: `1.5px dashed ${active ? "var(--success)" : "var(--border)"}`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                border: "2px dashed var(--success)",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span
                                            style={{
                                                flex: 1,
                                                fontSize: 13,
                                                color: "var(--text1)",
                                                fontWeight: active ? 600 : 500,
                                            }}
                                        >
                                            {b.display_label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: "var(--success)",
                                                fontWeight: 700,
                                                marginRight: 4,
                                            }}
                                        >
                                            human
                                        </span>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleDeleteBbox(b.id);
                                            }}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--danger)",
                                                cursor: "pointer",
                                                fontSize: 14,
                                                lineHeight: 1,
                                                padding: 2,
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}

                        <button
                            onClick={() => {
                                setDrawMode(m => !m);
                                setPendingBox(null);
                            }}
                            style={{
                                marginTop: 4,
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: drawMode
                                    ? "var(--primary-pale)"
                                    : "transparent",
                                border: drawMode
                                    ? "1.5px solid var(--primary)"
                                    : "1.5px dashed var(--border)",
                                color: drawMode ? "var(--primary-dark)" : "var(--text3)",
                                fontSize: 12,
                                cursor: "pointer",
                                fontWeight: 700,
                                textAlign: "left",
                                fontFamily: "inherit",
                            }}
                        >
                            {drawMode ? "Cancel draw mode" : "+ Draw new bounding box"}
                        </button>
                    </div>

                    {activeDetection && (
                        <div
                            style={{
                                borderTop: "1px solid var(--border)",
                                paddingTop: 12,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--text3)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                }}
                            >
                                Edit label
                            </div>
                            <input
                                type="text"
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") handleApprove();
                                }}
                                placeholder="e.g. Lutjanus carponotatus"
                                style={{
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 7,
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                    outline: "none",
                                }}
                            />
                            {saveError && (
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--danger)",
                                        background: "#fff0f0",
                                        border: "1px solid #ffd0d0",
                                        borderRadius: 6,
                                        padding: "6px 10px",
                                    }}
                                >
                                    {saveError}
                                </div>
                            )}
                            <div className="flex" style={{ gap: 8 }}>
                                <button
                                    onClick={handleApprove}
                                    disabled={saving || !editLabel.trim()}
                                    className={styles.btnPrimary}
                                    style={{
                                        flex: 1,
                                        justifyContent: "center",
                                        background: "var(--success)",
                                    }}
                                >
                                    {saving ? "Saving…" : "Save & mark reviewed"}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeBbox && (
                        <div
                            style={{
                                borderTop: "1px solid var(--border)",
                                paddingTop: 12,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--text3)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                }}
                            >
                                Manual annotation
                            </div>
                            <div
                                style={{
                                    background: "var(--surface2)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "var(--text1)",
                                    }}
                                >
                                    {activeBbox.display_label}
                                </span>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--text3)",
                                        marginTop: 3,
                                        fontFamily:
                                            "var(--font-dm-mono), monospace",
                                    }}
                                >
                                    [{activeBbox.bbox.map(v => Math.round(v)).join(", ")}] px
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteBbox(activeBbox.id)}
                                style={{
                                    padding: "8px",
                                    borderRadius: 8,
                                    background: "#fff8f8",
                                    border: "1.5px solid #ffd0d0",
                                    color: "var(--danger)",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                }}
                            >
                                Delete box
                            </button>
                        </div>
                    )}
                </div>

                {/* Filmstrip */}
                <div
                    style={{
                        gridColumn: "1 / span 2",
                        display: "flex",
                        gap: 8,
                        overflowX: "auto",
                        alignItems: "center",
                        paddingBottom: 4,
                    }}
                >
                    {frames.map((f, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={f.id}
                            src={f.frame_url}
                            alt={f.source_filename}
                            onClick={() => goToFrame(i)}
                            style={{
                                height: 70,
                                minWidth: 110,
                                objectFit: "cover",
                                borderRadius: 6,
                                cursor: "pointer",
                                opacity: i === activeFrameIndex ? 1 : 0.55,
                                border:
                                    i === activeFrameIndex
                                        ? "2px solid var(--primary)"
                                        : "2px solid transparent",
                                flexShrink: 0,
                            }}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   MODELS SCREEN
   ────────────────────────────────────────────────────────────────────────── */
function ModelsScreen() {
    const classes = [
        {
            name: "Lutjanus carponotatus",
            precision: 91,
            recall: 88,
            f1: 89,
            samples: 1842,
            color: "var(--primary-dark)",
        },
        {
            name: "Epinephelus coioides",
            precision: 87,
            recall: 84,
            f1: 85,
            samples: 1240,
            color: "var(--primary)",
        },
        {
            name: "Acanthurus leucosternon",
            precision: 78,
            recall: 71,
            f1: 74,
            samples: 890,
            color: "var(--teal)",
        },
        {
            name: "Thalassoma lunare",
            precision: 82,
            recall: 79,
            f1: 80,
            samples: 674,
            color: "var(--success)",
        },
        {
            name: "Cephalopholis miniata",
            precision: 69,
            recall: 63,
            f1: 66,
            samples: 512,
            color: "var(--warning)",
        },
        {
            name: "Siganus vulpinus",
            precision: 74,
            recall: 68,
            f1: 71,
            samples: 387,
            color: "var(--coral)",
        },
    ];

    return (
        <>
            <div className={styles.topbar}>
                <div>
                    <div className={styles.topbarTitle}>Model Performance</div>
                    <div className={styles.topbarSubtitle}>DINOv2-based detector</div>
                </div>
                <div className={styles.topbarActions}>
                    <button className={styles.btnSecondary}>
                        <Download size={12} /> Export
                    </button>
                </div>
            </div>
            <div className={styles.content}>
                <div className={styles.statCardGrid}>
                    <StatCard
                        label="mAP@0.5"
                        value="81.2%"
                        sub="↑ 3.4% this session"
                        Icon={Activity}
                        color="var(--primary)"
                    />
                    <StatCard
                        label="Precision"
                        value="80.8%"
                        sub="across all classes"
                        Icon={CheckCircle}
                        color="var(--success)"
                    />
                    <StatCard
                        label="Recall"
                        value="75.3%"
                        sub="↑ improving"
                        Icon={Eye}
                        color="var(--teal)"
                    />
                    <StatCard
                        label="Uncertain"
                        value="147"
                        sub="queued for active learning"
                        Icon={Zap}
                        color="var(--warning)"
                    />
                </div>

                <div className={styles.panel}>
                    <div className={styles.panelTitle}>Per-class metrics</div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto auto auto auto",
                            gap: "0 16px",
                            alignItems: "center",
                        }}
                    >
                        {["Species", "Precision", "Recall", "F1", "Samples"].map(h => (
                            <div
                                key={h}
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "var(--text3)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    paddingBottom: 8,
                                    borderBottom: "1px solid var(--border)",
                                    marginBottom: 4,
                                }}
                            >
                                {h}
                            </div>
                        ))}
                        {classes.map(c => (
                            <Fragment key={c.name}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 7,
                                        paddingBottom: 10,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 2,
                                            background: c.color,
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontStyle: "italic",
                                            color: "var(--text1)",
                                        }}
                                    >
                                        {c.name}
                                    </span>
                                </div>
                                {[c.precision, c.recall, c.f1].map((v, j) => (
                                    <div key={j} style={{ paddingBottom: 10 }}>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color:
                                                    v > 80
                                                        ? "var(--success)"
                                                        : v > 70
                                                            ? "var(--warning)"
                                                            : "var(--danger)",
                                            }}
                                        >
                                            {v}%
                                        </span>
                                    </div>
                                ))}
                                <div
                                    style={{
                                        paddingBottom: 10,
                                        fontSize: 11,
                                        color: "var(--text3)",
                                        fontFamily: "var(--font-dm-mono), monospace",
                                    }}
                                >
                                    {c.samples.toLocaleString()}
                                </div>
                            </Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function StatCard({
    label,
    value,
    sub,
    Icon,
    color,
}: {
    label: string;
    value: string;
    sub?: string;
    Icon: LucideIcon;
    color: string;
}) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statCardHead}>
                <span className={styles.statCardLabel}>{label}</span>
                <div
                    className={styles.statCardIcon}
                    style={{ background: `${color}1f` }}
                >
                    <Icon size={14} color={color} />
                </div>
            </div>
            <div className={styles.statCardValue}>{value}</div>
            {sub && <div className={styles.statCardSub}>{sub}</div>}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   DATASETS SCREEN
   ────────────────────────────────────────────────────────────────────────── */
function DatasetsScreen({ frames }: { frames: FrameRow[] }) {
    const totalFrames = frames.length;
    const labeled = frames.filter(f =>
        f.detections.some(d => d.status === "reviewed")
    ).length;
    const pct = totalFrames > 0 ? Math.round((labeled / totalFrames) * 100) : 0;

    const datasets = [
        {
            name: "GBR Transect 12B",
            frames: 4820,
            labeled: 2988,
            date: "In progress",
            size: "14.2 GB",
        },
        {
            name: "Coral Sea T07",
            frames: 3210,
            labeled: 3210,
            date: "Apr 28, 2026",
            size: "9.7 GB",
        },
        {
            name: "Ningaloo T03A",
            frames: 2870,
            labeled: 2526,
            date: "Apr 25, 2026",
            size: "8.1 GB",
        },
    ];

    return (
        <>
            <div className={styles.topbar}>
                <div>
                    <div className={styles.topbarTitle}>Datasets</div>
                    <div className={styles.topbarSubtitle}>
                        Manage transect datasets
                    </div>
                </div>
                <div className={styles.topbarActions}>
                    <button className={styles.btnPrimary}>
                        <Plus size={13} />
                        New Dataset
                    </button>
                </div>
            </div>
            <div className={styles.content}>
                <div className={styles.statCardGrid} style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                    <StatCard
                        label="Total frames"
                        value={totalFrames.toLocaleString()}
                        Icon={ImageIcon}
                        color="var(--primary)"
                    />
                    <StatCard
                        label="Labeled frames"
                        value={labeled.toLocaleString()}
                        sub={`${pct}% complete`}
                        Icon={CheckCircle}
                        color="var(--success)"
                    />
                    <StatCard
                        label="Active datasets"
                        value={String(datasets.length)}
                        Icon={Database}
                        color="var(--teal)"
                    />
                </div>

                <div
                    style={{
                        background: "var(--surface)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                        overflow: "hidden",
                    }}
                >
                    <div className={styles.tableHead}>
                        {["Dataset", "Frames", "Labeled", "Size", "Date", ""].map(h => (
                            <div key={h} className={styles.tableHeadCell}>
                                {h}
                            </div>
                        ))}
                    </div>
                    {datasets.map(d => (
                        <div key={d.name} className={styles.tableRow}>
                            <div>
                                <div className={styles.tableRowName}>{d.name}</div>
                                <div style={{ marginTop: 4 }}>
                                    <ProgressBar
                                        value={(d.labeled / d.frames) * 100}
                                        color={
                                            d.labeled === d.frames
                                                ? "var(--success)"
                                                : "var(--primary)"
                                        }
                                        height={3}
                                    />
                                </div>
                            </div>
                            <div className={`${styles.tableRowValue} ${styles.tableRowMono}`}>
                                {d.frames.toLocaleString()}
                            </div>
                            <div className={styles.tableRowValue}>
                                {d.labeled.toLocaleString()}{" "}
                                <span style={{ color: "var(--text3)", fontSize: 11 }}>
                                    ({Math.round((d.labeled / d.frames) * 100)}%)
                                </span>
                            </div>
                            <div className={`${styles.tableRowValue} ${styles.tableRowMono}`}>
                                {d.size}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>
                                {d.date}
                            </div>
                            <div className={styles.tableActions}>
                                <button className={styles.btnSecondary} style={{ padding: "4px 9px", fontSize: 11 }}>
                                    Export
                                </button>
                                <button className={styles.btnPrimary} style={{ padding: "4px 12px", fontSize: 11 }}>
                                    Open
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
function buildLabelColorMap(detections: any[]): Map<string, string> {
    const uniqueLabels = [
        ...new Set(detections.map(d => d.display_label || "Unknown")),
    ];
    const map = new Map<string, string>();
    uniqueLabels.forEach((label, i) => {
        const hue = (i * 137.508) % 360;
        map.set(label, `hsl(${hue}, 65%, 55%)`);
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

const IOU_THRESHOLD = 0.85;

function groupDetections(
    detections: any[]
): { primary: any; overlapping: any[] }[] {
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
