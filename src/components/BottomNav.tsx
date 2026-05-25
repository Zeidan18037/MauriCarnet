"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useNav } from "@/contexts/NavContext";

const navItems = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: "📊" },
  { labelKey: "nav.produits", href: "/produits", icon: "📦" },
  { labelKey: "nav.ventes", href: "/ventes", icon: "💰" },
  { labelKey: "nav.clients", href: "/clients", icon: "👥" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { mode } = useNav();

  if (pathname === "/offline" || pathname.startsWith("/auth")) return null;
  if (mode === "side") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white flex justify-around py-2 border-t border-border">
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
    </nav>
  );
}