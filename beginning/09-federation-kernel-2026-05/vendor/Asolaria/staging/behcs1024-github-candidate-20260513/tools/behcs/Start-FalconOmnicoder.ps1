param(
  [string]$Serial = "${BEHCS_DEVICE_SERIAL}",
  [int]$Port = 8789,
  [string]$DashboardUrl = "http://127.0.0.1:4949"
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  param(
    [string]$Url,
    [object]$Body,
    [int]$TimeoutSeconds = 60
  )
  $json = $Body | ConvertTo-Json -Compress -Depth 8
  $tmp = Join-Path $env:TEMP ("omnicoder-post-" + [guid]::NewGuid().ToString("N") + ".json")
  try {
    [System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))
    $raw = & curl.exe -s --max-time $TimeoutSeconds -X POST $Url -H "Content-Type: application/json" --data-binary "@$tmp"
    if (-not $raw) { return $null }
    return $raw | ConvertFrom-Json
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

function Require-AdbDevice {
  param([string]$DeviceSerial)
  $devices = & adb devices
  if ($LASTEXITCODE -ne 0) { throw "adb devices failed" }
  if (-not ($devices -match [regex]::Escape($DeviceSerial) + "\s+device")) {
    throw "ADB device $DeviceSerial is not online"
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$localApp = Join-Path $PSScriptRoot "omnicoder"
$remoteApp = "${ANDROID_ASOLARIA_ROOT}/omnicoder"

if (-not (Test-Path -LiteralPath (Join-Path $localApp "omnicoder-server.mjs"))) {
  throw "OMNICODER server not found under $localApp"
}

Require-AdbDevice -DeviceSerial $Serial

Write-Host "Deploying OMNICODER to Falcon $Serial..."
& adb -s $Serial shell "mkdir -p $remoteApp/public" | Out-Null
& adb -s $Serial push (Join-Path $localApp "omnicoder-server.mjs") "$remoteApp/omnicoder-server.mjs" | Out-Null
& adb -s $Serial push (Join-Path $localApp "public\index.html") "$remoteApp/public/index.html" | Out-Null
& adb -s $Serial push (Join-Path $localApp "start-omnicoder.sh") "$remoteApp/start-omnicoder.sh" | Out-Null

Write-Host "Forwarding Acer localhost:$Port to Falcon localhost:$Port..."
& adb -s $Serial forward "tcp:$Port" "tcp:$Port" | Out-Null

$status = $null
try {
  $status = & curl.exe -s --max-time 3 "http://127.0.0.1:$Port/api/status" | ConvertFrom-Json
} catch {
  $status = $null
}

if (-not ($status -and $status.ok)) {
  Write-Host "Starting OMNICODER through Acer dashboard input route..."
  $body = @{
    serial = $Serial
    text = "sh $remoteApp/start-omnicoder.sh"
  }
  $result = Invoke-JsonPost -Url "$DashboardUrl/api/omni-control/look-type-enter-look" -Body $body -TimeoutSeconds 90
  if (-not ($result -and $result.ok)) {
    throw "Dashboard input route did not confirm OMNICODER start"
  }
  Start-Sleep -Seconds 3
}

$status = & curl.exe -s --max-time 5 "http://127.0.0.1:$Port/api/status" | ConvertFrom-Json
if (-not $status.ok) { throw "OMNICODER did not become healthy" }

Write-Host "OMNICODER healthy."
[pscustomobject]@{
  ok = $true
  serial = $Serial
  acer_url = "http://127.0.0.1:$Port/"
  falcon_url = "http://127.0.0.1:$Port/"
  white_room_count = $status.white_room.count
  packets_count = $status.packets.count
  inbox_count = $status.inbox.count
  room40_count = $status.room40.count
}
