const fs = require("fs");
const path = require("path");

// ---------- WAL persistence ----------

const WAL_PATH = path.join(__dirname, "..", "data", "job-queue-wal.ndjson");
const DEAD_LETTER_PATH = path.join(__dirname, "..", "data", "job-queue-dead-letter.ndjson");

function appendWal(entry) {
  try {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(WAL_PATH, line, "utf8");
  } catch (err) {
    console.error("[jobQueue] WAL append failed:", err.message);
  }
}

function appendDeadLetter(entry) {
  try {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(DEAD_LETTER_PATH, line, "utf8");
  } catch (err) {
    console.error("[jobQueue] Dead letter append failed:", err.message);
  }
}

function readWal() {
  try {
    if (!fs.existsSync(WAL_PATH)) return [];
    const lines = fs.readFileSync(WAL_PATH, "utf8").split("\n").filter(Boolean);
    return lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// ---------- Graph runtime event emission ----------

let graphEmitter = null;

function setGraphEmitter(fn) {
  if (typeof fn === "function") graphEmitter = fn;
}

function emitJobEvent(job, eventType) {
  if (!graphEmitter) return;
  try {
    graphEmitter({
      category: "job_queue",
      action: eventType,
      actor: "job-queue",
      subject: job.id,
      target: job.type,
      detail: {
        jobId: job.id,
        type: job.type,
        status: job.status,
        retries: job.retries || 0,
        elapsedMs: job.elapsedMs || null,
        error: job.error || null
      }
    });
  } catch {}
}

// ---------- Core state ----------

const jobs = new Map();
const pending = [];
const runners = new Map(); // jobId -> runner function (not serializable)

let running = 0;
const concurrency = Math.max(1, Number(process.env.ASOLARIA_CONCURRENCY || 2));

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000;

function newJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function copyPublic(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    payload: job.payload,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    elapsedMs: job.elapsedMs,
    result: job.result,
    error: job.error,
    retries: job.retries || 0,
    maxRetries: job.maxRetries || 0,
    owner: job.owner || null
  };
}

function stats() {
  const deadLetterCount = (() => {
    try {
      if (!fs.existsSync(DEAD_LETTER_PATH)) return 0;
      return fs.readFileSync(DEAD_LETTER_PATH, "utf8").split("\n").filter(Boolean).length;
    } catch { return 0; }
  })();

  return {
    queued: pending.length,
    running,
    total: jobs.size,
    concurrency,
    walPath: WAL_PATH,
    deadLetterCount
  };
}

function pruneOldJobs() {
  const maxJobs = 500;
  if (jobs.size <= maxJobs) return;

  const ordered = Array.from(jobs.values()).sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const removeCount = jobs.size - maxJobs;
  for (let i = 0; i < removeCount; i++) {
    const job = ordered[i];
    jobs.delete(job.id);
    runners.delete(job.id);
  }
}

// ---------- Retry with exponential backoff ----------

function getBackoffMs(retries, baseMs) {
  const backoff = Math.min(baseMs * Math.pow(2, retries), MAX_BACKOFF_MS);
  const jitter = Math.random() * backoff * 0.1;
  return Math.round(backoff + jitter);
}

function scheduleRetry(job) {
  const backoffMs = getBackoffMs(job.retries, job.backoffMs || DEFAULT_BACKOFF_MS);
  job.status = "retry_pending";
  job.updatedAt = nowIso();
  job.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

  appendWal({ event: "retry_scheduled", jobId: job.id, retries: job.retries, backoffMs, at: job.updatedAt });
  emitJobEvent(job, "job.retry_scheduled");

  setTimeout(() => {
    if (job.status !== "retry_pending") return;
    job.status = "queued";
    job.updatedAt = nowIso();
    pending.push(job);
    processQueue();
  }, backoffMs);
}

// ---------- Job execution ----------

function onJobFinish() {
  running -= 1;
  processQueue();
}

async function runJob(job) {
  const runner = runners.get(job.id);
  if (!runner) {
    job.status = "failed";
    job.error = "Runner function not available (lost on restart)";
    job.finishedAt = nowIso();
    job.updatedAt = job.finishedAt;
    appendWal({ event: "job_failed", jobId: job.id, error: job.error, at: job.updatedAt });
    emitJobEvent(job, "job.failed");
    onJobFinish();
    return;
  }

  job.status = "running";
  job.startedAt = nowIso();
  job.updatedAt = job.startedAt;

  appendWal({ event: "job_started", jobId: job.id, type: job.type, at: job.startedAt });
  emitJobEvent(job, "job.started");

  try {
    const result = await runner();
    job.status = "completed";
    job.result = result;
    job.finishedAt = nowIso();
    job.updatedAt = job.finishedAt;
    job.elapsedMs = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime();

    appendWal({ event: "job_completed", jobId: job.id, elapsedMs: job.elapsedMs, at: job.finishedAt });
    emitJobEvent(job, "job.completed");
  } catch (error) {
    job.retries = (job.retries || 0) + 1;
    job.error = error instanceof Error ? error.message : String(error);
    job.finishedAt = nowIso();
    job.updatedAt = job.finishedAt;
    job.elapsedMs = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime();

    appendWal({ event: "job_failed", jobId: job.id, retries: job.retries, error: job.error, at: job.finishedAt });

    if (job.retries < (job.maxRetries || DEFAULT_MAX_RETRIES)) {
      scheduleRetry(job);
      onJobFinish();
      return;
    }

    job.status = "dead_letter";
    appendWal({ event: "job_dead_letter", jobId: job.id, retries: job.retries, error: job.error, at: job.finishedAt });
    appendDeadLetter({
      jobId: job.id,
      type: job.type,
      payload: job.payload,
      error: job.error,
      retries: job.retries,
      createdAt: job.createdAt,
      deadAt: job.finishedAt,
      owner: job.owner || null
    });
    emitJobEvent(job, "job.dead_letter");
  } finally {
    onJobFinish();
  }
}

function processQueue() {
  while (running < concurrency && pending.length > 0) {
    const job = pending.shift();
    running += 1;
    runJob(job);
  }
}

// ---------- Public API (preserves existing contract) ----------

function enqueue(type, payload, runner, options = {}) {
  if (typeof runner !== "function") {
    throw new Error("Runner must be a function.");
  }

  const now = nowIso();
  const job = {
    id: newJobId(),
    type,
    status: "queued",
    payload: payload || {},
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    elapsedMs: null,
    result: null,
    error: null,
    retries: 0,
    maxRetries: options.maxRetries != null ? options.maxRetries : DEFAULT_MAX_RETRIES,
    backoffMs: options.backoffMs || DEFAULT_BACKOFF_MS,
    owner: options.owner || null,
    nextRetryAt: null
  };

  jobs.set(job.id, job);
  runners.set(job.id, runner);
  pending.push(job);

  appendWal({ event: "job_enqueued", jobId: job.id, type, payload: payload || {}, owner: job.owner, at: now });
  emitJobEvent(job, "job.enqueued");

  pruneOldJobs();
  processQueue();

  return copyPublic(job);
}

function getJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  return copyPublic(job);
}

function listJobs(limit = 30) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 30));
  return Array.from(jobs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, safeLimit)
    .map(copyPublic);
}

// ---------- WAL recovery on boot ----------

function recoverFromWal() {
  const entries = readWal();
  if (entries.length === 0) return { recovered: 0, walEntries: 0 };

  let recovered = 0;
  const jobStates = new Map();

  for (const entry of entries) {
    if (!entry.jobId) continue;
    if (!jobStates.has(entry.jobId)) {
      jobStates.set(entry.jobId, { events: [] });
    }
    jobStates.get(entry.jobId).events.push(entry);
  }

  for (const [jobId, state] of jobStates) {
    const lastEvent = state.events[state.events.length - 1];
    if (!lastEvent) continue;

    // Only recover jobs that were in-flight (running, queued, retry_pending)
    if (["job_started", "job_enqueued", "retry_scheduled"].includes(lastEvent.event)) {
      const enqueueEvent = state.events.find(e => e.event === "job_enqueued");
      if (enqueueEvent) {
        const job = {
          id: jobId,
          type: enqueueEvent.type || "recovered",
          status: "recovered_orphan",
          payload: enqueueEvent.payload || {},
          createdAt: enqueueEvent.at || nowIso(),
          updatedAt: nowIso(),
          startedAt: null,
          finishedAt: null,
          elapsedMs: null,
          result: null,
          error: "Recovered from WAL after crash - runner function lost",
          retries: 0,
          maxRetries: DEFAULT_MAX_RETRIES,
          backoffMs: DEFAULT_BACKOFF_MS,
          owner: enqueueEvent.owner || null,
          nextRetryAt: null
        };
        jobs.set(jobId, job);
        appendWal({ event: "job_recovered", jobId, at: nowIso() });
        emitJobEvent(job, "job.recovered");
        recovered++;
      }
    }
  }

  return { recovered, walEntries: entries.length };
}

// ---------- Graceful drain ----------

function drain() {
  // Stop accepting new jobs from queue
  pending.length = 0;
  appendWal({ event: "queue_drained", at: nowIso(), runningCount: running });
  return { drained: true, stillRunning: running };
}

module.exports = {
  enqueue,
  getJob,
  listJobs,
  stats,
  recoverFromWal,
  drain,
  setGraphEmitter
};
