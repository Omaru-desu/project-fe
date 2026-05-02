"use client";

import { Pencil, Trash2 } from 'lucide-react';
import { Project, ProjectType } from '../../types/project';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
    project: Project;
    onEditAction: (project: Project) => void;
    onDeleteAction: (project: Project) => void;
}

const THUMB_STYLE: Record<ProjectType, string> = {
    active: 'repeating-linear-gradient(135deg, #1a3a5c 0 8px, #122e4a 8px 16px)',
    test:   'repeating-linear-gradient(135deg, #2a1f4a 0 8px, #1d1538 8px 16px)',
};

const TYPE_BADGE: Record<ProjectType, { dot: string; label: string; text: string }> = {
    active: { dot: 'bg-[#22d3ee]', label: 'Active', text: 'text-[#22d3ee]' },
    test:   { dot: 'bg-[#a78bfa]', label: 'Test',   text: 'text-[#a78bfa]' },
};

const CROSSHAIRS = [
    { left: '16%', top: '36%', width: 22, height: 18 },
    { left: '54%', top: '54%', width: 32, height: 20 },
    { left: '71%', top: '26%', width: 18, height: 22 },
];

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCount(n: number): string {
    if (n >= 10000) return Math.round(n / 1000) + 'k';
    if (n >= 1000)  return (n / 1000).toFixed(1) + 'k';
    return String(n);
}

export default function ProjectCard({ project, onEditAction, onDeleteAction }: ProjectCardProps) {
    const badge = TYPE_BADGE[project.type];
    const router = useRouter();

    return (
        <div
            onClick={() => router.push(`/projects/${project.id}`)}
            className="group bg-bg-surface border border-border-default hover:border-border-hover rounded-[10px] overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-px flex flex-col"
        >
            {/* Thumbnail */}
            <div className="relative h-[130px] shrink-0" style={{ background: THUMB_STYLE[project.type] }}>
                {/* Type badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-[4px]">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                    <span className={`text-[10px] font-medium uppercase tracking-widest ${badge.text}`}>
                        {badge.label}
                    </span>
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                        onClick={e => { e.stopPropagation(); onEditAction(project); }}
                        aria-label="Edit project"
                        className="p-1.5 rounded-[5px] bg-black/50 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/70 transition-colors duration-150"
                    >
                        <Pencil size={12} />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onDeleteAction(project); }}
                        aria-label="Delete project"
                        className="p-1.5 rounded-[5px] bg-black/50 backdrop-blur-sm text-white/60 hover:text-coral hover:bg-black/70 transition-colors duration-150"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>

                {/* Decorative crosshairs */}
                {CROSSHAIRS.map((c, i) => (
                    <span
                        key={i}
                        className="absolute border border-dashed border-accent-blue/30 rounded-[2px] pointer-events-none"
                        style={{ left: c.left, top: c.top, width: c.width, height: c.height }}
                    />
                ))}
            </div>

            {/* Body */}
            <div className="flex flex-col gap-1.5 p-3.5 flex-1">
                <h3 className="text-[13.5px] font-medium text-text-primary leading-snug truncate">
                    {project.name}
                </h3>
                <div className="flex items-center gap-1.5 text-[11.5px] font-mono">
                    <span className="text-text-secondary">{formatCount(project.frame_count)}</span>
                    <span className="text-text-muted">frames</span>
                    <span className="text-border-hover">·</span>
                    <span className="text-text-muted">{formatDate(project.created_at)}</span>
                </div>
                <p className={`text-[12px] text-text-muted line-clamp-2 leading-relaxed mt-0.5 ${!project.description ? 'italic opacity-50' : ''}`}>
                    {project.description || 'No description'}
                </p>
            </div>
        </div>
    );
}
