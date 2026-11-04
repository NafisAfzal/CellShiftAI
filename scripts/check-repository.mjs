import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// This is a publication guard, not a replacement for Gitleaks or code review.
const staged = process.argv.includes("--staged");
const git = (args, encoding = "utf8") => execFileSync("git", args, { encoding, maxBuffer: 20 * 1024 * 1024 });
const root = git(["rev-parse", "--show-toplevel"]).trim();
process.chdir(root);
const files = git(staged
  ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
  : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]
).split("\0").filter(Boolean);
const rules = [
  ["OpenRouter key", /sk-or-v1-[a-f0-9]{64}/i],
  ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
  ["GitHub credential", /(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
  ["AWS access key", /(?:AKIA|ASIA)[A-Z0-9]{16}/],
];
let localSecrets = [];
try {
  localSecrets = readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !/(?:KEY|TOKEN|SECRET|PASSWORD)$/.test(match[1])) return [];
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    return value.length >= 12 ? [Buffer.from(value)] : [];
  });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const findings = [];
for (const file of new Set(files)) {
  const name = path.posix.basename(file);
  if ((/^\.env(?:\.|$)/.test(name) && ![".env.example", ".env.local.example"].includes(name)) ||
      /\.(?:pem|key|p12|pfx)$/i.test(name) || /(?:service[-_]?account|credentials).*\.json$/i.test(name)) {
    findings.push(`${file}: credential file must not be tracked`);
  }
  let bytes;
  try { bytes = staged ? git(["show", `:${file}`], null) : readFileSync(file); }
  catch (error) { if (!staged && error.code === "ENOENT") continue; throw error; }
  if (bytes.length > 5 * 1024 * 1024) findings.push(`${file}: exceeds the 5 MiB publication limit`);
  if (localSecrets.some((secret) => bytes.includes(secret))) findings.push(`${file}: contains a local credential`);
  if (bytes.includes(0)) continue;
  const content = bytes.toString("utf8");
  for (const [label, pattern] of rules) if (pattern.test(content)) findings.push(`${file}: possible ${label}`);
  if (/[A-Z]:[\\/](?:Users|Nafis17)[\\/]|\/Users\/[A-Za-z0-9_.-]+\//i.test(content)) findings.push(`${file}: personal machine path`);
}
if (findings.length) {
  console.error("Publication check failed (values are intentionally omitted):\n" + findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Publication check passed: ${new Set(files).size} ${staged ? "staged" : "publishable"} files; no matching credentials or personal paths.`);
}
