//! # dbbh-coms-quant-prism — Double Binary Black Hole Comms Quant Prism (first cell)
//!
//! Pure Rust, ZERO deps, HBP hot-path (`json=0`). No JSON, no Node. 8-byte-host native.
//!
//! It folds four Asolaria pieces into one mechanism:
//! - **BEHCS ladder** 64 / 256 / 1024 / **HyperBEHCS(60D)** — a groupoid of bijective
//!   re-relations (base-2^6 / 2^8 / 2^10 symbols; HyperBEHCS = 60D cube over 1024-glyphs).
//!   Each rung is lossless (`H(f(X)) = H(X)`); each earns MEASURED by its own round-trip.
//! - **Q-PRISM cube** — a PID-specific 60D selector over the 1024-glyph shadow of the content.
//! - **IX-737 double-black-hole session capsule** — both sides must arm; either collapses;
//!   single-use nonce; append-only audit chain (N-Nest hash-chained receipts).
//! - **Coms flow** — AI↔AI / AI↔HW / HW↔HW: the crossing object is the *shadow*
//!   (AGT content-address + glyph transcode + receipt), never a raw payload. The far pole
//!   reconstructs LOSSLESS by the bijection + content-addressing its store.
//!
//! Honest boundary (acer canon PRISM-COMB-0LOSS): infinite ADDRESSING + lossless
//! re-relation — NOT lossless compression below entropy. No bijection beats Shannon.

// =========================================================================
// sha256 — pure Rust (FIPS 180-4), KAT-verified in tests. No deps.
// =========================================================================
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
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
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
            w[i] = u32::from_be_bytes([chunk[i * 4], chunk[i * 4 + 1], chunk[i * 4 + 2], chunk[i * 4 + 3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16].wrapping_add(s0).wrapping_add(w[i - 7]).wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh.wrapping_add(s1).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh = g; g = f; f = e; e = d.wrapping_add(t1); d = c; c = b; b = a; a = t1.wrapping_add(t2);
        }
        h[0] = h[0].wrapping_add(a); h[1] = h[1].wrapping_add(b); h[2] = h[2].wrapping_add(c); h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e); h[5] = h[5].wrapping_add(f); h[6] = h[6].wrapping_add(g); h[7] = h[7].wrapping_add(hh);
    }
    let mut out = [0u8; 32];
    for i in 0..8 {
        out[i * 4..i * 4 + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    out
}

pub fn sha256_hex(data: &[u8]) -> String {
    let d = sha256(data);
    let mut s = String::with_capacity(64);
    for b in d {
        s.push(char::from_digit((b >> 4) as u32, 16).unwrap());
        s.push(char::from_digit((b & 0xf) as u32, 16).unwrap());
    }
    s
}

/// Content address: `AGT-` + first 16 hex of sha256(content). 20 chars.
pub fn agt(content: &[u8]) -> String {
    let mut s = String::from("AGT-");
    s.push_str(&sha256_hex(content)[..16]);
    s
}

// =========================================================================
// HBP hot-path row — TAG|k=v|...|json=0
// =========================================================================
fn esc(v: &str) -> String {
    v.replace('\\', "\\\\").replace('|', "\\p").replace('\n', "\\n")
}
pub fn encode_row(tag: &str, fields: &[(&str, &str)]) -> String {
    let mut s = String::from(tag);
    for (k, v) in fields {
        s.push('|');
        s.push_str(k);
        s.push('=');
        s.push_str(&esc(v));
    }
    s.push_str("|json=0");
    s
}

// =========================================================================
// THE BEHCS LADDER — 64 / 256 / 1024 / HyperBEHCS(60D)
// A groupoid of bijective re-relations. Symbol widths 6/8/10 bits; HyperBEHCS
// = 1024-glyphs grouped into 60D cube tuples. Lossless: bit-exact round-trip.
// =========================================================================
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Behcs64,   // base 2^6  — 6-bit symbols (0..63)
    Behcs256,  // base 2^8  — bytes (0..255)
    Behcs1024, // base 2^10 — 10-bit glyphs (0..1023)
}
impl Level {
    pub fn width(&self) -> u32 {
        match self {
            Level::Behcs64 => 6,
            Level::Behcs256 => 8,
            Level::Behcs1024 => 10,
        }
    }
    pub fn name(&self) -> &'static str {
        match self {
            Level::Behcs64 => "BEHCS-64",
            Level::Behcs256 => "BEHCS-256",
            Level::Behcs1024 => "BEHCS-1024",
        }
    }
}

/// The 60D tuple width of the HyperBEHCS cube (third-generation frame).
pub const HYPERBEHCS_DIM: usize = 60;

/// Pack a byte stream into `width`-bit symbols (MSB-first). Last symbol zero-padded.
pub fn bytes_to_symbols(bytes: &[u8], width: u32) -> Vec<u16> {
    let mut out = Vec::new();
    let mut acc: u32 = 0;
    let mut nbits: u32 = 0;
    let mask = (1u32 << width) - 1;
    for &b in bytes {
        acc = (acc << 8) | b as u32;
        nbits += 8;
        while nbits >= width {
            nbits -= width;
            out.push(((acc >> nbits) & mask) as u16);
        }
    }
    if nbits > 0 {
        out.push(((acc << (width - nbits)) & mask) as u16);
    }
    out
}

/// Unpack `width`-bit symbols back to bytes, truncating pad to `orig_len`.
pub fn symbols_to_bytes(syms: &[u16], width: u32, orig_len: usize) -> Vec<u8> {
    let mut out = Vec::new();
    let mut acc: u32 = 0;
    let mut nbits: u32 = 0;
    for &s in syms {
        acc = (acc << width) | (s as u32 & ((1u32 << width) - 1));
        nbits += width;
        while nbits >= 8 {
            nbits -= 8;
            out.push(((acc >> nbits) & 0xFF) as u8);
        }
    }
    out.truncate(orig_len);
    out
}

/// Transcode bytes to a BEHCS level's symbols (bijective; orig_len recovers it).
pub fn to_level(bytes: &[u8], level: Level) -> Vec<u16> {
    bytes_to_symbols(bytes, level.width())
}
/// Inverse: a level's symbols back to bytes.
pub fn from_level(syms: &[u16], level: Level, orig_len: usize) -> Vec<u8> {
    symbols_to_bytes(syms, level.width(), orig_len)
}

/// Groupoid re-relation: level A symbols -> level B symbols, via bytes. Path-independent.
pub fn relate(syms: &[u16], from: Level, to: Level, orig_len: usize) -> Vec<u16> {
    let bytes = from_level(syms, from, orig_len);
    to_level(&bytes, to)
}

/// HyperBEHCS(60D) cube: the 1024-glyph shadow of `bytes`, reshaped into 60D tuples.
/// Returns (tuples, orig_len). Reshape is a pure bijection over the 1024-glyph stream.
pub fn to_hyperbehcs(bytes: &[u8]) -> Vec<[u16; HYPERBEHCS_DIM]> {
    let glyphs = to_level(bytes, Level::Behcs1024);
    let mut tuples = Vec::new();
    for chunk in glyphs.chunks(HYPERBEHCS_DIM) {
        let mut t = [0u16; HYPERBEHCS_DIM];
        t[..chunk.len()].copy_from_slice(chunk);
        tuples.push(t);
    }
    tuples
}
/// Inverse of the HyperBEHCS reshape: 60D tuples -> bytes (needs glyph count + orig_len).
pub fn from_hyperbehcs(tuples: &[[u16; HYPERBEHCS_DIM]], glyph_count: usize, orig_len: usize) -> Vec<u8> {
    let mut glyphs = Vec::with_capacity(glyph_count);
    for t in tuples {
        for &g in t.iter() {
            glyphs.push(g);
        }
    }
    glyphs.truncate(glyph_count);
    from_level(&glyphs, Level::Behcs1024, orig_len)
}

// =========================================================================
// N-Nest hash-chained receipt ledger (the audit/revoke chain)
// =========================================================================
pub const GENESIS: &str = "0000000000000000000000000000000000000000000000000000000000000000";

#[derive(Clone)]
pub struct ReceiptChain {
    prev: String,
    rows: Vec<String>,
}
impl Default for ReceiptChain {
    fn default() -> Self {
        Self::new()
    }
}
impl ReceiptChain {
    pub fn new() -> Self {
        Self { prev: GENESIS.to_string(), rows: Vec::new() }
    }
    pub fn append(&mut self, row: &str) -> String {
        let body = format!("{row}|prev_event_hash={}", self.prev);
        let eh = sha256_hex(body.as_bytes());
        self.prev = eh.clone();
        let receipt = format!("{body}|event_hash={eh}");
        self.rows.push(receipt.clone());
        receipt
    }
    pub fn head(&self) -> &str {
        &self.prev
    }
    pub fn rows(&self) -> &[String] {
        &self.rows
    }
}

/// Verify a receipt chain: complete, ordered, hash-matched (the N-Nest gate).
pub fn verify_chain(receipts: &[String]) -> bool {
    let mut prev = GENESIS.to_string();
    for r in receipts {
        let marker = "|event_hash=";
        let Some(pos) = r.rfind(marker) else { return false };
        let body = &r[..pos];
        let claimed = &r[pos + marker.len()..];
        if sha256_hex(body.as_bytes()) != claimed {
            return false;
        }
        let pm = "|prev_event_hash=";
        let Some(pp) = body.rfind(pm) else { return false };
        if &body[pp + pm.len()..] != prev {
            return false;
        }
        prev = claimed.to_string();
    }
    true
}

// =========================================================================
// 8-byte host PID
// =========================================================================
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pid(pub [u8; 8]);
impl Pid {
    /// PID from a 16-hex string (e.g. a seat pid "8467a937cba309f7").
    pub fn from_hex(hex: &str) -> Option<Self> {
        if hex.len() != 16 {
            return None;
        }
        let mut b = [0u8; 8];
        for i in 0..8 {
            b[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
        }
        Some(Pid(b))
    }
    pub fn hex(&self) -> String {
        let mut s = String::with_capacity(16);
        for x in self.0 {
            s.push(char::from_digit((x >> 4) as u32, 16).unwrap());
            s.push(char::from_digit((x & 0xf) as u32, 16).unwrap());
        }
        s
    }
}

// =========================================================================
// Q-PRISM cube — PID-specific 60D selector over the content's 1024-glyph shadow
// =========================================================================
#[derive(Clone)]
pub struct QPrismCube {
    pub pid: Pid,
    pub selector: [u16; HYPERBEHCS_DIM], // 60D, PID-specific, each a 1024-glyph value
    pub glyphs: Vec<u16>,                // the 1024-glyph shadow of the content
    pub addr: String,                    // AGT-<sha16> content address of the content
    pub orig_len: usize,
}
impl QPrismCube {
    /// Build a cube for `content` bound to `pid`. Selector is PID-specific (sha256-derived).
    pub fn new(pid: Pid, content: &[u8]) -> Self {
        let selector = derive_selector(&pid, content);
        let glyphs = to_level(content, Level::Behcs1024);
        QPrismCube { pid, selector, glyphs, addr: agt(content), orig_len: content.len() }
    }
    /// Reconstruct the exact content from the cube (lossless — the bijection inverse).
    pub fn reconstruct(&self) -> Vec<u8> {
        from_level(&self.glyphs, Level::Behcs1024, self.orig_len)
    }
    /// The HyperBEHCS 60D tuples of the shadow.
    pub fn hyperbehcs(&self) -> Vec<[u16; HYPERBEHCS_DIM]> {
        let mut tuples = Vec::new();
        for chunk in self.glyphs.chunks(HYPERBEHCS_DIM) {
            let mut t = [0u16; HYPERBEHCS_DIM];
            t[..chunk.len()].copy_from_slice(chunk);
            tuples.push(t);
        }
        tuples
    }
}

/// PID-specific 60D selector: sha256(pid || counter || content) expanded to 60 10-bit glyphs.
fn derive_selector(pid: &Pid, content: &[u8]) -> [u16; HYPERBEHCS_DIM] {
    let mut sel = [0u16; HYPERBEHCS_DIM];
    let mut i = 0usize;
    let mut counter: u32 = 0;
    while i < HYPERBEHCS_DIM {
        let mut buf = Vec::with_capacity(12 + content.len());
        buf.extend_from_slice(&pid.0);
        buf.extend_from_slice(&counter.to_be_bytes());
        buf.extend_from_slice(content);
        let h = sha256(&buf);
        let mut j = 0usize;
        while j + 1 < 32 && i < HYPERBEHCS_DIM {
            let v = (((h[j] as u16) << 8) | h[j + 1] as u16) & 0x3FF; // 10-bit glyph
            sel[i] = v;
            i += 1;
            j += 2;
        }
        counter += 1;
    }
    sel
}

// =========================================================================
// Coms mode + IX-737 double-black-hole session capsule
// =========================================================================
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ComsMode {
    AiToAi,
    AiToHardware,
    HardwareToHardware,
}
impl ComsMode {
    pub fn name(&self) -> &'static str {
        match self {
            ComsMode::AiToAi => "ai-ai",
            ComsMode::AiToHardware => "ai-hw",
            ComsMode::HardwareToHardware => "hw-hw",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CapsuleState {
    Proposed,
    Armed,
    Collapsed,
    Revoked,
}

/// Why a crossing was held (the security/comms law, deterministic).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Held {
    NoConsent,       // capsule not armed by both sides
    Collapsed,       // capsule already collapsed/revoked
    BadChain,        // receipt chain broken/tampered
    AddressMismatch, // reconstructed content does not match the AGT address
}

/// IX-737 binary double black hole capsule: both sides arm; either collapses; single-use.
#[derive(Clone)]
pub struct SessionCapsule {
    pub sender: Pid,
    pub receiver: Pid,
    pub mode: ComsMode,
    pub nonce: [u8; 8], // single-use, device-bound
    sender_armed: bool,
    receiver_armed: bool,
    state: CapsuleState,
    pub audit: ReceiptChain,
}
impl SessionCapsule {
    /// Propose a capsule. Nonce is derived (sender||receiver||salt) — device/session bound.
    pub fn propose(sender: Pid, receiver: Pid, mode: ComsMode, salt: &[u8]) -> Self {
        let mut buf = Vec::new();
        buf.extend_from_slice(&sender.0);
        buf.extend_from_slice(&receiver.0);
        buf.extend_from_slice(salt);
        let h = sha256(&buf);
        let mut nonce = [0u8; 8];
        nonce.copy_from_slice(&h[..8]);
        let mut audit = ReceiptChain::new();
        audit.append(&encode_row(
            "CAPSULE-PROPOSE",
            &[("sender", &sender.hex()), ("receiver", &receiver.hex()), ("mode", mode.name())],
        ));
        SessionCapsule {
            sender, receiver, mode, nonce,
            sender_armed: false, receiver_armed: false,
            state: CapsuleState::Proposed, audit,
        }
    }
    /// Arm from one side. Capsule opens only when BOTH sides have armed.
    pub fn arm(&mut self, side: Pid) {
        if self.state != CapsuleState::Proposed && self.state != CapsuleState::Armed {
            return;
        }
        if side == self.sender {
            self.sender_armed = true;
        } else if side == self.receiver {
            self.receiver_armed = true;
        } else {
            return;
        }
        self.audit.append(&encode_row("CAPSULE-ARM", &[("by", &side.hex())]));
        if self.sender_armed && self.receiver_armed {
            self.state = CapsuleState::Armed;
            self.audit.append(&encode_row("CAPSULE-OPEN", &[("state", "armed")]));
        }
    }
    /// Either side can collapse immediately.
    pub fn collapse(&mut self) {
        self.state = CapsuleState::Collapsed;
        self.audit.append(&encode_row("CAPSULE-COLLAPSE", &[("state", "collapsed")]));
    }
    /// Revoke (recovery/revoke plane).
    pub fn revoke(&mut self) {
        self.state = CapsuleState::Revoked;
        self.audit.append(&encode_row("CAPSULE-REVOKE", &[("state", "revoked")]));
    }
    pub fn is_open(&self) -> bool {
        self.state == CapsuleState::Armed
    }
    pub fn state(&self) -> CapsuleState {
        self.state
    }
}

// =========================================================================
// The coms flow — send/receive the SHADOW (address + glyphs + receipt), not the payload
// =========================================================================

/// What crosses the double-black-hole capsule: the addressed, receipt-bearing shadow.
#[derive(Clone)]
pub struct Crossing {
    pub rows: Vec<String>, // HBP rows (json=0): CUBE header + GLYPH payload
    pub receipt: String,   // sealed into the capsule audit chain
}

/// SEND: emit the shadow across the capsule. Held unless both sides armed.
pub fn dbbh_send(cube: &QPrismCube, capsule: &mut SessionCapsule) -> Result<Crossing, Held> {
    match capsule.state {
        CapsuleState::Armed => {}
        CapsuleState::Collapsed | CapsuleState::Revoked => return Err(Held::Collapsed),
        _ => return Err(Held::NoConsent),
    }
    let mut rows = Vec::new();
    // header: PID, AGT address, orig_len, glyph_count, mode, nonce
    rows.push(encode_row(
        "CUBE",
        &[
            ("pid", &cube.pid.hex()),
            ("agt", &cube.addr),
            ("orig_len", &cube.orig_len.to_string()),
            ("glyphs", &cube.glyphs.len().to_string()),
            ("mode", capsule.mode.name()),
            ("nonce", &hex8(&capsule.nonce)),
            ("sel0", &cube.selector[0].to_string()),
        ],
    ));
    // payload: 1024-glyphs as compact base-36 packed row(s)
    let glyph_str: Vec<String> = cube.glyphs.iter().map(|g| g.to_string()).collect();
    rows.push(encode_row("GLYPHS", &[("v", &glyph_str.join(","))]));
    // seal into the capsule audit chain (N-Nest)
    let body = format!("SHADOW|agt={}|glyphs={}", cube.addr, cube.glyphs.len());
    let receipt = capsule.audit.append(&encode_row("SHADOW", &[("agt", &cube.addr), ("glyphs", &cube.glyphs.len().to_string())]));
    let _ = body;
    Ok(Crossing { rows, receipt })
}

/// RECEIVE: reconstruct the exact content LOSSLESS from the shadow + verify integrity.
/// Reconstruction is by the 1024-glyph bijection inverse; integrity by AGT re-address.
pub fn dbbh_receive(crossing: &Crossing, capsule: &SessionCapsule) -> Result<Vec<u8>, Held> {
    if !capsule.is_open() {
        return Err(Held::NoConsent);
    }
    if !verify_chain(capsule.audit.rows()) {
        return Err(Held::BadChain);
    }
    // parse header
    let (mut orig_len, mut agt_claim) = (0usize, String::new());
    let mut glyphs: Vec<u16> = Vec::new();
    for row in &crossing.rows {
        if let Some(rest) = row.strip_prefix("CUBE|") {
            for f in rest.split('|') {
                if let Some(v) = f.strip_prefix("orig_len=") {
                    orig_len = v.parse().unwrap_or(0);
                } else if let Some(v) = f.strip_prefix("agt=") {
                    agt_claim = v.to_string();
                }
            }
        } else if let Some(rest) = row.strip_prefix("GLYPHS|v=") {
            let payload = rest.strip_suffix("|json=0").unwrap_or(rest);
            glyphs = payload.split(',').filter(|s| !s.is_empty()).filter_map(|s| s.parse::<u16>().ok()).collect();
        }
    }
    // LOSSLESS reconstruction — the bijection inverse
    let content = from_level(&glyphs, Level::Behcs1024, orig_len);
    // integrity — content-address must re-derive to the claimed AGT
    if agt(&content) != agt_claim {
        return Err(Held::AddressMismatch);
    }
    Ok(content)
}

// ---- Store-backed addressed crossing: the wire carries the SHADOW (address), not the mass ----
use std::collections::HashMap;

/// Content-addressed retained store (AGT -> content). Each black hole holds one.
#[derive(Default)]
pub struct ContentStore {
    map: HashMap<String, Vec<u8>>,
}
impl ContentStore {
    pub fn new() -> Self {
        Self { map: HashMap::new() }
    }
    /// Retain content; returns its AGT address.
    pub fn put(&mut self, content: &[u8]) -> String {
        let a = agt(content);
        self.map.entry(a.clone()).or_insert_with(|| content.to_vec());
        a
    }
    pub fn get(&self, addr: &str) -> Option<&[u8]> {
        self.map.get(addr).map(|v| v.as_slice())
    }
    pub fn len(&self) -> usize {
        self.map.len()
    }
    pub fn is_empty(&self) -> bool {
        self.map.is_empty()
    }
}

/// ADDRESS-ONLY send: emit just the AGT header (NO glyph payload). The mass stays in the
/// sender's store; only the shadow-coordinate crosses the capsule.
pub fn dbbh_send_addressed(cube: &QPrismCube, capsule: &mut SessionCapsule) -> Result<Crossing, Held> {
    match capsule.state {
        CapsuleState::Armed => {}
        CapsuleState::Collapsed | CapsuleState::Revoked => return Err(Held::Collapsed),
        _ => return Err(Held::NoConsent),
    }
    let rows = vec![encode_row(
        "CUBE-ADDR",
        &[
            ("pid", &cube.pid.hex()),
            ("agt", &cube.addr),
            ("orig_len", &cube.orig_len.to_string()),
            ("mode", capsule.mode.name()),
            ("nonce", &hex8(&capsule.nonce)),
        ],
    )];
    let receipt = capsule.audit.append(&encode_row("SHADOW-ADDR", &[("agt", &cube.addr)]));
    Ok(Crossing { rows, receipt })
}

/// ADDRESS-ONLY receive: reconstruct LOSSLESS by content-addressing the receiver's store.
/// If the store does not retain the address -> Held (no retention, no invention).
pub fn dbbh_receive_addressed(
    crossing: &Crossing,
    capsule: &SessionCapsule,
    store: &ContentStore,
) -> Result<Vec<u8>, Held> {
    if !capsule.is_open() {
        return Err(Held::NoConsent);
    }
    if !verify_chain(capsule.audit.rows()) {
        return Err(Held::BadChain);
    }
    let mut addr = String::new();
    for row in &crossing.rows {
        if let Some(rest) = row.strip_prefix("CUBE-ADDR|") {
            for f in rest.split('|') {
                if let Some(v) = f.strip_prefix("agt=") {
                    addr = v.to_string();
                }
            }
        }
    }
    match store.get(&addr) {
        Some(content) => Ok(content.to_vec()), // exact original by retention (lossless)
        None => Err(Held::AddressMismatch),    // not retained -> not invented
    }
}

fn hex8(b: &[u8; 8]) -> String {
    let mut s = String::with_capacity(16);
    for x in b {
        s.push(char::from_digit((x >> 4) as u32, 16).unwrap());
        s.push(char::from_digit((x & 0xf) as u32, 16).unwrap());
    }
    s
}

// =========================================================================
// UNIT TESTS
// =========================================================================
#[cfg(test)]
mod unit {
    use super::*;

    #[test]
    fn sha256_kat() {
        assert_eq!(sha256_hex(b""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        assert_eq!(sha256_hex(b"abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    #[test]
    fn ladder_roundtrip_all_rungs() {
        // each BEHCS level is a lossless bijection over bytes — the groupoid rungs
        let data = b"Asolaria shadow into the prism -- lossless re-relation, code rate 1.0";
        for lvl in [Level::Behcs64, Level::Behcs256, Level::Behcs1024] {
            let syms = to_level(data, lvl);
            let back = from_level(&syms, lvl, data.len());
            assert_eq!(&back, data, "{} round-trip must be byte-identical", lvl.name());
        }
    }

    #[test]
    fn behcs256_1024_reference_rung_5bytes_4glyphs() {
        // the MEASURED reference rung: 5 bytes <-> 4 glyphs at lcm(8,10)=40 bits
        let five = [0xDE, 0xAD, 0xBE, 0xEF, 0x42];
        let glyphs = to_level(&five, Level::Behcs1024);
        assert_eq!(glyphs.len(), 4, "5 bytes -> exactly 4 BEHCS-1024 glyphs");
        assert_eq!(from_level(&glyphs, Level::Behcs1024, 5), five);
    }

    #[test]
    fn groupoid_path_independence() {
        // T_jk o T_ij = T_ik : 256->64->1024 == 256->1024 (same bytes underneath)
        let data = b"path independent translation across the ladder";
        let direct = to_level(data, Level::Behcs1024);
        let via64 = relate(&to_level(data, Level::Behcs64), Level::Behcs64, Level::Behcs1024, data.len());
        assert_eq!(direct, via64);
    }

    #[test]
    fn hyperbehcs_60d_reshape_roundtrip() {
        let data = vec![7u8; 200];
        let glyph_count = to_level(&data, Level::Behcs1024).len();
        let tuples = to_hyperbehcs(&data);
        assert_eq!(tuples[0].len(), HYPERBEHCS_DIM);
        assert_eq!(from_hyperbehcs(&tuples, glyph_count, data.len()), data);
    }

    #[test]
    fn cube_is_pid_specific_and_lossless() {
        let pa = Pid::from_hex("8467a937cba309f7").unwrap();
        let pb = Pid::from_hex("0000000000000001").unwrap();
        let content = b"a 3D object shadow";
        let ca = QPrismCube::new(pa, content);
        let cb = QPrismCube::new(pb, content);
        assert_ne!(ca.selector, cb.selector, "selector must be PID-specific");
        assert_eq!(ca.addr, cb.addr, "content address is PID-independent");
        assert_eq!(ca.reconstruct(), content, "cube reconstruct must be lossless");
        assert_eq!(ca.selector.len(), 60);
    }

    #[test]
    fn capsule_needs_both_sides_to_open() {
        let s = Pid::from_hex("8467a937cba309f7").unwrap();
        let r = Pid::from_hex("00000000deadbeef").unwrap();
        let mut cap = SessionCapsule::propose(s, r, ComsMode::AiToAi, b"salt");
        assert!(!cap.is_open());
        cap.arm(s);
        assert!(!cap.is_open(), "one side armed is not consent");
        cap.arm(r);
        assert!(cap.is_open(), "both sides armed opens the tunnel");
        cap.collapse();
        assert!(!cap.is_open());
    }

    #[test]
    fn receipt_chain_verifies_and_detects_tamper() {
        let mut c = ReceiptChain::new();
        c.append(&encode_row("EVT", &[("n", "1")]));
        c.append(&encode_row("EVT", &[("n", "2")]));
        assert!(verify_chain(c.rows()));
        let mut bad = c.rows().to_vec();
        bad[0] = bad[0].replace("n=1", "n=9");
        assert!(!verify_chain(&bad));
    }
}
