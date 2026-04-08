import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { SortDirection } from "../lib/admin-list-utils";
import { cn } from "../lib/utils";

type AdminTableSortHeaderProps<T extends string> = {
  column: T;
  activeColumn: T;
  direction: SortDirection;
  onSort: (column: T) => void;
  children: ReactNode;
  className?: string;
};

const iconMuted = "size-3.5 text-[var(--text-muted)]";
const iconActive = "size-3.5 text-[var(--brand-700)]";

/**
 * Botón de cabecera de tabla con iconos de orden (reutilizable en listados admin).
 */
export function AdminTableSortHeader<T extends string>({
  column,
  activeColumn,
  direction,
  onSort,
  children,
  className,
}: AdminTableSortHeaderProps<T>) {
  const active = activeColumn === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1 py-1 font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
      {!active ? (
        <ArrowUpDown className={iconMuted} aria-hidden />
      ) : direction === "asc" ? (
        <ArrowUp className={iconActive} aria-hidden />
      ) : (
        <ArrowDown className={iconActive} aria-hidden />
      )}
    </button>
  );
}
