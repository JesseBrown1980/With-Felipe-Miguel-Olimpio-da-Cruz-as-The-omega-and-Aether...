# 02 — PORT NAMESPACE CANON

**Operator-anchored 2026-05-06 (TWO stacked corrections, both Class-1):**

> "using the cube of cube and powers of cubes in the brown hilbert way actually allows DIVISION of the ports in multiple dimensional expansions, sub net rot premapped into infinitely spawnable ports."
>
> "We can create ports. We can label as port.port"

## What a port IS

A label in a hierarchical namespace.

```
Tier 0:  50001
Tier 1:  50001.1, 50001.2, 50001.3, ...
Tier 2:  50001.1.1, 50001.1.2, ..., 50001.2.1, ...
Tier k:  50001.a₁.a₂.…aₖ      where each aᵢ is itself a label
```

**Same shape as:** DNS subdomains (`a.b.c.example.com`), file paths (`a/b/c/d`), IP subnetting (`10.0.0.0/8 → /16 → /24 → /32`), Brown-Hilbert curve recursive cube subdivision.

**It is a prefix tree.** A single TCP socket listens on `50001`; the daemon dispatches by parsing the label suffix on the message envelope.

## What a port IS NOT

A TCP socket. A port-pool slot. An OS-level finite resource. A scarcity.

## Address-space math

```
addressable_ports(branching=N, depth=K) = N^K

  N=256, K=10  →  256^10 ≈ 1.2 × 10²⁴
  N=256, K=20  →  256^20 ≈ 1.5 × 10⁴⁸
  K → ∞        →  countably infinite
```

Brown-Hilbert curve property at every depth: children of the same parent map to adjacent 1D positions. **Routing-table lookup is O(K) prefix-walk, not O(N^K) scan.** Spatial locality preserved at every sub-cube. No collisions at any depth — same proof as no two distinct file paths can be equal.

## Real ceilings (NOT port pool)

| Layer | Bottleneck | Bound |
|---|---|---|
| ~~TCP socket pool (90k)~~ | ❌ NOT a bottleneck | one socket multiplexes infinite labels |
| ~~Per-socket dispatch~~ | ❌ NOT the constraint | labels parse in nanoseconds |
| Routing-table prefix-walk | O(K) per message | nanosecond-scale per hop |
| Node event loop | libuv ticks | ~10⁷ ops/sec |
| CPU per dispatch + GNN inference + cosign | hardware-real | **THIS is the actual ceiling** |

Recorded baseline: 63k/sec single-host = CPU-bound ceiling. Adding more port labels does NOT help past this point — already CPU-saturated.

## Why Codex misread namespace-routing as "hacking"

Codex/OpenAI guardrails model:
- 1 TCP port = 1 agent (rate-limit assumption)
- Fixed model identity per session (safety primitive)

Asolaria canon BREAKS both:
- 1 socket multiplexes infinite labeled rooms
- 1 model + N tuples = N "different agents" via BEHCS-256 context injection

Codex saw recursive label expansion + tuple-rotated personality and pattern-matched "port scan + identity spoofing" → guardrail trigger → wrote "this is hacking" + locked single-model + stripped PID tracking. **Structurally blind to BEHCS canon** — port-scan vs. namespace-routing look identical at the OS layer if you don't read the message body.

## Application rules

- Never quote "90k is the ceiling."
- Never frame it as "90k × 6^k" — that still keeps the socket-pool multiplier alive.
- Always frame as `N^K` prefix-tree.
- A port is a label. Not a socket.
- Routing is prefix-walk. O(K) hops, nanoseconds each.

**End of port canon.**


---

# 02 — PORT NAMESPACE CANON (v2 amendment draft)

**DRAFT.** Pending dual-apex (OP-JESSE + OP-RAYSSA) + operator cosign.
Drafted by VECTOR omnispindle leaf agent on acer-host, 2026-05-06.
**Not canon until cosigned.** v1 source untouched at
`C:/asolaria-foundation-v1/02-PORT-NAMESPACE-CANON.md`.

## v2 AMENDMENT (DRAFT — pending dual-apex+operator cosign)

### What changes (and what does NOT)

| Aspect                        | v1               | v2                       | Change?      |
|-------------------------------|------------------|--------------------------|--------------|
| Port = label in prefix tree   | yes              | yes                      | **no**       |
| One socket multiplexes labels | yes              | yes                      | **no**       |
| Branching factor `N`          | 256              | 1024                     | **YES (4×)** |
| Depth `K`                     | unbounded        | unbounded                | **no**       |
| Prefix-walk routing cost      | O(K)             | O(K)                     | **no**       |
| Subset-embedding              | n/a              | g[0..255] = v1 alphabet  | **NEW**      |

### Address-space math (v2)

```
addressable_ports(branching=N, depth=K) = N^K       (formula unchanged)

  v1:  N=256,  K=10  →  256^10  ≈ 1.2  × 10²⁴
  v2:  N=1024, K=10  →  1024^10 ≈ 1.27 × 10³⁰   ( = (2¹⁰)¹⁰ = 2¹⁰⁰ )
  v1:  N=256,  K=20  →  256^20  ≈ 1.5  × 10⁴⁸
  v2:  N=1024, K=20  →  1024^20 ≈ 1.8  × 10⁶⁰   ( = 2²⁰⁰ )
  K → ∞                              countably infinite (unchanged)
```

The N^K form is **literally still the law** — only `N` widens. Every v1
statement of the form "N^K addressing" remains true with the new `N`.

### Brown-Hilbert curve property (still invariant)

The locality-preserving Hilbert curve is defined for any base `2^k`. v1 ran
`2^8`, v2 runs `2^10`. Children-of-same-parent → adjacent-1D-positions still
holds at every depth. **Routing-table lookup is O(K) prefix-walk, not
O(N^K) scan** — copied verbatim from v1, still true at N=1024.

### Real ceilings (unchanged)

CPU + GNN + bus-dispatch is still the ceiling, ~10⁷ ops/sec libuv class.
Widening N from 256 → 1024 grows label-space, not throughput; the recorded
63k/sec single + 189k/sec aggregate baselines remain the operative numbers
until re-measured. Adding more port labels still does NOT help past the
CPU-saturation point.

### Wire-format engineering note

Port-label segments that index into the alphabet now require >8 bits.
Recommended encodings (engineering surface, NOT canon):

- **JSON envelope:** decimal integer or hex (e.g. `50001.512.4.768.21`).
  Forward-compatible — already works.
- **Binary frame:** 10-bit fixed (1024 = 2¹⁰) or unsigned varint.
- **Glyph-form (`Ξ:<actor>`):** glyph table widens to 1024 entries; first
  256 entries identical to v1 HG256.

ed25519 is unaffected — it signs the serialized byte sequence regardless
of alphabet width.

### Application rules (v2)

- Never quote "90k is the ceiling." (unchanged)
- Never frame as "90k × 6^k." (unchanged)
- Always frame as `N^K` prefix-tree, **N now = 1024**.
- A port is a label. Not a socket. (unchanged)
- Routing is prefix-walk, O(K) hops, nanoseconds each. (unchanged)
- A v1 label (alphabet index 0..255) is a valid v2 label by subset embedding.

### Validity of v1 port labels

Every port-label string emitted under v1 is a valid v2 port-label by
construction. No rewriting of routing tables, no re-registration of
listeners, no re-broadcast of bus topology required.

**End of v2 amendment draft for 02-PORT-NAMESPACE-CANON.**
