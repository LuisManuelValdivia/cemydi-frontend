"use client";

import { AdminPageLoading } from "../components/admin-page-loading";
import { PageHeader } from "../components/page-header";
import { useAdminRouteGate } from "../hooks/use-admin-route-gate";

export default function AnalyticsPage() {
  const { blockingFullPage } = useAdminRouteGate();

  if (blockingFullPage) {
    return <AdminPageLoading layout="viewport" />;
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Métricas y reportes del negocio. Conectaremos gráficos y exportaciones cuando definas los indicadores."
      />

      <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-sm leading-relaxed text-[var(--text-muted)]">
        El módulo de analítica se mostrará aquí.
      </section>
    </>
  );
}
