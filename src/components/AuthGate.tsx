"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { useEffect } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirstUser } = useAuth();
  const pathname = usePathname();
  const { t } = useTranslation();
  const isAuthPage = pathname.startsWith("/auth") || pathname === "/offline";

  useEffect(() => {
    if (!loading && !user && !isAuthPage && typeof window !== "undefined") {
      const base = isFirstUser ? "/auth/register" : "/auth/login";
      window.location.href = base;
    }
  }, [loading, user, isFirstUser, isAuthPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("common.chargement")}</p>
      </div>
    );
  }

  if (!user && !isAuthPage) return null;

  return <>{children}</>;
}
