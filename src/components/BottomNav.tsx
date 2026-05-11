"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const navItems = [
  { labelKey: "nav.ventes", href: "/ventes", icon: "💰" },
  { labelKey: "nav.produits", href: "/produits", icon: "📦" },
  { labelKey: "nav.clients", href: "/clients", icon: "👥" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();
  const { logout } = useAuth();
  const router = useRouter();

  if (pathname === "/offline" || pathname.startsWith("/auth")) return null;

  function toggleLocale() {
    setLocale(locale === "fr" ? "ar" : "fr");
  }

  function handleLogout() {
    if (confirm(t("nav.logout_confirm") || "Se déconnecter ?")) {
      logout();
      router.push("/auth/login");
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-4 py-1.5 bg-background border-t border-border">
        <button
          onClick={handleLogout}
          className="text-xs text-foreground/40 hover:text-danger transition-colors flex items-center gap-1"
          title={t("nav.logout") || "Déconnexion"}
        >
          <span>🚪</span>
          <span className="hidden sm:inline">{t("nav.logout") || "Déconnexion"}</span>
        </button>
        <button
          onClick={toggleLocale}
          className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-primary/5 transition-colors text-foreground/60"
          title={t("common.langue")}
        >
          {locale === "fr" ? "🇸🇦 العربية" : "🇫🇷 Français"}
        </button>
      </div>
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
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{t(item.labelKey)}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}