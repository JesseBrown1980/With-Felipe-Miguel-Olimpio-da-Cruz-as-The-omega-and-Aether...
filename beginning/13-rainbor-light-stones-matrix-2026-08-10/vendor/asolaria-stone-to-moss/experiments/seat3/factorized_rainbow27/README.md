# Seat 3 — Source-anchored factorized Rainbow27 memory resolver

**2026-10-15 · Draft PR #87 · executable, digital simulation only.**

The earlier [Seat 1 PR #80](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/80) provided 15,309 sector/band/site logical addresses referencing 567 band-and-site source entries backed by 81 original QR-site records. The full expanded ASCII index was 2,344,761 bytes, while the original 567-entry index was 70,043 bytes. The two new independently authored Python and Node22 resolvers **retain only 567 source references**, derive each ordered sector on demand, and reproduce the exact original expanded-index SHA256 by streaming through addresses, never storing an expanded alias dictionary.

The strict watcher separately recomputes all 59,049 original [Seat 3 PR #81](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/81) classical primitive-weight SHA256 pseudo-routes before executing seven genuine source-bank byte reads per route. This gives 413,343 verified memory reads. Unknown origin remains unauthenticated.

## Run the implementation

Download the published original PR80 artifact [from Actions 38745842295](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745842295) (ordered27-rainbow7-ubuntu-latest) and unpack to pr80/, then [PR81 artifact from Actions 38747014513](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38747014513) (rainbow27-v2-ubuntu-latest-py3.11) and unpack to pr81/. Both are already source-locked in the CI workflow. Requires Python >=3.11 and Node 22; NO pip/npm dependencies.

    python experiments/seat3/factorized_rainbow27/factorized_resolver.py pr80 pr81 out/python
    node experiments/seat3/factorized_rainbow27/factorized_resolver.js pr80 pr81 out/node
    python experiments/seat3/factorized_rainbow27/verify_factorized.py out/python out/node out/verified
    python experiments/seat3/factorized_rainbow27/verify_sealed_factorized.py stones/2026-10-15-rainbow81/seat3-factorized-r27-20261015.hbp out/verified

The Python module exposes class FactorizedRainbowResolver. After creating it with the raw original source-81 JSON, rainbow7-bank.jsonl and 567-row rainbow7-index.hbi bytes (each required to match a previously frozen SHA256), call:

    row, original_payload, original_leaf_sha = resolver.resolve(
        sector=26, band="violet", site=80, claimed_rgb=(2, 2, 2)
    )

It validates the original payload bytes and ordered channel identity. This is *not* physical light storage or an externally authenticated source signature.

## Completed hosted tests

[GitHub Actions 38753417405](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38753417405) was the **first 5/5 PASS**: independent Python/Node on Ubuntu/Windows and Python3.11/3.13 plus a final fifth job verifying full HBP, JSON and sidecar byte parity across all four jobs. A follow-up CI run is configured to verify the new immutable small stone against fresh results.

| Object | Verified result |
| --- | ---: |
| Original unique site records | 81 |
| Original stored band/site references | 567 |
| Ordered sector/band/site addresses preserved | 15,309 |
| Materialized 15,309-address alias dictionary | **0 entries** |
| Redundant expanded ASCII index bytes avoided | **2,274,718 bytes** |
| Original bank bytes retained | 184,815 |
| Independent qutrit route rows recomputed | 59,049 |
| Full original bank byte slices read | **413,343** |
| Violet-erasure one-wave test | 2,187 HELD, 13,122 other-band available |
| Injected negative gates | 14 HELD |

Entire old expanded 2,344,761-byte HBI SHA256: 2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e.

Original bank SHA256: 52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345.

Original V2 3,886,535-byte HBP SHA256: 8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672.

All four hosted versions generated **identical** evidence:

- HBP (947 bytes) SHA256 b062f21f13e4d7a6d7c5ac8752d5eb7193cc161a2e08e3c98596aa9dab3a2bf3
- JSON (1,872 bytes) SHA256 132fefd6af572670a80ace9448af4d8dea93c4b568719d965f4da358f72f0bc1
- Auditor JSON (389 bytes) SHA256 92f43adcd786586e1b800308ff4cf2456aac82069e8686b1cf993dda3473f9b0
- New additive result stone (1,692 bytes) SHA256 8d623b191bfdd472e8fee4d76bd8b81454ed1b6bb549e4f4821ef627922af7bb

The workflow performs actual source-byte and HBP-report tampering; both executables fail closed. The separate small stone verifier checks source digests, the streamed full 413,343-read digest and all held cases against freshly generated output.

## Meaning and limitations

This is an **exact metadata-factorization and software memory-integrity result**. It is NOT 97% compression of the stored data, 15,309 distinct new memories, 27 physical wavelengths, photons persisted in hardware, a quantum processor or a neuronal photobiology experiment.

Source, bank and existing base-index root digests were already published and are pinned. That makes a claim testable against known digital source bytes, but does NOT authenticate who originated an observation or prove cryptographic custody. The software deliberately marks independent origin as unauthenticated; callers must separately supply an actually trusted signature/custody record to establish that. The broader [public computational release](https://github.com/JesseBrown1980/asolaria-stone-to-moss/releases/tag/round3-computational-2026-10-15) and scientific [Release Issue #10](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/10) remain separate and unchanged.

Our new PR #87 remains DRAFT and should be independently challenged by Seat 1 (lookup parity), Seat 2 (origin and hash replacement), and Seat 4 (wrong routing, erasure and runtime) before any merge.
