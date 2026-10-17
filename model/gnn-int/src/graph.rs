//! Undirected graph in CSR form with self-loops and exact integer GCN normalization.

use crate::Error;

/// Integer square root: the largest `r` with `r * r <= x`.
pub fn isqrt_u64(x: u64) -> u64 {
    let mut rem = x;
    let mut res = 0u64;
    let mut bit = 1u64 << 62;
    while bit > rem {
        bit >>= 2;
    }
    while bit != 0 {
        if rem >= res + bit {
            rem -= res + bit;
            res = (res >> 1) + bit;
        } else {
            res >>= 1;
        }
        bit >>= 2;
    }
    res
}

/// Q16 coefficient `round(65536 / sqrt(d_i * d_j))`, rounded half away from zero, exactly.
///
/// With `p = d_i * d_j`, `c` is the largest integer with `(2c - 1)^2 * p <= 2^34`,
/// so `c = (isqrt(floor(2^34 / p)) + 1) / 2`. Returns 0 if either degree is 0.
pub fn gcn_coefficient(d_i: u64, d_j: u64) -> i32 {
    let p = u128::from(d_i) * u128::from(d_j);
    if p == 0 {
        return 0;
    }
    let q = (1u128 << 34) / p; // <= 2^34, fits u64
    let m = isqrt_u64(q as u64);
    ((m + 1) / 2) as i32
}

/// Undirected graph stored as CSR over `A + I`, with one Q16 coefficient per stored entry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Graph {
    n: usize,
    row_ptr: Vec<usize>,
    cols: Vec<u32>,
    coef: Vec<i32>,
}

impl Graph {
    /// Builds `A + I` from an edge list: both directions inserted, duplicates removed,
    /// one self-loop per node. Node ids must be `< n`.
    pub fn from_edges(n: usize, edges: &[(u32, u32)]) -> Result<Self, Error> {
        if n > (u32::MAX as usize).saturating_add(1) {
            return Err(Error::TooManyNodes { n });
        }
        let mut pairs: Vec<(u32, u32)> = Vec::with_capacity(edges.len().saturating_mul(2).saturating_add(n));
        for &(u, v) in edges {
            for node in [u, v] {
                if node as usize >= n {
                    return Err(Error::NodeOutOfRange { node, n });
                }
            }
            pairs.push((u, v));
            pairs.push((v, u));
        }
        pairs.extend((0..n).map(|i| (i as u32, i as u32)));
        pairs.sort_unstable();
        pairs.dedup();

        let mut row_ptr = vec![0usize; n + 1];
        for &(u, _) in &pairs {
            row_ptr[u as usize + 1] += 1;
        }
        for i in 0..n {
            row_ptr[i + 1] += row_ptr[i];
        }
        let cols: Vec<u32> = pairs.iter().map(|&(_, v)| v).collect();
        let degree = |i: usize| (row_ptr[i + 1] - row_ptr[i]) as u64;
        let coef = pairs
            .iter()
            .map(|&(u, v)| gcn_coefficient(degree(u as usize), degree(v as usize)))
            .collect();
        Ok(Self { n, row_ptr, cols, coef })
    }

    /// Number of nodes.
    pub fn node_count(&self) -> usize {
        self.n
    }

    /// Degree of node `i` in `A + I` (self-loop included); 0 if `i >= n`.
    pub fn degree(&self, i: usize) -> usize {
        self.neighbors(i).len()
    }

    /// Sorted neighbours of `i` in `A + I`, including `i` itself. Empty if `i >= n`.
    pub fn neighbors(&self, i: usize) -> &[u32] {
        match self.row_range(i) {
            Some((a, b)) => &self.cols[a..b],
            None => &[],
        }
    }

    /// Q16 normalization coefficients aligned with [`Graph::neighbors`].
    pub fn coefficients(&self, i: usize) -> &[i32] {
        match self.row_range(i) {
            Some((a, b)) => &self.coef[a..b],
            None => &[],
        }
    }

    fn row_range(&self, i: usize) -> Option<(usize, usize)> {
        (i < self.n).then(|| (self.row_ptr[i], self.row_ptr[i + 1]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn isqrt_matches_definition() {
        for x in 0u64..5000 {
            let r = isqrt_u64(x);
            assert!(r * r <= x && (r + 1) * (r + 1) > x, "x={x}");
        }
        assert_eq!(isqrt_u64(u64::MAX), u64::from(u32::MAX));
        assert_eq!(isqrt_u64(1 << 34), 1 << 17);
        assert_eq!(isqrt_u64((1 << 34) - 1), (1 << 17) - 1);
    }

    #[test]
    fn coefficient_satisfies_rounding_bounds() {
        // c = round(2^16 / sqrt(p))  <=>  (2c-1)^2 p <= 2^34 < (2c+1)^2 p
        for di in 1u64..=64 {
            for dj in 1u64..=64 {
                let c = gcn_coefficient(di, dj) as u128;
                let p = u128::from(di * dj);
                assert!((2 * c - 1) * (2 * c - 1) * p <= 1 << 34);
                assert!((2 * c + 1) * (2 * c + 1) * p > 1 << 34);
            }
        }
        assert_eq!(gcn_coefficient(0, 5), 0);
        assert_eq!(gcn_coefficient(u64::MAX, u64::MAX), 0);
    }
}
