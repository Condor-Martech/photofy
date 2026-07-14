"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Drawer = DialogPrimitive.Root
const DrawerTrigger = DialogPrimitive.Trigger
const DrawerPortal = DialogPrimitive.Portal
const DrawerClose = DialogPrimitive.Close

function DrawerBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity duration-200",
        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

const drawerVariants = cva(
  "fixed z-50 flex flex-col gap-4 border border-border bg-background shadow-xl outline-none transition-transform duration-300 ease-out",
  {
    variants: {
      side: {
        bottom:
          "inset-x-0 bottom-0 rounded-t-2xl border-b-0 max-h-[90dvh] pb-[env(safe-area-inset-bottom,0)] data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
        top:
          "inset-x-0 top-0 rounded-b-2xl border-t-0 max-h-[90dvh] data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
        right:
          "inset-y-0 right-0 w-full max-w-sm border-r-0 data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full sm:max-w-md",
        left:
          "inset-y-0 left-0 w-full max-w-sm border-l-0 data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full sm:max-w-md",
      },
    },
    defaultVariants: {
      side: "bottom",
    },
  },
)

function DrawerContent({
  className,
  children,
  side = "bottom",
  showClose = true,
  showHandle,
  ...props
}: DialogPrimitive.Popup.Props &
  VariantProps<typeof drawerVariants> & {
    showClose?: boolean
    showHandle?: boolean
  }) {
  const resolvedHandle = showHandle ?? side === "bottom"
  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DialogPrimitive.Popup
        data-slot="drawer-content"
        data-side={side}
        className={cn(drawerVariants({ side }), className)}
        {...props}
      >
        {resolvedHandle ? (
          <div
            data-slot="drawer-handle"
            aria-hidden
            className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30"
          />
        ) : null}
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            data-slot="drawer-close"
            className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-9"
            aria-label="Fechar"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 px-5 pt-4", className)}
      {...props}
    />
  )
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("flex-1 overflow-auto px-5 py-2", className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
