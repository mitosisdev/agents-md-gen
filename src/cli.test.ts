import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We test the CLI integration by importing the core runCli function
import { runCli } from "./cli";

let testDir: string;

beforeEach(() => {
  // Create a fresh temp directory for each test
  testDir = join(tmpdir(), `agents-md-gen-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

function writePackageJson(dir: string, pkg: Record<string, unknown> = {}) {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "test-repo", description: "A test repo", ...pkg }, null, 2)
  );
}

describe("runCli", () => {
  it("writes AGENTS.md to the target directory", async () => {
    writePackageJson(testDir);
    const outPath = await runCli(testDir);
    expect(existsSync(join(testDir, "AGENTS.md"))).toBe(true);
    expect(outPath).toBe(join(testDir, "AGENTS.md"));
  });

  it("returns the output path as an absolute path", async () => {
    writePackageJson(testDir);
    const outPath = await runCli(testDir);
    expect(outPath.startsWith("/")).toBe(true);
  });

  it("generated AGENTS.md contains project name from package.json", async () => {
    writePackageJson(testDir, { name: "my-special-project" });
    await runCli(testDir);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content).toContain("my-special-project");
  });

  it("generated AGENTS.md contains # AGENTS.md heading", async () => {
    writePackageJson(testDir);
    await runCli(testDir);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content.trimStart()).toMatch(/^# AGENTS\.md/);
  });

  it("generated AGENTS.md contains ## Project Overview", async () => {
    writePackageJson(testDir);
    await runCli(testDir);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content).toContain("## Project Overview");
  });

  it("generated AGENTS.md contains ## Commands", async () => {
    writePackageJson(testDir, { scripts: { test: "bun test" } });
    await runCli(testDir);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content).toContain("## Commands");
    expect(content).toContain("bun test");
  });

  it("generated AGENTS.md contains ## Architecture", async () => {
    writePackageJson(testDir);
    const srcDir = join(testDir, "src");
    mkdirSync(srcDir);
    writeFileSync(join(srcDir, "index.ts"), "export {}");
    await runCli(testDir);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content).toContain("## Architecture");
    expect(content).toContain("index.ts");
  });

  it("detects TypeScript when tsconfig.json is present", async () => {
    writePackageJson(testDir);
    writeFileSync(join(testDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    await runCli(testDir);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content).toContain("TypeScript");
  });

  it("works on a directory with no package.json", async () => {
    // Should not throw; name becomes "unknown"
    const outPath = await runCli(testDir);
    expect(existsSync(join(testDir, "AGENTS.md"))).toBe(true);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content).toContain("# AGENTS.md");
  });

  it("overwrites existing AGENTS.md", async () => {
    writePackageJson(testDir, { name: "overwrite-test" });
    writeFileSync(join(testDir, "AGENTS.md"), "old content");
    await runCli(testDir);
    const content = readFileSync(join(testDir, "AGENTS.md"), "utf8");
    expect(content).not.toBe("old content");
    expect(content).toContain("overwrite-test");
  });
});
