#![no_std]
#![forbid(unsafe_code)]
//! BEHCS-1024 60-glyph hash-derived coordinate: Federation-1024's own `project_60d` and `sha256`.
//!
//! The two upstream functions are included byte-identical, so every tuple maps exactly as upstream.
//! A coordinate is an address, not source recovery.

/// The upstream source, byte-identical (federation-1024@dc1da1a9, `kernel/boot/src/hwinv.rs`).
mod hwinv {
    include!("upstream/hwinv-tuple-cap.rs");
    include!("upstream/hwinv-sha256-project-60d.rs");

    pub(crate) const UPSTREAM_TUPLE_CAP: usize = TUPLE_CAP;

    pub(crate) fn project(tuple: &[u8]) -> [u16; 60] {
        project_60d(tuple)
    }
}

/// Number of 10-bit glyph coordinates.
pub const DIMENSIONS: usize = 60;
/// Symbol indices range from 0 through 1023 inclusive.
pub const ALPHABET_SIZE: usize = 1024;
/// Upstream's `TUPLE_CAP`: "Input is bounded by `TUPLE_CAP`" (hwinv.rs:148).
pub const TUPLE_CAP: usize = hwinv::UPSTREAM_TUPLE_CAP;

/// 60 dimensions plus the digests upstream derives from them, stored without heap allocation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Projection {
    pub glyphs: [u16; DIMENSIONS],
    /// Upstream SHA-256 of the 120 coordinate bytes (`device_pid_full` upstream).
    pub coordinate_sha256: [u8; 32],
    /// First eight bytes of `coordinate_sha256` (`device_pid` upstream); a short handle, not a signer.
    pub host8: [u8; 8],
    /// Upstream `sha256` of the tuple (`hw_tuple_pid_full` upstream).
    pub source_sha256: [u8; 32],
}

impl Projection {
    /// Canonical 60 * 2 bytes in big-endian glyph order.
    pub fn coordinate_bytes(&self) -> [u8; 120] {
        let mut bytes = [0u8; 120];
        for (i, glyph) in self.glyphs.iter().enumerate() {
            bytes[i * 2..i * 2 + 2].copy_from_slice(&glyph.to_be_bytes());
        }
        bytes
    }
}

/// Upstream's projection plus the digests upstream's `emit_device_pid` derives from it.
pub fn project_60d(tuple: &[u8]) -> Projection {
    let glyphs = hwinv::project(tuple);
    let mut coord_bytes = [0u8; 120];
    for (index, glyph) in glyphs.iter().enumerate() {
        coord_bytes[index * 2..index * 2 + 2].copy_from_slice(&glyph.to_be_bytes());
    }
    let coordinate_sha256 = hwinv::sha256(&coord_bytes);
    let mut host8 = [0u8; 8];
    host8.copy_from_slice(&coordinate_sha256[..8]);
    Projection {
        glyphs,
        coordinate_sha256,
        host8,
        source_sha256: hwinv::sha256(tuple),
    }
}

#[cfg(test)]
mod tests {
    extern crate std;
    use self::std::fmt::Write as _;
    use self::std::vec::Vec;
    use super::*;

    fn hex(bytes: &[u8]) -> std::string::String {
        let mut out = std::string::String::with_capacity(bytes.len() * 2);
        for b in bytes {
            write!(&mut out, "{b:02x}").expect("in-memory write");
        }
        out
    }

    fn pattern(len: usize) -> Vec<u8> {
        (0..len).map(|i| (i % 256) as u8).collect()
    }

    #[test]
    fn sha256_standard_vectors() {
        assert_eq!(hex(&hwinv::sha256(b"")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        assert_eq!(hex(&hwinv::sha256(b"abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    #[test]
    fn independent_empty_reference_vector() {
        let p = project_60d(b"");
        assert_eq!(&p.glyphs[..10], &[831, 408, 169, 987, 87, 301, 61, 840, 631, 732]);
        assert_eq!(hex(&p.coordinate_sha256), "a93505a95d0aace1fb6edc8b2e8d94581fdb49cdb0f961097a6d9ac9cc0102e7");
        assert_eq!(&p.host8, &p.coordinate_sha256[..8]);
    }

    #[test]
    fn independent_abc_reference_vector() {
        let p = project_60d(b"abc");
        assert_eq!(&p.glyphs[..10], &[813, 428, 103, 701, 206, 505, 788, 597, 191, 714]);
        assert_eq!(hex(&p.coordinate_sha256), "ff504d90899902cd2ec8e0c075553f65c3116a8f6c1ad3fee6907f00edaff4d6");
        assert_eq!(hex(&p.source_sha256), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    #[test]
    fn upstream_vector_508() {
        let p = project_60d(&pattern(508));
        assert_eq!(&p.glyphs[..10], &[902, 3, 689, 384, 304, 662, 46, 568, 144, 1004]);
        assert_eq!(hex(&p.coordinate_sha256), "d9c002d12a4b667b1f4f8e351e38f35d4c731e566ebd51a09e367e23470dd943");
    }

    #[test]
    fn upstream_vectors_509_to_512() {
        // Vectors from independent_referee.py's model of upstream.
        let expected = [
            (509, [189, 526, 380, 507], "c8e0925819849fc411afe4c452e5da2c615949beaff0387114f93991604bb344"),
            (510, [539, 52, 514, 404], "79a25f0c2fac953137c230cc5ee89d46207931efeaa62639906cb468ea71df1a"),
            (511, [876, 847, 583, 217], "9bb6c8d92f63e1121fce300d6af9c9b7016bad1e4ac2f81d30e98e2be131290e"),
            (512, [256, 476, 545, 523], "f0e02e6b285e3ad7d6d2414da9153f1f6a7f3668f2406dd7bcf59f1bb8e5a333"),
        ];
        for (len, head, coordinate) in expected {
            let tuple = pattern(len);
            let p = project_60d(&tuple);
            assert_eq!(&p.glyphs[..4], &head, "len {len}");
            assert_eq!(hex(&p.coordinate_sha256), coordinate, "len {len}");
        }
    }

    #[test]
    fn upstream_vectors_beyond_tuple_cap() {
        let at_cap = project_60d(&pattern(TUPLE_CAP));
        for len in [513, 600, 1024] {
            assert_eq!(project_60d(&pattern(len)), at_cap, "len {len}");
        }
        assert_eq!(
            hex(&at_cap.source_sha256),
            "110009dcee21620b166f3abfecb5eff7a873be729d1c2d53822e7acc5f34eb9b"
        );
    }

    #[test]
    fn deterministic_and_bounded_coordinates() {
        let first = project_60d(b"bounded-test");
        let second = project_60d(b"bounded-test");
        assert_eq!(first, second);
        assert!(first.glyphs.iter().all(|g| usize::from(*g) < ALPHABET_SIZE));
        assert_eq!(first.coordinate_bytes().len(), DIMENSIONS * 2);
        assert_ne!(first.source_sha256, first.coordinate_sha256);
        assert_ne!(first, project_60d(b"bounded-tesu"));
    }
}
