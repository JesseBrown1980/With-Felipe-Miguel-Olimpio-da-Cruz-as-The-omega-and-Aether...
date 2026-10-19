//! Q-PRISM Host8 selector alignment for Graphify V3 / HyperBEHCS 60D.
//!
//! This file is deliberately standalone Rust: no Node, no JSON, no serde.
//! It models the kernel/on-metal contract Q-PRISM should hand to Asolaria OS:
//! a cube chunk is represented by 8-byte handles plus HBP/HBI tuple rows, and
//! only maps/searches by graphify selector axes until an operator-gated executor
//! explicitly fires a separate AgentTerms/FEDENV envelope.

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub struct Host8(pub [u8; 8]);

impl Host8 {
    pub const ZERO: Host8 = Host8([0; 8]);

    pub fn from_sha256_prefix(hex64: &str) -> Result<Self, &'static str> {
        if hex64.len() < 16 {
            return Err("sha256 hex prefix must have at least 16 chars");
        }
        let bytes = hex64.as_bytes();
        let mut out = [0u8; 8];
        let mut i = 0;
        while i < 8 {
            out[i] = (hex_nibble(bytes[i * 2])? << 4) | hex_nibble(bytes[i * 2 + 1])?;
            i += 1;
        }
        Ok(Host8(out))
    }

    pub fn to_hex16(self) -> [u8; 16] {
        const HEX: &[u8; 16] = b"0123456789abcdef";
        let mut out = [0u8; 16];
        let mut i = 0;
        while i < 8 {
            out[i * 2] = HEX[(self.0[i] >> 4) as usize];
            out[i * 2 + 1] = HEX[(self.0[i] & 0x0f) as usize];
            i += 1;
        }
        out
    }
}

fn hex_nibble(b: u8) -> Result<u8, &'static str> {
    match b {
        b'0'..=b'9' => Ok(b - b'0'),
        b'a'..=b'f' => Ok(b - b'a' + 10),
        b'A'..=b'F' => Ok(b - b'A' + 10),
        _ => Err("non-hex character"),
    }
}

pub const GRAPHIFY_SCHEMA: &str = "ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D";
pub const GRAPHIFY_FRAME: &str = "60D_PLUS_HYPERBEHCS";
pub const SELECTOR_CONSTRAINT: &str = "selector_constraint:hyperbehcs-selector-router-60d";

pub const SELECTOR_AXES: [&str; 11] = [
    "selector_axis:d-axis-tuples",
    "selector_axis:glyph-family",
    "selector_axis:executor-program",
    "selector_axis:pipe-type",
    "selector_axis:operation-class",
    "selector_axis:route-cylinder-room",
    "selector_axis:proof-tier",
    "selector_axis:runtime-mode",
    "selector_axis:colony-vantage",
    "selector_axis:slice-time",
    "selector_axis:binary-hash-hex-crypto",
];

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QPrismCubeSelector {
    pub source: Host8,
    pub tuple: Host8,
    pub node: Host8,
    pub raw_in_repo: bool,
    pub agentterms_fedenv_fire: bool,
}

impl QPrismCubeSelector {
    pub fn new(source_sha256: &str, tuple_sha256: &str) -> Result<Self, &'static str> {
        let source = Host8::from_sha256_prefix(source_sha256)?;
        let tuple = Host8::from_sha256_prefix(tuple_sha256)?;
        let node = fold_host8(source, tuple);
        Ok(Self { source, tuple, node, raw_in_repo: false, agentterms_fedenv_fire: false })
    }

    pub fn graphify_axis_count(&self) -> usize { SELECTOR_AXES.len() }

    pub fn execution_allowed(&self) -> bool { self.agentterms_fedenv_fire }
}

pub fn fold_host8(a: Host8, b: Host8) -> Host8 {
    let mut out = [0u8; 8];
    let mut i = 0;
    while i < 8 {
        out[i] = a.0[i].rotate_left((i as u32) & 7) ^ b.0[7 - i].rotate_right(((7 - i) as u32) & 7);
        i += 1;
    }
    Host8(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn host8_uses_first_eight_sha_bytes() {
        let h = Host8::from_sha256_prefix("7be9d49b3af31036ccce106658588309d8fb808aaf546cbf7c92baaa1cd3767d").unwrap();
        assert_eq!(core::str::from_utf8(&h.to_hex16()).unwrap(), "7be9d49b3af31036");
    }

    #[test]
    fn qprism_selector_preserves_graphify_axes_and_never_fires() {
        let sel = QPrismCubeSelector::new(
            "c3a7710000000000000000000000000000000000000000000000000000000000",
            "7be9d49b3af31036ccce106658588309d8fb808aaf546cbf7c92baaa1cd3767d",
        ).unwrap();
        assert_eq!(GRAPHIFY_SCHEMA, "ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D");
        assert_eq!(GRAPHIFY_FRAME, "60D_PLUS_HYPERBEHCS");
        assert_eq!(sel.graphify_axis_count(), 11);
        assert!(!sel.raw_in_repo);
        assert!(!sel.execution_allowed());
    }
}
