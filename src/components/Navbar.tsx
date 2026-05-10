"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Fish, LogOut } from "lucide-react";
import { logout } from "../app/login/actions";
import { createBrowserSupabaseClient } from "../lib/supabase/client";

const HIDDEN_PREFIXES = ["/login", "/projects/"];
const HIDDEN_EXACT = ["/"];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [displayName, setDisplayName] = useState("");

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
            });
    }, []);

    if (HIDDEN_EXACT.includes(pathname)) return null;
    if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p) && pathname !== "/projects")) return null;

    const goToProjects = () => router.push("/projects");

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

            <div className="flex items-center gap-2.5">
                {displayName && (
                    <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>
                        {displayName}
                    </span>
                )}
                <form action={logout}>
                    <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] text-text2 border border-border bg-surface hover:bg-surface2 transition-colors"
                    >
                        <LogOut size={13} />
                        Log out
                    </button>
                </form>
                <span
                    className="flex items-center justify-center text-[12px] font-bold text-white"
                    style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--primary)" }}
                >
                    {displayName
                        ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                        : "?"}
                </span>
            </div>
        </nav>
    );
}
