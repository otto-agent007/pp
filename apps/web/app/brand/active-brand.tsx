import type { CSSProperties } from "react";
import {
  getActiveBrandSkin,
  getBrandSkinCssVariables,
  type BrandSkin,
  type BrandSkinCssVariables,
} from "@pest-patrol/ui-tokens";

export type BrandSkinCssProperties = CSSProperties & BrandSkinCssVariables;

export const activeBrandSkin = getActiveBrandSkin(
  process.env.NEXT_PUBLIC_BRAND_KEY,
);

export function useActiveBrandSkin(): BrandSkin {
  return getActiveBrandSkin(process.env.NEXT_PUBLIC_BRAND_KEY);
}

export function getActiveBrandSkinCssProperties(
  brandSkin: BrandSkin,
): BrandSkinCssProperties {
  return getBrandSkinCssVariables(brandSkin) as BrandSkinCssProperties;
}
