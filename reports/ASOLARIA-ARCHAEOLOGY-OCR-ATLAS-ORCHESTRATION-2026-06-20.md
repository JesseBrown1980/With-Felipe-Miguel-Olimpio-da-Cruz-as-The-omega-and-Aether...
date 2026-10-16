# Asolaria Archaeology OCR + 3D Atlas Orchestration

Date: 2026-06-20
Mode: Microsoft-style Algorithm of Thought: measure, gate, execute bounded, verify, then expand.

## Current Measured State

From the Acer-side run, treated here as OPERATOR_OBSERVED until Liris re-measures pushed artifacts:

- Unified archaeology table built over USB + C: + D:.
- 590,992 artifacts, 457,717 unique after dedup.
- Timeline: 2018-06-23 to 2026-06-20.
- Classes: CORPUS 59,300; DATA 377,303; RUNTIME 120,704; MEDIA 27,873; CARVE 5,812.
- Text enriched so far: 700 USB canon papers + 1,047 PDF/docx + inline markdown pass.
- Significance points: 460.

## Step Plan

1. Install Tesseract on the Acer metal seat.
   - Verify with `tesseract --version`.
   - Do not claim OCR readiness before this version check passes.

2. Run image OCR.
   - Scope: 28,856 images plus 256 scanned PDFs.
   - Output: `image-ocr-overlay.ndjson`.
   - Carve-out: do not OCR private phone, financial, key, vault, decrypted, or personal-ID paths.

3. Wire 35 TB Google Drive as source 4.
   - Metadata-first.
   - Content only within authorized scope.
   - Output: `rows-GDRIVE.ndjson`.

4. Build/read USB ext4 boot-metal source.
   - `exfat_walk.py` covers the exFAT carry partition only.
   - The Linux/Ubuntu/Asolaria-kernel boot-metal partitions need an ext4 raw reader or a Linux block attach.
   - Output: `rows-USB-EXT4.ndjson`.

5. Regenerate the unified table.
   - Merge USB, C:, D:, GDRIVE, USB-EXT4.
   - Preserve PID, rule-of-three, prime-tower, and Brown-Hilbert addressing.
   - Emit HBP, corpus view, summaries, and sidecars.

6. Serve the newest 3D atlas / voxel frontend.
   - Source: unified archaeology table plus Brown-Hilbert geometry.
   - The frontend should show the latest voxel atlas from the regenerated table, not stale screenshots.

## Boundaries

- This branch does not install Tesseract.
- This branch does not access Acer local disks, USB, or Google Drive.
- No USB write, format, or repartition.
- No secret or private data dump.
- Liris should attack-verify only after Acer pushes summaries/assets.

## Next Concrete Acer Actions

- Install and verify Tesseract.
- Run OCR overlay generation.
- Push `SUMMARY.json`, table sidecars, OCR overlay summary, and newest 3D atlas frontend assets.
- Then Liris verifies from GitHub bytes and, where possible, independently recomputes hashes.
