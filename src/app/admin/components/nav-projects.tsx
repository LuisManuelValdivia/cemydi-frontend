"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from './ui/sidebar'

import { useIsMobile } from "../hooks/use-mobile"
import { cn, matchSidebarPath } from "../lib/utils"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isMobile = useIsMobile()
  const collapsed = state === "collapsed" && !isMobile

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={collapsed ? "sr-only" : undefined}>
        Quick Access
      </SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              asChild
              tooltip={item.name}
              isActive={matchSidebarPath(pathname, item.url)}
            >
              <Link
                href={item.url}
                className={cn(collapsed && "justify-center")}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
