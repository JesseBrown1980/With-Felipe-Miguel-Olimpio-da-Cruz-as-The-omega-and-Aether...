Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms

$screens = [System.Windows.Forms.Screen]::AllScreens
$rows = @()
$primaryIndex = -1

for ($i = 0; $i -lt $screens.Count; $i++) {
  $item = $screens[$i]
  $bounds = $item.Bounds
  $row = [ordered]@{
    index = [int]$i
    deviceName = [string]$item.DeviceName
    primary = [bool]$item.Primary
    left = [int]$bounds.Left
    top = [int]$bounds.Top
    width = [int]$bounds.Width
    height = [int]$bounds.Height
  }
  if ($item.Primary) {
    $primaryIndex = [int]$i
  }
  $rows += $row
}

$virtual = [System.Windows.Forms.SystemInformation]::VirtualScreen
$result = [ordered]@{
  ok = $true
  count = @($rows).Count
  primaryIndex = [int]$primaryIndex
  virtual = [ordered]@{
    left = [int]$virtual.Left
    top = [int]$virtual.Top
    width = [int]$virtual.Width
    height = [int]$virtual.Height
  }
  displays = $rows
}

$result | ConvertTo-Json -Depth 6 -Compress
