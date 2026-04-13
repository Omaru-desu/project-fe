"use client";

import { useFormStatus } from "react-dom";
import { login, register } from "./actions";
import { useState, useActionState } from "react";
import styles from "./LoginForm.module.css";

export function LoginForm() {
    const [formState, loginAction] = useActionState(login, undefined);
    const [registerState, registerAction] = useActionState(register, undefined);
    const [tab, setTab] = useState<"login" | "register">("login");

    return (
        <div className={styles.wrapper}>

            {/* LEFT PANEL */}
            <div className={styles.leftPanel}>
                {/* gradient background */}
                <div className={styles.gradientBg} />
                {/* grid background */}
                <div className={styles.gridOverlay} />

                {/* Ripples */}
                {[
                    { w: 300, b: -80, l: -60 },
                    { w: 200, b: 40, l: 80 },
                    { w: 150, b: 120, l: 160 },
                ].map((r, i) => (
                    <div key={i} className={styles.ripple} style={{
                        width: r.w, height: r.w, bottom: r.b, left: r.l
                    }} />
                ))}



                {/* Left content */}
                <div className={styles.leftContent}>
                    <div className={styles.logo}>
                        <div className={styles.logoMark}>🌊</div>
                        <div>
                            <div className={styles.logoName}>Omaru</div>
                            <div className={styles.logoSub}>Marine Annotation Platform</div>
                        </div>
                    </div>

                    {/* Mid */}
                    <div className={styles.leftMid}>
                        <div className={styles.lilbadge}>
                            <div className={styles.lilbadgeDot} />
                            <span className={styles.lilbadgeText}>AI-Powered Research Tool</span>
                        </div>
                        <h1 className={styles.headline}>
                            Accelerate the <em className={styles.headlineEm}>annotation</em> of our oceans
                        </h1>
                        <p className={styles.leftBody}>
                            FFT&apos;s towed imaging device captures 50km of transect data per day. Omaru uses foundation vision models to close the annotation gap.
                        </p>
                        <div className={styles.statCards}>
                            {[
                                { icon: "🌊", bg: "rgba(0,180,160,0.2)", bd: "rgba(0,180,160,0.3)", num: "300K+", lbl: "Hours of footage collected globally" },
                                { icon: "⚡", bg: "rgba(230,168,23,0.2)", bd: "rgba(230,168,23,0.3)", num: "<15%", lbl: "Currently annotated — closing the gap" },
                                { icon: "🎯", bg: "rgba(0,144,204,0.2)", bd: "rgba(0,144,204,0.3)", num: "96%", lbl: "Avg. AI detection accuracy" },
                            ].map((c) => (
                                <div key={c.num} className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ background: c.bg, border: `1px solid ${c.bd}` }}>{c.icon}</div>
                                    <div>
                                        <div className={styles.statNum}>{c.num}</div>
                                        <div className={styles.statLbl}>{c.lbl}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.leftFooter}>© 2026 Omaru</div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className={styles.rightPanel}>

                <div className={styles.formInner}>

                    <div className={styles.formLilbadge}>Marine Annotation Platform</div>
                    <h2 className={styles.formTitle}>
                        {tab === "login" ? <>Welcome<br />back</> : <>Join the<br />network</>}
                    </h2>

                    {/* Tab switcher */}
                    <div className={styles.tabSwitcher}>
                        {(["login", "register"] as const).map((t) => (
                            <button
                                key={t} type="button" onClick={() => setTab(t)}
                                className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ""}`}
                            >
                                {t === "login" ? "Sign In" : "Create Account"}
                            </button>
                        ))}
                    </div>

                    {/* Login */}
                    {tab === "login" && (
                        <form action={loginAction}>
                            <FormField label="Email Address" id="email" name="email" type="email" placeholder="researcher@fft.org" />
                            {formState?.errors?.email && (
                                <p className={styles.errorText}>{formState.errors.email}</p>
                            )}
                            <FormField label="Password" id="password" name="password" type="password" placeholder="••••••••" />
                            {formState?.errors?.password && (
                                <p className={styles.errorText}>{formState.errors.password}</p>
                            )}
                            <LoginSubmitButton label="Sign In →" />

                        </form>
                    )}

                    {/* Register */}
                    {tab === "register" && (
                        <form action={registerAction}>
                            <div className={styles.fieldRow}>
                                <FormField label="First Name" id="firstName" name="firstName" type="text" placeholder="Harry" />
                                <FormField label="Last Name" id="lastName" name="lastName" type="text" placeholder="Styles" />
                            </div>
                            <FormField label="Institutional Email" id="regEmail" name="email" type="email" placeholder="researcher@fft.org" />
                            <FormField label="Organisation" id="org" name="org" type="text" placeholder="FFT / CSIRO / University…" />
                            <FormField label="Password" id="regPassword" name="password" type="password" placeholder="Min. 8 characters" />

                            {registerState?.errors?.email && (
                                <p className={styles.errorText}>{registerState.errors.email}</p>
                            )}
                            {registerState?.errors?.password && (
                                <p className={styles.errorText}>{registerState.errors.password}</p>
                            )}

                            <LoginSubmitButton label="Create Account →" />
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function FormField({ label, id, name, type, placeholder }: {
    label: string; id: string; name: string; type: string; placeholder: string;
}) {
    return (
        <div className={styles.field}>
            <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
            <input id={id} name={name} type={type} placeholder={placeholder} className={styles.fieldInput} />
        </div>
    );
}

function LoginSubmitButton( { label }: { label: string }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className={styles.submitBtn}>
            {pending ? "Loading…" : label}
        </button>
    );
}

