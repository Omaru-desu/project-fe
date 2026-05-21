"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Fish, LogOut, ChevronDown } from "lucide-react";
import { logout } from "../app/login/actions";
import { createBrowserSupabaseClient } from "../lib/supabase/client";

const HIDDEN_PREFIXES = ["/login", "/projects/"];
const HIDDEN_EXACT = ["/"];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        createBrowserSupabaseClient()
            .auth.getUser()
            .then(({ data }) => {
                const meta = data.user?.user_metadata;
                if (meta?.first_name) {
                    setDisplayName(`${meta.first_name} ${meta.last_name ?? ""}`.trim());
                } else {
                    setDisplayName(data.user?.email ?? "");
                }
                setEmail(data.user?.email ?? "");
            });
    }, []);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    if (HIDDEN_EXACT.includes(pathname)) return null;
    if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p) && pathname !== "/projects")) return null;

    const goToProjects = () => router.push("/projects");

    const initials = displayName
        ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
        : "?";

    return (
        <nav
            className="w-full flex items-center justify-between bg-surface border-b border-border px-7"
            style={{ height: 58 }}
        >
            <button
                onClick={goToProjects}
                className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none p-0"
            >
                <span
                    className="flex items-center justify-center"
                    style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary)" }}
                >
                    <Fish size={16} color="#fff" />
                </span>
                <span className="text-[15px] font-bold tracking-tight text-text1">OMarine</span>
            </button>

            <div ref={menuRef} style={{ position: "relative" }}>
                <button
                    onClick={() => setMenuOpen(o => !o)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "5px 10px 5px 14px",
                        borderRadius: 8,
                        border: "1.5px solid var(--border)",
                        background: menuOpen ? "var(--surface2)" : "var(--surface)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background 0.15s",
                    }}
                    onMouseEnter={e => {
                        if (!menuOpen) e.currentTarget.style.background = "var(--surface2)";
                    }}
                    onMouseLeave={e => {
                        if (!menuOpen) e.currentTarget.style.background = "var(--surface)";
                    }}
                >
                    {displayName && (
                        <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>
                            {displayName}
                        </span>
                    )}
                    <span
                        className="flex items-center justify-center text-[12px] font-bold text-white"
                        style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)" }}
                    >
                        {initials}
                    </span>
                    <ChevronDown
                        size={13}
                        color="var(--text3)"
                        style={{
                            transition: "transform 0.15s",
                            transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                    />
                </button>

                {menuOpen && (
                    <div
                        style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            right: 0,
                            minWidth: 220,
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            boxShadow: "0 8px 24px rgba(15, 26, 61, 0.12)",
                            padding: 6,
                            zIndex: 50,
                        }}
                    >
                        <div
                            style={{
                                padding: "10px 12px 12px",
                                borderBottom: "1px solid var(--border)",
                                marginBottom: 4,
                            }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
                                {displayName || "User"}
                            </div>
                            {email && email !== displayName && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--text3)",
                                        marginTop: 3,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {email}
                                </div>
                            )}
                        </div>
                        <form action={logout}>
                            <button
                                type="submit"
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "8px 10px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    fontSize: 12,
                                    color: "var(--danger)",
                                    textAlign: "left",
                                    fontWeight: 500,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212, 99, 110, 0.08)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <LogOut size={13} />
                                Log out
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </nav>
    );
}