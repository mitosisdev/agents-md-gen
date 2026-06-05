export interface RepoContext {
  name: string;
  description: string;
  language: string;           // "TypeScript" | "JavaScript" | "Python" | "unknown"
  runtime: string;            // "bun" | "node" | "python" | "unknown"
  scripts: Record<string, string>;
  srcFiles: string[];         // filenames (not paths) in the top-level src/ dir
  hasClaudeMd: boolean;
  existingAgentContext: string;  // content of CLAUDE.md or AGENTS.md if present, else ""
}
