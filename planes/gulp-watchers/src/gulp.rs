//! The batch gulp: count recent events by kind and by glyph, rank them, emit `OP-GULP-SUMMARY` sentences.
//! Ports gulp.ts:91-142 (the pure aggregation; the file read and `JSON.parse` of :96-107 are a boundary). The
//! `EVT-GULP-LEDGER` row of :144-154 is not rendered (BOUNDARIES.md).

use std::collections::HashMap;

/// One parsed event, with the kind/glyph discriminators already available (gulp.ts:114-115) and the
/// timestamp already parsed to epoch-ms (`Date.parse`, :110). `ts_ms` is `None` when `ts` is falsy or not a date.
pub struct RawRecord {
    pub event: Option<String>,
    pub kind: Option<String>,
    pub glyph: Option<String>,
    pub glyph_id: Option<String>,
    pub ts_ms: Option<i64>,
}

impl RawRecord {
    // kind = event ?? kind ?? "unknown" (gulp.ts:114).
    fn resolved_kind(&self) -> &str {
        self.event
            .as_deref()
            .or(self.kind.as_deref())
            .unwrap_or("unknown")
    }

    // glyph = glyph ?? glyph_id ?? "-" (gulp.ts:115).
    fn resolved_glyph(&self) -> &str {
        self.glyph
            .as_deref()
            .or(self.glyph_id.as_deref())
            .unwrap_or("-")
    }
}

/// Counts, rankings and summary sentences (gulp.ts:132-142, :156-166). `event_patterns` and
/// `glyph_patterns` are ordered by count descending, ties keeping first-seen order (V8 stable sort of :132-133).
pub struct GulpResult {
    pub scanned: u64,
    pub skipped: u64,
    pub event_patterns: Vec<(String, u64)>,
    pub glyph_patterns: Vec<(String, u64)>,
    pub top10: Vec<(String, u64)>,
    pub summary_sentences: Vec<String>,
}

// An insertion-ordered counter: V8 `Map` preserves insertion order, which the stable sort relies on.
#[derive(Default)]
struct OrderedCounter {
    order: Vec<String>,
    counts: HashMap<String, u64>,
}

impl OrderedCounter {
    fn bump(&mut self, key: &str) {
        match self.counts.get_mut(key) {
            Some(c) => *c += 1,
            None => {
                self.order.push(key.to_string());
                self.counts.insert(key.to_string(), 1);
            }
        }
    }

    fn ranked(&self) -> Vec<(String, u64)> {
        let mut pairs: Vec<(String, u64)> = self
            .order
            .iter()
            .map(|k| (k.clone(), self.counts[k]))
            .collect();
        pairs.sort_by(|a, b| b.1.cmp(&a.1));
        pairs
    }
}

/// Aggregate events newer than `since_ms` (gulp.ts:103-134). `emit` mirrors `emitSummaries` (:88, :136-142).
/// The `skipped` count here is the in-window ts drop only; `JSON.parse` failures are counted at the boundary.
pub fn run_gulp(records: &[RawRecord], since_ms: i64, emit: bool) -> GulpResult {
    let mut event_counts = OrderedCounter::default();
    let mut glyph_counts = OrderedCounter::default();
    let mut scanned: u64 = 0;
    let mut skipped: u64 = 0;

    for rec in records {
        if let Some(ts) = rec.ts_ms {
            if ts < since_ms {
                skipped += 1;
                continue;
            }
        }
        scanned += 1;
        event_counts.bump(rec.resolved_kind());
        glyph_counts.bump(rec.resolved_glyph());
    }

    let event_patterns = event_counts.ranked();
    let glyph_patterns = glyph_counts.ranked();
    let top10: Vec<(String, u64)> = event_patterns.iter().take(10).cloned().collect();

    let summary_sentences = if emit {
        top10
            .iter()
            .map(|(key, count)| format!("OP-GULP-SUMMARY {{ {key} · {count} }} @ M-EYEWITNESS ."))
            .collect()
    } else {
        Vec::new()
    };

    GulpResult {
        scanned,
        skipped,
        event_patterns,
        glyph_patterns,
        top10,
        summary_sentences,
    }
}
