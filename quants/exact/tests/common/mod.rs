//! Fixture reading shared by the integration tests: `tests/fixtures/exact-lanes.hbp`, written by
//! `tools/referee.py`. Rows are `TAG|key=value|...|json=0`; no value carries `|`.
#![allow(dead_code)]

pub const FIXTURE: &str = include_str!("../fixtures/exact-lanes.hbp");

pub struct Row {
    pub tag: String,
    fields: Vec<(String, String)>,
}

impl Row {
    pub fn get(&self, key: &str) -> &str {
        self.fields
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
            .unwrap_or_else(|| panic!("{} row has no {key}", self.tag))
    }
}

pub fn rows() -> Vec<Row> {
    FIXTURE
        .lines()
        .map(|line| {
            let mut parts = line.split('|');
            let tag = parts.next().expect("tag").to_string();
            let fields = parts
                .map(|p| {
                    let (k, v) = p.split_once('=').expect("key=value");
                    (k.to_string(), v.to_string())
                })
                .collect::<Vec<_>>();
            assert_eq!(
                fields.last().map(|(k, v)| (k.as_str(), v.as_str())),
                Some(("json", "0"))
            );
            Row { tag, fields }
        })
        .collect()
}

/// The owner test inputs, regenerated from the `gen=` field exactly as `tools/referee.py` does.
pub fn generate(gen: &str) -> Vec<u8> {
    let (kind, arg) = gen.split_once(':').expect("gen kind");
    match kind {
        "hex" => unhex(arg),
        "fill" => {
            let (b, n) = arg.split_once(':').expect("fill byte:count");
            vec![u8::from_str_radix(b, 16).expect("fill byte"); n.parse().expect("fill count")]
        }
        _ => {
            let n: u32 = arg.parse().expect("length");
            match kind {
                // dbbh-coms-quant-prism tests/integration.rs:23
                "affine31x7" => (0..n).map(|i| ((i * 31 + 7) & 0xFF) as u8).collect(),
                // Q-PRISM host8/qprism_cube_host8.rs:268
                "knuth13" => (0..n)
                    .map(|i| ((i.wrapping_mul(2654435761)) >> 13) as u8)
                    .collect(),
                // Q-PRISM host8/dbbh_coms_quant_prism.rs:521-523
                "knuth11x17" => (0..n)
                    .map(|i| ((i.wrapping_mul(2_654_435_761) >> 11) ^ (i * 17)) as u8)
                    .collect(),
                _ => panic!("unknown generator {gen}"),
            }
        }
    }
}

pub fn unhex(s: &str) -> Vec<u8> {
    assert_eq!(s.len() % 2, 0);
    (0..s.len() / 2)
        .map(|i| u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).expect("hex digit"))
        .collect()
}

pub fn sha256_hex(data: &[u8]) -> String {
    quant_exact::dbbh::sha256_hex(data)
}

/// sha256 of a symbol stream written as big-endian u16 pairs (the referee's `be16`).
pub fn stream_sha(symbols: &[u16]) -> String {
    let bytes: Vec<u8> = symbols.iter().flat_map(|s| s.to_be_bytes()).collect();
    sha256_hex(&bytes)
}

pub fn head(symbols: &[u16]) -> String {
    symbols
        .iter()
        .take(4)
        .map(|s| s.to_string())
        .collect::<Vec<_>>()
        .join(".")
}

/// Every `IN` row as (id, regenerated input), after checking its length and sha256.
pub fn inputs() -> Vec<(String, Vec<u8>)> {
    rows()
        .iter()
        .filter(|r| r.tag == "IN")
        .map(|r| {
            let data = generate(r.get("gen"));
            assert_eq!(data.len().to_string(), r.get("len"), "{}", r.get("id"));
            assert_eq!(sha256_hex(&data), r.get("sha256"), "{}", r.get("id"));
            (r.get("id").to_string(), data)
        })
        .collect()
}
