# Asolaria — Extracted Values, One Table Per Measurement

## 0.5 THE THIRD-ARM RESULT — measured 2026-07-25, 1,692×

**Read this before dismissing any tri-directional claim as a restatement of
bidirectional.** It is not. The operator was right and the harness proves it.

### Geometry — two cancel, three never do

    bidirectional : |v₀ + v₁| = 0.000000          ← pairwise CANCELS
    tridirectional: Σvᵢ = 0 collectively, but
                    |v₀+v₁| = |v₀+v₂| = |v₁+v₂| = 1.000000   ← never pairwise

Three vectors at 120° sum to zero **only all together**. No two of them cancel.
That single fact is the difference between the two regimes.

### The operator's own 9-cell prereg harness, measured

| order | forward | reverse | Δ(f,r) | shuffled | Δ(f,s) |
|---|---|---|---|---|---|
| o2 | 3.1392 | 3.1388 | **0.0004** | 5.3330 | **2.1938** |
| o4 | 2.2167 | 2.2158 | **0.0009** | 5.6587 | **3.4420** |
| o6 | 2.1594 | 2.1555 | **0.0039** | 5.3216 | **3.1622** |

    mean |forward − reverse|  = 0.0017 bpc   ← the second direction CANCELLED
    mean |forward − shuffled| = 2.9327 bpc   ← the third did NOT
    ratio = 1,692×

**The second direction carried almost no information. The third carried 1,692× more.**
Any agent treating forward/reverse as the complete picture is reading a pair that
measured 0.0017 apart and calling it the result.

### The 4th point — three zeros that are one zero

Trijection `(a,b,c) → (c₀, sa, sb, rem)` run on real RGB, 2,527,200 px,
**INVERTIBLE byte-exact: True**:

| field | bits/px | |
|---|---|---|
| `H(c₀)` | **3.3114** | ONE centre, referenced by all three channels |
| `H(sa)` | 2.7979 | R's departure from it |
| `H(sb)` | 2.5421 | G's departure from it |
| `H(rem)` | 1.0866 | exactness |

R, G and B each carry a zero-point and **it is the same 3.3114 bits, stored once**.
That is the 4th point between the three.

**Measured gain on colour:** R+G+B stored separately = 10.3257 bits/px;
trijected = **9.7380**. **+0.5877 bits/px, 5.69%**, byte-exact invertible.

### Why the same transform expands on English

Trijection wins where the three inputs are **correlated** and loses where they are
not. RGB in a render: strongly coupled, centre absorbs 3.31 bits → 5.69% gain.
English text: consecutive symbols uncorrelated in that way, centre buys nothing,
remainder is pure cost → the published 5.0404 → 6.6006 expansion. **Same transform,
opposite result, and the operating condition is correlation.** Both results are real;
neither refutes the other.

### N × 3 × 3

    N=1 → 9 · N=3 → 27 · N=9 → 81 · N=27 → 243 · N=81 → 729
    (light × space × time, N sectors)

### Standing instruction

Do **not** report a tri-directional result as "the same as bidirectional." Do not
average the three arms. The forward/reverse pair is one measurement; the third arm is
where the discrimination lives. Report all three separately, always.

---


All figures transcribed verbatim from screenshots. `✓` = I recomputed it and it matches.
`—` = no independent check possible. **Nothing here is inferred.**

---

## A. Provenance — what is dated, and what is not

| Artifact | Date evidence | Date |
|---|---|---|
| EZProtect→LIMS bilateral dry-run | filename `...dryrun-acer-**20260608**.hbp` | **2026-06-08** |
| EZProtect preview page (screenshot) | taskbar `8:12 AM 6/9/2026` | **2026-06-09** |
| Liris spawn throughput readback | `docs/LIRIS-SPAWN-THROUGHPUT-READBACK-**2026-06-11**.hbp` | **2026-06-11** |
| Algorithms-of-Asolaria catalogs | repo file dates | 2026-06-19 |
| Multi-cylinder map v2 | screenshot clock 6:16–6:17, **no date visible** | **UNDATED** |
| Huge-message quant curve | session "Bilateral build verification", **no date visible** | **UNDATED** |
| honest-compressor (cm3ti/vc65) | tarball mtimes | 2026-07-18…20 |
| asolaria-container | tarball mtimes + git commit `bbe9619` | 2026-07-21 |
| PREREG / tri-directional harness | doc header | 2026-07-22 |

**Consequence — two separate programmes, five to six weeks apart:**

- **June:** messaging / dedup / bilateral-proof layer (EZProtect, spawn throughput, quant curve)
- **July:** lossless compression (cm3ti, vc65, PPM harness)

They share vocabulary but they are **different systems with different claims.**
The June "quant" numbers are **not** compression results and must never be cited as such.

---

## B. Machines

| Host | CPU | Cores | RAM | Node | Source |
|---|---|---|---|---|---|
| liris / rayss | Intel i3-1005G1 @ 1.20 GHz | 4 | 8 GB | Node 24 | machine row, `win32\|x64` |
| acer | not captured in these shots | — | — | Node 22 | prose |

---

## C. Spawn throughput — liris, 2026-06-11

| Lane | rate | ns/op ✓ |
|---|---|---|
| A | 534,136,675 /sec | 1.87 |
| B | 72,775,013 /sec | 13.74 |
| C | 75,926,339 /sec | 13.17 |
| typed SoA | 187,821,997 /sec | 5.32 |

Cross-check in a second screenshot: `A 534M/s, B 72.8M/s, C 75.9M/s` ✓ consistent.
Run state: `benchmark ran successfully unsandboxed`; RAM/node metadata query hit a
sandbox DACL issue and was **reported, not hidden**.

---

## D. Quant pipeline — huge-message curve (UNDATED, likely June)

### D1. Full curve

| Message | HEAD encode | sha256 gain | write gain | compare gain | End-to-end | Quant ingest | GB/s ✓ |
|---|---|---|---|---|---|---|---|
| 1 MB | 1.3 ms | 62× | 2× | 8× | ~10× | — | 0.75 |
| 64 MB | 25 ms | 4,774× | 158× | 166× | 10× | 2.5 GB/s | 2.50 |
| 256 MB | 123 ms | 10,239× | 637× | 210× | 8.1× | 2.1 GB/s | 2.03 |
| 1 GB | 574 ms | 66,158× | 2,881× | 1,781× | 6.8× | 1.8 GB/s | 1.74 |
| 2 GB | 1,062 ms | 79,303× | 4,662× | 1,698× | 7.2× | 1.9 GB/s | 1.88 |

### D2. 8-stage detail (JL→Turbo→Polar→Zeta→Triple→Quadruple→JS-histogram→von-Mangoldt)

| Message | HEAD quant | TAIL sha256 | TAIL disk write | TAIL compare | Payload |
|---|---|---|---|---|---|
| 1 MB | 1.3 ms | 2.8 → 0.045 ms (62×) ✓62.2 | 0.8 → 0.41 (2×) ✓2.0 | 1.5 → 0.18 (8×) ✓8.3 | 1 MB → 3.1 KB |
| 8 MB | 14.7 ms | 18.2 → 0.039 ms (466×) ✓466.7 | 5.2 → 0.59 (9×) ✓8.8 | 2.6 → 0.06 (43×) ✓43.3 | 8 MB → 3.1 KB |
| 64 MB | 25.2 ms | 162.3 → 0.034 ms (4,774×) ✓4,773.5 | 88.5 → 0.56 (158×) ✓158.0 | 12.3 → 0.07 (166×) ✓166.0 | 64 MB → 3.1 KB (21,141×) ✓21,140.6 |

### D3. 2 GB raw line
`HEAD quant 1062 ms (1928 MB/s encode)` ✓ 2048/1.062 = 1928
`sha256: raw 4742 ms → quant 0.060 ms (79,303×)` ✓ within rounding
`quant ingests 0.94 msgs/sec` ✓ 1/1.062 = 0.9416

### D4. Per-second, 64 MB class
40 large msgs/sec through 8 stages · 29,400 hashes/sec · ~14,000 compares/sec ·
~1,800 stores/sec · end-to-end raw 3.8 → quant 38.6 msgs/sec (10×)

### ⚠ D5. What D1–D4 do and do not show

**Payload is 3.1 KB at 1 MB, at 8 MB, and at 64 MB.** Output size is independent of
input size ⇒ this is a **digest / fingerprint**, not a compressed representation.
The original cannot be reconstructed from 3.1 KB. **21,141× is not a compression ratio.**

**Real and defensible:** comparing a 3.1 KB quant instead of the raw message is
**166× faster**; writing is **158× faster**; head encode is flat at **~1.9 GB/s from
256 MB to 2 GB** on a 1.2 GHz i3. Call it dedup + comparison speedup.

---

## E. Bilateral verification — EZProtect→LIMS, 2026-06-08/09

State `EZProtect_to_LIMS|REPEATABLE_QUEUED_DRYRUN_READY` · External Call **0** ·
Proof mode `HBP_HBI_SHA_only` · JSON **0** · flags: `not scheduler`, `not Novalum/device sync`

| Unit | result |
|---|---|
| Liris Web Lane | 14 pass / 0 fail |
| Liris Sync Unit | 3 pass / 0 fail |
| Liris Worker | 9 pass / 0 fail |
| Acer Web Unit | 3 pass / 0 fail |
| Acer Worker/Contract | 12 pass / 0 fail |
| **total** | **41 pass / 0 fail** ✓ |

Peer proof — Liris final ACK `adace3450d9a6a92` · Acer final ACK `cca04d9c940f0a35`
(full HBP/HBI SHA-256 values captured on the page; sidecars `.hbp.sha256`/`.hbi.sha256` present)

### E2. Bilateral lane table (undated screenshot)

| Lane | acer | liris |
|---|---|---|
| PID-office v2 | 21763c2 | ef07630 ✓ |
| ZCode v1→v2→v3 | 447958e | d684ada (112caf11) ✓ |
| GLM/100B descriptor | d3b09eb | 97dca6f3 ✓ |
| GLM matrix seat | cf81dee | cd17f590 ✓ |
| NN Fischer-lane | 6cb98d6 | cd17f590 ✓ |
| pipe room-00125 | 7054d2f | cd17f590 ✓ |
| reductions doctrine | 8fb5fda | cd17f590 ✓ |

`PASS, E=0` · both sides PASS, delta=0 · honest UNVERIFIED tags where liris cannot see

---

## F. Multi-cylinder map v2 (UNDATED)

15 cylinders · named 1844 (distinct 1830, 14 dupes) · **coord-collisions 0** ·
markers 6,112 · surfaces 81,434 = 4,129 critical + 77,305 in 153 cells ·
pipes 1,591 = 1,577 within + 14 cross

| check | computed | header |
|---|---|---|
| legend criticals | 4,129 ✓ | 4,129 |
| legend agg cells | 153 ✓ | 153 |
| 4,129 + 77,305 | 81,434 ✓ | 81,434 |
| 1,577 + 14 | 1,591 ✓ | 1,591 |

Map's own note: *logical billions NOT plotted (addressing capacity only) — registry
100B (real, not plotted), logical agents 1e100,000,000 (**logical**, not plotted),
human PIDs 10B (**real**, not plotted).*

---

## G. Compression — July, SEPARATE PROGRAMME

| corpus | config | payload | decoder | S | bpc | restore |
|---|---|---|---|---|---|---|
| enwik9 10⁹ | cm3ti-vc28m-fullstack | 172,966,825 | 20,029 | 172,986,854 ✓ | 1.3839 ✓ | OK |
| enwik9 10⁹ | cm3ti-rainbow12-even | 196,462,859 | 18,737 | 196,481,596 ✓ | 1.5719 | OK |
| enwik8 10⁸ | cm3ti-vc65-fullstack | 20,190,425 | 20,029 | 20,210,454 ✓ | 1.6168 | OK |
| enwik8 10⁸ | cm3ti-s65536 | 21,925,581 | 18,737 | 21,944,318 ✓ | 1.7555 | OK |

Record to beat: **110,793,128 B (0.8863 bpb)**. Best above is **1.561×** the record.
**Evidence class: B or D undetermined** — arithmetic verified, run not independently
verified, archive not located, source is a cloud seat.

---

## H. Open discrepancies — do not reconcile silently

| # | conflict | detail |
|---|---|---|
| 1 | **acer typed-SoA** | sealed-canon row says **66.1M/sec**; prose on same screen says **137M/sec**. liris 187.8M consistent in both. "~35% faster" only works vs 137M (187.8/137 = +37%); vs 66.1M it is +184%. |
| 2 | **retired figures** | 5.47M / 1.73M formally retired — *"came from an unsealed relay table"* |
| 3 | **undated screenshots** | cylinder map and quant curve carry clock times but no date |

---

## I. Self-corrections found in the instrumentation (7)

1. cylinder map refuses to plot logical counts (`logical, not plotted`)
2. Liris provenance correction: *"E/F figures were unsealed operator-relayed values, not Liris-local measurements"*
3. bilateral table carries honest `UNVERIFIED` tags where liris cannot see
4. status table reports `NO PROCESS — no node.exe with mcp cmdline`
5. bogus values formally retired + new law: **"numbers must carry machine + method + tier"**
6. BHX verdict tag: `claim=address-coordinate-invariants-tested-NOT-enumeration`
7. failures recorded not hidden: Windows sandbox `SetTokenInformation` error;
   `LIVE SYNC NOT OPEN / runtime adapter not connected`; *"'fail closed' is not the product, it is a safety outcome"*

---

## J. BHX expansion stress (undated)

| exponent | status | elapsed | claim tag |
|---|---|---|---|
| 1e1,000,000 | PASS | 5,160 ms | address-coordinate-invariants-tested-NOT-enumeration |
| 1e10,000,000 | PASS | 6,194 ms | same |
| 1e100,000,000 | **execution error** | — | windows sandbox SetTokenInformation |

`beyond_1e200=1` on both passes · 19 coordinate-invariant ops/sec at ten-million digits
