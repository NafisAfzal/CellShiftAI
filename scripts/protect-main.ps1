param([switch]$InviteCollaborators)

$ErrorActionPreference = 'Stop'
$repo = 'NafisAfzal/CellShiftAI'
$actor = gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or $actor -ne 'NafisAfzal') { throw 'Authenticate gh as NafisAfzal first.' }
$repository = gh api "repos/$repo"
if ($LASTEXITCODE -ne 0) { throw 'Could not verify repository ownership.' }
$repository = $repository | ConvertFrom-Json
if ($repository.owner.login -ne 'NafisAfzal' -or -not $repository.private -or $repository.default_branch -ne 'main') { throw 'Expected the private NafisAfzal repository with main as its default branch.' }
$rules = gh api "repos/$repo/rulesets"
if ($LASTEXITCODE -ne 0) { throw 'GitHub refused ruleset access. Private branch rules require GitHub Pro. No visibility or billing changes were made.' }
$existing = ($rules | ConvertFrom-Json | Where-Object name -eq 'Main - Nafis approval and checked changes').id
$body = Join-Path $PSScriptRoot '../.github/main-ruleset.json'
if ($existing) {
  $result = gh api "repos/$repo/rulesets/$existing" --method PUT --input $body
} else {
  $result = gh api "repos/$repo/rulesets" --method POST --input $body
}
if ($LASTEXITCODE -ne 0) { throw 'GitHub did not apply main protection. Check the account plan and API response.' }
$applied = $result | ConvertFrom-Json
if ($applied.enforcement -ne 'active' -or $applied.target -ne 'branch') { throw 'Main ruleset is not active. No invitations were sent.' }
if (@($applied.bypass_actors).Count -ne 1 -or $applied.bypass_actors[0].actor_type -ne 'RepositoryRole' -or $applied.bypass_actors[0].actor_id -ne 5 -or $applied.bypass_actors[0].bypass_mode -ne 'always') { throw 'Only the repository administrator may bypass main restrictions. No invitations were sent.' }
$active = gh api "repos/$repo/rules/branches/main"
if ($LASTEXITCODE -ne 0) { throw 'Could not verify effective main rules. No invitations were sent.' }
$active = $active | ConvertFrom-Json
$updates = @($active | Where-Object { $_.type -eq 'update' -and $_.ruleset_id -eq $applied.id })
if ($updates.Count -eq 0) { throw 'Main update restriction is not effective. No invitations were sent.' }
foreach ($ruleType in @('pull_request','required_status_checks','deletion','non_fast_forward')) {
  if (@($applied.rules | Where-Object type -eq $ruleType).Count -eq 0) { throw "Missing required rule: $ruleType. No invitations were sent." }
}
Write-Output 'Verified active main protection with administrator-only bypass.'
if ($InviteCollaborators) {
  foreach ($login in @('Junaid-redart','mostahidhossainsami','tasnimjabir')) {
    gh api "repos/$repo/collaborators/$login" --method PUT -f permission=push --jq '{login: .invitee.login, permissions}'
    if ($LASTEXITCODE -ne 0) { throw "Could not invite $login. Main protection remains active." }
  }
}
