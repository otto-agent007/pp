export const palette = {
  blue: {
    50: "#EFF6FF",
    200: "#BFDBFE",
    900: "#1E3A8A",
  },
  emerald: {
    50: "#ECFDF5",
    200: "#A7F3D0",
    500: "#10B981",
    700: "#047857",
  },
  amber: {
    50: "#FFFBEB",
    200: "#FDE68A",
    500: "#F59E0B",
    700: "#B45309",
  },
  red: {
    50: "#FEF2F2",
    200: "#FECACA",
    700: "#B91C1C",
    800: "#991B1B",
  },
  gray: {
    0: "#FFFFFF",
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    900: "#111827",
  },
} as const;

export const brand = {
  primary: palette.blue[900],
  secondary: palette.amber[500],
  accent: palette.emerald[500],
} as const;

export const semantic = {
  text: {
    primary: palette.gray[900],
    secondary: palette.gray[700],
    muted: palette.gray[500],
    subtle: palette.gray[400],
    inverse: palette.gray[0],
    link: brand.primary,
  },
  background: {
    canvas: palette.gray[50],
    surface: palette.gray[0],
    subtle: palette.gray[100],
    inverse: palette.gray[900],
  },
  border: {
    subtle: palette.gray[200],
    default: palette.gray[300],
    strong: palette.gray[500],
  },
  status: {
    danger: {
      fg: palette.red[700],
      fgStrong: palette.red[800],
      bg: palette.red[50],
      border: palette.red[200],
    },
    success: {
      fg: palette.emerald[700],
      bg: palette.emerald[50],
      border: palette.emerald[200],
      solid: palette.emerald[500],
    },
    warning: {
      fg: palette.amber[700],
      bg: palette.amber[50],
      border: palette.amber[200],
    },
    info: {
      fg: brand.primary,
      bg: palette.blue[50],
      border: palette.blue[200],
    },
  },
} as const;

export const colors = {
  ...brand,
  neutralDark: palette.gray[900],
  neutralLight: palette.gray[50],
} as const;
