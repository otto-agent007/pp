import { lightTheme } from "./themes";
import { primitive } from "./colors";

export const DEFAULT_BRAND_KEY = "pest_patrol" as const;

export type BrandKey = "pest_patrol" | "demo_pest";

export type SidebarLogoKind = "pest_patrol_static" | "text_fallback";

export interface BrandSkinColors {
  sidebarBackground: string;
  sidebarText: string;
  sidebarMutedText: string;
  sidebarActiveBackground: string;
  sidebarActiveText: string;
  sidebarBorder: string;
  actionPrimary: string;
  actionPrimaryStrong: string;
  accent: string;
}

export interface BrandSkin {
  brandKey: BrandKey;
  companyName: string;
  productName: string;
  shortName: string;
  logoAlt: string;
  sidebarLogoKind: SidebarLogoKind;
  sidebarWordmarkLabel: string;
  portalCompanyName: string;
  adminSignInTitle: string;
  mobileHeaderTitle: string;
  colors: BrandSkinColors;
}

export const BRAND_SKINS: Record<BrandKey, BrandSkin> = {
  pest_patrol: {
    brandKey: "pest_patrol",
    companyName: "Pest Patrol",
    productName: "Pest Patrol OS",
    shortName: "Pest Patrol",
    logoAlt: "Pest Patrol OS",
    sidebarLogoKind: "pest_patrol_static",
    sidebarWordmarkLabel: "Pest Patrol OS",
    portalCompanyName: "Pest Patrol",
    adminSignInTitle: "Pest Patrol OS",
    mobileHeaderTitle: "Pest Patrol OS",
    colors: {
      sidebarBackground: primitive.navy[900],
      sidebarText: lightTheme.text.inverse,
      sidebarMutedText: primitive.sky[100],
      sidebarActiveBackground: lightTheme.action.primary,
      sidebarActiveText: lightTheme.text.inverse,
      sidebarBorder: primitive.navy[800],
      actionPrimary: lightTheme.action.primary,
      actionPrimaryStrong: lightTheme.action.primaryStrong,
      accent: primitive.yellow[400],
    },
  },
  demo_pest: {
    brandKey: "demo_pest",
    companyName: "Coastal Shield Pest",
    productName: "Coastal Shield OS",
    shortName: "Coastal Shield",
    logoAlt: "Coastal Shield OS",
    sidebarLogoKind: "text_fallback",
    sidebarWordmarkLabel: "Coastal Shield OS",
    portalCompanyName: "Coastal Shield Pest",
    adminSignInTitle: "Coastal Shield OS",
    mobileHeaderTitle: "Coastal Shield OS",
    colors: {
      sidebarBackground: primitive.slate[950],
      sidebarText: primitive.white,
      sidebarMutedText: primitive.green[100],
      sidebarActiveBackground: primitive.green[500],
      sidebarActiveText: primitive.white,
      sidebarBorder: primitive.green[600],
      actionPrimary: primitive.green[500],
      actionPrimaryStrong: primitive.green[600],
      accent: primitive.yellow[400],
    },
  },
} as const;

export type BrandSkinCssVariableName =
  | "--pp-sidebar-bg"
  | "--pp-sidebar-text"
  | "--pp-sidebar-muted"
  | "--pp-sidebar-active-bg"
  | "--pp-sidebar-active-text"
  | "--pp-sidebar-border"
  | "--pp-action-primary"
  | "--pp-action-primary-strong"
  | "--pp-accent";

export type BrandSkinCssVariables = Record<BrandSkinCssVariableName, string>;

export function isBrandKey(value: string | undefined): value is BrandKey {
  return Boolean(value && value in BRAND_SKINS);
}

export function getBrandSkin(brandKey: string | undefined): BrandSkin {
  return isBrandKey(brandKey) ? BRAND_SKINS[brandKey] : BRAND_SKINS[DEFAULT_BRAND_KEY];
}

export function getActiveBrandSkin(brandKey?: string): BrandSkin {
  return getBrandSkin(brandKey);
}

export function getBrandSkinCssVariables(
  brandSkin: BrandSkin,
): BrandSkinCssVariables {
  return {
    "--pp-sidebar-bg": brandSkin.colors.sidebarBackground,
    "--pp-sidebar-text": brandSkin.colors.sidebarText,
    "--pp-sidebar-muted": brandSkin.colors.sidebarMutedText,
    "--pp-sidebar-active-bg": brandSkin.colors.sidebarActiveBackground,
    "--pp-sidebar-active-text": brandSkin.colors.sidebarActiveText,
    "--pp-sidebar-border": brandSkin.colors.sidebarBorder,
    "--pp-action-primary": brandSkin.colors.actionPrimary,
    "--pp-action-primary-strong": brandSkin.colors.actionPrimaryStrong,
    "--pp-accent": brandSkin.colors.accent,
  };
}

export function isBrandColorValue(value: string): boolean {
  return /^#[0-9A-F]{6}$/.test(value);
}
