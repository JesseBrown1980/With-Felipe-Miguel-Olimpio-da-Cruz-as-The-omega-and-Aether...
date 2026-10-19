# Cube A/B immutable vantage co-mint candidate intake

Status: **source bytes verified; decoder DAG verified; candidate package only; live promotion held**.

This directory absorbs the operator-supplied Cube A and Cube B into the public review surface without
rewriting either source object and without firing the live fabric. It is an intake boundary, not a
claim that the training run has been independently reproduced.

## Source identity

The source archive was supplied on 2026-07-13 as files.zip:

    archive bytes  29,870
    archive sha256 a398141f24ae8fe8c491662eba68aab678563eda9b7f4f2d1c07ad3fcbe242fd
    entries        four root-level files; no rooted, duplicate-target, or traversal paths

Hidden NTFS provenance identifies claude.ai as the download surface. That establishes the measured
delivery surface, not the missing generator or training provenance. The private conversation
identifier and download URL are intentionally not published.

The four entries are preserved byte-for-byte here:

| Object | Bytes | SHA-256 | Sidecar |
|---|---:|---|---|
| Cube A | 66,326 | 0b99a6c864f625f4b808c28adc31fd05140693fa619dc16462c294e06bfc7682 | exact match |
| Cube B | 66,467 | b23cf246d7e4d671cbbf15ea5001fb5db1b3c31791c92e0b52e4dd1c9d76a5df | exact match |

The sidecars prove byte integrity. They do not by themselves prove signer identity, corpus identity,
training provenance, or the artifact-reported holdout measurements.

## What is independently measured from the supplied bytes

Each object contains 1,920 merge rows and 1,920 declared strings. With output ID 256+i for row i:

- every merge reference is an integer in the byte base or an earlier output;
- there are no future references, negative references, or cycles;
- every declared string is exactly the recursive merge expansion;
- the base is bytes 0 through 255;
- the string table is a Latin-1 byte projection, not decoded UTF-8.

Therefore both objects are valid deterministic glyph-ID to bytes decoder DAGs.

The carried measurements are preserved exactly, with their evidence label intact:

| Cube | bpg | bpc | used | coverage | pay | cat |
|---|---:|---:|---:|---:|---:|---:|
| A | 2.6388287822332934 | 3.706626290605497 | 1,672 | 72.31340841680829 | 223984.14316284357 | 7,680 |
| B | 2.6733536151760937 | 3.678795392105306 | 1,696 | 71.70522533697621 | 222244.71200658163 | 7,680 |

These are ARTIFACT_CARRIED_NOT_CORPUS_REPLAYED. B has lower bpc and higher bpg, while A has higher
coverage and pay; “better” must name its primary metric.

Artifact arithmetic further proves:

- A bpg is exactly 250000 / 94739, and A coverage is 68509 / 94739 × 100.
- B bpg is exactly 500000 / 187031, and B coverage is 134111 / 187031 × 100.
- If both used one holdout, its size is 500,000 × k bytes.

The repository's one-megabyte enwik8 convention is compatible with that arithmetic, but 500 KB and
larger multiples are also compatible. One megabyte therefore remains contextual inference, not
measured A/B provenance.

## Vantage overlap, with the denominator sealed

Repeated surface strings are counted once for the language-overlap result, and the shared 256-byte
base is excluded:

    unique A strings  1,872
    unique B strings  1,871
    intersection        966
    union             2,777
    A overlap       51.602564%
    B overlap       51.630144%
    Jaccard         34.785740%

The reported 51.6% shared / 48.4% unique means:

    shared unique decoded strings / min(unique A strings, unique B strings)

It is not Jaccard overlap, raw 1,920-slot overlap, or merge-pair overlap.

## Duplicate-ID topology is preserved, not flattened

Cube A has 9 repeated numeric-pair groups (40 excess rows) and 12 repeated decoded-string groups
(48 excess rows). Cube B has 7 repeated numeric-pair groups (49 excess rows) and 7 repeated-string
groups (49 excess rows). Under the verifier's explicit definition, 19 A IDs and 8 B IDs whose
numeric pair is repeated are referenced somewhere in the DAG. Deleting or renumbering them would
corrupt lineage.

This makes decoding deterministic but leaves bytes/string to glyph ID many-to-one. A conventional
single pair-to-output BPE encoder cannot select the distinct IDs without a rank, context,
PID-vantage, or tie-break law. The supplied files do not include that law. The candidates therefore
remain immutable and usable for decoding/research, while direct encoder/runtime promotion is held.

## Live fabric advisory and authority boundary

The read-only live query produced:

    query      council-q-1783957612649-rmt1qj
    verdict    cdec50de0fa9b03188142710979eae66
    result     CONVERGE 164/251
    signature  Ed25519 VERIFIED, DEV-ACER advisory
    authority  no owner/HELM promotion envelope

The selected advisory owners were GNN/GULP, Hermes Bridge, Boundary GC, Capture Prism, and PID
Portal. The canonical lane is Hookwall to PID/Brown-Hilbert to BEHCS-1024 to GNN to Shannon to GULP
to WhiteRoom to routed receipt. Source proof is retained through post-chain GC.

CP_MINT requires unanimous approval from OP-JESSE, RAYSSA, FELIPE, DAN, and AMY. No matching vote
exists. Accordingly:

- A and B remain immutable source objects;
- A-prime, B-prime, or C must receive new PIDs, hashes, and parent lineage;
- no live ingest, mint, daemon operation, cleanup, deletion, or cutover is performed here;
- Cube C co-mint remains held pending provenance replay and the applicable quorum.

## Missing receipts before promotion

- corpus and holdout bytes, ranges, and SHA-256;
- A's 0–30M sector receipt, which is not present in A's JSON;
- precise B sector/provenance beyond the B field 40-58M fresh;
- generator tool and immutable commit, seed, metric formulas, and tolerance law;
- PID-vantage identities and cross-evaluation matrix;
- reported HELD counts 168 and 69;
- an explicit duplicate-ID encoder/tie-break contract;
- independent corpus replay, WhiteRoom release, and unanimous CP_MINT vote.

Run the local verifier with:

    python third-seat-2026-07-12/gpt-crosscheck/cube_ab_vantage_verify_v1.py

The verifier checks source hashes, sidecars, the full 3,840-row decoder topology, exact recursive
expansions, carried metrics, duplicate topology, and the stated overlap denominator. It never writes
to or calls the live fabric.
