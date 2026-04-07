"use client";

import { Pencil, Trash2, Layers, Clock } from 'lucide-react';
import { Project, ProjectType } from '../../types/project';

interface ProjectCardProps {
    project: Project;
    onEditAction: (project: Project) => void;
    onDeleteAction: (project: Project) => void;
}

const TYPE_STYLES: Record<ProjectType, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-[rgba(0,180,160,0.15)]',  text: 'text-[#00b4a0]', label: 'Active' },
    test:   { bg: 'bg-[rgba(139,92,246,0.15)]', text: 'text-[#a78bfa]', label: 'Test' },
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function ProjectCard({ project, onEditAction, onDeleteAction }: ProjectCardProps) {
    const type = TYPE_STYLES[project.type];

    return (
        <div className="group relative bg-[#0d1f2d] border border-[rgba(0,180,160,0.08)] rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:border-[rgba(0,180,160,0.35)] hover:shadow-[0_4px_24px_rgba(0,180,160,0.1)]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3
                        className="text-[1.05rem] font-bold text-[#e8f2f8] leading-snug truncate"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {project.name}
                    </h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                    <button
                        onClick={() => onEditAction(project)}
                        aria-label="Edit project"
                        className="p-1.5 rounded-lg text-[#8dadc2] hover:text-[#00b4a0] hover:bg-[rgba(0,180,160,0.1)] transition-colors duration-150"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        onClick={() => onDeleteAction(project)}
                        aria-label="Delete project"
                        className="p-1.5 rounded-lg text-[#8dadc2] hover:text-[#e8613a] hover:bg-[rgba(232,97,58,0.1)] transition-colors duration-150"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <span className={`inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-[0.72rem] font-semibold tracking-wide uppercase ${type.bg} ${type.text}`}>
                {type.label}
            </span>

            <p className="text-[0.83rem] text-[#8dadc2] leading-relaxed line-clamp-2 flex-1">
                {project.description || <span className="italic opacity-60">No description</span>}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-[rgba(0,180,160,0.06)] text-[0.75rem] text-[#4a6880]">
                <span className="flex items-center gap-1.5">
                    <Layers size={12} className="shrink-0" />
                    {project.frame_count.toLocaleString()} frames
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock size={12} className="shrink-0" />
                    {formatDate(project.created_at)}
                </span>
            </div>
        </div>
    );
}
