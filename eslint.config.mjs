import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Flat config shared by every workspace project. ESLint resolves this file by
 * walking up from the directory a package's `lint` script runs in, so packages
 * without their own `eslint.config.mjs` inherit it unchanged. `apps/web` has
 * its own file because the Next.js rules ship as one of its dependencies.
 */
export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // A leading underscore is how this codebase marks an argument that only
      // exists to keep a signature uniform, e.g. buildAllowedImageSources.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
          message:
            "Avoid `as never` in production code; fix the type boundary instead.",
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);
