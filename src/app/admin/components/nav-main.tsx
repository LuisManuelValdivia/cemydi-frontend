"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from './ui/sidebar'
import { useIsMobile } from '../hooks/use-mobile'
import { cn, matchSidebarPath } from '../lib/utils'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      icon?: LucideIcon
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isMobile = useIsMobile()
  const collapsed = state === "collapsed" && !isMobile

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const subItems = item.items?.length ? item.items : undefined

          if (!subItems) {
            const active =
              item.isActive ?? matchSidebarPath(pathname, item.url)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={active}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon className="size-4 shrink-0" />}
                    {!collapsed && (
                      <span className="flex-1">{item.title}</span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <CollapsibleNavSection
              key={item.title}
              item={item}
              subItems={subItems}
              pathname={pathname}
              collapsed={collapsed}
              isMobile={isMobile}
            />
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function CollapsibleNavSection({
  item,
  subItems,
  pathname,
  collapsed,
  isMobile,
}: {
  item: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
  }
  subItems: { title: string; url: string; icon?: LucideIcon }[]
  pathname: string
  collapsed: boolean
  isMobile: boolean
}) {
  const childActive = subItems.some((sub) =>
    matchSidebarPath(pathname, sub.url),
  )
  const parentActive = item.isActive ?? childActive
  const [open, setOpen] = React.useState(childActive)

  React.useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={parentActive}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {item.icon && <item.icon className="size-4 shrink-0" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-52 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              {item.title}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {subItems.map((subItem) => {
              const subActive = matchSidebarPath(pathname, subItem.url)
              return (
                <DropdownMenuItem key={subItem.url} asChild>
                  <Link
                    href={subItem.url}
                    className={cn(
                      subActive && "bg-accent text-accent-foreground",
                    )}
                  >
                    {subItem.icon && (
                      <subItem.icon className="size-4 shrink-0" />
                    )}
                    {subItem.title}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={parentActive}
          >
            {item.icon && <item.icon className="size-4 shrink-0" />}
            {!collapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                <ChevronRight className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </>
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {subItems.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={matchSidebarPath(pathname, subItem.url)}
                >
                  <Link href={subItem.url}>
                    {subItem.icon && (
                      <subItem.icon className="mr-2 size-4 shrink-0" />
                    )}
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
