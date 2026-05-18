import type { Config } from "tailwindcss";
import {
  brand,
  darkTheme,
  lightTheme,
  primitive,
  semanticStatus,
  status,
  spacing,
  radius,
  fontSize,
  fontFamily,
  shadow,
} from "@pest-patrol/ui-tokens";

const toPx = <T extends Record<string, number>>(record: T) =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, `${value}px`]),
  ) as Record<keyof T, string>;

const webShadows = Object.fromEntries(
  Object.entries(shadow).map(([key, value]) => [key, value.web]),
);

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primitive,
        primary: brand.primary,
        secondary: brand.secondary,
        accent: brand.accent,
        neutralDark: lightTheme.text.primary,
        neutralLight: lightTheme.background.canvas,
        theme: lightTheme,
        semantic: {
          ...lightTheme,
          light: lightTheme,
          dark: darkTheme,
          status: semanticStatus,
        },
        status,
      },
      spacing: toPx(spacing),
      borderRadius: toPx(radius),
      fontSize: toPx(fontSize),
      fontFamily: {
        sans: [fontFamily.sans],
      },
      boxShadow: webShadows,
    },
  },
  plugins: [],
};
export default config;
