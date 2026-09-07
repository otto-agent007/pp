import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

import rootConfig from "../../eslint.config.mjs";

/**
 * `next lint` was removed in Next.js 16, so the web app runs the ESLint CLI
 * directly against the shared workspace config plus Next's Core Web Vitals
 * rules, which now ship as a flat config array.
 */
export default [
  ...rootConfig,
  ...nextCoreWebVitals,
  {
    rules: {
      // eslint-plugin-react-hooks 7 (pulled in by eslint-config-next 16) adds
      // React Compiler-derived rules that the v5 plugin behind `next lint` did
      // not have. They report 16 pre-existing findings across 12 components —
      // real React anti-patterns, but fixing them means changing component
      // behaviour, which is out of scope for a framework-version migration.
      // Kept visible as warnings and tracked in tasks/in-progress.md.
      // `rules-of-hooks` and `exhaustive-deps` stay at error.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
];
