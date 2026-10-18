param(
  [string]$OpenUrl = "http://127.0.0.1:4781"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DisplayWake {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr SendMessage(IntPtr hWnd, UInt32 Msg, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

# SC_MONITORPOWER (-1) requests monitor on.
[void][DisplayWake]::SendMessage([IntPtr]0xFFFF, 0x0112, [IntPtr]0xF170, [IntPtr](-1))
Start-Sleep -Milliseconds 120

# Nudge input to reliably wake some displays.
[DisplayWake]::keybd_event(0x10, 0, 0, [UIntPtr]::Zero)      # Shift down
[DisplayWake]::keybd_event(0x10, 0, 0x0002, [UIntPtr]::Zero) # Shift up

if ($OpenUrl) {
  try {
    Start-Process -FilePath $OpenUrl | Out-Null
  } catch {
    # Keep wake action best-effort without failing task.
  }
}

Write-Output ("Display wake trigger executed at {0}" -f (Get-Date).ToString("o"))
