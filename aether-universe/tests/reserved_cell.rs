//! The reserved cell. The eight Omega 5.3 agent states are cells of a 3x3 slice of the cube; the
//! ninth, `(+, +)`, is reserved and never entered. This walks 3^9 = 19,683 ticks of the whole
//! kernel and checks every agent at every tick.
//!
//! A test that cannot fail is decoration, so the last tests forge the reserved cell and require
//! the machine to refuse it.

use aether_universe::agents::{AState, Agent};
use aether_universe::kernel::{Kernel, Mission};
use aether_universe::secrets::Inputs;

#[test]
fn no_agent_enters_the_reserved_cell_in_3_to_the_9_ticks() {
    let mut k = Kernel::new(20_260_801, None, Inputs::empty("x"));
    let mut seen = std::collections::BTreeSet::new();
    let mut checked: u64 = 0;
    let total = 3u64.pow(9);
    assert_eq!(total, 19_683);
    for t in 1..=total {
        let s = k.tick(&[]);
        assert_eq!(s.tick, t);
        for a in &k.agents {
            assert_ne!(
                (a.s1, a.s2),
                (1, 1),
                "agent {} stood on the reserved cell at tick {t}",
                a.id
            );
            assert!(AState::from_cell(a.s1, a.s2).is_some());
            seen.insert(a.state().name());
            checked += 1;
        }
        let pop: u32 = k.fields.iter().map(|f| f.population).sum();
        assert_eq!(pop, 27, "27 agents at tick {t}");
    }
    assert_eq!(checked, 27 * total);
    assert_eq!(
        seen.len(),
        8,
        "all eight states were visited, and only those: {seen:?}"
    );
}

#[test]
fn the_snapshot_rows_never_carry_the_reserved_pair_either() {
    let mut k = Kernel::new(7, None, Inputs::empty("x"));
    for _ in 0..729 {
        let s = k.tick(&[]);
        for r in s.rows_of("AGENT") {
            assert!(
                !(r.get("s1") == Some("1") && r.get("s2") == Some("1")),
                "{}",
                r.line()
            );
        }
    }
}

#[test]
fn a_forged_reserved_cell_is_refused_by_the_loader() {
    let mut k = Kernel::new(7, None, Inputs::empty("x"));
    let s = k.tick(&[Mission::Solve("nope".into())]);
    let mut rows = s.rows[..s.rows.len() - 1].to_vec();
    for r in rows
        .iter_mut()
        .filter(|r| r.tag == "AGENT" && r.get("id") == Some("4"))
    {
        for (key, v) in r.kv.iter_mut() {
            if key == "s1" || key == "s2" {
                *v = "1".to_string();
            }
        }
    }
    let forged = aether_universe::snapshot::Snapshot::seal(s.tick, 7, &s.prev, rows);
    let err = Kernel::from_snapshot(&forged, Inputs::empty("x"))
        .err()
        .expect("must refuse");
    assert!(err.contains("reserved"), "{err}");
    // and an agent row cannot even be built from the pair
    let bad = k.agents[4].row();
    let mut bad = bad;
    for (key, v) in bad.kv.iter_mut() {
        if key == "s1" || key == "s2" {
            *v = "1".to_string();
        }
    }
    assert!(Agent::from_row(&bad).is_err());
}
