"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  Home,
  LogOut,
  Moon,
  Search,
  Sun,
} from "lucide-react"

import { useAdminTheme } from "./admin-theme-provider"
import { useAuth } from "@/context/AuthContext"
import { logoutUser } from "@/services/auth"
import { AdminUserAvatar } from "./admin-user-avatar"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { SidebarTrigger } from "./ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function DashboardHeader() {
  const { dark, toggleDark } = useAdminTheme()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [modLabel, setModLabel] = React.useState("Ctrl")
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  React.useEffect(() => {
    const isApple = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
    setModLabel(isApple ? "⌘" : "Ctrl")
  }, [])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logoutUser()
    } catch {
      // Si la sesión ya expiró, igual limpiamos el estado local.
    } finally {
      logout()
      router.push("/login")
      setIsLoggingOut(false)
    }
  }

  const displayName = user?.nombre?.trim() || "Cuenta"
  const displayEmail = user?.correo?.trim() || "usuario@cemydi.com"
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--card)] shadow-[0_1px_0_rgba(15,61,59,0.06)]">
      <div className="flex h-[60px] shrink-0 items-center gap-3 px-6 lg:h-16 lg:gap-4 lg:px-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="text-[var(--brand-700)] hover:bg-[color-mix(in_srgb,var(--brand-600)_12%,transparent)] hover:text-[var(--brand-900)]" />
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={6}
            className="max-w-[220px] rounded-[10px] border border-[var(--border-soft)] bg-[var(--card)] px-2.5 py-1.5 text-[var(--text-main)] shadow-md"
          >
            <p className="text-xs font-medium">Menú lateral</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <kbd className="rounded border border-[var(--border-soft)] bg-[var(--surface)] px-1 font-sans">
                {modLabel}
              </kbd>
              <span>+</span>
              <kbd className="rounded border border-[var(--border-soft)] bg-[var(--surface)] px-1.5 font-sans">
                B
              </kbd>
            </p>
          </TooltipContent>
        </Tooltip>
        
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--brand-700)]"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar en el panel…"
            className="h-10 w-full rounded-[14px] border border-[var(--border-soft)] bg-[var(--card)] pl-10 pr-12 text-sm text-[var(--text-main)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:border-[var(--brand-600)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-600)_35%,transparent)]"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">

          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => toggleDark()}
            className="size-9 rounded-full text-[var(--brand-700)] hover:bg-[color-mix(in_srgb,var(--brand-600)_12%,transparent)] hover:text-[var(--brand-900)]"
            aria-pressed={dark}
            aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          >
            {dark ? (
              <Sun className="size-5" aria-hidden />
            ) : (
              <Moon className="size-5" aria-hidden />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 rounded-full text-[var(--brand-700)] hover:bg-[color-mix(in_srgb,var(--brand-600)_12%,transparent)] hover:text-[var(--brand-900)]"
          >
            <Bell className="size-5" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
            <span className="sr-only">Notificaciones</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--border-soft)_82%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,var(--surface))] pl-2 pr-2.5 text-[var(--text-main)] shadow-[0_10px_26px_rgba(15,61,59,0.08)] hover:border-[color-mix(in_srgb,var(--brand-600)_24%,var(--border-soft))] hover:bg-[color-mix(in_srgb,var(--brand-600)_10%,var(--card))] hover:text-[var(--brand-900)]"
              >
                <AdminUserAvatar
                  initials={initials}
                  className="size-8"
                  fallbackClassName="text-sm"
                />
                <div className="hidden min-w-0 text-left sm:grid">
                  <span className="truncate text-sm font-medium">{displayName}</span>
                  <span className="truncate text-xs text-[color-mix(in_srgb,var(--text-muted)_88%,var(--text-main))]">
                    {displayEmail}
                  </span>
                </div>
                <ChevronsUpDown className="hidden size-4 shrink-0 sm:inline-block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border-[var(--border-soft)] bg-[var(--card)] shadow-[var(--shadow-md)]"
            >
              <DropdownMenuItem asChild>
                <Link href="/">
                  <Home />
                  Inicio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/perfil">
                  <BadgeCheck />
                  Ver perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isLoggingOut}
                onSelect={(event) => {
                  event.preventDefault()
                  void handleLogout()
                }}
              >
                <LogOut />
                {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
