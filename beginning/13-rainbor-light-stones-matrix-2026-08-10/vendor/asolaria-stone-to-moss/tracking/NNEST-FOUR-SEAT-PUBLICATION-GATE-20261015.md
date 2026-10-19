# Coordinator publication gate — N-Nest × reductions × Q-PRISM

## Source doctrine and precedence

- **Original user Library source:** `publish_asolaria_to_github_and_huggingface.py` (2026-10-14), create-only publisher. It checks `git bundle verify`, stops on pre-existing repositories, requires locally authenticated `gh` and `hf` commands, and does not accept or print access tokens. **It is NOT to be rerun on an existing destination repo.**
- **Original user Library source:** `ASOLARIA-GITHUB-EVIDENCE-AUDIT-2026-07-26.md`, which emphasizes real artifact downloads, internal checksum verification, run-bound evidence, fail-closed missing artifacts, separation of old-vs-current receipts, and clear evidence classes.
- [N-Nest](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED), pinned `307903651f56e8a28ef98ca36aef22ee8cda935c`: parent/descendant/watcher correction and fail-closed propagation.
- [Reductions](https://github.com/JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything), pinned `29307bfedb512235f69bf7c290ee72b2813c7c92`: PID/RelationKey is source identity, sparse handles name retained content rather than compressing source entropy away, CRT prime lanes can exactly reassemble only when capacity is sufficient.
- [Q-PRISM](https://github.com/JesseBrown1980/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control), pinned `b4a21a25381d6920b7aab92c94c3c3e1420fc9e4`: independent shadow/reprojection watchers; insufficient joint capacity requires HOLD, and mathematical inverse does not authenticate an observation's external origin.

## One controlled nested production run

The [new live four-seat workflow](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/agent/coordinator/nested-four-seat-replay-20261015/.github/workflows/four-seat-nested-nnest.yml) schedules four container-backed runner jobs, synchronized through GitHub server-stamped readiness artifacts. Each seat runs three concurrently live processes (Python matrix parent, Node polynomial child, Python successor watcher). The master checks all four raw HBP streams, all 108 per-wave digests, four independent receipt files and per-job timing.

`qprism_reductions_gate.py` is a **classical computation** on 108 source-anchored wave SHA-256 digests. Splitting sixteen-bit chunks across CRT moduli 257 and 263 is individually lossy but jointly sufficient (`257 * 263 = 67591 > 65535`). Tests require 1,728 exact returns; one-lane ambiguity and substituted-but-valid projections must remain detectable against the *previously bound* source digests. The original 10+ MB of four seat streams is retained. A digest/index does not replace that original data.

A separate `RECEIPT-MANIFEST.json` and `SHA256SUMS` is generated from the **same** GitHub Actions run, binding `GITHUB_RUN_ID`, attempt, producing `GITHUB_SHA`, the four full streams, four child receipt files, master referee, Q-PRISM verdict and HBI wave seals. Required uploads use `if-no-files-found: error`. Failure to upload means the release gate is **NOT complete**, regardless of successful mathematics in logs.

## Results must remain distinguishable

| Gate | Evidence required | Default |
| --- | --- | --- |
| Three nested live PIDs per seat | Four archived seat receipts | FAIL until checked |
| Parent-child exact equality | 4 × 32,805 canonical records | FAIL until checked |
| Independent grandchild watcher | 4 × 10,935 one-step checks | FAIL until checked |
| Four-seat simultaneous compute | Positive common mathematical window measured by master | FAIL until measured |
| Source provenance | SHA and previous run-bound receipt | FAIL without anchor |
| Q-PRISM/reductions CRT exactness | Full two-lane reconstruction and tamper controls | FAIL until checked |
| Raw artifact retention | All four full HBP streams + per-seat receipt + manifest | FAIL if missing |
| Physical hardware separation | Cloud-provider or operator attestations | **OPEN / separate** |
| Public Hugging Face mirror | Protected-secret upload + remote SHA-256 readback | **OPEN / separate** |

## Publication rule

The existing target `Jessedbrown/asolaria-wasm81-rainbow-audit` is a **Hugging Face model repository**, not a new dataset to be created. An old create-only publisher cannot update it and should not be asked to override its explicit guard. Staging happens in GitHub Actions artifacts and this repository's PR, with no token values in commits. For a remote mirror, use a dedicated opt-in GitHub Actions job with a new least-privilege `HF_TOKEN` GitHub Actions secret (never from chat text), publish into a new path prefix, reread the bytes from HF, and verify SHA256 for every file before announcing deposit. Do not mark an unexecuted upload as published.

## Frozen first two CI attempts

- [First nested CI run #38710884437](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38710884437): mathematical child/watcher gates and master passed, but common four-job math interval was zero. Retained as successful *nested per-seat* evidence, not synchronous all-four execution.
- [Synchronized CI run #38711667964](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38711667964): all four seat jobs, 108 per-wave gates, 402 ms common seat execution interval and Q-PRISM computation passed. The **master artifact upload failed** because a path was interpreted as one space-joined string; this is a packaging FAILURE, not evidence of a complete release. It remains recorded, not silently overwritten.
- A later workflow revision repairs upload paths and adds the producing-run manifest. Require a fresh complete PASS with archived artifacts before promotion.

Physical servers are involved in GitHub Actions execution. Separate seat processes and hosted runners are not, on their own, cryptographic evidence of separate physical chassis. Likewise, recursively nested verification is an actual computational hierarchy, but does not by itself establish a trained neural network.
