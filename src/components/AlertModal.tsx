"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function AlertModal({
  open,
  icon,
  title,
  message,
  onClose,
}: {
  open: boolean;
  icon?: string;
  title: string;
  message: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200"
      style={{ backgroundColor: visible ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)", backdropFilter: visible ? "blur(4px)" : "none" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transition-all duration-200"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
          opacity: visible ? 1 : 0,
        }}
      >
        {icon && (
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-3xl">
              {icon}
            </div>
          </div>
        )}
        <h3 className="text-lg font-bold text-center mb-2">{title}</h3>
        <p className="text-sm text-foreground/70 text-center mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {t("common.ok") || "OK"}
        </button>
      </div>
    </div>
  );
}
