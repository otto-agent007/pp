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
  },
};
