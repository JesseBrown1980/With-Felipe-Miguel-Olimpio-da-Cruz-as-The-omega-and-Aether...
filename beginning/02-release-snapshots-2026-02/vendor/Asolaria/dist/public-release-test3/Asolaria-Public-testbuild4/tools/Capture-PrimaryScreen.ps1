param(
  [string]$OutputPath = "C:\Users\acer\Asolaria\captures\prompt-check-primary-screen.png",
  [int]$ScreenIndex = -1,
  [switch]$CaptureAll
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$outputDir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$screens = [System.Windows.Forms.Screen]::AllScreens
$bounds = $null

if ($CaptureAll.IsPresent) {
  $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
} elseif ($ScreenIndex -ge 0 -and $ScreenIndex -lt $screens.Count) {
  $bounds = $screens[$ScreenIndex].Bounds
} else {
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
}

$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
  $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Output $OutputPath
