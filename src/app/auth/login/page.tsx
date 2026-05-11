"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !pin) {
      setError(t("auth.erreur_champs"));
      return;
    }
    const err = await login(username, pin);
    if (err) setError(err);
    else router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-5xl mb-4">📒</div>
      <h1 className="text-3xl font-bold mb-1">{t("dashboard.title")}</h1>
      <p className="text-sm text-foreground/60 mb-8">{t("dashboard.subtitle")}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
        <input
          placeholder={t("auth.nom_utilisateur")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border border-border rounded-xl"
          autoFocus
        />
        <input
          placeholder={t("auth.code_pin")}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full p-3 border border-border rounded-xl"
          type="password"
          inputMode="numeric"
          maxLength={6}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold"
        >
          {t("auth.se_connecter")}
        </button>
      </form>

      <div className="flex gap-1 mt-6 text-sm text-foreground/60">
        <span>{t("auth.pas_compte")}</span>
        <a href="/auth/register" className="text-primary font-semibold">
          {t("auth.inscription")}
        </a>
      </div>
      <div className="mt-4">
        <LangToggleInline />
      </div>
    </div>
  );
}

function LangToggleInline() {
  const { locale, setLocale } = useTranslation();
  return (
    <button
      onClick={() => setLocale(locale === "fr" ? "ar" : "fr")}
      className="text-sm px-3 py-1 rounded-lg border border-border"
    >
      {locale === "fr" ? "🇸🇦 العربية" : "🇫🇷 Français"}
    </button>
  );
}
