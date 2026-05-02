"use client";

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Project } from '../../types/project';

interface DeleteConfirmModalProps {
    project: Project;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}

export default function DeleteConfirmModal({ project, onCloseAction, onConfirmAction }: DeleteConfirmModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirmAction();
            onCloseAction();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) onCloseAction(); }}
        >
            <div className="bg-bg-surface border border-border-default rounded-[10px] p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-[6px] bg-coral/10">
                            <AlertTriangle size={15} className="text-coral" />
                        </div>
                        <h2 className="text-[15px] font-semibold text-text-primary">
                            Delete project
                        </h2>
                    </div>
                    <button
                        onClick={onCloseAction}
                        className="p-1.5 rounded-[6px] text-text-muted hover:text-text-secondary hover:bg-border-default transition-colors duration-150"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="text-[13px] text-text-muted leading-relaxed mb-5">
                    This will permanently delete{' '}
                    <span className="font-semibold text-text-secondary">{project.name}</span>{' '}
                    and all associated data. This action cannot be undone.
                </p>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onCloseAction}
                        className="flex-1 py-2 rounded-lg border border-border-default text-text-muted text-[13px] font-medium hover:border-border-hover hover:text-text-secondary transition-all duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-2 rounded-lg bg-coral hover:bg-coral/80 text-white text-[13px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Deleting…
                            </>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
