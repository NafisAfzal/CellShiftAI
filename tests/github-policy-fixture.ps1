$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$protect = Join-Path $project 'scripts/protect-main.ps1'
$global:PolicyScenario = ''
$global:PolicyInvitations = [Collections.Generic.List[string]]::new()

# This function shadows the native CLI. No test can make a GitHub request.
function global:gh {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
  $global:LASTEXITCODE = 0
  $endpoint = $Arguments[1]
  if ($endpoint -eq 'user') {
    if ($global:PolicyScenario -eq 'wrong-owner') { return 'another-user' }
    return 'NafisAfzal'
  }
  if ($endpoint -eq 'repos/NafisAfzal/CellShiftAI') {
    return '{"owner":{"login":"NafisAfzal"},"private":true,"default_branch":"main"}'
  }
  if ($endpoint -eq 'repos/NafisAfzal/CellShiftAI/rulesets') {
    if ($Arguments -notcontains 'POST') {
      if ($global:PolicyScenario -eq 'unsupported-plan') { $global:LASTEXITCODE = 1; return '{}' }
      return '[]'
    }
    if ($global:PolicyScenario -eq 'apply-failed') { $global:LASTEXITCODE = 1; return '{}' }
    $result = Get-Content (Join-Path $project '.github/main-ruleset.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $result | Add-Member -NotePropertyName id -NotePropertyValue 317
    if ($global:PolicyScenario -eq 'unsafe-bypass') { $result.bypass_actors[0].actor_id = 4 }
    return $result | ConvertTo-Json -Depth 12 -Compress
  }
  if ($endpoint -eq 'repos/NafisAfzal/CellShiftAI/rules/branches/main') {
    if ($global:PolicyScenario -eq 'ineffective-rule') { return '[]' }
    return '[{"type":"update","ruleset_id":317}]'
  }
  if ($endpoint -like 'repos/NafisAfzal/CellShiftAI/collaborators/*') {
    $login = $endpoint.Split('/')[-1]
    $global:PolicyInvitations.Add($login)
    return '{"permissions":"write"}'
  }
  throw "Unexpected test CLI call: $endpoint"
}

foreach ($case in @('wrong-owner','unsupported-plan','apply-failed','unsafe-bypass','ineffective-rule','success','success-no-invites')) {
  $global:PolicyScenario = $case
  $global:PolicyInvitations.Clear()
  $failed = $false
  try {
    if ($case -eq 'success-no-invites') { & $protect | Out-Null }
    else { & $protect -InviteCollaborators | Out-Null }
  } catch { $failed = $true }
  if ($case -eq 'success') {
    if ($failed -or $global:PolicyInvitations.Count -ne 3) { throw 'Verified protection must allow the three requested invitations.' }
  } elseif ($case -eq 'success-no-invites') {
    if ($failed -or $global:PolicyInvitations.Count -ne 0) { throw 'Protection without the invitation option must not invite anyone.' }
  } elseif (-not $failed -or $global:PolicyInvitations.Count -ne 0) {
    throw "Unsafe policy scenario sent invitations or did not stop: $case"
  }
}
Write-Output '7 protection scenarios passed; no native GitHub calls made.'
