// src/cli.test.ts — tests for the CLI entrypoint logic
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { run, USAGE, parseArgs } from "./cli";

let tmpRoot: string;
let fixtureDir: string;

beforeAll(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), "amg-cli-"));
  // Build a minimal valid fixture repo: package.json + src/ + README.
  fixtureDir = join(tmpRoot, "fixture-repo");
  await mkdir(join(fixtureDir, "src"), { recursive: true });
  await writeFile(
    join(fixtureDir, "package.json"),
    JSON.stringify(
      {
        name: "fixture-repo",
        version: "2.3.4",
        description: "A fixture repo for CLI tests",
        scripts: { test: "bun test" },
        devDependencies: { typescript: "^5.0.0" },
      },
      null,
      2,
    ),
  );
  await writeFile(join(fixtureDir, "src", "index.ts"), "export const x = 1;\n");
  await writeFile(join(fixtureDir, "README.md"), "# Fixture Repo\n\nHello.\n");
});

afterAll(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
});

describe("parseArgs", () => {
  test("default repo-path is '.' when no positional arg given", () => {
    const opts = parseArgs([]);
    expect(opts.repoPath).toBe(".");
    expect(opts.help).toBe(false);
  });

  test("first positional arg sets repo-path", () => {
    const opts = parseArgs(["/some/path"]);
    expect(opts.repoPath).toBe("/some/path");
  });

  test("default out file is 'AGENTS.md'", () => {
    const opts = parseArgs([]);
    expect(opts.out).toBe("AGENTS.md");
  });

  test("--out sets the output file", () => {
    const opts = parseArgs(["/some/path", "--out", "CONTEXT.md"]);
    expect(opts.repoPath).toBe("/some/path");
    expect(opts.out).toBe("CONTEXT.md");
  });

  test("--help is detected", () => {
    const opts = parseArgs(["--help"]);
    expect(opts.help).toBe(true);
  });
});

describe("run — --help", () => {
  test("prints usage and exits 0 without writing", async () => {
    let out = "";
    const result = await run(["--help"], {
      stdout: (s) => {
        out += s;
      },
      stderr: () => {},
    });
    expect(result.code).toBe(0);
    expect(out).toContain(USAGE);
    expect(result.wrotePath).toBeUndefined();
  });
});

describe("run — successful generation", () => {
  test("generates AGENTS.md in the repo-path for a valid fixture dir", async () => {
    let err = "";
    const result = await run([fixtureDir], {
      stdout: () => {},
      stderr: (s) => {
        err += s;
      },
    });
    expect(result.code).toBe(0);
    expect(result.wrotePath).toBe(join(fixtureDir, "AGENTS.md"));

    const written = await readFile(join(fixtureDir, "AGENTS.md"), "utf-8");
    expect(written).toContain("# AGENTS.md");
    expect(written).toContain("fixture-repo");
    expect(written.length).toBeGreaterThan(0);

    // Reports bytes written to stderr.
    expect(err).toContain("Wrote");
    expect(err).toContain("bytes");
  });

  test("--out overrides the output filename", async () => {
    const result = await run([fixtureDir, "--out", "CONTEXT.md"], {
      stdout: () => {},
      stderr: () => {},
    });
    expect(result.code).toBe(0);
    expect(result.wrotePath).toBe(join(fixtureDir, "CONTEXT.md"));

    const written = await readFile(join(fixtureDir, "CONTEXT.md"), "utf-8");
    expect(written).toContain("# AGENTS.md");
  });
});

describe("run — error cases", () => {
  test("exits non-zero on a non-existent repo path", async () => {
    let err = "";
    const result = await run([join(tmpRoot, "does-not-exist-12345")], {
      stdout: () => {},
      stderr: (s) => {
        err += s;
      },
    });
    expect(result.code).not.toBe(0);
    expect(result.wrotePath).toBeUndefined();
    expect(err.toLowerCase()).toContain("error");
  });
});
