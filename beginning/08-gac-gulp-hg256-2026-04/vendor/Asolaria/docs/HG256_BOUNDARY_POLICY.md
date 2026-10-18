# HG256 Boundary Policy

```text
GLYPH256: {POLICY=hg256-boundary-policy.v1}{FAIL_CLOSED=TRUE}{LOCAL_ONLY=TRUE}
```

## Deny Rules

- Deny glyph packets if:
  - unknown fields
  - missing `path + sha256 + epoch`
  - mixed epoch
  - confusable hit after `NFKC`, mixed-script, or zero-width check
  - overlay claimed as live
  - secrets, tokens, keys, session ids, device ids, hostnames, local paths, ports, or command lines appear
  - typed route mismatch
- Deny route hooks if:
  - no control-plane stamp
  - no append-only audit
  - payload is unbounded
  - skipped checks are shown as pass
  - cache hit is shown as verified
  - trace gap exists
  - deny flags are missing on deny
  - promotion or remote transport is implied
- Deny white-room consume if:
  - network egress
  - state mutation
  - non-determinism
  - inputs are not pinned
  - schema failure
  - signature failure when required
  - unknown fields
  - mixed epoch
  - replay hash mismatch
  - redaction bypass
  - IO leak
- Deny GC bindings if:
  - proof deletion
  - history rewrite
  - GC runs before the GNN snapshot
  - checkpoint hash is missing
  - replay pointer is missing
  - owner signature is missing for gulp/compaction
  - compaction is unbounded

## Leak Constraints

- Public surfaces must not link to raw runtime `data/`, raw logs, raw captures, raw hookwall, raw GNN edges, device proofs, waivers/overrides, or unsealed `D49`.
- Absolute filesystem paths and internal topology markers are internal-only.
- `47D` may be described as live base.
- `49D` must remain proposal-only until explicitly signed.

## Hard Labels

- `FAIL_CLOSED`
- `NO_PROMO_IF_GATE_FAIL`
- `NO_REMOTE`
- `SKIPPED_NEVER_PASS`
