import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb"

type Crumb = {
  label: string
  href?: string
}

const ADMIN_BREADCRUMB_CONFIG: Record<
  string,
  {
    label: string
    parent?: string
  }
> = {
  "/admin": { label: "Inicio" },
  "/admin/products": { label: "Productos", parent: "/admin" },
  "/admin/products/new": { label: "Nuevo producto", parent: "/admin/products" },
  "/admin/categories": { label: "Categorías", parent: "/admin" },
  "/admin/brands": { label: "Marcas", parent: "/admin" },
  "/admin/suppliers": { label: "Proveedores", parent: "/admin" },
  "/admin/promotions": { label: "Promociones", parent: "/admin" },
  "/admin/analytics": { label: "Analytics", parent: "/admin" },
  "/admin/database": { label: "Monitoreo BD", parent: "/admin" },
  "/admin/users": { label: "Usuarios", parent: "/admin" },
  "/admin/reviews": { label: "Reseñas", parent: "/admin" },
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Crumb[]
}

export function PageHeader({ title, subtitle, breadcrumbs }: PageHeaderProps) {
  const pathname = usePathname()

  let resolvedBreadcrumbs: Crumb[] | undefined = breadcrumbs

  // Si no se pasan breadcrumbs explícitos y la ruta está en la sección admin,
  // los construimos dinámicamente a partir de la configuración.
  if ((!resolvedBreadcrumbs || resolvedBreadcrumbs.length === 0) && pathname.startsWith("/admin")) {
    const dynamicCrumbs: Crumb[] = []
    let currentKey: keyof typeof ADMIN_BREADCRUMB_CONFIG | undefined =
      pathname as keyof typeof ADMIN_BREADCRUMB_CONFIG

    // Normalizamos la ruta para ignorar posibles slashes finales
    if (typeof currentKey === "string" && currentKey.endsWith("/") && currentKey !== "/") {
      currentKey = currentKey.slice(0, -1) as keyof typeof ADMIN_BREADCRUMB_CONFIG
    }

    while (currentKey) {
      const node = ADMIN_BREADCRUMB_CONFIG[currentKey]
      dynamicCrumbs.push({ label: node.label, href: currentKey })
      currentKey = node.parent as keyof typeof ADMIN_BREADCRUMB_CONFIG | undefined
    }

    dynamicCrumbs.reverse()

    if (dynamicCrumbs.length > 0) {
      // El último breadcrumb es la página actual, sin href
      const last = dynamicCrumbs[dynamicCrumbs.length - 1]
      resolvedBreadcrumbs = [
        ...dynamicCrumbs.slice(0, -1),
        { label: last.label },
      ]
    }
  }

  const hasBreadcrumbs = resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0

  return (
    <div className="flex flex-col gap-2">
      {hasBreadcrumbs ? (
        <Breadcrumb>
          <BreadcrumbList>
            {resolvedBreadcrumbs!.map((crumb, index) => {
              const isLast = index === resolvedBreadcrumbs!.length - 1

              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href ?? "/admin"}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast ? <BreadcrumbSeparator /> : null}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}
