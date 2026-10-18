//! The CLI smoke run of `liris-whiteroom-engine.mjs` (lines 185-200) with its scorer choice (line
//! 191): `--l0` selects the L0 scorer (here the in-process L0 forward in place of the :4792 POST),
//! otherwise the deterministic scorer. Twelve rooms through the quants/cubes engine, printed as HBP
//! rows. Upstream also appends the rows to an operator-local seal path (line 189), which this run
//! does not carry; the rows stay in memory. Without `--l0` the output equals quants/cubes
//! `examples/whiteroom_smoke`.

use quant_cubes::whiteroom::{
    genius_threshold, BhPidEmitter, MemoryStore, Scorer, Store, WhiteRoomEngine,
};
use whiteroom_shannon::whiteroom::SmokeScorer;

fn main() {
    // const useL0 = process.argv.includes("--l0") (line 188)
    let use_l0 = std::env::args().skip(1).any(|a| a == "--l0");
    let mut engine = WhiteRoomEngine::new(
        MemoryStore::new(),
        SmokeScorer::from_use_l0(use_l0),
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
    println!(
        "HBPv1|row=whiteroom_smoke|scorer={}|store={}|json=0",
        engine.scorer.name(),
        engine.store.kind()
    );
    for r in &recs {
        println!("{}", r.borrow().sealed.as_deref().unwrap_or(""));
    }
    let st = engine.store.stats();
    let m = engine.metrics;
    println!(
        "HBPv1|row=metrics|ticks={}|genius={}|mistake={}|live={}|compacted={}|never_deleted={}|json=0",
        m.ticks,
        m.genius,
        m.mistake,
        st.live,
        st.compacted,
        st.live as u64 + st.compacted as u64 == m.ticks
    );
}
