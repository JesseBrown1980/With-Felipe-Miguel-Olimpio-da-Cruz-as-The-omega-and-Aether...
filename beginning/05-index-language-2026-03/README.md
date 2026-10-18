# 05 — The index language as data (2026-03-16 to 2026-03-27)

Build-order step 5 of the beginning. This is where the index became a language: numbered IX/LX entries used as a vocabulary, chains used as sentences, and a catalog used as the dictionary, with a compiler and compiled tables behind it. It is the "index language as data": the ASO index-kernel and its compiled tables, the colony-brain source snapshot the watcher and tool index came from, and the IX/LX corpus that the whole colony reads at boot.

Everything under `vendor/` is byte-identical to its public source. For files taken from a git repository, `git hash-object --no-filters` of the vendored file equals the source blob (verified: 448 of 448 git-sourced files match). The 115 GAIA files are members of a pinned zip and are verified by sha256. Check the whole set from this directory with `sha256sum -c UPSTREAM.sha256`.

## In the owner's words

The pattern `IX-060.md` ("The index IS a language") records the Liris insight dated 2026-03-18 (`LX-015`):

> "The index IS the language — chained dictionaries for token compression."

and states the mechanism:

> - Each IX number = a WORD in the colony's vocabulary
> - Following a chain = reading a SENTENCE
> - CATALOG.md = the DICTIONARY

and the owner's original vision:

> Jesse's original vision: "similar to an LLM's weights... numbers triggered by the system, leading to another index"

The ACER-seat receipt (`IX-chain-ORIGINAL-index-language-ACER-SEAT`, 2026-07-05) states the same in one line:

> a numbered entry became a tuple-catalog word, and a chain became a compact sentence over a shared agent index.

## What each part is

- **ASO index-kernel** (`vendor/Asolaria/src/index-kernel/`, 12 files + `tests/index-kernel.unit.test.js`): the compiler, query and runtime for the `aso` index — `aso.js`, `asoTables.js`, `cache.js`, `compile.js`, `inventory.js`, `profile.js`, `query.js`, `runtime.js`, `schema.js`, `state.js`, `textIds.js`, `validate.js`. File dates inside the Liris kernel package are 2026-03-25. This is the code that compiles the index into the `data/aso` tables.
- **ASO compiled tables** (`data/aso`, pinned in `pins/`): the compiled dictionary, ~13.8 MB, file dates 2026-03-25 to 2026-03-27 — six `aso-export` JSON snapshots, the seven `tables/*.json` (observations, topics, relations, outcomes, evidence, conflicts, surfaces), `graph-edges.json`, `graph-nodes.json`, `graph.dot`, `crosswalk.json`, `DIGEST.md` and the ops-logs. They exist in the mirror only inside `liris-kernel-package.zip`; per the build order they are pinned by member hash, not vendored, to keep the directory small.
- **GAIA full-source snapshot, 2026-03-24** (`vendor/gaia-full-src-20260324/`, 115 files): the colony-brain source the owner sent himself as `gaia-full-src.zip`, stored at `tmp/docs/whatsapp-rayssa/gaia-full-src.zip` (Asolaria @ fbcb630, blob 3d891f44). Its 1,282 entries were listed and read: they are source code and `node_modules`, not conversation. It is the dated copy of `constructionToolIndex.js` and `gnnConstructionWatcher.js` (both referenced by this step), plus `colonyAnatomy.js`, `omnispindle.js`, `instantAgentSpawner.js`, `spawnContextBuilder.js`, `edgeRiskEngine.js` / `graphRuntimeStore.js` / `graphRuntimeQuery.js`, the 45 connectors, and the healthcare carry-over `ocr/fhir_mapper.py` + `ocr/medical_parser.py`.
- **IX index-language corpus** (`vendor/asolaria-behcs-256/data/agent-index/`, 423 of 425 files): the colony dictionary itself — `CATALOG.md`, `CHAINS.md`, `BOOT-CRITICAL.md`, the `XREF*` cross-references, `aso-crosswalk-ix.seed.json`, and the `patterns/`, `mistakes/`, `plans/`, `references/`, `bridge/` IX-*.md entries. `IX-060.md` is the central anchor. Two files are held: `references/IX-448.md` (Wi-Fi keys) and `mistakes/IX-152.md` (the bridge auth token in plaintext).
- **IX-chain-ORIGINAL receipts** (`vendor/IX-chain-ORIGINAL-index-language-ACER-SEAT/`, 12 files): the ACER-seat public anchor for the index language — the 2026-07-05 docs, evidence (census, evidence-pointers, source-manifest) and HBP/HBI/JSON receipts, plus the repository README.

## Date range

- 2026-03-16: `gnnConstructionWatcher.js` (the stub; blob 85edb73b) first committed (reference, already in aether).
- 2026-03-18: `LX-015`, "the index IS the language" (cited by `IX-060`).
- 2026-03-24: the GAIA source bundle date; the 115 vendored members carry file dates 2026-02-08 to 2026-03-24.
- 2026-03-25: ASO index-kernel file dates.
- 2026-03-25 to 2026-03-27: the `data/aso` compiled tables.
- 2026-04-11 (fbcb630): the index-kernel, the GAIA zip and the liris kernel package are committed to the public mirror.
- 2026-04-20 (021c47d and later same-day commits): the agent-index corpus is published in `asolaria-behcs-256`.
- 2026-07-05 (83172c5): the IX-chain-ORIGINAL ACER-seat receipts are published.

The content is the 2026-03 index language; the public commits that carry it land 2026-04-11 to 2026-07-05.

## Already in aether / referenced, not duplicated

- `constructionToolIndex.js`: vendored by step 02 (blob `77bf5bf0`, first commit 0a48498 2026-03-16). The 2026-03-24 copy in this step's GAIA snapshot is the same blob.
- `gnnConstructionWatcher.js`: the 2026-03-16 version (blob `85edb73b`) is already in aether under `planes/gulp-watchers/vendor/asolaria-behcs-256/packages-legacy-import/src/`.
- `canon-archive/asolaria/data/agent-index/CATALOG.md` is the ACER copy of one of the 423 agent-index files vendored here from behcs-256.

## Held, and why

See `HELD.hbp`. Six items are held:

- The **compiled unified agent index** (`.history/staging/compiled-unified-agent-index.json`, both versions — blobs `9b0f5f3c` and `16f6e706`), which the build order names as a step-5 component, is **not vendored**: its compiled bodies embed real credentials — a hardcoded Bearer token, a Gemini API key, an OAuth refresh token and a gateway token — and, in the 2026-04-30 version, a personal WhatsApp phone number. Only its blob ids and digests are recorded. Step 0 (owner key rotation) covers rotating these.
- `data/agent-index/references/IX-448.md` holds live Wi-Fi SSIDs and pre-shared keys (passwords).
- `data/agent-index/mistakes/IX-152.md` (blob 61613bff, 2,171 B) quotes the full 64-hex bridge auth token in plaintext, the same token as the Bearer token in the held compiled index above. It was vendored at first and moved to `HELD.hbp` by the 2026-10-18 verification. `references/IX-148.md` keeps only a 10-character prefix of the token, which is not usable.
- `tmp/docs/whatsapp-rayssa/id_ed25519` (blob 3913dcc6, 411 B), an OpenSSH private key stored beside `gaia-full-src.zip`. It is on the build order's step-0 held list and was not recorded in any step directory until the 2026-10-18 verification added it here.
- `cloudflared.exe` (65.8 MB) inside the liris kernel package is a third-party binary; pinned by sha256.

Every vendored file was scanned for credential patterns (`gh?_`, `sk-`, `AIza`, `hf_`, `xox`, `Bearer`, `BEGIN PRIVATE KEY`, `password=`, `"token":`), phone numbers and private data. Apart from `IX-152.md` (held after the 2026-10-18 verification found the full bridge token in it), the agent-index files discuss the bridge's Bearer-token auth as architecture and reference credentials stored in the owner vault, but hold no usable credential values; the GAIA sources' only matches are a PEM-header format check, PEM-redaction regexes and integer/IP constants (false positives); `gateway/package-lock.json` carries npm integrity hashes only.

## Not public / not found

- The LX corpus body itself (the Liris seat, ~2.3 MB, 221 LX-named and 767 IX-named files) is not in any public repo; it would need a send from the Liris seat. Only the IX-side corpus (asolaria-behcs-256) and the ACER-seat receipts are public and vendored here.
- The real credential values the compiled index documents are intentionally not reproduced anywhere in this step.
