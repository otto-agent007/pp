#!/usr/bin/env node
/**
 * GitHub MCP Server
 *
 * Provides tools for interacting with the GitHub REST API via stdio transport.
 * Authentication requires a GITHUB_TOKEN environment variable (personal access
 * token or fine-grained token with repo scope).
 *
 * Optional defaults:
 *   GITHUB_OWNER — default repository owner (org or user)
 *   GITHUB_REPO  — default repository name
 *
 * Tools exposed:
 *   Repositories: github_get_repo, github_list_branches, github_compare
 *   Files:        github_get_file, github_list_directory
 *   Commits:      github_list_commits, github_get_commit
 *   Pull requests: github_list_pull_requests, github_get_pull_request,
 *                  github_get_pull_request_files, github_get_pull_request_checks,
 *                  github_create_pull_request, github_add_pr_comment
 *   Issues:       github_list_issues, github_create_issue
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerRepoTools } from "./tools/repos.js";
import { registerFileTools } from "./tools/files.js";
import { registerCommitTools } from "./tools/commits.js";
import { registerPullTools } from "./tools/pulls.js";
import { registerIssueTools } from "./tools/issues.js";

// ── Validate required env vars at startup ─────────────────────────────────────
if (!process.env.GITHUB_TOKEN) {
  console.error(
    "ERROR: GITHUB_TOKEN environment variable is required.\n" +
      "Set it to a GitHub personal access token with 'repo' scope."
  );
  process.exit(1);
}

// ── Create server ─────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "github-mcp-server",
  version: "1.0.0",
});

// ── Register all tool groups ──────────────────────────────────────────────────
registerRepoTools(server);
registerFileTools(server);
registerCommitTools(server);
registerPullTools(server);
registerIssueTools(server);

// ── Connect via stdio ─────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `GitHub MCP server running (owner=${process.env.GITHUB_OWNER ?? "not set"}, repo=${process.env.GITHUB_REPO ?? "not set"})`
  );
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
