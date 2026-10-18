//! Registry slot 28, the "drain bounded windows" part: `GCRuntime` of
//! `backend/gc-runtime.mjs` of
//! Asolaria-the-after-100-billion-run-absorption-and-decomposition-and-cubes @ c59e2e6
//! (blob 696dbdcb), cited as `gc:<line>`. The after-100B README (lines 44-46): "`gc-runtime.mjs`
//! gulps every 2,000 messages with a warning near 1,800. The decision point is 'mint or discard
//! happens here.'"
//!
//! Counts are integers here; upstream's option values are any JavaScript numbers.

/// `DEFAULT_GC_EVERY_MESSAGES` (`gc:10`).
pub const DEFAULT_GC_EVERY_MESSAGES: u64 = 2000;
/// `DEFAULT_FILE_CAP_MAX` (`gc:11`).
pub const DEFAULT_FILE_CAP_MAX: u64 = 2000;
/// `DEFAULT_FILE_CAP_WARN_AT` (`gc:12`).
pub const DEFAULT_FILE_CAP_WARN_AT: u64 = 1800;

/// `opts` of the constructor (`gc:15-18`); `None` is an absent (or null) option.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct GcOptions {
    /// `opts.gcEveryMessages`.
    pub gc_every_messages: Option<u64>,
    /// `opts.fileCapMax`.
    pub file_cap_max: Option<u64>,
    /// `opts.fileCapWarnAt`.
    pub file_cap_warn_at: Option<u64>,
}

/// `capStatus` (`gc:52-55`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CapStatus {
    /// `'pass'`.
    Pass,
    /// `'warn'`: `fileCount >= fileCapWarnAt`.
    Warn,
    /// `'fail'`: `fileCount >= fileCapMax`.
    Fail,
}

impl CapStatus {
    /// The status text.
    pub fn as_str(self) -> &'static str {
        match self {
            CapStatus::Pass => "pass",
            CapStatus::Warn => "warn",
            CapStatus::Fail => "fail",
        }
    }
}

/// `status()` (`gc:46-58`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GcStatus {
    /// `totalReceived`.
    pub total_received: u64,
    /// `sinceLastGulp`.
    pub since_last_gulp: u64,
    /// `runs`.
    pub runs: u64,
    /// `fileCount`.
    pub file_count: u64,
    /// `capStatus`.
    pub cap_status: CapStatus,
    /// `lastGulpReason` (`null` before the first gulp).
    pub last_gulp_reason: Option<String>,
}

/// The argument of `onGulp` (`gc:43`): `{ runs, reason }`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GulpEvent {
    /// `runs`.
    pub runs: u64,
    /// `reason`.
    pub reason: String,
}

/// `opts.onGulp` (`gc:23`, called at `gc:43`).
pub type OnGulp = Box<dyn FnMut(&GulpEvent)>;

/// `GCRuntime` (`gc:14-59`).
pub struct GcRuntime {
    /// `gcEveryMessages`.
    pub gc_every_messages: u64,
    /// `fileCapMax`.
    pub file_cap_max: u64,
    /// `fileCapWarnAt`.
    pub file_cap_warn_at: u64,
    /// `totalReceived`.
    pub total_received: u64,
    /// `sinceLastGulp`.
    pub since_last_gulp: u64,
    /// `runs`.
    pub runs: u64,
    /// `fileCount`.
    pub file_count: u64,
    on_gulp: Option<OnGulp>,
    /// `lastGulpReason`.
    pub last_gulp_reason: Option<String>,
}

impl GcRuntime {
    /// `new GCRuntime(opts)` (`gc:15-25`); `on_gulp` is `opts.onGulp`.
    pub fn new(opts: GcOptions, on_gulp: Option<OnGulp>) -> Self {
        GcRuntime {
            gc_every_messages: opts.gc_every_messages.unwrap_or(DEFAULT_GC_EVERY_MESSAGES),
            file_cap_max: opts.file_cap_max.unwrap_or(DEFAULT_FILE_CAP_MAX),
            file_cap_warn_at: opts.file_cap_warn_at.unwrap_or(DEFAULT_FILE_CAP_WARN_AT),
            total_received: 0,
            since_last_gulp: 0,
            runs: 0,
            file_count: 0,
            on_gulp,
            last_gulp_reason: None,
        }
    }

    /// `emit()` (`gc:27-35`): count one message; gulp when the window is full.
    pub fn emit(&mut self) -> GcStatus {
        self.total_received += 1;
        self.since_last_gulp += 1;
        self.file_count += 1;
        if self.since_last_gulp >= self.gc_every_messages {
            self.gulp("auto_threshold");
        }
        self.status()
    }

    /// `gulp(reason)` (`gc:37-44`); upstream's default reason is `'cli_manual'`. The file count
    /// drains by one gulp window, floored at 0.
    pub fn gulp(&mut self, reason: &str) {
        self.since_last_gulp = 0;
        self.runs += 1;
        self.last_gulp_reason = Some(reason.to_string());
        self.file_count = self.file_count.saturating_sub(self.gc_every_messages);
        if let Some(cb) = self.on_gulp.as_mut() {
            cb(&GulpEvent {
                runs: self.runs,
                reason: reason.to_string(),
            });
        }
    }

    /// `status()` (`gc:46-58`).
    pub fn status(&self) -> GcStatus {
        GcStatus {
            total_received: self.total_received,
            since_last_gulp: self.since_last_gulp,
            runs: self.runs,
            file_count: self.file_count,
            cap_status: if self.file_count >= self.file_cap_max {
                CapStatus::Fail
            } else if self.file_count >= self.file_cap_warn_at {
                CapStatus::Warn
            } else {
                CapStatus::Pass
            },
            last_gulp_reason: self.last_gulp_reason.clone(),
        }
    }
}
