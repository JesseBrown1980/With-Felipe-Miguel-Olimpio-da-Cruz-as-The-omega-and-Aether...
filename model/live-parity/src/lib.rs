//! Scores recorded from the owner's live L0 (:4792) and L4 (:4793) servers on ACER, 2026-10-17
//! (`LIVE-CAPTURES.txt`, `LIVE-DAEMONS-RECEIPT.hbp`), and the Rust ports' readings of the same requests.

#![forbid(unsafe_code)]

/// The pid every recorded request used.
pub const PID: &str = "8467a937cba309f7";

/// One recorded request: the content scored, then `scores[0]` from :4792 and from :4793 as the servers printed them.
pub struct Capture {
    pub content: &'static str,
    pub l0_live: &'static str,
    pub l4_live: &'static str,
}

/// LIVE-CAPTURES.txt lines 1-6 (bodies A, B, C of LIVE-DAEMONS-HANDOFF, built as asolaria-score.mjs:112-115 builds them).
pub const CAPTURES: [Capture; 3] = [
    Capture {
        content: "hello",
        l0_live: "0.9415170550346375",
        l4_live: "0.5291563272476196",
    },
    Capture {
        content: "asolaria",
        l0_live: "0.9313657283782959",
        l4_live: "0.5291563868522644",
    },
    Capture {
        content: "the was the will and the is",
        l0_live: "0.9285072684288025",
        l4_live: "0.5291560888290405",
    },
];

/// round(decimal * 2^24) for a decimal string `0.<digits>`. A float32 score in [0.5, 1) is a multiple of 2^-24, and the
/// printed value is within 2^-54 of it, so this returns the server's float32 exactly in Q24.
pub fn decimal_to_q24(s: &str) -> i128 {
    let frac = s
        .strip_prefix("0.")
        .expect("a score in [0, 1) printed as 0.<digits>");
    let num: i128 = frac.parse().expect("decimal digits");
    let den = 10i128.pow(u32::try_from(frac.len()).expect("short"));
    (num * (1i128 << 24) * 2 + den) / (2 * den)
}

/// floor(q24 * 10^4 / 2^24 + 1/2): the toFixed(4) value asolaria-score.mjs:122,128 keeps, in e4 units.
pub fn q24_to_e4(q24: i128) -> i128 {
    (q24 * 10_000 * 2 + (1i128 << 24)) / (2i128 << 24)
}

/// The Rust readings for one capture: (L0 Q24, L4 Q24) on `[node(sha16(pid)), node(sha16(content))]`, edge `[0, 1]`.
pub fn rust_q24(content: &str) -> (i64, i64) {
    let nodes = l4_gslgnn::request_nodes(PID, content);
    let l0 = l0_edge::model::edge_scores(&nodes, &[(0, 1)]).expect("two nodes, one edge")[0];
    (l0, l4_gslgnn::score_request(PID, content).score_q24)
}
