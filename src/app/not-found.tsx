import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[calc(100vh-160px)] items-center justify-center bg-[#f8fbfb] px-5 py-12">
      <div className="w-full max-w-[720px]">
        <p className="mb-2.5 text-[0.82rem] font-bold uppercase tracking-[0.12em] text-[#1e6260]">
          404
        </p>
        <h1 className="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold text-[#0f172a]">
          {"P\u00e1gina no encontrada"}
        </h1>
        <p className="mt-[18px] max-w-[58ch] text-base leading-[1.7] text-[#475569]">
          {"La ruta que buscas no existe o ya no est\u00e1 disponible."}
        </p>

        <div className="mt-7 flex flex-wrap gap-3 max-[720px]:flex-col">
          <Link
            href="/"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full border-0 bg-[#0f3d3b] px-[18px] font-semibold text-white no-underline"
          >
            Ir al inicio
          </Link>
          <Link
            href="/catalogo"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#cfe0e0] px-[18px] font-semibold text-[#0f3d3b] no-underline"
          >
            {"Ver cat\u00e1logo"}
          </Link>
        </div>
      </div>
    </section>
  );
}
