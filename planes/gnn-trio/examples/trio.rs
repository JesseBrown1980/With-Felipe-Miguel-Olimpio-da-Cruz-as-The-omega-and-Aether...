//! End-to-end run of the public G-plane trio over a synthetic envelope, so people can run it:
//!
//!   cargo run --example trio
//!   GNN_REVERSE_MASK_SET=/path/to/your-set.txt cargo run --example trio
//!
//! It never prints the mask set's contents (only its source and size), so pointing it at a real set
//! is safe. The JL magnitude is a supplied demo input, not a fabricated JL value: the real magnitude
//! comes from the operator's float code in the vendored Node lane against the HyperBEHCS engine, which
//! is absent here. The live `:4949` request path is absent too, and this reproduces that absence.

use gnn_trio::bpi_codec::{decode_frame, encode_frame};
use gnn_trio::quant_bus::{authority_quant, GnnTrioFields};
use gnn_trio::reverse_gain::is_negative;
use gnn_trio::{
    magnitude_from_decimal, transition, vector_from_envelope, Envelope, Latent, MaskSet, State,
    Trit, MASK_SET_ENV,
};

fn main() {
    let mask = match MaskSet::from_env() {
        Ok(m) => m,
        Err(e) => {
            eprintln!("could not read {MASK_SET_ENV}: {e}");
            std::process::exit(1);
        }
    };
    let source = match std::env::var_os(MASK_SET_ENV) {
        Some(_) => "operator set (GNN_REVERSE_MASK_SET)",
        None => "synthetic demo default",
    };
    println!("== G-plane trio (public runnable build) ==");
    println!(
        "mask set: {source}, {} identifiers (contents not printed)",
        mask.len()
    );

    // A synthetic envelope. The glyph decides the reverse-gain sign; the metadata feeds the vector.
    let env = Envelope {
        glyph: "synthetic-adversary-0001".to_string(),
        room_id: Some(42),
        port_outer: Some(50042),
        port_inner: Some(7777),
        elapsed_ms: Some(1234),
        stdout_len: Some(256),
        ok: Some(1),
        ts_ms: Some(1_715_000_000_000),
        job_seq: Some(99),
        authority: vec![
            "op_jesse".to_string(),
            "shannon".to_string(),
            "hermes".to_string(),
        ],
    };

    // omniquant: the metadata vector (eight fields, held as exact doubles).
    let vector = vector_from_envelope(&env);
    print!("\nvector_from_envelope:");
    for slot in &vector {
        print!(" {:016x}", slot.to_bits());
    }
    println!();

    // quant-bus: the authority bitmask.
    println!("authority_quant: {}", authority_quant(&env.authority));

    // G3 reverse-gain: score a mask-shaped and an honest-shaped synthetic glyph with supplied demo
    // magnitudes. (units, digits) is the exact supplied magnitude; the score is sign * magnitude.
    let mut state = State::default();
    let demo = [
        ("synthetic-adversary-0001", 25u64, 1u32),
        ("synthetic-honest-leak-0001", 25, 1),
    ];
    println!("\nG3 reverse-gain (magnitudes are supplied demo inputs, not computed JL values):");
    let mut last_masked_score = magnitude_from_decimal(25, 1);
    for (glyph, units, digits) in demo {
        let magnitude = magnitude_from_decimal(units, digits);
        let scored = state.score(glyph, magnitude, &mask);
        let verdict = if is_negative(scored.score) {
            "negative"
        } else {
            "positive"
        };
        println!(
            "  {glyph}: mask_flipped={} sign={} magnitude={} score_bits={:016x} ({verdict})",
            scored.mask_flipped,
            scored.sign.as_i8(),
            format_decimal(units, digits),
            scored.score.to_bits(),
        );
        if scored.mask_flipped {
            last_masked_score = scored.score;
        }

        // bpi-codec: emit and verify a frame row for this scored glyph.
        let sign = scored.sign.as_i8().to_string();
        let frame = encode_frame("RVGN", &[glyph, &sign, &format_decimal(units, digits)])
            .expect("encode frame");
        let decoded = decode_frame(&frame).expect("decode frame");
        println!("    frame: {frame}  (round-trip tag={})", decoded.tag);
    }

    // G4 GLSM transition (asolaria-g-planes, argument-only) fed supplied demo inputs, including the
    // G3 masked score as the reverse_gain antecedent. A demonstration of the downstream wiring on
    // supplied inputs, not a claim about live :4949 g4_state.
    let edge_weight = Some(magnitude_from_decimal(8, 1)); // 0.8
    let path_confidence = Some(magnitude_from_decimal(7, 1)); // 0.7
    let mut g4 = Latent::Described;
    g4 = transition(
        g4,
        edge_weight,
        path_confidence,
        Some(magnitude_from_decimal(0, 0)),
    );
    g4 = transition(
        g4,
        edge_weight,
        path_confidence,
        Some(magnitude_from_decimal(0, 0)),
    );
    g4 = transition(g4, edge_weight, path_confidence, Some(last_masked_score));
    println!(
        "\nG4 transition (supplied demo inputs incl. the G3 masked score): {}",
        g4.as_str()
    );

    // The trio composition default-closed path reproduces the on-disk :4949 absence: g1..g4 null.
    let trio = GnnTrioFields::default_closed();
    println!(
        "\ntrio composition (request-path absence reproduced): edge={:?} forward={:?} reverse={:?} glsm={:?}",
        trio.gnn_edge_quant, trio.gnn_forward_quant, trio.gnn_reverse_quant, trio.glsm_state,
    );

    // State snapshot with exact integer ratios.
    let snap = state.snapshot(&mask);
    println!(
        "\nstate: scored={} positive={} negative={} pos_ratio={}/{} neg_ratio={}/{} last_sign={} mask_glyph_count={}",
        snap.scored,
        snap.positive,
        snap.negative,
        snap.pos_ratio.num,
        snap.pos_ratio.den,
        snap.neg_ratio.num,
        snap.neg_ratio.den,
        snap.last_sign.as_i8(),
        snap.mask_glyph_count,
    );
    debug_assert_ne!(snap.last_sign, Trit::Zero);
}

/// `units / 10^digits` as a decimal string, integer arithmetic only.
fn format_decimal(units: u64, digits: u32) -> String {
    if digits == 0 {
        return units.to_string();
    }
    let scale = 10u64.pow(digits);
    let int = units / scale;
    let frac = units % scale;
    format!("{int}.{frac:0width$}", width = digits as usize)
}
