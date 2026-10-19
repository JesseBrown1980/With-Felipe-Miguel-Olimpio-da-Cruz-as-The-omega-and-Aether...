# Asolaria past extracted from operator screenshots — 2026-07-19

## Purpose

This receipt transcribes visible historical facts from operator-supplied screenshots and connects them to the current Asolaria frame. It does not claim that this agent independently reran the pictured commands. Duplicate or partial images are labeled honestly.

The images themselves are not committed here because they contain broad screen context. Their SHA-256 values are recorded so the operator can match the local originals.

## Source image integrity

| Local source label | SHA-256 | Notes |
|---|---|---|
| `spawn-throughput-closeup` | `0c55bd811e1bffe8d8727b225be92e82422f51e99e8955851a11c9997550c428` | Cropped benchmark values |
| `fleet-table-partial` | `e3f62d6f7d57cb5c681816f69c91266ac5ce09ce3807908e57fd0776537f0427` | Partial table; headers and right edges are clipped |
| `recall-parity-a` | `275b7b72ac3ae460a6fb4fb824ad10fb2b50b0f97fd0fb9c12be4f5cd15882c8` | Recall parity screen |
| `recall-parity-b` | `275b7b72ac3ae460a6fb4fb824ad10fb2b50b0f97fd0fb9c12be4f5cd15882c8` | Byte-identical duplicate |
| `address-space-proof` | `b28e33b8673e2f6e5594acbe72242b1cbe2bfecace2cdee1f1380e4ff7c127c5` | HBP/BEHCS capacity proof screen |
| `liris-push-receipt` | `295e5e65fd7e038fbb7341c989935dd358d1a2b026d09b0133b1cecff31e29a3` | Push, tests, benchmark, and receipt path |

## 1. Liris spawn-throughput readback

### Visible close-up

```text
What I sealed:

- Confirmed Acer's d35f0f2 correction ...
- Ran the benchmark on this Liris/rayss machine:
  - A: 534,136,675/sec
  - B: 72,775,013/sec
  - C: 75,926,339/sec
  - typed SoA: 187,821,997/sec
```

The text after `d35f0f2 correction:` is clipped in the close-up but is visible in the wider receipt as `111/111 tests, diff-check clean`.

### Visible wider receipt

```text
Pushed 2b81d3b to origin/main; local and remote heads match.

What I sealed:

- Confirmed Acer's d35f0f2 correction: 111/111 tests, diff-check clean.
- Ran the benchmark on this Liris/rayss machine:
  - A: 534,136,675/sec
  - B: 72,775,013/sec
  - C: 75,926,339/sec
  - typed SoA: 187,821,997/sec
- Added docs/LIRIS-SPAWN-THROUGHPUT-READBACK-2026-06-11.hbp.
- Updated the calibration ledger with the Liris machine row and a provenance correction.
- E/F figures were unsealed operator-relayed values, not Liris-local measurements, under host=acer.
- Added the Liris receipt to the sealed sidecar lattice.
```

The lower `Verification:` section is cut off in the supplied photograph and is not reconstructed here.

**Tag:** `OPERATOR_SUPPLIED_SCREENSHOT`.

## 2. Recall/Hilbra indexed-engine parity

The screen begins with the visible query path:

```text
pid/bh exact maps + precomputed levels;
query = exact-pid/bh OR token AND-intersect -> candidate set
-> O(1) seek -> level-filter
```

### Visible comparison table

| Target | Yesterday / Liris bar | Acer Rust now |
|---|---:|---:|
| terms | `2,614,638` | `2,614,638 — exact match` |
| rows | `591,286` | `591,286` |
| query latency | `~56–67 ms` (`was 2.3 s O(N)`) | `2–16 ms` (`significance loopback 2 ms`) |
| L0 sensitive `(bank/vault/.pem/legal)` | `→ 0` | `all → 0 (+ password)` |
| `json_hot_path / linear_fallback` | `false / false` | `false / false` |
| no event-loop stall | `required` | `thread-per-conn ✓` |

### Visible notes

```text
The terms count matching 2,614,638 exactly is the strongest parity signal:
same tokenizer, same corpus, same vocabulary.

health.search_index now exposes:
enabled, index_schema, json_hot_path:false, linear_fallback:false,
terms, postings, built_ms

responses carry:
mode=inverted-index + candidate_count
```

```text
Honest notes:
index build is ~45 s (allocation-heavy; Node was 32.5 s — a follow-up optimization,
not a blocker). Corpus stays local/unpublished; key read from file, never logged.
Full owning gate green, 758 LOC, E=0.
```

```text
State:
- PR #8 = the indexed engine now (not the linear baseline).
- For Liris to cross-verify: parity vs Node on small queries,
  HMAC interop, health-instant-under-load, L0 PII-free.
- Recorded to memory.
- Once Liris cross-verifies, repoint Acer :4791 Node -> Rust.
```

The last line states no fire, no TO, and no USB/Drive write; the exact abbreviation context is preserved as screen text rather than expanded.

**Tag:** `OPERATOR_SUPPLIED_SCREENSHOT`.

## 3. Address and expressive-capacity proof

### Visible table

| Layer | Displayed space |
|---|---:|
| full omni stack `(1024^60 × 17! × 16)` | `10^196` |
| one verb×noun sentence | `10^361` |
| 50-word conversation | `10^9030` |
| 50-word conversation across 17 engine-languages | `10^9092` |

### Visible conclusions

```text
Your claim is proven and was an understatement.
Even the smallest single tuple out-addresses every atom by 10^64;
a single two-word sentence out-addresses everything the universe
could physically store by 10^176.
```

The same screen immediately supplies the boundary:

```text
HBP tuple form, json=0, sha256-sealed — not JSON.

Params grounded:
BEHCS-1024 / tuple_dim=60 / 16 levels MEASURED from the live fabric;
256/1024/2048, 47→60 catalogs, 17 engines CANON;
products tagged MODELED.

Honest frame:
this is addressing/expressive capacity, not materialized storage.
The Brown-Hilbert geometry is unbounded — it can name far more than
the universe can hold — and the only binding limit is solid-state storage
for what you choose to materialize. Cheap possibility, gated action.
```

The screen also states:

```text
Published in proofs/ alongside the cosign-chain integrity proof
(live ed25519 ledger PASS, unbroken; pre-daemon region self-flagged).
Recorded to memory.

The whole-system suite ran 14 PASS and fixed two real failures
(WebMCP, shadow gates).
```

**Tag:** `OPERATOR_SUPPLIED_SCREENSHOT`.

## 4. Partial fleet/use table

Only the center of this table is visible, so no hidden headers or clipped text are invented.

Visible rows:

```text
Used?              [right header clipped]

HEAVILY             48.98B / 100B @ 4.94M/sec
alive (auth-gated)  unknown current query traf...
NO PROCESS          no node.exe with mcp cmdli...
partial             4 RUNNING / 8 READY / 5 DIS...
alive               bilateral synaptic substrat...
```

This is retained as a partial historical artifact, not promoted into a complete status table.

**Tag:** `OPERATOR_SUPPLIED_SCREENSHOT_PARTIAL`.

## 5. Connection to the current fabric

These screens preserve several old/new bridges:

- The historical Node and Liris benchmark lineage remains evidence even while Rust Host8 and Recall replace selected hot paths.
- Exact parity counts connect the older corpus/index semantics to the Rust indexed engine.
- The address-space proof is explicitly about cheap possibility and gated materialization.
- The Liris receipt demonstrates a bilateral measurement/correction pattern: Acer fix, Liris execution, provenance correction, sealed receipt.
- The partial fleet table distinguishes logical/processed counts, live/auth-gated surfaces, no-process states, and readiness rather than flattening them into one resident-agent number.

## 6. Current session additions to carry forward

The following were reported in the current update session and belong beside the historical extraction:

### Federation transfer-decay scaling

```text
100 KB: cold 0.0785, warm 0.0107, gain 86.3%
1 MB:   cold 0.0232, warm 0.0110, gain 52.9%
10 MB:  cold 0.0117, warm 0.0101, gain 13.2%
```

The warm prior remained approximately flat while cold objects approached it as size increased. The strongest federation advantage therefore appears in small, frequent agent-civilization traffic.

### Nullspace watcher test

```text
targeted: 56 beams
random:   56 beams
```

Targeting is neutral when beams are free and unconstrained; it matters when real watchers are scarce, correlated, costly, permission-limited, or vantage-limited.

### Stacked-cube level chain

```text
L1 0.0330
L2 0.2224
L3 0.0529
L4 0.0341
```

A lossy improvised fold produced a level-two shock. Later levels adapted. The production catalog/glyph/GNN-edge transition still needs a semantic-preservation receipt.

### Path 2

The current repository frame records store-free recovery from jointly sufficient CRT shadows, watcher-gated DBBH→DBWH emission, and an operator-supplied third-seat Rust 1.97 run with `30/30` tests green.

## 7. Preservation rule

Do not turn this screen extract into stronger claims than the pixels support. Do not discard it because a current agent did not run the old commands. Preserve the screenshot hash, the visible text, the evidence seat, and the exact boundary.

_Receipt state: additive, docs-only, no secrets, no live fire, no local-drive mutation._
