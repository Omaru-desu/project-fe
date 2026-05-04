"use client";

import { useState, useMemo } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { useProjects } from "../../hooks/useProjects";
import ProjectCard from "../../components/projects/ProjectCard";
import ProjectModal from "../../components/projects/ProjectModal";
import DeleteConfirmModal from "../../components/projects/DeleteConfirmModal";
import {
    Project,
    ProjectType,
    CreateProjectInput,
    UpdateProjectInput,
} from "../../types/project";

type Filter = "all" | ProjectType;

const TABS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "test", label: "Test" },
];

export default function ProjectsPage() {
    const { projects, loading, error, createProject, updateProject, deleteProject } =
        useProjects();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<"date_desc" | "date_asc" | "alpha_asc" | "alpha_desc">("date_desc");

    const filtered = useMemo(() => {
        const list = filter === "all" ? projects : projects.filter(p => p.type === filter);
        return [...list].sort((a, b) => {
            if (sort === "alpha_asc") return a.name.localeCompare(b.name);
            if (sort === "alpha_desc") return b.name.localeCompare(a.name);
            if (sort === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [projects, filter, sort]);

    const handleCreate = async (data: CreateProjectInput | UpdateProjectInput) => {
        await createProject(data as CreateProjectInput);
    };
    const handleEdit = async (data: CreateProjectInput | UpdateProjectInput) => {
        if (!editingProject) return;
        await updateProject(editingProject.id, data as UpdateProjectInput);
    };
    const handleDelete = async () => {
        if (!deletingProject) return;
        await deleteProject(deletingProject.id);
    };

    return (
        <div className="flex flex-col" style={{ background: "var(--bg)", minHeight: "calc(100vh - 58px)" }}>
            <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                    <div>
                        <div
                            style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: "var(--text1)",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Projects
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>
                            Select a project to start annotating
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center"
                        style={{
                            gap: 7,
                            padding: "9px 20px",
                            borderRadius: 9,
                            border: "none",
                            background: "var(--primary)",
                            color: "#fff",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        <Plus size={14} />
                        New Project
                    </button>
                </div>

                {/* Filter tabs */}
                <div
                    className="flex items-center"
                    style={{ gap: 8, marginBottom: 20 }}
                >
                    {TABS.map(tab => {
                        const active = filter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                style={{
                                    padding: "6px 16px",
                                    borderRadius: 99,
                                    border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                    background: active ? "var(--primary-pale)" : "var(--surface)",
                                    color: active ? "var(--primary-dark)" : "var(--text3)",
                                    fontSize: 13,
                                    fontWeight: active ? 600 : 400,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                    <div
                        style={{
                            marginLeft: "auto",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <select
                        value={sort}
                        onChange={e => setSort(e.target.value as "date_desc" | "date_asc" | "alpha_asc" | "alpha_desc")}
                        style={{
                            padding: "6px 12px",
                            borderRadius: 99,
                            border: "1.5px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--text3)",
                            fontSize: 13,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            outline: "none",
                        }}
                    >
                        <option value="date_desc">Sort by Newest</option>
                        <option value="date_asc">Sort by Oldest</option>
                        <option value="alpha_asc">Sort by A to Z</option>
                        <option value="alpha_desc">Sort by Z to A</option>
                    </select>
                        <div style={{ fontSize: 13, color: "var(--text3)" }}>
                            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "#fff0f0",
                            border: "1px solid #ffd0d0",
                            color: "var(--danger)",
                            fontSize: 13,
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 16,
                        }}
                    >
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && projects.length === 0 && (
                    <div
                        className="flex flex-col items-center justify-center text-center"
                        style={{ padding: "80px 24px" }}
                    >
                        <div
                            className="flex items-center justify-center"
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 16,
                                background: "var(--primary-pale)",
                                marginBottom: 16,
                            }}
                        >
                            <FolderOpen size={28} color="var(--primary)" />
                        </div>
                        <p
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "var(--text1)",
                                marginBottom: 6,
                            }}
                        >
                            No projects yet
                        </p>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--text3)",
                                marginBottom: 20,
                                maxWidth: 280,
                            }}
                        >
                            Create your first project to start annotating underwater imagery.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center"
                            style={{
                                gap: 7,
                                padding: "9px 18px",
                                borderRadius: 9,
                                border: "none",
                                background: "var(--primary)",
                                color: "#fff",
                                fontFamily: "inherit",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            <Plus size={14} />
                            Create your first project
                        </button>
                    </div>
                )}

                {/* Grid */}
                {!loading && projects.length > 0 && (
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 16,
                        }}
                    >
                        {filtered.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEditAction={setEditingProject}
                                onDeleteAction={setDeletingProject}
                            />
                        ))}
                        {/* New project add card */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex flex-col items-center justify-center"
                            style={{
                                background: "var(--surface)",
                                borderRadius: "var(--r-md)",
                                border: "2px dashed var(--border)",
                                cursor: "pointer",
                                padding: 36,
                                gap: 10,
                                minHeight: 240,
                                fontFamily: "inherit",
                                transition: "border-color 0.15s",
                            }}
                            onMouseEnter={e =>
                                (e.currentTarget.style.borderColor = "var(--primary-light)")
                            }
                            onMouseLeave={e =>
                                (e.currentTarget.style.borderColor = "var(--border)")
                            }
                        >
                            <span
                                className="flex items-center justify-center"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: "var(--primary-pale)",
                                }}
                            >
                                <Plus size={20} color="var(--primary)" />
                            </span>
                            <span
                                style={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    color: "var(--text2)",
                                }}
                            >
                                New project
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <ProjectModal
                    mode="create"
                    onCloseAction={() => setShowCreateModal(false)}
                    onSubmitAction={handleCreate}
                />
            )}
            {editingProject && (
                <ProjectModal
                    mode="edit"
                    project={editingProject}
                    onCloseAction={() => setEditingProject(null)}
                    onSubmitAction={handleEdit}
                />
            )}
            {deletingProject && (
                <DeleteConfirmModal
                    project={deletingProject}
                    onCloseAction={() => setDeletingProject(null)}
                    onConfirmAction={handleDelete}
                />
            )}
        </div>
    );
}

function SkeletonCard() {
    return (
        <div
            className="overflow-hidden"
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                boxShadow: "var(--shadow-sm)",
            }}
        >
            <div style={{ height: 4, background: "var(--border)" }} />
            <div style={{ padding: 18 }} className="animate-pulse">
                <div
                    style={{
                        height: 14,
                        background: "var(--border)",
                        borderRadius: 5,
                        width: "60%",
                        marginBottom: 10,
                    }}
                />
                <div
                    style={{
                        height: 10,
                        background: "var(--border)",
                        borderRadius: 5,
                        width: "100%",
                        marginBottom: 6,
                    }}
                />
                <div
                    style={{
                        height: 10,
                        background: "var(--border)",
                        borderRadius: 5,
                        width: "80%",
                        marginBottom: 14,
                    }}
                />
                <div
                    style={{
                        height: 5,
                        background: "var(--border)",
                        borderRadius: 99,
                        width: "100%",
                        marginBottom: 12,
                    }}
                />
                <div
                    style={{
                        height: 10,
                        background: "var(--border)",
                        borderRadius: 5,
                        width: "70%",
                    }}
                />
            </div>
        </div>
    );
}
