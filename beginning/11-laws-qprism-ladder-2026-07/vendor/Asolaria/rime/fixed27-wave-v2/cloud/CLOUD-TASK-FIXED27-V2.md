# Codex Cloud task: independently verify fixed-27 RIME V2

Work only in this repository. Read `AGENTS.md` first and obey it.

Recent-dictation recovery, highest priority:

> THE 27 are DIFFERENT -,.,+ values

This overrides the interrupted phrase that described them as starting or
derived colors. Interpret the 27 as all unique ordered width-three tuples over
literal `-,.,+`, exactly once, in canonical order from `---` through `+++`.

Do not redesign the architecture. Run these gates in order, and after each
stage briefly review the output before proceeding:

1. Read `src/trit.rs`, `src/coordinate.rs`, and
   `review/FIXED27-WAVE-V2-REVIEW.md`. Confirm that the center text glyph is
   `.`, that 27 tuple identities are unique, and that the 27-byte photo is one
   change-state trit per tuple identity—not a color palette.
2. Run:

   ```bash
   rustup run 1.81 cargo fmt -- --check
   rustup run 1.81 cargo check --all-targets
   rustup run 1.81 cargo clippy --all-targets -- -D warnings
   rustup run 1.81 cargo test --all-targets
   ```

3. Run `rustup run 1.81 cargo run --quiet -- seal cloud`.
4. Verify:

   - 10/10 Rust tests pass.
   - The second cascade is exactly 93,312 routes and its nearest third is
     31,104.
   - `receipts/rime-wave-structural-v2.hbp` has SHA-256
     `d265e5025c356e091e665e5f8e7fa92962663372fd0aa046300f80557cee829e`.
   - Local, SGRAM, and cloud-manifest `fixed27-values-v2.rime3` are exactly 27
     bytes, accept only `-,.,+`, and are byte-identical.
   - The cloud measurement receipt calculates nearest thirds from the actual
     cloud timings rather than copying Acer timing numbers.

Do not run the CUDA script: this cloud gate has no verified GPU. Do not claim
physical gravity or trained model weights. Make no source changes unless a gate
fails. If all gates pass, return the task ID, commit SHA, exact command results,
structural SHA, cloud timing receipt, storage SHA, and remaining boundaries.

