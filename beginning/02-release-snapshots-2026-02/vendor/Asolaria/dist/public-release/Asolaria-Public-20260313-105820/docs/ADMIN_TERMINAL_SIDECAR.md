# Admin Terminal Sidecar

This is the cooperative terminal sidecar for the two admin terminals:

- `Helm`
- `Sentinel`

It does not attach to an arbitrary existing shell by terminal id.

Instead, it gives each admin terminal a stable local sidecar identity with:

- a stable terminal id
- an append-only transcript log
- a guarded input queue
- a status file with child pid, last input, and last output

## Tooling

- Start:
  - `C:\Users\acer\Asolaria\tools\Start-AdminTerminalSidecar.ps1`
- Run worker:
  - `C:\Users\acer\Asolaria\tools\Run-AdminTerminalSidecar.ps1`
- Send input:
  - `C:\Users\acer\Asolaria\tools\Send-AdminTerminalInput.ps1`
- Read status:
  - `C:\Users\acer\Asolaria\tools\Get-AdminTerminalSidecarStatus.ps1`
- Stop:
  - `C:\Users\acer\Asolaria\tools\Stop-AdminTerminalSidecar.ps1`

## Runtime Paths

Sidecar runtime root:

- `C:\Users\acer\Asolaria\runtime\admin-terminals`

Per terminal:

- `transcript.log`
- `inbox.ndjson`
- `status.json`
- `sidecar.pid`
- `child.pid`

## Default Launch

Default child command:

```powershell
codex -a never -s danger-full-access
```

Default working directory:

- `C:\Users\acer`

## Examples

### Start Sentinel

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\acer\Asolaria\tools\Start-AdminTerminalSidecar.ps1 -TerminalId Sentinel
```

### Read Sentinel status and transcript tail

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\acer\Asolaria\tools\Get-AdminTerminalSidecarStatus.ps1 -TerminalId Sentinel -Tail 30
```

### Queue input to Sentinel

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\acer\Asolaria\tools\Send-AdminTerminalInput.ps1 -TerminalId Sentinel -Source Helm -Reason controller_prompt -Text "Read sector-drift-watch-latest.md, then report only controller-relevant drift."
```

### Stop Sentinel

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\acer\Asolaria\tools\Stop-AdminTerminalSidecar.ps1 -TerminalId Sentinel
```

## Guardrails

- Use this only for `Helm` and `Sentinel`.
- Treat the transcript as local admin-memory, not public relay content.
- Queue only bounded prompts, not endless chatter.
- Use the completion-hook contract for meaningful checkpoints instead of spamming the queue.
- If a sidecar is not the process that launched the admin terminal, it cannot take over a random already-running shell.
