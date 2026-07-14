import { cn } from "@/lib/utils"

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
} as const

function Stack({
  className,
  direction = "column",
  spacing = "4",
  align,
  justify,
  wrap,
  as,
  ...props
}: React.ComponentProps<"div"> & {
  direction?: "column" | "row" | { base?: "column" | "row"; sm?: "column" | "row"; md?: "column" | "row"; lg?: "column" | "row"; xl?: "column" | "row" }
  spacing?: string
  align?: keyof typeof alignMap
  justify?: keyof typeof justifyMap
  wrap?: boolean
  as?: "div" | "nav" | "section" | "article" | "main" | "aside" | "header" | "footer"
}) {
  const Tag = as ?? "div"

  const flexDirection = typeof direction === "string"
    ? direction === "row" ? "flex-row" : "flex-col"
    : [
        direction.base && (direction.base === "row" ? "flex-row" : "flex-col"),
        direction.sm && `sm:${direction.sm === "row" ? "flex-row" : "flex-col"}`,
        direction.md && `md:${direction.md === "row" ? "flex-row" : "flex-col"}`,
        direction.lg && `lg:${direction.lg === "row" ? "flex-row" : "flex-col"}`,
        direction.xl && `xl:${direction.xl === "row" ? "flex-row" : "flex-col"}`,
      ]
        .filter(Boolean)
        .join(" ")

  return (
    <Tag
      data-slot="stack"
      className={cn(
        "flex",
        flexDirection,
        spacing && `gap-${spacing}`,
        align && alignMap[align],
        justify && justifyMap[justify],
        wrap && "flex-wrap",
        className
      )}
      {...props}
    />
  )
}

function HStack(props: React.ComponentProps<typeof Stack>) {
  return <Stack {...props} direction="row" />
}

function VStack(props: React.ComponentProps<typeof Stack>) {
  return <Stack {...props} direction="column" />
}

export { Stack, HStack, VStack }
