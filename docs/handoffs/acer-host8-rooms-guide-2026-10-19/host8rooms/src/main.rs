//! host8rooms: make, verify and probe Host8 8-byte stubbed rooms on a drive.
//!
//! The mechanism, in the operator's words (voice-00.md:628): sectors "act as kinda stubbed rooms
//! where you send the message to", and "two terabytes of USB hard drive that I use as RAM". A room
//! is 8 bytes. Room `n` lives in sector file `n / R` at byte offset `(n % R) * 8`, so finding any
//! room is one seek, whatever the number of rooms.
//!
//! Trit balancing: every room has a 27-trit balanced address (K = 27 = 3^3), centred on the ground
//! room. The ground room (address 0) is the middle room, `n = total / 2`; addresses run from
//! `-total/2` to `total - 1 - total/2`, so for an even total the negative side leads by one room.
//! With an odd sector count the sectors balance too: sector 0 is the centre sector, the ground
//! room sits at its middle.
//!
//! Each room is made holding its stub: `stub = mix(word ^ seed)`, where `word` is the room's
//! 27-trit balanced address packed by the canonical tribit `TritWord` (balanced + (3^27 - 1)/2).
//! `mix` is invertible (`unmix` is its inverse, tested), so reading a stub back gives the room's
//! balanced address: two rooms can never hold the same stub, zero collisions by construction.
//! `verify` reads every room back from the drive and checks that it decodes to itself.
//!
//! Integer only (float arithmetic denied), std only, rows are HBP (`TAG|k=v|...|json=0`).
#![deny(
    clippy::float_arithmetic,
    clippy::cast_precision_loss,
    clippy::float_cmp
)]
#![forbid(unsafe_code)]

// The canonical ternary kernel (asolaria-os/kernel/core/src/tribit/mod.rs), shipped byte-exact beside this file;
// its sha256 is in TRIBIT.sha256. Reused, never reinvented.
#[path = "tribit/mod.rs"]
#[allow(dead_code)]
mod tribit;
use tribit::{TritWord, Zero};

use std::fs::File;
use std::io::{self, Read, Write};
use std::process::exit;
use std::time::Instant;

const ROOM: u64 = 8;
const BUF_ROOMS: u64 = 1 << 20; // 8 MiB per write or read
const SEAT: &str = "ACER-CLAUDE-FABLE5";
const SEAT_PID: &str = "8467a937cba309f7";

// ------------------------------------------------------------------ sha256 (std only)
mod sha {
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

    pub struct Sha256 {
        h: [u32; 8],
        buf: [u8; 64],
        len: usize,
        total: u64,
    }

    impl Sha256 {
        pub fn new() -> Self {
            Sha256 {
                h: [
                    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
                    0x1f83d9ab, 0x5be0cd19,
                ],
                buf: [0; 64],
                len: 0,
                total: 0,
            }
        }

        fn block(h: &mut [u32; 8], ch: &[u8]) {
            let mut w = [0u32; 64];
            for (i, c) in ch.chunks_exact(4).enumerate() {
                w[i] = u32::from_be_bytes([c[0], c[1], c[2], c[3]]);
            }
            for i in 16..64 {
                let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
                let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
                w[i] = w[i - 16]
                    .wrapping_add(s0)
                    .wrapping_add(w[i - 7])
                    .wrapping_add(s1);
            }
            let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh] = *h;
            for (ki, wi) in K.iter().zip(w.iter()) {
                let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
                let ch2 = (e & f) ^ ((!e) & g);
                let t1 = hh
                    .wrapping_add(s1)
                    .wrapping_add(ch2)
                    .wrapping_add(*ki)
                    .wrapping_add(*wi);
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
            for (x, y) in h.iter_mut().zip([a, b, c, d, e, f, g, hh]) {
                *x = x.wrapping_add(y);
            }
        }

        pub fn update(&mut self, mut data: &[u8]) {
            self.total = self.total.wrapping_add(data.len() as u64);
            if self.len > 0 {
                let take = (64 - self.len).min(data.len());
                self.buf[self.len..self.len + take].copy_from_slice(&data[..take]);
                self.len += take;
                data = &data[take..];
                if self.len < 64 {
                    // data is used up and the block is still partial: keep it for later
                    return;
                }
                let b = self.buf;
                Self::block(&mut self.h, &b);
                self.len = 0;
            }
            let mut it = data.chunks_exact(64);
            for ch in &mut it {
                Self::block(&mut self.h, ch);
            }
            let rest = it.remainder();
            self.buf[..rest.len()].copy_from_slice(rest);
            self.len = rest.len();
        }

        pub fn finish(mut self) -> [u8; 32] {
            let bits = self.total.wrapping_mul(8);
            let mut pad = vec![0x80u8];
            while (self.len + pad.len()) % 64 != 56 {
                pad.push(0);
            }
            pad.extend_from_slice(&bits.to_be_bytes());
            let total = self.total;
            self.update(&pad);
            self.total = total;
            let mut out = [0u8; 32];
            for (o, v) in out.chunks_exact_mut(4).zip(self.h) {
                o.copy_from_slice(&v.to_be_bytes());
            }
            out
        }
    }

    pub fn digest(data: &[u8]) -> [u8; 32] {
        let mut s = Sha256::new();
        s.update(data);
        s.finish()
    }

    pub fn hex(d: &[u8]) -> String {
        const H: &[u8; 16] = b"0123456789abcdef";
        let mut s = String::with_capacity(d.len() * 2);
        for b in d {
            s.push(char::from(H[usize::from(b >> 4)]));
            s.push(char::from(H[usize::from(b & 15)]));
        }
        s
    }
}

// ------------------------------------------------------------------ the stub: an invertible mix
const M1: u64 = 0xbf58_476d_1ce4_e5b9;
const M2: u64 = 0x94d0_49bb_1331_11eb;

/// Multiplicative inverse of an odd number modulo 2^64 (Newton: each step doubles the correct bits).
const fn modinv(c: u64) -> u64 {
    let mut x = c;
    let mut i = 0;
    while i < 6 {
        x = x.wrapping_mul(2u64.wrapping_sub(c.wrapping_mul(x)));
        i += 1;
    }
    x
}
const M1I: u64 = modinv(M1);
const M2I: u64 = modinv(M2);

#[inline]
fn mix(mut z: u64) -> u64 {
    z = (z ^ (z >> 30)).wrapping_mul(M1);
    z = (z ^ (z >> 27)).wrapping_mul(M2);
    z ^ (z >> 31)
}

#[inline]
fn unmix(mut z: u64) -> u64 {
    z ^= (z >> 31) ^ (z >> 62);
    z = z.wrapping_mul(M2I);
    z ^= (z >> 27) ^ (z >> 54);
    z = z.wrapping_mul(M1I);
    z ^= (z >> 30) ^ (z >> 60);
    z
}

/// The seed is the first 8 bytes of sha256 of the seat and the room count, so a different seat or
/// a different size makes different (but equally collision-free) stubs.
fn seed_for(total_rooms: u64) -> u64 {
    let d = sha::digest(format!("{SEAT}|{SEAT_PID}|HOST8-ROOMS|{total_rooms}").as_bytes());
    let mut b = [0u8; 8];
    b.copy_from_slice(&d[..8]);
    u64::from_be_bytes(b)
}

// ------------------------------------------------------------------ balanced layout
/// Trits per room address: K = 27 = 3^3, the canonical cube.
const TRITS: usize = 27;
/// Half-range of 27 balanced trits, (3^27 - 1) / 2. Adding it turns a balanced value into the
/// base-3 digit word that `TritWord` packs (Neg = digit 0, Nil = 1, Pos = 2).
const H27: u64 = 3_812_798_742_493;

#[derive(Clone, Copy)]
struct Layout {
    sectors: u64,
    rps: u64,
    total: u64,
    centre: u64,
    seed: u64,
}

impl Layout {
    fn new(sectors: u64, rps: u64) -> Layout {
        let total = sectors * rps;
        Layout {
            sectors,
            rps,
            total,
            centre: total / 2,
            seed: seed_for(total),
        }
    }

    /// Balanced address of room n, centred on the ground room (n = centre is 0).
    fn balanced(&self, n: u64) -> i64 {
        i64::try_from(n).unwrap_or(i64::MAX) - i64::try_from(self.centre).unwrap_or(i64::MAX)
    }

    /// The room's 27-trit word: balanced address plus the half-range, as base-3 digits.
    fn word(&self, n: u64) -> u64 {
        u64::try_from(self.balanced(n) + H27 as i64).unwrap_or(u64::MAX)
    }

    fn stub(&self, n: u64) -> u64 {
        mix(self.word(n) ^ self.seed)
    }

    /// Read back: stub -> 27-trit word -> balanced address -> room number.
    fn room_of(&self, v: u64) -> Option<u64> {
        let w = i128::from(unmix(v) ^ self.seed);
        let n = w - i128::from(H27) + i128::from(self.centre);
        if (0..i128::from(self.total)).contains(&n) {
            u64::try_from(n).ok()
        } else {
            None
        }
    }

    /// Room n -> (sector, byte offset inside the sector).
    fn locate(&self, n: u64) -> (u64, u64) {
        (n / self.rps, (n % self.rps) * ROOM)
    }

    /// Sector index centred on the middle sector (balanced when the sector count is odd).
    fn sector_balanced(&self, s: u64) -> i64 {
        i64::try_from(s).unwrap_or(i64::MAX) - i64::try_from((self.sectors - 1) / 2).unwrap_or(0)
    }

    /// How many of the 27 trits the rooms actually reach: the smallest r with
    /// (3^r - 1) / 2 >= the larger side of the balanced range.
    fn trits_occupied(&self) -> u32 {
        let reach = self.centre.max(self.total - 1 - self.centre);
        let (mut r, mut half) = (0u32, 0u64);
        while half < reach {
            half = half * 3 + 1;
            r += 1;
        }
        r
    }
}

fn sector_path(dir: &str, s: u64) -> String {
    format!("{dir}/sector-{s:03}.rooms")
}

/// The 27 balanced trits of a word (most significant first), whether TritWord round-trips it, and
/// the balanced value the trits spell (sum of direction * 3^i).
fn trits_of(word: u64) -> ([Zero; TRITS], bool, i64) {
    let mut t = [Zero::Nil; TRITS];
    TritWord(u128::from(word)).unpack(&mut t);
    let back = TritWord::pack(&t).0 == u128::from(word);
    let v = t
        .iter()
        .fold(0i64, |acc, z| acc * 3 + i64::from(z.direction()));
    (t, back, v)
}

fn trit_text(t: &[Zero]) -> String {
    t.iter()
        .map(|z| match z.direction() {
            -1 => '-',
            0 => '0',
            _ => '+',
        })
        .collect()
}

#[cfg(windows)]
fn read_exact_at(f: &File, buf: &mut [u8], mut off: u64) -> io::Result<()> {
    use std::os::windows::fs::FileExt;
    let mut done = 0;
    while done < buf.len() {
        let n = f.seek_read(&mut buf[done..], off)?;
        if n == 0 {
            return Err(io::Error::from(io::ErrorKind::UnexpectedEof));
        }
        done += n;
        off += n as u64;
    }
    Ok(())
}

#[cfg(unix)]
fn read_exact_at(f: &File, buf: &mut [u8], off: u64) -> io::Result<()> {
    use std::os::unix::fs::FileExt;
    f.read_exact_at(buf, off)
}

fn rate_mb_s(bytes: u64, ms: u128) -> u128 {
    if ms == 0 {
        0
    } else {
        u128::from(bytes) * 1000 / ms / 1_000_000
    }
}

fn header(cmd: &str, dir: &str, sectors: u64, rps: u64) -> Layout {
    let l = Layout::new(sectors, rps);
    let total = l.total;
    println!(
        "HOST8ROOMS|cmd={cmd}|seat={SEAT}|pid={SEAT_PID}|dir={dir}|sectors={sectors}|rooms_per_sector={rps}|rooms={total}|room_bytes={ROOM}|bytes={}|seed16={:016x}|json=0",
        total * ROOM,
        l.seed
    );
    println!(
        "TRITWORD|trits={TRITS}|kernel=K27_eq_3pow3|half_range={H27}|capacity_rooms=7625597484987|occupied_trits={}|free_upper_trits={}|centred_on=ground_room|json=0",
        l.trits_occupied(),
        TRITS as u32 - l.trits_occupied()
    );
    let (gs, goff) = l.locate(l.centre);
    println!(
        "GROUND|room_n={}|balanced=0|sector={gs}|sector_balanced={}|offset={goff}|balanced_min={}|balanced_max={}|negative_leads_by={}|sectors_balanced={}|json=0",
        l.centre,
        l.sector_balanced(gs),
        l.balanced(0),
        l.balanced(total - 1),
        l.centre - (total - 1 - l.centre),
        if sectors % 2 == 1 { "1_odd_count" } else { "0_even_count" }
    );
    println!(
        "ROOMLAW|room=n|balanced=n-{}|word=balanced+{H27}|sector=n/{rps}|sector_balanced=sector-{}|offset=(n%{rps})*8|lookup=one_seek|stub=mix(word^seed)|readback=unmix(stub)^seed=word|mix_invertible=1|collisions=0_by_construction|json=0",
        l.centre,
        (sectors - 1) / 2
    );
    let mut samples = vec![0, rps - 1, rps.min(total - 1)];
    samples.extend([
        l.centre.saturating_sub(1),
        l.centre,
        (l.centre + 1).min(total - 1),
        total - 1,
    ]);
    for n in samples {
        let (t, back, v) = trits_of(l.word(n));
        let (sec, off) = l.locate(n);
        println!(
            "ROOMADDR|n={n}|balanced={}|sector={sec}|sector_balanced={}|offset={off}|stub16={:016x}|trits27_msf={}|trits_spell={v}|spell_ok={}|tribit_roundtrip={}|json=0",
            l.balanced(n),
            l.sector_balanced(sec),
            l.stub(n),
            trit_text(&t),
            if v == l.balanced(n) { 1 } else { 0 },
            if back { "EXACT" } else { "FAIL" }
        );
    }
    l
}

// ------------------------------------------------------------------ make
fn make(dir: &str, sectors: u64, rps: u64, from: u64, to: u64) -> io::Result<()> {
    let l = header("make", dir, sectors, rps);
    let mut buf = vec![0u8; (BUF_ROOMS * ROOM) as usize];
    let all = Instant::now();
    let mut written = 0u64;
    for s in from..to {
        let t = Instant::now();
        let mut f = File::create(sector_path(dir, s))?;
        let base = s * rps;
        let mut done = 0u64;
        while done < rps {
            let m = BUF_ROOMS.min(rps - done);
            let part = &mut buf[..(m * ROOM) as usize];
            for (i, c) in (0u64..).zip(part.chunks_exact_mut(ROOM as usize)) {
                c.copy_from_slice(&l.stub(base + done + i).to_le_bytes());
            }
            f.write_all(part)?;
            done += m;
        }
        f.sync_all()?;
        let ms = t.elapsed().as_millis();
        written += rps * ROOM;
        println!(
            "SECTOR|s={s}|s_bal={}|first_room={base}|first_balanced={}|rooms={rps}|bytes={}|ms={ms}|mb_s={}|synced=1|json=0",
            l.sector_balanced(s),
            l.balanced(base),
            rps * ROOM,
            rate_mb_s(rps * ROOM, ms)
        );
    }
    let ms = all.elapsed().as_millis();
    println!(
        "MADE|sectors={}|rooms={}|bytes={written}|ms={ms}|mb_s={}|json=0",
        to - from,
        (to - from) * rps,
        rate_mb_s(written, ms)
    );
    Ok(())
}

// ------------------------------------------------------------------ verify
fn verify(dir: &str, sectors: u64, rps: u64) -> io::Result<u64> {
    let l = header("verify", dir, sectors, rps);
    let mut buf = vec![0u8; (BUF_ROOMS * ROOM) as usize];
    let mut buckets = [0u64; 16];
    let mut bad_total = 0u64;
    let (mut trit_checks, mut trit_bad) = (0u64, 0u64);
    let mut merkle = sha::Sha256::new();
    let all = Instant::now();
    for s in 0..sectors {
        let t = Instant::now();
        let path = sector_path(dir, s);
        let mut f = File::open(&path)?;
        let len = f.metadata()?.len();
        let mut h = sha::Sha256::new();
        let base = s * rps;
        let mut done = 0u64;
        let mut bad = 0u64;
        while done < rps {
            let m = BUF_ROOMS.min(rps - done);
            let part = &mut buf[..(m * ROOM) as usize];
            f.read_exact(part)?;
            h.update(part);
            for (i, c) in (0u64..).zip(part.chunks_exact(ROOM as usize)) {
                let v = u64::from_le_bytes([c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]]);
                // the inverse recovers the room's own balanced address from what the drive holds:
                // every room reads back as itself, so no two rooms can hold the same stub
                let n = base + done + i;
                if l.room_of(v) != Some(n) {
                    bad += 1;
                }
                // every millionth room, and both ends, also spell their 27 balanced trits
                if n % 1_000_000 == 0 || n == l.centre || n + 1 == l.total {
                    trit_checks += 1;
                    let (_, back, spelled) = trits_of(unmix(v) ^ l.seed);
                    if !back || spelled != l.balanced(n) {
                        trit_bad += 1;
                    }
                }
                buckets[(v >> 60) as usize] += 1;
            }
            done += m;
        }
        let hex = sha::hex(&h.finish());
        merkle.update(format!("{s}:{hex}\n").as_bytes());
        let ms = t.elapsed().as_millis();
        bad_total += bad;
        println!(
            "SECTORVERIFY|s={s}|s_bal={}|file_bytes={len}|rooms={rps}|bad={bad}|sha256={hex}|ms={ms}|mb_s={}|json=0",
            l.sector_balanced(s),
            rate_mb_s(rps * ROOM, ms)
        );
    }
    let ms = all.elapsed().as_millis();
    let total = l.total;
    println!("TRITCHECK|rooms_spelled={trit_checks}|bad={trit_bad}|trits=27|json=0");
    bad_total += trit_bad;
    let (mn, mx) = (
        buckets.iter().copied().min().unwrap_or(0),
        buckets.iter().copied().max().unwrap_or(0),
    );
    let mean = total / 16;
    let spread_ppm = if mean == 0 {
        0
    } else {
        u128::from(mx - mn) * 1_000_000 / u128::from(mean)
    };
    println!(
        "VERIFIED|rooms={total}|bad={bad_total}|ms={ms}|mb_s={}|top_nibble_min={mn}|top_nibble_max={mx}|spread_ppm={spread_ppm}|merkle={}|json=0",
        rate_mb_s(total * ROOM, ms),
        sha::hex(&merkle.finish())
    );
    Ok(bad_total)
}

// ------------------------------------------------------------------ probe
struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
}

fn lookups(
    files: &[File],
    l: &Layout,
    span: u64,
    count: u64,
    max_ms: u128,
    rng: &mut Rng,
) -> io::Result<(u64, u64, u128)> {
    let mut b = [0u8; 8];
    let mut bad = 0u64;
    let mut done = 0u64;
    let t = Instant::now();
    while done < count {
        let n = rng.next() % span;
        let (s, off) = l.locate(n);
        read_exact_at(&files[s as usize], &mut b, off)?;
        if l.room_of(u64::from_le_bytes(b)) != Some(n) {
            bad += 1;
        }
        done += 1;
        if done % 1024 == 0 && t.elapsed().as_millis() >= max_ms {
            break;
        }
    }
    Ok((done, bad, t.elapsed().as_nanos()))
}

fn probe(dir: &str, sectors: u64, rps: u64, hot: u64, cold: u64, max_ms: u128) -> io::Result<()> {
    let l = header("probe", dir, sectors, rps);
    let files: Vec<File> = (0..sectors)
        .map(|s| File::open(sector_path(dir, s)))
        .collect::<io::Result<_>>()?;
    let mut rng = Rng(l.seed | 1);
    // warm one sector so the hot test runs on rooms the operating system already holds in RAM
    let t = Instant::now();
    let mut f = File::open(sector_path(dir, 0))?;
    io::copy(&mut f, &mut io::sink())?;
    println!(
        "WARM|sector=0|bytes={}|ms={}|json=0",
        rps * ROOM,
        t.elapsed().as_millis()
    );
    for (name, span, count) in [("hot_sector0", rps, hot), ("cold_all", sectors * rps, cold)] {
        let (done, bad, ns) = lookups(&files, &l, span, count, max_ms, &mut rng)?;
        let per = if done == 0 { 0 } else { ns / u128::from(done) };
        let per_s = if ns == 0 {
            0
        } else {
            u128::from(done) * 1_000_000_000 / ns
        };
        println!(
            "PROBE|test={name}|span_rooms={span}|lookups={done}|bad={bad}|ns_total={ns}|ns_per_lookup={per}|lookups_per_s={per_s}|method=one_seek_read_8B|json=0"
        );
    }
    Ok(())
}

// ------------------------------------------------------------------ seal
fn seal(hbp: &str, prior: &str) -> io::Result<()> {
    let bytes = std::fs::read(hbp)?;
    let text = String::from_utf8_lossy(&bytes);
    let name = std::path::Path::new(hbp)
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    let mut hbi = format!("HBIHDR|source={name}|json=0\n");
    let mut off = 0usize;
    let mut rows = 0usize;
    for line in text.split_inclusive('\n') {
        let row = line.trim_end_matches('\n');
        if !row.is_empty() {
            rows += 1;
            hbi.push_str(&format!(
                "ROW|i={rows}|off={off}|len={}|sha16={}|json=0\n",
                row.len(),
                &sha::hex(&sha::digest(row.as_bytes()))[..16]
            ));
        }
        off += line.len();
    }
    let hbp_sha = sha::hex(&sha::digest(&bytes));
    hbi.push_str(&format!("HBIFTR|rows={rows}|hbp_sha256={hbp_sha}|json=0\n"));
    let hbi_path = format!("{hbp}.hbi");
    std::fs::write(&hbi_path, hbi.as_bytes())?;
    let hbi_sha = sha::hex(&sha::digest(hbi.as_bytes()));
    std::fs::write(format!("{hbp}.sha256"), format!("{hbp_sha}  {name}\n"))?;
    std::fs::write(
        format!("{hbi_path}.sha256"),
        format!("{hbi_sha}  {name}.hbi\n"),
    )?;
    let cube = &sha::hex(&sha::digest(
        format!("{hbp_sha}|{prior}|HBI->HBP->SHA->SH->HASH|{SEAT}").as_bytes(),
    ))[..16];
    println!("SEAL|hbp={name}|rows={rows}|hbp_sha256={hbp_sha}|hbi_sha256={hbi_sha}|cube={cube}|prior={prior}|json=0");
    Ok(())
}

fn num(a: &[String], i: usize) -> u64 {
    a.get(i).and_then(|s| s.parse().ok()).unwrap_or_else(|| {
        eprintln!("argument {i} must be a whole number");
        exit(2)
    })
}

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let usage = "usage: host8rooms make <dir> <sectors> <rooms_per_sector> [from to] | verify <dir> <sectors> <rps> | probe <dir> <sectors> <rps> <hot> <cold> <max_ms> | seal <file.hbp> <prior_cube>";
    let r = match a.get(1).map(String::as_str) {
        Some("make") if a.len() >= 5 => {
            let (s, r) = (num(&a, 3), num(&a, 4));
            let (from, to) = if a.len() >= 7 {
                (num(&a, 5), num(&a, 6))
            } else {
                (0, s)
            };
            make(&a[2], s, r, from, to.min(s))
        }
        Some("verify") if a.len() >= 5 => verify(&a[2], num(&a, 3), num(&a, 4)).map(|bad| {
            if bad != 0 {
                exit(1)
            }
        }),
        Some("probe") if a.len() >= 8 => probe(
            &a[2],
            num(&a, 3),
            num(&a, 4),
            num(&a, 5),
            num(&a, 6),
            u128::from(num(&a, 7)),
        ),
        Some("seal") if a.len() >= 4 => seal(&a[2], &a[3]),
        _ => {
            eprintln!("{usage}");
            exit(2)
        }
    };
    if let Err(e) = r {
        eprintln!("ERROR|{e}");
        exit(1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sha256_known_answers() {
        assert_eq!(
            sha::hex(&sha::digest(b"")),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            sha::hex(&sha::digest(b"abc")),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            sha::hex(&sha::digest(
                b"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"
            )),
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
        );
        // streaming in uneven pieces equals one shot
        let data: Vec<u8> = (0u32..10_000).map(|i| (i * 7 + 3) as u8).collect();
        let mut s = sha::Sha256::new();
        for ch in data.chunks(97) {
            s.update(ch);
        }
        assert_eq!(s.finish(), sha::digest(&data));
    }

    #[test]
    fn the_mix_is_invertible_so_rooms_never_collide() {
        assert_eq!(M1.wrapping_mul(M1I), 1);
        assert_eq!(M2.wrapping_mul(M2I), 1);
        let mut r = Rng(0x9E37_79B9_7F4A_7C15);
        for x in [0u64, 1, 2, u64::MAX, u64::MAX - 1, 1 << 63, 12_499_999_999] {
            assert_eq!(unmix(mix(x)), x);
        }
        for _ in 0..1_000_000 {
            let x = r.next();
            assert_eq!(unmix(mix(x)), x);
        }
    }

    #[test]
    fn room_law_locates_every_boundary() {
        let l = Layout::new(125, 100_000_000);
        assert_eq!(l.locate(0), (0, 0));
        assert_eq!(l.locate(99_999_999), (0, 99_999_999 * 8));
        assert_eq!(l.locate(100_000_000), (1, 0));
        assert_eq!(l.locate(12_499_999_999), (124, 99_999_999 * 8));
    }

    #[test]
    fn h27_is_half_of_three_to_the_27_minus_one() {
        let mut p: u64 = 1;
        for _ in 0..27 {
            p *= 3;
        }
        assert_eq!(p, 7_625_597_484_987);
        assert_eq!((p - 1) / 2, H27);
    }

    #[test]
    fn the_ground_room_is_the_centre_and_the_sectors_balance() {
        let l = Layout::new(125, 100_000_000);
        assert_eq!(l.centre, 6_250_000_000);
        assert_eq!(l.balanced(l.centre), 0);
        assert_eq!(l.balanced(0), -6_250_000_000);
        assert_eq!(l.balanced(12_499_999_999), 6_249_999_999);
        // the ground room sits at the middle of the centre sector, which is balanced sector 0
        let (s, off) = l.locate(l.centre);
        assert_eq!(s, 62);
        assert_eq!(l.sector_balanced(s), 0);
        assert_eq!(off, 50_000_000 * 8);
        assert_eq!(l.sector_balanced(0), -62);
        assert_eq!(l.sector_balanced(124), 62);
        // count is not range: 12.5e9 rooms reach 22 of the 27 trits
        assert_eq!(l.trits_occupied(), 22);
    }

    #[test]
    fn every_room_spells_its_balanced_address_in_27_trits_and_reads_back_as_itself() {
        let l = Layout::new(125, 100_000_000);
        for n in [
            0,
            1,
            99_999_999,
            6_249_999_999,
            6_250_000_000,
            6_250_000_001,
            12_499_999_999,
        ] {
            let (t, back, spelled) = trits_of(l.word(n));
            assert!(back, "TritWord round trip for room {n}");
            assert_eq!(
                spelled,
                l.balanced(n),
                "trits spell the balanced address of room {n}"
            );
            assert_eq!(l.room_of(l.stub(n)), Some(n));
            // the ground room is all Nil trits
            if n == l.centre {
                assert!(t.iter().all(|z| *z == Zero::Nil));
            }
        }
        // a stub one past the last room reads back as no room
        let outside = mix((l.word(12_499_999_999) + 1) ^ l.seed);
        assert_eq!(l.room_of(outside), None);
    }

    #[test]
    fn make_verify_probe_on_a_small_drive_folder() {
        let dir = std::env::temp_dir().join(format!("host8rooms-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let d = dir.to_string_lossy().into_owned();
        make(&d, 3, 1_000, 0, 3).unwrap();
        assert_eq!(verify(&d, 3, 1_000).unwrap(), 0);
        probe(&d, 3, 1_000, 5_000, 5_000, 10_000).unwrap();
        // one corrupted room is caught
        let p = sector_path(&d, 1);
        let mut b = std::fs::read(&p).unwrap();
        b[8 * 17] ^= 1;
        std::fs::write(&p, &b).unwrap();
        assert_eq!(verify(&d, 3, 1_000).unwrap(), 1);
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
