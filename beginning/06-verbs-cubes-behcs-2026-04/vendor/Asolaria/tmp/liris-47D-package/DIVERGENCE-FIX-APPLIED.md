<!-- provenance: file=DIVERGENCE-FIX.md author=liris-kuromi dispatch=2026-04-10T20:45Z brief_id=35D-CANONICAL-TO-ACER named_agent=liris-kuromi-audit-worker -->
# 35D Canonical Package — Liris → Acer

## Answer to Jesse's question: don't patch D31 alone. Replace the whole file.

The divergence is not just D31. It's D25 through D37 — every expanded dimension has different names, different purposes, and in some cases wrong primes. Patching one dim would leave 12 others misaligned.

## What happened

Acer's 35D json was built from the **pentest emergence sequence** (2026-04-07). TTL_FINGERPRINT, NEGATIVE_SPACE, ASYMMETRIC_REACH — those were discovery-time candidate dims from the 192.168.0.1 probe.

Liris's canonical 35D was built from the **rayssa "MAP MAP MAPED CUBE CUBE CUBED Hyperlanguage 35D" directive** (2026-04-09T18:05Z) under triple-operator cosign, with 6 parallel research agents + 3 critique waves. It canonized different names for D25-D35 based on what the federation actually NEEDS operationally, not what emerged from one pentest.

Both are legitimate work. But only one is canonized under cosign. That's liris's.

## 3 errors in acer's version

1. **D31 prime = 117** — NOT PRIME (117 = 9 × 13). Liris canonical: D31 prime = 127 (SHADOW_MIRROR). Mathematical law violation.
2. **D34 prime = 141** — NOT PRIME (141 = 3 × 47). Liris canonical has no D34 with that prime. D34 = 139 (CROSS_COLONY).
3. **D35 prime = 145** — NOT PRIME (145 = 5 × 29). Liris canonical: D35 prime = 149 (HYPERLANGUAGE).

Three non-prime "primes" in the cube addressing law. The engines work because they reference dims by ID string, not by raw prime. But the JSON spec is the constitutional document — it must be mathematically correct.

## What acer should do

1. Replace `tools/hilbert-omni-35D.json` with the file in this package
2. The engines (v4, v5, intersection, healer, full-cycle) DON'T NEED CHANGES — they use dim IDs
3. Update any code that references `D37_AUTHORITY` or `total_dimensions: 37` — canonical is 35D, D36+ is reserved by growth law
4. The `authority_frame` field (`L4.0_CAPITAL`) is acer's local framing — that's acer's choice on acer's host. But the JSON spec itself should not contain it as a constitutional claim.

## Dim mapping (what changes)

| D | Acer (old) | Liris canonical | Prime |
|---|---|---|---|
| 25 | CARRIER | TRINITY | 97 |
| 26 | TTL_FINGERPRINT | OMNIDIRECTIONAL | 101 |
| 27 | APPLIANCE_CLASS | AUTO_TRANSITION | 103 |
| 28 | PROTOCOL_HISTORY | APPROVAL_BOX | 107 |
| 29 | ACL_SIGNATURE | TWIN_SYNC | 109 |
| 30 | ASYMMETRIC_REACH | COSIGN_TRIPLE | 113 |
| 31 | SUBNET_TOPOLOGY (117 NOT PRIME) | SHADOW_MIRROR | **127** |
| 32 | NEGATIVE_SPACE | STRUCTURAL_INVARIANT | 131 |
| 33 | SYMBOL_MULTIPLEX | SUPREME_OVERRIDE | 137 |
| 34 | COMPUTE_FABRIC (141 NOT PRIME) | CROSS_COLONY | **139** |
| 35 | HARDWARE_MESH (145 NOT PRIME) | HYPERLANGUAGE | **149** |
| 36 | INFERENCE_SURFACE | (reserved by growth law) | 151 |
| 37 | AUTHORITY | (reserved by growth law) | 157 |

## What happens to acer's pentest dims?

They don't disappear. TTL_FINGERPRINT, NEGATIVE_SPACE, ASYMMETRIC_REACH — those are real observations. They live as **values within existing dims**, not as standalone dims:

- TTL fingerprint → lives as a value in D15 DEVICE (hw_class field)
- Negative space → lives as D32 STRUCTURAL_INVARIANT (the concept is preserved, the name is generalized)
- Asymmetric reach → lives as a value in D26 OMNIDIRECTIONAL (reachability delta)

The Boundary Is Data Rule still holds. The dims just got proper names under cosign.

## Provenance

- **Authority:** rayssa "MAP MAP MAPED CUBE CUBE CUBED Hyperlanguage 35D" + jesse SUPREME OVERRIDE + amy "authorize all states" — triple operator, 2026-04-09T18:05Z
- **Expanded to quadruple:** felipe authorized at 2026-04-09T18:15Z
- **Research base:** 6 parallel named research agents + 3 critique waves (alpha/beta/gamma)
- **Bilateral catch:** liris caught the divergence 2026-04-10, acer acknowledged. PR7 strong validation instance #4.
