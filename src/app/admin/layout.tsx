import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import NextTopLoader from "nextjs-toploader"

import { AdminThemeProvider } from "./components/admin-theme-provider"
import { AppSidebar } from "./components/app-sidebar"
import { DashboardHeader } from "./components/dashboard-header"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

async function requireAdminSession() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  if (!cookieHeader) {
    redirect("/login")
  }

  try {
    const token = cookieStore.get("cemydi_access")?.value;

    const res = await fetch(`${API_URL}/users/me`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    })

    if (!res.ok) {
      redirect("/login")
    }

    const result = (await res.json()) as { user?: { rol?: string } }
    if (result?.user?.rol !== "ADMIN") {
      redirect("/perfil")
    }
  } catch {
    redirect("/login")
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminSession()

  return (
    <>
      <NextTopLoader
        color="var(--brand-600)"
        height={3}
        showSpinner={false}
        shadow="0 0 12px rgba(43, 162, 161, 0.35)"
        zIndex={99999}
      />
      <AdminThemeProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="admin-route min-h-0 flex-1 bg-[var(--card)] text-[var(--text-main)] antialiased">
            <DashboardHeader />
            {/* px debe coincidir con dashboard-header para alinear breadcrumb con la barra superior */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-6 py-4 lg:px-8 lg:py-5">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </AdminThemeProvider>
    </>
  )
}
