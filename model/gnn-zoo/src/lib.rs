//! Reads the parity file `tools/zoo_torch.py parity` writes and compares a port's Q24 outputs with torch's.
//!
//! Each example of this crate compiles one aether port's `src/model.rs`, unchanged, against the Q24 weights of
//! one zoo checkpoint, and calls [`run`] with that port's forward. Integers only: torch outputs arrive as
//! float32 bit patterns and are rounded to Q24 exactly, as the ports' own parity tests do.

#![forbid(unsafe_code)]

use std::collections::HashMap;
use std::process::ExitCode;

/// Fraction bits of every Q24 value.
pub const FRAC_BITS: u32 = 24;
/// Features per node (`node_input_dim=6`).
pub const NODE_FEATURES: usize = 6;
const HALF_Q24: i64 = 1 << (FRAC_BITS - 1);

/// One graph of the parity file: Q24 node features and `(source, target)` edges.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Graph {
    /// One row of six Q24 features per node.
    pub x: Vec<[i64; NODE_FEATURES]>,
    /// The edges, as node indices.
    pub edges: Vec<(usize, usize)>,
}

/// One torch output row: a checkpoint's float32 scores on one graph under one GCNConv variant.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TorchRow {
    /// The graph the row belongs to.
    pub set: String,
    /// The checkpoint file in `vendor/gnn-patterns/`.
    pub file: String,
    /// `pyg` (torch_geometric GCNConv) or `fallback` (the vendored files' ImportError GCNConv).
    pub forward: String,
    /// One float32 bit pattern per edge.
    pub bits: Vec<u32>,
}

/// The parity file: its graphs in file order and its torch rows.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ParityFile {
    /// `(set name, graph)` in file order.
    pub sets: Vec<(String, Graph)>,
    /// Every `TORCH` row.
    pub torch: Vec<TorchRow>,
}

fn fields(line: &str) -> HashMap<&str, &str> {
    line.split('|')
        .skip(1)
        .filter_map(|field| field.split_once('='))
        .collect()
}

fn field<'a>(f: &HashMap<&str, &'a str>, key: &str, line_no: usize) -> Result<&'a str, String> {
    f.get(key)
        .copied()
        .ok_or_else(|| format!("line {line_no}: no {key}="))
}

fn parse_row(text: &str, line_no: usize) -> Result<[i64; NODE_FEATURES], String> {
    let values: Vec<i64> = text
        .split(',')
        .map(|v| {
            v.parse()
                .map_err(|_| format!("line {line_no}: bad integer {v:?}"))
        })
        .collect::<Result<_, _>>()?;
    values
        .try_into()
        .map_err(|_| format!("line {line_no}: a node row needs {NODE_FEATURES} values"))
}

fn parse_edge(text: &str, line_no: usize) -> Result<(usize, usize), String> {
    let (s, t) = text
        .split_once(',')
        .ok_or_else(|| format!("line {line_no}: bad edge {text:?}"))?;
    let index = |v: &str| {
        v.parse()
            .map_err(|_| format!("line {line_no}: bad node index {v:?}"))
    };
    Ok((index(s)?, index(t)?))
}

/// Parses the text of a parity file; refuses a graph whose edge or node counts differ from its `SET` row.
pub fn parse(text: &str) -> Result<ParityFile, String> {
    let mut file = ParityFile::default();
    let mut declared: HashMap<String, (usize, usize)> = HashMap::new();
    let mut x: HashMap<String, Vec<[i64; NODE_FEATURES]>> = HashMap::new();
    let mut edges: HashMap<String, Vec<(usize, usize)>> = HashMap::new();
    let mut order = Vec::new();
    for (i, line) in text.lines().enumerate() {
        let line_no = i + 1;
        let label = line.split('|').next().unwrap_or("");
        let f = fields(line);
        match label {
            "SET" => {
                let set = field(&f, "set", line_no)?.to_string();
                let count = |key| -> Result<usize, String> {
                    field(&f, key, line_no)?
                        .parse()
                        .map_err(|_| format!("line {line_no}: bad {key}"))
                };
                declared.insert(set.clone(), (count("nodes")?, count("edges")?));
                order.push(set);
            }
            "X" => {
                let rows = field(&f, "x", line_no)?
                    .split(';')
                    .map(|r| parse_row(r, line_no))
                    .collect::<Result<_, _>>()?;
                x.insert(field(&f, "set", line_no)?.to_string(), rows);
            }
            "E" => {
                let list = field(&f, "e", line_no)?
                    .split(';')
                    .map(|e| parse_edge(e, line_no))
                    .collect::<Result<_, _>>()?;
                edges.insert(field(&f, "set", line_no)?.to_string(), list);
            }
            "TORCH" => {
                let bits = field(&f, "bits", line_no)?
                    .split(';')
                    .map(|b| {
                        u32::from_str_radix(b, 16)
                            .map_err(|_| format!("line {line_no}: bad float32 bits {b:?}"))
                    })
                    .collect::<Result<_, _>>()?;
                file.torch.push(TorchRow {
                    set: field(&f, "set", line_no)?.to_string(),
                    file: field(&f, "file", line_no)?.to_string(),
                    forward: field(&f, "forward", line_no)?.to_string(),
                    bits,
                });
            }
            _ => {}
        }
    }
    for set in order {
        let (nodes, edge_count) = declared[&set];
        let graph = Graph {
            x: x.remove(&set)
                .ok_or_else(|| format!("set {set}: no X row"))?,
            edges: edges
                .remove(&set)
                .ok_or_else(|| format!("set {set}: no E row"))?,
        };
        if graph.x.len() != nodes || graph.edges.len() != edge_count {
            return Err(format!("set {set}: counts differ from its SET row"));
        }
        if graph.edges.iter().any(|&(s, t)| s >= nodes || t >= nodes) {
            return Err(format!("set {set}: an edge names a node out of range"));
        }
        file.sets.push((set, graph));
    }
    for row in &file.torch {
        match file.sets.iter().find(|(name, _)| *name == row.set) {
            Some((_, graph)) if graph.edges.len() == row.bits.len() => {}
            _ => return Err(format!("TORCH {} {}: no matching graph", row.set, row.file)),
        }
    }
    Ok(file)
}

/// `floor(v * 2^24 + 1/2)` of the finite float32 `v` with these bits; `None` for an infinity or a NaN.
pub fn q24_of_f32_bits(bits: u32) -> Option<i64> {
    let exponent = (bits >> 23) & 0xFF;
    if exponent == 0xFF {
        return None;
    }
    let fraction = i128::from(bits & 0x7F_FFFF);
    // v = significand * 2^(power - 149) exactly.
    let (significand, power) = if exponent == 0 {
        (fraction, 0)
    } else {
        (fraction | 1 << 23, exponent - 1)
    };
    let signed = if bits >> 31 == 1 {
        -significand
    } else {
        significand
    };
    // v * 2^24 = signed * 2^(power - 125).
    let q = if power >= 125 {
        signed << (power - 125)
    } else {
        let shift = 125 - power;
        if shift > 100 {
            // |v * 2^24| < 2^-76, so floor(v * 2^24 + 1/2) is 0 for either sign.
            0
        } else {
            (signed + (1 << (shift - 1))) >> shift
        }
    };
    i64::try_from(q).ok()
}

/// Whether the float32 with these bits is above 1/2, the trainers' `> 0.5` decision.
pub fn f32_bits_above_half(bits: u32) -> bool {
    bits >> 31 == 0 && bits > 0x3F00_0000 && bits <= 0x7F80_0000
}

/// What one comparison of port outputs with torch outputs measured.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Agreement {
    /// Edges compared.
    pub edges: usize,
    /// Edges whose port Q24 output equals the Q24 rounding of torch's float32.
    pub q24_equal: usize,
    /// Largest |port Q24 - Q24 rounding of torch's float32|.
    pub max_abs_diff_q24: i64,
    /// Edges on which `> 1/2` agrees.
    pub class_equal: usize,
    /// Port outputs above 1/2.
    pub port_class1: usize,
    /// Torch outputs above 1/2.
    pub torch_class1: usize,
}

/// Compares port Q24 outputs with torch float32 bit patterns, edge by edge.
pub fn agreement(port: &[i64], torch: &[u32]) -> Result<Agreement, String> {
    if port.len() != torch.len() {
        return Err(format!(
            "{} port outputs, {} torch outputs",
            port.len(),
            torch.len()
        ));
    }
    let mut a = Agreement {
        edges: port.len(),
        ..Agreement::default()
    };
    for (&p, &bits) in port.iter().zip(torch) {
        let t = q24_of_f32_bits(bits).ok_or("torch output is not finite")?;
        let diff = (p - t).abs();
        a.q24_equal += usize::from(diff == 0);
        a.max_abs_diff_q24 = a.max_abs_diff_q24.max(diff);
        let (pc, tc) = (p > HALF_Q24, f32_bits_above_half(bits));
        a.class_equal += usize::from(pc == tc);
        a.port_class1 += usize::from(pc);
        a.torch_class1 += usize::from(tc);
    }
    Ok(a)
}

/// One measured comparison: a torch row of the parity file against the port's outputs on the same graph.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Measured {
    /// The graph.
    pub set: String,
    /// The checkpoint file.
    pub file: String,
    /// The torch row's GCNConv variant.
    pub forward: String,
    /// What the comparison measured.
    pub agreement: Agreement,
}

/// Runs `forward` once per graph and compares it with every torch row of `files`, in graph, file, row order.
pub fn measure(
    parity: &ParityFile,
    files: &[&str],
    forward: impl Fn(&Graph) -> Vec<i64>,
) -> Result<Vec<Measured>, String> {
    let mut out = Vec::new();
    for (set, graph) in &parity.sets {
        let outputs = forward(graph);
        for file in files {
            for row in parity
                .torch
                .iter()
                .filter(|r| r.set == *set && r.file == *file)
            {
                out.push(Measured {
                    set: set.clone(),
                    file: (*file).to_string(),
                    forward: row.forward.clone(),
                    agreement: agreement(&outputs, &row.bits)
                        .map_err(|e| format!("{set} {file}: {e}"))?,
                });
            }
        }
    }
    if out.is_empty() {
        return Err(format!("no TORCH rows for {files:?}"));
    }
    Ok(out)
}

/// The bound `--check` holds a port to, on its own forward: 32 Q24 units, the bound model/l0-edge's tests allow.
pub const MAX_DIFF_Q24: i64 = 32;

/// The example entry point. Arguments `[--check] PARITY_FILE`: runs `forward` on every graph of the parity file
/// and prints one `PARITY` row per torch row of `files`, for the port named `port`, compiled with `weights`, whose
/// own forward is `port_forward`. With `--check` it fails unless every row of the port's own forward agrees in
/// class on every edge and within [`MAX_DIFF_Q24`].
pub fn run(
    port: &str,
    weights: &str,
    files: &[&str],
    port_forward: &str,
    forward: impl Fn(&Graph) -> Vec<i64>,
) -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (check, path) = match args.as_slice() {
        [path] => (false, path),
        [flag, path] if flag == "--check" => (true, path),
        _ => {
            eprintln!("usage: <example> [--check] PARITY_FILE");
            return ExitCode::from(2);
        }
    };
    let measured = std::fs::read_to_string(path)
        .map_err(|e| format!("{path}: {e}"))
        .and_then(|text| parse(&text))
        .and_then(|parity| measure(&parity, files, forward));
    let measured = match measured {
        Ok(measured) => measured,
        Err(e) => {
            eprintln!("parity: {e}");
            return ExitCode::from(1);
        }
    };
    let mut failed = 0;
    for m in measured {
        let a = m.agreement;
        let same = m.forward == port_forward;
        failed += usize::from(
            check && same && (a.class_equal != a.edges || a.max_abs_diff_q24 > MAX_DIFF_Q24),
        );
        println!(
            "PARITY|port={port}|weights={weights}|file={}|set={}|torch_forward={}|same_forward={}\
             |edges={}|q24_equal={}|max_abs_diff_q24={}|class_equal={}|port_class1={}|torch_class1={}|json=0",
            m.file,
            m.set,
            m.forward,
            u8::from(same),
            a.edges,
            a.q24_equal,
            a.max_abs_diff_q24,
            a.class_equal,
            a.port_class1,
            a.torch_class1,
        );
    }
    if failed > 0 {
        eprintln!("{failed} rows of the port's own forward differ in class or by more than {MAX_DIFF_Q24} Q24 units");
        return ExitCode::from(1);
    }
    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn q24_of_f32_bits_rounds_half_up() {
        assert_eq!(q24_of_f32_bits(0x3F00_0000), Some(1 << 23));
        assert_eq!(q24_of_f32_bits(0x3F80_0000), Some(1 << 24));
        assert_eq!(q24_of_f32_bits(0), Some(0));
        assert_eq!(q24_of_f32_bits(0x3380_0000), Some(1)); // 2^-24
        assert_eq!(q24_of_f32_bits(0x3300_0000), Some(1)); // 2^-25 rounds half up
        assert_eq!(q24_of_f32_bits(0x32FF_FFFF), Some(0));
        assert_eq!(q24_of_f32_bits(0xB300_0000), Some(0)); // -2^-25: floor(-1/2 + 1/2)
        assert_eq!(q24_of_f32_bits(0xBF80_0000), Some(-(1 << 24)));
        assert_eq!(q24_of_f32_bits(0x7F80_0000), None);
    }

    #[test]
    fn above_half_is_strict() {
        assert!(!f32_bits_above_half(0x3F00_0000));
        assert!(f32_bits_above_half(0x3F00_0001));
        assert!(!f32_bits_above_half(0xBF80_0000));
    }

    #[test]
    fn parse_reads_a_small_file() {
        let text = "SET|set=a|nodes=2|edges=1|json=0\nX|set=a|x=1,2,3,4,5,6;0,0,0,0,0,0|json=0\n\
                    E|set=a|e=0,1|json=0\nTORCH|set=a|file=f.pt|class=C|forward=pyg|bits=3f000001|json=0\n";
        let file = parse(text).expect("parses");
        assert_eq!(file.sets[0].1.edges, vec![(0, 1)]);
        let a = agreement(&[(1 << 23) + 1], &file.torch[0].bits).expect("same length");
        assert_eq!((a.q24_equal, a.class_equal), (1, 1));
    }
}
