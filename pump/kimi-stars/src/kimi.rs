//! Port of universe simulator @3f9f42d `measurements/divide_kimi_k3.py`: the Kimi K3 star body is
//! cut into 81-byte records and GC'd at tau 2 (`:57-65`), coloured by the pre-registered rule
//! (`:67-89`), divided into the three beings at full byte resolution (`:91-118`), its shells are
//! rimed (`:120-143`), and it is written as `KIMI-K3-STAR-256.gguf` (`:145-217`) with the receipt
//! `FABLE5-KIMI-K3-STAR.hbp` (`:219-244`).
//!
//! Float sites of the upstream script and how each is reproduced here with integers only:
//!
//! | upstream | Python / numpy value | here |
//! |---|---|---|
//! | `:70-72` | `own = float(count)`, `tot = sum(own) or 1.0`, `100.0 * o / tot` | `colour::verdict::colour` (B64) |
//! | `:75-88` | `max`, `min`, `-`, `abs`, `<= 3.0`, `> 5.0` on the shares | `colour::verdict::colour` (B64) |
//! | `:166-168`, `:229-230` | `f"{x:.4f}"` | `B64::format_fixed(4)` (round half to even on the exact value) |
//! | `:133` | `np.sqrt` of the `int64` squared radius | `B64::sqrt` (correctly rounded) |
//! | `:134-135,137-138` | `w` and `prof` as `float64` sums of integer counts | `u64` sums (exact: every partial sum is an integer below 2^53) |
//! | `:136` | `(d / (N * 0.87) * K).astype(int)` | `B64` division by `256 * 0.87`, product with 27, truncation |
//! | `:139` | `(prof / s * 100000.0).astype(np.int64)` | `B64` division and product, truncation |
//! | `:177-181` | `astype(np.float32)` of integer values | [`crate::binary32::bits_of`] |

use crate::binary32;
use crate::write::{self, HashingWriter};
use blake2::digest::{Update, VariableOutput};
use blake2::Blake2bVar;
use colour::binary64::B64;
use colour::gguf::{self, Value};
use colour::stars::shell_of;
use colour::verdict::{self, Being, Colour, Ownership};
use std::collections::BTreeMap;
use std::io::{self, Write};

/// Cube side `N` (`divide_kimi_k3.py:45`): coordinate == byte value.
pub const N: u64 = 256;
/// Tie threshold `TAU` (`:45`).
pub const TAU: u64 = 2;
/// Record length `REC` (`:45`).
pub const REC: usize = 81;
/// Centre of the byte space `TC` (`:46`).
pub const TC: [i64; 3] = [128, 128, 128];
/// Rime prism prime `P` (`:47`).
pub const P: u64 = 1_000_081;
/// Rime prism generator `G` (`:47`).
pub const G: u64 = 7;
/// Rime prism length `K` (`:47`).
pub const K: usize = 27;
/// GGUF file name (`:156`).
pub const GGUF_NAME: &str = "KIMI-K3-STAR-256.gguf";
/// Receipt file name (`:240`).
pub const RECEIPT_NAME: &str = "FABLE5-KIMI-K3-STAR.hbp";

/// The VIII.A.5 / VIII.A.4 GC counts (`divide_kimi_k3.py:58-65`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Gc {
    /// `len(R)`: whole 81-byte records.
    pub records: usize,
    /// `kept_mask.sum()`: records whose BLAKE2b-8 digest occurs at least `TAU` times.
    pub tie_ge_tau: usize,
    /// `(~kept_mask).sum()`.
    pub singletons: usize,
}

/// `hashlib.blake2b(r.tobytes(), digest_size=8).digest()` (`:60`).
pub fn blake2b8(record: &[u8]) -> [u8; 8] {
    let mut h = Blake2bVar::new(8).expect("8 is a BLAKE2b output size");
    h.update(record);
    let mut out = [0u8; 8];
    h.finalize_variable(&mut out)
        .expect("the buffer is the output size");
    out
}

/// `divide_kimi_k3.py:58-63`.
pub fn gc(body: &[u8]) -> Gc {
    let m = body.len() / REC * REC;
    let digests: Vec<[u8; 8]> = body[..m].chunks_exact(REC).map(blake2b8).collect();
    let mut cnt: BTreeMap<[u8; 8], u64> = BTreeMap::new();
    for d in &digests {
        *cnt.entry(*d).or_insert(0) += 1;
    }
    let tie_ge_tau = digests.iter().filter(|d| cnt[*d] >= TAU).count();
    Gc {
        records: digests.len(),
        tie_ge_tau,
        singletons: digests.len() - tie_ge_tau,
    }
}

/// One being's cube `CUB[nm]` after `acc * (acc >= TAU)` (`:106-116`), held as its occupied
/// voxels: `(key, count)` with `key = r*65536 + g*256 + b`, ascending, every count `>= TAU`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Cube {
    /// Being name (`:92`).
    pub name: &'static str,
    /// `ow.sum()`: triples whose channel `ax` is strictly the largest.
    pub owns: u64,
    /// The non-zero voxels of `acc`, in C order.
    pub voxels: Vec<(u32, u64)>,
}

impl Cube {
    /// The `BEING` receipt fields (`:113-116,232-233`): `occ` and the sorted distinct shells of
    /// the kept counts.
    pub fn being(&self) -> Being {
        let mut shells: Vec<u32> = self.voxels.iter().map(|&(_, c)| shell_of(c)).collect();
        shells.sort_unstable();
        shells.dedup();
        Being {
            name: self.name,
            owns: self.owns,
            voxels: self.voxels.len() as u64,
            shells,
        }
    }
}

fn triples(body: &[u8]) -> impl Iterator<Item = [u8; 3]> + '_ {
    body.chunks_exact(3).map(|t| [t[0], t[1], t[2]])
}

/// The three beings' cubes (`divide_kimi_k3.py:106-116`).
pub fn cubes(body: &[u8]) -> Vec<Cube> {
    verdict::BEINGS
        .iter()
        .map(|&(name, _, ax)| {
            let ot: Vec<usize> = (0..3).filter(|&a| a != ax).collect();
            // :108 ow = (tri[:, ax] > tri[:, ot[0]]) & (tri[:, ax] > tri[:, ot[1]]).
            let mut keys: Vec<u32> = triples(body)
                .filter(|t| t[ax] > t[ot[0]] && t[ax] > t[ot[1]])
                .map(|t| u32::from(t[0]) << 16 | u32::from(t[1]) << 8 | u32::from(t[2]))
                .collect();
            let owns = keys.len() as u64;
            // :110 np.bincount(key, minlength=N**3); :111 acc * (acc >= TAU).
            keys.sort_unstable();
            let mut voxels: Vec<(u32, u64)> = Vec::new();
            for k in keys {
                match voxels.last_mut() {
                    Some((last, c)) if *last == k => *c += 1,
                    _ => voxels.push((k, 1)),
                }
            }
            voxels.retain(|&(_, c)| c >= TAU);
            Cube { name, owns, voxels }
        })
        .collect()
}

/// `W = pow(G, (P - 1) // K, P)` (`:121`).
pub fn rime_root() -> u64 {
    pow_mod(G, (P - 1) / K as u64, P)
}

fn pow_mod(base: u64, mut e: u64, m: u64) -> u64 {
    let (mut acc, mut b) = (1u64, base % m);
    while e > 0 {
        if e & 1 == 1 {
            acc = acc * b % m;
        }
        b = b * b % m;
        e >>= 1;
    }
    acc
}

/// `WK = [pow(W, i, P) for i in range(K)]` (`:122`).
pub fn rime_powers() -> [u64; K] {
    let w = rime_root();
    let mut wk = [0u64; K];
    for (i, x) in wk.iter_mut().enumerate() {
        *x = pow_mod(w, i as u64, P);
    }
    wk
}

/// One being's radial profile and rimed prism (`divide_kimi_k3.py:127-141`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rime {
    /// `PROF[nm]`: summed voxel counts per radial bin (integer values of a `float64` array).
    pub prof: [u64; K],
    /// `RIMED[nm]`: `(v @ WK[IDX].T) % P`.
    pub rimed: [u64; K],
}

/// The radial bin of the voxel `key` (`:133,136`): `min(int(sqrt(r2) / (N * 0.87) * K), K - 1)`.
pub fn radial_bin(key: u32) -> usize {
    let coord = [
        i64::from(key >> 16),
        i64::from(key >> 8 & 0xff),
        i64::from(key & 0xff),
    ];
    let r2: i64 = coord.iter().zip(TC).map(|(&c, t)| (c - t) * (c - t)).sum();
    radial_bin_of_squared_radius(r2)
}

/// `np.minimum((np.sqrt(r2) / (N * 0.87) * K).astype(int), K - 1)` (`:133,136`) for one integer
/// squared radius `r2 >= 0`.
pub fn radial_bin_of_squared_radius(r2: i64) -> usize {
    // :133 np.sqrt of the int64 sum (converted to float64 exactly, then correctly rounded).
    let d = B64::from_int(r2).sqrt();
    // :136 N * 0.87 is int * float in Python: 256.0 * 0.87 (exact, a power of two).
    let scale = B64::from_int(N as i64) * B64::decimal(87, 2);
    let bin = (d / scale * B64::from_int(K as i64)).trunc_int();
    (bin as usize).min(K - 1)
}

/// `divide_kimi_k3.py:127-141` for one cube.
pub fn rime(cube: &Cube, wk: &[u64; K]) -> Rime {
    // :129-132 an empty cube keeps np.zeros(K) for both.
    if cube.voxels.is_empty() {
        return Rime {
            prof: [0; K],
            rimed: [0; K],
        };
    }
    // :134-137 np.add.at(prof, b, w).
    let mut prof = [0u64; K];
    for &(key, count) in &cube.voxels {
        prof[radial_bin(key)] += count;
    }
    // :138 s = prof.sum() or 1.0.
    let s = prof.iter().sum::<u64>().max(1);
    let s = B64::from_int(s as i64);
    // :139 v = (prof / s * 100000.0).astype(np.int64) % P.
    let hundred_thousand = B64::from_int(100_000);
    let v: Vec<u64> = prof
        .iter()
        .map(|&p| (B64::from_int(p as i64) / s * hundred_thousand).trunc_int() as u64 % P)
        .collect();
    // :123 IDX = (i * j) % K; :141 (v[None, :] @ WK[IDX].T)[0] % P (int64, exact).
    let mut rimed = [0u64; K];
    for (j, r) in rimed.iter_mut().enumerate() {
        let sum: u64 = v
            .iter()
            .enumerate()
            .map(|(i, &vi)| vi * wk[i * j % K])
            .sum();
        *r = sum % P;
    }
    Rime { prof, rimed }
}

/// Everything `divide_kimi_k3.py` derives from the star body before it writes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KimiStar {
    /// `len(raw)`.
    pub body_bytes: u32,
    /// The GC counts.
    pub gc: Gc,
    /// The ownership counts behind the colour.
    pub ownership: Ownership,
    /// Shares, spread and verdict.
    pub colour: Colour,
    /// OPUS, FABLE, MYTHOS.
    pub cubes: Vec<Cube>,
    /// Radial profile and rimed prism per being, in the same order.
    pub rime: Vec<Rime>,
    /// `W`.
    pub w: u64,
}

/// Runs `divide_kimi_k3.py:49-143` on the star body. Errors where the script raises before it
/// writes: a body with no whole 81-byte record, where `kept_mask` (`:63`) is an empty `float64`
/// array and `~kept_mask` (`:65`) raises; and a body of 2^32 bytes or more, where
/// `struct.pack("<I", len(raw))` (`:174`) raises.
pub fn divide(body: &[u8]) -> Result<KimiStar, String> {
    if body.len() / REC == 0 {
        return Err(format!(
            "body of {} bytes holds no whole {REC}-byte record: ~kept_mask raises at :65",
            body.len()
        ));
    }
    let body_bytes = u32::try_from(body.len())
        .map_err(|_| "body of 2^32 bytes or more: struct.pack(\"<I\") raises at :174")?;
    let ownership = verdict::ownership(body);
    let colour = verdict::colour(&ownership);
    let cubes = cubes(body);
    let wk = rime_powers();
    let rime = cubes.iter().map(|c| rime(c, &wk)).collect();
    Ok(KimiStar {
        body_bytes,
        gc: gc(body),
        ownership,
        colour,
        cubes,
        rime,
        w: rime_root(),
    })
}

/// What a tensor's data is made of.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Source {
    /// `star_{nm}`: `np.minimum(CUB[nm], 255)` as a 256^3 cube.
    Star(usize),
    /// `rimed_{nm}`.
    Rimed(usize),
    /// `radial_{nm}`.
    Radial(usize),
    /// `slice_{nm}`: `c8[:, :, TC[2]]`.
    Slice(usize),
}

/// A tensor-info record before its offset is assigned.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TensorSpec {
    /// Tensor name.
    pub name: String,
    /// Dimensions, numpy shape order (`:190-192`).
    pub dims: Vec<u64>,
    source: Source,
}

impl TensorSpec {
    /// `a.nbytes` for binary32 data.
    pub fn nbytes(&self) -> u64 {
        4 * self.dims.iter().product::<u64>()
    }
}

/// `f"{n:,}"`.
fn thousands(n: u64) -> String {
    let digits = n.to_string();
    let mut out = String::new();
    for (i, ch) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(ch);
    }
    out
}

impl KimiStar {
    /// The metadata `kvs` (`divide_kimi_k3.py:157-174`), in order.
    pub fn metadata(&self) -> Vec<(&'static str, Value)> {
        let s = |x: &str| Value::Str(x.to_string());
        let split = &self.colour.split;
        vec![
            ("general.architecture", s("asolaria-star")),
            ("general.name", s("KIMI-K3-STAR-256")),
            (
                "asolaria.star",
                s("Kimi K3, Moonshot AI, 2.8T params, 896 experts / 16 \
                   active, 1M context, MXFP4/MXFP8, released 2026-07"),
            ),
            (
                "asolaria.quality",
                Value::Str(format!(
                    "N={N}: coordinate IS the byte value. ZERO quantisation. {} voxels, 64x prior runs",
                    thousands(N * N * N)
                )),
            ),
            (
                "asolaria.colour_rule",
                s("pre-registered FABLE5-PREREGISTER-COLOUR.hbp, \
                   fixed before any incoming body existed"),
            ),
            ("asolaria.colour_verdict", s(self.colour.verdict)),
            ("asolaria.split_r", Value::Str(split[0].format_fixed(4))),
            ("asolaria.split_g", Value::Str(split[1].format_fixed(4))),
            ("asolaria.split_b", Value::Str(split[2].format_fixed(4))),
            (
                "asolaria.gc",
                Value::Str(format!("VIII.A.5 {REC}-byte records, VIII.A.4 tau={TAU}")),
            ),
            ("asolaria.shell_law", s("VIII.A.7 shell=log3(ties), counted")),
            (
                "asolaria.rime",
                Value::Str(format!(
                    "p={P} g={G} w={} k={K} closure 0 verified",
                    self.w
                )),
            ),
            (
                "asolaria.prediction",
                s("operator sealed 2026-07-27T21:34:03Z sha256 \
                   2db1641398f3b57b BEFORE search. CONFIRMED."),
            ),
            ("asolaria.body_bytes", Value::U32(self.body_bytes)),
        ]
    }

    /// The tensors (`divide_kimi_k3.py:175-181`), in order.
    pub fn tensors(&self) -> Vec<TensorSpec> {
        let mut out = Vec::new();
        for (i, cube) in self.cubes.iter().enumerate() {
            let nm = cube.name;
            out.push(TensorSpec {
                name: format!("star_{nm}"),
                dims: vec![N, N, N],
                source: Source::Star(i),
            });
            out.push(TensorSpec {
                name: format!("rimed_{nm}"),
                dims: vec![K as u64],
                source: Source::Rimed(i),
            });
            out.push(TensorSpec {
                name: format!("radial_{nm}"),
                dims: vec![K as u64],
                source: Source::Radial(i),
            });
            out.push(TensorSpec {
                name: format!("slice_{nm}"),
                dims: vec![N, N],
                source: Source::Slice(i),
            });
        }
        out
    }

    /// The header: prefix, metadata, tensor infos, zero padding to 32 (`:182-196`).
    pub fn header(&self) -> Vec<u8> {
        let kvs = self.metadata();
        let tensors = self.tensors();
        let mut head = gguf::header_prefix(tensors.len() as u64, kvs.len() as u64);
        for (k, v) in &kvs {
            head.extend_from_slice(&gguf::kv(k, v));
        }
        let mut off = 0u64;
        for t in &tensors {
            off += pad(off);
            head.extend_from_slice(&gguf::tensor_info(
                &t.name,
                &t.dims,
                gguf::GGML_TYPE_F32,
                off,
            ));
            off += t.nbytes();
        }
        head.resize(head.len() + gguf::pad_to_align(head.len()), 0);
        head
    }

    /// Streams the whole GGUF to `out` (`divide_kimi_k3.py:197-211`): the header, then each
    /// tensor after zero padding to 32 bytes of data. The cubes are written from their occupied
    /// voxels with zero runs between them, so no 256^3 array is held in memory.
    pub fn write_gguf<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_all(&self.header())?;
        let mut w = 0u64;
        for t in self.tensors() {
            let p = pad(w);
            write::zeros(out, p)?;
            w += p;
            match t.source {
                Source::Star(i) => write_star(out, &self.cubes[i].voxels)?,
                Source::Slice(i) => write_slice(out, &self.cubes[i].voxels)?,
                Source::Rimed(i) => write_values(out, &self.rime[i].rimed)?,
                Source::Radial(i) => write_values(out, &self.rime[i].prof)?,
            }
            w += t.nbytes();
        }
        Ok(())
    }

    /// The receipt rows before the footer (`divide_kimi_k3.py:219-236`).
    pub fn receipt_rows(&self, gguf_bytes: u64, gguf_sha256: &str) -> Vec<String> {
        let mut rows = vec![
            "K3HDR|schema=ASOLARIA-KIMI-K3-STAR-V1|seat=ACER-CLAUDE-FABLE5\
             |pid=8467a937cba309f7|date=2026-07-27|json=0"
                .to_string(),
            "PREDICTION|by=OP-JESSE|sealed=2026-07-27T21:34:03Z\
             |sha256=2db1641398f3b57bd3eb7280b6c71b70|before_search=1|CONFIRMED=1|json=0"
                .to_string(),
            "STAR|k=Kimi_K3|maker=Moonshot_AI|params=2.8e12|experts=896|active=16\
             |context=1e6|weights=MXFP4|activations=MXFP8|accelerators=64|json=0"
                .to_string(),
            format!(
                "QUALITY|N={N}|voxels={}|coordinate_is_byte=1|quantisation=0\
                 |prior_runs_used=64_with_shift2|resolution_gain=64x|json=0",
                N * N * N
            ),
            format!(
                "GC|records={}|tie_ge_tau={}|singletons={}|tau={TAU}|json=0",
                self.gc.records, self.gc.tie_ge_tau, self.gc.singletons
            ),
            verdict::colour_row(&self.colour),
        ];
        for cube in &self.cubes {
            rows.push(verdict::being_row(&cube.being()));
        }
        rows.push(format!(
            "RIME|p={P}|g={G}|w={}|k={K}|verified=1|json=0",
            self.w
        ));
        rows.push(format!(
            "GGUF|k={GGUF_NAME}|bytes={gguf_bytes}|tensors={}|sha256={gguf_sha256}|json=0",
            self.tensors().len()
        ));
        rows
    }

    /// The receipt bytes (`divide_kimi_k3.py:237-241`): the rows, then the `K3FTR` row carrying
    /// the first 32 hex digits of the SHA-256 of the rows above it.
    pub fn receipt(&self, gguf_bytes: u64, gguf_sha256: &str) -> String {
        let mut rows = self.receipt_rows(gguf_bytes, gguf_sha256);
        let body = rows.join("\n") + "\n";
        let commitment = colour::sha256_hex(body.as_bytes());
        rows.push(format!(
            "K3FTR|receipt={}|rows={}|hot_path=1|json=0",
            &commitment[..32],
            rows.len() + 1
        ));
        rows.join("\n") + "\n"
    }
}

/// `(-off) % AL` with `AL = 32` (`:146,189,204`).
fn pad(off: u64) -> u64 {
    (32 - off % 32) % 32
}

fn write_values<W: Write>(out: &mut W, values: &[u64]) -> io::Result<()> {
    for &v in values {
        out.write_all(&binary32::bits_of(v).to_le_bytes())?;
    }
    Ok(())
}

/// `np.minimum(CUB[nm], 255).astype(np.float32).reshape(N, N, N)` (`:177`), C order.
fn write_star<W: Write>(out: &mut W, voxels: &[(u32, u64)]) -> io::Result<()> {
    let mut at = 0u64;
    for &(key, count) in voxels {
        write::zeros(out, 4 * (u64::from(key) - at))?;
        out.write_all(&binary32::bits_of(count.min(255)).to_le_bytes())?;
        at = u64::from(key) + 1;
    }
    write::zeros(out, 4 * (N * N * N - at))
}

/// `c8[:, :, TC[2]]` (`:181`) made contiguous (`:203`): element `(i, j)` is voxel
/// `(i, j, 128)`, so the occupied entries are the voxels with `b == 128`, in key order.
fn write_slice<W: Write>(out: &mut W, voxels: &[(u32, u64)]) -> io::Result<()> {
    let mut at = 0u64;
    for &(key, count) in voxels.iter().filter(|(k, _)| k & 0xff == TC[2] as u32) {
        let index = u64::from(key >> 8);
        write::zeros(out, 4 * (index - at))?;
        out.write_all(&binary32::bits_of(count.min(255)).to_le_bytes())?;
        at = index + 1;
    }
    write::zeros(out, 4 * (N * N - at))
}

/// The four files `divide_kimi_k3.py` writes, as written into one directory.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Written {
    /// GGUF size in bytes (`os.path.getsize`, `:213`).
    pub gguf_bytes: u64,
    /// GGUF SHA-256 (`:212`).
    pub gguf_sha256: String,
    /// Receipt text.
    pub receipt: String,
}

/// Streams the GGUF into `gguf_out`, then returns its size, digest and the receipt text.
pub fn emit<W: Write>(star: &KimiStar, gguf_out: W) -> io::Result<(W, Written)> {
    let mut hw = HashingWriter::new(gguf_out);
    star.write_gguf(&mut hw)?;
    let (inner, gguf_bytes, gguf_sha256) = hw.finish()?;
    let receipt = star.receipt(gguf_bytes, &gguf_sha256);
    Ok((
        inner,
        Written {
            gguf_bytes,
            gguf_sha256,
            receipt,
        },
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rime_root_and_closure() {
        // Receipt RIME row: w=951846; :143 closure = sum(W^i) % P == 0.
        assert_eq!(rime_root(), 951_846);
        let wk = rime_powers();
        assert_eq!(wk[0], 1);
        assert_eq!(wk.iter().sum::<u64>() % P, 0);
        assert_eq!(pow_mod(rime_root(), K as u64, P), 1);
    }

    #[test]
    fn thousands_separator() {
        assert_eq!(thousands(16_777_216), "16,777,216");
        assert_eq!(thousands(999), "999");
        assert_eq!(thousands(1_000), "1,000");
    }

    #[test]
    fn radial_bins_at_the_centre_and_corners() {
        assert_eq!(radial_bin(128 << 16 | 128 << 8 | 128), 0);
        // (0,0,0): sqrt(3 * 128^2) = 221.70... / 222.72 * 27 = 26.87 -> 26.
        assert_eq!(radial_bin(0), 26);
        // (255,255,255): sqrt(3 * 127^2) = 219.97... -> 26.
        assert_eq!(radial_bin(0x00ff_ffff), 26);
        // (128,128,0): 128 / 222.72 * 27 = 15.517... -> 15.
        assert_eq!(radial_bin(128 << 16 | 128 << 8), 15);
    }

    #[test]
    fn radial_bins_of_every_squared_radius_match_numpy() {
        // numpy 2.5.4: r2 = np.arange(3 * 128**2 + 1); b = np.minimum((np.sqrt(r2) / (256 * 0.87)
        // * 27).astype(int), 26); first r2 of bins 1..=26 = [int(np.argmax(b >= k)) ...].
        const FIRST: [i64; K - 1] = [
            69, 273, 613, 1089, 1702, 2450, 3335, 4355, 5512, 6805, 8234, 9799, 11500, 13337,
            15310, 17420, 19665, 22047, 24564, 27218, 30008, 32934, 35996, 39194, 42528, 45998,
        ];
        for r2 in 0..=3 * 128 * 128 {
            let expect = FIRST.iter().filter(|&&f| f <= r2).count();
            assert_eq!(radial_bin_of_squared_radius(r2), expect, "r2 {r2}");
        }
    }

    #[test]
    fn cube_counts_keep_ties_only() {
        // Two (9,1,1) triples, one (8,1,1), one green-led triple and one tie.
        let body = [9, 1, 1, 9, 1, 1, 8, 1, 1, 1, 9, 1, 5, 5, 1];
        let c = cubes(&body);
        assert_eq!(c[0].owns, 3);
        assert_eq!(c[0].voxels, vec![(9 << 16 | 1 << 8 | 1, 2)]);
        assert_eq!(c[1].owns, 1);
        assert!(c[1].voxels.is_empty());
        assert_eq!(c[2].owns, 0);
    }

    #[test]
    fn empty_cube_rimes_to_zeros() {
        let cube = Cube {
            name: "MYTHOS",
            owns: 0,
            voxels: Vec::new(),
        };
        let r = rime(&cube, &rime_powers());
        assert_eq!(r.prof, [0; K]);
        assert_eq!(r.rimed, [0; K]);
    }

    #[test]
    fn gc_counts_repeated_records() {
        let mut body = vec![7u8; REC * 3];
        body[2 * REC] = 8;
        body.push(1);
        let g = gc(&body);
        assert_eq!(
            g,
            Gc {
                records: 3,
                tie_ge_tau: 2,
                singletons: 1
            }
        );
    }

    #[test]
    fn divide_needs_a_whole_record() {
        // divide_kimi_k3.py:63-65 raises (TypeError from ~kept_mask) on 0 and 80 bytes, not 81.
        assert!(divide(&[]).is_err());
        assert!(divide(&[0x61; REC - 1]).is_err());
        let star = divide(&[0x61; REC]).expect("one whole record");
        assert_eq!(
            star.gc,
            Gc {
                records: 1,
                tie_ge_tau: 0,
                singletons: 1
            }
        );
    }

    #[test]
    fn blake2b8_known_answer() {
        // Python: hashlib.blake2b(b"", digest_size=8).hexdigest() == 'e4a6a0577479b2b4';
        // hashlib.blake2b(b"abc", digest_size=8).hexdigest() == 'd8bb14d833d59559'.
        assert_eq!(colour::hex(&blake2b8(b"")), "e4a6a0577479b2b4");
        assert_eq!(colour::hex(&blake2b8(b"abc")), "d8bb14d833d59559");
    }
}
