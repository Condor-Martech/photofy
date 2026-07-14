import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const listItemVariants = cva(
  "group/list-item flex w-full items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0",
  {
    variants: {
      variant: {
        default: "hover:bg-muted/50",
        interactive: "cursor-pointer hover:bg-muted/50 active:bg-muted",
        static: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ListItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof listItemVariants>) {
  return (
    <div
      data-slot="list-item"
      className={cn(listItemVariants({ variant }), className)}
      {...props}
    />
  )
}

function ListItemLeading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-item-leading"
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

function ListItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-item-content"
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  )
}

function ListItemTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="list-item-title"
      className={cn("text-sm font-medium leading-tight", className)}
      {...props}
    />
  )
}

function ListItemDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="list-item-description"
      className={cn("truncate text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ListItemTrailing({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-item-trailing"
      className={cn("ml-auto shrink-0", className)}
      {...props}
    />
  )
}

export {
  ListItem,
  listItemVariants,
  ListItemLeading,
  ListItemContent,
  ListItemTitle,
  ListItemDescription,
  ListItemTrailing,
}
