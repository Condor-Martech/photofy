import { cn } from "@/lib/utils"

const containerSizes = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1440px]",
  full: "max-w-full",
} as const

type ContainerSize = keyof typeof containerSizes

const containerPadding = {
  none: "px-0",
  sm: "px-3 sm:px-4",
  md: "px-4 sm:px-6 lg:px-8",
  lg: "px-4 sm:px-8 lg:px-12",
} as const

type ContainerPadding = keyof typeof containerPadding

function Container({
  className,
  size = "lg",
  padding = "md",
  as,
  ...props
}: React.ComponentProps<"div"> & {
  size?: ContainerSize
  padding?: ContainerPadding
  as?: "div" | "section" | "article" | "main" | "header" | "footer" | "nav"
}) {
  const Tag = as ?? "div"
  return (
    <Tag
      data-slot="container"
      className={cn(
        "mx-auto w-full",
        containerSizes[size],
        containerPadding[padding],
        className
      )}
      {...props}
    />
  )
}

export { Container, containerSizes, containerPadding }
export type { ContainerSize, ContainerPadding }
