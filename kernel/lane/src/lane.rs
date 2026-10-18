//! Kernel-lane hookwall inputs (OWNER-RULES 7d, kernel lane).
//!
//! init's `hook_context` table (init.rs:149-163) gives `[slot, syscall_no]`: `[2, 3]` for an `EXEC`
//! envelope, `[9, 10]` for every other type. `sys_hookwall_pre` and `sys_hookwall_post`
//! (syscall/mod.rs:284-316) read those two bytes and fill in the rest of the `HookContext`:
//! `caller_pid: 0`, `tier: HookTier::Micro`, `target_tier: AccessTier::Public`
//! (syscall/mod.rs:288-294 and 308-314). The Host8 lane derives these inputs differently
//! (host8-serve main.rs:1221-1236); that lane is in `host8/`.

use crate::hookwall::{compose_verdict_row, HookContext, HookTier};
use crate::init::hook_bytes;
use crate::syscall::{sys_hookwall_pre, AccessTier, HookwallVerdict};

/// The `HookContext` `sys_hookwall_pre` / `sys_hookwall_post` build from `env[0]` and `env[1]`
/// (syscall/mod.rs:288-294, 308-314).
pub fn kernel_lane_context(env: &[u8; 2]) -> HookContext {
    HookContext {
        slot: env[0],
        syscall_no: env[1],
        caller_pid: 0,
        tier: HookTier::Micro,
        target_tier: AccessTier::Public,
    }
}

/// [`kernel_lane_context`] for the hook bytes init uses for an envelope of this type.
pub fn kernel_lane_context_for(type_prefix: &[u8; 4]) -> HookContext {
    kernel_lane_context(&hook_bytes(type_prefix))
}

/// The verdict `dispatch_envelope` acts on (init.rs:102-106): `sys_hookwall_pre(&hook)`, with an
/// error read as `Block`. `sys_hookwall_pre` has no side effects (hookwall/mod.rs:59-68).
/// `dispatch_envelope` passes the same verdict to `sys_hookwall_post`: `Block` (init.rs:110),
/// `Hold` (:116), `Proceed` (:130, :146).
pub fn dispatch_verdict(hook: &[u8; 2]) -> HookwallVerdict {
    match sys_hookwall_pre(hook) {
        Ok(v) => v,
        Err(_) => HookwallVerdict::Block,
    }
}

/// The 16-byte `HVD` row `sys_hookwall_post(hook, verdict)` composes and passes to
/// `cosign_chain::append` (syscall/mod.rs:304-316, hookwall/mod.rs:81-133).
pub fn verdict_row(hook: &[u8; 2], verdict: HookwallVerdict) -> [u8; 16] {
    compose_verdict_row(&kernel_lane_context(hook), verdict)
}
