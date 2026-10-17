# Asolaria — three independently controlled physical-host handoff

**Status: prepared, not launched on verified physical hardware.** GitHub is the coordination and append-only evidence ledger, **not** one of the three physical experimental computers. The operator or the agents controlling ACER / LIRIS / the third physical computer must run the commands **locally**. No GitHub Actions runner, Docker instance or ChatGPT session alone proves a distinct physical machine.

Shared issue: https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1

## Baselines kept unchanged

Preserve 729/729 prior same-host comparisons (historical report; this protocol did not independently verify that number), plus the already sealed nine-wave hash cascade, 27-wave spatial controls, fifth-feature and adversarial-mixture findings, and QG81 CI receipts. They are **not** relabeled as physical-host trials.

An earlier independent experiment described 12 waves × 5 laws × 81 starting bodies and 10^13 steps, using GF(2) matrix and cyclic polynomial code. Its exact five tap vectors were not recovered in the verified source material. This handoff deliberately locks a **NEW five-law stress-test fixture**:
`[0,1], [0,2], [0,1,3], [0,4,7], [0,1,5,9]`. Do **not** describe its success as a byte-replay of the older 729/729 or 4,860-case receipt until the earlier law definitions, seed and original signed artifacts have been matched.

## Three physical machines

Seat 1, seat 2, seat 3 each clone the same immutable Git commit on their **own real physical host**. An independent custodian confirms separation without publishing host serials, network IP addresses, private keys or other uniquely identifying hardware identifiers. Physical separation evidence must be **external to and stronger than** the self-signed Ed25519 key used below (witness statement or equivalent operator-controlled verification). A self-signed key proves continuity of a pseudonymous signer, not that it runs on a different computer.

On **each seat** (replace `seat-1` as appropriate, Node 18+ and Python 3.11+ required):

```sh
git clone https://github.com/JesseBrown1980/asolaria-stone-to-moss.git
cd asolaria-stone-to-moss
git checkout agent/seat-3/2026-10-14-three-physical-hosts
node physical/seat_receipts.js init seat-1 .asolaria-private/seat-1 "External physical-host attestation pending"
node physical/seat_receipts.js commit .asolaria-private/seat-1
```

**Safety:** `.asolaria-private/`, its `private.pem` and `salt.hex` are NEVER committed or posted. Use one newly generated key per seat and hardware setup; do not transfer secrets or copy the same private directory between hosts. Read the check-in before making it public; `operator_physical_attestation` is plain text.

The seat signs `checkin.json` and `commit.json` **before challenge issuance**. Commit public copies to:

```text
tracking/checkins/seat-1/<unique-run-id>/checkin.json
tracking/checkins/seat-1/<unique-run-id>/commit.json
```

Push each seat on its own `agent/seat-1/... ` branch with a Git commit trailer `Asolaria-Seat: seat-1`, and link the **commit SHA** on Issue #1. Only the owning seat should produce its signed receipt. Referee checks signature, SHA fingerprints, seat matching, and original commit's ordering in Git history.

### Referee freezes the challenge after all three commitments

After **three signed precommit commits** are visible, the designated referee downloads six public JSON receipt files and runs:

```sh
node physical/create_challenge.js \
  seat-1-checkin.json seat-1-commit.json \
  seat-2-checkin.json seat-2-commit.json \
  seat-3-checkin.json seat-3-commit.json \
  challenge.json
```

Commit **challenge.json** unchanged to a new `stones/cross-host-<run-id>/` folder and link its Git SHA on Issue #1. This script generates an actual fresh 128-bit challenge nonce and binds it to the three salt commitments. No committed secret is revealed at this point. The mock `make_preflight_fixture.js` is only for CI and must **never** be used as a real challenge.

### Each host runs independent calculations

All three seats download the exact *same frozen challenge blob and source commit*. Each seat runs both independent implementations **on its own physical machine**:

```sh
python physical/evolve_gf2_python.py challenge.json result-python.hbp --self-test
node physical/evolve_gf2_node.js challenge.json result-node.hbp --self-test
```

Verify both HBP outputs are **byte identical**. A full challenge computes `12 waves × 5 laws × 81 bodies = 4,860` exact GF(2) fast-forward states, at `10,000,000,000,000` mathematical steps. The Python solver uses GF(2) **column matrix exponentiation**; Node uses **cyclic-polynomial multiplication and exponentiation**, each checked against short-step direct recurrences. Time complexity reflects binary fast-forward algebra, not an actual 10-trillion-step clock or light motion. Preserve stdout logs, wall time, runtime versions, monotonic timing with documented error, source SHA, public key fingerprint and final HBP SHA-256.

**Commit before reveal:** Each seat publishes signed `result-commit.json` using:

```sh
node physical/seat_receipts.js seal .asolaria-private/seat-1 challenge.json result-python.hbp "python-GF2-matrix+node-cyclic-crosscheck"
```

The other two seats must each publish their result commitments before **any** seat reveals its original salt or complete output. Check the Git commit ordering, not just self-reported wall timestamps.

**Reveal:** after all three result commitments have been seen, each seat runs:

```sh
node physical/seat_receipts.js reveal .asolaria-private/seat-1
```

Publish the signed reveal JSON, **both complete HBP files**, runtime logs and SHA manifest in a create-only seat subfolder. Salt is disclosed **only in the post-commit reveal phase**. Never disclose Ed25519 private keys.

### Referee compares three physical-host receipts

Collect files in the following staging tree (public receipts only):

```text
challenge.json
receipts/
  seat-1/{checkin.json,commit.json,result-commit.json,reveal.json,result.hbp}
  seat-2/{checkin.json,commit.json,result-commit.json,reveal.json,result.hbp}
  seat-3/{checkin.json,commit.json,result-commit.json,reveal.json,result.hbp}
```

```sh
node physical/referee.js challenge.json receipts > referee-result.json
```

The referee fails for bad Ed25519 signatures, different precommits, incorrect salt reveals, repeated public keys, wrong result SHA, incomplete 4,860-state records or **any byte disagreement**. Also manually verify that each signed salt commitment was committed before the common challenge, and all three output hashes were committed before reveals. Confirm original-source / previous-law correspondence separately.

**Referee success does not itself establish three physical hosts**: its verdict remains `physical_device_separation_unverified` until an independently grounded hardware/host witness is appended. The physical witness and a causal signaling test require a separate setup, calibrated clocks, transport isolation and known separation.

## Stones and follow-ups

On passing actual hardware receipts, add immutable `stones/cross-host-<run-id>/` HBP + HBI, manifest SHA, three signed seat records, blinded commitment SHA, common challenge Git commit, reveal Git SHAs, results, byte comparisons, mismatches and uncertainty report. Never overwrite an earlier stone. If a seat fails, publish the mismatch rather than altering the measurement.

The Brown-Hilbert free uncoloured centre is **not** an 82nd body. Hash changes after recomputation are digital dependencies, not physical instantaneous messages.

**Current state:** all 3 signed physical-seat check-ins, challenge/reveal receipts, and external machine-attestation documents are awaited. The GitHub Actions preflight is explicitly cloud software only.
