import { buildPaginationPageItems } from "../lib/admin-list-utils";
import { Button } from "./ui/button";

type AdminTablePaginationNumberedProps = {
  resultStart: number;
  resultEnd: number;
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  disableWhenEmpty?: boolean;
};

export function AdminTablePaginationNumbered({
  resultStart,
  resultEnd,
  totalCount,
  page,
  totalPages,
  onPageChange,
  onPrev,
  onNext,
  disableWhenEmpty = true,
}: AdminTablePaginationNumberedProps) {
  const empty = totalCount === 0;
  const navDisabled = disableWhenEmpty && empty;
  const pageItems = buildPaginationPageItems(totalPages, page);

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

        {pageItems.map((item, index) =>
          item === "gap" ? (
            <span
              key={`gap-${index}`}
              className="px-1 text-sm text-[var(--text-muted)]"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(item)}
              className="min-w-9 rounded-md"
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </Button>
          ),
        )}

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
