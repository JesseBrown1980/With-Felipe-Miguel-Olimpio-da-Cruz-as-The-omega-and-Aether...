param(
  [string]$Message = "",
  [string]$ChatId = "main",
  [int]$Port = 4781,
  [int]$TimeoutSeconds = 300,
  [string]$RouteMode = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-AsolariaApi {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [int]$TimeoutSec = 15
  )
  $uri = "http://127.0.0.1:$Port$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -TimeoutSec $TimeoutSec
  }
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method $Method -Uri $uri -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
}

function Wait-JobResult {
  param(
    [string]$JobId,
    [int]$MaxSeconds = 180
  )
  $deadline = (Get-Date).AddSeconds([Math]::Max(20, $MaxSeconds))
  $lastStatus = ""
  $lastStatusAt = Get-Date
  while ((Get-Date) -lt $deadline) {
    $row = Invoke-AsolariaApi -Method "GET" -Path ("/api/jobs/" + $JobId) -TimeoutSec 10
    $job = $row.job
    $status = [string]$job.status
    if ($status -ne $lastStatus) {
      $lastStatus = $status
      $lastStatusAt = Get-Date
      Write-Host ("[job " + $JobId + "] status: " + $status) -ForegroundColor DarkGray
    }
    if ($status -eq "completed" -or $status -eq "done") {
      return $job
    }
    if ($status -eq "failed" -or $status -eq "error") {
      throw ("Asolaria job failed: " + [string]$job.error)
    }
    Start-Sleep -Milliseconds 900
  }
  throw ("Timed out waiting for Asolaria job " + $JobId)
}

function Send-Message {
  param(
    [string]$Text
  )
  $clean = [string]$Text
  if ([string]::IsNullOrWhiteSpace($clean)) {
    throw "Message cannot be empty."
  }
  $resp = Invoke-AsolariaApi -Method "POST" -Path "/api/chat" -Body @{
    message = $clean
    chatId = $ChatId
    routeMode = $RouteMode
  } -TimeoutSec 25

  if ($resp.mode -eq "queued" -and $resp.job -and $resp.job.id) {
    $job = Wait-JobResult -JobId ([string]$resp.job.id) -MaxSeconds $TimeoutSeconds
    $reply = [string]$job.result.reply
    if ([string]::IsNullOrWhiteSpace($reply)) {
      $reply = "(no reply text)"
    }
    return [pscustomobject]@{
      ok = $true
      mode = "queued"
      jobId = [string]$job.id
      provider = [string]$job.result.provider
      reply = $reply
    }
  }

  $directReply = [string]$resp.reply
  if ([string]::IsNullOrWhiteSpace($directReply)) {
    $directReply = "(no reply text)"
  }
  return [pscustomobject]@{
    ok = [bool]$resp.ok
    mode = [string]$resp.mode
    jobId = ""
    provider = ""
    reply = $directReply
  }
}

Write-Host "Asolaria direct channel: http://127.0.0.1:$Port/api/chat" -ForegroundColor Cyan
Write-Host "ChatId: $ChatId" -ForegroundColor DarkCyan
if (-not [string]::IsNullOrWhiteSpace($RouteMode)) {
  Write-Host "RouteMode: $RouteMode" -ForegroundColor DarkCyan
}

if (-not [string]::IsNullOrWhiteSpace($Message)) {
  $result = Send-Message -Text $Message
  Write-Host ""
  Write-Host ("Asolaria (" + $result.mode + "):") -ForegroundColor Yellow
  if (-not [string]::IsNullOrWhiteSpace([string]$result.provider)) {
    Write-Host ("Provider: " + [string]$result.provider) -ForegroundColor DarkYellow
  }
  Write-Host $result.reply
  exit 0
}

Write-Host ""
Write-Host "Type your message and press Enter. Type 'exit' to quit." -ForegroundColor Gray
while ($true) {
  $inputText = Read-Host "You"
  if ([string]::IsNullOrWhiteSpace($inputText)) {
    continue
  }
  $normalized = $inputText.Trim().ToLowerInvariant()
  if ($normalized -eq "exit" -or $normalized -eq "quit") {
    break
  }
  try {
    $result = Send-Message -Text $inputText
    Write-Host ""
    Write-Host ("Asolaria (" + $result.mode + "):") -ForegroundColor Yellow
    if (-not [string]::IsNullOrWhiteSpace([string]$result.provider)) {
      Write-Host ("Provider: " + [string]$result.provider) -ForegroundColor DarkYellow
    }
    Write-Host $result.reply
    Write-Host ""
  } catch {
    Write-Host ("Error: " + $_.Exception.Message) -ForegroundColor Red
    Write-Host ""
  }
}
