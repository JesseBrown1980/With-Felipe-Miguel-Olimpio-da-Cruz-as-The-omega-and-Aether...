//! The construction-routing watcher: learn message routing edges and keyword hits, then predict the next
//! construction. Ports gnnConstructionWatcher.js:49-140 (`recordRoutingEdge` :49-73, `recordPatternHit`
//! :78-88, `predictConstruction` :94-140).
//!
//! Each edge keeps the confidence :61-63 last stored on it, as the exact ratio `conf_num / conf_den`.
//! :59-60 sum the counts before a first-seen target is put into the map at :65, so that edge keeps
//! confidence 0 until the next record from the same source, and its siblings are divided by a total that
//! leaves it out. Every non-zero confidence of one source shares that source's last total. The double
//! compares `edge.confidence > maxConfidence` (:115) and `confidence > 0.6` (:123) are evaluated as exact
//! ratio compares (cross-multiplication, and `5*num > 3*den`); with counts below 2^52 these pick the same
//! edge and gate as the doubles do. tools/referee.py rounds each ratio to its binary64 value with integer
//! arithmetic and asserts both forms agree on every prediction it checks.

use std::collections::HashMap;

use crate::jstext::{js_lower, js_trim, js_words, truthy, utf16_len};

/// Which strategy produced a prediction (gnnConstructionWatcher.js:127, :135).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Source {
    RoutingGraph,
    PatternMemory,
}

/// A prediction: the target construction, the strategy, and its confidence as an exact ratio.
pub struct Prediction {
    pub construction_id: String,
    pub source: Source,
    pub confidence_num: u64,
    pub confidence_den: u64,
}

// One routing edge (:54): its count and the confidence :62 last stored, as a ratio (0/1 = upstream's 0).
#[derive(Clone, Copy)]
struct Edge {
    count: u64,
    conf_num: u64,
    conf_den: u64,
}

// A `Map` of edges: insertion order is the iteration order of :61 and :114, and `Map.set` on an existing key
// (:65) keeps its slot.
#[derive(Default)]
struct Edges {
    order: Vec<String>,
    by_target: HashMap<String, Edge>,
}

/// The accumulated routing knowledge (gnnConstructionWatcher.js:32 routing graph, :38 pattern memory).
#[derive(Default)]
pub struct Watcher {
    routing: HashMap<String, Edges>,
    pattern: HashMap<String, (String, u64)>,
}

impl Watcher {
    /// A fresh watcher with no learned edges.
    pub fn new() -> Self {
        Watcher::default()
    }

    /// Record that a message moved `from` one construction `to` another (gnnConstructionWatcher.js:49-73).
    pub fn record_routing_edge(&mut self, from: &str, to: &str) {
        let edges = self.routing.entry(from.to_string()).or_default();
        let first_seen = !edges.by_target.contains_key(to);
        if let Some(existing) = edges.by_target.get_mut(to) {
            existing.count += 1;
        }
        // :59-63 run over the edges already in the map; a first-seen target is not among them yet.
        let total_out: u64 = edges.by_target.values().map(|e| e.count).sum();
        for edge in edges.by_target.values_mut() {
            if total_out > 0 {
                edge.conf_num = edge.count;
                edge.conf_den = total_out;
            } else {
                edge.conf_num = 0;
                edge.conf_den = 1;
            }
        }
        if first_seen {
            edges.order.push(to.to_string());
            edges.by_target.insert(
                to.to_string(),
                Edge {
                    count: 1,
                    conf_num: 0,
                    conf_den: 1,
                },
            );
        }
    }

    /// Record that keywords routed to a construction (gnnConstructionWatcher.js:78-88): lowercase, JS `trim`,
    /// skip keys shorter than 3 UTF-16 code units.
    pub fn record_pattern_hit(&mut self, keywords: &[&str], construction_id: &str) {
        for kw in keywords {
            let lowered = js_lower(kw);
            let normalized = js_trim(&lowered);
            if normalized.is_empty() || utf16_len(normalized) < 3 {
                continue;
            }
            let entry = self
                .pattern
                .entry(normalized.to_string())
                .or_insert_with(|| (construction_id.to_string(), 0));
            entry.0 = construction_id.to_string();
            entry.1 += 1;
        }
    }

    /// Predict the best construction (gnnConstructionWatcher.js:94-140): the routing graph wins above the
    /// 0.6 gate, else keyword pattern memory with at least two hits, else nothing. `current_construction_id`
    /// `""` is falsy at :111, as `None` is.
    pub fn predict(
        &self,
        message: &str,
        current_construction_id: Option<&str>,
    ) -> Option<Prediction> {
        let lowered = js_lower(message);

        let mut best_pattern: Option<&(String, u64)> = None;
        let mut best_pattern_score = 0u64;
        for word in js_words(&lowered).filter(|w| utf16_len(w) >= 3) {
            if let Some(hit) = self.pattern.get(word) {
                if hit.1 > best_pattern_score {
                    best_pattern = Some(hit);
                    best_pattern_score = hit.1;
                }
            }
        }

        let mut best_routing: Option<(&str, u64, u64)> = None;
        if let Some(edges) = truthy(current_construction_id).and_then(|cur| self.routing.get(cur)) {
            let (mut max_num, mut max_den) = (0u64, 1u64);
            for target in &edges.order {
                let edge = edges.by_target[target];
                let above = u128::from(edge.conf_num) * u128::from(max_den)
                    > u128::from(max_num) * u128::from(edge.conf_den);
                if above {
                    max_num = edge.conf_num;
                    max_den = edge.conf_den;
                    best_routing = Some((target.as_str(), edge.conf_num, edge.conf_den));
                }
            }
        }

        if let Some((target, num, den)) = best_routing {
            if 5 * u128::from(num) > 3 * u128::from(den) {
                return Some(Prediction {
                    construction_id: target.to_string(),
                    source: Source::RoutingGraph,
                    confidence_num: num,
                    confidence_den: den,
                });
            }
        }

        if let Some((cid, _)) = best_pattern {
            if best_pattern_score >= 2 {
                return Some(Prediction {
                    construction_id: cid.clone(),
                    source: Source::PatternMemory,
                    confidence_num: best_pattern_score.min(10),
                    confidence_den: 10,
                });
            }
        }

        None
    }
}
