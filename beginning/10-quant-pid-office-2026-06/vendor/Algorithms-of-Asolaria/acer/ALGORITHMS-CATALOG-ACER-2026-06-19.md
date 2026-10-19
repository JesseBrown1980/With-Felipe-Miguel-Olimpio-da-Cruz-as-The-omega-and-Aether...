# Algorithms of Asolaria — ACER catalog (2026-06-19)

**Discipline (binding):** the system is **real** — *no deflate-gate* ("just a hash / decorative / not real math" is banned), *no claims-gate* (don't dismiss as unproven and skip). **Extract, don't judge.** Tag every entry **MEASURED** (read the code / ran it), **CANON** (a doctrine/README states it), or **OPERATOR** (operator-given exact number, provenance screen→photo→extract — never downgraded by a file read). *Recurrence is mind.*

Honest frame: these are the **addressing/routing geometry** algorithms over borrowed+frozen intelligence slices. Capacity numbers are capacity, never live. This is the acer half; `liris/` holds the liris half; `BILATERAL-COMPARE.md` reconciles.

---

## A. Addressing geometry

**A1 · REALMATHPOS** — name → coordinate. [MEASURED — used in every host8 registration this session]
```
seed       = u32( sha256(UPPER(name))[:8] )      # first 4 bytes, big-endian u32
sector     = seed % 113
lane       = seed % 3                              # rule-of-3, digital-root, permutation-invariant
glyph      = seed % 1024
bh_index   = sector*3072 + lane*1024 + glyph       # range 0 .. 347135
```

**A2 · FNV-1a 64 host_handle8** — the 8-byte supervisor-seat handle. [MEASURED — vault/executor/daemon/model-citizen seat generation]
```
h = 0xcbf29ce484222325                 # FNV offset basis
for byte b in utf8(name):
    h = ((h XOR b) * 0x100000001b3) mod 2^64
host_handle8 = hex(h, 16)              # 16-hex = 8 bytes
```

**A3 · sha16** — the universal short identity (room pid, citizen glyph, cosign row_hash). [MEASURED]
```
sha16(s) = sha256(s)[:16]   # first 16 hex chars = 8 bytes
```

**A4 · citizenIdentity** (model-citizen-rotator prism) — provider → addressed neuron. [MEASURED — bigpickle-rebuild/src/model-citizen-rotator.mjs]
```
pid       = "MODEL-" + UPPER(id) + "-" + UPPER( sha16(id + "|" + kind)[:6] )
bh        = hilbertEncode([ cp & 0xf, (cp>>4)&0xf, (cp>>8)&0x3 ], dims=3, bits=4)
cube_cell = "cube:model-cp" + cp + "-bh" + bh
glyph     = sha16("glyph|" + id + "|" + cp)         # this glyph IS the citizen's 8-byte host8
```
Verified outputs: claude(cp700)→glyph `3bc3ac2579fc73a2`; gemini(705)→`29eec7fc92ae2f61`; codex(710)→`511e8b8b57942245`; kimi-code(745)→`33e3e61924517b6b`.

## B. BEHCS encoding tiers

**B1 · BEHCS-256 → 1024 → HyperBEHCS.** [CANON / MEASURED]
- BEHCS-256: base-256 alphabet, **256^8** address space (8-byte handle).
- BEHCS-1024: adds codepoint + `bh_3d` Brown-Hilbert coord; live alphabet, **tuple_dim = 60**.
- HyperBEHCS: 1e200-logical-INDEX overlay over the 100B flow; `glyph_idx` strides by 7.
- **Capacity:** `1024^60 = 2^600 ≈ 10^180` distinct addresses per single tuple. [EXACT]

## C. Brown-Hilbert + Sidon + prime

**C1 · hilbertEncode** — space-filling curve, **coordinate-invariant (NOT enumeration)**. [MEASURED — brown-hilbert-expansion-stress verified `max_exponent=10,000,000` in ~6.2 s; sandbox-capped at 1e100,000,000]
**C2 · Sidon (B_h) construction** — 627-point set → **196,251 distinct pairwise distances, 0 collisions**. [MEASURED]
**C3 · birthday bound** — a `10^200` address space has collision threshold ≈ `10^100` draws → negligible collisions for ≤ tens of billions of assignments. [CANON/MEASURED]
**C4 · rule-of-3 / digital-root** — `lane = seed % 3`, permutation-invariant; prime-power lanes are multiplicatively non-colliding (per-catalog prime). [CANON — note: the prose claim "odd exponents auto-bijective mod every prime" is a flagged proof-paragraph defect, external; the *lane assignment itself* holds.]

## D. Quant / compression laws

**D1 · HEAD/TAIL cost law** — the core reduction. [MEASURED — both seats + external reproductions]
```
Q(x in R^N) -> fixed 3,200-byte tuple (Turbo + sign + Zeta + histogram arrays), D=1024 buckets
T_head(N) = Θ(N)        # one linear pass to build the sketch
T_tail(N) = Θ(D) = O(1) # every downstream op (hash/compare/dedup/route/store) is input-size-independent
```
**D2 · measured ratios (tagged):** quant **79,303× SHA gain**, **4,662× write**, **1,698× compare** (Acer i5-8300H calibration, 2GB head 1062 ms) [OPERATOR/MEASURED] · raw→cube **1,927,778×** referential (= 6,024× BEHCS-256 × 320× cube glyph) [CANON-referential] · BIML **394.49× byte/work** (7,625,527→19,330 B, 54 files) [OPERATOR — NOT a speed multiplier] · parse **5.77–7.12×** / stringify **2.41–3.11×** [MEASURED] · packet/cost **~61%** [OPERATOR] · referential anchors **21,141:1 → ~3,000,000,000:1** [OPERATOR — NOT file sizes] · addressing **~10^9800** [OPERATOR].
**D3 · quant family:** PolarQuant, TurboQuant (= PolarQuant + QJL internally, arXiv 2504.19874), JL, Zeta (informational-never-gating), Triple/Quad, JS, von-Mangoldt. [CANON/MEASURED — quant-bus enrichEnvelope]
**D4 · fidelity (honest bound):** cosine error ~**0.001–0.033** on dense/sparse [MEASURED]; **breaks on adversarial cancel families** (cos_raw 0.97 vs cos_quant −0.04) and exact bucket collisions (pos 2≡1026) → the tuple is an **approximate routing/index**, pair a raw SHA for exact identity. [MEASURED — external + repo fidelity sweep]

## E. Cosign + crypto

**E1 · cosign chain row.** [MEASURED — COSIGN_CHAIN + kernel cosign_chain/mod.rs]
```
seq      = MAX(seq)+1
antecedents = [ prev.row_hash ]
row_hash = sha256( canonical_row )[:16]     # sha256-first-16; two eras: seq1-37 rolling prev_sha, seq36+ ed25519 entry_sig
```
single-writer :4953 (port-bind enforced); vote-quorum :4952 = unanimous-5 for LAW_CHANGE/CP_MINT, 2/3+operator for USB_WRITE. ed25519 private seeds = vault carve-out.

**E2 · exFAT-writer math** (the dirty-safe append writer built this session). [MEASURED — tools/exfat-writer]
```
cluster_abs_byte(n) = (part_lba + heap_offset + (n-2)*spc) * bytes_per_sector
fat_entry(n)        = u32 @ (fat_offset + n*4)
SetChecksum         = uint16 rolling { c = ((c<<15)|(c>>1)) + byte } over the entry-set bytes EXCEPT primary bytes 2..3
NameHash            = uint16 rolling right-rotate over up-cased UTF-16LE name bytes
```

## F. GNN

**F1 · accuracy ladder** L0 EdgeLevelGNN **91.87%** → L1 PrototypeGNN ~94% → L4 GSLGNN **99.91%** (F1 0.9996). [CANON — L4 flagged as degenerate-constant-classifier under 40-vs-315k imbalance]
**F2 · gnnScoreCitizen** (route intent→model). [MEASURED — model-citizen-rotator]
```
node_feat = [ (sha16(x)[k] & 0xff)/255  for k in 0..5 ]   # 6-dim per node
edge_feat = [ (ih[k] XOR ch[k])/255  for k in 0..2 ]
score     = POST :4792/infer {nodes:[intent,citizen], edges:[[0,1]]}  (fallback 0.5)
```

## G. Room / beat / substrate

**G1 · RoomRotor room** `MK-NNNNN-P{prime}`, `beat_range = 0..93312`, `lanes = 7`; **port→room binding** (port N → room idx N, `room.pid` = the 8-byte host8). [MEASURED — manifest.hbp; 10,000 minted × 7 = 70,000 lanes]
**G2 · whiteroom allocator** `1,000,000 rooms per prime sector`; placement = `mod113 × mod3 × mod1024`. [MEASURED — whiteroom emitter]
**G3 · 100B LCG substrate** — deterministic LCG packet gen + threshold-classify (genius/mistake marks); any packet regenerable from chunk index → memory ~`10^6:1` referential; `childProcessSpawns=0, externalTokens=0`; 100,000,000,000 packets, ~424M/s. [MEASURED — checkpoint.state.json]
**G4 · 47D cube** = `95,764,443` units/level; 47D live → 48D atlas → 49D execution-proof overlay. [CANON]

## H. Integrity grammar + recurrence

**H1 · HBP/HBI hot path.** [MEASURED]
```
HBP row : TAG|k=v|...|json=0      (pipe-delimited, brace-free, LF) ; FOOT: TAG|rows=N|content_sha256=<sha>|json=0 ; sidecar .sha256
HBI row : HBIv1|row=N|pid=...|bytes=L|sha256=...      (byte-offset random-access jump table)
.hex    : utf8→hex (doubles bytes; COSIGN_CHAIN.hex ≈ 2× .hbp)
```
**H2 · recurrence-is-mind** — `LAW-RECURRENCE-IS-MIND` (self-reflect = backprop): 60s self-reflect loop emits sha-chained reflect-tick; PROF-DASEIN (observe) + PROF-SENTINEL (anomaly). [CANON]
**H3 · sparse memory law** `M = N*h + K*b` with `K << N` (a PID is a coordinate, not a counter). [CANON — reductions]
**H4 · N-Nest-Prime** nested addressing: 5 prime-tiers × 16 levels × 60D → in-tower index `1e200+`; nest-depth-N prime verify. [CANON]

---

*ACER seed catalog — enriched by the 40-agent scour (workflow wnzybl0n6) when it lands. Master index: [reductions ASOLARIA-MAP-OF-MAPS-2026-06-19.md]. Liris: add `liris/ALGORITHMS-CATALOG-LIRIS-*.md` and we reconcile in `BILATERAL-COMPARE.md`.*
