//! Upstream `kernel/boot/src/init.rs` (asolaria-federation-1024 @ dc1da1a9, blob `d349b930`),
//! compiled from the byte-identical copy in `vendor/` (see `build.rs`). Upstream's public API is
//! unchanged: [`run`], [`drain`], [`exchange`]. The crate-visible wrappers at the end reach the
//! private functions `run()` and the console path call, so [`crate::sim`] can drive them one step
//! at a time instead of through the diverging `run()`.

include!(concat!(env!("OUT_DIR"), "/init.rs"));

/// `hook_context` (init.rs:153-163): the `[slot, syscall_no]` bytes init passes to
/// `sys_hookwall_pre` and `sys_hookwall_post` when it dispatches an envelope of this type.
pub fn hook_bytes(type_prefix: &[u8; 4]) -> [u8; 2] {
    hook_context(type_prefix)
}

/// `INIT_ENVELOPE_MAX` (init.rs:36): the receive buffer `run()` uses.
pub(crate) const RUN_RECV_BYTES: usize = INIT_ENVELOPE_MAX;
/// `RECV_WAIT_NS` (init.rs:44): the wait `run()` passes to `sys_envelope_recv`.
pub(crate) const RUN_RECV_WAIT_NS: u64 = RECV_WAIT_NS;
/// `RECV_FAILURE_THRESHOLD` (init.rs:40).
pub(crate) const RUN_RECV_FAILURE_THRESHOLD: u32 = RECV_FAILURE_THRESHOLD;

/// `emit_init_ready` (init.rs:187-199).
pub(crate) fn upstream_emit_init_ready(pid: u64) {
    emit_init_ready(pid)
}

/// `dispatch_envelope` (init.rs:93-147).
pub(crate) fn upstream_dispatch_envelope(type_prefix: &[u8; 4], full_env: &[u8], seq: &mut u64) {
    dispatch_envelope(type_prefix, full_env, seq)
}

/// `emit_envelope` (init.rs:201-216).
pub(crate) fn upstream_emit_envelope(type_prefix: &[u8; 4], seq: &mut u64, payload: &[u8]) {
    emit_envelope(type_prefix, seq, payload)
}
