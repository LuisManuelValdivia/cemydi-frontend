export type SortDirection = "asc" | "desc";

export function compareSort(
  a: string | number,
  b: string | number,
  dir: SortDirection,
): number {
  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), "es", {
      numeric: true,
      sensitivity: "base",
    });
  }
  return dir === "asc" ? cmp : -cmp;
}

/** Id negativo estable para filas sintéticas (p. ej. nombres solo en productos). */
export function syntheticIdForName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return -Math.abs(h || 1);
}

export function formatNumberEsMx(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

export function getPaginationWindow(
  page: number,
  pageSize: number,
  itemCount: number,
): { totalPages: number; resultStart: number; resultEnd: number } {
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const resultStart = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, itemCount);
  return { totalPages, resultStart, resultEnd };
}

/** Números de página intercalados con `"gap"` para mostrar puntos suspensivos. */
export function buildPaginationPageItems(
  totalPages: number,
  currentPage: number,
): Array<number | "gap"> {
  if (totalPages < 1) return [];
  if (totalPages === 1) return [1];
  if (totalPages <= 10) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const clamp = (p: number) => Math.min(Math.max(p, 1), totalPages);
  const set = new Set<number>([
    1,
    totalPages,
    clamp(currentPage - 1),
    currentPage,
    clamp(currentPage + 1),
  ]);
  const sorted = [...set].sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("gap");
    out.push(n);
  }
  return out;
}
