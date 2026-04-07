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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onCloseAction(); }}
        >
            <div className="bg-[#0d1f2d] border border-[rgba(232,97,58,0.2)] rounded-2xl p-8 w-full max-w-md shadow-[0_8px_48px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[rgba(232,97,58,0.12)]">
                            <AlertTriangle size={18} className="text-[#e8613a]" />
                        </div>
                        <h2
                            className="text-[1.1rem] font-black text-[#e8613a]"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            Delete Project
                        </h2>
                    </div>
                    <button
                        onClick={onCloseAction}
                        className="p-1.5 rounded-lg text-[#8dadc2] hover:text-[#e8f2f8] hover:bg-[rgba(255,255,255,0.07)] transition-colors duration-150"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="text-[0.88rem] text-[#8dadc2] leading-relaxed mb-6">
                    This will permanently delete{' '}
                    <span className="font-semibold text-[#e8f2f8]">{project.name}</span>{' '}
                    and all associated data. This action cannot be undone.
                </p>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onCloseAction}
                        className="flex-1 py-3 rounded-xl border border-[rgba(0,180,160,0.2)] text-[#8dadc2] text-[0.88rem] font-semibold hover:border-[rgba(0,180,160,0.4)] hover:text-[#e8f2f8] transition-all duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-3 rounded-xl bg-[#e8613a] text-white text-[0.88rem] font-bold hover:bg-[#d44f29] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
