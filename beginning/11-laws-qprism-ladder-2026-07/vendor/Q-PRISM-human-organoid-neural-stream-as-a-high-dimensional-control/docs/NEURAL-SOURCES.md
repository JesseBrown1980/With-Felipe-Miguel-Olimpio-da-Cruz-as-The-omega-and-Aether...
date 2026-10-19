# Neural sources — the Layer-3 socket

The prism arm is driven by any object exposing `.next() -> ndarray[5]` in [0,1] (a control
proposal in normalised parameter space). This makes the neural layer **pluggable**: the same
blinded harness, physics simulator, and claims gate work regardless of where the stream comes
from. Three drivers ship today (`qprism/neural_sources.py`):

| driver | signal | maturity | needs |
|---|---|---|---|
| `SyntheticSource` | structured pseudo-noise | ships | nothing (baseline / honest-null) |
| `ConnectomeSource` | bounded rate model over a neural graph (C. elegans-scale) | ships (toy graph) | a real connectome edge list to be biological |
| `RecordedFeatureSource` | windowed features from real non-invasive recordings | ships (synthetic fixture) | real MEG/EEG features to be real |

## The honest bridge: synthetic → connectome → real human

- **`ConnectomeSource`** is the path opened by **Dr. Eric Wasiolek's** work — a C. elegans
  connectome (≈300 neurons / ≈2200 synapses) modelled as a graph. Drop a real adjacency matrix
  in and the prism is driven by real nervous-system dynamics, with **no wet lab**.
- **`RecordedFeatureSource`** is the path opened by **Meta's Brain2Qwerty** (non-invasive MEG →
  text, v1 dataset public via BCBL, training code released). Extract MEG features from the public
  dataset, hand them in as `features`, and the prism is driven by **real human brain recordings —
  no surgery, no organoid, no IRB** (public data).

## The gate still holds

Plugging in biological or real human data does **not** grant an advantage. Each source is only a
*proposer*; the simulator is the sole judge; and the harness's honest-null still applies — a
source wins **only** if its signal genuinely correlates with better interferometer control, which
is precisely the hypothesis under test. A connectome or MEG stream that carries no control-relevant
information will (correctly) fail to beat the classical optimizer. That is the point.

## Attribution

`ConnectomeSource` credits Eric Wasiolek's C. elegans connectome modelling. `RecordedFeatureSource`
credits Meta's Brain2Qwerty (github.com/facebookresearch/brain2qwerty) and the BCBL v1 dataset.
Neither is integrated wholesale here — this repo provides the *socket*; real data/edge lists are
supplied by the user. No third-party personal data or contact details are stored in this repo.
