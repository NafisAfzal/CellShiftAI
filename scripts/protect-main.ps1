$ErrorActionPreference = 'Stop'
$repo = 'NafisAfzal/CellShiftAI'
$actor = gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or $actor -ne 'NafisAfzal') { throw 'Authenticate gh as NafisAfzal first.' }
$rules = gh api "repos/$repo/rulesets"
if ($LASTEXITCODE -ne 0) { throw 'GitHub refused ruleset access. Private branch rules require GitHub Pro. No visibility or billing changes were made.' }
$existing = ($rules | ConvertFrom-Json | Where-Object name -eq 'Main - Nafis approval and checked changes').id
$body = Join-Path $PSScriptRoot '../.github/main-ruleset.json'
if ($existing) {
  gh api "repos/$repo/rulesets/$existing" --method PUT --input $body --jq '{id, name, enforcement}'
} else {
  gh api "repos/$repo/rulesets" --method POST --input $body --jq '{id, name, enforcement}'
}
if ($LASTEXITCODE -ne 0) { throw 'GitHub did not apply main protection. Check the account plan and API response.' }
