"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";

const navItems = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: "📊" },
  { labelKey: "nav.produits", href: "/produits", icon: "📦" },
  { labelKey: "nav.ventes", href: "/ventes", icon: "💰" },
  { labelKey: "nav.clients", href: "/clients", icon: "👥" },
];

export default function NavSide() {
  const [showSettings, setShowSettings] = useState(false);
  const pathname = usePathname();
  const { t, locale, dir, setLocale } = useTranslation();
  const { logout } = useAuth();
  const { toggle: toggleNav } = useNav();
  const router = useRouter();

  if (pathname === "/offline" || pathname.startsWith("/auth")) return null;

  const sideClass = dir === "rtl" ? "right-0 border-l" : "left-0 border-r";
  const popupSide = dir === "rtl" ? "right-16" : "left-16";

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
    <>
      {showSettings && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
          <div className={`fixed top-4 ${popupSide} z-50 bg-white rounded-2xl shadow-xl border border-border p-2 min-w-[180px]`}>
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
              <span className="text-lg">⬇️</span>
              <span>{t("nav.bottom_mode")}</span>
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
      <nav className={`fixed top-0 bottom-0 w-16 z-40 flex flex-col items-center gap-1 py-4 bg-white ${sideClass} border-border shadow-sm`}>
        {navItems.map((item) => {
          const actif = pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors w-full ${
                actif ? "text-primary font-bold bg-primary/5" : "text-foreground/50"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] text-center leading-tight">{t(item.labelKey)}</span>
            </a>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors w-full ${
            showSettings ? "text-primary font-bold bg-primary/5" : "text-foreground/50"
          }`}
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] text-center leading-tight">{t("nav.settings")}</span>
        </button>
      </nav>
    </>
  );
}
