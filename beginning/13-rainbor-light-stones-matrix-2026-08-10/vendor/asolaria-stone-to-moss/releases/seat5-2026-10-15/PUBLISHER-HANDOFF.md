# Seat 5 — GitHub / Hugging Face publication handoff (2026-10-15)

## Execution evidence
- Operator-uploaded publisher: `publish_asolaria_to_github_and_huggingface.py`, configured to publish a Git bundle to new GitHub repository `JesseBrown1980/asolaria-wasm81-rainbow-audit` and public Hugging Face **dataset** `Jessedbrown/asolaria-wasm81-rainbow-audit`.
- The publisher was checked locally with `--dry-run`: **STOPPED**: `ASOLARIA-Rainbow81-PUBLICATION-READY-v2.bundle` was not provided; therefore neither source commit nor content hashes could be established.
- Local `hf auth whoami`: **Not logged in**. GitHub/HF network DNS unavailable in that shell. No secrets were copied into source.
- Connected Hugging Face account identifies `Jessedbrown` but grants OAuth scopes `jobs, openid, profile, read-mcp, read-repos`, with **no repository write scope**.
- The existing `Jessedbrown/asolaria-wasm81-rainbow-audit` Hugging Face **model** repo is publicly visible; the requested **dataset** is a distinct repo type and has not been published by this operation.
- GitHub target `JesseBrown1980/asolaria-wasm81-rainbow-audit` returned 404 through authenticated GitHub repository metadata lookup. This is not evidence that a repository was created.
- `Jessedbrown/tests` was not found via linked Hub repository lookup.
- Original script aborts on existing exact type/name destination and contains no post-upload readback or SHA256 verification; an assertion of verified dual publication would be incorrect.

## Safe publication gate
1. Supply and inspect the Git bundle; run `git bundle verify` and capture HEAD and tracked-file SHA256 manifest.
2. Authenticate GitHub and Hugging Face with **write permission** using the platform's secure account connection or CLI login; never put keys in source or logs.
3. Create or preserve the GitHub repository without overwriting existing history. Mirror evidence to public Hugging Face dataset repositories using explicitly selected repo types.
4. Fetch/read back the published GitHub commit plus every file from both Hugging Face destinations and compare SHA256 against the local manifest. Record immutable URLs and remote revisions.
5. Only then mark status **PUBLISHED VERIFIED**.

## Public evidence already accessible
- [Seat5 GitHub release index](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/d68af38c80ca76983187056fc6d23b94b72e308c/releases/seat5-2026-10-15/RELEASE-MANIFEST.md)
- [Coordinator 50-commit audit](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55#issuecomment-6204682475)
- [Existing HF model repository](https://huggingface.co/Jessedbrown/asolaria-wasm81-rainbow-audit)

Publication status: **GitHub handoff published; full Git bundle archive + Hugging Face mirrors pending.** No draft merges or source overwrites.
