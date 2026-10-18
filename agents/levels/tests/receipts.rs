//! The ports against the owner's receipts vendored from
//! ASOLARIA-UNIVERSE-SIMULATOR@3f9f42d receipts/operator/, byte for byte.

use levels_agents::fischer_agent::{fischer_agent, fischer_agent_lines};
use levels_agents::mcp_agent::{mcp_agent, mcp_agent_lines};
use levels_agents::rime_agents::HEADER;

const RIME_AGENTS: &str =
    include_str!("../vendor/universe-simulator/receipts/operator/rime_agents.txt");
const CLUSTER: &str =
    include_str!("../vendor/universe-simulator/receipts/operator/rime_fischer_cluster.txt");
const THE_27: &str =
    include_str!("../vendor/universe-simulator/receipts/operator/rime_27fischers.txt");

fn receipt_lines(lo: usize, hi: usize) -> Vec<&'static str> {
    RIME_AGENTS.split('\n').collect::<Vec<_>>()[lo - 1..hi].to_vec()
}

#[test]
fn rime_fischer_cluster_reproduces_its_receipt() {
    assert_eq!(levels_agents::cluster::main_stdout(), CLUSTER);
}

#[test]
fn rime_27fischers_reproduces_its_receipt() {
    assert_eq!(levels_agents::the27::main_stdout(), THE_27);
}

#[test]
fn fischer_agent_reproduces_receipt_lines_3_to_9() {
    assert_eq!(fischer_agent_lines(&fischer_agent()), receipt_lines(3, 9));
}

#[test]
fn mcp_agent_reproduces_receipt_lines_23_to_28() {
    assert_eq!(mcp_agent_lines(&mcp_agent()), receipt_lines(23, 28));
}

#[test]
fn header_and_closing_lines() {
    assert_eq!(receipt_lines(1, 2), vec![HEADER, ""]);
    assert_eq!(
        receipt_lines(29, 31),
        vec![
            "=".repeat(74).as_str(),
            "ALL FOUR AGENTS PLAYED. Frozen, sliced, trime-signed, receipt-backed.",
            ""
        ]
    );
}
