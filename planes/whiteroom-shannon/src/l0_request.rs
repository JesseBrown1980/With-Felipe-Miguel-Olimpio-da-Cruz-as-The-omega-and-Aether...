//! The two-node sha graphs the planes POST to the L0 server on port 4792, scored in process.
//!
//! Upstream builds `{nodes: [[b0/255 .. b5/255], [b6/255 .. b11/255]], edges: [[0, 1]],
//! edge_features: [[e0/255, e1/255, e2/255]]}` from SHA-256 bytes (liris-whiteroom-engine.mjs:113-119,
//! fabric-thinker-gnn.mjs:31-51). The server, inference_server.py:21-25, checks that each edge has
//! three features and runs `MODEL(nodes, edges)`; the edge features do not enter the model. Here the
//! node features go to `l0_edge::model::score_pair` (model/l0-edge), the Q24 port of that MODEL.

use l0_edge::model::score_pair;

/// `b / 255` as Q24, rounded half up once (`2^24 * b / 255` is never a tie: 255 is odd).
pub fn byte_q24(b: u8) -> i64 {
    ((i64::from(b) << 25) + 255) / 510
}

/// The L0 score, Q24 in `0..=2^24`, of the graph `nodes = [n0 / 255, n1 / 255]`, edges `[[0, 1]]`:
/// the single entry of the `scores` list inference_server.py:25 returns for that graph.
pub fn score_q24(nodes: &[[u8; 6]; 2]) -> i64 {
    let q = |row: &[u8; 6]| row.map(byte_q24);
    score_pair(&q(&nodes[0]), &q(&nodes[1]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn byte_q24_is_the_rounded_ratio() {
        assert_eq!(byte_q24(0), 0);
        assert_eq!(byte_q24(255), 1 << 24);
        for b in 0..=255u8 {
            let exact_twice = (i128::from(b) << 25) * 2; // 2 * 2^24 * b * 2, compared against 255 * (2q +- 1) * 2
            let q = i128::from(byte_q24(b));
            assert!(255 * (2 * q - 1) * 2 <= exact_twice && exact_twice < 255 * (2 * q + 1) * 2);
        }
    }

    #[test]
    fn scores_lie_in_the_unit_interval() {
        let s = score_q24(&[[0, 1, 2, 3, 4, 5], [250, 251, 252, 253, 254, 255]]);
        assert!((0..=1 << 24).contains(&s));
    }
}
