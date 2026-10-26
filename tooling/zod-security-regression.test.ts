// @vitest-environment node
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const mobileRequire = createRequire(resolve("apps/mobile/package.json"));
const expoRequire = createRequire(mobileRequire.resolve("expo/package.json"));
const cliRequire = createRequire(expoRequire.resolve("@expo/cli/package.json"));
const { z } = cliRequire("zod");
const serverPath = resolve(
  dirname(expoRequire.resolve("@expo/cli/package.json")),
  "build/src/start/server",
);
const { PluginSchema, DevToolsPluginOutputSchema } = cliRequire(
  resolve(serverPath, "DevToolsPlugin.schema.js"),
);
const { createMCPDevToolsExtensionSchema } = cliRequire(
  resolve(serverPath, "createMCPDevToolsExtensionSchema.js"),
);
const { addMcpCapabilities } = cliRequire(
  resolve(serverPath, "MCPDevToolsPluginCLIExtensions.js"),
);

for (const asyncMode of [false, true]) {
  describe(`Zod3 constrained collections (${asyncMode ? "async" : "sync"})`, () => {
    for (const kind of ["array-max", "array-length", "set-max", "set-size"]) {
      it(`${kind} rejects before parsing oversized elements`, async () => {
        let visited = 0;
        const element = z.preprocess((value: unknown) => {
          visited++;
          return value;
        }, z.string());
        const schema =
          kind === "array-max"
            ? z.array(element).max(2, "bounded")
            : kind === "array-length"
              ? z.array(element).length(2, "bounded")
              : kind === "set-max"
                ? z.set(element).max(2, "bounded")
                : z.set(element).size(2, "bounded");
        const data = Array.from({ length: 1000 }, (_, i) => i);
        const input = {
          payload: kind.startsWith("array") ? data : new Set(data),
        };
        const object = z.object({ payload: schema });
        const result = await (asyncMode
          ? object.safeParseAsync(input)
          : object.safeParse(input));
        expect(result.success).toBe(false);
        expect(visited).toBe(0);
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]).toMatchObject({
          code: "too_big",
          maximum: 2,
          message: "bounded",
          path: ["payload"],
        });
        expect(result.error.errors).toBe(result.error.issues);
      });
    }
    it("preserves boundary, undersized, and invalid-type behavior", async () => {
      const cases = [
        [z.array(z.string()).max(2), ["a", "b"], true, undefined],
        [z.set(z.string()).size(2), new Set(["a", "b"]), true, undefined],
        [z.array(z.string()).length(2), ["a"], false, "too_small"],
        [z.set(z.string()).min(2), new Set(["a"]), false, "too_small"],
        [z.array(z.string()).max(0), [], true, undefined],
        [z.set(z.string()).max(0), new Set(), true, undefined],
        [z.array(z.string()).max(0), ["a"], false, "too_big"],
        [z.array(z.string()).max(2), [3], false, "invalid_type"],
        [z.array(z.string()).max(2), "bad", false, "invalid_type"],
      ];
      for (const [schema, input, success, code] of cases) {
        const result = await (asyncMode
          ? schema.safeParseAsync(input)
          : schema.safeParse(input));
        expect(result.success).toBe(success);
        if (success) expect(result.data).toEqual(input);
        else expect(result.error.issues[0].code).toBe(code);
      }
    });
    it("preserves Map API and key/value diagnostics", async () => {
      const schema = z.map(z.string(), z.number());
      expect(schema.max).toBeUndefined(); // v3 maps have no collection-bound API.
      const input = new Map([["a", 1]]);
      const good = await (asyncMode
        ? schema.safeParseAsync(input)
        : schema.safeParse(input));
      expect(good.data).toEqual(input);
      const bad = new Map([[1, "bad"]]);
      const result = await (asyncMode
        ? schema.safeParseAsync(bad)
        : schema.safeParse(bad));
      expect(result.success).toBe(false);
      expect(
        result.error.issues.map((issue: { path: unknown[] }) => issue.path),
      ).toEqual([
        [0, "key"],
        [0, "value"],
      ]);
    });
    it("does not execute outer refinements on oversized arrays or sets", async () => {
      let visited = 0;
      const refine = () => {
        visited++;
        return true;
      };
      for (const [schema, input] of [
        [z.array(z.string()).max(1).refine(refine), ["a", "b"]],
        [z.set(z.string()).max(1).refine(refine), new Set(["a", "b"])],
      ]) {
        const result = await (asyncMode
          ? schema.safeParseAsync(input)
          : schema.safeParse(input));
        expect(result.success).toBe(false);
      }
      expect(visited).toBe(0);
    });
  });
}
it("does not schedule async element refinements for oversized input", async () => {
  let visited = 0;
  const element = z.string().refine(async () => {
    visited++;
    return false;
  });
  expect(
    (await z.array(element).max(1).safeParseAsync(["a", "b"])).success,
  ).toBe(false);
  expect(visited).toBe(0);
});

const plugin = {
  packageName: "local-probe",
  packageRoot: "/tmp/local-probe",
  cliExtensions: {
    description: "local probe",
    entryPoint: "index.js",
    commands: [
      {
        name: "remote",
        title: "Remote",
        environments: ["mcp"],
        parameters: [{ name: "n", type: "number" }],
      },
      { name: "local", title: "Local", environments: ["cli"] },
    ],
  },
};
it("preserves actual Expo plugin/output schemas and strict command validation", () => {
  expect(PluginSchema.safeParse(plugin).success).toBe(true);
  const invalid = PluginSchema.safeParse({});
  expect(invalid.success).toBe(false);
  expect(invalid.error.errors).toBe(invalid.error.issues);
  const schema = createMCPDevToolsExtensionSchema(plugin);
  expect(schema.safeParse({ command: "remote", n: 2 }).success).toBe(true);
  for (const input of [
    { command: "remote", n: "bad" },
    { command: "unknown" },
    { command: "remote", extra: 1 },
  ]) {
    expect(schema.safeParse(input).success).toBe(false);
  }
  expect(
    DevToolsPluginOutputSchema.safeParse([
      { type: "text", text: "ok", level: "info" },
    ]).success,
  ).toBe(true);
  expect(DevToolsPluginOutputSchema.safeParse([{ type: "text" }]).success).toBe(
    false,
  );
});
it("preserves Expo MCP registration's v3 schema contract", async () => {
  const schemas: Array<{
    _def: { typeName: string };
    safeParse: (value: unknown) => { success: boolean };
  }> = [];
  await addMcpCapabilities(
    {
      registerTool: (
        _name: string,
        options: { inputSchema: { parameters: (typeof schemas)[number] } },
      ) => {
        schemas.push(options.inputSchema.parameters);
      },
    },
    { devtoolsPluginManager: { queryPluginsAsync: async () => [plugin] } },
  );
  expect(schemas).toHaveLength(1);
  expect(schemas[0]._def.typeName).toBe("ZodObject");
  expect(schemas[0].safeParse({ command: "remote", n: 2 }).success).toBe(true);
  expect(schemas[0].safeParse({ command: "local" }).success).toBe(false);
});
it("does not invent limits for unbounded Expo output (same scope as upstream v4 fix)", () => {
  const result = DevToolsPluginOutputSchema.safeParse(
    Array.from({ length: 10 }, () => ({ type: "invalid" })),
  );
  expect(result.success).toBe(false);
  expect(result.error.issues).toHaveLength(10);
});
it("applies bounded collection protection to the ESM entry too", async () => {
  const entry = pathToFileURL(
    resolve(dirname(cliRequire.resolve("zod/package.json")), "v3/index.js"),
  ).href;
  const { z: esm } = await import(/* @vite-ignore */ entry);
  let visited = 0;
  const element = esm.preprocess((value: unknown) => {
    visited++;
    return value;
  }, esm.string());
  expect(esm.array(element).max(1).safeParse([1, 2]).success).toBe(false);
  expect(
    (
      await esm
        .set(element)
        .max(1)
        .safeParseAsync(new Set([1, 2]))
    ).success,
  ).toBe(false);
  expect(visited).toBe(0);
});
