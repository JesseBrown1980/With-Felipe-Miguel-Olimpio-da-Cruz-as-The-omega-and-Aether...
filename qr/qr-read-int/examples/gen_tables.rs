//! Writes `src/tables.rs` and `src/shift_jis.rs` from the jsQR build inside the owner's page
//! (the-colour-qr @ 1938a9b `index.html`, sha256 7b9a0830aa01efe7…, vendored at
//! `qr/colour-qr/vendor/the-colour-qr/index.html`). Every table the reader uses is read from
//! the page's own lines, never typed by hand:
//!
//!   FORMAT_INFO_TABLE         index.html:652-685
//!   AlphanumericCharacterCodes index.html:1012-1018
//!   shiftJISTable             index.html:1230-8268
//!   VERSIONS                  index.html:8407-9712
//!
//! Usage: gen_tables <index.html> [--check]
//! Without `--check` it writes both files; with it, it exits 1 unless both files on disk equal
//! what it would write.
#![forbid(unsafe_code)]

use std::fmt::Write as _;
use std::path::PathBuf;
use std::process::ExitCode;

const FORMAT: (usize, usize) = (652, 685);
const ALNUM: (usize, usize) = (1012, 1018);
const SJIS: (usize, usize) = (1230, 8268);
const VERSIONS: (usize, usize) = (8407, 9712);

fn line<'a>(lines: &[&'a str], n: usize) -> Result<&'a str, String> {
    lines
        .get(n - 1)
        .copied()
        .ok_or(format!("index.html has no line {n}"))
}

fn expect(lines: &[&str], n: usize, text: &str) -> Result<(), String> {
    let got = line(lines, n)?;
    if got == text {
        Ok(())
    } else {
        Err(format!("index.html:{n} is {got:?}, expected {text:?}"))
    }
}

fn hex(s: &str) -> Result<u32, String> {
    let digits = s
        .strip_prefix("0x")
        .ok_or(format!("not a hex literal: {s:?}"))?;
    u32::from_str_radix(digits, 16).map_err(|e| format!("{s:?}: {e}"))
}

fn num(s: &str) -> Result<u32, String> {
    if s.starts_with("0x") {
        hex(s)
    } else {
        s.parse().map_err(|e| format!("{s:?}: {e}"))
    }
}

/// The value after `key:` on a line, up to the next `,` or `}` or `]`.
fn field<'a>(l: &'a str, key: &str) -> Option<&'a str> {
    let at = l.find(&format!("{key}: "))? + key.len() + 2;
    let rest = &l[at..];
    let end = rest.find([',', '}', ']']).unwrap_or(rest.len());
    Some(rest[..end].trim())
}

struct Version {
    info_bits: Option<u32>,
    number: u32,
    centers: Vec<u32>,
    levels: Vec<(u32, Vec<(u32, u32)>)>,
}

fn format_table(lines: &[&str]) -> Result<Vec<(u32, u32, u32)>, String> {
    expect(lines, FORMAT.0, "var FORMAT_INFO_TABLE = [")?;
    expect(lines, FORMAT.1, "];")?;
    let mut rows = Vec::new();
    for n in FORMAT.0 + 1..FORMAT.1 {
        let l = line(lines, n)?;
        let bits = field(l, "bits").ok_or(format!("index.html:{n}: no bits"))?;
        let ec = field(l, "errorCorrectionLevel").ok_or(format!("index.html:{n}: no level"))?;
        let mask = field(l, "dataMask").ok_or(format!("index.html:{n}: no mask"))?;
        rows.push((hex(bits)?, num(ec)?, num(mask)?));
    }
    if rows.len() != 32 {
        return Err(format!(
            "FORMAT_INFO_TABLE has {} rows, expected 32",
            rows.len()
        ));
    }
    Ok(rows)
}

fn alnum_table(lines: &[&str]) -> Result<Vec<u8>, String> {
    expect(lines, ALNUM.0, "var AlphanumericCharacterCodes = [")?;
    expect(lines, ALNUM.1, "];")?;
    let mut out = Vec::new();
    for n in ALNUM.0 + 1..ALNUM.1 {
        for item in line(lines, n)?.split(',') {
            let item = item.trim();
            if item.is_empty() {
                continue;
            }
            let inner = item
                .strip_prefix('"')
                .and_then(|s| s.strip_suffix('"'))
                .ok_or(format!("index.html:{n}: {item:?}"))?;
            let b = inner.as_bytes();
            if b.len() != 1 {
                return Err(format!("index.html:{n}: {item:?} is not one character"));
            }
            out.push(b[0]);
        }
    }
    if out.len() != 45 {
        return Err(format!(
            "AlphanumericCharacterCodes has {} entries",
            out.len()
        ));
    }
    Ok(out)
}

fn sjis_table(lines: &[&str]) -> Result<Vec<(u32, u32)>, String> {
    expect(lines, SJIS.0, "exports.shiftJISTable = {")?;
    expect(lines, SJIS.1, "};")?;
    let mut out: Vec<(u32, u32)> = Vec::new();
    for n in SJIS.0 + 1..SJIS.1 {
        let l = line(lines, n)?;
        let body = l
            .strip_prefix("    ")
            .and_then(|s| s.strip_suffix(','))
            .ok_or(format!("index.html:{n}: {l:?}"))?;
        let (k, v) = body
            .split_once(": ")
            .ok_or(format!("index.html:{n}: {l:?}"))?;
        let (k, v) = (hex(k)?, hex(v)?);
        if k > 0xffff || v > 0xffff || (0xd800..=0xdfff).contains(&v) {
            return Err(format!(
                "index.html:{n}: {k:#x} -> {v:#x} is not a BMP scalar"
            ));
        }
        out.push((k, v));
    }
    // The page lists 0xA1-0xDF after 0x9FFC; a JS object looks keys up by value, so the rows
    // are sorted by key here for a binary search. No key appears twice.
    out.sort_unstable();
    if out.windows(2).any(|w| w[0].0 == w[1].0) {
        return Err("shiftJISTable has a repeated key".into());
    }
    Ok(out)
}

fn versions_table(lines: &[&str]) -> Result<Vec<Version>, String> {
    expect(lines, VERSIONS.0, "exports.VERSIONS = [")?;
    expect(lines, VERSIONS.1, "];")?;
    let mut out: Vec<Version> = Vec::new();
    for n in VERSIONS.0 + 1..VERSIONS.1 {
        let l = line(lines, n)?;
        let t = l.trim();
        if matches!(
            t,
            "{" | "}," | "errorCorrectionLevels: [" | "]," | "ecBlocks: ["
        ) {
            continue;
        }
        if let Some(v) = field(t, "infoBits") {
            let info_bits = if v == "null" { None } else { Some(hex(v)?) };
            out.push(Version {
                info_bits,
                number: 0,
                centers: Vec::new(),
                levels: Vec::new(),
            });
            continue;
        }
        let cur = out
            .last_mut()
            .ok_or(format!("index.html:{n}: field before infoBits"))?;
        if let Some(v) = field(t, "versionNumber") {
            cur.number = num(v)?;
        } else if let Some(at) = t.strip_prefix("alignmentPatternCenters: [") {
            let inner = at
                .strip_suffix("],")
                .ok_or(format!("index.html:{n}: {t:?}"))?;
            cur.centers = inner
                .split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(num)
                .collect::<Result<_, _>>()?;
        } else if let Some(v) = field(t, "ecCodewordsPerBlock") {
            cur.levels.push((num(v)?, Vec::new()));
        } else if t.contains("numBlocks") {
            let blocks = field(t, "numBlocks").ok_or(format!("index.html:{n}"))?;
            let data = field(t, "dataCodewordsPerBlock").ok_or(format!("index.html:{n}"))?;
            let level = cur
                .levels
                .last_mut()
                .ok_or(format!("index.html:{n}: block before level"))?;
            level.1.push((num(blocks)?, num(data)?));
        } else {
            return Err(format!("index.html:{n}: unread line {t:?}"));
        }
    }
    for (i, v) in out.iter().enumerate() {
        let want = u32::try_from(i + 1).unwrap_or(0);
        if v.number != want || v.levels.len() != 4 || v.levels.iter().any(|l| l.1.is_empty()) {
            return Err(format!("VERSIONS[{i}] is not version {want} with 4 levels"));
        }
    }
    if out.len() != 40 {
        return Err(format!("VERSIONS has {} entries", out.len()));
    }
    Ok(out)
}

const HEADER: &str = "// @generated by examples/gen_tables.rs from the jsQR build in the owner's page:\n\
// the-colour-qr @ 1938a9b index.html (sha256 7b9a0830aa01efe770c8b69a4c5712069fba3a82eab7c00ab4dc2392379d573a).\n\
// Do not edit; run `cargo run --example gen_tables -- <index.html>` and check with `--check`.\n";

fn render_tables(
    format: &[(u32, u32, u32)],
    alnum: &[u8],
    versions: &[Version],
) -> Result<String, std::fmt::Error> {
    let mut s = String::from(HEADER);
    writeln!(s)?;
    writeln!(s, "use crate::decode::{{EcBlocks, FormatInfo, Version}};")?;
    writeln!(s)?;
    writeln!(
        s,
        "/// `FORMAT_INFO_TABLE`, index.html:{}-{}: (bits, error correction level, data mask).",
        FORMAT.0, FORMAT.1
    )?;
    writeln!(
        s,
        "#[rustfmt::skip]\npub static FORMAT_INFO_TABLE: [(u32, FormatInfo); 32] = ["
    )?;
    for (bits, ec, mask) in format {
        writeln!(
            s,
            "    ({bits:#06X}, FormatInfo {{ error_correction_level: {ec}, data_mask: {mask} }}),"
        )?;
    }
    writeln!(s, "];")?;
    writeln!(s)?;
    writeln!(
        s,
        "/// `AlphanumericCharacterCodes`, index.html:{}-{}.",
        ALNUM.0, ALNUM.1
    )?;
    write!(
        s,
        "#[rustfmt::skip]\npub static ALPHANUMERIC: &[u8; 45] = b\""
    )?;
    for b in alnum {
        write!(s, "{}", char::from(*b))?;
    }
    writeln!(s, "\";")?;
    writeln!(s)?;
    writeln!(
        s,
        "/// `VERSIONS`, index.html:{}-{}. Levels are indexed by the format table's level number.",
        VERSIONS.0, VERSIONS.1
    )?;
    writeln!(
        s,
        "#[rustfmt::skip]\npub static VERSIONS: [Version; 40] = ["
    )?;
    for v in versions {
        writeln!(s, "    Version {{")?;
        match v.info_bits {
            None => writeln!(s, "        info_bits: None,")?,
            Some(b) => writeln!(s, "        info_bits: Some({b:#07X}),")?,
        }
        writeln!(s, "        version_number: {},", v.number)?;
        let centers: Vec<String> = v.centers.iter().map(u32::to_string).collect();
        writeln!(
            s,
            "        alignment_pattern_centers: &[{}],",
            centers.join(", ")
        )?;
        writeln!(s, "        error_correction_levels: [")?;
        for (ec, blocks) in &v.levels {
            let b: Vec<String> = blocks.iter().map(|(n, d)| format!("({n}, {d})")).collect();
            writeln!(
                s,
                "            EcBlocks {{ ec_codewords_per_block: {ec}, ec_blocks: &[{}] }},",
                b.join(", ")
            )?;
        }
        writeln!(s, "        ],")?;
        writeln!(s, "    }},")?;
    }
    writeln!(s, "];")?;
    Ok(s)
}

fn render_sjis(table: &[(u32, u32)]) -> Result<String, std::fmt::Error> {
    let mut s = String::from(HEADER);
    writeln!(s)?;
    writeln!(
        s,
        "/// `shiftJISTable`, index.html:{}-{}: (Shift JIS code, UTF-16 code unit), sorted by key.",
        SJIS.0, SJIS.1
    )?;
    writeln!(
        s,
        "#[rustfmt::skip]\npub static SHIFT_JIS: [(u16, u16); {}] = [",
        table.len()
    )?;
    for chunk in table.chunks(6) {
        let row: Vec<String> = chunk
            .iter()
            .map(|(k, v)| format!("({k:#06X}, {v:#06X})"))
            .collect();
        writeln!(s, "    {},", row.join(", "))?;
    }
    writeln!(s, "];")?;
    Ok(s)
}

fn run() -> Result<bool, String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let check = args.iter().any(|a| a == "--check");
    let page = args
        .iter()
        .find(|a| *a != "--check")
        .ok_or("usage: gen_tables <index.html> [--check]")?;
    let text = std::fs::read_to_string(page).map_err(|e| format!("{page}: {e}"))?;
    let lines: Vec<&str> = text.split('\n').collect();
    let tables = render_tables(
        &format_table(&lines)?,
        &alnum_table(&lines)?,
        &versions_table(&lines)?,
    )
    .map_err(|e| e.to_string())?;
    let sjis_rows = sjis_table(&lines)?;
    let sjis = render_sjis(&sjis_rows).map_err(|e| e.to_string())?;
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut same = true;
    for (name, body) in [("tables.rs", &tables), ("shift_jis.rs", &sjis)] {
        let path = root.join(name);
        if check {
            let on_disk = std::fs::read_to_string(&path).unwrap_or_default();
            let ok = on_disk == *body;
            println!(
                "GEN_TABLES|file=src/{name}|bytes={}|equal={}|json=0",
                body.len(),
                u8::from(ok)
            );
            same &= ok;
        } else {
            std::fs::write(&path, body).map_err(|e| format!("{}: {e}", path.display()))?;
            println!(
                "GEN_TABLES|file=src/{name}|bytes={}|written=1|json=0",
                body.len()
            );
        }
    }
    println!("GEN_TABLES_SJIS|entries={}|json=0", sjis_rows.len());
    Ok(same)
}

fn main() -> ExitCode {
    match run() {
        Ok(true) => ExitCode::SUCCESS,
        Ok(false) => ExitCode::FAILURE,
        Err(e) => {
            eprintln!("gen_tables: {e}");
            ExitCode::FAILURE
        }
    }
}
