$ErrorActionPreference="Continue"
npm test
npm run typecheck
npm run lint
try { (Invoke-RestMethod http://127.0.0.1:3000/api/health) | ConvertTo-Json } catch { Write-Host "Health endpoint not available; start npm run dev." }
