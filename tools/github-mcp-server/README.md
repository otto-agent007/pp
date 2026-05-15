# github-mcp-server

Local MCP server that exposes GitHub REST API tools via stdio transport.
Built for the pest-patrol-os Cowork/Codex workflow.

## Tools

| Tool | Description |
|---|---|
| `github_get_repo` | Repository metadata (default branch, last push, issue count) |
| `github_list_branches` | List branches with optional name filter |
| `github_compare` | Compare two refs — commits ahead/behind and changed files |
| `github_get_file` | Read a file from any branch or SHA |
| `github_list_directory` | Browse a directory at any ref |
| `github_list_commits` | List commits on a branch, optionally filtered by path or author |
| `github_get_commit` | Full commit details: message, author, file stats |
| `github_list_pull_requests` | List PRs by state, head branch, or base branch |
| `github_get_pull_request` | PR details: description, review decision, merge state |
| `github_get_pull_request_files` | Files changed in a PR, optionally with diff patches |
| `github_get_pull_request_checks` | CI check-run status for a PR's head commit |
| `github_create_pull_request` | Open a new PR |
| `github_add_pr_comment` | Post a comment on a PR |
| `github_list_issues` | List issues (PRs filtered out by default) |
| `github_create_issue` | Create a new issue |

## Setup

### 1. Build

```bash
cd tools/github-mcp-server
npm install
npm run build
```

### 2. Create a GitHub token

Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.

Minimum permissions for the pest-patrol-os repo:
- **Contents**: Read
- **Pull requests**: Read and write
- **Issues**: Read and write
- **Checks**: Read
- **Metadata**: Read (required)

### 3. Add to Claude's MCP config

In `claude_desktop_config.json` (or your Cowork MCP settings):

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["C:/Users/bckup/Codex/pest-patrol-os/tools/github-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token_here",
        "GITHUB_OWNER": "your-org-or-username",
        "GITHUB_REPO": "pest-patrol-os"
      }
    }
  }
}
```

Setting `GITHUB_OWNER` and `GITHUB_REPO` as defaults means you can call any tool without
specifying them each time. You can still override per-call for cross-repo operations.

### 4. Restart Claude / Cowork

The `github_*` tools will appear in the next session.

## Usage examples

```
# Watch for new Codex branches
github_list_branches  filter="codex"

# Read a brief Codex just committed
github_get_file  path=".claude/design/002-portal-share-resend/brief.md"  ref="codex/claude-portal-share-resend-brief"

# Check if a PR is ready
github_get_pull_request  pull_number=42
github_get_pull_request_checks  pull_number=42

# See what changed
github_get_pull_request_files  pull_number=42

# Leave a design note
github_add_pr_comment  pull_number=42  body="Design note: ..."

# Compare a Codex branch to main
github_compare  base="main"  head="codex/my-feature"
```
