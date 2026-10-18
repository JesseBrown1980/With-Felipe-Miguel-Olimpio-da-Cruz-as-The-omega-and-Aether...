//! The kernel boot lane after hardware discovery, run in process on the vendored upstream code.
//!
//! Two upstream paths drive init's envelope dispatch:
//! - **Console path** (what the UEFI boot runs): `efi_main` hands off to `console::run`
//!   (main.rs:398), which drains the bus (console.rs:570) and sends each `ping` / `vers` / `pid`
//!   command through `init::exchange` with a sequence counter that starts at 1
//!   (console.rs:305-355, 544). [`BootLane::exchange`] calls the same `init::exchange`.
//! - **Headless loop**: `init::run()` (init.rs:60-91), which `efi_main` no longer calls; init.rs:55-58
//!   keeps it "for a future bus-fed (agent-runtime) boot". [`BootLane::init_ready`] runs its first
//!   line pair (`emit_init_ready(sys_pid_current().unwrap_or(0))`, init.rs:61-62) and
//!   [`BootLane::run_step`] runs one turn of its loop (init.rs:69-89).
//!
//! The rows `kernel/boot` writes before the console starts are in [`crate::boot`].
//!
//! Upstream keeps the bus slot, the cosign counter and the exec-handle counter in process-global
//! statics (envelope/mod.rs:134-138, cosign_chain/mod.rs:198, syscall/mod.rs:130), so a
//! [`BootLane`] holds a process-wide lock for its lifetime and drains the bus when it starts.
//!
//! A [`BootLane`] appends no row of its own to the cosign chain: the counter advances only by the
//! appends the upstream code makes. `cosign_chain::append` keeps no row and has no counter getter
//! (cosign_chain/mod.rs:198-220), so the tests count a step's appends with a probe row of their
//! own before and after it (`tests/common/mod.rs`). The 16-byte row each step hands to
//! `cosign_chain::append` is composed with [`crate::lane::verdict_row`], the same
//! `compose_verdict_row` call over the same context `sys_hookwall_post` builds.

use std::sync::{Mutex, MutexGuard};

use crate::envelope::ENVELOPE_SLOT_BYTES;
use crate::init::{self, hook_bytes};
use crate::lane::{dispatch_verdict, verdict_row};
use crate::syscall::{
    sys_cosign_append, sys_envelope_recv, sys_hookwall_post, sys_pid_current, HookwallVerdict,
    SyscallErr,
};

static LANE: Mutex<()> = Mutex::new(());

/// One init dispatch (or `emit_init_ready`) as the kernel ran it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Step {
    /// The envelope init dispatched: received from the bus (`run` loop), or the request
    /// `exchange` built (init.rs:239-241). `None` for `emit_init_ready`, which only sends.
    pub received: Option<Vec<u8>>,
    /// `[slot, syscall_no]` from init's `hook_context` (init.rs:156-163).
    pub hook: [u8; 2],
    /// The 16-byte row `sys_hookwall_post` passed to `cosign_chain::append`; `None` when the step
    /// did not reach `sys_hookwall_post`.
    pub verdict_row: Option<[u8; 16]>,
}

/// One turn of `run()`'s loop (init.rs:69-89).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RunStep {
    /// `Ok(n)` with `n >= 4`: dispatched (init.rs:70-74).
    Dispatched(Step),
    /// A `SHTD` envelope: init.rs:127-132 ran (`FINI` reply, `sys_hookwall_post`,
    /// `sys_cosign_append(b"init-shutdown")`, whose result is kept here). Upstream then calls
    /// `sys_exit(0)` (init.rs:133), which never returns (syscall/mod.rs:155-160); the simulation
    /// stops there instead.
    Shutdown {
        step: Step,
        cosign_append: Result<u64, SyscallErr>,
    },
    /// `Ok(n)` with `n < 4`: ignored (init.rs:75-77).
    Malformed(usize),
    /// `Err(WouldBlock)`: the wait expired on an empty bus (init.rs:78-80).
    WouldBlock,
    /// Any other receive error, counted towards `RECV_FAILURE_THRESHOLD` (init.rs:81-82).
    RecvFailed { consecutive: u32, err: SyscallErr },
    /// The 32nd consecutive failure: init.rs:83-86 ran `emit_envelope(b"SOS!", ..)`; upstream then
    /// calls `sys_exit(2)`, where the simulation stops.
    Exhausted,
}

/// One `init::exchange` round trip (the console's `envelope` helper, console.rs:305-308).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExchangeStep {
    pub step: Step,
    /// `init::exchange`'s result: the reply init put on the bus, or upstream's error bytes.
    pub reply: Result<Vec<u8>, &'static [u8]>,
}

/// `exchange` with a `SHTD` envelope is not run: upstream's dispatch of it ends in `sys_exit(0)`,
/// which never returns (init.rs:127-133, syscall/mod.rs:155-160). [`BootLane::run_step`] runs the
/// shutdown arm up to that call.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ExitsKernel;

/// The boot lane in process. Holds the process-wide simulation lock while alive.
pub struct BootLane {
    _lock: MutexGuard<'static, ()>,
    consecutive_failures: u32,
}

impl BootLane {
    /// Takes the lock and empties the bus with upstream `init::drain` (as console.rs:570 does).
    pub fn new() -> Self {
        let lock = LANE.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        init::drain();
        BootLane {
            _lock: lock,
            consecutive_failures: 0,
        }
    }

    /// init.rs:61-62: `emit_init_ready(sys_pid_current().unwrap_or(0))`. Returns the pid and the
    /// step; the `INIT` envelope stays on the bus for the next [`BootLane::run_step`].
    pub fn init_ready(&mut self) -> (u64, Step) {
        let pid = sys_pid_current().unwrap_or(0);
        let hook = hook_bytes(b"INIT");
        init::upstream_emit_init_ready(pid);
        let step = Step {
            received: None,
            hook,
            // emit_init_ready ignores the pre verdict and posts Proceed (init.rs:196-198).
            verdict_row: Some(verdict_row(&hook, HookwallVerdict::Proceed)),
        };
        (pid, step)
    }

    /// One turn of `run()`'s loop (init.rs:69-89) with `run()`'s own receive buffer size and wait.
    pub fn run_step(&mut self, seq: &mut u64) -> RunStep {
        let mut recv_buf = [0u8; init::RUN_RECV_BYTES];
        match sys_envelope_recv(&mut recv_buf, init::RUN_RECV_WAIT_NS) {
            Ok(n) if n >= 4 => {
                self.consecutive_failures = 0;
                let type_prefix = [recv_buf[0], recv_buf[1], recv_buf[2], recv_buf[3]];
                if &type_prefix == b"SHTD" {
                    return self.shutdown(&recv_buf[..n], seq);
                }
                let hook = hook_bytes(&type_prefix);
                let verdict = dispatch_verdict(&hook);
                init::upstream_dispatch_envelope(&type_prefix, &recv_buf[..n], seq);
                RunStep::Dispatched(Step {
                    received: Some(recv_buf[..n].to_vec()),
                    hook,
                    verdict_row: Some(verdict_row(&hook, verdict)),
                })
            }
            Ok(n) => RunStep::Malformed(n),
            Err(SyscallErr::WouldBlock) => RunStep::WouldBlock,
            Err(err) => {
                self.consecutive_failures = self.consecutive_failures.saturating_add(1);
                if self.consecutive_failures >= init::RUN_RECV_FAILURE_THRESHOLD {
                    init::upstream_emit_envelope(b"SOS!", seq, b"init-recv-exhausted");
                    return RunStep::Exhausted;
                }
                RunStep::RecvFailed {
                    consecutive: self.consecutive_failures,
                    err,
                }
            }
        }
    }

    /// `dispatch_envelope` for `SHTD` up to `sys_exit(0)`: init.rs:102-118 (hook, pre verdict,
    /// `BLOK` / `HOLD` arms) and init.rs:127-132 (the `SHTD` arm before line 133).
    fn shutdown(&mut self, received: &[u8], seq: &mut u64) -> RunStep {
        let type_prefix = *b"SHTD";
        let hook = hook_bytes(&type_prefix);
        let verdict = dispatch_verdict(&hook);
        let mut cosign_append = None;
        if verdict == HookwallVerdict::Block {
            init::upstream_emit_envelope(b"BLOK", seq, &type_prefix);
            let _ = sys_hookwall_post(&hook, HookwallVerdict::Block);
        } else if verdict == HookwallVerdict::Hold {
            init::upstream_emit_envelope(b"HOLD", seq, &type_prefix);
            let _ = sys_hookwall_post(&hook, HookwallVerdict::Hold);
        } else {
            init::upstream_emit_envelope(b"FINI", seq, b"init-shutdown");
            let _ = sys_hookwall_post(&hook, HookwallVerdict::Proceed);
            cosign_append = Some(sys_cosign_append(b"init-shutdown"));
        }
        let step = Step {
            received: Some(received.to_vec()),
            hook,
            verdict_row: Some(verdict_row(&hook, verdict)),
        };
        match cosign_append {
            Some(cosign_append) => RunStep::Shutdown {
                step,
                cosign_append,
            },
            None => RunStep::Dispatched(step),
        }
    }

    /// `init::exchange(ty, seq, reply)` with a slot-sized reply buffer, as console.rs:305-308.
    /// The console sends `PING`, `VERS` and `PIDA` through it (console.rs:344-355); any other
    /// type runs the same upstream `init::exchange`.
    pub fn exchange(&mut self, ty: &[u8; 4], seq: &mut u64) -> Result<ExchangeStep, ExitsKernel> {
        if ty == b"SHTD" {
            return Err(ExitsKernel);
        }
        let mut request = [0u8; 32];
        request[0..4].copy_from_slice(ty);
        request[4..12].copy_from_slice(&seq.to_le_bytes());
        let hook = hook_bytes(ty);
        let verdict = dispatch_verdict(&hook);
        let mut reply = [0u8; ENVELOPE_SLOT_BYTES];
        let result = init::exchange(ty, seq, &mut reply);
        // init.rs:243-252 return before `dispatch_envelope` with these three errors.
        let dispatched = !matches!(
            result,
            Err(e) if e == b"send-rejected" || e == b"request-lost" || e == b"malformed"
        );
        Ok(ExchangeStep {
            step: Step {
                received: Some(request.to_vec()),
                hook,
                verdict_row: dispatched.then(|| verdict_row(&hook, verdict)),
            },
            reply: result.map(|n| reply[..n].to_vec()),
        })
    }
}

impl Default for BootLane {
    fn default() -> Self {
        Self::new()
    }
}
