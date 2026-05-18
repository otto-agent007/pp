/**
 * Inline SVG sources for the brand lockups.
 *
 * Mirrors the assets in `packages/assets/brand/`:
 *   - wordmark.svg            → wordmarkSvg
 *   - wordmark-on-dark.svg    → wordmarkOnDarkSvg
 *   - logomark.svg            → logomarkSvg
 *
 * Keep these strings in sync with the source SVGs. They are rendered via
 * `dangerouslySetInnerHTML` inside the brand components so we can suffix
 * internal element IDs per instance and keep CSS `url(#…)` references intact
 * when a logo is rendered multiple times on the same page.
 */

export const wordmarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 96" width="420" height="96" fill="none">
  <defs>
    <linearGradient id="w-plate" x1="0.3" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#FF4359"></stop>
      <stop offset="0.5" stop-color="#E11D2E"></stop>
      <stop offset="1" stop-color="#A00C1E"></stop>
    </linearGradient>
    <linearGradient id="w-spec" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"></stop>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>
    </linearGradient>
    <linearGradient id="w-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF59E"></stop>
      <stop offset="0.5" stop-color="#FFD300"></stop>
      <stop offset="1" stop-color="#E4A60E"></stop>
    </linearGradient>
    <linearGradient id="w-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"></stop>
      <stop offset="0.42" stop-color="#D6DDE8"></stop>
      <stop offset="0.55" stop-color="#6F7889"></stop>
      <stop offset="1" stop-color="#23283A"></stop>
    </linearGradient>
    <linearGradient id="w-spark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFE0"></stop>
      <stop offset="0.4" stop-color="#FFE65A"></stop>
      <stop offset="1" stop-color="#E8A100"></stop>
    </linearGradient>
    <radialGradient id="w-burst" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFAA8" stop-opacity="0.95"></stop>
      <stop offset="0.5" stop-color="#FFC727" stop-opacity="0.5"></stop>
      <stop offset="1" stop-color="#FFC727" stop-opacity="0"></stop>
    </radialGradient>
    <linearGradient id="w-text" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B2A66"></stop>
      <stop offset="1" stop-color="#071A3D"></stop>
    </linearGradient>
    <filter id="w-neon" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.6" result="blur"></feGaussianBlur>
      <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
    </filter>
  </defs>

  <g transform="translate(50 50) skewX(-7) translate(-50 -50)">
    <path d="M50 14 L80 24 V46 C80 64 67 76 50 82 C33 76 20 64 20 46 V24 Z" fill="url(#w-plate)"></path>
    <path d="M50 14 L80 24 V32 Q62 25 50 25 Q38 25 20 32 V24 Z" fill="url(#w-spec)"></path>
    <path d="M50 14 L80 24 V46 C80 64 67 76 50 82 C33 76 20 64 20 46 V24 Z" fill="none" stroke="url(#w-gold)" stroke-width="2.4" stroke-linejoin="round" filter="url(#w-neon)"></path>
    <path d="M50 17 L77.5 26 V46 C77.5 62.5 65.5 73.5 50 79 C34.5 73.5 22.5 62.5 22.5 46 V26 Z" fill="none" stroke="#FFF6A0" stroke-width="0.6" stroke-linejoin="round" opacity="0.85"></path>

    <g transform="translate(50 47)">
      <g class="anim-burst"><circle cx="0" cy="0" r="22" fill="url(#w-burst)"></circle></g>
    </g>
    <g transform="translate(50 47) rotate(16)">
      <g class="anim-spark">
        <path d="M0 -22 L4.94 -6.8 L20.92 -6.8 L7.99 2.6 L12.93 17.8 L0 8.4 L-12.93 17.8 L-7.99 2.6 L-20.92 -6.8 L-4.94 -6.8 Z" fill="url(#w-spark)" stroke="url(#w-chrome)" stroke-width="2.2" stroke-linejoin="round"></path>
        <path d="M0 -9 L2.02 -2.78 L8.56 -2.78 L3.27 1.06 L5.29 7.28 L0 3.44 L-5.29 7.28 L-3.27 1.06 L-8.56 -2.78 L-2.02 -2.78 Z" fill="#FFFFFF" opacity="0.9"></path>
      </g>
    </g>
  </g>

  <text x="108" y="50" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="36" font-style="italic" fill="url(#w-text)" letter-spacing="-0.5" transform="skewX(-8)">PEST PATROL</text>

  <g transform="skewX(-8)">
    <rect x="109" y="60" width="26" height="3" fill="#1FB8FF" rx="1.5"></rect>
    <text x="140" y="67" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="11.5" font-style="italic" fill="#0EA5E9" letter-spacing="3">SAN DIEGO · EST. 1982</text>
  </g>
</svg>
`;

export const wordmarkOnDarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 96" width="420" height="96" fill="none">
  <defs>
    <linearGradient id="wd-plate" x1="0.3" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#FF4359"></stop>
      <stop offset="0.5" stop-color="#E11D2E"></stop>
      <stop offset="1" stop-color="#A00C1E"></stop>
    </linearGradient>
    <linearGradient id="wd-spec" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.6"></stop>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>
    </linearGradient>
    <linearGradient id="wd-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFCC8"></stop>
      <stop offset="0.5" stop-color="#FFD300"></stop>
      <stop offset="1" stop-color="#FFA700"></stop>
    </linearGradient>
    <linearGradient id="wd-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"></stop>
      <stop offset="0.42" stop-color="#D6DDE8"></stop>
      <stop offset="0.55" stop-color="#6F7889"></stop>
      <stop offset="1" stop-color="#23283A"></stop>
    </linearGradient>
    <linearGradient id="wd-spark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFE0"></stop>
      <stop offset="0.4" stop-color="#FFE65A"></stop>
      <stop offset="1" stop-color="#E8A100"></stop>
    </linearGradient>
    <radialGradient id="wd-burst" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFAA8" stop-opacity="0.95"></stop>
      <stop offset="0.5" stop-color="#FFC727" stop-opacity="0.55"></stop>
      <stop offset="1" stop-color="#FFC727" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="wd-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#1FB8FF" stop-opacity="0.7"></stop>
      <stop offset="1" stop-color="#1FB8FF" stop-opacity="0"></stop>
    </radialGradient>
    <filter id="wd-neon" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" result="blur"></feGaussianBlur>
      <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
    </filter>
  </defs>

  <ellipse cx="50" cy="50" rx="48" ry="44" fill="url(#wd-glow)"></ellipse>

  <g transform="translate(50 50) skewX(-7) translate(-50 -50)">
    <path d="M50 14 L80 24 V46 C80 64 67 76 50 82 C33 76 20 64 20 46 V24 Z" fill="url(#wd-plate)"></path>
    <path d="M50 14 L80 24 V32 Q62 25 50 25 Q38 25 20 32 V24 Z" fill="url(#wd-spec)"></path>
    <path d="M50 14 L80 24 V46 C80 64 67 76 50 82 C33 76 20 64 20 46 V24 Z" fill="none" stroke="url(#wd-gold)" stroke-width="2.6" stroke-linejoin="round" filter="url(#wd-neon)"></path>
    <path d="M50 17 L77.5 26 V46 C77.5 62.5 65.5 73.5 50 79 C34.5 73.5 22.5 62.5 22.5 46 V26 Z" fill="none" stroke="#FFF6A0" stroke-width="0.7" stroke-linejoin="round" opacity="0.95"></path>

    <g transform="translate(50 47)">
      <g class="anim-burst"><circle cx="0" cy="0" r="22" fill="url(#wd-burst)"></circle></g>
    </g>
    <g transform="translate(50 47) rotate(16)">
      <g class="anim-spark">
        <path d="M0 -22 L4.94 -6.8 L20.92 -6.8 L7.99 2.6 L12.93 17.8 L0 8.4 L-12.93 17.8 L-7.99 2.6 L-20.92 -6.8 L-4.94 -6.8 Z" fill="url(#wd-spark)" stroke="url(#wd-chrome)" stroke-width="2.2" stroke-linejoin="round"></path>
        <path d="M0 -9 L2.02 -2.78 L8.56 -2.78 L3.27 1.06 L5.29 7.28 L0 3.44 L-5.29 7.28 L-3.27 1.06 L-8.56 -2.78 L-2.02 -2.78 Z" fill="#FFFFFF" opacity="0.95"></path>
      </g>
    </g>
  </g>

  <text x="108" y="50" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="36" font-style="italic" fill="#FFFFFF" letter-spacing="-0.5" transform="skewX(-8)">PEST PATROL</text>

  <g transform="skewX(-8)">
    <rect x="109" y="60" width="26" height="3" fill="#1FB8FF" rx="1.5"></rect>
    <text x="140" y="67" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="11.5" font-style="italic" fill="#1FB8FF" letter-spacing="3">SAN DIEGO · EST. 1982</text>
  </g>
</svg>
`;

export const logomarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">
  <defs>
    <linearGradient id="lm-plate" x1="0.3" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#FF4359"></stop>
      <stop offset="0.5" stop-color="#E11D2E"></stop>
      <stop offset="1" stop-color="#A00C1E"></stop>
    </linearGradient>
    <linearGradient id="lm-spec" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"></stop>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>
    </linearGradient>
    <linearGradient id="lm-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF59E"></stop>
      <stop offset="0.5" stop-color="#FFD300"></stop>
      <stop offset="1" stop-color="#E4A60E"></stop>
    </linearGradient>
    <linearGradient id="lm-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"></stop>
      <stop offset="0.42" stop-color="#D6DDE8"></stop>
      <stop offset="0.55" stop-color="#6F7889"></stop>
      <stop offset="1" stop-color="#23283A"></stop>
    </linearGradient>
    <linearGradient id="lm-spark-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFE0"></stop>
      <stop offset="0.4" stop-color="#FFE65A"></stop>
      <stop offset="1" stop-color="#E8A100"></stop>
    </linearGradient>
    <radialGradient id="lm-burst" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFAA8" stop-opacity="0.95"></stop>
      <stop offset="0.5" stop-color="#FFC727" stop-opacity="0.5"></stop>
      <stop offset="1" stop-color="#FFC727" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="lm-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#1FB8FF" stop-opacity="0.55"></stop>
      <stop offset="1" stop-color="#1FB8FF" stop-opacity="0"></stop>
    </radialGradient>
    <filter id="lm-neon" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.6" result="blur"></feGaussianBlur>
      <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
    </filter>
  </defs>

  <ellipse cx="50" cy="50" rx="46" ry="44" fill="url(#lm-glow)"></ellipse>

  <g transform="translate(50 50) skewX(-7) translate(-50 -50)">
    <path d="M50 8 L80 18 V40 C80 58 67 70 50 76 C33 70 20 58 20 40 V18 Z" fill="url(#lm-plate)"></path>
    <path d="M50 8 L80 18 V26 Q62 19 50 19 Q38 19 20 26 V18 Z" fill="url(#lm-spec)"></path>
    <path d="M50 8 L80 18 V40 C80 58 67 70 50 76 C33 70 20 58 20 40 V18 Z" fill="none" stroke="url(#lm-gold)" stroke-width="2.4" stroke-linejoin="round" filter="url(#lm-neon)"></path>
    <path d="M50 11 L77.5 20 V40 C77.5 56.5 65.5 67.5 50 73 C34.5 67.5 22.5 56.5 22.5 40 V20 Z" fill="none" stroke="#FFF6A0" stroke-width="0.6" stroke-linejoin="round" opacity="0.85"></path>

    <g transform="translate(50 41)">
      <g class="anim-burst">
        <circle cx="0" cy="0" r="22" fill="url(#lm-burst)"></circle>
      </g>
    </g>

    <g transform="translate(50 41) rotate(16)">
      <g class="anim-spark">
        <path d="M0 -22 L4.94 -6.8 L20.92 -6.8 L7.99 2.6 L12.93 17.8 L0 8.4 L-12.93 17.8 L-7.99 2.6 L-20.92 -6.8 L-4.94 -6.8 Z" fill="url(#lm-spark-fill)" stroke="url(#lm-chrome)" stroke-width="2.2" stroke-linejoin="round"></path>
        <path d="M0 -9 L2.02 -2.78 L8.56 -2.78 L3.27 1.06 L5.29 7.28 L0 3.44 L-5.29 7.28 L-3.27 1.06 L-8.56 -2.78 L-2.02 -2.78 Z" fill="#FFFFFF" opacity="0.9"></path>
      </g>
    </g>
  </g>
</svg>
`;

/**
 * Rewrite every `id="foo"` and matching `url(#foo)` reference inside an SVG
 * string so multiple instances on the same page don't collide on shared IDs.
 *
 * Mirrors the runtime suffixing the brand-logos preview does in the design
 * system handoff (see docs/design-system/preview/brand-logos.html).
 */
export function suffixSvgIds(svg: string, suffix: string): string {
  const cleanSuffix = suffix.replace(/[^a-zA-Z0-9_-]/g, "");
  return svg
    .replace(
      /<svg\b(?![^>]*\bstyle=)/,
      '<svg style="display:block;width:100%;height:100%"',
    )
    .replace(/(\s)id="([a-zA-Z0-9_-]+)"/g, (_match, ws, id) =>
      `${ws}id="${id}-${cleanSuffix}"`,
    )
    .replace(/url\(#([a-zA-Z0-9_-]+)\)/g, (_match, id) =>
      `url(#${id}-${cleanSuffix})`,
    );
}
