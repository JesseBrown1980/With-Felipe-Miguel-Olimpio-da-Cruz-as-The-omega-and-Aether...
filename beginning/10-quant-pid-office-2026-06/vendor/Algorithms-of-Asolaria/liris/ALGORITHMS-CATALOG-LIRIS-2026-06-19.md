# Algorithms of Asolaria - LIRIS catalog seed (2026-06-19)

This is the Liris-side seed catalog for bilateral comparison with `acer/ALGORITHMS-CATALOG-ACER-2026-06-19.md`.

Scope: read-only clone-slice scour over 8 public map repos under `C:\tmp\asolaria-40-scour-2026-06-19`, plus the agent-lane findings produced on this seat. No live runtime, fabric, provider, device, cloud, or USB probe was fired by this catalog. Runtime statements inside source files are therefore `CANON-in-file` or `UNVERIFIED-live`, not fresh runtime truth.

Status: lanes 01-25 harvested for this seed. Remaining lanes can append later without replacing this file.

## Claim Tags

- `MEASURED`: read from local file bytes in the clone slice or returned by a read-only lane.
- `CANON-in-file`: doctrine, receipt, README, proof, or map row states it, but this seed did not independently re-run the underlying runtime.
- `MODEL`: compact pseudocode distilled from measured source.
- `UNVERIFIED-live`: live port, process, device, provider, cloud, fabric, or USB state was not checked here.

## A. Addressing and Handles

`MEASURED`: the common short identity is `sha16(s) = sha256(s).hex[0:16]`.

`MEASURED`: GitHub/runtime PID registration derives:

```text
safe = normalize(name)
h = sha256(safe)
seed = u32(h[0:8])
lane = seed % 3
quad = seed % 4
glyph_5 = seed % 5
glyph_1024 = seed % 1024
sector = seed % 113
cube_bh = BH.{sector}.{lane}.{glyph_1024}
sha16 = h[0:16]
```

Evidence class: `ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/github-pid-register.mjs` and its unit tests.

`MEASURED`: 8-byte host/room handles are descriptor surfaces, not live runtime proof:

```text
handle8 = sha256(tuple_preimage).hex[0:16]
bh_index = sector*3072 + lane*1024 + glyph
phase = bh_index % 6
ring = floor(bh_index / 6)
distance = abs(delta_bh_index)
```

`MEASURED`: Falcon 8-byte host shell path uses MD5 handles:

```text
REAL = md5(file_bytes)[0:16]
REFL = md5(REAL + ":self-reflect")[0:16]
FABR = md5(filename + ":ask-fabric")[0:16]
PID0 = md5(REAL + REFL + FABR)[0:16]
```

Boundary: no literal `host8` token was found in the eight clone roots; the clone vocabulary is `8byte`, `8-byte`, and `eight-byte`.

Boundary: FNV-1a64 was not found in the eight clone roots. Acer's FNV formula is therefore `DIVERGE-by-slice`, not refuted.

## B. Brown-Hilbert, Prime, Rooms

`MEASURED`: prime-sector room PID formula:

```text
prime = primeAt(sectorIndex)
SECTOR_CAPACITY = 1_000_000
globalIndex = sectorIndex*SECTOR_CAPACITY + roomInSector
pid = "BH.SECTOR.P{prime}.R{room7}.{sha16("room|" + globalIndex)[0:8].upper()}"
```

Golden vectors lock `primeAt(0..7)=2,3,5,7,11,13,17,19`.

`CANON-in-file`: room-sector topology is `12` lanes, `100` shard supervisors, and `1` scaled `100k` rotor. This is topology/canon, not proof of a physical folder tree.

`MEASURED`: Brown-Hilbert expansion tests lock coordinate invariants beyond `1e200` using `10n ** BigInt(exponent)`, decimal-shape checks, and `n mod 3` / `n mod 6` invariants. This proves addressability invariants in code, not live enumeration.

## C. N-Nest and Recurrence

`MEASURED`: N-Nest PID recurrence:

```text
agentPid = sha16(addr)
watcherPid = sha16(addr + "|watch")
leaf_truth = sha16(addr + "|leaf")
internal_truth = sha16(addr + "|" + child.reported...)
subtree_ok = all(child.ok) && reported_sha16 == recomputed_sha16
```

Locked receipts:

```text
depth=3, branching=3, nodes=40, total_pids=80, tree_bytes=640
depth=7, branching=2, nodes=255, total_pids=510, tree_bytes=4080
```

`CANON-in-file`: recurrence-is-mind is expressed as self-reflect plus corrective/ground-truth gate, aligned with backprop-style recurrence.

## D. Quant, Zeta, Sketches

`MEASURED`: Quant8 tuple construction:

```text
D = 1024
proj[h(i)&1023] += sign(h(i)) * msg[i]
q = round((proj[j]/max_abs) * 127)
tuple = turbo_int8[1024] + signs[128] + zeta_bucket[1024] + hist_u32[256]
tuple_bytes = 1024 + 128 + 1024 + 1024 = 3200
dot_estimate scales by /16129
```

`MEASURED`: vector fidelity pilot is not a promotion proof; one quant fidelity lane records `FAIL/PILOT_CANNOT_PROMOTE`. Quant4 is address/evidence fidelity, not cosine/vector reconstruction.

`MEASURED`: zeta lane law:

```text
lane = index % 3
residue6 = index % 6
ring = floor(index / 6)
gap % 6 == 0 -> same lane
gap % 6 == 2 -> lane 2 to 1
gap % 6 == 4 -> lane 1 to 2
```

The validator is necessary-not-sufficient. Sweep rows report `9592` primes, `9590` primes greater than 3, `9589` pairs, and `0` violations.

`MODEL`: MedianSketch is a spec/receipt lane in this slice, not implemented source:

```text
K=5, D=1024
bucket = hash(seed, sketch, index) mod D
sign = +/-1 from independent salted hash
estimate = median(sketch_sums)
```

## E. GNN, Fischer, MLC

`MEASURED`: whiteroom L0 GNN payload shape:

```text
h = sha256(pid + "|" + mark)
b(i) = hexByte(h, i) / 255
nodes = [[b0..b5], [b6..b11]]
edges = [[0, 1]]
edge_features = [[b12, b13, b14]]
score = average(response.scores)
```

Boundary: referenced `inference_server.py`, `gnn_baseline.py`, and `baseline_model.pt` were not present in the eight clone roots.

`MEASURED`: Fischer draft stand-in:

```text
score = "0." + zpad6(parseInt(input_candidate_row_sha16[0:8], 16) % 1000000)
reverseGain = "0." + zpad6(parseInt(input_candidate_row_sha16[8:16], 16) % 1000000)
receipt_preimage = join0x1F("FISCHER_RECEIPT", scorer_id, score_kind, input_sha16, score, reverseGain)
scorer_receipt_sha16 = sha256(receipt_preimage)[0:16]
```

Golden vector: `input_candidate_row_sha16=9eb8e1db7ec091f5`, `score=0.916571`, `reverseGain=0.549493`, receipt `f1996a6baef585af`.

`MEASURED`: MLC line watcher:

```text
distance = abs(b.bh_index - a.bh_index)
bucket = collision if 0; near if <4096; local if <32768; regional if <131072; else far
relation = same_point | same_prime_same_phase | same_prime_band | same_cylinder_phase | same_lane | cross_field
watcher = gnn_edge for same_point/same_lane; hrm_recurrence for same_prime*; else round-robin
fischer_move = HOLD_COLLISION_REVIEW | DEEPEN | BRIDGE | WATCH
signature = sha16(pidA,pidB,bhA,bhB,stride,distance,bucket,relation,watcher,move)
```

## F. HBP, HBI, Integrity

`MEASURED`: whiteroom row hash:

```text
prev = 0000000000000000
row = "WHITEROOM|...|json=0"
row_hash = sha256(row + prev)[0:16]
sealed = row + "|row_hash=" + row_hash
prev = row_hash
```

`MEASURED`: USB sector receipt chain:

```text
sha256 = sector_sha256
sha16 = sha256[0:16]
body = "HBPv1|...|sha256=...|sha16=...|prev_row_hash={prev}|json=0|runtime=0|promote=0"
row_hash = sha256(utf8(body))[0:16]
append body + "|row_hash=" + row_hash
prev = row_hash
sidecar = sha256(hbp_file_bytes) + "  " + filename
```

`MEASURED`: `.hbi` files found in the clone slice are manifest/index rows, not byte-offset HBI artifacts. Byte-offset HBI exists as `CANON-in-file` design:

```text
HBIv1|row=N|pid=...|bytes=L|sha256=...|json=0
```

`MEASURED`: hot-path rows require pipe grammar, `json=0`, no JSON braces, and CR rejection in key producers.

## G. Storage, Device, Route

`MEASURED`: Google Drive page store:

```text
sha16 = sha256(bytes)[0:16]
put() uploads page, downloads it, compares sha16
compact() moves live -> compacted and preserves retrieval
```

Boundary: no Drive resumable/chunked upload implementation found; cloud round trip remains ADC-gated and `UNVERIFIED-live`.

`MEASURED`: raw USB formulas:

```text
byte_offset = sector_index * 512
partition_entry_offset = 0x1BE + i*16
lba_start = LE32(e[8:12])
lba_size = LE32(e[12:16])
bytes_size = lba_size * 512
boot_signature = bytes[510:512] == 55AA
```

`CANON-in-file`: SOVLINUX saved receipt says `2,097,152,000,000` bytes and `4,096,000,000` sectors; this catalog did not remeasure attachment or hardware.

`MEASURED`: phone/device lane formulas:

```text
device_handle = md5(pid + ":" + serial)[0:16]
ack_hash = md5(line)[0:16]
EVT row = "EVT|ts|host|msg|json=0"
```

Boundary: no matches in the eight clone roots for `Bluetooth`, `AOA`, `Android Open Accessory`, `fastboot`, `usbipd`, `WinUSB`, `libusb`, `Zadig`, `Xiaomi`, `monet`, `56C90D22`, or `2717:ff40`.

`MEASURED`: route health formula:

```text
2xx -> UP
400/401/403/404 -> ROUTE_BOUNDARY
other HTTP -> HTTP_DEGRADED
timeout -> TIMEOUT
error -> DOWN
no signal -> UNPROBED
answered = UP | ROUTE_BOUNDARY | HTTP_DEGRADED
```

`CANON-in-file`: `/behcs/health` is the bus health route for `4947`; `/health` on that bus is a route boundary, not outage proof. Route health is vantage-relative.

## H. Gates, Claims, Governance

`MEASURED`: supervisor collision router is non-mutating. Runtime-bound fields classify as real before logical labels; real collisions require free real address plus operator-pair cosign before real mint/launch.

`CANON-in-file`: freeze means present but not advancing. `sessions=0`, `running=0`, and `process_launch=0` are not absence.

`CANON-in-file`: executor/fire slice formula:

```text
POP_FROM_POOL -> PID_SIGNAL -> AGENT_ROOM -> RESULT_TO_GULP -> ERASE
```

`MEASURED`: watcher suggestions and token/cube bindings are descriptor/gated unless operator/cosign conditions are met; material-shaped secrets are blocked or redacted.

`MEASURED`: claims ledger tags include `PROVEN`, `PARTIAL`, `DRAFT`, `PROPOSAL`, `OPERATOR_GATED`, `ASPIRATIONAL`, and `RETIRED`.

`CANON-in-file`: capacity/addressability is not resident runtime. Address IDs, 100B packet ledgers, 10B human PID ledgers, room route capacity, and storage/cube catalogs must remain separate layers.

## I. Slice Divergences for Bilateral Compare

- `DIVERGE-by-slice`: FNV-1a64 source formula is in Acer generation material, not in the eight public clone roots searched here.
- `DIVERGE-by-slice`: exact `model-citizen`, `rotateGnn`, `rotate-gnn`, and `map-sync` source symbols were not in the eight clone roots. Nearest public clone material is model-selector/provider-router descriptors. The model-citizen prism source remains a separate source/commit lane.
- `CONFLICT-kept`: active AGENTS law preserves `03 OP-FELIPE`, `04 OP-DAN`, `05 OP-AMY`; some older clone rows carry `03 Amy` and `05 Felipe`. Active law wins for this seat; older rows remain historical evidence.
- `UNVERIFIED-live`: all live daemon PID, executor state, cosign head, provider call, phone reachability, Drive quota, and USB attachment claims are not remeasured here.

## J. Next Append Points

- Lanes 26-40 can append a second Liris file or replace this seed with a v2 after all open lanes close.
- Liris should recompute Acer-only formulas from their source lane where accessible: FNV-1a64 generator, `model-citizen-rotator.mjs`, and the 100B runner/checkpoint sources absent from these clones.
- Map repos should reference this repository as the algorithm/formula comparison home, with this file as the Liris-side seed.
