"use client"

import Image from "next/image"
import Link from "next/link"

import { cn } from "../lib/utils"
import { useIsMobile } from "../hooks/use-mobile"
import { useSidebar } from "./ui/sidebar"

export function SidebarBrand() {
  const { state } = useSidebar()
  const isMobile = useIsMobile()
  const collapsed = state === "collapsed" && !isMobile

  return (
    <Link
      href="/admin"
      className={cn(
        "flex min-h-0 min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 no-underline outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed &&
          "max-w-full justify-center gap-0 overflow-hidden px-0 py-2",
      )}
    >
      <Image
        src="/logo01.png"
        alt="CEMYDI"
        width={150}
        height={56}
        className={cn(
          "h-9 w-auto shrink-0 object-contain",
          collapsed && "h-8 w-8 object-contain",
        )}
        priority
      />
      {!collapsed && (
        <div className="flex min-w-0 flex-col gap-0">
          <span className="truncate font-semibold tracking-tight text-[var(--brand-900)]">
            CEMYDI
          </span>
          <span className="truncate text-xs text-muted-foreground">
            Ortopedia · Administración
          </span>
        </div>
      )}
    </Link>
  )
}
