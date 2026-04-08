"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/** Evita página actual > total cuando cambia el filtrado. */
export function useClampPage(
  page: number,
  setPage: Dispatch<SetStateAction<number>>,
  totalPages: number,
) {
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);
}

/** Vuelve a la página 1 cuando cambian filtros / orden (deps). */
export function useResetPageOnChange(
  setPage: Dispatch<SetStateAction<number>>,
  deps: unknown[],
) {
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps pasadas explícitamente por el caller
  }, deps);
}
