param(
  [string]$OutputPath = "C:\Users\acer\Asolaria\captures\desktop\window-capture.png",
  [string]$WindowTitle = "AnyDesk",
  [int]$WindowId = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class WindowCaptureNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$SW_RESTORE = 9

function Resolve-WindowProcess {
  param(
    [int]$ProcessId,
    [string]$TitleFilter
  )

  if ($ProcessId -gt 0) {
    $proc = Get-Process -Id $ProcessId -ErrorAction Stop
    if ($proc.MainWindowHandle -eq 0) {
      throw "Process $ProcessId has no visible main window."
    }
    return $proc
  }

  $needle = ([string]$TitleFilter).Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($needle)) {
    throw "WindowTitle cannot be empty when WindowId is not supplied."
  }

  $proc = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and -not [string]::IsNullOrWhiteSpace($_.MainWindowTitle) -and $_.MainWindowTitle.ToLowerInvariant().Contains($needle)
  } | Sort-Object Id -Descending | Select-Object -First 1

  if ($null -eq $proc) {
    throw "No visible window matched title filter '$TitleFilter'."
  }

  return $proc
}

$windowProc = Resolve-WindowProcess -ProcessId $WindowId -TitleFilter $WindowTitle
$hWnd = [IntPtr]$windowProc.MainWindowHandle
if ($hWnd -eq [IntPtr]::Zero) {
  throw "Window handle was zero."
}

# Bring target window to foreground to reduce overlay interference.
[WindowCaptureNative]::ShowWindow($hWnd, $SW_RESTORE) | Out-Null
[WindowCaptureNative]::SetForegroundWindow($hWnd) | Out-Null
Start-Sleep -Milliseconds 120

$rect = New-Object WindowCaptureNative+RECT
if (-not [WindowCaptureNative]::GetWindowRect($hWnd, [ref]$rect)) {
  throw "GetWindowRect failed."
}

$width = [Math]::Max(1, $rect.Right - $rect.Left)
$height = [Math]::Max(1, $rect.Bottom - $rect.Top)

$outDir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, [System.Drawing.Size]::new($width, $height))
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}

[pscustomobject]@{
  ok = $true
  outputPath = $OutputPath
  processId = [int]$windowProc.Id
  processName = [string]$windowProc.ProcessName
  title = [string]$windowProc.MainWindowTitle
  left = [int]$rect.Left
  top = [int]$rect.Top
  width = [int]$width
  height = [int]$height
  capturedAt = (Get-Date).ToString("o")
} | ConvertTo-Json -Compress
