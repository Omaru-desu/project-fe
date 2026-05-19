"use client";

import { useState } from "react";

interface Props {
    onClose: () => void;
    onRun: (prompt: string) => void;
    reevaluating: boolean;
    reevalResult: string | null;
}

export default function Sam3Modal({ onClose, onRun, reevaluating, reevalResult }: Props) {
    const [prompt, setPrompt] = useState("");

    return (
        <div
            style={{
                position: "absolute",
                bottom: 70,
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minWidth: 260,
                zIndex: 10,
                boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            }}
        >
            <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
            }}>
                Re-evaluate with SAM3
            </div>
            <input
                autoFocus
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter" && prompt.trim()) {
                        onRun(prompt.trim());
                    }
                    if (e.key === "Escape") onClose();
                }}
                placeholder="e.g. corals, sharks"
                style={{
                    border: "1.5px solid var(--border)",
                    borderRadius: 7,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    color: "var(--text1)",
                    background: "var(--surface2)",
                }}
            />
            {reevalResult && (
                <div style={{
                    fontSize: 11,
                    color: "#0F6E56",
                    background: "#E1F5EE",
                    border: "1px solid #5DCAA5",
                    borderRadius: 6,
                    padding: "5px 8px",
                    fontWeight: 500,
                }}>
                    {reevalResult}
                </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
                <button
                    onClick={onClose}
                    style={{
                        flex: 1,
                        padding: "7px",
                        borderRadius: 7,
                        border: "1.5px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text2)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                    }}
                >
                    Close
                </button>
                <button
                    onClick={() => { if (prompt.trim()) onRun(prompt.trim()); }}
                    disabled={reevaluating || !prompt.trim()}
                    style={{
                        flex: 1,
                        padding: "7px",
                        borderRadius: 7,
                        border: "none",
                        background: prompt.trim() && !reevaluating ? "#6366f1" : "var(--border)",
                        color: prompt.trim() && !reevaluating ? "#fff" : "var(--text3)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: reevaluating || !prompt.trim() ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                        transition: "background 0.15s",
                    }}
                >
                    {reevaluating ? "Running…" : "Run SAM3"}
                </button>
            </div>
        </div>
    );
}