import { Button } from "./ui/button";

type AdminTablePaginationProps = {
  resultStart: number;
  resultEnd: number;
  totalCount: number;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  /** Si true, deshabilita anterior/siguiente cuando no hay filas. */
  disableWhenEmpty?: boolean;
  pageLabel?: "long" | "compact";
};

export function AdminTablePagination({
  resultStart,
  resultEnd,
  totalCount,
  page,
  totalPages,
  onPrev,
  onNext,
  disableWhenEmpty = true,
  pageLabel = "long",
}: AdminTablePaginationProps) {
  const empty = totalCount === 0;
  const navDisabled = disableWhenEmpty && empty;

  return (
    <>
      <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
        Mostrando {resultStart}-{resultEnd} de {totalCount} resultados
      </p>
      <nav
        className="flex flex-wrap items-center gap-2"
        aria-label="Paginación del listado"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md"
          disabled={page === 1 || navDisabled}
          onClick={onPrev}
        >
          Anterior
        </Button>
        <span className="text-sm text-[var(--text-muted)]">
          {pageLabel === "long"
            ? `Página ${page} de ${totalPages}`
            : `${page} / ${totalPages}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md"
          disabled={page === totalPages || navDisabled}
          onClick={onNext}
        >
          Siguiente
        </Button>
      </nav>
    </>
  );
}
