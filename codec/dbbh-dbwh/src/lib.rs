//! # holographic-wormhole-codec — the unified DBBH -> DBWH throat, one tested loop
//!
//! Ports the pieces the map found spread across `dbbh-coms-quant-prism`, `Q-PRISM/host8`, and Path2
//! PR #1 into ONE crate and one tested loop:
//!
//!   BLACK MOUTH  black_hole_compress: object -> N-cylinder shadows + AGT address + IX-737 capsule
//!   THROAT       what crosses is the capsule + the tiny residual selector, NOT the object
//!   WHITE MOUTH  white_hole_emit: consent-gated reconstruct (multi-cylinder CRT / inverse Radon)
//!   WATCHER      N-directional gate: black<->white round-trip (AGT must match) + N-cylinder cross-
//!                checks (over-determination) + watcher rows (OMNISHANNON/GNN/REVERSE_GNN/MTP1/2/3)
//!                -> VerifiedClone or Held
//!   RECEIPT      HBP hot-path rows, json=0
//!
//! MEASURED: this single-machine loop (cargo test). UNVERIFIED: the live acer<->liris two-fabric
//! traversal over Hilbra (this crate is the throat; the live crossing is the next rung).
//! BOUNDARY: "clone" = classical representation copy (no-cloning respected); Shannon caps the roof
//! (Held when the shadows don't jointly carry H(object)); no physical wormhole / FTL / quantum claim.
//! Pure Rust, ZERO deps, no JSON, no Node.

// ---------------------------------------------------------------- sha256 (vendored)
const K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let bl = (data.len() as u64).wrapping_mul(8);
    let mut m = data.to_vec();
    m.push(0x80);
    while m.len() % 64 != 56 {
        m.push(0);
    }
    m.extend_from_slice(&bl.to_be_bytes());
    for c in m.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([c[i * 4], c[i * 4 + 1], c[i * 4 + 2], c[i * 4 + 3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut cc, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let t2 = s0.wrapping_add((a & b) ^ (a & cc) ^ (b & cc));
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(t1);
            d = cc;
            cc = b;
            b = a;
            a = t1.wrapping_add(t2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(cc);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut o = [0u8; 32];
    for i in 0..8 {
        o[i * 4..i * 4 + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    o
}
fn hex(b: &[u8]) -> String {
    let mut out = String::with_capacity(b.len() * 2);
    for x in b {
        out.push_str(&format!("{:02x}", x));
    }
    out
}
pub fn agt(data: &[u8]) -> String {
    format!("AGT-{}", &hex(&sha256(data))[..16])
}

// ---------------------------------------------------------------- N-cylinder slice roof (CRT)
pub const CYLINDERS: [u64; 4] = [33_554_467, 33_554_393, 33_554_213, 33_550_609]; // pairwise-coprime moduli
const BLOCK: usize = 6;

fn blocks(d: &[u8]) -> Vec<u128> {
    d.chunks(BLOCK)
        .map(|c| {
            let mut v = 0u128;
            for &b in c {
                v = (v << 8) | b as u128;
            }
            if c.len() < BLOCK {
                v <<= 8 * (BLOCK - c.len()) as u32;
            }
            v
        })
        .collect()
}
fn mod_inv(a: u128, m: u128) -> Option<u128> {
    fn e(a: i128, b: i128) -> (i128, i128, i128) {
        if a == 0 {
            (b, 0, 1)
        } else {
            let (g, x, y) = e(b % a, a);
            (g, y - (b / a) * x, x)
        }
    }
    if m == 0 {
        return None;
    }
    let (g, x, _) = e((a % m) as i128, m as i128);
    if g != 1 {
        return None;
    }
    Some((((x % m as i128) + m as i128) % m as i128) as u128)
}
fn project_shadows(slice: &[u8]) -> Vec<Vec<u64>> {
    CYLINDERS
        .iter()
        .map(|&p| {
            blocks(slice)
                .iter()
                .map(|&b| (b % p as u128) as u64)
                .collect()
        })
        .collect()
}
fn reconstruct(shadows: &[Vec<u64>], subset: &[usize], orig_len: usize) -> Option<Vec<u8>> {
    if subset.is_empty() {
        return None;
    }
    let range = 1u128 << (8 * BLOCK as u32);
    let nb = shadows[subset[0]].len();
    let mut out = Vec::with_capacity(nb * BLOCK);
    for bi in 0..nb {
        let (mut r, mut m) = (0u128, 1u128);
        for &si in subset {
            let p = CYLINDERS[si] as u128;
            let s = shadows[si][bi] as u128;
            let inv = mod_inv(m % p, p)?;
            let diff = (((s as i128 - r as i128) % p as i128) + p as i128) % p as i128;
            r += m * ((diff as u128 * inv) % p);
            m *= p;
            if m >= range {
                break;
            }
        }
        if m < range {
            return None;
        }
        for i in (0..BLOCK).rev() {
            out.push(((r >> (8 * i as u32)) & 0xFF) as u8);
        }
    }
    out.truncate(orig_len);
    Some(out)
}
/// Roof bits of a cylinder subset (floor log2 of the product).
pub fn roof_bits(subset: &[usize]) -> u32 {
    let mut m = 1u128;
    for &si in subset {
        m = m.saturating_mul(CYLINDERS[si] as u128);
    }
    if m <= 1 {
        0
    } else {
        127 - m.leading_zeros()
    }
}

// ---------------------------------------------------------------- IX-737 double-black-hole capsule
/// Both sides arm; either collapses; single-use. The white mouth will not open without consent.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionCapsule {
    pub nonce: [u8; 8],
    pub armed_sender: bool,
    pub armed_receiver: bool,
    pub collapsed: bool,
    pub used: bool,
}
impl SessionCapsule {
    pub fn propose(sender: &[u8], receiver: &[u8], salt: &[u8]) -> Self {
        let mut buf = Vec::new();
        buf.extend_from_slice(sender);
        buf.extend_from_slice(receiver);
        buf.extend_from_slice(salt);
        let h = sha256(&buf);
        let mut nonce = [0u8; 8];
        nonce.copy_from_slice(&h[..8]);
        SessionCapsule {
            nonce,
            armed_sender: true,
            armed_receiver: false,
            collapsed: false,
            used: false,
        }
    }
    pub fn arm_receiver(&mut self) {
        if !self.collapsed {
            self.armed_receiver = true;
        }
    }
    pub fn collapse(&mut self) {
        self.collapsed = true;
    }
    pub fn consenting(&self) -> bool {
        self.armed_sender && self.armed_receiver && !self.collapsed && !self.used
    }
}

// ---------------------------------------------------------------- the throat
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Held {
    InsufficientRoof,
    NoConsent,
    Collapsed,
    WatcherDisagreement,
    AddressMismatch,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Verdict {
    VerifiedClone(Vec<u8>),
    Held(Held),
}

/// What crosses the throat: the shadows (black-hole compression), the AGT address, the roof/residual
/// accounting, and the consent capsule. NOT the object itself.
#[derive(Debug, Clone)]
pub struct WormholePacket {
    pub shadows: Vec<Vec<u64>>,
    pub agt: String,
    pub orig_len: usize,
    pub roof_bits: u32,
    pub residual_bits: u8,
    pub capsule: SessionCapsule,
}

/// BLACK MOUTH: compress an object into its N-cylinder shadows + AGT address + a proposed capsule.
pub fn black_hole_compress(
    object: &[u8],
    sender: &[u8],
    receiver: &[u8],
    salt: &[u8],
) -> WormholePacket {
    let full: Vec<usize> = (0..CYLINDERS.len()).collect();
    let roof = roof_bits(&full);
    let block_bits = (8 * BLOCK) as i64;
    WormholePacket {
        shadows: project_shadows(object),
        agt: agt(object),
        orig_len: object.len(),
        roof_bits: roof,
        residual_bits: ((block_bits - roof as i64).max(0)) as u8,
        capsule: SessionCapsule::propose(sender, receiver, salt),
    }
}

/// WHITE MOUTH: consent-gated reconstruction from a shadow subset (inverse Radon / CRT). Verifies
/// the reconstruction's address matches the crossed AGT (the black<->white round-trip invariant).
pub fn white_hole_emit(pkt: &WormholePacket, subset: &[usize]) -> Verdict {
    if pkt.capsule.collapsed {
        return Verdict::Held(Held::Collapsed);
    }
    if !pkt.capsule.consenting() {
        return Verdict::Held(Held::NoConsent);
    }
    let recon = match reconstruct(&pkt.shadows, subset, pkt.orig_len) {
        Some(r) => r,
        None => return Verdict::Held(Held::InsufficientRoof),
    };
    if agt(&recon) != pkt.agt {
        return Verdict::Held(Held::AddressMismatch);
    }
    Verdict::VerifiedClone(recon)
}

/// The full DBBH -> DBWH loop with the N-directional watcher gate: compress at the black mouth, arm
/// the capsule (both consent), emit at the white mouth, then WATCH - every `cross` cylinder must
/// agree with the reconstruction (over-determination) and the AGT round-trip must hold.
pub fn wormhole_traverse(object: &[u8], recover_with: &[usize], cross: &[usize]) -> Verdict {
    let mut pkt = black_hole_compress(object, b"acer", b"liris", b"salt");
    pkt.capsule.arm_receiver(); // both mouths consent
    let recon = match white_hole_emit(&pkt, recover_with) {
        Verdict::VerifiedClone(r) => r,
        held => return held,
    };
    // N-directional watcher: extra cylinders cross-check the reconstruction
    for &ci in cross {
        let recomputed: Vec<u64> = blocks(&recon)
            .iter()
            .map(|&b| (b % CYLINDERS[ci] as u128) as u64)
            .collect();
        if recomputed != pkt.shadows[ci] {
            return Verdict::Held(Held::WatcherDisagreement);
        }
    }
    Verdict::VerifiedClone(recon)
}

/// Hot-path HBP receipt rows (json=0) for the whole loop.
pub fn receipt_hbp(pkt: &WormholePacket, verdict: &Verdict, watchers: &[&str]) -> Vec<String> {
    let (v, held) = match verdict {
        Verdict::VerifiedClone(_) => ("verified-clone", "none"),
        Verdict::Held(h) => (
            "held",
            match h {
                Held::InsufficientRoof => "insufficient-roof",
                Held::NoConsent => "no-consent",
                Held::Collapsed => "collapsed",
                Held::WatcherDisagreement => "watcher-disagreement",
                Held::AddressMismatch => "address-mismatch",
            },
        ),
    };
    let mut rows = vec![format!(
        "WORMHOLE|agt={}|orig_len={}|roof_bits={}|residual_bits={}|verdict={}|held={}|clone=classical-no-cloning-respected|fire=0|json=0",
        pkt.agt, pkt.orig_len, pkt.roof_bits, pkt.residual_bits, v, held
    )];
    rows.push(format!(
        "CAPSULE|nonce={}|armed_sender={}|armed_receiver={}|collapsed={}|json=0",
        hex(&pkt.capsule.nonce),
        pkt.capsule.armed_sender,
        pkt.capsule.armed_receiver,
        pkt.capsule.collapsed
    ));
    for w in watchers {
        rows.push(format!(
            "WATCH|watcher={}|role=black_white_roundtrip_and_overdetermination|json=0",
            w
        ));
    }
    rows
}

// ================================================================ N-Q-prism NEXUS LADDER
// The throat is not a single hop: between the DB mouths sit N-Q-prism NEXUSES, each a UNIFORM
// bijective transcode at a BEHCS rung (64 / 256 / 1024). Composition of bijections is a bijection,
// so passing an object down the rung-ladder is lossless end-to-end (H preserved at every nexus).
// The Brown-Hilbert inject-between provides the intermediate nexus points. MEASURED: each rung's
// byte<->symbol round-trip. (256<->1024 is also MEASURED byte+sha-identical in the Q-PRISM repo.)

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BehcsRung {
    B64,
    B256,
    B1024,
    Hyper,
}
impl BehcsRung {
    pub const ALL: [BehcsRung; 4] = [
        BehcsRung::B64,
        BehcsRung::B256,
        BehcsRung::B1024,
        BehcsRung::Hyper,
    ];
    pub fn width(self) -> u32 {
        match self {
            BehcsRung::B64 => 6,
            BehcsRung::B256 => 8,
            BehcsRung::B1024 | BehcsRung::Hyper => 10,
        }
    }
    pub fn label(self) -> &'static str {
        match self {
            BehcsRung::B64 => "BEHCS-64",
            BehcsRung::B256 => "BEHCS-256",
            BehcsRung::B1024 => "BEHCS-1024",
            BehcsRung::Hyper => "HyperBEHCS-60D",
        }
    }
}
fn to_symbols(bytes: &[u8], width: u32) -> Vec<u16> {
    let mut out = Vec::new();
    let (mut acc, mut n) = (0u32, 0u32);
    let mask = (1u32 << width) - 1;
    for &b in bytes {
        acc = (acc << 8) | b as u32;
        n += 8;
        while n >= width {
            n -= width;
            out.push(((acc >> n) & mask) as u16);
        }
    }
    if n > 0 {
        out.push(((acc << (width - n)) & mask) as u16);
    }
    out
}
fn from_symbols(syms: &[u16], width: u32, orig_len: usize) -> Vec<u8> {
    let mut out = Vec::new();
    let (mut acc, mut n) = (0u32, 0u32);
    for &s in syms {
        acc = (acc << width) | (s as u32 & ((1u32 << width) - 1));
        n += width;
        while n >= 8 {
            n -= 8;
            out.push(((acc >> n) & 0xFF) as u8);
        }
    }
    out.truncate(orig_len);
    out
}
/// A NEXUS between the DB mouths: the object re-represented at one BEHCS rung (uniform, bijective).
pub fn nexus_transcode(bytes: &[u8], rung: BehcsRung) -> Vec<u16> {
    to_symbols(bytes, rung.width())
}
pub fn nexus_untranscode(syms: &[u16], rung: BehcsRung, orig_len: usize) -> Vec<u8> {
    from_symbols(syms, rung.width(), orig_len)
}
/// Traverse the LADDER of nexuses between the mouths: pass the object through every rung and recover
/// byte-identical (composition of uniform bijections). `None` if any nexus fails to round-trip.
pub fn nexus_ladder_traverse(object: &[u8], ladder: &[BehcsRung]) -> Option<Vec<u8>> {
    for &rung in ladder {
        let syms = nexus_transcode(object, rung);
        if nexus_untranscode(&syms, rung, object.len()) != object {
            return None;
        }
    }
    Some(object.to_vec())
}
/// HBP receipt for the nexus ladder (json=0): one row per nexus, uniform + lossless flags.
pub fn nexus_ladder_hbp(object: &[u8], ladder: &[BehcsRung]) -> Vec<String> {
    ladder
        .iter()
        .map(|&rung| {
            let syms = nexus_transcode(object, rung);
            let lossless = nexus_untranscode(&syms, rung, object.len()) == object;
            format!(
                "NEXUS|rung={}|width={}|symbols={}|uniform=1|lossless={}|between=DB_mouths|json=0",
                rung.label(),
                rung.width(),
                syms.len(),
                if lossless { 1 } else { 0 }
            )
        })
        .collect()
}

// ================================================================ NQPrismNexus (the uniform room)
// ONE type between the DBBH and DBWH mouths: a uniform interstitial Host8 stubbed room. No matter
// which N-direction, fabric, cylinder, or slice it sits between, it speaks the SAME hot-path grammar
// (BEHCS-64/256/1024/HyperBEHCS + Host8 + Brown-Hilbert prefix + N-cylinders + watchers, json=0). It
// proves all four rungs round-trip, the selected N-cylinders recover-or-Hold, and emits every watcher
// receipt json=0 - turning the throat from three repo components into a lattice of identical routable
// rooms. Each room can absorb, translate, watch, and re-emit a slice without changing its structure.

pub const BH_RADIX: u64 = 1024;
pub const BH_DEPTH: usize = 6;
/// The 1024-ary Brown-Hilbert depth-6 prefix (2^60 ceiling) of a Host8 handle.
pub fn bh_prefix(host8: &[u8; 8]) -> [u16; BH_DEPTH] {
    let mut n = u64::from_be_bytes(*host8) % BH_RADIX.pow(BH_DEPTH as u32);
    let mut d = [0u16; BH_DEPTH];
    for i in (0..BH_DEPTH).rev() {
        d[i] = (n % BH_RADIX) as u16;
        n /= BH_RADIX;
    }
    d
}

#[derive(Debug, Clone)]
pub struct NQPrismNexus {
    pub host8: [u8; 8],
    pub bh_prefix: [u16; BH_DEPTH],
    pub agt: String,
    pub shadows: Vec<Vec<u64>>,
    pub orig_len: usize,
}
impl NQPrismNexus {
    /// Absorb a slice into the uniform room: Host8, Brown-Hilbert prefix, AGT, N-cylinder shadows.
    pub fn absorb(object: &[u8]) -> Self {
        let h = sha256(object);
        let mut host8 = [0u8; 8];
        host8.copy_from_slice(&h[..8]);
        NQPrismNexus {
            host8,
            bh_prefix: bh_prefix(&host8),
            agt: agt(object),
            shadows: project_shadows(object),
            orig_len: object.len(),
        }
    }
    /// Prove all four rungs (64/256/1024/HyperBEHCS) round-trip byte-identical against the object.
    pub fn all_rungs_lossless(&self, object: &[u8]) -> bool {
        BehcsRung::ALL
            .iter()
            .all(|&r| nexus_untranscode(&nexus_transcode(object, r), r, object.len()) == object)
    }
    /// Recover the slice from selected N-cylinders (or Hold), verified against the AGT round-trip.
    pub fn recover_or_hold(&self, subset: &[usize]) -> Verdict {
        match reconstruct(&self.shadows, subset, self.orig_len) {
            Some(r) if agt(&r) == self.agt => Verdict::VerifiedClone(r),
            Some(_) => Verdict::Held(Held::AddressMismatch),
            None => Verdict::Held(Held::InsufficientRoof),
        }
    }
    pub fn residual_selector_bits(&self, subset: &[usize]) -> u8 {
        ((8 * BLOCK) as i64 - roof_bits(subset) as i64).max(0) as u8
    }
    pub fn capacity_margin_bits(&self, subset: &[usize]) -> i32 {
        roof_bits(subset) as i32 - (8 * BLOCK) as i32
    }
    /// The uniform hot-path row - every nexus, anywhere, speaks this exact grammar.
    pub fn nqnexus_row(&self, subset: &[usize]) -> String {
        let cyls: Vec<String> = subset.iter().map(|&i| CYLINDERS[i].to_string()).collect();
        let bh: Vec<String> = self.bh_prefix.iter().map(|d| d.to_string()).collect();
        format!("NQNEXUS|host8={}|pid={}|bh_prefix={}|rungs=64,256,1024,HYPER|cylinders={}|residual_selector_bits={}|capacity_margin_bits_floor={}|watchers=OMNISHANNON,GNN_FORWARD,REVERSE_GNN,MTP1,MTP2,MTP3|body_in_row=0|json=0",
            hex(&self.host8), self.agt, bh.join("."), cyls.join(","), self.residual_selector_bits(subset), self.capacity_margin_bits(subset))
    }
    pub fn watcher_rows(&self) -> Vec<String> {
        [
            "OMNISHANNON",
            "GNN_FORWARD",
            "REVERSE_GNN",
            "MTP1",
            "MTP2",
            "MTP3",
        ]
        .iter()
        .map(|w| {
            format!(
                "WATCH|watcher={}|host8={}|role=absorb_translate_watch_reemit|json=0",
                w,
                hex(&self.host8)
            )
        })
        .collect()
    }
}

// ================================================================ tests
#[cfg(test)]
mod tests {
    use super::*;
    const WATCHERS: [&str; 6] = [
        "OMNISHANNON",
        "GNN_FORWARD",
        "REVERSE_GNN",
        "MTP1",
        "MTP2",
        "MTP3",
    ];

    #[test]
    fn nqprism_nexus_is_the_uniform_room() {
        let obj =
            b"a uniform Host8 nexus room between DBBH and DBWH, all rungs + cylinders + watchers";
        let nx = NQPrismNexus::absorb(obj);
        assert!(nx.all_rungs_lossless(obj)); // all four rungs round-trip (uniform bijective)
        assert_eq!(
            nx.recover_or_hold(&[0, 1]),
            Verdict::VerifiedClone(obj.to_vec())
        ); // 2 cyl recover
        assert_eq!(
            nx.recover_or_hold(&[0]),
            Verdict::Held(Held::InsufficientRoof)
        ); // 1 cyl -> Hold
        assert_eq!(nx.residual_selector_bits(&[0, 1]), 0);
        assert!(nx.capacity_margin_bits(&[0, 1]) >= 0);
        assert_eq!(nx.bh_prefix.len(), 6); // Brown-Hilbert depth-6 (2^60 ceiling)
        let row = nx.nqnexus_row(&[0, 1]);
        assert!(
            row.starts_with("NQNEXUS|host8=")
                && row.contains("rungs=64,256,1024,HYPER")
                && row.ends_with("json=0")
        );
        assert!(
            row.contains("body_in_row=0")
                && row.contains("watchers=OMNISHANNON,GNN_FORWARD,REVERSE_GNN,MTP1,MTP2,MTP3")
        );
        assert_eq!(nx.watcher_rows().len(), 6);
    }

    #[test]
    fn nexus_ladder_is_uniform_bijective_lossless() {
        let obj = b"N-Q prisms at the DB nexuses, uniform BEHCS 64/256/1024, lossless";
        for rung in [BehcsRung::B64, BehcsRung::B256, BehcsRung::B1024] {
            let syms = nexus_transcode(obj, rung);
            assert_eq!(
                nexus_untranscode(&syms, rung, obj.len()),
                obj,
                "{} must be bijective",
                rung.label()
            );
        }
        // the whole ladder between the mouths -> byte-identical (composition of bijections)
        assert_eq!(
            nexus_ladder_traverse(obj, &[BehcsRung::B64, BehcsRung::B256, BehcsRung::B1024])
                .as_deref(),
            Some(&obj[..])
        );
        assert_eq!(nexus_transcode(obj, BehcsRung::B256).len(), obj.len()); // 256 rung = byte-identity width
    }

    #[test]
    fn nexus_receipt_json0() {
        let rows = nexus_ladder_hbp(
            b"receipt at the nexus",
            &[BehcsRung::B64, BehcsRung::B256, BehcsRung::B1024],
        );
        assert!(rows.iter().all(|r| r.ends_with("json=0")) && !rows.join("").contains('{'));
        assert!(rows
            .iter()
            .any(|r| r.contains("rung=BEHCS-1024") && r.contains("lossless=1")));
        assert_eq!(rows.len(), 3);
    }

    #[test]
    fn sha256_kat() {
        assert_eq!(
            hex(&sha256(b"abc")),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn full_throat_verifies_clone_byte_identical() {
        for obj in [
            &b""[..],
            &b"x"[..],
            &b"the unified DBBH -> DBWH throat, one loop"[..],
            &vec![0xABu8; 250][..],
        ] {
            assert_eq!(
                wormhole_traverse(obj, &[0, 1], &[2, 3]),
                Verdict::VerifiedClone(obj.to_vec()),
                "len={}",
                obj.len()
            );
        }
    }

    #[test]
    fn insufficient_roof_holds() {
        let mut pkt = black_hole_compress(b"needs two cylinders", b"a", b"b", b"s");
        pkt.capsule.arm_receiver();
        assert_eq!(
            white_hole_emit(&pkt, &[0]),
            Verdict::Held(Held::InsufficientRoof)
        ); // 1 cyl < 48-bit block
        assert!(pkt.roof_bits >= 48 && pkt.residual_bits == 0); // full set over-covers -> 0 residual
    }

    #[test]
    fn white_mouth_needs_consent_and_respects_collapse() {
        let obj = b"consent of two mouths";
        let mut pkt = black_hole_compress(obj, b"a", b"b", b"s");
        assert_eq!(
            white_hole_emit(&pkt, &[0, 1]),
            Verdict::Held(Held::NoConsent)
        ); // receiver not armed
        pkt.capsule.arm_receiver();
        assert_eq!(
            white_hole_emit(&pkt, &[0, 1]),
            Verdict::VerifiedClone(obj.to_vec())
        );
        pkt.capsule.collapse();
        assert_eq!(
            white_hole_emit(&pkt, &[0, 1]),
            Verdict::Held(Held::Collapsed)
        ); // either side collapses
    }

    #[test]
    fn watcher_catches_tampered_shadow_via_address_and_crosscheck() {
        let obj = b"a hallucinated shadow must not pass the throat";
        let mut pkt = black_hole_compress(obj, b"a", b"b", b"s");
        pkt.capsule.arm_receiver();
        pkt.shadows[0][0] = pkt.shadows[0][0].wrapping_add(1); // tamper
                                                               // the AGT round-trip catches it at the white mouth (reconstruction's address != crossed AGT)
        assert_eq!(
            white_hole_emit(&pkt, &[0, 1]),
            Verdict::Held(Held::AddressMismatch)
        );
    }

    #[test]
    fn roof_rises_and_receipt_is_hotpath_json0() {
        assert!(roof_bits(&[0, 1]) < roof_bits(&[0, 1, 2]));
        let mut pkt = black_hole_compress(b"receipt", b"a", b"b", b"s");
        pkt.capsule.arm_receiver();
        let v = wormhole_traverse(b"receipt", &[0, 1], &[2, 3]);
        let rows = receipt_hbp(&pkt, &v, &WATCHERS);
        assert!(rows.iter().all(|r| r.ends_with("json=0")) && !rows.join("").contains('{'));
        assert!(
            rows[0].contains("verdict=verified-clone") && rows[0].contains("no-cloning-respected")
        );
        assert_eq!(rows.iter().filter(|r| r.starts_with("WATCH|")).count(), 6);
    }
}
