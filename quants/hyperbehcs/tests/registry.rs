//! The slot table in src/lib.rs equals rows n=9..12 of the vendored combined-quant registry, and
//! the packets this crate produces carry the algorithm names the vendored upstream file writes.

use quant_hyperbehcs::{OWNER, SLOTS};

const REGISTRY: &str = include_str!(
    "../vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp"
);
const CORE: &str = include_str!(
    "../vendor/Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs"
);

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .find_map(|part| part.strip_prefix(key).and_then(|v| v.strip_prefix('=')))
        .unwrap_or_else(|| panic!("no {key} in {row}"))
}

#[test]
fn slots_equal_registry_rows_9_to_12() {
    let rows: Vec<&str> = REGISTRY
        .lines()
        .filter(|l| l.starts_with("QUANT|"))
        .filter(|l| l.contains(OWNER))
        .collect();
    assert_eq!(rows.len(), SLOTS.len());
    for (row, slot) in rows.iter().zip(SLOTS.iter()) {
        assert_eq!(field(row, "n"), slot.n.to_string());
        assert_eq!(field(row, "id"), slot.id);
        assert_eq!(field(row, "alias"), slot.alias);
        assert_eq!(field(row, "owner"), OWNER);
        assert_eq!(field(row, "regime"), "LOSSY_NUMERIC_SKETCH");
    }
}

#[test]
fn algorithm_names_are_the_upstream_strings() {
    for slot in SLOTS {
        let literal = format!("algorithm: \"{}\",", slot.algorithm);
        assert!(
            CORE.contains(&literal),
            "{literal} not in hyperbehcs-core.cjs"
        );
    }
}
