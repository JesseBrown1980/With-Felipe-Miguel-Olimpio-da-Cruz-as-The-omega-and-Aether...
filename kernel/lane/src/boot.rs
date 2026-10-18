//! The rows `kernel/boot` writes to COM1 after PCI discovery (asolaria-federation-1024 @ dc1da1a9):
//! `hwinv.rs` (the hardware tuple and `BOOTPID`), `rtc.rs` (`BOOTTIME`), `bootproj.rs` (`boot_pid`,
//! `BOOTPROJ`) and `driver_rst_vmd.rs` (`BOOTDRIVER`), in the order `efi_main` runs them
//! (main.rs:317-323).
//!
//! Port I/O stays on the metal: `cfg_read32` (hwinv.rs:41-49), the CMOS RTC and `rdtsc`
//! (rtc.rs:25-158) and `serial_print` (main.rs:287-292). The caller supplies the device-functions
//! the PCI scan found and the clock reading; each function returns the bytes upstream writes to
//! COM1 (`\r\n` included) instead of writing them. Lines between `upstream-lines` markers are the
//! upstream lines verbatim; everything else cites the lines it follows and says what differs.
//! `project_60d` and the tuple `sha256` come from `kernel/behcs1024-60d`, where they are
//! byte-identical to upstream (hwinv.rs:99-101, 147-262).

use behcs1024_60d::TUPLE_CAP;
use sha2::{Digest, Sha256};

// upstream-lines federation-1024@dc1da1a9 kernel/boot/src/hwinv.rs:51-93
const HEX: &[u8; 16] = b"0123456789abcdef";

pub(crate) fn put_hex8(buf: &mut [u8], i: usize, v: u8) -> usize {
    buf[i] = HEX[(v >> 4) as usize];
    buf[i + 1] = HEX[(v & 0x0F) as usize];
    i + 2
}

fn put_hex16(buf: &mut [u8], i: usize, v: u16) -> usize {
    let i = put_hex8(buf, i, (v >> 8) as u8);
    put_hex8(buf, i, (v & 0xFF) as u8)
}

pub(crate) fn put_bytes(buf: &mut [u8], i: usize, s: &[u8]) -> usize {
    let mut i = i;
    for &c in s {
        buf[i] = c;
        i += 1;
    }
    i
}

fn put_u32(buf: &mut [u8], i: usize, v: u32) -> usize {
    if v == 0 {
        buf[i] = b'0';
        return i + 1;
    }
    let mut tmp = [0u8; 10];
    let mut n = 0;
    let mut x = v;
    while x > 0 {
        tmp[n] = b'0' + (x % 10) as u8;
        x /= 10;
        n += 1;
    }
    let mut i = i;
    while n > 0 {
        n -= 1;
        buf[i] = tmp[n];
        i += 1;
    }
    i
}
// upstream-lines-end

// upstream-lines federation-1024@dc1da1a9 kernel/boot/src/hwinv.rs:95-96
/// Enumeration stops after this many device-functions.
pub(crate) const DEVICE_CAP: u32 = 64;
// upstream-lines-end

// upstream-lines federation-1024@dc1da1a9 kernel/boot/src/hwinv.rs:103-145
/// The canonical hardware tuple accumulated during enumeration, in bus/dev/func order:
/// 6 bytes per present device-function `[vendor_hi, vendor_lo, device_hi, device_lo,
/// class, subclass]`. Deterministic for a given machine -> stable `device_pid`.
struct HwTuple {
    buf: [u8; TUPLE_CAP],
    len: usize,
    count: u32,
    rst_vmd: bool, // Intel RST/VMD controller 8086:282A present (acer storage gap)
    storage: bool, // any PCI class 0x01 (mass storage) present
}

impl HwTuple {
    const fn new() -> Self {
        Self {
            buf: [0u8; TUPLE_CAP],
            len: 0,
            count: 0,
            rst_vmd: false,
            storage: false,
        }
    }
    fn push(&mut self, vendor: u16, device: u16, class: u8, subclass: u8) {
        let b = [
            (vendor >> 8) as u8,
            (vendor & 0xFF) as u8,
            (device >> 8) as u8,
            (device & 0xFF) as u8,
            class,
            subclass,
        ];
        if self.len + b.len() <= TUPLE_CAP {
            self.buf[self.len..self.len + b.len()].copy_from_slice(&b);
            self.len += b.len();
        }
        self.count += 1;
        if vendor == 0x8086 && device == 0x282A {
            self.rst_vmd = true;
        }
        if class == 0x01 {
            self.storage = true;
        }
    }
}
// upstream-lines-end

/// One enumerated PCI device-function: hwinv.rs:332-342 with `pub` in place of `pub(crate)`.
/// Upstream's enumeration loop yields `dev` 0..=31 and `func` 0..=7 (hwinv.rs:363-373), and the
/// PCI line writes `func` as the single byte `b'0' + func` (hwinv.rs:393); callers pass only
/// values config-space enumeration produces.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PciDev {
    pub bus: u8,
    pub dev: u8,
    pub func: u8,
    pub vendor: u16,
    pub device: u16,
    pub class: u8,
    pub subclass: u8,
}

/// What `pci_scan` hands the boot orchestrator (hwinv.rs:321-330). `list` holds the first
/// `devices` entries (upstream keeps them in a fixed `[PciDev; 64]` array).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HwSummary {
    pub device_digest: [u8; 32],
    pub rst_vmd: bool,
    pub devices: u32,
    pub list: Vec<PciDev>,
}

/// The `"  PCI bb:dd.f  vvvv:dddd class=cc:ss\r\n"` line `pci_scan` writes per present
/// device-function (hwinv.rs:384-405; the same statements, one nesting level up).
fn pci_line(d: &PciDev) -> Vec<u8> {
    let mut line = [0u8; 48];
    let mut i = put_bytes(&mut line, 0, b"  PCI ");
    i = put_hex8(&mut line, i, d.bus);
    line[i] = b':';
    i += 1;
    i = put_hex8(&mut line, i, d.dev);
    line[i] = b'.';
    i += 1;
    line[i] = b'0' + d.func;
    i += 1;
    i = put_bytes(&mut line, i, b"  ");
    i = put_hex16(&mut line, i, d.vendor);
    line[i] = b':';
    i += 1;
    i = put_hex16(&mut line, i, d.device);
    i = put_bytes(&mut line, i, b" class=");
    i = put_hex8(&mut line, i, d.class);
    line[i] = b':';
    i += 1;
    i = put_hex8(&mut line, i, d.subclass);
    i = put_bytes(&mut line, i, b"\r\n");
    line[..i].to_vec()
}

/// `pci_scan` (hwinv.rs:359-441) over device-functions already read from config space, in
/// bus/dev/func order, with `dev` 0..=31 and `func` 0..=7 as upstream's loop yields them
/// (hwinv.rs:363-373). Returns every row it writes to COM1 and the [`HwSummary`]. Entries whose
/// vendor reads `0xFFFF` are skipped as upstream skips absent functions (hwinv.rs:376-378); the
/// scan stops at `DEVICE_CAP` functions as upstream does (hwinv.rs:420-429).
pub fn pci_scan(found: &[PciDev]) -> (Vec<Vec<u8>>, HwSummary) {
    let mut rows = vec![b"  hwinv . PCI enumeration (0xCF8/0xCFC, read-only)\r\n".to_vec()];
    let mut tuple = HwTuple::new();
    let mut list = Vec::new();
    for d in found {
        if d.vendor == 0xFFFF {
            continue;
        }
        rows.push(pci_line(d));
        list.push(*d);
        tuple.push(d.vendor, d.device, d.class, d.subclass);
        if tuple.count >= DEVICE_CAP {
            rows.push(b"  hwinv . (capped at 64 device-functions)\r\n".to_vec());
            let (row, device_digest) = emit_device_pid(&tuple);
            rows.push(row);
            let summary = HwSummary {
                device_digest,
                rst_vmd: tuple.rst_vmd,
                devices: tuple.count,
                list,
            };
            return (rows, summary);
        }
    }
    rows.push(b"  hwinv . PCI scan complete\r\n".to_vec());
    let (row, device_digest) = emit_device_pid(&tuple);
    rows.push(row);
    let summary = HwSummary {
        device_digest,
        rst_vmd: tuple.rst_vmd,
        devices: tuple.count,
        list,
    };
    (rows, summary)
}

/// `emit_device_pid` (hwinv.rs:264-319): returns the `BOOTPID` row with `device_digest`
/// (upstream writes the row to COM1 and returns `device_digest`). hwinv.rs:269-279 compute
/// `hw_digest = sha256(tuple)`, `coord = project_60d(tuple)` and `device_digest =
/// sha256(coord as 60 big-endian u16)`; `behcs1024_60d::project_60d` returns exactly these as
/// `source_sha256`, `glyphs` and `coordinate_sha256`.
fn emit_device_pid(t: &HwTuple) -> (Vec<u8>, [u8; 32]) {
    let projection = behcs1024_60d::project_60d(&t.buf[..t.len]);
    let hw_digest = projection.source_sha256;
    let coord = projection.glyphs;
    let device_digest = projection.coordinate_sha256;
    // upstream-lines federation-1024@dc1da1a9 kernel/boot/src/hwinv.rs:280-313
    let mut row = [0u8; 448];
    let mut i = put_bytes(&mut row, 0, b"  BOOTPID|device_pid=");
    for &byte in &device_digest[..8] {
        i = put_hex8(&mut row, i, byte); // device_pid = intern of the 60D coordinate
    }
    i = put_bytes(&mut row, i, b"|device_pid_full=");
    for &byte in &device_digest {
        i = put_hex8(&mut row, i, byte); // full sha256 of the 60D coordinate
    }
    i = put_bytes(&mut row, i, b"|hw_tuple_pid_full=");
    for &byte in &hw_digest {
        i = put_hex8(&mut row, i, byte); // raw hardware-tuple sha256 = the proof
    }
    i = put_bytes(&mut row, i, b"|hw_devices=");
    i = put_u32(&mut row, i, t.count);
    i = put_bytes(&mut row, i, b"|rst_vmd=");
    row[i] = if t.rst_vmd { b'1' } else { b'0' };
    i += 1;
    i = put_bytes(&mut row, i, b"|storage=");
    row[i] = if t.storage { b'1' } else { b'0' };
    i += 1;
    i = put_bytes(
        &mut row,
        i,
        b"|colony=acer|behcs=1024|dims=60|derived_from=60d_coordinate|coord_prefix=",
    );
    for (k, g) in coord.iter().take(6).enumerate() {
        if k > 0 {
            row[i] = b'.';
            i += 1;
        }
        i = put_u32(&mut row, i, *g as u32);
    }
    i = put_bytes(&mut row, i, b"|e=0|fire=0|json=0\r\n");
    // upstream-lines-end
    (row[..i].to_vec(), device_digest)
}

/// Wall-clock as the RTC holds it plus the TSC tick read at boot: rtc.rs:12-22 with `pub` in place
/// of `pub(crate)`. The CMOS/`rdtsc` read that fills it (rtc.rs:83-158) stays on the metal.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BootTime {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub min: u8,
    pub sec: u8,
    pub tsc: u64,
}

// upstream-lines federation-1024@dc1da1a9 kernel/boot/src/rtc.rs:57-80
impl BootTime {
    /// Write canonical `YYYY-MM-DDTHH:MM:SSZ` (20 bytes) into `buf`; returns the length.
    pub(crate) fn write_utc(&self, buf: &mut [u8]) -> usize {
        let mut i = put_u4(buf, 0, self.year);
        buf[i] = b'-';
        i += 1;
        i = put_2(buf, i, self.month);
        buf[i] = b'-';
        i += 1;
        i = put_2(buf, i, self.day);
        buf[i] = b'T';
        i += 1;
        i = put_2(buf, i, self.hour);
        buf[i] = b':';
        i += 1;
        i = put_2(buf, i, self.min);
        buf[i] = b':';
        i += 1;
        i = put_2(buf, i, self.sec);
        buf[i] = b'Z';
        i += 1;
        i
    }
}
// upstream-lines-end

// upstream-lines federation-1024@dc1da1a9 kernel/boot/src/rtc.rs:174-208
fn put_2(buf: &mut [u8], i: usize, v: u8) -> usize {
    buf[i] = b'0' + (v / 10) % 10;
    buf[i + 1] = b'0' + v % 10;
    i + 2
}

fn put_u4(buf: &mut [u8], i: usize, v: u16) -> usize {
    buf[i] = b'0' + ((v / 1000) % 10) as u8;
    buf[i + 1] = b'0' + ((v / 100) % 10) as u8;
    buf[i + 2] = b'0' + ((v / 10) % 10) as u8;
    buf[i + 3] = b'0' + (v % 10) as u8;
    i + 4
}

fn put_u64(buf: &mut [u8], i: usize, v: u64) -> usize {
    if v == 0 {
        buf[i] = b'0';
        return i + 1;
    }
    let mut tmp = [0u8; 20];
    let mut n = 0;
    let mut x = v;
    while x > 0 {
        tmp[n] = b'0' + (x % 10) as u8;
        x /= 10;
        n += 1;
    }
    let mut i = i;
    while n > 0 {
        n -= 1;
        buf[i] = tmp[n];
        i += 1;
    }
    i
}
// upstream-lines-end

/// `emit_boottime` (rtc.rs:160-172): returns the `BOOTTIME` row instead of writing it.
pub fn emit_boottime(bt: &BootTime) -> Vec<u8> {
    // upstream-lines federation-1024@dc1da1a9 kernel/boot/src/rtc.rs:162-167
    let mut row = [0u8; 96];
    let mut i = put_bytes(&mut row, 0, b"  BOOTTIME|utc=");
    i += bt.write_utc(&mut row[i..]);
    i = put_bytes(&mut row, i, b"|tsc=");
    i = put_u64(&mut row, i, bt.tsc);
    i = put_bytes(&mut row, i, b"|src=cmos_rtc+tsc|e=0|json=0\r\n");
    // upstream-lines-end
    row[..i].to_vec()
}

/// The `sha256` `bootproj.rs` calls (hwinv.rs:147-235). That function is SHA-256 for inputs up to
/// `TUPLE_CAP` bytes (it truncates longer input); the `boot_pid` preimage is at most 72 bytes.
fn sha256(data: &[u8]) -> [u8; 32] {
    let n = data.len().min(TUPLE_CAP);
    Sha256::digest(&data[..n]).into()
}

/// `bootproj::emit` (bootproj.rs:10-44): returns the `BOOTPROJ` row and the 8-byte `boot_pid`
/// (upstream writes the row and returns `boot_pid`).
pub fn bootproj_emit(device_digest: &[u8; 32], bt: &BootTime) -> (Vec<u8>, [u8; 8]) {
    // upstream-lines federation-1024@dc1da1a9 kernel/boot/src/bootproj.rs:12-38
    // preimage = device_pid_full(32) || utc(ascii, 20) || tsc(8 big-endian)
    let mut pre = [0u8; 72];
    let mut n = 32;
    pre[..32].copy_from_slice(device_digest);
    n += bt.write_utc(&mut pre[n..]);
    pre[n..n + 8].copy_from_slice(&bt.tsc.to_be_bytes());
    n += 8;
    let digest = sha256(&pre[..n]);
    let mut boot_pid = [0u8; 8];
    boot_pid.copy_from_slice(&digest[..8]);

    let mut row = [0u8; 160];
    let mut i = put_bytes(&mut row, 0, b"  BOOTPROJ|boot_pid=");
    for &b in &boot_pid {
        i = put_hex8(&mut row, i, b);
    }
    i = put_bytes(&mut row, i, b"|device_pid=");
    for &b in &device_digest[..8] {
        i = put_hex8(&mut row, i, b);
    }
    i = put_bytes(&mut row, i, b"|utc=");
    i += bt.write_utc(&mut row[i..]);
    i = put_bytes(
        &mut row,
        i,
        b"|volatile=1|stable_ref=device_pid|e=0|fire=0|json=0\r\n",
    );
    // upstream-lines-end
    (row[..i].to_vec(), boot_pid)
}

/// `driver_rst_vmd::probe` (driver_rst_vmd.rs:16-44): returns the `BOOTDRIVER` row.
pub fn driver_rst_vmd_probe(hw: &HwSummary, boot_pid: &[u8; 8], bt: &BootTime) -> Vec<u8> {
    // upstream-lines federation-1024@dc1da1a9 kernel/boot/src/driver_rst_vmd.rs:18-39
    let mut row = [0u8; 256];
    let mut i = put_bytes(
        &mut row,
        0,
        b"  BOOTDRIVER|driver=intel-rst-vmd|match=8086:282A|device_pid=",
    );
    for &b in &hw.device_digest[..8] {
        i = put_hex8(&mut row, i, b);
    }
    i = put_bytes(&mut row, i, b"|boot_pid=");
    for &b in boot_pid {
        i = put_hex8(&mut row, i, b);
    }
    i = put_bytes(&mut row, i, b"|utc=");
    i += bt.write_utc(&mut row[i..]);
    i = put_bytes(&mut row, i, b"|status=");
    if hw.rst_vmd {
        i = put_bytes(&mut row, i, b"GATED_MATCH|vmd_walk=TODO_next_step");
    } else {
        i = put_bytes(&mut row, i, b"NOT_APPLICABLE|no_8086:282A_on_this_device");
    }
    i = put_bytes(&mut row, i, b"|writes=0|e=0|fire=0|json=0\r\n");
    // upstream-lines-end
    row[..i].to_vec()
}

/// Every row `efi_main` writes from `hwinv::pci_scan` through `driver_rst_vmd::probe`
/// (main.rs:317-323), with the facts the console keeps (main.rs:324-334).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BootRows {
    pub serial: Vec<Vec<u8>>,
    pub hw: HwSummary,
    pub boot_pid: [u8; 8],
}

/// main.rs:317-323 after discovery: `pci_scan` rows (ending in `BOOTPID`), `BOOTTIME`,
/// `BOOTPROJ`, `BOOTDRIVER`.
pub fn boot_rows(found: &[PciDev], bt: &BootTime) -> BootRows {
    let (mut serial, hw) = pci_scan(found);
    serial.push(emit_boottime(bt));
    let (row, boot_pid) = bootproj_emit(&hw.device_digest, bt);
    serial.push(row);
    serial.push(driver_rst_vmd_probe(&hw, &boot_pid, bt));
    BootRows {
        serial,
        hw,
        boot_pid,
    }
}
