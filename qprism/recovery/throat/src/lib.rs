//! Combined recovery throat — the Layer-3 coordinator.
//!
//! This is the piece the sequential `encode_p123`/`decode_p123` pipeline
//! deliberately does not provide: it SELECTS a recovery mode from the evidence
//! the caller actually holds and, when both modes' evidence is present, it
//! cross-validates the two independent recoveries against each other and against
//! the pinned original hash.
//!
//! It is bound to the real, verified recovery paths — [`decode_path1`] and
//! [`decode_path2_crt`] from the byte-identical `omega-path123` crate — and never
//! reimplements their math.
//!
//! Honest-math contract, enforced in code and not only in prose:
//!   * No path here manufactures information. Path 1 (`RetainedPath1`) returns
//!     bytes that were retained in an output window (LZ back-references);
//!     Path 2 (`CrtShadows`) reconstructs each symbol from two jointly-sufficient
//!     coprime CRT residues, a representation that is LARGER than the original —
//!     CRT expands, it never compresses.
//!   * SHA-256 is an integrity coordinate checked AFTER recovery. It is never a
//!     source. A hash alone cannot regenerate discarded bytes, and this
//!     coordinator never pretends that selecting a mode could.
//!   * The coordinator returns bytes ONLY on [`Outcome::Recovered`]. Every other
//!     outcome is [`Outcome::Held`] carrying the reason — missing authorization,
//!     missing or insufficient evidence, a decode failure, a cross-path
//!     disagreement, or a failed integrity check. It never guesses, never
//!     fabricates bytes to satisfy the pinned hash, and never falls back across
//!     modes to invent a result.
//!   * Recovery is attempted only under explicit [`Consent`].

#![forbid(unsafe_code)]

use omega_path123::{
    decode_path1, decode_path2_crt, deserialize_crt, deserialize_path1, sha256,
    unpack_symbols_to_bytes, CodecError,
};

/// Explicit authorization to attempt recovery. The coordinator holds without it.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Consent {
    Granted,
    Withheld,
}

/// What the caller can offer. Each variant carries exactly what its path needs
/// to recover — and nothing that could stand in for the missing original bytes.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Evidence {
    /// Nothing offered; the coordinator holds.
    None,
    /// Path 1: a serialized token stream over a retained output window.
    RetainedPath1 { tokens: Vec<u8>, original_len: usize },
    /// Path 2: serialized CRT residues (two shadows per symbol) plus the floor
    /// width, symbol count, and original byte length needed to unpack.
    CrtShadows {
        residues: Vec<u8>,
        bits: u8,
        symbol_count: usize,
        original_len: usize,
    },
    /// Both modes' evidence; recover by each and require they agree with one
    /// another and with the pinned hash before accepting.
    Both {
        path1_tokens: Vec<u8>,
        path1_original_len: usize,
        crt_residues: Vec<u8>,
        crt_bits: u8,
        crt_symbol_count: usize,
        crt_original_len: usize,
    },
}

/// Which recovery mode produced the accepted bytes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Provenance {
    RetainedPath1,
    CrtShadows,
    CrossValidated,
}

/// Why the coordinator produced no bytes. Every non-recovery path lands here.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HoldReason {
    /// Recovery was not authorized.
    ConsentWithheld,
    /// No evidence, or not enough of it, was offered.
    InsufficientEvidence,
    /// A selected path could not decode the supplied evidence.
    DecodeFailed,
    /// Both modes decoded but produced different bytes (inconsistent results).
    CrossPathDisagreement,
    /// Recovered bytes did not hash to the pinned original SHA-256.
    ConsistencyMismatch,
}

/// The coordinator's verdict: recovered bytes, or held with a reason.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Outcome {
    /// Recovery succeeded and the bytes hash to the pinned original.
    Recovered { bytes: Vec<u8>, via: Provenance },
    /// No bytes were produced; the reason says why.
    Held(HoldReason),
}

/// A recovery request: the pinned original hash, the evidence, and consent.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Request {
    pub original_sha256: [u8; 32],
    pub evidence: Evidence,
    pub consent: Consent,
}

fn recover_path1(tokens: &[u8], original_len: usize) -> Result<Vec<u8>, CodecError> {
    let parsed = deserialize_path1(tokens, original_len)?;
    decode_path1(&parsed, original_len)
}

fn recover_crt(
    residues: &[u8],
    bits: u8,
    symbol_count: usize,
    original_len: usize,
) -> Result<Vec<u8>, CodecError> {
    let parsed = deserialize_crt(residues, symbol_count)?;
    let symbols = decode_path2_crt(&parsed, bits)?;
    unpack_symbols_to_bytes(&symbols, bits, original_len)
}

fn accept(bytes: Vec<u8>, pinned: &[u8; 32], via: Provenance) -> Outcome {
    if &sha256(&bytes) == pinned {
        Outcome::Recovered { bytes, via }
    } else {
        Outcome::Held(HoldReason::ConsistencyMismatch)
    }
}

/// Coordinate recovery across the available modes under the honest-math contract.
pub fn recover(request: &Request) -> Outcome {
    if request.consent != Consent::Granted {
        return Outcome::Held(HoldReason::ConsentWithheld);
    }
    match &request.evidence {
        Evidence::None => Outcome::Held(HoldReason::InsufficientEvidence),
        Evidence::RetainedPath1 {
            tokens,
            original_len,
        } => match recover_path1(tokens, *original_len) {
            Ok(bytes) => accept(bytes, &request.original_sha256, Provenance::RetainedPath1),
            Err(_) => Outcome::Held(HoldReason::DecodeFailed),
        },
        Evidence::CrtShadows {
            residues,
            bits,
            symbol_count,
            original_len,
        } => match recover_crt(residues, *bits, *symbol_count, *original_len) {
            Ok(bytes) => accept(bytes, &request.original_sha256, Provenance::CrtShadows),
            Err(_) => Outcome::Held(HoldReason::DecodeFailed),
        },
        Evidence::Both {
            path1_tokens,
            path1_original_len,
            crt_residues,
            crt_bits,
            crt_symbol_count,
            crt_original_len,
        } => {
            let first = recover_path1(path1_tokens, *path1_original_len);
            let second = recover_crt(crt_residues, *crt_bits, *crt_symbol_count, *crt_original_len);
            match (first, second) {
                (Ok(a), Ok(b)) if a == b => {
                    accept(a, &request.original_sha256, Provenance::CrossValidated)
                }
                (Ok(_), Ok(_)) => Outcome::Held(HoldReason::CrossPathDisagreement),
                _ => Outcome::Held(HoldReason::DecodeFailed),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use omega_path123::{
        encode_path1, encode_path2_crt, pack_bytes_to_symbols, serialize_crt, serialize_path1,
        P1Mode,
    };

    const SAMPLE: &[u8] = b"Asolaria recovery throat: retained bytes and CRT shadows, no magic.";

    fn path1_evidence(data: &[u8]) -> Evidence {
        let tokens = serialize_path1(&encode_path1(data, P1Mode::Auto).unwrap());
        Evidence::RetainedPath1 {
            tokens,
            original_len: data.len(),
        }
    }

    fn crt_evidence(data: &[u8], bits: u8) -> Evidence {
        let symbols = pack_bytes_to_symbols(data, bits).unwrap();
        let residues = serialize_crt(&encode_path2_crt(&symbols, bits).unwrap());
        Evidence::CrtShadows {
            residues,
            bits,
            symbol_count: symbols.len(),
            original_len: data.len(),
        }
    }

    fn req(evidence: Evidence, data: &[u8], consent: Consent) -> Request {
        Request {
            original_sha256: sha256(data),
            evidence,
            consent,
        }
    }

    #[test]
    fn path1_roundtrip_recovers_retained_bytes() {
        let out = recover(&req(path1_evidence(SAMPLE), SAMPLE, Consent::Granted));
        assert_eq!(
            out,
            Outcome::Recovered {
                bytes: SAMPLE.to_vec(),
                via: Provenance::RetainedPath1
            }
        );
    }

    #[test]
    fn crt_roundtrip_reconstructs_from_two_shadows() {
        let out = recover(&req(crt_evidence(SAMPLE, 8), SAMPLE, Consent::Granted));
        assert_eq!(
            out,
            Outcome::Recovered {
                bytes: SAMPLE.to_vec(),
                via: Provenance::CrtShadows
            }
        );
    }

    #[test]
    fn both_modes_cross_validate_when_they_agree() {
        let symbols = pack_bytes_to_symbols(SAMPLE, 8).unwrap();
        let ev = Evidence::Both {
            path1_tokens: serialize_path1(&encode_path1(SAMPLE, P1Mode::Auto).unwrap()),
            path1_original_len: SAMPLE.len(),
            crt_residues: serialize_crt(&encode_path2_crt(&symbols, 8).unwrap()),
            crt_bits: 8,
            crt_symbol_count: symbols.len(),
            crt_original_len: SAMPLE.len(),
        };
        let out = recover(&req(ev, SAMPLE, Consent::Granted));
        assert_eq!(
            out,
            Outcome::Recovered {
                bytes: SAMPLE.to_vec(),
                via: Provenance::CrossValidated
            }
        );
    }

    #[test]
    fn consent_withheld_holds_without_touching_evidence() {
        let out = recover(&req(path1_evidence(SAMPLE), SAMPLE, Consent::Withheld));
        assert_eq!(out, Outcome::Held(HoldReason::ConsentWithheld));
    }

    #[test]
    fn no_evidence_holds_and_never_fabricates() {
        let out = recover(&Request {
            original_sha256: sha256(SAMPLE),
            evidence: Evidence::None,
            consent: Consent::Granted,
        });
        assert_eq!(out, Outcome::Held(HoldReason::InsufficientEvidence));
    }

    #[test]
    fn wrong_pinned_hash_holds_on_failed_integrity_check() {
        let mut pinned = sha256(SAMPLE);
        pinned[0] ^= 0xFF;
        let out = recover(&Request {
            original_sha256: pinned,
            evidence: path1_evidence(SAMPLE),
            consent: Consent::Granted,
        });
        assert_eq!(out, Outcome::Held(HoldReason::ConsistencyMismatch));
    }

    #[test]
    fn tampered_path1_evidence_is_held() {
        let mut ev = path1_evidence(SAMPLE);
        if let Evidence::RetainedPath1 { tokens, .. } = &mut ev {
            tokens[0] ^= 0xFF;
        }
        let out = recover(&req(ev, SAMPLE, Consent::Granted));
        assert!(matches!(
            out,
            Outcome::Held(HoldReason::DecodeFailed | HoldReason::ConsistencyMismatch)
        ));
    }

    #[test]
    fn cross_path_disagreement_holds() {
        // Path 1 carries the true bytes; Path 2 carries a different message.
        // Both decode, but they disagree, so the coordinator holds.
        let other = b"a different message entirely, same length budget here ok!!!!!!!!!!";
        let symbols = pack_bytes_to_symbols(other, 8).unwrap();
        let ev = Evidence::Both {
            path1_tokens: serialize_path1(&encode_path1(SAMPLE, P1Mode::Auto).unwrap()),
            path1_original_len: SAMPLE.len(),
            crt_residues: serialize_crt(&encode_path2_crt(&symbols, 8).unwrap()),
            crt_bits: 8,
            crt_symbol_count: symbols.len(),
            crt_original_len: other.len(),
        };
        let out = recover(&req(ev, SAMPLE, Consent::Granted));
        assert_eq!(out, Outcome::Held(HoldReason::CrossPathDisagreement));
    }

    #[test]
    fn crt_shadows_expand_rather_than_compress() {
        // Two u16 residues per symbol is strictly larger than the source: the
        // reconstruction carries its own information, it does not conjure it.
        let symbols = pack_bytes_to_symbols(SAMPLE, 8).unwrap();
        let residues = serialize_crt(&encode_path2_crt(&symbols, 8).unwrap());
        assert!(residues.len() > SAMPLE.len());
    }
}
