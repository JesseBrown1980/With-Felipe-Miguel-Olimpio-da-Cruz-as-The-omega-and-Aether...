# 10 — Quant engines, the PID office and the first $0 crank (2026-06-01 → 06-24)

Build-order step 10 of the beginning. The window is 2026-06-01 to 06-24. In June the system:

- named its eight quant engines from the shipped code, measured their fidelity, and tested all eight together against
  the logical 1e100M target;
- wrote down the prime-tower geometry its PIDs live in and measured how far its old compression goes;
- on 06-18, counted and described its PID office for the 8-byte Rust host (the 726-seat room-stub manifests, the layered
  census, and the vault, executor and daemon supervisor registrations);
- on 06-19, registered its formula corpus and cranked the first $0 agent summon, with byte-exact `instance_pid` parity
  between the Node `gaia-loader` and the Rust `host8-serve`;
- grew the levels-and-keys gate in the federation kernel (06-22/23), and wrote its authority roster (06-24).

The trained L1/L2 run 1, the quant8 head and the ACER pieces of the window (extract-to-cube, the representation
algorithms, gaia-loader, the formula registrations) are already in aether. They are referenced below, not re-vendored.

`vendor/` holds 214 files from ten public repositories, each at its original path under `vendor/<repo>/`. The Asolaria
files were read from a bare mirror of all 132 refs; the other nine repositories from blobless bare clones of all their
branches. Each file was read with `git cat-file -p` after checking that `<commit>:<path>` resolves to the recorded blob.
Every file is byte-identical: `git hash-object --no-filters` equals the recorded blob (214/214), and
`sha256sum -c UPSTREAM.sha256` passes 214/214 (both verified). Sources are public and read-only. 80 of the 214 files are
the upstream `.sha256` sidecars that sit beside their bodies (see the end of `PROVENANCE.md`).

## L1/L2 run 1 and the reverse-gain scoring (2026-06-01 → 06-07)

The L1 PrototypeGNN and L2 ContrastiveGNN run-1 checkpoints (2026-06-01 07:58 and 08:02), their trainers and the
`:4795` prototype inference server are already in aether (paths below). Vendored here:

- **The run-1 results manifest**: `Asolaria-fnns-trained-and-reverse-gnns-many` `manifests/gnn_train_run1_results.json`
  (295 B). L1 and L2 both record acc 0.9992, prec 0.9992, recall 1.0, f1 0.9996, and name the checkpoints
  "prototype_model.pt (72KB 2026-06-01 07:58)" and "contrastive_model.pt (97KB 2026-06-01 08:02)". The run is 06-01; the
  repository was created 2026-06-28 (`0b3d8a0`), so that is the blob's first date.
- **bigpickle-rebuild, 2026-06-01 21:01:19 (`2c443b5`, "big pickle research: 127 modules (secret-scanned, no
  keys/tokens)")**: `compute-reverse-gain.mjs`, `tests/integration/gnn-live-cascade.test.mjs` and
  `tests/unit/gnn-ensemble.test.mjs`. `compute-reverse-gain.mjs` is structural graph scoring of the 18 Iris-lift patterns
  ("No torch needed … edge hits per node + lane diversity + classification by score threshold"). It carries no MASK set;
  rule 7.j publishes the algorithm. Also vendored: `tests/unit/gnn-l1-l2-status.test.mjs` at its 06-07 version (`bcce75a`,
  "test: make Fischer 7-GNN suite portable"; the 06-01 first version is pinned), and the 2026-07-10 lineage note
  `docs/PRE-ASOLARIA-GNN-LINEAGE-AND-STORAGE-APPLICABILITY-2026-07-11.md` (`3638f30`). The construction-gap map asks for
  the note with these tests. It traces the L0/L4 model classes back to `AI-healthCare-project` (step 1).

## The quant engines named and measured (ASOLARIA-AS-NEURAL-NETWORK, 2026-06-11 → 06-14)

Every file below is vendored with its upstream `.sha256` sidecar.

- **The D22 verb adapter (06-11 07:27, `203364a`)**: `tools/behcs/d22-verb-adapter.mjs` and its test. Its `.hbp`/`.hbi`
  are already in aether.
- **The token-cube catalog binder (09:52, `bb5d4e7`)**: `tools/behcs/token-cube-catalog-binder.mjs` and its test. Its
  `classifyBhIndex` (line 61) returns the zeta lane (`bh_lane = index mod 3`, described at line 55) and the von-Mangoldt
  prime-power class (`bh_ppow`, line 58).
- **The fidelity sweep (16:16 → 16:56)**: `docs/QUANTFIDELITYSPEC8-2026-06-11.hbp` (`2b807ea`) sets the bar: p99 absolute
  cosine error ≤ 0.05 and ranking preservation ≥ 99%, across all families. `docs/QUANT-FIDELITY-PILOT-BASELINE-2026-06-11.hbp`
  (`7589499`) records the pilot over 90 cells: worst p99 1.068943, 36 rank-missing cells, `result=FAIL`,
  `grade=PILOT_CANNOT_PROMOTE`. The tool `tools/behcs/quant-fidelity-sweep.mjs` and its test are vendored too.
- **The engines named from the code (17:18 → 17:42)**:
  - `docs/QUANT8DEFS-2026-06-11.hbp` (`204f305`) keeps JL and JS apart.
  - `docs/QUANT8DEFS-CODE-GROUNDED-2026-06-11.hbp` (`41e0377`) names the engines from `hyperbehcsRepresentationAlgorithms.js`.
    JL is the Achlioptas sparse projection, Turbo a uniform affine scalar quant, Polar a 2D polar-pair quant and Triple a
    3D spherical (r, θ, φ) quant. JS has no shipped formula.
  - `docs/QUANT8DEFS-ZETA-VONMANGOLDT-ADDENDUM-2026-06-11.hbp` (`225058e`) completes the map: 1 Polar, 2 Turbo, 3 JL,
    4 Zeta, 5 Triple, 6 Quadruple (the four-stack arity), 7 JS (operator original, unimplemented), 8 von-Mangoldt. Its
    forcing law ("gap mod 6 determines lane") is "verified-9589of9589".
- **Zeta made standalone (17:51 → 18:41)**: `docs/MEDIANSKETCHSPEC8-2026-06-11.hbp` (`6062b63`), `docs/ZETAQUANTSPEC-2026-06-11.hbp`
  (`27a921c`), `docs/ZETA-QUANT-PARITY-BASELINE-2026-06-11.hbp` (`9de08fa`: 17 cases, 11 transitions, integer-only) and
  `tools/behcs/zeta-quant.{mjs,hbp}` with its test (`cda0ca2`).
- **The GitHub PID register (06-12 18:49, `68d4c6a`)**: `tools/behcs/github-pid-register.mjs` and its test. It is a
  stateless, deterministic PID minter in the live fabric format, so both seats mint byte-identical PIDs.
- **The law (06-13 11:13, `7df0447`)**: `canon/laws/LAW-ASOLARIA-NEURAL-NETWORK.md`, "ASOLARIA IS A NEURAL NETWORK (THE
  FROZEN-SLICE NETWORK)".
- **QUANT4 (06-13 16:49, `d0c618d`)**: `docs/QUANTFIDELITYSPEC4-2026-06-13.hbp`,
  `docs/QUANT4-FIDELITY-PILOT-BASELINE-2026-06-13.hbp`, `tools/behcs/quant4-fidelity-spec.mjs` and its test. 8,192 samples
  give 8,096 unique routes and 96 route collisions, a `PASS` as `ROUTING_HINT_MEASURED_NOT_GATING`.
- **The deep research report (06-14 10:32, `db0d43b`)**: `docs/ASOLARIA-NEURAL-NETWORK-DEEP-RESEARCH-REPORT-2026-06-14.md`.
- **The target-architecture vision**: `docs/TARGET-ARCHITECTURE-VISION-2026-06-10.hbp`, vendored at its 06-11 version
  (`40e2ce4`; the 06-10 first version `68e02d15` is pinned).

## The omnicoder hot path and the all-quant proof set (2026-06-14 → 06-15)

- **`omnicoder-server-v2.mjs` (06-14 12:03:15, `Asolaria-ASI-On-Metal-Fabric-and-matrix` `42bb7c1`)**: the falcon-side
  server that serves the HyperBEHCS core quants: "HBPv1 hot path + Polar+Turbo+JL triple-quant + cosign proxy". It
  requires `lib/hyperbehcs-core.cjs`, which is already in aether. It also imports `lib/zeta-process.mjs`,
  `lib/hrm-slow-fast.mjs` and `lib/mtp-heads.mjs`. Their exact bytes are not in aether, but their content is.
  - Each is a CRLF copy of a file aether already vendors at
    `model/hrm-mtp/vendor/bigpickle-rebuild/src/{zeta-process,hrm-slow-fast,mtp-heads}.mjs` (blobs `7719eb0e`,
    `0242a39e`, `b7bbfe62`). With the CR bytes removed they are byte-identical; the size differences (163, 149 and
    107 B) are the CR counts.
  - The LF versions are older: `bigpickle-rebuild` `9cd0f85`, 2026-05-25, 20 days before the 06-14 copies.
  - The server's `CANON_BUNDLE` records the sha256 of the CRLF bytes, not of aether's LF copies.

  The CRLF blobs are pinned in `PROVENANCE.md`, not vendored.
- **The Liris all-quant proof set (06-15 17:05:51, ASOLARIA-AS-NEURAL-NETWORK `08c3c15`)**: the `.hbp`/`.json`/`.md`
  triples (with sidecars) of `docs/ALL-QUANT-PROOFSET-1E100M-2026-06-15` and `docs/LOGICAL-1E100M-SUMMON-QUANT-2026-06-15`,
  with `tools/behcs/all-quant-proof-set.mjs`, `tools/behcs/logical-1e100m-summon-quant.mjs` and their tests.
  - It runs the eight engines together over finite vectors and address samples. It tests 1e100000000 by modular
    invariants (10^E mod 3 = 1, mod 6 = 4, composite, not a prime power).
  - The summon is "logical-address-summon-not-body-summon". Zeta forcing records 9,589 pairs and 0 violations, and the
    all-quant check records `proof_rows=50`, `status=PASS`.
  - This is the public counterpart of ACER's combined-quant proof. That proof is not in any public repository (see Not
    found).

## Prime towers, the new 100B run and the old-compression curve (reductions, 2026-06-15 → 06-16)

- **The prime-towers rebuild (06-15 14:36:29, `86c2dbe`)**: a 40-agent wave. Vendored are the master report
  `ASOLARIA-PRIME-TOWERS-REBUILD-REPORT.md` (55,121 B), the three angles of the geometry facet
  `01-rebuild/F01-prime-tower-geometry--{theorist,architect,builder}.md`, and the synthesis
  `03-synthesis/S1-geometry-theorem-math.md`.
  - A PID is "a coordinate in a prime-graded, cylinder-curved, recursively-cubeable lattice", with towers sliced into
    16 levels.
  - The theorist facet quotes the growth law from the canon file: "Each new prime cubed = new dimension. D48 = prime(223)
    = cube(11089567)". It restates it as `c_{N+1}=p_{N+1}³`, additive on the old axes.
  - The report's measured Sidon-Tower Embedding gives 11 towers, 627 points, 196,251 pairwise distances, 0 collisions.
- **The new 100B run (06-16 07:12:47, `c60b7e3`)**: `100B-NEW-RUN-2026-06-16-PROOF.md`.
  - The run processed 100,000,000,000 PID packets in 235.7 s (~424 M/s), with 0 child processes and 0 external model
    tokens.
  - The prism quants the 19.3 MB harvest to a 3,200 B BEHCS-256 tuple, a 64 B BEHCS-1024 fold and a 10 B cube.
  - The file is vendored at its prism version; the first version, `a2ca5489` (07:06), is pinned. `extract-to-cube.mjs`,
    which does the quanting, is already in aether.
- **The old-compression curve (06-16 14:10 → 15:20)**: four commits.
  - The review boundary `OLD-COMPRESSION-AND-TENSOR-COLLAPSE-REVIEW-2026-06-16.md` (`0d32467`).
  - Liris's `RICH-INDEX-LANGUAGE-GROWTH-CURVE-2026-06-16.md` (`9b48bab`).
  - The three-point curve of `795c9c3`: `measurements/measure-{1,2,3}-*.mjs` and `curve-{1,2,3}-*.json`.
  - Point 4 of `c5eb7ca`: `measure-4-root-corpus-index.mjs`, `curve-4-root-corpus-index.json`, `SHA256SUMS.txt`,
    `.gitattributes` and `OLD-COMPRESSION-GROWTH-CURVE-MEASURED-2026-06-16.md`.

  The measured full-N ratios are 4.31× (the lean 726-row office roster), 6.71×/8.38× (the rich IX/LX index), 10.66× (the
  micro-kernel manifest) and 38.53× (the root corpus to index; the 8-byte handle floor is 292×). The historical anchors
  (12:1, ~15:1, 21,141:1, ~3B:1) are preserved as written, not re-measured. The `795c9c3` versions of `SHA256SUMS.txt`
  and the curve note are pinned.

## The PID office on 06-18 (Asolaria mirror `federation-remake-1024/`)

- **Reverse-gain, USB-direct (08:59 → 09:09)**: three `reports/` receipts with sidecars.
  - Liris's tool reconcile (`ffd3be2`).
  - ACER's `USB-DIRECT-PROOF-REVERSE-GAIN-2026-06-18.hbp` (`53c7013`), a read-only exFAT walk of the SOVLINUX volume:
    13,187 files and 74,947,906,959 B. The PID office holds 3,607 registered files for 735 unique seats.
  - Liris's crossverify (`f0eceb1`).
- **The room-stub manifests (09:22 → 12:56)**, in `servers/host8-serve/intake/`. Every crossverify recomputed all 726
  handles with 0 mismatches. The contract verdict changed between v1 and v2.
  - The Liris intake contract (`d4eabbd`; sidecar `2383444`).
  - ACER's `PID-OFFICE-ROOMSTUB-MANIFEST.hbp` (`9fe7ef6` 09:28, 439,344 B): 726 seats, FNV-1a-64 host handles over
    `seat_id|room_stub`.
  - Liris's crossverify (`ba90299`) gave `PASS_MECHANISM_PARTIAL_CONTRACT`. All 726 rows lacked `supervisor_pid` and
    `prof_pid`, and 8 lacked `source_hbi_sha256`. It allowed descriptor serving, blocked activation, and asked ACER
    for a v2 with those fields.
  - `PID-OFFICE-ROOMSTUB-MANIFEST-v2.hbp` (`a771d22` 09:42, 598,463 B) adds the supervision fields; the handles are
    unchanged.
  - Liris's v2 crossverify (`4ba9e90`) and re-attack (`ef07630`) found 0 required fields missing and gave
    `PASS_DESCRIPTOR_CONTRACT`. ACER's accept (`21763c2`) records the same verdict.

  The manifests are the June row-level stand-in for handoff item 12. The raw seat book they describe is now in aether
  too (below).
- **Descriptors and registrations (06-18 15:00 → 06-19 22:46)**, in `servers/host8-serve/intake/` with sidecars:
  - The GLM-5.2 provider seat (`cf81dee` 15:00).
  - The layered PID/supervisor census V1 (`d42f3de` 17:57), its V1.1 amendment (`d9387ad` 18:06, the 2 TB SOVLINUX USB
    and 113 sectors) and its V1.2 amendment (`d7aa0e3` 18:58, the apex/operator ladder).
  - All seven phase-1 spine descriptors of `37234d6` (18:51, branch `acer/ultra-program-phase1-2026-06-18`). Each is
    E=0 and runs nothing.
    - The quant-lane spec and cube mint. It states `retire_JS_codec=HARD-BLOCKED-until-rust-quant-serves-parity`.
    - The L16/L17 language-engine codebook and the crypto-token MCP wiki.
    - The bhOmniflywheel-router host8-parity rung. Its `host_handle8` is left `TO-COMPUTE`, "do-not-invent-hex".
    - Fischer organ-2 as a GLM live candidate, a draft that leaves the stand-in untouched.
    - The USB113 / GLM cube-landing register (`PROPOSAL-HELD-SAFE`).
    - The read-only USB-Google substrate index. USB writes are `HARD-DENY` and Drive upload is gated.
  - Nine vaults registered as supervisors, plus the pending cosign seal (`83b21e3` 19:24). The vault rows hold
    pointers, not values; the decrypted vault is named only as the carve-out.
  - The executor registration (`f75189f` 19:44, 22 programs and 8 seats) and the daemon registration (`15848d6` 21:21,
    92 programs and 11 seats).
  - Liris's attack on the executor registration (`c5c3a81` 21:39; sidecar `bc7cf98`).
  - The model-citizen PRISM layer (`ee073f4` 06-19 13:47, 16 citizens) with Liris's crossverify (`5ec2fc4`), and the
    session registration index (`b581539` 14:03).
  - The three operator-observed quintuple-authorization receipts (`467666b` 22:30, `418ce3f` 22:45, `9090f8c`/`3b92614`
    22:46). They quote the owner's authorization statement with the operators' names as he wrote them (OWNER-RULES 5).
- **The ANN census slices (06-18)**: `docs/ANTI-DEFLATION-CENSUS-NN-SLICE-2026-06-18.md` (`26fb00c`) and
  `docs/GNN-DAEMON-FAMILY-SLICE-2026-06-18.md` (`5a54a23`).

## Formula catalogs and registrations (Algorithms-of-Asolaria, 2026-06-19)

- The ACER catalog seed `acer/ALGORITHMS-CATALOG-ACER-2026-06-19.md` (`76da6ea` 14:50, classes A–H).
- The Liris seed `liris/ALGORITHMS-CATALOG-LIRIS-2026-06-19.md` (`27b31d6` 14:54) and its v2 supplement (`d89bf2b` 15:23).
- Liris's crossverify of the formula PID registration (`f3a8a84` 15:32).
- The mirror sidecars of the two registrations: `ALGORITHMS-PID-REGISTRATION-ACER-2026-06-19.hbp.sha256` (`e8268d2`
  15:25) and `ALGORITHMS-PID-REGISTRATION-WAVE2-ACER-2026-06-19.hbp.sha256` (`fe6b629` 15:59). The two bodies are already
  in aether under their PID-office names. Each sidecar equals the whole-file sha256 of its aether body.

## The 06-19 crank: GAIA summon and host8-serve parity

- **The $0 summon (20:35)**: bigpickle `CRANK-RECEIPT-CBA-2026-06-19.md` (`2a45d54` 20:35:03). It records the summon
  proven at $0 on both the Node lane (`gaia-loader`) and the Rust lane (`host8-serve`), with byte-exact `instance_pid`
  parity.
  - `gaia-loader.mjs` is already in aether. Its two imports, `src/free-agent-receipt.mjs` and `src/room-dispatcher.mjs`
    (06-01), are vendored.
  - The Rust twin is the mirror's `servers/host8-serve/` (`9fc2d59` 20:35:10): `src/main.rs` (48,270 B) and `Cargo.toml`,
    with the 06-18 `README.md` (`894e9b0`) and Liris's workload crossverify (`ad95e18` 21:36). The 06-17 first
    `main.rs` and its 06-22 successor are pinned.
- **Smart summon (21:36 → 23:09)**:
  - Liris's gaia-loader crossverify (`cc25cd5`).
  - The GAIA IX timestamp gate take-ii protocol (`8771ca0` 21:37; sidecar `b0799c3`), which pins
    `gaia_loader_blob_sha=703cb8e2…`, the blob aether holds. Its replication note is `690f152`.
  - `src/gaia-briefing.mjs` and `test-gaia-briefing.mjs` (`cca33c8` 21:47): time gate, then IX briefing, then summon.
  - The Liris byte-parity replication bundle (`bf59394` 23:09): `REPLICATE.md`, `verify-parity.mjs`,
    `catalogs/abilities.hbp` and `catalogs/skills.hbp`. Its `verbs.hbp` is the aether verb axis.

  aether's own tuple60D port and gaia-loader parity test already exist (`host8/`).

## The GNN oracle, the kernel shim, GNN_ARCH and the bus fabric (2026-05-13 → 06-22)

- **The federation's 05-13 versions** (handed over by step 9, 4 of 7):
  - `servers/gnn-oracle/Cargo.toml` (`282b9e9` 10:35:32).
  - `kernel/core/src/gnn/mod.rs` (`e5fb0ee` 10:40:07).
  - `servers/gnn-oracle/src/lib.rs` (`fa2ee20` 10:50:26). This is the v0.1 scaffold: "API + ONNX-loaded-model placeholder
    + deterministic fallback".
  - `kernel/docs/GNN_ARCH.md` (`a8aec37` 11:14:12), the Phase-4 Step-61 architecture contract.

  These are the versions the Asolaria mirror received on 06-17 (`30dbf86`). The three earlier same-morning versions are
  pinned.
- **The mirror's v0.2 oracle (06-22 09:21:10, `8284a5e`)**: `federation-remake-1024/servers/gnn-oracle/src/lib.rs`
  (14,304 B), the "pixels-first CPU oracle".
- **The bus fabric (06-17 18:23:44, `30dbf86`)**: `federation-remake-1024/kernel/core/src/bus_fabric/mod.rs` (9,907 B).
  It is the kernel side of the BEHCS-1024 bus: alphabet binding and prefix-tree dispatch.
- **tier_gate**: both 05-13 versions (`67c00c8e`, and `18e6f793`, the one shared to the mirror on 06-17 with
  `sign_gate`) are already in `beginning/09-federation-kernel-2026-05/` and are not repeated here.
- The later dc1da1a versions of the oracle, the shim and the bus fabric are in aether, for comparison.

## level_tag and link_auth: the levels-and-keys gate (2026-06-22/23, federation)

Vendored at their `dc1da1a` versions, first committed in `6083125` (2026-06-23 10:19:35, the rustfmt pass to
1.81-clean). The critic asks for these versions byte-identical.

- `kernel/core/src/level_tag/mod.rs` (10,682 B) tags each corpus row public (0), federation (5) or owner-private (9),
  conservatively: "PII can never fall to public". Its test fixtures use synthetic CNPJs.
- `kernel/core/src/link_auth/mod.rs` (14,861 B) is the cross-host gate: an HMAC over a shared key plus owner-PID
  consent. The key is "supplied at runtime … NEVER hardcoded". Its test key is the string
  `test-link-key-fixture-not-a-real-secret`.

The two 06-22 link_auth versions and the 06-22 level_tag after the fixture fix are pinned. The first level_tag is held
(below).

## The authority roster, the map and the 60D frame (2026-06-24 → 06-28)

- **Asolaria-gac-working**:
  - The first-generation `README.md`, "Authority Hierarchy · Names & Jobs" (`dd89b35` 06-24 07:09:36, with sidecar),
    states "no key material, no secrets, no PII".
  - Liris's `HOST8-MIGRATION-MANIFEST-2026-06-24.{md,hbp}` with sidecars (`5854c66` 07:21:08).
  - `MAP.md` (`c30d170` 06-28). The same `MAP.md` bytes are in nine of the ten source repositories, all committed
    within 25 seconds; the earliest is the reductions repository (`5648e81`, 11:25:08).
  - The seven later README generations are pinned. The one on `main` today (`da163400`) was introduced only by the
    merges `3d3e598` and `1f0d691` on 07-04. The last (`4d9aeccc`, `d9826bf` 07-06) is on a repair branch only.
- **The 60D frame records (06-28)**: ANN `ROOT-FRAME-60D.md` (`de15b3c` 13:13:52, "60D+ HyperBEHCS / BEHCS-1024 /
  HBI-HBP / 8-byte Host8 … not as a frozen 47D ceiling") and HYPER-BECHS
  `ROOT-PRIMITIVE-8BYTE-WATCHER-GATED-NESTED-AGENT.md` (`c9ff351` 13:00:15), each with sidecar.
- **The Liris language waterfall matrix 11x16 (06-16 18:09, ANN `78fd47a`)**: the descriptor `.hbp` and `.hbi`,
  `tools/behcs/language-waterfall-matrix-11x16.mjs` and its test, all with sidecars. It is descriptor-only
  (`DESCRIPTOR_ONLY_NO_LIVE_LAUNCH`). Its `LWFMSHA` row's tool and test digests equal the vendored files. These are the
  waterfall surfaces the L16/L17 codebook descriptor names. The hardened version `b2d1bba1` is pinned.

## Already in aether (referenced, not re-vendored)

| What | aether path | blob |
|---|---|---|
| L1 PrototypeGNN run-1 weights | `model/l1-prototype/vendor/fnns/models/prototype_model.pt` (3 copies) | `1d1be278` |
| L2 ContrastiveGNN run-1 weights | `model/l2-contrastive/vendor/fnns/models/contrastive_model.pt` (3 copies) | `76b7ec50` |
| L1/L2 trainers, `:4795` server | `acer/Asolaria/services/gnn-sidecar/{train_prototype,train_contrastive,prototype_inference_server}.py` | `2f63d0d0`, `960ad0a3`, `3fd612f9` |
| quant8 head, test, ACER bench, Liris readback | `quants/head8/vendor/ASOLARIA-AS-NEURAL-NETWORK/` | `a0e4ea8f`, `2007e64c`, `9f4c6f30`, `a12f6bb0` |
| representation algorithms and siblings | `acer/Asolaria/src/behcs/hyperbehcsRepresentationAlgorithms.js`, `acer/Asolaria/tools/behcs/hyperbehcs-{multiwidth-symbol-selector,triple-quant-acer-physical-benchmark}.mjs` | `b4e3ef76`, `daf44f1d`, `4883af3f` |
| extract-to-cube (the 3-level prism) | `acer/D/asolaria-100B-new-run-2026-06-15/extract-to-cube.mjs` | `74c15b6e` |
| gaia-loader (tuple60D Node original) | `acer/D/bigpickle-rebuild/src/gaia-loader.mjs` | `703cb8e2` |
| verbs.hbp (60D verb axis) | `acer/HyperBEHCS/data/catalogs/verbs.hbp` | `b17100dd` |
| formula PID registrations (ACER, WAVE2) | `acer/D/PID-Registration-Office/registered/ACER-FORMULA-CORPUS-{REGISTRATION,WAVE2}-2026-06-19.{hbp,hbi}` | `e32e7685`, `350d8d5c`, `66f8caa5`, `2d3ad07f` |
| HyperBEHCS core quants, file index | `quants/hyperbehcs/vendor/…/omni-acer/lib/hyperbehcs-core.cjs`, `acer/HyperBEHCS/lib/hyperbehcs-file-index.cjs` | `a81796ac`, `845749ca` |
| sign_gate (shared with tier_gate) | `kernel/lane/core/src/sign_gate/mod.rs` | `883f6c2d` |
| d22 verb adapter `.hbp`/`.hbi` | `hbp/vault-reader/tests/fixtures/public-annn/tools/behcs/d22-verb-adapter.{hbp,hbi}` | `2a4f952e`, `766940bf` |
| raw Host8 seat book (handoff item 12) | `acer/D/PID-Registration-Office/` (3,698 files) and the ITEM5B `seat-book/registered/` (3,692 files) | — |
| host8 tuple60D port and parity test | `host8/src/identity.rs`, `host8/tests/tuple60d_gaia_loader.rs`, `host8/tests/fixtures/tuple60d{-gaia-loader.hbp,_gaia_loader.mjs}` | `3a128e46`, `bcefff09`, `03d7b94f`, `f9f316a3` |
| later bus_fabric, gnn-oracle, gnn shim | `kernel/lane/core/src/bus_fabric/mod.rs`, `host8/vendor/federation-1024/servers/gnn-oracle/`, `kernel/lane/core/src/gnn/mod.rs` | `5de1be37`, `41e4c109`, `05a9cca4` |

## Held

`HELD.hbp` has seven rows. Nothing in them is vendored.

- **The first `level_tag` (`55357fdc`, `bd3e222` 2026-06-22 15:07:56)**: it carries a real 14-digit CNPJ in two test
  fixtures. Upstream replaced it two hours later, and level_tag's own rules class CNPJ content as owner-private.
- **Two bigpickle-rebuild GNN-archaeology scripts (`2c443b5` 2026-06-01 21:01:19)**:
  `feed-gnn-archaeology-to-fabric.mjs` (`274a8e2d`) and `ask-supervisors-gnn-archaeology.mjs` (`64d6240a`). Both
  hard-code the same 64-hex Redis bearer token (lines 37 and 54), although the commit message says "secret-scanned, no
  keys/tokens". The token is not repeated here. It is public upstream: both files are on `main` and on 13 of the
  repository's 14 other branches. Rotating it is the owner's call. Map item 30 names both files but does not ask for
  them.
- **The four OWNER-RULES 7.j items that this step's registrations point at**:
  - the G3 `MASK_GLYPHS` per-adversary set (`gnn-reverse-gain.mjs`, `04502e1a`);
  - the reverse-gain seat registration `sup-gnn-reverse-gain-04f694deccace339.*` (5 files);
  - the 47D reverse-gain plan;
  - the vote_quorum daemon source and `.pyc` (`bcb542ed`).

  The PID-office manifests carry only a pointer row for the reverse-gain seat: ids, handles and two sha256, no body.
  The daemon registration names vote_quorum by path and port only. The `HELD.hbp` row for vote_quorum notes one thing
  for the owner: the same blob is committed in aether's `ledger/hyperbehcs-daemons/` under an earlier decision, and
  7.m keeps it held.

A credential and PII scan of all 214 files found no key, token, email address or phone number. The details are in the
`HELD.hbp` header.

## Not found

Searched on every ref of all ten source repositories, in aether's tree and `docs/handoffs/` (ACER items 2, 5, 7 and 8),
and in the `/home/user` clones:

- **ACER's combined-quant engine and proof harness**: `D:/asolaria-combined-quant-2026-06-15/{combined-quant-engine,
  mode-real-100b,sector-room-layout}.mjs` and `D:/asolaria-quant-proof-2026-06-15/{combined-quant-proof,
  all-quant-proof-harness,huge-message-stress}.mjs` with `proofs/huge-message-stress.hbp`. Only WAVE2 rows and
  extract-to-cube's import cite them. ACER only; step 14.
- **`new-100b-genius-cubes.hbp`** (the 256 cube10 weights the 100B proof describes): ACER `D:/asolaria-100B-new-run-2026-06-15/cubes/`.
  It can be regenerated once `mode-real-100b.mjs` is sent. Step 14.
- **`new-100b-runner.mjs` and its `checkpoint.state.json`** (`D:/asolaria-100B-new-run-2026-06-15/`): the program
  that ran the 100B packets, and its run state. Map item 74 asks for the runner "if needed", with extract-to-cube.
  - aether's WAVE2 registration cites the runner in 12 FORMULA rows, at its lines 31-59, 75 and 90-93: the LCG PID
    emitter and seed, the genius and mistake thresholds, the chunk PID format, the sha256 stream digests, the GNN lane
    summary and the sample caps. Two more rows cite `runner.mjs` (lines 61, 74 and 80). Three rows cite the checkpoint
    (lines 7-12 and 18-20).
  - extract-to-cube reads the checkpoint (line 32), and the vendored 100B proof takes its verified result from it.
  - ACER's ITEM7 delivery carried only `extract-to-cube.mjs` from this directory. No path containing `new-100b-runner`
    or `checkpoint.state.json` is on any ref of the Asolaria mirror or of 49 other estate repositories, in aether's
    tree, or under `/home/user`. That includes `Asolaria-the-after-100-billion-run-absorption-and-decomposition-and-cubes`,
    whose text does not name the runner either. The run's other outputs (`new-100b-run.log`,
    `new-100b-chunks.ndjson`, the genius and mistake farms, `gnn-summary-latest.json`) are not found either.
  - The mirror's `tools/neurotech-real-100b-agent-runner.js` (`a65c484`, 2026-04-29) is the earlier April runner, a
    different file with its own `100b-run/checkpoint.state.json`.

  ACER only; step 14.
- **`growth-law.md` and `optimizer-math.md`** (`D:/asolaria-prime-towers-rebuild-2026-06-15/07-v2-doctrine/`): ACER's own
  search (ITEM7-STATUS) reports NOT_ON_ACER, so these are not found anywhere. The public prime-tower files stand in. No
  file names D51–D60 (ACER search pending).
- **`emit-liris-catalogs.mjs`** (the ~15:1 packet of the old-compression curve): unknown, possibly the Liris seat. The
  micro-kernel manifest that `measure-3` reads (`D:/asolaria-micro-kernels-v1`) is ACER only.
- **The ACER desktop texts and tuple codecs that WAVE2 cites**: `Full system.txt`, `explosive result new.txt`,
  `Combine.txt`, `integration.txt`, `D:/asolaria-substrate-v1/src/{tuples,provenance}.mjs`, and the `asolaria-fabric`
  and `asolaria-os-on-metal` MCP servers. ACER only; step 14.
- **The Liris L16/L17 roundtrip runner** (the descriptor says `roundtrip_run=GATED-liris-waterfall-tool-not-pushed`) and
  the 34 BEHCS-1024 body codebooks: Liris seat only. The codebooks date from 2026-07-16, a later step.
- **The ACER fabric canon index row "60D+ canon ceiling TRIPLE-VERIFIED (2026-06-03)"**: the live service only. Step 14.

## Dates, counts and notes

- **Files**: 214. **Bytes**: 1,968,786. Largest: `PID-OFFICE-ROOMSTUB-MANIFEST-v2.hbp` (598,463 B), then v1 (439,344 B).
  - ASOLARIA-AS-NEURAL-NETWORK: 80 files, 275,837 B.
  - Asolaria (mirror): 74 files, 1,211,357 B.
  - reductions: 19 files, 236,271 B.
  - bigpickle-rebuild: 16 files, 111,110 B.
  - Algorithms-of-Asolaria: 8 files, 37,049 B.
  - Asolaria-gac-working: 7 files, 27,683 B.
  - asolaria-federation-1024: 6 files, 43,299 B.
  - HYPER-BECHS: 2 files, 4,847 B.
  - ASI-On-Metal: 1 file, 21,038 B.
  - fnns: 1 file, 295 B.
- **Date range (per-blob beginning)**: 2026-05-13 10:35:32 (`282b9e9`) to 2026-07-10 22:22:13 (`3638f30`). The step's
  body is 2026-06-01 to 06-24. The outliers are:
  - the 05-13 federation GNN files (step 9's hand-off);
  - the 06-28 fnns manifest of the 06-01 run, `MAP.md` and the two 60D frame records, whose map items begin in this
    window;
  - the 07-10 lineage note.
- **Inventory changes**: the inventory listed 207 files. tier_gate `18e6f793` was dropped because step 9 already holds its
  bytes. The other 206 match the inventory blob for blob. After review, 8 files were added: the four other `37234d6`
  phase-1 lanes (the BHOMNIFLYWHEEL router, FISCHER-ORGAN2, the USB113 cubeland and the USB-GOOGLE substrate index),
  each with its sidecar. They are descriptor-only, E=0, and the credential scan finds nothing in them.
- **Pinned by id** (`PROVENANCE.md`): 25 same-path versions and 4 sidecars, plus the 3 omnicoder `lib/` siblings and
  bigpickle `src/gnn-edge-ledger.mjs`.
- **Not taken** from map item 30's bigpickle files:
  - `feed-gnn-archaeology-to-fabric.mjs` and `ask-supervisors-gnn-archaeology.mjs` are held (token, above).
  - `src/gnn-edge-ledger.mjs` (`42e7fb3f`, 684 B, `95bde73` 2026-05-24) is pinned. It is clean, but it predates this
    step's window and the map does not ask for it. It is not in aether.
