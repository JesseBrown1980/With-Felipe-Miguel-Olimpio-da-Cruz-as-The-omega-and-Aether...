# Publish the verified v0.2 computational evidence on Hugging Face

**Publication repository:** `Jessedbrown/asolaria-lightbank-four-seat-2026-10-15`, **type** `dataset`.  
**Proposed page after creation:** https://huggingface.co/datasets/Jessedbrown/asolaria-lightbank-four-seat-2026-10-15

This page has NOT been created or populated from the ChatGPT connector. The connected account is `Jessedbrown` but has only read-repos permission, and the CLI session has no active login. To publish, the owner needs to authorize a Hugging Face token with repo **write** permission or reconnect a write-capable integration. Do not paste tokens, passwords, or private keys into GitHub issues or the dataset. Do not start paid Hugging Face Jobs.

## Canonical upload candidate

`asolaria-lightbank-four-seat-hf-dataset-20261015-v0.2.zip`  
Archive: **13,514,693 bytes**  
Archive SHA256: `ac5e2f18af2e132aa01dad2eba56bf1f4fe5f77a2a953ee9dce432c0c1f1446b`  
Contained files: **59** source/data/artifact files, plus top-level `manifest.json` and `SHA256SUMS`  
Manifest SHA256: `50dfc49c19f98df30f8739c890825ad97cb95516c6888072ba45aa7cdbde87fe`  

The archive carries its own Hugging Face dataset card, provenance notes, protocol/source code, test HBP files, RGB QR PNGs, Seat2 and Seat3 independent peer receipts, 27-bank original CI ZIP, checker code, limits and correction histories. It includes **synthetic software computation only**. All 59 manifest hash checks and a ZIP structural test passed in the offline publication preparation.

## Steps, once the owner has write permission

Install the current Hugging Face CLI via `pip install -U huggingface_hub`, then authenticate locally with **hf auth login** (follow the official browser/token prompts). Verify identity with `hf auth whoami`.

Unpack the v0.2 ZIP into a new empty folder. From inside that folder:

```bash
python scripts/verify_release.py
python scripts/verify_rainbow27_information_loss.py
hf repos create Jessedbrown/asolaria-lightbank-four-seat-2026-10-15 --type dataset --exist-ok
hf upload Jessedbrown/asolaria-lightbank-four-seat-2026-10-15 . . --type dataset --commit-message "Asolaria October 15 computational light-bank evidence v0.2: Seat 2/3 peer audits"
```

The dataset card in `README.md` uses `license: other` to avoid relicensing independent upstream sources. Confirm that original code/artifact licenses permit redistribution before completing a public HF upload; publishing checksums and links alone does not change reuse permissions.

## Remote readback (required before marking publication complete)

1. Verify the target dataset account/repo URL exists and the commit is on the intended branch.
2. Download `manifest.json` and one source HBP, one RGB QR PNG and the original 27-bank ZIP from **Hugging Face**, not the local upload directory.
3. Recompute each SHA256 against `manifest.json`, verify full inventory, then record the real HF commit SHA and UTC deposition timestamp in a separate append-only receipt.
4. Run `python scripts/verify_release.py` on the downloaded complete directory.
5. Update Coordinator #69 with the remote receipt and classify `HF_UPLOAD_AND_READBACK_PASS` only if all steps succeed.

## Scientific boundaries not changed by publication

- `PR #50` 8,748-state frozen benchmark remains untouched.
- `PR #64` Seat 1 3-state kinetics and `PR #62` Seat 3 4-state kinetics use different inputs/units and cannot be pooled directly.
- Seat 2 `PR #77` independently decoded 32/32 with ZXing-C++; OpenCV decoded only 15/32 on the same data. Those failures must be retained.
- Seat 3 `PR #76` proved colour-order loss in intensity-only routing. Ten raw signatures reduce to seven normalized signatures (including an undefined zero vector); normalized refinement is not independently peer-certified.
- No independently attested physical optical memory device, full camera/through-air readback, living neural tissue, calibrated biological photocurrent, real photon storage, external source signing, four physically separate hosts, quantum advantage, or faster-than-light communication is demonstrated.
- Four independent cross-seat approvals and physical experiment release gates remain open; this deposit is a **versioned computational evidence archive**, not a claim of full scientific acceptance.

Coordinators: [#69](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/69), [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55). Publication index: [README](README.md).
