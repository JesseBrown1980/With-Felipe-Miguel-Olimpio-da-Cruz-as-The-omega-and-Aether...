//! Plays `hrm_agent()` and `mtp_agent()` of players/rime_agents.py on the first 600,000 bytes of
//! the file named on the command line (enwik8 or enwik9: the same bytes), printing upstream's
//! result lines followed by HBP rows with the exact counts.
//!
//! cargo run --release --example rime_agents -- path/to/enwik8

use hrm_mtp::log2fx::render_q64_ratio;
use hrm_mtp::rime::{
    hrm_agent, hrm_agent_lines, mtp_agent, mtp_agent_lines, HrmTables, AGENT_BYTES, AGENT_TRAIN,
};
use std::io::Read;

fn main() {
    let path = std::env::args()
        .nth(1)
        .expect("usage: rime_agents <enwik8>");
    let mut data = Vec::with_capacity(AGENT_BYTES);
    std::fs::File::open(&path)
        .expect("open enwik file")
        .take(AGENT_BYTES as u64)
        .read_to_end(&mut data)
        .expect("read enwik file");
    let (train, test) = data.split_at(AGENT_TRAIN);

    let mtp = mtp_agent(&data);
    for line in mtp_agent_lines(&mtp) {
        println!("{line}");
    }
    let tables = HrmTables::freeze(train);
    let hrm = hrm_agent(&tables, test);
    let (lines, margin) = hrm_agent_lines(&hrm);
    for line in &lines {
        println!("{line}");
    }

    let n = hrm.n;
    let (bits_q64, weight) = hrm.tally.sum_q64();
    println!(
        "MTPAGENT|x1={}/{}|x3={}/{}|x27={}/{}|back1={}/{}|anchors=1200|json=0",
        mtp.f1.0, mtp.f1.1, mtp.f3.0, mtp.f3.1, mtp.f27.0, mtp.f27.1, mtp.b1.0, mtp.b1.1
    );
    println!(
        "HRMAGENT|n={n}|deep={}|mid={}|base={}|t0={}|distinct_log2_terms={}|bits_q64={bits_q64}|bpc={}|bpc4={}|tie_margin_1e-12={margin}|error_weight={weight}|json=0",
        hrm.used[0],
        hrm.used[1],
        hrm.used[2],
        tables.t0,
        hrm.tally.entries().len(),
        render_q64_ratio(bits_q64, n, 15),
        lines[1].rsplit(' ').next().expect("bpc")
    );
}
