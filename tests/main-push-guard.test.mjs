import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("the local push hook blocks main updates before running any publication scans", () => {
  const hook = fileURLToPath(new URL("../.githooks/pre-push", import.meta.url));
  const shell = process.platform === "win32"
    ? path.resolve(execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim(), "../../../bin/sh.exe")
    : "/bin/sh";
  const sha = "0".repeat(40);
  const result = spawnSync(shell, [hook], { input: `refs/heads/nafis ${sha} refs/heads/main ${sha}\n`, encoding: "utf8" });
  assert.equal(result.status, 1, result.error?.message);
  assert.match(result.stderr, /open a pull request to main/);
  assert.ok(!result.stdout.includes("Publication check"), "Main rejection must happen before scan commands");
});
