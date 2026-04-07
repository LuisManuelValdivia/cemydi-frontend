"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CatalogProduct, getCatalogProducts } from "@/services/catalog";
import styles from "./catalogo.module.css";

const PAGE_SIZE = 15;
const fallbackClassifications = [
  "Movilidad",
  "Rehabilitacion",
  "Soporte",
  "Terapia",
];
const tipoOptions = [
  { value: "VENTA" as const, label: "Solo venta" },
  { value: "RENTA" as const, label: "Solo renta" },
  { value: "MIXTO" as const, label: "Ambos (venta y renta)" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTipo(value: CatalogProduct["tipoAdquisicion"]) {
  if (value === "VENTA") return "Venta";
  if (value === "RENTA") return "Renta";
  return "Ambos";
}

function getProductMonogram(nombre: string) {
  const clean = nombre.trim().toUpperCase();
  if (!clean) return "PR";
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2);
  }

  return `${parts[0][0]}${parts[1][0]}`;
}

function normalizeTipos(raw: string | null) {
  if (!raw) return [] as Array<"VENTA" | "RENTA" | "MIXTO">;

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is "VENTA" | "RENTA" | "MIXTO" =>
      item === "VENTA" || item === "RENTA" || item === "MIXTO",
    );
}

function normalizePage(raw: string | null) {
  const parsed = Number(raw ?? "1");
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return parsed;
}

function normalizeClassificationKey(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uFFFD/g, "")
    .toLowerCase();
}

function formatClassificationLabel(value: string) {
  const normalized = normalizeClassificationKey(value).replace(/[^a-z0-9\s]/g, "");

  if (
    normalized === "equipomedico" ||
    normalized === "equipomdico" ||
    (normalized.startsWith("equipo m") && normalized.endsWith("dico"))
  ) {
    return "Equipo Medico";
  }

  return value.replace(/\uFFFD/g, "");
}

function dedupeClassifications(values: string[]) {
  const normalized = new Map<string, string>();

  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    const key = normalizeClassificationKey(value);
    const current = normalized.get(key);

    if (!current || current.includes("\uFFFD")) {
      normalized.set(key, value);
    }
  }

  return Array.from(normalized.values()).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

function CatalogoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchQuery = searchParams.get("q") ?? "";
  const appliedClassifications = useMemo(() => {
    const raw = searchParams.get("clasificaciones");
    if (!raw) return [] as string[];
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [searchParams]);
  const appliedTipos = useMemo(
    () => normalizeTipos(searchParams.get("tipos")),
    [searchParams],
  );
  const appliedReceta = searchParams.get("receta");
  const appliedPage = useMemo(
    () => normalizePage(searchParams.get("page")),
    [searchParams],
  );

  const [draftClassifications, setDraftClassifications] = useState<string[]>([]);
  const [draftTipos, setDraftTipos] = useState<Array<"VENTA" | "RENTA" | "MIXTO">>([]);
  const [draftReceta, setDraftReceta] = useState<"con" | "sin" | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [pinFilters, setPinFilters] = useState(true);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [availableClassifications, setAvailableClassifications] = useState<string[]>(
    fallbackClassifications,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifyRequested, setNotifyRequested] = useState<number[]>([]);

  const requestRestockNotification = (productId: number) => {
    setNotifyRequested((prev) =>
      prev.includes(productId) ? prev : [...prev, productId],
    );
  };

  useEffect(() => {
    setDraftClassifications(appliedClassifications);
    setDraftTipos(appliedTipos);

    if (appliedReceta === "con" || appliedReceta === "sin") {
      setDraftReceta(appliedReceta);
      return;
    }
    setDraftReceta(null);
  }, [appliedClassifications, appliedTipos, appliedReceta]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getCatalogProducts({
          search: searchQuery,
          clasificaciones: appliedClassifications,
          tipos: appliedTipos,
          requiereReceta:
            appliedReceta === "con" ? true : appliedReceta === "sin" ? false : null,
          page: appliedPage,
          pageSize: PAGE_SIZE,
        });

        setProducts(result.products);
        setTotalProducts(result.pagination?.total ?? result.products.length);
        setTotalPages(result.pagination?.totalPages ?? 1);

        const serverClassifications = result.filters?.clasificaciones ?? [];
        const merged = dedupeClassifications(
          [...fallbackClassifications, ...serverClassifications].map((item) =>
            normalizeClassificationKey(item) === "equipomedico" ? "Equipo Medico" : item,
          ),
        );
        setAvailableClassifications(merged);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo cargar el catalogo.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchCatalog();
  }, [searchQuery, appliedClassifications, appliedTipos, appliedReceta, appliedPage]);

  const currentPage = Math.min(appliedPage, totalPages);
  const hasActiveFilters =
    appliedClassifications.length > 0 || appliedTipos.length > 0 || appliedReceta !== null;
  const quickCategories = availableClassifications.slice(0, 4);

  const buildParams = (options: {
    page?: number;
    clasificaciones?: string[];
    tipos?: Array<"VENTA" | "RENTA" | "MIXTO">;
    receta?: "con" | "sin" | null;
  }) => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    const clasificaciones = options.clasificaciones ?? appliedClassifications;
    if (clasificaciones.length > 0) {
      params.set("clasificaciones", clasificaciones.join(","));
    }

    const tipos = options.tipos ?? appliedTipos;
    if (tipos.length > 0) {
      params.set("tipos", tipos.join(","));
    }

    const receta = options.receta !== undefined ? options.receta : appliedReceta;
    if (receta === "con" || receta === "sin") {
      params.set("receta", receta);
    }

    const page = options.page ?? 1;
    if (page > 1) {
      params.set("page", String(page));
    }

    return params;
  };

  const toggleClassification = (value: string) => {
    const normalizedValue = normalizeClassificationKey(value);

    setDraftClassifications((prev) => {
      const hasValue = prev.some((item) => normalizeClassificationKey(item) === normalizedValue);

      if (hasValue) {
        return prev.filter((item) => normalizeClassificationKey(item) !== normalizedValue);
      }

      return [...prev, value];
    });
  };

  const toggleTipo = (value: "VENTA" | "RENTA" | "MIXTO") => {
    setDraftTipos((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const applyFilters = () => {
    const params = buildParams({
      page: 1,
      clasificaciones: draftClassifications,
      tipos: draftTipos,
      receta: draftReceta,
    });

    const query = params.toString();
    router.push(query ? `/catalogo?${query}` : "/catalogo");
  };

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    const params = buildParams({ page: clamped });
    const query = params.toString();
    router.push(query ? `/catalogo?${query}` : "/catalogo");
  };

  const setQuickCategory = (value: string | null) => {
    const params = buildParams({
      page: 1,
      clasificaciones: value ? [value] : [],
      tipos: [],
      receta: null,
    });
    const query = params.toString();
    router.push(query ? `/catalogo?${query}` : "/catalogo");
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }

    const query = params.toString();
    router.push(query ? `/catalogo?${query}` : "/catalogo");
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${!showFilters ? styles.layoutExpanded : ""}`}>
        <section className={styles.catalogSection}>
          <header className={styles.catalogHeader}>
            <div className={styles.catalogHeaderTop}>
              <div className={styles.catalogHeroCopy}>
                <h1>Catalogo completo</h1>
                <p className={styles.catalogLead}>
                  Soluciones de movilidad, rehabilitacion y equipo medico con una navegacion mas clara y comoda.
                </p>
              </div>
              <div className={styles.catalogActions}>
                <p className={styles.catalogMeta}>
                  {loading
                    ? "Buscando productos..."
                    : `Mostrando ${products.length} de ${totalProducts} productos`}
                </p>
                <button
                  type="button"
                  className={styles.headerAction}
                  onClick={() => setShowFilters((prev) => !prev)}
                >
                  {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
                </button>
                <button
                  type="button"
                  className={styles.headerAction}
                  onClick={() => {
                    if (!showFilters) {
                      setShowFilters(true);
                    }
                    setPinFilters((prev) => !prev);
                  }}
                >
                  {pinFilters ? "Desanclar filtros" : "Anclar filtros"}
                </button>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className={`${styles.headerAction} ${styles.headerActionMuted}`}
                    onClick={clearAllFilters}
                  >
                    Limpiar filtros
                  </button>
                ) : null}
              </div>
            </div>

            <div className={styles.chipRow}>
              <button
                type="button"
                className={`${styles.filterChip} ${!hasActiveFilters ? styles.filterChipActive : ""}`}
                onClick={() => setQuickCategory(null)}
              >
                Todo
              </button>
              {quickCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`${styles.filterChip} ${
                    appliedClassifications.some(
                      (classification) =>
                        normalizeClassificationKey(classification) ===
                        normalizeClassificationKey(item),
                    ) && appliedClassifications.length === 1
                      ? styles.filterChipActive
                      : ""
                  }`}
                  onClick={() => setQuickCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className={styles.appliedSummary}>
              {appliedTipos.map((tipo) => (
                <span key={tipo} className={styles.summaryPill}>
                  {formatTipo(tipo)}
                </span>
              ))}
              {appliedReceta === "con" ? (
                <span className={styles.summaryPill}>Con receta</span>
              ) : null}
              {appliedReceta === "sin" ? (
                <span className={styles.summaryPill}>Sin receta</span>
              ) : null}
            </div>
          </header>

          <div className={`${styles.catalogBody} ${!showFilters ? styles.catalogBodyExpanded : ""}`}>
            {showFilters ? (
              <aside
                className={`${styles.filtersCard} ${!pinFilters ? styles.filtersCardFree : ""}`}
              >
                <div className={styles.filtersCardInner}>
                  <h2>Filtros</h2>

                  <div className={styles.filtersGrid}>
                    <div className={styles.filterGroup}>
                      <h3>CATEGORIA</h3>
                      {availableClassifications.map((item) => (
                      <label key={item} className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          checked={draftClassifications.some(
                            (classification) =>
                              normalizeClassificationKey(classification) ===
                              normalizeClassificationKey(item),
                          )}
                          onChange={() => toggleClassification(item)}
                        />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>

                    <div className={styles.filterGroup}>
                      <h3>TIPO DE ADQUISICION</h3>
                      {tipoOptions.map((option) => (
                        <label key={option.value} className={styles.checkLabel}>
                          <input
                            type="checkbox"
                            checked={draftTipos.includes(option.value)}
                            onChange={() => toggleTipo(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className={styles.filterGroup}>
                      <h3>CONDICIONES</h3>
                      <label className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          checked={draftReceta === "sin"}
                          onChange={() =>
                            setDraftReceta((prev) => (prev === "sin" ? null : "sin"))
                          }
                        />
                        <span>Solo sin receta</span>
                      </label>
                      <label className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          checked={draftReceta === "con"}
                          onChange={() =>
                            setDraftReceta((prev) => (prev === "con" ? null : "con"))
                          }
                        />
                        <span>Solo con receta</span>
                      </label>
                    </div>
                  </div>

                  <button type="button" className={styles.applyBtn} onClick={applyFilters}>
                    Aplicar filtros
                  </button>
                </div>
              </aside>
            ) : null}

            <div className={styles.productsColumn}>
              {error ? <p className={styles.error}>{error}</p> : null}

              <div className={`${styles.grid} ${!showFilters ? styles.gridExpanded : ""}`}>
                {!loading && products.length === 0 ? (
                  <article className={styles.empty}>
                    <p>No encontramos productos con esos filtros.</p>
                  </article>
                ) : null}

                {products.map((product) => (
                  <article
                    key={product.id}
                    className={styles.card}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/producto/${product.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/producto/${product.id}`);
                      }
                    }}
                  >
                    <div className={styles.imageWrap}>
                      {product.requiereReceta ? (
                        <span className={styles.recipeBadge}>REQUIERE RECETA</span>
                      ) : null}
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.nombre}
                          className={styles.productImage}
                        />
                      ) : (
                        <div className={styles.imageFallback}>
                          {getProductMonogram(product.nombre)}
                        </div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <h3>{product.nombre}</h3>
                      <p className={styles.classification}>
                        {formatClassificationLabel(product.clasificacion)}
                      </p>
                      <p className={styles.tipo}>{formatTipo(product.tipoAdquisicion)}</p>
                      <p className={styles.priceLabel}>PRECIO</p>
                      <div className={styles.priceRow}>
                        <strong>{formatMoney(product.precio)}</strong>
                        <span className={styles.cardHint}>Abrir detalle</span>
                      </div>
                      {product.stock <= 0 ? (
                        <p className={styles.outOfStockText}>
                          No disponible por falta de stock
                        </p>
                      ) : null}
                      {product.stock <= 0 ? (
                        <button
                          type="button"
                          className={styles.notifyBtn}
                          onClick={(event) => {
                            event.stopPropagation();
                            requestRestockNotification(product.id);
                          }}
                          disabled={notifyRequested.includes(product.id)}
                        >
                          {notifyRequested.includes(product.id)
                            ? "Te notificaremos cuando haya stock"
                            : "Notificarme cuando este disponible"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              {!loading && products.length > 0 ? (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  <span>
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className={styles.page}>Cargando catalogo...</div>}>
      <CatalogoPageContent />
    </Suspense>
  );
}
