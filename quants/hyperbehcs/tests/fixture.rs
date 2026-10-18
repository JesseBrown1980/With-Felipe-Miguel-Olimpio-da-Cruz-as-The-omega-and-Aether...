//! Every row of tests/fixtures/hyperbehcs-quants.hbp (written by tools/referee.py, which mirrors
//! hyperbehcs-core.cjs line by line) reproduced by the Rust port: inputs, codes, metadata bit
//! patterns, projections, reconstructions, fingerprints and the sha256 of each fingerprint's
//! preimage text.

use quant_hyperbehcs::{
    johnson_lindenstrauss, number_to_string, polar_quant, reconstruct_triple, sha256_hex,
    triple_quant, turbo_quant, vector_from_text, Number, Options, TriplePacket,
};
use std::collections::HashMap;

const FIXTURE: &str = include_str!("fixtures/hyperbehcs-quants.hbp");

struct Row<'a> {
    tag: &'a str,
    fields: HashMap<&'a str, &'a str>,
}

impl<'a> Row<'a> {
    fn parse(line: &'a str) -> Row<'a> {
        let mut parts = line.split('|');
        let tag = parts.next().expect("row tag");
        let mut fields = HashMap::new();
        for part in parts {
            let (k, v) = part.split_once('=').expect("key=value");
            assert!(
                fields.insert(k, v).is_none(),
                "duplicate field {k} in {tag}"
            );
        }
        Row { tag, fields }
    }

    fn get(&self, key: &str) -> &'a str {
        self.fields
            .get(key)
            .unwrap_or_else(|| panic!("{} row has no {key}", self.tag))
    }

    /// A list field, recorded in full or (when long) as its count and the sha256 of its text.
    fn assert_list(&self, key: &str, items: &[String], what: &str) {
        let text = items.join(",");
        match self.fields.get(key) {
            Some(&v) => assert_eq!(v, text, "{what}: {key}"),
            None => {
                assert_eq!(
                    self.get(&format!("{key}_count")),
                    items.len().to_string(),
                    "{what}: {key} length"
                );
                assert_eq!(
                    self.get(&format!("{key}_sha256")),
                    sha256_hex(&text),
                    "{what}: {key} digest"
                );
            }
        }
    }
}

fn number(hex: &str) -> Number {
    Number::from_bits(u64::from_str_radix(hex, 16).expect("hex bit pattern"))
}

fn hexes(values: &[Number]) -> Vec<String> {
    values
        .iter()
        .map(|v| format!("{:016x}", v.to_bits()))
        .collect()
}

fn hex(v: Number) -> String {
    format!("{:016x}", v.to_bits())
}

fn unhex_text(hex: &str) -> String {
    let bytes: Vec<u8> = (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).expect("hex byte"))
        .collect();
    String::from_utf8(bytes).expect("utf-8 text")
}

fn option(row: &Row, key: &str) -> Option<Number> {
    match row.get(key) {
        "-" => None,
        h => Some(number(h)),
    }
}

fn code_tuples<const N: usize>(codes: &[[Number; N]]) -> Vec<String> {
    codes
        .iter()
        .map(|c| {
            c.iter()
                .map(|&v| number_to_string(v))
                .collect::<Vec<_>>()
                .join(":")
        })
        .collect()
}

#[test]
fn port_reproduces_every_fixture_row() {
    let mut inputs: HashMap<String, Vec<Number>> = HashMap::new();
    let mut triples: HashMap<String, TriplePacket> = HashMap::new();
    let mut counts: HashMap<&str, usize> = HashMap::new();
    let mut lines = FIXTURE.lines();
    let header = Row::parse(lines.next().expect("header"));
    assert_eq!(header.tag, "HYPERBEHCSQUANTS");
    assert_eq!(
        header.get("sha256"),
        "668a938a8b0281694797d64a6ff31921031b9af58fd7afb77a50dd3e0ee31e08"
    );
    for line in lines {
        let row = Row::parse(line);
        *counts.entry(row.tag).or_default() += 1;
        let case = row.get("case").to_string();
        if row.tag == "INPUT" {
            let vector = if row.get("kind") == "text" {
                let text = unhex_text(row.get("text_hex"));
                let dimension: usize = row.get("dimension").parse().expect("dimension");
                vector_from_text(&text, dimension)
            } else {
                let values = row.get("values");
                if values.is_empty() {
                    Vec::new()
                } else {
                    values.split(',').map(number).collect()
                }
            };
            row.assert_list("values", &hexes(&vector), &format!("INPUT {case}"));
            inputs.insert(case, vector);
            continue;
        }
        let opts_name = row.get("opts");
        let what = format!("{} {case} {opts_name}", row.tag);
        if row.tag == "RECONSTRUCT" {
            let packet = &triples[&format!("{case}/{opts_name}")];
            row.assert_list("values", &hexes(&reconstruct_triple(packet)), &what);
            continue;
        }
        let seed_text = match row.get("opt_seed_hex") {
            "-" => None,
            h => Some(unhex_text(h)),
        };
        let options = Options {
            bits: option(&row, "opt_bits"),
            max_radius: option(&row, "opt_max_radius"),
            target_dimension: option(&row, "opt_target_dimension"),
            seed: seed_text.as_deref(),
        };
        let vector = &inputs[&case];
        let (fingerprint, preimage) = match row.tag {
            "JL" => {
                let p = johnson_lindenstrauss(vector, &options);
                assert_eq!(
                    p.target_dimension.to_string(),
                    row.get("target_dimension_out"),
                    "{what}"
                );
                row.assert_list("projection", &hexes(&p.projection), &what);
                (p.fingerprint.clone(), p.fingerprint_preimage())
            }
            "TURBO" => {
                let p = turbo_quant(vector, &options);
                let codes: Vec<String> = p.codes.iter().map(|&c| number_to_string(c)).collect();
                row.assert_list("codes", &codes, &what);
                let m = p.metadata;
                assert_eq!(hex(m.min), row.get("min"), "{what}");
                assert_eq!(hex(m.max), row.get("max"), "{what}");
                assert_eq!(hex(m.scale), row.get("scale"), "{what}");
                assert_eq!(number_to_string(m.bits), row.get("bits_out"), "{what}");
                assert_eq!(number_to_string(m.levels), row.get("levels"), "{what}");
                assert_eq!(number_to_string(m.max_code), row.get("max_code"), "{what}");
                (p.fingerprint.clone(), p.fingerprint_preimage())
            }
            "POLAR" => {
                let p = polar_quant(vector, &options);
                row.assert_list("codes", &code_tuples(&p.codes), &what);
                let m = p.metadata;
                assert_eq!(hex(m.max_radius), row.get("max_radius"), "{what}");
                assert_eq!(hex(m.radius_scale), row.get("radius_scale"), "{what}");
                assert_eq!(hex(m.angle_scale_radians), row.get("angle_scale"), "{what}");
                (p.fingerprint.clone(), p.fingerprint_preimage())
            }
            "TRIPLE" => {
                let p = triple_quant(vector, &options);
                row.assert_list("codes", &code_tuples(&p.codes), &what);
                let m = p.metadata;
                assert_eq!(hex(m.max_radius), row.get("max_radius"), "{what}");
                assert_eq!(hex(m.radius_scale), row.get("radius_scale"), "{what}");
                assert_eq!(hex(m.theta_scale_radians), row.get("theta_scale"), "{what}");
                assert_eq!(hex(m.phi_scale_radians), row.get("phi_scale"), "{what}");
                let out = (p.fingerprint.clone(), p.fingerprint_preimage());
                triples.insert(format!("{case}/{opts_name}"), p);
                out
            }
            other => panic!("unknown row {other}"),
        };
        assert_eq!(fingerprint, row.get("fingerprint"), "{what} fingerprint");
        assert_eq!(
            sha256_hex(&preimage),
            row.get("preimage_sha256"),
            "{what} preimage"
        );
    }
    // 19 inputs; 19 defaults + 3 inputs x 19 sweep sets + 1 limited set = 77 runs per quant.
    assert_eq!(counts["INPUT"], 19);
    for tag in ["JL", "TURBO", "POLAR", "TRIPLE", "RECONSTRUCT"] {
        assert_eq!(counts[tag], 77, "{tag} rows");
    }
}

#[test]
fn upstream_default_inputs_match_node() {
    // vectorFromText("", 1536) -> turboQuant / johnsonLindenstrauss / polarQuant / tripleQuant
    // under Node v22.22.0 (V8 12.4.254.21) running the vendored file: fingerprints and metadata.
    let v = vector_from_text("", 1536);
    let opts = Options::default();
    let t = turbo_quant(&v, &opts);
    assert_eq!(t.fingerprint, "cf135af855a29f6e");
    assert_eq!(number_to_string(t.metadata.min), "-2.765625");
    assert_eq!(number_to_string(t.metadata.max), "-0.164062");
    assert_eq!(number_to_string(t.metadata.scale), "0.010202207843");
    let j = johnson_lindenstrauss(&v, &opts);
    assert_eq!(j.target_dimension, 79);
    assert_eq!(j.fingerprint, "7aa1e8e4e4eb60d2");
    assert_eq!(number_to_string(j.projection[0]), "0.254745080519");
    let p = polar_quant(&v, &opts);
    assert_eq!(p.fingerprint, "13f49e4cd9ef724d");
    assert_eq!(number_to_string(p.metadata.max_radius), "3.635289813928");
    let tr = triple_quant(&v, &opts);
    assert_eq!(tr.fingerprint, "348e532f9b1142a7");
    assert_eq!(number_to_string(tr.metadata.radius_scale), "0.01460777117");
    let r = reconstruct_triple(&tr);
    assert_eq!(r.len(), 1536);
    assert_eq!(number_to_string(r[0]), "-0.729485412431");
}
