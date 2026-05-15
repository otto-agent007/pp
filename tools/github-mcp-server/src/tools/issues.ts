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

export function registerIssueTools(server: McpServer): void {
  // ── github_list_issues ───────────────────────────────────────────────────────
  server.registerTool(
    "github_list_issues",
    {
      title: "List Issues",
      description: `List issues in a GitHub repository. Note: pull requests are also returned by the GitHub issues API — filter with is_pr=false to exclude them.

Args:
  - state ('open' | 'closed' | 'all', default 'open'): Filter by issue state.
  - labels (string, optional): Comma-separated label names to filter by (e.g. "bug,enhancement").
  - assignee (string, optional): GitHub username of the assignee. Use "none" for unassigned.
  - filter_prs (boolean, default true): Exclude pull requests from results.
  - limit (number, default 30, max 100): Maximum issues to return.
  - page (number, default 1): Page number.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: Issue number, title, state, labels, assignees, and dates.`,
      inputSchema: RepoParamsSchema.extend({
        state: z.enum(["open", "closed", "all"]).default("open"),
        labels: z
          .string()
          .optional()
          .describe("Comma-separated label names"),
        assignee: z.string().optional().describe("GitHub username or 'none'"),
        filter_prs: z
          .boolean()
          .default(true)
          .describe("Exclude pull requests from results"),
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
        if (params.labels) query.labels = params.labels;
        if (params.assignee) query.assignee = params.assignee;

        const { data } = await getClient().get(
          `/repos/${owner}/${repo}/issues`,
          { params: query }
        );

        type Issue = {
          number: number;
          title: string;
          state: string;
          pull_request?: unknown;
          user: { login: string };
          labels: { name: string }[];
          assignees: { login: string }[];
          created_at: string;
          updated_at: string;
          html_url: string;
        };

        let issues = data as Issue[];
        if (params.filter_prs) {
          issues = issues.filter((i) => !i.pull_request);
        }

        const mapped = issues.map((i) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          author: i.user.login,
          labels: i.labels.map((l) => l.name),
          assignees: i.assignees.map((a) => a.login),
          created_at: i.created_at,
          updated_at: i.updated_at,
          html_url: i.html_url,
        }));

        const out = { count: mapped.length, page: params.page, issues: mapped };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const lines = [
          `# Issues — ${owner}/${repo} (${params.state})`,
          `Showing ${mapped.length} issue${mapped.length !== 1 ? "s" : ""}`,
          "",
        ];

        for (const i of mapped) {
          const labelStr =
            i.labels.length > 0 ? `  \`${i.labels.join("` `")}\`` : "";
          lines.push(
            `## #${i.number} ${i.title}${labelStr}`,
            `**Author**: @${i.author}  **Updated**: ${formatDate(i.updated_at)}`,
            i.html_url,
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

  // ── github_create_issue ──────────────────────────────────────────────────────
  server.registerTool(
    "github_create_issue",
    {
      title: "Create Issue",
      description: `Create a new issue in a GitHub repository.

Args:
  - title (string): Issue title.
  - body (string, optional): Issue body (Markdown).
  - labels (string[], optional): Array of label names to apply.
  - assignees (string[], optional): Array of GitHub usernames to assign.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.

Returns: Issue number and URL.`,
      inputSchema: RepoParamsSchema.extend({
        title: z.string().min(1).describe("Issue title"),
        body: z.string().optional().describe("Issue body (Markdown)"),
        labels: z
          .array(z.string())
          .optional()
          .describe("Label names to apply"),
        assignees: z
          .array(z.string())
          .optional()
          .describe("GitHub usernames to assign"),
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
          `/repos/${owner}/${repo}/issues`,
          {
            title: params.title,
            body: params.body ?? "",
            labels: params.labels ?? [],
            assignees: params.assignees ?? [],
          }
        );

        const out = {
          number: data.number as number,
          title: data.title as string,
          html_url: data.html_url as string,
        };

        return {
          content: [
            {
              type: "text",
              text: `Created issue #${out.number}: ${out.title}\n${out.html_url}`,
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
