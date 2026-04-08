"use client"

import * as React from "react"
import {
  BadgeCheck,
  ChevronsUpDown,
  Home,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AdminUserAvatar } from "./admin-user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from './ui/sidebar'

import { useAuth } from "@/context/AuthContext"
import { logoutUser } from "@/services/auth"
import { cn } from "../lib/utils"

function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  )
}

export function NavUser() {
  const { user, loading, logout } = useAuth()
  const { isMobile, state } = useSidebar()
  const router = useRouter()
  const collapsed = state === "collapsed" && !isMobile
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const displayName = user?.nombre?.trim() || (loading ? "Cargando…" : "Cuenta")
  const displayEmail = user?.correo?.trim() || "—"
  const initials = user?.nombre ? initialsFromName(user.nombre) : "U"

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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "border border-[color-mix(in_srgb,var(--border-soft)_82%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,var(--surface))] shadow-[0_10px_24px_rgba(15,61,59,0.08)] data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                collapsed && "justify-center gap-0 px-0",
              )}
            >
              <AdminUserAvatar
                initials={initials}
                className="h-8 w-8 shrink-0 rounded-lg"
                fallbackClassName="rounded-lg text-sm"
              />
              {!collapsed && (
                <>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-[color-mix(in_srgb,var(--text-muted)_88%,var(--text-main))]">
                      {displayEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
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
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
