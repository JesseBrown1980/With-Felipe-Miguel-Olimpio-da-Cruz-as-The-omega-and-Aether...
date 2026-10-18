//! # qprism-3d-slice-harness — the living 3D Q-PRISM slice harness
//!
//! The 7-step rung (operator spec, 2026-07-04). Pure Rust, ZERO deps, HBI/HBP `json=0`,
//! 8-byte host. No JSON, no Node.
//!
//! 1. input a frozen slice
//! 2. split into representation WAVELENGTHS: binary / hex / sha / HBI-HBP / BEHCS-64/256/1024 / HyperBEHCS
//! 3. project into 60D Brown-Hilbert multi-cylinder coordinates
//! 4. MTP-1/2/3 visual PID supervisors observe the geospatial shadow
//! 5. Omnishannon + GNN + reverse-GNN watch every edge
//! 6. recombine through DBBH / Path-2 consent lanes
//! 7. prove byte-identical recovery or HOLD
//!
//! BOUNDARY: "clone" = representation / wavelength branch copies (classical, freely + losslessly
//! copyable), NOT physical quantum state copying. Nothing here violates the no-cloning theorem;
//! there is no claim of physical quantum cloning. Shannon holds at every edge: the lossless lanes
//! are bijections (`H(f(X))=H(X)`); the sha lane is a shadow/address (entropy relocated to a store),
//! not a compressed form. `MEASURED` = verified round-trip in code; `DESIGN` = watcher scaffold.

// ---------------------------------------------------------------- sha256 (pure, vendored)
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
    let bit_len = (data.len() as u64).wrapping_mul(8);
    let mut msg = data.to_vec();
    msg.push(0x80);
    while msg.len() % 64 != 56 {
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
            let t1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(t1);
            d = c;
            c = b;
            b = a;
            a = t1.wrapping_add(t2);
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
    for i in 0..8 {
        out[i * 4..i * 4 + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    out
}
pub fn sha16(data: &[u8]) -> String {
    hex(&sha256(data))[..16].to_string()
}

// ---------------------------------------------------------------- hex + BEHCS ladder (bijective)
pub fn hex(b: &[u8]) -> String {
    let mut s = String::with_capacity(b.len() * 2);
    for &x in b {
        s.push(char::from_digit((x >> 4) as u32, 16).unwrap());
        s.push(char::from_digit((x & 0xf) as u32, 16).unwrap());
    }
    s
}
pub fn unhex(s: &str) -> Vec<u8> {
    let c: Vec<u8> = s.bytes().collect();
    (0..c.len() / 2)
        .map(|i| (from_hex(c[i * 2]) << 4) | from_hex(c[i * 2 + 1]))
        .collect()
}
fn from_hex(b: u8) -> u8 {
    match b {
        b'0'..=b'9' => b - b'0',
        b'a'..=b'f' => b - b'a' + 10,
        b'A'..=b'F' => b - b'A' + 10,
        _ => 0,
    }
}

pub fn to_symbols(bytes: &[u8], width: u32) -> Vec<u16> {
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
pub fn from_symbols(syms: &[u16], width: u32, orig_len: usize) -> Vec<u8> {
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
pub const HYPER_DIM: usize = 60;

// ---------------------------------------------------------------- 8-byte host PID
#[derive(Debug, Clone, Copy)]
pub struct Pid(pub [u8; 8]);
impl Pid {
    pub fn from_hex(h: &str) -> Pid {
        let mut b = [0u8; 8];
        for i in 0..8 {
            b[i] = u8::from_str_radix(&h[i * 2..i * 2 + 2], 16).unwrap_or(0);
        }
        Pid(b)
    }
    pub fn hex(&self) -> String {
        hex(&self.0)
    }
}

// ================================================================ STEP 2: representation wavelengths
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Wavelength {
    Binary,
    Hex,
    Sha,
    HbiHbp,
    Behcs64,
    Behcs256,
    Behcs1024,
    HyperBehcs,
}
impl Wavelength {
    pub const ALL: [Wavelength; 8] = [
        Wavelength::Binary,
        Wavelength::Hex,
        Wavelength::Sha,
        Wavelength::HbiHbp,
        Wavelength::Behcs64,
        Wavelength::Behcs256,
        Wavelength::Behcs1024,
        Wavelength::HyperBehcs,
    ];
    pub fn name(&self) -> &'static str {
        match self {
            Wavelength::Binary => "binary",
            Wavelength::Hex => "hex",
            Wavelength::Sha => "sha",
            Wavelength::HbiHbp => "hbi-hbp",
            Wavelength::Behcs64 => "behcs-64",
            Wavelength::Behcs256 => "behcs-256",
            Wavelength::Behcs1024 => "behcs-1024",
            Wavelength::HyperBehcs => "hyperbehcs-60d",
        }
    }
    /// Encode the slice into this wavelength's representation (a lossless view, or the sha shadow).
    pub fn encode(&self, slice: &[u8]) -> String {
        match self {
            Wavelength::Binary => {
                let mut out = String::new();
                for b in slice {
                    out.push_str(&format!("{:08b}", b));
                }
                out
            }
            Wavelength::Hex => hex(slice),
            Wavelength::Sha => format!("AGT-{}", sha16(slice)), // a SHADOW: an address, not byte-recoverable alone
            Wavelength::HbiHbp => format!("SLICE|len={}|hex={}|json=0", slice.len(), hex(slice)),
            Wavelength::Behcs64 => {
                let mut out = String::new();
                for s in to_symbols(slice, 6) {
                    out.push_str(&format!("{},", s));
                }
                out
            }
            Wavelength::Behcs256 => hex(slice), // base-2^8 == bytes
            Wavelength::Behcs1024 => {
                let mut out = String::new();
                for s in to_symbols(slice, 10) {
                    out.push_str(&format!("{},", s));
                }
                out
            }
            Wavelength::HyperBehcs => {
                let g = to_symbols(slice, 10);
                let mut s = String::new();
                for chunk in g.chunks(HYPER_DIM) {
                    s.push('[');
                    for x in chunk {
                        s.push_str(&format!("{},", x));
                    }
                    s.push(']');
                }
                s
            }
        }
    }
    /// Recover the exact slice from this wavelength's representation. `None` for the sha shadow
    /// (it addresses a retained object; it is not byte-recoverable alone — Path-1 territory).
    pub fn decode(&self, repr: &str, orig_len: usize) -> Option<Vec<u8>> {
        let parse = |s: &str| -> Vec<u16> {
            s.split(&['[', ']', ','][..])
                .filter(|x| !x.is_empty())
                .filter_map(|x| x.parse().ok())
                .collect()
        };
        match self {
            Wavelength::Binary => Some(
                repr.as_bytes()
                    .chunks(8)
                    .map(|c| c.iter().fold(0u8, |a, &b| (a << 1) | (b - b'0')))
                    .collect(),
            ),
            Wavelength::Hex | Wavelength::Behcs256 => Some(unhex(repr)),
            Wavelength::Sha => None, // shadow: needs the store (Path 1), not byte-recoverable here
            Wavelength::HbiHbp => repr
                .rsplit_once("hex=")
                .map(|(_, h)| unhex(h.trim_end_matches("|json=0"))),
            Wavelength::Behcs64 => Some(from_symbols(&parse(repr), 6, orig_len)),
            Wavelength::Behcs1024 | Wavelength::HyperBehcs => {
                Some(from_symbols(&parse(repr), 10, orig_len))
            }
        }
    }
    pub fn is_lossless_lane(&self) -> bool {
        !matches!(self, Wavelength::Sha)
    }
}

// ================================================================ STEP 5: Omnishannon + GNN watchers
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EdgeVerdict {
    pub wavelength: &'static str,
    pub omnishannon: ShannonMark,        // MEASURED
    pub gnn_watch: &'static str,         // DESIGN scaffold
    pub reverse_gnn_watch: &'static str, // DESIGN scaffold
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShannonMark {
    /// bijective lane: decode(encode(x)) == x, H(f(X))=H(X), code-rate 1.0 [MEASURED]
    Lossless,
    /// sha lane: a shadow/address; entropy relocated to a store, not destroyed [MEASURED-as-shadow]
    Shadow,
    /// a lane that FAILED its byte-identical round-trip — the watcher HOLDS it
    Held,
}
/// Omnishannon watch: verify each wavelength edge is lossless (byte-identical round-trip) or a
/// declared shadow. This is the Shannon guardrail at every edge — no lane may silently lose bits.
pub fn omnishannon_watch(slice: &[u8]) -> Vec<EdgeVerdict> {
    Wavelength::ALL
        .iter()
        .map(|w| {
            let repr = w.encode(slice);
            let mark = if !w.is_lossless_lane() {
                ShannonMark::Shadow
            } else if w.decode(&repr, slice.len()).as_deref() == Some(slice) {
                ShannonMark::Lossless
            } else {
                ShannonMark::Held
            };
            EdgeVerdict {
                wavelength: w.name(),
                omnishannon: mark,
                gnn_watch: "DESIGN:edge-recorded", // GNN forward inference scaffold
                reverse_gnn_watch: "DESIGN:inverse-recorded", // reverse-GNN scaffold
            }
        })
        .collect()
}

// ================================================================ STEP 3: 60D Brown-Hilbert coord
/// Project the slice into a PID-specific 60D Brown-Hilbert coordinate (each axis a 1024-glyph).
pub fn project_60d(slice: &[u8], pid: &Pid) -> [u16; HYPER_DIM] {
    let mut sel = [0u16; HYPER_DIM];
    let (mut i, mut counter) = (0usize, 0u32);
    while i < HYPER_DIM {
        let mut buf = Vec::with_capacity(12 + slice.len());
        buf.extend_from_slice(&pid.0);
        buf.extend_from_slice(&counter.to_be_bytes());
        buf.extend_from_slice(slice);
        let h = sha256(&buf);
        let mut j = 0;
        while j + 1 < 32 && i < HYPER_DIM {
            sel[i] = (((h[j] as u16) << 8) | h[j + 1] as u16) & 0x3FF;
            i += 1;
            j += 2;
        }
        counter += 1;
    }
    sel
}

// ================================================================ multi-cylinder (Path N) shadows
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Held {
    InsufficientJointCapacity,
    NonCoprime,
    RecoveryMismatch,
}
/// Small pairwise-COPRIME modulus cylinders (~2^25) for the multi-cylinder no-store shadow lane.
/// "cylinder" = coprime MODULUS, not necessarily prime: only 33554467 and 33554393 are prime;
/// 33554213 = 11*3050383 and 33550609 are composite. CRT needs only pairwise coprimality (holds).
/// Bilateral fix 2026-07-04 (attack-verify wdz4dhldx): the "prime" label was wrong on both seats.
pub const CYLINDERS: [u64; 4] = [33_554_467, 33_554_393, 33_554_213, 33_550_609];
const BLOCK_BYTES: usize = 6; // 48-bit blocks; 2 of these ~2^25 coprime moduli already exceed 2^48

fn blocks(data: &[u8]) -> Vec<u128> {
    data.chunks(BLOCK_BYTES)
        .map(|c| {
            let mut v = 0u128;
            for &b in c {
                v = (v << 8) | b as u128;
            }
            if c.len() < BLOCK_BYTES {
                v <<= 8 * (BLOCK_BYTES - c.len()) as u32;
            }
            v
        })
        .collect()
}
fn mod_inv(a: u128, m: u128) -> Option<u128> {
    fn eg(a: i128, b: i128) -> (i128, i128, i128) {
        if a == 0 {
            (b, 0, 1)
        } else {
            let (g, x, y) = eg(b % a, a);
            (g, y - (b / a) * x, x)
        }
    }
    if m == 0 {
        return None;
    }
    let (g, x, _) = eg((a % m) as i128, m as i128);
    if g != 1 {
        return None;
    }
    Some((((x % m as i128) + m as i128) % m as i128) as u128)
}
/// One cylinder's shadow of the slice: the residues of each block mod `prime` (lossy alone).
pub fn cylinder_shadow(slice: &[u8], prime: u64) -> Vec<u64> {
    blocks(slice)
        .iter()
        .map(|&b| (b % prime as u128) as u64)
        .collect()
}
/// Recombine (STEP 6): recover the slice from a SET of cylinder shadows whose primes jointly cover a
/// block. `Held::InsufficientJointCapacity` if the given cylinders don't reach the 48-bit roof.
pub fn recombine(shadows: &[(&[u64], u64)], orig_len: usize) -> Result<Vec<u8>, Held> {
    if shadows.is_empty() {
        return Err(Held::InsufficientJointCapacity);
    }
    let range = 1u128 << (8 * BLOCK_BYTES as u32);
    let nblocks = shadows[0].0.len();
    let mut out = Vec::with_capacity(nblocks * BLOCK_BYTES);
    for bi in 0..nblocks {
        let (mut r, mut m) = (0u128, 1u128);
        for (sh, p) in shadows {
            let (s, pp) = (sh[bi] as u128, *p as u128);
            let inv = mod_inv(m % pp, pp).ok_or(Held::NonCoprime)?;
            let diff = (((s as i128 - r as i128) % pp as i128) + pp as i128) % pp as i128;
            r += m * ((diff as u128 * inv) % pp);
            m *= pp;
            if m >= range {
                break;
            }
        }
        if m < range {
            return Err(Held::InsufficientJointCapacity);
        }
        for i in (0..BLOCK_BYTES).rev() {
            out.push(((r >> (8 * i as u32)) & 0xFF) as u8);
        }
    }
    out.truncate(orig_len);
    Ok(out)
}

// ================================================================ STEP 4: MTP visual PID supervisors
#[derive(Debug, Clone)]
pub struct MtpSupervisor {
    pub mtp: u8,              // 1, 2, or 3
    pub pid: String,          // PID-addressed
    pub cylinder: u64,        // the pole (cylinder) it observes
    pub geospatial: [u16; 3], // a 3D geospatial shadow read of the 60D coord (visual)
}
/// Spawn the MTP-1/2/3 visual PID supervisors, each observing one pole (cylinder) of the geospatial
/// shadow of the slice's 60D coordinate.
pub fn spawn_mtp_supervisors(
    slice: &[u8],
    seat: &Pid,
    coord: &[u16; HYPER_DIM],
) -> Vec<MtpSupervisor> {
    (1u8..=3)
        .map(|mtp| {
            let pid = sha16(&[&seat.0[..], &[mtp], slice].concat());
            // a 3D geospatial read: three axes of the 60D coord grouped by the MTP head
            let base = ((mtp - 1) as usize) * 20;
            MtpSupervisor {
                mtp,
                pid,
                cylinder: CYLINDERS[(mtp - 1) as usize],
                geospatial: [coord[base], coord[base + 1], coord[base + 2]],
            }
        })
        .collect()
}

// ================================================================ STEP 1-7: the harness run
#[derive(Debug, Clone)]
pub struct HarnessReport {
    pub slice_len: usize,
    pub slice_agt: String,
    pub coord_60d: [u16; HYPER_DIM],
    pub edges: Vec<EdgeVerdict>, // step 5 — every wavelength watched
    pub supervisors: Vec<MtpSupervisor>, // step 4
    pub recovered_byte_identical: bool, // step 7
    pub recovery_via: String,
}
impl HarnessReport {
    /// Emit the report as HBP hot-path rows (json=0). No JSON, no Node.
    pub fn to_hbp(&self) -> Vec<String> {
        let mut rows = vec![format!(
            "QPRISM3D|slice_len={}|agt={}|coord0={}|byte_identical={}|via={}|dims={}|fire=0|json=0",
            self.slice_len,
            self.slice_agt,
            self.coord_60d[0],
            self.recovered_byte_identical,
            self.recovery_via,
            HYPER_DIM
        )];
        for e in &self.edges {
            rows.push(format!(
                "WAVELENGTH|name={}|omnishannon={:?}|gnn={}|reverse_gnn={}|json=0",
                e.wavelength, e.omnishannon, e.gnn_watch, e.reverse_gnn_watch
            ));
        }
        for s in &self.supervisors {
            rows.push(format!(
                "MTP|head={}|pid={}|cylinder={}|geo={:?}|json=0",
                s.mtp, s.pid, s.cylinder, s.geospatial
            ));
        }
        rows
    }
}

/// Run the full 3D Q-PRISM slice harness on a frozen slice.
pub fn run(slice: &[u8], seat: &Pid) -> Result<HarnessReport, Held> {
    // step 2 + 5: split into wavelengths, watch every edge with Omnishannon (+ GNN/reverse-GNN scaffold)
    let edges = omnishannon_watch(slice);
    if edges.iter().any(|e| e.omnishannon == ShannonMark::Held) {
        return Err(Held::RecoveryMismatch); // a wavelength lane lost bits -> the watcher holds the whole run
    }
    // step 3: 60D Brown-Hilbert coordinate
    let coord = project_60d(slice, seat);
    // step 4: MTP-1/2/3 visual PID supervisors, one per pole
    let supervisors = spawn_mtp_supervisors(slice, seat, &coord);
    // step 6: recombine through the multi-cylinder / Path-2 consent lanes (no store)
    let sh: Vec<Vec<u64>> = CYLINDERS
        .iter()
        .map(|&p| cylinder_shadow(slice, p))
        .collect();
    let refs: Vec<(&[u64], u64)> = sh
        .iter()
        .zip(CYLINDERS.iter())
        .map(|(s, &p)| (s.as_slice(), p))
        .collect();
    let recovered = recombine(&refs, slice.len())?;
    // step 7: prove byte-identical recovery
    let byte_identical = recovered == slice;
    Ok(HarnessReport {
        slice_len: slice.len(),
        slice_agt: format!("AGT-{}", sha16(slice)),
        coord_60d: coord,
        edges,
        supervisors,
        recovered_byte_identical: byte_identical,
        recovery_via: format!("{}-cylinder-consent(no-store)", CYLINDERS.len()),
    })
}

// ================================================================ EXPANSION
// Operator-authorized 2026-07-04 (Jesse Daniel Brown, APEX HUMAN, owner OP-JESSE): the 60D+ HOLD
// (itself an operator decision, 2026-06-01) is LIFTED. Expansion is executed the canon way -
// PARAMETRIC, REVERSIBLE, receipt-bearing - and routed to the owning seats (cube_cubed_sealer +
// HELM + PROF-ACER cosign, PROF-AETHER nonce) for the seal. Addressing-coordinate expansion is free
// + reversible [MEASURED]; a genuinely-new SEMANTIC orthogonal axis (a new D#=prime^3 MEANING) is
// PROPOSED-pending-seal, never self-declared. Runtime binding above the signed 49D catalog stays
// seal-gated until the owning seats ratify.

/// The nth prime (1-indexed): nth_prime(1)=2. Trial division; fine for the ladder range.
pub fn nth_prime(n: usize) -> u64 {
    if n <= 1 {
        return 2;
    }
    let (mut count, mut c) = (1usize, 2u64);
    loop {
        c += 1;
        let (mut is, mut d) = (true, 2u64);
        while d * d <= c {
            if c % d == 0 {
                is = false;
                break;
            }
            d += 1;
        }
        if is {
            count += 1;
            if count == n {
                return c;
            }
        }
    }
}

/// Canon-sealed Hilbert prime-cube anchors (D# -> prime), READ from canon, not recomputed. D25-D49
/// follow prime(D); D50 is the council-sealed META_RATIFICATION anchor 233 (= prime(51), the one
/// intentional skip). The sealed sequence is authority, not my arithmetic.
pub const CANON_ANCHOR_PRIMES: [(usize, u64); 9] = [
    (25, 97),
    (32, 131),
    (35, 149),
    (40, 173),
    (43, 191),
    (47, 211),
    (48, 223),
    (49, 227),
    (50, 233),
];

/// The Hilbert prime-cube anchor for dimension `d`: prime^3. Uses the canon-sealed prime where one
/// exists; beyond the signed catalog it defaults to nth_prime(d)^3 and the axis is PROPOSED.
pub fn dim_anchor(d: usize) -> u128 {
    let p = CANON_ANCHOR_PRIMES
        .iter()
        .find(|(dd, _)| *dd == d)
        .map(|(_, p)| *p)
        .unwrap_or_else(|| nth_prime(d)) as u128;
    p * p * p
}
/// True iff `d` is inside the SIGNED-executable catalog (<=49D). D50-D60+ are constitutional/
/// recorded; runtime binding above 49 stays seal-gated until the owning seats ratify.
pub fn dim_is_signed_executable(d: usize) -> bool {
    d <= 49
}

/// Parametric N-dimension Brown-Hilbert projection. `n_dims` is a PARAMETER (reversible expansion:
/// 60 = the held ceiling, or any N to expand the addressing coordinate). The slice's recovery is via
/// the multi-cylinder consent lane and is INDEPENDENT of `n_dims` - expanding the coordinate adds
/// addressing resolution, it never touches byte-identity.
pub fn project_nd(slice: &[u8], pid: &Pid, n_dims: usize) -> Vec<u16> {
    let mut sel = vec![0u16; n_dims];
    let (mut i, mut counter) = (0usize, 0u32);
    while i < n_dims {
        let mut buf = Vec::with_capacity(12 + slice.len());
        buf.extend_from_slice(&pid.0);
        buf.extend_from_slice(&counter.to_be_bytes());
        buf.extend_from_slice(slice);
        let h = sha256(&buf);
        let mut j = 0;
        while j + 1 < 32 && i < n_dims {
            sel[i] = (((h[j] as u16) << 8) | h[j + 1] as u16) & 0x3FF;
            i += 1;
            j += 2;
        }
        counter += 1;
    }
    sel
}

/// Emit the expansion PROPOSAL as hot-path HBP rows (json=0) for the owning seats to seal.
pub fn expansion_proposal_hbp(slice: &[u8], seat: &Pid, target_dims: usize) -> Vec<String> {
    let coord = project_nd(slice, seat, target_dims);
    let coord_sha = sha16(
        &coord
            .iter()
            .flat_map(|x| x.to_be_bytes())
            .collect::<Vec<u8>>(),
    );
    vec![
        format!("EXPANSION|authorized_by=JESSE-DANIEL-BROWN-APEX|seat={}|target_dims={}|held_ceiling=60|signed_exec=49|coord_sha={}|reversible=1|fire=0|json=0",
            seat.hex(), target_dims, coord_sha),
        "EXPANSION-ROUTE|seal=cube_cubed_sealer(1006)|phase=HELM|cosign=PROF-ACER|nonce=PROF-AETHER|status=PROPOSED-pending-seal|json=0".to_string(),
        "EXPANSION-BOUNDARY|addressing_coord=MEASURED-free-reversible|semantic_axis=PROPOSED-needs-genuinely-new-orthogonal-axis|runtime_above_49D=seal-gated|json=0".to_string(),
    ]
}

// ============ PIE RESOLUTION: N-prime-cylinder atlas (operator Jesse Brown, 2026-07-04) ============
// Jesse's PIE resolution: represent an object as N-PRIME-CYLINDER activations - every prime to N
// activates as the slice's residue on that cylinder; the activation vector, at a given frequency,
// lands on a perfect (N-1)-sphere; its shadow projects to pixels (pixels-first); a JEPA / world-model
// (LeCun) predicts in this prime-cylinder LATENT, so prediction is 0-loss on the DETERMINED component
// (the unpredictable is discarded by design, honoring Shannon). This fixes correction #2: the atlas
// axes are prime-keyed (D#=prime(d)^3), not arbitrary sha glyphs, and the coordinate == the shadow set.

/// The prime axes of the N-dimensional atlas: dimension d -> prime(d) (canon-sealed where it exists).
pub fn prime_atlas_axes(n_dims: usize) -> Vec<u64> {
    (1..=n_dims)
        .map(|d| {
            CANON_ANCHOR_PRIMES
                .iter()
                .find(|(dd, _)| *dd == d)
                .map(|(_, p)| *p)
                .unwrap_or_else(|| nth_prime(d))
        })
        .collect()
}
/// Project a slice onto the N-prime-cylinder atlas: (prime(d), activation=residue) per dimension.
/// The activation vector is the addressing/sphere view; recovery stays the exact per-block CRT.
pub fn project_prime_atlas(slice: &[u8], n_dims: usize) -> Vec<(u64, u64)> {
    // FNV-style fold of the slice blocks into one addressing value, then residue on each prime axis
    let val = blocks(slice).iter().fold(0xcbf29ce484222325u128, |a, &b| {
        (a ^ b).wrapping_mul(0x100000001b3)
    });
    prime_atlas_axes(n_dims)
        .into_iter()
        .map(|p| (p, (val % p as u128) as u64))
        .collect()
}

// ================================================================ tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canon_anchors_match_the_sealed_ladder() {
        assert_eq!(dim_anchor(25), 97u128.pow(3)); // 912673
        assert_eq!(dim_anchor(47), 211u128.pow(3)); // 9393931
        assert_eq!(dim_anchor(48), 223u128.pow(3));
        assert_eq!(dim_anchor(49), 227u128.pow(3));
        assert_eq!(dim_anchor(50), 233u128.pow(3)); // 12649337 council-sealed, NOT prime(50)=229
        assert_eq!(nth_prime(25), 97);
        assert_eq!(nth_prime(50), 229); // proof the D50 skip is a canon choice, not arithmetic
    }

    #[test]
    fn expansion_is_parametric_reversible_and_recovery_untouched() {
        let seat = Pid::from_hex("8467a937cba309f7");
        let slice = b"operator-authorized expansion: expand as needed and possible";
        for n in [49usize, 60, 64, 128, 233] {
            assert_eq!(project_nd(slice, &seat, n).len(), n);
        }
        let sh: Vec<Vec<u64>> = CYLINDERS
            .iter()
            .map(|&p| cylinder_shadow(slice, p))
            .collect();
        let refs: Vec<(&[u64], u64)> = sh
            .iter()
            .zip(CYLINDERS.iter())
            .map(|(s, &p)| (s.as_slice(), p))
            .collect();
        assert_eq!(recombine(&refs, slice.len()).unwrap(), slice);
        assert!(dim_is_signed_executable(49) && !dim_is_signed_executable(50));
        let rows = expansion_proposal_hbp(slice, &seat, 128);
        assert!(rows[0].contains("target_dims=128") && rows[0].ends_with("json=0"));
        assert!(rows[1].contains("cube_cubed_sealer") && rows[1].contains("PROF-ACER"));
    }

    #[test]
    fn pie_prime_atlas_axes_are_prime_keyed_not_arbitrary_sha() {
        let axes = prime_atlas_axes(50);
        assert_eq!(axes[24], 97); // d=25 -> prime 97 (canon anchor) — fixes correction #2
        assert_eq!(axes[46], 211); // d=47 -> 211
        assert_eq!(axes[49], 233); // d=50 -> council-sealed 233 (not prime(50)=229)
        let coord = project_prime_atlas(b"PIE resolved via N-prime cylinders", 50);
        assert_eq!(coord.len(), 50);
        assert!(coord.iter().all(|(p, a)| a < p)); // every prime activates as a residue on its cylinder
    }

    #[test]
    fn sha256_kat() {
        assert_eq!(
            hex(&sha256(b"abc")),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn every_lossless_wavelength_round_trips_byte_identical() {
        let slice = b"a frozen slice of the 3D Q-PRISM -- watched at every edge";
        for w in Wavelength::ALL {
            let repr = w.encode(slice);
            if w.is_lossless_lane() {
                assert_eq!(
                    w.decode(&repr, slice.len()).as_deref(),
                    Some(&slice[..]),
                    "{} must be lossless",
                    w.name()
                );
            } else {
                assert!(
                    w.decode(&repr, slice.len()).is_none(),
                    "sha is a shadow, not byte-recoverable"
                );
                assert!(repr.starts_with("AGT-"));
            }
        }
    }

    #[test]
    fn omnishannon_marks_seven_lossless_one_shadow() {
        let v = omnishannon_watch(b"omnishannon at every edge");
        assert_eq!(
            v.iter()
                .filter(|e| e.omnishannon == ShannonMark::Lossless)
                .count(),
            7
        );
        assert_eq!(
            v.iter()
                .filter(|e| e.omnishannon == ShannonMark::Shadow)
                .count(),
            1
        );
        assert_eq!(
            v.iter()
                .filter(|e| e.omnishannon == ShannonMark::Held)
                .count(),
            0
        );
    }

    #[test]
    fn multicyl_recombine_no_store_byte_identical() {
        let slice = b"recombined from cloned cylinder shadows, retained nowhere";
        let sh: Vec<Vec<u64>> = CYLINDERS
            .iter()
            .map(|&p| cylinder_shadow(slice, p))
            .collect();
        let refs: Vec<(&[u64], u64)> = sh
            .iter()
            .zip(CYLINDERS.iter())
            .map(|(s, &p)| (s.as_slice(), p))
            .collect();
        assert_eq!(recombine(&refs, slice.len()).unwrap(), slice);
        // any 2 of the 4 cylinders already exceed the 48-bit block roof -> recover from a SUBSET
        assert_eq!(recombine(&refs[0..2], slice.len()).unwrap(), slice);
        assert_eq!(recombine(&refs[2..4], slice.len()).unwrap(), slice);
        // one cylinder alone (~2^25 < 2^48) -> HELD (Shannon)
        assert_eq!(
            recombine(&refs[0..1], slice.len()),
            Err(Held::InsufficientJointCapacity)
        );
    }

    #[test]
    fn full_harness_run_proves_byte_identical() {
        let seat = Pid::from_hex("8467a937cba309f7");
        for slice in [
            &b""[..],
            &b"x"[..],
            &b"the living 3D Q-PRISM, every slice byte-identical"[..],
            &vec![0xABu8; 300][..],
        ] {
            let r = run(slice, &seat).unwrap();
            assert!(r.recovered_byte_identical, "len={}", slice.len());
            assert_eq!(r.coord_60d.len(), 60);
            assert_eq!(r.supervisors.len(), 3);
            assert_eq!(r.edges.len(), 8);
            let hbp = r.to_hbp();
            assert!(hbp[0].ends_with("|json=0") && !hbp[0].contains('{'));
        }
    }
}
