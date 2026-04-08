"use client";

import { AdminPageLoading } from "./components/admin-page-loading";
import { PageHeader } from "./components/page-header";
import { useAdminRouteGate } from "./hooks/use-admin-route-gate";

export default function AdminPage() {
  const { blockingFullPage } = useAdminRouteGate();

  if (blockingFullPage) {
    return <AdminPageLoading layout="viewport" />;
  }

  return (
    <>
      <PageHeader
        title="Inicio"
        subtitle="Resumen del panel de administración. Aquí podrás enlazar métricas y accesos rápidos cuando los definamos."
      />

      <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-sm leading-relaxed text-[var(--text-muted)]">
        Contenido principal de esta sección en preparación.
      </section>
    </>
  );
}
