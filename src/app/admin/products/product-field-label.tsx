import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function ProductFieldLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      {children}
    </span>
  );
}
