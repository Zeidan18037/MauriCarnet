"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import SettingsPanel from "./SettingsPanel";

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { dir } = useTranslation();

  if (pathname === "/offline" || pathname.startsWith("/auth")) return null;

  const popupSide = dir === "rtl" ? "right-12" : "left-12";

  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`fixed top-4 ${popupSide} z-50`}>
            <SettingsPanel onClose={() => setOpen(false)} />
          </div>
        </>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed top-4 left-4 z-30 w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-colors ${
          open ? "bg-primary/10 text-primary" : "bg-white/80 backdrop-blur-sm shadow-sm border border-border text-foreground/60 hover:text-foreground"
        }`}
        style={dir === "rtl" ? { left: "auto", right: "16px" } : undefined}
      >
        ⚙️
      </button>
    </>
  );
}
