import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("main protection fails closed before invitations for wrong owner, plan, apply, bypass or effective-rule failures", (t) => {
  const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const fixture = fileURLToPath(new URL("./github-policy-fixture.ps1", import.meta.url));
  const result = spawnSync(shell, ["-NoProfile", "-NonInteractive", "-File", fixture], { encoding: "utf8" });
  if (result.error?.code === "ENOENT" && !process.env.CI) {
    t.skip("PowerShell is unavailable locally; the repository-policy test is required in CI.");
    return;
  }
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /10 protection scenarios passed/);
});
