//! Quants 22-24 as the vendored registry (Algorithms-of-Asolaria@d399d130, lines 28-30) states
//! them, and the vendored crates that the registry names as their owners.
#![forbid(unsafe_code)]

const REGISTRY: &str = include_str!(
    "../../vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp"
);
const DBBH_MANIFEST: &str = include_str!("../../dbbh-coms-quant-prism/Cargo.toml");
const PATH2_MANIFEST: &str = include_str!("../../path2-two-shadow-recovery/Cargo.toml");

fn quant_row(n: u32) -> &'static str {
    let prefix = format!("QUANT|n={n}|");
    let rows: Vec<&str> = REGISTRY
        .lines()
        .filter(|l| l.starts_with(&prefix))
        .collect();
    assert_eq!(rows.len(), 1, "exactly one row for quant {n}");
    rows[0]
}

#[test]
fn registry_rows_22_to_24_are_the_vendored_lines() {
    let lines: Vec<&str> = REGISTRY.lines().collect();
    assert_eq!(lines.len(), 43);
    assert_eq!(lines[27], quant_row(22));
    assert_eq!(lines[28], quant_row(23));
    assert_eq!(lines[29], quant_row(24));
    assert_eq!(
        quant_row(22),
        "QUANT|n=22|id=Q-PATH1-CONTENT-ADDRESS-v1|alias=Path-1|regime=REFERENTIAL_LOOKUP|owner=dbbh-coms-quant-prism|json=0"
    );
    assert_eq!(
        quant_row(23),
        "QUANT|n=23|id=Q-PATH2-CRT-MULTICYLINDER-v1|alias=Path-2|regime=JOINTLY_INJECTIVE_RECOVERY|owner=path2-two-shadow-recovery|json=0"
    );
    assert_eq!(
        quant_row(24),
        "QUANT|n=24|id=Q-PIE-SHELL-CYLINDER-v1|alias=pixel+shell+cylinder-projection|regime=LOSSY_NUMERIC_SKETCH+JOINTLY_INJECTIVE_RECOVERY|owner=path2-two-shadow-recovery|json=0"
    );
}

#[test]
fn registry_owners_are_the_vendored_packages() {
    for (n, manifest) in [
        (22, DBBH_MANIFEST),
        (23, PATH2_MANIFEST),
        (24, PATH2_MANIFEST),
    ] {
        let owner = quant_row(n)
            .split('|')
            .find_map(|f| f.strip_prefix("owner="))
            .expect("owner field");
        assert!(
            manifest.contains(&format!("name = \"{owner}\"")),
            "quant {n}: owner {owner} is the vendored package"
        );
    }
}

#[test]
fn regimes_of_22_to_24_are_declared_in_the_registry() {
    for (regime, law) in [
        (
            "REFERENTIAL_LOOKUP",
            "retained-body+authoritative-digest-part-of-cost",
        ),
        (
            "JOINTLY_INJECTIVE_RECOVERY",
            "joint-capacity-ge-source-roof+consistency-pass",
        ),
        (
            "LOSSY_NUMERIC_SKETCH",
            "fidelity-contract-required+not-exact-identity",
        ),
    ] {
        let row = format!("REGIME|id={regime}|law={law}|json=0");
        assert!(REGISTRY.lines().any(|l| l == row), "{row}");
    }
}
