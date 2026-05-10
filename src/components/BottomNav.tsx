"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { label: "Ventes", href: "/ventes", icon: "💰" },
  { label: "Produits", href: "/produits", icon: "📦" },
  { label: "Clients", href: "/clients", icon: "👥" },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/offline") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex justify-around py-2 z-50">
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
            <span className="text-xs">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
