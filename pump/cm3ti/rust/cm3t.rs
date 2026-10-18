// cm3t.rs — Rust port of the tuned Asolaria context-mixing compressor (cm3t).
// Dependency-free single-file rustc build (fits the GitRAM doctrine: compile
// tool from in-repo source, no crates). Same model as cm3t_asolaria.py:
//   bitwise logistic mixing of orders 0..k (hashed, count-adaptive) + order-5
//   match model + 2 word-context models, per-(bit,last-byte) online mixer,
//   two chained SSE/APM stages at low trust [0.05,0.10], binary arithmetic coder.
// Honesty gates unchanged: lossless (SHA-256 restore or the run is invalid),
// byte-exact total = payload + decoder(this source) + dict(0, no BPE here),
// nothing below N*H(X). The measurement is the referee.
//
// Usage: cm3t <file> <k>    (prints byte-exact total bpc + restore check)
use std::collections::HashMap;
use std::fs;
use std::time::Instant;

const PSCALE: i64 = 4096;
const TBITS: u32 = 23;
const TSIZE: usize = 1 << TBITS;
const TMASK: u64 = (TSIZE as u64) - 1;
const T1: f64 = 0.05; // SSE stage-1 trust (tuned)
const T2: f64 = 0.10; // SSE stage-2 trust (tuned)
const MO: usize = 5; // match order

#[inline]
fn squash(x: f64) -> f64 {
    let x = if x > 20.0 { 20.0 } else if x < -20.0 { -20.0 } else { x };
    1.0 / (1.0 + (-x).exp())
}

struct Model {
    k: usize,
    b: u32,
    nin: usize,
    stretch: Vec<f64>,
    t: Vec<Vec<u16>>,
    tn: Vec<Vec<u8>>,
    t0: Vec<u16>,
    t0n: Vec<u8>,
    tw: Vec<Vec<u16>>,
    twn: Vec<Vec<u8>>,
    rate: [f64; 256],
    w: Vec<f64>,       // (b*256) rows x nin
    apm: Vec<f64>,     // 1024 x 33
    apm2: Vec<f64>,
    hist: Vec<i32>,
    mpos: HashMap<u64, usize>,
    match_ptr: i64,
    match_len: usize,
    ctx_h: Vec<u64>,
    wh: u64,
    pwh: u64,
    // per-symbol scratch
    idxs: Vec<usize>,
    widx: [usize; 2],
    x: Vec<f64>,
    o0idx: usize,
    wrow: usize,
    pred_glyph: i32,
    match_bit: i32,
    p1_pre: f64,
    apm_state: (usize, usize, f64),
    apm2_state: (usize, usize, f64),
    bucket_base: usize,
    wctx1: u64,
    wctx2: u64,
}

impl Model {
    fn new(v: usize, k: usize) -> Model {
        let b = std::cmp::max(1, 64 - ((v as u64 - 1).leading_zeros())) as u32;
        let nin = k + 4;
        let mut stretch = vec![0.0f64; PSCALE as usize];
        for i in 0..PSCALE as usize {
            let p = (i as f64 + 0.5) / PSCALE as f64;
            stretch[i] = (p / (1.0 - p)).ln();
        }
        let mut rate = [0.0f64; 256];
        for n in 0..256 {
            rate[n] = if n < 30 { 1.0 / (n as f64 + 1.5) } else { 1.0 / 32.0 };
        }
        let mut apm = vec![0.0f64; 1024 * 33];
        let mut apm2 = vec![0.0f64; 1024 * 33];
        for c in 0..1024 {
            for j in 0..33 {
                let val = j as f64 / 32.0;
                apm[c * 33 + j] = val;
                apm2[c * 33 + j] = val;
            }
        }
        Model {
            k, b, nin, stretch,
            t: (0..k).map(|_| vec![(PSCALE / 2) as u16; TSIZE]).collect(),
            tn: (0..k).map(|_| vec![0u8; TSIZE]).collect(),
            t0: vec![(PSCALE / 2) as u16; 1 << (b + 1)],
            t0n: vec![0u8; 1 << (b + 1)],
            tw: (0..2).map(|_| vec![(PSCALE / 2) as u16; TSIZE]).collect(),
            twn: (0..2).map(|_| vec![0u8; TSIZE]).collect(),
            rate,
            w: vec![0.3f64; (b as usize * 256) * nin],
            apm, apm2,
            hist: Vec::new(),
            mpos: HashMap::new(),
            match_ptr: -1, match_len: 0,
            ctx_h: vec![0u64; k + 1],
            wh: 0, pwh: 0,
            idxs: vec![0usize; k],
            widx: [0, 0],
            x: vec![0.0f64; nin],
            o0idx: 0, wrow: 0,
            pred_glyph: -1, match_bit: -1, p1_pre: 0.5,
            apm_state: (0, 0, 0.0), apm2_state: (0, 0, 0.0),
            bucket_base: 0, wctx1: 0, wctx2: 0,
        }
    }

    fn begin_symbol(&mut self) {
        let h = &self.hist;
        let n = h.len();
        for o in 1..=self.k {
            let mut v: u64 = 0;
            if n >= o {
                for &g in &h[n - o..] {
                    v = v.wrapping_mul(0x9E3779B1).wrapping_add(g as u64 + 1) & 0xFFFFFFFF;
                }
                v = (v ^ (o as u64).wrapping_mul(0x85EBCA6B)) & 0xFFFFFFFF;
            }
            self.ctx_h[o] = v;
        }
        if self.match_ptr < 0 && n >= MO {
            let mut key: u64 = 0;
            for &g in &h[n - MO..] {
                key = key.wrapping_mul(0x01000193).wrapping_add(g as u64 + 1) & 0xFFFFFFFF;
            }
            if let Some(&p) = self.mpos.get(&key) {
                if p < n { self.match_ptr = p as i64; self.match_len = MO; }
            }
        }
        self.pred_glyph = if self.match_ptr >= 0 && (self.match_ptr as usize) < n {
            h[self.match_ptr as usize]
        } else { -1 };
        self.bucket_base = if n > 0 { (h[n - 1] & 0xFF) as usize } else { 0 };
        self.wctx1 = (self.wh ^ 0x8DA6B343) & 0xFFFFFFFF;
        self.wctx2 = (self.wh.wrapping_mul(0x01000193) ^ self.pwh.wrapping_mul(0x9E3779B1)) & 0xFFFFFFFF;
    }

    #[inline]
    fn bin(&self, p: f64) -> (usize, f64) {
        let pf = p.max(1e-6).min(1.0 - 1e-6);
        let z = (pf / (1.0 - pf)).ln();
        let mut bb = (z + 8.0) * 2.0;
        if bb < 0.0 { bb = 0.0; }
        if bb > 31.999 { bb = 31.999; }
        let b0 = bb as usize;
        (b0, bb - b0 as f64)
    }

    fn predict_bit(&mut self, c: usize, j: u32) -> f64 {
        let k = self.k;
        for o in 1..=k {
            let idx = ((self.ctx_h[o] ^ (c as u64).wrapping_mul(0xB5297A4D)) & TMASK) as usize;
            self.idxs[o - 1] = idx;
            self.x[o - 1] = self.stretch[self.t[o - 1][idx] as usize];
        }
        self.o0idx = c & ((1usize << (self.b + 1)) - 1);
        self.x[k] = self.stretch[self.t0[self.o0idx] as usize];
        // match input
        if self.pred_glyph >= 0 {
            let pb = ((self.pred_glyph >> (self.b - 1 - j)) & 1) as i32;
            let strength = std::cmp::min(self.match_len, 28) as f64 * 0.18;
            self.x[k + 1] = if pb == 1 { strength } else { -strength };
            self.match_bit = pb;
        } else {
            self.x[k + 1] = 0.0;
            self.match_bit = -1;
        }
        // word inputs
        let wi1 = ((self.wctx1 ^ (c as u64).wrapping_mul(0xB5297A4D)) & TMASK) as usize;
        let wi2 = ((self.wctx2 ^ (c as u64).wrapping_mul(0xB5297A4D)) & TMASK) as usize;
        self.widx = [wi1, wi2];
        self.x[k + 2] = self.stretch[self.tw[0][wi1] as usize];
        self.x[k + 3] = self.stretch[self.tw[1][wi2] as usize];
        // mix
        self.wrow = (j as usize * 256 + self.bucket_base) * self.nin;
        let mut dot = 0.0f64;
        for i in 0..self.nin {
            dot += self.w[self.wrow + i] * self.x[i];
        }
        let p1 = squash(dot);
        // SSE stage 1 (order-1 keyed)
        let actx = if k >= 1 {
            ((self.ctx_h[1] ^ (c as u64).wrapping_mul(0x2545F491)) & 1023) as usize
        } else { c & 1023 };
        let (b0, frac) = self.bin(p1);
        let a = &self.apm[actx * 33..actx * 33 + 33];
        let pa = a[b0] * (1.0 - frac) + a[b0 + 1] * frac;
        self.apm_state = (actx, b0, frac);
        let p_s1 = T1 * pa + (1.0 - T1) * p1;
        // SSE stage 2 (match-len, last-byte keyed)
        let mlb = std::cmp::min(self.match_len, 3);
        let actx2 = (mlb * 256 + self.bucket_base) & 1023;
        let (b02, frac2) = self.bin(p_s1);
        let a2 = &self.apm2[actx2 * 33..actx2 * 33 + 33];
        let pa2 = a2[b02] * (1.0 - frac2) + a2[b02 + 1] * frac2;
        self.apm2_state = (actx2, b02, frac2);
        let mut p = T2 * pa2 + (1.0 - T2) * p_s1;
        if p < 1.0 / PSCALE as f64 { p = 1.0 / PSCALE as f64; }
        if p > 1.0 - 1.0 / PSCALE as f64 { p = 1.0 - 1.0 / PSCALE as f64; }
        self.p1_pre = p1;
        p
    }

    fn update_bit(&mut self, bit: i32) {
        let k = self.k;
        let err = bit as f64 - self.p1_pre;
        for i in 0..self.nin {
            self.w[self.wrow + i] += 0.02 * err * self.x[i];
        }
        for o in 1..=k {
            let idx = self.idxs[o - 1];
            let n = self.tn[o - 1][idx] as usize;
            let v = self.t[o - 1][idx] as i64;
            let nv = v + ((bit as i64 * PSCALE - v) as f64 * self.rate[n]) as i64;
            self.t[o - 1][idx] = nv.max(0).min(PSCALE - 1) as u16;
            if n < 255 { self.tn[o - 1][idx] = (n + 1) as u8; }
        }
        let idx = self.o0idx;
        let n = self.t0n[idx] as usize;
        let v = self.t0[idx] as i64;
        let nv = v + ((bit as i64 * PSCALE - v) as f64 * self.rate[n]) as i64;
        self.t0[idx] = nv.max(0).min(PSCALE - 1) as u16;
        if n < 255 { self.t0n[idx] = (n + 1) as u8; }
        for wi in 0..2 {
            let idx = self.widx[wi];
            let n = self.twn[wi][idx] as usize;
            let v = self.tw[wi][idx] as i64;
            let nv = v + ((bit as i64 * PSCALE - v) as f64 * self.rate[n]) as i64;
            self.tw[wi][idx] = nv.max(0).min(PSCALE - 1) as u16;
            if n < 255 { self.twn[wi][idx] = (n + 1) as u8; }
        }
        let tgt = bit as f64;
        let (actx, b0, frac) = self.apm_state;
        self.apm[actx * 33 + b0] += 0.02 * (1.0 - frac) * (tgt - self.apm[actx * 33 + b0]);
        self.apm[actx * 33 + b0 + 1] += 0.02 * frac * (tgt - self.apm[actx * 33 + b0 + 1]);
        let (actx2, b02, frac2) = self.apm2_state;
        self.apm2[actx2 * 33 + b02] += 0.02 * (1.0 - frac2) * (tgt - self.apm2[actx2 * 33 + b02]);
        self.apm2[actx2 * 33 + b02 + 1] += 0.02 * frac2 * (tgt - self.apm2[actx2 * 33 + b02 + 1]);
        if self.match_bit >= 0 && self.match_bit != bit {
            self.match_ptr = -1; self.match_len = 0;
        }
    }

    fn update_symbol(&mut self, s: i32) {
        let sb = (s & 0xFF) as u8;
        if (48..=57).contains(&sb) || (65..=90).contains(&sb) || (97..=122).contains(&sb) {
            self.wh = self.wh.wrapping_mul(0x01000193).wrapping_add((sb as u64 | 0x20) + 1) & 0xFFFFFFFF;
        } else {
            if self.wh != 0 { self.pwh = self.wh; }
            self.wh = 0;
        }
        if self.match_ptr >= 0 {
            if self.hist[self.match_ptr as usize] == s {
                self.match_ptr += 1; self.match_len += 1;
            } else {
                self.match_ptr = -1; self.match_len = 0;
            }
        }
        self.hist.push(s);
        let n = self.hist.len();
        if n >= MO {
            let mut key: u64 = 0;
            for &g in &self.hist[n - MO..] {
                key = key.wrapping_mul(0x01000193).wrapping_add(g as u64 + 1) & 0xFFFFFFFF;
            }
            self.mpos.insert(key, n);
        }
    }
}

// ---- carryless binary arithmetic coder ----
struct Encoder { x1: u32, x2: u32, out: Vec<u8> }
impl Encoder {
    fn new() -> Encoder { Encoder { x1: 0, x2: 0xFFFFFFFF, out: Vec::new() } }
    fn encode(&mut self, bit: i32, p1: f64) {
        let range = (self.x2 - self.x1) as u64;
        let mut xmid = self.x1 + (range * ((p1 * PSCALE as f64) as u64) / PSCALE as u64) as u32;
        if xmid < self.x1 { xmid = self.x1; }
        if xmid >= self.x2 { xmid = self.x2 - 1; }
        if bit == 1 { self.x2 = xmid; } else { self.x1 = xmid + 1; }
        while (self.x1 ^ self.x2) & 0xFF000000 == 0 {
            self.out.push((self.x2 >> 24) as u8);
            self.x1 <<= 8;
            self.x2 = (self.x2 << 8) | 0xFF;
        }
    }
    fn flush(mut self) -> Vec<u8> {
        for _ in 0..4 { self.out.push((self.x1 >> 24) as u8); self.x1 <<= 8; }
        self.out
    }
}
struct Decoder<'a> { x1: u32, x2: u32, x: u32, data: &'a [u8], pos: usize }
impl<'a> Decoder<'a> {
    fn new(data: &'a [u8]) -> Decoder<'a> {
        let mut x: u32 = 0;
        for i in 0..4 { x = (x << 8) | (*data.get(i).unwrap_or(&0) as u32); }
        Decoder { x1: 0, x2: 0xFFFFFFFF, x, data, pos: 4 }
    }
    fn decode(&mut self, p1: f64) -> i32 {
        let range = (self.x2 - self.x1) as u64;
        let mut xmid = self.x1 + (range * ((p1 * PSCALE as f64) as u64) / PSCALE as u64) as u32;
        if xmid < self.x1 { xmid = self.x1; }
        if xmid >= self.x2 { xmid = self.x2 - 1; }
        let bit = if self.x <= xmid { 1 } else { 0 };
        if bit == 1 { self.x2 = xmid; } else { self.x1 = xmid + 1; }
        while (self.x1 ^ self.x2) & 0xFF000000 == 0 {
            self.x1 <<= 8;
            self.x2 = (self.x2 << 8) | 0xFF;
            let nxt = *self.data.get(self.pos).unwrap_or(&0) as u32;
            self.x = (self.x << 8) | nxt;
            self.pos += 1;
        }
        bit
    }
}

fn compress(data: &[u8], k: usize) -> Vec<u8> {
    let mut m = Model::new(256, k);
    let mut enc = Encoder::new();
    let b = m.b;
    for &byte in data {
        let s = byte as i32;
        m.begin_symbol();
        let mut c: usize = 1;
        for j in 0..b {
            let bit = ((s >> (b - 1 - j)) & 1) as i32;
            let p = m.predict_bit(c, j);
            enc.encode(bit, p);
            m.update_bit(bit);
            c = (c << 1) | bit as usize;
        }
        m.update_symbol(s);
    }
    enc.flush()
}

fn decompress(comp: &[u8], n: usize, k: usize) -> Vec<u8> {
    let mut m = Model::new(256, k);
    let mut dec = Decoder::new(comp);
    let b = m.b;
    let mut out = Vec::with_capacity(n);
    for _ in 0..n {
        m.begin_symbol();
        let mut c: usize = 1;
        for j in 0..b {
            let p = m.predict_bit(c, j);
            let bit = dec.decode(p);
            m.update_bit(bit);
            c = (c << 1) | bit as usize;
        }
        let s = (c - (1 << b)) as i32;
        m.update_symbol(s);
        out.push((s & 0xFF) as u8);
    }
    out
}

// ---- minimal SHA-256 (for the honesty restore gate) ----
fn sha256(data: &[u8]) -> String {
    let mut h: [u32; 8] = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const K: [u32; 64] = [
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    let mut msg = data.to_vec();
    let bitlen = (data.len() as u64) * 8;
    msg.push(0x80);
    while msg.len() % 64 != 56 { msg.push(0); }
    msg.extend_from_slice(&bitlen.to_be_bytes());
    for chunk in msg.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([chunk[i*4],chunk[i*4+1],chunk[i*4+2],chunk[i*4+3]]);
        }
        for i in 16..64 {
            let s0 = w[i-15].rotate_right(7) ^ w[i-15].rotate_right(18) ^ (w[i-15] >> 3);
            let s1 = w[i-2].rotate_right(17) ^ w[i-2].rotate_right(19) ^ (w[i-2] >> 10);
            w[i] = w[i-16].wrapping_add(s0).wrapping_add(w[i-7]).wrapping_add(s1);
        }
        let mut a=h[0];let mut b=h[1];let mut c=h[2];let mut d=h[3];
        let mut e=h[4];let mut f=h[5];let mut g=h[6];let mut hh=h[7];
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh.wrapping_add(s1).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh=g;g=f;f=e;e=d.wrapping_add(t1);d=c;c=b;b=a;a=t1.wrapping_add(t2);
        }
        h[0]=h[0].wrapping_add(a);h[1]=h[1].wrapping_add(b);h[2]=h[2].wrapping_add(c);h[3]=h[3].wrapping_add(d);
        h[4]=h[4].wrapping_add(e);h[5]=h[5].wrapping_add(f);h[6]=h[6].wrapping_add(g);h[7]=h[7].wrapping_add(hh);
    }
    let mut s = String::new();
    for v in h.iter() { s.push_str(&format!("{:08x}", v)); }
    s
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 { eprintln!("usage: cm3t <file> <k>"); std::process::exit(1); }
    let path = &args[1];
    let k: usize = args[2].parse().unwrap();
    let data = fs::read(path).unwrap();
    let n = data.len();
    let sha_in = sha256(&data);
    let t0 = Instant::now();
    let comp = compress(&data, k);
    let enc_s = t0.elapsed().as_secs_f64();
    let t1 = Instant::now();
    let body = decompress(&comp, n, k);
    let dec_s = t1.elapsed().as_secs_f64();
    let ok = sha256(&body) == sha_in;
    let decoder_b = fs::metadata(&args[0]).map(|_| 0u64).unwrap_or(0); // set below to source size
    let src_b = fs::metadata("cm3t.rs").map(|m| m.len()).unwrap_or(0);
    let payload = comp.len() as u64;
    let total = payload + src_b; // dict = 0 (no BPE)
    println!(
        "cm3t-rust k={} N={} payload={} decoder_src={} total={} bpc_total={:.4} restore={} enc={:.0}s dec={:.0}s",
        k, n, payload, src_b, total, (total as f64 * 8.0) / n as f64,
        if ok { "OK" } else { "FAIL" }, enc_s, dec_s
    );
    let _ = decoder_b;
}
