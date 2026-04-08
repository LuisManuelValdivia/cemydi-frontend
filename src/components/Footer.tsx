"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const shouldHideFooter = pathname.startsWith("/admin");

  if (shouldHideFooter) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-white/15 bg-[linear-gradient(180deg,#124543_0%,#0d3432_100%)] text-[#e8f5f4]">
      <div className="mx-auto grid max-w-[1320px] gap-[22px] px-5 pt-6 pb-[18px] md:grid-cols-[1.3fr_1fr_1fr]">
        <section className="grid gap-3">
          <Image
            src="/logo01.png"
            alt="CEMYDI"
            width={110}
            height={42}
            className="h-auto w-[108px] object-contain"
          />
          <p className="m-0 max-w-[420px] leading-[1.45] text-[rgba(232,245,244,0.9)]">
            Ortopedia CEMYDI. Soluciones para movilidad, rehabilitación y equipo
            médico.
          </p>
        </section>

        <section className="grid content-start gap-2">
          <h4 className="m-0 mb-0.5 text-base text-white">Enlaces</h4>
          <Link
            href="/catalogo"
            className="m-0 text-[rgba(232,245,244,0.92)] no-underline hover:text-white hover:underline"
          >
            Catálogo
          </Link>
          <Link
            href="/login"
            className="m-0 text-[rgba(232,245,244,0.92)] no-underline hover:text-white hover:underline"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="m-0 text-[rgba(232,245,244,0.92)] no-underline hover:text-white hover:underline"
          >
            Crear cuenta
          </Link>
        </section>

        <section className="grid content-start gap-2">
          <h4 className="m-0 mb-0.5 text-base text-white">Atención</h4>
          <p className="m-0 text-[rgba(232,245,244,0.92)]">Lunes a Sábado</p>
          <p className="m-0 text-[rgba(232,245,244,0.92)]">9:00 am - 7:00 pm</p>
          <p className="m-0 text-[rgba(232,245,244,0.92)]">contacto@cemydi.com</p>
        </section>
      </div>

      <div className="mx-auto max-w-[1320px] border-t border-white/16 px-5 pt-2.5 pb-[14px] text-[rgba(232,245,244,0.78)]">
        <small>© {new Date().getFullYear()} CEMYDI. Todos los derechos reservados.</small>
      </div>
    </footer>
  );
}
