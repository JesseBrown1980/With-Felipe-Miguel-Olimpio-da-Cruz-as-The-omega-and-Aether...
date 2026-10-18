//! Kernel-lane subset of `asolaria-kernel-core` (asolaria-federation-1024 @ dc1da1a9, `kernel/core`).
//!
//! Every module file under `src/` is the upstream file, byte-identical (`../UPSTREAM.sha256`,
//! `../PROVENANCE.md`). This `lib.rs` is glue: it declares the modules the kernel boot lane reaches
//! (`syscall` and every module a syscall body calls, plus `bus_fabric` and `sign_gate`) in rustfmt
//! (alphabetical) order, and carries upstream `lib.rs` lines 14-35 and 72-105 verbatim between the
//! markers.
//! Upstream modules not declared here: `atlas`, `bus_and_kick`, `cycle_orch`, `glyph_genesis`,
//! `highway`, `level_tag`, `link_auth`, `pid`, `spawn_gate`, `tier_gate`, `transit`.

// upstream-lines federation-1024@dc1da1a9 kernel/core/src/lib.rs:14-35
#![no_std]
#![forbid(unsafe_code)]
// syscall + envelope dispatch + PID minter must be unsafe-free at API layer
// Phase-3 scaffold: many fields/variants are intentionally undocumented in v0.1; docs
// land incrementally in v0.2+. Relaxing these lints from `deny` to `allow` lets the CI
// `cargo clippy -- -D warnings` gate stay strict on correctness while letting in-flight
// scaffolding compile. Each `#![allow]` here is a known-debt marker, not a permanent ok.
#![allow(unknown_lints)] // CI runs rustc 1.81; some allows below are 1.95-era lint names
#![allow(missing_docs)]
#![allow(dead_code)]
#![allow(clippy::manual_range_contains)]
#![allow(clippy::manual_contains)]
#![allow(clippy::identity_op)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::doc_lazy_continuation)]
#![allow(clippy::needless_range_loop)]
#![allow(clippy::new_without_default)]
#![allow(clippy::manual_div_ceil)]
#![allow(rustdoc::bare_urls)]
#![allow(rustdoc::broken_intra_doc_links)]

extern crate alloc;
// upstream-lines-end

pub mod agent_runtime;
pub mod bus_fabric;
pub mod cosign_chain;
pub mod crypto;
pub mod envelope;
pub mod frame_alloc;
pub mod gnn;
pub mod hookwall;
pub mod sign_gate;
pub mod syscall;
pub mod tier;
pub mod vfs;

// upstream-lines federation-1024@dc1da1a9 kernel/core/src/lib.rs:72-105
/// Kernel version string. Bumped on tier-2 cosign-approved ABI changes.
pub const KERNEL_VERSION: &str = "0.2.0-phase3-scaffold";

/// Federation anchor PID for any kernel-emitted envelope.
pub const FEDERATION_ANCHOR_PID: &str = "ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11";

/// Test-only: the envelope slot, the frame allocator and the VFS FD table are process-global,
/// so tests that reset or use them must not interleave when the harness runs tests in parallel.
/// A no_std spin lock, taken once per test as its first statement; released on drop, also on
/// panic-unwind. Never take it twice in one test (it is not re-entrant).
#[cfg(test)]
pub(crate) mod test_sync {
    use core::sync::atomic::{AtomicBool, Ordering};

    static LOCK: AtomicBool = AtomicBool::new(false);

    pub(crate) struct Guard;

    impl Drop for Guard {
        fn drop(&mut self) {
            LOCK.store(false, Ordering::Release);
        }
    }

    pub(crate) fn serial() -> Guard {
        while LOCK
            .compare_exchange_weak(false, true, Ordering::Acquire, Ordering::Relaxed)
            .is_err()
        {
            core::hint::spin_loop();
        }
        Guard
    }
}
// upstream-lines-end
