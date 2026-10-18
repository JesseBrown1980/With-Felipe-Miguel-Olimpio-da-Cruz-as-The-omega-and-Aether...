//! Boot-lane values pinned against the upstream receipts (kernel/docs/receipts, vendored).

mod common;

use asolaria_kernel_lane::boot::{boot_rows, bootproj_emit, BootTime};
use asolaria_kernel_lane::syscall::sys_pid_current;
use common::{field, hex, qemu_pci, receipt, receipt_clock};
use sha2::{Digest, Sha256};

const PROOF_60D: &str = "ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp";
const PROOF_MINT: &str = "ACER-DEVICE-PID-MINT-BOOT-PROOF-2026-07-08.hbp";
const VOXEL: &str = "ACER-DEVICE-VOXEL-20260708.hbp";
const GREEN: &str = "ACER-KERNEL-GREEN-HARNESS-2026-07-07.hbp";

/// The `key=value` fields of a row the boot crate writes (leading spaces and `\r\n` removed).
fn serial_fields(row: &[u8]) -> Vec<(String, String)> {
    let text = std::str::from_utf8(row).unwrap().trim();
    text.split('|')
        .skip(1)
        .filter_map(|p| p.split_once('='))
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect()
}

fn get(fields: &[(String, String)], key: &str) -> String {
    fields.iter().find(|(k, _)| k == key).unwrap().1.clone()
}

#[test]
fn qemu_boot_rows_reproduce_the_60d_boot_proof() {
    let rows = boot_rows(&qemu_pci(), &receipt_clock());
    let bootpid = rows
        .serial
        .iter()
        .find(|r| r.starts_with(b"  BOOTPID|"))
        .unwrap();
    let f = serial_fields(bootpid);
    for key in [
        "device_pid",
        "device_pid_full",
        "hw_tuple_pid_full",
        "coord_prefix",
        "rst_vmd",
        "storage",
        "colony",
        "dims",
        "derived_from",
    ] {
        assert_eq!(
            get(&f, key),
            field(PROOF_60D, "BOOTPID", key),
            "BOOTPID {key}"
        );
    }
    assert_eq!(get(&f, "device_pid"), "d0162de451e51b30");

    let proj = rows
        .serial
        .iter()
        .find(|r| r.starts_with(b"  BOOTPROJ|"))
        .unwrap();
    let f = serial_fields(proj);
    for key in ["boot_pid", "device_pid", "utc", "volatile", "stable_ref"] {
        assert_eq!(
            get(&f, key),
            field(PROOF_60D, "BOOTPROJ", key),
            "BOOTPROJ {key}"
        );
    }
    assert_eq!(hex(&rows.boot_pid), "74d289e1bdbefd66");

    let time = rows
        .serial
        .iter()
        .find(|r| r.starts_with(b"  BOOTTIME|"))
        .unwrap();
    let f = serial_fields(time);
    for key in ["utc", "tsc"] {
        assert_eq!(
            get(&f, key),
            field(PROOF_60D, "BOOTTIME", key),
            "BOOTTIME {key}"
        );
    }

    let driver = rows
        .serial
        .iter()
        .find(|r| r.starts_with(b"  BOOTDRIVER|"))
        .unwrap();
    let f = serial_fields(driver);
    assert_eq!(
        get(&f, "boot_pid"),
        field(PROOF_60D, "BOOTDRIVER", "boot_pid")
    );
    assert_eq!(get(&f, "match"), field(PROOF_60D, "BOOTDRIVER", "match"));
    assert_eq!(
        get(&f, "status"),
        field(PROOF_60D, "BOOTDRIVER", "status_on_q35")
    );
}

#[test]
fn hw_tuple_digest_is_the_device_pid_of_the_earlier_mint_proof() {
    // The 07-08 mint proof predates the 60D intern: its device_pid is sha256(tuple)[..8]; the
    // 60D proof keeps that digest as hw_tuple_pid_full (its LIRISFIX row).
    let rows = boot_rows(&qemu_pci(), &receipt_clock());
    let f = serial_fields(
        rows.serial
            .iter()
            .find(|r| r.starts_with(b"  BOOTPID|"))
            .unwrap(),
    );
    assert_eq!(
        get(&f, "hw_tuple_pid_full"),
        field(PROOF_MINT, "BOOTPID", "device_pid_full")
    );
    assert_eq!(
        get(&f, "hw_devices"),
        field(PROOF_MINT, "BOOTPID", "hw_devices")
    );
    assert_eq!(rows.hw.devices, 6);
    assert!(!rows.hw.rst_vmd);
}

#[test]
fn coordinate_is_the_voxel_receipt_bh_coord() {
    let tuple: Vec<u8> = qemu_pci()
        .iter()
        .flat_map(|d| {
            [
                (d.vendor >> 8) as u8,
                d.vendor as u8,
                (d.device >> 8) as u8,
                d.device as u8,
                d.class,
                d.subclass,
            ]
        })
        .collect();
    let p = behcs1024_60d::project_60d(&tuple);
    let coord: Vec<String> = p.glyphs.iter().map(|g| g.to_string()).collect();
    let bh = field(VOXEL, "ACERVOXEL", "bh_coord");
    assert_eq!(coord.join("."), bh);
    // ACERVOXELNOTE: voxel pid = sha256(bh_coord string); kernel device_pid = sha256(60 glyph bytes).
    assert_eq!(
        hex(&Sha256::digest(bh.as_bytes())),
        field(VOXEL, "ACERVOXEL", "coord_sha")
    );
    assert_eq!(
        hex(&p.host8),
        field(VOXEL, "ACERVOXELVERIFY", "kernel_device_pid_byte_intern")
    );
}

#[test]
fn sys_pid_current_is_the_green_harness_fingerprint() {
    // GATE|test_p_core_all_targets_seq=PASS|counts=...|fingerprint=0x...|tag=MEASURED
    let text = receipt(GREEN);
    let row = text
        .lines()
        .find(|l| l.starts_with("GATE|") && l.contains("|fingerprint="))
        .unwrap();
    let fingerprint = row
        .split('|')
        .find_map(|p| p.strip_prefix("fingerprint="))
        .unwrap();
    assert_eq!(
        format!("0x{:016x}", sys_pid_current().unwrap()),
        fingerprint
    );
}

#[test]
fn bootproj_sha256_equals_the_upstream_hwinv_sha256_on_the_boot_preimage() {
    // bootproj.rs:19 calls hwinv::sha256; behcs1024-60d carries that function byte-identical and
    // exposes it as `source_sha256`.
    let rows = boot_rows(&qemu_pci(), &receipt_clock());
    let bt: BootTime = receipt_clock();
    let mut pre = Vec::new();
    pre.extend_from_slice(&rows.hw.device_digest);
    pre.extend_from_slice(field(PROOF_60D, "BOOTTIME", "utc").as_bytes());
    pre.extend_from_slice(&bt.tsc.to_be_bytes());
    assert_eq!(pre.len(), 60);
    let upstream = behcs1024_60d::project_60d(&pre).source_sha256;
    assert_eq!(&upstream[..8], &rows.boot_pid);
    assert_eq!(bootproj_emit(&rows.hw.device_digest, &bt).1, rows.boot_pid);
}
