"use client";

import { useTranslation } from "@/lib/i18n";

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-foreground/70 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm"
          >
            {t("common.annuler")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-danger text-white font-semibold text-sm"
          >
            {t("common.confirmer")}
          </button>
        </div>
      </div>
    </div>
  );
}
