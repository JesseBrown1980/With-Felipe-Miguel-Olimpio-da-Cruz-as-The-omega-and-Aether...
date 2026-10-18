# 04 — The build day (2026-03-15 → 2026-03-16)

Build-order step 4 of the beginning. This is the day the Asolaria repository starts: every commit before this one does not exist in the mirror. The first commit is `b49a725` at 2026-03-15 14:41:02 -03:00, and its message is:

> Phase 0-3 monolith decomposition: 1785 lines extracted, 25 route modules

So the day opens with a 1.2 MB `server.js` monolith (`914ea77`, 1,197,968 bytes) being pulled apart into route modules under the strangler-fig plan (ADR-0001). By the last commit of the next day, `0a48498` (2026-03-16 21:44), that same `server.js` has shrunk to 839,555 bytes (`118fd26`) as more was lifted out. Both ends of `server.js` are kept here so the decomposition is visible from both sides.

The law that governs the day is written the same day. `docs/claude-project/CONSTITUTION.md` is the **ASOLARIA CIVILIZATION SUPER SWARM ANTI-DRIFT CONSTITUTION v2**, and it names its own origin on its line 4 (`Source:`): a collaborative session with Jesse on 2026-03-15.

Its job, in its own words, is to "preserve what exists, verify what is real, isolate what is brittle". `docs/CREATION_HISTORY.md` is the origin story that sits beside it; it opens on the founder's vision of "a self-improving AI orchestration platform that controls every aspect of his digital life ... all governed by strict authority, approval, and anti-drift laws." Those two documents were first committed later (at `fbcb630`, 2026-04-11) but they describe and date to this day, so they are vendored here.

## What is held here

- `vendor/Asolaria/` — the build-day tree at its original paths:
  - the whole of the first commit `b49a725` (89 files): `server.js`, the first 25 route modules under `routes/`, 44 files under `src/connectors/`, `lib/` and `middleware/` helpers, the first ADRs `ADR-0000..ADR-0005`, the phase-0 state packet, and the first tests and tools;
  - the Phase 2-3 governance files, read from `58b51eb` (2026-03-15 15:36): `lib/guardian.js` (the Guardian evaluation engine) and `lib/settings.js`, which first appear at `58b51eb`; and, first appearing at `e8c3369` (15:20), the first hooks `.claude/hooks/asolaria_guard.py` and `asolaria_hook.py`; and the guardian/approval lane `src/approvalEngine.js`, `src/guardianApprovalStore.js`, `src/guardianNotifier.js`, `src/guardianStore.js`, `src/hookEventStore.js`, `src/transcriptBackupStore.js`. (`routes/hooks.js` and `src/connectors/hooksConnector.js`, the other two "first hooks", are the same blobs already present in the `b49a725` set.)
  - `routes/guardian.js` from `64b1a14` (2026-03-15 19:06), the guardian route;
  - `docs/adr/ADR-0006..ADR-0012` from `0a48498`, completing the build-day ADR series (ADR-0010 is the GNN-preconditions ADR that opens the GNN lane);
  - `docs/claude-project/CONSTITUTION.md`, `docs/CREATION_HISTORY.md`, and `.history/archaeology/SNAPSHOT-DIFFS.md` (the forensic snapshot-diff report).
- `vendor/Asolaria-variant-58b51eb/middleware/auth.js` and `vendor/Asolaria-variant-0a48498/server.js` — the two files that have a second same-/next-day blob at the same original path, kept under a commit-qualified folder so both byte-identical versions survive.
- `PROVENANCE.md` — one row per vendored file: path, source commit and path, blob id, bytes, sha256(16), the beginning date (the commit that first introduced that blob), and a content date where the file carries one.
- `UPSTREAM.sha256` — full sha256 of every vendored file, in `sha256sum -c` format, to be run from this directory.
- `pins/` — the rest of the build-day tree recorded by blob, not copied: the full `routes/ src/ lib/ middleware/ tests/ services/` tree of `e8c3369` (139 files; 74 of those blobs are vendored here, 45 more are vendored in step 02's release trees (4 of them also in step 03), and 20 are vendored in no step, among them `src/secretHardening.js` 4db17dcb, `src/secureVault.js` 17013b39 and `lib/logRotation.js` 15be3eaa), the later `TASKS.md` versions, `ADR-0013` (which lands 2026-04-11), and the legacy-import guardian route. See `pins/PINNED.md`.
- `HELD.hbp` — see below.

## Date range

Beginning dates run 2026-03-15 14:41 (the first commit) to 2026-04-11 00:42 (the Constitution / Creation History / archaeology snapshot that documents the day). The build day proper is 2026-03-15 and 2026-03-16.

## What is not public (held, not vendored)

Five candidate records for this step are held, with only their blob ids recorded in `HELD.hbp`, because they reproduce personal messages, third-party conversations, or PII under the owner's HOLD rules:

- `.history/archaeology/WHATSAPP-TIMELINE.md` — built from a personal WhatsApp chat export and quoting personal messages and financial figures;
- `.history/archaeology/CONVERSATION-TIMELINE.md` — extraction of personal Facebook/WhatsApp conversations;
- `.history/archaeology/GROUND-TRUTH.md` — a merge that reproduces the above;
- `.history/archaeology/ANTIGRAVITY-BRAIN-SESSIONS.md` — carries a real personal phone number (an elevated-access value) and a reference to a live API key;
- `TASKS.md`, the first version (`02ad906b`, 232,401 bytes, first at `e8c3369`) — its lines 171 and 437 carry the owner's personal mobile number in full. It was first vendored here and was moved to `HELD.hbp` on review (2026-10-18). The owner's own release manifest (`config/public-release.manifest.json`) also leaves `TASKS.md` out of public builds.

After that review, no vendored file in this step contains a private key, token, password, API key, phone number, or third-party private data. The email addresses present are two of the owner's own. The `*_SECRET` constants in the vendored code are vault key *names* (for example `integrations.gcp.service_account`), not secret values.
