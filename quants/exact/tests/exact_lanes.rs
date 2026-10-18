//! Every `LANE` row of `tests/fixtures/exact-lanes.hbp` recomputed with the vendored owner Rust,
//! and decoder(encoder(x)) == x for every exact lane, every implementation, every owner input.

mod common;

use common::{head, inputs, rows, sha256_hex, stream_sha};
use quant_exact::dbbh::{self, Level};
use quant_exact::slice_harness::{self as harness, Wavelength};
use quant_exact::{fed60d, qprism_dbbh_ladder, qprism_transcode};

/// One symbol stream per width from every vendored implementation; all must be equal.
fn ladder(data: &[u8], width: u8) -> Vec<u16> {
    let level = match width {
        6 => Level::Behcs64,
        8 => Level::Behcs256,
        10 => Level::Behcs1024,
        _ => unreachable!(),
    };
    let from_dbbh = dbbh::to_level(data, level);
    let from_harness = harness::to_symbols(data, u32::from(width));
    let from_qprism_ladder = qprism_dbbh_ladder::pack(data, width);
    assert_eq!(from_dbbh, from_harness, "dbbh vs harness, width {width}");
    assert_eq!(
        from_dbbh, from_qprism_ladder,
        "dbbh vs Q-PRISM ladder, width {width}"
    );
    if width == 10 {
        let from_transcode = qprism_transcode::transcode_256_to_1024(data);
        assert_eq!(from_dbbh, from_transcode, "dbbh vs Q-PRISM transcode");
    }
    // Every decoder recovers the input.
    let n = data.len();
    assert_eq!(dbbh::from_level(&from_dbbh, level, n), data);
    assert_eq!(harness::from_symbols(&from_dbbh, u32::from(width), n), data);
    assert_eq!(qprism_dbbh_ladder::unpack(&from_dbbh, width, n), data);
    if width == 10 {
        assert_eq!(qprism_transcode::transcode_1024_to_256(&from_dbbh, n), data);
    }
    from_dbbh
}

/// The harness's own text form of a wavelength must decode back to the input.
fn harness_text(w: Wavelength, data: &[u8]) -> String {
    let text = w.encode(data);
    assert_eq!(
        w.decode(&text, data.len()).as_deref(),
        Some(data),
        "{}",
        w.name()
    );
    text
}

/// The harness's text form of a symbol lane: every symbol followed by a comma (src/lib.rs:223-237).
fn joined(symbols: &[u16]) -> String {
    let mut out = String::new();
    for s in symbols {
        out.push_str(&s.to_string());
        out.push(',');
    }
    out
}

#[test]
fn every_lane_row_matches_the_vendored_rust_and_round_trips() {
    let inputs = inputs();
    assert_eq!(inputs.len(), 28);
    let mut checked = 0usize;
    for row in rows().iter().filter(|r| r.tag == "LANE") {
        let id = row.get("id");
        let data = &inputs.iter().find(|(i, _)| i == id).expect("input").1;
        let lane = row.get("lane");
        let (count, top, sha) = match lane {
            "binary" | "hex" => {
                let w = if lane == "binary" {
                    Wavelength::Binary
                } else {
                    Wavelength::Hex
                };
                let text = harness_text(w, data);
                if lane == "hex" {
                    assert_eq!(text, harness::hex(data));
                    assert_eq!(harness::unhex(&text), *data);
                }
                let top = text.chars().take(16).collect::<String>();
                (text.len(), top, sha256_hex(text.as_bytes()))
            }
            "behcs64" | "behcs256" | "behcs1024" => {
                let (width, w) = match lane {
                    "behcs64" => (6, Wavelength::Behcs64),
                    "behcs256" => (8, Wavelength::Behcs256),
                    _ => (10, Wavelength::Behcs1024),
                };
                let s = ladder(data, width);
                let text = harness_text(w, data);
                if width == 8 {
                    // harness src/lib.rs:230: the 256 lane is the hex text of the bytes, and the
                    // 8-bit symbols are the bytes themselves.
                    assert_eq!(text, harness::hex(data));
                    assert!(s.iter().zip(data.iter()).all(|(a, b)| *a == u16::from(*b)));
                } else {
                    assert_eq!(text, joined(&s));
                }
                (s.len(), head(&s), stream_sha(&s))
            }
            "word40" => {
                // HYPER-BECHS behcs_ladder_roundtrip.py: 5 bytes -> one 40-bit word -> 4 glyphs.
                assert_eq!(data.len() % 5, 0);
                let s = ladder(data, 10);
                assert_eq!(s.len() * 5, data.len() * 4);
                (s.len(), head(&s), stream_sha(&s))
            }
            "framed40" => {
                // behcs_ladder_framed_v1.py pads to whole 5-byte words; the vendored packers emit
                // ceil(8n/10) symbols. Measured relation: framed = packed ++ zero symbols.
                let mut s = ladder(data, 10);
                let words = data.len().div_ceil(5);
                assert!(s.len() <= words * 4);
                s.resize(words * 4, 0);
                (s.len(), head(&s), stream_sha(&s))
            }
            "hyper60" => {
                let tuples = dbbh::to_hyperbehcs(data);
                let glyphs = ladder(data, 10);
                assert_eq!(
                    dbbh::from_hyperbehcs(&tuples, glyphs.len(), data.len()),
                    *data
                );
                let text = harness_text(Wavelength::HyperBehcs, data);
                assert_eq!(text.matches('[').count(), tuples.len());
                let flat: Vec<u16> = tuples.iter().flat_map(|t| t.iter().copied()).collect();
                assert_eq!(&flat[..glyphs.len()], &glyphs[..]);
                assert!(flat[glyphs.len()..].iter().all(|g| *g == 0));
                (flat.len(), head(&flat), stream_sha(&flat))
            }
            "fed60" => {
                let p = fed60d::project_60d(data);
                (p.glyphs.len(), head(&p.glyphs), stream_sha(&p.glyphs))
            }
            other => {
                let pid_hex = other.strip_prefix("selector60:").expect("known lane");
                let cube = dbbh::QPrismCube::new(dbbh::Pid::from_hex(pid_hex).unwrap(), data);
                let seat = harness::Pid::from_hex(pid_hex);
                assert_eq!(harness::project_60d(data, &seat), cube.selector);
                assert_eq!(harness::project_nd(data, &seat, 60), cube.selector.to_vec());
                assert_eq!(cube.reconstruct(), *data);
                (
                    cube.selector.len(),
                    head(&cube.selector),
                    stream_sha(&cube.selector),
                )
            }
        };
        assert_eq!(count.to_string(), row.get("count"), "{id} {lane} count");
        assert_eq!(top, row.get("head"), "{id} {lane} head");
        assert_eq!(sha, row.get("sha256"), "{id} {lane} sha256");
        checked += 1;
    }
    // 28 inputs x 8 lanes + 14 word40 rows (the 14 inputs with len % 5 == 0) + 7 selectors.
    assert_eq!(checked, 28 * 8 + 14 + 7);
}

#[test]
fn back_rows_name_every_exact_lane_and_the_input_digest() {
    let inputs = inputs();
    let backs: Vec<_> = rows().into_iter().filter(|r| r.tag == "BACK").collect();
    assert_eq!(backs.len(), inputs.len());
    for (row, (id, data)) in backs.iter().zip(inputs.iter()) {
        assert_eq!(row.get("id"), id);
        assert_eq!(row.get("sha256"), sha256_hex(data));
        let lanes = row.get("lanes");
        assert!(lanes.starts_with("binary+hex+behcs64+behcs256+behcs1024+framed40+hyper60"));
        assert_eq!(lanes.ends_with("+word40"), data.len() % 5 == 0);
    }
}

#[test]
fn measured_rung_256_1024_on_the_q_prism_cube_tuple() {
    // Q-PRISM 53023b6: "3200-byte tuple -> 2560 base-1024 glyph lines ... byte-identical,
    // sha256-identical" and "Rust==Python symbol-identical ([2,951,460,1007,...], len 2560)".
    let tuple = common::generate("knuth13:3200");
    let down = qprism_transcode::transcode_256_to_1024(&tuple);
    let up = qprism_transcode::transcode_1024_to_256(&down, tuple.len());
    assert_eq!(down.len(), 2560);
    assert_eq!(&down[..4], &[2, 951, 460, 1007]);
    assert_eq!(
        sha256_hex(&up),
        "fe28e4a1813ea87aa55d9e4aad3e8ac028a2142890e39b3ab8e5eb40ba4ef05e"
    );
    assert_eq!(sha256_hex(&up), sha256_hex(&tuple));
    assert_eq!(
        stream_sha(&down),
        "8d454eaca462c77b2b83b4d9d1d567413717ef82c0b863375a147f6a5da26395"
    );
    // dbbh src/lib.rs:741-747: 5 bytes <-> exactly 4 BEHCS-1024 glyphs.
    let five = [0xDE, 0xAD, 0xBE, 0xEF, 0x42];
    let glyphs = dbbh::to_level(&five, Level::Behcs1024);
    assert_eq!(glyphs, vec![890, 731, 955, 834]);
    assert_eq!(dbbh::from_level(&glyphs, Level::Behcs1024, 5), five);
}

#[test]
fn every_length_residue_round_trips_in_every_implementation() {
    // Lengths 0..=400 cover every residue mod 5 (40-bit words) and mod 3 (24-bit BEHCS-64 groups).
    for n in 0..=400u32 {
        let data = common::generate(&format!("knuth11x17:{n}"));
        for width in [6u8, 8, 10] {
            let s = ladder(&data, width);
            let bits = data.len() * 8;
            assert_eq!(s.len(), bits.div_ceil(usize::from(width)));
        }
        let tuples = dbbh::to_hyperbehcs(&data);
        let glyphs = dbbh::to_level(&data, Level::Behcs1024).len();
        assert_eq!(tuples.len(), glyphs.div_ceil(60));
        assert_eq!(dbbh::from_hyperbehcs(&tuples, glyphs, data.len()), data);
        for w in Wavelength::ALL {
            if w.is_lossless_lane() {
                harness_text(w, &data);
            } else {
                assert_eq!(w.decode(&w.encode(&data), data.len()), None);
            }
        }
    }
}
