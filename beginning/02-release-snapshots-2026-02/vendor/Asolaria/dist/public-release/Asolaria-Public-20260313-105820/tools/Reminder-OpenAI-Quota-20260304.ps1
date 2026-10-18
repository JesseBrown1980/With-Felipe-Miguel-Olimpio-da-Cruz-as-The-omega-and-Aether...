Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskId = "task_1771864003818_fprzsy"
$message = "Asolaria reminder: fund OpenAI API quota/budget and re-test external cursor provider."
$desktop = [Environment]::GetFolderPath("Desktop")
$notePath = Join-Path $desktop "ASOLARIA_REMINDER_2026-03-04.txt"
$timestamp = (Get-Date).ToString("o")

$lines = @(
  "Asolaria Reminder",
  "=================",
  "",
  "Time: $timestamp",
  "",
  $message,
  "",
  "Suggested checks:",
  "1) OpenAI billing/usage/limits",
  "2) Validate active API key + project budget",
  "3) Re-run external provider smoke test (OK_CURSOR_300+)",
  "",
  "Task ledger id: $taskId"
)

$lines -join "`r`n" | Set-Content -Path $notePath -Encoding UTF8

try {
  Start-Process -FilePath "notepad.exe" -ArgumentList $notePath | Out-Null
} catch {
  # Best effort only.
}

try {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($message, "Asolaria Reminder") | Out-Null
} catch {
  # Best effort only.
}

try {
  $body = @{
    status = "ready"
    progress = 0
    actor = "scheduled-reminder"
    source = "windows-task"
    note = "Reminder triggered on schedule."
    eventType = "reminder_triggered"
  } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Put -Uri ("http://127.0.0.1:4781/api/task-ledger/tasks/" + $taskId) -ContentType "application/json" -Body $body -TimeoutSec 20 | Out-Null
} catch {
  # Best effort only.
}
