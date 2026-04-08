"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

/**
 * Solo verificación de sesión ADMIN y redirección (sin carga de datos).
 * Para páginas estáticas o cuando el fetch va en otro efecto.
 */
export function useAdminRouteGate() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.rol !== "ADMIN") {
      router.replace("/perfil");
    }
  }, [authLoading, router, user]);

  const isAdmin = user?.rol === "ADMIN";

  const blockingFullPage =
    authLoading ||
    (!user && !authLoading) ||
    (!!user && !isAdmin);

  return { user, isAdmin, blockingFullPage };
}
