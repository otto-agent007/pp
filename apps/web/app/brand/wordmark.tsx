import { useId, useMemo } from "react";

import { suffixSvgIds, wordmarkOnDarkSvg, wordmarkSvg } from "./svgs";

export type WordmarkVariant = "light" | "dark";

export interface WordmarkProps {
  /**
   * Background context the wordmark will sit on.
   * - `light` (default): full-color wordmark with navy text. Use on white,
   *   patrol-blue tint, or other light backgrounds.
   * - `dark`: white wordmark with a soft sky-blue glow. Use on navy or
   *   other dark backgrounds.
   */
  variant?: WordmarkVariant;
  /**
   * Rendered width in pixels. Height scales to preserve the 420 × 96 ratio
   * defined in the source SVG. Defaults to 280 (matches the design-system
   * preview).
   */
  width?: number;
  /**
   * Accessible label. Defaults to "Pest Patrol". Pass `decorative` to render
   * the mark as decoration (no role/aria-label, aria-hidden).
   */
  label?: string | "decorative";
  className?: string;
}

const ASPECT_RATIO = 96 / 420;

export const WORDMARK_PROMOTION_READINESS = {
  activeAssetBoundary: "packages/assets/brand/wordmark.svg",
  mobileLockupBehavior:
    "Use the logomark below 156px full-lockup width; do not squeeze the full wordmark.",
  minimumFullLockupWidthPx: 156,
  productionTitleText: "Pest Patrol",
  referenceDraftBoundary: "docs/design-system/assets/wordmark-options/v3/",
} as const;

/**
 * Pest Patrol full wordmark lockup — shield + "PEST PATROL" + tagline.
 *
 * Picks the correct SVG variant for the surface and suffixes internal IDs
 * per instance so multiple wordmarks can render on the same page without
 * gradients/filters cross-referencing each other.
 */
export function Wordmark({
  variant = "light",
  width = 280,
  label = "Pest Patrol",
  className,
}: WordmarkProps) {
  const reactId = useId();
  const html = useMemo(() => {
    const source = variant === "dark" ? wordmarkOnDarkSvg : wordmarkSvg;
    return suffixSvgIds(source, reactId);
  }, [reactId, variant]);

  const height = Math.round(width * ASPECT_RATIO);
  const decorative = label === "decorative";

  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={className}
      role={decorative ? undefined : "img"}
      style={{
        display: "inline-block",
        width,
        height,
        lineHeight: 0,
      }}
      // SVG content is a static brand asset; the only dynamic edit is ID
      // suffixing.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
