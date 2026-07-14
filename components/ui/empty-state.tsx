import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        default: "gap-4 py-12 px-6",
        compact: "gap-2 py-8 px-4",
        fullpage: "gap-6 py-20 px-6 min-h-[60vh]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function EmptyState({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyStateVariants>) {
  return (
    <div
      data-slot="empty-state"
      className={cn(emptyStateVariants({ size }), className)}
      {...props}
    />
  )
}

function EmptyStateIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-icon"
      className={cn(
        "flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-6",
        className
      )}
      {...props}
    />
  )
}

function EmptyStateTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="empty-state-title"
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

function EmptyStateDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("max-w-sm text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function EmptyStateAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-action"
      className={cn("mt-2", className)}
      {...props}
    />
  )
}

export {
  EmptyState,
  emptyStateVariants,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
}
