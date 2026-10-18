//! Numbers the owner's repositories record about hyperbehcs-core.cjs, reproduced.

use quant_hyperbehcs::{
    achlioptas_weight, johnson_lindenstrauss, number_to_string, polar_quant, sha256_hex,
    triple_quant, turbo_quant, Number, Options,
};

const CORE: &str = include_str!(
    "../vendor/Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs"
);

/// omnicoder-server-v2.mjs:38-39 (Asolaria-ASI-On-Metal-Fabric-and-matrix @ a1a70783) pins the
/// library it loads: `"hyperbehcs-core.cjs": "668a938a…1e08"`.
#[test]
fn vendored_core_is_the_canon_bundle_pin() {
    assert_eq!(
        sha256_hex(CORE),
        "668a938a8b0281694797d64a6ff31921031b9af58fd7afb77a50dd3e0ee31e08"
    );
}

/// QUANT8DEFS-CODE-GROUNDED-2026-06-11.hbp line 3 (ASOLARIA-AS-NEURAL-NETWORK) records the JL
/// weights as `{+sqrt3,0,-sqrt3}-prob{1/6,2/3,1/6}`; over the default seed and the 79 x 1536
/// matrix of `vectorFromText("", 1536)` the buckets fall 20331 / 80699 / 20314 of 121344.
#[test]
fn achlioptas_buckets_follow_the_recorded_probabilities() {
    let (mut plus, mut zero, mut minus) = (0u32, 0u32, 0u32);
    for row in 0..79 {
        for col in 0..1536 {
            let w = achlioptas_weight("hyperbehcs-local-jl", row, col);
            if w.gt(Number::ZERO) {
                plus += 1;
            } else if w.lt(Number::ZERO) {
                minus += 1;
            } else {
                zero += 1;
            }
        }
    }
    assert_eq!((plus, zero, minus), (20331, 80699, 20314));
    // Each count within 1/100 of its recorded share: |6 * plus - total| * 100 < total, the same for
    // minus, and |3 * zero - 2 * total| * 100 < 2 * total.
    let total = 79 * 1536;
    assert!((plus * 6).abs_diff(total) * 100 < total);
    assert!((minus * 6).abs_diff(total) * 100 < total);
    assert!((zero * 3).abs_diff(total * 2) * 100 < total * 2);
}

fn strings(values: &[Number]) -> Vec<String> {
    values.iter().map(|&v| number_to_string(v)).collect()
}

/// The recorded shard-0000 receipt of the owner's 10,000-room rotor:
/// what-is-asolaria---how-do-we-get-reductions-in-everything @ 29307bf
/// `cubes/sample-shard-quant-cube.annotated.json` (blob 34af1934), lines 11-45; not vendored (a
/// JSON file); the CI step checks every value quoted here against those lines. The input is the rotor's `quantReceiptForShard` vector for shard-0000
/// (Asolaria-hermes-work @ 84f0b20 `room-rotor/hyperbehcs-d-drive-10000-room-rotor.mjs:281-304`),
/// derived in `quants/cubes` (README.md:36-40, tests/fixtures/shard-vectors.hbp:2); the rotor passes
/// `targetDimension: 4` and the seed of line 13 and no `bits`, so core:94 uses 8 (the recorded
/// `bits: 8`). Dimensions (lines 11-12), projection (18), turbo codes and metadata (25-26), polar
/// codes and metadata (32-33) and triple codes (39) are reproduced. The receipt's fingerprints (20,
/// 27, 34, 45) hash packets of another shape (`zeroPoint`, `radiusBits`/`angleBits`, lane objects)
/// built by `src/behcs/hyperbehcsQuantSubstrate.js` (rotor:13-16), which no repository holds, so
/// they are not compared; the core packets' own fingerprints are the ones Node gives.
#[test]
fn recorded_shard_0000_receipt() {
    let v: Vec<Number> = [100u64, 9, 9, 8, 8, 8, 0, 4950]
        .iter()
        .map(|&x| Number::from_u64(x))
        .collect();
    let opts = Options {
        seed: Some("HYP-D-10000-ROOM-ROTOR:shard-0000"),
        target_dimension: Some(Number::from_u64(4)),
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
        strings(&[m.bits, m.max_radius, m.radius_scale, m.angle_scale_radians]),
        ["8", "4950", "19.411764705882", "0.024639942381"]
    );

    let triple = triple_quant(&v, &opts);
    let codes: Vec<Vec<String>> = triple.codes.iter().map(|c| strings(c)).collect();
    assert_eq!(
        codes,
        [["5", "120", "4"], ["1", "78", "32"], ["255", "128", "64"]]
    );

    // Measured: Node v22.22.0 on the vendored core gives these same four fingerprints.
    assert_eq!(jl.fingerprint, "7537cbc978efdf3d");
    assert_eq!(turbo.fingerprint, "d00ff9cd55610664");
    assert_eq!(polar.fingerprint, "2924d8a9cfab3c1d");
    assert_eq!(triple.fingerprint, "41b742e1c3318458");
}
