//! What the integer reader returns for symbols whose content is known: every version and
//! level, every segment mode the page decodes, both binarisations, the mirror retry,
//! Reed-Solomon correction and its limit. Independent of the page recording.

mod corpus;

use corpus::{encode, flip_modules, invert, render, transpose};
use qr_read_int::{read, Chunk};
use qrcode::bits::Bits;
use qrcode::types::{EcLevel, Version};

const LEVELS: [EcLevel; 4] = [EcLevel::L, EcLevel::M, EcLevel::Q, EcLevel::H];

/// Every version and level reads back its bytes, except version 23 at level L: the page's
/// `VERSIONS` entry for version 23 lists alignment centres 6, 30, 54, 74, 102
/// (index.html:9088), the encoder draws them at 6, 30, 54, 78, 102 (`qrcode` 0.14.1 and
/// `rqrr` 0.10.1 tables), so the page reads the modules around 74 as function pattern and those
/// around 78 as data; at level L (30 EC codewords per block, 15 correctable) Reed-Solomon does
/// not recover the block and the page reads no symbol. The page's own results for these
/// version-23 symbols at 2, 3 and 4 px are corpus rows `v23-{L,M,Q,H}-nearfull-px{2,3,4}` of
/// `tests/fixtures/JSQR-PAGE.hbp`: level L 0 of 3, levels M, Q and H 9 of 9. This test draws
/// each symbol at one size.
#[test]
fn every_version_and_level_returns_its_bytes() {
    for version in 1..=40i16 {
        for (k, ec) in LEVELS.into_iter().enumerate() {
            let cap = Bits::new(Version::Normal(version)).max_len(ec).unwrap() / 8;
            let text: Vec<u8> = (0..cap - 3)
                .map(|i| b"0123456789abcdefghijklmnopqrstuvwxyz+/"[(i * 7 + k) % 38])
                .collect();
            let sym = encode(version, ec, None, |b| b.push_byte_data(&text).ok()).unwrap();
            let px = 2 + (usize::try_from(version).unwrap() + k) % 3;
            let (side, g) = render(&sym, px, 4, 0, 255);
            let code = read(side, side, &g);
            if version == 23 && k == 0 {
                assert!(
                    code.is_none(),
                    "v23 L reads as the page reads it: no symbol"
                );
                continue;
            }
            let code = code.unwrap_or_else(|| panic!("v{version} {ec:?}"));
            assert_eq!(code.version, u32::try_from(version).unwrap());
            assert_eq!(code.bytes, text, "v{version} {ec:?}");
            assert_eq!(code.text.as_bytes(), &text[..]);
            assert!(!code.inverted && !code.mirrored);
        }
    }
}

#[test]
fn segment_modes_decode_as_the_page_decodes_them() {
    let read_sym = |sym: corpus::Symbol| {
        let (side, g) = render(&sym, 4, 4, 0, 255);
        read(side, side, &g).expect("symbol")
    };
    let c = read_sym(
        encode(2, EcLevel::M, None, |b| {
            b.push_numeric_data(b"0123456789").ok()
        })
        .unwrap(),
    );
    assert_eq!(c.text, "0123456789");
    assert_eq!(
        c.chunks,
        vec![Chunk::Numeric {
            text: "0123456789".into()
        }]
    );
    let c = read_sym(
        encode(2, EcLevel::M, None, |b| {
            b.push_alphanumeric_data(b"AC-42 $%*+./:").ok()
        })
        .unwrap(),
    );
    assert_eq!(c.text, "AC-42 $%*+./:");
    // Shift JIS 0x935F 0xE4AA: the page's table gives U+70B9 U+8317.
    let c = read_sym(
        encode(2, EcLevel::M, None, |b| {
            b.push_kanji_data(b"\x93\x5f\xe4\xaa").ok()
        })
        .unwrap(),
    );
    assert_eq!(c.text, "\u{70b9}\u{8317}");
    assert_eq!(c.bytes, vec![0x93, 0x5f, 0xe4, 0xaa]);
    let c = read_sym(
        encode(3, EcLevel::L, None, |b| {
            b.push_eci_designator(26).ok()?;
            b.push_byte_data("\u{f8}".as_bytes()).ok()
        })
        .unwrap(),
    );
    assert_eq!(
        c.chunks[0],
        Chunk::Eci {
            assignment_number: 26
        }
    );
    assert_eq!(c.text, "\u{f8}");
    // FNC1 in first position is read and skipped; the segment after it decodes.
    let c = read_sym(
        encode(2, EcLevel::M, None, |b| {
            b.push_fnc1_first_position().ok()?;
            b.push_numeric_data(b"0104912345").ok()
        })
        .unwrap(),
    );
    assert_eq!(c.text, "0104912345");
    // A byte segment that is not UTF-8 adds its bytes and no text.
    let c = read_sym(encode(1, EcLevel::L, None, |b| b.push_byte_data(b"\xffab").ok()).unwrap());
    assert_eq!((c.bytes, c.text), (b"\xffab".to_vec(), String::new()));
}

#[test]
fn inverted_and_mirrored_symbols_take_the_page_s_second_attempts() {
    let sym = encode(4, EcLevel::Q, None, |b| {
        b.push_byte_data(b"second attempts").ok()
    })
    .unwrap();
    let (side, g) = render(&sym, 3, 4, 0, 255);
    let c = read(side, side, &invert(&g)).unwrap();
    assert!(c.inverted && !c.mirrored);
    let c = read(side, side, &transpose(side, &g)).unwrap();
    assert!(!c.inverted && c.mirrored);
    assert_eq!(c.text, "second attempts");
}

#[test]
fn reed_solomon_corrects_within_capacity_and_drops_beyond_it() {
    let text = b"error correction at level H";
    let sym = encode(4, EcLevel::H, None, |b| b.push_byte_data(text).ok()).unwrap();
    let (side, g) = render(&flip_modules(&sym, 20, 7), 3, 4, 0, 255);
    assert_eq!(read(side, side, &g).unwrap().bytes, text.to_vec());
    let (side, g) = render(&flip_modules(&sym, 300, 7), 3, 4, 0, 255);
    assert!(read(side, side, &g).is_none());
}

#[test]
fn malformed_input_reads_as_no_symbol() {
    assert!(read(0, 0, &[]).is_none());
    assert!(read(10, 10, &[0; 99]).is_none());
    assert!(read(
        qr_read_int::MAX_SIDE + 1,
        1,
        &vec![255; qr_read_int::MAX_SIDE + 1]
    )
    .is_none());
    assert!(read(40, 40, &[255; 1600]).is_none());
}
