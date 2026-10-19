#![no_std]
#![forbid(unsafe_code)]
//! BEHCS-1024 60-glyph hash-derived coordinate, independently implemented.
//!
//! Exact Federation-1024 mapping for source tuples of at most 508 bytes.
//! Inputs beyond that boundary are rejected because the legacy fixed SHA buffer
//! discards some counter bytes. A coordinate is an address, not source recovery.

/// Number of 10-bit glyph coordinates.
pub const DIMENSIONS: usize = 60;
/// Symbol indices range from 0 through 1023 inclusive.
pub const ALPHABET_SIZE: usize = 1024;
/// Safe legacy domain: tuple plus the four counter bytes must fit in 512 bytes.
pub const MAX_SOURCE_BYTES: usize = 508;

const ROUND_CONSTANTS: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
    0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee,
    0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/// A source exceeding the faithful counter-inclusive domain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectionError {
    SourceTooLong { observed: usize, allowed: usize },
}

/// 60 dimensions plus independent full digests, stored without heap allocation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Projection {
    pub glyphs: [u16; DIMENSIONS],
    /// SHA-256 of all 120 coordinate bytes (not the tuple itself).
    pub coordinate_sha256: [u8; 32],
    /// First eight bytes of coordinate SHA-256; a short handle, not a signer.
    pub host8: [u8; 8],
    /// SHA-256 of exact original tuple bytes, for source-provenance comparison.
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

/// Standard SHA-256 for at most 512 bytes, independently written from the
/// published round/rotation specification. Internal callers uphold the bound.
fn sha256(input: &[u8]) -> [u8; 32] {
    assert!(input.len() <= 512, "bounded SHA-256 message");
    let mut message = [0u8; 576];
    message[..input.len()].copy_from_slice(input);
    message[input.len()] = 0x80;
    let used = (input.len() + 9).div_ceil(64) * 64;
    message[used - 8..used].copy_from_slice(&((input.len() as u64) * 8).to_be_bytes());
    let mut state: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    for block in message[..used].chunks_exact(64) {
        let mut words = [0u32; 64];
        for (index, item) in words.iter_mut().take(16).enumerate() {
            let b = index * 4;
            *item = u32::from_be_bytes([block[b], block[b + 1], block[b + 2], block[b + 3]]);
        }
        for index in 16..64 {
            let a = words[index - 15];
            let b = words[index - 2];
            let s0 = a.rotate_right(7) ^ a.rotate_right(18) ^ (a >> 3);
            let s1 = b.rotate_right(17) ^ b.rotate_right(19) ^ (b >> 10);
            words[index] = words[index - 16]
                .wrapping_add(s0)
                .wrapping_add(words[index - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h) = (
            state[0], state[1], state[2], state[3],
            state[4], state[5], state[6], state[7],
        );
        for (round, word) in words.iter().enumerate() {
            let big_sigma1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choose = (e & f) ^ ((!e) & g);
            let temp1 = h
                .wrapping_add(big_sigma1)
                .wrapping_add(choose)
                .wrapping_add(ROUND_CONSTANTS[round])
                .wrapping_add(*word);
            let big_sigma0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = big_sigma0.wrapping_add(majority);
            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }
        for (slot, value) in state.iter_mut().zip([a, b, c, d, e, f, g, h]) {
            *slot = slot.wrapping_add(value);
        }
    }
    let mut digest = [0u8; 32];
    for (index, word) in state.iter().enumerate() {
        digest[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    digest
}

/// Hash a tuple to 60 bounded 10-bit selectors using four counter-salted SHA rounds.
/// The returned coordinate is not invertible; custody requires original source bytes.
pub fn project_60d(tuple: &[u8]) -> Result<Projection, ProjectionError> {
    if tuple.len() > MAX_SOURCE_BYTES {
        return Err(ProjectionError::SourceTooLong {
            observed: tuple.len(),
            allowed: MAX_SOURCE_BYTES,
        });
    }
    let mut input = [0u8; 512];
    input[..tuple.len()].copy_from_slice(tuple);
    let mut glyphs = [0u16; DIMENSIONS];
    for counter in 0u32..4 {
        input[tuple.len()..tuple.len() + 4].copy_from_slice(&counter.to_be_bytes());
        let hash = sha256(&input[..tuple.len() + 4]);
        for pair in 0..16 {
            let slot = (counter as usize) * 16 + pair;
            if slot == DIMENSIONS {
                break;
            }
            let pair_value = u16::from_be_bytes([hash[pair * 2], hash[pair * 2 + 1]]);
            glyphs[slot] = pair_value & 0x03ff;
        }
    }
    let mut coord_bytes = [0u8; 120];
    for (index, glyph) in glyphs.iter().enumerate() {
        coord_bytes[index * 2..index * 2 + 2].copy_from_slice(&glyph.to_be_bytes());
    }
    let coord_hash = sha256(&coord_bytes);
    let mut host8 = [0u8; 8];
    host8.copy_from_slice(&coord_hash[..8]);
    Ok(Projection {
        glyphs,
        coordinate_sha256: coord_hash,
        host8,
        source_sha256: sha256(tuple),
    })
}

#[cfg(test)]
mod tests {
    extern crate std;
    use self::std::fmt::Write as _;
    use super::*;

    fn hex(bytes: &[u8]) -> std::string::String {
        let mut out = std::string::String::with_capacity(bytes.len() * 2);
        for b in bytes {
            write!(&mut out, "{b:02x}").expect("in-memory write");
        }
        out
    }

    #[test]
    fn sha256_standard_vectors() {
        assert_eq!(hex(&sha256(b"")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        assert_eq!(hex(&sha256(b"abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    #[test]
    fn independent_empty_reference_vector() {
        let p = project_60d(b"").unwrap();
        assert_eq!(&p.glyphs[..10], &[831, 408, 169, 987, 87, 301, 61, 840, 631, 732]);
        assert_eq!(hex(&p.coordinate_sha256), "a93505a95d0aace1fb6edc8b2e8d94581fdb49cdb0f961097a6d9ac9cc0102e7");
        assert_eq!(&p.host8, &p.coordinate_sha256[..8]);
    }

    #[test]
    fn independent_abc_reference_vector() {
        let p = project_60d(b"abc").unwrap();
        assert_eq!(&p.glyphs[..10], &[813, 428, 103, 701, 206, 505, 788, 597, 191, 714]);
        assert_eq!(hex(&p.coordinate_sha256), "ff504d90899902cd2ec8e0c075553f65c3116a8f6c1ad3fee6907f00edaff4d6");
        assert_eq!(hex(&p.source_sha256), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    #[test]
    fn safe_edge_508_exact_vector() {
        let mut tuple = [0u8; MAX_SOURCE_BYTES];
        for (i, b) in tuple.iter_mut().enumerate() {
            *b = (i % 256) as u8;
        }
        let p = project_60d(&tuple).unwrap();
        assert_eq!(&p.glyphs[..10], &[902, 3, 689, 384, 304, 662, 46, 568, 144, 1004]);
        assert_eq!(hex(&p.coordinate_sha256), "d9c002d12a4b667b1f4f8e351e38f35d4c731e566ebd51a09e367e23470dd943");
    }

    #[test]
    fn reject_legacy_counter_truncation_lengths() {
        for len in 509usize..=512 {
            let input = [42u8; 512];
            assert_eq!(
                project_60d(&input[..len]),
                Err(ProjectionError::SourceTooLong { observed: len, allowed: 508 })
            );
        }
        assert!(project_60d(&[0u8; 513]).is_err());
    }

    #[test]
    fn deterministic_and_bounded_coordinates() {
        let first = project_60d(b"bounded-test").unwrap();
        let second = project_60d(b"bounded-test").unwrap();
        assert_eq!(first, second);
        assert!(first.glyphs.iter().all(|g| usize::from(*g) < ALPHABET_SIZE));
        assert_eq!(first.coordinate_bytes().len(), DIMENSIONS * 2);
        assert_ne!(first.source_sha256, first.coordinate_sha256);
        assert_ne!(first, project_60d(b"bounded-tesu").unwrap());
    }
}
