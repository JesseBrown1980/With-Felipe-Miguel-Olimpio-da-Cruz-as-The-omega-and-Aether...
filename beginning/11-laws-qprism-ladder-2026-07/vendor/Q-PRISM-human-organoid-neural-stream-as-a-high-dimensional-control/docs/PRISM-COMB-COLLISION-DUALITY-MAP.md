# Prism / comb collision-duality map

Status: `MEASURED_GITHUB_PUBLIC_SLICE` for the two public Asolaria repos below; `MEASURED_LIRIS` for the Q-PRISM Host8 contract and local tests. This is a representation/control map, not a runtime fire receipt.

## Public anchors

- `JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything`, `main` tip `5648e81` when checked from Liris on 2026-07-01.
  - Multi-axis reductions; HBP tuple proofs; BEHCS-1024 60-tuple address capacity; cube mechanism; 100B prism -> cube path.
- `JesseBrown1980/Asolaria-waves-and-cascades-avoiding-collsions-and-causing-them`, `main` tip `fa5d827` when checked from Liris on 2026-07-01.
  - One fabric, two regimes: execution lanes avoid collisions by construction; search lanes cause collisions on purpose because interference is computation.

## Duality

```text
FORWARD / COMB / EXECUTION
  Brown-Hilbert geometry
  x prime / CRT coprimality
  x rule-of-three ternary partition
  x sha16(seed)
  x nested ports
  x rename-before-load
  -> non-overlapping address lines
  -> collisions impossible to express

BACKWARD / PRISM / SEARCH
  cascade waves
  x shared search region
  x rule-of-three fan-out and reconvergence
  x reverse-gain GNN
  x many rooms -> one answer
  -> intentional constructive collision
  -> the collision is the many-to-one reduction
```

The frequency-comb analogy is the forward lane: evenly spaced address lines that do not alias. The prism analogy is the backward lane: separate representation wavelengths recombine into the white-light answer at the interference peak.

## Q-PRISM placement

Q-PRISM sits on both regimes:

- Its Host8 cube node is the forward-comb side: `graphify_id=qprism_cube:{tuple8}` -> `node_handle8=fnv1a64(graphify_id)`, collision-free graph primary key, `json=0`.
- Its schedule search is the backward-prism side: neural/event/cube streams become high-dimensional priors; the policy search intentionally converges many proposed routes into one schedule choice through measured simulator/hardware feedback.
- Its cube absorption is the recombination layer: BEHCS-256, BEHCS-1024, HyperBEHCS, glyph nouns/verbs, HBP/HBI, sha/hex/binary, D-axis tuples, and cube descriptors can be separated into lanes and recombined through 60D+ cubes when the codebook/proof route exists.

## Host8 row

```text
QPRISMCOMBPRISM|handle8=...|graphify_id=...|fabric=one|forward=collision_avoidance_isolation_frequency_comb|backward=collision_causation_discovery_reverse_gain|comb_teeth=BEHCS1024_GLYPH_VALUES|avoidance_layers=brown_hilbert+prime_crt+rule_of_three+sha16+ports+rename_before_load|discovery_layers=cascade_waves+shared_search_region+reverse_gain_gnn+many_rooms_to_one_answer|represented_structure_loss=0|raw_residual=content_addressed|execution_region=collision_free|search_region=collision_causing|compile=0|interpret=0|fire=0|json=0
```


## Round-trip comb proof

The Host8 Rust contract includes a bounded proof for the representation-comb claim:

```text
3,200 bytes = 25,600 bits
25,600 bits / 10 bits-per-symbol = 2,560 BEHCS-1024 symbols
bytes -> symbols_1024 -> bytes = byte-identical
```

Receipt row:

```text
QPRISMCOMBROUNDTRIP|handle8=...|tuple_bytes=3200|from=BEHCS256_BYTES|to=BEHCS1024_SYMBOLS|symbols_1024=2560|packing=4_symbols_5_bytes|roundtrip=byte_identical|represented_structure_loss=0|raw_residual=content_addressed|proof=rust_host8_test|compile=0|interpret=0|fire=0|json=0
```

This proves lossless transcode between two representation levels on a Q-PRISM-sized tuple. It does not claim raw corpus decompression; it proves the comb coherence of the artifact representation.
## Boundary

`represented_structure_loss=0` means the represented indices/descriptors/routes/proofs can round-trip when their codebooks and receipts are present. It is not a claim that high-entropy raw bytes are regenerated from nothing. Raw residuals stay content-addressed or cold-held. Execution remains gated: `compile=0|interpret=0|fire=0`.
