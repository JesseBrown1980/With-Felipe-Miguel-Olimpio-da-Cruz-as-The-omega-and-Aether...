param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("move", "click", "double_click", "mouse_down", "mouse_up", "scroll", "type", "key", "window_list", "window_active", "window_focus", "window_minimize", "window_maximize", "window_restore", "window_close")]
  [string]$Action,

  [int]$X = -1,
  [int]$Y = -1,
  [double]$XNorm = -1,
  [double]$YNorm = -1,

  [ValidateSet("left", "right", "middle")]
  [string]$Button = "left",

  [int]$WheelDelta = 120,
  [string]$Text = "",
  [string]$Key = "",
  [int]$WindowId = 0,
  [string]$WindowTitle = "",
  [int]$Limit = 16,
  [int]$DisplayIndex = -1
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$cacheDir = Join-Path $scriptRoot ".cache"
$nativeAssemblyPath = Join-Path $cacheDir "DesktopInputNative.dll"

$nativeCode = @"
using System;
using System.Runtime.InteropServices;

public static class DesktopInputNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct POINT {
    public int X;
    public int Y;
  }

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetCursorPos(int X, int Y);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool GetCursorPos(out POINT lpPoint);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern void mouse_event(
    uint dwFlags,
    uint dx,
    uint dy,
    uint dwData,
    UIntPtr dwExtraInfo
  );

  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool IsWindow(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool PostMessage(IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam);
}
"@

function Ensure-DesktopInputNativeAssembly {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AssemblyPath,
    [Parameter(Mandatory = $true)]
    [string]$TypeDefinition
  )

  try {
    if (Test-Path -LiteralPath $AssemblyPath) {
      Add-Type -Path $AssemblyPath -ErrorAction Stop | Out-Null
      return
    }
  } catch {
    try {
      Remove-Item -LiteralPath $AssemblyPath -Force -ErrorAction SilentlyContinue
    } catch {
      # ignore cleanup errors
    }
  }

  $dir = Split-Path -Parent $AssemblyPath
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  Add-Type -TypeDefinition $TypeDefinition -Language CSharp -OutputAssembly $AssemblyPath -ErrorAction Stop | Out-Null
  Add-Type -Path $AssemblyPath -ErrorAction Stop | Out-Null
}

Ensure-DesktopInputNativeAssembly -AssemblyPath $nativeAssemblyPath -TypeDefinition $nativeCode

$MOUSEEVENTF_LEFTDOWN = 0x0002
$MOUSEEVENTF_LEFTUP = 0x0004
$MOUSEEVENTF_RIGHTDOWN = 0x0008
$MOUSEEVENTF_RIGHTUP = 0x0010
$MOUSEEVENTF_MIDDLEDOWN = 0x0020
$MOUSEEVENTF_MIDDLEUP = 0x0040
$MOUSEEVENTF_WHEEL = 0x0800
$SW_SHOW = 5
$SW_MAXIMIZE = 3
$SW_MINIMIZE = 6
$SW_RESTORE = 9
$WM_CLOSE = 0x0010

function Clamp-Number {
  param(
    [double]$Value,
    [double]$Min,
    [double]$Max
  )
  if ($Value -lt $Min) { return $Min }
  if ($Value -gt $Max) { return $Max }
  return $Value
}

function Get-ScreenInfo {
  param([int]$DisplayIndex = -1)

  $screens = @([System.Windows.Forms.Screen]::AllScreens)
  if ($screens.Count -lt 1) {
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    return [ordered]@{
      index = -1
      primary = $true
      left = [int]$bounds.Left
      top = [int]$bounds.Top
      width = [int]$bounds.Width
      height = [int]$bounds.Height
    }
  }

  $target = $null
  $safeIndex = [int]$DisplayIndex
  if ($safeIndex -ge 0 -and $safeIndex -lt $screens.Count) {
    $target = $screens[$safeIndex]
  }
  if ($null -eq $target) {
    $target = $screens | Where-Object { $_.Primary } | Select-Object -First 1
  }
  if ($null -eq $target) {
    $target = $screens[0]
  }

  $resolvedIndex = -1
  for ($idx = 0; $idx -lt $screens.Count; $idx++) {
    if ($screens[$idx] -eq $target) {
      $resolvedIndex = $idx
      break
    }
  }

  $bounds = $target.Bounds
  return [ordered]@{
    index = [int]$resolvedIndex
    primary = [bool]$target.Primary
    left = [int]$bounds.Left
    top = [int]$bounds.Top
    width = [int]$bounds.Width
    height = [int]$bounds.Height
  }
}

function Get-CursorPosition {
  $point = New-Object DesktopInputNative+POINT
  if (-not [DesktopInputNative]::GetCursorPos([ref]$point)) {
    throw "Failed to read cursor position."
  }
  return [ordered]@{
    x = [int]$point.X
    y = [int]$point.Y
  }
}

function Get-WindowRows {
  param([int]$Limit = 16)
  $safeLimit = [Math]::Max(1, [Math]::Min(80, [int]$Limit))
  $rows = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and -not [string]::IsNullOrWhiteSpace($_.MainWindowTitle)
  } | Sort-Object Id -Descending

  $out = @()
  foreach ($proc in $rows) {
    $title = [string]$proc.MainWindowTitle
    if ([string]::IsNullOrWhiteSpace($title)) {
      continue
    }
    $out += [ordered]@{
      id = [int]$proc.Id
      process = [string]$proc.ProcessName
      title = $title
      handle = [int64]$proc.MainWindowHandle
    }
    if ($out.Count -ge $safeLimit) {
      break
    }
  }
  return $out
}

function Get-ForegroundWindowTarget {
  $handle = [DesktopInputNative]::GetForegroundWindow()
  if ($handle -eq [IntPtr]::Zero) {
    throw "No active window is available."
  }
  $processId = [uint32]0
  [DesktopInputNative]::GetWindowThreadProcessId($handle, [ref]$processId) | Out-Null
  if ($processId -le 0) {
    throw "Failed to resolve active window process."
  }
  $proc = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
  return [ordered]@{
    id = [int]$processId
    process = if ($proc) { [string]$proc.ProcessName } else { "" }
    title = if ($proc) { [string]$proc.MainWindowTitle } else { "" }
    handle = $handle
  }
}

function Find-WindowTarget {
  param(
    [int]$WindowId,
    [string]$WindowTitle
  )

  if ($WindowId -gt 0) {
    $procById = Get-Process -Id $WindowId -ErrorAction Stop
    if ($procById.MainWindowHandle -eq 0) {
      throw "Process $WindowId has no visible main window."
    }
    return [ordered]@{
      id = [int]$procById.Id
      process = [string]$procById.ProcessName
      title = [string]$procById.MainWindowTitle
      handle = [IntPtr]$procById.MainWindowHandle
    }
  }

  $query = [string]$WindowTitle
  if (-not [string]::IsNullOrWhiteSpace($query)) {
    $needle = $query.ToLowerInvariant()
    $matches = @(Get-Process | Where-Object {
      $_.MainWindowHandle -ne 0 -and -not [string]::IsNullOrWhiteSpace($_.MainWindowTitle) -and $_.MainWindowTitle.ToLowerInvariant().Contains($needle)
    } | Sort-Object Id -Descending)
    if ($matches.Count -gt 0) {
      $procByTitle = $matches[0]
      return [ordered]@{
        id = [int]$procByTitle.Id
        process = [string]$procByTitle.ProcessName
        title = [string]$procByTitle.MainWindowTitle
        handle = [IntPtr]$procByTitle.MainWindowHandle
      }
    }
    throw "No window title matched: $WindowTitle"
  }

  return Get-ForegroundWindowTarget
}

function Focus-WindowTarget {
  param($Target)
  $handle = [IntPtr]$Target.handle
  if ($handle -eq [IntPtr]::Zero -or -not [DesktopInputNative]::IsWindow($handle)) {
    throw "Window handle is not valid."
  }
  [DesktopInputNative]::ShowWindow($handle, [int]$SW_RESTORE) | Out-Null
  if (-not [DesktopInputNative]::SetForegroundWindow($handle)) {
    $wshell = New-Object -ComObject WScript.Shell
    $activated = $wshell.AppActivate([int]$Target.id)
    if (-not $activated) {
      throw "Failed to focus target window."
    }
  }
  Start-Sleep -Milliseconds 70
}

function Invoke-WindowAction {
  param(
    [string]$Action,
    [int]$WindowId,
    [string]$WindowTitle
  )

  $target = Find-WindowTarget -WindowId $WindowId -WindowTitle $WindowTitle
  $handle = [IntPtr]$target.handle
  if ($handle -eq [IntPtr]::Zero -or -not [DesktopInputNative]::IsWindow($handle)) {
    throw "Window handle is invalid for action."
  }

  switch ([string]$Action) {
    "window_focus" {
      Focus-WindowTarget -Target $target
    }
    "window_minimize" {
      Focus-WindowTarget -Target $target
      [DesktopInputNative]::ShowWindow($handle, [int]$SW_MINIMIZE) | Out-Null
    }
    "window_maximize" {
      Focus-WindowTarget -Target $target
      [DesktopInputNative]::ShowWindow($handle, [int]$SW_MAXIMIZE) | Out-Null
    }
    "window_restore" {
      Focus-WindowTarget -Target $target
      [DesktopInputNative]::ShowWindow($handle, [int]$SW_RESTORE) | Out-Null
    }
    "window_close" {
      Focus-WindowTarget -Target $target
      [DesktopInputNative]::PostMessage($handle, [uint32]$WM_CLOSE, [UIntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    }
    default {
      throw "Unsupported window action: $Action"
    }
  }

  return [ordered]@{
    id = [int]$target.id
    process = [string]$target.process
    title = [string]$target.title
    handle = [int64]$handle
    action = [string]$Action
  }
}

function Resolve-TargetPoint {
  param(
    [int]$X,
    [int]$Y,
    [double]$XNorm,
    [double]$YNorm,
    $ScreenInfo
  )

  $left = [int]$ScreenInfo.left
  $top = [int]$ScreenInfo.top
  $width = [Math]::Max(1, [int]$ScreenInfo.width)
  $height = [Math]::Max(1, [int]$ScreenInfo.height)
  $maxX = $left + $width - 1
  $maxY = $top + $height - 1

  if ($XNorm -ge 0 -and $YNorm -ge 0) {
    $normX = Clamp-Number -Value $XNorm -Min 0 -Max 1
    $normY = Clamp-Number -Value $YNorm -Min 0 -Max 1
    $px = [int]([Math]::Round($left + ($normX * ($width - 1))))
    $py = [int]([Math]::Round($top + ($normY * ($height - 1))))
    return [ordered]@{
      x = [int](Clamp-Number -Value $px -Min $left -Max $maxX)
      y = [int](Clamp-Number -Value $py -Min $top -Max $maxY)
    }
  }

  if ($X -ge 0 -and $Y -ge 0) {
    return [ordered]@{
      x = [int](Clamp-Number -Value $X -Min $left -Max $maxX)
      y = [int](Clamp-Number -Value $Y -Min $top -Max $maxY)
    }
  }

  return Get-CursorPosition
}

function Invoke-MouseClick {
  param([string]$Button)
  $flags = Get-MouseButtonFlags -Button $Button
  [DesktopInputNative]::mouse_event($flags.down, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 35
  [DesktopInputNative]::mouse_event($flags.up, 0, 0, 0, [UIntPtr]::Zero)
}

function Get-MouseButtonFlags {
  param([string]$Button)
  $lower = ([string]$Button).ToLowerInvariant()
  switch ($lower) {
    "left" {
      return [ordered]@{
        down = [uint32]$MOUSEEVENTF_LEFTDOWN
        up = [uint32]$MOUSEEVENTF_LEFTUP
      }
    }
    "right" {
      return [ordered]@{
        down = [uint32]$MOUSEEVENTF_RIGHTDOWN
        up = [uint32]$MOUSEEVENTF_RIGHTUP
      }
    }
    "middle" {
      return [ordered]@{
        down = [uint32]$MOUSEEVENTF_MIDDLEDOWN
        up = [uint32]$MOUSEEVENTF_MIDDLEUP
      }
    }
    default {
      throw "Unsupported mouse button: $Button"
    }
  }
}

function Invoke-MouseDown {
  param([string]$Button)
  $flags = Get-MouseButtonFlags -Button $Button
  [DesktopInputNative]::mouse_event($flags.down, 0, 0, 0, [UIntPtr]::Zero)
}

function Invoke-MouseUp {
  param([string]$Button)
  $flags = Get-MouseButtonFlags -Button $Button
  [DesktopInputNative]::mouse_event($flags.up, 0, 0, 0, [UIntPtr]::Zero)
}

function Convert-ToSendKeysText {
  param([string]$Value)
  $safe = [string]$Value
  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $safe.ToCharArray()) {
    switch ([string]$char) {
      "`r" { continue }
      "`n" { [void]$builder.Append("{ENTER}") }
      "`t" { [void]$builder.Append("{TAB}") }
      "+" { [void]$builder.Append("{+}") }
      "^" { [void]$builder.Append("{^}") }
      "%" { [void]$builder.Append("{%}") }
      "~" { [void]$builder.Append("{~}") }
      "(" { [void]$builder.Append("{(}") }
      ")" { [void]$builder.Append("{)}") }
      "[" { [void]$builder.Append("{[}") }
      "]" { [void]$builder.Append("{]}") }
      "{" { [void]$builder.Append("{{}") }
      "}" { [void]$builder.Append("{}}") }
      default { [void]$builder.Append($char) }
    }
  }
  return $builder.ToString()
}

function Convert-KeyToSendKeysToken {
  param([string]$KeyName)
  $key = ([string]$KeyName).Trim().ToLowerInvariant()
  switch ($key) {
    "enter" { return "{ENTER}" }
    "esc" { return "{ESC}" }
    "escape" { return "{ESC}" }
    "tab" { return "{TAB}" }
    "backspace" { return "{BACKSPACE}" }
    "delete" { return "{DELETE}" }
    "up" { return "{UP}" }
    "down" { return "{DOWN}" }
    "left" { return "{LEFT}" }
    "right" { return "{RIGHT}" }
    "home" { return "{HOME}" }
    "end" { return "{END}" }
    "pageup" { return "{PGUP}" }
    "pagedown" { return "{PGDN}" }
    "space" { return " " }
    "ctrl+a" { return "^a" }
    "ctrl+c" { return "^c" }
    "ctrl+v" { return "^v" }
    "ctrl+x" { return "^x" }
    "ctrl+z" { return "^z" }
    "ctrl+y" { return "^y" }
    "ctrl+f" { return "^f" }
    "ctrl+j" { return "^j" }
    "ctrl+s" { return "^s" }
    "ctrl+l" { return "^l" }
    "ctrl+w" { return "^w" }
    "ctrl+t" { return "^t" }
    "ctrl+shift+t" { return "^+t" }
    "ctrl+r" { return "^r" }
    "ctrl+tab" { return "^{TAB}" }
    "ctrl+shift+tab" { return "^+{TAB}" }
    "shift+tab" { return "+{TAB}" }
    "alt+tab" { return "%{TAB}" }
    "alt+f4" { return "%{F4}" }
    "f1" { return "{F1}" }
    "f2" { return "{F2}" }
    "f3" { return "{F3}" }
    "f4" { return "{F4}" }
    "f5" { return "{F5}" }
    "f6" { return "{F6}" }
    "f7" { return "{F7}" }
    "f8" { return "{F8}" }
    "f9" { return "{F9}" }
    "f10" { return "{F10}" }
    "f11" { return "{F11}" }
    "f12" { return "{F12}" }
    default { throw "Unsupported key action: $KeyName" }
  }
}

$screen = Get-ScreenInfo -DisplayIndex $DisplayIndex
$target = Resolve-TargetPoint -X $X -Y $Y -XNorm $XNorm -YNorm $YNorm -ScreenInfo $screen
$windowRows = $null
$windowInfo = $null

if ($Action -eq "move" -or $Action -eq "click" -or $Action -eq "double_click" -or $Action -eq "mouse_down" -or $Action -eq "mouse_up" -or $Action -eq "scroll") {
  [DesktopInputNative]::SetCursorPos([int]$target.x, [int]$target.y) | Out-Null
  Start-Sleep -Milliseconds 25
}

switch ($Action) {
  "move" {
    # Cursor was moved above.
  }
  "click" {
    Invoke-MouseClick -Button $Button
  }
  "double_click" {
    Invoke-MouseClick -Button $Button
    Start-Sleep -Milliseconds 80
    Invoke-MouseClick -Button $Button
  }
  "mouse_down" {
    Invoke-MouseDown -Button $Button
  }
  "mouse_up" {
    Invoke-MouseUp -Button $Button
  }
  "scroll" {
    $delta = [int](Clamp-Number -Value $WheelDelta -Min -2400 -Max 2400)
    [DesktopInputNative]::mouse_event([uint32]$MOUSEEVENTF_WHEEL, 0, 0, [uint32]$delta, [UIntPtr]::Zero)
  }
  "type" {
    if (-not [string]::IsNullOrWhiteSpace($Text)) {
      $token = Convert-ToSendKeysText -Value $Text
      [System.Windows.Forms.SendKeys]::SendWait($token)
    }
  }
  "key" {
    if ([string]::IsNullOrWhiteSpace($Key)) {
      throw "Key is required when action is 'key'."
    }
    $token = Convert-KeyToSendKeysToken -KeyName $Key
    [System.Windows.Forms.SendKeys]::SendWait($token)
  }
  "window_list" {
    $windowRows = @(Get-WindowRows -Limit $Limit)
  }
  "window_active" {
    $windowInfo = Get-ForegroundWindowTarget
  }
  "window_focus" {
    $windowInfo = Invoke-WindowAction -Action $Action -WindowId $WindowId -WindowTitle $WindowTitle
  }
  "window_minimize" {
    $windowInfo = Invoke-WindowAction -Action $Action -WindowId $WindowId -WindowTitle $WindowTitle
  }
  "window_maximize" {
    $windowInfo = Invoke-WindowAction -Action $Action -WindowId $WindowId -WindowTitle $WindowTitle
  }
  "window_restore" {
    $windowInfo = Invoke-WindowAction -Action $Action -WindowId $WindowId -WindowTitle $WindowTitle
  }
  "window_close" {
    $windowInfo = Invoke-WindowAction -Action $Action -WindowId $WindowId -WindowTitle $WindowTitle
  }
  default {
    throw "Unsupported action: $Action"
  }
}

$cursor = Get-CursorPosition
$result = [ordered]@{
  ok = $true
  action = $Action
  button = $Button
  cursor = [ordered]@{
    x = [int]$cursor.x
    y = [int]$cursor.y
  }
  screen = [ordered]@{
    index = [int]$screen.index
    primary = [bool]$screen.primary
    left = [int]$screen.left
    top = [int]$screen.top
    width = [int]$screen.width
    height = [int]$screen.height
  }
  at = (Get-Date).ToString("o")
}

if ($windowRows -ne $null) {
  $result.windows = $windowRows
  $result.count = @($windowRows).Count
}
if ($windowInfo -ne $null) {
  $result.window = $windowInfo
}

$result | ConvertTo-Json -Depth 6 -Compress
