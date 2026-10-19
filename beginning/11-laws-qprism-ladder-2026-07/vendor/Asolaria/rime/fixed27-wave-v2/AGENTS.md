# Fixed-27 RIME cloud scope

These instructions apply to this project and any Codex Cloud task that runs it.

- Use Rust toolchain `1.81` for build, format, Clippy, and tests. Rust `1.96`
  is reserved for the separate message bus and must not build this crate.
- The textual trit basis is exactly `-,.,+`.
- The carrier has exactly 27 distinct ordered width-three values over that
  basis. It does not have 27 colors and never expands to 77, 256, 1024, 2079,
  4096, or 16376 identities.
- `color`, `time`, and `space` are projections of each whole ordered value.
  Each identity carries one ternary gradient/change state.
- A 27-slot photo stores one change-state trit per identity in the canonical
  tuple order from `---` through `+++`.
- RGB `0,127,255` is display projection only. It creates no additional value.
- This RIME runtime has no PID field. Do not reintroduce a PID namespace.
- The fixed carrier changes by wave levels. The second cascade is exactly
  `6×6×6×6×6×12 = 93,312` routes.
- The constellation order is Omnishannon, forward GNN, reverse-gain GNN, FNN,
  and GSLM. Do not claim trained weights unless actual weight evidence exists.
- Treat derived `-1/3` gravity as computational and dimensionless. Physical
  gravity remains unverified.
- Never mount, format, write, or otherwise touch the SOVLINUX frozen USB
  weights bank.
- After each stage: stop, review the evidence, run the full gate, and only then
  proceed.
- Preserve old V1 evidence historically. Write corrected evidence under V2
  names and immutable key `fixed27-values-v2`.

