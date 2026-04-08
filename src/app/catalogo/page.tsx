"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CatalogProduct, getCatalogProducts } from "@/services/catalog";

const PAGE_SIZE = 9;
const fallbackClassifications = [
  "Movilidad",
  "Rehabilitación",
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
        const merged = Array.from(
          new Set([...fallbackClassifications, ...serverClassifications]),
        );
        setAvailableClassifications(merged);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo cargar el catálogo.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchCatalog();
  }, [searchQuery, appliedClassifications, appliedTipos, appliedReceta, appliedPage]);

  const currentPage = Math.min(appliedPage, totalPages);

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
    setDraftClassifications((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
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

  return (
    <div className="px-4 py-5">
      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[290px_1fr]">
        <aside className="rounded-[22px] border border-[#dbe4e6] bg-white p-4 lg:sticky lg:top-24 lg:h-fit">
          <h2 className="m-0 text-[1.75rem] text-[#132437]">Filtros</h2>

          <div className="mt-4 grid gap-3 border-t border-[#ecf1f2] pt-[14px]">
            <h3 className="m-0 text-[1.3rem] tracking-[0.02em] text-[#1f2d3a]">CATEGORÍA</h3>
            {availableClassifications.map((item) => (
              <label key={item} className="flex items-center gap-2.5 font-semibold text-[#415462]">
                <input
                  type="checkbox"
                  checked={draftClassifications.includes(item)}
                  onChange={() => toggleClassification(item)}
                  className="size-5 rounded-md"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-2.5 border-t border-[#ecf1f2] pt-[14px]">
            <h3 className="m-0 text-[1.3rem] tracking-[0.02em] text-[#1f2d3a]">TIPO DE ADQUISICIÓN</h3>
            {tipoOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2.5 font-semibold text-[#415462]">
                <input
                  type="checkbox"
                  checked={draftTipos.includes(option.value)}
                  onChange={() => toggleTipo(option.value)}
                  className="size-5 rounded-md"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-2.5 border-t border-[#ecf1f2] pt-[14px]">
            <h3 className="m-0 text-[1.3rem] tracking-[0.02em] text-[#1f2d3a]">CONDICIONES</h3>
            <label className="flex items-center gap-2.5 font-semibold text-[#415462]">
              <input
                type="checkbox"
                checked={draftReceta === "sin"}
                onChange={() =>
                  setDraftReceta((prev) => (prev === "sin" ? null : "sin"))
                }
                className="size-5 rounded-md"
              />
              <span>Solo sin receta</span>
            </label>
            <label className="flex items-center gap-2.5 font-semibold text-[#415462]">
              <input
                type="checkbox"
                checked={draftReceta === "con"}
                onChange={() =>
                  setDraftReceta((prev) => (prev === "con" ? null : "con"))
                }
                className="size-5 rounded-md"
              />
              <span>Solo con receta</span>
            </label>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-[14px] bg-[#1f6a67] px-4 py-3 text-[1.05rem] font-bold text-white"
            onClick={applyFilters}
          >
            Aplicar filtros
          </button>
        </aside>

        <section className="grid min-w-0 gap-4">
          <header className="rounded-[22px] border border-[#dbe4e6] bg-white px-[22px] py-5">
            <h1 className="m-0 text-[2.1rem] text-[#132437] max-[760px]:text-[1.7rem]">
              Catálogo completo
            </h1>
            <p className="mt-2 text-[1.05rem] text-[#5c6f79]">
              {loading
                ? "Buscando productos..."
                : `Mostrando ${products.length} de ${totalProducts} productos`}
            </p>
          </header>

          {error ? (
            <p className="m-0 rounded-xl border border-[#f6caca] bg-[#ffecec] px-3 py-[11px] font-bold text-[#a11d1d]">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {!loading && products.length === 0 ? (
              <article className="col-span-full rounded-2xl border border-[#dbe4e6] bg-white p-6 text-center font-semibold text-[#4f6168]">
                <p>No encontramos productos con esos filtros.</p>
              </article>
            ) : null}

            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-[22px] border border-[#dbe4e6] bg-white"
              >
                <div className="relative grid h-[230px] place-items-center bg-[linear-gradient(140deg,#f2f7f7_0%,#ebf2f3_100%)]">
                  {product.requiereReceta ? (
                    <span className="absolute top-3 left-3 rounded-full bg-[#1f2b3d] px-2.5 py-1 text-[0.74rem] font-extrabold text-white">
                      REQUIERE RECETA
                    </span>
                  ) : null}
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.nombre}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid size-36 place-items-center rounded-[20px] border border-[#d6e2e4] bg-white text-[2.4rem] font-extrabold tracking-[0.04em] text-[#1f6a67]">
                      {getProductMonogram(product.nombre)}
                    </div>
                  )}
                </div>
                <div className="px-4 pt-4 pb-[14px]">
                  <h3 className="m-0 text-[1.5rem] text-[#11223a]">{product.nombre}</h3>
                  <p className="mt-2 mb-1 font-bold text-[#2b6f6d]">{product.clasificacion}</p>
                  <p className="mb-1 text-[0.92rem] font-bold text-[#607781]">
                    {formatTipo(product.tipoAdquisicion)}
                  </p>
                  <p className="m-0 text-[0.88rem] font-bold text-[#8797a0]">PRECIO</p>
                  {product.stock <= 0 ? (
                    <p className="mt-1.5 text-[0.92rem] font-bold text-[#a01919]">
                      No disponible por falta de stock
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <strong className="text-[1.9rem] text-[#195d5a]">
                      {formatMoney(product.precio)}
                    </strong>
                    {product.stock > 0 ? (
                      <Link
                        href={`/producto/${product.id}`}
                        className="grid h-[42px] min-w-[54px] place-items-center rounded-full bg-[#1f6a67] px-[14px] text-[0.95rem] font-bold text-white no-underline"
                      >
                        Ver
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="grid h-[42px] min-w-[54px] place-items-center rounded-full border-0 bg-[#d6dde0] px-[14px] text-[0.95rem] font-bold text-[#6e8088]"
                        disabled
                        aria-disabled="true"
                      >
                        No disponible
                      </button>
                    )}
                  </div>
                  {product.stock <= 0 ? (
                    <button
                      type="button"
                      className="mt-2.5 w-full rounded-xl border border-[#1f6a67] bg-white px-3 py-2.5 text-[0.9rem] font-bold text-[#1f6a67] disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={() => requestRestockNotification(product.id)}
                      disabled={notifyRequested.includes(product.id)}
                    >
                      {notifyRequested.includes(product.id)
                        ? "Te notificaremos cuando haya stock"
                        : "Notificarme cuando esté disponible"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {!loading && products.length > 0 ? (
            <div className="flex items-center justify-end gap-2.5 rounded-[14px] border border-[#dbe4e6] bg-white px-3 py-2.5 max-[760px]:justify-between">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="min-w-24 cursor-pointer rounded-[10px] border border-[#c8d7dc] bg-[#f7fbfb] px-3 py-2 font-bold text-[#1f6a67] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Anterior
              </button>
              <span className="font-bold text-[#506872]">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="min-w-24 cursor-pointer rounded-[10px] border border-[#c8d7dc] bg-[#f7fbfb] px-3 py-2 font-bold text-[#1f6a67] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="px-4 py-5">Cargando catálogo...</div>}>
      <CatalogoPageContent />
    </Suspense>
  );
}
