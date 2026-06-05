import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { RepoContext } from "./types";

function detectLanguage(dir: string): string {
  if (existsSync(join(dir, "tsconfig.json"))) {
    return "TypeScript";
  }
  if (
    existsSync(join(dir, "pyproject.toml")) ||
    readdirSync(dir).some((f) => f.endsWith(".py"))
  ) {
    return "Python";
  }
  return "JavaScript";
}

function detectRuntime(
  language: string,
  scripts: Record<string, string>,
  pkg: Record<string, unknown>
): string {
  if (language === "Python") return "python";

  const haystack = [
    ...Object.values(scripts),
    ...Object.keys((pkg.engines as Record<string, string>) ?? {}),
    ...Object.keys((pkg.dependencies as Record<string, string>) ?? {}),
    ...Object.keys((pkg.devDependencies as Record<string, string>) ?? {}),
  ].join(" ");

  if (haystack.includes("bun")) return "bun";
  return "node";
}

export async function scanRepo(dir: string): Promise<RepoContext> {
  // --- package.json ---
  const pkgPath = join(dir, "package.json");
  let name = "unknown";
  let description = "";
  let scripts: Record<string, string> = {};
  let pkg: Record<string, unknown> = {};

  if (existsSync(pkgPath)) {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    name = (pkg.name as string) ?? "unknown";
    description = (pkg.description as string) ?? "";
    scripts = (pkg.scripts as Record<string, string>) ?? {};
  }

  // --- language & runtime ---
  const language = detectLanguage(dir);
  const runtime = detectRuntime(language, scripts, pkg);

  // --- src/ files ---
  const srcDir = join(dir, "src");
  const srcFilesClean = existsSync(srcDir)
    ? readdirSync(srcDir).filter((f) => !f.startsWith("."))
    : [];

  // --- CLAUDE.md / AGENTS.md ---
  const claudePath = join(dir, "CLAUDE.md");
  const agentsPath = join(dir, "AGENTS.md");
  let hasClaudeMd = false;
  let existingAgentContext = "";

  if (existsSync(claudePath)) {
    hasClaudeMd = true;
    existingAgentContext = readFileSync(claudePath, "utf8");
  } else if (existsSync(agentsPath)) {
    existingAgentContext = readFileSync(agentsPath, "utf8");
  }

  return {
    name,
    description,
    language,
    runtime,
    scripts,
    srcFiles: srcFilesClean,
    hasClaudeMd,
    existingAgentContext,
  };
}
