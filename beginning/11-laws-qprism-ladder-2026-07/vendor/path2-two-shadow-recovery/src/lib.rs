//! # path2-two-shadow-recovery — Path 2 of the shadow-resolution capstone
//!
//! Pure Rust, ZERO deps. The complement to Path 1 (content-addressed RECALL of a *retained*
//! object): here **nothing is retained.** An object is recovered from **two jointly-injective
//! lossy shadows** — each shadow alone is provably ambiguous (non-injective), the two together
//! over-determine the object and reconstruct it EXACTLY. This is the honest "double binary black
//! hole": two poles cut the fiber `P1^-1(s1) ∩ P2^-1(s2)` to a singleton.
//!
//! Mechanism: CRT over prime cylinders (the Asolaria CRT-prime-lane). For a block `x < R`:
//!   shadow1 = x mod p1,  shadow2 = x mod p2  (p1,p2 coprime).
//!   If `p1*p2 >= R` the pair uniquely determines `x` (CRT) — exact recovery, NO STORE.
//!   If `p1*p2 < R` the two shadows don't jointly carry `log2(R)` bits -> HELD (the Shannon
//!   boundary; no bijection beats it: E[bits] >= H(X)).
//!
//! Honest ledger: each residue is ~`log2(p)` bits; two shadows total `~log2(p1)+log2(p2)` bits,
//! which is `>= log2(R) = H(x)` for a uniform block — the excess is the over-determination margin
//! that buys "no store". Path 1 pays store(H(X))+tiny-address; Path 2 pays bigger-shadows/no-store.
//! Both honor Shannon. Federation form: party A holds only shadow1, party B only shadow2; neither
//! alone can reconstruct x — recovery is the consent of two independent poles.

// ------------------------------------------------------------ modular arithmetic
fn egcd(a: i128, b: i128) -> (i128, i128, i128) {
    if a == 0 { (b, 0, 1) } else { let (g, x, y) = egcd(b % a, a); (g, y - (b / a) * x, x) }
}
/// Modular inverse of `a` mod `m` (m need not be prime; returns None if not invertible).
pub fn mod_inv(a: u64, m: u64) -> Option<u64> {
    if m == 0 { return None; }
    let (g, x, _) = egcd((a % m) as i128, m as i128);
    if g != 1 { return None; }
    Some((((x % m as i128) + m as i128) % m as i128) as u64)
}

// ------------------------------------------------------------ one lossy shadow
/// A single lossy shadow of `x`: its residue mod `prime`. Provably non-injective: any
/// `x' = x + k*prime` casts the SAME shadow, so one shadow alone cannot recover `x`.
pub fn shadow(x: u128, prime: u64) -> u64 {
    (x % prime as u128) as u64
}

// ------------------------------------------------------------ two-shadow recovery
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Held {
    /// The two shadows do not jointly carry log2(range) bits: p1*p2 < range (Shannon boundary).
    InsufficientJointCapacity,
    /// The moduli are not coprime, so CRT has no unique solution.
    NonCoprimeModuli,
}

/// CRT over two coprime moduli: the unique `x` in `[0, p1*p2)` with `x ≡ s1 (p1)`, `x ≡ s2 (p2)`.
pub fn crt2(s1: u64, p1: u64, s2: u64, p2: u64) -> Result<u128, Held> {
    let inv = mod_inv(p1 % p2, p2).ok_or(Held::NonCoprimeModuli)?; // p1^-1 mod p2
    let diff = (((s2 as i128 - s1 as i128) % p2 as i128) + p2 as i128) % p2 as i128;
    let t = (diff as u128 * inv as u128) % p2 as u128;
    Ok(s1 as u128 + p1 as u128 * t) // in [0, p1*p2)
}

/// Recover `x < range` from its two lossy shadows, WITHOUT a store. `Held` iff the two shadows
/// don't jointly over-determine `x` (p1*p2 < range) — the honest Shannon wall.
pub fn two_shadow_recover(s1: u64, p1: u64, s2: u64, p2: u64, range: u128) -> Result<u128, Held> {
    if (p1 as u128) * (p2 as u128) < range {
        return Err(Held::InsufficientJointCapacity);
    }
    crt2(s1, p1, s2, p2)
}

// ------------------------------------------------------------ bytes generalization
/// A two-shadow codec over prime cylinders for arbitrary byte objects. `block_bytes`-sized
/// blocks are each shadowed by residues mod `p1` and `p2`; recovery is per-block CRT.
/// Invariant checked at construction: `p1*p2 >= 2^(8*block_bytes)` (else recovery would be lossy).
#[derive(Debug, Clone, Copy)]
pub struct TwoShadow {
    pub p1: u64,
    pub p2: u64,
    pub block_bytes: usize,
}

/// The two lossy shadows of an object, plus its length (to strip the final pad). Neither
/// `shadow_a` nor `shadow_b` alone can reconstruct the object.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Shadows {
    pub shadow_a: Vec<u64>, // party-A pole: residues mod p1
    pub shadow_b: Vec<u64>, // party-B pole: residues mod p2
    pub orig_len: usize,
}

impl TwoShadow {
    /// Default prime cylinders (~2^25 each; product ~2^50 > 2^48 for 6-byte blocks).
    pub const P1: u64 = 33_554_467; // prime just above 2^25
    pub const P2: u64 = 33_554_393; // prime just below 2^25 (coprime to P1)

    pub fn new() -> Self {
        TwoShadow { p1: Self::P1, p2: Self::P2, block_bytes: 6 }
    }

    fn block_range(&self) -> u128 {
        1u128 << (8 * self.block_bytes as u32)
    }
    /// True iff the two cylinders jointly cover a block (recovery will be exact).
    pub fn sufficient(&self) -> bool {
        (self.p1 as u128) * (self.p2 as u128) >= self.block_range()
    }

    fn blocks(&self, data: &[u8]) -> Vec<u128> {
        let bb = self.block_bytes;
        let mut out = Vec::new();
        for chunk in data.chunks(bb) {
            let mut v: u128 = 0;
            for &b in chunk {
                v = (v << 8) | b as u128;
            }
            // left-justify short final chunk so the value stays < block_range and round-trips via orig_len
            if chunk.len() < bb {
                v <<= 8 * (bb - chunk.len()) as u32;
            }
            out.push(v);
        }
        out
    }

    /// Project an object into its TWO lossy shadows (no store; the object is not retained).
    pub fn project(&self, data: &[u8]) -> Shadows {
        let blocks = self.blocks(data);
        Shadows {
            shadow_a: blocks.iter().map(|&b| shadow(b, self.p1)).collect(),
            shadow_b: blocks.iter().map(|&b| shadow(b, self.p2)).collect(),
            orig_len: data.len(),
        }
    }

    /// Recover the EXACT object from its two shadows, WITHOUT a store. `Held` if the cylinders
    /// are insufficient (Shannon) or the shadows don't align.
    pub fn recover(&self, sh: &Shadows) -> Result<Vec<u8>, Held> {
        if !self.sufficient() {
            return Err(Held::InsufficientJointCapacity);
        }
        if sh.shadow_a.len() != sh.shadow_b.len() {
            return Err(Held::NonCoprimeModuli);
        }
        let bb = self.block_bytes;
        let range = self.block_range();
        let mut out = Vec::with_capacity(sh.shadow_a.len() * bb);
        for (&a, &b) in sh.shadow_a.iter().zip(sh.shadow_b.iter()) {
            let x = two_shadow_recover(a, self.p1, b, self.p2, range)?;
            // big-endian bytes of the bb-byte block
            for i in (0..bb).rev() {
                out.push(((x >> (8 * i as u32)) & 0xFF) as u8);
            }
        }
        out.truncate(sh.orig_len);
        Ok(out)
    }
}

impl Default for TwoShadow {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================ unit tests
#[cfg(test)]
mod unit {
    use super::*;

    #[test]
    fn one_shadow_is_lossy_non_injective() {
        // x and x+p cast the SAME shadow -> a single shadow cannot recover x
        let p = TwoShadow::P1;
        let x = 123_456_789u128;
        assert_eq!(shadow(x, p), shadow(x + p as u128, p));
        assert_eq!(shadow(x, p), shadow(x + 7 * p as u128, p));
    }

    #[test]
    fn two_shadows_recover_exactly_no_store() {
        let (p1, p2) = (TwoShadow::P1, TwoShadow::P2);
        let range = 1u128 << 48;
        for x in [0u128, 1, 255, 1 << 24, (1u128 << 48) - 1, 987_654_321_012] {
            let s1 = shadow(x, p1);
            let s2 = shadow(x, p2);
            assert_eq!(two_shadow_recover(s1, p1, s2, p2, range), Ok(x), "x={x}");
        }
    }

    #[test]
    fn insufficient_joint_capacity_is_held_shannon_wall() {
        // two tiny primes cannot jointly carry a 48-bit block
        let (p1, p2) = (251u64, 257u64); // product 64507 << 2^48
        let range = 1u128 << 48;
        assert_eq!(two_shadow_recover(3, p1, 5, p2, range), Err(Held::InsufficientJointCapacity));
    }

    #[test]
    fn bytes_roundtrip_recovers_without_store() {
        let ts = TwoShadow::new();
        assert!(ts.sufficient());
        for data in [
            &b""[..],
            &b"a"[..],
            &b"double binary black hole"[..],
            &vec![0xABu8; 200][..],
            &(0..255u16).map(|i| (i * 7) as u8).collect::<Vec<u8>>()[..],
        ] {
            let sh = ts.project(data);
            assert_eq!(ts.recover(&sh).unwrap(), data, "len={}", data.len());
        }
    }

    #[test]
    fn neither_pole_alone_can_reconstruct() {
        // party A holds only shadow_a, party B only shadow_b. A single pole leaves each block
        // ambiguous across ~2^23 candidates -> reconstruction needs BOTH (the double-binary consent).
        let ts = TwoShadow::new();
        let data = b"only the two poles together recover this";
        let sh = ts.project(data);
        // A alone: try to recover treating shadow_b as unknown/zero -> wrong bytes
        let a_only = Shadows { shadow_a: sh.shadow_a.clone(), shadow_b: vec![0; sh.shadow_b.len()], orig_len: sh.orig_len };
        assert_ne!(ts.recover(&a_only).unwrap(), data, "one pole must NOT reconstruct");
        // both poles: exact
        assert_eq!(ts.recover(&sh).unwrap(), data);
    }
}
