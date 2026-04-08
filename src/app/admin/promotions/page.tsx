"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  ImageIcon,
  Layers2,
  LoaderCircle,
  Package,
  PencilLine,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { ConfirmDialog } from "@/components/feedback";
import {
  createPromotion,
  deletePromotion,
  listCatalogs,
  listProducts,
  listPromotions,
  updatePromotion,
  type AdminProduct,
  type AdminPromotion,
  type ClassificationOption,
  type CreatePromotionPayload,
} from "@/services/admin";

import { formatNumberEsMx, getPaginationWindow } from "../lib/admin-list-utils";
import { useAdminDataBootstrap } from "../hooks/use-admin-data-bootstrap";
import { useClampPage, useResetPageOnChange } from "../hooks/use-admin-pagination";
import { AdminPageLoading } from "../components/admin-page-loading";
import { AdminMetricCard } from "../components/admin-metric-card";
import { AdminTablePagination } from "../components/admin-table-pagination";
import { PageHeader } from "../components/page-header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { formatDate, productFieldClassName, productTextareaClassName } from "../products/product-shared";
import { cn } from "../lib/utils";

const PROMOTION_PAGE_SIZE = 9;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const dateInputInnerClass =
  "w-full min-w-0 cursor-pointer border-0 bg-transparent p-0 text-sm text-foreground shadow-none outline-none focus-visible:ring-0 md:text-sm dark:bg-transparent";

function localISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const defaultPromotionForm = {
  mode: "PRODUCT" as CreatePromotionPayload["mode"],
  productId: "",
  clasificacion: "",
  startAt: "",
  endAt: "",
  descripcion: "",
};

type StatusLabel =
  | "Activa"
  | "Programada"
  | "Finalizada"
  | "Producto sin disponibilidad";

type StatusFilter = "ALL" | StatusLabel;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "Activa", label: "Activas" },
  { id: "Programada", label: "Programadas" },
  { id: "Finalizada", label: "Finalizadas" },
  { id: "Producto sin disponibilidad", label: "Sin stock" },
];

function sortByName<T extends { nombre: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

function validatePromotionForm(form: typeof defaultPromotionForm, todayStr: string) {
  if (form.mode === "PRODUCT") {
    const productId = Number(form.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return "Selecciona un producto para la promoción.";
    }
  }

  if (form.mode === "CATEGORY" && !form.clasificacion.trim()) {
    return "Selecciona una clasificación para aplicar promociones.";
  }

  if (!form.startAt || !form.endAt) {
    return "Selecciona fecha de inicio y fecha final.";
  }

  if (form.startAt < todayStr) {
    return "La fecha de inicio no puede ser anterior a hoy.";
  }

  if (form.endAt < todayStr) {
    return "La fecha de fin no puede ser anterior a hoy.";
  }

  const descripcion = form.descripcion.trim();
  if (descripcion.length < 5 || descripcion.length > 240) {
    return "Descripción inválida. Entre 5 y 240 caracteres.";
  }

  const startMs = new Date(`${form.startAt}T00:00:00`).getTime();
  const endMs = new Date(`${form.endAt}T23:59:59`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return "Fechas de promoción inválidas.";
  }

  if (startMs >= endMs) {
    return "La fecha final debe ser posterior a la fecha de inicio (puede ser el mismo día).";
  }

  return null;
}

function promotionStatus(item: AdminPromotion): { label: StatusLabel } {
  const now = Date.now();
  const starts = new Date(item.startAt).getTime();
  const ends = new Date(item.endAt).getTime();
  const label: StatusLabel =
    !item.product.activo || item.product.stock <= 0
      ? "Producto sin disponibilidad"
      : now < starts
        ? "Programada"
        : now > ends
          ? "Finalizada"
          : "Activa";

  return { label };
}

function statusStyles(label: StatusLabel) {
  switch (label) {
    case "Activa":
      return {
        badge: "emerald" as const,
        ring: "ring-emerald-500/25",
        accent: "from-emerald-500/80 to-teal-600/60",
      };
    case "Programada":
      return {
        badge: "amber" as const,
        ring: "ring-amber-500/25",
        accent: "from-amber-500/75 to-orange-600/50",
      };
    case "Finalizada":
      return {
        badge: "slate" as const,
        ring: "ring-slate-400/20",
        accent: "from-slate-500/50 to-slate-600/40",
      };
    default:
      return {
        badge: "red" as const,
        ring: "ring-red-500/20",
        accent: "from-red-500/60 to-rose-600/45",
      };
  }
}

function PromotionTimeline({ startAt, endAt }: { startAt: string; endAt: string }) {
  const [now] = useState(() => Date.now());
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  const span = e - s;
  let pct = 0;
  if (span > 0) {
    pct = Math.min(100, Math.max(0, ((now - s) / span) * 100));
  }
  const past = now > e;
  const future = now < s;

  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border-soft)_90%,transparent)]"
      title={`${formatDate(startAt)} → ${formatDate(endAt)}`}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          past && "bg-slate-400/80 dark:bg-slate-500/70",
          future && "w-0 bg-amber-400/90",
          !past && !future && "bg-[color-mix(in_srgb,var(--brand-600)_85%,white)]",
        )}
        style={!past && !future ? { width: `${pct}%` } : past ? { width: "100%" } : undefined}
      />
    </div>
  );
}

export default function AdminPromotionsPage() {
  const todayStr = useMemo(() => localISODate(new Date()), []);

  const [saving, setSaving] = useState(false);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [classifications, setClassifications] = useState<ClassificationOption[]>([]);

  const [form, setForm] = useState(defaultPromotionForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromotion | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [localImageObjectUrl, setLocalImageObjectUrl] = useState<string | null>(null);
  const [imageDropActive, setImageDropActive] = useState(false);
  const localImageUrlRef = useRef<string | null>(null);

  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const replaceLocalImagePreview = useCallback((file: File | null) => {
    if (localImageUrlRef.current) {
      URL.revokeObjectURL(localImageUrlRef.current);
      localImageUrlRef.current = null;
    }
    const next = file ? URL.createObjectURL(file) : null;
    localImageUrlRef.current = next;
    setLocalImageObjectUrl(next);
  }, []);

  useEffect(() => {
    return () => {
      if (localImageUrlRef.current) {
        URL.revokeObjectURL(localImageUrlRef.current);
        localImageUrlRef.current = null;
      }
    };
  }, []);

  const applyPromotionImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Usa un archivo de imagen (JPEG, PNG, WebP…).");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("La imagen no debe superar 8 MB.");
        return;
      }
      replaceLocalImagePreview(file);
    },
    [replaceLocalImagePreview],
  );

  const clearLocalPromotionImage = useCallback(() => {
    setImageDropActive(false);
    replaceLocalImagePreview(null);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  }, [replaceLocalImagePreview]);

  const load = useCallback(async () => {
    const [promotionsResult, productsResult, catalogsResult] = await Promise.all([
      listPromotions(),
      listProducts(),
      listCatalogs(),
    ]);

    setPromotions(promotionsResult.promotions);
    setProducts(productsResult.products);
    setClassifications(sortByName(catalogsResult.classifications));
  }, []);

  const { blockingFullPage } = useAdminDataBootstrap({
    load,
    loadErrorFallback: "No se pudieron cargar las promociones.",
  });

  const classificationOptions = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...classifications.map((c) => c.nombre),
          ...products.map((p) => p.clasificacion),
        ]
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [classifications, products]);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
      ),
    [products],
  );

  const sortedPromotions = useMemo(() => {
    return [...promotions].sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
  }, [promotions]);

  const stats = useMemo(() => {
    let activas = 0;
    let programadas = 0;
    for (const p of promotions) {
      const { label } = promotionStatus(p);
      if (label === "Activa") activas += 1;
      else if (label === "Programada") programadas += 1;
    }
    return {
      total: promotions.length,
      activas,
      programadas,
    };
  }, [promotions]);

  const filterCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: promotions.length,
      Activa: 0,
      Programada: 0,
      Finalizada: 0,
      "Producto sin disponibilidad": 0,
    };
    for (const p of promotions) {
      counts[promotionStatus(p).label] += 1;
    }
    return counts;
  }, [promotions]);

  const filteredPromotions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedPromotions.filter((item) => {
      const { label } = promotionStatus(item);
      if (statusFilter !== "ALL" && label !== statusFilter) return false;
      if (!q) return true;
      return (
        item.product.nombre.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        item.product.clasificacion.toLowerCase().includes(q)
      );
    });
  }, [sortedPromotions, search, statusFilter]);

  const { totalPages, resultStart, resultEnd } = getPaginationWindow(
    page,
    PROMOTION_PAGE_SIZE,
    filteredPromotions.length,
  );

  const paginatedPromotions = useMemo(() => {
    const start = (page - 1) * PROMOTION_PAGE_SIZE;
    return filteredPromotions.slice(start, start + PROMOTION_PAGE_SIZE);
  }, [page, filteredPromotions]);

  useClampPage(page, setPage, totalPages);
  useResetPageOnChange(setPage, [search, statusFilter]);

  const endDateMin = useMemo(() => {
    if (!form.startAt || form.startAt < todayStr) return todayStr;
    return form.startAt;
  }, [form.startAt, todayStr]);

  const resetForm = () => {
    clearLocalPromotionImage();
    setForm(defaultPromotionForm);
    setEditingId(null);
  };

  const setMode = (mode: CreatePromotionPayload["mode"]) => {
    if (editingId !== null) return;
    setForm((prev) => ({
      ...prev,
      mode,
      productId: "",
      clasificacion: "",
    }));
  };

  const onFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      let next = { ...prev, [name]: value };
      if (name === "startAt") {
        const minEnd = value >= todayStr ? value : todayStr;
        if (next.endAt && next.endAt < minEnd) {
          next = { ...next, endAt: minEnd };
        }
      }
      return next;
    });
  };

  const startEdit = (item: AdminPromotion) => {
    clearLocalPromotionImage();
    setEditingId(item.id);
    let start = item.startAt.slice(0, 10);
    let end = item.endAt.slice(0, 10);
    if (start < todayStr) start = todayStr;
    if (end < start) end = start;
    setForm({
      mode: "PRODUCT",
      productId: String(item.productId),
      clasificacion: "",
      startAt: start,
      endAt: end,
      descripcion: item.descripcion,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validatePromotionForm(form, todayStr);
    if (err) {
      toast.error(err);
      return;
    }

    const productId = Number(form.productId);
    const startIso = new Date(`${form.startAt}T00:00:00`).toISOString();
    const endIso = new Date(`${form.endAt}T23:59:59`).toISOString();
    const descripcion = form.descripcion.trim();

    setSaving(true);
    try {
      if (editingId !== null) {
        const result = await updatePromotion(editingId, {
          productId,
          startAt: startIso,
          endAt: endIso,
          descripcion,
        });
        setPromotions((prev) => prev.map((p) => (p.id === editingId ? result.promotion : p)));
        toast.success(result.message);
      } else {
        const payload: CreatePromotionPayload = {
          mode: form.mode,
          startAt: startIso,
          endAt: endIso,
          descripcion,
          ...(form.mode === "PRODUCT"
            ? { productId }
            : { clasificacion: form.clasificacion.trim() }),
        };
        const result = await createPromotion(payload);
        setPromotions((prev) => [...result.promotions, ...prev]);
        setPage(1);
        toast.success(result.message);
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la promoción.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deletePromotion(deleteTarget.id);
      setPromotions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) resetForm();
      toast.success("Promoción eliminada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la promoción.");
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const editingPromotion = useMemo(
    () => (editingId !== null ? promotions.find((p) => p.id === editingId) ?? null : null),
    [editingId, promotions],
  );

  const formImagePreviewSrc = localImageObjectUrl ?? editingPromotion?.imageUrl ?? null;
  const previewIsLocalFile = Boolean(localImageObjectUrl);

  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const el = ref.current;
    if (!el || el.disabled) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.focus();
      el.click();
    }
  };

  if (blockingFullPage) {
    return <AdminPageLoading />;
  }

  return (
    <>
      <PageHeader
        title="Promociones"
        subtitle="Campañas por producto o por categoría. Las fechas deben ser hoy o posteriores."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          context="promotions-total"
          label="Total promociones"
          value={formatNumberEsMx(stats.total)}
        />
        <AdminMetricCard
          context="promotions-active"
          label="Activas"
          value={formatNumberEsMx(stats.activas)}
        />
        <AdminMetricCard
          context="promotions-scheduled"
          label="Programadas"
          value={formatNumberEsMx(stats.programadas)}
        />
      </section>

      <Card className="mt-4 w-full min-w-0 max-w-full rounded-xl border-[var(--border-soft)] shadow-sm">
        <CardHeader className="min-w-0 gap-5 border-b border-[var(--border-soft)] bg-[var(--card)]">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-5 text-[var(--brand-700)]" aria-hidden />
              {editingId !== null ? "Editar promoción" : "Nueva promoción"}
            </CardTitle>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              La imagen que subas aquí es vista previa en el panel (arrastra o haz clic en la zona punteada).
              El envío al servidor se habilitará después; las promos ya publicadas siguen mostrando su imagen
              en la tienda.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                Alcance
              </p>
              <div className="flex rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1">
                <button
                  type="button"
                  disabled={Boolean(editingId) || saving}
                  onClick={() => setMode("PRODUCT")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition",
                    form.mode === "PRODUCT"
                      ? "bg-[var(--card)] text-[var(--brand-900)] shadow-[0_1px_3px_rgba(15,61,59,0.14)] dark:text-[var(--text-main)]"
                      : "text-[var(--text-muted)] hover:text-[var(--brand-800)]",
                  )}
                >
                  <Package className="size-4 shrink-0 opacity-80" aria-hidden />
                  Producto
                </button>
                <button
                  type="button"
                  disabled={Boolean(editingId) || saving}
                  onClick={() => setMode("CATEGORY")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition",
                    form.mode === "CATEGORY"
                      ? "bg-[var(--card)] text-[var(--brand-900)] shadow-[0_1px_3px_rgba(15,61,59,0.14)] dark:text-[var(--text-main)]"
                      : "text-[var(--text-muted)] hover:text-[var(--brand-800)]",
                  )}
                >
                  <Layers2 className="size-4 shrink-0 opacity-80" aria-hidden />
                  Categoría
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {form.mode === "PRODUCT" ? (
                <label className="grid gap-2 text-sm font-medium text-[var(--text-main)] sm:col-span-2">
                  Producto
                  <select
                    name="productId"
                    className={productFieldClassName}
                    value={form.productId}
                    onChange={onFieldChange}
                    disabled={saving}
                  >
                    <option value="">Selecciona…</option>
                    {sortedProducts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre} · {item.clasificacion}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="grid gap-2 text-sm font-medium text-[var(--text-main)] sm:col-span-2">
                  Clasificación
                  <select
                    name="clasificacion"
                    className={productFieldClassName}
                    value={form.clasificacion}
                    onChange={onFieldChange}
                    disabled={saving}
                  >
                    <option value="">Selecciona…</option>
                    {classificationOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                <span id="promo-start-label">Inicio</span>
                <div
                  role="button"
                  tabIndex={saving ? -1 : 0}
                  className={cn(
                    productFieldClassName,
                    "flex cursor-pointer items-center",
                    saving && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => !saving && openDatePicker(startDateRef)}
                  onKeyDown={(e) => {
                    if (saving) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDatePicker(startDateRef);
                    }
                  }}
                >
                  <input
                    ref={startDateRef}
                    id="promo-start"
                    aria-labelledby="promo-start-label"
                    name="startAt"
                    type="date"
                    min={todayStr}
                    className={dateInputInnerClass}
                    value={form.startAt}
                    onChange={onFieldChange}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                <span id="promo-end-label">Fin</span>
                <div
                  role="button"
                  tabIndex={saving ? -1 : 0}
                  className={cn(
                    productFieldClassName,
                    "flex cursor-pointer items-center",
                    saving && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => !saving && openDatePicker(endDateRef)}
                  onKeyDown={(e) => {
                    if (saving) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDatePicker(endDateRef);
                    }
                  }}
                >
                  <input
                    ref={endDateRef}
                    id="promo-end"
                    aria-labelledby="promo-end-label"
                    name="endAt"
                    type="date"
                    min={endDateMin}
                    className={dateInputInnerClass}
                    value={form.endAt}
                    onChange={onFieldChange}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-[var(--text-main)]">
                      Imagen de la promoción
                    </span>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--text-muted)]">
                      JPG, PNG o WebP · máximo 8 MB · arrastra al recuadro o usa el botón. Misma proporción
                      que verá el cliente en la portada (banner).
                    </p>
                  </div>
                  {formImagePreviewSrc ? (
                    <Badge variant={previewIsLocalFile ? "blue" : "slate"} className="shrink-0">
                      {previewIsLocalFile ? "Vista previa local" : "Del servidor"}
                    </Badge>
                  ) : null}
                </div>

                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*,.webp"
                  className="sr-only"
                  tabIndex={-1}
                  disabled={saving}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) applyPromotionImageFile(f);
                    e.target.value = "";
                  }}
                />

                {formImagePreviewSrc ? (
                  <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-sm">
                    <div className="relative aspect-[16/10] w-full bg-[color-mix(in_srgb,var(--brand-700)_8%,var(--surface))]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formImagePreviewSrc}
                        alt=""
                        className="size-full object-cover"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
                        aria-hidden
                      />
                      <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-9 rounded-lg border border-white/30 bg-white/95 text-[var(--text-main)] shadow-sm hover:bg-white dark:bg-[var(--card)]"
                          disabled={saving}
                          onClick={() => imageFileInputRef.current?.click()}
                        >
                          <Upload className="mr-1.5 size-3.5" aria-hidden />
                          Cambiar
                        </Button>
                        {previewIsLocalFile ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-9 rounded-lg border border-red-500/25 bg-white/95 text-destructive shadow-sm hover:bg-red-50 dark:bg-[var(--card)]"
                            disabled={saving}
                            onClick={clearLocalPromotionImage}
                          >
                            <X className="mr-1.5 size-3.5" aria-hidden />
                            Quitar local
                          </Button>
                        ) : null}
                      </div>
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white drop-shadow-sm">
                        <ImageIcon className="size-4 opacity-90" aria-hidden />
                        <span className="text-xs font-semibold tracking-wide uppercase">
                          Así se verá en la tienda
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={saving ? -1 : 0}
                    aria-label="Zona para subir imagen de la promoción"
                    className={cn(
                      "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                      imageDropActive
                        ? "border-[color-mix(in_srgb,var(--brand-600)_55%,var(--border-soft))] bg-[color-mix(in_srgb,var(--brand-600)_10%,var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-600)_20%,transparent)]"
                        : "border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_88%,var(--card))] hover:border-[color-mix(in_srgb,var(--brand-600)_35%,var(--border-soft))] hover:bg-[color-mix(in_srgb,var(--brand-600)_6%,var(--surface))]",
                      saving && "pointer-events-none cursor-not-allowed opacity-50",
                    )}
                    onClick={() => !saving && imageFileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (saving) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        imageFileInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!saving) setImageDropActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setImageDropActive(false);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImageDropActive(false);
                      if (saving) return;
                      const f = e.dataTransfer.files?.[0];
                      if (f) applyPromotionImageFile(f);
                    }}
                  >
                    <div
                      className={cn(
                        "flex size-14 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] shadow-sm",
                        imageDropActive && "scale-105 border-[color-mix(in_srgb,var(--brand-600)_40%,var(--border-soft))] text-[var(--brand-800)]",
                      )}
                    >
                      <Upload
                        className={cn(
                          "size-7 text-[var(--text-muted)]",
                          imageDropActive && "text-[var(--brand-700)]",
                        )}
                        aria-hidden
                      />
                    </div>
                    <div>
                      <p className="m-0 text-sm font-semibold text-[var(--text-main)]">
                        Arrastra una imagen aquí
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        o haz clic para elegir desde tu equipo
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={saving}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        imageFileInputRef.current?.click();
                      }}
                    >
                      Examinar archivos
                    </Button>
                  </div>
                )}
              </div>

              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)] sm:col-span-2">
                Descripción
                <textarea
                  name="descripcion"
                  className={productTextareaClassName}
                  placeholder="Texto que verá el cliente"
                  value={form.descripcion}
                  onChange={onFieldChange}
                  disabled={saving}
                  rows={4}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-5">
              {editingId !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button type="submit" className="h-11 rounded-md" disabled={saving}>
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : editingId !== null ? (
                  "Guardar cambios"
                ) : (
                  "Crear promoción"
                )}
              </Button>
            </div>
          </form>

          <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl bg-[var(--surface)] p-1">
            {STATUS_FILTERS.map((tab) => {
              const isActive = statusFilter === tab.id;
              const count = filterCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "inline-flex min-h-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-[var(--card)] text-[var(--brand-900)] shadow-[0_1px_3px_rgba(15,61,59,0.14)]"
                      : "text-[var(--text-muted)] hover:text-[var(--brand-800)]",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-xs",
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--brand-600)_12%,var(--surface))] text-[var(--brand-800)]"
                        : "bg-[var(--card)] text-[var(--brand-800)]",
                    )}
                  >
                    {formatNumberEsMx(count)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por producto, categoría o descripción…"
              className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--surface)] pl-10"
            />
          </div>
        </CardHeader>

        <CardContent className="w-full min-w-0 max-w-full pb-2">
          {filteredPromotions.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface)] px-6 py-12 text-center">
              <p className="text-base font-medium text-[var(--text-main)]">Sin resultados</p>
              <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
                {search.trim() || statusFilter !== "ALL"
                  ? "Prueba otro filtro o limpia la búsqueda."
                  : "Crea una promoción con el formulario de arriba."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedPromotions.map((item) => {
                const { label } = promotionStatus(item);
                const st = statusStyles(label);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--card)] shadow-sm ring-1 ring-transparent transition hover:shadow-md",
                      st.ring,
                    )}
                  >
                    <div
                      className={cn(
                        "relative h-28 shrink-0 bg-gradient-to-br",
                        st.accent,
                      )}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="size-full object-cover opacity-95"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-white/90">
                          <ImageIcon className="size-9 opacity-60" aria-hidden />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <Badge variant={st.badge} className="shadow-sm">
                          {label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div>
                        <p className="line-clamp-2 font-semibold text-[var(--text-main)]">
                          {item.product.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {item.product.clasificacion}
                        </p>
                      </div>
                      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                        {item.descripcion}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-medium text-[var(--text-muted)] uppercase">
                          <span>{formatDate(item.startAt)}</span>
                          <span>{formatDate(item.endAt)}</span>
                        </div>
                        <PromotionTimeline startAt={item.startAt} endAt={item.endAt} />
                      </div>
                      <div className="flex gap-2 border-t border-[var(--border-soft)] pt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="flex-1 rounded-md"
                          disabled={saving}
                          onClick={() => startEdit(item)}
                        >
                          <PencilLine className="mr-1.5 size-3.5" aria-hidden />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={saving}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>

        {filteredPromotions.length > 0 ? (
          <CardFooter className="flex-col gap-4 border-t border-[var(--border-soft)] bg-[var(--card)] md:flex-row md:items-center md:justify-between">
            <AdminTablePagination
              resultStart={resultStart}
              resultEnd={resultEnd}
              totalCount={filteredPromotions.length}
              page={page}
              totalPages={totalPages}
              disableWhenEmpty={false}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </CardFooter>
        ) : null}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar promoción"
        description={
          deleteTarget
            ? `Se eliminará la campaña de «${deleteTarget.product.nombre}».`
            : undefined
        }
        tone="danger"
        busy={saving}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => {
          if (saving) return;
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
