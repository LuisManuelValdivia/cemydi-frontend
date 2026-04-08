import { LoaderCircle } from "lucide-react";

import { cn } from "../lib/utils";

type AdminInlineLoadingProps = {
  label: string;
  className?: string;
  minHeightClassName?: string;
};

/** Carga dentro de CardContent u otra sección (no pantalla completa). */
export function AdminInlineLoading({
  label,
  className,
  minHeightClassName = "min-h-72",
}: AdminInlineLoadingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 px-6 py-10 text-sm text-[var(--text-muted)]",
        minHeightClassName,
        className,
      )}
    >
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      {label}
    </div>
  );
}
