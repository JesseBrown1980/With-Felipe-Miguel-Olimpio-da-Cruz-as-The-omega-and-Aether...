//! Kernel-lane tamper probes. Each section prints observed values; run with
//! `cargo +1.81.0 run --offline --release`.

use asolaria_kernel_lane::init::hook_bytes;
use asolaria_kernel_lane::lane::{dispatch_verdict, kernel_lane_context_for, verdict_row};
use asolaria_kernel_lane::sim::{BootLane, RunStep};
use asolaria_kernel_lane::syscall::{
    sys_cosign_append, sys_envelope_recv, sys_envelope_send, sys_gnn_infer, sys_hookwall_post,
    sys_hookwall_pre, HookwallVerdict, SyscallErr,
};
use asolaria_kernel_lane::{cosign_chain, crypto as kcrypto, gnn, sign_gate as ksign};
use asolaria_hookwall::{crypto as gcrypto, sign_gate as gsign};
use sha2::{Digest, Sha256};

const COUNTER_PROBE: &[u8] = b"PROBE-KERNEL-LANE-COSIGN-COUNTER";

fn envelope(ty: &[u8; 4], seq: u64, payload: &[u8]) -> Vec<u8> {
    let mut e = Vec::new();
    e.extend_from_slice(ty);
    e.extend_from_slice(&seq.to_le_bytes());
    e.extend_from_slice(payload);
    e.resize(e.len().max(32), 0);
    e
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn appends<T>(f: impl FnOnce() -> T) -> (T, u64) {
    let a = cosign_chain::append(COUNTER_PROBE).unwrap();
    let out = f();
    let b = cosign_chain::append(COUNTER_PROBE).unwrap();
    (out, b - a - 1)
}

fn trim(b: &[u8]) -> String {
    let end = b.iter().rposition(|x| *x != 0).map_or(0, |i| i + 1);
    String::from_utf8_lossy(&b[..end]).into_owned()
}

/// [FABRIC/hookwall_decision] kernel lane always PROCEED.
fn probe_always_proceed() {
    println!("=== P1 [FABRIC/hookwall_decision] kernel lane verdict ===");
    // (a) exhaustive over every 4-byte type prefix: which hook bytes init's table produces.
    let mut exec_rows = 0u64;
    let mut other_rows = 0u64;
    let mut unexpected = 0u64;
    for x in 0u64..=u32::MAX as u64 {
        let ty = (x as u32).to_be_bytes();
        match hook_bytes(&ty) {
            [2, 3] => exec_rows += 1,
            [9, 10] => other_rows += 1,
            _ => unexpected += 1,
        }
    }
    println!(
        "P1a all 2^32 type prefixes: [2,3]={exec_rows} [9,10]={other_rows} other={unexpected}"
    );
    // (b) verdict for the only two rows the table yields, plus the lane context fields.
    for ty in [b"EXEC", b"KILL"] {
        let c = kernel_lane_context_for(ty);
        println!(
            "P1b ty={:?} ctx slot={} syscall_no={} caller_pid={} tier={:?} target_tier={:?} verdict={:?}",
            String::from_utf8_lossy(ty),
            c.slot,
            c.syscall_no,
            c.caller_pid,
            c.tier,
            c.target_tier,
            dispatch_verdict(&hook_bytes(ty))
        );
    }
    // (c) exhaustive over all 65536 [slot, syscall_no] pairs: where BLOCK / HOLD appear at all.
    let (mut p, mut h, mut bl, mut min_block_slot) = (0u32, 0u32, 0u32, 255u8);
    for s in 0..=255u8 {
        for n in 0..=255u8 {
            match dispatch_verdict(&[s, n]) {
                HookwallVerdict::Proceed => p += 1,
                HookwallVerdict::Hold => h += 1,
                HookwallVerdict::Block => {
                    bl += 1;
                    min_block_slot = min_block_slot.min(s)
                }
            }
        }
    }
    println!("P1c all [slot,syscall] pairs: Proceed={p} Hold={h} Block={bl} min_block_slot={min_block_slot}");
    // (d) risky envelopes driven through the real init dispatch (headless run loop).
    let risky: Vec<(&str, Vec<u8>)> = vec![
        ("KILL+HD-virus", envelope(b"KILL", 0, b"HD-virus drift malformed-PID rm -rf /")),
        ("BLOK spoof", envelope(b"BLOK", 0, b"")),
        ("HOLD spoof", envelope(b"HOLD", 0, b"")),
        ("0xff prefix", envelope(&[0xff; 4], 0, &[0xff; 40])),
        ("SOS!", envelope(b"SOS!", 0, b"init-recv-exhausted")),
        ("EXEC sovereignty", {
            let mut e = envelope(b"EXEC", 0, b"");
            e.truncate(12);
            e.extend_from_slice(&envelope(b"SECR", 9, b"Sovereignty USB-SOVLINUX-2TB caller_tier=Sovereignty"));
            e
        }),
    ];
    let mut lane = BootLane::new();
    for (label, env) in risky {
        sys_envelope_send(&env, 0).unwrap();
        let mut seq = 100u64;
        let (r, n) = appends(|| lane.run_step(&mut seq));
        let row = match &r {
            RunStep::Dispatched(s) => s.verdict_row,
            RunStep::Shutdown { step, .. } => step.verdict_row,
            _ => None,
        };
        let mut buf = [0u8; 2048];
        let reply = sys_envelope_recv(&mut buf, 0).map(|k| buf[..k].to_vec());
        let reply_s = match &reply {
            Ok(v) => format!("{}{}", String::from_utf8_lossy(&v[..4]), trim(&v[12..])),
            Err(e) => format!("{e:?}"),
        };
        println!(
            "P1d {label:18} hook={:?} verdict_row={} verdict_byte={} appends={n} reply={reply_s:?}",
            match &r {
                RunStep::Dispatched(s) => s.hook,
                _ => [0, 0],
            },
            row.map(|r| hex(&r)).unwrap_or_default(),
            row.map(|r| r[3]).unwrap_or(0)
        );
        asolaria_kernel_lane::init::drain();
    }
    drop(lane);
    // (e) console exchange path over a spread of types.
    let mut lane = BootLane::new();
    let mut seq = 1u64;
    for ty in [b"PING", b"EXEC", b"KILL", b"\0\0\0\0", b"HD-v"] {
        let x = lane.exchange(ty, &mut seq).unwrap();
        println!(
            "P1e exchange {:?} hook={:?} verdict_row={:?} reply={:?}",
            String::from_utf8_lossy(ty),
            x.step.hook,
            x.step.verdict_row.map(|r| r[3]),
            x.reply.map(|v| format!("{}{}", String::from_utf8_lossy(&v[..4]), trim(&v[12..])))
        );
    }
    drop(lane);
}

fn phase1_forge(public: &[u8; 32], msg: &[u8]) -> [u8; 64] {
    let a = Sha256::new()
        .chain_update(public)
        .chain_update(b":sign:")
        .chain_update(msg)
        .finalize();
    let b = Sha256::digest(a);
    let mut t = [0u8; 64];
    t[..32].copy_from_slice(&a);
    t[32..].copy_from_slice(&b);
    t
}

/// [FABRIC/input] Phase-1 forge accepted by kernel core, rejected by gate/hookwall.
fn probe_phase1_forge() {
    println!("=== P2 [FABRIC/input] Phase-1 forged signature ===");
    let msg = b"envelope|FORGED-BY-PUBLIC-KEY-ONLY";
    // Real Ed25519 public key (gate/hookwall) from a TEST-ONLY seed; the forger knows only `pk`.
    let pk_ed = gcrypto::derive_public(&gcrypto::PrivateKey([0x5A; 32])).unwrap().0;
    // Kernel Phase-1 public key from a different TEST-ONLY seed.
    let pk_k = kcrypto::derive_public(&kcrypto::PrivateKey([0x33; 32])).unwrap().0;
    // An arbitrary 32 bytes nobody holds a secret for.
    let pk_arb = [0x11u8; 32];
    for (label, pk) in [("ed25519-pub", pk_ed), ("kernel-phase1-pub", pk_k), ("arbitrary", pk_arb)] {
        let forged = phase1_forge(&pk, msg);
        let kv = kcrypto::verify(msg, &kcrypto::Signature(forged), &kcrypto::PublicKey(pk));
        let kg = ksign::gate_envelope(msg, &kcrypto::Signature(forged), &kcrypto::PublicKey(pk), "ed25519", &["safe"], &[]);
        let gv = gcrypto::verify(msg, &gcrypto::Signature(forged), &gcrypto::PublicKey(pk));
        let gg = gsign::gate_envelope(msg, &gcrypto::Signature(forged), &gcrypto::PublicKey(pk), "ed25519", &["safe"], &[]);
        println!("P2 pk={label:18} kernel crypto::verify={kv:?}");
        println!("P2 pk={label:18} kernel sign_gate::gate_envelope admitted={} sig_valid={} reason={}", kg.admitted, kg.sig_valid, kg.reason);
        println!("P2 pk={label:18} gate/hookwall crypto::verify={gv:?}");
        println!("P2 pk={label:18} gate/hookwall gate_envelope admitted={} sig_valid={} reason={}", gg.admitted, gg.sig_valid, gg.reason);
    }
    // The forged tag equals what the kernel's own `sign` emits for the matching secret.
    let sk = kcrypto::PrivateKey([0x33; 32]);
    let real = kcrypto::sign(msg, &sk).unwrap().0;
    println!("P2 kernel sign(sk) == forge(pk only): {}", real == phase1_forge(&pk_k, msg));
}

/// [FABRIC/action] SHTD 13-byte cosign row and hookwall_post results discarded.
fn probe_shtd_cosign() {
    println!("=== P3 [FABRIC/action] kernel-lane post / cosign failures ===");
    let mut lane = BootLane::new();
    sys_envelope_send(&envelope(b"SHTD", 0, b""), 0).unwrap();
    let mut seq = 1u64;
    let (r, n) = appends(|| lane.run_step(&mut seq));
    match &r {
        RunStep::Shutdown { step, cosign_append } => println!(
            "P3a SHTD run_step: cosign_append={cosign_append:?} appends_total={n} verdict_row={}",
            step.verdict_row.map(|x| hex(&x)).unwrap_or_default()
        ),
        other => println!("P3a SHTD run_step: unexpected {other:?}"),
    }
    let mut buf = [0u8; 1024];
    let k = sys_envelope_recv(&mut buf, 0).unwrap();
    println!("P3a reply on bus: {}{:?}", String::from_utf8_lossy(&buf[..4]), trim(&buf[12..k]));
    println!("P3b len(b\"init-shutdown\")={}", b"init-shutdown".len());
    let (direct, n2) = appends(|| sys_cosign_append(b"init-shutdown"));
    println!("P3b sys_cosign_append(b\"init-shutdown\")={direct:?} appends={n2}");
    let (raw, n3) = appends(|| cosign_chain::append(b"init-shutdown").is_ok());
    println!("P3b cosign_chain::append(13 bytes) bypassing syscall floor ok={raw} appends={n3}");
    let (pad, n4) = appends(|| sys_cosign_append(b"init-shutdown\0\0\0"));
    println!("P3b sys_cosign_append(16-byte padded) ok={} appends={n4}", pad.is_ok());
    // Can sys_hookwall_post fail on the lane? Only slot>=64 (table never yields it) or an empty row.
    let (post_ok, n5) = appends(|| sys_hookwall_post(&hook_bytes(b"SHTD"), HookwallVerdict::Proceed));
    let (post_bad, n6) = appends(|| sys_hookwall_post(&[64, 65], HookwallVerdict::Block));
    println!("P3c sys_hookwall_post(lane hook)={post_ok:?} appends={n5}; sys_hookwall_post([64,65])={post_bad:?} appends={n6}");
    println!(
        "P3c verdict_row lane SHTD Proceed = {}",
        hex(&verdict_row(&hook_bytes(b"SHTD"), HookwallVerdict::Proceed))
    );
    drop(lane);
}

/// sys_gnn_infer always Local; the lane never calls it during dispatch.
fn probe_gnn_infer() {
    println!("=== P4 sys_gnn_infer ===");
    let mut counts = [0u32; 7];
    let mut errs = 0u32;
    let mut inputs: Vec<Vec<u8>> = vec![vec![], b"x".to_vec(), vec![0xff; 300], vec![0; 100_000]];
    let mut s: u64 = 0x9E37_79B9_7F4A_7C15;
    for len in 0..2000usize {
        let mut v = Vec::with_capacity(len % 257);
        for _ in 0..(len % 257) {
            s ^= s << 13;
            s ^= s >> 7;
            s ^= s << 17;
            v.push(s as u8);
        }
        inputs.push(v);
    }
    inputs.push(envelope(b"KILL", 0, b"HD-virus route UnicastAether QuadBroadcast"));
    for i in &inputs {
        let mut out = [0xAAu8; 4];
        match sys_gnn_infer(i, &mut out) {
            Ok(1) => counts[out[0] as usize] += 1,
            _ => errs += 1,
        }
    }
    println!("P4 inputs={} decision histogram [Local,Triad,Quad,UAcer,ULiris,UFalcon,UAether]={counts:?} errs={errs}", inputs.len());
    let g = gnn::GnnInference::new();
    println!(
        "P4 GnnInference::new is_ready={} load_onnx_model={:?} aggregate_verdict(10,10)={:?} aggregate_verdict(0,10)={:?}",
        g.is_ready(),
        gnn::GnnInference::new().load_onnx_model(b"model", "0000000000000000"),
        g.aggregate_verdict(10, 10),
        g.aggregate_verdict(0, 10)
    );
    let mut empty: [u8; 0] = [];
    println!("P4 sys_gnn_infer(out=empty)={:?}", sys_gnn_infer(b"x", &mut empty));
    // Does the dispatch verdict change with what the GNN says? (it is never consulted)
    println!("P4 sys_hookwall_pre(lane hook)={:?} independent of any gnn input", sys_hookwall_pre(&hook_bytes(b"PING")));
    let _ = SyscallErr::Invalid;
}

/// The real upstream SHTD arm (init.rs:127-133) via pub `init::exchange`, on a thread: it ends in
/// `sys_exit(0)`, which spins forever, so the thread never returns and nothing surfaces the errors.
fn probe_upstream_shtd_thread() {
    println!("=== P3d upstream init::exchange(SHTD) on a thread ===");
    asolaria_kernel_lane::init::drain();
    let before = cosign_chain::append(COUNTER_PROBE).unwrap();
    let h = std::thread::spawn(|| {
        let mut seq = 1u64;
        let mut reply = [0u8; 1024];
        let r = asolaria_kernel_lane::init::exchange(b"SHTD", &mut seq, &mut reply);
        // Unreachable if sys_exit(0) spins.
        println!("P3d exchange returned {:?}", r.map_err(|e| String::from_utf8_lossy(e).into_owned()));
    });
    std::thread::sleep(std::time::Duration::from_millis(1500));
    let after = cosign_chain::append(COUNTER_PROBE).unwrap();
    let mut buf = [0u8; 1024];
    let bus = sys_envelope_recv(&mut buf, 0)
        .map(|k| format!("{}{:?}", String::from_utf8_lossy(&buf[..4]), trim(&buf[12..k])));
    println!(
        "P3d after 1.5s: thread_finished={} cosign_appends_by_shtd_arm={} bus={bus:?}",
        h.is_finished(),
        after - before - 1
    );
}

fn main() {
    let only_shtd = std::env::args().any(|a| a == "shtd");
    if !only_shtd {
        probe_always_proceed();
        probe_phase1_forge();
        probe_shtd_cosign();
        probe_gnn_infer();
    }
    probe_upstream_shtd_thread();
    std::process::exit(0);
}
