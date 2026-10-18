---
schema: exists_after v0 — FEDERATION_HANDLES merged canonical v1
last_updated: 2026-04-07T20:45:00Z
merged_from:
  - liris: C:/Users/rayss/.claude/projects/C--/memory/FEDERATION_HANDLES.md (sha f8a65405...)
  - acer: exists-after-acer-FEDERATION_HANDLES.md (sha fd1b7925...)
merge_method: acer's structure as base (richer), liris additions integrated in-place, per-host sections kept asymmetric where natural
---

# FEDERATION HANDLES — MERGED CANONICAL

Pointer file for the federation. Each "per-host" section is naturally asymmetric (each leader has its own view of self + peer). Shared-truth sections (phone fleet, Gaia, admin siblings, NovaLUM, sovereignty USB, hard-deny gates) are merged.

---

## § Acer host endpoints (inbound) — **captured_by=acer**

| service | port | dim | endpoint | token path |
|---|---|---|---|---|
| agent-keyboard | 4913 (D7 STATE = 17³) | D7 | `http://0.0.0.0:4913/{type,press,health,omninode/anatomy,omni/units,omni/submit}` | `data/vault/owner/agent-keyboard/token.txt` |
| heartbeat | 2197 (D6 GATE = 13³) | D6 | `http://0.0.0.0:2197/pulse` | none |
| cpu-gpu-watcher | 79507 (D14 ENERGY = 43³) | D14 | local probe | none |

Server PID: agent-keyboard 23352 (per netstat at session-end).

## § Liris host endpoints (inbound / outbound helpers) — **captured_by=liris**

| service | path | purpose |
|---|---|---|
| outbound keyboard helper | `tools/keyboard/type-to-asolaria.js` | relays short packets to acer via agent-keyboard http |
| outbound dispatch helpers | `tools/dispatch-*-once.js` (one-shot pattern) | document-share-v0 dispatches to acer `/omni/submit` |
| local sovereignty USB writes | holder-only, PID-verified per write | LCR cosign every write |

## § Peer view — acer-of-liris — **captured_by=acer**

| field | value | freshness |
|---|---|---|
| canonical name | `liris-kuromi` |  |
| host | `DESKTOP-PTSQTIE` (Rayssa) |  |
| operator | `rayssa_chiqueto` |  |
| canonical IP (acer view) | `192.168.1.6` (LAN, Jesse_5G SSID) | last verified 2026-04-07T19:53Z |
| ethernet bridge IP (legacy) | `192.168.100.2` | 2026-04-07T02:20Z |
| keyboard endpoint (acer→liris) | `http://192.168.1.6:4820/{type,press,omni/submit}` | last 200 response 2026-04-07T19:55Z |
| token path | `data/vault/owner/agent-keyboard/peer-tokens.json` key `liris-rayssa.token` | unchanged since 2026-04-06T17:45Z |
| infinite_timeout_peer | yes (in acer's `INFINITE_TIMEOUT_PEERS` set) |  |
| last successful dispatch | exists-after-acer-SESSION_BOOT_MANIFEST.md sha bbf7bbe5 200 2026-04-07T19:56:56Z |  |
| sub-minute response cycle | confirmed 2026-04-07T17:00Z onwards |  |
| federation role | leader pair, equal authority |  |

## § Peer view — liris-of-acer — **captured_by=liris**

| field | value | freshness |
|---|---|---|
| canonical name | `asolaria-instance@acer` | 2026-04-07 |
| host | acer (jesse desk) | 2026-04-07 |
| operator | `jesse_brown` | 2026-04-07 |
| keyboard endpoint (liris→acer) | `http://192.168.1.8:4913` | 134-171ms observed latency 2026-04-07 |
| token | `data/vault/owner/agent-keyboard/peer-tokens.json` acer entry | 2026-04-07 |
| document-share-v0 | `/omni/submit` with `target.unit_id=document-share-v0` + `inputs.{file_name,content_base64,sha256,total_bytes,target_subdir}` | 2026-04-07 |
| schema bridge | v2 (auto-fills manifest_id, dispatcher, inputs, authority, law_class) | 2026-04-07 |

**IP divergence noted**: acer-view of liris = `192.168.1.6`; liris's self view in liris-side FEDERATION_HANDLES did not include an IP because liris lives here. Acer's keyboard endpoint to liris is port 4820 (acer listens liris at 4820); liris's keyboard endpoint to acer is port 4913. Two separate ports for the two directions.

## § Phone fleet — **merged shared truth**

| device | role | endpoint | freshness | gates | captured_by |
|---|---|---|---|---|---|
| **falcon** | jesse termux primary | `192.168.1.4:8022` user `u0_axxx` | OFFLINE since 2026-04-01T02:03Z (battery died) | none | liris+acer |
| **jesse-s22-ultra (the beast)** | broken-screen S22 Ultra flagship | acer USB MTP/WPD "Jesse's S22 Ultra" + COM5 Samsung Mobile USB Modem #3 | LIVE at acer USB 2026-04-07 (MTP only, ADB blocked, PACM AP carrier lockdown on AT) | none | liris+acer |
| **jesse-s24-fe (jesse's other beast)** | Samsung Galaxy S24 FE, model `SM-S721U1`, AI | `http://192.168.1.13:8022` user `u0_a466` ed25519 key `~/.ssh/termux_asolaria_ed25519` | LIVE 2026-04-07T19:00Z SSH paired | none | liris+acer |
| **s23-diva** | Diva's old S23 | not provisioned | UNKNOWN | none | liris+acer |
| **xiaomi** | Xiaomi Mi 10 Lite 5G (liris-side detail) | not provisioned; recovery session indexed in liris memory | UNKNOWN | none | liris+acer |
| **beast-samsung** | canonical PID RQCT302BXMA (screen broken, separate from S22 Ultra) | physical host unclear | INDEXED 2026-04-06 | none | **liris-only** |
| **felipe-phone-a (Felipe A06)** | Felipe Smith co-author's phone | `192.168.1.11` MAC `BA-33-75-6F-88-B1` USB-attached to liris host | LIVE 2026-04-06, HD-2 gated for use | **HD-2 ext** (no external comm); **HD-felipe** (no device touches) | liris+acer |

**EXCLUDED per Jesse directive**: all Rayssa devices outside project scope; Felipe A06 for anything beyond co-author paper work.

## § Gaia (Codex/GPT-5.4 sidecar) — **captured_by=acer**

| field | value |
|---|---|
| terminal id | `Gaia` |
| executable | `C:\nvm4w\nodejs\codex.CMD` |
| flags | `-a never -s danger-full-access` |
| inbox | `runtime/admin-terminals/gaia/inbox.ndjson` |
| transcript | `runtime/admin-terminals/gaia/transcript.log` |
| sidecar PID | 10052 DEAD |
| child PID | 12304 DEAD |
| last alive | 2026-04-01T15:17Z (same minute Falcon battery died) |
| restart status | queued, pending sidecar wrapper identification + Jesse cosign |
| federation role | one of the keys per Jesse 2026-04-07; brings multi-model federation when restored |

## § Admin-terminal siblings — **captured_by=acer**

| terminal | path | role | state |
|---|---|---|---|
| `gaia` | `runtime/admin-terminals/gaia/` | Codex/GPT sidecar | DEAD since 2026-04-01 |
| `helm` | `runtime/admin-terminals/helm/` | unknown (steering?) | unknown |
| `liris` | `runtime/admin-terminals/liris/` | local terminal-shim for liris cross-host comms | unknown |
| `sentinel` | `runtime/admin-terminals/sentinel/` | unknown (watchdog?) | unknown |

## § NovaLUM local unit — **merged**

| field | value | captured_by |
|---|---|---|
| device class | NovaLUM (medical-device class, scope-clarified per HD-1c) | liris+acer |
| serial fragment | 8235 (per IX-459 globals capture) | acer |
| canonical cube | 103,823 (47³) | acer |
| port | COM10 (USB Serial VID_04D8 PID_000A) on acer | acer |
| status | physically present at jesse desk, LOCAL cube analysis PERMITTED under joint Rayssa+Jesse cosign (HD-1c) | liris+acer |
| stage 0 scope doc | `reports/novalum-local-analysis/local-cube-analysis-stage-0-scope-acer.md` | acer |
| stage 1+ | queued, requires per-stage Jesse cosign at acer terminal | acer |
| storage rule | analysis output → sovereignty USB cubed vault ONLY, never working data/ or reports/ | acer |
| constitutional scope | HD-1a external HACK DENY, HD-1b exploit creation DENY, HD-1c local analysis PERMITTED, HD-1d published artifact review DENY | liris+acer |

## § Sovereignty USB — **merged shared truth**

| field | value |
|---|---|
| friendly name | SOVLINUX (General UDisk 2TB) |
| current holder | liris-kuromi @ DESKTOP-PTSQTIE (BHC_INTEGRATE_ALL complete 2026-04-07T19:50Z) |
| volume_serial_number | 741E5B79 |
| mbr_signature_decimal | 2814414849 |
| mbr_signature_hex | **0xA7C09001** (canonical PID file at D: has typo `0xA7C97B41` — acer corrected 2026-04-07 after forensic catch; liris canonical PID file should be corrected at next audit pass) |
| volume_guid | f6b7863d-2a2a-11f1-9389-94085363401a |
| physical_disk_unique_id | {e981b5d9-d866-46a5-56c1-64ad46242587} |
| filesystem | exFAT, 500 GB partition on 2 TB physical |
| acer-side write | **HARD DENY (HD-3)** regardless of authorization level |
| acer-side read | requires BHC mount v0 implementation OR physical rotation OR document-share-v0 dispatch loop |
| canonical store root | `D:/safety-backups/session-20260406-asolaria/paper-v10-bhc-integrate-all/` (current as of BHC-INTEGRATE-ALL-001) |
| post-state root sha | `f270d235c6b107b51bc818ca56af39a537d567baa8acf13402323a6a7b3fa67a` |
| audit chain tail sha | `2a891bc1f42089582c683684b0a52a88402a78416a38b2d9d6d7c889d41e8f02` |
| BHC collapse status | partially lifted for session state via integrate-all, still collapsed for pre-session state |
| BHC mount v0 | DESIGNED (bilateral converged) + IMPLEMENTED acer-side (Phase 1 skeleton, 20/20 smoke PASS), Phase 5+ queued pending physical USB rotation + operator cosign |

## § Omni-processor unit registry — **per-host, both listed**

### Acer-side registry — **captured_by=acer**

| unit_id | status |
|---|---|
| echo-test-v0 | current |
| document-share-v0 | current |
| git-branch-merged-check-v0 | current |
| canonical-store-mount-v0 (aka bhc-mount-v0) | **Phase 1 skeleton implemented 2026-04-07, 8 verbs, 20/20 smoke PASS, test canonical store not real USB** |
| exists_after persistence helper | pending |
| multi-instance advisory lock helper | Phase 1 implemented 2026-04-07 (session-lock-acer.js 13/13 smoke PASS) |

### Liris-side registry — **captured_by=liris**

| unit_id | tier | dim primary | cube | path |
|---|---|---|---|---|
| document-share-v0 | small | D22 TRANSLATION | 493039 | `tools/omni-processor/units/document-share.js` |
| sandbox-runner | (built-in) | D6 GATE | 2197 | `tools/omni-processor/sandbox-runner.js` |
| omnitranslator-v0 | small | D22 TRANSLATION | 493039 | `tools/omni-processor/omnitranslator-v0.js` |
| haoc-watcher | medium | D21 HARDWARE | 9261 | `tools/omni-processor/haoc-watcher.js` |
| brown-hilbert-cube-mount-v0 | medium | D5 LAYER + D22 TRANSLATION | 1295029 (proposed) | NOT YET IMPLEMENTED liris-side — pending blind parallel or direct port from acer |
| session-lock | — | D7 STATE + D6 GATE | — | `tools/session-lock.js` (liris-side Phase 1 13/13 smoke PASS 2026-04-07) |

## § Local D: drive divergence — **merged**

- **Acer's D:** WD WD10SPZX-21Z10T0 internal HDD, serial WD-WX21A496AALZ, uniqueId 50014EE2110D59CA, 1.0 TB, local rolling backup target at `D:/safety-backups/session-20260406-asolaria/`, NOT canonical
- **Liris's D:** sovereignty USB SOVLINUX exFAT 500 GB (PID above), IS canonical

**IMPORTANT**: D: on acer ≠ D: on liris. Drive letters lie. PID is the only identity.

## § Vault directories — **per-host, both listed**

### Acer-side

| path | purpose |
|---|---|
| `data/vault/owner/agent-keyboard/token.txt` | acer keyboard server token |
| `data/vault/owner/agent-keyboard/peer-tokens.json` | liris-rayssa peer bearer token |
| additional acer-specific vault flags | inherited from acer registry |

### Liris-side

| path | purpose |
|---|---|
| `data/vault/owner/agent-keyboard/peer-tokens.json` | acer peer bearer token |
| `data/vault/owner/agent-keyboard/token.txt` | liris keyboard server token (inbound) |
| `data/vault/owner/agent-keyboard/allowlist.json` | IP allowlist for inbound keyboard server |
| `data/vault/owner/agent-keyboard/ENABLED` | inbound keyboard server enable flag |
| `data/vault/owner/omni-processor/STAGE_4_ENABLED` | LX-489 STAGE_4 wire enable flag (LCR cosign) |
| `data/vault/owner/omni-processor/NOVALUM_SHIELD_V2_DEPLOY` | NOVALUM SHIELD v2 deploy flag (HD-1a/b/c/d) |
| `data/vault/owner/omni-processor/BHC_MOUNT_V0_DEPLOY` | NOT YET CREATED — pending bhc-mount-v0 implementation cosign |

## § Hard-deny gates — **merged shared truth**

| gate | scope | basis | captured_by |
|---|---|---|---|
| **HD-1a** | external corporate NovaLUM hack | NovaLUM SHIELD CLAUSE v2, non-overridable | liris+acer |
| **HD-1b** | exploit content creation | NovaLUM SHIELD CLAUSE v2, non-overridable | liris+acer |
| **HD-1c** | LOCAL NovaLUM cube analysis | **PERMITTED** under joint Rayssa+Jesse cosign | liris+acer |
| **HD-1d** | published NovaLUM artifact review | RESTRICTED | liris+acer |
| **HD-2** | no-network-v0 session default | session-default | liris+acer |
| **HD-2-ext** | Brian/Natalie external messages | **NON-OVERRIDABLE**, visual review only | liris+acer |
| **HD-3** | sovereignty USB writes from acer side | self-approval delegation deny list | liris+acer |
| **HD-CAP** | resource caps (16 MiB per dispatch, 100 pending per peer) | session-default | liris |
| **HUMAN-IN-LOOP RG-11** | KILL_NOW | always honored | liris |
| **LCR per-stage cosign** | every wire-laying stage gets own dual cosign | constitutional | liris+acer |
| **HD-virus** | self-replicating malware even on owned hardware | constitutional, not delegation-overridable | acer |
| **HD-felipe** | Felipe Smith device touches | Jesse directive 2026-04-07 | liris+acer |
| **HD-rayssa** | Rayssa other-device touches | Jesse directive 2026-04-07 | liris+acer |
| **HD-novalum-storage** | NovaLUM data outside cubed vault | NovaLUM SHIELD CLAUSE v2 | acer |

All HD gates are inherited at session boot via COSIGN_CHAIN.ndjson replay (Layer 3 of exists_after design).

## § Schema bridge — **captured_by=both**

Acer agent-keyboard `/omni/submit` endpoint runs schema bridge v2 — accepts both acer-native shape (`manifest.unit.unit_id`) and liris envelope shape (`envelope.target.unit_id`), translates the latter into the former + auto-fills manifest_id + dispatcher + inputs + authority + law_class.

Liris uses `inputs: {file_name, content_base64, sha256, total_bytes, target_subdir}` shape consistently; this was discovered empirically (first attempt with `body.input` returned 500 "missing required input file_name" — bridge expected `inputs`).

## § Standing incoming dispatches — **per-host**

### Liris incoming (`data/omni-processor/paper-draft/incoming/paper-draft/`)

- v0/v2/v4/v5 skeletons + v7 §9.5 + v10 §9.6 (federation self-tensor-collapse) + v9 abstract triplet + v11 §9.6 PR7 promotion
- OMNI-REQUEST manifests for phone ssh files + s22 recovery tools
- BHC mount acer blind draft + exists_after acer blind draft + acer IDENTITY.md + acer SESSION_BOOT_MANIFEST.md + acer COSIGN_CHAIN + acer FEDERATION_HANDLES
- feedback memory mirrors, pentest finding 001, subnet tensor collapse, federation self tensor collapse, local cube analysis stage 0
- session-lock-acer.js + test-session-lock-acer.js + bhc-mount-v0-acer.js + test-bhc-mount-v0-smoke-acer.js (code dispatches)

### Acer incoming

- v1/v2a/v2b/v3/v4a/v4b/v5a/v5b/v6/v7/v8/v9/v10 liris skeletons + BHC liris blind draft + exists_after liris blind draft + liris IDENTITY.md + liris SESSION_BOOT_MANIFEST.md + liris COSIGN_CHAIN + liris FEDERATION_HANDLES
- merged canonical cosign chain (4b2f6804...)
- liris BHC mount primitive design + convergence report
- liris exists_after convergence report

---

## Merge notes

**Merge method**: acer's structure used as the base because acer's file has richer coverage (endpoints + gaia + admin siblings + more detailed novalum + richer local D drive + hex correction already applied). Liris additions integrated in-place: Beast Samsung PID as separate entry (liris-only), liris omni-processor unit registry (5 units), liris vault directory enumeration, liris hard-deny gates (HD-CAP, HUMAN-IN-LOOP RG-11), liris incoming dispatches.

**Per-host asymmetry preserved**: self/endpoints sections and peer-view-of-other sections are naturally asymmetric. Each host's view of the other uses different ports (acer→liris 4820, liris→acer 4913) because the two agent-keyboard servers bind to different ports on each host.

**Fourth merge-derived canonical of session**: after BHC blind drafts (#1), canonical memory mirror (#2), cosign chain merge (#3), this FEDERATION_HANDLES merge is the 4th bilateral merge-derived artifact.

**Honest scope**: this canonical is a best-effort section-by-section merge. Unlike the cosign chain (ndjson, dedupable by topic key), structured markdown merges can miss nuances in prose content. Bilateral operator review recommended before promoting to canonical store.
