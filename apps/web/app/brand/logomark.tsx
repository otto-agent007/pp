import { useId, useMemo } from "react";

import { logomarkSvg, suffixSvgIds } from "./svgs";

export interface LogomarkProps {
  /**
   * Rendered size in pixels (the logomark is a 1:1 square — 100 × 100 in
   * source). Defaults to 140 (matches the design-system preview).
   */
  size?: number;
  /**
   * Accessible label. Defaults to "Pest Patrol". Pass `decorative` to render
   * the mark as decoration (no role/aria-label, aria-hidden).
   */
  label?: string | "decorative";
  className?: string;
}

/**
 * Pest Patrol armored-shield logomark — the icon-only mark, no text.
 *
 * Use for compact contexts (favicons, app icons, avatars, tight headers,
 * loaders) where the full wordmark won't fit. Designed for navy/dark
 * surfaces; the soft sky-blue glow assumes a dark backdrop.
 */
export function Logomark({
  size = 140,
  label = "Pest Patrol",
  className,
}: LogomarkProps) {
  const reactId = useId();
  const html = useMemo(() => suffixSvgIds(logomarkSvg, reactId), [reactId]);

  const decorative = label === "decorative";

  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={className}
      role={decorative ? undefined : "img"}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        lineHeight: 0,
      }}
      // eslint-disable-next-line react/no-danger -- SVG content is a static
      // brand asset; the only dynamic edit is ID suffixing.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
