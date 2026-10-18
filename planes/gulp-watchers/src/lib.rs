//! The batch gulp/gc lanes and the GNN watchers of the Asolaria pipeline, ported from their upstream
//! JavaScript/TypeScript to an in-process integer Rust library that emits HBP text: no JSON, HTTP or Node.
//!
//! | Module | Upstream |
//! |---|---|
//! | [`cadence`] | asolaria-behcs-256@818cc23 packages/cycle-orchestrator/src/gnn-feedback-cadence-adjuster.mjs:26-94 |
//! | [`gc`] | asolaria-behcs-256@818cc23 packages/omni-gulp-gc/src/gc.ts:96, :102-166 |
//! | [`gulp`] | asolaria-behcs-256@818cc23 packages/omni-gulp-gc/src/gulp.ts:91-142 |
//! | [`tier3`] | asolaria-behcs-256@818cc23 packages/super-gulp-tier3-consumer/src/promoter.mjs:12-57, consumer.mjs:13-85 |
//! | [`construction_routing`] | asolaria-behcs-256@818cc23 packages-legacy-import/src/gnnConstructionWatcher.js:49-140 |
//! | [`shannon_lens`] | asolaria-behcs-256@818cc23 tools/cube/omni-shannon-v3-4d12.js:59-134, :203-214 |
//! | [`cosign`] | bigpickle-rebuild@c592599 src/cosign-bridge.mjs:153-189 (durableNotify row/decision) |
//! | [`route`] | bigpickle-rebuild@c592599 src/universal-route.mjs:105-178 (dualEmitObservation rows) |
//!
//! The per-request transports (the super-gulp bus POST, the cosign `/api/cosign/append` POST, the redis
//! publish, the file appends), the two third-party/private inputs (the `omni-shannon` hard-deny list at
//! :69-73 and the `gnn-live-watcher` address map) and the rows not rendered here are recorded in
//! `BOUNDARIES.md`.

#![forbid(unsafe_code)]

pub mod cadence;
pub mod construction_routing;
pub mod cosign;
pub mod gc;
pub mod gulp;
pub mod hbp;
pub mod jstext;
pub mod route;
pub mod shannon_lens;
pub mod tier3;
