# Seat 2 — Colour QR × N-Nest × Q-PRISM × GitRAM, source-frozen execution contract
2026-10-16 · DRAFT · digital interoperability experiment (not an astrophysical or optical-memory test)

## Provenance first
Initial adapter source commits e57f63d and 8bb25ed precede this experiment protocol; this is **not** falsely described as prospective preregistration before source implementation. This document freezes the proposed GitHub-hosted integration test *before the workflow is run*.

Original independent upstream roots (the owner authored them and these are **not independently instrument signed**):
- Colour QR: https://github.com/JesseBrown1980/the-colour-qr/tree/1938a9b076b8fc3e81d0a271ca05e84a0e938854 · schema exactly 2,100 byte bodies with four-byte little-endian Fischer index, RGB channel i mod 3, base64 of indexed payload, separate ordinary QR symbols, full-body SHA-256 final check. Real QR rendering/scanning is not yet implemented by this adapter; the output is QR-ready base64 (NOT a QR bitmap).
- N-Nest/Recurrence Is Mind: https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED/tree/307903651f56e8a28ef98ca36aef22ee8cda935c · no autonomous consent or loop-echo truth; every reported chunk compared to source-grounded recomputation, failure propagates to apex. Original node verifier scripts run as a separate regression harness.
- Q-PRISM Path1: https://github.com/JesseBrown1980/dbbh-coms-quant-prism/tree/30386807a2d0d6b100c06a40e3d26105849537df · use actual published Rust library git-pinned at commit, its QPrismCube BEHCS-1024 bijection, real SessionCapsule two-side simulated arm, dbbh_send, dbbh_receive, collapse, ReceiptChain. In this simulated test both sides are a local process; this is NOT real independently authenticated bilateral user consent.
- GitRAM: https://github.com/JesseBrown1980/GitRAM/tree/e01425204b58dc680d1f3106410ff9ce71260b0d · three stateless GitHub Actions workers, one per R/G/B, upload own receipts, all-or-nothing fan-in without retraining. GitHub Actions artifacts represent bounded durable checkpoints, not synchronized mutable RAM.
- Target coordinator: https://github.com/JesseBrown1980/asolaria-stone-to-moss

## Source/input
Source chosen is the original Colour QR repository `README.md` fetched by GitHub Actions checkout pinned to `1938a9b`. All cells separately fetch that frozen full source; fan-in separately fetches it, reads every emitted .hbi, .qr.txt and .hbp and their .sha256 files. This real in-repository source is a **functional interoperability fixture**, not a telescope photon capture. Input byte/hash/length actually observed must be reported, not fabricated in advance.

## Required controls
- Rust 1.81.0 exact, cargo clippy --all-targets -- -D warnings, std-only application and existing zero-dependency Q-PRISM library, **no floats or JSON** in scientific outputs.
- Exactly one owned lane per stateless cell, no mutation of either original repo or main, max 10,000 QR indexed chunks.
- Q-PRISM Path1 actual cryptographic content-address + exact reconstructed content and receipt gate (does not invent missing bits).
- N-Nest watcher rejects missing channel, index reorder, duplicate index, mutated body even if altered SHA sidecars, changed QR string, wrong source, fake consent; no automatic scale authorization.
- All files have SHA-256 sidecars; no JSON scientific report file (GitHub Actions API metadata may be JSON outside the experiment).
- fan-in must compare all reconstructed original bytes, their Q-PRISM address and actual source hash, check chain and emit one HBP report. Failed shards must prevent sealing.
- Original N-Nest depth-3 and prime-depth-7 scripts must independently run and catch planted faults.

## Results to report, only after evidence exists
Source exact SHA-256 and size; actual number of chunks and per-lane files; Rust test count, Clippy result; original N-Nest script outcomes; actual GitHub Actions run URL, exact workflow HEAD and whether fan-in passed; file hashes and real failed controls. Do not call a green GitHub worker a separately instrumented photonic memory, independent human seat, or quantum device. No merge or publication until independent review.
