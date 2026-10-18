//! The engine-free part of the `omniquant` quant adapter: `vectorFromEnvelope`.
//!
//! The quant projections themselves (`quantMetadata`'s `triple`/`polar`/`turbo`/`jl` modes) call the
//! external HyperBEHCS engine and are not reproduced here (see PROVENANCE.md); the JL magnitude the
//! G3 plane needs is produced only in that Node lane and is never fabricated. `vectorFromEnvelope`
//! is the part that computes from its arguments alone: it reads eight fixed metadata fields in order.

use g_planes::JsNumber;
use l0_edge::jsnum::Dbl;

const SIGN_BIT: u64 = 1 << 63;

/// The fixed metadata field order (`omniquant.mjs:22 META_FIELDS`). Decoders rely on it.
pub const META_FIELDS: [&str; 8] = [
    "room_id",
    "port_outer",
    "port_inner",
    "elapsed_ms",
    "stdout_len",
    "ok",
    "ts_ms",
    "job_seq",
];

/// An envelope flowing through the planes, with the metadata fields `vectorFromEnvelope` reads, the
/// `glyph` the G3 plane keys on, and the `authority` names the quant bus reads. An absent numeric
/// field is `None`, scored as `0` by `Number(env[k] ?? 0)`.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Envelope {
    pub glyph: String,
    pub room_id: Option<i64>,
    pub port_outer: Option<i64>,
    pub port_inner: Option<i64>,
    pub elapsed_ms: Option<i64>,
    pub stdout_len: Option<i64>,
    pub ok: Option<i64>,
    pub ts_ms: Option<i64>,
    pub job_seq: Option<i64>,
    pub authority: Vec<String>,
}

impl Envelope {
    /// The eight metadata fields in `META_FIELDS` order, absent fields as `0`.
    fn meta(&self) -> [i64; 8] {
        [
            self.room_id.unwrap_or(0),
            self.port_outer.unwrap_or(0),
            self.port_inner.unwrap_or(0),
            self.elapsed_ms.unwrap_or(0),
            self.stdout_len.unwrap_or(0),
            self.ok.unwrap_or(0),
            self.ts_ms.unwrap_or(0),
            self.job_seq.unwrap_or(0),
        ]
    }
}

/// `vectorFromEnvelope(env)` (omniquant.mjs:24-26): the eight metadata fields as `Number(env[k] ?? 0)`,
/// each held exactly as the binary64 JavaScript would hold for an integer-valued field.
pub fn vector_from_envelope(env: &Envelope) -> [JsNumber; 8] {
    env.meta().map(js_number_from_i64)
}

/// `Number(n)` for an integer-valued field, as a signed binary64 bit pattern.
fn js_number_from_i64(n: i64) -> JsNumber {
    let magnitude = JsNumber::from_dbl(Dbl::from_u64(n.unsigned_abs()));
    if n < 0 {
        JsNumber::from_bits(magnitude.to_bits() | SIGN_BIT)
    } else {
        magnitude
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn meta_order_is_fixed() {
        assert_eq!(META_FIELDS[0], "room_id");
        assert_eq!(META_FIELDS[7], "job_seq");
    }

    #[test]
    fn vector_reads_eight_fields_absent_as_zero() {
        let env = Envelope {
            room_id: Some(42),
            port_outer: Some(50042),
            port_inner: Some(7777),
            elapsed_ms: Some(1234),
            stdout_len: Some(256),
            ok: Some(1),
            ts_ms: Some(1_715_000_000_000),
            job_seq: Some(99),
            ..Envelope::default()
        };
        let v = vector_from_envelope(&env);
        assert_eq!(v[0], js_number_from_i64(42));
        assert_eq!(v[6], js_number_from_i64(1_715_000_000_000));
        // Absent field → 0.
        assert_eq!(
            vector_from_envelope(&Envelope::default())[0],
            js_number_from_i64(0)
        );
    }

    #[test]
    fn negative_field_sets_the_sign_bit() {
        assert_eq!(js_number_from_i64(-5).to_bits() & SIGN_BIT, SIGN_BIT);
        assert_eq!(js_number_from_i64(0).to_bits(), 0);
    }
}
