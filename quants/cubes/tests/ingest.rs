//! Slot 25: the ingest port against the referee (`ingest-vectors.hbp`) and against the owner's 12
//! recorded ingest receipts (`ingest-receipts.hbp`, rows 2-7 of each upstream receipt; the
//! referee recomputed every upstream footer over the full receipt).

mod common;

use common::{fixture, get, root, unhex};
use quant_cubes::ingest::{
    assemble, catalog_entry, ingest, reduction_ratios, tokens, BOUNDARY_ROW, LINEAGE_ROW,
};

const TEST_HDR: &str = "INGESTHDR|proof=GOOGLE-DRIVE-TO-CUBE-INGEST|form=hbp-tuple|json=0";

#[test]
fn rows_equal_the_referee_on_owner_files_and_edge_inputs() {
    let lines = fixture("ingest-vectors.hbp");
    let mut cases = 0;
    let mut i = 1;
    while i < lines.len() {
        let case = &lines[i];
        let input = match common::field(case, "file") {
            Some(path) => std::fs::read(root().join(path)).expect(path),
            None => unhex(get(case, "hex")),
        };
        let got = ingest(&input).rows();
        let want = &lines[i + 1..i + 7];
        assert_eq!(&got[..], want, "{case}");
        let mut all = vec![TEST_HDR.to_string()];
        all.extend(got.iter().cloned());
        let out = assemble(&all).expect("self-check");
        assert_eq!(out.lines().last().unwrap(), lines[i + 7], "{case}");
        cases += 1;
        i += 8;
    }
    assert_eq!(cases, 43);
}

#[test]
fn token_class_and_case_mapping() {
    assert_eq!(
        tokens("The x9 a1 _x -y --z 9abc abc-def_ghi a"),
        ["the", "x9", "a1", "abc", "abc-def_ghi"]
    );
    // U+0130 lowercases to "i" + U+0307 and U+212A to "k" in both Rust and JavaScript.
    assert_eq!(tokens("\u{130}x \u{212a}elvin"), ["kelvin"]);
}

#[test]
fn self_check_rejects_rows_as_line_50_does() {
    let rows = [
        TEST_HDR.to_string(),
        "INGESTSLICE|x={1}|json=0".to_string(),
        "NOJSON|x=1".to_string(),
    ];
    assert_eq!(
        assemble(&rows).unwrap_err(),
        ["INGESTSLICE|x={1}|json=0", "NOJSON|x=1"]
    );
}

/// The 12 receipts in reductions `cubes/` (11 drive-ingest + 1 paper): content address, ratios
/// and every catalog glyph recompute; `quant8` needs the source text, which is not published.
#[test]
fn recorded_receipts() {
    let lines = fixture("ingest-receipts.hbp");
    let mut seen = 0;
    let mut proven_rows = Vec::new();
    let mut cycle_rows = Vec::new();
    for (k, head) in lines.iter().enumerate() {
        if !head.starts_with("RECEIPT|") {
            continue;
        }
        seen += 1;
        assert_eq!(get(head, "footer_recomputed"), "match", "{head}");
        let r = &lines[k + 1..k + 7];
        let (slice, cube, reduction, catalog) = (&r[0], &r[1], &r[2], &r[3]);
        let handle8 = get(slice, "sha256_16");
        assert_eq!(get(cube, "host_handle8"), handle8);
        assert_eq!(&get(cube, "cube10")[..16], handle8);
        assert_eq!(get(cube, "cube10").len(), 20);
        let quant8: Vec<u32> = get(cube, "quant8")
            .split(',')
            .map(|q| q.parse().unwrap())
            .collect();
        assert_eq!(quant8.len(), 8);
        assert!(quant8.iter().all(|&q| q <= 255));
        let raw: u64 = get(reduction, "raw_bytes").parse().unwrap();
        assert_eq!(get(slice, "raw_bytes"), raw.to_string());
        let (to_handle, to_cube) = reduction_ratios(raw);
        assert_eq!(get(reduction, "raw->handle"), format!("{to_handle}x"));
        assert_eq!(get(reduction, "raw->cube"), format!("{to_cube}x"));
        assert_eq!(
            get(catalog, "distinct_terms"),
            get(slice, "distinct_content_terms")
        );
        let top: Vec<&str> = get(catalog, "sample_top10").split(' ').collect();
        assert_eq!(top.len(), 10);
        for entry in top {
            let mut it = entry.split(':');
            let (w, n) = (it.next().unwrap(), it.next().unwrap().parse().unwrap());
            assert_eq!(catalog_entry(w, n), entry);
        }
        assert_eq!(r[4], LINEAGE_ROW);
        if get(head, "verdict") == "INGEST-NOT-INTEGRATE-PROVEN-on-1-real-drive-doc" {
            proven_rows.push(get(head, "file").to_string());
            assert_eq!(r[5], BOUNDARY_ROW);
        } else {
            // The eight CLOUD-CYCLE-002 receipts carry a BOUNDARY row and a footer verdict that
            // differ from the constants of lines 46 and 48 of the vendored file; the code that
            // wrote these two rows is not in the repository.
            assert_eq!(get(head, "verdict"), "INGEST-NOT-INTEGRATE");
            assert_eq!(r[5], "INGESTBOUNDARY|raw_content_published=0|provider_calls=0|device_mutation=local-receipt-only|cycle=CLOUD-CYCLE-002|json=0");
            cycle_rows.push(get(head, "file").to_string());
        }
    }
    assert_eq!(seen, 12);
    assert_eq!(
        proven_rows,
        [
            "cubes/drive-ingest-source-01.hbp",
            "cubes/drive-ingest-source-02.hbp",
            "cubes/drive-ingest-source-03.hbp",
            "cubes/manifold-steering-2605.05115.hbp"
        ]
    );
    assert_eq!(cycle_rows.len(), 8);
}

/// reductions `cubes/cloud-cycle-002-receipt.hbp` lines 3-10: the eight cycle-2 ingests' ratios,
/// each naming its cube receipt.
#[test]
fn cycle_two_ratios() {
    let lines = fixture("ingest-receipts.hbp");
    let at = lines.iter().position(|r| r.starts_with("CYCLE2|")).unwrap();
    let rows = &lines[at + 1..];
    assert_eq!(rows.len(), 8);
    for r in rows {
        let raw: u64 = get(r, "raw_bytes").parse().unwrap();
        let (to_handle, to_cube) = reduction_ratios(raw);
        assert_eq!(get(r, "raw->handle"), format!("{to_handle}x"), "{r}");
        assert_eq!(get(r, "raw->cube"), format!("{to_cube}x"), "{r}");
        let cube = get(r, "cube");
        let head = lines
            .iter()
            .position(|h| h.starts_with("RECEIPT|") && get(h, "file") == cube)
            .unwrap();
        assert_eq!(get(&lines[head], "verdict"), "INGEST-NOT-INTEGRATE");
        assert_eq!(get(&lines[head + 1], "raw_bytes"), raw.to_string());
    }
}
