//! The engine-free part of `quant-bus`: the 16-slot authority bitmask and the default-closed shape
//! of the G1/G2/G3/G4 + GLSM composition.
//!
//! `enrichEnvelope`'s quant tails (`polar`/`turbo`/`js`/`triple`) call the external engine and are not
//! reproduced (PROVENANCE.md). `authorityQuant` computes from its arguments alone. The trio
//! composition (`_enrichGnnTrioSync`) is lazy and default-closed: against the on-disk system the
//! `:4949` handler and the G1/G2/G4 planes are absent, so the four trio fields come back empty
//! strings. That absence is reproduced here, not substituted with fabricated values (OWNER-RULES 7j).

/// The authority bitmask field order (`quant-bus.mjs:24-41 AUTHORITY_FIELDS`), fixed for cross-plane
/// determinism. The operator role tokens `op_jesse`/`op_rayssa` are authorized to publish as written
/// (OWNER-RULES 5/37); `connor` is the fictional-persona slot label of OWNER-RULES 7j, not contact data.
pub const AUTHORITY_FIELDS: [&str; 16] = [
    "op_jesse",
    "op_rayssa",
    "shannon",
    "hermes",
    "artemis",
    "big_pickle",
    "omniflywheel",
    "omnispindle",
    "connor",
    "pi",
    "opencode",
    "space_deck",
    "space_agent",
    "foundation",
    "quintuple",
    "fabric",
];

/// `'0'.repeat(AUTHORITY_FIELDS.length)` (quant-bus.mjs:43): the all-closed bitmask.
pub fn empty_authority() -> String {
    "0".repeat(AUTHORITY_FIELDS.len())
}

/// `authorityQuant` (quant-bus.mjs:96-111) as a 16-character `0`/`1` string: slot `i` is `1` when
/// `AUTHORITY_FIELDS[i]` is among the supplied on-names. Both upstream inputs reduce to this set of
/// on-names: the array form lists them, the object form takes each key with a truthy value.
pub fn authority_quant<S: AsRef<str>>(on_names: &[S]) -> String {
    AUTHORITY_FIELDS
        .iter()
        .map(|field| {
            if on_names.iter().any(|name| name.as_ref() == *field) {
                '1'
            } else {
                '0'
            }
        })
        .collect()
}

/// The four trio fields `_enrichGnnTrioSync` attaches (quant-bus.mjs:144-148).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct GnnTrioFields {
    pub gnn_edge_quant: String,
    pub gnn_forward_quant: String,
    pub gnn_reverse_quant: String,
    pub glsm_state: String,
}

impl GnnTrioFields {
    /// The default-closed result (all four fields empty), reproducing the on-disk request path where
    /// `queryFabricGNN` resolves g1..g4 to null and `score()` returns `g4_state: null`. The runnable
    /// G3 surface is the direct `reverse_gain::State::score` path, not this composition path.
    pub fn default_closed() -> GnnTrioFields {
        GnnTrioFields::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_is_sixteen_zeros() {
        assert_eq!(empty_authority(), "0000000000000000");
        assert_eq!(empty_authority().len(), AUTHORITY_FIELDS.len());
    }

    #[test]
    fn authority_bitmask_sets_named_slots() {
        // op_jesse (0), shannon (2), hermes (3).
        assert_eq!(
            authority_quant(&["op_jesse", "shannon", "hermes"]),
            "1011000000000000"
        );
        // quintuple (14), fabric (15).
        assert_eq!(
            authority_quant(&["quintuple", "fabric"]),
            "0000000000000011"
        );
        // An unknown name sets nothing.
        assert_eq!(authority_quant(&["not-a-field"]), empty_authority());
        assert_eq!(authority_quant::<&str>(&[]), empty_authority());
    }

    #[test]
    fn trio_default_closed_is_four_empty_fields() {
        let fields = GnnTrioFields::default_closed();
        assert!(fields.gnn_edge_quant.is_empty());
        assert!(fields.gnn_forward_quant.is_empty());
        assert!(fields.gnn_reverse_quant.is_empty());
        assert!(fields.glsm_state.is_empty());
    }
}
