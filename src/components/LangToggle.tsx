"use client";

import { useTranslation } from "@/lib/i18n";

export default function LangToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "fr" ? "ar" : "fr")}
      className="text-sm px-2 py-1 rounded-lg border border-border hover:bg-primary/5 transition-colors"
      title={locale === "fr" ? "العربية" : "Français"}
    >
      {locale === "fr" ? "🇸🇦" : "🇫🇷"}
    </button>
  );
}
