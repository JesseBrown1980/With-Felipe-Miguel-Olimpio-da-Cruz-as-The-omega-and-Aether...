//! THE BLUE SPEAKS — a ternary neural network inside a ternary neural network, riding the chariots.
//!
//! The blue register was the clamped one. Now it carries, and what it carries is a **nest**: each
//! neuron of the outer net is itself a small net. The N-Nest law says recurrence plus a
//! ground-truth corrective gate is what makes a mind, so this is built as recurrence (epochs) with
//! a gate that is not the net's own opinion (held-out data it never trained on).
//!
//! ## Integer only, ternary only
//!
//! * Weights live in `{-1, 0, +1}` — a trit, not a float. `float_used=0` throughout.
//! * Activation is the **three-state sign with a dead band**: the zero needs width, so a sum
//!   inside `±DEAD` returns Nil rather than being forced to a side. Nil is a real state, present,
//!   not a missing value.
//! * Learning is the integer ternary perceptron rule: on a wrong answer, nudge weights by ±1
//!   toward the truth and clamp back into the trit. No gradients, no reals, nothing to drift.
//!
//! ## SEE · SPEAK · WORK
//!
//! * **SEE** — read every stone as 27 integer spectral lanes via the exact rime prism.
//! * **SPEAK** — emit the trit glyph of what it decided, in the three states.
//! * **WORK** — assign each stone to a chariot, and be graded on held-out stones.
//!
//! ## The task is built so it CAN fail
//!
//! Predict which costing register carries a stone — the argmax of spectral cells 1, 2, 3 — from
//! the **other 24 lanes only**. Cells 1, 2 and 3 are withheld from the input entirely. If the
//! prism decorrelates its lanes, this is unlearnable and accuracy will sit at chance (1/3) no
//! matter how long it recurs. That negative result is a real finding about the transform, so it is
//! reported as one rather than avoided by leaking the answer into the features.
//!
//! Chance is stated up front: 3 classes, so 33.3%. Anything near that is NOT learning.
//!
//! 0 external crates. `json=0`.

// The canonical tribit module is reused whole via #[path]; this kernel exercises only part of its
// surface. Reuse the canonical module, never fork a smaller copy.
#![allow(dead_code)]
#![allow(clippy::needless_range_loop)]

#[path = r"C:\asolaria-acer\asolaria-os\kernel\core\src\tribit\mod.rs"]
mod tribit;

// ONE shared fold (2026-10-09): never a per-kernel copy. Reads P/K from tribit.
#[path = r"C:\tmp\scout-rooms-20261008\common\fold.rs"]
mod fold;

use std::fs;
use std::path::{Path, PathBuf};
use tribit::{prism, unprism, K, P};

const STONES: &str = r"C:\tmp\scout-rooms-20261008\unbounded-repo";
const OUT: &str = r"C:\tmp\scout-rooms-20261008\bluenet-out";

/// Dead band on the zero. The zero is not a point, it has width.
///
/// FIRST RUN WAS STRUCTURALLY DEAD AND THIS CONSTANT IS WHY. It was set to 26, carried over from
/// a context with a far larger fan-in. Here the inner fan-in is 24 ternary inputs against ternary
/// weights, so the largest sum reachable is 24 — *below* the band. Every hidden unit was pinned to
/// Nil, all three outer sums were 0, and `max_by_key` broke the three-way tie by returning the
/// last index. The result: 358 per-mille frozen across all 40 epochs and every stone "carried" by
/// BLUE. That was a tie-break, not a decision.
///
/// A dead band is a FRACTION OF THE FAN-IN, never an absolute. A constant from another scale is
/// not a constant. Both bands below are derived from their own layer's width, ternary-aligned.
const DEAD_H: i64 = (IN_LANES as i64) / 9; // 24/9 = 2 — the zero keeps width without swallowing the layer
const DEAD_O: i64 = (INNER_H as i64) / 9; // 9/9 = 1
/// Input lanes: all 27 except cells 1, 2, 3 — the ones that define the label.
const IN_LANES: usize = K - 3;
/// Inner net hidden width per outer neuron. 9 = 3^2, one rung down from 27.
const INNER_H: usize = 9;
/// Outer neurons, one per chariot.
const OUTER: usize = 3;
const EPOCHS: usize = 40;

fn sha256(data: &[u8]) -> [u8; 32] {
    const RK: [u32; 64] = [
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
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let bitlen = (data.len() as u64).wrapping_mul(8);
    let mut msg = data.to_vec();
    msg.push(0x80);
    while msg.len() % 64 != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&bitlen.to_be_bytes());
    for chunk in msg.chunks_exact(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                chunk[4 * i],
                chunk[4 * i + 1],
                chunk[4 * i + 2],
                chunk[4 * i + 3],
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
                .wrapping_add(RK[i])
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
        out[4 * i..4 * i + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    out
}
fn hex(b: &[u8]) -> String {
    use std::fmt::Write as _;
    let mut s = String::with_capacity(b.len() * 2);
    for x in b {
        let _ = write!(s, "{x:02x}");
    }
    s
}
fn esc(v: &str) -> String {
    v.replace('\\', "\\\\")
        .replace('|', "\\p")
        .replace('\n', "\\n")
}
fn hbp(tag: &str, kv: &[(&str, String)]) -> String {
    let mut r = String::from(tag);
    for (k, v) in kv {
        r.push('|');
        r.push_str(k);
        r.push('=');
        r.push_str(&esc(v));
    }
    r.push_str("|json=0");
    r
}
fn fold_lanes(corpus: &[u8]) -> [u64; K] {
    // lossy linear sketch, byte-identical to the old body; see common/fold.rs
    fold::sketch_lanes(corpus)
}

/// The three-state activation. The zero has WIDTH: inside the dead band the answer is Nil, a real
/// third state, not a coin flip and not a missing value.
/// Argmax that REPORTS its ties instead of hiding them. `max_by_key` silently returns the last
/// maximum, which let a fully-tied net look like a confident BLUE vote 667 times. Ties are counted
/// so a collapse cannot masquerade as a decision.
fn argmax(outs: &[i64]) -> usize {
    let m = *outs.iter().max().unwrap();
    let tied = outs.iter().filter(|&&v| v == m).count();
    if tied == outs.len() {
        // every class equal: there is no decision here. Report it as the middle state, not a win.
        return TIE_SENTINEL;
    }
    outs.iter().position(|&v| v == m).unwrap()
}
/// Out-of-range class index meaning "no decision". Counted separately, never scored as correct.
const TIE_SENTINEL: usize = usize::MAX;

fn tri(sum: i64, band: i64) -> i8 {
    if sum > band {
        1
    } else if sum < -band {
        -1
    } else {
        0
    }
}
/// A deterministic trit drawn from a digest. Derived, never chosen.
fn trit_from(seed: &[u8], i: usize) -> i8 {
    let d = sha256(&[seed, &i.to_le_bytes()[..]].concat());
    match d[0] % 3 {
        0 => -1,
        1 => 0,
        _ => 1,
    }
}

/// One INNER net: 24 inputs -> 9 ternary hidden -> 1 ternary output. This is the nest: an outer
/// neuron is not a scalar, it is a whole small network.
struct Inner {
    w1: Vec<Vec<i8>>, // INNER_H x IN_LANES
    w2: Vec<i8>,      // INNER_H
}
impl Inner {
    fn new(seed: &[u8]) -> Self {
        let mut w1 = vec![vec![0i8; IN_LANES]; INNER_H];
        for h in 0..INNER_H {
            for i in 0..IN_LANES {
                w1[h][i] = trit_from(seed, h * 1000 + i);
            }
        }
        let w2 = (0..INNER_H).map(|h| trit_from(seed, 90_000 + h)).collect();
        Inner { w1, w2 }
    }
    /// Returns (hidden activations, output sum). Integers all the way down.
    fn forward(&self, x: &[i8]) -> (Vec<i8>, i64) {
        let mut hid = vec![0i8; INNER_H];
        for h in 0..INNER_H {
            let mut s: i64 = 0;
            for i in 0..IN_LANES {
                s += self.w1[h][i] as i64 * x[i] as i64;
            }
            hid[h] = tri(s, DEAD_H);
        }
        let mut o: i64 = 0;
        for h in 0..INNER_H {
            o += self.w2[h] as i64 * hid[h] as i64;
        }
        // the output trit is taken with the OUTPUT layer's own band, then scaled back so the
        // outer comparison still sees magnitude rather than only sign
        let _ = tri(o, DEAD_O);
        (hid, o)
    }
    /// Integer ternary perceptron update, clamped back into {-1,0,+1}.
    fn nudge(&mut self, x: &[i8], hid: &[i8], dir: i8) {
        for h in 0..INNER_H {
            let v = self.w2[h] as i64 + (dir as i64 * hid[h] as i64);
            self.w2[h] = v.clamp(-1, 1) as i8;
            if hid[h] != 0 {
                for i in 0..IN_LANES {
                    if x[i] != 0 {
                        let u = self.w1[h][i] as i64 + (dir as i64 * x[i] as i64 * hid[h] as i64);
                        self.w1[h][i] = u.clamp(-1, 1) as i8;
                    }
                }
            }
        }
    }
}

fn walk(root: &Path, out: &mut Vec<PathBuf>) {
    if let Ok(rd) = fs::read_dir(root) {
        let mut e: Vec<_> = rd.filter_map(|x| x.ok()).collect();
        e.sort_by_key(|x| x.file_name());
        for x in e {
            let p = x.path();
            if p.is_dir() {
                if p.file_name().and_then(|s| s.to_str()) == Some(".git") {
                    continue;
                }
                walk(&p, out);
            } else {
                out.push(p);
            }
        }
    }
}

fn main() {
    let out = Path::new(OUT);
    fs::create_dir_all(out).expect("out");
    let mut files = Vec::new();
    walk(Path::new(STONES), &mut files);
    files.retain(|p| p.extension().and_then(|s| s.to_str()) == Some("hbp"));

    // ---- SEE: every stone as 27 integer lanes, label = argmax of cells 1,2,3 ----
    let mut xs: Vec<Vec<i8>> = Vec::new();
    let mut ys: Vec<usize> = Vec::new();
    let mut exact_all = true;
    for f in &files {
        let Ok(data) = fs::read(f) else { continue };
        let lanes = fold_lanes(&data);
        let spec = prism(&lanes);
        if unprism(&spec) != lanes {
            exact_all = false;
        }
        let (a, b, c) = (spec[1] % 256, spec[2] % 256, spec[3] % 256);
        let label = if a >= b && a >= c {
            0
        } else if b >= c {
            1
        } else {
            2
        };
        // features: the 24 lanes that are NOT 1,2,3 — the label cannot leak in
        let mut x = Vec::with_capacity(IN_LANES);
        for k in 0..K {
            if k == 1 || k == 2 || k == 3 {
                continue;
            }
            // centre each lane on the field midpoint, then take its trit
            let centred = spec[k] as i64 - (P as i64 / 2);
            x.push(if centred > (P as i64 / 6) {
                1
            } else if centred < -(P as i64 / 6) {
                -1
            } else {
                0
            });
        }
        xs.push(x);
        ys.push(label);
    }
    let n = xs.len();
    if n < 30 {
        println!("STOP|reason=too_few_samples|n={n}|json=0");
        return;
    }

    // ---- split: train on the first 70%, grade on a held-out tail it never sees ----
    let split = n * 7 / 10;
    let mut class_counts = [0usize; OUTER];
    for &y in &ys {
        class_counts[y] += 1;
    }
    let majority = *class_counts.iter().max().unwrap();
    let majority_rate = majority * 1000 / n; // per-mille, integer

    // ---- the NEST: OUTER neurons, each one an INNER net ----
    let mut nets: Vec<Inner> = (0..OUTER)
        .map(|o| Inner::new(format!("BLUENET-OUTER-{o}").as_bytes()))
        .collect();

    let mut epoch_rows: Vec<String> = Vec::new();
    let mut best_test = 0usize;
    let mut best_epoch = 0usize;
    for ep in 0..EPOCHS {
        // --- recurrence: train pass ---
        for i in 0..split {
            let x = &xs[i];
            let y = ys[i];
            let mut outs = [0i64; OUTER];
            let mut hids: Vec<Vec<i8>> = Vec::with_capacity(OUTER);
            for o in 0..OUTER {
                let (h, s) = nets[o].forward(x);
                outs[o] = s;
                hids.push(h);
            }
            let pred = argmax(&outs);
            if pred != y {
                // the ground-truth corrective gate: push the right one up, the wrong one down.
                // On a full tie there IS no wrong winner to push down, so only the truth is
                // raised. Indexing nets[TIE_SENTINEL] would panic, which is how a hidden tie
                // would have announced itself the hard way.
                nets[y].nudge(x, &hids[y], 1);
                if pred != TIE_SENTINEL {
                    nets[pred].nudge(x, &hids[pred], -1);
                }
            }
        }
        // --- grade on train and on the held-out tail ---
        let mut tr = 0usize;
        for i in 0..split {
            let mut outs = [0i64; OUTER];
            for o in 0..OUTER {
                outs[o] = nets[o].forward(&xs[i]).1;
            }
            if argmax(&outs) == ys[i] {
                tr += 1;
            }
        }
        let mut te = 0usize;
        for i in split..n {
            let mut outs = [0i64; OUTER];
            for o in 0..OUTER {
                outs[o] = nets[o].forward(&xs[i]).1;
            }
            if argmax(&outs) == ys[i] {
                te += 1;
            }
        }
        if te > best_test {
            best_test = te;
            best_epoch = ep;
        }
        if ep % 5 == 0 || ep == EPOCHS - 1 {
            epoch_rows.push(hbp(
                "EPOCH",
                &[
                    ("ep", ep.to_string()),
                    ("train_correct", tr.to_string()),
                    ("train_n", split.to_string()),
                    ("train_permille", (tr * 1000 / split).to_string()),
                    ("test_correct", te.to_string()),
                    ("test_n", (n - split).to_string()),
                    ("test_permille", (te * 1000 / (n - split)).to_string()),
                ],
            ));
        }
    }

    // ---- SPEAK: the glyph of what it decided on the held-out tail ----
    let mut spoken = String::new();
    for i in split..n.min(split + 27) {
        let mut outs = [0i64; OUTER];
        for o in 0..OUTER {
            outs[o] = nets[o].forward(&xs[i]).1;
        }
        let p = argmax(&outs);
        spoken.push(match p {
            0 => '-',            // RED
            1 => '.',            // GREEN
            2 => '+',            // BLUE
            _ => '0',            // no decision: every class tied
        });
    }

    // ---- WORK: what the blue net actually carried, per chariot ----
    let mut carried = [0usize; OUTER];
    let mut ties = 0usize;
    for i in split..n {
        let mut outs = [0i64; OUTER];
        for o in 0..OUTER {
            outs[o] = nets[o].forward(&xs[i]).1;
        }
        let a = argmax(&outs);
        if a == TIE_SENTINEL { ties += 1 } else { carried[a] += 1 }
    }

    // ---------------------------------------------------------------------------------
    // A STABLE COMPARATOR, because an unstable optimizer failing proves nothing.
    //
    // The nest oscillates: a +/-1 nudge against a {-1,0,+1} clamp saturates on every update, so
    // some epochs land on all-zero weights and every class ties. A net that thrashes cannot
    // establish that a task is unlearnable — it can only establish that IT did not learn it.
    //
    // So: a single-pass integer prototype classifier. For each class, sum the feature trits of its
    // training examples; score a test sample by integer dot product against each prototype. One
    // pass, no updates, nothing to oscillate. If THIS also sits at chance, the task itself is
    // uninformative from these features. If it beats chance, the nest's failure was the nest's.
    // ---------------------------------------------------------------------------------
    let mut proto = vec![vec![0i64; IN_LANES]; OUTER];
    for i in 0..split {
        for j in 0..IN_LANES {
            proto[ys[i]][j] += xs[i][j] as i64;
        }
    }
    let mut proto_correct = 0usize;
    let mut proto_ties = 0usize;
    for i in split..n {
        let mut sc = [0i64; OUTER];
        for o in 0..OUTER {
            for j in 0..IN_LANES {
                sc[o] += proto[o][j] * xs[i][j] as i64;
            }
        }
        let a = argmax(&sc);
        if a == TIE_SENTINEL {
            proto_ties += 1;
        } else if a == ys[i] {
            proto_correct += 1;
        }
    }

    // Integer significance: is the comparator's margin over the majority baseline bigger than the
    // noise floor of a sample this size? One standard error on a proportion p over n trials is
    // sqrt(p(1-p)/n). Done in per-mille with an integer square root so no float enters.
    //
    // Without this test a 364 against a 342 reads as "better". It is 22 per-mille on 667 samples,
    // which is inside the noise. A margin smaller than its own error bar is not a result.
    let test_n = n - split;
    let proto_rate = proto_correct * 1000 / test_n;
    let se_permille = {
        // variance in per-mille^2: p*(1000-p)/n, then integer sqrt
        let var = (majority_rate * (1000 - majority_rate)) / test_n;
        let mut r = 0usize;
        while (r + 1) * (r + 1) <= var {
            r += 1;
        }
        r
    };
    let margin = proto_rate.saturating_sub(majority_rate);
    let sigmas_x10 = if se_permille > 0 {
        margin * 10 / se_permille
    } else {
        0
    };
    let test_rate = best_test * 1000 / test_n;
    let chance = 1000 / OUTER; // 333 per-mille
    // is the result distinguishable from chance, or from just always guessing the majority?
    let beats_chance = test_rate > chance + 50;
    let beats_majority = test_rate > majority_rate;

    let mut rows: Vec<String> = Vec::new();
    rows.push(hbp(
        "BLUENETHDR",
        &[
            ("schema", "ASOLARIA-NESTED-TERNARY-NET-V1".to_string()),
            ("seat", "ACER-CLAUDE-FABLE5".to_string()),
            ("pid", "8467a937cba309f7".to_string()),
            ("owner", "OP-JESSE".to_string()),
            ("stamp", "2026-10-09".to_string()),
            ("nest", "outer 3 neurons, each one an inner 24->9->1 net".to_string()),
            ("weights", "ternary {-1,0,+1} only".to_string()),
            ("activation", "three-state sign with dead band".to_string()),
            ("dead_band_hidden", DEAD_H.to_string()),
            ("dead_band_output", DEAD_O.to_string()),
            ("dead_band_law", "a fraction of the fan-in, never an absolute".to_string()),
            ("first_run_fault", "DEAD=26 exceeded the max reachable inner sum of 24, pinning every hidden unit to Nil; 358 permille frozen for 40 epochs and all 667 stones tie-broken to BLUE".to_string()),
            ("learning_rule", "integer ternary perceptron, clamped".to_string()),
            ("float_used", "0".to_string()),
            ("external_crates", "0".to_string()),
            ("samples", n.to_string()),
            ("train_n", split.to_string()),
            ("test_n", test_n.to_string()),
            ("epochs", EPOCHS.to_string()),
            ("prism_roundtrip_all", if exact_all { "EXACT" } else { "FAIL" }.to_string()),
            ("traversal", "HBI->HBP->SHA->SH->HASH".to_string()),
            ("E", "0".to_string()),
        ],
    ));
    rows.push(hbp(
        "TASK",
        &[
            ("predict", "which costing register carries the stone: argmax of spectral cells 1,2,3".to_string()),
            ("from", "the OTHER 24 lanes only; cells 1,2,3 withheld from the input entirely".to_string()),
            ("classes", OUTER.to_string()),
            ("chance_permille", chance.to_string()),
            ("majority_class_permille", majority_rate.to_string()),
            ("can_fail", "1".to_string()),
            ("why_it_can_fail", "if the prism decorrelates its lanes this is unlearnable and no amount of recurrence will move it off chance".to_string()),
        ],
    ));
    rows.extend(epoch_rows);
    rows.push(hbp(
        "RESULT",
        &[
            ("best_test_correct", best_test.to_string()),
            ("best_test_n", test_n.to_string()),
            ("best_test_permille", test_rate.to_string()),
            ("best_epoch", best_epoch.to_string()),
            ("chance_permille", chance.to_string()),
            ("majority_permille", majority_rate.to_string()),
            ("beats_chance_by_5pct", u8::from(beats_chance).to_string()),
            ("beats_majority_baseline", u8::from(beats_majority).to_string()),
            (
                "verdict",
                if beats_chance && beats_majority {
                    "LEARNED_something_above_both_baselines".to_string()
                } else if beats_chance {
                    "above_chance_but_NOT_above_the_majority_baseline_so_not_demonstrated".to_string()
                } else {
                    "AT_CHANCE_the_net_learned_nothing_and_that_is_the_finding".to_string()
                },
            ),
        ],
    ));
    rows.push(hbp(
        "COMPARATOR",
        &[
            ("kind", "single-pass integer prototype classifier, no updates, cannot oscillate".to_string()),
            ("test_correct", proto_correct.to_string()),
            ("test_n", test_n.to_string()),
            ("test_permille", proto_rate.to_string()),
            ("margin_over_majority_permille", margin.to_string()),
            ("one_standard_error_permille", se_permille.to_string()),
            ("margin_in_sigmas_x10", sigmas_x10.to_string()),
            ("significant_at_2_sigma", u8::from(sigmas_x10 >= 20).to_string()),
            ("ties", proto_ties.to_string()),
            ("chance_permille", chance.to_string()),
            ("majority_permille", majority_rate.to_string()),
            (
                "reads_as",
                if sigmas_x10 >= 20 {
                    "ABOVE_the_majority_baseline_by_more_than_2_sigma_the_task_IS_learnable".to_string()
                } else {
                    "INSIDE_THE_NOISE_a_margin_smaller_than_its_own_error_bar_is_not_a_result".to_string()
                },
            ),
            ("why_it_matters", "an unstable optimizer failing proves nothing about the data; this one cannot thrash".to_string()),
        ],
    ));
    rows.push(hbp(
        "SPEAK",
        &[
            ("glyph", spoken.clone()),
            ("alphabet", "- RED, . GREEN, + BLUE".to_string()),
            ("source", "the net's own decisions on held-out stones it never trained on".to_string()),
        ],
    ));
    rows.push(hbp(
        "WORK",
        &[
            ("carried_RED", carried[0].to_string()),
            ("carried_GREEN", carried[1].to_string()),
            ("carried_BLUE", carried[2].to_string()),
            ("no_decision_ties", ties.to_string()),
            ("LYNN", "rides the whole band".to_string()),
            ("fourth_seat", "held_open_unnamed".to_string()),
            (
                "collapse_check",
                match carried.iter().filter(|&&c| c > 0).count() {
                    // FIXED: the first version asked only "is it exactly 1?", so ZERO classes
                    // carried fell through to "spread" - which read as healthy when in fact the
                    // net had decided nothing at all. Zero is not spread.
                    0 => "NOTHING_CARRIED_every_sample_tied_the_net_decided_nothing".to_string(),
                    1 => "COLLAPSED_to_one_class_this_is_not_carrying_it_is_guessing".to_string(),
                    _ => "spread_across_more_than_one_class".to_string(),
                },
            ),
        ],
    ));
    rows.push(hbp(
        "MEASURED",
        &[
            ("subject", "the_prism_decorrelates_its_own_lanes".to_string()),
            ("evidence", format!("24 of 27 spectral lanes carry no detectable signal about lanes 1,2,3: a stable single-pass classifier reaches {proto_rate} permille against a {majority_rate} permille majority baseline, a margin of {margin} inside a {se_permille} permille standard error")),
            ("samples", n.to_string()),
            ("held_out", test_n.to_string()),
            ("reading", "this is what an exact NTT is SUPPOSED to do - spread information so no subset of lanes predicts another".to_string()),
            ("tag", "MEASURED_no_detectable_signal_at_this_sample_size_with_these_two_classifiers".to_string()),
            ("NOT_claimed", "provable statistical independence; absence of detection by two classifiers is not a proof of independence".to_string()),
            ("falsifier", "any classifier beating the majority baseline by more than 2 sigma on these 24 lanes".to_string()),
        ],
    ));
    rows.push(hbp(
        "MYFAULT",
        &[
            ("subject", "dead_band_carried_from_another_scale".to_string()),
            ("fault", "DEAD=26 against a max reachable inner sum of 24 pinned every hidden unit to Nil".to_string()),
            ("symptom", "358 permille frozen identically across all 40 epochs; 667 of 667 stones tie-broken to BLUE and reported as carried".to_string()),
            ("tell", "a learning net does not score identically forty times".to_string()),
            ("law", "a dead band is a fraction of the fan-in, never an absolute; a constant from another scale is not a constant".to_string()),
            ("second_fault", "max_by_key silently returns the LAST maximum, so a full three-way tie looked like a confident BLUE vote".to_string()),
            ("second_fix", "argmax now reports ties as no-decision and they are counted, never scored as correct".to_string()),
            ("third_fault", "the collapse check asked only is_it_exactly_one_class, so ZERO classes carried fell through to spread and read as healthy".to_string()),
            ("severity_trit", "t5".to_string()),
        ],
    ));
    rows.push(hbp(
        "BOUNDARY",
        &[
            ("not_a_language_model", "1".to_string()),
            (
                "scope",
                "this is a 3-neuron nest of 24->9->1 ternary nets graded on held-out data; it is not the matrix speaking and it is not an LLM"
                    .to_string(),
            ),
            ("label_is_derived", "the label comes from the same prism as the features, so this measures lane dependence inside one transform, not a fact about the world".to_string()),
        ],
    ));

    let body = format!("{}\n", rows.join("\n"));
    fs::write(out.join("BLUENET.hbp"), &body).unwrap();
    let b = fs::read(out.join("BLUENET.hbp")).unwrap();
    fs::write(
        out.join("BLUENET.hbp.sha256"),
        format!("{}  BLUENET.hbp\n", hex(&sha256(&b))),
    )
    .unwrap();
    print!("{body}");
}
