// tests/ci-workflow.test.ts
import { test, expect } from "bun:test";

test("CI workflow exists and runs bun test on push and pull_request", async () => {
  const yml = await Bun.file(".github/workflows/ci.yml").text();
  expect(yml).toContain("bun test");
  expect(yml).toContain("push");
  expect(yml).toContain("pull_request");
});
