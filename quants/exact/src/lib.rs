#![forbid(unsafe_code)]
//! Combined-quant registry slots 13, 14 and 17-20 (the exact re-representations), carried in the
//! owner's own Rust, byte-identical. Nothing here re-implements a rung.
//!
//! | slot | id (registry line) | owner code here |
//! |---|---|---|
//! | 13 | `R-BINARY-BYTES-v1` (19) | [`slice_harness::Wavelength::Binary`] |
//! | 14 | `R-HEX-v1` (20) | [`slice_harness::Wavelength::Hex`], [`slice_harness::hex`] / [`slice_harness::unhex`] |
//! | 17 | `R-BEHCS64-v1` (23) | [`dbbh::Level::Behcs64`], [`slice_harness::Wavelength::Behcs64`], [`qprism_dbbh_ladder`] width 6 |
//! | 18 | `R-BEHCS256-v1` (24) | [`dbbh::Level::Behcs256`], [`slice_harness::Wavelength::Behcs256`], [`qprism_dbbh_ladder`] width 8 |
//! | 19 | `R-BEHCS1024-v1` (25) | [`qprism_transcode`], [`dbbh::Level::Behcs1024`], [`slice_harness::Wavelength::Behcs1024`], [`qprism_dbbh_ladder`] width 10 |
//! | 20 | `R-HYPERBEHCS60D-v1` (26) | [`dbbh::to_hyperbehcs`] / [`dbbh::from_hyperbehcs`], [`slice_harness::Wavelength::HyperBehcs`]; selectors [`dbbh::QPrismCube`], [`slice_harness::project_60d`], [`fed60d::project_60d`]; Q-PRISM frame [`qprism_dbbh_ladder::HyperBehcsFrame`] with [`qprism_dbbh_ladder::Pid60D`] |
//!
//! Slots 15 (`R-HBP-v1`) and 16 (`R-HBI-v1`) are carried by aether `hbp/`.

/// `qprism-3d-slice-harness` @ 2f48332, vendored crate (`vendor/qprism-3d-slice-harness`).
pub use qprism_3d_slice_harness as slice_harness;

/// `dbbh-coms-quant-prism` @ 3038680, vendored crate (`vendor/dbbh-coms-quant-prism`).
pub use dbbh_coms_quant_prism as dbbh;

/// aether `kernel/behcs1024-60d`: Federation-1024's `project_60d` and Host8, reused as is.
pub use behcs1024_60d as fed60d;

/// Q-PRISM `host8/qprism_cube_host8.rs` lines 101-128 @ b4a21a2 (file unchanged since 53023b6,
/// the commit that added these lines), byte-identical: `transcode_256_to_1024` and
/// `transcode_1024_to_256`.
pub mod qprism_transcode {
    include!("../vendor/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control/host8/qprism_cube_host8.rs.lines-101-128");
}

/// Q-PRISM `host8/dbbh_coms_quant_prism.rs` lines 16-514 @ b4a21a2, byte-identical: `SymbolFrame`
/// with `pack_symbols` / `unpack_symbols`, `sha256`, `ContentStore`, `Pid60D`, `HyperBehcsFrame`,
/// `DoubleBinaryCapsule`, `DbbhPacket`, `prepare_packet`, `audit_replay_row`.
pub mod qprism_dbbh_ladder {
    include!("../vendor/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control/host8/dbbh_coms_quant_prism.rs.lines-16-514");

    /// Upstream `pack_symbols`, as upstream `SymbolFrame::encode` calls it (line 77).
    pub fn pack(bytes: &[u8], nbits: u8) -> Vec<u16> {
        pack_symbols(bytes, nbits)
    }

    /// Upstream `unpack_symbols`, as upstream `SymbolFrame::decode` calls it (line 82).
    pub fn unpack(symbols: &[u16], nbits: u8, nbytes: usize) -> Vec<u8> {
        unpack_symbols(symbols, nbits, nbytes)
    }
}
