# Google 38 TB Drive Integration — Readiness

Anchor: ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23
Spec: 15 (Orchestrator E, Wave-306)
Vantage: acer
Operator: OP-JESSE apex (Plasmatoid sub gives 38 TB Drive)
Prior canon: `C:/HyperBEHCS/store/google-cloud-surfaces-enabled-canon-2026-05-22.hbp`
Memory: project_google_ultra_gemini_cli_live_2026_05_22.md

---

## Current state (verified 2026-05-23)

- gcloud CLI installed: `C:/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin/gcloud` (v569.0.0)
- Active account: `plasmatoid@gmail.com` (OAuth user-creds present)
- Active project: `winged-complex-390417` (My First Project, project_number=742368506950)
- Drive quota source: Plasmatoid Google Ultra sub = **38 TB** (operator-canonized supersedes prior "600 TB" miscount)
- gemini CLI live: `C:/nvm4w/nodejs/gemini` v0.43.0 (env-keyed)
- Surfaces ENABLED (per prior canon row `google-cloud-row-enabled`):
  - drive.googleapis.com (token lacks drive scope — see blocker #1)
  - storage.googleapis.com (needs billing for buckets — see blocker #2)
  - bigquery.googleapis.com + 6 sub-APIs (FREE TIER active)
  - aiplatform.googleapis.com (Vertex AI Agent Platform)
  - dataplex / dataform / analyticshub
  - generativelanguage.googleapis.com (Gemini API live)

## Blockers (gcloud ADC verification)

```
$ gcloud auth application-default print-access-token
ERROR: (gcloud.auth.application-default.print-access-token)
Your default credentials were not found.
```

User-creds present, ADC unset. Two independent auth tracks. ADC is required for Python/Drive SDK client libraries.

---

## Operator action items (MANUAL — gated on browser interaction)

1. **Set ADC** — interactive browser flow (cannot automate):
   ```
   gcloud auth application-default login
   ```
   Result: writes `application_default_credentials.json` to `%APPDATA%/gcloud/`. Unblocks Python google-auth libs.

2. **Re-auth with Drive scope** — adds `https://www.googleapis.com/auth/drive`:
   ```
   gcloud auth login --enable-gdrive-access
   ```
   One additional browser click after primary auth. Unblocks Drive API token verification of the 38 TB quota.

3. **Link billing account** to project `winged-complex-390417` via
   `https://console.cloud.google.com/billing` —
   gates Compute / Cloud Run / Storage buckets / Artifact Registry / Cloud Functions.
   Storage buckets specifically required for Tier-1 federation canon mirror.

4. **Decide bucket strategy** — operator confirms target bucket name(s):
   - Proposed: `gs://asolaria-canon-2026` (Tier-1 federation mirror, dual-region preferred)
   - Proposed: `gs://asolaria-cold-2026` (cold canon, single-region cheap)
   - Plasmatoid Google Ultra Drive separately addressable via Drive API once scope added

## Automatable items (post operator unblock)

1. **ADC verification** —
   `gcloud auth application-default print-access-token` → expect 200-char ya29 token.

2. **Drive quota probe** — once Drive scope present:
   ```
   curl -s -H "Authorization: Bearer $TOKEN" \
     'https://www.googleapis.com/drive/v3/about?fields=storageQuota'
   ```
   Expect `usage`, `limit` (= 38 TB = 41,781,441,855,488 bytes), `usageInDrive`.

3. **Bucket roundtrip** — sha-verified upload/download of one HBP file as smoke test:
   - Upload `C:/HyperBEHCS/store/sovlinux-deep-decode-wave-2026-05-22.hbp` via `gsutil cp`
   - Download and compare sha256 → emit HBP attestation row.

4. **Omnidispatcher target wiring** —
   Add target `google:drive-38tb` to omnidispatcher (currently :4950 returns
   `unknown route` for `/status` and `/api/targets` — needs daemon-side schema).
   Suggested envelope shape (FEDENV-v1 per prior memory ref):
   ```json
   {
     "target": "google:drive-38tb",
     "verb": "upload | download | list | sha-verify",
     "path": "<local>",
     "remote": "<drive-folder-id | gs://bucket/key>",
     "auth_mode": "user-creds | adc | api-key",
     "anchor_pid": "<calling-anchor>"
   }
   ```

5. **BigQuery federation event log** — create dataset `asolaria_events_2026` (free tier 10 GB),
   single table `cosign_events` with rows `{ts, vantage, seq, anchor, row_hash, sha256_body}`.
   Mirror acer + liris cosign rows there. Read-only public view eventually.

6. **Vertex AI Agent Platform** — wire as federation citizen per AGENT.md authoring step;
   advertise in fabric `/api/daemons` and bus.

## Routing through omnidispatcher (when boot)

Per memory ref `reference_next_claude_post_upgrade_cli_addresses_2026_05_22.md`,
omnidispatcher target signature:

- `target=google:drive-38tb` — Drive API (post scope grant)
- `target=google:gcs-asolaria` — Cloud Storage bucket lane
- `target=google:bq-events` — BigQuery query/insert lane
- `target=google:vertex-agent` — Vertex Agent Platform invoke lane

Currently `127.0.0.1:4950` returns `unknown route` for `/api/targets` — omnidispatcher
daemon-side schema is the prerequisite work item (NOT this spec's scope; flag for
next orchestrator wave).

## What works RIGHT NOW (no operator action)

- `gemini` CLI headless: `gemini --skip-trust --approval-mode plan -p "<prompt>"`
  uses `GEMINI_API_KEY` / `GOOGLE_API_KEY` env vars (length 39, AIza format).
- BigQuery queries via `bq` CLI (FREE tier 1 TB/month).
- Vertex AI Python SDK with project=winged-complex-390417 (no Drive).
- All ENABLED surfaces queryable via `gcloud services list --enabled`.

## Cross-references

- Prior canon HBP rows: `google-cloud-row-anchor` through `google-cloud-row-roadmap` (8 rows)
- Hermes-era cosign extension active per `project_extended_quintuple_until_upgrade_and_newest_hermes_absorbed`
- Sovereignty: Drive is cross-vantage cloud, NOT per-vantage sovereign storage. Treat as Tier-1 mirror only (cold/canon); hot path remains local USB + HBP atlas.
