import { writeFileSync } from "fs";
import { resolve } from "path";
import { scanRepo } from "./scanner";
import { generateAgentsMd } from "./generator";

/**
 * Core logic: scan `dir`, generate AGENTS.md, write it, return the output path.
 * Exported so it can be tested without spawning a subprocess.
 */
export async function runCli(dir: string): Promise<string> {
  const absDir = resolve(dir);
  const ctx = await scanRepo(absDir);
  const markdown = generateAgentsMd(ctx);
  const outPath = resolve(absDir, "AGENTS.md");
  writeFileSync(outPath, markdown, "utf8");
  return outPath;
}

// Only run as CLI entry point when invoked directly
if (import.meta.main) {
  const arg = process.argv[2];
  const targetDir = arg ? resolve(arg) : process.cwd();

  runCli(targetDir)
    .then((outPath) => {
      console.log(outPath);
    })
    .catch((err) => {
      console.error("agents-md-gen error:", err);
      process.exit(1);
    });
}
