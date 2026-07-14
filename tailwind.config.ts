import type { Config } from "tailwindcss";
import { colors, typography, spacing, breakpoints, borderRadius, shadows } from "./src/design-tokens/tokens";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    screens: breakpoints,
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: colors.neutral[0],
      black: colors.neutral[950],
      brand: colors.primary,
      neutral: colors.neutral,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      info: colors.info,
      background: "var(--background)",
      foreground: "var(--foreground)",
      card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
      popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
      primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
      secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
      muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
      accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
      destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
      border: "var(--border)",
      input: "var(--input)",
      ring: "var(--ring)",
    },
    spacing: {
      px: "1px",
      ...spacing,
    },
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    letterSpacing: typography.letterSpacing,
    borderRadius: {
      ...borderRadius,
    },
    boxShadow: shadows,
    extend: {
      minHeight: {
        "touch": "44px",
        "touch-comfortable": "48px",
      },
      minWidth: {
        "touch": "44px",
        "touch-comfortable": "48px",
      },
    },
  },
  plugins: [],
};

export default config;
