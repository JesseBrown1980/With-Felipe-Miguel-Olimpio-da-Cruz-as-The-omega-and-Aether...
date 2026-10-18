//! Registry slot 21, `Q-CUBE3200-ABSORB-v1` (registry line 27, owner
//! `Q-PRISM/docs/STAGE2-CUBE-ABSORPTION.md`).
//!
//! The owner's Host-8 cube contract, `host8/qprism_cube_host8.rs` of
//! Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control @ b4a21a2 (blob 992ffd79),
//! carried byte-identical as two line ranges: 20-49 (`Host8`) and 55-296 (Brown-Hilbert prefix and
//! injection, the 256<->1024 transcode, the graphify-V3 selector row, the active-glyph law and the
//! file's own six tests). Lines 1-19 (the `//!` header and `#![allow(dead_code)]`, which `include!`
//! cannot take) and 50-54 (a comment carrying a citation with a co-author's name, see
//! PROVENANCE.md) are not carried.
//!
//! STAGE2-CUBE-ABSORPTION.md:8-10 names this file "the authoritative Host-8 cube/selector
//! contract" and `qprism/cube_absorb.py` "the sim/harness reference only". The 3,200-byte quant
//! tuple itself is computed by that Python (numpy) file, which stays in the cold lane
//! (aether `eval/vendor/qprism-control`, used in place by `tools/qprism_receipts.py`).

// Q-PRISM's own CI (`.github/workflows/rust-1.81-clippy-verification.yml`) finds no Cargo.toml and
// records clippy as NOT_MEASURED, so upstream names no allowed lints. Clippy 0.1.81 reports one
// lint on the carried lines, which stay unchanged: `format_collect` at upstream line 25
// (`Host8::to_hex`).
#[allow(clippy::format_collect)]
mod upstream {
    include!("../vendor/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control/host8/qprism_cube_host8.rs.lines-20-49");
    include!("../vendor/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control/host8/qprism_cube_host8.rs.lines-55-296");
}

pub use upstream::{
    active_glyph_law, bh_inject_between, bh_prefix, bh_render, cube_row, transcode_1024_to_256,
    transcode_256_to_1024, CubeHandles, Host8, BH_DEPTH, BH_RADIX, GRAPHIFY_SCHEMA, SELECTOR_AXES,
    SELECTOR_CONSTRAINT,
};
