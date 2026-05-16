import { primitive } from "./colors";

export const lightTheme = {
  text: {
    primary: primitive.navy[950],
    secondary: primitive.slate[700],
    muted: primitive.slate[500],
    inverse: primitive.white,
  },
  background: {
    canvas: primitive.cream[50],
    surface: primitive.white,
    subtle: primitive.slate[50],
    inverse: primitive.navy[950],
  },
  border: {
    subtle: primitive.slate[200],
    default: primitive.slate[300],
    strong: primitive.navy[800],
  },
  action: {
    primary: primitive.sky[500],
    primaryStrong: primitive.sky[600],
    danger: primitive.red[500],
  },
  status: {
    scheduled: primitive.slate[700],
    enRoute: primitive.sky[500],
    inProgress: primitive.yellow[400],
    completed: primitive.green[500],
    urgent: primitive.red[500],
  },
} as const;

export const darkTheme = {
  text: {
    primary: primitive.white,
    secondary: primitive.slate[300],
    muted: primitive.slate[300],
  },
  background: {
    canvas: primitive.slate[950],
    surface: primitive.slate[800],
    subtle: primitive.navy[900],
  },
  border: {
    subtle: primitive.slate[700],
    default: primitive.slate[500],
    strong: primitive.sky[500],
  },
  action: {
    primary: primitive.sky[500],
    primaryStrong: primitive.sky[600],
    danger: primitive.red[500],
  },
} as const;

export const customerTheme = lightTheme;

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  customer: customerTheme,
} as const;

export const semantic = lightTheme;

export const semanticStatus = {
  scheduled: lightTheme.status.scheduled,
  "en-route": lightTheme.status.enRoute,
  "in-progress": lightTheme.status.inProgress,
  completed: lightTheme.status.completed,
  urgent: lightTheme.status.urgent,
} as const;

export const figmaColorVariables = {
  "primitive/navy/950": primitive.navy[950],
  "primitive/navy/900": primitive.navy[900],
  "primitive/navy/800": primitive.navy[800],
  "primitive/sky/50": primitive.sky[50],
  "primitive/sky/100": primitive.sky[100],
  "primitive/sky/200": primitive.sky[200],
  "primitive/sky/500": primitive.sky[500],
  "primitive/sky/600": primitive.sky[600],
  "primitive/red/50": primitive.red[50],
  "primitive/red/100": primitive.red[100],
  "primitive/red/200": primitive.red[200],
  "primitive/red/500": primitive.red[500],
  "primitive/red/600": primitive.red[600],
  "primitive/yellow/50": primitive.yellow[50],
  "primitive/yellow/100": primitive.yellow[100],
  "primitive/yellow/200": primitive.yellow[200],
  "primitive/yellow/400": primitive.yellow[400],
  "primitive/yellow/500": primitive.yellow[500],
  "primitive/green/50": primitive.green[50],
  "primitive/green/100": primitive.green[100],
  "primitive/green/200": primitive.green[200],
  "primitive/green/500": primitive.green[500],
  "primitive/green/600": primitive.green[600],
  "primitive/cream/50": primitive.cream[50],
  "primitive/slate/50": primitive.slate[50],
  "primitive/slate/100": primitive.slate[100],
  "primitive/slate/200": primitive.slate[200],
  "primitive/slate/300": primitive.slate[300],
  "primitive/slate/500": primitive.slate[500],
  "primitive/slate/700": primitive.slate[700],
  "primitive/slate/950": primitive.slate[950],
  "primitive/slate/800": primitive.slate[800],
  "primitive/white": primitive.white,
  "semantic/light/background/canvas": lightTheme.background.canvas,
  "semantic/light/background/surface": lightTheme.background.surface,
  "semantic/light/background/subtle": lightTheme.background.subtle,
  "semantic/light/background/inverse": lightTheme.background.inverse,
  "semantic/light/border/subtle": lightTheme.border.subtle,
  "semantic/light/border/default": lightTheme.border.default,
  "semantic/light/border/strong": lightTheme.border.strong,
  "semantic/light/text/primary": lightTheme.text.primary,
  "semantic/light/text/secondary": lightTheme.text.secondary,
  "semantic/light/text/muted": lightTheme.text.muted,
  "semantic/light/text/inverse": lightTheme.text.inverse,
  "semantic/light/action/primary": lightTheme.action.primary,
  "semantic/light/action/primary-strong": lightTheme.action.primaryStrong,
  "semantic/light/action/danger": lightTheme.action.danger,
  "semantic/status/scheduled": lightTheme.status.scheduled,
  "semantic/status/en-route": lightTheme.status.enRoute,
  "semantic/status/in-progress": lightTheme.status.inProgress,
  "semantic/status/completed": lightTheme.status.completed,
  "semantic/status/urgent": lightTheme.status.urgent,
  "semantic/dark/background/canvas": darkTheme.background.canvas,
  "semantic/dark/background/surface": darkTheme.background.surface,
  "semantic/dark/background/subtle": darkTheme.background.subtle,
  "semantic/dark/border/subtle": darkTheme.border.subtle,
  "semantic/dark/border/default": darkTheme.border.default,
  "semantic/dark/border/strong": darkTheme.border.strong,
  "semantic/dark/text/primary": darkTheme.text.primary,
  "semantic/dark/text/secondary": darkTheme.text.secondary,
  "semantic/dark/text/muted": darkTheme.text.muted,
  "semantic/dark/action/primary": darkTheme.action.primary,
  "semantic/dark/action/primary-strong": darkTheme.action.primaryStrong,
  "semantic/dark/action/danger": darkTheme.action.danger,
} as const;

export type ThemeName = keyof typeof themes;
export type ThemeToken = typeof lightTheme;
export type ThemeColorGroup = keyof ThemeToken;
export type SemanticStatusToken = keyof typeof semanticStatus;
export type FigmaColorVariableName = keyof typeof figmaColorVariables;
