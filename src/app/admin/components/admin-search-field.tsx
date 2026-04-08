import { Search } from "lucide-react";

import { cn } from "../lib/utils";
import { Input } from "./ui/input";

type AdminSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  wrapperClassName?: string;
  inputClassName?: string;
};

export function AdminSearchField({
  value,
  onChange,
  placeholder = "Buscar...",
  id,
  wrapperClassName,
  inputClassName,
}: AdminSearchFieldProps) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-11 rounded-md border-[var(--border-soft)] bg-[var(--surface)] pl-10",
          inputClassName,
        )}
      />
    </div>
  );
}
