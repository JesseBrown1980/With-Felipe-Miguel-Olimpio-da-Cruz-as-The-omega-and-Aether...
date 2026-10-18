Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Auto-Continue"
$form.Size = New-Object System.Drawing.Size(120, 60)
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedToolWindow
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location = New-Object System.Drawing.Point(([System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea.Width - 130), 10)
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(51, 51, 51)
$form.ShowInTaskbar = $false

$btn = New-Object System.Windows.Forms.Button
$btn.Text = "OFF"
$btn.Size = New-Object System.Drawing.Size(90, 30)
$btn.Location = New-Object System.Drawing.Point(10, 10)
$btn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btn.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(100, 100, 100)
$btn.BackColor = [System.Drawing.Color]::FromArgb(70, 70, 70)
$btn.ForeColor = [System.Drawing.Color]::FromArgb(170, 170, 170)
$btn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btn.Cursor = [System.Windows.Forms.Cursors]::Hand

$script:running = $false
$script:tickCount = 0
$script:enterSec = 10
$script:contSec = 900  # 15 minutes

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $script:enterSec * 1000

$timer.Add_Tick({
    $script:tickCount += $script:enterSec
    # Briefly activate nothing so we don't steal focus from the TARGET
    # SendKeys goes to whatever is focused - user keeps their terminal focused
    if ($script:tickCount -ge $script:contSec) {
        [System.Windows.Forms.SendKeys]::SendWait("continue")
        Start-Sleep -Milliseconds 80
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        $script:tickCount = 0
    } else {
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    }
})

$btn.Add_Click({
    if ($script:running) {
        $script:running = $false
        $timer.Stop()
        $script:tickCount = 0
        $btn.Text = "OFF"
        $btn.BackColor = [System.Drawing.Color]::FromArgb(70, 70, 70)
        $btn.ForeColor = [System.Drawing.Color]::FromArgb(170, 170, 170)
    } else {
        $script:running = $true
        $script:tickCount = 0
        $timer.Start()
        $btn.Text = "ON"
        $btn.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 60)
        $btn.ForeColor = [System.Drawing.Color]::White
    }
})

$form.Controls.Add($btn)
[System.Windows.Forms.Application]::Run($form)
