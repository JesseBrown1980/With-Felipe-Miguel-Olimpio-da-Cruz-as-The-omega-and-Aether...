//! The four colour LUTs and the gradiated convolution against the owner's own L_p, L_r, L_g, L_d
//! (pump_glyphs_mythos.py:74-104, run unchanged by the referee under OPENBLAS_CORETYPE=Haswell)
//! on 12 seeds: six two-level channels whose 0.5th percentile interpolates with t >= 0.5
//! (numpy `_lerp`), and six three-cluster seeds whose L_d LUT depends on the dot-product
//! summation order. Record: u32 length, seed bytes, 3,072 LUT bytes, sha256 of the 768 hs bit
//! patterns (little-endian u64).
mod common;

use common::{hex, scratch, sha256, vec_path};
use pump_glyphs_herself::mythos;

#[test]
fn colour_luts_and_convolution_match_owner_numpy() {
    let data = std::fs::read(vec_path("lut_cases.bin")).unwrap();
    let dir = scratch("luts");
    let (mut o, mut cases) = (0usize, 0usize);
    while o < data.len() {
        let len = u32::from_le_bytes(data[o..o + 4].try_into().unwrap()) as usize;
        let seed = &data[o + 4..o + 4 + len];
        let want_luts = &data[o + 4 + len..o + 4 + len + 3072];
        let want_hs = &data[o + 4 + len + 3072..o + 4 + len + 3072 + 32];
        o += 4 + len + 3072 + 32;

        let p = dir.join(format!("case{cases}.bin"));
        std::fs::write(&p, seed).unwrap();
        let got = mythos::luts_flat(&p).unwrap();
        for (i, (g, w)) in got.iter().zip(want_luts).enumerate() {
            assert_eq!(
                g,
                w,
                "case {cases}: channel {} colour {} index {}",
                i / 1024,
                ["P", "R", "G", "D"][(i / 256) % 4],
                i % 256
            );
        }
        let n = seed.len() / 3;
        let mut hs = Vec::with_capacity(768 * 8);
        for c in 0..3 {
            let ch: Vec<u8> = (0..n).map(|t| seed[3 * t + c]).collect();
            for b in mythos::gradiated_hs_bits(&ch) {
                hs.extend_from_slice(&b.to_le_bytes());
            }
        }
        assert_eq!(
            sha256(&hs),
            hex(want_hs),
            "case {cases}: convolution hs bits"
        );
        cases += 1;
    }
    assert_eq!(cases, 12);
}
