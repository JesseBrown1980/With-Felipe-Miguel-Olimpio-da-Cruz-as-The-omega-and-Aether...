//! The asi-os HOST8KERNEL parse over the row host8-serve writes.

use asolaria_kernel_lane::host8kernel::{api_kernel_body, parse_health, KERNEL_UNREACHABLE_BODY};
use asolaria_kernel_lane::{FEDERATION_ANCHOR_PID, KERNEL_VERSION};

/// The `/health.hbp` lines host8-serve writes before and after HOST8KERNEL
/// (servers/host8-serve/src/main.rs:755-772), with fixed sample values in the other rows.
fn health_body() -> String {
    format!(
        "HOST8HDR|schema=ASOLARIA-HOST8-SERVE|version=0.1.0|runtime=rust-std|generated_unix_s=0|json=0\n\
         HOST8KERNEL|version={KERNEL_VERSION}|anchor_pid={FEDERATION_ANCHOR_PID}|server_libs=5|json=0\n\
         HOST8ROOM|id=r|room_stub=s|host_handle8=22b0500ba10a8de6|target_runtime=t|lane=l|json=0\n"
    )
}

#[test]
fn kernel_row_gives_version_and_anchor() {
    let h = parse_health(&health_body());
    assert_eq!(h.kver, "0.2.0-phase3-scaffold");
    assert_eq!(h.kanchor, "ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11");
    assert!(h.kernel_up);
}

#[test]
fn empty_body_is_down_with_dashes() {
    let h = parse_health("");
    assert_eq!(
        (h.kver.as_str(), h.kanchor.as_str(), h.kernel_up),
        ("-", "-", false)
    );
}

#[test]
fn body_without_the_row_is_up_with_dashes() {
    // live_status reads `kernel_up` from a non-empty body, whatever rows it holds (main.rs:375).
    let h = parse_health("HOST8HDR|schema=x|json=0\n");
    assert_eq!(
        (h.kver.as_str(), h.kanchor.as_str(), h.kernel_up),
        ("-", "-", true)
    );
}

#[test]
fn last_kernel_row_wins() {
    let h = parse_health("HOST8KERNEL|version=a|anchor_pid=b\nHOST8KERNEL|version=c\n");
    assert_eq!((h.kver.as_str(), h.kanchor.as_str()), ("c", "b"));
}

#[test]
fn api_kernel_passes_the_body_through_or_answers_the_unreachable_row() {
    assert_eq!(api_kernel_body(Some("X".into())), "X");
    assert_eq!(api_kernel_body(None), KERNEL_UNREACHABLE_BODY);
}
