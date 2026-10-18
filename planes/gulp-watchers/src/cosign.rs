//! durableNotify's pure row and decision logic: the notify payload built from a cosign receipt, the
//! universal-route default, the durability-gap verdict. Ports cosign-bridge.mjs:153-189. The cosign
//! `/api/cosign/append` POST and the redis publish are transports, recorded in BOUNDARIES.md, not here.

use crate::hbp::Row;

/// The cosign-chain receipt `cosignAppend` resolves to (cosign-bridge.mjs:104), read at :165-167. Fields are
/// carried as their exact upstream bytes because downstream rows hash against them.
pub struct Receipt {
    pub seq: String,
    pub row_hash: String,
    pub antecedent_prev: String,
}

/// The pub/sub publish result the caller passes back (cosign-bridge.mjs:173, :187).
pub struct Publish {
    pub subscribers: u64,
}

/// A rejected call (cosign-bridge.mjs:154-156).
#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    EmptyChannel,
}

/// Reject an empty channel (cosign-bridge.mjs:154-156).
pub fn validate_channel(channel: &str) -> Result<(), Error> {
    if channel.is_empty() {
        Err(Error::EmptyChannel)
    } else {
        Ok(())
    }
}

/// `opts.universalRoute !== false` (cosign-bridge.mjs:178): on unless explicitly disabled.
pub fn universal_route_default(opt: Option<bool>) -> bool {
    opt != Some(false)
}

/// The live/logged verdict (cosign-bridge.mjs:187): no subscribers means logged but not live-notified.
pub fn durability_gap_status(subscribers: u64) -> &'static str {
    if subscribers == 0 {
        "logged-but-no-live-subscriber"
    } else {
        "live-and-logged"
    }
}

/// The publish notify payload (cosign-bridge.mjs:164-172): the receipt plus the channel and event summary.
/// Every value is `%XX`-escaped text. `event_summary: null` (a non-object payload) and an absent `event` or
/// `vantage` key are both written as an empty value (BOUNDARIES.md).
pub fn notify_row(
    receipt: &Receipt,
    channel: &str,
    event: Option<&str>,
    vantage: Option<&str>,
) -> Row {
    Row::new("DURABLE-NOTIFY")
        .text("cosign_seq", &receipt.seq)
        .text("cosign_row", &receipt.row_hash)
        .text("cosign_prev", &receipt.antecedent_prev)
        .text("channel", channel)
        .text("event", event.unwrap_or(""))
        .text("vantage", vantage.unwrap_or(""))
}
