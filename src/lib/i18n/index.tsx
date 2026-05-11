"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import fr from "./fr";
import ar from "./ar";

export type Locale = "fr" | "ar";
type Dict = Record<string, string>;

const DICTS: Record<Locale, Dict> = { fr, ar };
const STORAGE_KEY = "mauricarnet_locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "ar" || saved === "fr") return saved;
  return "fr";
}

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const LocaleContext = createContext<LocaleCtx>({
  locale: "fr",
  setLocale: () => {},
  t: (k) => k,
  dir: "ltr",
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    document.documentElement.lang = detected === "ar" ? "ar" : "fr";
    document.documentElement.dir = detected === "ar" ? "rtl" : "ltr";
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l === "ar" ? "ar" : "fr";
      document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = DICTS[locale];
      let val = dict[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          val = val.replace(`{${k}}`, String(v));
        }
      }
      return val;
    },
    [locale]
  );

  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";

  if (!mounted) {
    return (
      <LocaleContext.Provider value={{ locale: "fr", setLocale, t, dir: "ltr" }}>
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dir }}>
      <div dir={dir}>{children}</div>
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LocaleContext);
}
