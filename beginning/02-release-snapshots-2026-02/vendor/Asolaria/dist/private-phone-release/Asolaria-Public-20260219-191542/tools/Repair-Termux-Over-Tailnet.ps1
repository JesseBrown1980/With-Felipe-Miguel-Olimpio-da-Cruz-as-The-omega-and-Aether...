param(
  [int]$MirrorProxyPort = 4790,
  [string]$TailnetHost = "",
  [switch]$SkipUpgrade,
  [string[]]$Packages = @("nodejs-lts", "python", "termux-api", "jq", "tmux")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$TermuxBinDir = "/data/data/com.termux/files/usr/bin"
$TermuxPathEnv = "PATH=/data/data/com.termux/files/usr/bin:/data/data/com.termux/files/usr/bin/applets"

function Resolve-TailscalePath {
  try {
    $cmd = Get-Command tailscale -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }
  $fallback = "C:\Program Files\Tailscale\tailscale.exe"
  if (Test-Path $fallback) {
    return $fallback
  }
  return $null
}

function Get-TailnetHost {
  param([string]$TailscalePath)
  if (-not $TailscalePath) { return "" }
  try {
    $raw = & $TailscalePath status --json 2>$null
    if (-not $raw) { return "" }
    $status = $raw | ConvertFrom-Json -ErrorAction Stop
    $dns = [string]$status.Self.DNSName
    if (-not $dns) { return "" }
    if ($dns.EndsWith(".")) {
      $dns = $dns.Substring(0, $dns.Length - 1)
    }
    return $dns
  } catch {
    return ""
  }
}

function Invoke-Adb {
  param(
    [string[]]$AdbArgs,
    [switch]$IgnoreExitCode
  )
  if (-not $AdbArgs -or $AdbArgs.Count -lt 1) {
    throw "No adb args provided."
  }
  & adb @AdbArgs
  $code = $LASTEXITCODE
  if ($code -ne 0 -and -not $IgnoreExitCode) {
    throw "adb command failed (exit $code): adb $($AdbArgs -join ' ')"
  }
  return $code
}

function Invoke-Termux {
  param(
    [string[]]$Command,
    [switch]$IgnoreExitCode,
    [switch]$NonInteractive
  )
  $envArgs = @($TermuxPathEnv)
  if ($NonInteractive) {
    $envArgs += "DEBIAN_FRONTEND=noninteractive"
  }
  $adbArgs = @("shell", "run-as", "com.termux", "env") + $envArgs + $Command
  Invoke-Adb -AdbArgs $adbArgs -IgnoreExitCode:$IgnoreExitCode | Out-Null
}

Write-Host "Checking ADB device connectivity..."
$devices = & adb devices
if ($LASTEXITCODE -ne 0 -or -not ($devices -match "^\S+\s+device$")) {
  throw "No authorized ADB device found."
}

$tailscalePath = Resolve-TailscalePath
if (-not $tailscalePath) {
  throw "tailscale CLI was not found on this machine."
}

if (-not $TailnetHost) {
  $TailnetHost = Get-TailnetHost -TailscalePath $tailscalePath
}
if (-not $TailnetHost) {
  throw "Could not resolve tailnet DNS host from tailscale status."
}

$mirrorTarget = "https://packages.termux.dev"
$mirrorBaseUrl = "http://${TailnetHost}:$MirrorProxyPort"
Write-Host "Enabling tailnet mirror relay: $mirrorBaseUrl -> $mirrorTarget"
& $tailscalePath serve --bg --http=$MirrorProxyPort $mirrorTarget | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "tailscale serve failed for mirror relay."
}

Write-Host "Probing relay from Termux context..."
Invoke-Termux -Command @("$TermuxBinDir/curl", "-I", "-m", "20", "$mirrorBaseUrl/apt/termux-main/dists/stable/Release")

$mirrorConfig = @(
  "WEIGHT=100",
  "MAIN=""$mirrorBaseUrl/apt/termux-main""",
  "ROOT=""$mirrorBaseUrl/apt/termux-root""",
  "X11=""$mirrorBaseUrl/apt/termux-x11"""
) -join "`n"

Write-Host "Writing Termux mirror profile (asolaria_tailnet)..."
$null = $mirrorConfig | & adb shell run-as com.termux "$TermuxBinDir/tee" "files/usr/etc/termux/mirrors/asolaria_tailnet"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to write asolaria_tailnet mirror profile."
}
Invoke-Adb -AdbArgs @("shell", "run-as", "com.termux", "rm", "-f", "files/usr/etc/termux/chosen_mirrors") -IgnoreExitCode | Out-Null
Invoke-Adb -AdbArgs @("shell", "run-as", "com.termux", "ln", "-s", "mirrors/asolaria_tailnet", "files/usr/etc/termux/chosen_mirrors") | Out-Null

Write-Host "Running pkg update..."
Invoke-Termux -Command @("$TermuxBinDir/pkg", "update", "-y")

if (-not $SkipUpgrade.IsPresent) {
  Write-Host "Running pkg upgrade..."
  Invoke-Termux -Command @("$TermuxBinDir/pkg", "upgrade", "-y") -IgnoreExitCode
}

Write-Host "Fixing broken dpkg state (force-confold)..."
Invoke-Termux -NonInteractive -Command @(
  "$TermuxBinDir/apt",
  "-o", "Dpkg::Options::=--force-confold",
  "-y",
  "--fix-broken",
  "install"
)

if ($Packages.Count -gt 0) {
  Write-Host "Installing packages: $($Packages -join ', ')"
  $install = @(
    "$TermuxBinDir/apt",
    "-o", "Dpkg::Options::=--force-confold",
    "-y",
    "install"
  ) + $Packages
  Invoke-Termux -NonInteractive -Command $install
}

Write-Host ""
Write-Host "Android package check for Termux:API app (com.termux.api):"
Invoke-Adb -AdbArgs @("shell", "cmd", "package", "list", "packages", "--user", "0") -IgnoreExitCode | Out-Null
& adb shell "cmd package list packages --user 0 | toybox grep -i '^package:com.termux.api$'" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "com.termux.api app is not installed (required by many termux-api commands)."
}

Write-Host ""
Write-Host "Repair-Termux-Over-Tailnet completed."
