# Addressably addressing

A guide to the rule the whole system runs on. Operator: Jesse Daniel Brown. Written 2026-10-18
from the operator's words and from the records cited under each section. The same file sits in the
Asolaria repo and in the aether rebuild (GitHub
`JesseBrown1980/With-Felipe-Miguel-Olimpio-da-Cruz-as-The-omega-and-Aether...`); paths marked
*aether* are in that repo.

Tags: **MEASURED** (reproducible from the cited receipt), **CANON** (the operator's frame, written
in the records), **OPERATOR** (stated by the operator on 2026-10-18, not yet written up elsewhere).

## 1. The rule

> "If you don't try to map everything, if you don't try to address everything, it finds the
> address. It's addressably addressing." (OPERATOR)

An address is computed when it is needed, from the same inputs that made it. Nothing enumerates the
space, so nothing has to be rendered or stored in full. That is why the system runs at all: the cost
is the address being computed, never the size of the space it sits in.

The records say the same:

- *"Recompute, don't scan. The `glyph = hilbertAddress(pid:ts:digest)` you need to retrieve a row is
  computed from the same inputs you used to emit it."* (CANON;
  `what-is-asolaria---how-do-we-get-reductions-in-everything` @ `29307bf`,
  `03-synthesis/S3-emitter-projection-watcher-grounding.md:130`)
- The honest boundary, kept with it: *"Nothing is lost" means every emission is addressably indexed,
  **not** that 1e200 payloads are materialized.* (same file, line 134)
- The cost classifier permits only `O1_SHAPED_ADDRESSING_NOT_TOTAL_WORK`: emitting is real physical
  cost; what is O(1)-shaped is the address, so recall is cheap. (same repo,
  `01-rebuild/F05-emitter-activity-piping--architect.md:82`)

## 2. Collisions only go outward

> "It only runs, the collisions only go outward." (OPERATOR)

Growth never moves or overwrites an address that is already held. A new address is found further out
or one level deeper.

- **Hilbert Hotel invariant.** *"No address below 44 moves."* Rooms that are held stay held;
  arrivals take rooms above them. (CANON; `catalogs.json`, quoted in `the-colour-qr` README)
- **The never-full router.** `hilbertHotelRouter.js` places a PID in a room with `n → 2n` shifts,
  `SHIFT_FACTOR = 2`, `MAX_SHIFTS_PER_BUS = 32` (about 4.3 billion rooms), `never_full: true` by
  construction: *"a catalog is 'infinitely dividable from within' because the room map never
  saturates."* (CANON; the file is on ACER, described in the reductions repo at
  `01-rebuild/F01-prime-tower-geometry--builder.md:80`)
- **Expansion without resharding.** `EVT-HILBERT-HOTEL-EXPANDED`: *"new supervisors minted at level
  N, no reshard."* (CANON; Asolaria @ `80bf516`, `kernel/glyph-families.json:598`, and
  `asolaria-behcs-256` @ `818cc23`, `packages/deep-wave/scripts/run-batch-17-triple.mjs:77`)
- **A free address always exists between two.** `bh_inject_between(a,b)` deepens one slice of a
  1024-ary Brown-Hilbert address so the gap multiplies by 1024: *"a strictly-between addressable
  midpoint always exists."* (CANON; `Metatagging-data-for-a-Quantum-universe` README, "Downstream
  realization")
- **Distinct distances.** The Multi-Cylinder Map v2 placed 81,434 surfaces across 15 cylinders
  with **0 coordinate collisions**, the Sidon addressing at scale. (MEASURED by the operator's seats;
  `asolaria-behcs-256` `SESSION-UPDATE-2026-06-22.md:52`)
- **Addressing on demand, measured to level 60.** Level L of the ternary voxel map has 3^(3L)
  voxels, 3^180 at level 60, and none of them was built: each of the 664,579 primes below 10^7 got
  its level-L address from its own trits. Primes sharing a voxel: 664,578 at levels 1 to 3, 562,173
  at level 4, and **0 from level 5 through level 60**. Every level's address sits unchanged inside
  the next one (664,579 of 664,579), and the prime 3 keeps room (0, 1, 0) and the prime 2 room
  (−1, 1, 0), least significant trit first, at every level. (MEASURED on two machines with the same
  counts: ACER `TERNARY-ADDRESS-60.hbp`, cube `b6b64a02864356f9`; aether `kernel/ptp-towers`)

Why the collisions can only go outward: two addresses that differ at one level differ at every level
beyond it, because the residue mod 3^(3(L+1)) fixes the residue mod 3^(3L). Once two things are
separated, going outward never brings them back together. In the run above the sharing reaches zero
at level 5 because every prime below 10^7 is below 3^15.

The limits that show up in practice are the machines', not the method's: the router's 32 shifts per
bus, and ACER's Windows sandbox, which stopped a GNN/FNN level-growth run near 1e8 (OPERATOR).

## 3. The hotels

> "The Brown-Hilbert space allows infinite expansion, and the Brown-Hilbert hotel allows for
> infinite messaging, and the Omega hotel and the Omni hotel allow for particles to talk to each
> other." (OPERATOR)

> "The Brown Hilbert rooms are for omnibits. They're for all bits. Omnibits. And the Omega rooms are
> for special bits. So we needed an Omni hotel for all the Omni bits to be able to talk to each other,
> and Omega hotels at every level, at every end level, so that everything could talk to everything
> like a giant simulator grid. Everything has its own special little communication boxes, and they
> all have their own division and distribution. And that means that free-floating functions can fly
> through them and interact with each little hotel room." (OPERATOR)

The Brown-Hilbert hotel is in the records of section 2. The other two are below, each with what its
records define and where the records stop.

**The Omni hotel.**

- `Omni-Asolaria-ASI-OS-Matrix-Fabric` @ `2b4193f`: one slice lives at every level of the matrix at
  once, because every level translator is a bijection and the translators form a groupoid:
  *"translators `T_ij` with `T_ji∘T_ij = id` and `T_jk∘T_ij = T_ik` make translation omnidirectional
  and path-independent across the whole ladder."* (README, "Prism/Comb 0-loss", CANON; the 256↔1024
  rung is MEASURED there.)
- The OmniHotel as code, in the universe simulator (`ASOLARIA-UNIVERSE-SIMULATOR-…` @ `3f9f42d`,
  `engines/omni_hotel.py:5-6`): *"room-sector substrate — 12 lanes x 100 shards
  (ROOM-SECTOR-SUBSTRATE-CANON), Hilbert-Hotel rooms that extend without repacking."* The file is a
  minimal port and does not yet do what its docstring says: the rooms are fixed at 1,200 and
  `assign()` writes a room without checking whether it is held (lines 27-30). Its own demo of 2,000
  guests ends with 975 rooms held and 1,025 guests overwritten, at most 7 keys sent to one room
  (MEASURED on the cloud, recounted in integers by a second run). Collisions going outward are taken
  from the records of section 2, not from this file. Its ColorPID half, which
  `books/LAW-59-STREAM-THE-GENERATOR-NOT-THE-GENERATED.md:60` cites, uses floats.
- ACER's records name "OmniHotel" as stage 12 of the OMNI constellation, on Liris evidence whose
  roster hash is still under bilateral HOLD (ACER memory,
  `correction_rime_affirmative_claims_sector_counts_system_models_2026_07_24.md:140-142`).

**The Omega hotels: the Omega system of Aether and Asolaria.**

> "The Omega Rust components. That's what it should be called, the Omega system of Aether and
> Asolaria." (OPERATOR, 2026-10-18)

The four components and their contract are in `asolaria-omega-omnibit-tournament` @ `dad4647`, the
same commit and the same 75 files on GitHub and on Hugging Face
(`Jessedbrown/asolaria-omega-omnibit-tournament`), and byte-identical in aether (MEASURED):

| Component | Upstream (`reference/`, `provenance/receipts/`) | In aether | Tests on Rust 1.81 |
|---|---|---|---|
| Omega floor codec | `omega-floor-codec-v0/omega_floor_codec_v0.rs` | `qprism/recovery-omega-codecs/` | 11 of 11 |
| Omega hyper codec integration | `omega-hyper-codec-integration-v0/omega_hyper_codec_v0.rs` | `qprism/recovery-omega-codecs/` | 34 of 34 |
| Omega operator catalog | `omega-operator-catalog-v0/omega_operator_catalog.rs` | `qprism/recovery/catalog/` | 18 of 18 |
| Omega path 1-2-3 | `omega-path123-v0/omega_path123.rs` | `qprism/recovery/omega/` | 35 of 35 |
| Contract | `omega-floor-codec-contract-v0/INTEGRATED-OMEGA-FLOOR-CODEC-CONTRACT.hbp` | `qprism/recovery-omega-codecs/` | |
| Receipts | `omega-floor/OMEGA-FLOOR-CODEC-V0-VERIFY`, `path123/OMEGA-PATH123-COMPONENT` (`.hbp`, `.hbi`) | `vectors/` of the two crates | |

The hyper and path 1-2-3 counts include the catalog's 18 tests, which both compile in. Clippy denies
every warning except four upstream lints that are allowed so the bytes stay unedited; float
arithmetic is denied and the sources have no float. The floor self-test reproduces its receipt row
byte for byte. CI runs all of it (`omega-codecs`, `qprism-recovery`, `omega-operator-catalog` in
`gate.yml`).

There is an Omega at every level. The contract chains the floors:
`floor64_seed=COMPILED_DOMAIN_GENESIS`, `floor256_seed=OMEGA64`, `floor1024_seed=OMEGA256`,
`floor4096_seed=OMEGA1024`, `final_commit=OMEGA4096`, with `child_carries_parent_omega_bytes=1`
(line 8). The same functions act at every level: *"all 40 catalog operators at every floor"*
(`omega_hyper_codec_v0.rs:4`), 8 cube directions, 12 sectors and 20 icosahedral lenses, each one
exactly invertible. They are the nearest thing in code to the free-floating functions above (a
reading, not a record).

Where the records stop:
- An Omega here is a commitment and a seed, not a room yet:
  `omega_is_commitment_and_seed_not_learned_state=1` (contract line 9).
- The Omega hotels are recorded as capacity: `HOTELS|omnihotels=ADDRESSED|omega_hotels=POSSIBLE`
  (universe simulator, `receipts/LIRIS-COLOR-QR-OIL-DEVICE-ENGINE-2026-07-29.hbp:10`). Its device
  chain runs `OMNIHOTELS -> POSSIBLE_OMEGA_HOTELS -> AETHER_INTERFACES`, and the law says
  *"`POSSIBLE_OMEGA_HOTELS` remains possible capacity."* (`books/LAW-COLOR-QR-2D-DEVICE-ENGINE.md:75-83`)
- Path 1-2-3 is not yet wired into the hyper codec. Its self-test prints `path123=PENDING` and
  `whole_monty=0`, and CI checks that line exactly.
- The floor receipt was made on rustc 1.96.0, outside the operator's rule. On 1.81.0 the same 11 tests
  pass and the self-test line is identical.

Who made it: Relic and Liris, with Codex (OPERATOR). The git record shows the four sources entering
the tournament in one commit, `ec399b0` (2026-07-18, author `acer`), and the source ledger records
the 1.81.0 test run under both Liris (`MEASURED_LIRIS`) and ACER (`provenance/SOURCE-LEDGER.hbp:25-26`).
The three seats, Acer, Liris and Relic, keep their files, corpora and hardware private and meet only
through what git carries: *"reviewed code, derived commitments, allowlisted receipts, public
fixtures, and explicit Omega bindings."* (README, "Tournament topology"). In Relic's lane, the Omega
ledger unifies 27 shared binding commitments into one Omega root, with an `omega_slot` in every cube
address (`src/asolaria_tournament/relic_engine.py`, `OmegaLedger` and `CubeAddress`).

## 4. Why the Host8 handle was retired as an identity

Host8 is 8 bytes cut from a SHA-256 of the 60-glyph tuple (`asolaria-federation-1024` @ `dc1da1a9`,
`kernel/boot/src/hwinv.rs`, `project_60d` and `emit_device_pid`). Cutting a hash short means two
different addresses can land on the same handle: *"A short Host8 identifier may collide."* (aether
`kernel/behcs1024-60d/README.md`). The canon already says a short glyph only points at an address and
never stands in for it: *"a glyph summarizes a backend address; per canon it never replaces the
evidence."* (reductions repo, `01-rebuild/F01-prime-tower-geometry--builder.md`)

The Matrix-Fabric repo draws the same bound: `handle8 = sha256(content)[:8]` is only *"a coordinate
against the content-addressed cube store"*, so the matrix has *"infinite ADDRESSING capacity, not
lossless infinite compression."* (`Omni-Asolaria-ASI-OS-Matrix-Fabric` README, "Prism/Comb 0-loss")

The structured Brown-Hilbert address does not collide; a truncated handle of it can. What the
operator stopped using is the Host8 handle **as an identity** (OPERATOR, 2026-10-18, said in reply to
the point that the 8-byte handle can collide). In the operator's words, *"the meta tagging, the
quantum universe repo replaced host 8"* (OPERATOR, 2026-10-18). That repo's seed tags every particle
with its own metadata; its mapping table takes `ParticleID` (e.g. `E123`) to *"**PID** — every
agent, slice, room, receipt is content-addressed (BEHCS-1024)"*
(`Metatagging-data-for-a-Quantum-universe` @ `99f9c52`, `docs/WHAT-THIS-SEED-BECAME-2026-07-03.md:11`).
The replacement is the operator's statement; the Metatagging records themselves list host8 `:5088`
serving alongside the PID fabric on 2026-07-03 (same file, line 21).

The same bound applies to the PID. As the seed computes it, a PID is also a 64-bit cut of a
SHA-256, `"AGT-" + sha256(state)[:16 hex]` (`metatag_v2_behcs.py:29-30`, `:58-60`), the same width
as the Host8 handle. What it names is the particle's full state, and that state is the identity; two
different states can share a PID, with even odds once about five billion PIDs exist. So rule 2 below
holds for PIDs as it does for Host8.

The `host8-serve` server itself is still running. On 2026-10-18 ACER's process list showed
`host8-serve.exe` behind ASI OS (`asolaria-asi-os.exe`, `:4600`), and ACER's records describe it as
the runtime the Node/V8 services are being ported into, under `swap_gate=parity-before-retire` with
`node_retired=0`.

## 5. How deep is enough

> "You don't need to render it all the way out. I think 60 levels is okay. The point is that this
> thing works." (OPERATOR)

Measured in the aether rebuild, integer only, Rust 1.81:

- The level transcodes are lossless at every width tested, 1 to 64, including the 60 rung:
  4,530,752 round trips, 0 failures. The ladder has no ceiling of its own; a fixed integer type
  only bounds one build. (`codec/dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp`)
- The ternary closure survives 81 levels in exact integers: the three arms sum to zero at every
  level and the centre stays free. (`kernel/tribit-referees/receipts/RUNS.hbp`, the operator's
  `does-the-closure-survive-81-levels` reproduced byte for byte)
- Prime to prime, the towers and cylinders, measured to 10^7 on two machines with matching counts
  (`kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp`, and ACER's run, stream sha
  `034750529fc6a940…`)
- The ternary voxel map: levels 1 to 4 are exact bijections (27, 729, 19,683 and 531,441 voxels),
  and at every level the free-centre planes hold no prime except the prime 3. (MEASURED by ACER,
  office `D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/ternary-voxel-map/`, cube
  `fe0b8ea9c0f5983b`, prior `9859b576855a7bf8`)
- Addressing on demand to level 60, with nothing built (section 2): ACER `TERNARY-ADDRESS-60.hbp`,
  cube `b6b64a02864356f9`, prior `fe0b8ea9…`; the same counts in aether `kernel/ptp-towers`.

## 6. Working by the rule

For anyone building on the system, people and agents alike:

1. **Compute addresses when they are needed.** Do not enumerate or render a whole space to prove it
   works; check at the depth something is used.
2. **Never use a truncated hash as an address.** A short handle points at evidence; it never replaces
   it.
3. **Grow outward or deeper.** Never reshard, and never move an address that is already held.
4. **Measure each rung for what it claims.** A transcode is checked by exact round trip. A one-way
   projection, such as the 60-D glyph tuple, is checked by its projection properties, never by round
   trip.
5. **Integers and trits only.** Float does not calculate this.
6. **Tag every claim** MEASURED, CANON or OPERATOR, and keep the vision as vision.
