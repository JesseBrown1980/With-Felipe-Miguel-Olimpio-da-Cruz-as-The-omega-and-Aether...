//! `sidon-cross-fix.mjs` against the referee's fixtures and the recorded certificate.

mod common;

use common::{expected_stdout, fields, get, num, rows};
use ste_certificate::cross_fix::{
    certificate, dist_multiset, embed, stdout_lines, Certificate, GUARD,
};
use ste_certificate::sidon::{erdos_turan, filtered_primes, is_prime, ANCHOR_PRIMES};

#[test]
fn stdout_equals_the_referee() {
    assert_eq!(
        stdout_lines(&certificate()),
        expected_stdout("sidon-cross-fix")
    );
}

#[test]
fn stdout_equals_the_recorded_certificate() {
    let ours = stdout_lines(&certificate());
    // F02-builder.md:185-187, REBUILD-REPORT.md:175-176, S1-geometry-theorem-math.md:145-146.
    for record in [
        include_str!("../vendor/records/F02-builder-185-187.txt"),
        include_str!("../vendor/records/REBUILD-REPORT-175-176.txt"),
        include_str!("../vendor/records/S1-145-146.txt"),
    ] {
        for (recorded, computed) in record.lines().zip(&ours) {
            assert_eq!(fields(recorded), fields(computed));
        }
    }
    assert_eq!(
        include_str!("../vendor/records/F02-builder-185-187.txt")
            .lines()
            .count(),
        ours.len()
    );
}

#[test]
fn certificate_values() {
    let c = certificate();
    assert_eq!((c.towers, c.points), (11, 627));
    assert_eq!(c.all.tot, 196_251);
    assert_eq!(c.all.tot, 627 * 626 / 2);
    assert_eq!((c.all.distinct, c.all.coll), (196_251, 0));
    assert_eq!(c.all.min_d, Some(37_349));
    assert_eq!(c.all.max_d, 2_617_523_875_674_652_731);
    assert!(c.intra_fail.is_empty());
}

#[test]
fn towers_and_points_equal_the_referee() {
    let text = include_str!("fixtures/expected-cross-fix-points.hbp");
    let (towers, all) = embed();
    let want_towers = rows(text, "TOWER");
    assert_eq!(towers.len(), want_towers.len());
    for (tw, row) in towers.iter().zip(&want_towers) {
        assert_eq!(u128::from(tw.p), num(row, "p"));
        assert_eq!(tw.w, num(row, "w"));
        assert_eq!(tw.anchor, num(row, "anchor"));
        assert_eq!(tw.max_intra, num(row, "max_intra"));
    }
    let want_points = rows(text, "POINT");
    assert_eq!(all.len(), want_points.len());
    for (i, row) in want_points.iter().enumerate() {
        let tw = &towers[get(row, "t").parse::<usize>().unwrap()];
        let k: usize = get(row, "k").parse().unwrap();
        let sidon = erdos_turan(tw.p)[k];
        assert_eq!(u128::from(sidon), num(row, "sidon"));
        assert_eq!(tw.scaled[k], u128::from(sidon) * tw.w);
        assert_eq!(all[i], num(row, "phi"));
        assert_eq!(all[i], tw.anchor + u128::from(sidon) * tw.w);
    }
}

#[test]
fn intra_fail_lines_then_the_ok_line() {
    // sidon-cross-fix.mjs:23 prints a line for each tower with coll !== 0; :24 prints its line
    // after that loop whatever it printed.
    let c = Certificate {
        towers: 1,
        points: 2,
        all: dist_multiset(&[0, 3]),
        intra_fail: vec![(13, 1)],
    };
    assert_eq!(
        stdout_lines(&c),
        [
            "CROSS-FIX towers=1 points=2 pairs=1 distinct_dist=1 collisions=0",
            "min_dist=3 max_dist=3",
            "INTRA FAIL p=13 coll=1",
            "INTRA all towers zero-collision: OK",
        ]
    );
}

#[test]
fn shared_helpers() {
    assert_eq!(filtered_primes(), ANCHOR_PRIMES.to_vec());
    assert_eq!(
        (0..20).filter(|&n| is_prime(n)).collect::<Vec<_>>(),
        [2, 3, 5, 7, 11, 13, 17, 19]
    );
    assert_eq!(erdos_turan(13)[..4], [0, 27, 56, 87]);
    assert_eq!(GUARD, 1_099_511_627_776);
}

#[test]
fn dist_multiset_object_fields() {
    let empty = dist_multiset(&[]);
    assert_eq!((empty.tot, empty.min_d, empty.max_d), (0, None, 0));
    let r = dist_multiset(&[0, 3, 6, 10]);
    assert_eq!((r.tot, r.distinct, r.coll), (6, 5, 1));
    assert_eq!((r.min_d, r.max_d), (Some(3), 10));
}
