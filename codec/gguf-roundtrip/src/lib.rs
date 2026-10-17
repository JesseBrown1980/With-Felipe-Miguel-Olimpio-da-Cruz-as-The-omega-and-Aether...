//! Runs the owner's DBBH -> DBWH codec (`holographic-wormhole-codec` @ 4901280, vendored unchanged
//! at `codec/dbbh-dbwh`) over GGUF files and formats the results as HBP rows (`json=0`).
//!
//! Per object: `black_hole_compress`, the receiver arms the capsule (consent given),
//! `white_hole_emit` with the recovery subset the codec's own tests use, the codec's `receipt_hbp`,
//! then the codec's full loop `wormhole_traverse` with its watcher cross-check cylinders.
//! Integer arithmetic only; no codec code is changed or re-implemented here.
#![forbid(unsafe_code)]

use holographic_wormhole_codec as hwc;
use std::mem::size_of_val;

/// Cylinders `white_hole_emit` reconstructs from: `[0, 1]`, as in the codec's tests
/// (`full_throat_verifies_clone_byte_identical`, `white_mouth_needs_consent_and_respects_collapse`).
pub const RECOVER_WITH: [usize; 2] = [0, 1];
/// Cylinders the watcher in `wormhole_traverse` cross-checks: `[2, 3]`, as in the codec's tests.
pub const CROSS: [usize; 2] = [2, 3];
/// Sender, receiver and salt that `wormhole_traverse` passes to `black_hole_compress`
/// (codec `src/lib.rs` line 303), so both runs below build the same packet.
pub const SENDER: &[u8] = b"acer";
pub const RECEIVER: &[u8] = b"liris";
pub const SALT: &[u8] = b"salt";

/// Bytes the codec's `WormholePacket` holds, measured from its fields with `size_of_val`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PacketSize {
    /// Residues over all cylinders (`pkt.shadows`).
    pub residues: usize,
    /// `pkt.shadows` payload: every residue as the codec stores it (`u64`).
    pub shadow_bytes: usize,
    /// `pkt.capsule` (`SessionCapsule`: 8-byte nonce and four `bool`s).
    pub capsule_bytes: usize,
    /// `pkt.agt` (the `AGT-` address string).
    pub agt_bytes: usize,
}

impl PacketSize {
    pub fn of(pkt: &hwc::WormholePacket) -> Self {
        PacketSize {
            residues: pkt.shadows.iter().map(Vec::len).sum(),
            shadow_bytes: pkt.shadows.iter().map(|s| size_of_val(s.as_slice())).sum(),
            capsule_bytes: size_of_val(&pkt.capsule),
            agt_bytes: pkt.agt.len(),
        }
    }

    /// Packet bytes = shadows + capsule.
    pub fn packet_bytes(&self) -> usize {
        self.shadow_bytes + self.capsule_bytes
    }
}

/// Result of black mouth -> white mouth on one object.
#[derive(Debug, Clone)]
pub struct Emit {
    pub size: PacketSize,
    pub agt: String,
    pub roof_bits: u32,
    pub residual_bits: u8,
    pub verdict: hwc::Verdict,
    /// The codec's own receipt rows for this packet and verdict (`receipt_hbp`, no watcher names).
    pub receipt: Vec<String>,
}

/// `black_hole_compress`, receiver arms the capsule, then `white_hole_emit(&pkt, recover_with)`.
pub fn black_then_white(object: &[u8], recover_with: &[usize]) -> Emit {
    let mut pkt = hwc::black_hole_compress(object, SENDER, RECEIVER, SALT);
    pkt.capsule.arm_receiver();
    let size = PacketSize::of(&pkt);
    let verdict = hwc::white_hole_emit(&pkt, recover_with);
    let receipt = hwc::receipt_hbp(&pkt, &verdict, &[]);
    Emit {
        size,
        agt: pkt.agt.clone(),
        roof_bits: pkt.roof_bits,
        residual_bits: pkt.residual_bits,
        verdict,
        receipt,
    }
}

/// The codec's full loop with its watcher: `wormhole_traverse(object, RECOVER_WITH, CROSS)`.
pub fn traverse(object: &[u8]) -> hwc::Verdict {
    hwc::wormhole_traverse(object, &RECOVER_WITH, &CROSS)
}

/// The verdict as the codec's enum names it: `VerifiedClone` or `Held(<reason>)`.
pub fn verdict_name(v: &hwc::Verdict) -> String {
    match v {
        hwc::Verdict::VerifiedClone(_) => "VerifiedClone".to_string(),
        hwc::Verdict::Held(h) => format!("Held({:?})", h),
    }
}

/// True only when the codec emitted bytes and they equal `object` byte for byte.
pub fn emitted_equals(v: &hwc::Verdict, object: &[u8]) -> bool {
    matches!(v, hwc::Verdict::VerifiedClone(r) if r.as_slice() == object)
}

pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        s.push(DIGITS[(b >> 4) as usize] as char);
        s.push(DIGITS[(b & 15) as usize] as char);
    }
    s
}

/// `num / den` as a decimal string, truncated to 6 places, by integer division.
pub fn ratio_6dp(num: u64, den: u64) -> String {
    if den == 0 {
        return "undefined".to_string();
    }
    let (n, d) = (num as u128, den as u128);
    format!("{}.{:06}", n / d, (n % d) * 1_000_000 / d)
}

/// One `GGUF|...` row of `gguf/MANIFEST.hbp`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManifestRow {
    pub local: String,
    pub storage: String,
    pub bytes: u64,
    pub sha256: String,
}

/// Value of `key` in an HBP row (`|key=value|`).
pub fn field<'a>(row: &'a str, key: &str) -> Option<&'a str> {
    row.split('|')
        .skip(1)
        .find_map(|kv| kv.strip_prefix(key)?.strip_prefix('='))
}

/// Every `GGUF|` row of a manifest, in file order.
pub fn manifest_rows(text: &str) -> Result<Vec<ManifestRow>, String> {
    let mut rows = Vec::new();
    for (i, line) in text.lines().enumerate() {
        if !line.starts_with("GGUF|") {
            continue;
        }
        let get = |k: &str| field(line, k).ok_or(format!("line {}: no {}=", i + 1, k));
        rows.push(ManifestRow {
            local: get("local")?.to_string(),
            storage: get("storage")?.to_string(),
            bytes: get("bytes")?
                .parse()
                .map_err(|_| format!("line {}: bytes= is not an integer", i + 1))?,
            sha256: get("sha256")?.to_string(),
        });
    }
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;

    // 2200 bytes, a length that leaves a partial last 6-byte block (2200 = 6 * 366 + 4).
    const SMALL: &[u8] =
        include_bytes!("../../../gguf/follow/matrix/TIMED-CHIRAL-PUBLIC-COLOR-ORBITS.gguf");
    const SMALL_SHA256: &str = "77174fb892a1c8152de362730d2864ef2b7f929b496af7758a5c42a88798bb6e";
    const MANIFEST: &str = include_str!("../../../gguf/MANIFEST.hbp");

    #[test]
    fn small_gguf_round_trips_byte_identical() {
        assert_eq!(SMALL.len(), 2200);
        assert_eq!(hex(&hwc::sha256(SMALL)), SMALL_SHA256);
        let e = black_then_white(SMALL, &RECOVER_WITH);
        assert_eq!(verdict_name(&e.verdict), "VerifiedClone");
        assert!(emitted_equals(&e.verdict, SMALL));
        // 367 blocks of 6 bytes, 4 cylinders, one u64 per residue, 12-byte capsule.
        assert_eq!(e.size.residues, 4 * 367);
        assert_eq!(e.size.shadow_bytes, 4 * 367 * 8);
        assert_eq!(e.size.capsule_bytes, 12);
        assert_eq!(e.size.agt_bytes, 20);
        assert_eq!(e.size.packet_bytes(), 11756);
        assert_eq!((e.roof_bits, e.residual_bits), (99, 0));
        assert_eq!(e.agt, hwc::agt(SMALL));
        assert!(e.receipt[0].contains("|verdict=verified-clone|held=none|"));
        let t = traverse(SMALL);
        assert_eq!(verdict_name(&t), "VerifiedClone");
        assert!(emitted_equals(&t, SMALL));
    }

    #[test]
    fn one_cylinder_holds_insufficient_roof() {
        // The codec's own `insufficient_roof_holds`: one cylinder is below the 48-bit block.
        let e = black_then_white(SMALL, &[0]);
        assert_eq!(e.verdict, hwc::Verdict::Held(hwc::Held::InsufficientRoof));
        assert_eq!(verdict_name(&e.verdict), "Held(InsufficientRoof)");
        assert!(!emitted_equals(&e.verdict, SMALL));
        assert!(e.receipt[0].contains("|verdict=held|held=insufficient-roof|"));
        assert_eq!(e.size.packet_bytes(), 11756);
    }

    #[test]
    fn manifest_has_27_files_and_4_lfs_pointers() {
        let rows = manifest_rows(MANIFEST).unwrap();
        assert_eq!(rows.len(), 31);
        assert_eq!(rows.iter().filter(|r| r.storage == "file").count(), 27);
        assert_eq!(
            rows.iter().filter(|r| r.storage == "lfs_pointer").count(),
            4
        );
        let small = rows
            .iter()
            .find(|r| r.local == "follow/matrix/TIMED-CHIRAL-PUBLIC-COLOR-ORBITS.gguf")
            .unwrap();
        assert_eq!((small.bytes, small.sha256.as_str()), (2200, SMALL_SHA256));
    }

    #[test]
    fn ratio_is_integer_truncated() {
        assert_eq!(ratio_6dp(11756, 2200), "5.343636");
        assert_eq!(ratio_6dp(32, 6), "5.333333");
        assert_eq!(ratio_6dp(1, 0), "undefined");
    }
}
