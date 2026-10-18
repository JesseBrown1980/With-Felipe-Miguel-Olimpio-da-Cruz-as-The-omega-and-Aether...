param(
  [int]$Port = 4781
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Resolve-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-PowerShellPath {
  $candidate = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (Test-Path -LiteralPath $candidate) {
    return $candidate
  }
  return "powershell.exe"
}

function New-HubButton {
  param(
    [string]$Text,
    [int]$X,
    [int]$Y,
    [scriptblock]$OnClick
  )

  $button = New-Object System.Windows.Forms.Button
  $button.Text = $Text
  $button.Width = 190
  $button.Height = 44
  $button.Left = $X
  $button.Top = $Y
  $button.FlatStyle = [System.Windows.Forms.FlatStyle]::Standard
  $button.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
  if ($OnClick) {
    $button.Add_Click($OnClick)
  }
  return $button
}

function Start-LauncherProcess {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList = @(),
    [string]$WorkingDirectory = ""
  )
  if (-not (Test-Path -LiteralPath $FilePath)) {
    [System.Windows.Forms.MessageBox]::Show(
      "Launcher target not found:`n$FilePath",
      "Asolaria Launcher Hub",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
    return
  }
  if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    $WorkingDirectory = Split-Path -Parent $FilePath
  }
  Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory | Out-Null
}

$repoRoot = Resolve-AsolariaRoot
$toolsDir = Join-Path $repoRoot "tools"
$psPath = Resolve-PowerShellPath

$startAsolaria = Join-Path $repoRoot "Start-Asolaria.cmd"
$startOneButton = Join-Path $repoRoot "Start-Asolaria-OneButton.cmd"
$startPhone = Join-Path $repoRoot "Start-Asolaria-Phone.cmd"
$startControlPlane = Join-Path $repoRoot "Start-Asolaria-ControlPlane.cmd"
$stopAsolaria = Join-Path $repoRoot "Stop-Asolaria.cmd"
$stopControlPlane = Join-Path $repoRoot "Stop-Asolaria-ControlPlane.cmd"
$openTerminalScript = Join-Path $toolsDir "Open-Asolaria-SuperAdminTerminal.ps1"

$form = New-Object System.Windows.Forms.Form
$form.Text = "Asolaria Launcher Hub"
$form.Width = 430
$form.Height = 405
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.MinimizeBox = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(24, 32, 44)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Asolaria Launcher Hub"
$title.ForeColor = [System.Drawing.Color]::White
$title.BackColor = [System.Drawing.Color]::Transparent
$title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 12, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Left = 18
$title.Top = 14
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Standalone launcher panel (no dashboard injection)"
$subtitle.ForeColor = [System.Drawing.Color]::Gainsboro
$subtitle.BackColor = [System.Drawing.Color]::Transparent
$subtitle.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$subtitle.AutoSize = $true
$subtitle.Left = 18
$subtitle.Top = 42
$form.Controls.Add($subtitle)

$form.Controls.Add((New-HubButton -Text "Asolaria" -X 18 -Y 78 -OnClick {
  Start-LauncherProcess -FilePath $startAsolaria -WorkingDirectory $repoRoot
}))
$form.Controls.Add((New-HubButton -Text "App (One Button)" -X 218 -Y 78 -OnClick {
  Start-LauncherProcess -FilePath $startOneButton -WorkingDirectory $repoRoot
}))
$form.Controls.Add((New-HubButton -Text "Phone Connect" -X 18 -Y 130 -OnClick {
  Start-LauncherProcess -FilePath $startPhone -WorkingDirectory $repoRoot
}))
$form.Controls.Add((New-HubButton -Text "Control Plane (Admin)" -X 218 -Y 130 -OnClick {
  Start-LauncherProcess -FilePath $startControlPlane -WorkingDirectory $repoRoot
}))
$form.Controls.Add((New-HubButton -Text "Super Admin Terminal" -X 18 -Y 182 -OnClick {
  Start-LauncherProcess -FilePath $psPath -WorkingDirectory $repoRoot -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $openTerminalScript,
    "-Target", "admin",
    "-Port", "$Port",
    "-RunOnce"
  )
}))
$form.Controls.Add((New-HubButton -Text "Brain Terminal" -X 218 -Y 182 -OnClick {
  Start-LauncherProcess -FilePath $psPath -WorkingDirectory $repoRoot -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $openTerminalScript,
    "-Target", "brain",
    "-Port", "$Port",
    "-RunOnce"
  )
}))
$form.Controls.Add((New-HubButton -Text "Stop Asolaria (Admin)" -X 18 -Y 234 -OnClick {
  Start-LauncherProcess -FilePath $stopAsolaria -WorkingDirectory $repoRoot
}))
$form.Controls.Add((New-HubButton -Text "Stop Control Plane" -X 218 -Y 234 -OnClick {
  Start-LauncherProcess -FilePath $stopControlPlane -WorkingDirectory $repoRoot
}))

$note = New-Object System.Windows.Forms.Label
$note.Text = "Tip: keep this panel pinned; it only launches existing scripts."
$note.ForeColor = [System.Drawing.Color]::LightSteelBlue
$note.BackColor = [System.Drawing.Color]::Transparent
$note.Font = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Italic)
$note.AutoSize = $true
$note.Left = 18
$note.Top = 294
$form.Controls.Add($note)

[void]$form.ShowDialog()
