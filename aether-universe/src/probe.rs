//! Probes: the experiments of the regions, and the `trits` command.
//!
//! A probe never changes the world. It prints rows the kernel has just computed from the number or
//! the text the player supplied. Numeric probes work in every region and print the general row set;
//! each region adds the experiment its secret asks about.

use crate::hbp::Row;
use crate::kernel::Kernel;
use crate::secrets::{self, Outcome};
use crate::sieve;
use crate::trits;
use crate::world;
use asolaria_tribit::TRITS_PER_U128;

/// Parse a number: decimal (optionally negative), `0x` hex, or a bare 16-character hex token with at
/// least one letter (an agent's PID). All-digit 16-character tokens are decimal; prefix `0x` for hex.
pub fn parse_num(tok: &str) -> Option<i128> {
    if let Some(h) = tok.strip_prefix("0x").or_else(|| tok.strip_prefix("0X")) {
        return u128::from_str_radix(h, 16)
            .ok()
            .and_then(|v| i128::try_from(v).ok());
    }
    if tok.len() == 16
        && tok.bytes().all(|b| b.is_ascii_hexdigit())
        && tok.bytes().any(|b| b.is_ascii_alphabetic())
    {
        return u64::from_str_radix(tok, 16).ok().map(i128::from);
    }
    tok.parse::<i128>().ok()
}

fn trit_row(n: i128, form: &str, t: &[i8], width: usize) -> Row {
    Row::new("TRITS")
        .kv("n", n)
        .kv("form", form)
        .kv("order", "lsf")
        .kv("t", trits::fmt_sym(t))
        .kv("width", width)
}

/// The `trits <n>` command: the balanced form at minimal width and at widths 3, 13 and 41 (with
/// `fits=0` where the value does not fit), the ordinary base-3 digits, and, for 64-bit values, the
/// form centred on the ground point.
pub fn trits_rows(arg: &str) -> Vec<Row> {
    let Some(n) = parse_num(arg.trim()) else {
        return vec![Row::new("USAGE")
            .kv("command", "trits")
            .kv("usage", "trits <integer>")];
    };
    let mut rows = Vec::new();
    let min = trits::bal3(n);
    rows.push(trit_row(n, "balanced", &min, min.len()));
    for w in [3usize, 13, 41] {
        match trits::bal3_width(n, w) {
            Ok(t) => rows.push(trit_row(n, "balanced", &t, w).kv("fits", 1)),
            Err(e) => rows.push(
                Row::new("TRITS")
                    .kv("n", n)
                    .kv("form", "balanced")
                    .kv("width", w)
                    .kv("fits", 0)
                    .kv("note", "OutOfRange")
                    .kv("span", e.span),
            ),
        }
    }
    if n >= 0 {
        let d = trits::unbalanced_digits(n as u128);
        rows.push(
            Row::new("TRITS")
                .kv("n", n)
                .kv("form", "digits012")
                .kv("order", "lsf")
                .kv(
                    "t",
                    d.iter().map(u8::to_string).collect::<Vec<_>>().join(","),
                )
                .kv("width", d.len()),
        );
    }
    if (0..=i128::from(u64::MAX)).contains(&n) {
        let centred = n - (1i128 << 63);
        let c = trits::bal3(centred);
        rows.push(
            Row::new("CENTRED")
                .kv("n", n)
                .kv("offset", "2^63")
                .kv("value", centred)
                .kv("balanced_width", c.len())
                .kv("raw_balanced_width", min.len())
                .kv("law", "count_is_not_range"),
        );
    }
    rows
}

/// The general row set for a number.
fn general_rows(n: i128) -> Vec<Row> {
    let mut rows = Vec::new();
    let t = trits::bal3(n);
    rows.push(
        Row::new("PROBE")
            .kv("n", n)
            .kv("order", "lsf")
            .kv("trits", trits::fmt_sym(&t))
            .kv("width", t.len()),
    );
    if let Some(w) = trits::tritword(&t) {
        rows.push(
            Row::new("TRITWORD")
                .kv("n", n)
                .kv("digits", t.len())
                .kv("capacity", TRITS_PER_U128)
                .kv("packed", w.0),
        );
    }
    if n < 0 {
        rows.push(Row::new("NOTE").kv("n", n).kv(
            "text",
            "a negative number has no cube cell, spoke or room; the trits above are balanced",
        ));
        return rows;
    }
    let Ok(u) = u64::try_from(n) else {
        rows.push(
            Row::new("NOT_MEASURED")
                .kv("subject", "cell_spoke_prime_rooms")
                .kv("n", n)
                .kv("reason", "BUDGET")
                .kv("detail", "beyond_u64"),
        );
        return rows;
    };
    let (res, cell) = trits::cube_cell(u);
    rows.push(
        Row::new("CUBECELL")
            .kv("n", n)
            .kv("residue27", res)
            .kv("order", "lsf")
            .kv("trits", trits::fmt_num(&cell))
            .kv("coprime_to_3", u8::from(res % 3 != 0)),
    );
    rows.push(Row::new("SPOKE").kv("n", n).kv("mod6", u % 6).kv(
        "spoke",
        match trits::spoke(u) {
            Some(1) => "+1",
            Some(_) => "-1",
            None => "none",
        },
    ));
    rows.push(
        Row::new("PRIME")
            .kv("n", n)
            .kv("is_prime", u8::from(sieve::is_prime_u64(u)))
            .kv("method", "miller_rabin_u64"),
    );
    for level in 1..=5usize {
        rows.push(
            Row::new("ROOM")
                .kv("n", n)
                .kv("level", level)
                .kv("room", trits::fmt_num(&trits::room_digits(u, level)))
                .kv("order", "lsf"),
        );
    }
    rows
}

/// First level at which two numbers are in different rooms, up to level 60.
pub fn first_level_apart(a: u64, b: u64) -> Option<usize> {
    (1..=60usize).find(|l| trits::room_digits(a, *l) != trits::room_digits(b, *l))
}

/// The probe command. `raw` is everything after the word `probe`, as typed.
pub fn probe_rows(raw: &str, region: u8, kernel: &mut Kernel) -> Vec<Row> {
    let raw = raw.trim();
    let toks: Vec<&str> = raw.split_whitespace().collect();
    if toks.is_empty() {
        return vec![Row::new("USAGE").kv("command", "probe").kv(
            "usage",
            "probe <n> | probe <a> <b> | probe <word> | probe star",
        )];
    }
    if toks.len() == 1 && toks[0].eq_ignore_ascii_case("star") {
        if region != 8 {
            return vec![Row::new("NOTE").kv(
                "text",
                "there is no star to probe here; the Blue Star is the ninth region",
            )];
        }
        return match kernel.answer(9) {
            Outcome::Ready(o) => o.rows.clone(),
            Outcome::NotMeasured { rows, .. } | Outcome::Failed { rows } => rows.clone(),
        };
    }
    // the White Field's own experiment: census the page the field holds (enwik8 when it is there)
    if toks.len() == 1 && toks[0].eq_ignore_ascii_case("field") {
        if region != 7 {
            return vec![Row::new("NOTE").kv(
                "text",
                "there is no field to probe here; the White Field is the eighth region",
            )];
        }
        return match kernel.answer(8) {
            Outcome::Ready(o) => o
                .rows
                .iter()
                .filter(|r| {
                    matches!(
                        r.tag.as_str(),
                        "CENSUS" | "NOT_MEASURED" | "SCOPE" | "DISAGREE"
                    )
                })
                .cloned()
                .collect(),
            Outcome::NotMeasured { rows, .. } | Outcome::Failed { rows } => rows.clone(),
        };
    }
    // two numbers: the Hotel's question
    if toks.len() == 2 {
        if let (Some(a), Some(b)) = (parse_num(toks[0]), parse_num(toks[1])) {
            if let (Ok(a), Ok(b)) = (u64::try_from(a), u64::try_from(b)) {
                let mut r = Row::new("ROOMS").kv("a", a).kv("b", b);
                r = match first_level_apart(a, b) {
                    Some(l) => r.kv("first_level_apart", l),
                    None if a == b => r.kv("first_level_apart", "never").kv("note", "same_number"),
                    None => r.kv("first_level_apart", "beyond_60"),
                };
                return vec![r.kv("order", "lsf")];
            }
        }
    }
    if toks.len() == 1 {
        if let Some(n) = parse_num(toks[0]) {
            let mut rows = general_rows(n);
            region_rows(n, region, &mut rows);
            return rows;
        }
    }
    // words: the player's own bytes
    match region {
        5 => vec![secrets::prism_probe_row(raw.as_bytes())],
        7 => {
            let c = secrets::census_bytes(raw.as_bytes());
            let (q, r) = c.per10000();
            vec![Row::new("CENSUS")
                .kv("bytes", c.bytes)
                .kv("white", c.white)
                .kv("per10000", q)
                .kv("rem", r)
                .kv("def", "0x20,0x09,0x0A,0x0D")
                .kv("scope", "your_text")]
        }
        _ => vec![Row::new("NOTE")
            .kv("text", "nothing to measure in words here; try a number")
            .kv(
                "try",
                crate::story::REGION_TEXT[region as usize].first_probe,
            )],
    }
}

/// What each region adds to a numeric probe.
fn region_rows(n: i128, region: u8, rows: &mut Vec<Row>) {
    match region {
        0 => {
            let fits = trits::bal3_width(n, 3).is_ok();
            rows.push(
                Row::new("FITS")
                    .kv("n", n)
                    .kv("width", 3)
                    .kv("fits", u8::from(fits))
                    .kv("span", trits::span(3)),
            );
        }
        1 => {
            if (0..=i128::from(u64::MAX)).contains(&n) {
                let bits = 128 - (n as u128).leading_zeros();
                rows.push(
                    Row::new("PIDTRITS")
                        .kv("value", n)
                        .kv("bits", bits)
                        .kv("unbalanced_trits", trits::unbalanced_width(n as u128))
                        .kv("balanced_trits", trits::bal3(n).len())
                        .kv(
                            "centred_balanced_trits",
                            trits::bal3(n - (1i128 << 63)).len(),
                        )
                        .kv("pid_bits", 64)
                        .kv("note", "a_64_bit_pid_is_41_trits_when_centred"),
                );
            }
        }
        4 => {
            if let Ok(d) = u32::try_from(n) {
                if [1u32, 3, 9, 27, 81].contains(&d) {
                    let w = secrets::closure_walk(&[d]);
                    if let (Some((_, r)), Some((_, c))) =
                        (w.residuals.first(), w.arm_changes.first())
                    {
                        rows.push(
                            Row::new("CLOSURE")
                                .kv("depth", d)
                                .kv("arithmetic", "exact")
                                .kv("residual_at_root", r.to_decimal()),
                        );
                        rows.push(
                            Row::new("CENTRE")
                                .kv("depth", d)
                                .kv("arithmetic", "exact")
                                .kv("arm_changes", c),
                        );
                    }
                }
            }
        }
        6 => {
            if n >= 0 {
                let res = (n % 27) as u32;
                rows.push(
                    Row::new("PLANE")
                        .kv("n", n)
                        .kv("residue27", res)
                        .kv("centre_plane", u8::from(res % 3 == 0))
                        .kv("law", "primes_fill_only_the_coprime_cells"),
                );
            }
        }
        _ => {}
    }
}

/// The `look` extras for regions whose room has something to show beyond the question.
pub fn look_extras(region: u8, kernel: &Kernel) -> Vec<String> {
    match region {
        2 => {
            let mut v =
                vec!["The six cylinders (residue mod 6), and what sits on them:".to_string()];
            for r in 0..6u64 {
                let what = match r {
                    1 => "the +1 spoke (6k+1)",
                    5 => "the -1 spoke (6k-1)",
                    2 => "empty but for the prime 2",
                    3 => "empty but for the prime 3",
                    _ => "empty",
                };
                v.push(format!("  cylinder {r}: {what}"));
            }
            v
        }
        4 => {
            // the fracture line: the exact column the kernel computes now, the float column cited
            let w = secrets::closure_walk(&[9, 27, 81]);
            let mut v = vec![
                "The fracture line. Left of it, exact integers (computed now, 256-bit); right of it,".to_string(),
                "the same walk in float64 (CITED from compose.stdout, never run here):".to_string(),
            ];
            for ((d, r), (cd, cv, line)) in w
                .residuals
                .iter()
                .zip(crate::sources::CITED_FLOAT_RESIDUALS)
            {
                debug_assert_eq!(*d, cd);
                v.push(format!(
                    "  depth {d:>2}  exact residual {:>2}  |  float64 residual {cv}  (compose.stdout line {line})",
                    r.to_decimal()
                ));
            }
            v
        }
        6 => {
            let mut v = vec![
                "The cube, as three slices of 3x3 cells. Each cell shows its residue mod 27 and a mark:".to_string(),
                "  c = shares no factor with 27 (primes fill these), . = centre-aligned (a multiple of 3)".to_string(),
            ];
            for plane in 0..3u64 {
                v.push(format!("  slice {plane}:"));
                for row in 0..3u64 {
                    let mut line = String::from("   ");
                    for col in 0..3u64 {
                        let r = plane * 9 + row * 3 + col;
                        let mark = if r % 3 == 0 { '.' } else { 'c' };
                        line.push_str(&format!(" {r:>2}{mark}"));
                    }
                    v.push(line);
                }
            }
            v
        }
        7 => {
            let i = kernel.inputs();
            let state = match (&i.enwik8, &i.enwik8_note) {
                (Some(c), _) => format!("data/enwik8 is present ({} bytes): the census is for enwik8", c.bytes),
                (None, Some(n)) => format!("data/enwik8 was not used ({n}); the census is for the page you hold"),
                (None, None) => "data/enwik8 is absent: the census is for the page you hold (NOT_MEASURED for enwik8)".to_string(),
            };
            vec![state]
        }
        8 => {
            let i = kernel.inputs();
            match &i.mythos {
                Some(m) => {
                    let side = m
                        .sidecar
                        .as_deref()
                        .and_then(secrets::sidecar_hash)
                        .unwrap_or_else(|| "missing".to_string());
                    vec![format!("The star's sidecar says: {side}")]
                }
                None => vec!["The star's file is not here (NOT_MEASURED: NO_INPUT).".to_string()],
            }
        }
        _ => Vec::new(),
    }
}

/// The hop count between two regions on the river graph.
pub fn hops(from: u8, to: u8) -> usize {
    world::route(from, to).len()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::secrets::Inputs;

    fn kernel() -> Kernel {
        Kernel::new(20_260_801, None, Inputs::empty("x"))
    }

    fn tag<'a>(rows: &'a [Row], tag: &str) -> Vec<&'a Row> {
        rows.iter().filter(|r| r.tag == tag).collect()
    }

    #[test]
    fn parse_num_reads_decimal_hex_and_pids() {
        assert_eq!(parse_num("13"), Some(13));
        assert_eq!(parse_num("-4"), Some(-4));
        assert_eq!(parse_num("0xff"), Some(255));
        assert_eq!(parse_num("ffffffffffffffff"), Some(i128::from(u64::MAX)));
        assert_eq!(
            parse_num("1234567890123456"),
            Some(1_234_567_890_123_456),
            "all digits is decimal"
        );
        assert_eq!(parse_num("star"), None);
        assert_eq!(parse_num(""), None);
    }

    #[test]
    fn trits_13_fits_three_and_14_does_not() {
        let r13 = trits_rows("13");
        assert_eq!(r13[0].get("t"), Some("+,+,+"));
        let w3 = &r13[1];
        assert_eq!((w3.get("width"), w3.get("fits")), (Some("3"), Some("1")));
        let r14 = trits_rows("14");
        assert_eq!(r14[0].get("t"), Some("-,-,-,+"));
        let w3 = &r14[1];
        assert_eq!(
            (w3.get("width"), w3.get("fits"), w3.get("note")),
            (Some("3"), Some("0"), Some("OutOfRange"))
        );
        assert_eq!(w3.get("span"), Some("13"));
        // 14 fits 13 and 41
        assert_eq!(r14[2].get("fits"), Some("1"));
        assert_eq!(r14[3].get("fits"), Some("1"));
    }

    #[test]
    fn the_largest_pid_is_41_trits_unbalanced_and_42_raw_balanced_but_41_centred() {
        let rows = trits_rows("18446744073709551615");
        let unb = rows
            .iter()
            .find(|r| r.get("form") == Some("digits012"))
            .unwrap();
        assert_eq!(unb.get("width"), Some("41"));
        assert_eq!(
            rows[0].get("width"),
            Some("42"),
            "raw balanced needs one more"
        );
        let w41 = rows
            .iter()
            .find(|r| {
                r.get("width") == Some("41")
                    && r.get("form") == Some("balanced")
                    && r.get("fits").is_some()
            })
            .unwrap();
        assert_eq!(w41.get("fits"), Some("0"));
        let cen = rows.iter().find(|r| r.tag == "CENTRED").unwrap();
        assert_eq!(cen.get("balanced_width"), Some("41"));
        // and 3^40 - 1 is 40 digits unbalanced
        let rows = trits_rows("12157665459056928800");
        let unb = rows
            .iter()
            .find(|r| r.get("form") == Some("digits012"))
            .unwrap();
        assert_eq!(unb.get("width"), Some("40"));
    }

    #[test]
    fn numeric_probe_gives_cell_spoke_prime_and_five_rooms() {
        let mut k = kernel();
        let rows = probe_rows("13", 6, &mut k);
        assert_eq!(tag(&rows, "CUBECELL")[0].get("trits"), Some("1,1,1"));
        assert_eq!(tag(&rows, "SPOKE")[0].get("spoke"), Some("+1"));
        assert_eq!(tag(&rows, "PRIME")[0].get("is_prime"), Some("1"));
        assert_eq!(tag(&rows, "ROOM").len(), 5);
        assert_eq!(tag(&rows, "PLANE")[0].get("centre_plane"), Some("0"));
        let rows = probe_rows("3", 6, &mut k);
        assert_eq!(tag(&rows, "CUBECELL")[0].get("trits"), Some("0,1,0"));
        assert_eq!(tag(&rows, "PLANE")[0].get("centre_plane"), Some("1"));
        let rows = probe_rows("5", 2, &mut k);
        assert_eq!(tag(&rows, "SPOKE")[0].get("spoke"), Some("-1"));
        let rows = probe_rows("2", 3, &mut k);
        assert_eq!(tag(&rows, "ROOM")[0].get("room"), Some("-1,1,0"));
    }

    #[test]
    fn hollow_probe_says_whether_it_fits_three_trits() {
        let mut k = kernel();
        assert_eq!(
            tag(&probe_rows("13", 0, &mut k), "FITS")[0].get("fits"),
            Some("1")
        );
        assert_eq!(
            tag(&probe_rows("14", 0, &mut k), "FITS")[0].get("fits"),
            Some("0")
        );
    }

    #[test]
    fn flow_probe_of_a_pid_reports_the_trits_three_ways() {
        let mut k = kernel();
        let pid = k.agents[0].pid.clone();
        let rows = probe_rows(&pid, 1, &mut k);
        let p = tag(&rows, "PIDTRITS");
        assert_eq!(p.len(), 1, "a 16-hex pid is read as hex: {rows:?}");
        let u: u32 = p[0].get("unbalanced_trits").unwrap().parse().unwrap();
        assert!((38..=41).contains(&u));
    }

    #[test]
    fn rupture_probe_walks_the_exact_closure_to_the_depth_asked() {
        let mut k = kernel();
        for d in ["1", "3", "9", "27", "81"] {
            let rows = probe_rows(d, 4, &mut k);
            let c = tag(&rows, "CLOSURE")[0];
            assert_eq!(c.get("residual_at_root"), Some("0"), "depth {d}");
            assert_eq!(tag(&rows, "CENTRE")[0].get("arm_changes"), Some("0"));
        }
        assert!(tag(&probe_rows("5", 4, &mut k), "CLOSURE").is_empty());
    }

    #[test]
    fn hotel_probe_of_two_numbers_finds_the_first_level_apart() {
        let mut k = kernel();
        let r = probe_rows("1000003 1000033", 3, &mut k);
        let l: usize = r[0].get("first_level_apart").unwrap().parse().unwrap();
        assert!((1..=5).contains(&l), "{r:?}");
        let again = probe_rows("2 2", 3, &mut k);
        assert_eq!(again[0].get("first_level_apart"), Some("never"));
        assert_eq!(first_level_apart(2, 3), Some(1));
    }

    #[test]
    fn words_are_measured_in_the_regions_that_ask_for_them() {
        let mut k = kernel();
        let p = probe_rows("hello", 5, &mut k);
        assert_eq!(p[0].tag, "PRISM");
        assert_eq!(p[0].get("roundtrip"), Some("EXACT"));
        assert_eq!(p[0].get("bytes"), Some("5"));
        assert_eq!(p[0].get("symbols"), Some("4"));
        let c = probe_rows("a b c", 7, &mut k);
        assert_eq!(c[0].get("white"), Some("2"));
        assert_eq!(c[0].get("per10000"), Some("4000"));
        assert_eq!(probe_rows("hello", 0, &mut k)[0].tag, "NOTE");
        assert_eq!(probe_rows("", 0, &mut k)[0].tag, "USAGE");
    }

    #[test]
    fn probe_star_needs_the_blue_star_and_the_file() {
        let mut k = kernel();
        assert_eq!(probe_rows("star", 0, &mut k)[0].tag, "NOTE");
        let rows = probe_rows("star", 8, &mut k);
        assert_eq!(
            rows[0].tag, "NOT_MEASURED",
            "no file handed in: a missing file is not a zero"
        );
        assert_eq!(rows[0].get("reason"), Some("NO_INPUT"));
    }

    #[test]
    fn every_row_is_ascii_and_ends_in_json_zero() {
        let mut k = kernel();
        for (raw, region) in [
            ("13", 6u8),
            ("hello", 5),
            ("a b", 7),
            ("81", 4),
            ("2 3", 3),
            ("-7", 0),
        ] {
            for r in probe_rows(raw, region, &mut k) {
                let l = r.line();
                assert!(l.is_ascii() && l.ends_with("|json=0"), "{l}");
            }
        }
        for r in trits_rows("-5") {
            assert!(r.line().is_ascii());
        }
    }
}
