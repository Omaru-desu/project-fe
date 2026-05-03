"use client";

import { useFormStatus } from "react-dom";
import { useState, useActionState } from "react";
import { Fish, Mail, Lock, User, Check, Building2 } from "lucide-react";
import { login, register } from "./actions";

type Tab = "login" | "register";

export function LoginForm() {
    const [loginState, loginAction] = useActionState(login, undefined);
    const [registerState, registerAction] = useActionState(register, undefined);
    const [tab, setTab] = useState<Tab>("login");

    return (
        <div className="flex w-full" style={{ minHeight: "100vh", background: "var(--bg)" }}>
            {/* LEFT — navy auth panel */}
            <aside
                className="flex flex-col items-center justify-center flex-shrink-0"
                style={{
                    width: 440,
                    background: "var(--navy)",
                    padding: "60px 50px",
                }}
            >
                <div className="text-center" style={{ marginBottom: 36 }}>
                    <div
                        className="flex items-center justify-center mx-auto"
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: "var(--primary)",
                            marginBottom: 14,
                        }}
                    >
                        <Fish size={26} color="#fff" />
                    </div>
                    <div
                        className="text-white"
                        style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}
                    >
                        OMarine
                    </div>
                    <div
                        style={{
                            fontSize: 13,
                            marginTop: 3,
                            color: "rgba(255,255,255,0.4)",
                        }}
                    >
                        AI underwater annotation
                    </div>
                </div>

                {tab === "login" ? <LoginPanel /> : <RegisterPanel />}
            </aside>

            {/* RIGHT — light form panel */}
            <section className="flex-1 flex items-center justify-center" style={{ padding: 40 }}>
                <div className="w-full" style={{ maxWidth: 380 }}>
                    {/* Tab switcher */}
                    <div
                        className="flex"
                        style={{
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: 4,
                            marginBottom: 28,
                        }}
                    >
                        {(["login", "register"] as Tab[]).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className="flex-1 transition-all"
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: tab === t ? "var(--surface)" : "transparent",
                                    color: tab === t ? "var(--primary-dark)" : "var(--text3)",
                                    fontFamily: "inherit",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    boxShadow: tab === t ? "var(--shadow-sm)" : "none",
                                }}
                            >
                                {t === "login" ? "Sign In" : "Create Account"}
                            </button>
                        ))}
                    </div>

                    {tab === "login" && (
                        <>
                            <Heading
                                title="Welcome back"
                                subtitle="Sign in to your OMarine account"
                            />
                            <form action={loginAction} className="flex flex-col gap-3.5">
                                <Field
                                    label="Email"
                                    name="email"
                                    type="email"
                                    placeholder="you@institution.edu"
                                    icon={<Mail size={15} />}
                                    error={loginState?.errors?.email?.[0]}
                                />
                                <Field
                                    label="Password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    icon={<Lock size={15} />}
                                    error={loginState?.errors?.password?.[0]}
                                />
                                <SubmitButton label="Sign in" />
                            </form>
                            <p className="text-center" style={{ marginTop: 20, fontSize: 13, color: "var(--text3)" }}>
                                No account?{" "}
                                <button
                                    type="button"
                                    onClick={() => setTab("register")}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--primary)",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontFamily: "inherit",
                                    }}
                                >
                                    Create one
                                </button>
                            </p>
                        </>
                    )}

                    {tab === "register" && (
                        <>
                            <Heading title="Create account" subtitle="Join the OMarine community" />
                            <form action={registerAction} className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Field
                                        label="First name"
                                        name="firstName"
                                        type="text"
                                        placeholder="Jane"
                                        icon={<User size={15} />}
                                        error={registerState?.errors?.firstName?.[0]}
                                    />
                                    <Field
                                        label="Last name"
                                        name="lastName"
                                        type="text"
                                        placeholder="Lambert"
                                        error={registerState?.errors?.lastName?.[0]}
                                    />
                                </div>
                                <Field
                                    label="Email"
                                    name="email"
                                    type="email"
                                    placeholder="you@institution.edu"
                                    icon={<Mail size={15} />}
                                    error={registerState?.errors?.email?.[0]}
                                />
                                <Field
                                    label="Organisation"
                                    name="org"
                                    type="text"
                                    placeholder="FFT / CSIRO / University…"
                                    icon={<Building2 size={15} />}
                                    error={registerState?.errors?.org?.[0]}
                                />
                                <Field
                                    label="Password"
                                    name="password"
                                    type="password"
                                    placeholder="Min. 8 characters"
                                    icon={<Lock size={15} />}
                                    error={registerState?.errors?.password?.[0]}
                                />
                                <SubmitButton label="Create account" />
                            </form>
                            <p className="text-center" style={{ marginTop: 16, fontSize: 13, color: "var(--text3)" }}>
                                Have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => setTab("login")}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--primary)",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontFamily: "inherit",
                                    }}
                                >
                                    Sign in
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <h1
                style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--text1)",
                    letterSpacing: "-0.02em",
                    marginBottom: 4,
                }}
            >
                {title}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>{subtitle}</p>
        </div>
    );
}

function LoginPanel() {
    const items = [
        "AI-assisted species detection",
        "Semantic search across frames",
        "Active learning prioritisation",
        "Export to YOLO / COCO",
    ];
    return (
        <div
            style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "22px 24px",
                width: "100%",
                border: "1px solid rgba(255,255,255,0.1)",
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 12,
                }}
            >
                Why OMarine?
            </div>
            {items.map(t => (
                <div
                    key={t}
                    className="flex items-start gap-2"
                    style={{ marginBottom: 10 }}
                >
                    <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "rgba(127,163,232,0.25)",
                            marginTop: 1,
                        }}
                    >
                        <Check size={10} color="var(--primary-light)" />
                    </span>
                    <span
                        style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.65)",
                            lineHeight: 1.4,
                        }}
                    >
                        {t}
                    </span>
                </div>
            ))}
        </div>
    );
}

function RegisterPanel() {
    const stats: [string, string][] = [
        ["48", "Researchers"],
        ["320K", "Frames"],
        ["94%", "Accuracy"],
    ];
    return (
        <div
            className="text-center"
            style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "22px 24px",
                width: "100%",
                border: "1px solid rgba(255,255,255,0.1)",
            }}
        >
            <div className="text-white" style={{ fontSize: 32, fontWeight: 800 }}>
                10,000+
            </div>
            <div
                style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    marginTop: 2,
                    marginBottom: 16,
                }}
            >
                detections this month
            </div>
            <div className="flex justify-around">
                {stats.map(([v, l]) => (
                    <div key={l}>
                        <div className="text-white" style={{ fontSize: 18, fontWeight: 700 }}>
                            {v}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{l}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Field({
    label,
    name,
    type,
    placeholder,
    icon,
    error,
}: {
    label: string;
    name: string;
    type: string;
    placeholder: string;
    icon?: React.ReactNode;
    error?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={name}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}
            >
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <span
                        className="absolute pointer-events-none"
                        style={{
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text3)",
                        }}
                    >
                        {icon}
                    </span>
                )}
                <input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    className="w-full"
                    style={{
                        padding: icon ? "10px 12px 10px 38px" : "10px 12px",
                        borderRadius: 9,
                        border: "1.5px solid var(--border)",
                        fontFamily: "inherit",
                        fontSize: 14,
                        color: "var(--text1)",
                        background: "var(--surface)",
                        outline: "none",
                        transition: "border-color 0.15s",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
            </div>
            {error && (
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--danger)",
                        background: "#fff0f0",
                        border: "1px solid #ffd0d0",
                        borderRadius: 7,
                        padding: "6px 10px",
                    }}
                >
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
                padding: 11,
                borderRadius: 9,
                border: "none",
                background: pending ? "var(--primary-light)" : "var(--primary)",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 700,
                cursor: pending ? "wait" : "pointer",
                marginTop: 4,
                transition: "background 0.15s",
            }}
        >
            {pending ? "Loading…" : label}
        </button>
    );
}
