import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getClient,
  handleApiError,
  resolveRepo,
  formatDate,
} from "../client.js";
import { ResponseFormat, DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

const RepoParamsSchema = z.object({
  owner: z
    .string()
    .optional()
    .describe(
      "GitHub org or user (defaults to GITHUB_OWNER env var if set)"
    ),
  repo: z
    .string()
    .optional()
    .describe(
      "Repository name (defaults to GITHUB_REPO env var if set)"
    ),
});

export function registerRepoTools(server: McpServer): void {
  // ── github_get_repo ─────────────────────────────────────────────────────────
  server.registerTool(
    "github_get_repo",
    {
      title: "Get Repository Info",
      description: `Get metadata for a GitHub repository: description, default branch, visibility, star/fork counts, open issue count, and last push time.

Args:
  - owner (string, optional): GitHub org or user. Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Repository name. Defaults to GITHUB_REPO env var.

Returns: Repository metadata including full_name, description, default_branch, open_issues_count, stargazers_count, visibility, and pushed_at.

Examples:
  - "What's the default branch of pest-patrol-os?" → call with no args if env vars set
  - "When was the repo last pushed to?" → returns pushed_at`,
      inputSchema: RepoParamsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { owner, repo } = resolveRepo(params.owner, params.repo);
        const { data } = await getClient().get(`/repos/${owner}/${repo}`);

        const out = {
          full_name: data.full_name as string,
          description: (data.description as string | null) ?? null,
          visibility: data.visibility as string,
          default_branch: data.default_branch as string,
          open_issues_count: data.open_issues_count as number,
          stargazers_count: data.stargazers_count as number,
          forks_count: data.forks_count as number,
          pushed_at: data.pushed_at as string,
          html_url: data.html_url as string,
        };

        const text = [
          `# ${out.full_name}`,
          out.description ?? "_No description_",
          "",
          `- **Visibility**: ${out.visibility}`,
          `- **Default branch**: ${out.default_branch}`,
          `- **Open issues**: ${out.open_issues_count}`,
          `- **Stars**: ${out.stargazers_count}  **Forks**: ${out.forks_count}`,
          `- **Last push**: ${formatDate(out.pushed_at)}`,
          `- **URL**: ${out.html_url}`,
        ].join("\n");

        return { content: [{ type: "text", text }], structuredContent: out };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ── github_list_branches ─────────────────────────────────────────────────────
  server.registerTool(
    "github_list_branches",
    {
      title: "List Branches",
      description: `List branches in a GitHub repository, newest-pushed first.

Args:
  - owner (string, optional): GitHub org or user. Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Repository name. Defaults to GITHUB_REPO env var.
  - filter (string, optional): Case-insensitive substring filter on branch name (e.g. "codex").
  - limit (number, default 30, max 100): Maximum branches to return.
  - page (number, default 1): Page number for pagination.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: Branch names, whether they are protected, and the SHA of their latest commit.

Examples:
  - "List all Codex branches" → filter="codex"
  - "Show open feature branches" → filter="feature"`,
      inputSchema: RepoParamsSchema.extend({
        filter: z
          .string()
          .optional()
          .describe("Case-insensitive substring to filter branch names"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .default(DEFAULT_LIMIT)
          .describe("Maximum branches to return"),
        page: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe("Page number"),
        response_format: z
          .nativeEnum(ResponseFormat)
          .default(ResponseFormat.MARKDOWN)
          .describe("Output format"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { owner, repo } = resolveRepo(params.owner, params.repo);
        const { data } = await getClient().get(
          `/repos/${owner}/${repo}/branches`,
          { params: { per_page: params.limit, page: params.page } }
        );

        type BranchItem = { name: string; protected: boolean; commit: { sha: string } };
        let branches = data as BranchItem[];

        if (params.filter) {
          const q = params.filter.toLowerCase();
          branches = branches.filter((b) => b.name.toLowerCase().includes(q));
        }

        const out = {
          count: branches.length,
          page: params.page,
          has_more: branches.length === params.limit,
          branches: branches.map((b) => ({
            name: b.name,
            protected: b.protected,
            sha: b.commit.sha,
          })),
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const lines = [
          `# Branches — ${owner}/${repo}`,
          params.filter ? `_Filter: "${params.filter}"_` : "",
          `Showing ${out.count} branch${out.count !== 1 ? "es" : ""}${out.has_more ? " (more available)" : ""}`,
          "",
        ].filter((l) => l !== undefined);

        for (const b of out.branches) {
          lines.push(
            `- **${b.name}**${b.protected ? " 🔒" : ""}  \`${b.sha.slice(0, 7)}\``
          );
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: out,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ── github_compare ───────────────────────────────────────────────────────────
  server.registerTool(
    "github_compare",
    {
      title: "Compare Branches / Refs",
      description: `Compare two refs (branches, tags, or SHAs) and show the commit delta and changed-file summary.

Args:
  - base (string): The base ref to compare from (e.g. "main").
  - head (string): The head ref to compare to (e.g. "codex/my-feature").
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: Commit count ahead/behind, list of commits in head not in base, and files changed.

Examples:
  - "How many commits is the Codex branch ahead of main?" → base="main", head="codex/branch-name"
  - "What files changed between main and a PR branch?" → base="main", head="branch-name"`,
      inputSchema: RepoParamsSchema.extend({
        base: z.string().describe("Base ref (branch, tag, or SHA)"),
        head: z.string().describe("Head ref to compare against base"),
        response_format: z
          .nativeEnum(ResponseFormat)
          .default(ResponseFormat.MARKDOWN),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { owner, repo } = resolveRepo(params.owner, params.repo);
        const { data } = await getClient().get(
          `/repos/${owner}/${repo}/compare/${encodeURIComponent(params.base)}...${encodeURIComponent(params.head)}`
        );

        type CommitItem = { sha: string; commit: { message: string; author: { date: string } } };
        type FileItem = { filename: string; status: string; additions: number; deletions: number };

        const commits = (data.commits as CommitItem[]).map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
          date: c.commit.author.date,
        }));

        const files = (data.files as FileItem[]).map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        }));

        const out = {
          base: params.base,
          head: params.head,
          status: data.status as string,
          ahead_by: data.ahead_by as number,
          behind_by: data.behind_by as number,
          commits,
          files,
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const lines = [
          `# Compare: \`${params.base}\` ← \`${params.head}\``,
          "",
          `**Status**: ${out.status}  |  **Ahead**: ${out.ahead_by}  **Behind**: ${out.behind_by}`,
          "",
          `## Commits (${commits.length})`,
        ];

        for (const c of commits) {
          lines.push(`- \`${c.sha}\` ${c.message}  _${formatDate(c.date)}_`);
        }

        lines.push("", `## Files changed (${files.length})`);

        for (const f of files) {
          lines.push(
            `- \`${f.filename}\` — ${f.status}  (+${f.additions} / -${f.deletions})`
          );
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: out,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
