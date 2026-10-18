# HyperBEHCS HRM Known Problem Probe

Status: known_problem_encoded_hrm_runtime_blocked

Fingerprint: c6c61c5f43d38124

## Problem

Domain: maze_shortest_path

```text
S..#.
##.#.
...#.
.###.
....G
```

Expected shortest path length: 12

## Result

Baseline checker solved: true

HRM model attempted: false

HRM model solved: false

Reason: hrm_runtime_gate_blocks_model_execution_no_torch_checkpoint_or_runtime_promotion

## Boundary

This probe encodes a known HRM-domain problem and checks it locally. It does not import Torch, execute the HRM model, load a checkpoint, train, mutate Quant, or grant authority.
