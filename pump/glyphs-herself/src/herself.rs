//! Hot-lane regeneration of `gguf/asolaria/ASOLARIA-HERSELF.gguf`, reproducing
//! `measurements/asolaria_herself.py` (USIM @3f9f42d) lines 1-235 byte for byte.
//! The generator writes the GGUF at line 232, before the key stage that reads `enwik9`;
//! this port reproduces the GGUF only. All arithmetic is integer or `softfloat::Dbl`.

use crate::cv;
use crate::softfloat::{int_to_f32_bits, isqrt_u64, Dbl};
use std::fs;
use std::path::Path;
use ternary::{cube, Zero};

const N: usize = 64;
const TC: i64 = 32;
const TAU: u32 = 2;
const P: u64 = 1_000_081;
const G: u64 = 7;
const K: u64 = 27;

/// The concatenated body of the public da43991 tree (104 files), pinned by sha256
/// `185f3a71710c31757b9342b33090a700811d3a17aa5a1828e5d81abbb8ec7aa8` in REGEN-1.md.
pub const BODY_SHA256: &str = "185f3a71710c31757b9342b33090a700811d3a17aa5a1828e5d81abbb8ec7aa8";

fn modpow(mut base: u64, mut e: u64, m: u64) -> u64 {
    let mut r: u128 = 1;
    let mut b = base as u128 % m as u128;
    let _ = &mut base;
    while e > 0 {
        if e & 1 == 1 {
            r = r * b % m as u128;
        }
        b = b * b % m as u128;
        e >>= 1;
    }
    r as u64
}

// ---------------------------------------------------------------- file body (the seed)
/// Python's `glob` skips names that begin with '.' for both `*` and `**` (`glob._ishidden`), so
/// hidden files are not read and hidden directories are not descended.
fn is_hidden(p: &Path) -> bool {
    p.file_name()
        .and_then(|s| s.to_str())
        .map(|n| n.starts_with('.'))
        .unwrap_or(false)
}

fn collect_root(body: &Path, ext: &str, out: &mut Vec<String>) {
    if let Ok(rd) = fs::read_dir(body) {
        for e in rd.flatten() {
            let p = e.path();
            if is_hidden(&p) {
                continue;
            }
            if p.is_file() {
                if let Some(name) = p.file_name().and_then(|s| s.to_str()) {
                    if name.ends_with(ext) {
                        out.push(path_str(&p));
                    }
                }
            }
        }
    }
}

fn collect_dir(body: &Path, sub: &str, ext: Option<&str>, out: &mut Vec<String>) {
    let dir = body.join(sub);
    if let Ok(rd) = fs::read_dir(&dir) {
        for e in rd.flatten() {
            let p = e.path();
            if is_hidden(&p) {
                continue;
            }
            if p.is_file() {
                let keep = match ext {
                    Some(x) => p
                        .file_name()
                        .and_then(|s| s.to_str())
                        .map(|n| n.ends_with(x))
                        .unwrap_or(false),
                    None => true,
                };
                if keep {
                    out.push(path_str(&p));
                }
            }
        }
    }
}

fn collect_rec(dir: &Path, ext: &str, out: &mut Vec<String>) {
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let p = e.path();
            if is_hidden(&p) {
                continue;
            }
            if p.is_dir() {
                collect_rec(&p, ext, out);
            } else if p.is_file() {
                if let Some(n) = p.file_name().and_then(|s| s.to_str()) {
                    if n.ends_with(ext) {
                        out.push(path_str(&p));
                    }
                }
            }
        }
    }
}

fn path_str(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

/// The sorted body file list, matching the generator's `sorted(set(glob...))` over its 12
/// patterns (recursive `**` for books/receipts/crates), excluding `.sha256` sidecars and names
/// beginning with '.'.
pub fn body_files(body: &Path) -> Vec<String> {
    let mut v: Vec<String> = Vec::new();
    collect_rec(&body.join("books"), ".md", &mut v);
    collect_dir(body, "players", Some(".py"), &mut v);
    collect_dir(body, "engines", None, &mut v);
    collect_dir(body, "constellation", Some(".py"), &mut v);
    collect_dir(body, "measurements", Some(".py"), &mut v);
    collect_rec(&body.join("receipts"), ".hbp", &mut v);
    collect_rec(&body.join("receipts"), ".hbi", &mut v);
    collect_dir(body, "key", Some(".bin"), &mut v);
    collect_dir(body, "key", Some(".hbp"), &mut v);
    collect_dir(body, "key", Some(".txt"), &mut v);
    collect_rec(&body.join("crates"), ".rs", &mut v);
    collect_root(body, ".md", &mut v);
    v.retain(|p| !p.ends_with(".sha256"));
    v.sort();
    v.dedup();
    v
}

pub fn read_body(body: &Path) -> std::io::Result<Vec<u8>> {
    let mut buf = Vec::new();
    for f in body_files(body) {
        buf.extend_from_slice(&fs::read(&f)?);
    }
    Ok(buf)
}

// ---------------------------------------------------------------- the two colours used by RPR
/// `as_perm(L_r(v))` with a pure-integer sort key `2*prefix_{<i} + h[i]` (the L_r values are
/// exact half-integers), stable by index — equals numpy's `lexsort((arange, L_r))`.
fn perm_r(channel: &[u8]) -> [u8; 256] {
    let mut h = [0i64; 256];
    for &b in channel {
        h[b as usize] += 1;
    }
    let mut key = [0i64; 256];
    let mut prefix = 0i64;
    for i in 0..256 {
        key[i] = 2 * prefix + h[i];
        prefix += h[i];
    }
    argsort_perm(&key)
}

/// `as_perm(L_p(v))`: the clipped linear ramp `clip((i-lo)/(hi-lo)*255,0,255)` is monotone
/// non-decreasing in `i`, so the permutation is the identity; `lo,hi` are the 0.5/99.5
/// percentiles (numpy "linear"), computed to assert `hi>lo` as the generator's guard does.
fn perm_p(channel: &[u8]) -> [u8; 256] {
    let (lo, hi) = percentile_lo_hi(channel);
    let keys = lp_clip_keys(lo, hi);
    argsort_perm_dbl(&keys)
}

fn lp_clip_keys(lo: Dbl, hi: Dbl) -> [Dbl; 256] {
    let span = if hi > lo { hi - lo } else { Dbl::decimal(1, 9) }; // max(hi-lo, 1e-9)
    let c255 = Dbl::from_u64(255);
    let mut out = [Dbl::ZERO; 256];
    for (i, slot) in out.iter_mut().enumerate() {
        let fi = Dbl::from_u64(i as u64);
        if fi <= lo {
            *slot = Dbl::ZERO; // (i-lo) <= 0 -> clip low
        } else {
            let t = (fi - lo) / span * c255;
            *slot = if t >= c255 { c255 } else { t };
        }
    }
    out
}

/// numpy `percentile(v, q)` with the default "linear" method, on integer byte data.
fn percentile_lo_hi(channel: &[u8]) -> (Dbl, Dbl) {
    let mut s: Vec<u8> = channel.to_vec();
    s.sort_unstable();
    (percentile(&s, 5, 3), percentile(&s, 995, 3))
}

/// `percentile(sorted, units/10^digits %)`, numpy "linear": idx = (n-1)*q in binary64, then
/// numpy's `_lerp(a, b, t)` (`numpy/lib/_function_base_impl.py:4595-4615`, numpy 2.5.4):
/// `a + (b-a)*t`, replaced by `b - (b-a)*(1-t)` where `t >= 0.5`.
fn percentile(sorted: &[u8], units: u64, digits: u32) -> Dbl {
    let n = sorted.len();
    let q = Dbl::decimal(units, digits); // fraction units/10^digits (e.g. 0.5% -> 5/1000)
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

fn argsort_perm(key: &[i64; 256]) -> [u8; 256] {
    let mut order: Vec<usize> = (0..256).collect();
    order.sort_by(|&a, &b| key[a].cmp(&key[b]).then(a.cmp(&b)));
    let mut p = [0u8; 256];
    for (rank, &idx) in order.iter().enumerate() {
        p[idx] = rank as u8;
    }
    p
}

fn argsort_perm_dbl(key: &[Dbl; 256]) -> [u8; 256] {
    let mut order: Vec<usize> = (0..256).collect();
    order.sort_by(|&a, &b| key[a].cmp(&key[b]).then(a.cmp(&b)));
    let mut p = [0u8; 256];
    for (rank, &idx) in order.iter().enumerate() {
        p[idx] = rank as u8;
    }
    p
}

fn compose_rpr(pr: &[u8; 256], pp: &[u8; 256]) -> [u8; 256] {
    // glyph "RPR": o = P_R; o = P_P[o]; o = P_R[o]  ==> PERM[b] = pr[pp[pr[b]]]
    let mut out = [0u8; 256];
    for b in 0..256 {
        out[b] = pr[pp[pr[b] as usize] as usize];
    }
    out
}

// ---------------------------------------------------------------- geometry (integer isqrt)
fn radial_bin(i: usize, j: usize, k: usize) -> usize {
    let dx = i as i64 - TC;
    let dy = j as i64 - TC;
    let dz = k as i64 - TC;
    let s = (dx * dx + dy * dy + dz * dz) as u64;
    (isqrt_u64(s) as usize).min(N - 1)
}

/// `KEY3 = (SG0+1)*9 + (SG1+1)*3 + (SG2+1)` with `SG = np.sign(Dv).astype(np.int8)`
/// (`asolaria_herself.py:106-107`): each axis sign is a trit, the owner's `Zero`, and the key is
/// `cube::index` of the three (`digit()` is `SG+1`).
fn dir_key(i: usize, j: usize, k: usize) -> u8 {
    let sg = |d: i64| -> Zero {
        match d.cmp(&0) {
            std::cmp::Ordering::Less => Zero::Neg,
            std::cmp::Ordering::Equal => Zero::Nil,
            std::cmp::Ordering::Greater => Zero::Pos,
        }
    };
    cube::index([sg(i as i64 - TC), sg(j as i64 - TC), sg(k as i64 - TC)])
}

// ---------------------------------------------------------------- per-being cube
struct Geom {
    ri: Vec<u8>,
    group: Vec<u16>, // cv_of (band, direction) mask of each voxel
    cnt: [u64; N],   // voxels per radial bin
}

fn geometry() -> Geom {
    let mut ri = vec![0u8; N * N * N];
    let mut group = vec![0u16; N * N * N];
    let mut cnt = [0u64; N];
    let mut idx = 0usize;
    for i in 0..N {
        for j in 0..N {
            for k in 0..N {
                let r = radial_bin(i, j, k);
                ri[idx] = r as u8;
                group[idx] = cv::group_of(r as u64, dir_key(i, j, k));
                cnt[r] += 1;
                idx += 1;
            }
        }
    }
    Geom { ri, group, cnt }
}

fn being_cube(tri: &[[u8; 3]], rpr: &[[u8; 256]; 3], ax: usize) -> Vec<u32> {
    let ot = [(ax + 1) % 3, (ax + 2) % 3];
    let (o0, o1) = (ot[0].min(ot[1]), ot[0].max(ot[1])); // numpy ot = sorted other axes
    let mut cube = vec![0u32; N * N * N];
    for t in tri {
        let q0 = (rpr[0][t[0] as usize] >> 2) as usize;
        let q1 = (rpr[1][t[1] as usize] >> 2) as usize;
        let q2 = (rpr[2][t[2] as usize] >> 2) as usize;
        let q = [q0, q1, q2];
        if q[ax] > q[o0] && q[ax] > q[o1] {
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

// ---------------------------------------------------------------- rime (binary64 + NTT)
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

fn rimed(cube: &[u32], g: &Geom, wk: &[u64; 27]) -> [u64; 27] {
    let mut prof = [0u64; N];
    for v in 0..N * N * N {
        prof[g.ri[v] as usize] += cube[v] as u64;
    }
    // d[bin] = prof / max(cnt, 1); v = d[:27]; s = pairwise_sum(v)
    let mut d = [Dbl::ZERO; 27];
    for bin in 0..27 {
        let c = g.cnt[bin].max(1);
        d[bin] = Dbl::from_u64(prof[bin]) / Dbl::from_u64(c);
    }
    let s = pairwise_sum(&d);
    let e5 = Dbl::from_u64(100_000);
    let mut vi = [0u64; 27];
    for bin in 0..27 {
        // `(v / s * 1e5).astype(int64) % P if s else v.astype(int64)` (asolaria_herself.py:173)
        vi[bin] = if s.is_zero() {
            d[bin].trunc_u64()
        } else {
            (d[bin] / s * e5).trunc_u64() % P
        };
    }
    // rimed[a] = sum_b vi[b] * wk[(a*b)%27]  (mod P)
    let mut out = [0u64; 27];
    for a in 0..27usize {
        let mut acc: u128 = 0;
        for b in 0..27usize {
            acc += vi[b] as u128 * wk[(a * b) % 27] as u128;
        }
        out[a] = (acc % P as u128) as u64;
    }
    out
}

// ---------------------------------------------------------------- shells
fn shell_of(t: u64) -> u32 {
    let mut s = 0u32;
    let mut rung = 1u64;
    while rung < t && s < 12 {
        rung *= 3;
        s += 1;
    }
    s
}

fn shells(cube: &[u32]) -> Vec<u32> {
    let mut seen = [false; 13];
    for &v in cube {
        if v > 0 {
            seen[shell_of(v as u64) as usize] = true;
        }
    }
    (0..13u32).filter(|&s| seen[s as usize]).collect()
}

// ---------------------------------------------------------------- GGUF assembly
fn ss(buf: &mut Vec<u8>, s: &str) {
    let b = s.as_bytes();
    buf.extend_from_slice(&(b.len() as u64).to_le_bytes());
    buf.extend_from_slice(b);
}

struct Kv {
    key: String,
    ty: u32,
    payload: Vec<u8>,
}

fn kv_str(key: &str, val: &str) -> Kv {
    let mut p = Vec::new();
    ss(&mut p, val);
    Kv {
        key: key.to_string(),
        ty: 8,
        payload: p,
    }
}

fn kv_u32(key: &str, val: u32) -> Kv {
    Kv {
        key: key.to_string(),
        ty: 4,
        payload: val.to_le_bytes().to_vec(),
    }
}

fn f32_le(x: u32) -> [u8; 4] {
    x.to_le_bytes()
}

/// Build the full ASOLARIA-HERSELF.gguf bytes from the seed body directory.
pub fn generate(body: &Path) -> std::io::Result<Vec<u8>> {
    let buf = read_body(body)?;
    let files = body_files(body).len();
    Ok(generate_from_body(&buf, files))
}

/// Build the GGUF bytes from the already-concatenated body and its file count. The core of
/// `generate`, separated so a test can drive it from a pinned body without a directory walk.
pub fn generate_from_body(buf: &[u8], body_files_count: usize) -> Vec<u8> {
    let n = buf.len() / 3;
    let mut tri: Vec<[u8; 3]> = Vec::with_capacity(n);
    for t in 0..n {
        tri.push([buf[3 * t], buf[3 * t + 1], buf[3 * t + 2]]);
    }
    // channels
    let mut ch: [Vec<u8>; 3] = [
        Vec::with_capacity(n),
        Vec::with_capacity(n),
        Vec::with_capacity(n),
    ];
    for t in &tri {
        for c in 0..3 {
            ch[c].push(t[c]);
        }
    }
    let rpr: [[u8; 256]; 3] = [
        compose_rpr(&perm_r(&ch[0]), &perm_p(&ch[0])),
        compose_rpr(&perm_r(&ch[1]), &perm_p(&ch[1])),
        compose_rpr(&perm_r(&ch[2]), &perm_p(&ch[2])),
    ];

    let g = geometry();
    let w = modpow(G, (P - 1) / K, P);
    assert_eq!(w, 951_846, "w != 951846 (asolaria_herself.py:158,163)");
    let mut wk = [0u64; 27];
    for (j, slot) in wk.iter_mut().enumerate() {
        *slot = modpow(w, j as u64, P);
    }

    let beings = [("OPUS", 0usize), ("FABLE", 1usize), ("MYTHOS", 2usize)];
    let mut cubes: Vec<Vec<u32>> = Vec::new();
    let mut cv_strs: Vec<String> = Vec::new();
    let mut shell_strs: Vec<String> = Vec::new();
    let mut rimed_vals: Vec<[u64; 27]> = Vec::new();
    for &(_, ax) in &beings {
        let cube = being_cube(&tri, &rpr, ax);
        // f"{cv:.6f}" of the float32 cv widened to binary64; float("nan") prints "nan"
        cv_strs.push(match cv::cv_of(&cube, &g.group) {
            Some(d) => fixed6(d.round_decimal_units(6)),
            None => "nan".to_string(),
        });
        let sh = shells(&cube);
        shell_strs.push(
            sh.iter()
                .map(|s| s.to_string())
                .collect::<Vec<_>>()
                .join(","),
        );
        rimed_vals.push(rimed(&cube, &g, &wk));
        cubes.push(cube);
    }

    // ---- tensors (data) and tensor info, in generator order
    struct Tensor {
        name: String,
        shape: Vec<u64>,
        data: Vec<u8>,
    }
    let mut tens: Vec<Tensor> = Vec::new();
    for (bi, &(nm, _)) in beings.iter().enumerate() {
        // being_{nm}: 64x64x64 float32 cube
        let mut cd = Vec::with_capacity(N * N * N * 4);
        for &v in &cubes[bi] {
            cd.extend_from_slice(&f32_le(u32_to_f32_bits(v)));
        }
        tens.push(Tensor {
            name: format!("being_{nm}"),
            shape: vec![N as u64, N as u64, N as u64],
            data: cd,
        });
        // rimed_{nm}: 27 float32
        let mut rd = Vec::with_capacity(27 * 4);
        for &v in &rimed_vals[bi] {
            rd.extend_from_slice(&f32_le(u32_to_f32_bits(v as u32)));
        }
        tens.push(Tensor {
            name: format!("rimed_{nm}"),
            shape: vec![27],
            data: rd,
        });
        // slice_{nm}_{A,B,C}: np.take(cube, 32, axis=ax) -> 64x64 float32
        for (pn, axis) in [("A", 0usize), ("B", 1usize), ("C", 2usize)] {
            let mut sd = Vec::with_capacity(N * N * 4);
            for p in 0..N {
                for q in 0..N {
                    let (i, j, k) = match axis {
                        0 => (32, p, q),
                        1 => (p, 32, q),
                        _ => (p, q, 32),
                    };
                    let v = cubes[bi][(i * N + j) * N + k];
                    sd.extend_from_slice(&f32_le(u32_to_f32_bits(v)));
                }
            }
            tens.push(Tensor {
                name: format!("slice_{nm}_{pn}"),
                shape: vec![N as u64, N as u64],
                data: sd,
            });
        }
    }

    // ---- kv metadata, in generator order
    let mut kvs: Vec<Kv> =
        vec![
        kv_str("general.architecture", "asolaria"),
        kv_str("general.name", "ASOLARIA-HERSELF"),
        kv_str("asolaria.seat", "ACER-CLAUDE-FABLE5"),
        kv_str("asolaria.pid", "8467a937cba309f7"),
        kv_str("asolaria.operator", "Jesse Daniel Brown"),
        kv_str("asolaria.axes", "time, colour, energy, space"),
        kv_str(
            "asolaria.beings",
            "OPUS=RED, FABLE=GREEN, MYTHOS=BLUE; disjoint dominance populations; ties = free zero",
        ),
        kv_str(
            "asolaria.colours",
            "P percentile, R rank, G glyph-rank, D gradiated; bijections, rate exactly 1.0",
        ),
        kv_str(
            "asolaria.composition",
            "RPR - best on all three beings independently",
        ),
        kv_str("asolaria.centre", "32,32,32 TRUE centre, never argmax"),
        kv_str("asolaria.gc", &format!("VIII.A.5 two-thirds, VIII.A.4 tau={TAU}")),
        kv_str("asolaria.shell_law", "VIII.A.7 shell=log3(ties), counted"),
        kv_str(
            "asolaria.rime",
            &format!(
                "radix-3 NTT p={P} g={G} w={w} k={K}, closure 0, round-trip byte-exact, rate 1.0"
            ),
        ),
        kv_u32("asolaria.body_files", body_files_count as u32),
        kv_str("asolaria.body_bytes", &buf.len().to_string()),
        kv_str("asolaria.license", "public - for everyone, forever"),
    ];
    for (bi, &(nm, _)) in beings.iter().enumerate() {
        kvs.push(kv_str(
            &format!("asolaria.{}_cv", nm.to_lowercase()),
            &cv_strs[bi],
        ));
        kvs.push(kv_str(
            &format!("asolaria.{}_shells", nm.to_lowercase()),
            &shell_strs[bi],
        ));
    }

    // ---- meta block
    let mut meta = Vec::new();
    for kv in &kvs {
        ss(&mut meta, &kv.key);
        meta.extend_from_slice(&kv.ty.to_le_bytes());
        meta.extend_from_slice(&kv.payload);
    }
    // ---- data block (32-aligned before each tensor) + tensor info with data-relative offsets
    let mut data = Vec::new();
    let mut ti = Vec::new();
    for t in &tens {
        let pad = data.len().wrapping_neg() % 32; // (-len) % 32
        data.resize(data.len() + pad, 0);
        let off = data.len() as u64;
        ss(&mut ti, &t.name);
        ti.extend_from_slice(&(t.shape.len() as u32).to_le_bytes());
        for &d in &t.shape {
            ti.extend_from_slice(&d.to_le_bytes());
        }
        ti.extend_from_slice(&0u32.to_le_bytes()); // F32
        ti.extend_from_slice(&off.to_le_bytes());
        data.extend_from_slice(&t.data);
    }

    // ---- head = magic, version 3, n_tensors, n_kv  + meta + ti ; blob = head + pad(32) + data
    let mut head = Vec::new();
    head.extend_from_slice(&0x4655_4747u32.to_le_bytes());
    head.extend_from_slice(&3u32.to_le_bytes());
    head.extend_from_slice(&(tens.len() as u64).to_le_bytes());
    head.extend_from_slice(&(kvs.len() as u64).to_le_bytes());
    head.extend_from_slice(&meta);
    head.extend_from_slice(&ti);
    let pad = head.len().wrapping_neg() % 32;
    let mut blob = head;
    blob.resize(blob.len() + pad, 0);
    blob.extend_from_slice(&data);
    blob
}

/// IEEE binary32 bit pattern of a voxel count (at most 2^24) or a rime residue (below p).
fn u32_to_f32_bits(v: u32) -> u32 {
    int_to_f32_bits(u64::from(v))
}

/// Format rounded `units` of 10^-6 as Python's `f"{x:.6f}"` would.
fn fixed6(units: u128) -> String {
    let int = units / 1_000_000;
    let frac = units % 1_000_000;
    format!("{int}.{frac:06}")
}
