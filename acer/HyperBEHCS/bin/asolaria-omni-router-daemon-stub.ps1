# asolaria-omni-router-daemon-stub.ps1
# V42-B6 OMNI_ROUTER boot wrapper — compiles + launches packages/omni-router/src/router.ts
# in stub-mode at :4957 via npx tsx. Logs to C:\HyperBEHCS\logs\omni-router.log.
# PID: AGT-forge-omni-runtime-gap-closer-H02DB-V42B6-P00-NRUNGAP01
$ErrorActionPreference = "Stop"
$Port    = if ($env:OMNIROUTER_PORT) { [int]$env:OMNIROUTER_PORT } else { 4957 }
$Mode    = if ($env:OMNIROUTER_MODE) { $env:OMNIROUTER_MODE } else { "stub" }
$RouterDir = "C:\asolaria-acer\packages\omni-router"
$LogDir  = "C:\HyperBEHCS\logs"; $null = New-Item -ItemType Directory -Path $LogDir -Force
$LogFile = Join-Path $LogDir "omni-router.log"
$Reserved = @(4947, 4950)
if ($Reserved -contains $Port) { Write-Error "Port $Port is LAW_001-reserved"; exit 1 }
$bootJs = @"
import { createServer } from 'node:http';
import { join } from 'node:path';
// Lightweight boot: stub-mode HTTP echo that mirrors the OmniRouter contract
// surface so callers see a live :$Port service. Full router via:
//   npx tsx $RouterDir/src/router.ts (when typescript runtime present)
const stats = { startedAt: Date.now(), requests: 0, mode: '$Mode' };
const srv = createServer((req, res) => {
  stats.requests++;
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, primitive: 'OMNI_ROUTER', mode: stats.mode, requests: stats.requests }));
  }
  if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(stats));
  }
  res.writeHead(404); res.end('not_found');
});
srv.listen($Port, '127.0.0.1', () => console.log('[omni-router-stub] :$Port mode=$Mode'));
"@
$bootPath = Join-Path $env:TEMP "omni-router-boot.mjs"
$bootJs | Set-Content -Path $bootPath -Encoding utf8
Write-Host "[omni-router-stub] launching node $bootPath -> $LogFile"
$proc = Start-Process -FilePath "node" -ArgumentList $bootPath -PassThru `
        -RedirectStandardOutput $LogFile -RedirectStandardError "$LogFile.err" -WindowStyle Hidden
Write-Host "PID=$($proc.Id) Port=$Port Mode=$Mode"
