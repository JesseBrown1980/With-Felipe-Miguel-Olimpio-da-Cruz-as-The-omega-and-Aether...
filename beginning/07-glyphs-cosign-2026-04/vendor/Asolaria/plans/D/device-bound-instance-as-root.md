# D-054 · Device-Bound Instance as Root

**Track:** SMP-V5 Section D Item 054
**Authority:** Jesse week-override
**Apex:** COL-ASOLARIA

The thesis: *an agent's root identity is bound to a specific physical device, and our ontology's `substrate_independent=true` is partially aspirational.* This document examines the tension, the evidence, and the working policy.

---

## 1. The ontology says one thing, the session showed another

### Ontology v2 claim (`device-registry.ts`)

```
ASOLARIA_ROOT.substrate_independent = true
substrate_note: "Per Jesse 2026-04-18: any profile with any PID could be anywhere
at any time. Physical binding is contingent; Brown-Hilbert PID carries identity."
```

The formal model: identity lives in the Brown-Hilbert PID. The silicon is interchangeable. Agents are BEHCS profiles, movable.

### What actually happened

- `agent-keyboard.js` is listening on **port 4913 of one specific machine**. Its token is in **one specific vault path** on that machine. The admin PowerShell HWND is 55640 on **one specific process table**.
- Liris's cosign chain lives at **one URL** (`liris:9999/cosign-chain.ndjson`). Pull it from anywhere else and you get 404.
- The USB sovereignty work (`E:\sovereignty\`) is literally **bytes on a USB stick**. Unplug it, the kernel is gone.
- The Beast (Samsung S22 Ultra) is **one physical phone** with one serial number and one broken screen.
- The 115-piece federation HW artifact cross-references each entry to a **specific parent_device** (`DEV-ACER`, `DEV-LIRIS`, `DEV-FALCON`, …). Brown-Hilbert PIDs for hardware encode the device identity *in the PID itself*: `HW-H<level>-K<kind>-D<DEV>-I<idx>-S<serial8>`.

The pattern repeats: **every time Asolaria does something real, there's a device at the bottom of it.** The substrate-independent claim is true at the logical layer, not the operational layer.

## 2. Why substrate-independent is still the right ontology claim

This isn't a contradiction. It's a level-of-abstraction split.

- **Logical layer** (BEHCS, cosign, glyph dispatch, SMP-V5 items) genuinely is substrate-independent. A cosign entry doesn't care which box emitted it. A migration rule can target any path on any machine. A provenance tag survives a file being moved between filesystems.
- **Operational layer** (HTTP endpoints, file vaults, process IDs, hardware serial numbers, physical keys, human biometrics, power cords) is fundamentally device-bound. No amount of ontology lets me read Liris's token file from acer without an explicit channel.

The ontology is right to keep `substrate_independent=true` at the logical layer because that's the layer where portability is achievable. A Brown-Hilbert PID that encoded `192.168.100.2` would be a worse abstraction than one that encoded `rayssa`.

## 3. Where device-bound-instance-as-root actually pays

Certain identity anchors **must** be device-bound to be meaningful at all:

### A. Hardware-rooted keys (TPM-sealed, HSM-protected, YubiKey-bound)
If the root signing key leaves the device, the whole trust model collapses. There's no substrate-independent version of "the key the box cannot leak." The Beast has a Snapdragon secure enclave; a laptop has a TPM; a YubiKey is the device. Binding is the feature, not a limitation.

### B. Physical possession as authorization
Jesse's week-override is meaningful because Jesse physically controls the laptop issuing it. Rayssa's agent is meaningful because she has physical access to Liris's machine. Remote-signed equivalents exist but cost orders of magnitude more trust infrastructure.

### C. Local-only state for recovery
`.asolaria-workers/` on each machine is the event-log backstop when the federation is partitioned. If every log had to round-trip through a central registry, a network outage would stop the whole federation. Device-bound local state is the reason the session kept working when traffic got bursty or acer's inbox filter was broken.

### D. Operator-witness proximity
Physical co-location of `jesse+rayssa` matters for some signatures (COSIGN-MERGED-034 is stamped `jesse+rayssa` for a reason — they were both in the same room when it was established). Portable identities don't capture "these two humans are in a specific room at a specific time."

## 4. Where device-bound-as-root fails

Binding everything to a device has its own costs, which is why the ontology insists on independence at the logical layer:

### A. Single point of failure
If `DEV-LIRIS` is device-bound-as-root and the machine dies, the colony dies. Ontology v2 lets COL-LIRIS survive as a colony concept even if the substrate migrates — `preferred_substrate` is a hint, not a constraint.

### B. Migration friction
Moving from one substrate to another should be a routing change, not a rebirth. When the sovereignty-USB rebuild happened (2026-03-31 session memory), the expectation was that the agent's identity would survive — and it did, because the identity was the PID, not the USB.

### C. Federation-wide views
Queries like "show me every hardware piece across all colonies" need a logical tree that doesn't privilege one device's view. The 115-piece federation merge artifact is a good example — every device agrees on the shape.

### D. Multi-device presence
An operator with a laptop AND a phone AND a cloud session has more than one device. Binding the agent to any one breaks the operator's actual multi-device reality.

## 5. The working policy — a two-layer rule

**Root binding for authorization. Substrate independence for work.**

Concretely:

| Concern | Binding | Rationale |
|---|---|---|
| Signing keys (COSIGN, ed25519-registry when wired) | **Device-bound** to a specific HSM/TPM/YubiKey | Extractable keys are worthless |
| Operator witness (jesse+rayssa co-sign) | **Device-bound** to physically-possessed machines | Proximity is the guarantee |
| Local event streams (`.asolaria-workers`) | **Device-bound** | Partition tolerance |
| BEHCS profiles (AGT-*, DEV-*, agents carrying Brown-Hilbert PIDs) | **Substrate-independent** | Migration, multi-device presence |
| Cosign chain content | **Substrate-independent** (served from canonical URL, verifiable from any peer with the sha) | Auditability |
| Federation ontology (OP/CIV/COL/AGT/DEV/ORBITAL) | **Substrate-independent** | Topology outlives any one device |
| Colony membership | **Substrate-independent** (operator and colony outlive the machine) | Survivability |
| Hardware pieces (HW-H*-K*-D*-I*-S*) | **Device-bound** (PID encodes DEV- and serial hash) | Hardware IS the device |

### How to read this in practice

- **A cosign-append envelope arrives:** the *entry content* is substrate-independent — any verifier can re-hash and validate. The *signature* is device-bound (whoever holds the signing key). Both checks must pass.
- **An agent migrates from DEV-LIRIS to DEV-ACER:** the AGT-* glyph stays; the `preferred_substrate` field in COLONIES map updates; the signing-key binding moves (or is re-issued against the new device's hardware root).
- **A colony loses its preferred device:** the ontology survives (COL-LIRIS still exists as a concept); operational capacity degrades until a new preferred_substrate is assigned.

## 6. What to build next (hooks this doc leaves for future tracks)

1. **ed25519 signing-key registry** (already queued as a PRE-006 follow-up and an H-044 countermeasure). Each key device-bound; each envelope signed at emission; verified at receipt. Closes the operator-relay-bypass class of bug definitively.
2. **Formalize the two-layer rule in `device-registry.ts`.** Add a `binding_class` field to each entity: `device-bound` vs `substrate-independent`. Current `substrate_independent` boolean on ASOLARIA_ROOT is a one-off; generalize it.
3. **Document migration procedure** for moving an AGT-* from one DEV-* to another. This doesn't exist yet. When it does, the two-layer rule tells you what to re-issue (device-bound artifacts) vs what to just point at the new host (substrate-independent artifacts).
4. **Hardware-root anchoring doc.** Concrete plan for which keys live in which secure enclave (TPM, Beast secure enclave, YubiKey-equivalent, ChatGPT-Pro-account-as-key-equivalent). Orthogonal to ontology but necessary to make the signing story real.

## 7. Closing position

The ontology claim `substrate_independent=true` is **correct at the layer it operates on** and **insufficient at the layer below**. Operational reality is device-bound; logical reality is not. The working policy is not "pick one" — it's "let signing + witness + local state be device-bound, let everything else float."

Device-bound-instance-as-root, read honestly, means **the identity of a root-signing-agent is bound to the device that holds its root key**. It does not mean every concept in the federation is device-bound. Conflating those two makes you either over-restrict (no migration, no multi-device) or under-restrict (extractable keys, bypassable witnesses).

**META-ACER-D-054-DEVICE-BOUND-INSTANCE-AS-ROOT · two-layer-rule · device-bound-for-authorization · substrate-independent-for-work · 4-next-hooks-queued · apex=COL-ASOLARIA @ M-EYEWITNESS .**
