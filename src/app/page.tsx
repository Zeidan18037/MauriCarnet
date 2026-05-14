"use client";

import Image from "next/image";
import { useTranslation } from "@/lib/i18n";

export default function Dashboard() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 pb-24">
      <Image src="/icon-192x192.png" alt="MauriCarnet" width={96} height={96} className="mb-4" priority />
      <h1 className="text-3xl font-bold mb-1">{t("dashboard.title")}</h1>
      <p className="text-base text-foreground/60 mb-8">
        {t("dashboard.subtitle")}
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <DashboardCard href="/ventes" icon="💰" label={t("dashboard.ventes")} sub={t("dashboard.sub_ventes")} />
        <DashboardCard href="/produits" icon="📦" label={t("dashboard.produits")} sub={t("dashboard.sub_produits")} />
        <DashboardCard href="/clients" icon="👥" label={t("dashboard.clients")} sub={t("dashboard.sub_clients")} />
        <DashboardCard
          href="/rapports"
          icon="📊"
          label={t("dashboard.rapports")}
          sub={t("dashboard.sub_rapports")}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  icon,
  label,
  sub,
  disabled,
}: {
  href: string;
  icon: string;
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center p-5 rounded-2xl border border-border bg-card shadow-sm transition active:scale-95 ${
        disabled ? "opacity-30 pointer-events-none" : ""
      }`}
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="font-semibold text-sm">{label}</span>
      <span className="text-xs text-foreground/50">{sub}</span>
    </a>
  );
}
