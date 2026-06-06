// src/scanner.ts — typed repo-context extractor
import { readFile, readdir, access } from "fs/promises";
import { join } from "path";

export interface RepoContext {
  name: string;
  description: string;
  version: string;
  language: "typescript" | "javascript" | "unknown";
  runtime: "bun" | "node" | "unknown";
  scripts: Record<string, string>;
  devDependencies: string[];
  srcFiles: string[];
  readmeSummary: string;
  existingAgentContext: string | null;
  hasTsConfig: boolean;
  /** Top-level directories detected in the repo root (e.g. "src", "tests", "docs"). */
  dirs: string[];
  /** Entry point resolved from package.json `main` or `module` field. */
  entryPoint?: string;
  /** CLI bin entries from package.json `bin` field (name → path). */
  binEntries: Record<string, string>;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readTextFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

/** Known layout directories to probe, in display order. */
const LAYOUT_DIRS = [
  "src",
  "lib",
  "packages",
  "apps",
  "bin",
  "cli",
  "tests",
  "test",
  "docs",
] as const;

/**
 * Normalise package.json `bin` to a Record<string, string>.
 * Accepts a plain string (single unnamed binary) or an object.
 */
function normaliseBin(
  bin: unknown,
  pkgName: string,
): Record<string, string> {
  if (!bin) return {};
  if (typeof bin === "string") {
    return pkgName ? { [pkgName]: bin } : {};
  }
  if (typeof bin === "object" && !Array.isArray(bin)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(bin as Record<string, unknown>)) {
      if (typeof v === "string") result[k] = v;
    }
    return result;
  }
  return {};
}

export async function scanRepo(dir: string): Promise<RepoContext> {
  // Read package.json (required)
  const pkgText = await readTextFile(join(dir, "package.json"));
  const pkg = pkgText ? JSON.parse(pkgText) : {};

  const name: string = pkg.name ?? "";
  const description: string = pkg.description ?? "";
  const version: string = pkg.version ?? "0.0.0";
  const scripts: Record<string, string> = pkg.scripts ?? {};
  const devDependencies: string[] = Object.keys(pkg.devDependencies ?? {});

  // Detect runtime: bun in any script value → "bun"
  const scriptValues = Object.values(scripts).join(" ");
  const runtime: "bun" | "node" | "unknown" = scriptValues.includes("bun")
    ? "bun"
    : scriptValues.includes("node")
    ? "node"
    : "unknown";

  // Detect language: typescript in devDependencies → "typescript"
  const language: "typescript" | "javascript" | "unknown" = devDependencies.includes("typescript")
    ? "typescript"
    : pkg.devDependencies?.["@types/node"] || devDependencies.some((d) => d.startsWith("@types/"))
    ? "javascript"
    : "unknown";

  // tsconfig.json
  const hasTsConfig = await fileExists(join(dir, "tsconfig.json"));

  // CLAUDE.md
  const existingAgentContext = await readTextFile(join(dir, "CLAUDE.md"));

  // README.md — first 500 chars
  const readmeText = await readTextFile(join(dir, "README.md"));
  const readmeSummary = readmeText ? readmeText.slice(0, 500) : "";

  // src/ top-level entries
  let srcFiles: string[] = [];
  try {
    const entries = await readdir(join(dir, "src"));
    srcFiles = entries;
  } catch {
    srcFiles = [];
  }

  // Detect common layout directories
  const dirs: string[] = [];
  for (const d of LAYOUT_DIRS) {
    if (await fileExists(join(dir, d))) {
      dirs.push(d);
    }
  }

  // Entry point from package.json `main` or `module`
  const entryPoint: string | undefined =
    typeof pkg.main === "string"
      ? pkg.main
      : typeof pkg.module === "string"
      ? pkg.module
      : typeof pkg.exports === "string"
      ? pkg.exports
      : undefined;

  // CLI bin entries
  const binEntries = normaliseBin(pkg.bin, name);

  return {
    name,
    description,
    version,
    language,
    runtime,
    scripts,
    devDependencies,
    srcFiles,
    readmeSummary,
    existingAgentContext,
    hasTsConfig,
    dirs,
    entryPoint,
    binEntries,
  };
}
