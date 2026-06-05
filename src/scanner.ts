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
  };
}
