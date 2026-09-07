import axios, { type AxiosInstance, type AxiosError } from "axios";
import { GITHUB_API_BASE } from "./constants.js";

let client: AxiosInstance | null = null;

export function getClient(): AxiosInstance {
  if (!client) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN environment variable is required. " +
          "Set it to a GitHub personal access token with repo scope."
      );
    }

    client = axios.create({
      baseURL: GITHUB_API_BASE,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
    });
  }

  return client;
}

export function handleApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  if (axiosError.isAxiosError) {
    const status = axiosError.response?.status;
    const message = axiosError.response?.data?.message;

    switch (status) {
      case 401:
        return "Error: GitHub authentication failed. Check that GITHUB_TOKEN is valid and not expired.";
      case 403:
        return `Error: Permission denied. Your token may lack the required scope. ${message ?? ""}`.trim();
      case 404:
        return "Error: Resource not found. Check the owner, repo, and any IDs or paths provided.";
      case 409:
        return `Error: Conflict — ${message ?? "the operation could not be completed in the current state."}`;
      case 422:
        return `Error: Validation failed — ${message ?? "check the parameters and try again."}`;
      case 429:
        return "Error: Rate limit exceeded. Wait before making more requests, or use a token with higher limits.";
      default:
        if (axiosError.code === "ECONNABORTED") {
          return "Error: Request timed out. GitHub may be slow — try again.";
        }
        return `Error: GitHub API request failed (${status ?? "unknown status"}): ${message ?? axiosError.message}`;
    }
  }

  return `Error: Unexpected error — ${error instanceof Error ? error.message : String(error)}`;
}

/** Resolve owner/repo from params or env fallbacks. */
export function resolveRepo(
  owner: string | undefined,
  repo: string | undefined
): { owner: string; repo: string } {
  const resolvedOwner = owner?.trim() || process.env.GITHUB_OWNER;
  const resolvedRepo = repo?.trim() || process.env.GITHUB_REPO;

  if (!resolvedOwner) {
    throw new Error(
      "owner is required. Pass it as a parameter or set the GITHUB_OWNER environment variable."
    );
  }
  if (!resolvedRepo) {
    throw new Error(
      "repo is required. Pass it as a parameter or set the GITHUB_REPO environment variable."
    );
  }

  return { owner: resolvedOwner, repo: resolvedRepo };
}

/**
 * Encode an owner/repo pair for interpolation into an API path. Either half can
 * come from a tool argument or an environment variable, so a value containing
 * `/`, `?`, or `#` would otherwise reshape the request into a different
 * endpoint than the caller asked for.
 */
export function repoSlug(owner: string, repo: string): string {
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

/** Decode base64 file content returned by the GitHub contents API. */
export function decodeContent(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/** Format an ISO date string as a compact human-readable label. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Truncate a string to CHARACTER_LIMIT with a notice appended. */
export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const notice = `\n\n[Response truncated at ${limit} characters. Use filters, pagination, or a narrower path to see more.]`;
  return text.slice(0, limit - notice.length) + notice;
}
