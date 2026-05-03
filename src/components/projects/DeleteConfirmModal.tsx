"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Project } from "../../types/project";

interface DeleteConfirmModalProps {
    project: Project;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}

export default function DeleteConfirmModal({
    project,
    onCloseAction,
    onConfirmAction,
}: DeleteConfirmModalProps) {
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
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                background: "rgba(20,30,60,0.5)",
                backdropFilter: "blur(4px)",
            }}
            onClick={e => {
                if (e.target === e.currentTarget) onCloseAction();
            }}
        >
            <div
                className="text-center"
                style={{
                    background: "var(--surface)",
                    borderRadius: 18,
                    padding: 30,
                    width: 380,
                    maxWidth: "calc(100vw - 32px)",
                    boxShadow: "0 20px 60px rgba(20,30,60,0.2)",
                    border: "1px solid var(--border)",
                }}
            >
                <div
                    className="flex items-center justify-center"
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "#fff0f0",
                        border: "2px solid #ffd0d0",
                        margin: "0 auto 14px",
                    }}
                >
                    <Trash2 size={20} color="var(--danger)" />
                </div>
                <div
                    style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--text1)",
                        marginBottom: 6,
                    }}
                >
                    Delete project?
                </div>
                <div
                    style={{
                        fontSize: 13,
                        color: "var(--text3)",
                        marginBottom: 22,
                        lineHeight: 1.6,
                    }}
                >
                    <strong style={{ color: "var(--text1)" }}>{project.name}</strong> and
                    all annotations will be permanently deleted.
                </div>
                <div className="flex justify-center" style={{ gap: 8 }}>
                    <button
                        onClick={onCloseAction}
                        disabled={isDeleting}
                        style={{
                            padding: "9px 20px",
                            borderRadius: 8,
                            border: "1.5px solid var(--border)",
                            background: "var(--surface)",
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            color: "var(--text2)",
                            fontWeight: 500,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        style={{
                            padding: "9px 20px",
                            borderRadius: 8,
                            border: "none",
                            background: "var(--danger)",
                            color: "#fff",
                            fontSize: 13,
                            cursor: isDeleting ? "wait" : "pointer",
                            fontFamily: "inherit",
                            fontWeight: 700,
                            opacity: isDeleting ? 0.7 : 1,
                        }}
                    >
                        {isDeleting ? "Deleting…" : "Delete permanently"}
                    </button>
                </div>
            </div>
        </div>
    );
}
