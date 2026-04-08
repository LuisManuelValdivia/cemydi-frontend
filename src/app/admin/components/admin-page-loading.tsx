import { LoaderCircle } from "lucide-react";

import { cn } from "../lib/utils";

type AdminPageLoadingProps = {
  /** section: área principal del listado; viewport: pantalla parcial (p. ej. antes de saber rol). */
  layout?: "section" | "viewport";
  className?: string;
};

export function AdminPageLoading({
  layout = "section",
  className,
}: AdminPageLoadingProps) {
  return (
    <div
      className={cn(
        layout === "viewport"
          ? "flex min-h-[40vh] items-center justify-center text-[var(--text-muted)]"
          : "flex flex-1 items-center justify-center py-24 text-[var(--text-muted)]",
        className,
      )}
    >
      <LoaderCircle className="size-8 animate-spin" aria-hidden />
    </div>
  );
}
