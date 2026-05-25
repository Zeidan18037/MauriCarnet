"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

const STORAGE_KEY = "mauricarnet_hide_transactions";

function getHidePref(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export { STORAGE_KEY, getHidePref };

export default function SettingsPanel({ onClose }: { onClose?: () => void }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { t, locale, setLocale } = useTranslation();
  const { logout } = useAuth();
  const { mode, toggle: toggleNav } = useNav();
  const router = useRouter();
  const hide = getHidePref();

  function toggleLocale() {
    setLocale(locale === "fr" ? "ar" : "fr");
    onClose?.();
  }

  function toggleHideTransactions() {
    const next = !hide;
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new CustomEvent("mauricarnet-hide-changed", { detail: next }));
    onClose?.();
  }

  function handleLogout() {
    setShowLogoutConfirm(true);
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl border border-border p-2 min-w-[180px]">
        <button
          onClick={toggleLocale}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-sm font-medium"
        >
          <span className="text-lg">{locale === "fr" ? "🇸🇦" : "🇫🇷"}</span>
          <span>{locale === "fr" ? "العربية" : "Français"}</span>
        </button>
        <button
          onClick={() => { toggleNav(); onClose?.(); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-sm font-medium"
        >
          <span className="text-lg">{mode === "bottom" ? "↔️" : "⬇️"}</span>
          <span>{mode === "bottom" ? t("nav.side_mode") : t("nav.bottom_mode")}</span>
        </button>
        <button
          onClick={toggleHideTransactions}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-sm font-medium"
        >
          <span className="text-lg">{hide ? "👁️" : "👁️‍🗨️"}</span>
          <span>{hide ? t("settings.show_transactions") : t("settings.hide_transactions")}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-danger/5 text-sm font-medium text-danger"
        >
          <span className="text-lg">🚪</span>
          <span>{t("nav.logout")}</span>
        </button>
      </div>

      <ConfirmModal
        open={showLogoutConfirm}
        icon="🚪"
        title={t("nav.logout")}
        message={t("nav.logout_confirm")}
        confirmDanger
        confirmText={t("nav.logout")}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onClose?.();
          logout();
          router.push("/auth/login");
        }}
        onCancel={() => {
          setShowLogoutConfirm(false);
          onClose?.();
        }}
      />
    </>
  );
}
