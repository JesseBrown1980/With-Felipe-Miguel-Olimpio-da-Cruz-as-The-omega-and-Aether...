//! Double Binary Black Hole Comms Quant Prism (DBBH-CQP)
//!
//! Rust Host8 measured cell for the Q-PRISM design slice:
//! - BEHCS-64 / BEHCS-256 / BEHCS-1024 bit-ladder round trips;
//! - HyperBEHCS 60D selector frame backed by sha256 content addressing;
//! - double/binary-black-hole consent capsule: both sides arm, either side collapses;
//! - HBI/HBP tuple rows with json=0, no serde, no Node, no live hardware fire.
//!
//! Build/test on Linux lane:
//!   rustc --test host8/dbbh_coms_quant_prism.rs -o /tmp/dbbh_cqp && /tmp/dbbh_cqp
//!
//! This file is a simulator/receipt harness only. It does not open sockets, use a mic/display,
//! call Hilbra, spawn providers, or touch hardware.
#![allow(dead_code)]

use std::collections::BTreeMap;

pub const HYPERBEHCS_DIMS: usize = 60;
pub const BEHCS64_BITS: u8 = 6;
pub const BEHCS256_BITS: u8 = 8;
pub const BEHCS1024_BITS: u8 = 10;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LinkMode {
    AiToAi,
    AiToHardware,
    HardwareToHardware,
}

impl LinkMode {
    pub fn as_hbp(self) -> &'static str {
        match self {
            LinkMode::AiToAi => "AI_AI",
            LinkMode::AiToHardware => "AI_HW",
            LinkMode::HardwareToHardware => "HW_HW",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BehcsRung {
    Behcs64,
    Behcs256,
    Behcs1024,
}

impl BehcsRung {
    pub fn bits(self) -> u8 {
        match self {
            BehcsRung::Behcs64 => BEHCS64_BITS,
            BehcsRung::Behcs256 => BEHCS256_BITS,
            BehcsRung::Behcs1024 => BEHCS1024_BITS,
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
pub struct SymbolFrame {
    pub rung: BehcsRung,
    pub nbytes: usize,
    pub symbols: Vec<u16>,
}

impl SymbolFrame {
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

    pub fn convert(&self, to: BehcsRung) -> Self {
        Self::encode(to, &self.decode())
    }

    pub fn hbp_row(&self, agt: &Agt) -> String {
        format!(
            "DBBHCQPLADDER|rung={}|symbols={}|nbytes={}|agt={}|sha16={}|json=0",
            self.rung.label(),
            self.symbols.len(),
            self.nbytes,
            agt.tag(),
            agt.sha16_hex()
        )
    }
}

fn pack_symbols(bytes: &[u8], nbits: u8) -> Vec<u16> {
    let mut bits: u32 = 0;
    let mut held: u8 = 0;
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
    let mut bits: u32 = 0;
    let mut held: u8 = 0;
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

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct Sha256Digest(pub [u8; 32]);

impl Sha256Digest {
    pub fn hex(self) -> String {
        hex_lower(&self.0)
    }
    pub fn sha16_hex(self) -> String {
        hex_lower(&self.0[..8])
    }
    pub fn host8(self) -> Host8 {
        let mut out = [0u8; 8];
        out.copy_from_slice(&self.0[..8]);
        Host8(out)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct Host8(pub [u8; 8]);

impl Host8 {
    pub fn hex(self) -> String {
        hex_lower(&self.0)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct Agt(pub Sha256Digest);

impl Agt {
    pub fn tag(self) -> String {
        format!("AGT-{}", self.sha16_hex())
    }
    pub fn sha16_hex(self) -> String {
        self.0.sha16_hex()
    }
    pub fn host8(self) -> Host8 {
        self.0.host8()
    }
}

fn hex_lower(bytes: &[u8]) -> String {
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

#[derive(Clone, Debug)]
pub struct ContentStore {
    map: BTreeMap<Sha256Digest, Vec<u8>>,
}

impl ContentStore {
    pub fn new() -> Self {
        Self {
            map: BTreeMap::new(),
        }
    }
    pub fn put(&mut self, bytes: &[u8]) -> Agt {
        let digest = sha256(bytes);
        self.map.insert(digest, bytes.to_vec());
        Agt(digest)
    }
    pub fn insert_exact(&mut self, agt: Agt, bytes: &[u8]) -> bool {
        if sha256(bytes) != agt.0 {
            return false;
        }
        self.map.insert(agt.0, bytes.to_vec());
        true
    }
    pub fn get(&self, agt: Agt) -> Option<&[u8]> {
        self.map.get(&agt.0).map(Vec::as_slice)
    }
}

impl Default for ContentStore {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pid60D {
    pub pid: String,
    pub axes: [u16; HYPERBEHCS_DIMS],
}

impl Pid60D {
    pub fn derive(pid: &str, mode: LinkMode, agt: Agt) -> Self {
        let mut axes = [0u16; HYPERBEHCS_DIMS];
        let mut filled = 0usize;
        let mut counter = 0u8;
        while filled < HYPERBEHCS_DIMS {
            let mut seed = Vec::new();
            seed.extend_from_slice(pid.as_bytes());
            seed.push(b'|');
            seed.extend_from_slice(mode.as_hbp().as_bytes());
            seed.push(b'|');
            seed.extend_from_slice(agt.sha16_hex().as_bytes());
            seed.push(b'|');
            seed.push(counter);
            let d = sha256(&seed);
            for pair in d.0.chunks(2) {
                if filled == HYPERBEHCS_DIMS {
                    break;
                }
                axes[filled] = u16::from_be_bytes([pair[0], pair[1]]) & 0x03ff;
                filled += 1;
            }
            counter = counter.wrapping_add(1);
        }
        Self {
            pid: pid.to_string(),
            axes,
        }
    }

    pub fn hbp_fragment(&self, prefix: &str) -> String {
        let mut s = format!(
            "{}pid={}|{}dims={}",
            prefix, self.pid, prefix, HYPERBEHCS_DIMS
        );
        for (i, axis) in self.axes.iter().enumerate() {
            s.push_str(&format!("|{}d{}={}", prefix, i, axis));
        }
        s
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HyperBehcsFrame {
    pub agt: Agt,
    pub host8: Host8,
    pub source: Pid60D,
    pub target: Pid60D,
    pub mode: LinkMode,
    pub nbytes: usize,
}

impl HyperBehcsFrame {
    pub fn new(
        agt: Agt,
        source_pid: &str,
        target_pid: &str,
        mode: LinkMode,
        nbytes: usize,
    ) -> Self {
        Self {
            agt,
            host8: agt.host8(),
            source: Pid60D::derive(source_pid, mode, agt),
            target: Pid60D::derive(target_pid, mode, agt),
            mode,
            nbytes,
        }
    }

    pub fn recover<'a>(&self, store: &'a ContentStore) -> Option<&'a [u8]> {
        store.get(self.agt)
    }

    pub fn hbp_row(&self) -> String {
        let mut s = format!(
            "HYPERBEHCS60D|schema=dbbh.cqp.hyperbehcs.v1|mode={}|agt={}|sha16={}|host8={}|nbytes={}|source_pid={}|target_pid={}",
            self.mode.as_hbp(), self.agt.tag(), self.agt.sha16_hex(), self.host8.hex(), self.nbytes, self.source.pid, self.target.pid
        );
        s.push('|');
        s.push_str(&self.source.hbp_fragment("src_"));
        s.push('|');
        s.push_str(&self.target.hbp_fragment("dst_"));
        s.push_str("|json=0");
        s
    }
}

#[derive(Clone, Debug)]
pub struct DoubleBinaryCapsule {
    pub capsule8: Host8,
    pub source_pid: String,
    pub target_pid: String,
    pub mode: LinkMode,
    left_armed: bool,
    right_armed: bool,
    collapsed: bool,
    seq: u64,
}

impl DoubleBinaryCapsule {
    pub fn new(source_pid: &str, target_pid: &str, mode: LinkMode) -> Self {
        let seed = format!("DBBH|{}|{}|{}", source_pid, target_pid, mode.as_hbp());
        Self {
            capsule8: sha256(seed.as_bytes()).host8(),
            source_pid: source_pid.to_string(),
            target_pid: target_pid.to_string(),
            mode,
            left_armed: false,
            right_armed: false,
            collapsed: false,
            seq: 0,
        }
    }
    pub fn arm_left(&mut self) {
        if !self.collapsed {
            self.left_armed = true;
        }
    }
    pub fn arm_right(&mut self) {
        if !self.collapsed {
            self.right_armed = true;
        }
    }
    pub fn collapse(&mut self) {
        self.collapsed = true;
        self.left_armed = false;
        self.right_armed = false;
    }
    pub fn can_cross(&self) -> bool {
        self.left_armed && self.right_armed && !self.collapsed
    }
    pub fn next_seq(&mut self) -> Option<u64> {
        if !self.can_cross() {
            return None;
        }
        let out = self.seq;
        self.seq += 1;
        Some(out)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DbbhPacket {
    pub agt: Agt,
    pub hyper: HyperBehcsFrame,
    pub capsule8: Host8,
    pub seq: u64,
}

impl DbbhPacket {
    pub fn hbp_row(&self) -> String {
        format!(
            "DBBHCQP|schema=dbbh.cqp.v1|capsule8={}|seq={}|mode={}|src_pid={}|dst_pid={}|agt={}|sha16={}|host8={}|nbytes={}|wire=address_only|payload_bytes_on_wire=0|behcs64=1|behcs256=1|behcs1024=1|hyperbehcs60d=1|left_right_consent=1|collapse_supported=1|nodejs=0|serde=0|json_object=0|json=0",
            self.capsule8.hex(), self.seq, self.hyper.mode.as_hbp(), self.hyper.source.pid, self.hyper.target.pid,
            self.agt.tag(), self.agt.sha16_hex(), self.hyper.host8.hex(), self.hyper.nbytes
        )
    }

    pub fn hbi_row(&self, off: usize, len: usize) -> String {
        format!(
            "DBBHCQPIDX|capsule8={}|seq={}|agt={}|off={}|len={}|host8={}|json=0",
            self.capsule8.hex(),
            self.seq,
            self.agt.tag(),
            off,
            len,
            self.hyper.host8.hex()
        )
    }

    pub fn recover<'a>(&self, store: &'a ContentStore) -> Option<&'a [u8]> {
        self.hyper.recover(store)
    }
}

pub fn prepare_packet(
    capsule: &mut DoubleBinaryCapsule,
    agt: Agt,
    nbytes: usize,
) -> Option<DbbhPacket> {
    let seq = capsule.next_seq()?;
    let hyper = HyperBehcsFrame::new(
        agt,
        &capsule.source_pid,
        &capsule.target_pid,
        capsule.mode,
        nbytes,
    );
    Some(DbbhPacket {
        agt,
        hyper,
        capsule8: capsule.capsule8,
        seq,
    })
}

pub fn audit_replay_row(packet: &DbbhPacket) -> String {
    format!(
        "DBBHCQPAUDIT|capsule8={}|seq={}|agt={}|action=replay_audit_only|fire=0|dispatch=0|hardware_fire=0|json=0",
        packet.capsule8.hex(), packet.seq, packet.agt.tag()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload() -> Vec<u8> {
        (0..4097u32)
            .map(|i| ((i.wrapping_mul(2_654_435_761) >> 11) ^ (i * 17)) as u8)
            .collect()
    }

    fn assert_tuple_row(row: &str) {
        assert!(row.ends_with("|json=0"), "row must end json=0: {}", row);
        assert!(
            !row.contains('{') && !row.contains('}') && !row.contains('"'),
            "row must not be JSON: {}",
            row
        );
    }

    #[test]
    fn unit_sha256_known_answer_tests() {
        assert_eq!(
            sha256(b"").hex(),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            sha256(b"abc").hex(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn unit_behcs_64_256_1024_each_roundtrips() {
        let p = payload();
        for rung in [
            BehcsRung::Behcs64,
            BehcsRung::Behcs256,
            BehcsRung::Behcs1024,
        ] {
            let frame = SymbolFrame::encode(rung, &p);
            assert_eq!(frame.decode(), p, "{} did not roundtrip", rung.label());
        }
    }

    #[test]
    fn suite_ladder_groupoid_pairwise_roundtrips() {
        let p = payload();
        let rungs = [
            BehcsRung::Behcs64,
            BehcsRung::Behcs256,
            BehcsRung::Behcs1024,
        ];
        for from in rungs {
            let a = SymbolFrame::encode(from, &p);
            for to in rungs {
                let b = a.convert(to);
                let c = b.convert(from);
                assert_eq!(b.decode(), p);
                assert_eq!(c.decode(), p);
            }
        }
    }

    #[test]
    fn unit_hyperbehcs_is_store_backed_lossless_reference() {
        let p = payload();
        let mut store = ContentStore::new();
        let agt = store.put(&p);
        let hyper = HyperBehcsFrame::new(
            agt,
            "PID-AI-ACER-60D",
            "PID-HW-QPRISM-60D",
            LinkMode::AiToHardware,
            p.len(),
        );
        assert_eq!(hyper.source.axes.len(), HYPERBEHCS_DIMS);
        assert_eq!(hyper.target.axes.len(), HYPERBEHCS_DIMS);
        assert_eq!(hyper.recover(&store).unwrap(), p.as_slice());
        let row = hyper.hbp_row();
        assert_tuple_row(&row);
        assert!(row.contains("mode=AI_HW"));
        assert!(row.contains("src_dims=60"));
        assert!(row.contains("dst_dims=60"));
    }

    #[test]
    fn integration_double_binary_gate_requires_both_sides_and_supports_modes() {
        let p = payload();
        let mut store = ContentStore::new();
        let agt = store.put(&p);
        for mode in [
            LinkMode::AiToAi,
            LinkMode::AiToHardware,
            LinkMode::HardwareToHardware,
        ] {
            let mut cap = DoubleBinaryCapsule::new("PID-SRC-60D", "PID-DST-60D", mode);
            assert!(prepare_packet(&mut cap, agt, p.len()).is_none());
            cap.arm_left();
            assert!(prepare_packet(&mut cap, agt, p.len()).is_none());
            cap.arm_right();
            let packet = prepare_packet(&mut cap, agt, p.len()).expect("both sides armed");
            let row = packet.hbp_row();
            assert_tuple_row(&row);
            assert!(row.contains(&format!("mode={}", mode.as_hbp())));
            assert!(row.contains("wire=address_only"));
            assert!(row.contains("payload_bytes_on_wire=0"));
            cap.collapse();
            assert!(prepare_packet(&mut cap, agt, p.len()).is_none());
        }
    }

    #[test]
    fn system_address_only_crossing_reconstructs_only_from_retained_store() {
        let p = payload();
        let mut sender_store = ContentStore::new();
        let agt = sender_store.put(&p);
        let mut cap =
            DoubleBinaryCapsule::new("PID-AI-LIRIS-60D", "PID-AI-WESLEY-60D", LinkMode::AiToAi);
        cap.arm_left();
        cap.arm_right();
        let packet = prepare_packet(&mut cap, agt, p.len()).unwrap();
        let hbp = packet.hbp_row();
        let hbi = packet.hbi_row(128, hbp.len());
        assert_tuple_row(&hbp);
        assert_tuple_row(&hbi);
        assert!(hbp.contains("behcs64=1|behcs256=1|behcs1024=1|hyperbehcs60d=1"));
        assert!(!hbp.contains(&hex_lower(&p[..16])));

        let mut receiver_store = ContentStore::new();
        assert!(
            packet.recover(&receiver_store).is_none(),
            "address alone cannot invent missing entropy"
        );
        assert!(
            receiver_store.insert_exact(agt, &p),
            "retained store accepts only sha-matching content"
        );
        assert_eq!(packet.recover(&receiver_store).unwrap(), p.as_slice());

        cap.collapse();
        let audit = audit_replay_row(&packet);
        assert_tuple_row(&audit);
        assert!(audit.contains("replay_audit_only"));
        assert!(audit.contains("fire=0|dispatch=0|hardware_fire=0"));
    }
}
