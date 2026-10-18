//! Slot 28 white room: the port against the owner's recorded receipts (falcon-orbital's
//! sector-PID triple confirm, bigpickle-rebuild's recorded score), the referee fixture, and the
//! owner's own node tests (`liris-whiteroom-engine.test.mjs`, `liris-sector-emitter.test.mjs`),
//! each assertion restated with its line.

mod common;

use common::{fixture, get, vendor_lines};
use l0_edge::jsnum::Dbl;
use quant_cubes::whiteroom::{
    genius_score, genius_threshold, global_room_address, hilbert_d2xy, prime_at, sha16, sha256hex,
    to_fixed6, BhPidEmitter, DeterministicScorer, Emitter, EngineError, MemoryStore,
    RedisCloudStore, Scorer, SectorAwareEmitter, Store, WhiteRoomEngine, SECTOR_CAPACITY,
};
use std::cell::RefCell;
use std::rc::Rc;

/// falcon-orbital @ acff074 `envelopes/2026-06-01T20-48Z-sector-PID-triple-confirm.hbp` lines
/// 3-6: three PIDs and primeAt(0..7), each equal on three vantages.
#[test]
fn falcon_triple_confirm() {
    let lines =
        vendor_lines("falcon-orbital/envelopes/2026-06-01T20-48Z-sector-PID-triple-confirm.hbp");
    let cases = [(2, 0, 0), (3, 1, 7), (4, 3, 999999)];
    for (line, sector, room) in cases {
        let r = &lines[line];
        let pid = global_room_address(sector, room).unwrap().pid;
        let key = if line == 2 {
            "falcon_compute"
        } else {
            "falcon"
        };
        assert_eq!(get(r, key), pid, "{r}");
        assert!(r.contains("|TRIPLE_MATCH=true|"));
    }
    let primes: Vec<String> = (0..8).map(|n| prime_at(n).to_string()).collect();
    assert_eq!(get(&lines[5], "falcon"), primes.join(","));
}

/// bigpickle-rebuild @ c592599 `src/fabric-sector-cycle.mjs` lines 18-20: "verified 2026-06-01:
/// acer==liris on BH.SECTOR.P2.R0000000.7593C541 = 0.755838".
#[test]
fn recorded_genius_score() {
    let lines = vendor_lines("bigpickle-rebuild/src/fabric-sector-cycle.mjs.lines-17-26");
    assert!(lines[3].contains("BH.SECTOR.P2.R0000000.7593C541 = 0.755838"));
    assert_eq!(
        to_fixed6(genius_score("BH.SECTOR.P2.R0000000.7593C541")),
        "0.755838"
    );
    assert!(genius_score("BH.SECTOR.P2.R0000000.7593C541") >= genius_threshold());
}

#[test]
fn fixture_primes_addresses_hilbert() {
    let lines = fixture("whiteroom.hbp");
    let primes: Vec<String> = (0..200).map(|n| prime_at(n).to_string()).collect();
    assert_eq!(get(&lines[1], "primes"), primes.join(","));
    for r in lines.iter().filter(|r| r.starts_with("ADDR|")) {
        let a = global_room_address(
            get(r, "sector").parse().unwrap(),
            get(r, "room").parse().unwrap(),
        )
        .unwrap();
        assert_eq!(a.prime.to_string(), get(r, "prime"));
        assert_eq!(a.global_index.to_string(), get(r, "global_index"));
        assert_eq!(a.pid, get(r, "pid"));
        assert_eq!(to_fixed6(genius_score(&a.pid)), get(r, "score"));
    }
    for r in lines.iter().filter(|r| r.starts_with("HILBERT|")) {
        let (x, y) = hilbert_d2xy(get(r, "n").parse().unwrap(), get(r, "d").parse().unwrap());
        assert_eq!(format!("{x},{y}"), get(r, "xy"), "{r}");
    }
}

fn block(lines: &[String], head: &str, n: usize) -> Vec<String> {
    let at = lines.iter().position(|r| r.starts_with(head)).unwrap();
    lines[at + 1..at + 1 + n].to_vec()
}

#[test]
fn fixture_smoke_and_sector_runs() {
    let lines = fixture("whiteroom.hbp");
    // engine:190-199: the default engine over `bigpickle:room:${i}:work`, i < 12.
    let mut e = WhiteRoomEngine::with_defaults();
    let marks: Vec<String> = (0..12)
        .map(|i| format!("bigpickle:room:{i}:work"))
        .collect();
    let recs = e.spin(marks.iter().map(String::as_str)).unwrap();
    let sealed: Vec<String> = recs
        .iter()
        .map(|r| r.borrow().sealed.clone().unwrap())
        .collect();
    assert_eq!(sealed, block(&lines, "SMOKE|", 12));
    let st = e.store.stats();
    assert_eq!(
        format!(
            "METRICS|ticks={}|genius={}|mistake={}|live={}|compacted={}|json=0",
            e.metrics.ticks, e.metrics.genius, e.metrics.mistake, st.live, st.compacted
        ),
        block(&lines, "SMOKE|", 13)[12]
    );

    // liris-sector-flywheel.mjs:15-21 shape: sector 2, reuseCoord64 scorer.
    let mut e = WhiteRoomEngine::new(
        MemoryStore::new(),
        DeterministicScorer::new(genius_threshold(), true),
        SectorAwareEmitter::new(2, 0),
        None,
        genius_threshold(),
        5000,
    );
    let marks: Vec<String> = (0..40)
        .map(|i| format!("fabric:sector2:room:{i}:work"))
        .collect();
    let recs = e.spin(marks.iter().map(String::as_str)).unwrap();
    let sealed: Vec<String> = recs
        .iter()
        .map(|r| r.borrow().sealed.clone().unwrap())
        .collect();
    assert_eq!(sealed, block(&lines, "SECTORRUN|", 40));
    for (i, r) in recs.iter().enumerate() {
        assert_eq!(
            r.borrow().pid,
            global_room_address(2, i as u64).unwrap().pid
        );
    }
    let st = e.store.stats();
    assert_eq!(
        format!(
            "METRICS|ticks={}|genius={}|mistake={}|live={}|compacted={}|json=0",
            e.metrics.ticks, e.metrics.genius, e.metrics.mistake, st.live, st.compacted
        ),
        block(&lines, "SECTORRUN|", 41)[40]
    );
}

#[test]
fn seal_page_batches_append_every_row() {
    let path = std::env::temp_dir().join(format!("quant-cubes-seal-{}.hbp", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut e = WhiteRoomEngine::new(
        MemoryStore::new(),
        DeterministicScorer::default(),
        BhPidEmitter::default(),
        Some(path.clone()),
        genius_threshold(),
        5,
    );
    let marks: Vec<String> = (0..12)
        .map(|i| format!("bigpickle:room:{i}:work"))
        .collect();
    let recs = e.spin(marks.iter().map(String::as_str)).unwrap();
    let page = std::fs::read_to_string(&path).unwrap();
    std::fs::remove_file(&path).unwrap();
    let want: String = recs
        .iter()
        .map(|r| r.borrow().sealed.clone().unwrap() + "\n")
        .collect();
    assert_eq!(page, want);
}

/// JavaScript `toFixed` takes the larger neighbour on a tie: (1/128).toFixed(6) is "0.007813".
#[test]
fn to_fixed6_ties_and_bounds() {
    assert_eq!(to_fixed6(Dbl::from_ratio(1, 128)), "0.007813");
    assert_eq!(to_fixed6(Dbl::ZERO), "0.000000");
    assert_eq!(
        to_fixed6(Dbl::from_ratio(0xffff_ffff, 0xffff_ffff)),
        "1.000000"
    );
    assert_eq!(to_fixed6(Dbl::from_ratio(1, 0xffff_ffff)), "0.000000");
}

// ---- liris-whiteroom-engine.test.mjs (asolaria-whiteroom-engine @ 896518a) ----

/// test.mjs:9-19.
#[test]
fn node_pid_emitter_deterministic_unique_port3() {
    let (mut a, mut b) = (BhPidEmitter::new("t"), BhPidEmitter::new("t"));
    let (x, y) = (a.next().unwrap(), b.next().unwrap());
    assert_eq!(x.pid, y.pid);
    assert_eq!(x.coord64, y.coord64);
    assert_eq!(x.coord64, sha256hex(&x.pid));
    let parts: Vec<&str> = x.port3.split('.').collect();
    assert_eq!(parts.len(), 3);
    assert!(parts
        .iter()
        .all(|p| !p.is_empty() && p.bytes().all(|c| c.is_ascii_digit())));
    let mut seen = std::collections::HashSet::new();
    for _ in 0..500 {
        seen.insert(a.next().unwrap().pid);
    }
    assert_eq!(seen.len(), 500);
}

fn rec(pid: &str, mark: &str) -> quant_cubes::whiteroom::Shared {
    Rc::new(RefCell::new(quant_cubes::whiteroom::Record {
        pid: pid.to_string(),
        port3: String::new(),
        cp: 0,
        mark: mark.to_string(),
        score: None,
        verdict: None,
        compacted: false,
        sealed: None,
    }))
}

/// test.mjs:21-30.
#[test]
fn node_memory_store_compact_never_deletes() {
    let mut s = MemoryStore::new();
    s.put("p1", rec("p1", "m")).unwrap();
    assert!(s.get("p1").unwrap().is_some());
    s.compact("p1").unwrap();
    assert_eq!(s.stats().live, 0);
    assert_eq!(s.stats().compacted, 1);
    let got = s.get("p1").unwrap().unwrap();
    assert!(got.borrow().compacted);
}

/// test.mjs:32-38.
#[test]
fn node_memory_store_scan_by_pid() {
    let mut s = MemoryStore::new();
    s.put("BH.WR.a.0", rec("BH.WR.a.0", "")).unwrap();
    s.put("BH.WR.b.1", rec("BH.WR.b.1", "")).unwrap();
    let hits = s.scan_by_pid(&|pid: &str| pid.contains(".a.")).unwrap();
    assert_eq!(hits.len(), 1);
}

/// test.mjs:40-46.
#[test]
fn node_deterministic_scorer_stable_bounded() {
    let sc = DeterministicScorer::default();
    let (v1, v2) = (sc.score("p", "m", None), sc.score("p", "m", None));
    assert_eq!(v1, v2);
    assert!(v1 >= Dbl::ZERO && v1 <= Dbl::from_u64(1));
    assert_ne!(sc.score("p", "m", None), sc.score("p", "n", None));
}

/// test.mjs:48-53.
#[test]
fn node_redis_cloud_store_gated() {
    let mut r = RedisCloudStore;
    let gated = |e: EngineError| match e {
        EngineError::Gated(m) => {
            let at = m.find("GATED").unwrap();
            assert!(m[at..].contains("Asolaria Profile"));
        }
        other => panic!("{other:?}"),
    };
    gated(r.put("x", rec("x", "")).unwrap_err());
    gated(r.get("x").unwrap_err());
    gated(r.scan_by_pid(&|_: &str| true).unwrap_err());
    gated(r.compact("x").unwrap_err());
    let mut e = WhiteRoomEngine::new(
        RedisCloudStore,
        DeterministicScorer::default(),
        BhPidEmitter::default(),
        None,
        genius_threshold(),
        1,
    );
    gated(e.tick("m").unwrap_err());
}

/// test.mjs:55-77.
#[test]
fn node_engine_spin_never_delete_hbp_sha_chain() {
    let mut e = WhiteRoomEngine::with_defaults();
    let marks: Vec<String> = (0..200).map(|i| format!("room:{i}")).collect();
    let recs = e.spin(marks.iter().map(String::as_str)).unwrap();
    let m = e.metrics;
    assert_eq!(m.ticks, 200);
    assert_eq!(m.genius + m.mistake, 200);
    let st = e.store.stats();
    assert_eq!(st.live + st.compacted, 200);
    assert_eq!(st.compacted as u64, m.mistake);
    assert_eq!(st.live as u64, m.genius);
    for r in &recs {
        let s = r.borrow().sealed.clone().unwrap();
        assert!(s.starts_with("WHITEROOM|"));
        assert!(s.contains("|json=0"));
        assert!(!s.contains(['{', '}']));
        let h = s.rsplit("|row_hash=").next().unwrap();
        assert_eq!(h.len(), 16);
        assert!(h
            .bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
    }
    let first = recs[0].borrow().sealed.clone().unwrap();
    let (row, h) = first.rsplit_once("|row_hash=").unwrap();
    assert_eq!(&sha256hex(&format!("{row}{}", "0".repeat(16)))[..16], h);
    // Measured counts and chain ends, equal to the referee.
    let want = fixture("whiteroom.hbp")
        .into_iter()
        .find(|r| r.starts_with("METRICS200|"))
        .unwrap();
    assert_eq!(get(&want, "genius"), m.genius.to_string());
    assert_eq!(get(&want, "first_row_hash"), h);
    let last = recs[199].borrow().sealed.clone().unwrap();
    assert_eq!(get(&want, "last_row_hash"), &last[last.len() - 16..]);
}

/// test.mjs:79-85.
#[test]
fn node_engine_deterministic_split() {
    let marks: Vec<String> = (0..100).map(|i| format!("x:{i}")).collect();
    let mut a = WhiteRoomEngine::with_defaults();
    let mut b = WhiteRoomEngine::with_defaults();
    a.spin(marks.iter().map(String::as_str)).unwrap();
    b.spin(marks.iter().map(String::as_str)).unwrap();
    assert_eq!(a.metrics, b.metrics);
}

// ---- liris-sector-emitter.test.mjs ----

/// sector.test.mjs:5-8 (a negative `n` is outside `u64`).
#[test]
fn node_prime_at() {
    let p: Vec<u64> = (0..8).map(prime_at).collect();
    assert_eq!(p, [2, 3, 5, 7, 11, 13, 17, 19]);
}

/// sector.test.mjs:10-12.
#[test]
fn node_sector_capacity() {
    assert_eq!(SECTOR_CAPACITY, 1_000_000);
}

/// sector.test.mjs:14-24.
#[test]
fn node_global_room_address() {
    let a = global_room_address(0, 0).unwrap();
    assert_eq!(a.prime, 2);
    assert_eq!(a.global_index, 0);
    let tail = a.pid.strip_prefix("BH.SECTOR.P2.R0000000.").unwrap();
    assert!(
        tail.len() == 8
            && tail
                .bytes()
                .all(|c| c.is_ascii_digit() || (b'A'..=b'F').contains(&c))
    );
    assert_eq!(global_room_address(1, 7), global_room_address(1, 7));
    assert_eq!(global_room_address(1, 0).unwrap().global_index, 1_000_000);
    assert_eq!(global_room_address(3, 0).unwrap().prime, 7);
    assert_ne!(
        global_room_address(0, 1).unwrap().pid,
        global_room_address(1, 1).unwrap().pid
    );
    let err = global_room_address(0, 1_000_000).unwrap_err();
    assert!(err.0.contains("capacity"));
}

/// sector.test.mjs:26-30.
#[test]
fn node_pid_formula() {
    let gi = 2 * 1_000_000 + 42;
    let expect = format!(
        "BH.SECTOR.P5.R{:07}.{}",
        42,
        sha16(&format!("room|{gi}"))[..8].to_ascii_uppercase()
    );
    assert_eq!(global_room_address(2, 42).unwrap().pid, expect);
}

#[test]
fn sector_emitter_range_error_at_capacity() {
    let mut s = SectorAwareEmitter::new(0, 999_999);
    assert!(s.next().is_ok());
    assert!(s.next().is_err());
}
