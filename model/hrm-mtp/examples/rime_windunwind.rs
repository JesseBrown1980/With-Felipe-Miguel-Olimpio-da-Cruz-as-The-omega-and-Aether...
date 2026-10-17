//! Plays players/rime_windunwind.py: freezes the bank on enwik8, then winds / unwinds and prices
//! the 27 sectors of enwik9 with MTP+, MTP- and HRM, printing one HBP row per sector and a total.
//!
//! cargo run --release --example rime_windunwind -- path/to/enwik8 path/to/enwik9
//! (`-` as the enwik9 path reads it from standard input, e.g. `unzip -p enwik9.zip`.)

use hrm_mtp::log2fx::{render_q64_ratio, round_q64_ratio};
use hrm_mtp::rime::format_fixed;
use hrm_mtp::rime::windunwind::{play_sector, Bank, Scratch, Sphere, SEC, SECTORS};
use hrm_mtp::sf64::Sf64;
use std::io::Read;

fn main() {
    let mut args = std::env::args().skip(1);
    let bank_path = args
        .next()
        .expect("usage: rime_windunwind <enwik8> <enwik9|->");
    let sectors_path = args
        .next()
        .expect("usage: rime_windunwind <enwik8> <enwik9|->");
    let bank_bytes = std::fs::read(&bank_path).expect("read enwik8");
    let bank = Bank::freeze(&bank_bytes);
    drop(bank_bytes);
    let sphere = Sphere::build();
    println!(
        "BANK|bytes={}|t0={}|g={}|W={}|json=0",
        bank.t0, bank.t0, sphere.g, sphere.w
    );
    let mut input: Box<dyn Read> = if sectors_path == "-" {
        Box::new(std::io::stdin().lock())
    } else {
        Box::new(std::fs::File::open(&sectors_path).expect("open enwik9"))
    };
    let mut scratch = Scratch::default();
    let mut sec = vec![0u8; SEC];
    let (mut tot_f, mut tot_b, mut tot_h, mut tot_n) = (0i128, 0i128, 0i128, 0u64);
    let (mut all_exact, mut weight) = (true, 0u128);
    for d in 0..SECTORS {
        input.read_exact(&mut sec).expect("read a sector");
        let play = play_sector(&bank, &sphere, &sec, d, &mut scratch);
        let n = play.n;
        let bpc = |q: i128| round_q64_ratio(q, n, 4).0;
        let deep_pct = format_fixed(Sf64::from_ratio(play.deep, n) * Sf64::from_i64(100), 0);
        println!(
            "SECTOR|d={d}|sample={}|exact={}|n={n}|mtp_fwd_bpc={}|mtp_bwd_bpc={}|hrm_bpc={}|hrm_deep={}|deep_pct={deep_pct}|mtp_fwd_q64={}|mtp_bwd_q64={}|hrm_q64={}|json=0",
            if d <= 2 { "IN-SAMPLE" } else { "unseen" },
            u8::from(play.exact),
            bpc(play.mtp_fwd.0),
            bpc(play.mtp_bwd.0),
            bpc(play.hrm.0),
            play.deep,
            play.mtp_fwd.0,
            play.mtp_bwd.0,
            play.hrm.0,
        );
        tot_f += play.mtp_fwd.0;
        tot_b += play.mtp_bwd.0;
        tot_h += play.hrm.0;
        tot_n += n;
        all_exact &= play.exact;
        weight += play.mtp_fwd.1 + play.mtp_bwd.1 + play.hrm.1;
    }
    let total = |name: &str, q: i128| {
        let (r4, margin) = round_q64_ratio(q, tot_n, 4);
        format!(
            "{name}_bpc4={r4}|{name}_bpc={}|{name}_tie_margin_1e-12={margin}",
            render_q64_ratio(q, tot_n, 15)
        )
    };
    println!(
        "TOTAL|bytes={}|all_exact={}|n={tot_n}|{}|{}|{}|error_weight={weight}|json=0",
        SEC * SECTORS,
        u8::from(all_exact),
        total("mtp_fwd", tot_f),
        total("mtp_bwd", tot_b),
        total("hrm", tot_h)
    );
}
