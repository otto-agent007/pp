import { getActiveBrandSkin } from "@pest-patrol/ui-tokens";

export function getMobileBrandSkin() {
  return getActiveBrandSkin(process.env.EXPO_PUBLIC_BRAND_KEY);
}
