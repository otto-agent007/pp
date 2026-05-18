import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const scanRoots = [
  join(process.cwd(), "apps", "web", "app"),
  join(process.cwd(), "apps", "mobile", "app"),
  join(process.cwd(), "apps", "mobile", "src"),
];

const ignoredPathPatterns = [
  /(^|[\\/])brand[\\/]svgs\.ts$/,
  /\.test\.[cm]?[tj]sx?$/,
  /\.spec\.[cm]?[tj]sx?$/,
];

const sourceFilePattern = /\.[cm]?[tj]sx?$/;
const hexPattern = /#[0-9A-Fa-f]{6}\b/g;
const arbitraryHexClassPattern = /\b(?:bg|text|border|ring)-\[#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\]/g;
const paletteClassPattern =
  /\b(?:bg|text|border|ring|divide)-(?:emerald|red|amber|yellow|sky|blue|slate|gray|green|orange)-\d{2,3}\b/g;

interface Finding {
  line: number;
  match: string;
  path: string;
}

function isIgnored(filePath: string) {
  const normalized = relative(process.cwd(), filePath).replace(/\\/g, "/");

  return ignoredPathPatterns.some((pattern) => pattern.test(normalized));
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(entryPath);
    }

    if (!entry.isFile() || !sourceFilePattern.test(entry.name) || isIgnored(entryPath)) {
      return [];
    }

    return [entryPath];
  });
}

function collectMatches(filePath: string): Finding[] {
  const text = readFileSync(filePath, "utf8");
  const relativePath = relative(process.cwd(), filePath).replace(/\\/g, "/");

  return text.split(/\r?\n/).flatMap((lineText, index) => {
    const matches = [
      ...lineText.matchAll(hexPattern),
      ...lineText.matchAll(arbitraryHexClassPattern),
      ...lineText.matchAll(paletteClassPattern),
    ];

    return matches.map((match) => ({
      line: index + 1,
      match: match[0],
      path: relativePath,
    }));
  });
}

const findings = scanRoots.flatMap((root) => walk(root).flatMap(collectMatches));

if (findings.length > 0) {
  console.error("Hardcoded app color values are not allowed. Use ui-token utilities instead.");

  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line} ${finding.match}`);
  }

  process.exit(1);
}

console.log("No hardcoded app hex colors or generic palette utilities found.");
