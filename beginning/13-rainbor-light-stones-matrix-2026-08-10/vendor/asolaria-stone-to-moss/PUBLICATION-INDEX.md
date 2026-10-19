# Asolaria Rainbow81 — Public release navigator (14 October 2026)

The reproducible four-seat **computational** archive is integrated into this repository. This is a public technical release, **not** proof of four independently operated physical machines or a peer-reviewed discovery of quantum or gravitational effects.

## Read in this order

- [Four-seat technical report and scientific limitations](publication/2026-10-14/REPORT.md)
- [Machine-readable completion status and outstanding requirements](publication/2026-10-14/STATUS.json)
- [Authoritative experiment stone ledger](stones/2026-10-14-rainbow81/RESULTS-INDEX.md)
- [Signed-seat physical-host challenge protocol](physical/README.md)
- [Live seat coordination and check-in board](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1)
- [Automated Linux / Windows release audit](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/workflows/four-seat-release-integrity.yml)

## Current result classifications

| Workstream | Completed? | Evidence boundary |
| --- | --- | --- |
| Four computational seat artifacts | **Yes, archived in `main`** | Seat 1 4,860 cases; Seat 2 1,620 cases **reported** (signing-byte format open); Seat 3 4,860 cases; Seat 4 729 cases |
| Mathematical algorithm and independent-runtime checks | **Yes for stated digital fixtures** | Matrix-vs-polynomial exact GH Actions checks; inputs and law families differ across seats |
| Nine-wave, 27-wave, nonlinear fifth-feature and QG81 reference controls | **Yes, published** | Only synthetic software rules and hashes measured; quantum/force controls include their laws explicitly |
| Signed identities of four physically distinct machines | **No** | Session public keys and cloud runners are not physical-device attestations |
| New three-physical-host blinded challenge, computation and reveal | **No** | Three new witnessed device precommits not collected |
| Hugging Face audit and `Jessedbrown/tests` mirrored with remote SHA-256 verification | **No** | Protected write-scoped `HF_TOKEN` GitHub Actions secret absent on last verified run |
| Published technical report here | **Yes** | GitHub release dossier, no DOI, peer-review status or completed hardware experiment |

The repo's original stone-to-moss GGUF vault README, correction receipts, and historic algorithms remain intact. **The current Rainbow81 scientific claims are the narrower claims supported by the published source code and controls.**

## Actions to finish the remaining external tasks

1. **Hugging Face:** repository owner adds a *new* scoped HF write token under GitHub repository **Settings → Secrets and variables → Actions** with secret name `HF_TOKEN`. Then rerun [Publish verified QG81 stones to Hugging Face](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/workflows/publish-qg81-huggingface.yml). Publication is done **only if the post-upload download SHA-256 checks succeed**. Never publish credentials in chat, GitHub source or issues.
2. **Physical-host experiment:** ACER/LIRIS/third device custodians each run the [local check-in protocol](physical/README.md) on a truly distinct, independently witnessed physical computer. The coordinator must validate these before issuing a fresh unpredictable challenge. Do not use the publicly released mock challenge.
3. **Seat 2 cryptography:** publish the exact public byte-level Ed25519 signature preimage encoding and standalone verifier for the already archived check-in, without disclosing signing material.
4. **Research dissemination:** determine the proper attribution, code/data license, manuscript and DOI venue; optionally submit a rigorously scoped study for independent scientific review. No external journal publication is claimed.

Append new results and corrections as new HBP/HBI/JSON stones with checksums; do not rewrite past receipts.
