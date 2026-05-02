"use client";

import { useState, useEffect } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import { Project, ProjectType, CreateProjectInput, UpdateProjectInput } from '../../types/project';

interface ProjectModalProps {
    mode: 'create' | 'edit';
    project?: Project;
    onCloseAction: () => void;
    onSubmitAction: (data: CreateProjectInput | UpdateProjectInput) => Promise<void>;
}

const TEST_RETENTION_DAYS = 90;

export default function ProjectModal({ mode, project, onCloseAction, onSubmitAction }: ProjectModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ProjectType>('active');
    const [nameError, setNameError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && project) {
            setName(project.name);
            setDescription(project.description);
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
            if (mode === 'create') {
                await onSubmitAction({ name: name.trim(), description: description.trim(), type });
            } else {
                await onSubmitAction({ name: name.trim(), description: description.trim() });
            }
            onCloseAction();
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass =
        'w-full bg-bg-primary border border-border-default text-text-secondary placeholder-text-muted rounded-lg px-4 py-2.5 text-[13px] outline-none transition-all duration-150 focus:border-accent-blue';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) onCloseAction(); }}
        >
            <div className="bg-bg-surface border border-border-default rounded-[10px] p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[15px] font-semibold text-text-primary">
                        {mode === 'create' ? 'New project' : 'Edit project'}
                    </h2>
                    <button
                        onClick={onCloseAction}
                        className="p-1.5 rounded-[6px] text-text-muted hover:text-text-secondary hover:bg-border-default transition-colors duration-150"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                            Name <span className="text-coral">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                            placeholder="e.g. Great Barrier Reef Survey"
                            className={inputClass}
                        />
                        {nameError && (
                            <p className="mt-1.5 text-[12px] text-coral">{nameError}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-1.5 uppercase tracking-wider">
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

                    {mode === 'create' && (
                        <div>
                            <label className="block text-[11px] font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                                Project Type
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as ProjectType)}
                                className={`${inputClass} cursor-pointer`}
                            >
                                <option value="active">Active</option>
                                <option value="test">Test</option>
                            </select>

                            {type === 'test' && (
                                <div className="flex gap-3 mt-3 px-3 py-2.5 rounded-[6px] bg-yellow-500/[0.08] border border-yellow-500/25">
                                    <TriangleAlert size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                                    <p className="text-[12px] text-yellow-200 leading-relaxed">
                                        <span className="font-semibold">Test projects are temporary.</span> All data will be deleted after{' '}
                                        <span className="font-semibold">{TEST_RETENTION_DAYS} days</span>.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            className="flex-1 py-2 rounded-lg border border-border-default text-text-muted text-[13px] font-medium hover:border-border-hover hover:text-text-secondary transition-all duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-white text-[13px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Saving…
                                </>
                            ) : (
                                mode === 'create' ? 'Create project' : 'Save changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
