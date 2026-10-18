//! Both directions of the colour QR carrier on the fixtures and on the README's measured layout.

use colour_qr::generate::{base64_text, compose};
use colour_qr::ungenerate::{plane, read_plane, read_plane_with};
use colour_qr::{
    atob, decode_png, generate, generate_png, indexed_chunks, sha256_hex, symbol, take, ungenerate,
    ungenerate_with, Chunks, PlaneRead, Reader, FILLER, IMAGE_PX, QR_MODULES,
};
use std::path::PathBuf;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn read(rel: &str) -> Vec<u8> {
    let p = root().join(rel);
    std::fs::read(&p).unwrap_or_else(|e| panic!("{}: {e}", p.display()))
}

struct Fixture {
    name: String,
    payload: Vec<u8>,
    sha256: String,
    png: Vec<u8>,
    png_sha256: String,
    fields: Vec<(String, String)>,
}

fn field<'a>(fields: &'a [(String, String)], key: &str) -> Option<&'a str> {
    fields
        .iter()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.as_str())
}

fn fixtures() -> Vec<Fixture> {
    let text = String::from_utf8(read("tests/fixtures/FIXTURES.hbp")).unwrap();
    let rows: Vec<Fixture> = text
        .lines()
        .filter(|l| l.starts_with("FIXTURE|"))
        .map(|l| {
            let fields: Vec<(String, String)> = l
                .split('|')
                .skip(1)
                .filter_map(|f| f.split_once('='))
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect();
            let get = |k: &str| field(&fields, k).unwrap().to_string();
            Fixture {
                name: get("name"),
                payload: read(&get("payload")),
                sha256: get("sha256"),
                png: read(&get("png")),
                png_sha256: get("png_sha256"),
                fields: fields.clone(),
            }
        })
        .collect();
    assert_eq!(rows.len(), 8);
    rows
}

fn constellation_gguf() -> Vec<u8> {
    read("../../gguf/universe-simulator/gguf/ASOLARIA-CONSTELLATION.gguf")
}

#[test]
fn fixture_payloads_are_what_their_rows_name() {
    for f in fixtures() {
        assert_eq!(sha256_hex(&f.payload), f.sha256, "{}", f.name);
        assert_eq!(
            f.payload.len().to_string(),
            field(&f.fields, "bytes").unwrap()
        );
    }
}

#[test]
fn laws_codexes_are_the_constellation_gguf_tensors() {
    let gguf = constellation_gguf();
    assert_eq!(
        sha256_hex(&gguf),
        "3d7b3bdfb9e89b583192c08807b57245b12b9414af1d5ba1b14af941347403ba"
    );
    let mut seen = 0;
    for f in fixtures() {
        let at = match (field(&f.fields, "offset"), field(&f.fields, "also")) {
            (Some(off), _) => off.parse::<usize>().unwrap(),
            (None, Some(also)) => also.rsplit_once('@').unwrap().1.parse().unwrap(),
            (None, None) => continue,
        };
        assert_eq!(
            &gguf[at..at + f.payload.len()],
            &f.payload[..],
            "{}",
            f.name
        );
        seen += 1;
    }
    assert_eq!(seen, 5);
}

#[test]
fn generate_writes_the_fixture_pngs_byte_for_byte() {
    for f in fixtures() {
        let codes = generate_png(&f.payload).unwrap();
        assert_eq!(codes.len(), 1, "{}", f.name);
        let (code, png) = &codes[0];
        assert_eq!(code.number, 1);
        assert_eq!(code.planes, [Some(0), Some(1), None]);
        assert_eq!(sha256_hex(png), f.png_sha256, "{}", f.name);
        assert_eq!(png, &f.png, "{}", f.name);
    }
}

#[test]
fn ungenerate_returns_every_fixture_byte_exact() {
    for f in fixtures() {
        let (reads, chunks) = ungenerate(&[f.png.as_slice()]).unwrap();
        assert_eq!(
            reads,
            vec![[
                PlaneRead::Chunk {
                    index: 0,
                    body_bytes: 2100
                },
                PlaneRead::Chunk {
                    index: 1,
                    body_bytes: f.payload.len() - 2100
                },
                PlaneRead::NoSymbol,
            ]],
            "{}",
            f.name
        );
        let out = chunks.reassemble();
        assert_eq!(out.sha256, f.sha256, "{}", f.name);
        assert_eq!(out.bytes, f.payload);
        assert_eq!((chunks.contiguous_from_zero(), chunks.span()), (2, 2));
    }
}

#[test]
fn filler_plane_is_constant_and_symbol_planes_hold_dark_and_light() {
    let f = &fixtures()[0];
    let img = decode_png(&f.png).unwrap();
    assert_eq!((img.width, img.height), (IMAGE_PX, IMAGE_PX));
    assert!(plane(&img, 2).iter().all(|&v| v == FILLER));
    for ch in 0..2 {
        let p = plane(&img, ch);
        assert!(p.iter().all(|&v| v == 0 || v == 255));
        assert!(p.contains(&0) && p.contains(&255));
    }
}

/// README.md:62-71: 65,536 B, 31 x 2100 + 436, 32 chunks, 11 codes, code 11 R = chunk 30,
/// G = chunk 31, B = filler; README.md:75-78 the plane reads of code 11. The JWST raw itself
/// is not in the-colour-qr, so the 65,536 B here are the first 65,536 B of the constellation
/// GGUF.
#[test]
fn readme_measured_layout_65536_bytes() {
    let payload = constellation_gguf()[..65_536].to_vec();
    let chunks = indexed_chunks(&payload).unwrap();
    assert_eq!(chunks.len(), 32);
    assert_eq!(&chunks[30][..4], &[0x1e, 0, 0, 0]);
    assert_eq!(&chunks[31][..4], &[0x1f, 0, 0, 0]);
    assert_eq!(chunks[31].len() - 4, 436);
    let codes = generate_png(&payload).unwrap();
    assert_eq!(codes.len(), 11);
    assert_eq!(codes[10].0.number, 11);
    assert_eq!(codes[10].0.planes, [Some(30), Some(31), None]);
    let pngs: Vec<&[u8]> = codes.iter().map(|(_, p)| p.as_slice()).collect();
    let (reads, got) = ungenerate(&pngs).unwrap();
    assert_eq!(
        reads[10],
        [
            PlaneRead::Chunk {
                index: 30,
                body_bytes: 2100
            },
            PlaneRead::Chunk {
                index: 31,
                body_bytes: 436
            },
            PlaneRead::NoSymbol,
        ]
    );
    let out = got.reassemble();
    assert_eq!(out.bytes, payload);
    assert_eq!(out.sha256, sha256_hex(&payload));
    // README.md:49 "Order does not matter downstream. The index carries it."
    let reversed: Vec<&[u8]> = pngs.iter().rev().copied().collect();
    let (_, again) = ungenerate(&reversed).unwrap();
    assert_eq!(again.reassemble().bytes, payload);
}

/// README.md:59-60: a chunk whose Reed-Solomon fails never arrives; the bad read is dropped.
#[test]
fn a_plane_that_fails_is_dropped_not_merged() {
    let f = &fixtures()[3];
    let mut img = decode_png(&f.png).unwrap();
    // Flip the green plane over a 60 x 60 module block in the data area (far past level L's
    // correction capacity); red and blue are left as they are.
    let mut seed: u32 = 0x2545_f491;
    for my in 60..120 {
        for mx in 60..120 {
            seed = seed.wrapping_mul(1_103_515_245).wrapping_add(12_345);
            if seed >> 31 == 1 {
                for dy in 0..3 {
                    for dx in 0..3 {
                        let i = ((my * 3 + dy) * IMAGE_PX + mx * 3 + dx) * 4 + 1;
                        img.data[i] = 255 - img.data[i];
                    }
                }
            }
        }
    }
    let mut chunks = Chunks::new();
    let reads = take(&mut chunks, &img);
    assert_eq!(
        reads,
        [
            PlaneRead::Chunk {
                index: 0,
                body_bytes: 2100
            },
            PlaneRead::NoSymbol,
            PlaneRead::NoSymbol
        ]
    );
    let out = chunks.reassemble();
    assert_eq!(out.bytes, f.payload[..2100]);
    assert_ne!(out.sha256, f.sha256);
    assert_eq!((chunks.contiguous_from_zero(), chunks.span()), (1, 1));
}

#[test]
fn plane_counts_follow_the_chunk_count() {
    assert!(generate(&[]).unwrap().is_empty());
    let one = generate(&[7u8; 2100]).unwrap();
    assert_eq!(one.len(), 1);
    assert_eq!(one[0].planes, [Some(0), None, None]);
    let three = generate(&[7u8; 6300]).unwrap();
    assert_eq!(three.len(), 1);
    assert_eq!(three[0].planes, [Some(0), Some(1), Some(2)]);
    let four = generate(&[7u8; 6301]).unwrap();
    assert_eq!(four.len(), 2);
    assert_eq!(four[1].planes, [Some(3), None, None]);
    let mut chunks = Chunks::new();
    let reads = take(
        &mut chunks,
        &decode_png(&colour_qr::encode_png(&three[0].image).unwrap()).unwrap(),
    );
    assert!(reads.iter().all(|r| matches!(
        r,
        PlaneRead::Chunk {
            body_bytes: 2100,
            ..
        }
    )));
    assert_eq!(chunks.reassemble().bytes, vec![7u8; 6300]);
}

/// Derivation at `QR_VERSION`: 2,808 base64 characters fit byte mode at level L from version
/// 39 (2,809 characters) and at no other level, even at version 40.
#[test]
fn version_and_level_follow_from_the_chunk_size() {
    use qrcode::bits::Bits;
    use qrcode::{EcLevel, Version};
    let full = base64_text(&indexed_chunks(&[0u8; 2100]).unwrap()[0]);
    assert_eq!(full.len(), 2808);
    let fits = |n: usize, v: i16, ec: EcLevel| {
        let mut b = Bits::new(Version::Normal(v));
        b.push_byte_data(&vec![b'A'; n]).is_ok() && b.push_terminator(ec).is_ok()
    };
    assert!(fits(2808, 40, EcLevel::L));
    assert!(fits(2808, 39, EcLevel::L));
    assert!(fits(2809, 39, EcLevel::L));
    assert!(!fits(2810, 39, EcLevel::L));
    assert!(!fits(2808, 38, EcLevel::L));
    for ec in [EcLevel::M, EcLevel::Q, EcLevel::H] {
        assert!(!fits(2808, 40, ec));
    }
    assert_eq!(symbol(full.as_bytes()).unwrap().width, QR_MODULES);
}

#[test]
fn atob_is_the_forgiving_base64_decode() {
    assert_eq!(atob(b"QUJD").unwrap(), b"ABC");
    assert_eq!(atob(b"QUI=").unwrap(), b"AB");
    assert_eq!(atob(b"QUI").unwrap(), b"AB");
    assert_eq!(atob(b"QQ==").unwrap(), b"A");
    assert_eq!(atob(b"QQ").unwrap(), b"A");
    assert_eq!(atob(b" Q U\nI=\t").unwrap(), b"AB");
    assert_eq!(atob(b"").unwrap(), b"");
    assert!(atob(b"Q").is_none());
    assert!(atob(b"QUJ=D").is_none());
    assert!(atob(b"QQ=").is_none());
    assert!(atob(b"Q===").is_none());
    assert!(atob(b"QU-D").is_none());
    let bytes: Vec<u8> = (0..=255).collect();
    assert_eq!(atob(base64_text(&bytes).as_bytes()).unwrap(), bytes);
}

/// README.md:53-54: the planes are split and each is read alone; R and G give their own chunk
/// and the blue filler plane gives no symbol. A composed image with no symbol is all filler.
#[test]
fn each_plane_reads_alone() {
    let f = &fixtures()[0];
    let img = decode_png(&f.png).unwrap();
    for ch in 0..2 {
        let text = read_plane(img.width, img.height, &plane(&img, ch)).unwrap();
        let d = atob(&text).unwrap();
        assert_eq!(
            u32::from_le_bytes([d[0], d[1], d[2], d[3]]),
            u32::try_from(ch).unwrap()
        );
    }
    assert!(read_plane(img.width, img.height, &plane(&img, 2)).is_none());
    let blank = compose([None, None, None]);
    assert!(blank.data.iter().all(|&v| v == FILLER));
}

/// Owner decision 2026-10-17: the integer-only reader is the default un-generate path.
#[test]
fn the_default_reader_is_the_integer_port_of_the_page() {
    assert_eq!(Reader::default(), Reader::Integer);
    assert_eq!(Reader::default().label(), "qr-read-int");
    let f = &fixtures()[1];
    let img = decode_png(&f.png).unwrap();
    for ch in 0..3 {
        let p = plane(&img, ch);
        assert_eq!(
            read_plane(img.width, img.height, &p),
            read_plane_with(Reader::Integer, img.width, img.height, &p)
        );
        let jsqr = qr_read_int::read(img.width, img.height, &p);
        assert_eq!(
            read_plane(img.width, img.height, &p),
            jsqr.as_ref().map(|c| c.text.clone().into_bytes())
        );
        if let Some(code) = jsqr {
            assert_eq!(
                (code.version, code.inverted, code.mirrored),
                (40, false, false)
            );
        }
    }
    let a = ungenerate(&[f.png.as_slice()]).unwrap();
    let b = ungenerate_with(Reader::Integer, &[f.png.as_slice()]).unwrap();
    assert_eq!(a, b);
}

/// The labelled secondary read (third-party rqrr, floating-point geometry) still returns every fixture.
#[cfg(feature = "rqrr-secondary")]
#[test]
fn the_rqrr_secondary_returns_every_fixture_byte_exact() {
    assert_eq!(
        Reader::RqrrSecondary.label(),
        "rqrr-0.10.1-secondary-float-geometry"
    );
    for f in fixtures() {
        let (_, chunks) = ungenerate_with(Reader::RqrrSecondary, &[f.png.as_slice()]).unwrap();
        assert_eq!(chunks.reassemble().sha256, f.sha256, "{}", f.name);
    }
}
