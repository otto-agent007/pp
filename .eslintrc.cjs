module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: [
    ".next",
    ".turbo",
    "dist",
    "build",
    "node_modules",
    "next-env.d.ts",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "no-restricted-syntax": [
      "error",
      {
        selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
        message: "Avoid `as never` in production code; fix the type boundary instead.",
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "no-restricted-syntax": "off",
      },
    },
  ],
};
