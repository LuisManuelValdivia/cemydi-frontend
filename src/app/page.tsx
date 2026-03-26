import Link from "next/link";
import { ActivePromotion, getActivePromotions } from "@/services/catalog";

function getProductMonogram(nombre: string) {
  const clean = nombre.trim().toUpperCase();
  if (!clean) return "PR";
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2);
  }

  return `${parts[0][0]}${parts[1][0]}`;
}

async function loadPromotions() {
  try {
    const result = await getActivePromotions();
    return result.promotions;
  } catch {
    return [] as ActivePromotion[];
  }
}

export default async function HomePage() {
  const promotions = await loadPromotions();

  return (
    <>
      <section className="relative flex min-h-[620px] items-center overflow-hidden text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,61,59,.95),rgba(30,98,96,.78),rgba(30,98,96,.25)),url('/rehabilitacion.webp')] bg-cover bg-center" />
        <div className="relative z-[1] mx-auto w-full max-w-[1120px] px-4">
          <div className="max-w-[700px]">
            <span className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[1px]">
              Calidad médica certificada
            </span>

            <h1 className="m-0 text-[clamp(2rem,6vw,4.2rem)] leading-[1.05]">
              Tu bienestar es nuestra prioridad
            </h1>

            <p className="mt-4 mb-7 text-[clamp(1rem,1.8vw,1.2rem)] text-[#dcfce7]">
              Encuentra equipos, ortesis y suministros médicos de alta calidad con garantías seguras
              y asesoría de expertos.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="rounded-full bg-white px-6 py-3.5 font-bold text-[#134e4a] no-underline transition hover:-translate-y-px"
              >
                Explorar catálogo
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-white/40 bg-white/8 px-6 py-3.5 font-bold text-white no-underline transition hover:bg-white/14"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f2f6f7] px-4 pt-6 pb-9">
        <div className="mx-auto grid max-w-[1120px] gap-[14px]">
          <div>
            <h2 className="m-0 text-[1.7rem] text-[#14323f]">Promociones destacadas</h2>
            <p className="mt-1.5 font-semibold text-[#4f6771]">
              Banners interactivos con vigencia activa. Haz clic para ver el producto.
            </p>
          </div>

          <div className="grid gap-[14px] max-[680px]:grid-cols-1 min-[681px]:max-[980px]:grid-cols-2 min-[981px]:grid-cols-3">
            {promotions.length === 0 ? (
              <article className="col-span-full rounded-[14px] border border-dashed border-[#ccdadf] bg-white p-5 text-center font-bold text-[#56707a]">
                <p>No hay promociones activas por ahora.</p>
              </article>
            ) : (
              promotions.slice(0, 8).map((promotion) => (
                <Link
                  key={promotion.id}
                  href={`/producto/${promotion.productId}`}
                  className="overflow-hidden rounded-2xl border border-[#d6e3e6] bg-white no-underline transition hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(24,70,84,0.14)]"
                >
                  <div
                    className="grid h-[140px] place-items-center bg-[linear-gradient(135deg,#215a6a_0%,#2a8f8d_100%)] bg-cover bg-center text-white"
                    style={
                      promotion.imageUrl
                        ? { backgroundImage: `url(${promotion.imageUrl})` }
                        : undefined
                    }
                  >
                    {!promotion.imageUrl ? (
                      <span className="text-[2.6rem] font-extrabold tracking-[0.04em]">
                        {getProductMonogram(promotion.product.nombre)}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <span className="inline-flex rounded-full bg-[#e8f7f0] px-2 py-1 text-[0.74rem] font-extrabold uppercase text-[#1d7d4f]">
                      Promoción activa
                    </span>
                    <h3 className="mt-2.5 mb-1 text-[1.25rem] text-[#16303e]">
                      {promotion.product.nombre}
                    </h3>
                    <p className="m-0 font-bold text-[#2f6470]">{promotion.product.clasificacion}</p>
                    <small className="mt-2 block text-[0.9rem] leading-[1.35] text-[#61767f]">
                      {promotion.descripcion || "Promoción especial vigente."}
                    </small>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
