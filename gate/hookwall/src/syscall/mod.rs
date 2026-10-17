//! Syscall surface · Phase-2 Step 25
//!
//! CANONICAL 16-SYSCALL SURFACE — additions require tier-2 cosign per REPO_LAW Invariant 9.
//!
//! All syscalls return `Result<T, SyscallErr>`. Stub bodies return `Err(SyscallErr::Unimplemented)`
//! until phase-3+ wires real handlers.

use core::result::Result;

/// Canonical syscall error type. Envelopes serialize errors via `payload.err` per IX-700.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum SyscallErr {
    /// Stub not yet implemented.
    Unimplemented,
    /// Invalid file descriptor or PID handle.
    Invalid,
    /// Operation would block; retry or use timeout variant.
    WouldBlock,
    /// Permission denied per tier-aware access policy (REPO_LAW Invariant 5).
    PermissionDenied,
    /// Hookwall blocked the operation (REPO_LAW Invariant 2).
    HookwallBlock,
    /// Resource exhausted (memory, file handles, envelope queue).
    Exhausted,
    /// Cosign-chain rejected the row.
    CosignReject,
}

/// File-descriptor or PID handle (BEHCS-1024 60-tuple).
pub type Handle = u64;

/// Monotonic nanoseconds since boot.
pub type NanoTime = u64;

/// Verdict emitted by hookwall pre/post hooks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HookwallVerdict {
    Proceed,
    Hold,
    Block,
}

/// Seven tier-classes per REPO_LAW Invariant 5 + dashboard constitutional directive.
///
/// Cycle-72 extension: liris dashboard Drive Registry showed `SOVEREIGNTY` as a
/// 7th tier above `Secret` — "operator-physical-only / NEVER agent-driven".
///
/// **Per-vantage instance asymmetry (operator clarification cycle-72):**
/// The `Sovereignty` tier-CLASS is universal across all federation vantages, but
/// the drive INSTANCES are vantage-specific. Liris's sovereignty drives
/// (USB-SOVLINUX-2TB, D-DRIVE-LIRIS) physically live on liris hardware. Acer has
/// different sovereignty instances. **Cross-vantage access requires physical
/// transport (air-gap, human-mediated rehydration)** — this is the operator's
/// stated "one of the key problems" of the federation architecture.
///
/// The tier semantics (no quintuple-cosign override; no agent access; physical
/// boundary) are canon federation-wide; the per-vantage drive-list mapping is
/// dashboard-rendered context, not kernel canon.
///
/// Ordering (lowest → highest):
///   Public < Restricted < Stealth < Hidden < Shadow < Secret < Sovereignty
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AccessTier {
    Public,
    Restricted,
    Stealth,
    Hidden,
    Shadow,
    Secret,
    /// Operator-physical-only · NEVER agent-driven. No quintuple-cosign override.
    /// Per-vantage instance: liris has USB-SOVLINUX-2TB + D-DRIVE-LIRIS; acer's
    /// sovereignty drives are different (cross-vantage = physical transport).
    Sovereignty,
}
