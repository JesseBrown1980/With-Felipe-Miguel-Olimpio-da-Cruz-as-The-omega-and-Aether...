//! The fabric-thinker GNN wire of bigpickle-rebuild@c592599 `src/fabric-thinker-gnn.mjs:27-184`,
//! with the `descriptorInfer` it composes (`src/fabric-thinker.mjs:75-105`).
//!
//! `realInfer` posts a two-node sha graph to a GNN server and maps its score to a codepoint and a
//! Brown-Hilbert index; `realInferEnsemble` runs it against L0 (:4792) and L4 (:4793) and takes
//! the mean. Here the L0 request is scored in process ([`crate::l0_request`]); the L4 reply is a
//! caller input ([`GnnReply`]), as L4 is not ported in this crate. The HTTP transport
//! (`postInfer` :55-82) and the health probe (`checkReady` :188-212) have no in-process
//! counterpart. Neither server on disk replies with `final_verdict`, `allow`, `cascade_depth`,
//! `layers` or `elapsed_ms` (B256 services/gnn-sidecar/inference_server.py:25 replies
//! `{scores, ok}`; FN src/gslgnn_inference_server.py:55-62 adds `model`, `checkpoint`,
//! `checkpoint_sha256_first16` and `disclosure`, which `realInfer` does not read), so the fields
//! `realInfer` copies (:128-132, :138) are absent, and the real path's `path` is `'FALLBACK'`.
//! `hilbertEncode` (src/hilbert.mjs:144-155) is `hrm_mtp::hilbert::hilbert_encode` (model/hrm-mtp).

use crate::jsnum_ext::q24_to_dbl;
use crate::l0_request::score_q24;
use crate::sha::{hex, sha256};
use l0_edge::jsnum::Dbl;

/// `algorithm` of a real-path result (:123).
pub const REAL_ALGORITHM: &str = "fabric-thinker-gnn-real.v1";
/// `algorithm` of a fallback result (:149).
pub const FALLBACK_ALGORITHM: &str = "fabric-thinker-gnn-fallback-to-sha.v1";
/// `algorithm` of `descriptorInfer` (fabric-thinker.mjs:94).
pub const DESCRIPTOR_ALGORITHM: &str = "fabric-thinker-descriptor.v1";
/// The real path's `path` (:138): `gnn_result.allow ? 'HIT' : 'FALLBACK'` with `allow` absent.
pub const REAL_PATH: &str = "FALLBACK";

/// `pidQueryToGraph(pid, query)` (:31-51), with features as bytes (feature = byte / 255).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PidQueryGraph {
    /// `[node_pid, node_query]`: bytes 0..6 of sha256(pid) and of sha256(query).
    pub nodes: [[u8; 6]; 2],
    /// Bytes 0..3 of sha256(pid + '|' + query).
    pub edge_features: [u8; 3],
    /// `pid_hash_sha8`.
    pub pid_hash_sha8: String,
    /// `query_hash_sha8`.
    pub query_hash_sha8: String,
    /// `edge_hash_sha8`, the real path's `graph_sig` (:141).
    pub edge_hash_sha8: String,
}

/// `pidQueryToGraph(pid, query)` (:31-51).
pub fn pid_query_to_graph(pid: &str, query: &str) -> PidQueryGraph {
    let pid_hash = sha256(pid.as_bytes());
    let query_hash = sha256(query.as_bytes());
    let edge_hash = sha256(format!("{pid}|{query}").as_bytes());
    let mut nodes = [[0u8; 6]; 2];
    nodes[0].copy_from_slice(&pid_hash[..6]);
    nodes[1].copy_from_slice(&query_hash[..6]);
    PidQueryGraph {
        nodes,
        edge_features: [edge_hash[0], edge_hash[1], edge_hash[2]],
        pid_hash_sha8: hex(&pid_hash[..4]),
        query_hash_sha8: hex(&query_hash[..4]),
        edge_hash_sha8: hex(&edge_hash[..4]),
    }
}

/// `path` of a descriptor (fabric-thinker.mjs:101).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DescriptorPath {
    /// `confidence >= 0.5`.
    Hit,
    /// Below 0.5.
    Fallback,
}

impl DescriptorPath {
    /// The row text.
    pub fn as_str(self) -> &'static str {
        match self {
            DescriptorPath::Hit => "HIT",
            DescriptorPath::Fallback => "FALLBACK",
        }
    }
}

/// `descriptorInfer(pid, query, opts)` (fabric-thinker.mjs:75-105); `algorithm` is
/// [`DESCRIPTOR_ALGORITHM`] and `descriptor_only` is true.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Descriptor {
    /// `pid`.
    pub pid: String,
    /// `query_sha8`: sha256(query) hex, first 8.
    pub query_sha8: String,
    /// `confidence = seed.readUInt32BE(0) / 0xffffffff`, seed = sha256(`${pid}|${query}`).
    pub confidence: Dbl,
    /// `cp = 2 + (seed.readUInt16BE(4) % 1022)`.
    pub cp: u32,
    /// `bh_3d_idx = hilbertEncode([cp & 0xf, (cp >> 4) & 0xf, (cp >> 8) & 0x3], {3, 4})`.
    pub bh_3d_idx: i64,
    /// `verdict_glyph`: seed hex, first 16.
    pub verdict_glyph: String,
    /// `path`.
    pub path: DescriptorPath,
    /// `ts_iso` (`opts.ts_iso`, supplied by the caller: the clock lives at the boundary).
    pub ts_iso: String,
}

/// Why `realInfer` rejects.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum InferError {
    /// `pid` is empty: descriptorInfer throws TypeError (fabric-thinker.mjs:76-78).
    PidNotNonEmptyString,
    /// The server was unreachable and `opts.fallback === false` (:108-110).
    Unreachable(String),
}

/// `hilbertEncode(coords, { dimensions: 3, bits: 4 })` (:118-121; fabric-thinker.mjs:87-90).
fn bh_3d_idx(coords: [i64; 3]) -> i64 {
    hrm_mtp::hilbert::hilbert_encode(&coords, 3, 4).expect("three coordinates below 16")
}

/// `[(cp >> 0) & 0xf, (cp >> 4) & 0xf, (cp >> 8) & 0x3]` (:119; fabric-thinker.mjs:88).
fn cp_coords(cp: u32) -> [i64; 3] {
    let cp = i64::from(cp);
    [cp & 0xf, (cp >> 4) & 0xf, (cp >> 8) & 0x3]
}

/// `descriptorInfer(pid, query, { ts_iso })` (fabric-thinker.mjs:75-105). Inputs are strings, so
/// the only TypeError left is an empty `pid`.
pub fn descriptor_infer(pid: &str, query: &str, ts_iso: &str) -> Result<Descriptor, InferError> {
    if pid.is_empty() {
        return Err(InferError::PidNotNonEmptyString);
    }
    let seed = sha256(format!("{pid}|{query}").as_bytes());
    let word = u64::from(u32::from_be_bytes([seed[0], seed[1], seed[2], seed[3]]));
    let confidence = Dbl::from_ratio(word, 0xffff_ffff);
    let cp = 2 + u32::from(u16::from_be_bytes([seed[4], seed[5]])) % 1022;
    let path = if confidence >= Dbl::from_ratio(1, 2) {
        DescriptorPath::Hit
    } else {
        DescriptorPath::Fallback
    };
    Ok(Descriptor {
        pid: pid.to_string(),
        query_sha8: hex(&sha256(query.as_bytes())[..4]),
        confidence,
        cp,
        bh_3d_idx: bh_3d_idx(cp_coords(cp)),
        verdict_glyph: hex(&seed[..8]),
        path,
        ts_iso: ts_iso.to_string(),
    })
}

/// The `scores` field of a GNN server reply, as `realInfer` reads it (:115-116).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ReplyScores {
    /// `typeof scores === 'number'`.
    Number(Dbl),
    /// An array of numbers (both servers on disk reply with a list of floats).
    Array(Vec<Dbl>),
    /// Anything else, or absent: the score is 0.5.
    Other,
}

/// A GNN server's answer to the POST /infer of `realInfer`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum GnnReply {
    /// The request failed (connection error or timeout): `String(e.message || e)`.
    Unreachable(String),
    /// The server answered: `ok` and `scores` of the parsed reply.
    Answered {
        /// `gnn_result.ok` is truthy.
        ok: bool,
        /// `gnn_result.scores`.
        scores: ReplyScores,
    },
}

/// The server `realInfer` asks.
#[derive(Clone, Copy, Debug)]
pub enum Voter<'a> {
    /// The L0 server (:4792), scored in process: `{ok: true, scores: [l0]}`.
    L0InProcess,
    /// A server whose reply the caller supplies (the L4 server on :4793).
    Reply(&'a GnnReply),
}

/// `opts` of `realInfer` that change its result.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RealInferOpts {
    /// `opts.ts_iso`.
    pub ts_iso: String,
    /// `opts.fallback !== false` (:94).
    pub fallback: bool,
}

/// The result of `realInfer` when the server answered ok (:122-143). `algorithm` is
/// [`REAL_ALGORITHM`], `path` is [`REAL_PATH`], `descriptor_only` false, `gnn_real` true, and
/// the reply fields absent from both servers (`gnn_verdict` .. `gnn_elapsed_ms`) are `undefined`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RealOutcome {
    /// `pid`.
    pub pid: String,
    /// `query_sha8` of the descriptor.
    pub query_sha8: String,
    /// `gnn_score` and `confidence`; `None` (`undefined`) when `scores` is an empty array.
    pub gnn_score: Option<Dbl>,
    /// `cp = Math.max(2, Math.min(1023, Math.round(score * 1024)))`; `None` is NaN.
    pub cp: Option<u32>,
    /// `bh_3d_idx` of cp (NaN codepoints give coordinates `[0, 0, 0]`).
    pub bh_3d_idx: i64,
    /// `verdict_glyph` of the descriptor.
    pub verdict_glyph: String,
    /// `graph_sig = edge_hash_sha8`.
    pub graph_sig: String,
    /// `ts_iso`.
    pub ts_iso: String,
}

/// The result of `realInfer` without an ok reply (:147-153): the descriptor with `algorithm`
/// [`FALLBACK_ALGORITHM`], `gnn_real` false and `fallback_to_sha_stub` true.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FallbackOutcome {
    /// The descriptor fields.
    pub stub: Descriptor,
    /// `gnn_error`: the request error, `None` (`null`) when the server answered without ok.
    pub gnn_error: Option<String>,
}

/// A fulfilled `realInfer`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RealInfer {
    /// The server answered ok.
    Real(RealOutcome),
    /// The descriptor fallback.
    Fallback(FallbackOutcome),
}

/// `realInfer(pid, query, opts)` (:90-154).
pub fn real_infer(
    pid: &str,
    query: &str,
    voter: Voter<'_>,
    opts: &RealInferOpts,
) -> Result<RealInfer, InferError> {
    let stub = descriptor_infer(pid, query, &opts.ts_iso)?;
    let graph = pid_query_to_graph(pid, query);
    let l0_reply;
    let reply = match voter {
        Voter::L0InProcess => {
            l0_reply = GnnReply::Answered {
                ok: true,
                scores: ReplyScores::Array(vec![q24_to_dbl(score_q24(&graph.nodes))]),
            };
            &l0_reply
        }
        Voter::Reply(reply) => reply,
    };
    let (ok, scores, gnn_error) = match reply {
        GnnReply::Unreachable(error) => {
            if !opts.fallback {
                return Err(InferError::Unreachable(error.clone()));
            }
            (false, None, Some(error.clone()))
        }
        GnnReply::Answered { ok, scores } => (*ok, Some(scores), None),
    };
    let Some(scores) = scores.filter(|_| ok) else {
        return Ok(RealInfer::Fallback(FallbackOutcome { stub, gnn_error }));
    };
    let score = match scores {
        ReplyScores::Number(score) => Some(*score),
        ReplyScores::Array(list) => list.first().copied(),
        ReplyScores::Other => Some(Dbl::from_ratio(1, 2)),
    };
    let cp = score.map(|s| {
        let scaled = s * Dbl::from_u64(1024);
        // Math.min(1023, Math.round(x)) is 1023 for every x >= 1023.5; js_round is exact below 2^60.
        if scaled >= Dbl::from_u64(1024) {
            return 1023;
        }
        scaled.js_round().clamp(2, 1023) as u32
    });
    Ok(RealInfer::Real(RealOutcome {
        pid: pid.to_string(),
        query_sha8: stub.query_sha8,
        gnn_score: score,
        cp,
        bh_3d_idx: bh_3d_idx(cp.map_or([0, 0, 0], cp_coords)),
        verdict_glyph: stub.verdict_glyph,
        graph_sig: graph.edge_hash_sha8,
        ts_iso: opts.ts_iso.clone(),
    }))
}

/// `realInferEnsemble(pid, queryText, opts)` (:167-184).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnsembleOutcome {
    /// `l0_score`.
    pub l0_score: Dbl,
    /// `l4_score`.
    pub l4_score: Dbl,
    /// `(l0_score + l4_score) / 2`.
    pub ensemble_score: Dbl,
    /// At least one voter returned the real path.
    pub gnn_real: bool,
}

/// `typeof r.gnn_score === 'number' ? r.gnn_score : (typeof r.score === 'number' ? r.score : 0)`
/// (:175-176); no result shape carries `score`, and a rejection becomes `{score: 0}` (:172-173).
fn voter_score(result: &Result<RealInfer, InferError>) -> Dbl {
    match result {
        Ok(RealInfer::Real(real)) => real.gnn_score.unwrap_or(Dbl::ZERO),
        _ => Dbl::ZERO,
    }
}

/// `realInferEnsemble(pid, queryText, opts)` (:167-184): L0 in process, L4 from `l4_reply`.
pub fn real_infer_ensemble(
    pid: &str,
    query: &str,
    l4_reply: &GnnReply,
    opts: &RealInferOpts,
) -> EnsembleOutcome {
    real_infer_ensemble_with(pid, query, Voter::L0InProcess, Voter::Reply(l4_reply), opts)
}

/// `realInferEnsemble` with both voters named, as `opts.l0_port` / `opts.l4_port` select them
/// upstream (:169-170).
pub fn real_infer_ensemble_with(
    pid: &str,
    query: &str,
    l0_voter: Voter<'_>,
    l4_voter: Voter<'_>,
    opts: &RealInferOpts,
) -> EnsembleOutcome {
    let l0 = real_infer(pid, query, l0_voter, opts);
    let l4 = real_infer(pid, query, l4_voter, opts);
    let (l0_score, l4_score) = (voter_score(&l0), voter_score(&l4));
    let is_real = |r: &Result<RealInfer, InferError>| matches!(r, Ok(RealInfer::Real(_)));
    EnsembleOutcome {
        l0_score,
        l4_score,
        ensemble_score: (l0_score + l4_score) / Dbl::from_u64(2),
        gnn_real: is_real(&l0) || is_real(&l4),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(fallback: bool) -> RealInferOpts {
        RealInferOpts {
            ts_iso: "2026-10-17T00:00:00.000Z".to_string(),
            fallback,
        }
    }

    #[test]
    fn an_empty_pid_rejects_and_counts_as_zero() {
        assert_eq!(
            real_infer("", "q", Voter::L0InProcess, &opts(true)),
            Err(InferError::PidNotNonEmptyString)
        );
        let e = real_infer_ensemble("", "q", &GnnReply::Unreachable("x".into()), &opts(true));
        assert_eq!(
            (e.l0_score, e.l4_score, e.gnn_real),
            (Dbl::ZERO, Dbl::ZERO, false)
        );
    }

    #[test]
    fn unreachable_without_fallback_rejects() {
        let reply = GnnReply::Unreachable("connect ECONNREFUSED".into());
        assert_eq!(
            real_infer("p", "q", Voter::Reply(&reply), &opts(false)),
            Err(InferError::Unreachable("connect ECONNREFUSED".into()))
        );
        match real_infer("p", "q", Voter::Reply(&reply), &opts(true)) {
            Ok(RealInfer::Fallback(f)) => {
                assert_eq!(f.gnn_error.as_deref(), Some("connect ECONNREFUSED"))
            }
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn an_empty_score_list_gives_nan_cp_and_index_zero() {
        let reply = GnnReply::Answered {
            ok: true,
            scores: ReplyScores::Array(Vec::new()),
        };
        match real_infer("p", "q", Voter::Reply(&reply), &opts(true)) {
            Ok(RealInfer::Real(r)) => {
                assert_eq!((r.gnn_score, r.cp, r.bh_3d_idx), (None, None, 0));
            }
            other => panic!("{other:?}"),
        }
    }
}
