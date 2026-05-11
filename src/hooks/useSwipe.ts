"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const PAGE_ORDER = ["/dashboard", "/ventes", "/produits", "/clients"];

export function useSwipeNav() {
  const router = useRouter();
  const pathname = usePathname();
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    const valid = [...PAGE_ORDER, "/", "/rapports"];
    if (!valid.includes(pathname)) return;

    function onTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.3) return;

      const idx = PAGE_ORDER.indexOf(pathname);
      if (idx === -1) {
        if (dx > 0 && pathname === "/") return;
        if (dx < 0 && pathname === "/") router.push("/dashboard");
        if (dx > 0 && pathname === "/rapports") router.push("/clients");
        if (dx < 0 && pathname === "/rapports") return;
        return;
      }
      if (dx < 0 && idx < PAGE_ORDER.length - 1) router.push(PAGE_ORDER[idx + 1]);
      if (dx > 0 && idx > 0) router.push(PAGE_ORDER[idx - 1]);
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);
}
