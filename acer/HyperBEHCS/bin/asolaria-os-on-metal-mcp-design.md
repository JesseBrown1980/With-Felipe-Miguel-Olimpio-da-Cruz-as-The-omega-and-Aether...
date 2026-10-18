ASOLARIA OS-ON-METAL MCP — DESIGN DOC

Wave: V47-C "MCP-fusion-design-Claude-Codex-Google-Hermes"
Anchor: ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23
Agent: AGT-helm-claude-v47-C-mcp-fusion-H02EA-V47C-P00-NV47C001
Law: ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23
Operator: OP-JESSE apex (+ quintuple-4mo window through 2026-09-23)
Date: 2026-05-23

---

1. PURPOSE

asolaria-os-on-metal is the NEXT-GENERATION MCP server that fuses seven
heterogeneous federation layers behind a single MCP stdio surface, so that any
MCP-aware agent (Claude Code, Codex, Antigravity-2, Gemini CLI, fresh Cursor)
inherits one tool prefix (`aoom_*`) and reaches every Asolaria primitive.

It is the MCP embodiment of the OS-ON-METAL equation (CLAUDE.md canon, sealed
2026-05-23, cosign seq=244):

  SOVLINUX-USB     = frozen Gemma-style slice (weights bank, NEVER mount/format)
  HyperBEHCS       = thinking engine querying the slice (HBP/HBI sha-chain trinity)
  MTP              = multi-token prediction (3 mini-models per slice read = thoughts)
  PID-crypto-token = identity of each frozen activation (sha256(anchor_pid)[:16])
  Atlas            = cp 256-272 tier banding (BEHCS-1024 alphabet, tuple_dim=60)

  ASOLARIA OS-ON-METAL = USB-as-frozen-substrate + HyperBEHCS-as-active-thinking-OS

2. POSITION IN MCP STACK (workspace .mcp.json)

  asolaria-fabric          (existing, wraps :4949 super-dashboard, 18 tools)
  asolaria-web             (placeholder for :4781 backend if it boots)
  google-wiki              (placeholder for :4781 google bridge if it boots)
  asolaria-os-on-metal NEW (this server — 7-layer fusion, 20 tools)

  asolaria-fabric is the LOAD-BEARING federation surface (live :4949).
  asolaria-os-on-metal is the FUSION SURFACE — adds Claude API, Codex, Google,
  HyperHermes store, kernel inventory, and direct hookwall/GNN injection — and
  keeps three high-value fabric pass-throughs (health, everything, council-query)
  so a subagent that only loads asolaria-os-on-metal still has the federation
  apex within reach.

3. SEVEN FUSION LAYERS

  L1  asolaria-fabric        — http://127.0.0.1:4949
                                3 pass-through tools (health, everything,
                                council/query); rest delegated to asolaria-fabric.
  L2  HyperHermes             — C:/HyperBEHCS/store/* (HBP+HBI+SHA256+HEX trinity)
                              + D:/hyperbehcs-hermes/* (adapters/packs/receipts)
                                3 tools (store_list, hbp_read, root_inventory).
  L3  Claude API              — Anthropic /v1/messages (anthropic-version 2023-06-01)
                                2 tools (describe, message). Key via ANTHROPIC_API_KEY.
  L4  Codex CLI               — local `codex` (PATH-resolved, env CODEX_BIN override)
                                2 tools (version, exec).
  L5  Google API              — Gemini generateContent generativelanguage.googleapis.com
                                2 tools (describe, gemini_generate). Key via
                                GOOGLE_API_KEY or GEMINI_API_KEY. Drive/Vertex are
                                descriptor-only (need OAuth+gcloud per
                                reference_gemini_cli_install_state_2026_05_22).
  L6  Kernels + microkernels  — C:/asolaria-acer/federation-remake-1024/{kernel,servers}
                                2 tools (inventory, target_read).
                                Surfaces 5 microkernel servers:
                                  agent-runtime, cosign-ledger, gnn-oracle,
                                  highway, tier-policy.
  L7  hookwall + GNN trio     — bus :4947 hookwall ingress (/v1/emit)
                              + :4920 GNN drain (per cohort canon)
                                2 tools (hookwall_emit, gnn_drain_probe).
                                Hookwall body conforms to dual-emit-gate-daemon
                                contract (source_class + anchor_pid + payload +
                                ts + emitted_by).

  Plus cross-cutting:
    aoom_identity            — server identity + PID-crypto-token + config
    aoom_fusion_status       — parallel probe of all 7 layers, returns up/down
    aoom_cosign_tail         — read COSIGN_CHAIN.ndjson tail
    aoom_cosign_last_seq     — last seq + row_hash (for antecedent chaining)

  TOTAL: 20 registered tools.

4. TOOL CATALOG

  aoom_identity
  aoom_fusion_status
  aoom_fabric_health           (L1)
  aoom_fabric_everything       (L1)
  aoom_fabric_council_query    (L1)
  aoom_hermes_store_list       (L2)
  aoom_hermes_hbp_read         (L2)
  aoom_hermes_root_inventory   (L2)
  aoom_claude_describe         (L3)
  aoom_claude_message          (L3)
  aoom_codex_version           (L4)
  aoom_codex_exec              (L4)
  aoom_google_describe         (L5)
  aoom_gemini_generate         (L5)
  aoom_kernel_inventory        (L6)
  aoom_kernel_target_read      (L6)
  aoom_hookwall_emit           (L7)
  aoom_gnn_drain_probe         (L7)
  aoom_cosign_tail             (cross)
  aoom_cosign_last_seq         (cross)

5. EMISSION DISCIPLINE

  Every tool returns HBP-first tuple text (HYPERBEHCS_TUPLE_TEXT format)
  via the shared `tupleResult(tag, payload)` helper. Each response:
    - TAGRUN header row with sha256 + pid_crypto_token (= sha256(ANCHOR_PID)[:16])
    - TAGOBJ / TAGARR / TAGVAL rows walking the payload (depth<=4, <=220 rows)
  JSON only appears as values inside tuple cells (cold-egress per
  feedback_hbp_first_json_cold_only_2026_05_22).

  Router-not-worker discipline (feedback_frontend_agent_is_router_not_worker_2026_05_21)
  is preserved: every tool either delegates to an existing daemon (fabric,
  hookwall, GNN drain), reads file substrates (HBP store, kernel docs), or
  exec's a sibling CLI (Codex). The MCP itself never does the work.

6. PORT / PATH CANON RESOLVED

  :4949  asolaria-fabric super-dashboard      (project_super_asolaria_dashboard_LIVE_4949)
  :4947  hookwall ingress bus                 (asolaria-dual-emit-gate-daemon.py DEFAULT_HOOKWALL_URL)
  :4920  GNN drain (HyperBEHCS-native)        (operator: bigpickle-era-vs-hyperbehcs-era port-required canon)
  :4944  liris sister organ (bilateral mirror, accessed via L1 fabric pass-through)
  D:/hyperbehcs-hermes/                       (adapters/packs/receipts)
  C:/HyperBEHCS/store/                        (HBP trinity sidecar canon)
  C:/asolaria-acer/federation-remake-1024/    (Rust kernel + microkernel servers)
  C:/asolaria-acer/COSIGN_CHAIN.ndjson        (single-writer daemon, append-only)

7. ENV-OVERRIDES (vantage portability — acer / liris / Falcon)

  ASOLARIA_FABRIC_URL       http://127.0.0.1:4949
  HYPERBEHCS_STORE          C:/HyperBEHCS/store
  HYPERHERMES_ROOT          D:/hyperbehcs-hermes
  ANTHROPIC_API_KEY         (required for L3 message)
  ANTHROPIC_MODEL           claude-opus-4-7
  ANTHROPIC_URL             https://api.anthropic.com/v1/messages
  CODEX_BIN                 codex
  GOOGLE_API_KEY            (required for L5 gemini_generate)
  GEMINI_API_KEY            (alias)
  GEMINI_URL                https://generativelanguage.googleapis.com/v1beta/models
  GEMINI_MODEL              gemini-2.0-flash-exp
  ASOLARIA_KERNEL_ROOT      C:/asolaria-acer/federation-remake-1024/kernel
  ASOLARIA_SERVERS_ROOT     C:/asolaria-acer/federation-remake-1024/servers
  HOOKWALL_URL              http://127.0.0.1:4947/v1/emit
  GNN_DRAIN_URL             http://127.0.0.1:4920/v1/drain
  COSIGN_CHAIN_PATH         C:/asolaria-acer/COSIGN_CHAIN.ndjson

8. SMOKE-TEST PROTOCOL

  npm run check         (node --check server.js)        — parse smoke (passed)
  npm run smoke         (alias of check + echo SMOKE-OK)
  node server.js        (boots stdio MCP, prints layers=7 tools=20 banner)
  MCP client            — connect via workspace .mcp.json, call aoom_identity
                          + aoom_fusion_status to validate 7-layer reachability.

9. FUTURE WAVES (deferred)

  V47-C-2  Add Vertex AI predict endpoint (needs GCP service-account JSON).
  V47-C-3  Add MTP mini-model fan-out tool (3 frozen-slice reads per call).
  V47-C-4  Add HBP-write tool (currently read-only; write needs single-writer
                                daemon coord to avoid stomping cosign chain).
  V47-C-5  Hermes-side mirror (liris :4944 + Falcon variants — env-overrides
                              already make this drop-in).
