param(
  [ValidateSet("desktop","window","layout","phone")]
  [string]$Mode = "desktop",
  [string]$OutputPath = "",
  [string]$OutputRoot = "",
  [string]$WindowTitle = "AnyDesk",
  [string]$WindowId = "",
  [int]$ScreenIndex = -1,
  [switch]$CaptureAll
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ToolPath {
  param([string]$FileName)
  $path = Join-Path $PSScriptRoot $FileName
  if (-not (Test-Path -LiteralPath $path)) {
    throw ("Missing Asolaria capture tool: {0}" -f $path)
  }
  return $path
}

switch ($Mode) {
  "desktop" {
    $tool = Resolve-ToolPath -FileName "Capture-PrimaryScreen.ps1"
    if ([string]::IsNullOrWhiteSpace($OutputPath)) {
      $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
      $OutputPath = "C:\Users\acer\Asolaria\captures\desktop\asolaria-desktop-$stamp.png"
    }
    if ($CaptureAll.IsPresent) {
      & $tool -OutputPath $OutputPath -ScreenIndex $ScreenIndex -CaptureAll
    } else {
      & $tool -OutputPath $OutputPath -ScreenIndex $ScreenIndex
    }
    Write-Output ("Captured desktop image: {0}" -f $OutputPath)
  }
  "window" {
    $tool = Resolve-ToolPath -FileName "Capture-Window.ps1"
    if ([string]::IsNullOrWhiteSpace($OutputPath)) {
      $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
      $OutputPath = "C:\Users\acer\Asolaria\captures\desktop\asolaria-window-$stamp.png"
    }
    if ([string]::IsNullOrWhiteSpace($WindowId)) {
      & $tool -OutputPath $OutputPath -WindowTitle $WindowTitle | Out-Null
    } else {
      & $tool -OutputPath $OutputPath -WindowId $WindowId | Out-Null
    }
    Write-Output ("Captured window image: {0}" -f $OutputPath)
  }
  "layout" {
    $tool = Resolve-ToolPath -FileName "Capture-Layout-And-Window.ps1"
    if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
      $OutputRoot = "C:\Users\acer\captures\vision"
    }
    if (-not [string]::IsNullOrWhiteSpace($WindowId)) {
      & $tool -OutputRoot $OutputRoot -WindowId $WindowId
    } else {
      & $tool -OutputRoot $OutputRoot -WindowTitle $WindowTitle
    }
  }
  "phone" {
    $tool = Resolve-ToolPath -FileName "Capture-PhoneScreencapRaw.ps1"
    if ([string]::IsNullOrWhiteSpace($OutputPath)) {
      $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
      $OutputPath = "C:\Users\acer\Asolaria\captures\phone\asolaria-phone-$stamp.png"
    }
    & $tool -OutputPath $OutputPath | Out-Null
    Write-Output ("Captured phone image: {0}" -f $OutputPath)
  }
}
