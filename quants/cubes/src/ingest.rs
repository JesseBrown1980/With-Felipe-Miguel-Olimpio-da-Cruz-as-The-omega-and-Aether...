//! Registry slot 25, `Q-WORD-GLYPH-BUCKET8-v1` (registry line 31, "word-glyph+bucket-vector",
//! owner "Algorithms-of-Asolaria-liris-v2"; liris v2 catalog section F, lines 239-247, names the
//! code as the Google Drive document -> cube ingest).
//!
//! Integer port of `cubes/ingest-google-to-cube.mjs` of
//! what-is-asolaria---how-do-we-get-reductions-in-everything @ 29307bf (blob ba6e96de), cited as
//! `ingest:<line>`: the slice, the content address, the 8-bucket token quant, the
//! verb/noun glyph catalog, the reduction ratios, rows 41-46, the footer (47-48) and the row
//! self-check (50-51). `tools/referee.py` mirrors the same lines in stdlib Python.
//!
//! Not ported: line 40, the `INGESTHDR` row, whose literal carries the owner's personal e-mail
//! address (the owner's own public-repo scan, asolaria-whiteroom-engine `test/spine.test.mjs:42`,
//! lists that address as "operator personal email"); [`assemble`] takes it as the caller's first
//! row. Lines 11-13 and 52 (argument defaults and the fixed Windows output path) are file I/O.

use crate::sha256_hex;

/// The stop list of `ingest:28`, as the one space-separated string upstream splits.
pub const STOP_WORDS: &str = "the a an is it of to and or in on for as by with not no but its are be that this each so an at into we us our their they them then than only one two more most every all any can could should would";

/// `ingest:45`.
pub const LINEAGE_ROW: &str = "INGESTLINEAGE|path=drive-doc->slice->tuple/HBP->quant8->cube10->verb-noun-glyph-catalog|maps_into=existing-BEHCS-cubes+index-language-catalogs|new_infra_required=NONE-beyond-this-ingestor|json=0";

/// `ingest:46`.
pub const BOUNDARY_ROW: &str = "INGESTBOUNDARY|raw_content_published=0|provider_calls=0|device_mutation=local-receipt-only|gemini_notebooklm=PROPOSE/slice-sources-not-dependencies|notebooklm_write_api=UNVERIFIED|json=0";

/// The `verdict` field of the footer row (`ingest:48`).
pub const FOOTER_VERDICT: &str = "INGEST-NOT-INTEGRATE-PROVEN-on-1-real-drive-doc";

/// Everything `ingest:15-37` computes from one source file.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Ingest {
    /// `raw_bytes = Buffer.byteLength(text, 'utf8')` (`ingest:16`).
    pub raw_bytes: u64,
    /// `full_sha = sha(text)` (`ingest:17`).
    pub full_sha: String,
    /// `cube10 = full_sha.slice(0, 20)` (`ingest:18`).
    pub cube10: String,
    /// `handle8 = full_sha.slice(0, 16)` (`ingest:19`).
    pub handle8: String,
    /// `toks` (`ingest:23`).
    pub tokens: Vec<String>,
    /// `proj` (`ingest:22-24`): eight signed bucket counts.
    pub proj: [i64; 8],
    /// `vocab` (`ingest:29-31`): content terms with their counts, sorted by count, descending,
    /// ties in first-occurrence order.
    pub vocab: Vec<(String, u64)>,
    /// `ratio_raw_to_handle = Math.round(raw_bytes / 8)` (`ingest:36`).
    pub ratio_raw_to_handle: u64,
    /// `ratio_raw_to_cube = Math.round(raw_bytes / 10)` (`ingest:37`).
    pub ratio_raw_to_cube: u64,
}

fn is_token_byte(b: u8) -> bool {
    b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_' || b == b'-'
}

/// `text.toLowerCase().match(/[a-z][a-z0-9_-]{1,}/g) || []` (`ingest:23`).
///
/// Only ASCII can match, and the only non-ASCII characters whose lowercase form contains a
/// character of the token class are U+0130 (to `i` U+0307) and U+212A (to `k`); Rust's
/// `str::to_lowercase` and JavaScript's `toLowerCase` map both the same way.
pub fn tokens(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let b = lower.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < b.len() {
        if b[i].is_ascii_lowercase() && i + 1 < b.len() && is_token_byte(b[i + 1]) {
            let start = i;
            i += 2;
            while i < b.len() && is_token_byte(b[i]) {
                i += 1;
            }
            out.push(lower[start..i].to_string());
        } else {
            i += 1;
        }
    }
    out
}

/// `[...t].reduce((a, c) => (a * 131 + c.charCodeAt(0)) >>> 0, 7)` (`ingest:24`): every token is
/// ASCII, so each character is one byte, and `a * 131 + c` stays below 2^53 before `>>> 0`.
pub fn token_hash(token: &str) -> u32 {
    token
        .bytes()
        .fold(7u32, |a, c| a.wrapping_mul(131).wrapping_add(u32::from(c)))
}

/// `quant8` (`ingest:25`): `Math.max(0, Math.min(255, Math.round(128 + v)))` per bucket.
pub fn quant8(proj: &[i64; 8]) -> [u8; 8] {
    proj.map(|v| (128 + v).clamp(0, 255) as u8)
}

/// One `INGESTCATALOG` entry, `${w}:${n}:g${sha(w).slice(0, 8)}` (`ingest:33`): the word, its
/// count and its digest glyph.
pub fn catalog_entry(word: &str, count: u64) -> String {
    format!("{word}:{count}:g{}", &sha256_hex(word.as_bytes())[..8])
}

/// `Math.round(raw_bytes / 8)` and `Math.round(raw_bytes / 10)` (`ingest:36-37`) for
/// `raw_bytes < 2^52`: `n / 8` is exact, and `n / 10` lies within half a unit of the exact
/// quotient, which is `k + 1/2` only when `n % 10 == 5` (then it is exact too).
pub fn reduction_ratios(raw_bytes: u64) -> (u64, u64) {
    ((raw_bytes + 4) / 8, (raw_bytes + 5) / 10)
}

fn is_stop(t: &str) -> bool {
    STOP_WORDS.split(' ').any(|w| w == t)
}

/// `ingest:15-37` over the bytes of the source file. `fs.readFileSync(SRC, 'utf8')` decodes
/// invalid UTF-8 to U+FFFD per maximal subpart and keeps a byte-order mark;
/// `String::from_utf8_lossy` does the same.
pub fn ingest(file: &[u8]) -> Ingest {
    let text = String::from_utf8_lossy(file);
    let raw_bytes = text.len() as u64;
    let full_sha = sha256_hex(text.as_bytes());
    let toks = tokens(&text);
    let mut proj = [0i64; 8];
    for t in &toks {
        let h = token_hash(t);
        proj[(h & 7) as usize] += if h & 8 != 0 { -1 } else { 1 };
    }
    let mut vocab: Vec<(String, u64)> = Vec::new();
    let mut index = std::collections::HashMap::new();
    for t in &toks {
        if t.len() < 4 || is_stop(t) {
            continue;
        }
        match index.get(t.as_str()) {
            Some(&k) => {
                let entry: &mut (String, u64) = &mut vocab[k];
                entry.1 += 1;
            }
            None => {
                index.insert(t.clone(), vocab.len());
                vocab.push((t.clone(), 1));
            }
        }
    }
    // Array.prototype.sort is stable; ties keep Map insertion (first-occurrence) order.
    vocab.sort_by(|a, b| b.1.cmp(&a.1));
    let (ratio_raw_to_handle, ratio_raw_to_cube) = reduction_ratios(raw_bytes);
    Ingest {
        raw_bytes,
        cube10: full_sha[..20].to_string(),
        handle8: full_sha[..16].to_string(),
        full_sha,
        tokens: toks,
        proj,
        vocab,
        ratio_raw_to_handle,
        ratio_raw_to_cube,
    }
}

impl Ingest {
    /// `quant8` joined with `,` (`ingest:25`).
    pub fn quant8_text(&self) -> String {
        quant8(&self.proj).map(|q| q.to_string()).join(",")
    }

    /// `sample_top10` joined with a space (`ingest:33`, `ingest:44`).
    pub fn top10(&self) -> String {
        self.vocab
            .iter()
            .take(10)
            .map(|(w, n)| catalog_entry(w, *n))
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Rows `ingest:41-46` (the `INGESTHDR` row of line 40 is the caller's).
    pub fn rows(&self) -> [String; 6] {
        [
            format!(
                "INGESTSLICE|raw_bytes={}|sha256_16={}|tokens={}|distinct_content_terms={}|json=0",
                self.raw_bytes,
                self.handle8,
                self.tokens.len(),
                self.vocab.len()
            ),
            format!(
                "INGESTCUBE|cube10={}|host_handle8={}|quant8={}|schema=asolaria.drive_ingest.cube.v1|descriptor_only=1|json=0",
                self.cube10,
                self.handle8,
                self.quant8_text()
            ),
            format!(
                "INGESTREDUCTION|raw_bytes={}|host_handle=8B|cube_glyph=10B|raw->handle={}x|raw->cube={}x|note=referential-content-address-not-lossless|json=0",
                self.raw_bytes, self.ratio_raw_to_handle, self.ratio_raw_to_cube
            ),
            format!(
                "INGESTCATALOG|kind=verb-noun-glyph-vocabulary|distinct_terms={}|sample_top10={}|each_term=glyph-tuple-addressable|json=0",
                self.vocab.len(),
                self.top10()
            ),
            LINEAGE_ROW.to_string(),
            BOUNDARY_ROW.to_string(),
        ]
    }
}

/// `ingest:47-51` over all rows (the caller's `INGESTHDR` row first): `Ok(body + ftr)`, or the
/// rows the self-check of line 50 rejects (a `{`, `}` or `\r`, or no `|json=0` ending), where
/// upstream prints `SELF-CHECK FAIL` and exits 1.
pub fn assemble(rows: &[String]) -> Result<String, Vec<String>> {
    let body = rows.join("\n") + "\n";
    let ftr = format!(
        "INGESTFTR|sha256={}|rows={}|verdict={FOOTER_VERDICT}|json=0\n",
        sha256_hex(body.as_bytes()),
        rows.len()
    );
    let out = body + &ftr;
    let bad: Vec<String> = out
        .split('\n')
        .filter(|r| !r.is_empty())
        .filter(|r| r.contains(['{', '}', '\r']) || !r.ends_with("|json=0"))
        .map(str::to_string)
        .collect();
    if bad.is_empty() {
        Ok(out)
    } else {
        Err(bad)
    }
}
