"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";

export type UseAdminDataBootstrapOptions = {
  /** Debe ser estable (p. ej. envuelto en useCallback). */
  load: () => Promise<void>;
  /** Mensaje si el error no es instancia de Error. */
  loadErrorFallback: string;
};

/**
 * Redirige a login o perfil si no hay sesión o el rol no es ADMIN,
 * ejecuta `load` para administradores y expone cuándo mostrar bloqueo de pantalla completa.
 */
export function useAdminDataBootstrap({
  load,
  loadErrorFallback,
}: UseAdminDataBootstrapOptions) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.rol !== "ADMIN") {
      router.push("/perfil");
      setInitLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : loadErrorFallback,
          );
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, load, loadErrorFallback]);

  const isAdmin = user?.rol === "ADMIN";

  const blockingFullPage =
    authLoading ||
    (!user && !authLoading) ||
    (!!user && !isAdmin) ||
    (isAdmin && initLoading);

  return {
    user,
    authLoading,
    initLoading,
    isAdmin,
    blockingFullPage,
  };
}
