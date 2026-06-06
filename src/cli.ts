#!/usr/bin/env bun
// src/cli.ts — CLI entrypoint for agents-md-gen
// Usage: bun src/cli.ts [repo-path] [--out AGENTS.md] [--help]
import { access } from "fs/promises";
import { join } from "path";
import { scanRepo } from "./scanner";
import { generateAgentsMd } from "./generator";

export const USAGE = `agents-md-gen — generate an AGENTS.md for a codebase

Usage:
  agents-md-gen [repo-path] [options]

Arguments:
  repo-path            Path to the repository to scan (default: ".")

Options:
  --out <file>         Output filename, written inside repo-path (default: "AGENTS.md")
  --help               Print this help and exit

Examples:
  agents-md-gen .
  agents-md-gen ./my-project --out CONTEXT.md`;

export interface CliOptions {
  repoPath: string;
  out: string;
  help: boolean;
}

/** Pure argument parser — no side effects. */
export function parseArgs(argv: string[]): CliOptions {
  let repoPath: string | undefined;
  let out = "AGENTS.md";
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--out") {
      const next = argv[i + 1];
      if (next === undefined) {
        throw new Error("--out requires a filename argument");
      }
      out = next;
      i++; // consume the value
    } else if (arg.startsWith("--out=")) {
      out = arg.slice("--out=".length);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (repoPath === undefined) {
      repoPath = arg;
    } else {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
  }

  return { repoPath: repoPath ?? ".", out, help };
}

export interface RunResult {
  code: number;
  /** Absolute-or-relative path that was written, when a file was produced. */
  wrotePath?: string;
}

export interface RunIO {
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}

const defaultIO: RunIO = {
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs the CLI logic. Injectable IO so the entry-point's exit-and-write
 * behavior can be unit-tested without spawning a subprocess.
 */
export async function run(argv: string[], io: RunIO = defaultIO): Promise<RunResult> {
  let opts: CliOptions;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    io.stderr(`Error: ${(err as Error).message}\n\n${USAGE}\n`);
    return { code: 1 };
  }

  if (opts.help) {
    io.stdout(`${USAGE}\n`);
    return { code: 0 };
  }

  // scanRepo tolerates missing files (returns defaults), so validate the
  // repo path explicitly to fail loudly on a non-existent directory.
  if (!(await pathExists(opts.repoPath))) {
    io.stderr(`Error: repo path does not exist: ${opts.repoPath}\n`);
    return { code: 1 };
  }

  let markdown: string;
  try {
    const ctx = await scanRepo(opts.repoPath);
    markdown = generateAgentsMd(ctx);
  } catch (err) {
    io.stderr(`Error: failed to scan repository: ${(err as Error).message}\n`);
    return { code: 1 };
  }

  const outPath = join(opts.repoPath, opts.out);
  try {
    const bytes = await Bun.write(outPath, markdown);
    io.stderr(`Wrote ${bytes} bytes to ${outPath}\n`);
    return { code: 0, wrotePath: outPath };
  } catch (err) {
    io.stderr(`Error: failed to write output to ${outPath}: ${(err as Error).message}\n`);
    return { code: 1 };
  }
}

// Entry point: run only when invoked directly, not when imported by tests.
if (import.meta.main) {
  const result = await run(Bun.argv.slice(2));
  process.exit(result.code);
}
