"use client";

import { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function buildCatalogSearchPath(
  search: string,
  currentParams: { get(name: string): string | null },
  keepFilters: boolean,
) {
  const nextParams = new URLSearchParams();
  const cleanSearch = search.trim();

  if (cleanSearch) {
    nextParams.set("q", cleanSearch);
  }

  if (keepFilters) {
    const clasificaciones = currentParams.get("clasificaciones");
    const tipos = currentParams.get("tipos");
    const receta = currentParams.get("receta");

    if (clasificaciones) {
      nextParams.set("clasificaciones", clasificaciones);
    }
    if (tipos) {
      nextParams.set("tipos", tipos);
    }

    if (receta === "con" || receta === "sin") {
      nextParams.set("receta", receta);
    }
  }

  const query = nextParams.toString();
  return query ? `/catalogo?${query}` : "/catalogo";
}

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldHideHeader = pathname.startsWith("/admin");

  if (shouldHideHeader) {
    return null;
  }

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchValue = String(formData.get("header-search") ?? "");
    const keepFilters = pathname === "/catalogo";
    const destination = buildCatalogSearchPath(
      searchValue,
      searchParams,
      keepFilters,
    );
    router.push(destination);
  };

  return (
    <header className="sticky top-0 z-50 grid items-center gap-3 bg-[linear-gradient(90deg,#1e6260_0%,#2aa09d_100%)] px-4 py-[14px] lg:grid-cols-[auto_1fr_auto] lg:gap-5 lg:px-[60px] lg:py-5">
      <Link href="/" className="flex min-h-0 min-w-0 items-center no-underline">
        <Image
          src="/logo01.png"
          alt="CEMYDI"
          width={150}
          height={56}
          className="block h-auto w-[100px] object-contain"
        />
      </Link>

      <div className="flex justify-center">
        <form className="relative w-full max-w-full lg:max-w-[560px]" onSubmit={onSearchSubmit}>
          <label htmlFor="header-search" className="sr-only">
            Buscar productos
          </label>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
          >
            <svg viewBox="0 0 16 16" className="size-4">
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="2"
              />
              <path
                d="M10.2 10.2 14 14"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </span>
          <input
            id="header-search"
            key={`${pathname}-${searchParams.get("q") ?? ""}`}
            name="header-search"
            type="search"
            placeholder="Buscar productos..."
            className="h-12 w-full rounded-full border border-white/25 bg-white/15 py-0 pr-[104px] pl-11 text-[0.95rem] text-white outline-none placeholder:text-white/82 focus:border-white/55"
            defaultValue={pathname === "/catalogo" ? (searchParams.get("q") ?? "") : ""}
          />
          <button
            type="submit"
            className="absolute top-1/2 right-[6px] h-9 -translate-y-1/2 rounded-full border-0 bg-white/92 px-[14px] font-extrabold text-[#1e6260]"
          >
            Buscar
          </button>
        </form>
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-4 lg:justify-end">
        <Link
          href="/catalogo"
          className="rounded-full px-[10px] py-2 font-bold text-white no-underline hover:bg-white/15"
        >
          Catálogo
        </Link>

        {loading ? (
          <span className="rounded-full px-[10px] py-2 font-bold text-white" aria-hidden="true">
            ...
          </span>
        ) : !user ? (
          <>
            <Link
              href="/login"
              className="rounded-full border-2 border-white px-[22px] py-2.5 font-bold text-white no-underline hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-[22px] py-2.5 font-extrabold text-[#1e6260] no-underline shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-px"
            >
              Crear cuenta
            </Link>
          </>
        ) : (
          <>
            {user.rol === "ADMIN" ? (
              <Link
                href="/admin"
                className="rounded-full px-[10px] py-2 font-bold text-white no-underline hover:bg-white/15"
              >
                Panel Admin
              </Link>
            ) : (
              <Link
                href="/perfil"
                className="rounded-full px-[10px] py-2 font-bold text-white no-underline hover:bg-white/15"
              >
                Mi Perfil
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
