//! The owner's own slot and status rows that README.md quotes, checked line by line against the
//! vendored Algorithms-of-Asolaria @ d399d13 files, so the quotes cannot drift from the source.

const REGISTRY: &str = include_str!(
    "../vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp"
);
const LATTICE: &str =
    include_str!("../vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-LATTICE-2026-07-13.hbp");

fn line(text: &str, number: usize) -> &str {
    text.lines().nth(number - 1).expect("line exists")
}

#[test]
fn registry_slots_13_to_20_and_the_translate_row() {
    let expected = [
        (19, "QUANT|n=13|id=R-BINARY-BYTES-v1|alias=binary|regime=EXACT_REPRESENTATION|owner=qprism-3d-slice-harness|json=0"),
        (20, "QUANT|n=14|id=R-HEX-v1|alias=hex|regime=EXACT_REPRESENTATION|owner=qprism-3d-slice-harness|json=0"),
        (21, "QUANT|n=15|id=R-HBP-v1|alias=HBP|regime=EXACT_REPRESENTATION|owner=asolaria-hbi-hbp|json=0"),
        (22, "QUANT|n=16|id=R-HBI-v1|alias=HBI|regime=REFERENTIAL_LOOKUP|owner=asolaria-hbi-hbp|json=0"),
        (23, "QUANT|n=17|id=R-BEHCS64-v1|alias=BEHCS-64|regime=EXACT_REPRESENTATION|owner=dbbh-coms-quant-prism|json=0"),
        (24, "QUANT|n=18|id=R-BEHCS256-v1|alias=BEHCS-256|regime=EXACT_REPRESENTATION|owner=dbbh-coms-quant-prism+asolaria-behcs-256|json=0"),
        (25, "QUANT|n=19|id=R-BEHCS1024-v1|alias=BEHCS-1024|regime=EXACT_REPRESENTATION|owner=dbbh-coms-quant-prism+Q-PRISM|json=0"),
        (26, "QUANT|n=20|id=R-HYPERBEHCS60D-v1|alias=HyperBEHCS-60D|regime=EXACT_REPRESENTATION+REFERENTIAL_LOOKUP|owner=HYPER-BECHS--the-third-set+Q-PRISM|json=0"),
        (35, "TRANSLATE|formula=T_i_j=E_j_after_D_i|inverse=T_j_i_after_T_i_j=id|compose=T_j_k_after_T_i_j=T_i_k|measured=BEHCS256-to-1024|other_43plus_rungs=CANON_UNTIL_RECEIPTED|json=0"),
    ];
    for (number, row) in expected {
        assert_eq!(line(REGISTRY, number), row, "registry line {number}");
    }
}

#[test]
fn lattice_status_rows() {
    let expected = [
        (3, "QLAW|id=LEVEL-GROUPOID|species=exact-translator|status=CANON+one-rung-MEASURED|inverse=T_m_l_o_T_l_m_eq_id|path=T_m_n_o_T_l_m_eq_T_l_n|entropy=H_TZ_eq_H_Z|json=0"),
        (30, "QREG|id=R-BINARY-BYTE-v1|species=exact-representation|status=MEASURED_REPO|bits_per_symbol=8|json=0"),
        (31, "QREG|id=R-HEX-v1|species=exact-representation|status=MEASURED_REPO|inverse=hex-decode|storage_expansion=2x-text|json=0"),
        (34, "QREG|id=R-BEHCS64-v1|species=exact-representation|status=MEASURED_REPO-in-rust-crates|inverse=framed-roundtrip|json=0"),
        (35, "QREG|id=R-BEHCS256-v1|species=exact-representation|status=MEASURED_REPO|bits_per_symbol=8|json=0"),
        (36, "QREG|id=R-BEHCS1024-v1|species=exact-representation|status=MEASURED_REPO+MEASURED_SEAT|bits_per_symbol=10|reference=5bytes-to-4glyphs|rate=1.0|json=0"),
        (37, "QREG|id=R-HYPERBEHCS60D-v1|species=tuple-address-substrate|status=CANON+component-measured|tuple_dim=60|alphabet=1024|capacity=1024^60|capacity_not_materialization=1|json=0"),
        (38, "QREG|id=R-PRISM-COMB-GROUPOID-v1|species=exact-level-translation|status=CANON+one-rung-MEASURED|forward=comb|backward=prism|all_pairs_measured=0|json=0"),
        (67, "QRECEIPT|id=E8-E9-FOUR-TEST-v1|status=MEASURED_SEAT-RECEIPT-PRESENT|sha256=86d4dc4a07228c39d898afdad5c8e61ab2e2ecc19b5a59effb79f85f1e37c358|tests=E8-rebase+E9-rebase+codec-v0-held+codec-v0.1-restore|json=0"),
    ];
    for (number, row) in expected {
        assert_eq!(line(LATTICE, number), row, "lattice line {number}");
    }
}
