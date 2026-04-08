import Link from "next/link";
import type { ActivePromotion } from "@/services/catalog";

function getProductMonogram(nombre: string) {
  const clean = nombre.trim().toUpperCase();
  if (!clean) return "PR";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

function formatPriceMXN(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOfferEnd(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

type Props = {
  promotions: ActivePromotion[];
};

export function PromotionsShowcase({ promotions }: Props) {
  const list = promotions.slice(0, 8);

  return (
    <section
      className="relative overflow-hidden py-14 sm:py-20"
      aria-labelledby="promociones-titulo"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(42,159,155,0.14),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute top-24 right-0 size-[min(420px,70vw)] rounded-full bg-[#2a9f9b]/[0.06] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 size-[min(360px,60vw)] rounded-full bg-[#134e4a]/[0.05] blur-3xl" aria-hidden />

      <div className="relative mx-auto w-full max-w-[1120px] px-4">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-[#2f6470] uppercase">
            Ofertas para ti
          </p>
          <h2
            id="promociones-titulo"
            className="m-0 text-[clamp(1.65rem,4vw,2.25rem)] font-bold tracking-tight text-[#0f2a32]"
          >
            Promociones destacadas
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#4a6670] sm:text-[1.05rem]">
            Descuentos y condiciones especiales en equipos y productos seleccionados. Toca una tarjeta
            para ver ficha, precio y disponibilidad.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#c5d8dc] bg-white/80 px-6 py-16 text-center shadow-[0_4px_24px_rgba(15,61,59,0.04)] backdrop-blur-sm">
            <p className="m-0 text-lg font-semibold text-[#1a3d47]">Pronto tendremos nuevas ofertas</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5c7680]">
              Mientras tanto explorá nuestro catálogo completo de ortopedia y equipamiento médico.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#134e4a] px-7 py-3.5 text-sm font-bold text-white no-underline transition hover:bg-[#0f3d3a]"
            >
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 xl:gap-7 [&::-webkit-scrollbar]:hidden"
          >
            {list.map((promotion) => {
              const endLabel = formatOfferEnd(promotion.endAt);
              return (
                <Link
                  key={promotion.id}
                  href={`/producto/${promotion.productId}`}
                  className="group flex min-w-[min(100%,320px)] max-w-[100%] shrink-0 snap-center flex-col overflow-hidden rounded-3xl border border-[#d4e4e7] bg-white no-underline shadow-[0_4px_20px_rgba(19,78,74,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#9cc9c8] hover:shadow-[0_20px_48px_rgba(19,78,74,0.12)] md:min-w-0 md:max-w-none"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#165a5e] via-[#1f7a78] to-[#3dbfb8]">
                    {promotion.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={promotion.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-[clamp(2.5rem,8vw,3.25rem)] font-extrabold tracking-[0.08em] text-white/90">
                          {getProductMonogram(promotion.product.nombre)}
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-[#0a2826]/75 via-[#0a2826]/15 to-transparent"
                      aria-hidden
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-4">
                      <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-[11px] font-extrabold tracking-wide text-[#0d4a45] uppercase shadow-sm backdrop-blur-sm">
                        Oferta
                      </span>
                      {endLabel ? (
                        <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                          Hasta {endLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5 pt-4">
                    <p className="m-0 text-[11px] font-bold tracking-wider text-[#5a7a82] uppercase">
                      {promotion.product.clasificacion}
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-[#0f2a32]">
                      {promotion.product.nombre}
                    </h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[#5a6f76]">
                      {promotion.descripcion?.trim() || "Condición especial vigente en este producto."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-[#e8f0f1] pt-4">
                      <div>
                        <p className="m-0 text-[11px] font-semibold text-[#6b858c] uppercase">Desde</p>
                        <p className="m-0 text-xl font-extrabold tabular-nums text-[#134e4a]">
                          {formatPriceMXN(promotion.product.precio)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-[#1f7a78] transition group-hover:gap-2">
                        Ver producto
                        <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {list.length > 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center rounded-full border-2 border-[#134e4a] bg-transparent px-8 py-3.5 text-sm font-bold text-[#134e4a] no-underline transition hover:bg-[#134e4a] hover:text-white"
            >
              Ver catálogo completo
            </Link>
            <p className="m-0 text-center text-xs text-[#6b858c] sm:text-left">
              Precios y existencias sujetos a cambio. Consultá la ficha del producto.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
