"use client";

import { useState, useMemo } from 'react';
import { Plus, Search, FolderOpen } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import ProjectCard from '../../components/projects/ProjectCard';
import ProjectModal from '../../components/projects/ProjectModal';
import DeleteConfirmModal from '../../components/projects/DeleteConfirmModal';
import { Project, ProjectType, CreateProjectInput, UpdateProjectInput } from '../../types/project';

type Filter = 'all' | ProjectType;

function SkeletonCard() {
    return (
        <div className="animate-pulse bg-bg-surface border border-border-default rounded-[10px] overflow-hidden">
            <div className="h-[130px] bg-white/[0.03]" />
            <div className="p-3.5 flex flex-col gap-2.5">
                <div className="h-3.5 bg-white/[0.05] rounded w-3/4" />
                <div className="h-3 bg-white/[0.03] rounded w-2/5" />
                <div className="h-3 bg-white/[0.03] rounded w-full" />
                <div className="h-3 bg-white/[0.03] rounded w-4/5" />
            </div>
        </div>
    );
}

const TABS: { id: Filter; label: string }[] = [
    { id: 'all',    label: 'All'    },
    { id: 'active', label: 'Active' },
    { id: 'test',   label: 'Test'   },
];

export default function ProjectsPage() {
    const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProject, setEditingProject]   = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const counts = useMemo(() => ({
        all:    projects.length,
        active: projects.filter(p => p.type === 'active').length,
        test:   projects.filter(p => p.type === 'test').length,
    }), [projects]);

    const visible = useMemo(() => {
        let list = filter === 'all' ? projects : projects.filter(p => p.type === filter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [projects, filter, search]);

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
        <div className="min-h-screen bg-bg-primary flex flex-col">
            {/* Subbar */}
            <div className="flex items-center justify-between px-7 py-3 border-b border-border-default">
                <div className="flex items-center gap-0.5">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id)}
                            className={`flex items-center gap-2 h-[30px] px-3 rounded-[6px] text-[13px] transition-colors duration-150 ${
                                filter === t.id
                                    ? 'bg-border-default text-text-secondary'
                                    : 'text-text-muted hover:text-text-secondary'
                            }`}
                        >
                            {t.label}
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[3px] bg-bg-primary text-text-muted">
                                {counts[t.id]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 h-[32px] px-2.5 w-[260px] bg-bg-primary border border-border-default rounded-[6px] text-text-muted focus-within:border-border-hover transition-colors duration-150">
                        <Search size={13} className="shrink-0" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={`Search ${counts.all} projects…`}
                            className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder-text-muted"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-1.5 h-[32px] px-3.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-[13px] font-medium rounded-[6px] transition-colors duration-150"
                    >
                        <Plus size={13} />
                        New project
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-7 py-5">
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-coral/10 border border-coral/25 text-coral text-[13px]">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="grid grid-cols-3 gap-3.5">
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                )}

                {!loading && !error && projects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="p-5 rounded-[10px] bg-accent-blue/[0.07] mb-4">
                            <FolderOpen size={36} className="text-accent-blue opacity-70" />
                        </div>
                        <p className="text-[15px] font-semibold text-text-primary mb-2">No projects yet</p>
                        <p className="text-[13px] text-text-muted mb-5 max-w-[280px]">
                            Create your first project to start annotating underwater imagery.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-[13px] font-medium px-4 py-2 rounded-[6px] transition-colors duration-150"
                        >
                            <Plus size={13} />
                            Create your first project
                        </button>
                    </div>
                )}

                {!loading && projects.length > 0 && visible.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <p className="text-[13px] text-text-muted">No projects match &ldquo;{search}&rdquo;</p>
                    </div>
                )}

                {!loading && visible.length > 0 && (
                    <div className="grid grid-cols-3 gap-3.5">
                        {visible.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEditAction={setEditingProject}
                                onDeleteAction={setDeletingProject}
                            />
                        ))}
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
