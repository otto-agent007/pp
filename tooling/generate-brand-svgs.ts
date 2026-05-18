import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetDir = join(rootDir, "packages", "assets", "brand");
const outputPath = join(rootDir, "apps", "web", "app", "brand", "svgs.ts");

const svgSources = [
  ["wordmarkSvg", "wordmark.svg"],
  ["wordmarkOnDarkSvg", "wordmark-on-dark.svg"],
  ["logomarkSvg", "logomark.svg"],
] as const;

function readSvg(fileName: string) {
  return readFileSync(join(assetDir, fileName), "utf8").trim();
}

function asTemplateLiteral(value: string) {
  return `\`${value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")}\``;
}

const generatedConstants = svgSources
  .map(
    ([exportName, fileName]) =>
      `export const ${exportName} = ${asTemplateLiteral(readSvg(fileName))};`,
  )
  .join("\n\n");

const output = `/**
 * Generated inline SVG sources for the brand lockups.
 *
 * Source of truth: packages/assets/brand/*.svg
 * Generate with: corepack pnpm brand:generate-svgs
 */

${generatedConstants}

/**
 * Rewrite every \`id="foo"\` and matching \`url(#foo)\` reference inside an SVG
 * string so multiple instances on the same page don't collide on shared IDs.
 *
 * Mirrors the runtime suffixing the brand-logos preview does in the design
 * system handoff (see docs/design-system/preview/brand-logos.html).
 */
export function suffixSvgIds(svg: string, suffix: string): string {
  const cleanSuffix = suffix.replace(/[^a-zA-Z0-9_-]/g, "");
  return svg
    .replace(
      /<svg\\b(?![^>]*\\bstyle=)/,
      '<svg style="display:block;width:100%;height:100%"',
    )
    .replace(/(\\s)id="([a-zA-Z0-9_-]+)"/g, (_match, ws, id) =>
      ws + 'id="' + id + '-' + cleanSuffix + '"',
    )
    .replace(/url\\(#([a-zA-Z0-9_-]+)\\)/g, (_match, id) =>
      'url(#' + id + '-' + cleanSuffix + ')',
    );
}
`;

writeFileSync(outputPath, output, "utf8");
console.log(`Generated ${outputPath}`);
