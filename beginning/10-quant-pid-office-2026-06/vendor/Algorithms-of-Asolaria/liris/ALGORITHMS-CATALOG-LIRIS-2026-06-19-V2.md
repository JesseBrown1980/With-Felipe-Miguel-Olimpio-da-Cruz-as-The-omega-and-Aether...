# Algorithms of Asolaria - LIRIS catalog supplement v2 (2026-06-19)

This supplement extends `ALGORITHMS-CATALOG-LIRIS-2026-06-19.md`. It incorporates the second Liris harvest wave across the eight local clone slices plus the Algorithms repo itself.

Scope: read-only file-byte scour plus read-only fabric status checks. No live provider call, USB write, Falcon/device action, cloud call, runtime mutation, cube write, or PID-office crank was fired by this supplement. Runtime claims remain `UNVERIFIED-live` unless a separate live receipt says otherwise.

Claim tags:

- `MEASURED`: expression or row was read from local bytes, or recomputed as a deterministic expression from those bytes.
- `CANON-in-file`: a repo/canon/receipt row states the claim, but this pass did not re-run the underlying system.
- `MODEL`: pseudocode distilled from measured source; it is not a claim that the exact source exists under that name.
- `OPERATOR`: operator-sourced exact number or frame; preserve it without downgrading to local file-size evidence.
- `UNVERIFIED-live`: live port/process/device/provider/cloud/fabric mutation was not checked or was served only through fallback.

## V2 corrections over the Liris seed

### FNV / Host8 is now measured in the clone slice

`MEASURED`: the seed said FNV-1a64 was absent from the eight clone roots. That is now stale. The Asolaria clone contains Rust Host8 source:

```text
h = 0xcbf29ce484222325
for byte in canonicalized_utf8(input):
  h = (h XOR byte) * 0x100000001b3 mod 2^64
host_handle8 = lower_hex_16(h)
```

Evidence: `Asolaria/federation-remake-1024/servers/host8-serve/src/main.rs:175-185`; kernel bus fabric also carries a FNV-1a-64 phase-1 byte contract at `Asolaria/federation-remake-1024/kernel/core/src/bus_fabric/mod.rs:86-163`.

`MEASURED`: Host8 receipts in the intake rows state `host8-serve-fnv1a64-canonicalized`, with Liris/Acer recomputes over roomstub manifests and zcode pack handles. Examples include PID-roomstub crossverify rows and zcode reattack rows. Activation, serving, swap, and retirement remain `UNVERIFIED-live` here.

### Model-citizen source and descriptor are split

`MEASURED`: `model-citizen-rotator.mjs`, `rotateGnn`, and `rotate-gnn` implementation source files were still not present in the requested clone roots.

`CANON-in-file`: model-citizen descriptors are present in the map/index files: `16` citizens plus `2` supervisor seats; transports are described as CLI/HTTP/redis/web; firing is gated by `MODEL_CITIZEN_ROTATOR_LIVE` plus census-ready. The descriptor bridge is therefore present; source execution and any live citizen firing are `UNVERIFIED-live`.

Seed pseudocode from Acer remains a model until the exact source is visible on this seat:

```text
pid = "MODEL-" + UPPER(id) + "-" + UPPER(sha16(id + "|" + kind)[:6])
bh = hilbertEncode([cp & 0xf, (cp >> 4) & 0xf, (cp >> 8) & 0x3], dims=3, bits=4)
cube_cell = "cube:model-cp" + cp + "-bh" + bh
glyph = sha16("glyph|" + id + "|" + cp)
```

## A. Expanded addressing and geometry

`MEASURED`: REALMATHPOS/GitHub PID registration uses:

```text
safe = UPPER(name).replace(/[^A-Z0-9]+/g, "-")
h = sha256(safe)
seed = u32(h[0:8])
lane = seed % 3
quad = seed % 4
glyph_5 = seed % 5
glyph_1024 = seed % 1024
sector = seed % 113
hilbert = u32(h[8:16])
cube_bh = BH.sector.lane.glyph_1024
sha16 = h[0:16]
```

Evidence: `ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/github-pid-register.mjs:15-66`.

`MEASURED`: Brown-Hilbert point linearization and watcher mapping:

```text
bh_index = sector * (1024 * 3) + lane * 1024 + glyph_1024
cylinder_ring = floor(bh_index / 6)
cylinder_phase = bh_index % 6
watcher_lane = ["hookwall", "gnn", "shannon"][lane % 3]
distance = abs(bh_i - bh_{i-1})
```

Evidence: `ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/pre-existence-graph-exporter.mjs:47-108`.

`MODEL/CANON-in-file`: Brown-Hilbert/Sidon/PRST documents carry a richer distance frame:

```text
EdgeID(A,B) = H(PID_A, PID_B, BH_A, BH_B, C_A, C_B, q_A, q_B, e)
Sidon target: all C(N,2) pairwise distances distinct
r_p = sqrt(p)
cross_cylinder_distance = r_p^2 + r_q^2 - 2*r_p*r_q*cos(delta_theta) + delta_z^2
active_pairs = m*(m-1)/2
```

The `627 points -> 196,251 pairwise distances -> 0 collisions` row is `CANON-in-file`, not remeasured here.

## B. BEHCS and address capacity

`CANON-in-file`: BEHCS tiers remain capacity surfaces, not live runtime:

```text
BEHCS-256: 256^8 for 8-byte handles
BEHCS-1024: 1024^60 = 2^600 ~= 10^180
BEHCS-2048: 2048^60 ~= 10^198
47D -> 60D growth ~= 10^39
modeled stack: 1024^60 * 17! * 16 ~= 10^196
language space: (1024^60)^50 ~= 10^9030
```

Boundary: capacity/addressability does not imply fired agents, resident processes, provider calls, or materialized rows.

## C. Quant, codecs, and compression

`MEASURED`: Quant8 huge-message core:

```text
D = 1024
h = (i * 2654435761) >>> 0
bucket = h & (D - 1)
signed_add = high_bit(h) ? +value : -value
v = proj[j] / max_abs
q = round(v * 127)
zeta = a < 1e-9 ? 15 : min(15, floor(-log2(a)))
triple = v > 0.33 ? 1 : v < -0.33 ? -1 : 0
quad = v > 0.5 ? 3 : v > 0 ? 2 : v > -0.5 ? 1 : 0
dotQ = sum(qA*qB) * scaleA * scaleB / 16129
tail_law = O(1) per consumer after O(size) head ingest
```

Evidence: `ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/quant-huge-message-benchmark.mjs:11-89`.

`MEASURED`: JL/Achlioptas sparse projection:

```text
bucket = parseInt(sha256(seed|row|col)[0:12], 16) % 6
weight = sqrt(3) if bucket == 0; -sqrt(3) if bucket == 1; else 0
targetDimension = max(1, min(4096, round(opt || ceil(sqrt(N)*2))))
projection_scale = 1 / sqrt(targetDimension)
```

Evidence: `Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs:57-80`.

`MEASURED`: Turbo/polar/triple codecs:

```text
Turbo: scale = (max - min) / (2^bits - 1); q = round((value - min) / scale)
Polar: r = sqrt(x^2 + y^2); angle = atan2(y,x); rCode = round(r/radiusScale); aCode = round(angle/(2*pi)*levels)
Triple: r = sqrt(x^2 + y^2 + z^2); theta = acos(z/r); phi = atan2(y,x)
Reconstruct triple: [r*sin(theta)*cos(phi), r*sin(theta)*sin(phi), r*cos(theta)]
```

Evidence: `.../hyperbehcs-core.cjs:92-210`.

`MEASURED`: quant huge-message benchmark rows report fixed `3,200` byte tuples, head ingest around `1.8-2.1GB/s`, and one largest row at `2,048MB`, `1062ms`, `79,303x` SHA gain, `4,662x` write gain, `1,698x` compare gain, `7.2x` e2e. Boundary: benchmark receipt, not semantic-fidelity proof or live fabric binding.

`MEASURED/CANON/OPERATOR`: compression claims are multiple regimes and must not be collapsed:

- measured row compression: lean roster `4.31x` full-N verb ratio, rich IX/LX `6.71x`, microkernel manifest `10.66x`, root corpus SHA index `38.53x`, 8-byte glyph floor `292x`;
- referential compression: raw harvest to BEHCS-256 `6,024x`, BEHCS-256 to cube glyph `320x`, raw-to-cube `1,927,778x`;
- operator/canon anchors: `21,141:1` and about `3,000,000,000:1` preserved as operator/canon, not rederived file-size readings;
- BIML `394.49x` belongs to byte/work framing, not a universal speed scalar.

Parse/stringify ratios remain `UNVERIFIED` here because the referenced latest benchmark report was not present in the requested clone roots.

## D. 100B packet law and resident bounds

`CANON-in-file/MEASURED-row`: 100B proof rows describe a virtual packet run:

```text
processedPackets = 100,000,000,000
chunks = 100,000
genius = 277,800,007
mistake = 111,103,104
childProcessSpawns = 0
externalModelTokens = 0
digest(i) = sha256("BH.REAL100B.OPENCODE.PID." + zeropad(i,12))
score = round3(0.82 + u*0.18)
reverseGain = round3(0.55 + u*0.45)
genius_window = 1/360
mistake_window = 1/900
```

New-run receipt: `235.7s`, about `424,251,128 packets/sec`, zero child process spawns, zero external model tokens, zero network. Boundary: deterministic packet math and benchmark receipt, not live LLM inferences.

`MEASURED`: resident cap law:

```text
DEFAULT_MAX_RESIDENT = 2000
resident = min(n, maxResident)
released = max(0, n - resident)
```

## E. GNN, MTP, HRM, zeta

`MEASURED/CANON-in-file`: GNN source/docs include graph attention with typed edge embeddings, target `2,158,671` directed edges, p99 budget `100ms`, batch target `40,783/sec`; fallback ranking uses:

```text
score = 1.0 - i * 0.001
unloaded_model_verdict = Hold
```

Evidence: `Asolaria/federation-remake-1024/kernel/docs/GNN_ARCH.md`; `kernel/core/src/gnn/mod.rs`.

`MEASURED`: MTP heads:

```text
headSeed = (seed ^ (h * 0x9e3779b1)) >>> 0
trajectory = predictKPositions(cp0, depth, {seed: headSeed})
final_position = hilbertDecode(idx, {dimensions: 3, bits: 4})
hit_rate = hits / actual.length
```

Evidence: `Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/mtp-heads.mjs:20-102`.

`MEASURED/MODEL`: HRM slow/fast stub:

```text
shape in {linear, branch, spiral, fold, cascade, ring, star, fractal}
branching_factor = star ? 4 : branch ? 2 : 1
candidate = vonMangoldtNext(cp, {seed, step:i})
branch = cp + round(64*t*sign)
spiral = cp + round(32*sin(i*0.7))
fold = cp + round(48*cos(i*0.4))
cascade = round(cp*(1 - t*0.1))
ring = cp + round(16*sin(i*pi/4))
star = cp + round(96*sign*t)
fractal = round(cp/(1 + 0.1*t))
```

Boundary: canon says trained HRM fork has zero weights/stub state in this slice.

`MEASURED`: zeta/von-Mangoldt chain:

```text
for d <= floor(sqrt(n)): collect divisors
weight(q) = Lambda(q) / log(cp) for q > 1
u = deterministicUnit(seed ^ cp, step) * totalWeight
next = max(2, round(cp / q))
```

Boundary: source marks accuracy unproven and `cp=2` absorbing.

## F. Storage, cube, tensor, and document ingest

`MEASURED`: Google Drive document -> cube ingest:

```text
sha = sha256(text)
cube10 = sha[0:20]
handle8 = sha[0:16]
word_glyph = sha256(word)[0:8]
bucket_vector = 8 signed token buckets, clamped 0..255
ratio8 = raw_bytes / 8
ratio10 = raw_bytes / 10
```

`MEASURED`: Google cloud station/job map has `GCSEAT` rows from existing cloud seats and `GCNEWJOB` rows for new jobs. Conflict kept: the array has `16` seat entries while comments/rows refer to `17`.

`CANON-in-file/MEASURED`: tensor collapse is a chain, not one program:

```text
6*6*6*12 -> 28
6*6*6*6*12*3 = 46656 -> 47
```

`MEASURED`: shard-quant cube has `100` rooms, each with an 8-dim vector folded through JL, Turbo, polar, and triple/spherical codecs. It is descriptor/software-only in this pass.

`MEASURED`: token-cube binder:

```text
bh_lane = index mod 3
bh_ppow = unit | prime | p2 | p3 | pk | composite
digest = 16 lowercase hex
live/mint/write/disputed-band => defer
```

`MEASURED`: program-cube descriptor pipeline:

```text
census -> map3 -> cube3 -> hookwall -> gnn -> omnishannon -> white-room -> gc -> promotion-gate
map3 = sha16("map:id:lane:status")
cube3 = sha16("cube:map3:evidence")
pid16 = sha16("pid:id:cube3")
process_launch = 0
live_patch = 0
raw_write = 0
```

## G. Toolchain and archaeology formulas

`MEASURED`: migration/provenance rows treat historical files as evidence, not current runtime truth:

```text
shape_fingerprint = non_empty_lines + imports/exports + body_hash + final_hash
provenance = old_path + new_path + sha256 + byte_count + line_count + rule + migration_session
```

Migration tooling is dry-run first, hash-verified, rollbackable, idempotent, and provenance-emitting. Toolchain surfaces include VS Code/Cursor/Antigravity/Symphony/Codex CLI/MCP/Web MCP/API sidecars, routers, watchdogs, MQTT, Redis, SQLite, hybrid messaging, and provider-router descriptors. Runtime use of those surfaces remains `UNVERIFIED-live` here.

## H. Security, gates, tiers, and cosign

`MEASURED`: cosign rolling hash and row hash:

```text
prev_sha[i] = sha256(lines[0..i-1].join("\n") + "\n")
seq = max(seq) + 1
antecedents = [prev.row_hash]
row_hash = sha256(canonical_row)[0:16]
```

`MEASURED`: ed25519 signing material is present in the clone slice under an immune supervisor key path, and daemon source signs/verifies with it. Value redacted. Boundary: file bytes alone do not prove whether the key is dummy/sample/live, and secret policy still says private material is a carve-out.

`MEASURED`: USB write path is explicitly gated:

```text
if !preflight_green(): refuse writable open
if !unsafe_write: return error
if auth_token != REDACTED_EXPECTED_TOKEN: return error
then write_sector(...)
```

`MEASURED`: token/cube catalog avoids publishing values:

```text
if dirty or null: invalid
if material_shaped: redacted
else validator(value) ? value : invalid
```

`MEASURED`: Drive/cloud transport keeps tokens by role/env, not in repo bytes. Common credential regex scan found `0` GitHub/Google API/OAuth/AWS/OpenAI/Slack-style token-shaped files in the scoped clone scan, excluding non-standard USB token and the tracked PEM reported separately.

`MEASURED`: tier policy conflict: userspace tier-policy crate declares `6` tiers and says it mirrors the ABI, while kernel core declares `7` tiers including Sovereignty; ABI docs still list `6`. Keep as `CONFLICT-kept` until resolved by owner evidence.

`MEASURED`: tier gate formula:

```text
if target == Sovereignty and caller != Sovereignty: Deny
if caller == Sovereignty: Allow
```

## I. Observability and route health

`MEASURED`: route health state machine:

```text
2xx -> UP
400/401/403/404 -> ROUTE_BOUNDARY
other HTTP -> HTTP_DEGRADED
timeout -> TIMEOUT
error -> DOWN
no signal -> UNPROBED
answered = UP | ROUTE_BOUNDARY | HTTP_DEGRADED
```

`CANON-in-file`: `:4947` bus health route is `/behcs/health`; `/health` on the bus is a route boundary, not outage proof. Localhost health is vantage-relative.

`MEASURED`: fallback markers are degraded sensors, not live proof: `HBPFALLBACK`, `_fallback`, stale, missing, metadata-only, `bus_fallback_status`, and `degraded_bus_fallback` must not be promoted to live runtime truth.

`MEASURED`: dashboard resolver is a pure scope-demotion resolver: no launch, fabric call, or write. It rejects dirty input, demotes unknown devices/conflicts/stale timestamps, and emits tight routes only when PID, device, and timestamp are proven.

## J. Formula-PID registration boundary

`MEASURED`: read-only fabric status on this seat returned `HBPFALLBACK` for the supervisor feed, with `726` canonical rows from `D:/PID-Registration-Office`; examples show seat PID as sha16/8-byte handle and classes including prof supervisors, supervisor-of-supervisors, chiefs, hyperbehcs supervisor entities, and room-sector shards.

`MEASURED`: read-only loop pending showed `EVT-MINT` envelopes and the 8-stage review pipeline:

```text
HOOKWALL_CLASSIFY
PID_LAZY_MINT_BROWN_HILBERT
BEHCS1024_TRANSLATE_GLYPH
GNN_PIPE_SCORE
SHANNON_NOVELTY
GULP_COLLAPSE_DRIFT
WHITEROOM_HOLD_OR_RELEASE
FABRIC_FREE_AGENT_ROUTE
```

The same read shows `auto_fire_allowed=false` and anti-drift text that GNN inference is proposal, Hookwall receives every dispatch, and high-risk mutation/execution stays held.

Therefore: this supplement can describe formula-PID intent and deterministic formula identities, but it does not claim that Liris fired a PID-office crank, wrote cube rows, or registered formulas into live runtime. Acer-side fired receipts, if posted later, should be compared as a separate `MEASURED-runtime` artifact.

## K. Open edges after v2

- model-citizen rotator implementation source is still absent from this clone slice;
- live provider calls, GNN inference, fabric mutation, USB attachment/write, Falcon phone state, cloud quota, Drive round-trip, cosign head, and formula-PID firing are `UNVERIFIED-live` here;
- Acer physical-substrate scour #2 and formula-PID registration receipts should be compared when posted;
- sidecar and line-ending policy should be normalized before treating adjacent `.sha256` files as cross-seat byte proof.
