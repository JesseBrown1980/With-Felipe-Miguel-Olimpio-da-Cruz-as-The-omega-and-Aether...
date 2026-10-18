//! Slot 28 drain: `GCRuntime` against the referee trace and the after-100B README statement.

mod common;

use common::{fixture, get, vendor_lines};
use quant_cubes::gc::{
    CapStatus, GcOptions, GcRuntime, DEFAULT_FILE_CAP_MAX, DEFAULT_FILE_CAP_WARN_AT,
    DEFAULT_GC_EVERY_MESSAGES,
};
use std::cell::RefCell;
use std::rc::Rc;

/// After-100B README.md:44-45: "`gc-runtime.mjs` gulps every 2,000 messages with a warning near
/// 1,800."
#[test]
fn readme_statement() {
    let readme = vendor_lines(
        "Asolaria-the-after-100-billion-run-absorption-and-decomposition-and-cubes/README.md",
    );
    assert_eq!(
        readme[43],
        "`gc-runtime.mjs` gulps every 2,000 messages with a warning near 1,800. The decision point is"
    );
    assert_eq!(DEFAULT_GC_EVERY_MESSAGES, 2000);
    assert_eq!(DEFAULT_FILE_CAP_WARN_AT, 1800);
    assert_eq!(DEFAULT_FILE_CAP_MAX, 2000);
}

#[test]
fn trace_equals_the_referee() {
    let lines = fixture("gc.hbp");
    let events = Rc::new(RefCell::new(Vec::new()));
    let sink = Rc::clone(&events);
    let mut gc = GcRuntime::new(
        GcOptions::default(),
        Some(Box::new(move |e| {
            sink.borrow_mut().push((e.runs, e.reason.clone()))
        })),
    );
    let mut ops: Vec<&str> = vec!["e"; 1799 + 1 + 199 + 1 + 5];
    ops.push("cli_manual");
    ops.extend(vec!["e"; 4000]);
    let mut wanted = lines[1..].iter().peekable();
    for (i, op) in ops.iter().enumerate() {
        let s = if *op == "e" {
            gc.emit()
        } else {
            gc.gulp(op);
            gc.status()
        };
        if let Some(w) = wanted.peek() {
            if get(w, "op") == i.to_string() {
                assert_eq!(get(w, "total"), s.total_received.to_string(), "{w}");
                assert_eq!(get(w, "since"), s.since_last_gulp.to_string(), "{w}");
                assert_eq!(get(w, "runs"), s.runs.to_string(), "{w}");
                assert_eq!(get(w, "files"), s.file_count.to_string(), "{w}");
                assert_eq!(get(w, "cap"), s.cap_status.as_str(), "{w}");
                assert_eq!(
                    get(w, "reason"),
                    s.last_gulp_reason.as_deref().unwrap_or("null"),
                    "{w}"
                );
                wanted.next();
            }
        }
    }
    assert!(wanted.next().is_none());
    assert_eq!(
        *events.borrow(),
        [
            (1, "auto_threshold".to_string()),
            (2, "cli_manual".to_string()),
            (3, "auto_threshold".to_string()),
            (4, "auto_threshold".to_string())
        ]
    );
}

#[test]
fn cap_status_bands() {
    let mut gc = GcRuntime::new(
        GcOptions {
            gc_every_messages: Some(10),
            file_cap_max: Some(5),
            file_cap_warn_at: Some(3),
        },
        None,
    );
    let caps: Vec<CapStatus> = (0..6).map(|_| gc.emit().cap_status).collect();
    use CapStatus::*;
    assert_eq!(caps, [Pass, Pass, Warn, Warn, Fail, Fail]);
}
