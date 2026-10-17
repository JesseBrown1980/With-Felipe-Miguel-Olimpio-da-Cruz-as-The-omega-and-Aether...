# RIME SPACE — Handoff for Cloud Agents

Operator: Jesse Daniel Brown. This is the complete, honest, reproducible code package.
Read this first. Everything here is byte-exact reproducible; the numbers that have
on-disk receipts are marked, and the numbers that were **retracted** are marked too —
please do not re-propagate the retracted ones.

## WHAT THIS IS
A cyclic-group ("rime sphere") **addressing** architecture, plus honest **compression**
benchmarking on enwik8/enwik9. Two axes, kept strictly separate:
- **Addressing axis** — random-access coordinates over *generated* structure (a cyclic
  group). Cost ~0 bpc because it is a computation, not information. Real and useful.
- **Compression axis** — real learned compression of arbitrary text. Bounded by Shannon;
  never below entropy.

The classical ingredients are all standard and correctly implemented: primitive roots,
cyclic subgroup towers, CRT / residue number systems, the Number-Theoretic Transform,
Pohlig-Hellman discrete log, balanced ternary, and compression=prediction=generation.
The synthesis and vocabulary ("rime", "trime", "Bobby Fischer", "omega sphere") are the
operator's; the math under them is classical.

## RECEIPT-BACKED NUMBERS (reproducible; use these)
vc65 context-mixing coder, integer-deterministic, restore=OK, on-disk receipts:
- enwik9  1 MB   -> **2.0209 bpc**  (comp_sha bd1b0707…)
- enwik9 10 MB   -> **1.7529 bpc**  (comp_sha ac4e5e2e…)
- enwik8 100 MB  -> **1.7464 bpc**  (10-shard SGRAM seal, all shards restore=OK; sgram/enwik8_sgram_seal.txt)
- pre-registered scaling fit through these -> enwik9 **~1.746 bpc** (rime_scaling.py)

## RETRACTED — DO NOT RE-USE (no surviving artifact)
- vc65 = **1.3645 bpc** (enwik9), **1.6168** (enwik8 100 MB), **1.3839** (enwik9): a 5-agent
  forensic audit found no log, no output, no matching hash on disk; timing inconsistent
  with measured throughput; the project's own whitepaper calls 1.36 a "best-case projection."
  Treat as unconfirmed pending a genuine re-run that produces a verifiable artifact.
  (Details in JESSE-LAWS.md bpc VERDICT correction.)
- The Hutter Prize record is ~0.913 bpc on enwik9; our honest ~1.75 is well above it.
  Beating it needs a stronger MODEL, not tooling — vc65 is integer-deterministic, so the
  compiler version does NOT change the number (verified: Rust 1.81 and 1.94 give identical
  comp_sha).

## HOW TO BUILD & RUN
Rust (for the codec):
    cd ../rust
    rustup run 1.81 rustc -O variants/vc65.rs -o vc65     # 1.81 pinned; any rustc gives identical bytes
    ./vc65 <file> 10                                       # prints bpc_total, restore, comp_sha
Python 3 (for the rime/addressing/trime layer): each script is standalone, integer-only:
    python3 rime_sphere.py          # one generator regenerates the whole sphere
    python3 rime_dimension.py       # 27 glyphs = 1 rime dimension; CRT-stack coprime dims
    python3 rime_fischer.py         # Pohlig-Hellman discrete log (the "Bobby Fischer")
    python3 rime_fischer_cluster.py # CLUSTERED + TRINARY Fischer: one worker per prime tower, CRT fan-in
    python3 rime_prism.py           # 27-point integer NTT, byte-exact round trip
    python3 rime_trimeset.py        # trime digits {-1,0,+1} -> trime-sets on the sphere
    python3 rime_holdout.py         # honest test: fraction predicts 83.7%, exact recovery costs residual
    python3 rime_scaling.py         # the receipt-backed scaling fit
    python3 rime_bpc.py             # the two-axis verdict (addressing ~0 vs compression >= Shannon)

## THE BOBBY FISCHER CLUSTER (rime_fischer_cluster.py) — the parallel architecture
Pohlig-Hellman is embarrassingly parallel: one independent solver per prime-power tower of
p-1, combined only by CRT at the end. So it maps directly onto n nested clusters / HTTP
cells (the SGRAM stateless-cell pattern): one node per rime, CRT fan-in by a coordinator.
The 27-tower solves in TRINARY — three balanced-ternary digits {-1,0,+1} (the trime digits),
each found by cascading away the known ones (the trilateral / "trime time" solve).
BOUNDARY: this parallelizes ADDRESSING of a *smooth* sphere (generated structure). It does
not compress arbitrary data, and a single large prime tower is one indivisible hard node —
no cluster count breaks the discrete-log wall (that is the security gate, Law 14).

## THE HONEST GATES (please keep these; they are what make it real)
- Law 6 (Conservation): every transform is a lossless change of basis (rate 1.0). No
  sub-entropy compression of arbitrary data. Ever.
- Law 7 (Shared-Center Gate): the reductions fire only on genuinely shared structure;
  independent sources EXPAND (measured 0.96x).
- Law 15 (Freeze): address generated structure O(1); arbitrary data must be stored at entropy.
- Law 18 (DPI ceiling): generation derives the family consistent with the data, never more
  information than the data holds.
- Rule earned this session: **no number enters a headline until its artifact exists on disk.**

## FILES
JESSE-LAWS.md — the 27 laws (0-26 = 3³, the ledger closes on its own cube) + the
corrected bpc VERDICT. Laws 23-26 are the four frozen slice agents (Fischer, MTP,
HRM, MCP), demoed with receipts in rime_agents.py / rime_agents.txt; Law 22 (the
Law of Recreation) is measured two-armed in rime_cascade27.py / rime_cascade27.txt.
FULL manifest with SHA256 of every file: ../FULL-DISCLOSURE/FULL-SYSTEM-MANIFEST.txt
Public corpora (not bundled; verifiable): enwik8 sha256 2b49720e…, enwik9 sha256 159b8535…
(from http://mattmahoney.net/dc/).
