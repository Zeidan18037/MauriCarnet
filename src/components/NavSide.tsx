"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

const navItems = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: "📊" },
  { labelKey: "nav.produits", href: "/produits", icon: "📦" },
  { labelKey: "nav.ventes", href: "/ventes", icon: "💰" },
  { labelKey: "nav.clients", href: "/clients", icon: "👥" },
];

export default function NavSide() {
  const pathname = usePathname();
  const { t, dir } = useTranslation();

  if (pathname === "/offline" || pathname.startsWith("/auth")) return null;

  const sideClass = dir === "rtl" ? "right-0 border-l" : "left-0 border-r";

  return (
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
    </nav>
  );
}
