//! Port of universe simulator @3f9f42d `measurements/stars_shells.py`: every record of a byte
//! stream is a star with a gradiated colour (the central difference across its neighbours in
//! time), a key, a tie count and a shell; the stream is pumped round by round; the shells are
//! tested for rings; the star field is written as `ASOLARIA-STARS-SHELLS.gguf` with its receipt.

use crate::binary64::B64;
use crate::gguf::{self, Value};
use crate::sha256_hex;
use core::ops::{Div, Mul};

/// Cube side, `N` (`stars_shells.py:51`).
pub const N: usize = 64;
/// Tie threshold, `TAU` (`stars_shells.py:51`).
pub const TAU: u32 = 2;
/// Rounds when no argument is given, `MAXR` (`stars_shells.py:52`).
pub const MAXR: u32 = 8;
/// Length of the `SHELL` table (`stars_shells.py:67`).
const SHELL_TABLE_LEN: u64 = 1 << 20;
/// File name of the GGUF (`stars_shells.py:202`).
pub const GGUF_NAME: &str = "ASOLARIA-STARS-SHELLS.gguf";

/// `shell_of` (`stars_shells.py:58-64`): rungs 1, 3, 9, 27, ... counted while below the tie count,
/// at most 12.
pub fn shell_of(ties: u64) -> u32 {
    let (mut s, mut rung) = (0u32, 1u64);
    while rung < ties && s < 12 {
        rung *= 3;
        s += 1;
    }
    s
}

/// The star key (`stars_shells.py:80`): `(r>>2)*4096 + (g>>2)*64 + (b>>2)`.
pub fn star_key(record: [u8; 3]) -> u32 {
    u32::from(record[0] >> 2) * 4096 + u32::from(record[1] >> 2) * 64 + u32::from(record[2] >> 2)
}

/// The output of `stars_of` (`stars_shells.py:70-86`), one entry per record.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Stars {
    /// `cesp`: the records (colour, energy, space).
    pub cesp: Vec<[u8; 3]>,
    /// `grad`: sum over the three channels of `|(t[i+1] - t[i-1]) // 2|`, 0 at both ends.
    pub grad: Vec<u32>,
    /// `key`.
    pub key: Vec<u32>,
    /// `ties`: how many records share the key.
    pub ties: Vec<u32>,
    /// `shell`.
    pub shell: Vec<u32>,
    /// `born`: `ties >= TAU`.
    pub born: Vec<bool>,
}

impl Stars {
    /// Number of records, `n`.
    pub fn n(&self) -> usize {
        self.cesp.len()
    }

    /// Number of born stars.
    pub fn born_count(&self) -> usize {
        self.born.iter().filter(|&&b| b).count()
    }

    /// The `occ` table of `report` (`stars_shells.py:89-107`): stars per populated shell, in
    /// shell order.
    pub fn occupancy(&self) -> Vec<(u32, usize)> {
        let born_shells = || {
            self.shell
                .iter()
                .zip(&self.born)
                .filter(|(_, &b)| b)
                .map(|(&s, _)| s)
        };
        let Some(max) = born_shells().max() else {
            return Vec::new();
        };
        (0..=max)
            .filter_map(|s| {
                let count = born_shells().filter(|&x| x == s).count();
                (count > 0).then_some((s, count))
            })
            .collect()
    }
}

/// `stars_of` (`stars_shells.py:70-86`).
pub fn stars_of(buf: &[u8]) -> Stars {
    let n = buf.len() / 3;
    let cesp: Vec<[u8; 3]> = (0..n)
        .map(|i| [buf[3 * i], buf[3 * i + 1], buf[3 * i + 2]])
        .collect();
    // :76-78 g[1:-1] = (t[2:] - t[:-2]) // 2 (floor division); grad = |g|.sum(1).
    let mut grad = vec![0u32; n];
    for i in 1..n.saturating_sub(1) {
        grad[i] = (0..3)
            .map(|c| {
                let d = i32::from(cesp[i + 1][c]) - i32::from(cesp[i - 1][c]);
                d.div_euclid(2).unsigned_abs()
            })
            .sum();
    }
    let key: Vec<u32> = cesp.iter().map(|&t| star_key(t)).collect();
    // :81 bincount(key, minlength=64**3); :82 ties = cnt[key].
    let mut cnt = vec![0u32; N * N * N];
    for &k in &key {
        cnt[k as usize] += 1;
    }
    let ties: Vec<u32> = key.iter().map(|&k| cnt[k as usize]).collect();
    // :83 SHELL[np.minimum(ties, len(SHELL) - 1)].
    let shell = ties
        .iter()
        .map(|&t| shell_of(u64::from(t).min(SHELL_TABLE_LEN - 1)))
        .collect();
    let born = ties.iter().map(|&t| t >= TAU).collect();
    Stars {
        cesp,
        grad,
        key,
        ties,
        shell,
        born,
    }
}

/// One pump of energy (`stars_shells.py:131-134`): the stream, then `(a + roll(a, -3)) % 256`,
/// then `(a * 3 + 1) % 256`, over the whole records.
pub fn pump(corpus: &[u8]) -> Vec<u8> {
    let n = corpus.len() / 3 * 3;
    let a = &corpus[..n];
    let mut out = Vec::with_capacity(3 * n);
    out.extend_from_slice(a);
    out.extend((0..n).map(|i| ((u32::from(a[i]) + u32::from(a[(i + 3) % n])) % 256) as u8));
    out.extend(a.iter().map(|&x| ((u32::from(x) * 3 + 1) % 256) as u8));
    out
}

/// One `ROUND` row of the receipt (`stars_shells.py:120-121,250-252`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Round {
    /// Round number.
    pub n: u32,
    /// Corpus bytes.
    pub bytes: usize,
    /// Stars born.
    pub stars: usize,
    /// Populated shells.
    pub shells: usize,
}

/// The emergence loop (`stars_shells.py:113-134`): its rounds and the final corpus.
pub fn emergence(seed: &[u8], maxr: u32) -> (Vec<Round>, Vec<u8>) {
    let mut corpus = seed.to_vec();
    let mut rounds = Vec::new();
    let mut prev_shells = 0usize;
    for rnd in 0..=maxr {
        let s = stars_of(&corpus);
        let nsh = s.occupancy().len();
        rounds.push(Round {
            n: rnd,
            bytes: corpus.len(),
            stars: s.born_count(),
            shells: nsh,
        });
        if rnd == maxr {
            break;
        }
        if nsh != 0 && nsh == prev_shells && rnd >= 2 {
            break;
        }
        prev_shells = nsh;
        corpus = pump(&corpus);
    }
    (rounds, corpus)
}

/// Bin of `np.histogram(d, bins=16, range=(0, 56))` for `d = sqrt(s)` with integer `s <= 3072`:
/// the edges are the exact doubles `3.5 k`, and `fl(sqrt(s)) >= 3.5 k` exactly when
/// `4 s >= 49 k^2` (no integer `s` has a root within half a unit below an edge).
pub fn ring_bin(s: u32) -> usize {
    assert!(s <= 3 * 32 * 32, "squared radius outside the 64-cube");
    (1..16u32).take_while(|&k| 49 * k * k <= 4 * s).count()
}

/// The ring test of one shell (`stars_shells.py:155-166`) and its intermediate values.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RingTest {
    /// `hist_`: stars per radial bin.
    pub hist: [u64; 16],
    /// `pk`: first bin of the normalised density maximum.
    pub pk: usize,
    /// `inner`: normalised density of bin 0.
    pub inner: B64,
    /// `pk >= 1 and inner < 0.6 * dens[pk]`.
    pub ring: bool,
}

/// The ring test of one shell (`stars_shells.py:155-166`) on the `>> 2` coordinates of its stars.
pub fn ring_test(points: &[[u8; 3]]) -> RingTest {
    let mut hist = [0u64; 16];
    for p in points {
        let s: u32 = p.iter().map(|&x| (i32::from(x) - 32).pow(2) as u32).sum();
        hist[ring_bin(s)] += 1;
    }
    // :160 vol = edges[1:]**3 - edges[:-1]**3 = 42.875 * (3k^2 + 3k + 1), exact; :161 dens = h / vol.
    let dens: Vec<B64> = (0..16i128)
        .map(|k| {
            B64::from_ratio(
                8 * i128::from(hist[k as usize]),
                343 * (3 * k * k + 3 * k + 1),
            )
        })
        .collect();
    // :162 dens / (dens.max() or 1).
    let max = dens.iter().copied().max().unwrap_or(B64::ZERO);
    let max = if max.is_zero() { B64::from_int(1) } else { max };
    let norm: Vec<B64> = dens.iter().map(|d| d.div(max)).collect();
    // :163 np.argmax (first maximum); :164 inner = dens[0]; :165 the ring rule.
    let top = norm.iter().copied().max().unwrap_or(B64::ZERO);
    let pk = norm.iter().position(|&d| d == top).unwrap_or(0);
    let inner = norm[0];
    let ring = pk >= 1 && inner < B64::decimal(6, 1).mul(norm[pk]);
    RingTest {
        hist,
        pk,
        inner,
        ring,
    }
}

/// A populated shell of the frozen field (`stars_shells.py:153-169`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Shell {
    /// Shell number.
    pub s: u32,
    /// Stars on the shell.
    pub stars: usize,
    /// The ring test.
    pub test: RingTest,
}

/// Everything `stars_shells.py` writes: the GGUF bytes and the receipt bytes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Regenerated {
    /// Emergence rounds.
    pub rounds: Vec<Round>,
    /// Shells with at least 32 stars, in order.
    pub shells: Vec<Shell>,
    /// Tensors as written: name, dimensions, little-endian binary32 bytes.
    pub tensors: Vec<(String, Vec<u64>, Vec<u8>)>,
    /// `ASOLARIA-STARS-SHELLS.gguf`.
    pub gguf: Vec<u8>,
    /// `FABLE5-STARS-SHELLS.hbp`.
    pub receipt: Vec<u8>,
}

fn f32_tensor(values: impl IntoIterator<Item = u64>) -> Vec<u8> {
    values
        .into_iter()
        .flat_map(|v| gguf::binary32_bits(v).to_le_bytes())
        .collect()
}

/// Runs `stars_shells.py` on `seed` with `MAXR` rounds and returns its GGUF and receipt bytes.
pub fn regenerate(seed: &[u8], maxr: u32) -> Regenerated {
    let (rounds, corpus) = emergence(seed, maxr);
    // :136 FINAL = stars_of(corpus); :146-148 the born stars' >>2 coordinates, times and shells.
    let fin = stars_of(&corpus);
    let born: Vec<usize> = (0..fin.n()).filter(|&i| fin.born[i]).collect();
    let ce: Vec<[u8; 3]> = born.iter().map(|&i| fin.cesp[i].map(|x| x >> 2)).collect();
    let shl: Vec<u32> = born.iter().map(|&i| fin.shell[i]).collect();
    let mut shell_ids = shl.clone();
    shell_ids.sort_unstable();
    shell_ids.dedup();
    // :153-169 RING over shells with at least 32 stars.
    let mut shells = Vec::new();
    for &s in &shell_ids {
        let points: Vec<[u8; 3]> = ce
            .iter()
            .zip(&shl)
            .filter(|(_, &x)| x == s)
            .map(|(p, _)| *p)
            .collect();
        if points.len() < 32 {
            continue;
        }
        shells.push(Shell {
            s,
            stars: points.len(),
            test: ring_test(&points),
        });
    }
    let nring = shells.iter().filter(|sh| sh.test.ring).count();

    // :182-192 one cube per shell: float32 counts (:187 np.add.at stops at 2^24), then
    // c *= (c >= TAU); slices at 32 on each axis.
    let mut cubes: Vec<(u32, Vec<u32>)> = Vec::new();
    for sh in &shells {
        let mut c = vec![0u32; N * N * N];
        for (p, _) in ce.iter().zip(&shl).filter(|(_, &x)| x == sh.s) {
            let v = &mut c[(usize::from(p[0]) * N + usize::from(p[1])) * N + usize::from(p[2])];
            *v = gguf::binary32_increment(*v);
        }
        for v in &mut c {
            if *v < TAU {
                *v = 0;
            }
        }
        cubes.push((sh.s, c));
    }
    let at = |c: &[u32], i: usize, j: usize, k: usize| u64::from(c[(i * N + j) * N + k]);
    let mut tensors: Vec<(String, Vec<u64>, Vec<u8>)> = Vec::new();
    for (s, c) in &cubes {
        tensors.push((
            format!("shell_{s}_cube"),
            vec![N as u64; 3],
            f32_tensor(c.iter().map(|&v| u64::from(v))),
        ));
    }
    for (s, c) in &cubes {
        let slice_a = (0..N).flat_map(|j| (0..N).map(move |k| (j, k)));
        tensors.push((
            format!("slice_s{s}_A"),
            vec![N as u64; 2],
            f32_tensor(slice_a.map(|(j, k)| at(c, 32, j, k))),
        ));
        let slice_b = (0..N).flat_map(|i| (0..N).map(move |k| (i, k)));
        tensors.push((
            format!("slice_s{s}_B"),
            vec![N as u64; 2],
            f32_tensor(slice_b.map(|(i, k)| at(c, i, 32, k))),
        ));
        let slice_c = (0..N).flat_map(|i| (0..N).map(move |j| (i, j)));
        tensors.push((
            format!("slice_s{s}_C"),
            vec![N as u64; 2],
            f32_tensor(slice_c.map(|(i, j)| at(c, i, j, 32))),
        ));
    }
    // :205-208 astype(np.float32), rounded to nearest (star_time reaches 2^24 on long corpora).
    let nb = born.len() as u64;
    tensors.push((
        "star_time".into(),
        vec![nb],
        f32_tensor(born.iter().map(|&i| i as u64)),
    ));
    tensors.push((
        "star_shell".into(),
        vec![nb],
        f32_tensor(shl.iter().map(|&s| u64::from(s))),
    ));
    tensors.push((
        "star_grad".into(),
        vec![nb],
        f32_tensor(born.iter().map(|&i| u64::from(fin.grad[i]))),
    ));
    tensors.push((
        "star_cesp".into(),
        vec![nb, 3],
        f32_tensor(ce.iter().flat_map(|p| p.map(u64::from))),
    ));

    // :209-222 metadata.
    let kvs = [
        (
            "general.architecture",
            Value::Str("asolaria-stars-shells".into()),
        ),
        ("general.name", Value::Str("ASOLARIA-STARS-SHELLS".into())),
        (
            "asolaria.axes",
            Value::Str("time, colour, energy, space".into()),
        ),
        (
            "asolaria.star",
            Value::Str(
                "a star is a record: time=position in stream, colour=r, energy=g, space=b; \
                 gradiated colour = local change, not flat value"
                    .into(),
            ),
        ),
        (
            "asolaria.shell_law",
            Value::Str(
                "VIII.A.7 photon law: shell = log3(tie count), counted never computed; \
                 more energy in, the further out the shell"
                    .into(),
            ),
        ),
        ("asolaria.tau", Value::U32(TAU)),
        ("asolaria.stars", Value::U32(born.len() as u32)),
        ("asolaria.shells", Value::U32(cubes.len() as u32)),
        ("asolaria.rings", Value::U32(nring as u32)),
        (
            "asolaria.seed",
            Value::Str("live self-emission, emitted not read".into()),
        ),
    ];
    // :223-238 header, tensor infos, 32-aligned data.
    let mut meta = Vec::new();
    for (k, v) in &kvs {
        meta.extend_from_slice(&gguf::kv(k, v));
    }
    let mut data = Vec::new();
    let mut infos = Vec::new();
    for (name, dims, bytes) in &tensors {
        data.resize(data.len() + gguf::pad_to_align(data.len()), 0);
        infos.extend_from_slice(&gguf::tensor_info(
            name,
            dims,
            gguf::GGML_TYPE_F32,
            data.len() as u64,
        ));
        data.extend_from_slice(bytes);
    }
    let mut blob = gguf::header_prefix(tensors.len() as u64, kvs.len() as u64);
    blob.extend_from_slice(&meta);
    blob.extend_from_slice(&infos);
    blob.resize(blob.len() + gguf::pad_to_align(blob.len()), 0);
    blob.extend_from_slice(&data);
    let digest = sha256_hex(&blob);

    // :244-261 receipt.
    let mut rows = vec![
        "STARHDR|schema=ASOLARIA-STARS-SHELLS-V1|seat=ACER-CLAUDE-FABLE5\
         |pid=8467a937cba309f7|date=2026-07-27|json=0"
            .to_string(),
        "STAR|axes=time,colour,energy,space|time=position_in_stream\
         |gradiated=local_change|json=0"
            .to_string(),
        format!("LAW|shell=log3(ties)|counted=1|photon=VIII.A.7|tau={TAU}|json=0"),
    ];
    for r in &rounds {
        rows.push(format!(
            "ROUND|n={}|bytes={}|stars={}|shells={}|json=0",
            r.n, r.bytes, r.stars, r.shells
        ));
    }
    for sh in &shells {
        rows.push(format!(
            "SHELL|s={}|stars={}|ring={}|json=0",
            sh.s,
            sh.stars,
            u8::from(sh.test.ring)
        ));
    }
    rows.push(format!("RINGS|n={nring}|of={}|json=0", shells.len()));
    rows.push(format!(
        "GGUF|k={GGUF_NAME}|bytes={}|sha256={digest}|json=0",
        blob.len()
    ));
    let body = rows.join("\n") + "\n";
    let commitment = sha256_hex(body.as_bytes());
    rows.push(format!(
        "STARFTR|receipt={}|rows={}|hot_path=1|json=0",
        &commitment[..32],
        rows.len() + 1
    ));
    let receipt = (rows.join("\n") + "\n").into_bytes();
    Regenerated {
        rounds,
        shells,
        tensors,
        gguf: blob,
        receipt,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shells_are_counted_rungs() {
        let expect = [
            (0, 0),
            (1, 0),
            (2, 1),
            (3, 1),
            (4, 2),
            (9, 2),
            (10, 3),
            (27, 3),
            (28, 4),
        ];
        for (ties, s) in expect {
            assert_eq!(shell_of(ties), s, "ties {ties}");
        }
        assert_eq!(shell_of(1 << 19), 12);
    }

    #[test]
    fn gradient_is_a_floor_central_difference() {
        // t = (0,0,0), (10,1,7), (3,4,0): g[1] = ((3-0)//2, (4-0)//2, (0-0)//2) = (1, 2, 0).
        let s = stars_of(&[0, 0, 0, 10, 1, 7, 3, 4, 0]);
        assert_eq!(s.grad, vec![0, 3, 0]);
        // A falling neighbour: (0 - 5) // 2 == -3 under floor division.
        let s = stars_of(&[5, 0, 0, 9, 9, 9, 0, 0, 0]);
        assert_eq!(s.grad, vec![0, 3, 0]);
    }

    #[test]
    fn ring_bins_follow_the_edges() {
        assert_eq!(ring_bin(0), 0);
        assert_eq!(ring_bin(48), 1); // sqrt(48) = 6.93 < 7.0
        assert_eq!(ring_bin(49), 2); // sqrt(49) = 7.0 is the left edge of bin 2
        assert_eq!(ring_bin(3072), 15);
    }

    #[test]
    fn pump_folds_whole_records() {
        let p = pump(&[1, 2, 3, 4, 5, 6, 7]);
        assert_eq!(p.len(), 18);
        assert_eq!(&p[..6], &[1, 2, 3, 4, 5, 6]);
        assert_eq!(&p[6..12], &[5, 7, 9, 5, 7, 9]);
        assert_eq!(&p[12..], &[4, 7, 10, 13, 16, 19]);
    }
}
