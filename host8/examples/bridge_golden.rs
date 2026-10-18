//! Writes the rows `bridge_golden.mjs` writes, from Rust: header, one `BRIDGEGOLD` row per
//! prediction, footer. Prints the header, the footer and `ROWS=<n>` as the node script does.
//! Usage: `bridge_golden <gnn-dispatch-bridge.mjs> <gnn-predictions.ndjson> <out.hbp>
//! [--bridge-label=<s>] [--predictions-label=<s>]`. Unlike node, a missing ledger is an error.

use asolaria_host8::bridge::{golden_rows, GOLDEN_BRIDGE_LABEL, GOLDEN_PREDICTIONS_LABEL};
use std::process::ExitCode;

fn main() -> ExitCode {
    let mut paths = Vec::new();
    let mut bridge_label = String::from(GOLDEN_BRIDGE_LABEL);
    let mut predictions_label = String::from(GOLDEN_PREDICTIONS_LABEL);
    for arg in std::env::args().skip(1) {
        if let Some(v) = arg.strip_prefix("--bridge-label=") {
            bridge_label = v.to_string();
        } else if let Some(v) = arg.strip_prefix("--predictions-label=") {
            predictions_label = v.to_string();
        } else {
            paths.push(arg);
        }
    }
    let [bridge, predictions, out] = paths.as_slice() else {
        eprintln!("usage: bridge_golden <bridge.mjs> <predictions.ndjson> <out.hbp> [--bridge-label=<s>] [--predictions-label=<s>]");
        return ExitCode::from(2);
    };
    let read = |path: &str| std::fs::read(path).map_err(|e| eprintln!("read {path}: {e}"));
    let (Ok(bridge), Ok(predictions)) = (read(bridge), read(predictions)) else {
        return ExitCode::FAILURE;
    };
    let golden = match golden_rows(&bridge, &predictions, &bridge_label, &predictions_label) {
        Ok(g) => g,
        Err(e) => {
            eprintln!("no rows written: {e:?}");
            return ExitCode::FAILURE;
        }
    };
    if let Err(e) = std::fs::write(out, &golden.text) {
        eprintln!("write {out}: {e}");
        return ExitCode::FAILURE;
    }
    let lines: Vec<&str> = golden.text.lines().collect();
    println!("{}", lines[0]);
    println!("{}", lines[lines.len() - 1]);
    println!("ROWS={}", lines.len());
    ExitCode::SUCCESS
}
