"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./Header.module.css";

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

  if (pathname.startsWith("/admin")) {
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
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <img
          src="/logo01.png"
          alt="CEMYDI"
          width={150}
          height={56}
          className={styles.logoImg}
        />
      </Link>

      <div className={styles.searchWrap}>
        <form className={styles.searchForm} onSubmit={onSearchSubmit}>
          <span className={styles.searchIcon} aria-hidden="true" />
          <input
            key={`${pathname}-${searchParams.get("q") ?? ""}`}
            name="header-search"
            type="search"
            placeholder="Buscar productos..."
            className={styles.search}
            defaultValue={pathname === "/catalogo" ? (searchParams.get("q") ?? "") : ""}
          />
          <button type="submit" className={styles.searchButton}>
            Buscar
          </button>
        </form>
      </div>

      <nav className={styles.nav}>
        <Link href="/catalogo" className={styles.link}>
          Catalogo
        </Link>

        {loading ? (
          <span className={styles.link}>...</span>
        ) : !user ? (
          <>
            <Link href="/login" className={styles.btnOutline}>
              Iniciar sesion
            </Link>
            <Link href="/register" className={styles.btnSolid}>
              Crear cuenta
            </Link>
          </>
        ) : (
          <>
            <Link href="/mis-rentas" className={styles.link}>
              Mis rentas
            </Link>
            <Link href="/mis-compras" className={styles.link}>
              Mis compras
            </Link>
            {user.rol === "ADMIN" ? (
              <Link href="/admin" className={styles.link}>
                Panel Admin
              </Link>
            ) : (
              <Link href="/perfil" className={styles.link}>
                Mi Perfil
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
