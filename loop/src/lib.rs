#![forbid(unsafe_code)]
//! ADDRESS / ROUTE / LOOP front-half of the Asolaria request path.
//!
//! Rust hot-lane port of the bigpickle-rebuild@c592599 Node modules named in each module's header,
//! plus omni-engine-loop and its github-pid-register minter from ASOLARIA-AS-NEURAL-NETWORK@4cc7624.
//! Every row this crate emits is an HBP pipe row (no JSON). The SCORE lane (asolaria-score), the
//! Fischer lane (fischer-kernel), the GNN HTTP infer, the live opencode spawn and the filesystem
//! district build are other builders' lanes; the gate calls SCORE and Fischer through
//! `hookwall::GateLanes` and the Path A loop calls SCORE through a closure, at the points upstream
//! calls them. A stdlib Python referee in `referee/referee_hbp.py` mirrors the upstream lines and checks
//! the `emit_rows` example for byte-identical rows.
//!
//! The forward-gate score crosses this lane in e4 units (1/10000), the unit of the tree's SCORE lane
//! (`gate/observed`); no floating-point type appears in `src/`, `tests/` or `examples/`.

pub mod dispatcher;
pub mod district_fabric;
pub mod gc_runtime;
pub mod github_pid_register;
pub mod glyph;
pub mod hbp;
pub mod hookwall;
pub mod js;
pub mod kernel;
pub mod loop_cycle;
pub mod omni_engine_loop;
pub mod pid_minter;
pub mod primes;
pub mod revolver;
pub mod room_router;
pub mod sha;
