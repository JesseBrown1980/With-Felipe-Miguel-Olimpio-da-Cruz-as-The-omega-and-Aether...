# ADR-0007: Google Write Scopes Behind Approval Gates

## Status
Accepted (implemented 2026-03-15)

## Context
Google connector has READ-ONLY scopes: gmail.readonly, calendar.readonly. The build plan (Phase 4) requires write-capable Google governance for Asolaria to manage Google Workspace on behalf of the owner: send emails, create calendar events, edit documents, manage Drive files. Per the Anti-Drift Constitution, all write mutations must flow through the approval engine.

## Decision
1. Add WRITE_SCOPES constant alongside DEFAULT_SCOPES (read-only)
2. Add approval-gated write functions: sendGmail, createCalendarEvent, createDriveFile, updateDocument
3. Every write operation must call evaluateGuardianGuard before executing
4. Write scopes are requested on-demand (not at initial OAuth) — user must re-consent
5. Manifest writeScopes updated to reflect actual capabilities

## Write Scopes Added
- `https://www.googleapis.com/auth/gmail.send` — send email
- `https://www.googleapis.com/auth/calendar` — create/update events
- `https://www.googleapis.com/auth/drive.file` — create/update files Asolaria created
- `https://www.googleapis.com/auth/documents` — edit Google Docs (notebook mirror)

## Consequences
- Positive: Asolaria can now manage Google services for the owner
- Negative: write operations require re-consent OAuth flow with broader scopes
- Risk: plaintext tokens in vault — mitigated by DPAPI hardening (ADR-0003)
- Safety: every write op goes through guardian, approval engine, and graph event logging

## Rollback
Remove write functions and scope constants. Read-only behavior preserved.
