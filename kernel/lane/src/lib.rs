//! The kernel boot lane of asolaria-federation-1024 (@ dc1da1a9) as an in-process host simulation.
//!
//! - [`asolaria_kernel_core`] (`core/`): the upstream `kernel/core` modules the lane reaches,
//!   byte-identical. Its modules are re-exported here, so upstream `crate::hookwall::...` paths
//!   resolve in this crate too.
//! - [`init`]: upstream `kernel/boot/src/init.rs`, byte-identical on disk, compiled after
//!   `build.rs` turns its 24 leading `//!` lines into `//`.
//! - [`lane`]: the kernel-lane `HookContext` (init's `hook_context` table, `caller_pid` 0, Micro,
//!   Public) and the 16-byte verdict row `sys_hookwall_post` hands to the cosign chain.
//! - [`boot`]: the rows `kernel/boot` writes to COM1 after PCI discovery (`BOOTPID`, `BOOTTIME`,
//!   `BOOTPROJ`, `BOOTDRIVER`), from the discovered device-functions and the clock reading.
//! - [`sim`]: the boot lane run in process (console `exchange` path and headless `run` loop).
//! - [`host8kernel`]: the `HOST8KERNEL` row parse asolaria-asi-os runs on host8 `/health.hbp`.

#![forbid(unsafe_code)]

pub use asolaria_kernel_core;
pub use asolaria_kernel_core::{
    bus_fabric, cosign_chain, crypto, envelope, gnn, hookwall, sign_gate, syscall, tier,
};
pub use asolaria_kernel_core::{FEDERATION_ANCHOR_PID, KERNEL_VERSION};

pub mod boot;
pub mod host8kernel;
pub mod init;
pub mod lane;
pub mod sim;
