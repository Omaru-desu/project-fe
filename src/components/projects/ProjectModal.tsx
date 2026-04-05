"use client";

import { useState, useEffect } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import { Project, CreateProjectInput, UpdateProjectInput } from '../../types/project';

interface ProjectModalProps {
    mode: 'create' | 'edit';
    project?: Project;
    onCloseAction: () => void;
    onSubmitAction: (data: CreateProjectInput | UpdateProjectInput) => Promise<void>;
}

type Status = 'active' | 'completed' | 'archived' | 'test';

const TEST_RETENTION_DAYS = 90;

// Returns the status options available given the current mode and original status.
// Active <-> Test transitions are blocked because frames live in different buckets.
function getStatusOptions(mode: 'create' | 'edit', originalStatus?: Status): Status[] {
    if (mode === 'create') return ['active', 'test'];
    if (originalStatus === 'active') return ['active', 'completed', 'archived'];
    if (originalStatus === 'test')   return ['test', 'completed', 'archived'];
    return ['completed', 'archived'];
}

export default function ProjectModal({ mode, project, onCloseAction, onSubmitAction }: ProjectModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Status>('active');
    const [nameError, setNameError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const originalStatus = project?.status as Status | undefined;

    useEffect(() => {
        if (mode === 'edit' && project) {
            setName(project.name);
            setDescription(project.description);
            setStatus(project.status as Status);
        }
    }, [mode, project]);

    const validate = (): boolean => {
        if (!name.trim()) {
            setNameError('Name is required.');
            return false;
        }
        if (name.trim().length < 3) {
            setNameError('Name must be at least 3 characters.');
            return false;
        }
        setNameError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            await onSubmitAction({ name: name.trim(), description: description.trim(), status });
            onCloseAction();
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusOptions = getStatusOptions(mode, originalStatus);
    const showTestWarning = status === 'test';

    const inputClass =
        'w-full bg-[#0a1628] border border-[rgba(0,180,160,0.2)] text-[#e8f2f8] placeholder-[#4a6880] rounded-xl px-4 py-3 text-[0.88rem] outline-none transition-all duration-150 focus:border-[#00b4a0] focus:shadow-[0_0_0_3px_rgba(0,180,160,0.12)]';

    const STATUS_LABELS: Record<Status, string> = {
        active:    'Active',
        test:      'Test',
        completed: 'Completed',
        archived:  'Archived',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onCloseAction(); }}
        >
            <div className="bg-[#0d1f2d] border border-[rgba(0,180,160,0.15)] rounded-2xl p-8 w-full max-w-lg shadow-[0_8px_48px_rgba(0,0,0,0.5)]">
                {/* Modal header */}
                <div className="flex items-center justify-between mb-6">
                    <h2
                        className="text-[1.2rem] font-black text-[#e8f2f8]"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {mode === 'create' ? 'New Project' : 'Edit Project'}
                    </h2>
                    <button
                        onClick={onCloseAction}
                        className="p-1.5 rounded-lg text-[#8dadc2] hover:text-[#e8f2f8] hover:bg-[rgba(255,255,255,0.07)] transition-colors duration-150"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    {/* Name */}
                    <div>
                        <label className="block text-[0.73rem] font-semibold uppercase tracking-wider text-[#8dadc2] mb-2">
                            Name <span className="text-[#e8613a]">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                            placeholder="e.g. Great Barrier Reef Survey"
                            className={inputClass}
                        />
                        {nameError && (
                            <p className="mt-1.5 text-[0.75rem] text-[#e8613a]">{nameError}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[0.73rem] font-semibold uppercase tracking-wider text-[#8dadc2] mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional — describe the scope or goals of this project"
                            rows={3}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    <div>
                        <label className="block text-[0.73rem] font-semibold uppercase tracking-wider text-[#8dadc2] mb-2">
                            {mode === 'create' ? 'Project Type' : 'Status'}
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Status)}
                            className={`${inputClass} cursor-pointer`}
                        >
                            {statusOptions.map(s => (
                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                        </select>

                        {mode === 'edit' && (originalStatus === 'active' || originalStatus === 'test') && (
                            <p className="mt-2 text-[0.75rem] text-[#4a6880]">
                                Project type cannot be changed, frames are stored in a dedicated{' '}
                                <span className="text-[#8dadc2]">{originalStatus}</span> bucket.
                            </p>
                        )}
                    </div>

                    {showTestWarning && (
                        <div className="flex gap-3 px-4 py-3 rounded-xl bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)]">
                            <TriangleAlert size={16} className="text-[#eab308] shrink-0 mt-0.5" />
                            <p className="text-[0.8rem] text-[#fde68a] leading-relaxed">
                                <span className="font-semibold">Test projects are temporary.</span> All frames and
                                associated data will be automatically deleted after{' '}
                                <span className="font-semibold">{TEST_RETENTION_DAYS} days</span>. Use an Active
                                project to retain data permanently.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            className="flex-1 py-3 rounded-xl border border-[rgba(0,180,160,0.2)] text-[#8dadc2] text-[0.88rem] font-semibold hover:border-[rgba(0,180,160,0.4)] hover:text-[#e8f2f8] transition-all duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-br from-[#006d9e] to-[#00b4a0] text-white text-[0.88rem] font-bold transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Saving…
                                </>
                            ) : (
                                mode === 'create' ? 'Create Project' : 'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
