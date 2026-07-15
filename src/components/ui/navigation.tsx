"use client"

import { cn } from "@/lib/utils"
import { type ReactNode } from "react"

type NavItem = {
  label: string
  icon: ReactNode
  href?: string
  isActive?: boolean
}

function NavItemIcon({ children }: { children: ReactNode }) {
  return (
    <span data-slot="nav-item-icon" className="size-5 shrink-0" aria-hidden>
      {children}
    </span>
  )
}

function NavItemLabel({ children }: { children: ReactNode }) {
  return (
    <span data-slot="nav-item-label" className="text-[10px] leading-none md:text-sm md:leading-none">
      {children}
    </span>
  )
}

function BottomNav({
  className,
  items,
  ...props
}: React.ComponentProps<"nav"> & {
  items: NavItem[]
}) {
  return (
    <nav
      data-slot="bottom-nav"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-border bg-background/80 backdrop-blur-lg supports-[-webkit-backdrop-filter]:bg-background/60",
        "pb-safe pb-[env(safe-area-inset-bottom,0px)]",
        "md:hidden",
        className
      )}
      {...props}
    >
      <ul className="flex items-center justify-around" role="tablist">
        {items.map((item) => (
          <li key={item.label} className="flex-1">
            <a
              href={item.href ?? "#"}
              role="tab"
              aria-selected={item.isActive}
              data-active={item.isActive ? "" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 min-h-touch-comfortable",
                "text-muted-foreground transition-colors",
                "data-active:text-primary"
              )}
            >
              <NavItemIcon>{item.icon}</NavItemIcon>
              <NavItemLabel>{item.label}</NavItemLabel>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Sidebar({
  className,
  items,
  ...props
}: React.ComponentProps<"nav"> & {
  items: NavItem[]
}) {
  return (
    <nav
      data-slot="sidebar"
      className={cn(
        "hidden md:flex md:flex-col md:w-56 md:shrink-0",
        "border-r border-border bg-background",
        className
      )}
      {...props}
    >
      <ul className="flex flex-col gap-1 p-3" role="tablist">
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={item.href ?? "#"}
              role="tab"
              aria-selected={item.isActive}
              data-active={item.isActive ? "" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-touch",
                "text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "data-active:bg-primary/10 data-active:text-primary"
              )}
            >
              <NavItemIcon>{item.icon}</NavItemIcon>
              <NavItemLabel>{item.label}</NavItemLabel>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function AdaptiveNav({
  className,
  items,
  ...props
}: React.ComponentProps<"nav"> & {
  items: NavItem[]
}) {
  return (
    <>
      <BottomNav className={className} items={items} {...props} />
      <Sidebar className={className} items={items} {...props} />
    </>
  )
}

export { BottomNav, Sidebar, AdaptiveNav }
export type { NavItem }
