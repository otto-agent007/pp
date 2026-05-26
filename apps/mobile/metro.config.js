const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;

// Exclude the tools/ directory from Metro's file walker.
// tools/github-mcp-server has restricted node_modules that trigger EACCES
// (errno -4092) on Windows when Metro tries to lstat them.
config.resolver.blockList = [
  new RegExp(
    `${path.resolve(workspaceRoot, "tools").replace(/\\/g, "\\\\")}[/\\\\].*`,
  ),
];

module.exports = config;
