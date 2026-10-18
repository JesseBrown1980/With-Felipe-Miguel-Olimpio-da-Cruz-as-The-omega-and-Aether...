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

The limits that show up in practice are the machines', not the method's: the router's 32 shifts per
bus, and ACER's Windows sandbox, which stopped a GNN/FNN level-growth run near 1e8 (OPERATOR).

## 3. The hotels

> "The Brown-Hilbert space allows infinite expansion, and the Brown-Hilbert hotel allows for
> infinite messaging, and the Omega hotel and the Omni hotel allow for particles to talk to each
> other." (OPERATOR)

The Brown-Hilbert hotel is in the records of section 2. The Omega and Omni hotels are the operator's
words here; they are not yet written up under those names in the records searched for this guide.

## 4. Why Host8 was retired

Host8 is 8 bytes cut from a SHA-256 of the 60-glyph tuple (`asolaria-federation-1024` @ `dc1da1a9`,
`kernel/boot/src/hwinv.rs`, `project_60d` and `emit_device_pid`). Cutting a hash short means two
different addresses can land on the same handle: *"A short Host8 identifier may collide."* (aether
`kernel/behcs1024-60d/README.md`). The canon already says a short glyph only points at an address and
never stands in for it: *"a glyph summarizes a backend address; per canon it never replaces the
evidence."* (reductions repo, `01-rebuild/F01-prime-tower-geometry--builder.md`)

The structured Brown-Hilbert address does not collide; a truncated handle of it can. The operator
retired Host8 for that reason and moved to a newer system (OPERATOR).

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
  (`kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp`, and ACER's run)

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
