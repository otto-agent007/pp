// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRequire = createRequire(resolve("apps/mobile/package.json"));
const routerPackage = mobileRequire.resolve("expo-router/package.json");
const routerRequire = createRequire(routerPackage);
const queryPath = routerRequire.resolve("query-string");
const query = routerRequire("query-string");
const { getStateFromPath } = routerRequire(
  resolve(
    dirname(routerPackage),
    "build/react-navigation/core/getStateFromPath.js",
  ),
);

describe("URI decoder security and query-string compatibility", () => {
  it.each([32, 64])(
    "bounds native decoder calls linearly for %s malformed bytes",
    (size) => {
      const original = globalThis.decodeURIComponent;
      let calls = 0;
      globalThis.decodeURIComponent = (value) => {
        calls++;
        return original(value);
      };
      try {
        expect(query.parse(`q=${"%C2".repeat(size)}`).q).toBe(
          "\uFFFD".repeat(size),
        );
      } finally {
        globalThis.decodeURIComponent = original;
      }
      // The vulnerable recursive decoder makes ~2*n^2 calls for this input.
      // This deterministic work bound avoids hardware-dependent timing assertions.
      expect(calls).toBeLessThanOrEqual(8 * size);
    },
  );
  it("uses single-pass decoding rather than re-decoding replacement output", () => {
    expect(query.parse("q=%25%43%32%").q).toBe("%C2%");
    expect(query.parse("q=%25C2").q).toBe("%C2");
    expect(query.parse("q=%2525").q).toBe("%25");
  });
  it.each([
    [
      "x=%E2%9C%93&x=two&empty=&flag",
      { x: ["✓", "two"], empty: "", flag: null },
    ],
    [
      "q=hello+world&plus=%2B&delimiter=%26%3D",
      { q: "hello world", plus: "+", delimiter: "&=" },
    ],
    ["x=%&y=%C2&z=%E2%82", { x: "%", y: "\uFFFD", z: "%E2%82" }],
    ["x=%E2%28%A1&y=%41%FF%42", { x: "%E2(%A1", y: "A%FFB" }],
    ["x=%FE%FF&y=%ff%fe", { x: "\uFFFD\uFFFD", y: "%ff%fe" }],
    ["x=%00&y=%F0%9F%90%9C", { x: "\u0000", y: "🐜" }],
  ])("preserves query decoding for %s", (input, expected) => {
    expect(query.parse(input)).toEqual(expected);
  });
  it("preserves decoding-disabled, typed and bracket-array options", () => {
    expect(query.parse("x=a+b&y=%2B", { decode: false })).toEqual({
      x: "a+b",
      y: "%2B",
    });
    expect(
      query.parse("n=2&enabled=true", {
        parseNumbers: true,
        parseBooleans: true,
      }),
    ).toEqual({ n: 2, enabled: true });
    expect(query.parse("tag[]=a&tag[]=b", { arrayFormat: "bracket" })).toEqual({
      tag: ["a", "b"],
    });
  });
  it("preserves query-string7 fragment plus behavior", () => {
    expect(
      query.parseUrl("/jobs?q=a+b#hello+world%2B", {
        parseFragmentIdentifier: true,
      }),
    ).toEqual({
      url: "/jobs",
      query: { q: "a b" },
      fragmentIdentifier: "hello world+",
    });
  });
  it("preserves query serialization round trips", () => {
    const input = {
      q: "hello + world",
      unicode: "🐜",
      tag: ["one", "two"],
      empty: "",
      flag: null,
    };
    expect(query.parse(query.stringify(input))).toEqual(input);
  });
  it("parses actual Expo deep links without losing path or repeated query params", () => {
    const path = "/jobs/42?q=hello+world&tag=a&tag=b&x=%2B";
    const state = getStateFromPath(path, { screens: { Job: "jobs/:id" } });
    expect(state.routes).toEqual([
      {
        name: "Job",
        params: { id: "42", q: "hello world", tag: ["a", "b"], x: "+" },
        path,
      },
    ]);
  });
  it("preserves Expo configured parameter parsing and tolerates malformed query bytes", () => {
    const path = "/jobs/42?n=2&q=%E2%28%A1&raw=%25%43%32%";
    const state = getStateFromPath(path, {
      screens: { Job: { path: "jobs/:id", parse: { id: Number, n: Number } } },
    });
    expect(state.routes[0].params).toEqual({
      id: 42,
      n: 2,
      q: "%E2(%A1",
      raw: "%C2%",
    });
  });
  it("handles a large malformed run in a timeout-bounded child process", () => {
    const script = `const assert=require('node:assert/strict');const q=require(${JSON.stringify(queryPath)});const n=32768;assert.equal(q.parse('x='+ '%C2'.repeat(n)).x,'\\uFFFD'.repeat(n));console.log('ok');`;
    expect(
      execFileSync(process.execPath, ["-e", script], {
        timeout: 10000,
        encoding: "utf8",
      }).trim(),
    ).toBe("ok");
  }, 15000);
});
