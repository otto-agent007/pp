const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Expo SDK 54's default config resolves this pnpm workspace on its own: it
// watches every workspace project plus the root node_modules, sets
// resolver.nodeModulesPaths to the app and the root, and handles symlinks
// natively. The manual wiring this file used to carry replaced those defaults
// instead of extending them, which expo-doctor reports as a Metro config
// mismatch, so only the tools/ exclusion below stays local.
const config = getDefaultConfig(__dirname);

// Exclude the tools/ directory from Metro's file walker.
// tools/github-mcp-server has restricted node_modules that trigger EACCES
// (errno -4092) on Windows when Metro tries to lstat them. This is appended to
// the default blockList rather than replacing it, so Expo's own exclusions
// survive.
const workspaceRoot = path.resolve(__dirname, "../..");
config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  new RegExp(
    `${path.resolve(workspaceRoot, "tools").replace(/\\/g, "\\\\")}[/\\\\].*`,
  ),
];

module.exports = config;
