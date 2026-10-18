# Cosign Daemon Locking — Evaluation & Recommendation

**Wave**: V43-WAVE-306 Orchestrator-C / Spec 9
**PID**: AGT-helm-claude-orch-C-H02E2-V43-WAVE306-P00-NORCHC001
**Anchor**: ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23
**LAW**: ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23
**Target**: `C:/HyperBEHCS/bin/asolaria-cosign-chain-daemon.py`
**Status (probed 2026-05-24T00:49Z)**: LIVE on :4953, `head_seq=260`, anchor
`ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23`
**Operator**: OP-JESSE apex

---

## TL;DR — RECOMMENDATION

**Add cross-process file locking (msvcrt on Windows, fcntl on POSIX).** The
in-process `threading.Lock` is necessary but NOT sufficient. The architectural
intent of the daemon is "single writer to COSIGN_CHAIN.ndjson" — but the chain
file is a regular path on disk accessible to any process with FS rights. Without
OS-level write locks, a second daemon instance, a debug script, a rogue migration
tool, or even Windows backup-on-write can race the append. The current design is
**single-writer-by-convention-only**; we should make it **single-writer-by-OS-
enforcement**.

Severity: **MEDIUM**. No active collision evidence post-daemon-deployment (the
daemon's whole point was to fix the 5 historical collisions documented in V42-A4/A5
findings), and the threading.Lock alone IS sufficient for the current in-process
HTTP server. But the next time anyone runs an ad-hoc backfill or a sister daemon
on the same chain (likely as Wave-306+ Phase-2 ports come online), we lose the
single-writer guarantee silently.

---

## What the current implementation does (lines 17, 29, 55-74)

```python
import json, hashlib, os, threading
...
_lock = threading.Lock()

def append_row(payload_dict):
  """SERIALIZED append — assigns seq, computes row_hash, chains antecedent."""
  with _lock:
    prev_seq, prev_hash = chain_head()
    next_seq = prev_seq + 1
    ...
    with open(CHAIN, "a", encoding="utf-8") as f:
      f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return next_seq, row["row_hash"], prev_hash
```

`chain_head()` is a MAX-scan over all rows (per V42-A4 doc-comment: handles
out-of-order historical seqs). Inside `_lock`, the daemon:
1. Scans the entire file for `max(seq)` (current size: ~260 rows × ~600 B = ~150 KB
   — trivial).
2. Computes `next_seq = max + 1`.
3. Computes row_hash over the canonical-JSON of the new row (sort_keys=True).
4. Appends one line via `open(CHAIN, "a")` + write.
5. Releases lock.

`ThreadingHTTPServer` is used (line 19, 131), so multiple HTTP requests CAN be
in-flight concurrently, BUT all enter `append_row()` and serialize on `_lock`.
For SAME-PROCESS concurrent appends: **CORRECT, no race**.

---

## What threading.Lock guarantees AND fails to guarantee

### Guaranteed (in-process):

- Mutex over ALL Python code inside `with _lock:` for THIS process's threads.
- The MAX-scan + seq-assign + write is atomic from the perspective of any code
  running in the same Python process.
- Two HTTP `POST /api/cosign/append` requests handled concurrently by
  ThreadingHTTPServer serialize correctly. No collision possible.

### NOT guaranteed (cross-process):

- Mutex against OTHER processes. A second `python asolaria-cosign-chain-daemon.py`
  invocation (accidentally launched, double-start from PowerShell wrapper, etc.)
  will hold its OWN `_lock`. Two daemons, two locks, ZERO mutual exclusion. Both
  can scan the file, compute the same `next_seq`, and race the append.
- Mutex against ad-hoc scripts. Any `python -c "open('COSIGN_CHAIN.ndjson', 'a')..."`
  or backfill tool bypasses the lock entirely.
- Mutex against Windows file ops (Backup, OneDrive sync, AV scan opening for read,
  Explorer preview). These usually don't append, but a misbehaving sync agent that
  re-writes the file from a cached copy is the classic "vanishing append" pattern.
- Mutex against the chain file living on the USB-2TB substrate. If a future port
  moves CHAIN to the USB drive (per `feedback_hermes_era_usb_descriptors_not_mount_2026_05_22.md`),
  USB-side compaction/transfer races become a real consideration.

### Risk model under threading.Lock only:

| Scenario | Likelihood (federation) | Impact | Mitigated by threading.Lock? |
|---|---|---|---|
| Two HTTP appends same daemon | HIGH (Wave-306 fires N writes) | HIGH (collision) | YES |
| Double daemon-start | LOW (PID file at line 23) | HIGH | NO |
| Ad-hoc append script | MEDIUM (Wave-306 backfills) | HIGH | NO |
| Migration tool concurrent | LOW currently | HIGH | NO |
| OneDrive/sync on chain file | LOW (file is under C:/asolaria-acer, not OneDrive default) | MEDIUM (silent loss) | NO |
| Power-loss mid-append | LOW | LOW (single line lost, recoverable) | N/A — needs fsync, separate concern |

The PID file at `C:/HyperBEHCS/data/cosign-chain/daemon.pid` (line 23) is *advisory*
— nothing in the daemon checks for an existing PID before binding. If the operator
double-runs, the second daemon will fail at `srv = ThreadingHTTPServer(("127.0.0.1",
PORT), ...)` because port 4953 is already bound. **So the port-binding gives us
single-daemon enforcement in practice.** This is GOOD — it means the most common
cross-process risk (accidental double-start) is already mitigated by OS-level
port-binding.

The REMAINING risk is ad-hoc scripts and migration tools that bypass the daemon
entirely — these are the realistic Wave-306+ concerns.

---

## Cross-process lock options on Windows

### Option L1: `msvcrt.locking()` (Windows-native byte-range lock)

```python
import msvcrt
with open(CHAIN, "a+b") as f:
    f.seek(0, 2)  # to end
    try:
        msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, 1)  # blocking, 1-byte
        # ... append ...
        msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
    except OSError:
        # lock contention
        ...
```

Pros: Windows-native, no extra deps. Locks across processes.
Cons: msvcrt locks have idiosyncratic semantics (mandatory locking, lock byte
range = 1 byte at current file offset, must remember to unlock or process death
holds it). 30-second default timeout if not LK_LOCK vs LK_NBLCK.

### Option L2: `portalocker` (cross-platform library)

```python
import portalocker
with open(CHAIN, "a", encoding="utf-8") as f:
    portalocker.lock(f, portalocker.LOCK_EX)  # exclusive, blocking
    f.write(...)
    portalocker.unlock(f)
```

Pros: One API for Windows (msvcrt) + POSIX (fcntl). Battle-tested library
(`pip install portalocker`). Context-manager support: `with portalocker.Lock(path,
"a") as f: ...`.
Cons: Extra dep. `pip install portalocker==2.10.x` (~30 KB pure-Python).

### Option L3: External advisory lockfile + `os.O_EXCL`

```python
LOCKFILE = Path("C:/HyperBEHCS/data/cosign-chain/cosign-append.lock")
fd = os.open(str(LOCKFILE), os.O_CREAT | os.O_EXCL | os.O_RDWR)
try:
    # ... append ...
finally:
    os.close(fd)
    os.unlink(LOCKFILE)
```

Pros: Zero deps. Works on any FS.
Cons: STALE LOCK PROBLEM — if the daemon crashes mid-append, the lockfile
persists and the next daemon hangs forever. Requires lockfile staleness detection
(write PID+timestamp inside, check if PID alive). Adds complexity.

### Option L4: Single-writer arch — only the daemon writes, all clients HTTP

This is the **architectural** answer the daemon was designed for. If we enforce:
"NO process other than asolaria-cosign-chain-daemon.py may write to COSIGN_CHAIN.ndjson",
then threading.Lock IS sufficient. Enforcement options:

- Documentation only (current state) — relies on convention, breaks easily.
- File-system ACL — `icacls COSIGN_CHAIN.ndjson /grant SYSTEM:F /deny "*authenticated":W`
  + service-account daemon. Operator-level setup, real enforcement.
- Move CHAIN to a path only the daemon's user can write to (separate svc account).
- Lint/CI: grep for direct writes to COSIGN_CHAIN.ndjson in the codebase, fail
  the build.

---

## RECOMMENDATION — combined approach

**Adopt Option L2 (`portalocker`) AS A SAFETY NET + document Option L4 (single-
writer arch) as canon.**

### Why both:

1. **L4 is the architectural truth** — the daemon exists precisely to be the
   single writer; encoding that as canon stops sloppy migration tooling.
2. **L2 is the defense in depth** — even with L4 documented, a Wave-306 agent who
   doesn't read the canon will write directly. portalocker means their write at
   least serializes with the daemon's writes (each write contends for the OS-level
   file lock), preventing collision even if it violates L4.
3. **Cost is trivial** — `pip install portalocker` (~30 KB) + 6 lines of code
   inside `append_row()`'s `with _lock:` block. No semantics change for legitimate
   callers (daemon path is unchanged), only adds OS-level mutex on top.

### Why NOT just L1 (msvcrt):

- msvcrt has a Windows-only quirk where the lock is byte-range, not file-scoped,
  AND if you forget to unlock before close, the lock leaks to the parent process.
  portalocker abstracts these footguns. Zero benefit to going Windows-only.

### Why NOT just L3 (advisory lockfile):

- The stale-lock recovery code is non-trivial and the failure mode (daemon hangs
  forever) is worse than the no-lock case.

### Why NOT Option L4 alone:

- Documentation-only enforcement has been violated 100% of the times we've tried
  it in this codebase (per existing collision history). Belt + suspenders.

---

## Proposed code patch (illustrative — NOT TO BE APPLIED in this design pass)

```python
# line 17 — add portalocker
import json, hashlib, os, threading
import portalocker

# line 55-74 — wrap the append in BOTH locks
def append_row(payload_dict):
  """SERIALIZED append — in-process threading.Lock + cross-process portalocker."""
  with _lock:  # in-process (necessary for ThreadingHTTPServer)
    # Open file with cross-process exclusive lock; lock auto-releases on close.
    with portalocker.Lock(CHAIN, "a", encoding="utf-8",
                          timeout=10.0, flags=portalocker.LOCK_EX) as f:
      # IMPORTANT: read prev under the cross-process lock too, so we see any
      # appends made by other processes BEFORE we compute next_seq.
      f_check = open(CHAIN, "r", encoding="utf-8", errors="ignore")
      max_seq = 0
      max_hash = "0000000000000000"
      for line in f_check:
        try:
          d = json.loads(line)
          s = d.get("seq")
          if isinstance(s, int) and s > max_seq:
            max_seq = s; max_hash = d.get("row_hash", "0000000000000000")
        except: continue
      f_check.close()
      prev_seq, prev_hash = max_seq, max_hash
      next_seq = prev_seq + 1
      row = dict(payload_dict)
      row["seq"] = next_seq
      if "antecedents" not in row:
        row["antecedents"] = [prev_hash]
      elif isinstance(row["antecedents"], list) and prev_hash not in row["antecedents"]:
        row["antecedents"] = [prev_hash] + row["antecedents"]
      if "ts" not in row: row["ts"] = now_iso()
      if "appended_by_daemon" not in row: row["appended_by_daemon"] = ANCHOR
      base = json.dumps({k:v for k,v in row.items() if k != "row_hash"},
                        sort_keys=True, ensure_ascii=False)
      row["row_hash"] = sha16(base)
      f.write(json.dumps(row, ensure_ascii=False) + "\n")
      f.flush()
      os.fsync(f.fileno())  # OPTIONAL: durability against power loss
      return next_seq, row["row_hash"], prev_hash
```

Note the re-scan inside the cross-process lock is important: an external process
could have appended between the daemon's last scan and this append. Re-scanning
under the cross-process lock guarantees we see ALL committed appends.

---

## Performance impact

- Current: ~150 KB MAX-scan + 1 file open + 1 write. ~1-2 ms per append on SSD.
- Proposed: same + portalocker EX-lock (~50 µs Windows overhead) + fsync if
  enabled (~5-15 ms SSD, ~30-100 ms HDD).
- Throughput cap: ~50-200 appends/sec with fsync, ~500+/sec without.

Given the cosign chain grows at <300 rows in the entire history of the daemon
(head_seq=260 after most of a day of Wave-306 traffic), **throughput is NOT a
concern**. The lock + fsync overhead is invisible in this regime.

If a future high-frequency cosign-append surface emerges (>100 ops/sec), revisit
by either (a) batching multiple appends per fsync, or (b) moving to a write-ahead
log + periodic compaction pattern. Out of scope for today's recommendation.

---

## Additional hardenings (out of scope, queued)

1. **fsync on append** — guarantees durability against power-loss. Add as Phase-1.5.
2. **PID-file health check at boot** — daemon should verify the PID in
   `daemon.pid` is dead before binding port 4953 (currently port-bind failure is
   the only check). Cleanly diagnose stale-PID-file vs running daemon.
3. **Append-rate limiter** — protect against runaway agents flooding the chain.
   Configurable, default 100 appends/min/source-PID.
4. **Periodic chain integrity check** — background thread verifies sha-chain
   antecedents every N minutes; alert on break.
5. **Read replicas via append-only `tail -f` watchers** — for downstream
   subscribers; standard pub-sub pattern over file-watch.

---

## Cosign class for the patch

| Action | Class | Justification |
|---|---|---|
| Apply portalocker patch to daemon | `DAEMON_OP` | Code change to active daemon, no canon mutation |
| Restart daemon with new code | `DAEMON_OP` | Service restart |
| Document Option L4 as canon (single-writer arch) | `LAW_CHANGE` | Federation-wide write discipline change |
| Add file-system ACL enforcement (if pursued) | `LAW_CHANGE` + operator-witness | Permission-system change |

---

## Cosign provenance (EVALUATION DOC, not the patch)

This evaluation does NOT alter the daemon code. Emitting it requires
`COSIGN_APPEND` (simple-majority, authorized pool). The patch itself is a future
`DAEMON_OP` gate; the L4 canon emission is a future `LAW_CHANGE`.
