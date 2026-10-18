Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DisplayPower {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr SendMessage(IntPtr hWnd, UInt32 Msg, IntPtr wParam, IntPtr lParam);
}
"@

# SC_MONITORPOWER (2) requests monitor off / black.
[void][DisplayPower]::SendMessage([IntPtr]0xFFFF, 0x0112, [IntPtr]0xF170, [IntPtr]2)
Write-Output ("Display blackout trigger executed at {0}" -f (Get-Date).ToString("o"))
