// GC runtime — gulp every N messages, flow-not-pile.
//
// Spec: project_bigpickle_http_tracker_bypass_and_ramp_pattern_2026_05_24
//       ("answer is BETTER GC, not LIMITERS") + collector-state.json defaults.
//
// Discipline: every emit flows through GC quickly enough to keep file count
// below the warn threshold. Adding limiters is the anti-pattern; adding GC
// throughput is the canon.

const DEFAULT_GC_EVERY_MESSAGES = 2000;
const DEFAULT_FILE_CAP_MAX = 2000;
const DEFAULT_FILE_CAP_WARN_AT = 1800;

export class GCRuntime {
  constructor(opts = {}) {
    this.gcEveryMessages = opts.gcEveryMessages ?? DEFAULT_GC_EVERY_MESSAGES;
    this.fileCapMax = opts.fileCapMax ?? DEFAULT_FILE_CAP_MAX;
    this.fileCapWarnAt = opts.fileCapWarnAt ?? DEFAULT_FILE_CAP_WARN_AT;
    this.totalReceived = 0;
    this.sinceLastGulp = 0;
    this.runs = 0;
    this.fileCount = 0;
    this.onGulp = opts.onGulp ?? null;
    this.lastGulpReason = null;
  }

  emit() {
    this.totalReceived++;
    this.sinceLastGulp++;
    this.fileCount++;
    if (this.sinceLastGulp >= this.gcEveryMessages) {
      this.gulp('auto_threshold');
    }
    return this.status();
  }

  gulp(reason = 'cli_manual') {
    this.sinceLastGulp = 0;
    this.runs++;
    this.lastGulpReason = reason;
    // GC drains the file count by the gulp window (mint or discard happens here).
    this.fileCount = Math.max(0, this.fileCount - this.gcEveryMessages);
    if (this.onGulp) this.onGulp({ runs: this.runs, reason });
  }

  status() {
    return {
      totalReceived: this.totalReceived,
      sinceLastGulp: this.sinceLastGulp,
      runs: this.runs,
      fileCount: this.fileCount,
      capStatus:
        this.fileCount >= this.fileCapMax ? 'fail'
        : this.fileCount >= this.fileCapWarnAt ? 'warn'
        : 'pass',
      lastGulpReason: this.lastGulpReason,
    };
  }
}
