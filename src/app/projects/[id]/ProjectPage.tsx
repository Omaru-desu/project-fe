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
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
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
    LayoutGrid,
    type LucideIcon,
} from "lucide-react";
import { Detection } from "../../../types/project";
import * as api from "../../../lib/api";
import type { BoundingBox } from "../../../lib/api";
import { logout } from "../../login/actions";
import styles from "./ProjectPage.module.css";
import UploadMediaModal from "../../../components/projects/UploadMediaModal";
import ReviewModal from "../../../components/projects/ReviewModal";

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

    const [displayName, setDisplayName] = useState("");
    const [userOrg, setUserOrg] = useState("");

    useEffect(() => {
        createBrowserSupabaseClient()
            .auth.getUser()
            .then(({ data }) => {
                const meta = data.user?.user_metadata;
                if (meta?.first_name) {
                    setDisplayName(`${meta.first_name} ${meta.last_name ?? ""}`.trim());
                } else {
                    setDisplayName(data.user?.email ?? "");
                }
                setUserOrg(meta?.org ?? "");
            });
    }, []);

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
                displayName={displayName}
                userOrg={userOrg}
            />

            {/* MAIN */}
            <div className={styles.main}>
                {screen === "gallery" && (
                    <GalleryScreen
                        project={project}
                        frames={frames}
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
    displayName,
    userOrg,
}: {
    screen: Screen;
    setScreen: (s: Screen) => void;
    collapsed: boolean;
    setCollapsed: (b: boolean) => void;
    project: { id: string; name: string; type?: "active" | "test" };
    pendingCount: number;
    onBack: () => void;
    displayName: string;
    userOrg: string;
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
                        <div className={styles.userAvatar}>
                            {displayName
                                ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                                : "?"}
                        </div>
                    </div>
                ) : (
                    <div className={styles.userPill}>
                        <div className={styles.userAvatar}>
                            {displayName
                                ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                                : "?"}
                        </div>
                        <div>
                            <div className={styles.userName}>{displayName || "—"}</div>
                            {userOrg && <div className={styles.userRole}>{userOrg}</div>}
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
    frameStatus: Record<string, "reviewed" | "needs_review" | "no_detections">;
    detectionsByFrame: Detection[];
    statusFilter: StatusFilter;
    setStatusFilter: (s: StatusFilter) => void;
    search: string;
    setSearch: (s: string) => void;
    selectedDetectionId: string | null;
    setSelectedDetectionId: (id: string | null) => void;
    selectedFrame: FrameRow | null;
    selectedFrameDetections: Detection[];
    reviewedCount: number;
    needsReviewCount: number;
    totalDetections: number;
    pct: number;
    processing: ProcessingStatus | null;
    onUpload: () => void;
    onStartAnnotating: () => void;
    onOpenReview: (d: Detection) => void;
}) {
    const [sortConf, setSortConf] = useState<"off" | "high" | "low">("off");

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
                    <button onClick={onStartAnnotating} className={styles.btnPrimary}>
                        <Tag size={14} />
                        Start Annotating
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
                        const visibleDetections = detectionsByFrame.filter(d => {
                            const matchStatus =
                                statusFilter === "all" ||
                                (statusFilter === "reviewed" && d.status === "reviewed") ||
                                (statusFilter === "needs_review" && d.status === "needs_review");
                            const q = search.trim().toLowerCase();
                            const matchSearch =
                                !q ||
                                d.source_filename.toLowerCase().includes(q) ||
                                (d.display_label ?? "").toLowerCase().includes(q) ||
                                (d.taxon ?? "").toLowerCase().includes(q);
                            return matchStatus && matchSearch;
                        });

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
}: {
    frame: FrameRow;
    detections: Detection[];
    status: "reviewed" | "needs_review" | "no_detections" | undefined;
    onClose: () => void;
    onAnnotate: () => void;
    onOpenReview: (d: Detection) => void;
}) {
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
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={frame.frame_url}
                        alt={frame.source_filename}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
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
                    <div className={styles.topbarActions}>
                        <div className={styles.viewSwitch}>
                            <button className={`${styles.viewSwitchBtn} ${styles.viewSwitchBtnActive}`}>
                                <LayoutGrid size={13} />
                                Grid
                            </button>
                            <button
                                onClick={() => setSelectedFrameId(frames[0]?.id ?? null)}
                                className={`${styles.viewSwitchBtn} ${styles.viewSwitchBtnSingle}`}
                            >
                                <Tag size={13} />
                                Single
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
                    <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
                        {frames.length} frame{frames.length !== 1 ? "s" : ""} — click to annotate
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
                                    style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                                />
                                <div style={{ padding: "8px 10px" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {f.source_filename}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                                        {f.detections.length} detection{f.detections.length !== 1 ? "s" : ""}
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
    // refs
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const rafRef = useRef<number>(0);

    // frame navigation
    const [activeFrameIndex, setActiveFrameIndex] = useState(initialFrameIndex);
    const frame = frames[activeFrameIndex];

    const [reviewMode, setReviewMode] = useState(false);
    const [editingDetectionId, setEditingDetectionId] = useState<string | null>(null);
    const [pendingLabels, setPendingLabels] = useState<Map<string, string>>(new Map());
    const [savingReview, setSavingReview] = useState(false);
    const [reviewedWithoutScore, setReviewedWithoutScore] = useState<Set<string>>(new Set());

    // data
    const [detections, setDetections] = useState<any[]>([]);
    const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
    const [loadingDets, setLoadingDets] = useState(false);
    const [loadingBboxes, setLoadingBboxes] = useState(false);
    const [labelColorMap, setLabelColorMap] = useState<Map<string, string>>(new Map());
    const detectionGroups = useMemo(() => groupDetections(detections), [detections]);

    // selection
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<"det" | "bbox" | null>(null);
    const [hovId, setHovId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // transform (scale + offset in canvas pixels)
    const [tf, setTf] = useState({ scale: 1, ox: 0, oy: 0 });
    const tfRef = useRef(tf);
    tfRef.current = tf;
    const fitTfRef = useRef({ scale: 1, ox: 0, oy: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const zoomLevelRef = useRef(1);
    const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());

    // mode
    const [mode, setMode] = useState<"select" | "draw">("select");
    const [hideDetections, setHideDetections] = useState(false);

    // draw state
    const [pendingBox, setPendingBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [labelInput, setLabelInput] = useState("");
    const [savingBbox, setSavingBbox] = useState(false);
    const drawStartRef = useRef<{ ix: number; iy: number } | null>(null);
    const drawCurRef = useRef<{ ix: number; iy: number } | null>(null);

    // interaction refs
    const dragRef = useRef<{ id: string; type: "det" | "bbox"; sx: number; sy: number; ob: number[]; moved: boolean } | null>(null);
    const resizeRef = useRef<{ id: string; type: "det" | "bbox"; corner: "tl" | "tr" | "bl" | "br"; sx: number; sy: number; ob: number[] } | null>(null);
    const panRef = useRef<{ startCx: number; startCy: number; startOx: number; startOy: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // coord helpers
    function toCanvas(ix: number, iy: number) {
        const { scale, ox, oy } = tfRef.current;
        return { cx: ix * scale + ox, cy: iy * scale + oy };
    }
    function toImg(cx: number, cy: number) {
        const { scale, ox, oy } = tfRef.current;
        return { ix: (cx - ox) / scale, iy: (cy - oy) / scale };
    }
    function clientToCanvas(e: React.MouseEvent) {
        const c = canvasRef.current!;
        const r = c.getBoundingClientRect();
        return {
            cx: (e.clientX - r.left) * (c.width / r.width),
            cy: (e.clientY - r.top) * (c.height / r.height),
        };
    }
    function cornerHit(cx: number, cy: number, box: number[]): "tl" | "tr" | "bl" | "br" | null {
        const [x1, y1, x2, y2] = box;
        const { cx: bx1, cy: by1 } = toCanvas(x1, y1);
        const { cx: bx2, cy: by2 } = toCanvas(x2, y2);
        const R = 7;
        if (Math.abs(cx - bx1) < R && Math.abs(cy - by1) < R) return "tl";
        if (Math.abs(cx - bx2) < R && Math.abs(cy - by1) < R) return "tr";
        if (Math.abs(cx - bx1) < R && Math.abs(cy - by2) < R) return "bl";
        if (Math.abs(cx - bx2) < R && Math.abs(cy - by2) < R) return "br";
        return null;
    }
    function inBox(cx: number, cy: number, box: number[]) {
        const { ix, iy } = toImg(cx, cy);
        const [x1, y1, x2, y2] = box;
        return ix >= x1 && ix <= x2 && iy >= y1 && iy <= y2;
    }

    // zoom
    const applyZoom = useCallback((newZ: number) => {
        const fit = fitTfRef.current;
        const c = canvasRef.current;
        if (!c) return;
        const cx = c.width / 2;
        const cy = c.height / 2;
        const cur = tfRef.current;
        const newScale = fit.scale * newZ;
        const ratio = newScale / cur.scale;
        const newTf = { scale: newScale, ox: cx - (cx - cur.ox) * ratio, oy: cy - (cy - cur.oy) * ratio };
        setTf(newTf);
        tfRef.current = newTf;
        setZoomLevel(newZ);
        zoomLevelRef.current = newZ;
    }, []);
    const zoomIn = useCallback(() => applyZoom(Math.min(zoomLevelRef.current * 1.4, 20)), [applyZoom]);
    const zoomOut = useCallback(() => applyZoom(Math.max(zoomLevelRef.current / 1.4, 0.1)), [applyZoom]);
    const zoomReset = useCallback(() => applyZoom(1), [applyZoom]);

    // wheel zoom
    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        function onWheel(e: WheelEvent) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            applyZoom(Math.min(Math.max(zoomLevelRef.current * factor, 0.1), 20));
        }
        c.addEventListener("wheel", onWheel, { passive: false });
        return () => c.removeEventListener("wheel", onWheel);
    }, [applyZoom]);

    // fit image to container
    const fitImage = useCallback(() => {
        const c = canvasRef.current;
        const img = imgRef.current;
        if (!c || !img || !img.naturalWidth) return;
        const scale = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight) * 0.95;
        const ox = (c.width - img.naturalWidth * scale) / 2;
        const oy = (c.height - img.naturalHeight * scale) / 2;
        const newTf = { scale, ox, oy };
        fitTfRef.current = newTf;
        setTf(newTf);
        tfRef.current = newTf;
        setZoomLevel(1);
        zoomLevelRef.current = 1;
    }, []);

    // load image on frame change
    useEffect(() => {
        if (!frame?.frame_url) return;
        const img = new Image();
        img.onload = () => { imgRef.current = img; fitImage(); };
        img.src = frame.frame_url;
    }, [frame?.frame_url, fitImage]);

    // resize observer
    useEffect(() => {
        const wrap = containerRef.current;
        if (!wrap) return;
        const obs = new ResizeObserver(() => {
            const c = canvasRef.current;
            if (!c) return;
            c.width = wrap.clientWidth;
            c.height = wrap.clientHeight;
            fitImage();
        });
        obs.observe(wrap);
        return () => obs.disconnect();
    }, [fitImage]);

    // load data on frame change
    useEffect(() => {
        if (!frame) return;
        setActiveId(null);
        setActiveType(null);
        setEditLabel("");
        setSaveError(null);
        setPendingBox(null);
        drawStartRef.current = null;
        drawCurRef.current = null;
        setReviewedWithoutScore(new Set());

        setLoadingDets(true);
        api.getFrameDetections(projectId, frame.id)
            .then(data => {
                const dets = (data.detections ?? data).filter((d: any) => d.annotation_source !== "human");
                console.log("detections:", dets.map((d: any) => ({ id: d.id, status: d.status, score: d.score })));
                setDetections(dets);
                setLabelColorMap(buildLabelColorMap(dets));
            })
            .catch(console.error)
            .finally(() => setLoadingDets(false));

        setLoadingBboxes(true);
        api.getBoundingBoxes(projectId, frame.id)
            .catch(() => [] as BoundingBox[])
            .then(data => setBoundingBoxes(data))
            .finally(() => setLoadingBboxes(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frame?.id, projectId]);

    // sync edit label
    useEffect(() => {
        if (!activeId || activeType !== "det") { setEditLabel(""); return; }
        const det = detections.find(d => d.id === activeId);
        setEditLabel(det?.display_label ?? "");
        setSaveError(null);
    }, [activeId, activeType, detections]);

    // draw loop
    const draw = useCallback(() => {
        const c = canvasRef.current;
        const img = imgRef.current;
        if (!c || !img) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        const { scale, ox, oy } = tfRef.current;

        ctx.clearRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#f4f6fb";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, ox, oy, img.naturalWidth * scale, img.naturalHeight * scale);

        if (!hideDetections) {
            detectionGroups.forEach(({ primary: d }) => {
                const [x1, y1, x2, y2] = d.bbox;
                const sx1 = x1 * scale + ox, sy1 = y1 * scale + oy;
                const sw = (x2 - x1) * scale, sh = (y2 - y1) * scale;
                const color = labelColorMap.get(d.display_label || "Unknown") ?? "#888";
                const isActive = d.id === activeId && activeType === "det";
                const isHov = d.id === hovId;
                ctx.save();
                if (isActive) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
                ctx.strokeStyle = isHov ? "#fff" : color;
                ctx.lineWidth = isActive || isHov ? 2 : 1.5;
                ctx.setLineDash([]);
                ctx.strokeRect(sx1, sy1, sw, sh);
                ctx.shadowBlur = 0;
                ctx.font = "bold 11px 'DM Mono', monospace";
                const label = `${d.display_label || "Unknown"} ${Math.round((d.score ?? 0) * 100)}%`;
                const tw = ctx.measureText(label).width;
                ctx.fillStyle = color;
                ctx.fillRect(sx1, Math.max(0, sy1 - 18), tw + 8, 18);
                ctx.fillStyle = "#fff";
                ctx.fillText(label, sx1 + 4, sy1 - 4);
                if (isActive) {
                    [[sx1, sy1], [sx1 + sw, sy1], [sx1, sy1 + sh], [sx1 + sw, sy1 + sh]].forEach(([hx, hy]) => {
                        ctx.fillStyle = "#fff"; ctx.fillRect(hx - 4, hy - 4, 8, 8);
                        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(hx - 4, hy - 4, 8, 8);
                    });
                    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                    ctx.fillRect(sx1, sy1, sw, sh);
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                }
                ctx.restore();
            });

            boundingBoxes.forEach(b => {
                const [x1, y1, x2, y2] = b.bbox;
                const sx1 = x1 * scale + ox, sy1 = y1 * scale + oy;
                const sw = (x2 - x1) * scale, sh = (y2 - y1) * scale;
                const isActive = b.id === activeId && activeType === "bbox";
                const isHov = b.id === hovId;
                const color = labelColorMap.get(b.display_label) ?? "#34d399";
                ctx.save();
                if (isActive) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
                ctx.strokeStyle = isHov ? "#fff" : color;
                ctx.lineWidth = isActive || isHov ? 2 : 1.5;
                ctx.setLineDash([6, 3]);
                ctx.strokeRect(sx1, sy1, sw, sh);
                ctx.shadowBlur = 0;
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;
                ctx.font = "bold 11px 'DM Mono', monospace";
                const tw = ctx.measureText(b.display_label).width;
                ctx.fillStyle = color;
                ctx.fillRect(sx1, Math.max(0, sy1 - 18), tw + 8, 18);
                ctx.fillStyle = "#fff";
                ctx.fillText(b.display_label, sx1 + 4, sy1 - 4);
                if (isActive) {
                    [[sx1, sy1], [sx1 + sw, sy1], [sx1, sy1 + sh], [sx1 + sw, sy1 + sh]].forEach(([hx, hy]) => {
                        ctx.fillStyle = "#fff"; ctx.fillRect(hx - 4, hy - 4, 8, 8);
                        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(hx - 4, hy - 4, 8, 8);
                    });
                    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                    ctx.fillRect(sx1, sy1, sw, sh);
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                }
                ctx.restore();
            });
        }

        // live drag preview — refs, always current
        if (drawStartRef.current && drawCurRef.current) {
            const { scale: s, ox: ox2, oy: oy2 } = tfRef.current;
            const sx = drawStartRef.current.ix * s + ox2;
            const sy = drawStartRef.current.iy * s + oy2;
            const ex = drawCurRef.current.ix * s + ox2;
            const ey = drawCurRef.current.iy * s + oy2;
            ctx.save();
            ctx.strokeStyle = "#4a6fc4";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy));
            ctx.fillStyle = "rgba(74, 111, 196, 0.1)";
            ctx.fillRect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy));
            ctx.setLineDash([]);
            ctx.restore();
        }

        // pending box — stays on canvas while label popup is open
        if (pendingBox) {
            const { scale: s, ox: ox2, oy: oy2 } = tfRef.current;
            const sx = pendingBox.x1 * s + ox2;
            const sy = pendingBox.y1 * s + oy2;
            const w = (pendingBox.x2 - pendingBox.x1) * s;
            const h = (pendingBox.y2 - pendingBox.y1) * s;
            ctx.save();
            ctx.strokeStyle = "#4a6fc4";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(sx, sy, w, h);
            ctx.fillStyle = "rgba(74, 111, 196, 0.1)";
            ctx.fillRect(sx, sy, w, h);
            ctx.setLineDash([]);
            // label tag
            const tag = labelInput || "New box";
            ctx.font = "bold 11px 'DM Mono', monospace";
            const tw = ctx.measureText(tag).width;
            ctx.fillStyle = "#4a6fc4";
            ctx.fillRect(sx, Math.max(0, sy - 18), tw + 8, 18);
            ctx.fillStyle = "#fff";
            ctx.fillText(tag, sx + 4, sy - 4);
            ctx.restore();
        }
    }, [detectionGroups, boundingBoxes, labelColorMap, activeId, activeType, hovId, hideDetections, tf, pendingBox, labelInput]);

    const drawRef = useRef(draw);
    drawRef.current = draw;

    useEffect(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
    }, [draw]);

    // keyboard shortcuts
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if ((e.key === "Delete" || e.key === "Backspace") && activeId && activeType === "bbox") handleDeleteBbox(activeId);
            if (e.key === "Escape") { setActiveId(null); setActiveType(null); setPendingBox(null); setMode("select"); }
            if (e.key === "h" || e.key === "H") setHideDetections(v => !v);
            if (e.key === "d" || e.key === "D") { setMode("draw"); setPendingBox(null); }
            if (e.key === "s" || e.key === "S") setMode("select");
            if (e.key === "ArrowLeft") goToFrame(Math.max(0, activeFrameIndex - 1));
            if (e.key === "ArrowRight") goToFrame(Math.min(frames.length - 1, activeFrameIndex + 1));
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId, activeType, activeFrameIndex, frames.length]);

    // mouse handlers
    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        if (e.button !== 0) return;
        const { cx, cy } = clientToCanvas(e);
        if (mode === "draw") {
            const { ix, iy } = toImg(cx, cy);
            drawStartRef.current = { ix, iy };
            drawCurRef.current = { ix, iy };
            return;
        }
        const allBoxes = [
            ...(!hideDetections ? detectionGroups.map(g => ({ id: g.primary.id, type: "det" as const, box: g.primary.bbox })) : []),
            ...(!hideDetections ? boundingBoxes.map(b => ({ id: b.id, type: "bbox" as const, box: b.bbox })) : []),
        ];
        if (activeId) {
            const active = allBoxes.find(b => b.id === activeId);
            if (active) {
                const corner = cornerHit(cx, cy, active.box);
                if (corner) {
                    resizeRef.current = { id: active.id, type: active.type, corner, sx: cx, sy: cy, ob: [...active.box] };
                    return;
                }
            }
        }
        for (const b of [...allBoxes].reverse()) {
            if (inBox(cx, cy, b.box)) {
                dragRef.current = { id: b.id, type: b.type, sx: cx, sy: cy, ob: [...b.box], moved: false };
                setActiveId(b.id);
                setActiveType(b.type);
                return;
            }
        }
        panRef.current = { startCx: cx, startCy: cy, startOx: tfRef.current.ox, startOy: tfRef.current.oy };
        setIsPanning(true);
        setActiveId(null);
        setActiveType(null);
    }

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        const { cx, cy } = clientToCanvas(e);
        if (mode === "draw" && drawStartRef.current) {
            const { ix, iy } = toImg(cx, cy);
            drawCurRef.current = { ix, iy };
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => drawRef.current());
            return;
        }
        if (resizeRef.current) {
            const r = resizeRef.current;
            const dix = (cx - r.sx) / tfRef.current.scale;
            const diy = (cy - r.sy) / tfRef.current.scale;
            let [x1, y1, x2, y2] = r.ob;
            if (r.corner === "tl") { x1 += dix; y1 += diy; }
            else if (r.corner === "tr") { x2 += dix; y1 += diy; }
            else if (r.corner === "bl") { x1 += dix; y2 += diy; }
            else { x2 += dix; y2 += diy; }
            updateBoxLocal(r.id, r.type, [Math.min(x1,x2), Math.min(y1,y2), Math.max(x1,x2), Math.max(y1,y2)]);
            return;
        }
        if (dragRef.current) {
            const d = dragRef.current;
            if (Math.abs(cx - d.sx) > 3 || Math.abs(cy - d.sy) > 3) d.moved = true;
            if (d.moved) {
                const dix = (cx - d.sx) / tfRef.current.scale;
                const diy = (cy - d.sy) / tfRef.current.scale;
                const [x1, y1, x2, y2] = d.ob;
                const w = x2 - x1, h = y2 - y1;
                updateBoxLocal(d.id, d.type, [x1 + dix, y1 + diy, x1 + dix + w, y1 + diy + h]);
            }
            return;
        }
        if (panRef.current) {
            const p = panRef.current;
            const newTf = { ...tfRef.current, ox: p.startOx + (cx - p.startCx), oy: p.startOy + (cy - p.startCy) };
            setTf(newTf);
            tfRef.current = newTf;
            return;
        }
        const { ix, iy } = toImg(cx, cy);
        let found: string | null = null;
        if (!hideDetections) {
            for (const b of [...boundingBoxes].reverse()) {
                const [x1, y1, x2, y2] = b.bbox;
                if (ix >= x1 && ix <= x2 && iy >= y1 && iy <= y2) { found = b.id; break; }
            }
            if (!found) for (const { primary: d } of [...detectionGroups].reverse()) {
                const [x1, y1, x2, y2] = d.bbox;
                if (ix >= x1 && ix <= x2 && iy >= y1 && iy <= y2) { found = d.id; break; }
            }
        }
        setHovId(found);
    }

    function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
        if (drawStartRef.current) {
            const { cx, cy } = clientToCanvas(e);
            const { ix: ex, iy: ey } = toImg(cx, cy);
            const { ix: sx, iy: sy } = drawStartRef.current;
            drawStartRef.current = null;
            drawCurRef.current = null;
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => drawRef.current());
            if (Math.abs(ex - sx) > 3 || Math.abs(ey - sy) > 3) {
                setPendingBox({ x1: Math.min(sx, ex), y1: Math.min(sy, ey), x2: Math.max(sx, ex), y2: Math.max(sy, ey) });
                setLabelInput("Unknown");
            }
            return;
        }
        resizeRef.current = null;
        dragRef.current = null;
        panRef.current = null;
        setIsPanning(false);
    }

    function updateBoxLocal(id: string, type: "det" | "bbox", newBox: number[]) {
        if (type === "bbox") setBoundingBoxes(prev => prev.map(b => b.id === id ? { ...b, bbox: newBox as [number, number, number, number] } : b));
        else setDetections(prev => prev.map(d => d.id === id ? { ...d, bbox: newBox } : d));
    }

    async function handleSaveBbox() {
        if (!pendingBox || !labelInput.trim() || !frame) return;
        setSavingBbox(true);
        try {
            const created = await api.createBoundingBox(projectId, frame.id, {
                bbox: [Math.round(pendingBox.x1), Math.round(pendingBox.y1), Math.round(pendingBox.x2), Math.round(pendingBox.y2)],
                display_label: labelInput.trim(),
            });
            setBoundingBoxes(prev => [...prev, created]);
            setPendingBox(null);
            setMode("select");
        } catch (err) { console.error(err); }
        finally { setSavingBbox(false); }
    }

    async function handleDeleteBbox(bboxId: string) {
        if (!frame) return;
        try {
            await api.deleteBoundingBox(projectId, frame.id, bboxId);
            setBoundingBoxes(prev => prev.filter(b => b.id !== bboxId));
            if (activeId === bboxId) { setActiveId(null); setActiveType(null); }
        } catch (err) { console.error(err); }
    }

    async function handleApprove() {
        if (!activeId || activeType !== "det" || !editLabel.trim()) return;
        setSaving(true); setSaveError(null);
        try {
            await api.reviewDetectionLabel(activeId, editLabel.trim());
            setDetections(prev => prev.map(d => d.id === activeId ? { ...d, display_label: editLabel.trim(), status: "reviewed" } : d));
            setActiveId(null); setActiveType(null);
        } catch (err: any) { setSaveError(err.message ?? "Failed to save"); }
        finally { setSaving(false); }
    }

    function goToFrame(i: number) {
        setActiveFrameIndex(i);
        onFrameChange(i);
    }

    function enterReviewMode() {
        setReviewMode(true);
        setPendingLabels(new Map());
        setEditingDetectionId(null);
    }

    function exitReviewMode() {
        setReviewMode(false);
        setPendingLabels(new Map());
        setPendingDeletions(new Set());
        setEditingDetectionId(null);
    }

    async function handleSaveReview() {
        const toSave = detections.filter(d => !pendingDeletions.has(d.id));

        setSavingReview(true);
        try {
            await Promise.all([
                ...toSave.map(d => {
                    const label = pendingLabels.get(d.id)?.trim() ?? d.display_label;
                    return api.reviewDetectionLabel(d.id, label);
                }),
                ...[...pendingDeletions].map(id => api.deleteDetection(id)),
            ]);

            // track which ones were edited so we can hide their %
            const editedIds = [...pendingLabels.keys()];
            setReviewedWithoutScore(prev => {
                const next = new Set(prev);
                editedIds.forEach(id => next.add(id));
                return next;
            });

            const newDets = detectionGroups
                .filter(({ primary: d }) => !pendingDeletions.has(d.id))
                .map(({ primary: d }) => ({
                    ...d,
                    display_label: pendingLabels.get(d.id)?.trim() ?? d.display_label,
                    status: "reviewed",
                }));
            setDetections(newDets);
            exitReviewMode();
        } catch (err: any) {
            setSaveError(err.message ?? "Failed to save");
        } finally {
            setSavingReview(false);
        }
    }

    async function handleDeleteDetection(detectionId: string) {
    try {
        await api.deleteDetection(detectionId);
        setDetections(prev => prev.filter(d => d.id !== detectionId));
        if (activeId === detectionId) { setActiveId(null); setActiveType(null); }
    } catch (err) {
        console.error(err);
    }
}

    const cursor = isPanning ? "grabbing" : mode === "draw" ? "crosshair" : hovId ? "pointer" : "default";
    const zoomPct = Math.round(zoomLevel * 100);
    const activeDet = detections.find(d => d.id === activeId && activeType === "det");

    return (
        <div className={styles.annotateShell}>
            {/* Header */}
            <div className={styles.annotateHeader}>
                <div className={styles.annotateHeaderLeft}>
                    <span className={styles.annotateTitle}>{project.name}</span>
                    <div className={styles.annotateFrameBadge}>
                        <span className={styles.annotateFrameBadgeCurrent}>{activeFrameIndex + 1}</span>
                        <span className={styles.annotateFrameBadgeSep}>/</span>
                        <span className={styles.annotateFrameBadgeTotal}>{frames.length}</span>
                    </div>
                </div>
                <div className={styles.annotateHeaderRight}>
                    <div className={styles.viewSwitch}>
                        <button onClick={onBack} className={styles.viewSwitchBtn}>
                            <LayoutGrid size={13} />
                            Grid
                        </button>
                        <button className={`${styles.viewSwitchBtn} ${styles.viewSwitchBtnSingle} ${styles.viewSwitchBtnActive}`}>
                            <Tag size={13} />
                            Single
                        </button>
                    </div>
                    <button className={styles.annotateBtnGhost}>
                        <Download size={13} />
                        Export
                    </button>
                </div>
            </div>

            {/* Body: canvas | panel */}
            <div className={styles.annotateBody}>
                {/* Canvas */}
                <div ref={containerRef} className={styles.annotateCanvasWrap}>
                    <canvas
                        ref={canvasRef}
                        className={styles.annotationCanvas}
                        style={{ cursor }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => {
                            setHovId(null);
                            if (!drawStartRef.current) {
                                panRef.current = null; setIsPanning(false);
                                dragRef.current = null; resizeRef.current = null;
                            }
                        }}
                    />

                    {mode === "draw" && !pendingBox && (
                        <div className={styles.drawModeToast}>Drag to draw a bounding box · Esc to cancel</div>
                    )}

                    {pendingBox && (
                        <div className={styles.pendingBoxPopup}>
                            <div className={styles.pendingBoxLabel}>Label new box</div>
                            <input
                                autoFocus
                                value={labelInput}
                                onChange={e => setLabelInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveBbox(); if (e.key === "Escape") setPendingBox(null); }}
                                placeholder="e.g. Lutjanus"
                                className={styles.pendingBoxInput}
                            />
                            <div className={styles.pendingBoxActions}>
                                <button onClick={() => setPendingBox(null)} className={styles.annotateBtnGhost}>Cancel</button>
                                <button onClick={handleSaveBbox} disabled={savingBbox || !labelInput.trim()} className={styles.annotateBtnPrimary}>
                                    {savingBbox ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating toolbar */}
                    <div className={styles.annotateToolbar}>
                        <button onClick={() => setMode("select")} className={`${styles.annotateTool} ${mode === "select" ? styles.annotateToolActive : ""}`} title="Select / Move (S)">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 2l5 10 1.5-3.5L12 7 2 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button onClick={() => { setMode("draw"); setPendingBox(null); }} className={`${styles.annotateTool} ${mode === "draw" ? styles.annotateToolActive : ""}`} title="Draw box (D)">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.5 1.5" />
                                <line x1="7" y1="4.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
                                <line x1="4.5" y1="7" x2="9.5" y2="7" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                        </button>
                        <button onClick={() => setHideDetections(v => !v)} className={`${styles.annotateTool} ${hideDetections ? styles.annotateToolActive : ""}`} title="Hide detections (H)">
                            {hideDetections ? (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <line x1="1.5" y1="1.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                                    <path d="M4 4.5C2.5 5.5 1.5 7 1.5 7S3.5 11 7 11c1 0 1.9-.3 2.7-.7M6 3.1C6.3 3 6.6 3 7 3c3.5 0 5.5 4 5.5 4-.4.7-.9 1.4-1.5 1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M1.5 7S3.5 3 7 3s5.5 4 5.5 4-2 4-5.5 4S1.5 7 1.5 7z" stroke="currentColor" strokeWidth="1.3" />
                                    <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                                </svg>
                            )}
                        </button>

                        <span className={styles.annotateToolSep} />

                        <button onClick={zoomOut} disabled={zoomLevel <= 0.11} className={styles.annotateTool} title="Zoom out">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
                                <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.3" />
                                <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button onClick={zoomReset} className={`${styles.annotateTool} ${styles.annotateToolZoomPct}`} title="Reset zoom">{zoomPct}%</button>
                        <button onClick={zoomIn} disabled={zoomLevel >= 19.9} className={styles.annotateTool} title="Zoom in">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
                                <line x1="6" y1="4" x2="6" y2="8" stroke="currentColor" strokeWidth="1.3" />
                                <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.3" />
                                <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                        </button>

                        <span className={styles.annotateToolSep} />

                        <button onClick={() => goToFrame(Math.max(0, activeFrameIndex - 1))} disabled={activeFrameIndex === 0} className={styles.annotateTool} title="Previous frame (←)">
                            <SkipBack size={13} />
                        </button>
                        <span className={styles.annotateToolCounter}>{activeFrameIndex + 1} / {frames.length}</span>
                        <button onClick={() => goToFrame(Math.min(frames.length - 1, activeFrameIndex + 1))} disabled={activeFrameIndex === frames.length - 1} className={styles.annotateTool} title="Next frame (→)">
                            <ChevronRight size={13} />
                        </button>

                        {activeId && activeType === "bbox" && (
                            <>
                                <span className={styles.annotateToolSep} />
                                <button onClick={() => { if (activeId) handleDeleteBbox(activeId); }} className={`${styles.annotateTool} ${styles.annotateToolDanger}`} title="Delete selected (Del)">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <polyline points="2,4 12,4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                                        <path d="M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" />
                                        <rect x="3" y="4" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
                                        <line x1="5.5" y1="6.5" x2="5.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
                                        <line x1="8.5" y1="6.5" x2="8.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
                                    </svg>
                                </button>
                            </>
                        )}
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
                        margin: 12,
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
                        <div className="flex items-center" style={{ gap: 8 }}>
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

                        {reviewMode ? (
                            <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700 }}>
                                Review mode
                            </span>
                        ) : (
                            <button
                                onClick={enterReviewMode}
                                className={styles.btnSecondary}
                                style={{
                                    fontSize: 11,
                                    padding: "4px 10px",
                                    background: "var(--primary-pale)",
                                    border: "1.5px solid var(--primary-light)",
                                    color: "var(--primary-dark)",
                                }}
                            >
                                Edit & Review
                            </button>
                        )}
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
                            <div style={{ color: "var(--text3)", fontSize: 12, textAlign: "center", padding: 12 }}>
                                Loading…
                            </div>
                        ) : (
                            detectionGroups.map(({ primary: d, overlapping }) => {
                                const active = d.id === activeId && activeType === "det";
                                const isEditing = editingDetectionId === d.id;
                                const currentLabel = pendingLabels.get(d.id) ?? d.display_label ?? "Unknown";
                                const isDirty = pendingLabels.has(d.id) &&
                                    pendingLabels.get(d.id)?.trim() !== d.display_label;
                                const isReviewed = d.status === "reviewed";

                                return (
                                    <div key={d.id}>
                                        <div
                                            onClick={() => {
                                                if (reviewMode) return;
                                                setActiveId(active ? null : d.id);
                                                setActiveType(active ? null : "det");
                                            }}
                                            onDoubleClick={() => {
                                                if (!reviewMode) return;
                                                setEditingDetectionId(d.id);
                                                if (!pendingLabels.has(d.id)) {
                                                    setPendingLabels(prev =>
                                                        new Map(prev).set(d.id, d.display_label ?? "")
                                                    );
                                                }
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                padding: "8px 10px",
                                                borderRadius: 7,
                                                cursor: reviewMode ? "text" : "pointer",
                                                background: active ? "var(--primary-pale)" : "var(--surface2)",
                                                border: `1.5px solid ${
                                                    reviewMode
                                                        ? "rgba(255,255,255,0.15)"
                                                        : active
                                                        ? "var(--primary-light)"
                                                        : "var(--border)"
                                                }`,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    background:
                                                        labelColorMap.get(d.display_label || "Unknown") ??
                                                        "var(--text3)",
                                                    flexShrink: 0,
                                                }}
                                            />
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    value={currentLabel}
                                                    onChange={e =>
                                                        setPendingLabels(prev =>
                                                            new Map(prev).set(d.id, e.target.value)
                                                        )
                                                    }
                                                    onBlur={() => setEditingDetectionId(null)}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter" || e.key === "Escape")
                                                            setEditingDetectionId(null);
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                        flex: 1,
                                                        fontSize: 13,
                                                        fontFamily: "inherit",
                                                        fontStyle: "italic",
                                                        fontWeight: 600,
                                                        background: "transparent",
                                                        border: "none",
                                                        borderBottom: "1.5px solid var(--primary)",
                                                        outline: "none",
                                                        color: "var(--text1)",
                                                        padding: "0 2px",
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    style={{
                                                        flex: 1,
                                                        fontSize: 13,
                                                        color: pendingDeletions.has(d.id) ? "var(--text3)" : "var(--text1)",
                                                        fontWeight: active ? 600 : 500,
                                                        fontStyle: "italic",
                                                        textDecoration: pendingDeletions.has(d.id) ? "line-through" : "none",
                                                    }}
                                                >
                                                    {currentLabel}
                                                </span>
                                            )}
                                            {d.score != null && !reviewedWithoutScore.has(d.id) && !reviewMode && (
                                                <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 700 }}>
                                                    {Math.round((d.score ?? 0) * 100)}%
                                                </span>
                                            )}
                                            {reviewMode && !isEditing && !pendingDeletions.has(d.id) && (
                                                <span style={{ fontSize: 10, color: "var(--text3)", opacity: 0.6 }}>
                                                    edit
                                                </span>
                                            )}
                                            {reviewMode && (
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setPendingDeletions(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(d.id)) {
                                                                next.delete(d.id);
                                                            } else {
                                                                next.add(d.id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: pendingDeletions.has(d.id) ? "var(--danger)" : "var(--danger)",
                                                        cursor: "pointer",
                                                        fontSize: pendingDeletions.has(d.id) ? 11 : 14,
                                                        fontWeight: pendingDeletions.has(d.id) ? 700 : 400,
                                                        lineHeight: 1,
                                                        padding: 2,
                                                        fontFamily: "inherit",
                                                    }}
                                                >
                                                    {pendingDeletions.has(d.id) ? "undo" : "×"}
                                                </button>
                                            )}
                                        </div>

                                        {/* Only show overlapping when not reviewed and not in review mode */}
                                        {!reviewMode && !isReviewed && overlapping.map(alt => (
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
                                                            labelColorMap.get(alt.display_label || "Unknown") ??
                                                            "var(--text3)",
                                                    }}
                                                />
                                                <span style={{ flex: 1, fontSize: 12, color: "var(--text2)" }}>
                                                    {alt.display_label || "Unknown"}
                                                </span>
                                                <span style={{ fontSize: 11, color: "var(--text3)" }}>
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
                                const active = b.id === activeId && activeType === "bbox";
                                const bboxColor = labelColorMap.get(b.display_label) ?? "#a78bfa";
                                return (
                                    <div
                                        key={b.id}
                                        onClick={() => {
                                            setActiveId(active ? null : b.id);
                                            setActiveType(active ? null : "bbox");
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "8px 10px",
                                            borderRadius: 7,
                                            cursor: "pointer",
                                            background: active ? "rgba(94,201,154,0.1)" : "var(--surface2)",
                                            border: `1.5px dashed ${active ? bboxColor : "var(--border)"}`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                background: "transparent",
                                                border: `2px solid ${bboxColor}`,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ flex: 1, fontSize: 13, color: "var(--text1)", fontWeight: active ? 600 : 500 }}>
                                            {b.display_label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: bboxColor,
                                                fontWeight: 700,
                                                marginRight: 4,
                                            }}
                                        >
                                            drawn
                                        </span>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDeleteBbox(b.id); }}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--danger)",
                                                cursor: "pointer",
                                                fontSize: 14,
                                                lineHeight: 1,
                                                padding: 2,
                                            }}
                                        >×</button>
                                    </div>
                                );
                            })}

                    </div>

                    {reviewMode && (
                        <div
                            style={{
                                borderTop: "1px solid var(--border)",
                                paddingTop: 12,
                                flexShrink: 0,
                            }}
                        >
                            {saveError && (
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--danger)",
                                        background: "#fff0f0",
                                        border: "1px solid #ffd0d0",
                                        borderRadius: 6,
                                        padding: "6px 10px",
                                        marginBottom: 8,
                                    }}
                                >
                                    {saveError}
                                </div>
                            )}
                            <button
                                onClick={handleSaveReview}
                                disabled={savingReview}
                                className={styles.btnPrimary}
                                style={{
                                    width: "100%",
                                    justifyContent: "center",
                                    background: "var(--success)",
                                    padding: "10px",
                                    fontSize: 13,
                                }}
                            >
                                {savingReview ? "Saving…" : `Save & mark all reviewed`}
                            </button>
                            <button
                                onClick={exitReviewMode}
                                className={styles.btnSecondary}
                                style={{
                                    width: "100%",
                                    justifyContent: "center",
                                    marginTop: 6,
                                    fontSize: 12,
                                }}
                            >
                                Cancel
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
        </div>
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
