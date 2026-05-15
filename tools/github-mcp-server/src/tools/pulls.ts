import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getClient,
  handleApiError,
  resolveRepo,
  formatDate,
  truncate,
} from "../client.js";
import { ResponseFormat, CHARACTER_LIMIT, DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

const RepoParamsSchema = z.object({
  owner: z.string().optional(),
  repo: z.string().optional(),
});

export function registerPullTools(server: McpServer): void {
  // ── github_list_pull_requests ────────────────────────────────────────────────
  server.registerTool(
    "github_list_pull_requests",
    {
      title: "List Pull Requests",
      description: `List pull requests in a GitHub repository.

Args:
  - state ('open' | 'closed' | 'all', default 'open'): Filter by PR state.
  - head (string, optional): Filter by head branch (e.g. "codex/my-feature").
  - base (string, optional): Filter by base branch (e.g. "main").
  - limit (number, default 30, max 100): Maximum PRs to return.
  - page (number, default 1): Page number.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: PR number, title, state, head/base branches, author, and dates.

Examples:
  - "List open PRs from Codex" → head filter containing "codex"
  - "What PRs are targeting main?" → base="main"`,
      inputSchema: RepoParamsSchema.extend({
        state: z
          .enum(["open", "closed", "all"])
          .default("open")
          .describe("PR state filter"),
        head: z
          .string()
          .optional()
          .describe("Filter by head branch (owner:branch or branch)"),
        base: z.string().optional().describe("Filter by base branch"),
        limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
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
          state: params.state,
          per_page: params.limit,
          page: params.page,
          sort: "updated",
          direction: "desc",
        };
        if (params.head) query.head = params.head;
        if (params.base) query.base = params.base;

        const { data } = await getClient().get(
          `/repos/${owner}/${repo}/pulls`,
          { params: query }
        );

        type PR = {
          number: number;
          title: string;
          state: string;
          draft: boolean;
          user: { login: string };
          head: { ref: string };
          base: { ref: string };
          created_at: string;
          updated_at: string;
          html_url: string;
        };

        const prs = (data as PR[]).map((p) => ({
          number: p.number,
          title: p.title,
          state: p.state,
          draft: p.draft,
          author: p.user.login,
          head_branch: p.head.ref,
          base_branch: p.base.ref,
          created_at: p.created_at,
          updated_at: p.updated_at,
          html_url: p.html_url,
        }));

        const out = {
          count: prs.length,
          page: params.page,
          has_more: prs.length === params.limit,
          prs,
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const lines = [
          `# Pull Requests — ${owner}/${repo} (${params.state})`,
          `Showing ${prs.length} PR${prs.length !== 1 ? "s" : ""}${out.has_more ? " (more available)" : ""}`,
          "",
        ];

        for (const p of prs) {
          const draft = p.draft ? " [DRAFT]" : "";
          lines.push(
            `## #${p.number}${draft} ${p.title}`,
            `**Author**: @${p.author}  **State**: ${p.state}`,
            `**Branch**: \`${p.head_branch}\` → \`${p.base_branch}\``,
            `**Updated**: ${formatDate(p.updated_at)}`,
            p.html_url,
            ""
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

  // ── github_get_pull_request ──────────────────────────────────────────────────
  server.registerTool(
    "github_get_pull_request",
    {
      title: "Get Pull Request Details",
      description: `Get full details of a pull request including description, review status, CI check summary, and merge state.

Args:
  - pull_number (number): The PR number.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: Title, body, state, draft status, author, branches, review decision, CI status, and merge eligibility.

Examples:
  - "What's the status of PR #42?" → pull_number=42
  - "Is Codex's PR ready to merge?" → pull_number from github_list_pull_requests`,
      inputSchema: RepoParamsSchema.extend({
        pull_number: z
          .number()
          .int()
          .min(1)
          .describe("Pull request number"),
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
          `/repos/${owner}/${repo}/pulls/${params.pull_number}`
        );

        const out = {
          number: data.number as number,
          title: data.title as string,
          state: data.state as string,
          draft: data.draft as boolean,
          merged: data.merged as boolean,
          mergeable: data.mergeable as boolean | null,
          mergeable_state: data.mergeable_state as string,
          author: (data.user as { login: string }).login,
          head_branch: (data.head as { ref: string }).ref,
          base_branch: (data.base as { ref: string }).ref,
          body: (data.body as string | null) ?? null,
          review_decision: (data.review_decision as string | null) ?? null,
          commits: data.commits as number,
          additions: data.additions as number,
          deletions: data.deletions as number,
          changed_files: data.changed_files as number,
          created_at: data.created_at as string,
          updated_at: data.updated_at as string,
          html_url: data.html_url as string,
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const mergeStatus = out.merged
          ? "✅ Merged"
          : out.draft
          ? "🔧 Draft"
          : out.mergeable === false
          ? "⚠️ Conflicts"
          : `${out.mergeable_state}`;

        const lines = [
          `# PR #${out.number}: ${out.title}`,
          "",
          `**Author**: @${out.author}  **State**: ${out.state}  **Merge**: ${mergeStatus}`,
          `**Branch**: \`${out.head_branch}\` → \`${out.base_branch}\``,
          `**Review decision**: ${out.review_decision ?? "none"}`,
          `**Changes**: +${out.additions} / -${out.deletions} across ${out.changed_files} file${out.changed_files !== 1 ? "s" : ""} in ${out.commits} commit${out.commits !== 1 ? "s" : ""}`,
          `**Updated**: ${formatDate(out.updated_at)}`,
          out.html_url,
          "",
        ];

        if (out.body) {
          lines.push("## Description", "", out.body);
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

  // ── github_get_pull_request_files ────────────────────────────────────────────
  server.registerTool(
    "github_get_pull_request_files",
    {
      title: "Get Pull Request Files",
      description: `List the files changed in a pull request with their change status and diff stats. Optionally include patch diffs (may be large).

Args:
  - pull_number (number): The PR number.
  - include_patch (boolean, default false): Whether to include diff patch text per file.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.

Returns: Filename, status (added/modified/removed/renamed), additions, deletions, and optionally patch text.

Examples:
  - "What files did this PR change?" → pull_number=42
  - "Show the diff for PR #15" → pull_number=15, include_patch=true`,
      inputSchema: RepoParamsSchema.extend({
        pull_number: z.number().int().min(1).describe("Pull request number"),
        include_patch: z
          .boolean()
          .default(false)
          .describe("Include diff patch text per file"),
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
          `/repos/${owner}/${repo}/pulls/${params.pull_number}/files`,
          { params: { per_page: 100 } }
        );

        type FileItem = {
          filename: string;
          status: string;
          additions: number;
          deletions: number;
          changes: number;
          patch?: string;
        };

        const files = (data as FileItem[]).map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          ...(params.include_patch && f.patch ? { patch: f.patch } : {}),
        }));

        const lines = [
          `# Files in PR #${params.pull_number} — ${owner}/${repo}`,
          `${files.length} file${files.length !== 1 ? "s" : ""} changed`,
          "",
        ];

        for (const f of files) {
          lines.push(
            `### \`${f.filename}\` — ${f.status}  (+${f.additions} / -${f.deletions})`
          );
          if (params.include_patch && "patch" in f && f.patch) {
            lines.push("```diff", f.patch, "```");
          }
          lines.push("");
        }

        const text = truncate(lines.join("\n"), CHARACTER_LIMIT);

        return {
          content: [{ type: "text", text }],
          structuredContent: { pull_number: params.pull_number, files },
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ── github_get_pull_request_checks ──────────────────────────────────────────
  server.registerTool(
    "github_get_pull_request_checks",
    {
      title: "Get Pull Request CI Checks",
      description: `Get the CI/CD check-run status for the head commit of a pull request.

Args:
  - pull_number (number): The PR number.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.

Returns: Each check's name, status (queued/in_progress/completed), conclusion (success/failure/neutral/skipped/etc.), and a link to details.

Examples:
  - "Did Codex's PR pass CI?" → pull_number=42
  - "Which checks are failing on PR #7?" → pull_number=7`,
      inputSchema: RepoParamsSchema.extend({
        pull_number: z.number().int().min(1).describe("Pull request number"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { owner, repo } = resolveRepo(params.owner, params.repo);

        // First get the PR to find the head SHA
        const { data: prData } = await getClient().get(
          `/repos/${owner}/${repo}/pulls/${params.pull_number}`
        );
        const headSha = (prData.head as { sha: string }).sha;

        const { data } = await getClient().get(
          `/repos/${owner}/${repo}/commits/${headSha}/check-runs`,
          { params: { per_page: 100 } }
        );

        type CheckRun = {
          name: string;
          status: string;
          conclusion: string | null;
          details_url: string;
          started_at: string | null;
          completed_at: string | null;
        };

        const checks = (data.check_runs as CheckRun[]).map((c) => ({
          name: c.name,
          status: c.status,
          conclusion: c.conclusion,
          details_url: c.details_url,
          started_at: c.started_at,
          completed_at: c.completed_at,
        }));

        const passing = checks.filter((c) => c.conclusion === "success").length;
        const failing = checks.filter(
          (c) => c.conclusion === "failure" || c.conclusion === "timed_out"
        ).length;
        const pending = checks.filter(
          (c) => c.status !== "completed"
        ).length;

        const conclusionIcon = (c: (typeof checks)[0]) => {
          if (c.status !== "completed") return "⏳";
          switch (c.conclusion) {
            case "success": return "✅";
            case "failure":
            case "timed_out": return "❌";
            case "skipped": return "⏭️";
            case "neutral": return "⚪";
            default: return "❓";
          }
        };

        const lines = [
          `# CI Checks — PR #${params.pull_number}  \`${headSha.slice(0, 7)}\``,
          `✅ ${passing} passing  ❌ ${failing} failing  ⏳ ${pending} pending`,
          "",
        ];

        for (const c of checks) {
          lines.push(
            `${conclusionIcon(c)} **${c.name}** — ${c.conclusion ?? c.status}`
          );
        }

        const out = {
          pull_number: params.pull_number,
          head_sha: headSha,
          total: checks.length,
          passing,
          failing,
          pending,
          checks,
        };

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: out,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ── github_create_pull_request ───────────────────────────────────────────────
  server.registerTool(
    "github_create_pull_request",
    {
      title: "Create Pull Request",
      description: `Open a new pull request.

Args:
  - title (string): PR title.
  - head (string): The branch with your changes (e.g. "codex/my-feature").
  - base (string): The branch to merge into (e.g. "main").
  - body (string, optional): PR description in Markdown.
  - draft (boolean, default false): Open as a draft PR.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.

Returns: PR number, URL, and state.

Examples:
  - "Open a PR for the portal-share feature" → head="codex/portal-share", base="main"`,
      inputSchema: RepoParamsSchema.extend({
        title: z.string().min(1).describe("Pull request title"),
        head: z.string().describe("Head branch (branch with your changes)"),
        base: z.string().describe("Base branch to merge into"),
        body: z.string().optional().describe("PR description (Markdown)"),
        draft: z.boolean().default(false).describe("Open as draft"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { owner, repo } = resolveRepo(params.owner, params.repo);
        const { data } = await getClient().post(
          `/repos/${owner}/${repo}/pulls`,
          {
            title: params.title,
            head: params.head,
            base: params.base,
            body: params.body ?? "",
            draft: params.draft,
          }
        );

        const out = {
          number: data.number as number,
          title: data.title as string,
          state: data.state as string,
          draft: data.draft as boolean,
          html_url: data.html_url as string,
        };

        return {
          content: [
            {
              type: "text",
              text: `Created PR #${out.number}: ${out.title}\n${out.html_url}`,
            },
          ],
          structuredContent: out,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ── github_add_pr_comment ────────────────────────────────────────────────────
  server.registerTool(
    "github_add_pr_comment",
    {
      title: "Add Pull Request Comment",
      description: `Add a general comment to a pull request (not a file-level review comment).

Args:
  - pull_number (number): The PR number.
  - body (string): The comment text (Markdown supported).
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.

Returns: Comment ID and URL.

Examples:
  - "Leave a design note on PR #42" → pull_number=42, body="Design note: ..."
  - "Approve the proposal with a comment" → pull_number=8, body="LGTM — proposal looks good"`,
      inputSchema: RepoParamsSchema.extend({
        pull_number: z.number().int().min(1).describe("Pull request number"),
        body: z.string().min(1).describe("Comment text (Markdown supported)"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { owner, repo } = resolveRepo(params.owner, params.repo);

        // PR comments go through the issues comments API
        const { data } = await getClient().post(
          `/repos/${owner}/${repo}/issues/${params.pull_number}/comments`,
          { body: params.body }
        );

        const out = {
          id: data.id as number,
          html_url: data.html_url as string,
          created_at: data.created_at as string,
        };

        return {
          content: [
            {
              type: "text",
              text: `Comment posted on PR #${params.pull_number}: ${out.html_url}`,
            },
          ],
          structuredContent: out,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
