"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Project, ProjectType } from "../../types/project";

interface ProjectCardProps {
    project: Project;
    onEditAction: (project: Project) => void;
    onDeleteAction: (project: Project) => void;
}

const STATUS_BADGE: Record<ProjectType, { bg: string; color: string; dot: string; label: string }> = {
    active: {
        bg: "rgba(94,201,154,0.12)",
        color: "var(--success)",
        dot: "var(--success)",
        label: "Active",
    },
    test: {
        bg: "rgba(245,188,98,0.15)",
        color: "var(--warning)",
        dot: "var(--warning)",
        label: "Test",
    },
};

const STRIP_GRADIENT: Record<ProjectType, string> = {
    active: "linear-gradient(90deg, var(--primary), var(--teal))",
    test: "linear-gradient(90deg, var(--warning), #9fba3e)",
};

function formatUpdated(iso?: string, fallback?: string): string {
    const value = iso ?? fallback;
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const today = new Date();
    const sameDay =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
    if (sameDay) return "Today";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectCard({ project, onEditAction, onDeleteAction }: ProjectCardProps) {
    const router = useRouter();
    const badge = STATUS_BADGE[project.type];

    const total = project.frame_count ?? 0;
    const reviewed = project.reviewed_count ?? 0;
    const flagged = project.flagged_count ?? 0;
    const unreviewed = Math.max(0, total - reviewed);
    const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
    const progressColor =
        reviewed === total && total > 0 ? "var(--success)" : "var(--primary)";

    return (
        <div
            className="flex flex-col overflow-hidden bg-surface"
            style={{
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
            }}
        >
            {/* Accent strip */}
            <div style={{ height: 4, background: STRIP_GRADIENT[project.type] }} />

            <div style={{ padding: "16px 18px", flex: 1 }}>
                <div className="flex items-start justify-between" style={{ marginBottom: 6 }}>
                    <div
                        className="flex-1"
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text1)",
                            lineHeight: 1.3,
                            marginRight: 8,
                        }}
                    >
                        {project.name}
                    </div>
                    <div
                        className="flex items-center gap-1 flex-shrink-0"
                        style={{
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: badge.bg,
                        }}
                    >
                        <span
                            style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: badge.dot,
                            }}
                        />
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: badge.color,
                                textTransform: "capitalize",
                            }}
                        >
                            {badge.label}
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        fontSize: 12,
                        color: "var(--text3)",
                        lineHeight: 1.5,
                        marginBottom: 14,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: 36,
                    }}
                >
                    {project.description || "No description"}
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 12 }}>
                    <div className="flex justify-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>Review progress</span>
                        <span
                            style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}
                        >
                            {pct}%
                        </span>
                    </div>
                    <div
                        style={{
                            height: 5,
                            background: "var(--border)",
                            borderRadius: 99,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                height: "100%",
                                width: `${Math.min(100, pct)}%`,
                                background: progressColor,
                                borderRadius: 99,
                                transition: "width 0.4s",
                            }}
                        />
                    </div>
                </div>

                {/* Status breakdown */}
                <div className="flex flex-wrap" style={{ gap: 10 }}>
                    <Stat dot="var(--text3)" label={`${unreviewed} unreviewed`} />
                    <Stat dot="var(--success)" label={`${reviewed} reviewed`} />
                    {flagged > 0 && (
                        <Stat dot="var(--warning)" label={`${flagged} changed`} />
                    )}
                </div>
            </div>

            <div
                className="flex items-center justify-between"
                style={{
                    padding: "10px 18px",
                    borderTop: "1px solid var(--border)",
                    background: "var(--surface2)",
                }}
            >
                <span style={{ fontSize: 11, color: "var(--text3)" }}>
                    Updated {formatUpdated(project.updated_at, project.created_at)}
                </span>
                <div className="flex" style={{ gap: 6 }}>
                    <IconButton
                        ariaLabel="Edit project"
                        onClick={e => {
                            e.stopPropagation();
                            onEditAction(project);
                        }}
                    >
                        <Pencil size={12} color="var(--text2)" />
                    </IconButton>
                    <IconButton
                        ariaLabel="Delete project"
                        danger
                        onClick={e => {
                            e.stopPropagation();
                            onDeleteAction(project);
                        }}
                    >
                        <Trash2 size={12} color="var(--danger)" />
                    </IconButton>
                    <button
                        onClick={() => router.push(`/projects/${project.id}`)}
                        style={{
                            padding: "0 14px",
                            height: 28,
                            borderRadius: 6,
                            border: "none",
                            background: "var(--primary)",
                            color: "#fff",
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: 600,
                        }}
                    >
                        Open →
                    </button>
                </div>
            </div>
        </div>
    );
}

function Stat({ dot, label }: { dot: string; label: string }) {
    return (
        <div className="flex items-center" style={{ gap: 4 }}>
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: dot,
                }}
            />
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{label}</span>
        </div>
    );
}

function IconButton({
    children,
    onClick,
    ariaLabel,
    danger,
}: {
    children: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
    ariaLabel: string;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={ariaLabel}
            className="flex items-center justify-center"
            style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: danger ? "1.5px solid #ffd0d0" : "1.5px solid var(--border)",
                background: danger ? "#fff8f8" : "var(--surface)",
                cursor: "pointer",
            }}
        >
            {children}
        </button>
    );
}
