//! The registry's translator law over the three symbol rungs, on every owner input:
//! `T_i_j = E_j after D_i`, `T_j_i after T_i_j = id`, `T_j_k after T_i_j = T_i_k`
//! (ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp line 35). `T` is the owner's own `relate`
//! (dbbh-coms-quant-prism src/lib.rs:215-219) and Q-PRISM's `SymbolFrame::convert` path
//! (`encode(to, decode())`, host8/dbbh_coms_quant_prism.rs:85-87) through `pack`/`unpack`.

mod common;

use quant_exact::dbbh::{self, Level};
use quant_exact::qprism_dbbh_ladder::{pack, unpack};

const LEVELS: [(Level, u8); 3] = [
    (Level::Behcs64, 6),
    (Level::Behcs256, 8),
    (Level::Behcs1024, 10),
];

fn convert(symbols: &[u16], from: u8, to: u8, n: usize) -> Vec<u16> {
    pack(&unpack(symbols, from, n), to)
}

#[test]
fn every_ordered_pair_and_every_composition_on_every_owner_input() {
    let mut pairs = 0usize;
    let mut compositions = 0usize;
    for (_, data) in common::inputs() {
        let n = data.len();
        for (li, wi) in LEVELS {
            let si = dbbh::to_level(&data, li);
            for (lj, wj) in LEVELS {
                let sj = dbbh::relate(&si, li, lj, n);
                assert_eq!(sj, dbbh::to_level(&data, lj));
                assert_eq!(convert(&si, wi, wj, n), sj);
                assert_eq!(dbbh::relate(&sj, lj, li, n), si);
                pairs += 1;
                for (lk, _) in LEVELS {
                    let via_j = dbbh::relate(&sj, lj, lk, n);
                    assert_eq!(via_j, dbbh::relate(&si, li, lk, n));
                    compositions += 1;
                }
            }
        }
    }
    assert_eq!(pairs, 28 * 9);
    assert_eq!(compositions, 28 * 27);
}
