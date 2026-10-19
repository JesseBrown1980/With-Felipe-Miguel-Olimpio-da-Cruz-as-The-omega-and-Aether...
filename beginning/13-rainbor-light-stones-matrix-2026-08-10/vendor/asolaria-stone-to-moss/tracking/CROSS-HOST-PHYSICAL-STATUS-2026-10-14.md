# Physical three-machine coordination state (2026-10-14)

**Status: AWAITING THREE INDEPENDENT PHYSICAL-HOST SIGNED PRECOMMITS.** Nothing here proves three physically separate computers ran the frozen challenge. Do not conflate computational agents with actual hardware seat ownership.

## Completed code / software gate

- [Locked physical host handoff](../physical/README.md), signed `checkin`/`commit`/`result-commit`/`reveal` scripts, fresh challenge generator, Python GF(2) matrix and independent Node cyclic polynomial 10-trillion-step solvers, cryptographic referee.
- [Windows+Ubuntu different cloud runner preflight 38594662695](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38594662695): each runner completed 4,860 identical state rows using Python+Node, SHA-256 `031367b1da1a368dc7471141a9799b79c694a0c9900f65a047438ccaa5f76600`.
- [Single-host simulated three-key ceremony 38595090929](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38595090929): signature/commit/challenge/result/reveal verification and tamper controls PASS. **ONE simulated host**.
- [Software-only preflight HBP](../stones/2026-10-14-rainbow81/stone-three-physical-hosts-software-preflight-2026-10-14.hbp) and [HBI](../stones/2026-10-14-rainbow81/stone-three-physical-hosts-software-preflight-2026-10-14.hbi), checksums verified by [CI 38595541768](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38595541768).
- [Merged PR #4](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/4) on main.

## Other participants' GitHub state

As seen in [Issue #1](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1), one participant created `agent/seat-2/cross-host-rainbow81-20261014`; another initially created `agent/seat-3/cross-host-rainbow81-20261014` but explicitly corrected themselves to a **seat-4 computational participant** with branch `agent/seat-4/cross-host-rainbow81-20261014`. These are **software branch claims**, not signed independently verified physical-host identities. The shared registry is not to be reassigned based on branch labels alone.

The protocol author here historically wrote commits carrying `Asolaria-Seat: seat-3` on a software-only protocol branch. That is **not** an attestation of running on physical seat 3; the physical seat assignment remains unverified and available to the actual device custodian. No extra physical computer was created or accessed by this ChatGPT session.

## Next required gate

1. Each of three real physical device custodians publishes a **signed** pseudonymous check-in and challenge-independent blinded seed commitment from its own computer.
2. Independent custodian validates physical separation out-of-band and records evidence with privacy preserved.
3. Referee verifies three signed check-in/commit pairs, then generates new common unpredictable nonce, freezes source SHA and exact laws.
4. Three independent hosts compute and commit results before any reveal; after reveal, referee compares signatures, salt preimages, outputs, HBP/SHA, and challenge Git commit ordering.
5. Publish append-only physical-result stone recording successes **and failures**, times/clock uncertainties, independent hardware attestation level, and limits.

**Important scope:** the five locked GF(2) tap laws of this preflight are new. The older 729/729 and five-law experiments remain baselines until source laws are recovered and matched. Neither SHAs nor modeled ten-trillion-step jumps measure propagation faster than light or emergent physical gravity.

Do not publish access tokens, private signing keys, identifying hardware serials, or private network addresses.
