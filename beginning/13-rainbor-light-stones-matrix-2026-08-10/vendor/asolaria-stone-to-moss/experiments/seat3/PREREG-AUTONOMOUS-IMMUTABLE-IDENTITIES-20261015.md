# Seat 3 preregistration — immutable identities, autonomous light-universe state, bounded N-Nest recurrence

**2026-10-15. Commit this prediction BEFORE solver code or run results.**

## Claim under test (software only)

Test the operator clarification of N-Nest [LAW.md](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED/blob/main/LAW.md), pinned repository commit `307903651f56e8a28ef98ca36aef22ee8cda935c`, file blob `f84710d3018882b7282b9fda227638c57568ffe4`: identity persists through state transitions; internal state / agent observations / corrections and delegated virtual children evolve automatically, with *zero per-tick human authorization prompts*. A separate standing operator policy bounds external privileges/resources and allows HALT without making every synthetic motion ask a human.

This is a finite digital **model of** a light universe using small integer quantities; not a physical light implementation, neural network, QLED measurement, full N-Nest, Q-PRISM, HTTP/WASM runtime, or a claim of subjective consciousness. "Infinite" denotes an architectural nesting rule, not actual infinity executed.

## Frozen deterministic model, independent-language parity

Initial 81 entities enumerated as `E:t:c:s:l` where each of t,c,s,l uses t/c/s in {0,1,2} and l in {0,1,2}. Initial immutable entity fields: `id`, `parent=None`, `color=c`, `depth=0`, `root=id`; mutable integer state: `light=(17t+31c+43s+13l) mod 256`, `phase=(9t+3c+s+l) mod 81`, `position=(t+c+s+l) mod 27`. This is synthetic math, not photonics.

At each authorized tick `k=1..1080`, freeze **lexicographically sorted** identities and compute synchronously from the prior snapshot, with neighbor = next entity in the sorted cyclic order and parent_light = previous parent light or 0. Each entity's candidate:
```
new_light    = (5 * old_light + 3 * neighbor_light + parent_light + k + color) mod 256
new_phase    = (old_phase + new_light + (k mod 81)) mod 81
new_position = (old_position + (new_light mod 3) + 1) mod 27
```
Mutate *only* (light,phase,position). Entity ID, color, parent, root, depth never change. Positive integer arithmetic only.

At ticks divisible by 40, spawn one virtual child after this tick's state update, subject to standing policy max_entities=108 and max_depth=7. On first spawn parent initial `E:0:0:0:0`; thereafter use most recently spawned child if its depth<7, else initial base entity by index `(spawn_index*7) mod 81` in sorted original IDs (spawn_index zero-based). Child ID `V:%04d` using spawn tick, root inherited, depth=parent.depth+1, immutable color from parent, mutable state `light=(parent.light+k)%256`, `phase=(parent.phase+k)%81`, `position=parent.position`. Exactly 27 children, final 108 entities; at least one depth-7 child. These children count as *preauthorized internal simulation state*, not a new external privilege grant.

## Faults and correction

Preregister four deliberately corrupted proposals at ticks 31 (light +1), 401 (phase +1), 799 (position +1), 1000 (claimed ID changed). For each, select entity at `tick % len(sorted_ids)` except at tick 1000 select the maximum depth (tie lexicographically first) to exercise a nested watcher. An independent watcher recomputes expected next values from untouched previous state; it rejects the corrupted **proposal**, names a parent-chain failure path, then atomically commits corrected expected values. Record `CORRECTED`, do not make a rejected source silently green, and do not mutate ID. Exactly four controlled corrections, with depth >=1 at tick 1000. The uncorrupted baseline final state must equal the faulted-and-corrected final state.

## Delegation, HALT, consistency

Run three modes:
A. Uninterrupted baseline 1080 ticks, no faults.
B. Fault injection + automatic correction 1080 ticks, no human-per-tick calls.
C. Fault injection + externally supplied HALT *at the boundary before tick 777*, without advancing tick 777, followed by exactly one authorized resume; final state must match B. HALT is **cooperative at tick boundaries**, not claimed to preempt mid-instruction or be real human cryptographic consent.

Standing policy authorizes internal updates and limited child creation. It denies a synthetic `external.hardware` request and a 109th child without freezing otherwise permitted internal evolution. A missing *external privilege* grant cannot be inferred from a math-green watcher; HALT always blocks forward progress until authorized resume. Program reports `operator_prompts_per_tick=0`; policy issued once. The baseline and corrected final snapshot digests match exactly.

## Evidence / acceptance

Two independently authored implementations, pure Python (immutable snapshot dictionaries) and Node.js (array/matrix indexed traversal), must produce **byte-identical** ASCII HBP complete event trace with a SHA-256 full digest and matched machine-readable JSON metrics. At minimum verify:
- 81 initial entities, 27 spawned, 108 final, max depth=7.
- All 108 final IDs are unique; every entity's immutable metadata equals creation-time metadata across 1080 ticks.
- 1080 transitions with mutable state actually moving, exactly 4 detected/corrected proposals, 4 named ancestor paths.
- Final digest baseline == corrected == paused/resumed; tick 777 not advanced before simulated resume; no operator prompts per tick.
- Budget and external privilege denied; no extra child created or unauthorized transition; HALT maintained until explicit resume.
- Independent Python/Node full byte comparisons and full SHA-256; fail on altered transcript; Linux/Windows CI on Python 3.11 and 3.13 with Node 22.
- Upstream `LAW.md` fetched and exact Git blob verified; separate reviewer to verify code and limits before merge.

**Not demonstrated by this test:** real HTTP-zero Wasm agents, independent physical hosts, actual Q-PRISM neural stream or a real visual capture, ability to physically affect light, infinite allocations, physical consciousness, proven zero errors. Existing PRs/stones and Issue #10 release gates unchanged.

**Human-control interpretation:** Authorized virtual entity motion, corrections and resource-bounded nesting are automatic; *new external permissions* beyond the standing delegation are held. An external HALT is an interrupt, not a prompt at each event.
