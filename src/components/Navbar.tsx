"use client";

import { usePathname } from "next/navigation";

const HIDDEN_ON = ["/", "/login", "/dashboard"];

export default function Navbar() {
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav className="w-full h-14 bg-bg-surface border-b border-border-default flex items-center px-6 sticky top-0 z-50">
      <span className="text-[14px] font-semibold text-text-primary">
        Omarine
      </span>
    </nav>
  );
}
