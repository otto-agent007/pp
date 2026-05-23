export const primitive = {
  navy: {
    950: "#071A3D",
    900: "#0A234F",
    800: "#102F66",
  },
  sky: {
    50: "#E0F2FE",
    100: "#BAE6FD",
    200: "#7DD3FC",
    500: "#0EA5E9",
    600: "#0284C7",
  },
  red: {
    50: "#FEE2E2",
    100: "#FECACA",
    200: "#FCA5A5",
    500: "#E11D2E",
    600: "#C51628",
  },
  yellow: {
    50: "#FEF9C3",
    100: "#FEF3C7",
    200: "#FDE68A",
    400: "#FACC15",
    500: "#EAB308",
  },
  green: {
    50: "#DCFCE7",
    100: "#BBF7D0",
    200: "#86EFAC",
    500: "#16A34A",
    600: "#15803D",
  },
  cream: {
    50: "#F6F2EA",
  },
  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    500: "#64748B",
    700: "#334155",
    800: "#1E293B",
    950: "#0F172A",
  },
  white: "#FFFFFF",
} as const;

export const palette = primitive;

export const brand = {
  primary: primitive.sky[500],
  primaryHover: primitive.sky[600],
  secondary: primitive.yellow[400],
  secondaryHover: primitive.yellow[500],
  accent: primitive.green[500],
  accentHover: primitive.green[600],
  danger: primitive.red[500],
  dangerHover: primitive.red[600],
  inverse: primitive.navy[950],
} as const;

export const colors = {
  primary: brand.primary,
  secondary: brand.secondary,
  accent: brand.accent,
  neutralDark: primitive.navy[950],
  neutralLight: primitive.white,
} as const;

export type PrimitivePaletteFamily = keyof typeof primitive;
export type PaletteFamily = keyof typeof palette;
export type BrandColorToken = keyof typeof brand;
export type LegacyColorToken = keyof typeof colors;
