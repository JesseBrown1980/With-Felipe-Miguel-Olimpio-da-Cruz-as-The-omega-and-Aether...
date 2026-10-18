//! Slot 26: the rotor's shard fold against the referee, and the one recorded shard-quant receipt
//! (reductions `cubes/sample-shard-quant-cube.annotated.json` @ 29307bf, blob 34af1934; not
//! vendored, it is a JSON file; CI checks every value quoted here against the upstream lines).

mod common;

use common::{fixture, get};
use quant_cubes::shard::{
    group_by_shard, quant_seed, quant_vector, rooms, DEFAULT_ROOM_COUNT, DEFAULT_SHARD_SIZE,
    TARGET_DIMENSION,
};
use quant_hyperbehcs::{
    johnson_lindenstrauss, number_to_string, polar_quant, triple_quant, turbo_quant, Number,
    Options,
};

#[test]
fn shard_vectors_equal_the_referee() {
    let lines = fixture("shard-vectors.hbp");
    let mut i = 1;
    let mut n = 0;
    while i < lines.len() {
        let room_count: u64 = get(&lines[i], "rooms").parse().unwrap();
        let shard_size: u64 = get(&lines[i], "shard_size").parse().unwrap();
        for (id, rows) in group_by_shard(rooms(room_count, shard_size)) {
            let r = &lines[i];
            assert_eq!(get(r, "shard_id"), id);
            let v: Vec<String> = quant_vector(&id, &rows)
                .iter()
                .map(u64::to_string)
                .collect();
            assert_eq!(get(r, "vector"), v.join(","), "{r}");
            assert_eq!(get(r, "seed"), quant_seed(&id));
            i += 1;
            n += 1;
        }
    }
    assert_eq!(n, 208);
}

fn strings(values: &[Number]) -> Vec<String> {
    values.iter().map(|&v| number_to_string(v)).collect()
}

/// The recorded receipt for shard-0000 of the 10,000-room rotor: `seed` (line 13), dimensions
/// (11-12), the JL projection (18), turbo codes and metadata (25-26), polar codes and metadata
/// (32-33) and triple codes (39) all come out of slots 9-12 applied to the rotor's vector with
/// the rotor's options. Its five fingerprints (20, 27, 34, 45, 56) are not these packets':
/// `buildQuantizedSubstrateReceipt` shapes the receipt differently and is not published.
#[test]
fn recorded_shard_0000_receipt() {
    let groups = group_by_shard(rooms(DEFAULT_ROOM_COUNT, DEFAULT_SHARD_SIZE));
    assert_eq!(groups.len(), 100);
    let (id, rows) = &groups[0];
    assert_eq!(id, "shard-0000");
    let vector = quant_vector(id, rows);
    assert_eq!(vector, [100, 9, 9, 8, 8, 8, 0, 4950]);
    let v: Vec<Number> = vector.iter().map(|&x| Number::from_u64(x)).collect();
    let seed = quant_seed(id);
    assert_eq!(seed, "HYP-D-10000-ROOM-ROTOR:shard-0000");
    let opts = Options {
        seed: Some(&seed),
        target_dimension: Some(Number::from_u64(TARGET_DIMENSION)),
        ..Options::default()
    };

    let jl = johnson_lindenstrauss(&v, &opts);
    assert_eq!((jl.source_dimension, jl.target_dimension), (8, 4));
    assert_eq!(
        strings(&jl.projection),
        [
            "0.883159333634",
            "0.00297360045",
            "0.000174917674",
            "-0.004372941837"
        ]
    );

    let turbo = turbo_quant(&v, &opts);
    assert_eq!(
        strings(&turbo.codes),
        ["5", "0", "0", "0", "0", "0", "0", "255"]
    );
    let m = &turbo.metadata;
    assert_eq!(
        strings(&[m.bits, m.min, m.max, m.scale, m.levels, m.max_code]),
        ["8", "0", "4950", "19.411764705882", "256", "255"]
    );

    let polar = polar_quant(&v, &opts);
    let codes: Vec<Vec<String>> = polar.codes.iter().map(|c| strings(c)).collect();
    assert_eq!(codes, [["5", "4"], ["1", "29"], ["1", "32"], ["255", "64"]]);
    let m = &polar.metadata;
    assert_eq!(
        strings(&[m.max_radius, m.radius_scale, m.angle_scale_radians]),
        ["4950", "19.411764705882", "0.024639942381"]
    );

    let triple = triple_quant(&v, &opts);
    let codes: Vec<Vec<String>> = triple.codes.iter().map(|c| strings(c)).collect();
    assert_eq!(
        codes,
        [["5", "120", "4"], ["1", "78", "32"], ["255", "128", "64"]]
    );

    // Measured: the core packets' own fingerprints.
    assert_eq!(jl.fingerprint, "7537cbc978efdf3d");
    assert_eq!(turbo.fingerprint, "d00ff9cd55610664");
    assert_eq!(polar.fingerprint, "2924d8a9cfab3c1d");
    assert_eq!(triple.fingerprint, "41b742e1c3318458");
    for (ours, recorded) in [
        (&jl.fingerprint, "e6f9b1e70d83c377"),
        (&turbo.fingerprint, "aeb89437d368a39c"),
        (&polar.fingerprint, "bcedf0fa35ddfb71"),
        (&triple.fingerprint, "9083f572b7853c75"),
    ] {
        assert_ne!(ours, recorded);
    }
}
