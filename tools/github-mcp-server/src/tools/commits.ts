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
  owner: z.string().optional(),
  repo: z.string().optional(),
});

export function registerCommitTools(server: McpServer): void {
  // ── github_list_commits ──────────────────────────────────────────────────────
  server.registerTool(
    "github_list_commits",
    {
      title: "List Commits",
      description: `List commits on a branch or ref, newest first.

Args:
  - ref (string, optional): Branch, tag, or SHA. Defaults to default branch.
  - path (string, optional): Only show commits that touched this file or directory path.
  - author (string, optional): Filter by GitHub username or email.
  - since (string, optional): ISO 8601 date — only commits after this date (e.g. "2025-01-01").
  - limit (number, default 30, max 100): Maximum commits to return.
  - page (number, default 1): Page number.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: SHA, short message, author, and date for each commit.

Examples:
  - "What did Codex commit on the feature branch?" → ref="codex/branch-name"
  - "Show commits that touched packages/domain/jobs.ts" → path="packages/domain/jobs.ts"`,
      inputSchema: RepoParamsSchema.extend({
        ref: z.string().optional().describe("Branch, tag, or SHA"),
        path: z.string().optional().describe("Filter commits touching this path"),
        author: z.string().optional().describe("GitHub username or email"),
        since: z
          .string()
          .optional()
          .describe('ISO 8601 date string (e.g. "2025-01-01")'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .default(DEFAULT_LIMIT),
        page: z.number().int().min(1).default(1),
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
        const query: Record<string, string | number> = {
          per_page: params.limit,
          page: params.page,
        };
        if (params.ref) query.sha = params.ref;
        if (params.path) query.path = params.path;
        if (params.author) query.author = params.author;
        if (params.since) query.since = params.since;

        const { data } = await getClient().get(
          `/repos/${owner}/${repo}/commits`,
          { params: query }
        );

        type CommitItem = {
          sha: string;
          commit: {
            message: string;
            author: { name: string; date: string };
          };
          author: { login: string } | null;
        };

        const commits = (data as CommitItem[]).map((c) => ({
          sha: c.sha,
          sha_short: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
          author_name: c.commit.author.name,
          author_login: c.author?.login ?? null,
          date: c.commit.author.date,
        }));

        const out = {
          count: commits.length,
          page: params.page,
          has_more: commits.length === params.limit,
          commits,
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const refLabel = params.ref ?? "default branch";
        const lines = [
          `# Commits on \`${refLabel}\` — ${owner}/${repo}`,
          params.path ? `_Filtered to path: ${params.path}_` : "",
          `Showing ${commits.length} commit${commits.length !== 1 ? "s" : ""}${out.has_more ? " (more available, use page param)" : ""}`,
          "",
        ].filter((l) => l !== "");

        for (const c of commits) {
          const who = c.author_login ? `@${c.author_login}` : c.author_name;
          lines.push(
            `- \`${c.sha_short}\` **${c.message}**  — ${who}  _${formatDate(c.date)}_`
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

  // ── github_get_commit ────────────────────────────────────────────────────────
  server.registerTool(
    "github_get_commit",
    {
      title: "Get Commit Details",
      description: `Get the full details of a single commit: message, author, stats, and list of changed files.

Args:
  - sha (string): Full or abbreviated commit SHA.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: Commit message, author, date, file list with add/delete stats, and total changes.

Examples:
  - "What did commit abc1234 change?" → sha="abc1234"
  - "Show me the files Codex touched in the latest commit" → sha from github_list_commits`,
      inputSchema: RepoParamsSchema.extend({
        sha: z.string().describe("Full or abbreviated commit SHA"),
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
          `/repos/${owner}/${repo}/commits/${params.sha}`
        );

        type FileItem = {
          filename: string;
          status: string;
          additions: number;
          deletions: number;
          patch?: string;
        };

        const files = (data.files as FileItem[]).map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        }));

        const out = {
          sha: data.sha as string,
          sha_short: (data.sha as string).slice(0, 7),
          message: data.commit.message as string,
          author_name: data.commit.author.name as string,
          author_login: (data.author as { login: string } | null)?.login ?? null,
          date: data.commit.author.date as string,
          stats: {
            additions: data.stats.additions as number,
            deletions: data.stats.deletions as number,
            total: data.stats.total as number,
          },
          files,
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const who = out.author_login ? `@${out.author_login}` : out.author_name;
        const lines = [
          `# Commit \`${out.sha_short}\``,
          "",
          `**Message**: ${out.message}`,
          `**Author**: ${who}  **Date**: ${formatDate(out.date)}`,
          `**Stats**: +${out.stats.additions} / -${out.stats.deletions} (${out.stats.total} total)`,
          "",
          `## Files (${files.length})`,
        ];

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
