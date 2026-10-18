# ledger/cosign-attribution provenance

**Claude's addition.** Every file in this directory was written for aether by Claude. None of it is
upstream code and none of it is vendored. It is a separate, labelled report, never the default verifier.
It is labelled the way `qprism/recovery/throat` (secondary throat) and `gate/fischer-eval` (Claude's Fischer
variant) are labelled.

Owner decision, 2026-10-17: "Option B — add it. Keep the default verifier unchanged (Option A numbers
never change), and add the attribution report as a clearly-labelled separate output. Same pattern as the
codec and Fischer."

## 1. Files (all written here)

| File | What it is |
|---|---|
| `Cargo.toml` | package `asolaria-cosign-attribution`, Rust 1.81, own `[workspace]`; path dependency on `../cosign-council/cosign-ledger` (`version = "0.1.0"`), dev-dependency on `../cosign-council/cosign-serve` |
| `Cargo.lock` | started from `ledger/cosign-council/Cargo.lock`. The third-party versions are unchanged: sha2 0.10.9, ed25519-dalek 2.2.0, curve25519-dalek 4.1.3, zeroize 1.8.2, zeroize_derive 1.4.3 |
| `rust-toolchain.toml` | the same bytes as `ledger/cosign-council/rust-toolchain.toml` (channel 1.81.0) |
| `src/lib.rs` | the default count loop (as `routes.rs:120-142`), `attribute`, `render` |
| `src/writer.rs` | the four compact serializations over the py_parity `PyRow`, and the CPython-compatible string decoder |
| `src/main.rs` | the `cosign-attribution <chain.ndjson>` binary |
| `tests/synthetic.rs` | 33 hand-built rows; DEFAULT counts compared with cosign-serve's own verify route on every file the tests write |
| `referee/referee.py`, `referee/REFEREE.hbp` | the stdlib referee and its pinned results |
| `DEPENDS.sha256` | sha256 of the six default-verifier sources this crate reads (section 2) |
| `README.md`, `PROVENANCE.md` | these documents |

## 2. Upstream sources this crate reads (not copied)

All six are federation-1024 @ `dc1da1a9cd88b77eb463053312b7c42a7dbe9b33`, vendored byte-identical in
`ledger/cosign-council`. Each blob id equals `git rev-parse dc1da1a9:servers/<path>` in
`/home/user/asolaria-federation-1024`, re-checked for this directory. Each sha256 equals the line in
`ledger/cosign-council/UPSTREAM.sha256` and is pinned again in `DEPENDS.sha256`.

| Path (servers/...) | Blob | sha256 | Used for |
|---|---|---|---|
| `cosign-serve/src/routes.rs` | `19fad37000ace88be00878833b5b91875d9538cf` | `5fc5642762a0aa4ed90cc7c55d989309e1440decbfe77346e5c954c67aa435c0` | the default verify, `:99-152`; its loop `:120-142` is reproduced in `src/lib.rs` |
| `cosign-ledger/src/py_parity/json_tok.rs` | `0dc1d52aa7483df1d9b20c9f7310b13c1db50bc4` | `b199b0a977fc66f306922b0bba333dc7008d92bb9afa3747629a7577ad0e0e29` | `parse_line`, `PyRow`, `RawJson`, `row_hash`, `seq_if_integer` |
| `cosign-ledger/src/py_parity/canon.rs` | `1f28b197837fafdf3a4bae647d66894c8540fd95` | `ff827b2d5112e13b00bebc9e044f1cbd500a1c833525f7642fb2d53bab6d3be0` | `sha16`, `canonical_bytes`, `py_escape_string` |
| `cosign-ledger/src/py_parity/mod.rs` | `5ed2d38ef6dbcbba7617310863da86ebe63b12c0` | `d20c92c9f80491f9768c1b4bd0ec2a43f3499e2cc67c62b3514f49233edc8785` | `APPENDED_BY_DAEMON` (`:16`) |
| `cosign-ledger/src/py_parity/chain.rs` | `460cfbc35073446e7afb7728d47ae7e966228f5d` | `5b02de242e0f35b28d69f6140326daa17dbbc943162db250ce59fc1427f98302` | compiled with the crate (not called) |
| `cosign-ledger/src/lib.rs` | `4ab9fe0b8353041f04600d7aea19596bc3e06ed5` | `28fed0643b196e78a6d28aa2b57d24f7d38104ba598e8f455c51f2f90b7047cf` | compiled with the crate (not called) |

The tests also compile `ledger/cosign-council/cosign-serve`. That is the same upstream `routes.rs`,
`store.rs` and `resume.rs`, plus the line ranges of `main.rs` and `http.rs` from `EXTRACTS.sha256`. The
tests call its `GET /api/cosign/verify` to show that the DEFAULT row is the default verifier's answer.

The Python daemon whose recipe the default reproduces is
`ledger/hyperbehcs-daemons/vendor/acer-hyperbehcs-bin/asolaria-cosign-chain-daemon.py`. It came by owner
relay from ACER and is vendored by another builder. Its sha256 is
`a2c863db85a747f3b5272d72b2dc6215f7dda3470a6290621de1bc70def22ea2` and its blob is
`c1753dcca67cca6c3cb0352c200206a30835d689`. The lines this crate relies on are:

- `:26`: `ANCHOR`, the value `py_parity/mod.rs:16` repeats
- `:32`: `sha16`
- `:70-71`: `json.dumps(..., sort_keys=True, ensure_ascii=False)` and `row["row_hash"] = sha16(base)`

It is cited, not copied.

## 3. What is Claude's, and what is measured

- The four formula names, the order they are tried in, rules 1-8 of the README, and the evidence rows are
  Claude's. They follow the build task's definition: "sha16 of the row without row_hash serialized with
  compact separators (',' and ':') in {sorted keys, original key order} x {non-ASCII kept, non-ASCII
  escaped as Python ensure_ascii=True does}", with raw scalar tokens "emitted exactly as stored", and rows
  whose `row_hash` is not 16 lowercase hex reported as unidentified.
- The task also set "No JSON parsing beyond the vendored py_parity tokenizer". The formulas are therefore
  computed over the `PyRow` that `parse_line` reads, with number tokens as stored (README rule 7). The
  one other reading is the decoding of value strings, which the kept and escaped forms need. py_parity's
  decoder is not exported and refuses unpaired surrogate escapes (`json_tok.rs:253-293`).
- The task specified the output as `ATTRIB|line=|seq=|formula=|json=0` rows plus integer totals. The
  line counts on the first `ATTRIBUTION` row and the `ATTRIB_UNIDENTIFIED` and `ATTRIB_DAEMON_ROW`
  evidence rows go beyond that. They are kept until the owner decides.
- The Python behaviour the formulas reproduce is CPython's `json` module: the scanner's string decoding,
  `encode_basestring`, `encode_basestring_ascii`, `sort_keys` and the number grammar. The referee checks it
  against `json.dumps` itself (`DUMPS` rows).
- No upstream code writes these four serializations. See README, "Not brought in".

## 4. Measurement inputs (not in this repository)

- The owner's live chain, `scratchpad/cosign-check/COSIGN_CHAIN.ndjson`: 5,439 lines, sha256
  `39aaa803ad47d794ec3e3f989fcb8b0ca24aef254451941d50419dfbf2791939`. It is private and was read in place.
  It is never copied here and no row is quoted; only counts are recorded.
- The cloud receipt `scratchpad/cosign-check/COSIGN-VERIFY-RECEIPT.hbp` and its per-row output
  `compare.out`. They are compared by count only (README, "Measured").
- The private mirror `scratchpad/asolaria-mirror.git` was read with `git grep` across its 92 refs, to look
  for writer code. Nothing from it is copied or quoted.

## 5. Privacy scan

Every file in this directory was scanned (regexes, plus a list of every capitalised word) for emails,
phone numbers, IPv4 addresses, keys and secrets, user-directory paths and personal names. None are
present. The only filesystem path is the on-disk federation-1024 checkout named in the build contract. The test
and referee rows are synthetic. The only operator-machine strings are the daemon's constant and the
upstream `routes.rs` path, both already in upstream code.
