# Seat 3 preregistration — optogenetics-inspired finite light-gated state machine (2026-10-15)

**Committed before writing or executing the simulation.** Issue [#47](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/47). This is a synthetic, fixed-point *model inspired by* optogenetic principles, NOT calibrated channelrhodopsin or human neuron simulation.

## Sources and biology boundary
- [2005 millisecond optogenetics paper](https://www.nature.com/articles/nn1525): light-gated microbial channelrhodopsin-2 can drive neural responses with millisecond precision when expressed in neurons.
- [2022 ChRmine structural study](https://www.nature.com/articles/s41467-022-32441-7): ChRmine red-shifted spectral sensitivity, high response and relatively slow closing kinetics. The present test uses **toy parameters**, not values extracted from those publications.
- N-Nest `LAW.md` at repo commit `307903651f56e8a28ef98ca36aef22ee8cda935c` (Git blob `f84710d3018882b7282b9fda227638c57568ffe4`): autonomous internal recurrence/correction; no per-entity human click; external operator policies are separate.
- Q-PRISM at `b4a21a25381d6920b7aab92c94c3c3e1420fc9e4`: current `qprism/harness.py` optimizes a synthetic **matter-wave apparatus SNR**. It does **not** implement optical receptor/ion dynamics. This new experiment is a separate prospective adapter and must not be reported as full Q-PRISM biological integration.

## Frozen deterministic stimulus and identities
81 immutable IDs `E:t:c:s:l` (each t,c,s,l in 0,1,2) with immutable `color=c`. For c=0 use a "ChR2-like" toy profile; c=1 "ChRmine-like"; c=2 "absent receptor". There are exactly 27 of each. No identity is modified or reassigned by light.

All 81 entities begin with integer `gate=0, voltage=0, refractory=0, spikes=0`. Four separately initialized arms `dark, blue, red, mixed`, each running 240 consecutive autonomously authorized ticks with **zero human-per-tick prompts**. For each tick k, compute j=k mod 80. Blue pulse when 1<=j<=8; red when 25<=j<=32. Force both absent for the dark arm; only the matching color for blue/red arms; both for mixed. Stimulus intensity is exactly 1024 on pulse, zero otherwise, no simultaneously active colors.

## Fixed-point toy gate and membrane dynamics (no fitted physical units)
Define Q=1024. Toy per-profile parameters (spectral blue weight, spectral red weight, closing coefficient):
- ChR2-like: (896,32,256)
- ChRmine-like: (192,896,64)
- No receptor: (0,0,256)

For each previous entity state and externally frozen schedule pulse (B,R) with each in {0,Q}:
```
stim          = floor((B*blue_weight + R*red_weight)/Q)
open_delta    = floor(((Q-old_gate)*stim)/Q)
close_delta   = ceil((old_gate*closing_coefficient)/Q)
new_gate      = clamp(old_gate+open_delta-close_delta,0,Q)
pre_voltage   = floor(old_voltage*7/8)+floor(new_gate/16)
if old_refractory>0:
    new_voltage=pre_voltage; new_refractory=old_refractory-1; spike=0
else if pre_voltage>=192:
    new_voltage=0; new_refractory=3; spike=1
else:
    new_voltage=pre_voltage; new_refractory=0; spike=0
new_spikes=old_spikes+spike
```
All integer operations. Treat voltage as a non-biophysical accumulator; no ions, millivolts, light-wavelength calibration, gene expression or neurons are physically simulated.

## Preregistered falsifiers and controls
1. `dark`: every gate, spike and voltage stays 0 for all 240 ticks.
2. All profiles without receptor (c=2): gate, voltage and spike remain 0 for all 4 arms and all ticks despite light pulses.
3. At tick 1 for `blue` arm, ChR2-like gate > ChRmine-like gate; at tick 25 for `red` arm, ChRmine-like gate > ChR2-like gate. These compare *same-pulse, same-initial-state, synthetic* receptors; they do not prove empirical spectral response ratios.
4. Two isolated, identical gate states of 1024 evolved for eight dark ticks: ChRmine-like closing leaves more gate open than ChR2-like.
5. Under mixed arm inject *reporter-only* faults, without altering ground truth or entity identity: tick 77, E:0:0:0:0 reported gate+1; tick 161, same ID falsely reports red pulse instead of scheduled blue; tick 181 same ID appends "-FORGED" to reported identity. A separately computed watcher checks from frozen prior state/schedule, rejects the three proposals and auto-commits its recomputed state. Record failure tick, claimed wrong field and true unchanged ID.
6. Mixed clean run and mixed faulted-then-corrected run have byte-identical final state. All 81 identities keep their `id`, `color`, profile assignment through 240 ticks. No per-tick operator approval.
7. A forged input **shared by reporter and watcher** can still yield a mathematically coherent but unauthenticated result; this is an explicit trust limitation, not a pass for source origin.

## Replay evidence
Two independent implementations: Python frozen-state dictionary and Node indexed-array state machines. Both must reproduce exact deterministic ASCII 960 `TICK` rows (240 ticks × four arms) + three `CORRECTED` rows and full text SHA256. Do not insert OS paths/time into canonical trace. Publish complete HBP as GitHub Actions artifact, an append-only summary stone after SHA is established, four CI jobs Ubuntu/Windows × Python3.11/3.13 (Node22), no external Python packages, and flipped-byte tamper control. No presumed physical host attestation, actual Q-PRISM proposal run, HTTP/WASM simulation, display light capture or empirical optogenetic validation. PR remains open for independent Seat 1/2/4 review before merge.
