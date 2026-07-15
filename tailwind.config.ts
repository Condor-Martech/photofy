import type { Config } from "tailwindcss";
import { colors, typography, spacing, breakpoints, borderRadius, shadows } from "./src/design-tokens/tokens";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    screens: breakpoints,
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: colors.neutral[0],
      black: colors.neutral[950],
      primary: colors.primary,
      neutral: colors.neutral,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      info: colors.info,
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
