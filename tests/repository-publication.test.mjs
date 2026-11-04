import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("publication guard checks staged bytes, ignores local config, and never prints credential values", () => {
  const script = fileURLToPath(new URL("../scripts/check-repository.mjs", import.meta.url));
  const cache = path.resolve(".cache");
  mkdirSync(cache, { recursive: true });
  const fixture = mkdtempSync(path.join(cache, "publication-test-"));
  const git = (...args) => execFileSync("git", args, { cwd: fixture, stdio: "pipe" });
  const check = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: fixture, encoding: "utf8" });
  try {
    git("init", "--quiet");
    writeFileSync(path.join(fixture, ".gitignore"), ".env.local\n");
    const secret = "sk-or-v1-" + "a1".repeat(32);
    writeFileSync(path.join(fixture, ".env.local"), `OPENROUTER_API_KEY=${secret}\n`);
    writeFileSync(path.join(fixture, "safe.rules"), "match /users/{uid}/runs/{runId} { allow read: if false; }\n");
    assert.equal(check().status, 0, "Ignored local keys and Firestore paths must be allowed");
    writeFileSync(path.join(fixture, "leak.txt"), secret);
    git("add", "leak.txt");
    writeFileSync(path.join(fixture, "leak.txt"), "clean working copy");
    const blocked = check("--staged");
    assert.equal(blocked.status, 1, "A clean working copy must not conceal a staged secret");
    assert.match(blocked.stderr, /leak\.txt/);
    assert.ok(!blocked.stderr.includes(secret), "Diagnostics must redact values");
    git("add", "leak.txt");
    assert.equal(check("--staged").status, 0);
    writeFileSync(path.join(fixture, ".env.production"), "AI_MODE=mock\n");
    assert.equal(check().status, 1, "Credential files are blocked even if currently empty");
  } finally {
    assert.ok(fixture.startsWith(cache + path.sep));
    rmSync(fixture, { recursive: true, force: true });
  }
});
