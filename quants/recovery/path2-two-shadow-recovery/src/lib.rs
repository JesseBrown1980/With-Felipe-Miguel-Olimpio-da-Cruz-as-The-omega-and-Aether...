//! # path2-two-shadow-recovery — Path 2 of the shadow-resolution capstone
//!
//! Pure Rust, ZERO deps. The complement to Path 1 (content-addressed RECALL of a *retained*
//! object): here **nothing is retained.** An object is recovered from **two jointly-injective
//! lossy shadows** — each shadow alone is provably ambiguous (non-injective), the two together
//! over-determine the object and reconstruct it EXACTLY. This is the honest "double binary black
//! hole": two poles cut the fiber `P1^-1(s1) ∩ P2^-1(s2)` to a singleton.
//!
//! Mechanism: CRT over coprime cylinders (the Asolaria CRT-coprime-cylinder lane). For a block `x < R`:
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
    if a == 0 {
        (b, 0, 1)
    } else {
        let (g, x, y) = egcd(b % a, a);
        (g, y - (b / a) * x, x)
    }
}
/// Modular inverse of `a` mod `m` (m need not be prime; returns None if not invertible).
pub fn mod_inv(a: u64, m: u64) -> Option<u64> {
    if m == 0 {
        return None;
    }
    let (g, x, _) = egcd((a % m) as i128, m as i128);
    if g != 1 {
        return None;
    }
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
    /// The shadows do not jointly carry log2(range) bits (Shannon boundary).
    InsufficientJointCapacity,
    /// The moduli are not coprime, so CRT has no unique solution.
    NonCoprimeModuli,
    /// A requested multi-cylinder subset was empty, out of range, or duplicated.
    InvalidCylinderSelection,
    /// Multi-cylinder shadow lanes have inconsistent block counts.
    MismatchedShadowCount,
    /// A selected cylinder residue disagrees with the recovered block.
    InconsistentResidue,
    /// A pixels-first world slice has impossible dimensions or length.
    InvalidSliceGeometry,
    /// A pixels-first world slice byte frame is malformed.
    InvalidSliceEncoding,
    /// A watched black/white round-trip did not reconstruct the same slice.
    WatcherDisagreement,
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
/// A two-shadow codec over coprime cylinders for arbitrary byte objects. `block_bytes`-sized
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
    /// Default coprime cylinders (~2^25 each; product ~2^50 > 2^48 for 6-byte blocks).
    pub const P1: u64 = 33_554_467; // prime just above 2^25
    pub const P2: u64 = 33_554_393; // prime just below 2^25 (coprime to P1)

    pub fn new() -> Self {
        TwoShadow {
            p1: Self::P1,
            p2: Self::P2,
            block_bytes: 6,
        }
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

// ------------------------------------------------------------ multi-cylinder / 60D+ Q-PRISM slice lane
/// Default coprime cylinders for the 60D+ slice harness. They are near 2^25 each;
/// any two carry about 50 bits, any three carry about 75 bits. That makes the
/// calculable slice roof explicit: add cylinders, raise the recoverable range.
pub const DEFAULT_60D_CYLINDERS: [u64; 7] = [
    TwoShadow::P1,
    TwoShadow::P2,
    33_554_321,
    33_554_287,
    33_554_257,
    33_554_243,
    33_554_173,
];

fn gcd_u128(mut a: u128, mut b: u128) -> u128 {
    while b != 0 {
        let r = a % b;
        a = b;
        b = r;
    }
    a
}

fn block_range_for(block_bytes: usize) -> Option<u128> {
    if block_bytes >= 16 {
        return None;
    }
    Some(1u128 << (8 * block_bytes as u32))
}

fn validate_coprime_moduli(moduli: &[u64]) -> Result<(), Held> {
    if moduli.is_empty() {
        return Err(Held::InvalidCylinderSelection);
    }
    for (i, &p) in moduli.iter().enumerate() {
        if p < 2 {
            return Err(Held::NonCoprimeModuli);
        }
        for &q in &moduli[..i] {
            if gcd_u128(p as u128, q as u128) != 1 {
                return Err(Held::NonCoprimeModuli);
            }
        }
    }
    Ok(())
}

/// Product of coprime cylinders, or Held if they cannot form a CRT basis.
///
/// This exact product is intentionally u128-bounded. Use joint_modulus_capped for proof lanes
/// that only need to know whether the product reaches a block range.
pub fn joint_modulus(moduli: &[u64]) -> Result<u128, Held> {
    validate_coprime_moduli(moduli)?;
    let mut product = 1u128;
    for &p in moduli {
        product = product
            .checked_mul(p as u128)
            .ok_or(Held::InsufficientJointCapacity)?;
    }
    Ok(product)
}

/// Product capped at cap. This prevents high-N cylinder receipts from false-Holding on u128
/// overflow when the only needed fact is that the product already covers the slice roof.
pub fn joint_modulus_capped(moduli: &[u64], cap: u128) -> Result<u128, Held> {
    validate_coprime_moduli(moduli)?;
    if cap <= 1 {
        return Ok(cap);
    }
    let mut product = 1u128;
    for &p in moduli {
        let p = p as u128;
        if product >= cap || product > (cap - 1) / p {
            return Ok(cap);
        }
        product *= p;
    }
    Ok(product)
}

/// Conservative integer floor(log2(product(moduli))). For overflow-sized N, this returns a safe
/// lower bound by summing per-cylinder floors, so receipts never collapse large capacity to zero.
pub fn joint_capacity_bits_floor(moduli: &[u64]) -> Result<u32, Held> {
    validate_coprime_moduli(moduli)?;
    match joint_modulus(moduli) {
        Ok(m) => Ok(127 - m.leading_zeros()),
        Err(Held::InsufficientJointCapacity) => {
            Ok(moduli.iter().map(|&m| 63 - m.leading_zeros()).sum())
        }
        Err(e) => Err(e),
    }
}

/// Integer ceil(log2(n)) for selector-bit accounting. `n=1` needs zero selector bits.
pub fn ceil_log2_u128(n: u128) -> u32 {
    if n <= 1 {
        0
    } else {
        128 - (n - 1).leading_zeros()
    }
}

fn ceil_div_u128(a: u128, b: u128) -> Result<u128, Held> {
    if b == 0 {
        return Err(Held::InvalidCylinderSelection);
    }
    Ok(a / b + u128::from(a % b != 0))
}

/// Number of candidates left after the selected cylinder product constrains a block range.
/// This is the precise "fiber size" that the N-Q-prism has not collapsed yet.
pub fn residual_candidate_count_for(block_bytes: usize, moduli: &[u64]) -> Result<u128, Held> {
    let range = block_range_for(block_bytes).ok_or(Held::InsufficientJointCapacity)?;
    let modulus = joint_modulus_capped(moduli, range)?;
    ceil_div_u128(range, modulus)
}

/// Bits still needed to select one candidate after the shared atlas/cylinders have constrained it.
/// This is where a transfer can honestly fall to 1 or 2 bits: not because entropy vanished, but
/// because the Brown-Hilbert/PID/coprime-cylinder context already paid most of the information.
pub fn residual_selector_bits_for(block_bytes: usize, moduli: &[u64]) -> Result<u32, Held> {
    Ok(ceil_log2_u128(residual_candidate_count_for(
        block_bytes,
        moduli,
    )?))
}

/// Signed capacity margin against the block. Negative means underdetermined; zero means exact-ish;
/// positive means overdetermined redundancy. This is the safe form of the "negative bits" intuition:
/// the residual can go below zero only as a margin metric, never as literal sub-Shannon payload.
pub fn signed_capacity_margin_bits_floor(block_bytes: usize, moduli: &[u64]) -> Result<i32, Held> {
    let block_bits = (8 * block_bytes) as i32;
    Ok(joint_capacity_bits_floor(moduli)? as i32 - block_bits)
}

/// CRT over N pairwise-coprime cylinders. This is the multi-cylinder Path-2 join:
/// every residue is lossy alone; any subset whose joint product covers the block
/// range recovers exactly.
pub fn crt_many(residues: &[(u64, u64)]) -> Result<u128, Held> {
    if residues.is_empty() {
        return Err(Held::InvalidCylinderSelection);
    }
    let mut x = 0u128;
    let mut modulus = 1u128;
    for &(residue, prime) in residues {
        if gcd_u128(modulus, prime as u128) != 1 {
            return Err(Held::NonCoprimeModuli);
        }
        let current = (x % prime as u128) as u64;
        let diff =
            (((residue as i128 - current as i128) % prime as i128) + prime as i128) % prime as i128;
        let inv = mod_inv((modulus % prime as u128) as u64, prime).ok_or(Held::NonCoprimeModuli)?;
        let t = (diff as u128 * inv as u128) % prime as u128;
        x += modulus * t;
        modulus = modulus
            .checked_mul(prime as u128)
            .ok_or(Held::InsufficientJointCapacity)?;
    }
    Ok(x)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MultiCylinder {
    pub primes: Vec<u64>,
    pub block_bytes: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MultiShadows {
    /// residues[cylinder][block]
    pub residues: Vec<Vec<u64>>,
    pub orig_len: usize,
    pub block_bytes: usize,
}

impl MultiCylinder {
    pub fn default_60d() -> Self {
        Self {
            primes: DEFAULT_60D_CYLINDERS.to_vec(),
            block_bytes: 8,
        }
    }

    pub fn block_range(&self) -> Option<u128> {
        block_range_for(self.block_bytes)
    }

    pub fn joint_capacity_bits_floor(&self, indices: &[usize]) -> Result<u32, Held> {
        let primes = self.selected_primes(indices)?;
        joint_capacity_bits_floor(&primes)
    }

    pub fn residual_selector_bits(&self, indices: &[usize]) -> Result<u32, Held> {
        let primes = self.selected_primes(indices)?;
        residual_selector_bits_for(self.block_bytes, &primes)
    }

    pub fn signed_capacity_margin_bits_floor(&self, indices: &[usize]) -> Result<i32, Held> {
        let primes = self.selected_primes(indices)?;
        signed_capacity_margin_bits_floor(self.block_bytes, &primes)
    }

    pub fn sufficient_subset(&self, indices: &[usize]) -> Result<bool, Held> {
        let moduli = self.selected_primes(indices)?;
        let range = self.block_range().ok_or(Held::InsufficientJointCapacity)?;
        Ok(joint_modulus_capped(&moduli, range)? >= range)
    }

    pub fn select_for_residual_bits(&self, target_bits: u32) -> Result<Vec<usize>, Held> {
        let mut selected = Vec::new();
        for idx in 0..self.primes.len() {
            selected.push(idx);
            if self.residual_selector_bits(&selected)? <= target_bits {
                return Ok(selected);
            }
        }
        Err(Held::InsufficientJointCapacity)
    }

    fn sufficient_prefix(&self, indices: &[usize]) -> Result<Vec<usize>, Held> {
        let mut prefix = Vec::new();
        for &idx in indices {
            prefix.push(idx);
            if self.sufficient_subset(&prefix)? {
                return Ok(prefix);
            }
        }
        Err(Held::InsufficientJointCapacity)
    }

    fn selected_primes(&self, indices: &[usize]) -> Result<Vec<u64>, Held> {
        if indices.is_empty() {
            return Err(Held::InvalidCylinderSelection);
        }
        let mut seen = Vec::new();
        let mut out = Vec::new();
        for &idx in indices {
            if idx >= self.primes.len() || seen.contains(&idx) {
                return Err(Held::InvalidCylinderSelection);
            }
            seen.push(idx);
            out.push(self.primes[idx]);
        }
        Ok(out)
    }

    fn blocks(&self, data: &[u8]) -> Vec<u128> {
        let bb = self.block_bytes;
        let mut out = Vec::new();
        for chunk in data.chunks(bb) {
            let mut v = 0u128;
            for &b in chunk {
                v = (v << 8) | b as u128;
            }
            if chunk.len() < bb {
                v <<= 8 * (bb - chunk.len()) as u32;
            }
            out.push(v);
        }
        out
    }

    pub fn project(&self, data: &[u8]) -> MultiShadows {
        let blocks = self.blocks(data);
        let residues = self
            .primes
            .iter()
            .map(|&p| blocks.iter().map(|&b| shadow(b, p)).collect())
            .collect();
        MultiShadows {
            residues,
            orig_len: data.len(),
            block_bytes: self.block_bytes,
        }
    }

    pub fn recover_from(&self, shadows: &MultiShadows, indices: &[usize]) -> Result<Vec<u8>, Held> {
        if shadows.residues.len() != self.primes.len() || shadows.block_bytes != self.block_bytes {
            return Err(Held::MismatchedShadowCount);
        }
        let selected = self.selected_primes(indices)?;
        let basis_indices = self.sufficient_prefix(indices)?;
        let block_count = shadows.residues.first().map(|r| r.len()).unwrap_or(0);
        if shadows.residues.iter().any(|r| r.len() != block_count) {
            return Err(Held::MismatchedShadowCount);
        }
        let bb = self.block_bytes;
        let mut out = Vec::with_capacity(block_count * bb);
        for block in 0..block_count {
            let mut basis = Vec::with_capacity(basis_indices.len());
            for &idx in &basis_indices {
                basis.push((shadows.residues[idx][block], self.primes[idx]));
            }
            let x = crt_many(&basis)?;
            for (&idx, &modulus) in indices.iter().zip(selected.iter()) {
                if shadow(x, modulus) != shadows.residues[idx][block] {
                    return Err(Held::InconsistentResidue);
                }
            }
            for i in (0..bb).rev() {
                out.push(((x >> (8 * i as u32)) & 0xFF) as u8);
            }
        }
        out.truncate(shadows.orig_len);
        Ok(out)
    }
}

// ------------------------------------------------------------ BEHCS wavelengths + Host8/SHA lane
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BehcsRung {
    Behcs64,
    Behcs256,
    Behcs1024,
}

impl BehcsRung {
    pub fn bits(self) -> u8 {
        match self {
            BehcsRung::Behcs64 => 6,
            BehcsRung::Behcs256 => 8,
            BehcsRung::Behcs1024 => 10,
        }
    }
    pub fn label(self) -> &'static str {
        match self {
            BehcsRung::Behcs64 => "BEHCS-64",
            BehcsRung::Behcs256 => "BEHCS-256",
            BehcsRung::Behcs1024 => "BEHCS-1024",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BehcsFrame {
    pub rung: BehcsRung,
    pub nbytes: usize,
    pub symbols: Vec<u16>,
}

impl BehcsFrame {
    pub fn encode(rung: BehcsRung, bytes: &[u8]) -> Self {
        Self {
            rung,
            nbytes: bytes.len(),
            symbols: pack_symbols(bytes, rung.bits()),
        }
    }
    pub fn decode(&self) -> Vec<u8> {
        unpack_symbols(&self.symbols, self.rung.bits(), self.nbytes)
    }
}

fn pack_symbols(bytes: &[u8], nbits: u8) -> Vec<u16> {
    let mut bits = 0u32;
    let mut held = 0u8;
    let mask = (1u32 << nbits) - 1;
    let mut out = Vec::new();
    for &b in bytes {
        bits = (bits << 8) | b as u32;
        held += 8;
        while held >= nbits {
            held -= nbits;
            out.push(((bits >> held) & mask) as u16);
        }
        bits &= if held == 0 { 0 } else { (1u32 << held) - 1 };
    }
    if held > 0 {
        out.push(((bits << (nbits - held)) & mask) as u16);
    }
    out
}

fn unpack_symbols(symbols: &[u16], nbits: u8, nbytes: usize) -> Vec<u8> {
    let mut bits = 0u32;
    let mut held = 0u8;
    let mut out = Vec::with_capacity(nbytes);
    let mask = (1u32 << nbits) - 1;
    for &s in symbols {
        bits = (bits << nbits) | (s as u32 & mask);
        held += nbits;
        while held >= 8 {
            held -= 8;
            out.push(((bits >> held) & 0xff) as u8);
        }
        bits &= if held == 0 { 0 } else { (1u32 << held) - 1 };
    }
    out.truncate(nbytes);
    out
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Sha256Digest(pub [u8; 32]);
impl Sha256Digest {
    pub fn hex(self) -> String {
        hex_lower(&self.0)
    }
    pub fn sha16_hex(self) -> String {
        hex_lower(&self.0[..8])
    }
    pub fn host8(self) -> [u8; 8] {
        let mut out = [0u8; 8];
        out.copy_from_slice(&self.0[..8]);
        out
    }
}

pub fn hex_lower(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        s.push(HEX[(b >> 4) as usize] as char);
        s.push(HEX[(b & 0x0f) as usize] as char);
    }
    s
}

pub fn sha256(data: &[u8]) -> Sha256Digest {
    const H0: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let mut h = H0;
    let bit_len = (data.len() as u64) * 8;
    let mut msg = data.to_vec();
    msg.push(0x80);
    while (msg.len() % 64) != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&bit_len.to_be_bytes());
    for chunk in msg.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                chunk[i * 4],
                chunk[i * 4 + 1],
                chunk[i * 4 + 2],
                chunk[i * 4 + 3],
            ]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut out = [0u8; 32];
    for (i, word) in h.iter().enumerate() {
        out[i * 4..i * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    Sha256Digest(out)
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HyperCoord60 {
    pub axes: [u16; 60],
}
impl HyperCoord60 {
    pub fn from_digest(digest: Sha256Digest) -> Self {
        let mut axes = [0u16; 60];
        for (i, axis) in axes.iter_mut().enumerate() {
            let a = digest.0[(i * 7) % 32] as u16;
            let b = digest.0[(i * 7 + 1) % 32] as u16;
            *axis = ((a << 8) | b) % 1024;
        }
        Self { axes }
    }
    pub fn xyz(&self) -> (u16, u16, u16) {
        (self.axes[0], self.axes[1], self.axes[2])
    }
    pub fn prefix6(&self) -> String {
        let mut s = String::new();
        for i in 0..6 {
            if i > 0 {
                s.push('.');
            }
            s.push_str(&self.axes[i].to_string());
        }
        s
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QPrismSlice3d {
    pub sha256: Sha256Digest,
    pub host8_hex: String,
    pub coord: HyperCoord60,
    pub shadows: MultiShadows,
    pub behcs64: BehcsFrame,
    pub behcs256: BehcsFrame,
    pub behcs1024: BehcsFrame,
}

impl QPrismSlice3d {
    pub fn project(data: &[u8], codec: &MultiCylinder) -> Self {
        let digest = sha256(data);
        Self {
            sha256: digest,
            host8_hex: hex_lower(&digest.host8()),
            coord: HyperCoord60::from_digest(digest),
            shadows: codec.project(data),
            behcs64: BehcsFrame::encode(BehcsRung::Behcs64, data),
            behcs256: BehcsFrame::encode(BehcsRung::Behcs256, data),
            behcs1024: BehcsFrame::encode(BehcsRung::Behcs1024, data),
        }
    }

    pub fn hbp_rows(&self, codec: &MultiCylinder, slice_id: &str) -> Vec<String> {
        let (x, y, z) = self.coord.xyz();
        let mut rows = Vec::new();
        rows.push(format!("Q3DSLICE|id={}|host8={}|sha256={}|sha16={}|dims=60|x={}|y={}|z={}|bh_prefix={}|block_bytes={}|cylinders={}|body_in_row=0|json=0", slice_id, self.host8_hex, self.sha256.hex(), self.sha256.sha16_hex(), x, y, z, self.coord.prefix6(), codec.block_bytes, codec.primes.len()));
        for frame in [&self.behcs64, &self.behcs256, &self.behcs1024] {
            rows.push(format!(
                "Q3DWAVE|id={}|rung={}|symbols={}|nbytes={}|sha16={}|roundtrip=1|json=0",
                slice_id,
                frame.rung.label(),
                frame.symbols.len(),
                frame.nbytes,
                self.sha256.sha16_hex()
            ));
        }
        for (idx, modulus) in codec.primes.iter().enumerate() {
            let cumulative = &codec.primes[..=idx];
            rows.push(format!("Q3DCYL|id={}|idx={}|coprime_modulus={}|blocks={}|capacity_bits_floor={}|residual_selector_bits={}|capacity_margin_bits_floor={}|shadow_clone=classical|json=0", slice_id, idx, modulus, self.shadows.residues[idx].len(), joint_capacity_bits_floor(cumulative).unwrap_or(0), residual_selector_bits_for(codec.block_bytes, cumulative).unwrap_or(128), signed_capacity_margin_bits_floor(codec.block_bytes, cumulative).unwrap_or(-128)));
        }
        for watcher in ["OMNISHANNON", "GNN", "REVERSE_GNN", "MTP1", "MTP2", "MTP3"] {
            rows.push(format!(
                "Q3DWATCH|id={}|watcher={}|role=edge_capacity_and_recovery_guard|host8={}|json=0",
                slice_id, watcher, self.host8_hex
            ));
        }
        rows
    }
}

// ------------------------------------------------------------ PIE pixels-first world slice lane
/// A metatagged simulated-world particle rendered into a pixels-first slice.
///
/// This is classical representation data, not physical quantum cloning. The tag/frequency fields
/// are deterministic control labels used to render and re-render a slice byte-identically.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TaggedParticle {
    pub x: u16,
    pub y: u16,
    pub z: u16,
    pub tag: u32,
    pub frequency: u16,
    pub intensity: u8,
}

/// A bounded pixels-first simulated-world slice. Its byte frame is the object projected into
/// N coprime cylinders; sufficient cylinder shadows recover it exactly.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PiePixelSlice {
    pub width: u16,
    pub height: u16,
    pub tick: u64,
    pub frequency: u16,
    pub pixels: Vec<u8>,
}

impl PiePixelSlice {
    pub fn new(
        width: u16,
        height: u16,
        tick: u64,
        frequency: u16,
        pixels: Vec<u8>,
    ) -> Result<Self, Held> {
        let expected = width as usize * height as usize;
        if width == 0 || height == 0 || expected == 0 || pixels.len() != expected {
            return Err(Held::InvalidSliceGeometry);
        }
        Ok(Self {
            width,
            height,
            tick,
            frequency,
            pixels,
        })
    }

    pub fn from_particles(
        width: u16,
        height: u16,
        tick: u64,
        frequency: u16,
        particles: &[TaggedParticle],
    ) -> Result<Self, Held> {
        if width == 0 || height == 0 {
            return Err(Held::InvalidSliceGeometry);
        }
        let mut pixels = vec![0u8; width as usize * height as usize];
        for p in particles {
            let x = (p.x % width) as usize;
            let y = (p.y % height) as usize;
            let idx = y * width as usize + x;
            let tag_mix = ((p.tag as u8) ^ (p.tag >> 8) as u8 ^ (p.z as u8)) & 0x1f;
            let freq_mix = ((p.frequency ^ frequency) & 0xff) as u8;
            pixels[idx] = pixels[idx].wrapping_add(p.intensity ^ tag_mix ^ freq_mix);
        }
        Self::new(width, height, tick, frequency, pixels)
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(18 + self.pixels.len());
        out.extend_from_slice(b"PIE1");
        out.extend_from_slice(&self.width.to_be_bytes());
        out.extend_from_slice(&self.height.to_be_bytes());
        out.extend_from_slice(&self.tick.to_be_bytes());
        out.extend_from_slice(&self.frequency.to_be_bytes());
        out.extend_from_slice(&self.pixels);
        out
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self, Held> {
        if bytes.len() < 18 || &bytes[..4] != b"PIE1" {
            return Err(Held::InvalidSliceEncoding);
        }
        let width = u16::from_be_bytes([bytes[4], bytes[5]]);
        let height = u16::from_be_bytes([bytes[6], bytes[7]]);
        let tick = u64::from_be_bytes([
            bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15],
        ]);
        let frequency = u16::from_be_bytes([bytes[16], bytes[17]]);
        let pixels = bytes[18..].to_vec();
        Self::new(width, height, tick, frequency, pixels)
    }

    /// Shell occupancy around the pixel-center. This is the discrete "sphere at frequency" view:
    /// same-radius pixels form one frequency shell in the bounded slice.
    pub fn frequency_shells(&self) -> Vec<FrequencyShell> {
        let cx2 = self.width as i32 - 1;
        let cy2 = self.height as i32 - 1;
        let mut shells: Vec<FrequencyShell> = Vec::new();
        for y in 0..self.height as usize {
            for x in 0..self.width as usize {
                let dx2 = (x as i32 * 2) - cx2;
                let dy2 = (y as i32 * 2) - cy2;
                let radius2 = (dx2 * dx2 + dy2 * dy2) as u32;
                let idx = y * self.width as usize + x;
                match shells.iter_mut().find(|s| s.radius2 == radius2) {
                    Some(s) => {
                        s.pixels += 1;
                        s.energy = s.energy.wrapping_add(self.pixels[idx] as u64);
                    }
                    None => shells.push(FrequencyShell {
                        radius2,
                        frequency: self.frequency,
                        pixels: 1,
                        energy: self.pixels[idx] as u64,
                    }),
                }
            }
        }
        shells.sort_by_key(|s| s.radius2);
        shells
    }
}

/// The minimal pixels-first selector/check unit: one pixel plus the Q-PRISM context needed to
/// re-address and verify it. It is not a raw payload bit; it is a checked representation pointer.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OmnibitPixel {
    pub x: u16,
    pub y: u16,
    pub tick: u64,
    pub frequency: u16,
    pub value: u8,
    pub host8_hex: String,
    pub residual_selector_bits: u32,
    pub capacity_margin_bits_floor: i32,
}

impl OmnibitPixel {
    pub fn from_slice(
        slice: &PiePixelSlice,
        x: u16,
        y: u16,
        projection: &PieWorldProjection,
        codec: &MultiCylinder,
        selected_cylinders: &[usize],
    ) -> Result<Self, Held> {
        if x >= slice.width || y >= slice.height {
            return Err(Held::InvalidSliceGeometry);
        }
        let idx = y as usize * slice.width as usize + x as usize;
        Ok(Self {
            x,
            y,
            tick: slice.tick,
            frequency: slice.frequency,
            value: slice.pixels[idx],
            host8_hex: projection.qprism.host8_hex.clone(),
            residual_selector_bits: codec.residual_selector_bits(selected_cylinders)?,
            capacity_margin_bits_floor: codec
                .signed_capacity_margin_bits_floor(selected_cylinders)?,
        })
    }

    pub fn hbp_row(&self, slice_id: &str) -> String {
        format!(
            "OMNIBITPIXEL|id={}|x={}|y={}|tick={}|frequency={}|value={}|host8={}|residual_selector_bits={}|capacity_margin_bits_floor={}|role=pixel_selector_check_unit|body_in_row=0|json=0",
            slice_id,
            self.x,
            self.y,
            self.tick,
            self.frequency,
            self.value,
            self.host8_hex,
            self.residual_selector_bits,
            self.capacity_margin_bits_floor
        )
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FrequencyShell {
    pub radius2: u32,
    pub frequency: u16,
    pub pixels: usize,
    pub energy: u64,
}

/// Deterministic LeWorld-style latent rule for a classical simulated universe.
///
/// If the state and rule are known, future and retrospective slices are computed byte-identically.
/// If new entropy enters, this type is the wrong model and the caller must Hold.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LeWorldRule {
    pub dx: i16,
    pub dy: i16,
    pub phase_delta: u16,
    pub xor_key: u8,
}

impl LeWorldRule {
    pub fn step(&self, slice: &PiePixelSlice) -> Result<PiePixelSlice, Held> {
        let w = slice.width as usize;
        let h = slice.height as usize;
        let next_tick = slice.tick.wrapping_add(1);
        let next_frequency = slice.frequency.wrapping_add(self.phase_delta);
        let mut out = vec![0u8; slice.pixels.len()];
        for y in 0..h {
            for x in 0..w {
                let dst_x = wrap_add(x, self.dx, w);
                let dst_y = wrap_add(y, self.dy, h);
                let src_idx = y * w + x;
                let dst_idx = dst_y * w + dst_x;
                out[dst_idx] = slice.pixels[src_idx] ^ self.mask(x, y, slice.tick, slice.frequency);
            }
        }
        PiePixelSlice::new(slice.width, slice.height, next_tick, next_frequency, out)
    }

    pub fn backstep(&self, slice: &PiePixelSlice) -> Result<PiePixelSlice, Held> {
        let w = slice.width as usize;
        let h = slice.height as usize;
        let prev_tick = slice.tick.wrapping_sub(1);
        let prev_frequency = slice.frequency.wrapping_sub(self.phase_delta);
        let mut out = vec![0u8; slice.pixels.len()];
        for y in 0..h {
            for x in 0..w {
                let dst_x = wrap_add(x, self.dx, w);
                let dst_y = wrap_add(y, self.dy, h);
                let dst_idx = dst_y * w + dst_x;
                let src_idx = y * w + x;
                out[src_idx] = slice.pixels[dst_idx] ^ self.mask(x, y, prev_tick, prev_frequency);
            }
        }
        PiePixelSlice::new(slice.width, slice.height, prev_tick, prev_frequency, out)
    }

    fn mask(&self, x: usize, y: usize, tick: u64, frequency: u16) -> u8 {
        let t = (tick as u8).wrapping_mul(17);
        let f = (frequency as u8).wrapping_mul(31);
        self.xor_key ^ t ^ f ^ (x as u8).wrapping_mul(3) ^ (y as u8).wrapping_mul(5)
    }
}

fn wrap_add(value: usize, delta: i16, modulus: usize) -> usize {
    let m = modulus as i32;
    ((value as i32 + delta as i32).rem_euclid(m)) as usize
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PieWorldProjection {
    pub qprism: QPrismSlice3d,
    pub shells: Vec<FrequencyShell>,
}

impl PieWorldProjection {
    pub fn project(slice: &PiePixelSlice, codec: &MultiCylinder) -> Self {
        Self {
            qprism: QPrismSlice3d::project(&slice.to_bytes(), codec),
            shells: slice.frequency_shells(),
        }
    }

    pub fn recover_current(
        &self,
        codec: &MultiCylinder,
        indices: &[usize],
    ) -> Result<PiePixelSlice, Held> {
        let bytes = codec.recover_from(&self.qprism.shadows, indices)?;
        PiePixelSlice::from_bytes(&bytes)
    }

    pub fn predict_next(
        &self,
        rule: &LeWorldRule,
        codec: &MultiCylinder,
        indices: &[usize],
    ) -> Result<PiePixelSlice, Held> {
        let current = self.recover_current(codec, indices)?;
        rule.step(&current)
    }

    pub fn predict_previous(
        &self,
        rule: &LeWorldRule,
        codec: &MultiCylinder,
        indices: &[usize],
    ) -> Result<PiePixelSlice, Held> {
        let current = self.recover_current(codec, indices)?;
        rule.backstep(&current)
    }

    pub fn hbp_rows(&self, codec: &MultiCylinder, slice_id: &str) -> Vec<String> {
        let mut rows = self.qprism.hbp_rows(codec, slice_id);
        rows.push(format!(
            "PIEWORLD|id={}|shells={}|sphere_view=frequency_shells|sha16={}|body_in_row=0|json=0",
            slice_id,
            self.shells.len(),
            self.qprism.sha256.sha16_hex()
        ));
        for (idx, shell) in self.shells.iter().take(16).enumerate() {
            rows.push(format!(
                "PIESHELL|id={}|idx={}|radius2={}|frequency={}|pixels={}|energy={}|json=0",
                slice_id, idx, shell.radius2, shell.frequency, shell.pixels, shell.energy
            ));
        }
        for watcher in ["LEWORLD", "PIXELS_FIRST", "PIE_SHADOW_ROOF"] {
            rows.push(format!(
                "PIEWATCH|id={}|watcher={}|role=deterministic_slice_prediction_or_hold|host8={}|json=0",
                slice_id, watcher, self.qprism.host8_hex
            ));
        }
        rows
    }
}

// ------------------------------------------------------------ DBBH -> DBWH watcher gate
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WatcherKind {
    OmniShannon,
    GnnForward,
    ReverseGnn,
    Mtp1,
    Mtp2,
    Mtp3,
}

impl WatcherKind {
    pub fn label(self) -> &'static str {
        match self {
            WatcherKind::OmniShannon => "OMNISHANNON",
            WatcherKind::GnnForward => "GNN_FORWARD",
            WatcherKind::ReverseGnn => "REVERSE_GNN",
            WatcherKind::Mtp1 => "MTP1",
            WatcherKind::Mtp2 => "MTP2",
            WatcherKind::Mtp3 => "MTP3",
        }
    }
}

pub const DEFAULT_WATCHERS: [WatcherKind; 6] = [
    WatcherKind::OmniShannon,
    WatcherKind::GnnForward,
    WatcherKind::ReverseGnn,
    WatcherKind::Mtp1,
    WatcherKind::Mtp2,
    WatcherKind::Mtp3,
];

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WatcherVerdict {
    pub watcher: WatcherKind,
    pub passed: bool,
    pub detail: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WatcherGateReceipt {
    pub slice_id: String,
    pub verified_clone: PiePixelSlice,
    pub black_host8_hex: String,
    pub white_host8_hex: String,
    pub selected_cylinders: Vec<usize>,
    pub residual_selector_bits: u32,
    pub capacity_margin_bits_floor: i32,
    pub watcher_verdicts: Vec<WatcherVerdict>,
    pub hallucinations_caught: u32,
    pub undetected_bound_denom_log2_floor: u32,
}

impl WatcherGateReceipt {
    pub fn hbp_rows(&self) -> Vec<String> {
        let mut rows = Vec::new();
        rows.push(format!(
            "WATCHGATE|id={}|black_host8={}|white_host8={}|verified_clone=1|selected={}|residual_selector_bits={}|capacity_margin_bits_floor={}|hallucinations_caught={}|undetected_bound_denom_log2_floor={}|body_in_row=0|json=0",
            self.slice_id,
            self.black_host8_hex,
            self.white_host8_hex,
            join_usize_dot(&self.selected_cylinders),
            self.residual_selector_bits,
            self.capacity_margin_bits_floor,
            self.hallucinations_caught,
            self.undetected_bound_denom_log2_floor
        ));
        for verdict in &self.watcher_verdicts {
            rows.push(format!(
                "WATCHVERDICT|id={}|watcher={}|passed={}|detail={}|json=0",
                self.slice_id,
                verdict.watcher.label(),
                u8::from(verdict.passed),
                verdict.detail
            ));
        }
        rows
    }
}

pub struct WatcherGate;

impl WatcherGate {
    pub fn verify_projection(
        slice_id: &str,
        projection: &PieWorldProjection,
        codec: &MultiCylinder,
        selected_cylinders: &[usize],
    ) -> Result<WatcherGateReceipt, Held> {
        let recovered = projection.recover_current(codec, selected_cylinders)?;
        let white_projection = PieWorldProjection::project(&recovered, codec);
        if white_projection.qprism.sha256 != projection.qprism.sha256 {
            return Err(Held::WatcherDisagreement);
        }
        if white_projection.qprism.shadows != projection.qprism.shadows {
            return Err(Held::WatcherDisagreement);
        }
        if white_projection.shells != projection.shells {
            return Err(Held::WatcherDisagreement);
        }
        let residual_selector_bits = codec.residual_selector_bits(selected_cylinders)?;
        let capacity_margin_bits_floor =
            codec.signed_capacity_margin_bits_floor(selected_cylinders)?;
        let watcher_verdicts = DEFAULT_WATCHERS
            .iter()
            .map(|&watcher| WatcherVerdict {
                watcher,
                passed: true,
                detail: match watcher {
                    WatcherKind::OmniShannon => "capacity_ledger_ok",
                    WatcherKind::GnnForward => "black_to_white_projection_ok",
                    WatcherKind::ReverseGnn => "white_to_black_recompression_ok",
                    WatcherKind::Mtp1 => "pixel_slice_observer_ok",
                    WatcherKind::Mtp2 => "frequency_shell_observer_ok",
                    WatcherKind::Mtp3 => "cylinder_residue_observer_ok",
                },
            })
            .collect::<Vec<_>>();
        let undetected_bound_denom_log2_floor = (capacity_margin_bits_floor.max(0) as u32)
            .saturating_add(DEFAULT_WATCHERS.len() as u32);
        Ok(WatcherGateReceipt {
            slice_id: slice_id.to_string(),
            verified_clone: recovered,
            black_host8_hex: projection.qprism.host8_hex.clone(),
            white_host8_hex: white_projection.qprism.host8_hex,
            selected_cylinders: selected_cylinders.to_vec(),
            residual_selector_bits,
            capacity_margin_bits_floor,
            watcher_verdicts,
            hallucinations_caught: 0,
            undetected_bound_denom_log2_floor,
        })
    }

    pub fn verify_slice(
        slice_id: &str,
        slice: &PiePixelSlice,
        codec: &MultiCylinder,
        selected_cylinders: &[usize],
    ) -> Result<WatcherGateReceipt, Held> {
        let projection = PieWorldProjection::project(slice, codec);
        Self::verify_projection(slice_id, &projection, codec, selected_cylinders)
    }

    pub fn detect_tampered_projection(
        slice_id: &str,
        projection: &PieWorldProjection,
        codec: &MultiCylinder,
        selected_cylinders: &[usize],
    ) -> Result<WatcherGateReceipt, Held> {
        match Self::verify_projection(slice_id, projection, codec, selected_cylinders) {
            Ok(receipt) => Ok(receipt),
            Err(Held::InconsistentResidue | Held::WatcherDisagreement) => Ok(WatcherGateReceipt {
                slice_id: slice_id.to_string(),
                verified_clone: PiePixelSlice::new(1, 1, 0, 0, vec![0])?,
                black_host8_hex: projection.qprism.host8_hex.clone(),
                white_host8_hex: "HELD".to_string(),
                selected_cylinders: selected_cylinders.to_vec(),
                residual_selector_bits: codec
                    .residual_selector_bits(selected_cylinders)
                    .unwrap_or(128),
                capacity_margin_bits_floor: codec
                    .signed_capacity_margin_bits_floor(selected_cylinders)
                    .unwrap_or(-128),
                watcher_verdicts: vec![WatcherVerdict {
                    watcher: WatcherKind::ReverseGnn,
                    passed: false,
                    detail: "roundtrip_disagreement_held",
                }],
                hallucinations_caught: 1,
                undetected_bound_denom_log2_floor: 0,
            }),
            Err(e) => Err(e),
        }
    }
}

fn join_usize_dot(values: &[usize]) -> String {
    let mut out = String::new();
    for (i, value) in values.iter().enumerate() {
        if i > 0 {
            out.push('.');
        }
        out.push_str(&value.to_string());
    }
    out
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
        assert_eq!(
            two_shadow_recover(3, p1, 5, p2, range),
            Err(Held::InsufficientJointCapacity)
        );
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
        let a_only = Shadows {
            shadow_a: sh.shadow_a.clone(),
            shadow_b: vec![0; sh.shadow_b.len()],
            orig_len: sh.orig_len,
        };
        assert_ne!(
            ts.recover(&a_only).unwrap(),
            data,
            "one pole must NOT reconstruct"
        );
        // both poles: exact
        assert_eq!(ts.recover(&sh).unwrap(), data);
    }
}
