"use client"

import * as React from "react"
import {
  Package,
  Users,
  BarChart3,
  Settings,
  Tag,
  MonitorCog,
  Truck,
  CreditCard,
  DatabaseIcon,
  BookImage,
  Factory,
  LayersPlus,
  Home,
  MessageSquareText,
  Megaphone,
  Percent,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { SidebarBrand } from "./sidebar-brand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "./ui/sidebar"

const data = {
  navMain: [
    {
      title: "Inicio",
      url: "/admin",
      icon: Home,
    },
    {
      title: "Catalogo",
      url: "#",
      icon: BookImage,
      items: [
        {
          icon: Package,
          title: "Productos",
          url: "/admin/products",
        },
        {
          icon: LayersPlus,
          title: "Categorias",
          url: "/admin/categories",
        },
        {
          icon: Tag,
          title: "Marcas",
          url: "/admin/brands",
        },
        {
          icon: Factory,
          title: "Proveedores",
          url: "/admin/suppliers",
        },
      ],
    },
    {
      title: "Usuarios",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Marketing",
      url: "#",
      icon: Megaphone,
      items: [
        {
          icon: Percent,
          title: "Promociones",
          url: "/admin/promotions",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: BarChart3,
    },{
      title: "Reseñas",
      url: "/admin/reviews",
      icon: MessageSquareText,
    },
    {
      title: "Sistema",
      url: "#",
      icon: MonitorCog,
      items: [
        {
          icon: DatabaseIcon,
          title: "Monitoreo de BD",
          url: "/admin/database",
        },
      ],
    },
    {
      title: "Ajustes",
      url: "#",
      icon: Settings
    },
  ],
  support: [
    {
      name: "Orders",
      url: "#",
      icon: Package,
    },
    {
      name: "Shipping",
      url: "#",
      icon: Truck,
    },
    {
      name: "Payments",
      url: "#",
      icon: CreditCard,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.support} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
