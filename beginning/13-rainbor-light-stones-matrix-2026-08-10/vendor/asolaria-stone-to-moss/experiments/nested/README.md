# Four-seat live nested Rainbow81 — N-Nest integration

This experiment takes the **corrective-gate and AND-upward invariant** from [N-Nest-Prime](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED), independently examined at source commit `307903651f56e8a28ef98ca36aef22ee8cda935c`.

**Reference source:** `nest-depth3-verify.cjs` Git blob `2baca296edec2d46a9bc197efee8850bd168a5ef`, `nest-depthN-prime-verify.cjs` blob `fd24c0eceff455351f27e7244d5bd61bffd38a25`. The architecture is derived from the repository's executable idea, not a claim that we have deployed its entire agent farm. No code from the reference repository is copied.

A single seat's three live OS processes:

```
parent_matrix.py  (Python; GF2 81×81 matrix)
  └── child_poly.js (Node; independent cyclic GF2 polynomial)
       └── watcher.py (Python; direct local successor F(F^T(x))=F^(T+1)(x))
```

Four GitHub Actions matrix jobs run this process tree using separate seat seed domains. One referee job verifies four resulting filesets. Each child must complete **27** watcher gates before its parent accepts the full set; a failed wave invalidates the seat. The master only accepts all four.

Every seat generates **32,805** future-state records and **10,935** independent direct-step watcher verdicts, with a separate SHA for each of the 27 wave groups. Four seats: **131,220** parent/child record comparisons, **43,740** watcher checks, **108** independently gated wave stones. These are *planned* pass counts; only successful CI and archived artifacts establish measured results.

**Controls:** watcher rejects a deliberately wrong `T+1` input; parent detects altered child data/digest and full output tamper; master refuses a forged digest. Process and job timestamps provide an observational concurrency record. GitHub may schedule four jobs simultaneously, but concurrency is an observation rather than an inference from names.

## Run locally

With Python 3.11+ and Node.js 18+:

```sh
python experiments/nested/parent_matrix.py seat-3 experiments/seat1/TRIAD-27-CHALLENGE-20261014.json /tmp/nnest-seat3
```

For all four at once use `.github/workflows/four-seat-nested-nnest.yml`. Artifacts `nested-seat-1` to `nested-seat-4` are checked by `experiments/nested/master_verify.py`.

**Scope:** processes execute on real CPU hardware. Each hosted runner is a separately scheduled compute environment, but no provider-backed distinct-physical-chassis or permanent agent identity attestation follows. This is a deterministic nested *verification graph*, not actual training of a neural network, and not light transmission, quantum state transfer or gravity measurement.

**Scale guard:** fixed four seats × depth three, operator-controlled. N-Nest's human authorization gate remains external; this experiment does not autonomously expand recursion.
