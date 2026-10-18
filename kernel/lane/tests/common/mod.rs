//! Test glue: HBP receipt reading and the transcript `tests/fixtures/kernel-lane.hbp` holds.
//! `tools/referee.py` renders the same transcript independently in Python.
#![allow(dead_code)]

use std::fmt::Write as _;
use std::path::PathBuf;

use asolaria_kernel_lane::boot::{boot_rows, BootTime, PciDev};
use asolaria_kernel_lane::bus_fabric::{resolve_label, PortLabel};
use asolaria_kernel_lane::crypto::{derive_public, sign, PrivateKey};
use asolaria_kernel_lane::gnn::{top_n_deterministic_fallback, GnnInference};
use asolaria_kernel_lane::host8kernel::parse_health;
use asolaria_kernel_lane::sign_gate::gate_envelope;
use asolaria_kernel_lane::sim::{BootLane, RunStep, Step};
use asolaria_kernel_lane::syscall::{
    sys_cosign_append, sys_envelope_recv, sys_envelope_send, sys_gnn_infer, sys_pid_current,
    sys_tier_query,
};
use asolaria_kernel_lane::{cosign_chain, FEDERATION_ANCHOR_PID, KERNEL_VERSION};

/// The row the tests append to read the cosign counter (test glue, not a row the kernel writes).
pub const COSIGN_PROBE: &[u8] = b"KERNEL-LANE-SIM-COSIGN-COUNTER-PROBE";

/// Runs `f` and counts the cosign appends it makes. `cosign_chain::append` keeps no row and has
/// no counter getter (cosign_chain/mod.rs:198-220), so a probe row is appended before and after
/// and the count is `after - before - 1`. Call it while holding a `BootLane`, which serialises
/// the tests that use the process-global counter.
pub fn counting_appends<T>(f: impl FnOnce() -> T) -> (T, u64) {
    let before = cosign_chain::append(COSIGN_PROBE).expect("a non-empty row is accepted");
    let out = f();
    let after = cosign_chain::append(COSIGN_PROBE).expect("a non-empty row is accepted");
    (out, after - before - 1)
}

pub fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

pub fn hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        write!(s, "{b:02x}").unwrap();
    }
    s
}

pub fn receipt(name: &str) -> String {
    std::fs::read_to_string(
        root()
            .join("vendor/federation-1024/kernel/docs/receipts")
            .join(name),
    )
    .expect("vendored receipt")
}

/// The fields of the first `kind|...` row of a receipt, in order.
pub fn row_fields(name: &str, kind: &str) -> Vec<(String, String)> {
    let text = receipt(name);
    let line = text
        .lines()
        .find(|l| l.split('|').next() == Some(kind))
        .unwrap_or_else(|| panic!("{name}: no {kind} row"));
    line.split('|')
        .skip(1)
        .map(|p| match p.split_once('=') {
            Some((k, v)) => (k.to_string(), v.to_string()),
            None => (p.to_string(), String::new()),
        })
        .collect()
}

pub fn field(name: &str, kind: &str, key: &str) -> String {
    row_fields(name, kind)
        .into_iter()
        .find(|(k, _)| k == key)
        .unwrap_or_else(|| panic!("{name}: {kind} has no {key}"))
        .1
}

fn hex_u16(s: &str) -> u16 {
    u16::from_str_radix(s, 16).unwrap()
}

fn hex_u8(s: &str) -> u8 {
    u8::from_str_radix(s, 16).unwrap()
}

/// The q35 PCI functions of the QEMU boot: bus/dev/func and ids from `PCI_QEMU`
/// (ACER-HWINV-BUILD-BOOT-PROOF), checked against `DEVPIDHW` (ACER-DEVICE-PID-MINT-BOOT-PROOF).
pub fn qemu_pci() -> Vec<PciDev> {
    let found: Vec<PciDev> = row_fields("ACER-HWINV-BUILD-BOOT-PROOF-2026-07-07.hbp", "PCI_QEMU")
        .into_iter()
        .map(|(bdf, val)| {
            let (bus, rest) = bdf.split_once(':').unwrap();
            let (dev, func) = rest.split_once('.').unwrap();
            let cls = &val[val.find("_cls").unwrap() + 4..];
            let (class, subclass) = cls.split_once(':').unwrap();
            PciDev {
                bus: hex_u8(bus),
                dev: hex_u8(dev),
                func: func.parse().unwrap(),
                vendor: hex_u16(&val[0..4]),
                device: hex_u16(&val[5..9]),
                class: hex_u8(class),
                subclass: hex_u8(subclass),
            }
        })
        .collect();
    let hw = row_fields("ACER-DEVICE-PID-MINT-BOOT-PROOF-2026-07-08.hbp", "DEVPIDHW");
    for (i, d) in found.iter().enumerate() {
        let v = &hw.iter().find(|(k, _)| *k == format!("d{i}")).unwrap().1;
        let (ids, cs) = v.split_once('/').unwrap();
        let (vendor, device) = ids.split_once(':').unwrap();
        let (class, subclass) = cs.split_once(':').unwrap();
        assert_eq!(
            (
                hex_u16(vendor),
                hex_u16(device),
                hex_u8(class),
                hex_u8(subclass)
            ),
            (d.vendor, d.device, d.class, d.subclass),
            "DEVPIDHW d{i}"
        );
    }
    found
}

/// The clock of the QEMU boot (`BOOTTIME` of ACER-DEVICE-TIME-60D-BOOT-PROOF).
pub fn receipt_clock() -> BootTime {
    let name = "ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp";
    let utc = field(name, "BOOTTIME", "utc");
    BootTime {
        year: utc[0..4].parse().unwrap(),
        month: utc[5..7].parse().unwrap(),
        day: utc[8..10].parse().unwrap(),
        hour: utc[11..13].parse().unwrap(),
        min: utc[14..16].parse().unwrap(),
        sec: utc[17..19].parse().unwrap(),
        tsc: field(name, "BOOTTIME", "tsc").parse().unwrap(),
    }
}

fn step_row(kind: &str, call: &str, step: &Step, cosign_appends: u64) -> String {
    let recv = step
        .received
        .as_deref()
        .map(hex)
        .unwrap_or_else(|| "-".into());
    format!(
        "{kind}|call={call}|recv={recv}|hook={}|hvd={}|cosign_appends={cosign_appends}",
        hex(&step.hook),
        hex(&step.verdict_row.expect("step reached sys_hookwall_post")),
    )
}

fn dispatched(r: RunStep) -> Step {
    match r {
        RunStep::Dispatched(step) => step,
        other => panic!("expected a dispatch, got {other:?}"),
    }
}

fn send_result(r: Result<(), asolaria_kernel_lane::syscall::SyscallErr>) -> String {
    match r {
        Ok(()) => "ok".into(),
        Err(e) => format!("{e:?}"),
    }
}

fn bus_read() -> Vec<u8> {
    let mut buf = [0u8; 1024];
    let n = sys_envelope_recv(&mut buf, 0).expect("an envelope is on the bus");
    buf[..n].to_vec()
}

/// The transcript, rendered from the vendored code (scenario order as in `tools/referee.py`).
pub fn transcript() -> String {
    let mut out = vec![String::from(
        "KLANE|source=asolaria-federation-1024@dc1da1a9\
         |pci=ACER-HWINV-BUILD-BOOT-PROOF-2026-07-07.hbp:PCI_QEMU\
         |clock=ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp:BOOTTIME|json=0",
    )];
    let rows = boot_rows(&qemu_pci(), &receipt_clock());
    for r in &rows.serial {
        let text = std::str::from_utf8(r).unwrap();
        out.push(format!("SERIAL|{}", text.strip_suffix("\r\n").unwrap()));
    }
    out.push(format!(
        "PIDCURRENT|sys_pid_current={:016x}",
        sys_pid_current().unwrap()
    ));

    // Console path: the console sends PING, VERS and PIDA through init::exchange
    // (console.rs:305-308, 344-355), seq from 1 (console.rs:544). XCHG rows: the same
    // init::exchange with types the console does not issue, continuing the same seq.
    {
        let mut lane = BootLane::new();
        let mut seq = 1u64;
        for ty in [b"PING", b"VERS", b"PIDA", b"EXEC", b"INIT"] {
            let kind = if matches!(ty, b"PING" | b"VERS" | b"PIDA") {
                "CONSOLE"
            } else {
                "XCHG"
            };
            let (x, appends) = counting_appends(|| lane.exchange(ty, &mut seq).unwrap());
            let reply = match &x.reply {
                Ok(bytes) => hex(bytes),
                Err(e) => format!("err:{}", String::from_utf8_lossy(e)),
            };
            out.push(format!(
                "{kind}|ty={}|recv={}|hook={}|hvd={}|cosign_appends={appends}|reply={reply}",
                std::str::from_utf8(ty).unwrap(),
                hex(x.step.received.as_deref().unwrap()),
                hex(&x.step.hook),
                hex(&x.step.verdict_row.unwrap()),
            ));
        }
    }

    // Headless run(): init.rs:60-91.
    {
        let mut lane = BootLane::new();
        let ((_, step), appends) = counting_appends(|| lane.init_ready());
        out.push(step_row("RUN", "init_ready", &step, appends));
        let mut seq = 1u64;
        for _ in 0..3 {
            let (r, appends) = counting_appends(|| lane.run_step(&mut seq));
            out.push(step_row("RUN", "run_step", &dispatched(r), appends));
        }
        let mut ping = [0u8; 32];
        ping[..4].copy_from_slice(b"PING");
        out.push(format!(
            "RUN|call=producer_send|len=32|result={}",
            send_result(sys_envelope_send(&ping, 0))
        ));
    }

    // run() fed an EXEC envelope whose 32-byte payload is itself a PING envelope.
    {
        let mut lane = BootLane::new();
        let mut seq = 1u64;
        let mut env = Vec::new();
        env.extend_from_slice(b"EXEC");
        env.extend_from_slice(&0u64.to_le_bytes());
        env.extend_from_slice(b"PING");
        env.extend_from_slice(&7u64.to_le_bytes());
        env.extend_from_slice(&[0u8; 20]);
        out.push(format!(
            "EXECRUN|call=producer_send|len={}|result={}",
            env.len(),
            send_result(sys_envelope_send(&env, 0))
        ));
        for _ in 0..2 {
            let (r, appends) = counting_appends(|| lane.run_step(&mut seq));
            out.push(step_row("EXECRUN", "run_step", &dispatched(r), appends));
        }
        out.push(format!(
            "EXECRUN|call=bus_read|env={}|seq_after={seq}",
            hex(&bus_read())
        ));
    }

    // run() fed SHTD: init.rs:127-132, then sys_exit(0).
    {
        let mut lane = BootLane::new();
        let mut seq = 1u64;
        let mut env = [0u8; 32];
        env[..4].copy_from_slice(b"SHTD");
        out.push(format!(
            "SHTDRUN|call=producer_send|len=32|result={}",
            send_result(sys_envelope_send(&env, 0))
        ));
        match counting_appends(|| lane.run_step(&mut seq)) {
            (
                RunStep::Shutdown {
                    step,
                    cosign_append,
                },
                appends,
            ) => {
                let ce = match cosign_append {
                    Ok(_) => "ok".to_string(),
                    Err(e) => format!("{e:?}"),
                };
                out.push(format!(
                    "{}|sys_cosign_append={ce}",
                    step_row("SHTDRUN", "run_step", &step, appends)
                ));
            }
            other => panic!("expected the shutdown arm, got {other:?}"),
        }
        out.push(format!("SHTDRUN|call=bus_read|env={}", hex(&bus_read())));
    }

    // run() with a 600-byte envelope in the slot: every recv into its 512-byte buffer fails.
    {
        let mut lane = BootLane::new();
        let mut seq = 1u64;
        let mut big = vec![0u8; 600];
        big[..4].copy_from_slice(b"BIGx");
        let send = send_result(sys_envelope_send(&big, 0));
        let mut failed = 0;
        let mut err = String::new();
        let last = loop {
            match lane.run_step(&mut seq) {
                RunStep::RecvFailed {
                    consecutive,
                    err: e,
                } => {
                    failed = consecutive;
                    err = format!("{e:?}");
                }
                other => break other,
            }
        };
        assert_eq!(last, RunStep::Exhausted);
        let left = bus_read();
        out.push(format!(
            "EXHAUST|sent_len={}|send={send}|recv_failed={failed}|recv_err={err}\
             |step32=Exhausted|bus_len={}|bus_type={}|seq_after={seq}",
            big.len(),
            left.len(),
            hex(&left[..4])
        ));
    }

    // sys_cosign_append length floor (syscall/mod.rs:327-334).
    {
        let _lane = BootLane::new();
        let rows: [&[u8]; 5] = [
            b"",
            b"init-shutdown",
            &[b'x'; 15],
            &[b'x'; 16],
            b"console-reset-request",
        ];
        for row in rows {
            let before = asolaria_kernel_lane::cosign_chain::append(b"probe").unwrap();
            let r = sys_cosign_append(row);
            let after = asolaria_kernel_lane::cosign_chain::append(b"probe").unwrap();
            let rh = if row.is_empty() { "-".into() } else { hex(row) };
            let res = match r {
                Ok(_) => "ok".to_string(),
                Err(e) => format!("{e:?}"),
            };
            out.push(format!(
                "COSIGN|row_hex={rh}|len={}|sys_cosign_append={res}|cosign_appends={}",
                row.len(),
                after - before - 1
            ));
        }
    }

    // sys_gnn_infer (syscall/mod.rs:355-374) and the GNN shim fallbacks (gnn/mod.rs:78-150).
    {
        let mut out4 = [0xAAu8; 4];
        let n = sys_gnn_infer(b"route-me", &mut out4).unwrap();
        out.push(format!(
            "GNN|input={}|out_len=4|ret={n}|out0={:02x}",
            hex(b"route-me"),
            out4[0]
        ));
        let mut empty: [u8; 0] = [];
        let e = sys_gnn_infer(b"", &mut empty).unwrap_err();
        out.push(format!("GNN|input=-|out_len=0|ret={e:?}"));
        let items: Vec<String> = ["a", "b", "c", "d"].iter().map(|s| s.to_string()).collect();
        let ranked = top_n_deterministic_fallback(&items, 3);
        let r: Vec<String> = ranked
            .iter()
            .map(|x| format!("{}:{}", x.item_id, x.score_q))
            .collect();
        out.push(format!("GNNTOPN|items=a.b.c.d|n=3|ranked={}", r.join(".")));
        let v = GnnInference::new().aggregate_verdict(50, 100).unwrap();
        out.push(format!("GNNAGG|in_favor=50|total=100|verdict={v:?}"));
    }

    let paths: [&[u8]; 10] = [
        b"",
        b"a\x00b",
        b"\xff\xfe",
        b"C:/asolaria-acer/_big-pickle-quarantine/x",
        b"/mnt/SOVLINUX/x",
        b"vault/secret/k",
        b"x/vault/secret/y",
        b"a/stealth/b",
        b"a/Restricted/b",
        b"docs/readme.md",
    ];
    for p in paths {
        let t = match sys_tier_query(p) {
            Ok(t) => format!("{t:?}"),
            Err(e) => format!("{e:?}"),
        };
        let ph = if p.is_empty() { "-".into() } else { hex(p) };
        out.push(format!("TIER|path_hex={ph}|sys_tier_query={t}"));
    }

    let labels: [Vec<u16>; 6] = [
        vec![],
        vec![0],
        vec![1, 2, 3],
        vec![1023; 20],
        vec![1024],
        vec![1; 21],
    ];
    for levels in labels {
        let lv: Vec<String> = levels.iter().map(|g| g.to_string()).collect();
        let lv = if lv.is_empty() {
            "-".into()
        } else {
            lv.join(".")
        };
        let r = match resolve_label(&PortLabel { levels }) {
            Ok(h) => format!("{h:016x}"),
            Err(e) => format!("{e:?}"),
        };
        out.push(format!("LABEL|levels={lv}|resolve_label={r}"));
    }

    // sign_gate::gate_envelope over upstream Phase-1 crypto (crypto/mod.rs:128-168).
    {
        let key_a = PrivateKey([0x11; 32]);
        let pub_a = derive_public(&key_a).unwrap();
        let pub_b = derive_public(&PrivateKey([0x22; 32])).unwrap();
        let msg = b"kernel-lane-envelope";
        let sig = sign(msg, &key_a).unwrap();
        let cases: [(&str, _, &[&str], &[&str]); 4] = [
            ("own-key", pub_a, &["safe"], &[]),
            ("own-key", pub_a, &["drift-detected"], &[]),
            (
                "own-key",
                pub_a,
                &["drift-detected"],
                &["ASOLARIA_VIRUS_SCANNER"],
            ),
            ("other-key", pub_b, &["safe"], &[]),
        ];
        for (name, public, tags, envvars) in cases {
            let v = gate_envelope(msg, &sig, &public, "ed25519", tags, envvars);
            let join = |x: &[&str]| {
                if x.is_empty() {
                    "-".to_string()
                } else {
                    x.join(".")
                }
            };
            out.push(format!(
                "SIGNGATE|signer=seed11|verify_with={name}|tags={}|envvars={}|sig_valid={}\
                 |deny_clean={}|allow_rescued={}|admitted={}|reason={}",
                join(tags),
                join(envvars),
                u8::from(v.sig_valid),
                u8::from(v.deny_clean),
                u8::from(v.allow_rescued),
                u8::from(v.admitted),
                v.reason
            ));
        }
    }

    // host8-serve HOST8KERNEL row (servers/host8-serve/src/main.rs:760-764) through the asi-os parse.
    let body = format!(
        "HOST8KERNEL|version={KERNEL_VERSION}|anchor_pid={FEDERATION_ANCHOR_PID}|server_libs=5|json=0\n"
    );
    for b in [body.as_str(), ""] {
        let h = parse_health(b);
        let bh = if b.is_empty() {
            "-".into()
        } else {
            hex(b.as_bytes())
        };
        out.push(format!(
            "HEALTH|body_hex={bh}|kver={}|kanchor={}|kernel_up={}",
            h.kver,
            h.kanchor,
            u8::from(h.kernel_up)
        ));
    }

    // The asi-os parse splits the body with `str::lines` (main.rs:363): on "\n", dropping the
    // "\r" of "\r\n". Values are hex because they may hold line-break characters.
    let split_bodies = [
        "HOST8KERNEL|version=a\r\nHOST8KERNEL|anchor_pid=b\r\n",
        "HOST8KERNEL|version=a\r",
        "HOST8KERNEL|version=a\rHOST8KERNEL|anchor_pid=b",
        "HOST8KERNEL|version=\x0b",
        "\x0bHOST8KERNEL|version=v",
        "HOST8KERNEL|version=a\u{85}b\u{2028}c\x1c|anchor_pid=\x0c",
        "x\nHOST8KERNEL|version=v\n\nHOST8KERNEL|version=w\r\r\n",
    ];
    for b in split_bodies {
        let h = parse_health(b);
        out.push(format!(
            "HEALTHSPLIT|body_hex={}|kver_hex={}|kanchor_hex={}|kernel_up={}",
            hex(b.as_bytes()),
            hex(h.kver.as_bytes()),
            hex(h.kanchor.as_bytes()),
            u8::from(h.kernel_up)
        ));
    }
    out.join("\n") + "\n"
}
