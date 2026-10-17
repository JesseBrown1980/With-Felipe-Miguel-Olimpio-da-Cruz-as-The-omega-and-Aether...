/// Pull a value for `key` out of one HBP row's pipe-fields. Accepts BOTH delimiter
/// shapes the office uses: `key=value` (combined FORMULA/CHIEF/SOS/PROF rows and the
/// fabric feed) and `key|value` (per-seat sup-*/agent-* files where the tag is its own
/// field). Field 0 is the row tag and is skipped; matching is case-sensitive on the
/// exact key. For `key|value` shape the value is the field immediately after the key
/// field. Returns the first match found.
fn row_value(line: &str, key: &str) -> Option<String> {
    let fields: Vec<&str> = line.split('|').collect();
    // key=value shape (skip field 0, the row tag).
    for part in fields.iter().skip(1) {
        if let Some((k, v)) = part.split_once('=') {
            if k.trim() == key {
                return Some(v.trim().to_string());
            }
        }
    }
    // key|value shape: a bare field equal to `key`, value is the next field.
    for idx in 1..fields.len() {
        if fields[idx].trim() == key {
            if let Some(next) = fields.get(idx + 1) {
                return Some(next.trim().to_string());
            }
        }
    }
    None
}

/// Extract the 8-byte handle (16 hex chars) from a row. Handles `PID=<h>` (combined +
/// feed `pid=`) and `PID|<h>|...` (per-seat). We try, in order: `PID=`, `pid=`, then
/// the `PID|` first-sub-field. Returns lowercased handle if it looks like hex.
fn row_handle8(line: &str) -> Option<String> {
    let raw = row_value(line, "PID").or_else(|| row_value(line, "pid"))?;
    let handle = raw.split_whitespace().next().unwrap_or("").to_string();
    if !handle.is_empty() {
        Some(handle.to_lowercase())
    } else {
        None
    }
}

/// Build a seat from one combined/feed row given its row tag. Returns None if no
/// usable handle8 is present (e.g. a header or footer row).
fn seat_from_row(line: &str, source: &str) -> Option<Seat> {
    let handle8 = row_handle8(line)?;
    // The human name is field index 1 (right after the row tag) for the combined
    // shapes (FORMULA|<name>|..., CHIEF|<name>|..., SOS|<name>|..., PROF|<name>|...).
    // For the feed REG rows the name lives in `name=<n>`.
    let name = row_value(line, "name")
        .unwrap_or_else(|| line.split('|').nth(1).unwrap_or("").trim().to_string());
    Some(Seat {
        name,
        handle8,
        cube_bh: row_value(line, "CUBE_BH").unwrap_or_default(),
        hilbert: row_value(line, "HILBERT")
            .or_else(|| row_value(line, "hilbert"))
            .unwrap_or_default(),
        class: row_value(line, "CLASS")
            .or_else(|| row_value(line, "class"))
            .unwrap_or_default(),
        layer: row_value(line, "LAYER")
            .or_else(|| row_value(line, "layer"))
            .unwrap_or_default(),
        source: source.to_string(),
    })
}

/// Parse a single per-seat file body (sup-*.hbp / agent-*.hbp): one seat, fields on
/// their own `TAG|value` lines.
fn seat_from_per_seat_file(body: &str, source: &str) -> Option<Seat> {
    let mut handle8 = String::new();
    let mut name = String::new();
    let mut hilbert = String::new();
    let mut layer = String::new();
    let mut class = String::new();
    let mut cube_bh = String::new();
    for line in body.lines() {
        let line = line.trim_end();
        let mut it = line.splitn(2, '|');
        let tag = it.next().unwrap_or("").trim();
        let rest = it.next().unwrap_or("");
        match tag {
            "NAME" => name = rest.trim().to_string(),
            // PID|<handle>|birth=... — handle is the first sub-field.
            "PID" => {
                handle8 = rest.split('|').next().unwrap_or("").trim().to_lowercase();
            }
            "HILBERT" => hilbert = rest.split('|').next().unwrap_or("").trim().to_string(),
            "LAYER" => layer = rest.split('|').next().unwrap_or("").trim().to_string(),
            "CLASS" => class = rest.split('|').next().unwrap_or("").trim().to_string(),
            "CUBE_BH" => cube_bh = rest.split('|').next().unwrap_or("").trim().to_string(),
            _ => {}
        }
    }
    if handle8.is_empty() {
        return None;
    }
    Some(Seat {
        name,
        handle8,
        cube_bh,
        hilbert,
        class,
        layer,
        source: source.to_string(),
    })
}
