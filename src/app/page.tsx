export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-5xl mb-4">📒</div>
      <h1 className="text-3xl font-bold mb-1">MauriCarnet</h1>
      <p className="text-base text-foreground/60 mb-8">
        Gestion des ventes et du carnet de dettes
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <DashboardCard href="/ventes" icon="💰" label="Ventes" sub="Nouvelle vente" />
        <DashboardCard href="/produits" icon="📦" label="Produits" sub="Gérer le stock" />
        <DashboardCard href="/clients" icon="👥" label="Clients" sub="Carnet de dettes" />
        <DashboardCard
          href="/rapports"
          icon="📊"
          label="Rapports"
          sub="ROI & stats"
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
