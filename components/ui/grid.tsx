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

function buildCols(cols: number | Record<string, number | undefined>) {
  if (typeof cols === "number") {
    const n = Math.min(Math.max(cols, 1), 12)
    return `grid-cols-${n}`
  }

  const { base, sm, md, lg, xl, "2xl": xxl } = cols
  const parts: string[] = []

  if (base) parts.push(`grid-cols-${Math.min(Math.max(base, 1), 12)}`)
  if (sm) parts.push(`sm:grid-cols-${Math.min(Math.max(sm, 1), 12)}`)
  if (md) parts.push(`md:grid-cols-${Math.min(Math.max(md, 1), 12)}`)
  if (lg) parts.push(`lg:grid-cols-${Math.min(Math.max(lg, 1), 12)}`)
  if (xl) parts.push(`xl:grid-cols-${Math.min(Math.max(xl, 1), 12)}`)
  if (xxl) parts.push(`2xl:grid-cols-${Math.min(Math.max(xxl, 1), 12)}`)

  return parts.join(" ") || "grid-cols-1"
}

function Grid({
  className,
  cols = 1,
  gap = "4",
  align,
  justify,
  ...props
}: React.ComponentProps<"div"> & {
  cols?: number | { base?: number; sm?: number; md?: number; lg?: number; xl?: number; "2xl"?: number }
  gap?: string
  align?: keyof typeof alignMap
  justify?: keyof typeof justifyMap
}) {
  return (
    <div
      data-slot="grid"
      className={cn(
        "grid",
        buildCols(cols),
        `gap-${gap}`,
        align && alignMap[align],
        justify && justifyMap[justify],
        className
      )}
      {...props}
    />
  )
}

export { Grid }
