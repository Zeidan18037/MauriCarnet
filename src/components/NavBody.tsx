"use client";

import { usePathname } from "next/navigation";
import { useNav } from "@/contexts/NavContext";
import { useTranslation } from "@/lib/i18n";
import type { ReactNode } from "react";

export default function NavBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mode } = useNav();
  const { dir } = useTranslation();
  const isAuth = pathname === "/offline" || pathname.startsWith("/auth");

  if (isAuth) return <div className="min-h-full flex flex-col">{children}</div>;

  if (mode === "side") {
    const pad = dir === "rtl" ? "pr-16" : "pl-16";
    return <div className={`min-h-full flex flex-col ${pad} pt-12`}>{children}</div>;
  }

  return <div className="min-h-full flex flex-col pb-20 pt-12">{children}</div>;
}
