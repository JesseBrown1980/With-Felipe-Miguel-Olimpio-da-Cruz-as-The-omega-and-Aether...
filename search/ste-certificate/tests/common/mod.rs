//! Readers for the HBP fixtures (written by tools/ste_referee.py) and the vendored records.

/// The `key=value` fields of every row of `text` whose first field is `kind`.
pub fn rows<'a>(text: &'a str, kind: &str) -> Vec<Vec<(&'a str, &'a str)>> {
    text.lines()
        .filter(|l| !l.starts_with('#') && !l.is_empty())
        .filter_map(|l| {
            let mut parts = l.split('|');
            (parts.next() == Some(kind)).then(|| {
                parts
                    .map(|f| f.split_once('=').expect("key=value field"))
                    .collect()
            })
        })
        .collect()
}

/// The value of `key` in one row.
pub fn get<'a>(row: &[(&'a str, &'a str)], key: &str) -> &'a str {
    row.iter()
        .find(|(k, _)| *k == key)
        .unwrap_or_else(|| panic!("field {key} missing"))
        .1
}

/// `get` parsed as an unsigned integer.
pub fn num(row: &[(&str, &str)], key: &str) -> u128 {
    get(row, key).parse().expect("decimal integer")
}

/// The `text` of every `OUT` row of `script`, in line order.
pub fn expected_stdout(script: &str) -> Vec<String> {
    let text = include_str!("../fixtures/expected-stdout.hbp");
    rows(text, "OUT")
        .iter()
        .filter(|r| get(r, "script") == script)
        .map(|r| get(r, "text").to_string())
        .collect()
}

/// Whitespace-separated fields: the records separate fields with runs of spaces, the scripts
/// print one space.
pub fn fields(line: &str) -> Vec<&str> {
    line.split_whitespace().collect()
}
