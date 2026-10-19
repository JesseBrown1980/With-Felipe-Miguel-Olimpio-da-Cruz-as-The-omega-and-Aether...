# Brain2Qwerty Neural-Decoding Anchor

Status: `PRIMARY_SOURCE` / `MEASURED_WEB` as of 2026-07-01 from Meta AI, the Facebook Research code repo, the Brain2Qwerty v2 PDF, and the BCBL Hugging Face dataset card.

## Primary Surfaces

- Meta blog: https://ai.meta.com/blog/brain2qwerty-brain-ai-human-communication/
- Code: https://github.com/facebookresearch/brain2qwerty
- v2 paper PDF: https://facebookresearch.github.io/brain2qwerty/assets/brain2qwerty_v2.pdf
- v1 public dataset: https://huggingface.co/datasets/bcbl190626/SpanishBCBL
- v1 Nature Neuroscience paper: https://www.nature.com/articles/s41593-026-02303-2

## What It Establishes

Brain2Qwerty is the strongest current public anchor for the Q-PRISM neural-stream premise: non-invasive brain recordings can be decoded into useful symbolic language streams when the task, recording modality, training target, and subject protocol are explicit.

From the primary surfaces:

- Brain2Qwerty v2 uses non-invasive MEG, not implanted electrodes.
- The v2 paper reports about 22,000 typed sentences from 9 participants, with about 10 hours of MEG per participant.
- The v2 result reports average WER of 39%, equivalent to about 61% word accuracy; the best participant had half of decoded sentences at one word error or less.
- The pipeline uses end-to-end deep learning, CTC-style asynchronous decoding, language-model representations, and AI-assisted pipeline optimization.
- The public code repository contains both `brain2qwerty_v1/` and `brain2qwerty_v2/` directories.
- The public v1 dataset is SpanishBCBL, released by BCBL under CC BY-NC 4.0; the GitHub README marks the v2 dataset as under embargo until paper acceptance.

## What It Does Not Establish

Brain2Qwerty does not prove arbitrary thought reading, consciousness transfer, organoid personhood, or neural control of a quantum system.

The demonstrated task is constrained:

```text
participant receives / memorizes / types sentences
MEG or EEG is recorded
model decodes typed sentence production from brain activity
```

That is highly relevant to Q-PRISM, but the honest import is narrower than a general consciousness stream. For Q-PRISM, Brain2Qwerty supports treating non-invasive neural data as a high-dimensional symbolic/control prior, not as direct evidence that mind enters a matter-wave interferometer.

## Q-PRISM Design Consequences

1. The neural stream adapter should start with typed-language or attempted-typing signals, because that is where the strongest public evidence exists.
2. The first real-data integration target should be offline decoding/embedding over public Brain2Qwerty v1/SpanishBCBL data, not live human or organoid capture.
3. The experiment harness should compare four streams:
   - random/noise controls,
   - classical scheduler,
   - decoded-language/semantic priors,
   - synthetic high-coupling oracle controls for self-validation only.
4. Raw neural recordings are sensitive human-subject data. Q-PRISM should store derived schedules, hashes, metrics, and consent/provenance records; it should not hoard raw neural data unless an explicit approved data protocol requires it.

## Claims Boundary

Allowed now:

```text
Brain2Qwerty demonstrates that non-invasive MEG can decode constrained typed-sentence production into text at useful accuracy, with public code and a public v1 dataset.
```

Allowed as a Q-PRISM hypothesis:

```text
Decoded neural-language streams may provide useful high-dimensional priors for schedule selection in a physics simulator or, later, a hardware experiment.
```

Denied:

```text
Brain2Qwerty proves arbitrary thought reading.
Brain2Qwerty proves consciousness coupling to quantum systems.
A Q-PRISM simulator result is a human-neural or hardware result.
```
