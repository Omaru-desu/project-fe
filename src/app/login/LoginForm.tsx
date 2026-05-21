"use client";

import { useFormStatus } from "react-dom";
import { useState, useActionState } from "react";
import { Mail, Lock, User, Building2 } from "lucide-react";
import { login, register } from "./actions";
import { useTransition } from "react";

type Tab = "login" | "register";

export function LoginForm() {
    const [loginState, loginAction] = useActionState(login, undefined);
    const [registerState, registerAction] = useActionState(register, undefined);
    const [tab, setTab] = useState<Tab>("login");
    const [showConsent, setShowConsent] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
    const [, startTransition] = useTransition();

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
            {/* ── LEFT PANEL ── */}
            <section style={{
                position: "relative",
                background: "radial-gradient(120% 80% at 85% 0%, rgba(120,160,220,0.18) 0%, transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(60,90,180,0.30) 0%, transparent 60%), linear-gradient(160deg, #2f3e7e 0%, #283567 100%)",
                color: "#fff",
                overflow: "hidden",
                padding: "44px 56px 32px",
                display: "flex",
                flexDirection: "column",
            }}>
                {/* Subtle grid overlay */}
                <div aria-hidden style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                    maskImage: "radial-gradient(120% 90% at 50% 30%, #000 30%, transparent 90%)",
                    pointerEvents: "none",
                }} />

                <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", maxWidth: 540, width: "100%", margin: "0 auto" }}>
                    {/* Brand text */}
                    <div style={{ marginBottom: 80 }}>
                        <div style={{ fontFamily: "var(--font-source-serif, serif)", fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: 4 }}>
                            OMarine
                        </div>
                        <div style={{ fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>
                            AI underwater annotation
                        </div>
                    </div>

                    {/* Eyebrow chip */}
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
                        height: 26, padding: "0 12px", borderRadius: 999,
                        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)",
                        color: "#cfd6ff",
                        fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10.5, fontWeight: 500,
                        letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 22,
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#aab6ff", flexShrink: 0 }} />
                        AI-powered research tool
                    </span>

                    {/* Headline */}
                    <h1 style={{
                        fontFamily: "var(--font-source-serif, serif)",
                        fontSize: 50, lineHeight: 1.05, fontWeight: 600,
                        color: "#fff", letterSpacing: "-0.02em", margin: "0 0 20px",
                    }}>
                        Annotate the{" "}
                        <em style={{ fontStyle: "italic", fontWeight: 500 }}>ocean</em>
                        {" "}at the speed of research.
                    </h1>

                    {/* Lede */}
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", maxWidth: 440, margin: "0 0 36px" }}>
                        OMarine accelerates underwater video review with AI-assisted species
                        detection, semantic search, and frame-by-frame annotation,
                        purpose-built for marine science teams.
                    </p>

                    {/* Stat cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
                        <StatCard icon="lavender" title="AI-assisted species detection" sub="Foundation vision models pre-label every frame">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                                <circle cx="9" cy="9" r="2" fill="currentColor" />
                            </svg>
                        </StatCard>
                        <StatCard icon="cyan" title="Semantic search across frames" sub="Find any species, behavior, or habitat in seconds">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.6" />
                                <path d="M11.5 11.5 L 15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                        </StatCard>
                        <StatCard icon="amber" title="Frame-by-frame annotation" sub="Review, correct, and approve detections on every frame">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M9 2 L 11 8 H 16 L 12 11.5 L 13.5 17 L 9 13.5 L 4.5 17 L 6 11.5 L 2 8 H 7 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
                            </svg>
                        </StatCard>
                    </div>

                </div>
            </section>

            {/* ── RIGHT PANEL ── */}
            <section style={{ background: "#f3f4fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                <div style={{ width: "100%", maxWidth: 380 }}>
                    {/* Tab switcher */}
                    <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4,
                        padding: 4, background: "#e9ecf6", borderRadius: 10, marginBottom: 24,
                    }}>
                        {(["login", "register"] as Tab[]).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                style={{
                                    height: 36, border: 0, borderRadius: 7, cursor: "pointer",
                                    fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                    background: tab === t ? "#fff" : "transparent",
                                    color: tab === t ? "#4f63d2" : "#5b6280",
                                    boxShadow: tab === t ? "0 1px 2px rgba(20,30,80,0.06)" : "none",
                                    transition: "all 120ms ease",
                                }}
                            >
                                {t === "login" ? "Sign in" : "Create Account"}
                            </button>
                        ))}
                    </div>

                    {tab === "login" && (
                        <>
                            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.015em", color: "#1f2547", margin: "0 0 6px" }}>Welcome back</h2>
                            <p style={{ fontSize: 13.5, color: "#8a90ad", margin: "0 0 24px" }}>Sign in to your OMarine account</p>
                            <form action={loginAction} style={{ display: "flex", flexDirection: "column" }}>
                                <Field label="Email" name="email" type="email" placeholder="you@institution.edu" icon={<Mail size={15} />} error={loginState?.errors?.email?.[0]} />
                                <Field label="Password" name="password" type="password" placeholder="••••••••" icon={<Lock size={15} />} error={loginState?.errors?.password?.[0]} />
                                <SubmitButton label="Sign in" />
                            </form>
                            <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#8a90ad" }}>
                                No account?{" "}
                                <button type="button" onClick={() => setTab("register")} style={{ background: "none", border: "none", color: "#4f63d2", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                                    Create one
                                </button>
                            </p>
                        </>
                    )}

                    {tab === "register" && (
                        <>
                            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.015em", color: "#1f2547", margin: "0 0 6px" }}>Create account</h2>
                            <p style={{ fontSize: 13.5, color: "#8a90ad", margin: "0 0 24px" }}>Join the OMarine community</p>
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);

                                    // Basic validation before showing consent
                                    const firstName = formData.get("firstName") as string;
                                    const lastName = formData.get("lastName") as string;
                                    const email = formData.get("email") as string;
                                    const password = formData.get("password") as string;

                                    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password?.trim()) {
                                        // Let server action handle the validation errors normally
                                        startTransition(() => registerAction(formData));
                                        return;
                                    }

                                    if (password.length < 8) {
                                        startTransition(() => registerAction(formData));
                                        return;
                                    }

                                    setPendingFormData(formData);
                                    setShowConsent(true);
                                }}
                                style={{ display: "flex", flexDirection: "column" }}
                            >
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <Field label="First name" name="firstName" type="text" placeholder="Jane" icon={<User size={15} />} error={registerState?.errors?.firstName?.[0]} />
                                    <Field label="Last name" name="lastName" type="text" placeholder="Lambert" error={registerState?.errors?.lastName?.[0]} />
                                </div>
                                <Field label="Email" name="email" type="email" placeholder="you@institution.edu" icon={<Mail size={15} />} error={registerState?.errors?.email?.[0]} />
                                <Field label="Organisation" name="org" type="text" placeholder="FFT / CSIRO / University…" icon={<Building2 size={15} />} error={registerState?.errors?.org?.[0]} />
                                <Field label="Password" name="password" type="password" placeholder="Min. 8 characters" icon={<Lock size={15} />} error={registerState?.errors?.password?.[0]} />
                                <SubmitButton label="Create account" />
                            </form>
                            <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#8a90ad" }}>
                                Have an account?{" "}
                                <button type="button" onClick={() => setTab("login")} style={{ background: "none", border: "none", color: "#4f63d2", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                                    Sign in
                                </button>
                            </p>
                        </>
                    )}

                    {showConsent && pendingFormData && (
                        <ConsentModal
                            onClose={() => setShowConsent(false)}
                            onAgree={() => {
                                setShowConsent(false);
                                startTransition(() => {
                                    registerAction(pendingFormData!);
                                });
                            }}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}

function StatCard({ icon, title, sub, children }: { icon: "lavender" | "cyan" | "amber"; title: string; sub: string; children: React.ReactNode }) {
    const iconStyles: Record<string, React.CSSProperties> = {
        lavender: { background: "rgba(122,139,224,0.22)", border: "1px solid rgba(122,139,224,0.45)", color: "#c8d0ff" },
        cyan:     { background: "rgba(120,200,220,0.18)", border: "1px solid rgba(120,200,220,0.40)", color: "#b6e1ee" },
        amber:    { background: "rgba(220,170,90,0.18)",  border: "1px solid rgba(220,170,90,0.40)",  color: "#f1c98a" },
    };
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(4px)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, display: "grid", placeItems: "center", flexShrink: 0, ...iconStyles[icon] }}>
                {children}
            </div>
            <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: "0 0 2px", lineHeight: 1.2 }}>{title}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.35 }}>{sub}</p>
            </div>
        </div>
    );
}

function Field({ label, name, type, placeholder, icon, error }: {
    label: string; name: string; type: string; placeholder: string;
    icon?: React.ReactNode; error?: string;
}) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label htmlFor={name} style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1f2547", marginBottom: 8 }}>
                {label}
            </label>
            <div style={{ position: "relative" }}>
                {icon && (
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a90ad", pointerEvents: "none", display: "flex" }}>
                        {icon}
                    </span>
                )}
                <input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    style={{
                        width: "100%", height: 44,
                        padding: icon ? "0 14px 0 40px" : "0 14px",
                        fontFamily: "inherit", fontSize: 14, color: "#1f2547",
                        background: "#eef0fa", border: "1px solid transparent",
                        borderRadius: 9, outline: "none",
                        transition: "border-color 120ms ease, box-shadow 120ms ease, background 120ms ease",
                    }}
                    onFocus={e => {
                        e.currentTarget.style.borderColor = "#7a8be0";
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(122,139,224,0.18)";
                    }}
                    onBlur={e => {
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.background = "#eef0fa";
                        e.currentTarget.style.boxShadow = "none";
                    }}
                />
            </div>
            {error && (
                <div style={{ fontSize: 12, color: "#f07070", background: "#fff0f0", border: "1px solid #ffd0d0", borderRadius: 7, padding: "6px 10px", marginTop: 6 }}>
                    {error}
                </div>
            )}
        </div>
    );
}

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            style={{
                width: "100%", height: 46, border: 0, borderRadius: 10,
                background: pending ? "#7a8be0" : "#4f63d2",
                color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                cursor: pending ? "wait" : "pointer",
                boxShadow: "0 1px 2px rgba(20,30,80,0.10), 0 8px 22px rgba(79,99,210,0.28)",
                transition: "filter 120ms ease, transform 80ms ease",
                marginTop: 4,
            }}
            onMouseEnter={e => { if (!pending) e.currentTarget.style.filter = "brightness(1.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
        >
            {pending ? "Loading…" : label}
        </button>
    );
}

function ConsentModal({ onClose, onAgree }: { onClose: () => void; onAgree: () => void }) {
    const [checked, setChecked] = useState(false);

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(20,30,60,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        }}>
            <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: 32,
                width: "100%",
                maxWidth: 460,
                boxShadow: "0 20px 60px rgba(20,30,80,0.18)",
            }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1f2547", marginBottom: 8 }}>
                    Data & Privacy Consent
                </div>
                <div style={{ fontSize: 13, color: "#5b6280", lineHeight: 1.65, marginBottom: 20 }}>
                    Before creating your account, please read and acknowledge the following:
                </div>

                <div style={{
                    background: "#f3f4fa",
                    borderRadius: 10,
                    padding: "14px 16px",
                    marginBottom: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontSize: 13,
                    color: "#3a4060",
                    lineHeight: 1.6,
                }}>
                    <div style={{ display: "flex", gap: 10 }}>
                        <span style={{ marginTop: 2, flexShrink: 0, color: "#4f63d2" }}></span>
                        <span><strong>Data storage:</strong> Underwater imagery and annotation data you upload will be stored securely with encryption.</span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <span style={{ marginTop: 2, flexShrink: 0, color: "#4f63d2" }}></span>
                        <span><strong>Personal information:</strong> Only your email, display name, and organisation are stored. This information is not shared with third parties and is used solely for authentication and account management.</span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <span style={{ marginTop: 2, flexShrink: 0, color: "#4f63d2" }}></span>
                        <span><strong>Model training:</strong> Annotations you approve may be used to retrain detection models within your project. Data is not shared across projects or organisations.</span>
                    </div>
                </div>

                <label style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    marginBottom: 24,
                    fontSize: 13,
                    color: "#3a4060",
                    lineHeight: 1.5,
                }}>
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => setChecked(e.target.checked)}
                        style={{ marginTop: 2, accentColor: "#4f63d2", width: 15, height: 15, flexShrink: 0, cursor: "pointer" }}
                    />
                    I have read and agree to the data collection and privacy terms described above.
                </label>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            height: 42,
                            border: "1.5px solid #e0e3f0",
                            borderRadius: 9,
                            background: "#fff",
                            color: "#5b6280",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onAgree}
                        disabled={!checked}
                        style={{
                            flex: 1,
                            height: 42,
                            border: 0,
                            borderRadius: 9,
                            background: checked ? "#4f63d2" : "#c8ccee",
                            color: "#fff",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: checked ? "pointer" : "not-allowed",
                            transition: "background 0.15s",
                        }}
                    >
                        I Agree — Create Account
                    </button>
                </div>
            </div>
        </div>
    );
}