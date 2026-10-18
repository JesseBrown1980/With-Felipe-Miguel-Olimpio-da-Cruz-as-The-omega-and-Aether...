# planes/gnn-trio — the public, runnable G-plane trio

The G-plane trio made runnable for anyone, without the operator's private per-adversary set. The G3
reverse-gain scorer is here as an integer Rust port with a synthetic default mask set; the G1/G2/G4
argument-only cores come from `model/g-planes`; the clean revolver-10k composition files are vendored
as the operator's float / Node lane.

This is the **public runnable build**. It is not a byte copy of the operator's private
`gnn-reverse-gain.mjs`, which stays local (OWNER-RULES 7j). See `PROVENANCE.md`.

## Run it

```
cd planes/gnn-trio
cargo +1.81.0 run --example trio      # runs the trio on a synthetic envelope, synthetic mask set
cargo +1.81.0 test                    # unit tests + the Python-referee parity test
```

The example scores a synthetic mask-shaped glyph and a synthetic honest glyph, shows the metadata
vector, the authority bitmask, a G4 transition on supplied demo inputs, and the running state with
exact integer ratios. It prints the mask set's source and size, never its contents.

## Supply your own set

The mask set is operator-supplied at runtime. Point an environment variable at a newline-delimited
file of your identifiers (blank lines and `#` comments are ignored):

```
GNN_REVERSE_MASK_SET=/path/to/your-set.txt cargo +1.81.0 run --example trio
```

When the variable is unset, the shipped **synthetic demo set** (`data/example-mask-glyphs.txt`) is
used so the plane runs with no setup. When it names a file that cannot be read, the run fails loudly
rather than silently falling back to the demo set. `MaskSet::empty()` is also available for the
literal OWNER-RULES 7j empty default.

The synthetic set is a demo fixture, not intelligence: opaque tokens, with any contact-shaped tokens
using only reserved forms (RFC 2606 `example.com` emails, the NANP fictional `555-0100..555-0199`
block). Your real set is never part of this published artifact.

## What it computes

```
mine_reverse_gain(glyph, jl_distance, mask):
    is_mask = mask.contains(glyph)         # set-membership test
    sign    = if is_mask { -1 } else { +1 }
    score   = sign * jl_distance           # exact: a sign-bit flip on the supplied magnitude
```

`jl_distance` (the JL-projected quant vector's magnitude) is the operator's float code. It runs only
in the vendored Node lane against the external HyperBEHCS engine and is **never fabricated** here;
this crate takes it as a supplied argument. The example passes a supplied demo magnitude, labelled as
such.

## Why the set is not shipped

The reverse-gain mechanism is public; the per-adversary set is not. The set is an input, not an
output: the plane recognises identifiers already written into it and discovers no one. Embedding real
identifiers would grant no capability and would publish contact data. The full reasoning is in
[`docs/security/REVERSE-GAIN-SELF-ECHO.md`](../../docs/security/REVERSE-GAIN-SELF-ECHO.md) and
OWNER-RULES 7j.

## The live `:4949` path is absent

The `:4949 /api/gnn/score` handler exists nowhere on disk, so against the on-disk system the
request-path g1..g4 resolve to null. This crate reproduces that absence (the trio composition is
default-closed) and fabricates no g1..g4. The runnable surface is the direct reverse-gain / self-test
path, not the live request path.

## Layout

- `src/reverse_gain.rs` — the runnable G3 core, the `MaskSet` loader, the running `State`.
- `src/omniquant.rs`, `src/quant_bus.rs`, `src/bpi_codec.rs` — the engine-free composition pieces.
- `src/sha256.rs` — one-shot SHA-256 for the frame integrity tail.
- `data/example-mask-glyphs.txt` — the synthetic demo mask set.
- `examples/trio.rs` — the end-to-end run.
- `vendor/` — the four clean revolver-10k files, byte-identical (the operator's float / Node lane).
- `tools/referee.py`, `tests/` — the independent integer referee and the parity test.
