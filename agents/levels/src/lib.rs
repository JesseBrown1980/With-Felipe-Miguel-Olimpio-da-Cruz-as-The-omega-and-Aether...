//! Integer port of the universe simulator's slice agents at the levels 3 / 27 / rime
//! (players/rime_agents.py:6-8): the Fischer agent (Law 23) and the MCP agent (Law 26), the rime
//! Fischer solvers of players/rime_fischer.py, players/rime_fischer_cluster.py and
//! players/rime_27fischers.py, and the four-agent run of rime_agents.py:166-170, which takes the
//! MTP (Law 24) and HRM (Law 25) agents from `hrm_mtp::rime` (model/hrm-mtp).
//!
//! Every value is an integer. Printed lines are upstream's `print` lines, byte for byte. Upstream
//! computes the MTP and HRM lines in binary64 (rime_agents.py:90, 125, 129); how the port renders
//! them from integers, and the condition for the bpc line, are in [`rime_agents`].

#![forbid(unsafe_code)]

pub mod bignum;
pub mod cluster;
pub mod fischer_agent;
pub mod mcp_agent;
pub mod pyfmt;
pub mod rime_agents;
pub mod rime_fischer;
pub mod sphere;
pub mod the27;
