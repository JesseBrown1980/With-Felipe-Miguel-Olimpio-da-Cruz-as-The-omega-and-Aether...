//! The white-room and Shannon-stage planes of the Asolaria pipeline, ported from their upstream
//! JavaScript to an in-process Rust library: integers, SHA-256 and HBP text, no JSON, HTTP or Node.
//! Nothing in the upstream request path calls these planes (WIRING-MAP section d item 11); they
//! are libraries until the integrator wires them.
//!
//! | Module | Upstream |
//! |---|---|
//! | [`whiteroom`] | asolaria-whiteroom-engine@896518a liris-whiteroom-engine.mjs:110-128, 191 |
//! | [`hookwall_plane`] | Shannon-and-the-gnns-stage@32f9670 pipeline/hookwall.mjs:9-87 |
//! | [`shannon_boot`] | Shannon-and-the-gnns-stage@32f9670 pipeline/shannon-boot.mjs:30-170 |
//! | [`whiteroom_consumer`] | Shannon-and-the-gnns-stage@32f9670 pipeline/whiteroom-consumer-index.mjs:14-215 |
//! | [`fabric_thinker`] | bigpickle-rebuild@c592599 src/fabric-thinker-gnn.mjs:27-184, src/fabric-thinker.mjs:75-105 |
//! | [`hybrid_harness`] | asolaria-behcs-256@818cc23 src/gnn/hybrid-harness.js:7-58 |
//!
//! Where upstream sends a graph to the L0 server on port 4792, [`l0_request`] scores it in process
//! with `l0_edge` (model/l0-edge). The L4 server's reply (port 4793) is a caller input. Used from
//! sibling crates, not repeated: the white-room engine, `DeterministicScorer`, `geniusScore`, the
//! seal row and `deriveCubeAddress` (`quant_cubes`, quants/cubes), and `hilbertEncode`
//! (`hrm_mtp`, model/hrm-mtp). The FED gnn-oracle white-room STORE verdict
//! (`whiteroom_verdict`, servers/gnn-oracle/src/lib.rs:402-418) is vendored by host8/.

#![forbid(unsafe_code)]

pub mod fabric_thinker;
pub mod hookwall_plane;
pub mod hybrid_harness;
pub mod jsnum_ext;
pub mod jsvalue;
pub mod l0_request;
pub mod sha;
pub mod shannon_boot;
pub mod whiteroom;
pub mod whiteroom_consumer;
