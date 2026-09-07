import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getClient,
  handleApiError,
  resolveRepo,
  repoSlug,
  decodeContent,
} from "../client.js";
import { CHARACTER_LIMIT, ResponseFormat } from "../constants.js";

const RepoParamsSchema = z.object({
  owner: z.string().optional(),
  repo: z.string().optional(),
});

// Encode each path segment separately so a segment containing `#`, `?`, or
// `../` can't corrupt the request's query string or path structure, while
// still allowing `/` to separate legitimate nested directories.
function encodeRepoPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function registerFileTools(server: McpServer): void {
  // ── github_get_file ──────────────────────────────────────────────────────────
  server.registerTool(
    "github_get_file",
    {
      title: "Get File Contents",
      description: `Fetch the contents of a single file from a GitHub repository at a specific ref (branch, tag, or SHA).

Args:
  - path (string): File path relative to repo root (e.g. "packages/domain/jobs.ts").
  - ref (string, optional): Branch, tag, or SHA to read from. Defaults to the repo's default branch.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.

Returns: Decoded file content as plain text. Responses exceeding ${CHARACTER_LIMIT} characters are truncated.

Examples:
  - "Read the brief Codex just added" → path=".claude/design/002-portal-share-resend/brief.md", ref="codex/my-branch"
  - "What does packages/types/index.ts export?" → path="packages/types/index.ts"`,
      inputSchema: RepoParamsSchema.extend({
        path: z.string().describe("File path relative to repo root"),
        ref: z
          .string()
          .optional()
          .describe("Branch, tag, or SHA (defaults to default branch)"),
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
        const queryParams: Record<string, string> = {};
        if (params.ref) queryParams.ref = params.ref;

        const { data } = await getClient().get(
          `/repos/${repoSlug(owner, repo)}/contents/${encodeRepoPath(params.path)}`,
          { params: queryParams }
        );

        if (data.type !== "file") {
          return {
            content: [
              {
                type: "text",
                text: `Error: "${params.path}" is a ${data.type as string}, not a file. Use github_list_directory to browse directories.`,
              },
            ],
          };
        }

        const content = decodeContent(data.content as string);
        const header = `// ${owner}/${repo}:${data.path as string}${params.ref ? ` @ ${params.ref}` : ""} (${data.size as number} bytes)\n\n`;
        const full = header + content;

        return {
          content: [
            {
              type: "text",
              text:
                full.length > CHARACTER_LIMIT
                  ? full.slice(0, CHARACTER_LIMIT) +
                    `\n\n[Truncated at ${CHARACTER_LIMIT} chars — file has ${content.length} bytes total]`
                  : full,
            },
          ],
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ── github_list_directory ────────────────────────────────────────────────────
  server.registerTool(
    "github_list_directory",
    {
      title: "List Directory Contents",
      description: `List files and subdirectories at a path in a GitHub repository.

Args:
  - path (string, optional): Directory path relative to repo root. Defaults to root ("/").
  - ref (string, optional): Branch, tag, or SHA. Defaults to default branch.
  - owner (string, optional): Defaults to GITHUB_OWNER env var.
  - repo (string, optional): Defaults to GITHUB_REPO env var.
  - response_format ('markdown' | 'json', default 'markdown'): Output format.

Returns: List of entries with name, type (file/dir), size, and path.

Examples:
  - "What's in the packages directory?" → path="packages"
  - "Show me what Codex added in .claude/" → path=".claude", ref="codex/branch"`,
      inputSchema: RepoParamsSchema.extend({
        path: z
          .string()
          .default("")
          .describe('Directory path (empty string = repo root)'),
        ref: z.string().optional().describe("Branch, tag, or SHA"),
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
        const queryParams: Record<string, string> = {};
        if (params.ref) queryParams.ref = params.ref;

        const slug = repoSlug(owner, repo);
        const urlPath = params.path
          ? `/repos/${slug}/contents/${encodeRepoPath(params.path)}`
          : `/repos/${slug}/contents`;

        const { data } = await getClient().get(urlPath, {
          params: queryParams,
        });

        if (!Array.isArray(data)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: "${params.path}" is a file, not a directory. Use github_get_file to read its contents.`,
              },
            ],
          };
        }

        type Entry = { name: string; type: string; size: number; path: string };
        const entries = (data as Entry[]).map((e) => ({
          name: e.name,
          type: e.type,
          size: e.type === "file" ? e.size : null,
          path: e.path,
        }));

        const dirs = entries.filter((e) => e.type === "dir");
        const files = entries.filter((e) => e.type === "file");

        const out = { path: params.path || "/", ref: params.ref ?? "default", entries };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
            structuredContent: out,
          };
        }

        const lines = [
          `# ${owner}/${repo}/${params.path || ""}${params.ref ? ` @ ${params.ref}` : ""}`,
          "",
        ];

        if (dirs.length > 0) {
          lines.push("**Directories**");
          for (const d of dirs) lines.push(`  📁 ${d.name}/`);
          lines.push("");
        }

        if (files.length > 0) {
          lines.push("**Files**");
          for (const f of files) {
            const size = f.size != null ? ` (${f.size} B)` : "";
            lines.push(`  📄 ${f.name}${size}`);
          }
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
