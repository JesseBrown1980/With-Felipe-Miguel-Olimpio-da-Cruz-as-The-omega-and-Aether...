//! tests/fixtures/l0-torch.hbp: the L0 server's own model (torch, written by tools/l0_parity.py) on
//! 2000 white-room and 2000 fabric-thinker request graphs, against the in-process Q24 L0 this crate
//! uses in place of the :4792 POST. Every comparison is in integers (`Dbl` emulates binary64); the
//! measured counts are pinned here and stated in README.md.

mod common;

use common::{from_bits, rows};
use l0_edge::jsnum::Dbl;
use quant_cubes::whiteroom::{genius_threshold, to_fixed6};
use whiteroom_shannon::fabric_thinker::pid_query_to_graph;
use whiteroom_shannon::jsnum_ext::q24_to_dbl;
use whiteroom_shannon::l0_request::score_q24;
use whiteroom_shannon::whiteroom::L0GnnScorer;

/// The torch float32 score as the double `.tolist()` gives (exact); `None` outside `Dbl`'s domain.
fn float32_as_dbl(bits: u32) -> Option<Dbl> {
    if bits == 0 {
        return Some(Dbl::ZERO);
    }
    let field = u64::from(bits >> 23);
    if bits >> 31 != 0 || field == 0 || field == 0xff {
        return None;
    }
    let frac = u64::from(bits & 0x7f_ffff);
    from_bits(((field + 1023 - 127) << 52) | (frac << 29))
}

/// `round(v * 2^24)`, half up, of a non-negative double: its Q24 rounding.
fn q24_of(v: Dbl) -> i64 {
    // v * 2^24 is exact (a power-of-two scaling); js_round is floor(x + 1/2).
    (v * Dbl::from_u64(1 << 24)).js_round() as i64
}

/// `Math.max(2, Math.min(1023, Math.round(score * 1024)))` (fabric-thinker-gnn.mjs:117).
fn cp_of(v: Dbl) -> u64 {
    (v * Dbl::from_u64(1024)).js_round().clamp(2, 1023)
}

struct Tally {
    rows: u64,
    max_abs_q24: i64,
    differing_q24: u64,
    genius_rust: u64,
    genius_torch: u64,
    verdict_differs: u64,
    fixed6_differs: u64,
    cp_differs: u64,
    /// The first request whose `toFixed(6)` differs: (i, Rust text, torch text).
    first_fixed6: Option<(u64, String, String)>,
}

fn tally(kind: &str, request: impl Fn(u64) -> [[u8; 6]; 2]) -> Tally {
    let mut t = Tally {
        rows: 0,
        max_abs_q24: 0,
        differing_q24: 0,
        genius_rust: 0,
        genius_torch: 0,
        verdict_differs: 0,
        fixed6_differs: 0,
        cp_differs: 0,
        first_fixed6: None,
    };
    for row in rows("l0-torch.hbp").iter().filter(|r| r.kind == kind) {
        let i: u64 = row.int("i");
        assert_eq!(i, t.rows, "rows in order");
        let bits = u32::from_str_radix(row.raw("out_bits"), 16).expect("hex");
        let torch = float32_as_dbl(bits).expect("a non-negative normal float32 score");
        let q = score_q24(&request(i));
        let rust = q24_to_dbl(q);
        let d = (q - q24_of(torch)).abs();
        t.max_abs_q24 = t.max_abs_q24.max(d);
        t.differing_q24 += u64::from(d != 0);
        let (g_rust, g_torch) = (rust >= genius_threshold(), torch >= genius_threshold());
        t.genius_rust += u64::from(g_rust);
        t.genius_torch += u64::from(g_torch);
        t.verdict_differs += u64::from(g_rust != g_torch);
        if to_fixed6(rust) != to_fixed6(torch) {
            t.fixed6_differs += 1;
            t.first_fixed6
                .get_or_insert((i, to_fixed6(rust), to_fixed6(torch)));
        }
        t.cp_differs += u64::from(cp_of(rust) != cp_of(torch));
        t.rows += 1;
    }
    t
}

fn report(kind: &str, t: &Tally) -> String {
    format!(
        "L0TORCH|kind={kind}|rows={}|max_abs_q24={}|q24_differs={}|genius_rust={}|genius_torch={}|verdict_differs={}|tofixed6_differs={}|first_tofixed6={}|cp_differs={}|json=0",
        t.rows,
        t.max_abs_q24,
        t.differing_q24,
        t.genius_rust,
        t.genius_torch,
        t.verdict_differs,
        t.fixed6_differs,
        t.first_fixed6
            .as_ref()
            .map_or("-".to_string(), |(i, r, s)| format!("{i}:{r}:{s}")),
        t.cp_differs
    )
}

#[test]
fn whiteroom_requests_against_the_server_model() {
    let t = tally("WR", |i| {
        let pid = format!("BH.WR.liris-whiteroom.{i}");
        L0GnnScorer::request(&pid, &format!("bigpickle:room:{i}:work")).nodes
    });
    let line = report("WR", &t);
    println!("{line}");
    assert_eq!(line, WR_MEASURED);
}

#[test]
fn fabric_requests_against_the_server_model() {
    let t = tally("FT", |i| {
        let pid = format!("BH.WR.liris-whiteroom.{i}");
        pid_query_to_graph(&pid, &format!("bigpickle:room:{i}:work")).nodes
    });
    let line = report("FT", &t);
    println!("{line}");
    assert_eq!(line, FT_MEASURED);
}

/// Measured 2026-10-17 (torch 2.14.1+cpu, torch_geometric 2.8.1) under l0_parity.py's KERNEL_ENV:
/// ATEN_CPU_CAPABILITY=default, MKL_CBWR=COMPATIBLE, OMP_NUM_THREADS=1, MKL_NUM_THREADS=1. With
/// torch's default kernel selection the server's float32 bits, and these counts, can differ.
/// The white-room fields are the verdict at 0.72 and the seal's `score.toFixed(6)`; the fabric field is `cp`.
const WR_MEASURED: &str = "L0TORCH|kind=WR|rows=2000|max_abs_q24=9|q24_differs=1051|genius_rust=1651|genius_torch=1651|verdict_differs=0|tofixed6_differs=66|first_tofixed6=11:0.965410:0.965409|cp_differs=0|json=0";
const FT_MEASURED: &str = "L0TORCH|kind=FT|rows=2000|max_abs_q24=9|q24_differs=1045|genius_rust=1658|genius_torch=1658|verdict_differs=0|tofixed6_differs=64|first_tofixed6=2:0.969819:0.969818|cp_differs=0|json=0";

/// Scores looked up by PID: the torch float32 scores of the smoke rooms.
struct TorchScores(std::collections::HashMap<String, Dbl>);

impl quant_cubes::whiteroom::Scorer for TorchScores {
    fn name(&self) -> &str {
        L0GnnScorer::NAME
    }

    fn score(&self, pid: &str, _mark: &str, _coord64: Option<&str>) -> Dbl {
        self.0[pid]
    }
}

fn smoke_rows<S: quant_cubes::whiteroom::Scorer>(scorer: S) -> Vec<String> {
    use quant_cubes::whiteroom::{BhPidEmitter, MemoryStore, WhiteRoomEngine};
    let mut engine = WhiteRoomEngine::new(
        MemoryStore::new(),
        scorer,
        BhPidEmitter::default(),
        None,
        genius_threshold(),
        1,
    );
    let marks: Vec<String> = (0..12)
        .map(|i| format!("bigpickle:room:{i}:work"))
        .collect();
    let recs = engine
        .spin(marks.iter().map(String::as_str))
        .expect("memory store");
    recs.iter()
        .map(|r| r.borrow().sealed.clone().expect("sealed"))
        .collect()
}

#[test]
fn the_l0_smoke_run_against_the_server_model() {
    // liris-whiteroom-engine.mjs:185-199 with --l0: the sealed rows with the in-process scores, and
    // the rows the same engine seals with the server model's float32 scores for the same rooms.
    let torch: std::collections::HashMap<String, Dbl> = rows("l0-torch.hbp")
        .iter()
        .filter(|r| r.kind == "WR")
        .take(12)
        .map(|r| {
            let bits = u32::from_str_radix(r.raw("out_bits"), 16).expect("hex");
            let i: u64 = r.int("i");
            (
                format!("BH.WR.liris-whiteroom.{i}"),
                float32_as_dbl(bits).expect("score"),
            )
        })
        .collect();
    let rust = smoke_rows(whiteroom_shannon::whiteroom::SmokeScorer::from_use_l0(true));
    let server = smoke_rows(TorchScores(torch));
    let equal = rust.iter().zip(&server).take_while(|(a, b)| a == b).count();
    // Rooms 0-10 seal identically; room 11's score is 0.965410 in process and 0.965409 from the
    // server model, so its row (and the row hash chained from it) differs.
    assert_eq!(equal, 11);
    assert!(rust[11].contains("|score=0.965410|verdict=genius|"));
    assert!(server[11].contains("|score=0.965409|verdict=genius|"));
    let verdicts = |rows: &[String]| {
        rows.iter()
            .filter(|r| r.contains("|verdict=genius|"))
            .count()
    };
    assert_eq!((verdicts(&rust), verdicts(&server)), (10, 10));
}
