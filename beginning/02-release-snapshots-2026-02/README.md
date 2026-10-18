# 02: Release snapshots, 2026-02-18 to 2026-03-13

Build-order step 2 of the beginning map: the owner's own release builds of Asolaria from before the first
commit of the public repository, unpacked and vendored byte for byte, with the 2026-02-19 MCP token benchmark,
the 2026-03-08 token report and the two later index stores beside them.

Source: github.com/JesseBrown1980/Asolaria (public), read from a bare mirror of all 132 refs. Nothing here is
re-encoded: every file under `vendor/Asolaria/` was written with `git cat-file blob` and its
`git hash-object --no-filters` equals the source blob (1,745 of 1,745). `sha256sum -c UPSTREAM.sha256` checks
the bytes. `vendor/Asolaria/<path>` is the file's path in the source at the pinned commit.

| file | what it holds |
|---|---|
| PROVENANCE.md | one row per vendored file (source @ commit : path, blob, bytes, sha256(16), beginning), per snapshot; the zip pins, the zip-member comparison, the section references and the tree ids |
| UPSTREAM.sha256 | full sha256 of the 1,745 vendored files, `sha256sum -c` format, run from this directory |
| HELD.hbp | 49 HELD rows and 1 HELDALIAS row: every file of these trees and zips that is not vendored, by blob, with the reason (json=0) |

## In the owner's words

From the owner's key-dates table (docs/CREATION_HISTORY.md, blob 0f38e0d4, pinned in PROVENANCE, not vendored here):

> | ~2025-10 | Asolaria development begins (stripped from OpenClaw codebase) |
> | 2026-02-18 | NextGen roadmap established (skills v1, Telegram, brain fallback) |
> | 2026-02-19 | MCP token benchmark: 99.22% reduction measured |

and, from the same file:

> 4. **The MCP Cost Reduction**: Create a skills/tools/mistakes/projects table. Each gets an index number. The LLM loads index numbers instead of whole tool lists. 99.22% cost saving.

From the 2026-02-19 snapshot's README.md:

> Asolaria is a single local control plane for:
> - Asolaria-native Skills (declarative, auditable runbooks under `Asolaria/skills`)
> - Fast intent routing + async jobs (non-blocking UI)
> - Persistent conversation memory (disk-backed)
> - Smart approval automation (`p` / `a` / `y` / `no`)

(four of its nine list items). From its PUBLIC_DEPLOYMENT.md: "This project should run as two separate runtime
instances", one of them "`Public Asolaria` (sanitized): no private credentials, no private automation, no
PHI/PII." From its PUBLIC_RELEASE_NOTES.md, "Security posture":

> - This package is generated from allowlisted source paths only.
> - Runtime/private data folders are excluded.
> - Vault files, token files, PID/log/temp artifacts are excluded.
> - Leak scan is executed before release completion.

## Date range

- Builds: 2026-02-18T19:23:22-03:00 (testbuild3) to 2026-03-13T10:58:33-03:00 (20260313-105820), from the
  `Generated:` line of each snapshot's PUBLIC_RELEASE_NOTES.md.
- File times: the zip entry times go back to 2026-02-07T17:53:06 (src/connectors/padConnector.js in
  testbuild3zip.zip; DOS time, local clock, no zone). src/connectors/openclawConnector.js (blob 21f9cc20, in all
  ten trees) carries 2026-02-08T01:23:12 in the same zip.
- Commits: the ten trees were first committed 2026-03-15T15:20:53-03:00 (e8c3369); src/connectors/workerRouter.js
  (3de03718) and src/connectors/systemPaths.js (3e3e11d1) were already committed at b49a725, 2026-03-15T14:41:02;
  src/constructionToolIndex.js on 2026-03-16T21:44:23-03:00 (0a48498).
- Against the map: the gap map names the 2026-02-19 19:15 zip (72ac9125) as the earliest artifact. The five test
  builds under dist/public-release-test3/ carry `Generated:` 2026-02-18T19:23:22 to 19:39:39 -03:00, the day before.
  72ac9125 is the earliest of the 2026-02-19 builds (`Generated: 2026-02-19T19:15:18.4466425-03:00`, 33 s before
  the 191542 build).

## The snapshots

| snapshot (path under dist/) | Generated (-03:00) | files vendored | bytes | held | release zip |
|---|---|---:|---:|---:|---|
| public-release-test3/Asolaria-Public-testbuild3 | 2026-02-18 19:23:22 | 117 | 1057343 | 4 | none in the mirror |
| public-release-test3/Asolaria-Public-testbuild3zip | 2026-02-18 19:24:20 | 117 | 1057754 | 4 | 04d84335 |
| public-release-test3/Asolaria-Public-testbuild4 | 2026-02-18 19:32:20 | 119 | 1082791 | 4 | none in the mirror |
| public-release-test3/Asolaria-Public-testbuild5 | 2026-02-18 19:37:15 | 121 | 1103088 | 4 | none in the mirror |
| public-release-test3/Asolaria-Public-testbuild6 | 2026-02-18 19:39:39 | 124 | 1108443 | 4 | none in the mirror |
| (zip only) Asolaria-Public-20260219-191509 | 2026-02-19 19:15:18 | 0 | 0 | | 72ac9125 |
| private-phone-release/Asolaria-Public-20260219-191542 | 2026-02-19 19:15:51 | 138 | 1333752 | 4 | 12c97dac |
| private-phone-release/Asolaria-Public-20260222-164348 | 2026-02-22 16:44:03 | 187 | 1907754 | 3 | 858221c8 |
| private-phone-release/Asolaria-Public-20260225-135740 | 2026-02-25 13:58:16 | 201 | 2038457 | 3 | b2fa9821 |
| public-release/Asolaria-Public-20260227-verify1 | 2026-02-27 15:00:09 | 216 | 2835683 | 3 | 24bb40bc |
| public-release/Asolaria-Public-20260313-105820 | 2026-03-13 10:58:33 | 399 | 5286689 | 5 | 8c1e6533 |

Each tree is kept whole, less its held files, so a file that did not change between builds is stored in every snapshot it belongs
to (git stores each blob once). The ten trees hold 1,739 files; with the six extras below, 1,745 files and
18,852,197 bytes, made of 621 distinct blobs and 9,550,638 distinct bytes. PROVENANCE.md gives, for each
snapshot, the paths added, changed and unchanged against the build before it (no build removed a path).

The three private-phone-release trees sit, with the same tree ids, at dist/private-phone-release/ and at
archives/worktree-aa4d287c-20260307/private-phone-release/; the copies under dist/ at e8c3369 are the pinned ones.
The 20260219-191509 build exists in the mirror only as its zip: 140 of its 142 files match the 191542 tree
(134 byte-identical, 6 differing only in CRLF), and its PUBLIC_RELEASE_NOTES.md and
tools/Refresh-Asolaria-PhoneDeployment.ps1 have no committed blob (pinned by member blob in PROVENANCE).

### What the parts are, as files change from build to build

Blob (first 8) and bytes; an arrow marks the first build that carries a new version.

| file | versions |
|---|---|
| src/gateway/server.js | testbuild3 7a8fa277 15011 -> testbuild4 b1ec31f6 20215 -> testbuild5 aa287dec 24771 -> 20260219 fed9a798 47232 -> 20260313 ba520ea1 47282 |
| src/gateway/toolAuthority.js | testbuild4 40255693 16732 -> testbuild5 0a01900b 17639 -> 20260313 41102f44 22716 |
| src/gateway/authorityMode.js | testbuild5 069025d1 13101 (unchanged to 20260313) |
| config/asolaria.gateway.json | testbuild3 729b5a65 1276 -> testbuild4 4105b81b 1587 -> testbuild5 fd3052ca 1973 -> 20260219 329b562a 2470 -> 20260313 5630038d 2403 |
| src/riskEngine.js | testbuild3 b745570e 5824 -> 20260222 5fa85cc6 6139 -> 20260225 c4a3bfb0 6285 -> 20260313 4c9ec07e 6501 |
| src/approvalEngine.js | testbuild3 086e6e03 7650 -> 20260219 7f26d6a4 7738 |
| src/guardianApprovalStore.js | testbuild3 45eabc2c 7851 -> 20260313 3b62a568 10905 |
| src/guardianNotifier.js | testbuild3 4590e09d 17928 -> 20260222 4b3c6311 23246 -> verify1 6e3fa75f 26061 -> 20260313 8bb68fd2 26053 |
| src/guardianStore.js | testbuild3 740f206a 12008 -> verify1 c506c889 13259 -> 20260313 9d531ce5 13959 |
| src/secureVault.js | testbuild3 07d6df57 12359 (unchanged to 20260313) |
| infra/vault/vault.hcl | testbuild6 b546ff92 196 |
| src/intentRouter.js | testbuild3 70f5d3a0 27742 -> 20260219 12924956 31494 -> 20260222 c6256550 35955 -> 20260225 f5b4c092 38519 -> 20260313 97ac4ad7 40201 |
| src/brainOrchestrator.js | testbuild3 0721df38 8640 -> 20260219 9542968e 8806 -> 20260222 7a91eb5b 11313 -> 20260225 417439f1 11928 -> 20260313 20829fb9 23681 |
| src/brainPolicy.js | testbuild3 dc2fc151 3443 -> 20260225 0be1aa2b 3671 |
| src/memoryStore.js | testbuild3 f3fe9d04 7834 -> 20260222 42f5e188 24371 -> 20260313 26998ca0 29023 |
| services/memory-indexer/server.js | 20260219 5047516c 5298 -> 20260313 b80b3bad 5608 |
| src/skillRunner.js | testbuild3 9542a634 13198 -> 20260222 76b9c0ba 28778 -> 20260313 49259768 40258 |
| src/taskLedgerStore.js | testbuild3 0ffa706c 22637 -> 20260222 5b5ee155 26133 -> 20260313 0f6e45ad 29671 |
| src/notebookStore.js | testbuild3 40084bf7 22381 -> 20260222 931f76b8 23351 -> 20260313 2941afc3 33134 |
| src/skillsToolsIndexStore.js | 20260222 9b05966d 4040 -> 20260313 11c6b71f 7264 -> src/ at e8c3369 2200c4a9 9536 (extra, below) |
| src/constructionToolIndex.js | src/ at 0a48498 77bf5bf0 11774 (extra, below) |
| docs/HANDOVER_ROADMAP.md | testbuild3 150f62fa 2548 -> testbuild4 90b0bda8 -> testbuild5 1b0a4a5f -> testbuild6 c53db214 -> 20260219 a2ad871e 3026 |
| docs/GATEWAY_TOOL_AUTHORITY.md | testbuild4 9b15f99b 2086 -> testbuild5 9826c67b -> 20260219 a5770c2a 3466 |
| docs/AUTHORITY_MODES.md | testbuild5 3e564f2e 958 -> 20260219 ff91210d 1966 |
| docs/GATEWAY_AUDIT_LOG.md | 20260219 341cd7cf 2988 |
| docs/VAULT_APPROLE_RUNBOOK.md | testbuild6 0644a39d 1113 |

src/riskEngine.js b745570e has `scoreToLevel` at lines 17-20 (`score >= 9` critical, `>= 6` high, `>= 3` medium)
and `actionRiskScore` at line 24. The 20260313 version 4c9ec07e is the blob first committed at src/riskEngine.js
in e8c3369.

## The 2026-02-19 benchmark and the index stores (vendored beside the trees)

| vendored path | source | blob | bytes |
|---|---|---|---:|
| vendor/Asolaria/reports/mcp_webmcp_audit_2026-02-19.md | Asolaria@e8c3369 | bb2842c6 | 13727 |
| vendor/Asolaria/reports/mcp_token_measurements_2026-02-19.json | Asolaria@e8c3369 | ab61a2bd | 835 |
| vendor/Asolaria/reports/mcp-webmcp-token-efficiency-realworld-20260308-124614Z.json | Asolaria@e8c3369 | 08b511d0 | 2788 |
| vendor/Asolaria/reports/mcp-webmcp-token-efficiency-realworld-20260308-124614Z.md | Asolaria@e8c3369 | eca8a8c0 | 1783 |
| vendor/Asolaria/src/skillsToolsIndexStore.js | Asolaria@e8c3369 | 2200c4a9 | 9536 |
| vendor/Asolaria/src/constructionToolIndex.js | Asolaria@0a48498 | 77bf5bf0 | 11774 |

reports/mcp_webmcp_audit_2026-02-19.md, line 172, row C:

> | C: follow-up with `previous_response_id` (no re-send tool block) | 155 | 155 | 38.75 | 42 | 5,340 tokens (99.22%) |

In the measurement file the three rows are 5,382 (A, 50 inline function tools), 82 (B, one MCP pointer with an
allow-list of 5) and 42 (C) actual tokens; as exact integers, C saves 5,340 of 5,382 tokens. The 2026-03-08 pair
is headed `Generated: 2026-03-08T12:46:14.537590+00:00` and measures seven request shapes (inline tools, MCP
pointers, skill run by id, skill catalog by ids, and their inlined forms).

docs/claude-project/AGENTS.md (blob ed1149a3, first committed 2026-04-11 at fbcb630; pinned, not vendored) holds
the section at lines 314-318:

> ### Pattern: MCP Token Indexing (99.22% Reduction)
> - **What:** Skills/tools/mistakes/projects index table — LLM loads index numbers instead of full tool schemas
> - **Benchmark:** 50 inline tools = 5,382 tokens → 1 MCP pointer = 82 tokens → follow-up = 42 tokens

Its line 317 names `externalBrainConnector.js` as the implementation; src/connectors/externalBrainConnector.js is
in all ten trees (four blobs: defebbd8, 88e8781d, 20e8b4c1, e602e29b). src/skillsToolsIndexStore.js first appears
in the 20260222 build.

## What is held, and why

HELD.hbp lists each by blob, bytes and sha256. None of these files is vendored.

- tools/cloudflared.exe, fbeabbe1, 5,838,997 B, in testbuild3, testbuild3zip, testbuild4, testbuild5, testbuild6
  and 20260219-191542: a third-party binary.
- tools/.cache/DesktopInputNative.dll, 13aff2f4, 4,096 B, in all ten trees: a DLL (the step excludes any
  exe, dll or cer).
- public/asolaria-local.cer and public/asolaria-local.crt, one blob d7a0ed41, 779 B, in all ten trees: a DER
  certificate (subject and issuer `CN = Asolaria Local CA`, valid 2026-02-11 to 2029-02-11); the .crt has the same
  bytes as the .cer and is held with it.
- tools/__pycache__/Run-AdminTerminalSidecar.cpython-313.pyc (97427719, 14,946 B) and
  tools/__pycache__/caption_ocr_bridge.cpython-313.pyc (71e62ed6, 17,981 B), in 20260313-105820: compiled bytecode of
  the two .py files vendored beside them; aether's root .gitignore (line 1, `__pycache__/`) would leave them out of a
  commit, so they are pinned by blob and sha256 instead.
- The seven release zips and their copies under tmp/docs/phone-downloads/ and tmp/docs/whatsapp-rayssa/: pinned by
  blob and sha256, not vendored. The 20260313 zip copy sits under a tmp/docs/whatsapp-* path, which the owner's
  rules hold.

Read before vendoring, and vendored: every config/*.json version (asolaria.gateway.json names a token file,
`data/vault/owner/gateway/gateway.token.txt`, and holds no token value; public-release.manifest.json),
infra/vault/vault.hcl (local file storage, 127.0.0.1:8200), services/*/*.json, LEAK_SCAN_REPORT.json (an empty
list, blob b76e44e1, in all ten trees) and the credential-handling tools (they prompt for or read secrets at run
time; their default password and token parameters are empty strings). The scan over all 1,745 files for
gh?_ / github_pat_ / sk- / AIza / hf_ / xox / Bearer / BEGIN PRIVATE KEY / password= / "token": found only
validators, redaction patterns and placeholders (`xoxb-...`, `<your-api-key>`, `+1555...`, `example.trycloudflare.com`).

For the owner's review (vendored as written): some files carry the owner's own e-mail addresses and local paths,
and some carry first names of people other than the five authorized operators, as UI labels, example host
labels or example paths, with no contact details, messages or records: public/oli-john-ops.html,
public/oli-john-ops.js, tools/swarm-jobs/rook-ops-packet.ps1, tools/Test-UpgradeBlockerPreflight.ps1,
PUBLIC_DEPLOYMENT.md, README.md and tools/Friend-Codex-Bootstrap-TaskPacket.template.md, in the snapshots
that carry them.

## What is not public, or not in these trees

- What the owner's release builder left out (config/public-release.manifest.json): paths containing `\data\`,
  `\logs\`, `\captures\`, `\inbox\`, `\private\`, `\certs\`, `\tmp-http_ece\`, `\node_modules\`, `\.git\`,
  `\reports\`, and files like `*.pid`, `*.log`, `*.tmp`, `*.token`, `*.token.txt`, `*vault.master.key`,
  `*vault.secrets.json`, `PHONE-URLS.md`, `TASKS.md`, `bridge-token*.txt`, `*-tunnel-url.txt`.
- The root server.js: package.json line 6 names `"main": "server.js"`, and the benchmark cites
  `Asolaria/server.js:10163`, but the manifest's `includeFiles` does not list server.js and no snapshot tree
  carries one. Its earliest form in the mirror is server.js 914ea779 (1,197,968 B) at b49a725, 2026-03-15 (step 4).
- src/secretHardening.js: not in these ten trees; first in the mirror at src/secretHardening.js in e8c3369,
  2026-03-15 (step 4).
- Two zip members are not in any committed tree: tools/tmp-read-chat-report.js (936215bf, 881 B, in the 02-22,
  02-25, 02-27 and 03-13 zips) and tools/tmp-live-control-sweep.js (c9048e66, 8,825 B, in the 03-13 zip). They
  stay inside the pinned zips.
- The ~2025-10 start "stripped from OpenClaw codebase": no file of that period was found in these ten trees or
  the seven zips; the earliest file time in them is 2026-02-07T17:53:06. (The gap map reports no artifact of that
  period in any repo it searched.)
