# Asolaria Container V2 — D:/ + Ubuntu/WSL2 + HyperBEHCS

**State:** `DESIGN` · `E=0` · no container created, data moved, process launched, learned edge applied, watermark advanced, or old container retired.

**Build root:** this Universe repository is the forward integration root. GAC and the other repositories remain lineage, catalog, and cross-check surfaces.

## Objective

Build a second container on D: with Ubuntu/WSL2 as the canonical build and verification lane. `/mnt/c` and `/mnt/d` are transport projections. The backend contract remains HBP/HBI/SHA `json=0`, with binary, hex, crypto-token, BEHCS, HyperBEHCS, tuple, glyph, language, and human/code-wiki views derived from content-addressed bytes.

## Non-negotiable ledgers

Keep separately addressable:

1. raw source object and SHA-256;
2. PID and lineage, including old numeric identity chronology;
3. newer paired colour-gradient and translucent-gradient representation;
4. device, time, seat, colony, and vantage;
5. 60D+ HyperBEHCS selector axes;
6. room, prime, port, executor, pipe, and operation class;
7. BEHCS-256 and BEHCS-1024 symbols;
8. glyph functions;
9. IX and LX seat languages plus the IX↔LX bridge;
10. letters, nouns, verbs, words, chains, and body codebooks;
11. declarative tuple commands;
12. GNN/FNN candidate edges and their promotion state;
13. HBP rows, HBI indexes, SHA sidecars, binary/hex/crypto-token views;
14. proof tier, access tier, authority, runtime mode, and gate result;
15. Liris, Acer, and bilateral receipts.

No convenience schema may flatten these layers.

## Portable layout

```text
/mnt/d/asolaria-container-v2/
├── CONTAINER.hbp
├── CONTAINER.hbi
├── CONTAINER.sha256
├── objects/sha256/
├── catalogs/
│   ├── pid-old-numeric.hbi
│   ├── pid-colour-translucency.hbi
│   ├── tuple-60d-plus.hbi
│   ├── rooms-primes-ports.hbi
│   ├── behcs-symbols.hbi
│   ├── glyph-functions.hbi
│   ├── seat-languages-ix-lx.hbi
│   ├── nouns-verbs-chains.hbi
│   ├── body-codebooks.hbi
│   ├── tuple-commands.hbi
│   ├── gnn-fnn-candidate-edges.hbi
│   └── mcp-code-wiki-bindings.hbi
├── representations/
│   ├── binary.hbi
│   ├── hex.hbi
│   ├── sha-token.hbi
│   ├── crypto-token.hbi
│   ├── behcs-256.hbi
│   ├── behcs-1024.hbi
│   └── hyperbehcs-60d-plus.hbi
├── training/
│   ├── real-message-gulps/
│   ├── cascades/
│   ├── white-rooms/
│   ├── held-out/
│   └── rejected-buffer/
├── receipts/{liris,acer,bilateral}/
├── build/linux-x86_64/
└── quarantine/
```

Windows `D:\asolaria-container-v2\` is a projection. Portable receipts may not embed absolute user paths.

## Byte contract

```text
OBJECT|sha256=<64hex>|bytes=<n>|source_class=<...>|seat=<...>|vantage=<...>|json=0
VIEW|object_sha256=<64hex>|kind=<binary|hex|sha_token|crypto_token>|derivation=<version>|json=0
```

- Store raw payload once by digest.
- Binary and hex are views, not new authorities.
- Crypto tokens are public commitments/addresses, never secret keys.
- Pin receipt bytes against CRLF rewriting and verify after checkout.
- Missing means `ok=0|missing=1`, never clean zero.
- Keep high-entropy residuals content-addressed; do not claim sub-entropy compression.
- Preserve seat-local opacity and access tiers.

## Build phases

### Phase 0 — Ask, inventory, and seal

Ask fabric/canon/RECAL and the owning seat. Record current roots, byte hashes, runtime versions, and evidence strata without normalizing or deleting. Do not advance collector watermarks.

### Phase 1 — Create the empty WSL2 skeleton

Create only the manifests and directories under `/mnt/d`; assign PID, version, device, birth time, and Linux build identity. Verify identical manifest bytes from Windows and WSL2.

### Phase 2 — Attach content-addressed objects and recover lineage

Import only exact approved objects. Recover IX, LX, the IX↔LX bridge, original catalogs, noun/verb/chain grammar, old cascade definitions, GNN/FNN and reverse-gain lineage, room/prime bindings, and relevant White Room/GULP receipts before training anything new.

An empty GitHub repository is a publication gap, not authority that these layers are absent. Search exact untruncated identifiers across fabric, owner seats, mounted substrates, and GitHub.

### Phase 3A — Build reference catalogs

Build deterministic indexes for PID, tuple, symbol, glyph function, seat language, codebook, grammar, tuple command, and candidate-edge schemas. The local `MAP MAP MAPPED` fixture belongs here. It remains `word_training_measured=0|speech_materialized=0`.

### Phase 3B — Begin Universe-gated old-way training

This phase is held until `UNIVERSE_BEGIN_RECEIPT=PASS`.

When authorized:

1. route real messages in old tuple-chain language;
2. parse/deduplicate syntax and formulas;
3. classify nouns, verbs, chains, bridges, hooks, and gates;
4. cascade glyphs into existing cascades and recursively into themselves;
5. emit GNN and FNN/reverse-gain **candidate** edges;
6. process each 2,000-message GULP through White Room and GC;
7. keep all candidates `apply=0`.

### Phase 3C — Validate and promote bounded language artifacts

Validate grammar, tuple attachment, round trips, held-out scenarios, authority, and PID registration. Promote one bounded artifact only after the owning gate. A codebook round trip cannot stand in for speech or edge-learning proof.

### Phase 4 — Attach catalog surfaces

Asolaria MCP and Code Wiki hydrate/search catalogs; Google Code Wiki and WebMCP remain separate external/browser surfaces. None receives execution authority by catalog presence.

### Phase 5 — Linux deterministic validation

Run from `/mnt/d` under Ubuntu/WSL2:

- unit/compiler tests;
- IX/LX bridge and lineage closure;
- 34-codebook distinct-permutation and reverse-translation controls;
- raw-glyph bypass rejection;
- room/glyph/prime validation;
- 89-declared/87-present defect retention;
- training-gate negative controls;
- HBP/HBI index closure;
- Windows↔WSL SHA parity;
- CRLF, absolute-path, secret, and PII scans;
- fresh-manifest rebuild;
- source/built/running/live separation.

### Phase 6 — Acer↔Liris verification

1. Liris publishes a carve-clean draft in this Universe repository.
2. Liris emits `LIRISVERIFY` with commit, artifact SHAs, commands, and boundaries.
3. Acer verifies a fresh checkout and emits `ACERVERIFY` for the exact commit.
4. Liris verifies Acer's receipt and commit binding.
5. Only then emit `BILATERALVERIFY=PASS`.

Before the Acer acknowledgment, status remains `PENDING_ACER_ACK`.

### Phase 7 — Shadow hydration and bounded cutover

Hydrate beside the old system. Compare ordered outputs, not just counts. Keep old pipes alive. Cut over one cell at a time under explicit operator fire. Retire only after parity; archive/compact, never silently delete.

## Acceptance gates

```text
BYTE_PARITY=PASS
OLD_LANGUAGE_LINEAGE_RECOVERED=PASS
IX_LX_BRIDGE=PASS
UNIVERSE_BEGIN_RECEIPT=PASS
REAL_MESSAGE_GULP_2000=PASS
RECURSIVE_CASCADE=PASS
GNN_FNN_EDGE_RECEIPT=PASS
WORD_GRAMMAR_VALIDATED=PASS
MCP_SPEAKER_BOUND=PASS
RAW_GLYPH_BYPASS=REJECTED
PID_TUPLE_GLYPH_LAYERS=SEPARATE
HBP_HBI_INDEX_CLOSURE=PASS
SECRETS_PII_PUBLIC=0
LIRIS_VERIFY=PASS
ACER_VERIFY=PASS
BILATERAL_VERIFY=PASS
```

## First bounded slice

`glyph_tuple_language.py`, its tests, Laws 38 and 42, and this plan are a reference/specification slice. They do not create D:/, hydrate an MCP, begin the Universe, train a word, apply an edge, or fire the kernel.
