//! `asolaria-cosign-chain-daemon.py` line 31:
//! `datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")`, the default `ts` of line 67.

use alloc::string::String;
use core::fmt::Write;

/// The line 31 text for the UTC instant `unix_secs` whole seconds after 1970-01-01T00:00:00Z
/// (the fraction is not printed; `.000Z` is literal). Years 1970 to 9999.
pub fn now_iso_at(unix_secs: u64) -> String {
    let days = unix_secs / 86_400;
    let rem = unix_secs % 86_400;
    let (year, month, day) = civil_from_days(days);
    let mut out = String::with_capacity(24);
    let _ = write!(
        out,
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.000Z",
        rem / 3600,
        (rem % 3600) / 60,
        rem % 60
    );
    out
}

/// Proleptic Gregorian date of day `days` after 1970-01-01, by 400-year eras.
fn civil_from_days(days: u64) -> (u64, u64, u64) {
    let z = days + 719_468;
    let era = z / 146_097;
    let doe = z % 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + u64::from(month <= 2);
    (year, month, day)
}
