// src/scanner.test.ts
import { test, expect, describe } from "bun:test";
import { join } from "path";
import { scanRepo } from "./scanner";

const FIXTURES = join(import.meta.dir, "__fixtures__");

describe("scanRepo — minimal fixture", () => {
  test("reads name, description, version from package.json", async () => {
    const ctx = await scanRepo(join(FIXTURES, "minimal"));
    expect(ctx.name).toBe("minimal-pkg");
    expect(ctx.description).toBe("A minimal package");
    expect(ctx.version).toBe("1.0.0");
  });

  test("returns correct scripts", async () => {
    const ctx = await scanRepo(join(FIXTURES, "minimal"));
    expect(ctx.scripts).toEqual({ build: "tsc" });
  });

  test("no typescript devDep → language unknown, no bun in scripts → runtime unknown", async () => {
    const ctx = await scanRepo(join(FIXTURES, "minimal"));
    expect(ctx.language).toBe("unknown");
    expect(ctx.runtime).toBe("unknown");
  });

  test("graceful fallback for missing optional files", async () => {
    const ctx = await scanRepo(join(FIXTURES, "minimal"));
    expect(ctx.hasTsConfig).toBe(false);
    expect(ctx.existingAgentContext).toBeNull();
    expect(ctx.readmeSummary).toBe("");
    expect(ctx.srcFiles).toEqual([]);
  });
});

describe("scanRepo — no-optionals fixture", () => {
  test("missing README, CLAUDE.md, tsconfig, src → all graceful", async () => {
    const ctx = await scanRepo(join(FIXTURES, "no-optionals"));
    expect(ctx.name).toBe("no-optionals-pkg");
    expect(ctx.hasTsConfig).toBe(false);
    expect(ctx.existingAgentContext).toBeNull();
    expect(ctx.readmeSummary).toBe("");
    expect(ctx.srcFiles).toEqual([]);
    expect(ctx.devDependencies).toEqual([]);
  });
});

describe("scanRepo — full fixture", () => {
  test("detects bun runtime from scripts", async () => {
    const ctx = await scanRepo(join(FIXTURES, "full"));
    expect(ctx.runtime).toBe("bun");
  });

  test("detects typescript language from devDependencies", async () => {
    const ctx = await scanRepo(join(FIXTURES, "full"));
    expect(ctx.language).toBe("typescript");
  });

  test("reads tsconfig presence", async () => {
    const ctx = await scanRepo(join(FIXTURES, "full"));
    expect(ctx.hasTsConfig).toBe(true);
  });

  test("reads existing CLAUDE.md agent context", async () => {
    const ctx = await scanRepo(join(FIXTURES, "full"));
    expect(ctx.existingAgentContext).not.toBeNull();
    expect(ctx.existingAgentContext).toContain("Agent Context");
  });

  test("reads README summary truncated to 500 chars", async () => {
    const ctx = await scanRepo(join(FIXTURES, "full"));
    expect(ctx.readmeSummary.length).toBeLessThanOrEqual(500);
    expect(ctx.readmeSummary).toContain("Full Package");
  });

  test("lists src/ filenames", async () => {
    const ctx = await scanRepo(join(FIXTURES, "full"));
    expect(ctx.srcFiles).toContain("index.ts");
    expect(ctx.srcFiles).toContain("utils.ts");
    expect(ctx.srcFiles).toContain("types.ts");
  });

  test("reads devDependencies as array of names", async () => {
    const ctx = await scanRepo(join(FIXTURES, "full"));
    expect(ctx.devDependencies).toContain("typescript");
    expect(ctx.devDependencies).toContain("@types/node");
  });
});
