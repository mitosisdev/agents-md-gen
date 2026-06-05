import { describe, expect, test } from "bun:test";
import { join } from "path";
import { scanRepo } from "../src/scanner";

const FIXTURES = join(import.meta.dir, "fixtures");

describe("scanRepo — ts-bun fixture", () => {
  const dir = join(FIXTURES, "ts-bun");

  test("extracts name and description from package.json", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.name).toBe("my-lib");
    expect(ctx.description).toBe("A test lib");
  });

  test("detects TypeScript when tsconfig.json is present", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.language).toBe("TypeScript");
  });

  test("detects bun runtime when 'bun' appears in scripts", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.runtime).toBe("bun");
  });

  test("srcFiles contains 'index.ts'", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.srcFiles).toContain("index.ts");
  });

  test("hasClaudeMd is true", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.hasClaudeMd).toBe(true);
  });

  test("existingAgentContext equals CLAUDE.md content", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.existingAgentContext).toBe("# My rules");
  });
});

describe("scanRepo — js-node fixture", () => {
  const dir = join(FIXTURES, "js-node");

  test("detects JavaScript when no tsconfig.json", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.language).toBe("JavaScript");
  });

  test("detects node runtime when 'bun' not in scripts", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.runtime).toBe("node");
  });

  test("hasClaudeMd is false", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.hasClaudeMd).toBe(false);
  });

  test("existingAgentContext is empty string", async () => {
    const ctx = await scanRepo(dir);
    expect(ctx.existingAgentContext).toBe("");
  });
});
