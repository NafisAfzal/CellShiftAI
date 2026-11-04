# Run in Windows PowerShell from repository root
$ErrorActionPreference = "Stop"
if (!(Test-Path "package.json")) { throw "Run this script in the folder containing package.json" }
if (!(Test-Path ".env.local")) { Copy-Item ".env.example" ".env.local"; Write-Host "Created .env.local (MOCK mode by default)." }
if (!(Test-Path "node_modules")) { npm install; if ($LASTEXITCODE -ne 0) { throw "npm install failed" } }
Write-Host "Open http://127.0.0.1:3000 once server is ready"
npm run dev
