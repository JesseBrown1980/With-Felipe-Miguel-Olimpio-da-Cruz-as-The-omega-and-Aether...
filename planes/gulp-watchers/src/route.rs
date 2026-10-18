//! dualEmitObservation's pure logic: validate the four class fields, enforce the pixel-screenshot rule, and
//! build the hookwall + GNN edge rows. Ports universal-route.mjs:105-178. Upstream appends these rows to NDJSON
//! files (the appends of :180-189); here they are HBP rows for the caller to write. Each `||` fallback treats
//! `""` as absent, as JavaScript does; each `??` fallback keeps `""`. A field upstream writes as `null`, or
//! omits as `undefined`, is written here as an empty value (BOUNDARIES.md).

use crate::hbp::Row;
use crate::jstext::{or_js, truthy};

/// The `subnet_h` default (universal-route.mjs:37, :107).
pub const DEFAULT_SUBNET_H: &str = "H9100";

/// The `channel` default (universal-route.mjs:108).
pub const DEFAULT_CHANNEL: &str = "unspecified";

/// A rejected emit: the message is upstream's `RangeError`/`Error` text (universal-route.mjs:114-142).
#[derive(Debug, PartialEq, Eq)]
pub struct RejectReason(pub String);

fn resolve(
    opt: Option<&str>,
    default: &str,
    field: &str,
    valid: &[&str],
) -> Result<String, RejectReason> {
    let v = or_js(opt, default);
    if valid.contains(&v) {
        Ok(v.to_string())
    } else {
        Err(RejectReason(format!(
            "universal-route: opts.{field} must be one of {}; got \"{v}\"",
            valid.join(", ")
        )))
    }
}

/// The resolved class fields after validation (universal-route.mjs:112-143).
pub struct Classes {
    pub edge_class: String,
    pub source_class: String,
    pub authority_level: String,
    pub image_class: String,
}

/// Resolve and validate the four class fields and the pixel-screenshot rule (universal-route.mjs:112-143).
/// `backend_row_pid` `""` fails `!opts.backendRowPid` (:125) as `None` does.
pub fn resolve_classes(
    edge_class: Option<&str>,
    source_class: Option<&str>,
    authority_level: Option<&str>,
    image_class: Option<&str>,
    backend_row_pid: Option<&str>,
) -> Result<Classes, RejectReason> {
    let edge_class = resolve(
        edge_class,
        "proof_edge",
        "edgeClass",
        &["proof_edge", "prediction_edge", "action_edge"],
    )?;
    let source_class = resolve(
        source_class,
        "backend_row",
        "sourceClass",
        &["backend_row", "pixel_screenshot", "legacy_image"],
    )?;
    if source_class == "pixel_screenshot" && truthy(backend_row_pid).is_none() {
        return Err(RejectReason(
            "universal-route: sourceClass=pixel_screenshot requires opts.backendRowPid (Dan-fix #1 backend_rows_before_pixels)"
                .to_string(),
        ));
    }
    let authority_level = resolve(
        authority_level,
        "dev",
        "authorityLevel",
        &["pre-dev", "dev", "staging", "prod"],
    )?;
    let image_class = resolve(
        image_class,
        "none",
        "imageClass",
        &["runtime_proof", "historical_evidence", "none"],
    )?;
    Ok(Classes {
        edge_class,
        source_class,
        authority_level,
        image_class,
    })
}

/// `channel.replace(/[^a-z0-9_]/gi, '_')` (universal-route.mjs:172): the GNN `to` node slug. Without the
/// `u` flag the regex replaces each UTF-16 code unit, so a character above U+FFFF becomes `__`.
pub fn channel_slug(channel: &str) -> String {
    let mut out = String::with_capacity(channel.len());
    for c in channel.chars() {
        if c.is_ascii_alphanumeric() || c == '_' {
            out.push(c);
        } else {
            for _ in 0..c.len_utf16() {
                out.push('_');
            }
        }
    }
    out
}

/// The receipt fields the edge rows carry (universal-route.mjs:152-154, :176-177).
pub struct Cosign<'a> {
    pub seq: Option<&'a str>,
    pub row_hash: Option<&'a str>,
    pub antecedent_prev: Option<&'a str>,
}

/// Inputs the two rows read beyond the classes (universal-route.mjs:106-110, :145-178). `subnet_h` and
/// `channel` are `opts.subnet_h` / `opts.channel` before the `||` defaults of :107-108.
pub struct Emit<'a> {
    pub ts: &'a str,
    pub passed_at: &'a str,
    pub subnet_h: Option<&'a str>,
    pub channel: Option<&'a str>,
    pub event: Option<&'a str>,
    pub vantage: Option<&'a str>,
    pub backend_row_pid: Option<&'a str>,
    pub gnn_from: Option<&'a str>,
    pub gnn_to: Option<&'a str>,
    pub gnn_verb: Option<&'a str>,
    pub gnn_weight: Option<i64>,
}

/// The hookwall observation row (universal-route.mjs:145-161).
pub fn hookwall_row(e: &Emit, c: &Cosign, classes: &Classes) -> Row {
    Row::new("HOOKWALL-OBSERVATION")
        .field("schema", "hookwall-observation.v1")
        .text("ts", e.ts)
        .text("subnet_h", or_js(e.subnet_h, DEFAULT_SUBNET_H))
        .text("channel", or_js(e.channel, DEFAULT_CHANNEL))
        .text("event", e.event.unwrap_or(""))
        .text("vantage", e.vantage.unwrap_or(""))
        .text("cosign_seq", c.seq.unwrap_or(""))
        .text("cosign_row", c.row_hash.unwrap_or(""))
        .text("cosign_prev", c.antecedent_prev.unwrap_or(""))
        .text("sourceClass", &classes.source_class)
        .text("backendRowPid", e.backend_row_pid.unwrap_or(""))
        .text("authorityLevel", &classes.authority_level)
        .text("imageClass", &classes.image_class)
        .field("gate", "universal-route-default")
        .text("passed_at", e.passed_at)
}

/// The GNN live-edge row (universal-route.mjs:163-178). `weight` defaults to the upstream double `1.0` (:174),
/// which `JSON.stringify` renders `1`; absent here it is the integer `1`.
pub fn gnn_edge_row(e: &Emit, c: &Cosign, classes: &Classes) -> Row {
    let seq_label = c.seq.unwrap_or("unknown");
    let from = match truthy(e.gnn_from) {
        Some(f) => f.to_string(),
        None => format!("cosign_seq_{seq_label}"),
    };
    let to = match truthy(e.gnn_to) {
        Some(t) => t.to_string(),
        None => format!(
            "channel_{}",
            channel_slug(or_js(e.channel, DEFAULT_CHANNEL))
        ),
    };
    let verb = truthy(e.gnn_verb)
        .or(truthy(e.event))
        .unwrap_or("universal_route_emit");
    let weight = e.gnn_weight.unwrap_or(1);
    Row::new("GNN-LIVE-EDGE")
        .field("schema", "gnn-live-edge.v1")
        .text("ts", e.ts)
        .text("subnet_h", or_js(e.subnet_h, DEFAULT_SUBNET_H))
        .text("edgeClass", &classes.edge_class)
        .text("sourceClass", &classes.source_class)
        .text("authorityLevel", &classes.authority_level)
        .text("imageClass", &classes.image_class)
        .text("from", &from)
        .text("to", &to)
        .text("verb", verb)
        .field("weight", weight)
        .text("vantage", e.vantage.unwrap_or(""))
        .text("cosign_seq", c.seq.unwrap_or(""))
        .text("cosign_row", c.row_hash.unwrap_or(""))
}
