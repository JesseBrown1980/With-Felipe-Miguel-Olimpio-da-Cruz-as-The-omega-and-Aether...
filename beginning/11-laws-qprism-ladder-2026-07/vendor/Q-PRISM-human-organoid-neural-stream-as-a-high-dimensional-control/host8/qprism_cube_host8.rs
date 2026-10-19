//! Q-PRISM Host-8 cube contract (acer) — kernel-native, json=0, no Node, no serde/JSON.
//!
//! The canonical cube/selector contract lives here in Rust (the on-metal Host-8 lane); the
//! Python `qprism/cube_absorb.py` is only the sim/harness reference. Bilateral-converged with
//! liris `host8/qprism_graphify_selector.rs`:
//!
//!   node  handle8 = FNV-1a-64(node_id)              -> graphify NODE PK, byte-identical to
//!                                                       tools/graphify/graphify.py `handle8`
//!   source8 / tuple8 = sha256(hex)[..8 bytes]        -> content/provenance handles (from liris)
//!   selector = ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D, 11 `selector_axis:*` + selector_constraint
//!
//! Representation-only: the address DESCRIBES behavior, never executes it. compile=0 interpret=0
//! fire=0; agentterms_fedenv_fire=0, dispatch=0. Executing the quant ON the metal kernel is the
//! operator-gated migration — NOT done here. E=0. Raw M/EEG stays on D:, sha-referenced.
//!
//! Build/test on Linux (per the real-WSL law):
//!   rustc --test host8/qprism_cube_host8.rs -o /tmp/qc && /tmp/qc
#![allow(dead_code)]

/// An 8-byte Host-8 handle.
pub struct Host8(pub [u8; 8]);

impl Host8 {
    pub fn to_hex(&self) -> String {
        self.0.iter().map(|b| format!("{:02x}", b)).collect()
    }

    /// FNV-1a 64-bit — the graphify Host-8 node primary key (byte-identical to graphify.py).
    pub fn fnv1a64(s: &str) -> Host8 {
        let mut h: u64 = 0xcbf29ce484222325;
        for &b in s.as_bytes() {
            h ^= b as u64;
            h = h.wrapping_mul(0x100000001b3);
        }
        Host8(h.to_be_bytes())
    }

    /// Content handle from a sha256 hex prefix (>= 16 hex chars) — liris `from_sha256_prefix`.
    pub fn from_sha256_prefix(hex: &str) -> Result<Host8, &'static str> {
        if hex.len() < 16 {
            return Err("sha256 hex prefix must have at least 16 chars");
        }
        let mut out = [0u8; 8];
        for i in 0..8 {
            out[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).map_err(|_| "bad hex")?;
        }
        Ok(Host8(out))
    }
}

pub const GRAPHIFY_SCHEMA: &str = "ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D";
pub const SELECTOR_CONSTRAINT: &str = "selector_constraint:hyperbehcs-selector-router-60d";
pub const SELECTOR_AXES: [&str; 11] = [
    "d-axis-tuples", "glyph-family", "executor-program", "pipe-type", "operation-class",
    "route-cylinder-room", "proof-tier", "runtime-mode", "colony-vantage", "slice-time",
    "binary-hash-hex-crypto",
];

/// Gated CARET active-glyph law — active symbolic geometry, representation-only.
/// The address DESCRIBES behavior; it never executes without the operator-gated kernel.
pub fn active_glyph_law(node8: &str) -> String {
    format!(
        "QPRISMACTIVEGLYPH|handle8={}|geometry=graphify60d|behavior=represent_address|compile=0|interpret=0|fire=0|json=0",
        node8
    )
}

/// A cube node's identity + provenance handles.
pub struct CubeHandles {
    pub node8: String,   // FNV-1a-64(node_id)
    pub source8: String, // sha256(source)[..8]
    pub tuple8: String,  // sha256(tuple)[..8]
    pub glyph: String,
}

impl CubeHandles {
    /// Canonical graphify node id (converged with liris): `qprism_cube:{tuple8}` — the cube is
    /// content-addressed by its quant tuple, so both colonies emit the SAME node PK for a tuple.
    pub fn graphify_node_id(tuple8: &str) -> String {
        format!("qprism_cube:{}", tuple8)
    }

    pub fn new(source_sha256: &str, tuple_sha256: &str, glyph: &str) -> Result<Self, &'static str> {
        let tuple8 = Host8::from_sha256_prefix(tuple_sha256)?.to_hex();
        let node_id = CubeHandles::graphify_node_id(&tuple8);
        Ok(CubeHandles {
            node8: Host8::fnv1a64(&node_id).to_hex(),
            source8: Host8::from_sha256_prefix(source_sha256)?.to_hex(),
            tuple8,
            glyph: glyph.to_string(),
        })
    }
}

/// acer-vantage value for a graphify-V3 selector axis.
fn axis_value(axis: &str, h: &CubeHandles, room: &str, slice_time: &str) -> String {
    match axis {
        "d-axis-tuples" => "D22_TRANSLATION+D48_HYPERGLYPH_ATLAS+D49_EXECUTION_PROOF_SUPERGRAPH+60D_SELECTOR_FRAME".into(),
        "glyph-family" => format!("BEHCS_1024+HG1024_QPRISM_{}+HBP_HBI_TUPLE_TEXT", h.glyph),
        "executor-program" => "NONE_REPRESENTATION_ONLY_AGENTTERMS_FEDENV_NOT_FIRED".into(),
        "pipe-type" => "DERIVED_FEATURE_CUBE+QUANT8_3200_BYTE_TUPLE+HBP_HBI_TUPLE_TEXT".into(),
        "operation-class" => "REPRESENT_ADDRESS_DERIVE_DIGEST".into(),
        "route-cylinder-room" => room.into(),
        "proof-tier" => "MEASURED_LOCAL_DERIVED+RAW_IN_REPO_0+DISPATCH_OPERATOR_GATED".into(),
        "runtime-mode" => "COLD_DERIVED_READ_REPRESENTATION_MAP_FIRE_0".into(),
        "colony-vantage" => "ACER+OP_JESSE_PID+FABRIC_4944".into(),
        "slice-time" => slice_time.into(),
        "binary-hash-hex-crypto" => format!("source8:{}+tuple8:{}+node8:{}+sha256_reference", h.source8, h.tuple8, h.node8),
        _ => "UNKNOWN_AXIS".into(),
    }
}

/// Emit the bilateral-converged json=0 kernel-native cube row (the primary carrier). No JSON.
pub fn cube_row(h: &CubeHandles, room: &str, slice_time: &str, tuple_bytes: usize) -> String {
    let mut s = String::from("QPRISMCUBE");
    s.push_str(&format!("|schema=qprism.host8.graphify_selector.v1|graphify_schema={}", GRAPHIFY_SCHEMA));
    s.push_str(&format!("|handle8={}|source8={}|tuple8={}|glyph={}", h.node8, h.source8, h.tuple8, h.glyph));
    s.push_str(&format!("|tuple_bytes={}", tuple_bytes));
    s.push_str("|node_runtime=kernel_contract_not_spawned|nodejs=0|json_object=0");
    // Jesse's pixels-first: the backend cube IS the representation; the frontend is only a raw
    // projection (pixels) of it — inert, no logic. machine hot path = tuple-text; JSON = cold.
    s.push_str("|hot_path=HBP_HBI_TUPLE_TEXT|pixels_first=1|frontend=raw_projection_inert");
    s.push_str("|agentterms_fedenv_fire=0|dispatch=0|provider_fanout=0|hardware_fire=0");
    s.push_str("|compile=0|interpret=0|fire=0");
    s.push_str(&format!("|{}|axis_count={}", SELECTOR_CONSTRAINT, SELECTOR_AXES.len()));
    for a in SELECTOR_AXES.iter() {
        s.push_str(&format!("|selector_axis:{}={}", a, axis_value(a, h, room, slice_time)));
    }
    s.push_str("|raw_in_repo=0|derived_only=1|json=0");
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fnv1a64_matches_graphify() {
        // FNV-1a-64 of empty string == the offset basis
        assert_eq!(Host8::fnv1a64("").to_hex(), "cbf29ce484222325");
        // deterministic 16-hex node PK
        let h = Host8::fnv1a64("qprism/cube/x").to_hex();
        assert_eq!(h.len(), 16);
        assert!(h.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn content_handles_are_sha256_prefixes() {
        let s = "a".repeat(64);
        assert_eq!(Host8::from_sha256_prefix(&s).unwrap().to_hex(), "a".repeat(16));
        assert!(Host8::from_sha256_prefix("tooShort").is_err());
    }

    #[test]
    fn row_is_json0_and_gated() {
        let h = CubeHandles::new(
            "0ebf9ac4c41cb33d5d1acb071f4e06c8314e83d38088ec1357f36fb786b226b2",
            "7be9d49b3af31036ccce106658588309d8fb808aaf546cbf7c92baaa1cd3767d",
            "gly-stcI",
        ).unwrap();
        // bilateral parity target: tuple8=7be9d49b3af31036 -> node PK 5edd3a45544437d4
        assert_eq!(h.tuple8, "7be9d49b3af31036");
        assert_eq!(h.node8, "5edd3a45544437d4");
        let row = cube_row(&h, "qprism/SpanishBCBL/stage2/cube-absorption/acer", "2026_07_01_STAGE2", 3200);
        assert!(row.starts_with("QPRISMCUBE|") && row.ends_with("|json=0"));
        assert!(!row.contains('{') && !row.contains('}') && !row.contains('"')); // no JSON
        assert!(row.contains(&format!("handle8={}", h.node8)));
        assert!(row.contains(&format!("source8={}", h.source8)));
        assert!(row.contains(&format!("tuple8={}", h.tuple8)));
        assert!(row.contains("graphify_schema=ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D"));
        assert!(row.contains("axis_count=11"));
        for a in SELECTOR_AXES.iter() {
            assert!(row.contains(&format!("selector_axis:{}=", a)));
        }
        for g in ["compile=0", "interpret=0", "fire=0", "agentterms_fedenv_fire=0", "dispatch=0", "nodejs=0"] {
            assert!(row.contains(g), "missing gate {g}");
        }
        assert_eq!(SELECTOR_AXES.len(), 11);
    }

    #[test]
    fn active_glyph_law_is_gated() {
        let law = active_glyph_law("3738d5104cd644cd");
        assert!(law.contains("behavior=represent_address"));
        for g in ["compile=0", "interpret=0", "fire=0"] {
            assert!(law.contains(g));
        }
        assert!(law.ends_with("|json=0"));
    }
}
