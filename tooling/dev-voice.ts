import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface CliOptions {
  helperOnly: boolean;
  model: string;
}

function usage() {
  return [
    "Usage:",
    "  corepack pnpm dev:voice                 # web app + Whisper helper",
    "  corepack pnpm voice:dev                 # Whisper helper only",
    "  corepack pnpm voice:dev -- --model small",
    "",
    "Models: tiny, base, small, medium, large. Default: base.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    helperOnly: false,
    model: "base",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }

    if (arg === "--helper-only") {
      options.helperOnly = true;
      continue;
    }

    if (arg === "--model") {
      if (!next) {
        throw new Error(`Missing value for --model.\n\n${usage()}`);
      }

      options.model = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown voice dev argument: ${arg}\n\n${usage()}`);
  }

  return options;
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function spawnLogged(name: string, command: string, args: string[]) {
  console.log(`[voice] Starting ${name}: ${command} ${args.join(" ")}`);

  return spawn(command, args, {
    cwd: repoRoot,
    env: process.env,
    shell: false,
    stdio: "inherit",
    windowsHide: false,
  });
}

function startWhisper(model: string) {
  if (process.platform === "win32") {
    return spawnLogged("Whisper helper", "powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(repoRoot, "apps", "whisper", "start.ps1"),
      model,
    ]);
  }

  return spawnLogged("Whisper helper", "bash", [
    join(repoRoot, "apps", "whisper", "start.sh"),
    model,
  ]);
}

function startWeb() {
  return spawnLogged("web app", "corepack", [
    "pnpm",
    "--filter",
    "@pest-patrol/web",
    "dev",
  ]);
}

function shutdown(children: ChildProcess[]) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const children = [startWhisper(options.model)];

  if (!options.helperOnly) {
    children.push(startWeb());
  }

  console.log("");
  console.log("[voice] Whisper helper: http://127.0.0.1:8765");
  console.log("[voice] Health check: corepack pnpm voice:health");
  if (!options.helperOnly) {
    console.log("[voice] Web app: http://127.0.0.1:3000");
  }

  const stop = () => {
    shutdown(children);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  for (const child of children) {
    child.on("exit", (code) => {
      if (code && code !== 0) {
        shutdown(children.filter((current) => current !== child));
        process.exitCode = code;
      }
    });
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Voice dev failed";
  console.error(message);
  process.exitCode = 1;
}
