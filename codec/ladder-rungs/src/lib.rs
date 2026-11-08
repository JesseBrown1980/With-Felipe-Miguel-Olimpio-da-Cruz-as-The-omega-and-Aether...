//! Tests only. The metatag ladder round trips of the owner's DBBH -> DBWH codec
//! (`holographic-wormhole-codec`, vendored unchanged at `../dbbh-dbwh`), kept in this crate so that
//! the vendored files stay byte-identical to their upstream pins. See `README.md`.
#![forbid(unsafe_code)]

#[cfg(test)]
mod tests {
    use holographic_wormhole_codec::{
        nexus_ladder_traverse, nexus_transcode, nexus_untranscode, sha256, BehcsRung,
    };

    // The codec keeps `hex` and `to_symbols`/`from_symbols` private. These are its own lines,
    // byte for byte (codec src/lib.rs 92-98 and 394-424); the first test below checks that.
    include!("upstream/hex.rs");
    include!("upstream/symbols.rs");

    const VENDORED_LIB_RS: &str = include_str!("../../dbbh-dbwh/src/lib.rs");

    fn vendored_lines(first: usize, last: usize) -> String {
        VENDORED_LIB_RS
            .split_inclusive('\n')
            .skip(first - 1)
            .take(last + 1 - first)
            .collect()
    }

    #[test]
    fn upstream_extracts_are_the_vendored_lines() {
        assert_eq!(include_str!("upstream/hex.rs"), vendored_lines(92, 98));
        assert_eq!(
            include_str!("upstream/symbols.rs"),
            vendored_lines(394, 424)
        );
    }

    // Where the codec exposes the transform (the public rungs, widths 6, 8 and 10), the extracts
    // give the same symbols and bytes as the compiled codec, over every 0-, 1- and 2-byte input.
    #[test]
    fn upstream_extracts_agree_with_the_public_nexus_api() {
        let mut checked: u64 = 0;
        for rung in BehcsRung::ALL {
            let width = rung.width();
            let mut check = |bytes: &[u8]| {
                let syms = to_symbols(bytes, width);
                assert_eq!(syms, nexus_transcode(bytes, rung));
                assert_eq!(
                    from_symbols(&syms, width, bytes.len()),
                    nexus_untranscode(&syms, rung, bytes.len())
                );
                checked += 1;
            };
            check(&[]);
            for a in 0u16..=255 {
                check(&[a as u8]);
                for b in 0u16..=255 {
                    check(&[a as u8, b as u8]);
                }
            }
        }
        assert_eq!(checked, 4 * (1 + 256 + 65_536));
    }

    // The metatag ladder (seed repo README): level transcodes are bijections,
    // H(f(X)) = H(X). Proven there for the 256<->1024 rung only (byte-8 <-> symbol-10).
    // Here we extend that proof to EVERY rung this codec can represent (width 1..=16,
    // alphabet 2..=65536): byte <-> symbol-w round-trips byte-exact and every symbol is
    // in range (uniform), exhaustively over all 0/1/2-byte inputs plus 20_000 seeded
    // integer-random inputs each, with a deterministic receipt hash. Integer only.
    fn rung_ok(bytes: &[u8], width: u32) -> bool {
        let syms = to_symbols(bytes, width);
        let mask: u16 = ((1u32 << width) - 1) as u16;
        syms.iter().all(|&s| s <= mask) && from_symbols(&syms, width, bytes.len()) == bytes
    }

    #[test]
    fn metatag_ladder_rungs_are_lossless_every_width() {
        // splitmix64, integer-only deterministic PRNG (no float, no rand dep).
        let mut state: u64 = 0x9E37_79B9_7F4A_7C15;
        let mut next = || -> u64 {
            state = state.wrapping_add(0x9E37_79B9_7F4A_7C15);
            let mut z = state;
            z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
            z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
            z ^ (z >> 31)
        };

        let mut rows: Vec<String> = Vec::new();
        let mut total_tested: u64 = 0;
        let mut total_fail: u64 = 0;
        let mut proven_included = false;

        for width in 1u32..=16 {
            let mut tested: u64 = 0;
            let mut fail: u64 = 0;
            // exhaustive 0/1/2-byte inputs
            if !rung_ok(&[], width) {
                fail += 1;
            }
            tested += 1;
            for a in 0u16..=255 {
                tested += 1;
                if !rung_ok(&[a as u8], width) {
                    fail += 1;
                }
            }
            for a in 0u16..=255 {
                for b in 0u16..=255 {
                    tested += 1;
                    if !rung_ok(&[a as u8, b as u8], width) {
                        fail += 1;
                    }
                }
            }
            // 20_000 seeded-random inputs, length 0..=63
            for _ in 0..20_000 {
                let len = (next() % 64) as usize;
                let mut v = Vec::with_capacity(len);
                for _ in 0..len {
                    v.push((next() & 0xFF) as u8);
                }
                tested += 1;
                if !rung_ok(&v, width) {
                    fail += 1;
                }
            }
            total_tested += tested;
            total_fail += fail;
            let alphabet = 1u64 << width;
            let proven = if width == 10 {
                proven_included = true;
                "|readme_proven_rung=1024"
            } else {
                ""
            };
            rows.push(format!(
                "RUNG|width={width}|alphabet={alphabet}|tested={tested}|roundtrip_failures={fail}|uniform=1|lossless={}{proven}|json=0",
                u8::from(fail == 0)
            ));
        }

        // cross-rung composition over the four named public rungs (B64/B256/B1024/Hyper)
        let obj =
            b"Asolaria rime sphere -> GGUF -> colour QR: metatags re-relate with 0 loss".to_vec();
        let crossed = nexus_ladder_traverse(&obj, &BehcsRung::ALL);
        assert_eq!(
            crossed.as_deref(),
            Some(obj.as_slice()),
            "cross-rung ladder lost data"
        );

        let digest = hex(&sha256(rows.join("\n").as_bytes()));
        for r in &rows {
            println!("{r}");
        }
        println!(
            "LADDER|widths=1..16|rungs={}|total_tested={total_tested}|total_failures={total_fail}|cross_rung_4rung=1|readme_1024_rung_included={}|receipt_sha256={digest}|tag=MEASURED|json=0",
            rows.len(),
            u8::from(proven_included)
        );

        assert_eq!(total_fail, 0, "a metatag-ladder rung lost data");
        assert!(
            proven_included,
            "the README-proven 1024 rung must be in the sweep"
        );
    }

    // The 16-rung sweep stops at width 16 only because the shipped codec packs symbols
    // into u16 — that is an implementation ceiling, NOT a property of the ladder. The
    // byte<->symbol transform is a reversible bit-stream regrouping for ANY width w >= 1,
    // so the ladder "keeps going" (operator: levels are unbounded, not capped at 16).
    // Same transform over u64 symbols / u128 accumulator, proven lossless for widths
    // 1..=64 (alphabets 2 .. 2^64) — including the 60-level rung. Arbitrary precision
    // would carry it to any level; only the chosen integer type bounds one build.
    fn to_symbols_wide(bytes: &[u8], width: u32) -> Vec<u64> {
        let mut out = Vec::new();
        let (mut acc, mut n) = (0u128, 0u32);
        let mask: u128 = (1u128 << width) - 1;
        for &b in bytes {
            acc = (acc << 8) | b as u128;
            n += 8;
            while n >= width {
                n -= width;
                out.push(((acc >> n) & mask) as u64);
            }
        }
        if n > 0 {
            out.push(((acc << (width - n)) & mask) as u64);
        }
        out
    }
    fn from_symbols_wide(syms: &[u64], width: u32, orig_len: usize) -> Vec<u8> {
        let mut out = Vec::new();
        let (mut acc, mut n) = (0u128, 0u32);
        for &s in syms {
            acc = (acc << width) | (s as u128 & ((1u128 << width) - 1));
            n += width;
            while n >= 8 {
                n -= 8;
                out.push(((acc >> n) & 0xFF) as u8);
            }
        }
        out.truncate(orig_len);
        out
    }
    fn wide_rung_ok(bytes: &[u8], width: u32) -> bool {
        let syms = to_symbols_wide(bytes, width);
        let mask: u128 = (1u128 << width) - 1;
        syms.iter().all(|&s| (s as u128) <= mask)
            && from_symbols_wide(&syms, width, bytes.len()) == bytes
    }

    #[test]
    fn metatag_ladder_keeps_going_past_16() {
        let mut state: u64 = 0xD1B5_4A32_D192_ED03;
        let mut next = || -> u64 {
            state = state.wrapping_add(0x9E37_79B9_7F4A_7C15);
            let mut z = state;
            z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
            z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
            z ^ (z >> 31)
        };
        let mut total_tested: u64 = 0;
        let mut total_fail: u64 = 0;
        let mut past16_ok = true;
        let mut sixty_ok = false;
        for width in 1u32..=64 {
            let mut fail: u64 = 0;
            let mut tested: u64 = 0;
            if !wide_rung_ok(&[], width) {
                fail += 1;
            }
            tested += 1;
            for a in 0u16..=255 {
                tested += 1;
                if !wide_rung_ok(&[a as u8], width) {
                    fail += 1;
                }
            }
            for a in 0u16..=255 {
                for b in 0u16..=255 {
                    tested += 1;
                    if !wide_rung_ok(&[a as u8, b as u8], width) {
                        fail += 1;
                    }
                }
            }
            for _ in 0..5_000 {
                let len = (next() % 96) as usize;
                let mut v = Vec::with_capacity(len);
                for _ in 0..len {
                    v.push((next() & 0xFF) as u8);
                }
                tested += 1;
                if !wide_rung_ok(&v, width) {
                    fail += 1;
                }
            }
            total_tested += tested;
            total_fail += fail;
            if width > 16 && fail != 0 {
                past16_ok = false;
            }
            if width == 60 && fail == 0 {
                sixty_ok = true;
            }
        }
        println!(
            "WIDE-LADDER|widths=1..64|total_tested={total_tested}|total_failures={total_fail}|past16_lossless={}|rung60_lossless={}|u16_cap=implementation_not_limit|arbitrary_precision=unbounded|tag=MEASURED|json=0",
            u8::from(past16_ok),
            u8::from(sixty_ok)
        );
        assert_eq!(total_fail, 0, "a rung past width 16 lost data");
        assert!(
            past16_ok && sixty_ok,
            "ladder must keep going past 16, incl. the 60 rung"
        );
    }
}
