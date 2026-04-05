"use client";

import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import ProjectCard from '../../components/projects/ProjectCard';
import ProjectModal from '../../components/projects/ProjectModal';
import DeleteConfirmModal from '../../components/projects/DeleteConfirmModal';
import { Project, CreateProjectInput, UpdateProjectInput } from '../../types/project';

function SkeletonCard() {
    return (
        <div className="animate-pulse bg-[#0d1f2d] border border-[rgba(0,180,160,0.05)] rounded-2xl p-6 flex flex-col gap-4 h-52">
            <div className="flex items-start justify-between gap-3">
                <div className="h-5 bg-[rgba(255,255,255,0.06)] rounded-lg w-2/3" />
            </div>
            <div className="h-5 bg-[rgba(255,255,255,0.04)] rounded-full w-20" />
            <div className="flex flex-col gap-2 flex-1">
                <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-full" />
                <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-4/5" />
            </div>
            <div className="flex justify-between pt-3 border-t border-[rgba(0,180,160,0.04)]">
                <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-24" />
                <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-24" />
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);

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
        <div className="min-h-screen bg-[#0a1628] px-6 py-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1
                        className="text-[2rem] font-black text-[#e8f2f8]"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        Projects
                    </h1>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#006d9e] to-[#00b4a0] text-white text-[0.88rem] font-bold hover:opacity-90 transition-opacity duration-150"
                    >
                        <Plus size={16} />
                        New Project
                    </button>
                </div>
                {error && (
                    <div className="mb-6 px-4 py-3 rounded-xl bg-[rgba(232,97,58,0.1)] border border-[rgba(232,97,58,0.25)] text-[#e8613a] text-[0.88rem]">
                        {error}
                    </div>
                )}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                )}

                {!loading && !error && projects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-28 text-center">
                        <div className="p-5 rounded-2xl bg-[rgba(0,180,160,0.07)] mb-5">
                            <FolderOpen size={40} className="text-[#00b4a0] opacity-70" />
                        </div>
                        <p
                            className="text-[1.2rem] font-bold text-[#e8f2f8] mb-2"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            No projects yet
                        </p>
                        <p className="text-[0.85rem] text-[#8dadc2] mb-6 max-w-xs">
                            Create your first project to start annotating underwater imagery.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-[#006d9e] to-[#00b4a0] text-white text-[0.88rem] font-bold hover:opacity-90 transition-opacity duration-150"
                        >
                            <Plus size={16} />
                            Create your first project
                        </button>
                    </div>
                )}

                {!loading && projects.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
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
