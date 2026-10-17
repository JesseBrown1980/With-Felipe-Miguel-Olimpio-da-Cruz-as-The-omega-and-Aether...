//! GC runtime: gulp every N emits, flow-not-pile (bigpickle gc-runtime.mjs:10-59).

/// Gulp every 2000 messages (gc-runtime.mjs:10).
pub const DEFAULT_GC_EVERY_MESSAGES: u64 = 2000;
/// File-count cap (gc-runtime.mjs:11).
pub const DEFAULT_FILE_CAP_MAX: u64 = 2000;
/// File-count warn threshold (gc-runtime.mjs:12).
pub const DEFAULT_FILE_CAP_WARN_AT: u64 = 1800;

/// Cap status for a file count (gc-runtime.mjs:52-55).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CapStatus {
    Pass,
    Warn,
    Fail,
}

impl CapStatus {
    /// The upstream string form (`pass` / `warn` / `fail`).
    pub fn as_str(self) -> &'static str {
        match self {
            CapStatus::Pass => "pass",
            CapStatus::Warn => "warn",
            CapStatus::Fail => "fail",
        }
    }
}

/// A snapshot of the runtime's counters (gc-runtime.mjs:46-57 `status()`).
pub struct GcStatus {
    pub total_received: u64,
    pub since_last_gulp: u64,
    pub runs: u64,
    pub file_count: u64,
    pub cap_status: CapStatus,
    pub last_gulp_reason: Option<String>,
}

/// The GC runtime (gc-runtime.mjs:14-59).
pub struct GcRuntime {
    pub gc_every_messages: u64,
    pub file_cap_max: u64,
    pub file_cap_warn_at: u64,
    pub total_received: u64,
    pub since_last_gulp: u64,
    pub runs: u64,
    pub file_count: u64,
    pub last_gulp_reason: Option<String>,
}

impl Default for GcRuntime {
    fn default() -> Self {
        Self::new()
    }
}

impl GcRuntime {
    /// New runtime with the canon defaults.
    pub fn new() -> Self {
        Self {
            gc_every_messages: DEFAULT_GC_EVERY_MESSAGES,
            file_cap_max: DEFAULT_FILE_CAP_MAX,
            file_cap_warn_at: DEFAULT_FILE_CAP_WARN_AT,
            total_received: 0,
            since_last_gulp: 0,
            runs: 0,
            file_count: 0,
            last_gulp_reason: None,
        }
    }

    /// New runtime with a custom gulp window.
    pub fn with_gc_every(gc_every_messages: u64) -> Self {
        Self {
            gc_every_messages,
            ..Self::new()
        }
    }

    /// Record one emit; gulp automatically at the window (gc-runtime.mjs:27-35).
    pub fn emit(&mut self) -> GcStatus {
        self.total_received += 1;
        self.since_last_gulp += 1;
        self.file_count += 1;
        if self.since_last_gulp >= self.gc_every_messages {
            self.gulp("auto_threshold");
        }
        self.status()
    }

    /// Drain the file count by one gulp window (gc-runtime.mjs:37-44).
    pub fn gulp(&mut self, reason: &str) {
        self.since_last_gulp = 0;
        self.runs += 1;
        self.last_gulp_reason = Some(reason.to_string());
        self.file_count = self.file_count.saturating_sub(self.gc_every_messages);
    }

    /// Current counters and cap status (gc-runtime.mjs:46-57).
    pub fn status(&self) -> GcStatus {
        let cap_status = if self.file_count >= self.file_cap_max {
            CapStatus::Fail
        } else if self.file_count >= self.file_cap_warn_at {
            CapStatus::Warn
        } else {
            CapStatus::Pass
        };
        GcStatus {
            total_received: self.total_received,
            since_last_gulp: self.since_last_gulp,
            runs: self.runs,
            file_count: self.file_count,
            cap_status,
            last_gulp_reason: self.last_gulp_reason.clone(),
        }
    }
}
