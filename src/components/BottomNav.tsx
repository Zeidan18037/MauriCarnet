"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { useRouter } from "next/navigation";

const navItems = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: "📊" },
  { labelKey: "nav.produits", href: "/produits", icon: "📦" },
  { labelKey: "nav.ventes", href: "/ventes", icon: "💰" },
  { labelKey: "nav.clients", href: "/clients", icon: "👥" },
];

export default function BottomNav() {
  const [showSettings, setShowSettings] = useState(false);
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();
  const { logout } = useAuth();
  const { mode, toggle: toggleNav } = useNav();
  const router = useRouter();

  if (pathname === "/offline" || pathname.startsWith("/auth")) return null;
  if (mode === "side") return null;

  function toggleLocale() {
    setLocale(locale === "fr" ? "ar" : "fr");
    setShowSettings(false);
  }

  function handleLogout() {
    setShowSettings(false);
    if (confirm(t("nav.logout_confirm") || "Se déconnecter ?")) {
      logout();
      router.push("/auth/login");
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {showSettings && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
          <div className="absolute bottom-20 right-4 z-50 bg-white rounded-2xl shadow-xl border border-border p-2 min-w-[180px]">
            <button
              onClick={toggleLocale}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-sm font-medium"
            >
              <span className="text-lg">{locale === "fr" ? "🇸🇦" : "🇫🇷"}</span>
              <span>{locale === "fr" ? "العربية" : "Français"}</span>
            </button>
            <button
              onClick={() => { setShowSettings(false); toggleNav(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-sm font-medium"
            >
              <span className="text-lg">{mode === "bottom" ? "↔️" : "⬇️"}</span>
              <span>{mode === "bottom" ? t("nav.side_mode") : t("nav.bottom_mode")}</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-danger/5 text-sm font-medium text-danger"
            >
              <span className="text-lg">🚪</span>
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        </>
      )}
      <nav className="bg-white flex justify-around py-2 border-t border-border">
        {navItems.map((item) => {
          const actif = pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
                actif ? "text-primary font-bold" : "text-foreground/50"
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs">{t(item.labelKey)}</span>
            </a>
          );
        })}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
            showSettings ? "text-primary font-bold" : "text-foreground/50"
          }`}
        >
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">{t("nav.settings")}</span>
        </button>
      </nav>
    </div>
  );
}