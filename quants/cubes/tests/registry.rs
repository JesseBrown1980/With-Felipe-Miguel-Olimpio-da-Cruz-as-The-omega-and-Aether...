//! Every owner line README.md and PROVENANCE.md quote, checked byte for byte at its line in the
//! vendored file. Slot 27's engines are located but not brought in: these quotes are its whole
//! record here.

mod common;

use common::vendor_lines;

const REGISTRY: &str = "Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp";
const ATLAS: &str = "Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md";

/// `(vendored file, first upstream line the file holds, upstream line, text)`.
fn check(path: &str, first: usize, line: usize, text: &str) {
    let lines = vendor_lines(path);
    assert_eq!(lines[line - first], text, "{path}:{line}");
}

#[test]
fn registry_rows_for_slots_21_and_25_to_28() {
    check(REGISTRY, 1, 27, "QUANT|n=21|id=Q-CUBE3200-ABSORB-v1|alias=canonical-3200-byte-quant-tuple|regime=LOSSY_NUMERIC_SKETCH+REFERENTIAL_LOOKUP|owner=Q-PRISM/docs/STAGE2-CUBE-ABSORPTION.md|json=0");
    check(REGISTRY, 1, 31, "QUANT|n=25|id=Q-WORD-GLYPH-BUCKET8-v1|alias=word-glyph+bucket-vector|regime=SEMANTIC_DISTILLATION+REFERENTIAL_LOOKUP|owner=Algorithms-of-Asolaria-liris-v2|json=0");
    check(REGISTRY, 1, 32, "QUANT|n=26|id=Q-SHARD-CUBE-v1|alias=shard-quant-cube|regime=SEMANTIC_DISTILLATION+LOSSY_NUMERIC_SKETCH|owner=what-is-asolaria-cubes+Algorithms-of-Asolaria-liris-v2|json=0");
    check(REGISTRY, 1, 33, "QUANT|n=27|id=Q-TENSOR-OMNISHANNON-COLLAPSE-v1|alias=tensor-collapse|regime=SEMANTIC_DISTILLATION|owner=what-is-asolaria/ASOLARIA-TENSOR-COLLAPSE-EXCAVATION-2026-06-16.md|json=0");
    check(REGISTRY, 1, 34, "QUANT|n=28|id=Q-WHITEROOM-GULP-MINT-v1|alias=white-room+GULP+cube-mint|regime=SEMANTIC_DISTILLATION|owner=Shannon-and-the-gnns-stage+asolaria-whiteroom-engine+post-100B-cubes|json=0");
}

#[test]
fn atlas_rows_for_slots_21_and_25_to_28() {
    check(ATLAS, 1, 131, "| 21 | `Q-CUBE3200-ABSORB-v1` | Q-PRISM Stage 2 | raw/derived feature window → canonical 3,200-byte tuple → cube/selector envelope | combined numeric sketch + referential cube |");
    check(ATLAS, 1, 154, "| 25 | `Q-WORD-GLYPH-BUCKET8-v1` | word glyph / token bucket vector | word→digest glyph plus 8 signed/clamped token buckets | semantic/referential sketch |");
    check(ATLAS, 1, 155, "| 26 | `Q-SHARD-CUBE-v1` | shard-quant cube | room/shard vectors folded through JL, Turbo, Polar and Triple into a cube descriptor | composed lossy sketch |");
    check(ATLAS, 1, 156, "| 27 | `Q-TENSOR-OMNISHANNON-COLLAPSE-v1` | tensor collapse | many nominal beats/waves → small set of signal-carrying beats/verdict dimensions | semantic inference/distillation |");
    check(ATLAS, 1, 157, "| 28 | `Q-WHITEROOM-GULP-MINT-v1` | white room + GULP/SUPER-GULP + cube mint | KEEP genius, COMPACT mistakes, drain bounded windows, mint persistent cubes/glyphs/receipts | semantic distillation + durable memory |");
}

#[test]
fn liris_v2_section_f() {
    let p = "Algorithms-of-Asolaria/liris/ALGORITHMS-CATALOG-LIRIS-2026-06-19-V2.md.lines-237-260";
    check(
        p,
        237,
        239,
        "`MEASURED`: Google Drive document -> cube ingest:",
    );
    check(p, 237, 245, "word_glyph = sha256(word)[0:8]");
    check(
        p,
        237,
        246,
        "bucket_vector = 8 signed token buckets, clamped 0..255",
    );
    check(p, 237, 256, "6*6*6*12 -> 28");
    check(p, 237, 257, "6*6*6*6*12*3 = 46656 -> 47");
    check(p, 237, 260, "`MEASURED`: shard-quant cube has `100` rooms, each with an 8-dim vector folded through JL, Turbo, polar, and triple/spherical codecs. It is descriptor/software-only in this pass.");
}

#[test]
fn stage2_contract_and_recorded_row() {
    let p = "Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control/docs/STAGE2-CUBE-ABSORPTION.md.lines-1-73";
    check(p, 1, 8, "**Canonical contract = Rust on the metal kernel (not Node).** `host8/qprism_cube_host8.rs` is the");
    check(p, 1, 11, "only. Both agree byte-for-byte: node PK `handle8` = FNV-1a-64(node_id) = `5bd9437e2a3fe005`");
    check(p, 1, 43, "QPRISMCUBE|handle8=5bd9437e2a3fe005|glyph=gly-stcI|node=qprism/cube/bcbl190626/SpanishBCBL/S5/1/12.5/5d8b1027…");
    check(p, 1, 45, "|win_start_s=12.5|win_dur_s=0.5|n_samples=25|feat_sha16=5d8b102753b7fcfb|tuple_sha16=969d2b5e47e97e3e");
}

/// Slot 27: engines located, not brought in (they read operator-local state; see PROVENANCE.md).
#[test]
fn slot_27_document_lines() {
    let p = "what-is-asolaria---how-do-we-get-reductions-in-everything/ASOLARIA-TENSOR-COLLAPSE-EXCAVATION-2026-06-16.md.lines-84-106";
    check(
        p,
        84,
        88,
        "The papers describe tensor collapse as a structured wave, not loose brainstorming:",
    );
    check(p, 84, 90, "- external opaque-target run: **`6×6×6×12`**");
    check(
        p,
        84,
        91,
        "- federation self-run: **`6×6×6×6×12` per wave, ×3 waves = `46,656` nominal beats**",
    );
    check(
        p,
        84,
        92,
        "- self-run collapse retained **`47`** signal-carrying beats",
    );
    let q = "what-is-asolaria---how-do-we-get-reductions-in-everything/cubes/TENSOR-COLLAPSE-PAPER-TO-RUNTIME-MAP.md.lines-27-28";
    check(q, 27, 28, "- Engines exist and are header-verified; this map asserts **file presence + header**, not a fresh live re-run. Held-safe / `descriptor_only` boundaries from the other cube docs still apply. **IT is slices.**");
}

#[test]
fn rotor_report_and_cube_readme() {
    let r = "Asolaria-hermes-work/room-rotor/hyperbehcs-d-drive-10000-room-rotor-latest.md";
    check(r, 1, 13, "| room_count | 10000 |");
    check(r, 1, 18, "| quant_shard_receipts | 100 |");
    let c = "what-is-asolaria---how-do-we-get-reductions-in-everything/cubes/README.md";
    check(c, 1, 45, "Each of the **100 shards** carries a `hyperbehcs.quantized_substrate_receipt.v1` that folds its **100 rooms** through four codecs:");
    check(
        c,
        1,
        52,
        "Each receipt is `descriptor_only`, `software_only`, and sha16-fingerprinted. Real sample:",
    );
}
