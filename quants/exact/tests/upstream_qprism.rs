//! Q-PRISM's own tests, run unchanged against the vendored lines: `host8/qprism_cube_host8.rs`
//! lines 265-273 @ b4a21a2 (added in 53023b6) against its lines 101-128, and
//! `host8/dbbh_coms_quant_prism.rs` lines 520-625 (five of the six tests of its `tests` module)
//! against its lines 16-514.

mod qprism_cube_host8 {
    use quant_exact::qprism_transcode::*;

    include!("../vendor/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control/host8/qprism_cube_host8.rs.lines-265-273");
}

mod dbbh_coms_quant_prism {
    use quant_exact::qprism_dbbh_ladder::*;

    include!("../vendor/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control/host8/dbbh_coms_quant_prism.rs.lines-520-625");
}
