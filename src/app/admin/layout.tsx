import type { ReactNode } from "react"
import NextTopLoader from "nextjs-toploader"

import { AdminThemeProvider } from "./components/admin-theme-provider"
import { AppSidebar } from "./components/app-sidebar"
import { DashboardHeader } from "./components/dashboard-header"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar"

export default async function AdminLayout({ children }: { children: ReactNode }) {
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
