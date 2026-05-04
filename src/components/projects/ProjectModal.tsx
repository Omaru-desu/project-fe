"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
    Project,
    ProjectType,
    CreateProjectInput,
    UpdateProjectInput,
} from "../../types/project";

interface ProjectModalProps {
    mode: "create" | "edit";
    project?: Project;
    onCloseAction: () => void;
    onSubmitAction: (data: CreateProjectInput | UpdateProjectInput) => Promise<void>;
}

const TYPE_OPTIONS: {
    value: ProjectType;
    label: string;
    sub: string;
    dot: string;
}[] = [
    { value: "test", label: "Test", sub: "Explore & experiment", dot: "var(--warning)" },
    { value: "active", label: "Active", sub: "Production annotation", dot: "var(--success)" },
];

export default function ProjectModal({
    mode,
    project,
    onCloseAction,
    onSubmitAction,
}: ProjectModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<ProjectType>("test");
    const [nameError, setNameError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (mode === "edit" && project) {
            setName(project.name);
            setDescription(project.description);
            setType(project.type);
        }
    }, [mode, project]);

    const validate = (): boolean => {
        if (!name.trim()) {
            setNameError("Name is required.");
            return false;
        }
        if (name.trim().length < 3) {
            setNameError("Name must be at least 3 characters.");
            return false;
        }
        setNameError("");
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                description: description.trim(),
                type,
            };
            await onSubmitAction(payload);
            onCloseAction();
        } finally {
            setIsSubmitting(false);
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
                style={{
                    background: "var(--surface)",
                    borderRadius: 18,
                    padding: 30,
                    width: 460,
                    maxWidth: "calc(100vw - 32px)",
                    boxShadow: "0 20px 60px rgba(20,30,60,0.2)",
                    border: "1px solid var(--border)",
                }}
            >
                <div
                    className="flex items-center justify-between"
                    style={{ marginBottom: 22 }}
                >
                    <h2
                        style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: "var(--text1)",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {mode === "create" ? "New Project" : "Edit Project"}
                    </h2>
                    <button
                        onClick={onCloseAction}
                        aria-label="Close"
                        className="flex items-center justify-center"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            border: "1.5px solid var(--border)",
                            background: "var(--surface)",
                            cursor: "pointer",
                        }}
                    >
                        <X size={14} color="var(--text3)" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col" style={{ gap: 14 }}>
                    {/* Name */}
                    <div className="flex flex-col" style={{ gap: 5 }}>
                        <label
                            style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}
                        >
                            Project name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => {
                                setName(e.target.value);
                                if (nameError) setNameError("");
                            }}
                            placeholder="e.g. GBR Coral Survey 2026"
                            style={{
                                padding: "10px 12px",
                                borderRadius: 9,
                                border: "1.5px solid var(--border)",
                                fontFamily: "inherit",
                                fontSize: 14,
                                color: "var(--text1)",
                                background: "var(--surface)",
                                outline: "none",
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = "var(--primary)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                        />
                        {nameError && (
                            <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>
                                {nameError}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col" style={{ gap: 5 }}>
                        <label
                            style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}
                        >
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Scope, location, objectives…"
                            rows={3}
                            style={{
                                padding: "9px 11px",
                                borderRadius: 8,
                                border: "1.5px solid var(--border)",
                                fontFamily: "inherit",
                                fontSize: 13,
                                color: "var(--text1)",
                                background: "var(--surface)",
                                outline: "none",
                                resize: "vertical",
                                lineHeight: 1.5,
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = "var(--primary)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                        />
                    </div>

                    {/* Status / type */}
                    <div className="flex flex-col" style={{ gap: 5 }}>
                        <label
                            style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}
                        >
                            Type
                        </label>
                        {mode === "edit" ? (
                            <>
                                {(() => {
                                    const opt = TYPE_OPTIONS.find(o => o.value === type)!;
                                    return (
                                        <div
                                            style={{
                                                padding: "11px 13px",
                                                borderRadius: 9,
                                                border: "2px solid var(--border)",
                                                background: "var(--surface2)",
                                            }}
                                        >
                                            <div className="flex items-center" style={{ gap: 7, marginBottom: 2 }}>
                                                <span
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: "50%",
                                                        background: opt.dot,
                                                    }}
                                                />
                                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)" }}>
                                                    {opt.label}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text3)", paddingLeft: 15 }}>
                                                {opt.sub}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                                    Project type cannot be changed after creation.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex" style={{ gap: 10 }}>
                                    {TYPE_OPTIONS.map(opt => {
                                        const active = type === opt.value;
                                        return (
                                            <div
                                                key={opt.value}
                                                onClick={() => setType(opt.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: "11px 13px",
                                                    borderRadius: 9,
                                                    border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                                    background: active ? "var(--primary-pale)" : "var(--surface2)",
                                                    cursor: "pointer",
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                <div
                                                    className="flex items-center"
                                                    style={{ gap: 7, marginBottom: 2 }}
                                                >
                                                    <span
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: "50%",
                                                            background: opt.dot,
                                                        }}
                                                    />
                                                    <span
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: active ? "var(--primary-dark)" : "var(--text1)",
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "var(--text3)",
                                                        paddingLeft: 15,
                                                    }}
                                                >
                                                    {opt.sub}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {type === "test" && (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            padding: "9px 12px",
                                            borderRadius: 8,
                                            background: "var(--warning-pale, #fff8e1)",
                                            border: "1.5px solid var(--warning, #f59e0b)",
                                            fontSize: 12,
                                            color: "var(--warning-dark, #92400e)",
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        Test project data and frames are automatically deleted after <strong>90 days</strong>.
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div
                        className="flex justify-end"
                        style={{ gap: 8, marginTop: 10 }}
                    >
                        <button
                            type="button"
                            onClick={onCloseAction}
                            style={{
                                padding: "9px 18px",
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
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: "9px 22px",
                                borderRadius: 8,
                                border: "none",
                                background: isSubmitting ? "var(--primary-light)" : "var(--primary)",
                                color: "#fff",
                                fontSize: 13,
                                cursor: isSubmitting ? "wait" : "pointer",
                                fontFamily: "inherit",
                                fontWeight: 700,
                            }}
                        >
                            {isSubmitting
                                ? "Saving…"
                                : mode === "create"
                                    ? "Create project"
                                    : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
