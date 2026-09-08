# CR01 Executable Architecture Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Use
> superpowers:test-driven-development for every production behavior and
> superpowers:verification-before-completion before any completion claim.

**Goal:** Establish a deterministic, executable package-boundary contract that
freezes the repository's two known internal dependency violations exactly,
rejects new or drifted debt, and documents the target architecture without
changing application or package behavior.

**Architecture:** Keep policy shape validation pure. Collect repository facts
separately from workspace manifests and TypeScript syntax trees, then compare
those facts with the versioned policy and controlled-rebuild graph in a second
pure layer. A thin CLI loads the two JSON files, reports sorted errors, and
never mutates policy or repository state.

**Tech Stack:** TypeScript 5, Node.js built-ins, TypeScript compiler API,
Vitest 4, JSON, pnpm 9.15.4, Markdown.

**Spec:**
`docs/superpowers/specs/2026-08-25-controlled-rebuild-cr01-foundation-design.md`

## Global Constraints

- Work only in the isolated CR01 worktree on
  `codex/rebuild-cr01-foundation-v1`, based on
  `3630dbb3ecaf4361dc059a974246e688f473bcf2`.
- Protect every path outside CR01's exact graph ownership. Do not edit package
  or app implementation, any package manifest below `apps/` or `packages/`,
  `pnpm-lock.yaml`, migrations, providers, environment values, previews, or
  production.
- Do not create `packages/application` or `packages/sync`; their policy entries
  are planned identities whose absence is valid.
- `validateArchitecturePolicy(value)` and
  `validateArchitectureFacts(policy, facts, graph)` stay pure: no filesystem,
  environment, process, Git, GitHub, or network access.
- `collectWorkspaceArchitectureFacts(cwd)` is read-only. It never
  updates the policy or offers an accept/update mode.
- Every error list and fact list is sorted with one locale-independent UTF-16
  comparator (`left === right ? 0 : left < right ? -1 : 1`). Paths use POSIX
  repository-relative spelling regardless of host path syntax.
- Type-only imports remain dependency edges. External and relative module
  specifiers remain outside CR01's policy.
- Every production behavior follows RED, GREEN, REFACTOR. Capture the expected
  failing assertion before editing its implementation.
- Use canonical `pnpm` commands below. If `pnpm` is not on `PATH` in this
  checkout, prepend
  `/home/user1/.npm/_npx/32b21065a482fe57/node_modules/.bin` so the exact
  repository-declared `pnpm@9.15.4` launcher is used.
- Commit after every task's focused tests pass. Do not publish, tag, mark CR01
  done, or merge without satisfying the controller gates in the spec and
  rebuild runbook.

## Shared Data Contract

Implement and export these public types from
`tooling/architecture-boundaries.ts`; keep helper types private unless a test
needs to construct a fixture:

```ts
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

export type SyntaxForm =
  | "import"
  | "export"
  | "dynamic-import"
  | "require";

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
```

The JSON policy uses the same field names and literal values. Workspace
discovery is independent of policy: the collector reads the checked-in
`pnpm-workspace.yaml`, so deleting a policy package or root cannot hide a real
workspace from enforcement.

---

### Task 1: Validate the versioned policy as pure data

**Files:**

- Create: `tooling/architecture-boundaries.test.ts`
- Create: `tooling/architecture-boundaries.ts`

**Interfaces:**

- Export:
  `validateArchitecturePolicy(value: unknown): { policy: ArchitecturePolicy | null; errors: string[] }`.
- Export the shared types above.
- The function returns a policy only when the error array is empty; it never
  throws for user-supplied JSON-shaped values.

- [ ] **Step 1: Add a minimal valid policy fixture and shape regressions**

Create `validPolicy()` with one required `@pest-patrol/types` package, one
planned `@pest-patrol/application` package, no internal permissions, and no
exceptions. Add tests that accept it and reject:

- non-object input and `schemaVersion !== 1`;
- a missing or empty `packages`, or malformed `exceptions`;
- duplicate package names, paths, exception IDs, allowed dependency names, or
  allowed manifest sections;
- non-`@pest-patrol/*` names and non-normalized repository-relative paths;
- unsorted roots, packages, permissions, sections, exceptions, or exception
  occurrences;
- an allowed dependency absent from `packages`;
- a self dependency;
- an exception referring to unknown packages, an allowed edge paired with
  `forbidden-workspace-edge`, or a forbidden edge paired with
  `missing-manifest-dependency`;
- an exception occurrence outside the importing package path or whose
  canonical `specifier` differs from the exception dependency;
- a missing-manifest exception with a non-null manifest pair or no source
  occurrences;
- invalid occurrence class, syntax, count, digest, manifest pair, removal node
  ID, or blank reason.

Use the existing repository path rules: reject POSIX absolute paths, Windows
absolute paths, backslashes, `.`/`..`, empty segments, and non-normalized
spelling. Require a lowercase 64-character SHA-256 digest. A manifest pair is
either both null or both non-null.

- [ ] **Step 2: Run the policy tests and observe RED**

Run:

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "architecture policy"
```

Expected: FAIL because the module and validator do not exist.

- [ ] **Step 3: Implement only the policy validator**

Add `isRecord`, string-array, repository-relative-path, sortedness, and
duplicate helpers. Parse the unknown value without casting past validation.
Accumulate all actionable errors, sort with the shared locale-independent
comparator, and return
`{ policy: null, errors }` on any failure. The checker must not silently sort
or normalize the input; non-canonical policy data is an error.

Add a mixed uppercase/lowercase/punctuation fixture that asserts the exact
ordering of package, exception, occurrence, binding, and error strings. Do not
use `localeCompare` or `Intl.Collator`; their result can vary with host locale
and ICU data.

Error messages identify the data location, for example:

```text
package @pest-patrol/domain path must be a normalized repository-relative path
exception domain-to-api-client sourceOccurrences must be sorted
package @pest-patrol/domain allowed dependency @pest-patrol/types repeats dependencies
```

- [ ] **Step 4: Run focused policy tests and observe GREEN**

Run the Step 2 command. Expected: all policy tests pass.

- [ ] **Step 5: Refactor and commit**

Run:

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts
git diff --check
git add tooling/architecture-boundaries.ts tooling/architecture-boundaries.test.ts
git commit -m "test: define architecture policy contract"
```

Expected: focused file passes, diff check is clean, and the commit contains
only the two new tooling files.

---

### Task 2: Collect deterministic workspace manifest facts

**Files:**

- Modify: `tooling/architecture-boundaries.test.ts`
- Modify: `tooling/architecture-boundaries.ts`

**Interfaces:**

- Export:
  `collectWorkspaceArchitectureFacts(cwd: string): WorkspaceArchitectureFacts`.
- Read workspace patterns independently from `pnpm-workspace.yaml`. Support
  the repository's normalized, repository-relative, single-child wildcard
  form such as `apps/*` and `packages/*`; reject unsupported or malformed
  patterns rather than silently skipping them. A matching child is a workspace
  only when it contains `package.json` with a non-empty `name`.

- [ ] **Step 1: Add temporary-workspace manifest tests**

Use `mkdtempSync`, `mkdirSync`, `writeFileSync`, and `rmSync` with a shared
cleanup list. Build fixtures under `apps/*` and `packages/*` proving that the
collector:

- discovers all manifest-bearing immediate children, including a package not
  listed in policy;
- retains a planned package when it appears on disk so validation can reject
  undescribed facts later;
- rejects a missing/malformed workspace file or an unsupported recursive,
  absolute, or multi-segment wildcard instead of producing partial facts;
- records only internal dependencies whose names begin `@pest-patrol/`;
- records exact `dependencies`, `devDependencies`, `peerDependencies`, and
  `optionalDependencies` section/version pairs;
- sorts packages and manifest facts;
- emits repository-relative POSIX package and manifest paths;
- throws a path-qualified read/JSON/name error for a discovered malformed
  manifest rather than pretending the package is absent.

- [ ] **Step 2: Run manifest collection tests and observe RED**

Run:

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "manifest facts"
```

Expected: FAIL because fact collection is not implemented.

- [ ] **Step 3: Implement manifest discovery and collection**

Use only `node:fs` and `node:path`. Do not add a glob or YAML dependency. Parse
the `packages:` string-list entries conservatively, require the supported
`root/*` shape, enumerate each root with
`readdirSync(..., { withFileTypes: true })`, inspect directory children, and
read their `package.json`. Preserve every discovered package so the pure
validation layer can report packages unknown to policy.

Read the four manifest sections independently. Do not infer that an entry in
one section replaces or shadows another; duplicate declarations across
sections produce distinct facts that validation can reject or permit exactly.

- [ ] **Step 4: Run manifest tests and observe GREEN**

Run the Step 2 command. Expected: all manifest collection cases pass.

- [ ] **Step 5: Run the complete file and commit**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts
git diff --check
git add tooling/architecture-boundaries.ts tooling/architecture-boundaries.test.ts
git commit -m "feat: collect workspace manifest facts"
```

---

### Task 3: Collect TypeScript dependency occurrences and binding digests

**Files:**

- Modify: `tooling/architecture-boundaries.test.ts`
- Modify: `tooling/architecture-boundaries.ts`

**Interfaces:**

- Extend `collectWorkspaceArchitectureFacts` to recursively inspect `.ts` and
  `.tsx` below each discovered workspace directory.
- Exclude directory segments `node_modules`, `.next`, `dist`, `build`,
  `coverage`, and `generated`, plus declaration files ending `.d.ts`.
- Normalize `@pest-patrol/name/subpath` to `@pest-patrol/name` and store that
  canonical owning-package name in `specifier`, as required by the spec.

- [ ] **Step 1: Add syntax and classification tests**

Create a fixture source set covering:

```ts
import value, { helper, type Model as LocalModel } from "@pest-patrol/domain/subpath";
import type { Contract } from "@pest-patrol/types";
export { rule, type RuleInput } from "@pest-patrol/domain";
export type * from "@pest-patrol/types";
void import("@pest-patrol/api-client/lazy");
const adapter = require("@pest-patrol/api-client");
type RemoteContract = import("@pest-patrol/types").Contract;
import legacyAdapter = require("@pest-patrol/api-client/legacy");
```

Place equivalent cases in `thing.ts`, `thing.test.ts`, `thing.spec.tsx`, and a
`__tests__` directory. Assert the four occurrence classes and four syntax forms
exactly. Assert that non-literal dynamic imports/require, relative imports,
external imports, generated directories, and `.d.ts` are ignored.

- [ ] **Step 2: Add normalized-binding and growth tests**

Define binding normalization as follows:

- default import: `default`;
- namespace import or export star: `*`;
- named import/export: the source-side imported/exported name, ignoring local
  aliases;
- side-effect import: `side-effect`;
- dynamic import and literal require: `*`.

For each fact group keyed by path, canonical owning-package specifier, syntax,
and occurrence
class, sort the normalized bindings including duplicates and compute:

```ts
createHash("sha256").update(JSON.stringify(bindings)).digest("hex")
```

`count` is the number of matching syntax occurrences in the group, not the
number of bindings. Add tests proving that local alias renaming is stable,
while adding another same-file import changes count and the digest. Two
different subpaths of the same workspace package combine into the same
canonical group; changing only the subpath is intentionally stable because
subpaths are outside the approved package-edge identity. A mixed value/type
declaration produces separate occurrence-class groups.

- [ ] **Step 3: Run AST tests and observe RED**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "TypeScript source facts|binding digest"
```

Expected: FAIL because source traversal and TypeScript AST collection are not
implemented.

- [ ] **Step 4: Implement TypeScript compiler-API collection**

Import the installed `typescript` package. Create each source file with
`ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind)` and
walk nodes. Handle:

- `ImportDeclaration` including declaration-level and specifier-level type
  modifiers;
- `ExportDeclaration`, `export type *`, named type exports, and export star;
- `ImportTypeNode` with a string-literal argument, classified as type-only and
  using its qualifier (or `*`) as the normalized binding;
- `ImportEqualsDeclaration` with a string-literal external-module reference,
  respecting its type-only modifier and using `*` as the binding;
- `CallExpression` whose expression is `ImportKeyword` and whose sole argument
  is a string literal;
- `CallExpression` whose expression is identifier `require` and whose sole
  argument is a string literal.

Do not use text regexes for imports. Group before digesting, sort every source
occurrence with one shared comparator, and append the resulting occurrences to
their importing package fact.

- [ ] **Step 5: Run AST tests and the complete file**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "TypeScript source facts|binding digest"
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts
```

Expected: all cases pass.

- [ ] **Step 6: Commit**

```bash
git diff --check
git add tooling/architecture-boundaries.ts tooling/architecture-boundaries.test.ts
git commit -m "feat: collect TypeScript architecture facts"
```

---

### Task 4: Enforce allowlists and manifest-section semantics

**Files:**

- Modify: `tooling/architecture-boundaries.test.ts`
- Modify: `tooling/architecture-boundaries.ts`

**Interfaces:**

- Export a minimal graph input type containing
  `nodes: Array<{ id: string; status: string; ownership: string[] }>`.
- Export:
  `validateArchitectureFacts(policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts, rebuildGraph: RebuildGraphFacts): string[]`.
- This task implements package discovery and allowed-edge rules. Exception
  suppression is added only in Task 5.

- [ ] **Step 1: Add required/planned/discovery tests**

Using in-memory facts, prove that validation:

- accepts an absent planned package;
- rejects an absent required package;
- rejects a discovered package missing from policy;
- rejects a required package found at the wrong path or with the wrong name;
- rejects a present planned package whose manifest/source facts violate its
  declared permissions;
- reports packages and paths in sorted deterministic order.

- [ ] **Step 2: Add edge and section regressions**

Build one allowed importer/dependency pair for each case and assert:

- a manifest-only edge is accepted only in a section explicitly permitted for
  that exact edge;
- production value and production type occurrences require at least one
  allowed declaration in `dependencies`, `peerDependencies`, or
  `optionalDependencies`, never only `devDependencies`;
- test value and test type occurrences may use `devDependencies` only when the
  exact edge explicitly permits it;
- peer and optional declarations are not inferred from syntax and are valid
  only when named by policy;
- when an edge has both production and test occurrences, every applicable
  class is satisfied;
- a source edge with no suitable declaration is
  `missing-manifest-dependency`;
- a manifest or source edge absent from the importer's allowlist is
  `forbidden-workspace-edge`;
- an internal dependency in two manifest sections validates both sections and
  rejects either unpermitted section.

- [ ] **Step 3: Run allowlist tests and observe RED**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "architecture facts|manifest sections"
```

Expected: FAIL because fact comparison is not implemented.

- [ ] **Step 4: Implement deterministic violation construction**

Build a private `ObservedViolation` with the exact exception-comparable fields:

```ts
type ObservedViolation = Omit<ArchitectureException, "id" | "removeIn" | "reason">;
```

Group facts by importer/dependency. For forbidden edges, include all source
occurrences and the single exact manifest declaration when one exists. If a
forbidden edge appears in more than one manifest section, produce one sorted
violation per declaration so no section can hide another. For a forbidden
source edge without a manifest entry, use the null manifest pair.

For an allowed edge, validate every observed manifest section, then ensure
each source occurrence class has a suitable allowed declaration. Produce a
missing-manifest violation with all source occurrences and the null manifest
pair only when no suitable declaration exists.

Before exceptions exist, render every observed violation as a sorted error
that includes kind, importer, dependency, manifest path/section, and source
paths.

- [ ] **Step 5: Run allowlist tests and observe GREEN**

Run the Step 3 command and then the complete test file. Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git diff --check
git add tooling/architecture-boundaries.ts tooling/architecture-boundaries.test.ts
git commit -m "feat: enforce workspace architecture edges"
```

---

### Task 5: Match exact debt exceptions and removal-node lifecycle

**Files:**

- Modify: `tooling/architecture-boundaries.test.ts`
- Modify: `tooling/architecture-boundaries.ts`

**Interfaces:**

- Complete `validateArchitectureFacts` by comparing every exception with one
  exact observed violation and by validating its `removeIn` node.
- Ownership coverage uses component boundaries: an ownership entry covers a
  path when it equals that path or is its directory ancestor followed by `/`;
  prefix lookalikes do not count.

- [ ] **Step 1: Add exact-match and drift regressions**

Start from one precisely matched forbidden-edge exception and one precisely
matched missing-manifest exception. Prove that exact facts suppress the
violation, then mutate one field at a time and require an error for:

- added, removed, or duplicated source occurrence;
- same-file occurrence-count growth;
- occurrence class/type-to-value drift;
- syntax-form or canonical-specifier drift;
- binding-digest drift;
- manifest section drift, version-specifier drift, and present/absent drift;
- importer, dependency, or violation-kind drift;
- an exception left behind after the violation disappears;
- one observed violation matched by multiple exception IDs;
- a new unexcepted violation next to a matched exception.

Compare canonical JSON-shaped fields, not ad hoc subsets. Error text names the
exception ID and edge.

- [ ] **Step 2: Add removal-node and ownership regressions**

Assert that:

- an unknown removal node fails;
- `planned` is accepted without pre-owning future paths;
- `blocked`, `done`, `abandoned`, and `superseded` all fail and replacement
  ownership is never inherited;
- `ready` and `running` require ownership of
  `tooling/architecture-boundaries.json`, the importer's exact
  `<package path>/package.json`, and every exact exception source path;
- directory ownership such as `packages/domain` covers descendants;
- lookalike ownership such as `packages/domain-old` does not;
- each uncovered path is reported deterministically.

- [ ] **Step 3: Run exception tests and observe RED**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "debt exceptions|removal node"
```

Expected: FAIL because exceptions and graph lifecycle checks are not yet
applied.

- [ ] **Step 4: Implement one-to-one exception matching**

Canonicalize each observed violation and exception projection with sorted
source occurrences, then compare the complete projection. Track matched
violation indices so one violation cannot satisfy two exceptions. Report:

- unmatched exception as stale or drifted;
- unmatched observed violation as new debt;
- duplicate match as contradictory policy.

Validate removal status independently of whether the exception matches, so a
stale exception cannot conceal an invalid lifecycle assignment.

- [ ] **Step 5: Implement promotion ownership checks**

For `ready` and `running`, derive the required path set from the policy file
literal, the importing package's policy path plus `/package.json`, and every
source occurrence path. Sort and report every uncovered required path. Do not
follow `supersededBy` or any replacement relation.

- [ ] **Step 6: Run exception tests and the complete file**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "debt exceptions|removal node"
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git diff --check
git add tooling/architecture-boundaries.ts tooling/architecture-boundaries.test.ts
git commit -m "feat: freeze architecture debt exceptions"
```

---

### Task 6: Wire the CLI and author the exact live policy

**Files:**

- Modify: `tooling/architecture-boundaries.test.ts`
- Modify: `tooling/architecture-boundaries.ts`
- Create: `tooling/architecture-boundaries.json`
- Modify: `package.json`

**Interfaces:**

- Export:
  `runArchitectureBoundariesCli(options?: { cwd?: string; stdout?: (line: string) => void; stderr?: (line: string) => void }): number`.
- Add root script:
  `"architecture:check": "node --import tsx tooling/architecture-boundaries.ts"`.
- Add `tooling/architecture-boundaries.test.ts` to the first Vitest invocation
  in the root `test` script.

- [ ] **Step 1: Add CLI fixture regressions**

Create temporary policy, graph, manifests, and source files. Assert that the
CLI:

- returns `0`, emits one success line, and emits no error for a conforming
  fixture;
- returns `1` with a path-qualified message for missing files, malformed JSON,
  invalid policy, collection failure, invalid graph input, or architecture
  violations;
- emits every sorted error rather than stopping after the first rule failure;
- does not rewrite the policy or fixture files;
- has no accept/update flag and treats unknown process arguments as a usage
  error when invoked through the main entry point helper.

- [ ] **Step 2: Run CLI tests and observe RED**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts -t "architecture CLI"
```

Expected: FAIL because CLI loading and exit behavior are not implemented.

- [ ] **Step 3: Implement the thin CLI**

Read `tooling/architecture-boundaries.json` and `docs/rebuild/graph.json` under
the selected cwd. Parse with explicit error boundaries, run pure policy
validation, collect facts only for a valid policy, validate graph nodes needed
by the architecture layer, then validate facts. Prefix failure lines with
`architecture boundary error:` and success with
`Architecture boundaries valid:`. The main-module guard sets
`process.exitCode`; exported functions never call `process.exit()`.

- [ ] **Step 4: Run CLI tests and observe GREEN**

Run the Step 2 command. Expected: all CLI cases pass.

- [ ] **Step 5: Add package scripts and observe the live-policy RED boundary**

Add the two package-script changes, then run:

```bash
pnpm architecture:check
```

Expected: FAIL because the checked-in live policy does not yet exist. This is
the RED proof for repository wiring, not permission to weaken collection.

- [ ] **Step 6: Author the complete schema-version-1 policy**

Create `tooling/architecture-boundaries.json` with these sorted package
entries:

| Package | Path | State | Allowed internal dependencies |
| --- | --- | --- | --- |
| `@pest-patrol/api-client` | `packages/api-client` | required | application, domain, types |
| `@pest-patrol/application` | `packages/application` | planned | domain, types |
| `@pest-patrol/domain` | `packages/domain` | required | types |
| `@pest-patrol/i18n` | `packages/i18n` | required | none |
| `@pest-patrol/mobile` | `apps/mobile` | required | api-client, application, domain, i18n, sync, types, ui-native, ui-tokens |
| `@pest-patrol/sync` | `packages/sync` | planned | application, domain, types |
| `@pest-patrol/types` | `packages/types` | required | none |
| `@pest-patrol/ui` | `packages/ui` | required | ui-tokens |
| `@pest-patrol/ui-native` | `packages/ui-native` | required | ui-tokens |
| `@pest-patrol/ui-tokens` | `packages/ui-tokens` | required | none |
| `@pest-patrol/web` | `apps/web` | required | api-client, application, domain, i18n, sync, types, ui, ui-tokens |

Spell every dependency with its full `@pest-patrol/*` name and assign every
initial allowed edge exactly `manifestSections: ["dependencies"]`.

Add exactly two sorted exceptions:

- `api-client-domain-manifest`, kind `missing-manifest-dependency`, importer
  api-client, dependency domain, null manifest pair, `removeIn: "CR05"`, and
  exact source facts from `packages/api-client/demoSeed.test.ts` and
  `packages/api-client/demoSeed.ts`;
- `domain-to-api-client`, kind `forbidden-workspace-edge`, importer domain,
  dependency api-client, manifest `dependencies` / `workspace:*`,
  `removeIn: "CR08"`, and exact source facts from the 15 paths enumerated in
  the approved spec.

Derive occurrence counts and binding digests with the implemented read-only
collector, not manual hashing. Run this exact read-only diagnostic:

```bash
node --import tsx --input-type=module -e 'import { collectWorkspaceArchitectureFacts } from "./tooling/architecture-boundaries.ts"; const wanted = new Map([["@pest-patrol/api-client", "@pest-patrol/domain"], ["@pest-patrol/domain", "@pest-patrol/api-client"]]); const facts = collectWorkspaceArchitectureFacts(process.cwd()); console.log(JSON.stringify(facts.packages.filter((pkg) => wanted.has(pkg.name)).map((pkg) => ({ name: pkg.name, sourceOccurrences: pkg.sourceOccurrences.filter((item) => item.specifier === wanted.get(pkg.name)) })), null, 2));'
```

Copy only the observed fields into the committed policy; never write or accept
exceptions automatically and never commit incomplete exception objects.

- [ ] **Step 7: Add a checked-in-policy acceptance test**

Load both checked-in JSON files, validate the policy, collect live facts, and
expect `validateArchitectureFacts(...)` to return `[]`. This locks the exact
baseline in the focused test suite while `pnpm architecture:check` supplies
the operator-facing gate.

- [ ] **Step 8: Run live and root wiring checks**

```bash
node_modules/.bin/vitest run tooling/architecture-boundaries.test.ts
pnpm architecture:check
pnpm test
git diff --check
```

Expected: all pass; the architecture CLI reports the number of validated
workspace packages and two matched exceptions without accepting new debt.

- [ ] **Step 9: Commit**

```bash
git add package.json tooling/architecture-boundaries.json tooling/architecture-boundaries.ts tooling/architecture-boundaries.test.ts
git commit -m "feat: enforce executable architecture boundaries"
```

---

### Task 7: Make the architecture documentation canonical

**Files:**

- Modify: `docs/architecture.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/PATTERNS.md`
- Modify: `tasks/in-progress.md`

**Interfaces:**

- `docs/architecture.md` becomes the canonical responsibility and dependency
  direction contract and links to the executable JSON/checker.
- `docs/DECISIONS.md` records why debt is frozen before removal.
- `docs/PATTERNS.md` states the adapter boundary for Supabase/provider calls.

- [ ] **Step 1: Update `docs/architecture.md`**

Preserve useful current context, then add:

- the exact target package-direction diagram and allowlist table from the
  approved spec;
- responsibilities for types, domain, application, api-client, sync,
  presentation libraries, and app composition roots;
- the data flow
  `UI/input -> app composition root -> application use case -> port -> adapter -> provider -> mapped result`;
- the rule that domain is provider-independent and provider clients belong in
  adapters;
- the distinction between target direction and exact current exceptions;
- direct links to `tooling/architecture-boundaries.json`,
  `tooling/architecture-boundaries.ts`, and the canonical rebuild runbook.

Do not duplicate exception fact lists or scheduler lifecycle prose already
owned by executable data and `docs/rebuild/README.md`.

- [ ] **Step 2: Record the strangler decision**

Add a dated decision to `docs/DECISIONS.md`:

- Context: package direction is currently violated and destinations arrive in
  later slices.
- Decision: encode target allowlists now, freeze exact debt as expiring
  exceptions, and remove debt only in graph-owned slices.
- Consequences: no silent growth, temporary exceptions are visible, and CR01
  does not move runtime code.

- [ ] **Step 3: Correct the provider pattern**

Replace the statement that Supabase calls are wrapped in domain logic with:

- domain code expresses provider-independent rules;
- application ports/use cases coordinate behavior;
- api-client adapters own Supabase/provider SDK calls and mapping;
- apps wire implementations at composition roots;
- existing violations remain debt, not examples to copy.

- [ ] **Step 4: Update the tracker truthfully**

In `tasks/in-progress.md`, replace the implementation-gated wording with the
actual state: approved spec and plan, implemented checker/docs, current branch,
checks still pending or completed exactly as observed, and publication status.
Do not claim push, tag, PR, approval, or completion before each fact exists.

- [ ] **Step 5: Verify docs and commit**

```bash
rg -n "Supabase.*domain|domain.*Supabase" docs/architecture.md docs/PATTERNS.md docs/DECISIONS.md
git diff --check
pnpm architecture:check
git add docs/architecture.md docs/DECISIONS.md docs/PATTERNS.md tasks/in-progress.md
git commit -m "docs: establish rebuild architecture contract"
```

Review the `rg` results manually: historical context may name the old debt,
but no normative text may instruct domain code to call Supabase.

---

### Task 8: Review, verify, and prepare the controlled-rebuild handoff

**Files:**

- Modify if evidence requires it: `docs/rebuild/graph.json`
- Modify: `tasks/in-progress.md`

**Interfaces:**

- No new architecture behavior. This task binds review and verification to the
  final clean commit/tree and prepares publication without merging CR01.

- [ ] **Step 1: Audit scope and implementation against the approved spec**

Run:

```bash
git status --short --branch
git diff --name-only 3630dbb3ecaf4361dc059a974246e688f473bcf2...HEAD
git diff --stat 3630dbb3ecaf4361dc059a974246e688f473bcf2...HEAD
rg -n "TODO|FIXME|placeholder|TBD|accept.*debt|update.*policy" tooling/architecture-boundaries.* docs/architecture.md docs/DECISIONS.md docs/PATTERNS.md
```

Expected: every changed path is in CR01 ownership; no unfinished or automatic
debt-acceptance path exists. Inspect every match rather than assuming all text
matches are defects.

- [ ] **Step 2: Obtain independent reviews**

Request, in order:

1. spec-compliance review of all changes since the base;
2. code-quality/security review of the checker, especially AST coverage,
   exception exactness, path handling, and deterministic output;
3. final architecture review confirming direction, debt sequencing, and docs.

For each confirmed issue, add a RED regression before the repair, rerun the
focused suite, and commit the repair separately. Record design choices as such;
do not weaken the approved contract merely to satisfy a speculative comment.

- [ ] **Step 3: Run node-declared verification on a clean commit**

Commit any truthful tracker/graph changes first, ensure the worktree is clean,
then run exactly:

```bash
pnpm exec vitest run tooling/architecture-boundaries.test.ts
pnpm architecture:check
pnpm exec vitest run tooling/rebuild-graph.test.ts tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:baseline
git diff --check
```

If a command fails, stop the completion claim, diagnose the root cause, add a
regression when behavior changes, repair within CR01 ownership, commit, and
restart the complete verification set from the new clean HEAD.

- [ ] **Step 4: Run the provenance-bound verifier separately**

```bash
pnpm rebuild:verify
```

Expected: aggregate `PASS`, clean pre/post worktree status, identical pre/post
HEAD and tree, and every selected gate `PASS`. Save the JSON output outside the
repository or in the PR description; do not create an unowned evidence file.

- [ ] **Step 5: Reconcile live repository state before publication**

Run the live graph reconciler against the clean canonical head. Confirm the
predecessor is still merged, CR01 base ancestry remains valid, one running
slice remains, and the branch has not diverged from its intended history.
If `origin/main` advanced, follow the runbook's controller-approved update
path and rerun all verification on the new head.

- [ ] **Step 6: Publish only after the controller publication gate**

After explicit controller approval for publication:

1. push `codex/rebuild-cr01-foundation-v1` without force;
2. create one draft PR targeting `main` with scope, non-goals, exact checks,
   provenance result, and architecture-review result;
3. write the canonical PR URL into CR01's graph `pr` field and update the
   tracker without changing status from `running`;
4. commit and push that metadata update;
5. rerun the complete local verification set and provenance-bound verifier on
   the new canonical PR head;
6. check hosted CI once and apply any required repair before proceeding,
   repeating local verification and hosted CI on each new head;
7. only after the PR head is frozen and hosted CI is green, create and push the
   immutable tag `rebuild/cr01-source` at that exact head;
8. run final live reconciliation against the immutable tag and frozen PR head.

Do not mark CR01 `done`, populate `mergeSha`, make the draft ready, merge, or
start CR02 in this slice. If the final metadata commit changes the canonical
head after any tag or evidence, replace no immutable tag: stop and resolve the
ordering before publication proof is claimed.

- [ ] **Step 7: Final handoff**

Report the exact branch, full HEAD SHA, tree SHA, draft PR URL, source-tag SHA,
changed paths, independent review outcome, every command/exit status, verifier
evidence-set ID, hosted CI snapshot, and remaining merge/controller gates.
