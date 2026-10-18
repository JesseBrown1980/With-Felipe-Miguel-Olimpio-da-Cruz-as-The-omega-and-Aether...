# Task Packet Template: Friend Computer Codex Bootstrap

Use this as the operator packet that accompanies `Friend-Codex-Bootstrap-SystemCard.prompt.md`.

## Packet
- `HOST_LABEL`: `{{FRIEND_MACHINE_NAME}}`
- `OS_TARGET`: `{{WINDOWS_11 | WINDOWS_10 | MACOS | UBUNTU | OTHER}}`
- `INSTALL_ROOT`: `{{PREFERRED_INSTALL_PATH}}`
- `PACKAGE_MANAGER`: `{{WINGET | CHOCO | BREW | APT | UNKNOWN}}`
- `PROJECT_SOURCE`: `{{REPO_URL_OR_LOCAL_SOURCE}}`
- `DESIRED_RUNTIME`: `{{CODEX_ONLY | CODEX_PLUS_ASOLARIA | FULL_LOCAL_CONTROL_PLANE}}`
- `ALLOW_ELEVATION`: `{{YES | NO | ASK_FIRST}}`
- `NETWORK_CONSTRAINTS`: `{{VPN | FIREWALL | PROXY | NONE | NOTES}}`
- `BROWSER_CONSTRAINTS`: `{{CHROME_PROFILE | EDGE_PROFILE | NO_BROWSER_AUTOMATION | NOTES}}`
- `FRIEND_CONSTRAINTS`: `{{LOW_DISK | LOW_RAM | NO_ADMIN | SHARED_PC | NOTES}}`
- `SUCCESS_TARGET`: `{{WHAT_DONE_LOOKS_LIKE}}`

## Operator Instruction
Use the system card exactly.
Plan first, then execute.
Tailor all steps to the actual host state rather than assuming a clean machine.

## Required Deliverables
1. machine-specific plan
2. exact commands run
3. files changed
4. verification summary
5. remaining manual actions

## Example Launch Prompt
```text
Use `Friend-Codex-Bootstrap-SystemCard.prompt.md` as the active system card.

Task packet:
- HOST_LABEL: Derek-Laptop
- OS_TARGET: WINDOWS_11
- INSTALL_ROOT: C:\Users\Derek\Asolaria
- PACKAGE_MANAGER: WINGET
- PROJECT_SOURCE: private local copy provided by operator
- DESIRED_RUNTIME: CODEX_PLUS_ASOLARIA
- ALLOW_ELEVATION: ASK_FIRST
- NETWORK_CONSTRAINTS: corporate firewall; no inbound ports without approval
- BROWSER_CONSTRAINTS: Chrome available; do not reuse personal profiles without explicit need
- FRIEND_CONSTRAINTS: shared PC; preserve existing development tools
- SUCCESS_TARGET: host can run Codex CLI, open the local Asolaria UI, and pass health checks without duplicate processes

Now perform host discovery, produce the machine-specific build plan, and execute only the minimum safe steps needed.
```
