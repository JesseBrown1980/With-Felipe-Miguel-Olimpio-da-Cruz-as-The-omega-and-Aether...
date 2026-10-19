# Asolaria Quant / Reductions Anchor

Status: `MEASURED_LOCAL_ARTIFACT` for the Liris-local files and fresh bounded rerun below; `ACER_MACHINE_TAGGED_RECEIPT` for Acer 1-2GB rows accepted by Liris readback. This is the quant/reduction layer Q-PRISM should inherit.

## Why This Matters

Q-PRISM should not treat the SpanishBCBL/Brain2Qwerty substrate as a giant raw-data problem. The Asolaria quant work already proved the right pattern for large payloads:

```text
raw evidence stays cold / local / licensed
one-time head pass extracts the quant tuple
repeated schedule, search, compare, hash, and routing operate on the constant tuple tail
```

That is the useful reduction for neural control streams: not a claim that arbitrary raw bytes are magically reconstructable from 3.1KB, but a measured tail-cost collapse for downstream consumers.

## Local Proof Sources

Liris-local proof files read on 2026-07-01:

- `C:\Users\rayss\ASOLARIA-AS-NEURAL-NETWORK\docs\ACER-QUANT-HUGE-MESSAGE-BENCH-2026-06-11.hbp`
- `C:\Users\rayss\ASOLARIA-AS-NEURAL-NETWORK\docs\LIRIS-QUANT-HUGE-MESSAGE-BENCH-READBACK-2026-06-11.hbp`
- `C:\Users\rayss\ASOLARIA-AS-NEURAL-NETWORK\docs\QUANT8DEFS-CODE-GROUNDED-2026-06-11.hbp`
- `C:\Users\rayss\ASOLARIA-AS-NEURAL-NETWORK\docs\QUANTFIDELITYSPEC8-2026-06-11.hbp`
- `C:\Users\rayss\ASOLARIA-AS-NEURAL-NETWORK\docs\LIRIS-QUANTFIDELITYSPEC8-READBACK-2026-06-11.hbp`
- `C:\Users\rayss\ASOLARIA-AS-NEURAL-NETWORK\docs\LIRIS-QUANTFIDELITYSPEC4-BUILD-2026-06-13.hbp`
- `C:\Users\rayss\what-is-asolaria-reductions\canon\REDUCTIONS-HONEST-BOUNDARY.md`
- `C:\Users\rayss\asolaria-map-work\SOTA-BENCH-AND-QUANT-FINDINGS-2026-06-23.md`

## Measured Shape

Acer receipt, accepted by Liris readback:

```text
QUANTBENCHRESULT|message=1MB|head_ms=1.3|sha_gain=62x|write_gain=2x|compare_gain=8x|payload=3.1KB|json=0
QUANTBENCHRESULT|message=64MB|head_ms=25.2|sha_gain=4774x|write_gain=158x|compare_gain=166x|payload=3.1KB|json=0
QUANTBENCHRESULT|message=256MB|head_ms=123|sha_gain=10239x|write_gain=637x|compare_gain=210x|e2e_gain=8.1x|json=0
QUANTBENCHRESULT|message=1024MB|head_ms=574|sha_gain=66158x|write_gain=2881x|compare_gain=1781x|e2e_gain=6.8x|json=0
QUANTBENCHRESULT|message=2048MB|head_ms=1062|sha_gain=79303x|write_gain=4662x|compare_gain=1698x|e2e_gain=7.2x|ingest=1928MBps|json=0
```

Liris readback reran the same tool at 1/64/256MB and confirmed the law shape:

```text
LIRISQUANTRBACCEPT|law_shape_confirmed=head-O(size)-paid-once+tail-O(1)-per-consumer+payload-constant-3.1KB|acer_huge_1GB_2GB_rows=ACCEPTED_AS_ACER_MACHINE_TAGGED_RECEIPT|json=0
```

Fresh bounded Liris rerun for this Q-PRISM cell, using `tools/behcs/quant-huge-message-benchmark.mjs --run --sizes=1,8,64 --disk`:

```text
QUANTBENCHLIVE|message_mb=1|head_ms=2.1|sha_raw_ms=1.5|sha_q_ms=0.049|write_raw_ms=1.1|write_q_ms=0.582|cmp_raw_ms=1.4|cmp_q_ms=1.013|payload_kb=3.1|json=0
QUANTBENCHLIVE|message_mb=8|head_ms=15.7|sha_raw_ms=12.6|sha_q_ms=0.043|write_raw_ms=4.5|write_q_ms=1.056|cmp_raw_ms=1.9|cmp_q_ms=0.011|payload_kb=3.1|json=0
QUANTBENCHLIVE|message_mb=64|head_ms=49.7|sha_raw_ms=76.8|sha_q_ms=0.036|write_raw_ms=187.7|write_q_ms=0.727|cmp_raw_ms=14.4|cmp_q_ms=0.162|payload_kb=3.1|json=0
```


## Full Absorption Stack

The Q-PRISM data path inherits the whole posted reduction stack, not only the 3.1KB huge-message bench.

```text
incoming signal / corpus / event stream
  -> representation algorithms: Johnson-Lindenstrauss, turbo quant, polar quant, triple quant, zeta / von-Mangoldt lanes
  -> BEHCS tuple addressing: glyph / sha / hex / binary / HBI / HBP / human labels
  -> HyperBEHCS / D22 translation: one object can travel through multiple language surfaces
  -> cube receipts: descriptor, address, digest, route, and recomputation rule
  -> bounded live chamber or downstream scheduler only when a slice is materialized
```

Posted GitHub evidence read from `JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything`:

- `SOTA-BENCH-AND-QUANT-FINDINGS-2026-06-23.md`: BEHCS-1024 descriptor density, 6,332,294 B of verbose descriptors to 12,164 B of glyph tuples, `520.6:1`, tagged addressing-not-codec.
- `OLD-COMPRESSION-GROWTH-CURVE-MEASURED-2026-06-16.md`: growth curve across lean roster, rich IX/LX, micro-kernel, and root IX/LX corpus, including the phase line `cube/glyph/HyperBEHCS-folding`.
- `cubes/README.md`: cubes are inference structures, descriptor receipts, tuple-range address models, and bounded live-worker patterns.
- `cubes/sample-shard-quant-cube.annotated.json`: one shard cube folds 100 rooms through Johnson-Lindenstrauss, turbo quant, polar quant, and triple quant, descriptor-only with zero process/provider/hardware authority counters.
- `cubes/cube-manifest.hbp`: cube10 / handle8 content addresses, distinct terms, glyph reuse, and corpus-reuse reduction rows.

So the operational word is absorption: the fabric maps an input into the addressable representation stack until the working object is a cube. The cube is the address plus descriptor plus digest plus route plus recomputation/proof rule. The high-entropy residual is held once or referenced by content hash; it is not required to be reconstructed from the small tuple.

For Q-PRISM this means each MEG/EEG/organoid window should become a cube chunk with fields like:

```text
QPRISM_CUBE_CHUNK|schema=qprism.cube_chunk.v1|source_sha256=...|window=...|tuple_sha256=...|behcs=...|cube10=...|handle8=...|quant_lanes=jl+turbo+polar+triple+zeta|raw_in_repo=0|derived_only=1|json=0
```

That is the 43+ / 47D / 60D+ absorption frame in repo terms: addressable levels and language surfaces represent the input; the scheduler consumes the cube-level control signature.
## Boundary

The old receipts are honest about their boundary:

- Quant8 huge-message bench is `FAITHFUL_TO_DOCTRINE_NOT_FABRIC_ENGINE_BINDING`.
- Quant8 semantic/gate-safe fidelity stayed `UNSWEPT` until the fidelity sweep; the pilot found an f4b cancellation failure, so quant tuples are routing/control hints, never proof gates by themselves.
- Quant4 is a separate live address/evidence path. Liris built and piloted `QUANTFIDELITYSPEC4` with identity collisions `0`, PID collisions `0`, sector coverage `113`, glyph coverage `1024`, result `PASS`, and grade `ROUTING_HINT_MEASURED_NOT_GATING`.
- The reductions canon states the 3.1KB tuple is referential/addressing compression plus a measured head/tail complexity reduction, not arbitrary raw-byte decompression.

## Q-PRISM Consequence

For SpanishBCBL and later neural/organoid streams:

```text
raw MEG/EEG/biological signal -> one-time feature extraction / quant head pass -> 3.1KB-ish control tuple -> repeated schedule proposals and comparisons
```

Q-PRISM may claim a compact derived control signature when the tuple improves simulator or hardware metrics under the harness. It may not claim raw neural archive reconstruction, arbitrary thought decoding, or quantum-consciousness coupling from this layer alone.
