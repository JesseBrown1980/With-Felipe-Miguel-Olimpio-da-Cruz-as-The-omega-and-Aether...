//! The four-agent run of players/rime_agents.py (lines 166-170): `fischer_agent()`,
//! `mtp_agent()`, `hrm_agent()`, `mcp_agent()` in that order, each printing its own block. No
//! agent reads another's return value (line 168).
//!
//! The Fischer and MCP agents are [`crate::fischer_agent`] and [`crate::mcp_agent`]. The MTP
//! agent (Law 24: the frozen order-2 top-1 table rolled forward x1 / x3 / x27, and backward x1
//! on reversed time, lines 65-98) and the HRM agent (Law 25: order-2 / order-1 / order-0 routing
//! and pricing, lines 101-132) are `hrm_mtp::rime` of model/hrm-mtp; this module prints their
//! banner and GATE lines around the result lines that crate renders.
//!
//! Upstream's MTP and HRM agents each read the first 600,000 bytes of
//! `D:/asolaria-absorb/enwik9` (lines 25, 68, 104); `data` is those bytes.
//!
//! Upstream computes the MTP and HRM result lines in binary64: `hits / tot` (line 90), printed
//! `:.4f` (lines 94-95), and the bpc as a running `float` sum of `-math.log2(...)` (lines 113,
//! 125) divided by `n`, printed `:.4f` (line 129). The port keeps every count an integer. It prints
//! the double nearest `hits / tot` formatted as Python formats it (`hrm_mtp::rime::format_ratio`),
//! which is upstream's line for every input, and the 4-decimal rounding of the exact `log2` sum
//! over `n` (`hrm_mtp::rime::hrm_agent_lines`, a Q64 sum), which is upstream's line whenever the
//! exact value lies more than [`BPC_BINARY64_BOUND_1E12`] from a rounding boundary. That distance,
//! the tie margin, is returned by [`hrm_agent_block`] and [`rime_agents_run`].

use crate::fischer_agent::{fischer_agent, fischer_agent_lines};
use crate::mcp_agent::{mcp_agent, mcp_agent_lines};
use crate::pyfmt::{rule74, Stdout};
use hrm_mtp::rime::{
    hrm_agent, hrm_agent_lines, mtp_agent, mtp_agent_lines, HrmTables, AGENT_BYTES, AGENT_TRAIN,
};

/// Bytes the MTP and HRM agents read.
pub const DATA_BYTES: usize = AGENT_BYTES;

/// Verification only, not upstream: a bound, in units of 10^-12, on the distance between
/// upstream's binary64 bpc and the exact `log2` sum over `n`, for a read of at least 500,003
/// bytes. Each term is at most `log2(t0 + 256)` with `t0 = 499,998` (lines 112, 124-125), below 19
/// bits, so every partial sum is below 2^21 and each of the `n - 1` additions rounds by at most
/// 2^-33 bits: under 2^-33 < 117 x 10^-12 per byte. The rounded quotient, `math.log2` (assumed
/// within 2 ulp), the final division and the port's Q64 sum add under 10^-14 per byte; the
/// margin's 12-decimal rendering adds 1 unit.
pub const BPC_BINARY64_BOUND_1E12: u128 = 120;

/// The first line of the run (line 167); `print` adds a blank line after its `\n`.
pub const HEADER: &str = "THE FOUR FROZEN SLICE AGENTS \u{2014} Laws 23-26, one measured demo each";

/// The block `mtp_agent()` prints (lines 66-67, 93-97).
pub fn mtp_agent_block(data: &[u8]) -> Vec<String> {
    let m = mtp_agent(data);
    let mut lines = vec![
        rule74(),
        "AGENT 2 \u{2014} MTP (Law 24): frozen multi-token prediction  x1 / x3 / x27".to_string(),
    ];
    lines.extend(mtp_agent_lines(&m));
    lines.push(
        "  GATE: lookahead accuracy DECAYS with depth \u{2014} compounding error, DPI. A frozen"
            .to_string(),
    );
    lines.push(
        "  model predicts a fraction, never recreates unseen wholes (Laws 18/22).".to_string(),
    );
    lines
}

/// The block `hrm_agent()` prints (lines 102-103, 128-131), and the tie margin of its bpc line
/// (units of 10^-12; see [`BPC_BINARY64_BOUND_1E12`]).
pub fn hrm_agent_block(data: &[u8]) -> (Vec<String>, u128) {
    let (train, test) = data.split_at(AGENT_TRAIN.min(data.len()));
    let tables = HrmTables::freeze(train);
    let h = hrm_agent(&tables, test);
    let (result, margin) = hrm_agent_lines(&h);
    let mut lines = vec![
        rule74(),
        "AGENT 3 \u{2014} HRM (Law 25): two-rate hierarchy, slow picks the level, fast predicts"
            .to_string(),
    ];
    lines.extend(result);
    lines.push(
        "  GATE: the hierarchy ROUTES between frozen levels (+,0,-); it never dips below"
            .to_string(),
    );
    lines.push("  the entropy of what the levels jointly know (Law 15/21).".to_string());
    (lines, margin)
}

/// What `python rime_agents.py` prints (lines 166-170), given the bytes its MTP and HRM agents
/// read, and the tie margin of the bpc line (see [`hrm_agent_block`]).
pub fn rime_agents_run(data: &[u8]) -> (String, u128) {
    let mut out = Stdout::new();
    out.print(format!("{HEADER}\n"));
    for line in fischer_agent_lines(&fischer_agent()) {
        out.print(line);
    }
    for line in mtp_agent_block(data) {
        out.print(line);
    }
    let (hrm_lines, margin) = hrm_agent_block(data);
    for line in hrm_lines {
        out.print(line);
    }
    for line in mcp_agent_lines(&mcp_agent()) {
        out.print(line);
    }
    out.print(rule74());
    out.print("ALL FOUR AGENTS PLAYED. Frozen, sliced, trime-signed, receipt-backed.");
    (out.into_string(), margin)
}

/// The stdout of [`rime_agents_run`].
pub fn rime_agents_stdout(data: &[u8]) -> String {
    rime_agents_run(data).0
}
