const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Expo SDK 54's default config resolves this pnpm workspace on its own: it
// watches every workspace project plus the root node_modules, sets
// resolver.nodeModulesPaths to the app and the root, and handles symlinks
// natively. The manual wiring this file used to carry replaced those defaults
// instead of extending them, which expo-doctor reports as a Metro config
// mismatch, so everything below extends the defaults rather than assigning
// over them.
const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

// pnpm-workspace.yaml relocates pnpm's virtual store to <root>/.pnpm via
// virtualStoreDir. Expo's defaults watch <root>/node_modules and each
// workspace project, none of which contain the relocated store, so every
// dependency symlink resolves to a real path outside all watch folders and
// Metro fails with "Unable to resolve module ./.pnpm/...". Keep the defaults
// and add the store.
config.watchFolders = [
  ...config.watchFolders,
  path.resolve(workspaceRoot, ".pnpm"),
];

// Exclude the tools/ directory from Metro's file walker.
// tools/github-mcp-server has restricted node_modules that trigger EACCES
// (errno -4092) on Windows when Metro tries to lstat them. This is appended to
// the default blockList rather than replacing it, so Expo's own exclusions
// survive.
config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  new RegExp(
    `${path.resolve(workspaceRoot, "tools").replace(/\\/g, "\\\\")}[/\\\\].*`,
  ),
];

module.exports = config;
