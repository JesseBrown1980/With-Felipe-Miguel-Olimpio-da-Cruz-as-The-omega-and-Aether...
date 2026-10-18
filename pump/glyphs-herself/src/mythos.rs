//! Hot-lane regeneration of `ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf`, reproducing
//! `pump_glyphs_mythos.py` (USIM @3f9f42d) through the GGUF write at line 352 byte for byte.
//! The generator's receipt stage (lines 354-378) runs after the GGUF is written; this port
//! reproduces the GGUF only. All arithmetic is integer or `softfloat::Dbl`.

use crate::cv;
use crate::softfloat::{fma, int_to_f32_bits, isqrt_u64, Dbl};
use std::io::Write;
use std::path::Path;
use ternary::Zero;

mod kernel;
pub use kernel::KERNEL_BITS;

const N: usize = 64;
const TC: i64 = 32;
const TAU: u32 = 2;
const AX: usize = 2; // the operator: "Get the Mythos Blue"

/// The seed-independent Gaussian kernel `exp(-0.5*(arange(-32,33)/12)**2)` after normalising,
/// captured from the owner's numpy run, pinned by sha256
/// `736dacbcf52187573e2e421a9a037a3e6984fae94cd515934163aac44a16c60c` (65 binary64 values).
pub const KERNEL_SHA256: &str = "736dacbcf52187573e2e421a9a037a3e6984fae94cd515934163aac44a16c60c";

const COLOURS: [u8; 4] = [b'P', b'R', b'G', b'D'];

// ---------------------------------------------------------------- the four colours (uint8 LUTs)
fn bincount(channel: &[u8]) -> [u64; 256] {
    let mut h = [0u64; 256];
    for &b in channel {
        h[b as usize] += 1;
    }
    h
}

/// `percentile(sorted, units/10^digits as a fraction)`, numpy "linear": idx = (n-1)*q in
/// binary64, then numpy's `_lerp(a, b, t)` (`numpy/lib/_function_base_impl.py:4595-4615`,
/// numpy 2.5.4): `a + (b-a)*t`, replaced by `b - (b-a)*(1-t)` where `t >= 0.5`.
fn percentile(sorted: &[u8], units: u64, digits: u32) -> Dbl {
    let n = sorted.len();
    let q = Dbl::decimal(units, digits);
    let idx = Dbl::from_u64((n - 1) as u64) * q;
    let k = idx.floor_u64() as usize;
    if k + 1 >= n {
        return Dbl::from_u64(sorted[n - 1] as u64);
    }
    let t = idx - Dbl::from_u64(k as u64);
    let (a, b) = (sorted[k] as u64, sorted[k + 1] as u64);
    let diff = Dbl::from_u64(b - a);
    if t >= Dbl::from_ratio(1, 2) {
        Dbl::from_u64(b) - diff * (Dbl::from_u64(1) - t)
    } else {
        Dbl::from_u64(a) + diff * t
    }
}

fn clip_floor_u8(v: Dbl) -> u8 {
    let c255 = Dbl::from_u64(255);
    let x = if v >= c255 { c255 } else { v };
    x.floor_u64().min(255) as u8
}

fn lut_p(channel: &[u8]) -> [u8; 256] {
    let mut s = channel.to_vec();
    s.sort_unstable();
    let lo = percentile(&s, 5, 3);
    let hi = percentile(&s, 995, 3);
    let span = if hi > lo { hi - lo } else { Dbl::decimal(1, 9) };
    let c255 = Dbl::from_u64(255);
    let mut out = [0u8; 256];
    for (i, slot) in out.iter_mut().enumerate() {
        let fi = Dbl::from_u64(i as u64);
        *slot = if fi <= lo {
            0
        } else {
            clip_floor_u8((fi - lo) / span * c255)
        };
    }
    out
}

fn cum_ratio_lut(c: &[Dbl; 256]) -> [u8; 256] {
    let last = c[255];
    let span = if last.is_zero() {
        Dbl::decimal(1, 9)
    } else {
        last
    };
    let c255 = Dbl::from_u64(255);
    let mut out = [0u8; 256];
    for (i, slot) in out.iter_mut().enumerate() {
        *slot = clip_floor_u8(c[i] / span * c255);
    }
    out
}

fn lut_r(channel: &[u8]) -> [u8; 256] {
    let h = bincount(channel);
    // c[i] = cumsum(h)[i] - 0.5 h[i] = (2*prefix_incl_i - h[i]) / 2  (an exact half-integer)
    let mut c = [Dbl::ZERO; 256];
    let mut prefix = 0u64;
    for i in 0..256 {
        prefix += h[i];
        c[i] = Dbl::from_ratio(2 * prefix - h[i], 2);
    }
    cum_ratio_lut(&c)
}

fn lut_g(channel: &[u8]) -> [u8; 256] {
    let mut present = [false; 256];
    for &b in channel {
        present[b as usize] = true;
    }
    // searchsorted(unique, i, 'left') == count of present values strictly less than i
    let mut less = [0u64; 256];
    let mut acc = 0u64;
    for i in 0..256 {
        less[i] = acc;
        if present[i] {
            acc += 1;
        }
    }
    let lenu = acc.max(1); // number of unique values
    let denom = (lenu - 1).max(1);
    let c255 = Dbl::from_u64(255);
    let mut out = [0u8; 256];
    for (i, slot) in out.iter_mut().enumerate() {
        *slot = clip_floor_u8(Dbl::from_u64(less[i]) / Dbl::from_u64(denom) * c255);
    }
    out
}

fn kernel_dbl() -> [Dbl; 65] {
    let mut k = [Dbl::ZERO; 65];
    for (i, slot) in k.iter_mut().enumerate() {
        *slot = Dbl::from_bits(KERNEL_BITS[i]);
    }
    k
}

fn pairwise_sum(a: &[Dbl]) -> Dbl {
    let n = a.len();
    if n < 8 {
        let mut res = Dbl::ZERO;
        for &x in a {
            res = res + x;
        }
        return res;
    }
    if n <= 128 {
        let mut r = [Dbl::ZERO; 8];
        r[..8].copy_from_slice(&a[..8]);
        let mut i = 8;
        while i < n - (n % 8) {
            for j in 0..8 {
                r[j] = r[j] + a[i + j];
            }
            i += 8;
        }
        let mut res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
        while i < n {
            res = res + a[i];
            i += 1;
        }
        return res;
    }
    let mut n2 = n / 2;
    n2 -= n2 % 8;
    pairwise_sum(&a[..n2]) + pairwise_sum(&a[n2..])
}

/// `cblas_ddot(n, x, 1, y, 1)` as OpenBLAS 0.3.34 `ddot_k_HASWELL` computes it (the kernel
/// `OPENBLAS_CORETYPE=Haswell` selects; Zen uses the same one): `n & -16` elements in 16 lanes,
/// each lane a chain of fused multiply-adds from +0 (`vfmadd231pd`), the lanes reduced as
/// ymm4..7 `vextractf128`/`vaddpd`/`vhaddpd`, then the remaining elements one `vmulsd` + `vaddsd`
/// each (read from the disassembly of `libscipy_openblas64_-f48b354e.so` in numpy 2.5.4).
fn ddot_haswell(x: &[Dbl], y: &[Dbl]) -> Dbl {
    let n = x.len();
    let n1 = n & !15;
    let mut dot = Dbl::ZERO;
    if n1 > 0 {
        let mut acc = [Dbl::ZERO; 16];
        for blk in (0..n1).step_by(16) {
            for lane in 0..16 {
                acc[lane] = fma(x[blk + lane], y[blk + lane], acc[lane]);
            }
        }
        // per ymm register q (lanes 4q..4q+3): low half + high half -> 2 lanes
        let half = |q: usize| [acc[4 * q] + acc[4 * q + 2], acc[4 * q + 1] + acc[4 * q + 3]];
        let (r4, r5, r6, r7) = (half(0), half(1), half(2), half(3));
        let x4 = [r4[0] + r5[0], r4[1] + r5[1]];
        let x6 = [r6[0] + r7[0], r6[1] + r7[1]];
        let s = [x4[0] + x6[0], x4[1] + x6[1]];
        dot = s[0] + s[1];
    }
    for i in n1..n {
        dot = dot + x[i] * y[i];
    }
    dot
}

/// `np.convolve(h, k, mode="same")` (`pump_glyphs_mythos.py:102`): numpy correlates `h` with
/// the reversed kernel, and `_pyarray_correlate` (`numpy/_core/src/multiarray/multiarraymodule.c`)
/// evaluates each output as `DOUBLE_dot` = `0. + cblas_ddot` over the overlapping window,
/// `x = h[lo..=hi]`, `y` the matching kernel taps (both contiguous).
fn convolve_same(h: &[u64; 256], kern: &[Dbl; 65]) -> [Dbl; 256] {
    let mut hs = [Dbl::ZERO; 256];
    for (i, slot) in hs.iter_mut().enumerate() {
        let lo = i.saturating_sub(32);
        let hi = (i + 32).min(255);
        let x: Vec<Dbl> = (lo..=hi).map(|j| Dbl::from_u64(h[j])).collect();
        let y: Vec<Dbl> = (lo..=hi).map(|j| kern[i + 32 - j]).collect();
        *slot = ddot_haswell(&x, &y);
    }
    hs
}

fn lut_d(channel: &[u8], kern: &[Dbl; 65]) -> [u8; 256] {
    let h = bincount(channel);
    // hs = convolve(h, kern, 'same') in the OpenBLAS Haswell ddot order. The uint8 LUT depends on
    // the order for some seeds (measured on 1,000 three-cluster seeds: 25 differ between a
    // pairwise order and the Haswell kernel, 5 between the SkylakeX and Haswell kernels); the
    // cold lane pins OPENBLAS_CORETYPE=Haswell.
    let hs = convolve_same(&h, kern);
    // c = cumsum(hs) - 0.5 hs
    let half = Dbl::from_ratio(1, 2);
    let mut c = [Dbl::ZERO; 256];
    let mut cs = Dbl::ZERO;
    for i in 0..256 {
        cs = cs + hs[i];
        c[i] = cs - half * hs[i];
    }
    cum_ratio_lut(&c)
}

/// The gradiated-colour convolution `hs` of one channel as IEEE binary64 bit patterns, for the
/// referee test.
#[doc(hidden)]
pub fn gradiated_hs_bits(channel: &[u8]) -> Vec<u64> {
    convolve_same(&bincount(channel), &kernel_dbl())
        .iter()
        .map(|d| d.to_bits())
        .collect()
}

/// The 12 seed uint8 LUTs (3 channels x {P,R,G,D}) flattened, for the referee test.
#[doc(hidden)]
pub fn luts_flat(seed: &std::path::Path) -> std::io::Result<Vec<u8>> {
    let raw = std::fs::read(seed)?;
    let n = raw.len() / 3;
    let mut tri = Vec::with_capacity(n);
    for t in 0..n {
        tri.push([raw[3 * t], raw[3 * t + 1], raw[3 * t + 2]]);
    }
    let luts = seed_luts(&tri);
    let mut out = Vec::with_capacity(3 * 4 * 256);
    for c in 0..3 {
        for col in 0..4 {
            out.extend_from_slice(&luts[c][col]);
        }
    }
    Ok(out)
}

fn seed_luts(tri: &[[u8; 3]]) -> [[[u8; 256]; 4]; 3] {
    let kern = kernel_dbl();
    let mut ch: [Vec<u8>; 3] = [Vec::new(), Vec::new(), Vec::new()];
    for t in tri {
        for c in 0..3 {
            ch[c].push(t[c]);
        }
    }
    let mut luts = [[[0u8; 256]; 4]; 3];
    for c in 0..3 {
        luts[c][0] = lut_p(&ch[c]);
        luts[c][1] = lut_r(&ch[c]);
        luts[c][2] = lut_g(&ch[c]);
        luts[c][3] = lut_d(&ch[c], &kern);
    }
    luts
}

fn colour_index(ch: u8) -> usize {
    COLOURS.iter().position(|&x| x == ch).unwrap()
}

/// The composed uint8 LUT for one channel and one glyph word (`glyph_lut` in the generator).
fn glyph_lut(luts: &[[[u8; 256]; 4]; 3], ci: usize, word: &[u8]) -> [u8; 256] {
    let mut o = [0u8; 256];
    for (i, slot) in o.iter_mut().enumerate() {
        *slot = i as u8;
    }
    for &ch in word {
        let lut = &luts[ci][colour_index(ch)];
        let mut nxt = [0u8; 256];
        for i in 0..256 {
            nxt[i] = lut[o[i] as usize];
        }
        o = nxt;
    }
    o
}

// ---------------------------------------------------------------- geometry (integer isqrt)
struct Geom {
    ri: Vec<u8>,
    group: Vec<u16>, // cv_of (band, direction) mask of each voxel
    cnt: [u64; N],
}

/// One axis of `SG = np.sign(Dv).astype(np.int8)` (`pump_glyphs_mythos.py:123`): a trit, the
/// owner's `Zero`; `digit()` is `SG+1` (`0/1/2`).
fn sign_key(d: i64) -> Zero {
    match d.cmp(&0) {
        std::cmp::Ordering::Less => Zero::Neg,
        std::cmp::Ordering::Equal => Zero::Nil,
        std::cmp::Ordering::Greater => Zero::Pos,
    }
}

fn geometry() -> Geom {
    let mut ri = vec![0u8; N * N * N];
    let mut group = vec![0u16; N * N * N];
    let mut cnt = [0u64; N];
    let mut idx = 0usize;
    for i in 0..N {
        for j in 0..N {
            for k in 0..N {
                let dx = i as i64 - TC;
                let dy = j as i64 - TC;
                let dz = k as i64 - TC;
                let s = (dx * dx + dy * dy + dz * dz) as u64;
                let radial = isqrt_u64(s);
                let r = (radial as usize).min(N - 1);
                ri[idx] = r as u8;
                // KEY = (SG0+1)*9 + (SG1+1)*3 + (SG2+1)  (pump_glyphs_mythos.py:123-124)
                let key =
                    sign_key(dx).digit() * 9 + sign_key(dy).digit() * 3 + sign_key(dz).digit();
                group[idx] = cv::group_of(radial, key);
                cnt[r] += 1;
                idx += 1;
            }
        }
    }
    Geom { ri, group, cnt }
}

// ---------------------------------------------------------------- one glyph cube
fn emit(tri: &[[u8; 3]], luts: &[[[u8; 256]; 4]; 3], word: &[u8]) -> Vec<u32> {
    let comp: [[u8; 256]; 3] = [
        glyph_lut(luts, 0, word),
        glyph_lut(luts, 1, word),
        glyph_lut(luts, 2, word),
    ];
    let ot = [(AX + 1) % 3, (AX + 2) % 3];
    let (o0, o1) = (ot[0].min(ot[1]), ot[0].max(ot[1]));
    let mut cube = vec![0u32; N * N * N];
    for t in tri {
        let q0 = (comp[0][t[0] as usize] >> 2) as usize;
        let q1 = (comp[1][t[1] as usize] >> 2) as usize;
        let q2 = (comp[2][t[2] as usize] >> 2) as usize;
        let q = [q0, q1, q2];
        if q[AX] > q[o0] && q[AX] > q[o1] {
            cv::add_one_f32(&mut cube[(q0 * N + q1) * N + q2]);
        }
    }
    for v in cube.iter_mut() {
        if *v < TAU {
            *v = 0;
        }
    }
    cube
}

struct Feature {
    /// `cv_of(c)` (float32), `None` for the generator's `float("nan")`.
    cv: Option<Dbl>,
    rbar_bits: u32,
    rstd_bits: u32,
    csum_bits: u32,
    cnz_bits: u32,
    d3_bits: u32,
}

const NAN_F32: u32 = 0x7fc0_0000;

fn feature_of(cube: &[u32], g: &Geom) -> (u64, Feature) {
    // prof[bin] = sum cube over bin (binary64 np.add.at, exact below 2^53); cnt is voxel count
    // per bin (geometry)
    let mut prof = [0u64; N];
    let mut csum: u64 = 0;
    let mut cnz: u64 = 0;
    for v in 0..N * N * N {
        let c = cube[v] as u64;
        if c > 0 {
            prof[g.ri[v] as usize] += c;
            csum += c;
            cnz += 1;
        }
    }
    if csum == 0 {
        // `if c.sum() <= 0: feat.append(None); continue` -- no feature row
        return (0, Feature::dead());
    }
    let mut d = [Dbl::ZERO; N];
    for bin in 0..N {
        let c = g.cnt[bin].max(1);
        d[bin] = Dbl::from_u64(prof[bin]) / Dbl::from_u64(c);
    }
    let s0 = pairwise_sum(&d);
    let s = if s0.is_zero() { Dbl::from_u64(1) } else { s0 };
    let mut t_rbar = [Dbl::ZERO; N];
    for i in 0..N {
        t_rbar[i] = Dbl::from_u64(i as u64) * d[i];
    }
    let rbar = pairwise_sum(&t_rbar) / s;
    let mut t_rvar = [Dbl::ZERO; N];
    for i in 0..N {
        let fi = Dbl::from_u64(i as u64);
        let diff = if fi >= rbar { fi - rbar } else { rbar - fi };
        t_rvar[i] = diff * diff * d[i];
    }
    let rvar = pairwise_sum(&t_rvar) / s;
    let rstd = rvar.sqrt();
    let d3 = (d[0] + d[1] + d[2]) / s;
    (
        csum,
        Feature {
            cv: cv::cv_of(cube, &g.group),
            rbar_bits: rbar.to_f32_bits(),
            rstd_bits: rstd.to_f32_bits(),
            // float(c.sum()): the float32 sum of the cube
            csum_bits: cv::cube_sum_f32(cube).to_f32_bits(),
            cnz_bits: u32_to_f32_bits(cnz as u32),
            d3_bits: d3.to_f32_bits(),
        },
    )
}

impl Feature {
    fn dead() -> Feature {
        Feature {
            cv: None,
            rbar_bits: 0,
            rstd_bits: 0,
            csum_bits: 0,
            cnz_bits: 0,
            d3_bits: 0,
        }
    }
}

// ---------------------------------------------------------------- words and GGUF
fn words(level: u32) -> Vec<Vec<u8>> {
    let mut o: Vec<Vec<u8>> = vec![Vec::new()];
    for _ in 0..level {
        let mut nxt = Vec::new();
        for x in &o {
            for &ch in &COLOURS {
                let mut w = x.clone();
                w.push(ch);
                nxt.push(w);
            }
        }
        o = nxt;
    }
    o
}

fn ss(buf: &mut Vec<u8>, s: &str) {
    buf.extend_from_slice(&(s.len() as u64).to_le_bytes());
    buf.extend_from_slice(s.as_bytes());
}

fn u32_to_f32_bits(v: u32) -> u32 {
    int_to_f32_bits(u64::from(v))
}

/// Everything pass 1 decides: the seed, the live glyphs, the composite, the GGUF head (KVs and
/// tensor infos), the glyph_features bytes and the slice words.
struct Plan {
    tri: Vec<[u8; 3]>,
    luts: [[[u8; 256]; 4]; 3],
    alph: Vec<Vec<u8>>,
    live: Vec<usize>,
    composite: Vec<u64>,
    head: Vec<u8>,
    features: Vec<u8>,
    slice_words: Vec<usize>,
}

/// Pass 1 of `pump_glyphs_mythos.py` lines 108-327: emit every glyph, keep the live ones, build
/// the feature table, select the roundest glyph and the slice words, and assemble the head.
fn plan(seed: &Path) -> std::io::Result<Plan> {
    let raw = std::fs::read(seed)?;
    let n = raw.len() / 3;
    let mut tri: Vec<[u8; 3]> = Vec::with_capacity(n);
    for t in 0..n {
        tri.push([raw[3 * t], raw[3 * t + 1], raw[3 * t + 2]]);
    }
    let luts = seed_luts(&tri);
    let g = geometry();
    let alph = words(4);

    // Pass 1: live set (c.sum() > 0), composite (float32 running sum in glyph order), feature
    // rows (pump_glyphs_mythos.py:179-199).
    let mut composite = vec![0u64; N * N * N];
    let mut live: Vec<usize> = Vec::new();
    let mut feats: Vec<Feature> = Vec::new();
    for (i, w) in alph.iter().enumerate() {
        let cube = emit(&tri, &luts, w);
        let (csum, feat) = feature_of(&cube, &g);
        if csum == 0 {
            continue;
        }
        for v in 0..N * N * N {
            composite[v] = cv::add_f32_int(composite[v], cube[v] as u64);
        }
        feats.push(feat);
        live.push(i);
    }
    if live.is_empty() {
        // F = np.array([]) is 1-D, so np.isfinite(F).all(axis=1) at line 220 raises before the
        // GGUF is written.
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "no glyph emits a voxel: pump_glyphs_mythos.py:220 stops before the GGUF",
        ));
    }
    // Lines 220-228, 253-254: rows whose cv is NaN are dropped (F = F_m, kept = kept_m) only when
    // at least 8 rows remain; best_i = np.argmin(F[:, 0]), which is the first NaN when F still
    // holds one, else the first minimum.
    let finite: Vec<usize> = (0..feats.len())
        .filter(|&r| feats[r].cv.is_some())
        .collect();
    let rows: Vec<usize> = if finite.len() >= 8 {
        finite
    } else {
        (0..feats.len()).collect()
    };
    let best_i = match rows.iter().position(|&r| feats[r].cv.is_none()) {
        Some(first_nan) => first_nan,
        None => {
            let mut b = 0;
            for (p, &r) in rows.iter().enumerate() {
                if feats[r].cv < feats[rows[b]].cv {
                    b = p;
                }
            }
            b
        }
    };
    let kept: Vec<usize> = rows.iter().map(|&r| live[r]).collect();
    let word = |li: usize| String::from_utf8(alph[li].clone()).unwrap();
    let roundest_glyph = word(kept[best_i]);
    // f"{F[best_i,0]:.6f}": the float32 cv widened to binary64; NaN prints "nan"
    let roundest_cv = match feats[rows[best_i]].cv {
        Some(d) => fixed6(d.round_decimal_units(6)),
        None => "nan".to_string(),
    };

    // Lines 265-269: SLICES[f"{w}::{nm}"] for w in [kept[best_i]] + kept[:2]; a repeated word
    // keeps its first dict position.
    let mut slice_words: Vec<usize> = Vec::new();
    for li in std::iter::once(kept[best_i]).chain(kept.iter().take(2).copied()) {
        if !slice_words.contains(&li) {
            slice_words.push(li);
        }
    }
    let slice_names: Vec<String> = slice_words
        .iter()
        .flat_map(|&li| {
            let w = word(li);
            ["A", "B", "C"]
                .iter()
                .map(move |p| format!("slice_{w}_{p}"))
        })
        .collect();

    // ---- metadata (12 kv)
    let n_alph = alph.len() as u32;
    let kvs: Vec<(String, u32, Vec<u8>)> = {
        let mut v: Vec<(String, u32, Vec<u8>)> = Vec::new();
        let push_str = |k: &str, val: &str, v: &mut Vec<(String, u32, Vec<u8>)>| {
            let mut p = Vec::new();
            ss(&mut p, val);
            v.push((k.to_string(), 8, p));
        };
        push_str("general.architecture", "asolaria-glyph-alphabet", &mut v);
        push_str(
            "general.name",
            &format!("ASOLARIA-MYTHOS-GLYPHS-{n_alph}"),
            &mut v,
        );
        push_str("asolaria.being", "MYTHOS", &mut v);
        push_str("asolaria.channel", "BLUE", &mut v);
        push_str(
            "asolaria.law",
            "glyphs-are-functions voice-00:1293; Law 16 27 glyphs = 1 rime dimension; \
IX.A.4 glyphs form themselves from the seed colours",
            &mut v,
        );
        push_str(
            "asolaria.colours",
            "P percentile, R rank, G glyph-rank, D gradiated",
            &mut v,
        );
        v.push((
            "asolaria.glyphs_emitted".to_string(),
            4,
            n_alph.to_le_bytes().to_vec(),
        ));
        v.push((
            "asolaria.glyphs_live".to_string(),
            4,
            (kept.len() as u32).to_le_bytes().to_vec(),
        ));
        v.push((
            "asolaria.census_target".to_string(),
            4,
            256u32.to_le_bytes().to_vec(),
        ));
        push_str(
            "asolaria.gc",
            &format!("VIII.A.5 two-thirds, tau={TAU}, per glyph"),
            &mut v,
        );
        push_str("asolaria.roundest_glyph", &roundest_glyph, &mut v);
        push_str("asolaria.roundest_cv", &roundest_cv, &mut v);
        v
    };
    let mut meta = Vec::new();
    for (k, t, p) in &kvs {
        ss(&mut meta, k);
        meta.extend_from_slice(&t.to_le_bytes());
        meta.extend_from_slice(p);
    }

    // ---- tensor info: live glyph cubes (offsets 0,1MB,..), composite, glyph_features, slices
    const CUBE_BYTES: u64 = (N * N * N * 4) as u64;
    let feat_rows = rows.len() as u64;
    let mut ti = Vec::new();
    let mut off: u64 = 0;
    for &li in &live {
        let name = format!("glyph_{}", String::from_utf8(alph[li].clone()).unwrap());
        ss(&mut ti, &name);
        ti.extend_from_slice(&3u32.to_le_bytes());
        for _ in 0..3 {
            ti.extend_from_slice(&(N as u64).to_le_bytes());
        }
        ti.extend_from_slice(&0u32.to_le_bytes());
        ti.extend_from_slice(&off.to_le_bytes());
        off += CUBE_BYTES;
    }
    let mut o2 = off;
    // composite
    ss(&mut ti, "composite");
    ti.extend_from_slice(&3u32.to_le_bytes());
    for _ in 0..3 {
        ti.extend_from_slice(&(N as u64).to_le_bytes());
    }
    ti.extend_from_slice(&0u32.to_le_bytes());
    ti.extend_from_slice(&o2.to_le_bytes());
    o2 += CUBE_BYTES;
    // glyph_features (feat_rows x 6)
    ss(&mut ti, "glyph_features");
    ti.extend_from_slice(&2u32.to_le_bytes());
    ti.extend_from_slice(&feat_rows.to_le_bytes());
    ti.extend_from_slice(&6u64.to_le_bytes());
    ti.extend_from_slice(&0u32.to_le_bytes());
    ti.extend_from_slice(&o2.to_le_bytes());
    o2 += feat_rows * 6 * 4;
    // slices
    for name in &slice_names {
        ss(&mut ti, name);
        ti.extend_from_slice(&2u32.to_le_bytes());
        ti.extend_from_slice(&(N as u64).to_le_bytes());
        ti.extend_from_slice(&(N as u64).to_le_bytes());
        ti.extend_from_slice(&0u32.to_le_bytes());
        ti.extend_from_slice(&o2.to_le_bytes());
        o2 += (N * N * 4) as u64;
    }

    // glyph_features: F (after the line-228 substitution) as float32; NaN is 0x7fc00000
    let mut features = Vec::with_capacity(rows.len() * 6 * 4);
    for &r in &rows {
        let f = &feats[r];
        let cv_bits = f.cv.map(|d| d.to_f32_bits()).unwrap_or(NAN_F32);
        features.extend_from_slice(&cv_bits.to_le_bytes());
        features.extend_from_slice(&f.rbar_bits.to_le_bytes());
        features.extend_from_slice(&f.rstd_bits.to_le_bytes());
        features.extend_from_slice(&f.csum_bits.to_le_bytes());
        features.extend_from_slice(&f.cnz_bits.to_le_bytes());
        features.extend_from_slice(&f.d3_bits.to_le_bytes());
    }

    let ntens = (live.len() + 2 + slice_names.len()) as u64;
    let nkv = kvs.len() as u64;
    let mut head = Vec::new();
    head.extend_from_slice(&0x4655_4747u32.to_le_bytes());
    head.extend_from_slice(&3u32.to_le_bytes());
    head.extend_from_slice(&ntens.to_le_bytes());
    head.extend_from_slice(&nkv.to_le_bytes());
    head.extend_from_slice(&meta);
    head.extend_from_slice(&ti);
    let pad = head.len().wrapping_neg() % 32; // (-len) % 32
    head.resize(head.len() + pad, 0);
    Ok(Plan {
        tri,
        luts,
        alph,
        live,
        composite,
        head,
        features,
        slice_words,
    })
}

/// The GGUF head and the glyph_features bytes the generator writes for `seed` (pass 1 only),
/// for the referee test.
#[doc(hidden)]
pub fn head_and_features(seed: &Path) -> std::io::Result<(Vec<u8>, Vec<u8>)> {
    let p = plan(seed)?;
    Ok((p.head, p.features))
}

/// Stream the GGUF to `out` with bounded memory (one 64^3 cube held at a time), reproducing
/// `pump_glyphs_mythos.py` lines 108-352. Returns the number of bytes written.
pub fn generate_to(seed: &Path, out: &mut dyn Write) -> std::io::Result<u64> {
    let Plan {
        tri,
        luts,
        alph,
        live,
        composite,
        head,
        features,
        slice_words,
    } = plan(seed)?;
    let mut written: u64 = 0;
    out.write_all(&head)?;
    written += head.len() as u64;

    // Pass 2: stream each live cube, then composite, features, slices (bounded memory).
    let mut cube_bytes = Vec::with_capacity(N * N * N * 4);
    for &li in &live {
        let cube = emit(&tri, &luts, &alph[li]);
        cube_bytes.clear();
        for &v in &cube {
            cube_bytes.extend_from_slice(&u32_to_f32_bits(v).to_le_bytes());
        }
        out.write_all(&cube_bytes)?;
        written += cube_bytes.len() as u64;
    }
    // composite (float32 values held as integers)
    cube_bytes.clear();
    for &v in &composite {
        cube_bytes.extend_from_slice(&int_to_f32_bits(v).to_le_bytes());
    }
    out.write_all(&cube_bytes)?;
    written += cube_bytes.len() as u64;
    out.write_all(&features)?;
    written += features.len() as u64;
    // slices: np.take(emit(w), 32, axis=ax) for each slice word, ax in A=0,B=1,C=2
    for &li in &slice_words {
        let cube = emit(&tri, &luts, &alph[li]);
        for axis in 0..3usize {
            let mut sb = Vec::with_capacity(N * N * 4);
            for p in 0..N {
                for q in 0..N {
                    let (i, j, k) = match axis {
                        0 => (32, p, q),
                        1 => (p, 32, q),
                        _ => (p, q, 32),
                    };
                    let v = cube[(i * N + j) * N + k];
                    sb.extend_from_slice(&u32_to_f32_bits(v).to_le_bytes());
                }
            }
            out.write_all(&sb)?;
            written += sb.len() as u64;
        }
    }
    Ok(written)
}

/// Format rounded `units` of 10^-6 as Python's `f"{x:.6f}"` would.
fn fixed6(units: u128) -> String {
    format!("{}.{:06}", units / 1_000_000, units % 1_000_000)
}
