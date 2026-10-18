//! The kernel lane run on the vendored upstream code: init REPL, hook_context table, caller_pid 0,
//! sys_hookwall_pre/post and the cosign counter.

mod common;

use asolaria_kernel_lane::hookwall::HookTier;
use asolaria_kernel_lane::init::hook_bytes;
use asolaria_kernel_lane::lane::{dispatch_verdict, kernel_lane_context_for, verdict_row};
use asolaria_kernel_lane::sim::{BootLane, ExitsKernel, RunStep, Step};
use asolaria_kernel_lane::syscall::{
    sys_envelope_recv, sys_envelope_send, sys_gnn_infer, sys_hookwall_post, sys_hookwall_pre,
    sys_pid_current, AccessTier, HookwallVerdict, SyscallErr, CANONICAL_SYSCALLS,
};
use asolaria_kernel_lane::{cosign_chain, FEDERATION_ANCHOR_PID, KERNEL_VERSION};
use common::counting_appends;

const PID: u64 = 0xe00b_1a46_5d6d_cb50;

fn dispatched(r: RunStep) -> Step {
    match r {
        RunStep::Dispatched(step) => step,
        other => panic!("expected a dispatch, got {other:?}"),
    }
}

fn envelope(ty: &[u8; 4], seq: u64, payload: &[u8]) -> Vec<u8> {
    let mut e = Vec::new();
    e.extend_from_slice(ty);
    e.extend_from_slice(&seq.to_le_bytes());
    e.extend_from_slice(payload);
    e.resize(e.len().max(32), 0);
    e
}

#[test]
fn sys_pid_current_is_the_anchor_fingerprint() {
    assert_eq!(sys_pid_current(), Ok(PID));
}

#[test]
fn init_envelope_carries_sys_pid_current_little_endian_at_bytes_12_to_20() {
    let mut lane = BootLane::new();
    let ((pid, step), appends) = counting_appends(|| lane.init_ready());
    assert_eq!(pid, PID);
    assert_eq!(step.hook, [9, 10]);
    assert_eq!(appends, 1);
    let mut seq = 1;
    let got = dispatched(lane.run_step(&mut seq));
    let env = got.received.unwrap();
    assert_eq!(env.len(), 32);
    assert_eq!(&env[0..4], b"INIT");
    assert_eq!(&env[4..12], &0u64.to_le_bytes());
    assert_eq!(&env[12..20], &PID.to_le_bytes());
    assert_eq!(
        &env[12..20],
        &[0x50, 0xcb, 0x6d, 0x5d, 0x46, 0x1a, 0x0b, 0xe0]
    );
    assert!(env[20..].iter().all(|b| *b == 0));
}

#[test]
fn hook_context_table_gives_exec_2_3_and_every_other_type_9_10() {
    assert_eq!(hook_bytes(b"EXEC"), [2, 3]);
    for ty in [
        b"INIT", b"PING", b"VERS", b"PIDA", b"SHTD", b"UNKN", b"PONG", b"zzzz",
    ] {
        assert_eq!(hook_bytes(ty), [9, 10], "{ty:?}");
    }
    for ty in [b"EXEC", b"PING"] {
        let ctx = kernel_lane_context_for(ty);
        assert_eq!(ctx.slot, ctx.syscall_no - 1);
        assert_eq!(ctx.caller_pid, 0);
        assert_eq!(ctx.tier, HookTier::Micro);
        assert_eq!(ctx.target_tier, AccessTier::Public);
    }
}

#[test]
fn table_syscall_numbers_name_exec_and_envelope_send() {
    // init.rs:149-151: syscalls are numbered from 1 in CANONICAL_SYSCALLS order (syscall/mod.rs:378-395).
    assert_eq!(CANONICAL_SYSCALLS.len(), 16);
    assert_eq!(
        CANONICAL_SYSCALLS[usize::from(hook_bytes(b"EXEC")[1]) - 1],
        "exec"
    );
    assert_eq!(
        CANONICAL_SYSCALLS[usize::from(hook_bytes(b"PING")[1]) - 1],
        "envelope_send"
    );
}

#[test]
fn hookwall_pre_appends_nothing_and_post_appends_one_row() {
    let _lane = BootLane::new();
    let probe = || cosign_chain::append(b"probe").unwrap();
    let a = probe();
    assert_eq!(sys_hookwall_pre(&[9, 10]), Ok(HookwallVerdict::Proceed));
    let b = probe();
    assert_eq!(b - a - 1, 0);
    assert_eq!(
        sys_hookwall_post(&[9, 10], HookwallVerdict::Proceed),
        Ok(())
    );
    let c = probe();
    assert_eq!(c - b - 1, 1);
    assert_eq!(
        sys_hookwall_post(&[64, 65], HookwallVerdict::Proceed),
        Err(SyscallErr::Invalid)
    );
    assert_eq!(probe() - c - 1, 0);
}

#[test]
fn kernel_lane_verdict_is_proceed_for_both_table_rows() {
    assert_eq!(dispatch_verdict(&[2, 3]), HookwallVerdict::Proceed);
    assert_eq!(dispatch_verdict(&[9, 10]), HookwallVerdict::Proceed);
    // sys_hookwall_pre rejects slot >= 64; dispatch_envelope reads the error as Block.
    assert_eq!(dispatch_verdict(&[64, 65]), HookwallVerdict::Block);
}

#[test]
fn verdict_row_is_slot_syscall_micro_verdict_pid0_public_hvd() {
    let row = verdict_row(&[9, 10], HookwallVerdict::Proceed);
    assert_eq!(
        row,
        [9, 10, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, b'H', b'V', b'D']
    );
    assert_eq!(
        verdict_row(&[2, 3], HookwallVerdict::Hold)[..4],
        [2, 3, 1, 2]
    );
    assert_eq!(verdict_row(&[2, 3], HookwallVerdict::Block)[3], 3);
}

#[test]
fn console_exchanges_reply_and_append_one_verdict_row_each() {
    let mut lane = BootLane::new();
    let mut seq = 1u64;
    let (ping, ping_appends) = counting_appends(|| lane.exchange(b"PING", &mut seq).unwrap());
    assert_eq!(ping.reply.unwrap(), envelope(b"PONG", 2, b""));
    assert_eq!(seq, 3);
    let (vers, vers_appends) = counting_appends(|| lane.exchange(b"VERS", &mut seq).unwrap());
    let vers_reply = vers.reply.unwrap();
    assert_eq!(vers_reply, envelope(b"VERS", 4, KERNEL_VERSION.as_bytes()));
    assert_eq!(vers_reply.len(), 33);
    let (pida, pida_appends) = counting_appends(|| lane.exchange(b"PIDA", &mut seq).unwrap());
    let pida_reply = pida.reply.unwrap();
    assert_eq!(
        pida_reply,
        envelope(b"PIDA", 6, FEDERATION_ANCHOR_PID.as_bytes())
    );
    assert_eq!(pida_reply.len(), 12 + 46);
    assert_eq!([ping_appends, vers_appends, pida_appends], [1, 1, 1]);
    for x in [&ping.step, &vers.step, &pida.step] {
        assert_eq!(
            x.verdict_row,
            Some(verdict_row(&[9, 10], HookwallVerdict::Proceed))
        );
    }
}

#[test]
fn exchange_exec_reaches_sys_exec_with_a_20_byte_payload_and_gets_invalid() {
    let mut lane = BootLane::new();
    let mut seq = 7u64;
    let (x, appends) = counting_appends(|| lane.exchange(b"EXEC", &mut seq).unwrap());
    assert_eq!(x.step.hook, [2, 3]);
    assert_eq!(appends, 1);
    assert_eq!(x.reply.unwrap(), envelope(b"EERR", 8, b"invalid"));
}

#[test]
fn exchange_does_not_run_shtd() {
    let mut lane = BootLane::new();
    let mut seq = 1u64;
    assert_eq!(lane.exchange(b"SHTD", &mut seq), Err(ExitsKernel));
    assert_eq!(seq, 1);
}

#[test]
fn headless_loop_receives_its_own_replies_and_keeps_the_slot_occupied() {
    let mut lane = BootLane::new();
    lane.init_ready();
    let mut seq = 1u64;
    let a = dispatched(lane.run_step(&mut seq)).received.unwrap();
    let b = dispatched(lane.run_step(&mut seq)).received.unwrap();
    let c = dispatched(lane.run_step(&mut seq)).received.unwrap();
    assert_eq!(&a[..4], b"INIT");
    assert_eq!(b, envelope(b"UNKN", 1, b"INIT"));
    assert_eq!(c, envelope(b"UNKN", 2, b"UNKN"));
    // init's latest reply holds the single slot, so another producer's send is refused.
    assert_eq!(
        sys_envelope_send(&envelope(b"PING", 0, b""), 0),
        Err(SyscallErr::Exhausted)
    );
}

#[test]
fn empty_bus_turn_is_would_block() {
    let mut lane = BootLane::new();
    let mut seq = 1u64;
    assert_eq!(lane.run_step(&mut seq), RunStep::WouldBlock);
    assert_eq!(seq, 1);
}

#[test]
fn exec_payload_becomes_the_next_envelope_and_the_eokx_reply_is_dropped() {
    let mut lane = BootLane::new();
    let mut seq = 1u64;
    let inner = envelope(b"PING", 7, b"");
    let mut outer = envelope(b"EXEC", 0, b"");
    outer.truncate(12);
    outer.extend_from_slice(&inner);
    sys_envelope_send(&outer, 0).unwrap();
    let exec = dispatched(lane.run_step(&mut seq));
    assert_eq!(exec.hook, [2, 3]);
    assert_eq!(
        seq, 2,
        "emit_envelope advances seq even when the send is refused"
    );
    let next = dispatched(lane.run_step(&mut seq));
    assert_eq!(next.received.unwrap(), inner);
    let mut buf = [0u8; 1024];
    let n = sys_envelope_recv(&mut buf, 0).unwrap();
    assert_eq!(&buf[..n], envelope(b"PONG", 2, b"").as_slice());
}

#[test]
fn shutdown_arm_runs_up_to_sys_exit_and_its_cosign_row_is_below_the_floor() {
    let mut lane = BootLane::new();
    let mut seq = 1u64;
    sys_envelope_send(&envelope(b"SHTD", 0, b""), 0).unwrap();
    match counting_appends(|| lane.run_step(&mut seq)) {
        (RunStep::Shutdown { cosign_append, .. }, appends) => {
            // b"init-shutdown" is 13 bytes; sys_cosign_append needs 16 (syscall/mod.rs:329-332).
            assert_eq!(cosign_append, Err(SyscallErr::Invalid));
            assert_eq!(appends, 1, "only sys_hookwall_post appended");
        }
        other => panic!("expected the shutdown arm, got {other:?}"),
    }
    let mut buf = [0u8; 1024];
    let n = sys_envelope_recv(&mut buf, 0).unwrap();
    assert_eq!(&buf[..n], envelope(b"FINI", 1, b"init-shutdown").as_slice());
}

#[test]
fn oversize_envelope_exhausts_the_loop_and_sos_does_not_reach_the_bus() {
    let mut lane = BootLane::new();
    let mut seq = 1u64;
    let big = envelope(b"BIGx", 0, &[0u8; 588]);
    assert_eq!(big.len(), 600);
    sys_envelope_send(&big, 0).unwrap();
    for i in 1..32u32 {
        assert_eq!(
            lane.run_step(&mut seq),
            RunStep::RecvFailed {
                consecutive: i,
                err: SyscallErr::Invalid
            }
        );
    }
    assert_eq!(lane.run_step(&mut seq), RunStep::Exhausted);
    let mut buf = [0u8; 1024];
    let n = sys_envelope_recv(&mut buf, 0).unwrap();
    assert_eq!(
        &buf[..n],
        big.as_slice(),
        "SOS! was refused: the slot still holds the envelope"
    );
}

#[test]
fn sys_gnn_infer_answers_local_for_any_input() {
    for input in [&b""[..], b"x", &[0xffu8; 300]] {
        let mut out = [0xAAu8; 2];
        assert_eq!(sys_gnn_infer(input, &mut out), Ok(1));
        assert_eq!(out, [0, 0xAA]);
    }
}
