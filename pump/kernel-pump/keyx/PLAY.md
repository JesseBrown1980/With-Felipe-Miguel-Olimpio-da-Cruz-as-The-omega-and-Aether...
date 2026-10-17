# THE 3.1 KB KEY — and how bobby and the mtp agents play it

Operator: Jesse Daniel Brown. Assembled 2026-07-27 on his instruction:

> "we just needed to save the 3.1 kb.key and IT with bobby and the mtp agents will play it"

This package is **145 KB and contains no corpus**. That is the point. The corpus is
regenerable and is not the deliverable. The key is.

## The key

`key/prior3174.bin` — **3,174 bytes** (3.099 KiB).
sha256 `1be91cb748b2b364c1f9f4dca1e7a89bcd8840e5e179e494dc611452be6556fd`
Provenance: `enwik8[90,000,000 .. 90,003,174)`, verified by direct search this run.
Sized deliberately to the hyperbech HEAD payload.

It is a key in the literal sense. `cm3ti_gt256.rs:461` reads it via `RB_PRIOR` and runs
`warm()` **symmetrically on both compress and decompress** before coding. It never enters
the stream. Both sides must hold the same 3,174 bytes or nothing decodes.

`key/KEY-3174.hbp` is the full receipt: provenance, every measured row, the laws, the
documentation error found and corrected, and what is still open.

## The players Jesse named

**bobby** — the rime Bobby Fischer, Law 23. Pohlig-Hellman discrete log on the sphere.
It *addresses* any single element in O(1), one modular exponentiation, without
materializing the object it belongs to. `players/rime_fischer.py`,
`rime_fischer_cluster.py` (one Fischer per prime tower, CRT fan-in), `rime_27fischers.py`
(27 spheres circling the free 0). Re-run this seat: every target reached, byte-exact
invert True.

**the mtp agents** — Law 24. Frozen multi-token prediction, lookahead ×1 / ×3 / ×27,
direction − (backward) / 0 (hold) / + (forward). `players/rime_agents.py`. Re-run this
seat and every logged number reproduced exactly: 0 = 1.0000 (the free center — costs
nothing, says nothing), + ×1 = 0.3517, ×3 = 0.0667, ×27 = 0.0000, − ×1 = 0.3317.

HRM (Law 25, two-rate hierarchy, frozen bpc 3.5328) and MCP (Law 26, stateless cells ×
CRT fan-in, M = 4,814,857, byte-exact) are the other two of the four and are in the same
file.

## Playing the key

```
python3 players/play_the_key.py /path/to/enwik8
```

Freezes the MTP order-2 table **on the 3,174-byte key alone** and measures it on held-out
`enwik8[20,000,000..20,600,000)`, against three controls. Output is in
`receipts/play_the_key.txt`:

| arm | train B | contexts | coverage | +×1 raw | +×1 covered | +×3 | +×27 | −×1 |
|---|---|---|---|---|---|---|---|---|
| KEY | 3,174 | 508 | 0.7967 | 0.2070 | 0.2598 | 0.0288 | 0.0000 | 0.2092 |
| ADJACENT | 3,174 | 557 | 0.8195 | 0.2245 | 0.2739 | 0.0338 | 0.0000 | 0.2235 |
| RANDOM | 3,174 | 3,104 | 0.0605 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| BIG | 500,000 | 4,062 | 0.9932 | 0.3523 | 0.3546 | 0.0735 | 0.0000 | 0.3645 |

**The key is 0.63% of the bytes and delivers 58.8% of the ×1 predictive power.** It covers
79.67% of held-out contexts. Random bytes of identical size score zero on every column —
noise is not a weak prior, it is a harmful one.

## What the key does in the compressor, honestly

All rows: `slice10M.txt` = `enwik8[20,000,000..30,000,000)`, binary `cm3ti_gt256`, mode
`g:256:64:8`, k=10, N=10,000,000, `decoder_src` 26,377, every row `restore=OK`.

| arm | prior B | payload | saving | charged total | bpc | verdict |
|---|---|---|---|---|---|---|
| baseline | 0 | 2,285,979 | — | 2,312,356 | 1.8499 | reference |
| **KEY** distant | 3,174 | 2,285,400 | 579 | 2,314,951 | 1.8520 | loses by 2,595 B |
| 31,740 distant | 31,740 | 2,283,602 | 2,377 | 2,341,719 | 1.8734 | loses |
| 317,400 distant | 317,400 | 2,275,161 | 10,818 | 2,618,938 | 2.0952 | loses |
| 3,174,000 distant | 3,174,000 | 2,248,610 | 37,369 | 5,448,987 | 4.3592 | loses badly |
| 317,400 **adjacent** | 0 charged | 2,272,589 | 13,390 | 2,298,966 | **1.8392** | wins, free |
| 3,174,000 **adjacent** | 0 charged | 2,244,493 | 41,486 | 2,270,870 | **1.8167** | wins, free |
| 317,400 noise | 317,400 | 2,299,064 | −13,085 | 2,642,818 | 2.1143 | hurts before charging |

Return rate falls monotonically with size — 18.24%, 7.49%, 3.41%, 1.18% — fitting
saving ∝ S^0.603. Break-even needs saving ≥ S, which holds only below about 44 bytes.
**A shipped distant prior of any useful size cannot pay for itself in a single monolithic stream** — but under sectioning it does, after 5.31 sections (ERRATA-1). The 3.1 KB key


has the best return rate of the whole ladder and still loses, because it is charged.

The adjacent arm is the one that wins, and it wins because in a sectioned decode the
decoder has already rebuilt those bytes — it ships nothing, so its whole saving is net.
Verified this run, not taken on trust: `priorPREV3174000` = `enwik8[16,826,000..20,000,000)`,
ending exactly where `slice10M.txt` begins at 20,000,000. Contiguous, byte-exact.

**1.8167 is real under sectioning and only under sectioning.** That is an architecture
commitment that has to be written into the decoder and demonstrated end to end before the
number is quoted anywhere.

## On Jesse's sentence, both halves

> "It's mathematical. It doesn't matter what picture you feed it. As long as you divide it
> up into pieces, it's gonna eat it."

*"Doesn't matter what picture"* — refuted. Same 317,400 bytes of xz noise made the payload
13,085 B **worse than feeding nothing at all**, and the MTP play above shows why: random
bytes cover 6% of contexts and predict nothing.

*"As long as you divide it up into pieces"* — confirmed. That is the adjacent arm, and it
is the only arm in the entire sweep that goes net-positive. Sectioning is what makes the
prior free, and free is what makes it win.

He was also right to reject the first refutation. One point is not a curve. The curve says
the mechanism is real and the **accounting** is what kills the shipped version — a
distinction that only appeared because he pushed back.

## A cheap screen that fell out of this

Distinct frozen contexts per training byte: KEY 0.160, ADJACENT 0.176, RANDOM 0.978,
BIG 0.008. The random arm produces nearly one context per byte — nothing repeats. English
collapses into few, frequent contexts. So **context count is anti-correlated with
usefulness**, and a candidate prior can be screened in O(n) on the prior alone, with no
corpus and no compressor run, in milliseconds. High contexts-per-byte means it will hurt.
This should gate every prior before a two-minute compressor arm is spent on it.

## Correction to the source comments

`run_prior_sweep.sh` describes `prior317400.bin` as `enwik8[90,000,000..]`. It is not.
`prior31740`, `prior317400` and `prior3174000` all begin at offset **94,371,840** — that is
90 MiB, not 90,000,000 decimal. Only `prior3174.bin` is at 90,000,000. So the key is **not**
a prefix of the larger priors and the four sizes are not a nested series; the first point
changes content as well as size. Verified: `head -c 3174` of all three larger priors hashes
to `fc2aa2a2f0cfd250`, the key hashes to `1be91cb7…`. The trend survives on the three nested
points, but the 3,174 row must be labelled off-curve by provenance.

---

# ERRATA

Amendments to the law text above. Each entry states what the law said, what was measured,
what the text now says, and why. The law body is amended in place so it does not
contradict itself; the superseded wording is preserved here and nowhere else.

## ERRATA-1 — the shipped-prior law (IV.4)

**Superseded wording:** *"no shipped distant prior of any useful size ever pays for
itself"* / *"A shipped distant prior of any useful size can never pay for itself."*

**Scope of the original measurement:** prior size swept at ONE fixed target (slice10M).
Return rate 18.24% / 7.49% / 3.41% / 1.18%, saving ∝ S^0.603. Correct within that scope.

**What was measured 2026-07-27** (`measurements/play_hutter.py`, receipt
`FABLE5-KEY-PAYS-SECTIONED.hbp`), order-2 adaptive model + 32-bit range coder, key warmed
symmetrically and never in the stream:

*Sweeping the TARGET instead of the prior, at fixed 3,174 B* — the saving **saturates**:

| N | 50,000 | 100,000 | 200,000 | 400,000 | 800,000 |
|---|---|---|---|---|---|
| saving (B) | 626 | 649 | 699 | 726 | **727** |

Fit exponent 0.059. On one stream break-even is 3.4×10¹⁶ B — never. **The original
conclusion holds for one monolithic stream.**

*Sectioned, key charged once* — the transient recurs:

| 12 × 100,000 B | payload | +charge | total | bpc | net |
|---|---|---|---|---|---|
| baseline | 524,051 | 0 | 524,051 | 3.4937 | — |
| KEY `prior3174` | 516,880 | 3,174 | 520,054 | 3.4670 | **−3,997 WINS** |
| MYTHOS key | 517,547 | 3,174 | 520,721 | 3.4715 | **−3,330 WINS** |

Per-section saving 598 / 542 B. **Break-even 5.31 sections. 36/36 round-trips
byte-exact.** At enwik9 with 100 KB sections: **+5,972,659 B** and **+5,416,826 B**.

**Limit that also holds:** the RANDOM arm still hurts before charging (−102 B). A good
prior amortises; noise does not become good by being sectioned.

**Why the text was amended rather than annotated:** an unconditional sentence with a
contradicting footnote is a law that argues with itself. The generalisation was the
error, not the measurement, so the sentence now carries its scope.
