param(
  [string]$SessionId = "",
  [string]$WindowTitleFilter = "Meet",
  [int]$MonitorSeconds = 20,
  [string]$IngestOrigin = "https://localhost:5443",
  [switch]$BroadScan
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Desktop {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ArgsLine
  )
  $scriptPath = Join-Path $PSScriptRoot "Invoke-DesktopInput.ps1"
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw ("desktop_input_script_missing: {0}" -f $scriptPath)
  }
  $cmd = "powershell -NoProfile -File `"{0}`" {1}" -f $scriptPath, $ArgsLine
  $raw = Invoke-Expression $cmd
  if ([string]::IsNullOrWhiteSpace([string]$raw)) {
    return $null
  }
  return ($raw | ConvertFrom-Json)
}

function Invoke-BridgeReset {
  param([string]$Session)
  $body = @{
    sessionId = $Session
    source = "google_meet_caption"
  } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4781/api/voice/bridge-caption/reset" -ContentType "application/json" -Body $body | Out-Null
}

function Paste-TextViaClipboard {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text
  )
  Set-Clipboard -Value $Text
  Start-Sleep -Milliseconds 80
  [void](Invoke-Desktop -ArgsLine "-Action key -Key ctrl+v")
}

function Build-BridgeCommand {
  param(
    [string]$Session,
    [string]$Origin,
    [bool]$UseBroadScan
  )

  $collector = if ($UseBroadScan) {
    "[aria-live],[role=log],[role=status],div,span,p"
  } else {
    "[aria-live],[role=log],[role=status]"
  }

  $bridge = @"
(()=>{let s='__SESSION__',u='__INGEST__/api/voice/bridge-caption/push',m={};let bad=/arrow_drop_down|settings|language of the meeting|live captions|no captions|audio|video|general|reactions|font|background|reset|leave now|stay in the call|you are the only one here|call will end/i;let p=t=>fetch(u+'?text='+encodeURIComponent(t)+'&source=google_meet_caption&sessionId='+encodeURIComponent(s)+'&at='+encodeURIComponent(new Date().toISOString()),{mode:'no-cors',cache:'no-store',keepalive:true}).catch(()=>{});window.__asolariaCaptionBridgeStop&&window.__asolariaCaptionBridgeStop();let en=()=>{let b=[...document.querySelectorAll('button,[role=button],[aria-label]')].find(e=>/caption|legenda|subtitle/i.test((e.getAttribute('aria-label')||e.textContent||'')));if(b&&String(b.getAttribute('aria-pressed')||'').toLowerCase()!=='true')b.click();};let emit=t=>{let x=(t||'').replace(/\s+/g,' ').trim();if(x.length<8||x.length>280||bad.test(x))return;let k=x.toLowerCase();if(m[k])return;m[k]=1;p(x);};let run=()=>{document.querySelectorAll('__COLLECTOR__').forEach(e=>{let t=(e.innerText||'').trim();if(!t)return;if(t.includes('\n')){t.split(/\n+/).forEach(emit);}else{emit(t);}});};en();p('[bridge-active] '+s);run();let i=setInterval(()=>{en();run();},350);window.__asolariaCaptionBridgeStop=()=>clearInterval(i);})();
"@
  $safeOrigin = [string]$Origin
  if ([string]::IsNullOrWhiteSpace($safeOrigin)) {
    $safeOrigin = "https://localhost:5443"
  }
  $safeOrigin = $safeOrigin.TrimEnd("/")
  $bridge = $bridge.Replace("__SESSION__", $Session).Replace("__COLLECTOR__", $collector).Replace("__INGEST__", $safeOrigin)
  return (($bridge -replace "`r", "") -replace "`n", "")
}

if ([string]::IsNullOrWhiteSpace($SessionId)) {
  $SessionId = "meet_{0}_{1}" -f (Get-Date -Format "yyyyMMdd_HHmmss"), ([guid]::NewGuid().ToString("N").Substring(0, 6))
}

Invoke-BridgeReset -Session $SessionId

$winList = Invoke-Desktop -ArgsLine "-Action window_list -Limit 40"
if ($null -eq $winList -or -not $winList.windows) {
  throw "no_visible_windows_found"
}

$target = @($winList.windows | Where-Object {
  $_.process -eq "chrome" -and [string]$_.title -match [Regex]::Escape($WindowTitleFilter)
}) | Select-Object -First 1
if ($null -eq $target) {
  throw ("meet_window_not_found: {0}" -f $WindowTitleFilter)
}

[void](Invoke-Desktop -ArgsLine ("-Action window_focus -WindowId {0}" -f [int]$target.id))
Start-Sleep -Milliseconds 180

$bridgeCmd = Build-BridgeCommand -Session $SessionId -Origin $IngestOrigin -UseBroadScan:$BroadScan.IsPresent

# Inject through DevTools console instead of address bar.
[void](Invoke-Desktop -ArgsLine "-Action key -Key ctrl+shift+j")
Start-Sleep -Seconds 2
Paste-TextViaClipboard -Text $bridgeCmd
Start-Sleep -Milliseconds 140
[void](Invoke-Desktop -ArgsLine "-Action key -Key enter")
Start-Sleep -Seconds 1
[void](Invoke-Desktop -ArgsLine "-Action key -Key f12")
Start-Sleep -Milliseconds 600

$rows = @()
$afterId = 0
$seconds = [Math]::Max(0, [int]$MonitorSeconds)
if ($seconds -gt 0) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    $pull = Invoke-RestMethod -Method Get -Uri ("http://127.0.0.1:4781/api/voice/bridge-caption/pull?sessionId={0}&afterId={1}&limit=120" -f $SessionId, $afterId)
    if ($pull.entries) {
      foreach ($entry in $pull.entries) {
        $rows += $entry
        if ([int]$entry.id -gt $afterId) {
          $afterId = [int]$entry.id
        }
      }
    }
    Start-Sleep -Milliseconds 900
  }
}

[pscustomobject]@{
  ok = $true
  sessionId = $SessionId
  windowId = [int]$target.id
  windowTitle = [string]$target.title
  monitorSeconds = $seconds
  ingestOrigin = $IngestOrigin
  entriesCount = @($rows).Count
  sample = @($rows | Select-Object -Last 20)
} | ConvertTo-Json -Depth 8
