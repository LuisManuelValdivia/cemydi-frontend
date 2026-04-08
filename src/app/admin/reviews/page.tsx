"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CheckCircle2,
  Expand,
  LoaderCircle,
  MessageSquareQuote,
  Star,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { ConfirmDialog } from "@/components/feedback";
import {
  approveReview,
  deleteReview,
  listAdminReviews,
  type AdminReview,
  type ReviewStatus,
} from "@/services/admin";

import { formatNumberEsMx, getPaginationWindow } from "../lib/admin-list-utils";
import { useAdminDataBootstrap } from "../hooks/use-admin-data-bootstrap";
import { useClampPage, useResetPageOnChange } from "../hooks/use-admin-pagination";
import { AdminFilterTabs } from "../components/admin-filter-tabs";
import { AdminPageLoading } from "../components/admin-page-loading";
import { AdminMetricCard } from "../components/admin-metric-card";
import { AdminSearchField } from "../components/admin-search-field";
import { AdminTablePagination } from "../components/admin-table-pagination";
import { PageHeader } from "../components/page-header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { cn } from "../lib/utils";
import { formatDate } from "../products/product-shared";

const PAGE_SIZE = 8;

type StatusFilter = ReviewStatus | "ALL";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: "Pendientes" },
  { id: "APPROVED", label: "Aprobadas" },
  { id: "REJECTED", label: "Rechazadas" },
];

function formatReviewStatus(status: ReviewStatus) {
  if (status === "PENDING") return "Pendiente";
  if (status === "APPROVED") return "Aprobada";
  return "Rechazada";
}

function statusBadgeVariant(status: ReviewStatus) {
  if (status === "PENDING") return "amber" as const;
  if (status === "APPROVED") return "emerald" as const;
  return "slate" as const;
}

function RatingStars({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${safe} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5 shrink-0",
            i < safe
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-[color-mix(in_srgb,var(--border-soft)_90%,transparent)]",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [fullCommentReview, setFullCommentReview] = useState<AdminReview | null>(null);

  const load = useCallback(async () => {
    const reviewsResult = await listAdminReviews({ status: "ALL" });
    setReviews(reviewsResult.reviews);
  }, []);

  const { blockingFullPage } = useAdminDataBootstrap({
    load,
    loadErrorFallback: "No se pudieron cargar las reseÃ±as.",
  });

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of reviews) {
      if (r.status === "PENDING") pending += 1;
      else if (r.status === "APPROVED") approved += 1;
      else rejected += 1;
    }
    return { total: reviews.length, pending, approved, rejected };
  }, [reviews]);

  const tabCounts = useMemo(() => {
    return {
      ALL: reviews.length,
      PENDING: counts.pending,
      APPROVED: counts.approved,
      REJECTED: counts.rejected,
    } as Record<StatusFilter, number>;
  }, [reviews.length, counts.pending, counts.approved, counts.rejected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return reviews.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        item.comment,
        item.product.nombre,
        item.user.nombre,
        item.user.correo,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [reviews, statusFilter, search]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [filtered],
  );

  const { totalPages, resultStart, resultEnd } = getPaginationWindow(
    page,
    PAGE_SIZE,
    sorted.length,
  );

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  useClampPage(page, setPage, totalPages);
  useResetPageOnChange(setPage, [statusFilter, search]);

  const approvePending = async (id: number) => {
    try {
      setActionId(id);
      const result = await approveReview(id);
      setReviews((prev) => prev.map((item) => (item.id === id ? result.review : item)));
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aprobar la reseÃ±a.");
    } finally {
      setActionId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      setActionId(id);
      await deleteReview(id);
      setReviews((prev) => prev.filter((item) => item.id !== id));
      toast.success("ReseÃ±a eliminada.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la reseÃ±a.");
    } finally {
      setActionId(null);
    }
  };

  if (blockingFullPage) {
    return <AdminPageLoading layout="viewport" />;
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Reseñas"
          subtitle="Revisa opiniones de clientes sobre productos: filtra por estado, aprueba las pendientes o elimina entradas que no deban mostrarse en la tienda."
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            context="reviews-total"
            label={"Rese\u00f1as registradas"}
            value={formatNumberEsMx(counts.total)}
          />

          <AdminMetricCard
            context="reviews-pending"
            label="Pendientes de moderar"
            value={formatNumberEsMx(counts.pending)}
          />

          <AdminMetricCard
            context="reviews-approved"
            label="Aprobadas"
            value={formatNumberEsMx(counts.approved)}
          />

          <AdminMetricCard
            context="reviews-rejected"
            label="Rechazadas"
            value={formatNumberEsMx(counts.rejected)}
          />
        </section>

        <Card className="w-full min-w-0 max-w-full rounded-xl border-[var(--border-soft)] shadow-sm">
          <CardHeader className="min-w-0 gap-5 border-b border-[var(--border-soft)] bg-[var(--card)]">
            <div className="min-w-0">
              <CardTitle>ModeraciÃ³n de reseÃ±as</CardTitle>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Listado completo con fecha, autor, producto valorado y estado. Las pendientes pueden
                aprobarse; cualquier reseÃ±a puede eliminarse del sistema.
              </p>
            </div>

            <AdminFilterTabs
              tabs={STATUS_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                count: tabCounts[tab.id],
              }))}
              activeId={statusFilter}
              onChange={setStatusFilter}
              formatCount={formatNumberEsMx}
            />

            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Buscar por comentario, producto, nombre o correoâ€¦"
              wrapperClassName="w-full max-w-md"
            />

            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <MessageSquareQuote className="size-4 opacity-70" aria-hidden />
              {sorted.length} resultado{sorted.length === 1 ? "" : "s"}
              {search.trim() ? ` para "${search.trim()}"` : ""}
            </div>
          </CardHeader>

          <CardContent className="w-full min-w-0 max-w-full pb-2">
            {sorted.length === 0 ? (
              <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
                <div className="max-w-md">
                  <h2 className="text-xl font-semibold text-[var(--brand-900)]">
                    No hay reseñas que mostrar
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {reviews.length === 0
                      ? "AÃºn no hay opiniones registradas en el sistema."
                      : "Prueba otro estado en las pestaÃ±as o ajusta la bÃºsqueda."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto">
                <Table
                  className="min-w-0"
                  style={{
                    width: "100%",
                    minWidth: "920px",
                  }}
                >
                  <TableHeader>
                    <TableRow className="border-b border-[color-mix(in_srgb,var(--brand-700)_24%,var(--border-soft))] bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))]">
                      <TableHead className="whitespace-nowrap text-[var(--brand-900)]">
                        Fecha
                      </TableHead>
                      <TableHead className="min-w-[140px] text-[var(--brand-900)]">Usuario</TableHead>
                      <TableHead className="min-w-[160px] text-[var(--brand-900)]">Producto</TableHead>
                      <TableHead className="whitespace-nowrap text-[var(--brand-900)]">
                        CalificaciÃ³n
                      </TableHead>
                      <TableHead className="w-[14rem] max-w-[14rem] text-[var(--brand-900)] sm:w-[18rem] sm:max-w-[18rem]">
                        Comentario
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-[var(--brand-900)]">Estado</TableHead>
                      <TableHead className="min-w-[120px] text-[var(--brand-900)]">Moderado por</TableHead>
                      <TableHead className="w-[200px] whitespace-nowrap text-right text-[var(--brand-900)]">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((item) => {
                      const busy = actionId === item.id;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap text-sm text-[var(--text-muted)]">
                            {formatDate(item.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-[var(--text-main)]">
                                {item.user.nombre}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">{item.user.correo}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-[var(--text-main)]">
                            {item.product.nombre}
                          </TableCell>
                          <TableCell>
                            <RatingStars rating={item.rating} />
                          </TableCell>
                          <TableCell className="max-w-[14rem] sm:max-w-[18rem]">
                            {item.comment.trim() ? (
                              <button
                                type="button"
                                className="group flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-md py-0.5 pr-1 pl-0.5 text-left transition hover:bg-[color-mix(in_srgb,var(--brand-600)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)] focus-visible:ring-offset-2"
                                onClick={() => setFullCommentReview(item)}
                                aria-label="Ampliar opiniÃ³n del cliente"
                              >
                                <span className="min-w-0 flex-1 overflow-hidden text-sm leading-snug wrap-break-word text-[var(--text-main)] line-clamp-3">
                                  {item.comment}
                                </span>
                                <Expand
                                  className="size-4 shrink-0 self-center text-[var(--brand-600)] opacity-60 transition group-hover:opacity-100"
                                  aria-hidden
                                />
                              </button>
                            ) : (
                              <span className="text-sm text-[var(--text-muted)]">â€”</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(item.status)}>
                              {formatReviewStatus(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-[var(--text-muted)]">
                            {item.approvedBy ? (
                              <span className="text-[var(--text-main)]">{item.approvedBy.nombre}</span>
                            ) : (
                              "â€”"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {item.status === "PENDING" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-md px-3"
                                  disabled={busy}
                                  onClick={() => void approvePending(item.id)}
                                >
                                  {busy ? (
                                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                                  ) : (
                                    <CheckCircle2 className="size-4" aria-hidden />
                                  )}
                                  Aprobar
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-md border-red-200 px-3 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
                                disabled={busy}
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                                Eliminar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-4 border-t border-[var(--border-soft)] bg-[var(--card)] md:flex-row md:items-center md:justify-between">
            <AdminTablePagination
              resultStart={resultStart}
              resultEnd={resultEnd}
              totalCount={sorted.length}
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
            />
          </CardFooter>
        </Card>
      </div>

      <Dialog
        open={fullCommentReview !== null}
        onOpenChange={(open) => {
          if (!open) setFullCommentReview(null);
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,640px)] w-[min(560px,calc(100vw-1.5rem))] flex-col gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-[var(--border-soft)] px-6 py-4 text-left">
            <DialogTitle className="sr-only">
              OpiniÃ³n del cliente: {fullCommentReview?.product.nombre ?? ""}
            </DialogTitle>
            {fullCommentReview ? (
              <div className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
                <p>
                  <span className="font-medium text-[var(--text-main)]">
                    {fullCommentReview.user.nombre}
                  </span>
                  <span className="text-[var(--text-muted)]"> Â· </span>
                  <span className="font-medium text-[var(--text-main)]">
                    {fullCommentReview.product.nombre}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <RatingStars rating={fullCommentReview.rating} />
                  <span>{formatDate(fullCommentReview.createdAt)}</span>
                  <Badge variant={statusBadgeVariant(fullCommentReview.status)}>
                    {formatReviewStatus(fullCommentReview.status)}
                  </Badge>
                </div>
              </div>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {fullCommentReview ? (
              <p className="whitespace-pre-wrap wrap-break-word text-base leading-relaxed text-[var(--text-main)]">
                {fullCommentReview.comment}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar reseÃ±a"
        description={
          deleteTarget
            ? `Se eliminarÃ¡ la reseÃ±a de Â«${deleteTarget.user.nombre}Â» sobre Â«${deleteTarget.product.nombre}Â».`
            : undefined
        }
        tone="danger"
        busy={deleteTarget !== null && actionId === deleteTarget.id}
        confirmLabel="Eliminar reseÃ±a"
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (deleteTarget && actionId === deleteTarget.id) return;
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
