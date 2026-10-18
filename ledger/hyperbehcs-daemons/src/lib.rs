//! Integer hot-lane ports of the pure decision logic of the owner's two HyperBEHCS daemons, as
//! delivered from the ACER seat on 2026-10-17:
//!
//! - `vote_quorum` (feature `vote-quorum`, now the default; owner decision 2026-10-18, PROVENANCE.md):
//!   `asolaria-vote-quorum-daemon.py` (:4952) `QUORUM_RULES` (lines 51-61), `is_authorized`
//!   (118-123), `evaluate_quorum` (125-163), the voter-already-cast check (237-239) and the
//!   outcome-row rule (108-116, 247).
//! - `cosign_chain`: `asolaria-cosign-chain-daemon.py` (:4953) `chain_head` (34-53) and
//!   `append_row` (55-74): next seq, antecedents, `ts` and `appended_by_daemon` defaults, row_hash.
//! - `pyjson`: the hash pre-image text of line 70 (`json.dumps(..., sort_keys=True,
//!   ensure_ascii=False)`), built for strings, integers, lists and objects. Nothing here parses JSON.
//! - `iso_time`: the `ts` text of line 31 for a whole-second UTC instant.
//!
//! No I/O, no clock, no float. The daemons' HTTP handlers and ledger files stay in the Python
//! cold lane, unchanged.

#![no_std]
#![forbid(unsafe_code)]

extern crate alloc;

pub mod cosign_chain;
pub mod iso_time;
pub mod pyjson;

/// `src/vote_quorum.rs` carries upstream line 46 as `QUINTUPLE`; vendored on the owner decision of
/// 2026-10-18 (PROVENANCE.md). The `vote-quorum` feature is default; `--no-default-features` drops it.
#[cfg(feature = "vote-quorum")]
#[rustfmt::skip]
pub mod vote_quorum;
