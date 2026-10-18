//! The NDJSON log-rotation decision: rotate a file past the byte or line threshold, refuse past the sanity cap.
//! Ports gc.ts:102-166: the decision (:120-138), the archive name (:96, :141), the `EVT-GC-ROTATED` sentence
//! (:146) and its summary row (:147-156, as HBP text). The stat, line count, rename and appends are boundaries.

use crate::hbp::Row;

/// Thresholds from the `runGc` config (gc.ts:102-104): 50 MiB, 100_000 lines, 500 MiB hard cap.
pub struct GcConfig {
    pub max_bytes: u64,
    pub max_lines: u64,
    pub sanity_bytes: u64,
}

impl Default for GcConfig {
    fn default() -> Self {
        GcConfig {
            max_bytes: 50 * 1024 * 1024,
            max_lines: 100_000,
            sanity_bytes: 500 * 1024 * 1024,
        }
    }
}

/// Why a file did or did not rotate (gc.ts:31 `GcRotation.reason`).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Reason {
    None,
    Bytes,
    Lines,
}

impl Reason {
    /// The lowercase tag upstream writes (gc.ts:134, :154, :161).
    pub fn tag(self) -> &'static str {
        match self {
            Reason::None => "none",
            Reason::Bytes => "bytes",
            Reason::Lines => "lines",
        }
    }
}

/// The rotation decision for one file (gc.ts:117-166), without the filesystem side effects.
pub struct Decision {
    pub rotated: bool,
    pub reason: Option<Reason>,
    pub error: Option<String>,
    pub bytes_before: u64,
    pub lines_before: Option<u64>,
    pub summary_sentence: Option<String>,
}

/// The decision for a file of `size` bytes and `line_count` lines (gc.ts:119-146). `line_count` is the true
/// count; the `size > maxBytes ? -1` rule of :128 is applied here, so the count is ignored on the byte path.
pub fn decide(basename: &str, size: u64, line_count: u64, cfg: &GcConfig) -> Decision {
    if size > cfg.sanity_bytes {
        return Decision {
            rotated: false,
            reason: None,
            error: Some(format!(
                "file exceeds sanityBytes={}, refusing",
                cfg.sanity_bytes
            )),
            bytes_before: size,
            lines_before: None,
            summary_sentence: None,
        };
    }

    let lines_known = size <= cfg.max_bytes;
    let effective_lines = if lines_known { Some(line_count) } else { None };
    let rotate_by_bytes = size >= cfg.max_bytes;
    let rotate_by_lines = effective_lines.is_some_and(|l| l >= cfg.max_lines);

    if !rotate_by_bytes && !rotate_by_lines {
        return Decision {
            rotated: false,
            reason: Some(Reason::None),
            error: None,
            bytes_before: size,
            lines_before: effective_lines,
            summary_sentence: None,
        };
    }

    let lines_render = match effective_lines {
        Some(l) => l.to_string(),
        None => "~".to_string(),
    };
    let summary = format!(
        "EVT-GC-ROTATED {{ {basename} }} · {size} BYTES · {lines_render} LINES @ M-EYEWITNESS ."
    );

    Decision {
        rotated: true,
        reason: Some(if rotate_by_bytes {
            Reason::Bytes
        } else {
            Reason::Lines
        }),
        error: None,
        bytes_before: size,
        lines_before: effective_lines,
        summary_sentence: Some(summary),
    }
}

/// The archive file name (gc.ts:96, :141): `<basename>-<iso>.ndjson` with every `:` and `.` of the ISO
/// timestamp `iso` replaced by `-`. The caller joins it to its archive directory.
pub fn archive_file_name(basename: &str, iso: &str) -> String {
    let stamp: String = iso
        .chars()
        .map(|c| if c == ':' || c == '.' { '-' } else { c })
        .collect();
    format!("{basename}-{stamp}.ndjson")
}

/// The `EVT-GC-ROTATED` summary row (gc.ts:147-156) for a rotated decision, fields in upstream key order; `None`
/// when the file did not rotate. `ts`, `source` (the log path) and `archive` (the archive path) are the
/// caller's. `lines: null` (:153) is written as an empty value.
pub fn rotated_row(ts: &str, source: &str, archive: &str, d: &Decision) -> Option<Row> {
    let reason = d.reason.filter(|_| d.rotated)?;
    let sentence = d.summary_sentence.as_deref()?;
    let lines = d.lines_before.map(|l| l.to_string()).unwrap_or_default();
    Some(
        Row::new("EVT-GC-ROTATED")
            .text("ts", ts)
            .field("event", "EVT-GC-ROTATED")
            .text("source", source)
            .text("archive", archive)
            .field("bytes", d.bytes_before)
            .field("lines", lines)
            .field("reason", reason.tag())
            .text("glyph_sentence", sentence),
    )
}
