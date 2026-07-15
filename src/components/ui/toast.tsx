"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import {
  CheckCircle2Icon,
  InfoIcon,
  TriangleAlertIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider
const useToast = ToastPrimitive.useToastManager

const toastIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2Icon,
  error: XCircleIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className={cn(
          "fixed z-50 flex flex-col-reverse gap-2 outline-none",
          "inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0)+1rem)]",
          "sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]",
          className,
        )}
        {...props}
      />
    </ToastPrimitive.Portal>
  )
}

function ToastList() {
  const { toasts } = useToast()
  return (
    <>
      {toasts.map((toast) => {
        const Icon = toast.type ? toastIcon[toast.type] : undefined
        return (
          <ToastPrimitive.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "group/toast relative flex w-full items-start gap-3 rounded-lg border border-border bg-background p-4 shadow-lg outline-none",
              "transition-all duration-200",
              "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
              "data-[ending-style]:opacity-0",
              "data-[type=success]:border-l-4 data-[type=success]:border-l-[color:var(--color-success-500)]",
              "data-[type=error]:border-l-4 data-[type=error]:border-l-[color:var(--color-error-500)]",
              "data-[type=warning]:border-l-4 data-[type=warning]:border-l-[color:var(--color-warning-500)]",
              "data-[type=info]:border-l-4 data-[type=info]:border-l-[color:var(--color-info-500)]",
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  toast.type === "success" && "text-[color:var(--color-success-500)]",
                  toast.type === "error" && "text-[color:var(--color-error-500)]",
                  toast.type === "warning" && "text-[color:var(--color-warning-500)]",
                  toast.type === "info" && "text-[color:var(--color-info-500)]",
                )}
                aria-hidden
              />
            ) : null}
            <div className="flex-1 min-w-0">
              {toast.title ? (
                <ToastPrimitive.Title
                  data-slot="toast-title"
                  className="text-sm font-semibold leading-tight text-foreground"
                />
              ) : null}
              {toast.description ? (
                <ToastPrimitive.Description
                  data-slot="toast-description"
                  className={cn(
                    "text-sm text-muted-foreground",
                    toast.title && "mt-1",
                  )}
                />
              ) : null}
              {toast.actionProps ? (
                <ToastPrimitive.Action
                  data-slot="toast-action"
                  className="mt-2 inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              ) : null}
            </div>
            <ToastPrimitive.Close
              data-slot="toast-close"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-8"
              aria-label="Fechar"
            >
              <XIcon className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
    </>
  )
}

function Toaster({ children, ...props }: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider {...props}>
      {children}
      <ToastViewport>
        <ToastList />
      </ToastViewport>
    </ToastProvider>
  )
}

export { Toaster, ToastProvider, ToastViewport, useToast }
