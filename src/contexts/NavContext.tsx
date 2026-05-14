"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type NavMode = "bottom" | "side";

const STORAGE_KEY = "mauricarnet_nav_mode";

interface NavCtx {
  mode: NavMode;
  setMode: (m: NavMode) => void;
  toggle: () => void;
}

const NavContext = createContext<NavCtx>({
  mode: "bottom",
  setMode: () => {},
  toggle: () => {},
});

export function NavProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<NavMode>("bottom");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "side" || saved === "bottom") setModeState(saved);
    setMounted(true);
  }, []);

  const setMode = useCallback((m: NavMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "bottom" ? "side" : "bottom";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <NavContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
