# N-VANTAGE 30 composed Path-1/Path-2 formula addendum — 2026-07-13

## Evidence owner

Executable source, the complete workflow, sealed Markdown/HBP receipts and cross-repository map live in:

- [`HYPER-BECHS--the-third-set/n-vantage-30-v1`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/tree/main/n-vantage-30-v1)
- [`HYPER-BECHS--the-third-set#21`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/pull/21)

Merged HyperBEHCS commit:

```text
5fa9972643a297ad745c48204af950b255fffbca
```

Current-head independent confirmation:

```text
run      29253184378
job      86826420927
artifact 8280227276
artifact SHA-256
         97c50609db3293745d9003c70b1bdecbfbb4f87f0fbfa8f301aa656df6d121c7
```

## Formula registry

### `F-NV30-CAPACITY-LADDER-v1`

For a 60-symbol source stripe over `F_257`, each viewpoint contributes eight independent rows:

```text
rank(A_k)    = min(8k,60)
nullity(A_k) = 60 - rank(A_k)
```

Measured:

```text
k=1   rank  8  nullity 52  HOLD
k=4   rank 32  nullity 28  HOLD
k=7   rank 56  nullity  4  HOLD
k=8   rank 60  nullity  0  RECOVER
k=30  rank 60  nullity  0  OVERDETERMINED VERIFY
```

Claim class: `MEASURED_THEOREM_INSTANCE`.

### `F-NV30-COMPLETE-BODY-PATH2-v1`

For complete source body `X`, stripe matrix `B∈F_257^(60×m)` and view matrix `A`:

```text
Y = A B mod 257
B_hat = A_I^-1 Y_I mod 257
```

Emission requires:

```text
SHA256(B_hat) = SHA256(B)
A B_hat = Y
```

Measured on a real 250,000-byte enwik8 slice:

```text
k=8 body recovery exact
k=8 reprojection mismatches   0
k=30 reprojection mismatches  0
five random eight-view subsets exact
five random seven-view subsets held
```

This upgrades the earlier selector-only 60D theorem instance to no-store recovery of an entire body.

Claim class: `MEASURED_EXACT_RECOVERY`.

### `F-NV30-FOUR-LIGHT-WATCHER-v1`

Four redundant projection families are named:

```text
DBBH_FORWARD
DBBH_REVERSE
DBWH_FORWARD
DBWH_REVERSE
```

For each family, change one redundant field element and require:

```text
A B_hat != Y_tampered
-> HELD_WATCHER_DISAGREEMENT
```

Measured: one mismatch in every family, every result held. A corruption in the recovery basis changed
the body SHA and generated four selected-set reprojection mismatches.

Claim class: `MEASURED_TAMPER_GATE`.

### `F-PATH1-FULLDIGEST-FEDCAP-v2`

The experimental successor capsule uses:

```text
object_id = SHA-256(X)
```

and a Merkle root over watcher attestations. Recovery is:

```text
store[object_id] = X
and SHA-256(X) = object_id
```

otherwise:

```text
HELD_MISSING_RETAINED_BODY
```

Measured:

```text
solo zstd-19 body             78,133 B   2.500256 bpc
full 8-watcher capsule         1,803 B   0.057696 bpc
compact Merkle capsule           106 B   0.003392 bpc
full 30-watcher capsule        5,196 B
compact 30-watcher capsule       106 B
wire discount vs solo        737.103774x
```

The compact capsule moves watcher proof bodies behind a Merkle root; it does not erase retained body
or proof storage.

Claim class: `MEASURED_RETAINED_STORE`.

### `F-NV30-CAPSULE-LEARNING-v1`

A full eight-watcher capsule is encountered repeatedly. Previous capsule plaintext is used as a
control-schema dictionary:

```text
R_t = 8*|wire_t|/|body|
```

Measured:

```text
pass 1  0.027872 bpc
pass 2  0.015168 bpc
pass 6  0.015424 bpc
```

Pass 2 reproduced the reported `0.0154 bpc` closely. Pass 6 did not reproduce the reported
`0.0113 bpc`; this implementation plateaued near `0.0153 bpc`.

Claim class: `MEASURED_CONTROL_SCHEMA_LEARNING`.

### `F-NV30-PRIOR-TRANSFER-v1`

Let `M_t` be an exact adaptive order-2 prior. Every message is decoded from an independent clone of
the pre-message state, requiring byte equality and final model-state equality.

Same-object measured curve:

```text
pass 1  3.214496 bpc
pass 2  2.778656
pass 3  2.744512
pass 4  2.730528
pass 5  2.722240
pass 6  2.716800
```

Unseen object B:

```text
cold                3.304224 bpc
warm after A×1      3.130752 bpc   5.250% gain
warm after A×3      3.163104 bpc   4.271% gain
warm after A×6      3.188864 bpc   3.491% gain
```

The reported `74.2%` unseen-content gain did not reproduce in this model family.

Prior-state ledger after six passes:

```text
dense table            67,108,864 B
non-default cells          16,983
sparse estimate           118,913 B
exact zlib checkpoint     108,586 B
```

Claim class: `MEASURED_EXACT_LEARNING`, with the stronger operator curve retained as
`OPERATOR_REPORTED_NOT_REPRODUCED`.

### `F-NV30-SCHEMA-TRANSFER-v1`

A capsule for unseen body B is encoded cold and using schema learned only from A:

```text
cold capsule  0.027840 bpc
warm capsule  0.015488 bpc
gain          44.367816%
```

B was pre-retained for the positive Path-1 case. Removing B from the store still held. This is
control-plane transfer, not body compression.

Claim class: `MEASURED_SCHEMA_TRANSFER`.

### `F-NV30-CATALOG-TRANSFER-v1`

A BPE/glyph catalog learned only from A was applied to unseen B and reversed exactly:

```text
1 level incremental  2.882752 bpc
1 level standalone   2.949184 bpc
2 level incremental  2.881120 bpc
2 level standalone   3.013280 bpc
cold zstd-19         2.619680 bpc
```

The transferred glyph catalog increased cost on this slice.

A separate zstd-dictionary control found:

```text
32-KB dictionary incremental  2.593344 bpc   1.005% gain
including dictionary          3.641920 bpc  39.02% worse
```

Claim class: `MEASURED_NEGATIVE_AND_CONTROL_RESULT`.

### `F-NV30-COMPOSED-GATE-v1`

Composed emission requires:

```text
Path1Recall(X) = X
Path2Recover(Y) = X
Path2Reproject(X) = Y
SHA256(Path1) = SHA256(Path2)
```

Measured:

```text
Path 1 SHA
665fc689441b68462d88f82dc33212abe9c4824be095d03a556c9b55a2829fd3

Path 2 SHA
665fc689441b68462d88f82dc33212abe9c4824be095d03a556c9b55a2829fd3

reprojection mismatches 0
VERIFIED_CLONE / 0 LOSS
```

Claim class: `MEASURED_COMPOSED_EXACTNESS`.

### `F-NV30-COMPOSED-CONSERVATION-v1`

The complete ledger is:

```text
L_total = retained bodies
        + Path-1 capsules/proofs
        + Path-2 shadows
        + prior checkpoints
        + shared catalogs
        + receipts/indexes/telemetry
```

Measured before telemetry:

```text
source body                    250,000 B
Path-1 retained bodies       2,000,000 B
Path-1 state                 2,012,621 B
Path-2 minimum k=8 shadows     533,376 B
prior checkpoint               108,586 B
shared BPE catalog               2,076 B
composed state               2,656,659 B
```

With current-head full OMNIEVENT rows:

```text
full event bytes               171,883 B
composed + full events       2,828,542 B
```

Claude's `2,009,218 B` is close to the Path-1-only retained-body ledger, not the full composed ledger.
Marginal routes can be extremely small; the distributed/retained total does not violate Shannon.

Claim class: `MEASURED_CONSERVATION`.

### `F-NV30-PRIME-TRIAD-v1`

Thirty roots form ten ordered triads:

```text
(generator, reflector, reviewer) × 10
```

Actual emirp pairs in the roster:

```text
13↔31
17↔71
37↔73
79↔97
```

Boundary:

```text
1 is the multiplicative identity
1 is not prime
1 is not emirp
```

Prime roots provide readable lineage. Recovery capacity is determined by independent equation rank,
not by prime or mirror nomenclature.

Claim class: `MEASURED_CONSTRUCTION`.

## Event receipt

Current-head confirmation:

```text
OMNIEVENT rows     41
full bytes         171,883 B
portal v1           14,111 B
portal v2            3,874 B
portal ratio        44.368353x
chain head
7d831ebd5699382aa6f3b8243d5dc05451e6afb8891ec52f17a89f9d62da3f95
Merkle root
477b739adb13643f7055a095830c7dbb71f05cf9ae53743043ff788ca850b62e
```

## Cross-repository ownership

```text
dbbh-coms-quant-prism
  Path-1 retained-store lineage and 19-test guard

path2-two-shadow-recovery
  Path-2 capacity/reprojection lineage and 30-test guard

HYPER-BECHS--the-third-set/n-vantage-30-v1
  executable complete-body composition and evidence

HYPER-BECHS--the-third-set/omni-event-v1
  Catalog47/Hyper60 identity, time, event chain and portals

multilevel_bpe_zstd_v1.py
  exact glyph-catalog transfer control

persistent_order2_curve_v1.py
  exact prior/state transfer control

Algorithms-of-Asolaria
  canonical formula IDs and claim classes
```

## Final status

### Reproduced

```text
52/28/4/0/0 nullity ladder
seven-view refusal and eight-view exact recovery
thirty-view overdetermined reprojection
four named tamper-family holds
real Path-1 19/19 and Path-2 30/30 crate surfaces
pass-2 capsule approximately 0.0154 bpc
exact same-object learning
modest unseen transfer
composed exactness and honest conservation
```

### Not reproduced

```text
solo 4.9045 bpc under the independently chosen baseline
pass-6 0.0113 bpc
unseen 74.2% content-transfer gain
a full composed total of 2,009,218 B
```

No physical quantum cloning, total-ledger sub-entropy result, or infinite-machine execution is
claimed.
