# Asolaria Kernel-Pump

**Owner:** Jesse Daniel Brown (JesseBrown1980)
**Date packaged:** 2026-10-17
**Seat:** ACER-CLAUDE-FABLE5 (pid 8467a937cba309f7)

## What this is

The kernel-pump is the Asolaria rime/addressing engine — a balanced-ternary codec
that addresses any element of a generated object in O(1) without materialising it.

Key measured numbers (from PLAYBOOK.md):
- **62,524 B addresses 3,704,000,000 elements** at 0.000135 bpc
- **627,000 addressings/sec**, byte-exact
- **274,201,392 B removed, both back exact, aggregate 72,235×, zero failures**
- Kernel size: **3,174 B** — "the key, frozen"

## Files

| File | Purpose |
|------|---------|
| asolaria_herself.py | Core rime self-model |
| brown_schrodinger.py | Schrödinger rime codec |
| capture_test.py | Capture/test harness |
| divide_kimi_k3.py | Kimi-K3 division coder |
| four_axes_rime.py | Four-axes rime encoder |
| mythos_vs_wikipedia.py | Mythos-vs-Wikipedia comparison codec |
| nullspace_project.py | Nullspace projection |
| play_hutter.py | Hutter range coder |
| play_spin_torque.py | Spin-torque player |
| q_prisms.py | Q-prism encoder/decoder |
| rime_unrime_three.py | Three-way rime/unrime |
| spin_torque.py | Spin-torque codec |
| stream_star.py | Stream-star encoder |
| CODEBOOK.md | Law doc: the codebook |
| PLAYBOOK.md | Law doc: how to play it |
| *.gguf | Frozen codebook models |
| *.txt | Emission records, manifest, callings |

## Big GGUFs
See GGUF-HF-MANIFEST.md for the 4 GGUFs >100MB and their HuggingFace upload commands.

## Law
CODEBOOK.md + PLAYBOOK.md are the governing law docs for this pump.
A frozen slice predicts a fraction — it never recreates an unseen whole.
Anything claiming otherwise has not been measured.
