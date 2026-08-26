import { createHash } from "node:crypto";
import { type Dirent, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, posix, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export type ManifestSection =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

export type PackageState = "required" | "planned";

export type OccurrenceClass =
  | "production-value"
  | "production-type"
  | "test-value"
  | "test-type";

export type SyntaxForm = "import" | "export" | "dynamic-import" | "require";

export type AllowedDependency = {
  name: string;
  manifestSections: ManifestSection[];
};

export type PackagePolicy = {
  name: string;
  path: string;
  state: PackageState;
  allowedDependencies: AllowedDependency[];
};

export type SourceOccurrence = {
  path: string;
  specifier: string;
  syntax: SyntaxForm;
  occurrenceClass: OccurrenceClass;
  count: number;
  bindingDigest: string;
};

export type ArchitectureException = {
  id: string;
  kind: "forbidden-workspace-edge" | "missing-manifest-dependency";
  importer: string;
  dependency: string;
  sourceOccurrences: SourceOccurrence[];
  manifest: {
    section: ManifestSection | null;
    versionSpecifier: string | null;
  };
  removeIn: string;
  reason: string;
};

export type ArchitecturePolicy = {
  schemaVersion: 1;
  packages: PackagePolicy[];
  exceptions: ArchitectureException[];
};

export type ManifestDependencyFact = {
  dependency: string;
  section: ManifestSection;
  versionSpecifier: string;
};

export type PackageArchitectureFact = {
  name: string;
  path: string;
  manifestPath: string;
  manifestDependencies: ManifestDependencyFact[];
  sourceOccurrences: SourceOccurrence[];
};

export type WorkspaceArchitectureFacts = {
  packages: PackageArchitectureFact[];
};

export type RebuildGraphFacts = {
  nodes: Array<{ id: string; status: string; ownership: string[] }>;
};

type ObservedViolation = Omit<
  ArchitectureException,
  "id" | "removeIn" | "reason"
>;

type RenderableViolation = {
  manifestPath: string;
  violation: ObservedViolation;
};

const ARCHITECTURE_POLICY_PATH = "tooling/architecture-boundaries.json";
const REBUILD_GRAPH_PATH = "docs/rebuild/graph.json";
const ACTIVE_REMOVAL_STATUSES = new Set(["planned", "ready", "running"]);
const PROMOTED_REMOVAL_STATUSES = new Set(["ready", "running"]);

const MANIFEST_SECTIONS = new Set<ManifestSection>([
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]);
const PACKAGE_STATES = new Set<PackageState>(["required", "planned"]);
const OCCURRENCE_CLASSES = new Set<OccurrenceClass>([
  "production-value",
  "production-type",
  "test-value",
  "test-type",
]);
const SYNTAX_FORMS = new Set<SyntaxForm>([
  "import",
  "export",
  "dynamic-import",
  "require",
]);
const EXCEPTION_KINDS = new Set<ArchitectureException["kind"]>([
  "forbidden-workspace-edge",
  "missing-manifest-dependency",
]);
const EXCLUDED_SOURCE_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "generated",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isSorted(values: readonly string[]) {
  return values.every((value, index) => index === 0 || compareStrings(values[index - 1], value) <= 0);
}

function hasDuplicate(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function isRepositoryRelativePath(value: string) {
  return (
    value.length > 0 &&
    !value.includes("\\") &&
    !posix.isAbsolute(value) &&
    !win32.isAbsolute(value) &&
    win32.parse(value).root.length === 0 &&
    value === posix.normalize(value) &&
    !value.split("/").some((part) => part.length === 0 || part === "." || part === "..")
  );
}

function isPackageName(value: string) {
  return /^@pest-patrol\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isExceptionId(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isManifestSection(value: unknown): value is ManifestSection {
  return typeof value === "string" && MANIFEST_SECTIONS.has(value as ManifestSection);
}

function isPackageState(value: unknown): value is PackageState {
  return typeof value === "string" && PACKAGE_STATES.has(value as PackageState);
}

function occurrenceKey(occurrence: SourceOccurrence) {
  return [
    occurrence.path,
    occurrence.specifier,
    occurrence.syntax,
    occurrence.occurrenceClass,
    String(occurrence.count),
    occurrence.bindingDigest,
  ].join("\u0000");
}

function canonicalViolation(violation: ObservedViolation): ObservedViolation {
  return {
    kind: violation.kind,
    importer: violation.importer,
    dependency: violation.dependency,
    sourceOccurrences: [...violation.sourceOccurrences]
      .sort((left, right) =>
        compareStrings(occurrenceKey(left), occurrenceKey(right))
      )
      .map((occurrence) => ({
        path: occurrence.path,
        specifier: occurrence.specifier,
        syntax: occurrence.syntax,
        occurrenceClass: occurrence.occurrenceClass,
        count: occurrence.count,
        bindingDigest: occurrence.bindingDigest,
      })),
    manifest: {
      section: violation.manifest.section,
      versionSpecifier: violation.manifest.versionSpecifier,
    },
  };
}

function violationKey(violation: ObservedViolation) {
  return JSON.stringify(canonicalViolation(violation));
}

function ownershipCoversPath(ownership: readonly string[], requiredPath: string) {
  return ownership.some(
    (ownedPath) =>
      requiredPath === ownedPath || requiredPath.startsWith(`${ownedPath}/`),
  );
}

function exceptionLabel(value: Record<string, unknown>, index: number) {
  return typeof value.id === "string" && value.id.length > 0
    ? `exception ${value.id}`
    : `exception at index ${index}`;
}

function packageLabel(value: Record<string, unknown>, index: number) {
  return typeof value.name === "string" && value.name.length > 0
    ? `package ${value.name}`
    : `package at index ${index}`;
}

function validateAllowedDependencies(
  value: unknown,
  label: string,
  errors: string[],
): AllowedDependency[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${label} allowedDependencies must be an array`);
    return null;
  }

  const dependencies: Array<AllowedDependency | null> = value.map((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`${label} allowed dependency at index ${index} must be an object`);
      return null;
    }

    const dependencyLabel =
      typeof entry.name === "string" && entry.name.length > 0
        ? `${label} allowed dependency ${entry.name}`
        : `${label} allowed dependency at index ${index}`;
    const name = typeof entry.name === "string" && entry.name.length > 0 ? entry.name : null;
    if (name === null) {
      errors.push(`${dependencyLabel} name must be a non-empty string`);
    }

    const sections = isStringArray(entry.manifestSections) && entry.manifestSections.length > 0
      ? entry.manifestSections
      : null;
    if (sections === null) {
      errors.push(`${dependencyLabel} manifest sections must be a non-empty array`);
    } else {
      if (!sections.every(isManifestSection)) {
        errors.push(`${dependencyLabel} manifest sections are invalid`);
      }
      if (!isSorted(sections)) {
        errors.push(`${dependencyLabel} manifest sections must be sorted`);
      }
      if (hasDuplicate(sections)) {
        const repeatedSection = sections.find(
          (section, sectionIndex) => sections.indexOf(section) !== sectionIndex,
        );
        if (repeatedSection !== undefined) {
          errors.push(`${dependencyLabel} repeats ${repeatedSection}`);
        }
      }
    }

    return name !== null && sections !== null && sections.every(isManifestSection)
      ? { name, manifestSections: sections as ManifestSection[] }
      : null;
  });

  const names = dependencies.flatMap((dependency) => (dependency ? [dependency.name] : []));
  if (names.length === dependencies.filter(Boolean).length && !isSorted(names)) {
    errors.push(`${label} allowed dependencies must be sorted`);
  }
    if (hasDuplicate(names)) {
      for (const name of new Set(names)) {
        if (names.filter((candidate) => candidate === name).length > 1) {
          errors.push(`${label} allowed dependency ${name} is duplicated`);
        }
      }
  }

  return dependencies.every((dependency): dependency is AllowedDependency => dependency !== null)
    ? dependencies
    : null;
}

function validateSourceOccurrences(
  value: unknown,
  label: string,
  dependency: string | null,
  importerPath: string | null,
  errors: string[],
): SourceOccurrence[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${label} sourceOccurrences must be an array`);
    return null;
  }

  const occurrences: Array<SourceOccurrence | null> = value.map((entry, index) => {
    const occurrenceLabel = `${label} occurrence ${index}`;
    if (!isRecord(entry)) {
      errors.push(`${occurrenceLabel} must be an object`);
      return null;
    }
    const path = typeof entry.path === "string" ? entry.path : null;
    if (path === null || !isRepositoryRelativePath(path)) {
      errors.push(`${occurrenceLabel} path must be a normalized repository-relative path`);
    } else if (importerPath !== null && !path.startsWith(`${importerPath}/`)) {
      errors.push(`${occurrenceLabel} path must be inside ${importerPath}`);
    }
    const specifier = typeof entry.specifier === "string" ? entry.specifier : null;
    if (specifier === null || (dependency !== null && specifier !== dependency)) {
      errors.push(`${occurrenceLabel} specifier must be ${dependency ?? "a string"}`);
    }
    const syntax = typeof entry.syntax === "string" && SYNTAX_FORMS.has(entry.syntax as SyntaxForm)
      ? (entry.syntax as SyntaxForm)
      : null;
    if (syntax === null) {
      errors.push(`${occurrenceLabel} syntax is invalid`);
    }
    const occurrenceClass =
      typeof entry.occurrenceClass === "string" && OCCURRENCE_CLASSES.has(entry.occurrenceClass as OccurrenceClass)
        ? (entry.occurrenceClass as OccurrenceClass)
        : null;
    if (occurrenceClass === null) {
      errors.push(`${occurrenceLabel} occurrenceClass is invalid`);
    }
    const count = typeof entry.count === "number" && Number.isSafeInteger(entry.count) && entry.count > 0
      ? entry.count
      : null;
    if (count === null) {
      errors.push(`${occurrenceLabel} count must be a positive integer`);
    }
    const bindingDigest =
      typeof entry.bindingDigest === "string" && /^[0-9a-f]{64}$/.test(entry.bindingDigest)
        ? entry.bindingDigest
        : null;
    if (bindingDigest === null) {
      errors.push(`${occurrenceLabel} bindingDigest must be a lowercase 64-character SHA-256 digest`);
    }

    return path !== null && isRepositoryRelativePath(path) && specifier !== null && syntax !== null && occurrenceClass !== null && count !== null && bindingDigest !== null
      ? { path, specifier, syntax, occurrenceClass, count, bindingDigest }
      : null;
  });

  const validOccurrences = occurrences.filter((occurrence): occurrence is SourceOccurrence => occurrence !== null);
  if (validOccurrences.length === occurrences.length && !isSorted(validOccurrences.map(occurrenceKey))) {
    errors.push(`${label} sourceOccurrences must be sorted`);
  }
  return validOccurrences.length === occurrences.length ? validOccurrences : null;
}

function validateArchitectureException(
  value: unknown,
  index: number,
  packagePaths: ReadonlyMap<string, string>,
  errors: string[],
): ArchitectureException | null {
  if (!isRecord(value)) {
    errors.push(`exception at index ${index} must be an object`);
    return null;
  }
  const label = exceptionLabel(value, index);
  const idCandidate = typeof value.id === "string" && value.id.length > 0
    ? value.id
    : null;
  const id = idCandidate !== null && isExceptionId(idCandidate)
    ? idCandidate
    : null;
  if (idCandidate === null) {
    errors.push(`${label} ID must be a non-empty string`);
  } else if (id === null) {
    errors.push(`${label} ID must be kebab-case`);
  }
  const kind =
    typeof value.kind === "string" && EXCEPTION_KINDS.has(value.kind as ArchitectureException["kind"])
      ? (value.kind as ArchitectureException["kind"])
      : null;
  if (kind === null) errors.push(`${label} kind is invalid`);
  const importer = typeof value.importer === "string" && value.importer.length > 0 ? value.importer : null;
  if (importer === null) {
    errors.push(`${label} importer must be a non-empty package name`);
  } else if (!packagePaths.has(importer)) {
    errors.push(`${label} importer ${importer} must name a policy package`);
  }
  const dependency = typeof value.dependency === "string" && value.dependency.length > 0 ? value.dependency : null;
  if (dependency === null) {
    errors.push(`${label} dependency must be a non-empty package name`);
  } else if (!packagePaths.has(dependency)) {
    errors.push(`${label} dependency ${dependency} must name a policy package`);
  }
  const sourceOccurrences = validateSourceOccurrences(
    value.sourceOccurrences,
    label,
    dependency,
    importer === null ? null : packagePaths.get(importer) ?? null,
    errors,
  );

  let manifest: ArchitectureException["manifest"] | null = null;
  if (!isRecord(value.manifest)) {
    errors.push(`${label} manifest must be an object`);
  } else {
    const section = value.manifest.section;
    const versionSpecifier = value.manifest.versionSpecifier;
    const validSection = section === null || isManifestSection(section);
    const validVersion = versionSpecifier === null || (typeof versionSpecifier === "string" && versionSpecifier.trim().length > 0);
    if (!validSection) errors.push(`${label} manifest section is invalid`);
    if (!validVersion) errors.push(`${label} manifest versionSpecifier must not be blank`);
    if ((section === null) !== (versionSpecifier === null)) {
      errors.push(`${label} manifest section and versionSpecifier must both be null or non-null`);
    }
    if (validSection && validVersion && (section === null) === (versionSpecifier === null)) {
      manifest = { section, versionSpecifier };
    }
  }
  const removeIn = typeof value.removeIn === "string" && /^CR[0-9]+$/.test(value.removeIn) ? value.removeIn : null;
  if (removeIn === null) errors.push(`${label} removeIn must be a CR node ID`);
  const reason = typeof value.reason === "string" && value.reason.trim().length > 0 ? value.reason : null;
  if (reason === null) errors.push(`${label} reason must not be blank`);

  if (kind === "missing-manifest-dependency") {
    if (manifest === null || manifest.section !== null || manifest.versionSpecifier !== null) {
      errors.push(`${label} missing-manifest-dependency manifest must be null`);
    }
    if (sourceOccurrences !== null && sourceOccurrences.length === 0) {
      errors.push(`${label} missing-manifest-dependency must include source occurrences`);
    }
  }

  return id !== null && kind !== null && importer !== null && dependency !== null && sourceOccurrences !== null && manifest !== null && removeIn !== null && reason !== null
    ? { id, kind, importer, dependency, sourceOccurrences, manifest, removeIn, reason }
    : null;
}

export function validateArchitecturePolicy(value: unknown): {
  policy: ArchitecturePolicy | null;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { policy: null, errors: ["policy must be an object"] };
  }
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!Array.isArray(value.packages) || value.packages.length === 0) {
    errors.push("packages must be a non-empty array");
  }
  if (!Array.isArray(value.exceptions)) errors.push("exceptions must be an array");

  const parsedPackages: Array<PackagePolicy | null> = Array.isArray(value.packages)
    ? value.packages.map((entry, index) => {
        if (!isRecord(entry)) {
          errors.push(`package at index ${index} must be an object`);
          return null;
        }
        const label = packageLabel(entry, index);
        const name = typeof entry.name === "string" && entry.name.length > 0 ? entry.name : null;
        if (name === null || !isPackageName(name)) {
          errors.push(`${label} name must be an @pest-patrol/* package name`);
        }
        const path = typeof entry.path === "string" && isRepositoryRelativePath(entry.path) ? entry.path : null;
        if (path === null) {
          errors.push(`${label} path must be a normalized repository-relative path`);
        }
        const state = isPackageState(entry.state) ? entry.state : null;
        if (state === null) errors.push(`${label} state must be required or planned`);
        const allowedDependencies = validateAllowedDependencies(entry.allowedDependencies, label, errors);
        return name !== null && isPackageName(name) && path !== null && state !== null && allowedDependencies !== null
          ? { name, path, state, allowedDependencies }
          : null;
      })
    : [];

  const packages = parsedPackages.filter((entry): entry is PackagePolicy => entry !== null);
  const packageEntries = Array.isArray(value.packages) ? value.packages : [];
  const packageNames = packageEntries.flatMap((entry) =>
    isRecord(entry) && typeof entry.name === "string" && entry.name.length > 0
      ? [entry.name]
      : [],
  );
  if (!isSorted(packageNames)) errors.push("packages must be sorted by name");
  if (hasDuplicate(packageNames)) {
    for (const name of new Set(packageNames)) {
      if (packageNames.filter((candidate) => candidate === name).length > 1) {
        errors.push(`package ${name} name is duplicated`);
      }
    }
  }
  const packagePathCandidates = packageEntries.flatMap((entry, index) => {
    if (!isRecord(entry) || typeof entry.path !== "string") return [];
    return [{ label: packageLabel(entry, index), path: entry.path }];
  });
  const candidatePaths = packagePathCandidates.map((candidate) => candidate.path);
  if (hasDuplicate(candidatePaths)) {
    for (const path of new Set(candidatePaths)) {
      if (candidatePaths.filter((candidate) => candidate === path).length > 1) {
        const owner = packagePathCandidates.find((candidate) => candidate.path === path)?.label ?? "package at index";
        errors.push(`${owner} path ${path} is duplicated`);
      }
    }
  }

  const packagePaths = new Map(packages.map((pkg) => [pkg.name, pkg.path]));
  for (const pkg of packages) {
    for (const dependency of pkg.allowedDependencies) {
      if (!packagePaths.has(dependency.name)) {
        errors.push(`package ${pkg.name} allowed dependency ${dependency.name} must name a policy package`);
      }
      if (dependency.name === pkg.name) {
        errors.push(`package ${pkg.name} allowed dependency ${dependency.name} must not depend on itself`);
      }
    }
  }

  const parsedExceptions: Array<ArchitectureException | null> = Array.isArray(value.exceptions)
    ? value.exceptions.map((entry, index) => validateArchitectureException(entry, index, packagePaths, errors))
    : [];
  const exceptions = parsedExceptions.filter((entry): entry is ArchitectureException => entry !== null);
  const exceptionEntries = Array.isArray(value.exceptions) ? value.exceptions : [];
  const exceptionIds = exceptionEntries.flatMap((entry) =>
    isRecord(entry) && typeof entry.id === "string" && entry.id.length > 0 ? [entry.id] : [],
  );
  if (!isSorted(exceptionIds)) errors.push("exceptions must be sorted by ID");
  if (hasDuplicate(exceptionIds)) {
    for (const id of new Set(exceptionIds)) {
      if (exceptionIds.filter((candidate) => candidate === id).length > 1) {
        errors.push(`exception ${id} is duplicated`);
      }
    }
  }

  const dependenciesByPackage = new Map(
    packages.map((pkg) => [pkg.name, new Set(pkg.allowedDependencies.map((dependency) => dependency.name))]),
  );
  for (const exception of exceptions) {
    if (!packagePaths.has(exception.importer) || !packagePaths.has(exception.dependency)) continue;
    const allowed = dependenciesByPackage.get(exception.importer)?.has(exception.dependency) ?? false;
    if (exception.kind === "forbidden-workspace-edge" && allowed) {
      errors.push(`exception ${exception.id} forbidden-workspace-edge must not be an allowed dependency`);
    }
    if (exception.kind === "missing-manifest-dependency" && !allowed) {
      errors.push(`exception ${exception.id} missing-manifest-dependency must be an allowed dependency`);
    }
  }

  const sortedErrors = errors.sort(compareStrings);
  return sortedErrors.length === 0 && packages.length === parsedPackages.length && exceptions.length === parsedExceptions.length
    ? { policy: { schemaVersion: 1, packages, exceptions }, errors: [] }
    : { policy: null, errors: sortedErrors };
}

function repositoryPath(cwd: string, path: string) {
  return relative(cwd, path).split(sep).join("/");
}

function readText(cwd: string, path: string): string;
function readText(cwd: string, path: string, missingIsAbsent: true): string | null;
function readText(cwd: string, path: string, missingIsAbsent = false) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if (
      missingIsAbsent &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw new Error(`${repositoryPath(cwd, path)}: read failed`);
  }
}

function parseWorkspacePatterns(workspacePath: string, contents: string) {
  const lines = contents.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^packages:\s*$/.test(line));
  if (headerIndex === -1) {
    throw new Error(`${workspacePath}: packages must be a YAML string list`);
  }

  const patterns: string[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.trim().length === 0) continue;
    if (/^\S/.test(line)) break;

    const match = /^\s+-\s+(?:"([^"]*)"|'([^']*)')\s*$/.exec(line);
    if (match === null) {
      throw new Error(`${workspacePath}: packages must be a YAML string list`);
    }
    patterns.push(match[1] ?? match[2]);
  }

  if (patterns.length === 0) {
    throw new Error(`${workspacePath}: packages must be a YAML string list`);
  }
  return patterns;
}

function workspaceRoot(workspacePath: string, pattern: string) {
  const root = pattern.endsWith("/*") ? pattern.slice(0, -2) : null;
  if (root === null || !isRepositoryRelativePath(root) || root.includes("*")) {
    throw new Error(`${workspacePath}: unsupported workspace pattern ${pattern}`);
  }
  return root;
}

function assertWorkspaceRootHasNoSymbolicLinks(cwd: string, root: string) {
  const rootPath = join(cwd, root);
  let componentPath = cwd;
  for (const component of root.split("/")) {
    componentPath = join(componentPath, component);
    let isSymbolicLink: boolean;
    try {
      isSymbolicLink = lstatSync(componentPath).isSymbolicLink();
    } catch {
      throw new Error(`${repositoryPath(cwd, rootPath)}: read failed`);
    }
    if (isSymbolicLink) {
      throw new Error(
        `${repositoryPath(cwd, componentPath)}: symbolic links are not supported`,
      );
    }
  }
}

function manifestDependencies(manifestPath: string, manifest: Record<string, unknown>) {
  const dependencies: ManifestDependencyFact[] = [];
  for (const section of MANIFEST_SECTIONS) {
    const entries = manifest[section];
    if (entries === undefined) continue;
    if (!isRecord(entries)) {
      throw new Error(`${manifestPath}: ${section} must be an object`);
    }
    for (const [dependency, versionSpecifier] of Object.entries(entries)) {
      if (!dependency.startsWith("@pest-patrol/")) continue;
      if (typeof versionSpecifier !== "string") {
        throw new Error(`${manifestPath}: ${section} dependency ${dependency} must be a string`);
      }
      dependencies.push({ dependency, section, versionSpecifier });
    }
  }
  return dependencies.sort((left, right) => {
    const dependencyOrder = compareStrings(left.dependency, right.dependency);
    if (dependencyOrder !== 0) return dependencyOrder;
    const sectionOrder = compareStrings(left.section, right.section);
    return sectionOrder !== 0 ? sectionOrder : compareStrings(left.versionSpecifier, right.versionSpecifier);
  });
}

function canonicalWorkspaceSpecifier(specifier: string) {
  const parts = specifier.split("/");
  return parts[0] === "@pest-patrol" &&
    typeof parts[1] === "string" &&
    parts[1].length > 0
    ? `${parts[0]}/${parts[1]}`
    : null;
}

function sourceFiles(cwd: string, packagePath: string) {
  const files: string[] = [];

  function visit(directoryPath: string) {
    let entries: Dirent[];
    try {
      entries = readdirSync(directoryPath, { withFileTypes: true });
    } catch {
      throw new Error(`${repositoryPath(cwd, directoryPath)}: read failed`);
    }

    for (const entry of entries.sort((left, right) =>
      compareStrings(left.name, right.name),
    )) {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `${repositoryPath(cwd, entryPath)}: symbolic links are not supported`,
        );
      }
      if (entry.isDirectory()) {
        if (!EXCLUDED_SOURCE_DIRECTORIES.has(entry.name)) visit(entryPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
        !entry.name.endsWith(".d.ts")
      ) {
        files.push(entryPath);
      }
    }
  }

  visit(packagePath);
  return files;
}

function isTestSourcePath(sourcePath: string) {
  const segments = sourcePath.split("/");
  const filename = segments[segments.length - 1];
  return (
    segments.includes("__tests__") || /\.(?:test|spec)\.tsx?$/.test(filename)
  );
}

type SourceUse = {
  specifier: string;
  syntax: SyntaxForm;
  isTypeOnly: boolean;
  bindings: string[];
};

function unwrapTransparentExpression(expression: ts.Expression): ts.Expression {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return unwrapTransparentExpression(expression.expression);
  }
  return expression;
}

function importTypeQualifierBinding(qualifier: ts.EntityName | undefined): string {
  if (qualifier === undefined) return "*";
  if (ts.isIdentifier(qualifier)) return qualifier.text;
  return `${importTypeQualifierBinding(qualifier.left)}.${qualifier.right.text}`;
}

function sourceOccurrences(
  cwd: string,
  sourceAbsolutePath: string,
): SourceOccurrence[] {
  const path = repositoryPath(cwd, sourceAbsolutePath);
  const sourceFile = ts.createSourceFile(
    path,
    readText(cwd, sourceAbsolutePath),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const uses: SourceUse[] = [];

  function addUse(
    rawSpecifier: string,
    syntax: SyntaxForm,
    isTypeOnly: boolean,
    bindings: string[],
    isEmptyNamedClause = false,
  ) {
    const specifier = canonicalWorkspaceSpecifier(rawSpecifier);
    if (specifier !== null && (bindings.length > 0 || isEmptyNamedClause)) {
      uses.push({ specifier, syntax, isTypeOnly, bindings });
    }
  }

  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const typeBindings: string[] = [];
      const valueBindings: string[] = [];
      let isEmptyTypeNamedClause = false;
      let isEmptyValueNamedClause = false;
      const clause = node.importClause;
      if (clause === undefined) {
        valueBindings.push("side-effect");
      } else {
        const bindingsFor = (isTypeOnly: boolean) =>
          isTypeOnly ? typeBindings : valueBindings;
        if (clause.name !== undefined)
          bindingsFor(clause.isTypeOnly).push("default");
        if (clause.namedBindings !== undefined) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            bindingsFor(clause.isTypeOnly).push("*");
          } else if (clause.namedBindings.elements.length === 0) {
            if (clause.isTypeOnly) {
              isEmptyTypeNamedClause = true;
            } else {
              isEmptyValueNamedClause = true;
            }
          } else {
            for (const specifier of clause.namedBindings.elements) {
              bindingsFor(clause.isTypeOnly || specifier.isTypeOnly).push(
                (specifier.propertyName ?? specifier.name).text,
              );
            }
          }
        }
      }
      addUse(
        node.moduleSpecifier.text,
        "import",
        false,
        valueBindings,
        isEmptyValueNamedClause,
      );
      addUse(
        node.moduleSpecifier.text,
        "import",
        true,
        typeBindings,
        isEmptyTypeNamedClause,
      );
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const typeBindings: string[] = [];
      const valueBindings: string[] = [];
      let isEmptyTypeNamedClause = false;
      let isEmptyValueNamedClause = false;
      const bindingsFor = (isTypeOnly: boolean) =>
        isTypeOnly ? typeBindings : valueBindings;
      if (
        node.exportClause === undefined ||
        ts.isNamespaceExport(node.exportClause)
      ) {
        bindingsFor(node.isTypeOnly).push("*");
      } else if (node.exportClause.elements.length === 0) {
        if (node.isTypeOnly) {
          isEmptyTypeNamedClause = true;
        } else {
          isEmptyValueNamedClause = true;
        }
      } else {
        for (const specifier of node.exportClause.elements) {
          bindingsFor(node.isTypeOnly || specifier.isTypeOnly).push(
            (specifier.propertyName ?? specifier.name).text,
          );
        }
      }
      addUse(
        node.moduleSpecifier.text,
        "export",
        false,
        valueBindings,
        isEmptyValueNamedClause,
      );
      addUse(
        node.moduleSpecifier.text,
        "export",
        true,
        typeBindings,
        isEmptyTypeNamedClause,
      );
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      addUse(node.argument.literal.text, "import", true, [
        importTypeQualifierBinding(node.qualifier),
      ]);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      addUse(node.moduleReference.expression.text, "import", node.isTypeOnly, [
        "*",
      ]);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const firstArgument = node.arguments[0];
      if (firstArgument !== undefined) {
        const specifier = unwrapTransparentExpression(firstArgument);
        if (ts.isStringLiteral(specifier)) {
          addUse(specifier.text, "dynamic-import", false, ["*"]);
        }
      }
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      const firstArgument = node.arguments[0];
      if (firstArgument !== undefined) {
        const specifier = unwrapTransparentExpression(firstArgument);
        if (ts.isStringLiteral(specifier)) {
          addUse(specifier.text, "require", false, ["*"]);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const grouped = new Map<string, SourceOccurrence & { bindings: string[] }>();
  const testSource = isTestSourcePath(path);
  for (const use of uses) {
    const occurrenceClass: OccurrenceClass = testSource
      ? use.isTypeOnly
        ? "test-type"
        : "test-value"
      : use.isTypeOnly
        ? "production-type"
        : "production-value";
    const key = [path, use.specifier, use.syntax, occurrenceClass].join(
      "\u0000",
    );
    const existing = grouped.get(key);
    if (existing === undefined) {
      grouped.set(key, {
        path,
        specifier: use.specifier,
        syntax: use.syntax,
        occurrenceClass,
        count: 1,
        bindingDigest: "",
        bindings: [...use.bindings],
      });
    } else {
      existing.count += 1;
      existing.bindings.push(...use.bindings);
    }
  }

  return [...grouped.values()]
    .map(({ bindings, ...occurrence }) => ({
      ...occurrence,
      bindingDigest: createHash("sha256")
        .update(JSON.stringify(bindings.sort(compareStrings)))
        .digest("hex"),
    }))
    .sort((left, right) =>
      compareStrings(occurrenceKey(left), occurrenceKey(right)),
    );
}

export function collectWorkspaceArchitectureFacts(cwd: string): WorkspaceArchitectureFacts {
  const workspaceRootPath = resolve(cwd);
  const workspaceFilePath = join(workspaceRootPath, "pnpm-workspace.yaml");
  const workspaceFile = repositoryPath(workspaceRootPath, workspaceFilePath);
  const contents = readText(workspaceRootPath, workspaceFilePath);
  const patterns = parseWorkspacePatterns(workspaceFile, contents);
  const packages: PackageArchitectureFact[] = [];

  for (const pattern of patterns) {
    const root = workspaceRoot(workspaceFile, pattern);
    const rootPath = join(workspaceRootPath, root);
    assertWorkspaceRootHasNoSymbolicLinks(workspaceRootPath, root);
    let children: Dirent[];
    try {
      children = readdirSync(rootPath, { withFileTypes: true });
    } catch {
      throw new Error(`${repositoryPath(workspaceRootPath, rootPath)}: read failed`);
    }
    for (const child of children.sort((left, right) =>
      compareStrings(left.name, right.name)
    )) {
      const childPath = join(rootPath, child.name);
      if (child.isSymbolicLink()) {
        throw new Error(
          `${repositoryPath(workspaceRootPath, childPath)}: symbolic links are not supported`,
        );
      }
      if (!child.isDirectory()) continue;
      const packagePath = `${root}/${child.name}`;
      const manifestAbsolutePath = join(childPath, "package.json");
      const manifestFile = repositoryPath(workspaceRootPath, manifestAbsolutePath);
      const manifestText = readText(workspaceRootPath, manifestAbsolutePath, true);
      if (manifestText === null) continue;

      let manifest: unknown;
      try {
        manifest = JSON.parse(manifestText);
      } catch {
        throw new Error(`${manifestFile}: invalid JSON`);
      }
      if (!isRecord(manifest) || typeof manifest.name !== "string" || manifest.name.trim().length === 0) {
        throw new Error(`${manifestFile}: name must be a non-empty string`);
      }
      packages.push({
        name: manifest.name,
        path: packagePath,
        manifestPath: manifestFile,
        manifestDependencies: manifestDependencies(manifestFile, manifest),
        sourceOccurrences: sourceFiles(
          workspaceRootPath,
          childPath,
        )
          .flatMap((sourcePath) =>
            sourceOccurrences(workspaceRootPath, sourcePath),
          )
          .sort((left, right) =>
            compareStrings(occurrenceKey(left), occurrenceKey(right)),
          ),
      });
    }
  }

  return {
    packages: packages.sort((left, right) => {
      const nameOrder = compareStrings(left.name, right.name);
      return nameOrder !== 0 ? nameOrder : compareStrings(left.path, right.path);
    }),
  };
}

export function validateArchitectureFacts(
  policy: ArchitecturePolicy,
  facts: WorkspaceArchitectureFacts,
  rebuildGraph: RebuildGraphFacts,
): string[] {
  const errors: string[] = [];
  const policyByName = new Map(policy.packages.map((pkg) => [pkg.name, pkg]));
  const policyByPath = new Map(policy.packages.map((pkg) => [pkg.path, pkg]));
  const observedPolicyPackages = new Set<string>();
  const exactPackageFacts = new Map<string, PackageArchitectureFact>();

  for (const fact of facts.packages) {
    const policyForName = policyByName.get(fact.name);
    const policyForPath = policyByPath.get(fact.path);
    if (policyForName !== undefined) {
      observedPolicyPackages.add(policyForName.name);
      if (fact.path !== policyForName.path) {
        errors.push(
          `package ${fact.name} found at ${fact.path}; expected ${policyForName.path}`,
        );
      } else {
        exactPackageFacts.set(policyForName.name, fact);
      }
    } else if (policyForPath !== undefined) {
      observedPolicyPackages.add(policyForPath.name);
      errors.push(
        `package at ${fact.path} has name ${fact.name}; expected ${policyForPath.name}`,
      );
    } else {
      errors.push(
        `discovered package ${fact.name} at ${fact.path} is missing from policy`,
      );
    }
  }

  for (const pkg of policy.packages) {
    if (pkg.state === "required" && !observedPolicyPackages.has(pkg.name)) {
      errors.push(`required package ${pkg.name} is missing at ${pkg.path}`);
    }
  }

  const renderableViolations: RenderableViolation[] = [];
  for (const importerPolicy of policy.packages) {
    const importerFact = exactPackageFacts.get(importerPolicy.name);
    if (importerFact === undefined) continue;

    const manifestsByDependency = new Map<string, ManifestDependencyFact[]>();
    for (const manifest of importerFact.manifestDependencies) {
      const manifests = manifestsByDependency.get(manifest.dependency) ?? [];
      manifests.push(manifest);
      manifestsByDependency.set(manifest.dependency, manifests);
    }
    const occurrencesByDependency = new Map<string, SourceOccurrence[]>();
    for (const occurrence of importerFact.sourceOccurrences) {
      const occurrences = occurrencesByDependency.get(occurrence.specifier) ?? [];
      occurrences.push(occurrence);
      occurrencesByDependency.set(occurrence.specifier, occurrences);
    }

    const dependencies = new Set([
      ...manifestsByDependency.keys(),
      ...occurrencesByDependency.keys(),
    ]);
    for (const dependency of dependencies) {
      const manifests = [...(manifestsByDependency.get(dependency) ?? [])]
        .sort((left, right) => {
          const sectionOrder = compareStrings(left.section, right.section);
          return sectionOrder !== 0
            ? sectionOrder
            : compareStrings(left.versionSpecifier, right.versionSpecifier);
        });
      const sourceOccurrences = [
        ...(occurrencesByDependency.get(dependency) ?? []),
      ].sort((left, right) =>
        compareStrings(occurrenceKey(left), occurrenceKey(right))
      );
      const allowedDependency = importerPolicy.allowedDependencies.find(
        (candidate) => candidate.name === dependency,
      );

      if (allowedDependency === undefined) {
        const manifestEvidence = manifests.length === 0
          ? [{ section: null, versionSpecifier: null }]
          : manifests.map(({ section, versionSpecifier }) => ({
              section,
              versionSpecifier,
            }));
        for (const manifest of manifestEvidence) {
          renderableViolations.push({
            manifestPath: importerFact.manifestPath,
            violation: {
              kind: "forbidden-workspace-edge",
              importer: importerPolicy.name,
              dependency,
              sourceOccurrences,
              manifest,
            },
          });
        }
        continue;
      }

      const allowedSections = new Set(allowedDependency.manifestSections);
      for (const manifest of manifests) {
        if (!allowedSections.has(manifest.section)) {
          renderableViolations.push({
            manifestPath: importerFact.manifestPath,
            violation: {
              kind: "forbidden-workspace-edge",
              importer: importerPolicy.name,
              dependency,
              sourceOccurrences,
              manifest: {
                section: manifest.section,
                versionSpecifier: manifest.versionSpecifier,
              },
            },
          });
        }
      }

      const suitableForEveryOccurrence = sourceOccurrences.every(
        (occurrence) => manifests.some((manifest) => {
          if (!allowedSections.has(manifest.section)) return false;
          return occurrence.occurrenceClass === "test-type" ||
            occurrence.occurrenceClass === "test-value" ||
            manifest.section !== "devDependencies";
        }),
      );
      if (!suitableForEveryOccurrence) {
        renderableViolations.push({
          manifestPath: importerFact.manifestPath,
          violation: {
            kind: "missing-manifest-dependency",
            importer: importerPolicy.name,
            dependency,
            sourceOccurrences,
            manifest: { section: null, versionSpecifier: null },
          },
        });
      }
    }
  }

  const rebuildNodeById = new Map(
    rebuildGraph.nodes.map((node) => [node.id, node]),
  );
  for (const exception of policy.exceptions) {
    const edge = `${exception.importer} -> ${exception.dependency}`;
    const removalNode = rebuildNodeById.get(exception.removeIn);
    if (removalNode === undefined) {
      errors.push(
        `exception ${exception.id} for ${edge} has unknown removal node ${exception.removeIn}`,
      );
      continue;
    }
    if (!ACTIVE_REMOVAL_STATUSES.has(removalNode.status)) {
      errors.push(
        `exception ${exception.id} for ${edge} has invalid removal node ${exception.removeIn} status ${removalNode.status}`,
      );
      continue;
    }
    if (!PROMOTED_REMOVAL_STATUSES.has(removalNode.status)) continue;

    const importerPath = policyByName.get(exception.importer)?.path;
    const requiredPaths = new Set([ARCHITECTURE_POLICY_PATH]);
    if (importerPath !== undefined) {
      requiredPaths.add(`${importerPath}/package.json`);
    }
    for (const occurrence of exception.sourceOccurrences) {
      requiredPaths.add(occurrence.path);
    }
    for (const requiredPath of [...requiredPaths].sort(compareStrings)) {
      if (!ownershipCoversPath(removalNode.ownership, requiredPath)) {
        errors.push(
          `exception ${exception.id} for ${edge} removal node ${exception.removeIn} does not own ${requiredPath}`,
        );
      }
    }
  }

  const violationKeys = renderableViolations.map(({ violation }) =>
    violationKey(violation)
  );
  const matchedViolationIds = new Map<number, string>();
  for (const exception of policy.exceptions) {
    const edge = `${exception.importer} -> ${exception.dependency}`;
    const exceptionKey = violationKey(exception);
    const matchingViolationIndices = violationKeys.flatMap((key, index) =>
      key === exceptionKey ? [index] : []
    );
    const unmatchedViolationIndex = matchingViolationIndices.find(
      (index) => !matchedViolationIds.has(index),
    );
    if (unmatchedViolationIndex !== undefined) {
      matchedViolationIds.set(unmatchedViolationIndex, exception.id);
      continue;
    }
    if (matchingViolationIndices.length === 0) {
      errors.push(
        `exception ${exception.id} is stale or drifted for ${edge}`,
      );
      continue;
    }
    const matchedExceptionId = matchedViolationIds.get(
      matchingViolationIndices[0],
    );
    errors.push(
      `exception ${exception.id} contradicts ${matchedExceptionId} for ${edge}: both match one observed violation`,
    );
  }

  for (const [index, { manifestPath, violation }] of renderableViolations.entries()) {
    if (matchedViolationIds.has(index)) continue;
    const manifest = violation.manifest.section === null
      ? `${manifestPath}[none]`
      : `${manifestPath}[${violation.manifest.section}]=${violation.manifest.versionSpecifier}`;
    const sourcePaths = [
      ...new Set(violation.sourceOccurrences.map((occurrence) => occurrence.path)),
    ].sort(compareStrings);
    errors.push(
      `${violation.kind}: ${violation.importer} -> ${violation.dependency}; manifest=${manifest}; sources=${sourcePaths.length === 0 ? "none" : sourcePaths.join(",")}`,
    );
  }

  return errors.sort(compareStrings);
}

type ArchitectureBoundariesCliOptions = {
  cwd?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
};

function readJsonInput(cwd: string, inputPath: string) {
  const absolutePath = join(cwd, inputPath);
  let contents: string;
  try {
    contents = readText(cwd, absolutePath);
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    return { value: JSON.parse(contents) as unknown, error: null };
  } catch {
    return { value: null, error: `${inputPath}: invalid JSON` };
  }
}

function validateRebuildGraphFacts(value: unknown): {
  graph: RebuildGraphFacts | null;
  errors: string[];
} {
  if (!isRecord(value)) {
    return { graph: null, errors: ["graph must be an object"] };
  }
  if (!Array.isArray(value.nodes)) {
    return { graph: null, errors: ["nodes must be an array"] };
  }

  const errors: string[] = [];
  const nodes: RebuildGraphFacts["nodes"] = [];
  const ids: string[] = [];
  for (const [index, entry] of value.nodes.entries()) {
    if (!isRecord(entry)) {
      errors.push(`node at index ${index} must be an object`);
      continue;
    }
    const id =
      typeof entry.id === "string" && entry.id.length > 0 ? entry.id : null;
    const label = id === null ? `node at index ${index}` : `node ${id}`;
    if (id === null) errors.push(`${label} ID must be a non-empty string`);
    const status =
      typeof entry.status === "string" && entry.status.length > 0
        ? entry.status
        : null;
    if (status === null)
      errors.push(`${label} status must be a non-empty string`);
    const ownership =
      isStringArray(entry.ownership) &&
      entry.ownership.every(isRepositoryRelativePath)
        ? entry.ownership
        : null;
    if (ownership === null) {
      errors.push(
        `${label} ownership must be an array of normalized repository-relative paths`,
      );
    }
    if (id !== null) ids.push(id);
    if (id !== null && status !== null && ownership !== null) {
      nodes.push({ id, status, ownership });
    }
  }

  for (const id of new Set(ids)) {
    if (ids.filter((candidate) => candidate === id).length > 1) {
      errors.push(`node ${id} is duplicated`);
    }
  }
  const sortedErrors = errors.sort(compareStrings);
  return sortedErrors.length === 0
    ? { graph: { nodes }, errors: [] }
    : { graph: null, errors: sortedErrors };
}

function architectureFactErrorPath(error: string) {
  return error.includes(" has unknown removal node ") ||
      error.includes(" has invalid removal node ") ||
      (error.includes(" removal node ") && error.includes(" does not own "))
    ? REBUILD_GRAPH_PATH
    : ARCHITECTURE_POLICY_PATH;
}

export function runArchitectureBoundariesCli(
  options: ArchitectureBoundariesCliOptions = {},
): number {
  const cwd = resolve(options.cwd ?? process.cwd());
  const stdout = options.stdout ?? console.log;
  const stderr = options.stderr ?? console.error;
  const fail = (errors: readonly string[]) => {
    for (const error of errors) {
      stderr(`architecture boundary error: ${error}`);
    }
    return 1;
  };

  const policyInput = readJsonInput(cwd, ARCHITECTURE_POLICY_PATH);
  if (policyInput.error !== null) return fail([policyInput.error]);
  const policyResult = validateArchitecturePolicy(policyInput.value);
  if (policyResult.policy === null) {
    return fail(
      policyResult.errors.map(
        (error) => `${ARCHITECTURE_POLICY_PATH}: ${error}`,
      ),
    );
  }

  const graphInput = readJsonInput(cwd, REBUILD_GRAPH_PATH);
  if (graphInput.error !== null) return fail([graphInput.error]);
  const graphResult = validateRebuildGraphFacts(graphInput.value);
  if (graphResult.graph === null) {
    return fail(
      graphResult.errors.map((error) => `${REBUILD_GRAPH_PATH}: ${error}`),
    );
  }

  let facts: WorkspaceArchitectureFacts;
  try {
    facts = collectWorkspaceArchitectureFacts(cwd);
  } catch (error) {
    return fail([error instanceof Error ? error.message : String(error)]);
  }

  const errors = validateArchitectureFacts(
    policyResult.policy,
    facts,
    graphResult.graph,
  );
  if (errors.length > 0) {
    return fail(
      errors
        .map((error) => `${architectureFactErrorPath(error)}: ${error}`)
        .sort(compareStrings),
    );
  }

  stdout(
    `Architecture boundaries valid: ${facts.packages.length} workspace packages, ${policyResult.policy.exceptions.length} matched exceptions`,
  );
  return 0;
}

export function runArchitectureBoundariesMain(
  args: readonly string[] = process.argv.slice(2),
  options: ArchitectureBoundariesCliOptions = {},
): number {
  if (args.length > 0) {
    const stderr = options.stderr ?? console.error;
    stderr("architecture boundary error: Usage: architecture:check");
    return 1;
  }
  return runArchitectureBoundariesCli(options);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runArchitectureBoundariesMain();
}
