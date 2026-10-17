//! Port of edgeRiskEngine.js:13-148: the integer edge-risk score and its level.

use crate::text::{clean_lower, or_str, utf16_slice};

/// `mapScoreToLevel` output (edgeRiskEngine.js:31-36).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Level {
    Low,
    Medium,
    High,
    Critical,
}

impl Level {
    /// The level's JavaScript string.
    pub fn as_str(self) -> &'static str {
        match self {
            Level::Low => "low",
            Level::Medium => "medium",
            Level::High => "high",
            Level::Critical => "critical",
        }
    }
}

/// `mapScoreToLevel(score)` (edgeRiskEngine.js:31-36).
pub fn map_score_to_level(score: i64) -> Level {
    if score >= 9 {
        Level::Critical
    } else if score >= 6 {
        Level::High
    } else if score >= 3 {
        Level::Medium
    } else {
        Level::Low
    }
}

/// `normalizeDomain(value)` (edgeRiskEngine.js:13-19).
pub fn normalize_domain(value: &str) -> String {
    let normalized = clean_lower(value);
    if normalized.is_empty() {
        return String::new();
    }
    if normalized.contains("company") || normalized.contains("work") {
        return String::from("company");
    }
    if normalized.contains("personal") || normalized.contains("owner") {
        return String::from("personal");
    }
    utf16_slice(&normalized, 0, 40)
}

/// `normalizeCriticality(value)` (edgeRiskEngine.js:21-29).
pub fn normalize_criticality(value: &str) -> String {
    let normalized = clean_lower(value);
    if matches!(normalized.as_str(), "low" | "medium" | "high" | "critical") {
        return normalized;
    }
    if normalized.is_empty() {
        return String::new();
    }
    if normalized == "normal" {
        return String::from("medium");
    }
    utf16_slice(&normalized, 0, 24)
}

/// The fields `scoreEdgeRisk(input)` reads, each as the raw string the caller supplied
/// before `cleanLower`; the `a || b || ""` chains are resolved here (edgeRiskEngine.js:38-48).
#[derive(Clone, Debug, Default)]
pub struct RiskInput {
    pub action: String,
    pub typ: String,
    pub category: String,
    pub tool: String,
    pub context_tool: String,
    pub mode: String,
    pub context_mode: String,
    pub policy_mode: String,
    pub approval_state: String,
    pub policy_approval_state: String,
    pub status: String,
    pub actor_domain: String,
    pub domain: String,
    pub target_domain: String,
    pub target_criticality: String,
    pub criticality: String,
    pub autonomous: bool,
    pub policy_autonomous: bool,
}

/// `scoreEdgeRisk` return value (edgeRiskEngine.js:135-143).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RiskResult {
    pub score: i64,
    pub level: Level,
    pub reasons: Vec<String>,
    pub actor_domain: String,
    pub target_domain: String,
    pub approval_state: String,
    pub autonomous: bool,
}

const HIGH_RISK_TERMS: [&str; 17] = [
    "secret",
    "iam",
    "privilege",
    "impersonat",
    "tunnel",
    "delete",
    "clear",
    "shutdown",
    "restart",
    "deploy",
    "external",
    "browser_task",
    "computer_use",
    "pad",
    "whatsapp",
    "slack",
    "telegram",
];

const MEDIUM_RISK_TERMS: [&str; 11] = [
    "approval",
    "provider",
    "repo",
    "write",
    "voice",
    "phone",
    "meeting",
    "chat",
    "model",
    "cursor",
    "antigravity",
];

fn includes_any(haystack: &str, terms: &[&str]) -> bool {
    terms.iter().any(|term| haystack.contains(term))
}

/// `scoreEdgeRisk(input)` (edgeRiskEngine.js:38-144).
pub fn score_edge_risk(input: &RiskInput) -> RiskResult {
    let action = clean_lower(or_str(&input.action, &input.typ));
    let category = clean_lower(&input.category);
    let tool = clean_lower(or_str(&input.tool, &input.context_tool));
    let mode = clean_lower(or_str(
        or_str(&input.mode, &input.context_mode),
        &input.policy_mode,
    ));
    let approval_state = clean_lower(or_str(&input.approval_state, &input.policy_approval_state));
    let status = clean_lower(&input.status);
    let actor_domain = normalize_domain(or_str(&input.actor_domain, &input.domain));
    let target_domain = normalize_domain(&input.target_domain);
    let criticality = normalize_criticality(or_str(&input.target_criticality, &input.criticality));
    let autonomous = input.autonomous || input.policy_autonomous;

    let source_text = [&action, &category, &tool, &mode, &status]
        .into_iter()
        .filter(|segment| !segment.is_empty())
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");

    let mut reasons: Vec<String> = Vec::new();
    let mut score: i64 = 0;

    if includes_any(&source_text, &HIGH_RISK_TERMS) {
        score += 6;
        reasons.push("High-impact action or asset class.".to_string());
    } else if includes_any(&source_text, &MEDIUM_RISK_TERMS) {
        score += 3;
        reasons.push("Operationally sensitive action class.".to_string());
    }

    if criticality == "critical" {
        score += 4;
        reasons.push("Target criticality is critical.".to_string());
    } else if criticality == "high" {
        score += 3;
        reasons.push("Target criticality is high.".to_string());
    } else if criticality == "medium" {
        score += 1;
    }

    if !actor_domain.is_empty() && !target_domain.is_empty() && actor_domain != target_domain {
        score += 4;
        reasons.push("Cross-domain action path detected.".to_string());
    }

    if approval_state == "required" || approval_state == "pending" {
        score += 2;
        reasons.push("Approval is required or still pending.".to_string());
    } else if approval_state == "denied" {
        score += 3;
        reasons.push("Denied approval state observed.".to_string());
    } else if approval_state == "approved" {
        score = (score - 1).max(0);
    }

    if autonomous {
        score += 2;
        reasons.push("Autonomous execution path.".to_string());
    }

    if mode == "silent" || mode == "headless" || mode == "backend-only" || mode == "backend" {
        score += 1;
        reasons.push("Low-visibility execution mode.".to_string());
    }

    if status == "failed" || status == "error" || status == "blocked" {
        score += 1;
        reasons.push("Failed or blocked edge outcome.".to_string());
    }

    reasons.truncate(8);
    RiskResult {
        level: map_score_to_level(score),
        score,
        reasons,
        actor_domain,
        target_domain,
        approval_state,
        autonomous,
    }
}
