"use client"

import * as React from "react"

import { cn } from "@/app/admin/lib/utils"

const STORAGE_KEY = "cemydi-admin-theme"

type AdminThemeContextValue = {
  dark: boolean
  toggleDark: () => void
  setDark: (value: boolean) => void
}

const AdminThemeContext = React.createContext<AdminThemeContextValue | null>(
  null,
)

/** Contenedor para portales (p. ej. Sheet del sidebar móvil) bajo `.dark` y tokens del admin. */
export const AdminPortalContext = React.createContext<HTMLElement | null>(null)

export function useAdminTheme() {
  const ctx = React.useContext(AdminThemeContext)
  if (!ctx) {
    throw new Error("useAdminTheme debe usarse dentro de AdminThemeProvider")
  }
  return ctx
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDarkState] = React.useState(false)
  const [portalEl, setPortalEl] = React.useState<HTMLDivElement | null>(null)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "dark") setDarkState(true)
      if (stored === "light") setDarkState(false)
    } catch {
      /* ignore */
    }
  }, [])

  const setDark = React.useCallback((value: boolean) => {
    setDarkState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value ? "dark" : "light")
    } catch {
      /* ignore */
    }
  }, [])

  const toggleDark = React.useCallback(() => {
    setDarkState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? "dark" : "light")
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = React.useMemo(
    () => ({ dark, toggleDark, setDark }),
    [dark, toggleDark, setDark],
  )

  return (
    <AdminThemeContext.Provider value={value}>
      <AdminPortalContext.Provider value={portalEl}>
        <div
          className={cn(
            "relative flex min-h-svh w-full flex-1 flex-row bg-[var(--surface)] text-[var(--text-main)]",
            dark && "dark",
          )}
          data-admin-theme={dark ? "dark" : "light"}
        >
          {children}
          <div
            ref={setPortalEl}
            className="pointer-events-none fixed inset-0 z-[9999]"
          />
        </div>
      </AdminPortalContext.Provider>
    </AdminThemeContext.Provider>
  )
}
