//! The CLI smoke run of `liris-whiteroom-engine.mjs` (lines 185-200): twelve rooms through the
//! default engine, printed as HBP rows. Upstream also appends the rows to an operator-local seal
//! path (line 189); this run keeps them in memory (`--l0`, the HTTP L0 scorer, is not ported).

use quant_cubes::whiteroom::{Scorer, Store, WhiteRoomEngine};

fn main() {
    let mut engine = WhiteRoomEngine::with_defaults();
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
