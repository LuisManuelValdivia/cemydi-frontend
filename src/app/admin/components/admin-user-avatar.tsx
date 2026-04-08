"use client"

import { cn } from "../lib/utils"

type AdminUserAvatarProps = {
  initials: string
  className?: string
  fallbackClassName?: string
}

/**
 * Iniciales con fondo de marca. No usa Radix Avatar (solo fallback):
 * así evitamos estados idle/loaded donde el fallback no pinta.
 */
export function AdminUserAvatar({
  initials,
  className,
  fallbackClassName,
}: AdminUserAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--user-avatar-bg)] font-semibold text-white",
        className,
        fallbackClassName,
      )}
    >
      <span className="uppercase tracking-[0.08em] text-white">
        {initials}
      </span>
    </span>
  )
}
