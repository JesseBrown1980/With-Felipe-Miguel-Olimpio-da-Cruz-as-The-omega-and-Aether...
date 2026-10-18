//! `mcp_agent()` (players/rime_agents.py:135-164), Law 26: three cells, one per sphere
//! `(Z/qZ)*` with `27 | q - 1` (Q = 163, 271, 379), carrying the residues of a value modulo the
//! coprime moduli P = 109, 163, 271. `cell_encode` maps a residue to the sphere point
//! `G[i]^r mod Q[i]` (line 143); `cell_fischer` reads it back by trying every `r < P[i]`
//! (lines 144-147); the coordinator recombines the three residues by CRT (lines 148-153).

use crate::pyfmt::{grouped, py_bool, rule74};
use crate::sphere::{inv_mod, is_prime, pow_mod, primitive_root};

/// `P` (line 138): the CRT moduli.
pub const P: [u64; 3] = [109, 163, 271];
/// `Q` (line 139): the sphere primes.
pub const Q: [u64; 3] = [163, 271, 379];
/// `batch` (line 154); its eighth entry `1000081 % M` is 1,000,081, as M = 4,814,857.
pub const BATCH: [u64; 9] = [
    0,
    1,
    26,
    27,
    255,
    256,
    77_777,
    1_000_081,
    109 * 163 * 271 - 1,
];

/// What `mcp_agent()` computes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct McpAgent {
    /// `G = [primitive_root(q) for q in Q]`.
    pub g: [u64; 3],
    /// `M = P[0] * P[1] * P[2]`.
    pub m: u64,
    /// Each batch value and the value read back through the three cells.
    pub round_trips: Vec<(u64, u64)>,
    /// `ok`: every value read back equal.
    pub ok: bool,
}

/// `cell_encode(i, r)` (line 143).
pub fn cell_encode(g: &[u64; 3], i: usize, r: u64) -> u64 {
    pow_mod(g[i], r, Q[i])
}

/// `cell_fischer(i, x)` (lines 144-147): the least `r < P[i]` with `G[i]^r = x (mod Q[i])`, or
/// `None` where upstream raises `ValueError`.
pub fn cell_fischer(g: &[u64; 3], i: usize, x: u64) -> Option<u64> {
    (0..P[i]).find(|&r| pow_mod(g[i], r, Q[i]) == x)
}

/// `crt(rs)` (lines 148-153): `v = (v + r * m * pow(m, -1, P[i])) % M` per cell, `m = M // P[i]`.
pub fn crt(rs: &[u64; 3]) -> u64 {
    let big_m = P[0] * P[1] * P[2];
    let mut v = 0u128;
    for (i, &r) in rs.iter().enumerate() {
        let m = big_m / P[i];
        let inv = inv_mod(m, P[i]).expect("coprime moduli");
        v = (v + u128::from(r) * u128::from(m) * u128::from(inv)) % u128::from(big_m);
    }
    v as u64
}

/// `mcp_agent()` without its prints.
pub fn mcp_agent() -> McpAgent {
    for q in Q {
        assert!(is_prime(q) && (q - 1) % 27 == 0);
    }
    let g = Q.map(|q| primitive_root(q).expect("q is prime"));
    let m = P[0] * P[1] * P[2];
    let mut ok = true;
    let mut round_trips = Vec::with_capacity(BATCH.len());
    for v in BATCH {
        let pts: [u64; 3] = core::array::from_fn(|i| cell_encode(&g, i, v % P[i]));
        let back = crt(&core::array::from_fn(|i| {
            cell_fischer(&g, i, pts[i]).expect("ValueError: no residue maps to the point")
        }));
        ok &= back == v;
        round_trips.push((v, back));
    }
    McpAgent {
        g,
        m,
        round_trips,
        ok,
    }
}

/// The lines `mcp_agent()` prints (lines 136-137, 160-163).
pub fn mcp_agent_lines(a: &McpAgent) -> Vec<String> {
    vec![
        rule74(),
        "AGENT 4 \u{2014} MCP (Law 26): stateless cells x CRT fan-in  (3 x 27-structured x rime)"
            .to_string(),
        format!(
            "  cells: sphere(Z/{}Z)* + sphere(Z/{}Z)* + sphere(Z/{}Z)*  (each 27|q-1)",
            Q[0], Q[1], Q[2]
        ),
        format!(
            "  address space M = {}   batch of {} values round-tripped: byte-exact = {}",
            grouped(u128::from(a.m)),
            a.round_trips.len(),
            py_bool(a.ok)
        ),
        "  GATE: cells are STATELESS (the SGRAM doctrine) \u{2014} all knowledge is in the frozen"
            .to_string(),
        "  spheres; the coordinator only fans in. Addressing axis, ~0 bpc, never compression."
            .to_string(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cells_round_trip() {
        let a = mcp_agent();
        assert_eq!(a.g, [2, 6, 2]);
        assert_eq!(a.m, 4_814_857);
        assert!(a.ok);
        assert_eq!(a.round_trips.len(), 9);
        assert_eq!(BATCH[7], 1_000_081 % a.m);
        for (v, back) in &a.round_trips {
            assert_eq!(v, back);
        }
    }
}
