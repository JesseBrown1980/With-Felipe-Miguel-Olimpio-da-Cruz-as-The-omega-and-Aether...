# Reverse-gain self-echo — a finding, and why the per-adversary set is not shipped

Operator: Jesse Daniel Brown. Finding recorded 2026-10-18.

This document is published on purpose. It is the mitigation: a builder who reads it does not
rebuild the mistake it describes. The one thing it does not contain is the per-adversary
identifier set itself — not because the mechanism is secret (it is spelled out in full below),
but because the set is the only part that is contact data rather than method, and the method is
what protects future systems, not the data.

## What the plane does

The G3 reverse-gain plane (`gnn-reverse-gain`, estate `revolver-10k/src/planes/`) scores an
envelope like this:

```
mineReverseGain(env):
    dist   = jlMagnitude(env)          # Euclidean norm of the quant vector, floored at a small value
    is_mask = MASK_GLYPHS.has(env.glyph)   # membership test against a fixed set
    sign   = is_mask ? -1 : +1
    score  = sign * dist
```

`jlMagnitude` runs the envelope through the quant adapter (`omniquant`) and takes the magnitude
of the resulting vector. `MASK_GLYPHS` is a set of identifier strings the operator supplies. The
"deception inversion" the plane is named for is exactly this: a sign flip on a set-membership
test. A glyph in the set scores negative ("mask"); any other glyph scores positive ("honest").

## The experiment

The operator ran a self-test to measure whether the system could locate a real person. The
method:

1. Invent a persona that does not correspond to any real person.
2. Attach to that persona a set of identifiers — accounts, network endpoints, a handle — and
   place them in `MASK_GLYPHS` as that persona's "signals".
3. Ask the system to locate the persona.

## The finding

The system returned the identifiers it had been given. It matched incoming envelopes against the
set it was handed and reported the matches. It did not discover anyone. The "adversary" it scored
was the operator's own supplied ground truth, echoed back.

In other words: `MASK_GLYPHS` is an input, not an output. The plane has no capability to find a
person's accounts or location. It can only recognise identifiers already written into its set.
Belief that it can find people comes from feeding it the answer and then asking the question.

## Why the set is not shipped, and why that is the safe choice

Because the set is input, embedding real identifiers in it and publishing the file does two
things, both bad and neither useful:

- It grants no capability. A reader learns nothing about how to find anyone; the method above is
  the whole method, and it finds no one.
- It publishes contact data. If any identifier in the set is a live account, publishing the file
  exposes whoever owns it, under an "adversary" label, permanently.

So the rule this finding establishes, and the mitigation this document is:

> Per-adversary identifier sets are operator-supplied at runtime and are never embedded in a
> published artifact. The algorithm is public; the set is loaded locally.

This is the same boundary the stack already draws for other operator-supplied ground truth (the
Shannon-stage `antecedents` value and the cosign chain head are supplied, not shipped). A future
builder who instead hard-codes real identifiers into this set, expecting "find people"
capability, gets no capability and creates the exposure. Writing the mechanism down here is what
stops that: the flaw is disclosed in full, and the data that would be the harm is kept out.

## What is in the repository

- The reverse-gain mechanism, described above in full.
- The composition pieces it sits beside — `omniquant`, `quant-bus`, `bpi-codec` — brought in
  where they carry no third-party data.

## What is not in the repository

- The `MASK_GLYPHS` identifier set. It is operator-supplied at runtime. See `OWNER-RULES` 7j for
  the decision of 2026-10-18 and the conditions under which the operator may publish it directly.
