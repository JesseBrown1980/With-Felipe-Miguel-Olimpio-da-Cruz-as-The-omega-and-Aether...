# Publish + Demo Checklist (Template)

Use this template for a release-specific checklist copy:

`reports/release-demo/PUBLISH_DEMO_CHECKLIST.md`

The gate script enforces only lines that start with `GATE:`.

## Checklist

- [ ] GATE: Public release stage folder exists (`dist/public-release*/Asolaria-Public-<version>`).
- [ ] GATE: Public release zip exists and SHA256 is recorded.
- [ ] GATE: `LEAK_SCAN_REPORT.json` exists and contains zero findings (`[]`).
- [ ] GATE: `PUBLIC_RELEASE_NOTES.md` exists for this stage and was reviewed.
- [ ] GATE: Unlisted demo video URL is saved in `reports/release-demo/demo-video-url.txt`.
- [ ] GATE: Startup/connect/reconnect test evidence is saved in `reports/release-demo/test-evidence.md`.
- [ ] GATE: Play Console testing track proof is saved in `reports/release-demo/play-track-proof.txt`.
- [ ] GATE: Submission packet notes are saved in `reports/release-demo/submission-packet.md`.
- [ ] GATE: Owner sign-off is completed (name + UTC timestamp).

## Owner Sign-off

- Name:
- UTC timestamp:
- Notes:

