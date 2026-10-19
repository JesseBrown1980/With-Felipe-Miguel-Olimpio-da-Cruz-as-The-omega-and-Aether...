# Seat 1 — Round 2C preregistration: 81-memory RGB light bank + C/O/R gated recall

**Frozen before code, image generation or observations.** Parent #56; Coordinator #55; Room charter draft PR #60. Branch is a child of PR #50 source head; Phase A original must not be modified or pooled with this new Phase C. Phase B rate-law prereg was separately committed at `6cb3139d84f380b28d8c12387e84e08548fb69ce`.

## Precise source inputs

1. Brown's original **Colour QR** (Aug 6–7 2026), repo `JesseBrown1980/the-colour-qr`: chunks of 2,100 bytes; four-byte little-endian Fischer chunk index; Base64 QR plaintext; independent standard QR symbols in R, G, B image planes; concatenate indexed bodies and verify global SHA256. A missing or duplicate-conflicting QR chunk is a **failure**, never silently filled. Requires high-resolution individual images.
2. **The Bridge — Three Languages**, repo `JesseBrown1980/the-bridge-you-need-three-languages`: English / Hebrew / Portuguese provide three explicitly labeled views on a record. The lexicon in this experiment is fixed: `house / casa / בית`, `door / porta / דלת`, `light / luz / אור`. These views are metadata associations, **not guaranteed equivalent translations for all contexts** and **not physically independent witnesses**.
3. **The Law of Space and Light and Colour and Travel at the Speed of One**, repo `JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one`: mathematically evaluate the rational three-channel projector `P=I-J/3` with integer numerators `r_i=3*x_i-(x_0+x_1+x_2)`. It removes common mode, `sum(r)=0`. Restore original triplet only with an **explicit separately retained sum** `s=x_0+x_1+x_2`, using `x_i=(r_i+s)/3`. Verify non-invertibility without s by adding the same integer to each x. Here this is a pure coding/math operation, not light-speed/relativistic signaling or proof of optical storage.

## Challenge construction and sample volume

Generate **81 immutable identity memories** `site-000`...`site-080`, arranged in 27 logical addresses `(-,0,+)×(R,G,B)×(x,y,z)`, three IDs per address. Memory text token is selected cyclically from the fixed lexicon above; deterministic `SHA256("ASOLARIA|LIGHTBANK|ROUND2C|" + id + "|" + time + "|" + colour + "|" + space)` is its separate synthetic data witness. All 81 records are JSON UTF-8 in a canonical newline-terminated envelope with sorted keys, compact separators, `ensure_ascii=False`; no private/personal data. Producer serializes memory bytes once, hashes them SHA256 and emits a manifest pinning `source_sha256`, per-index chunk data SHA256, number of images and three-language schema.

Make QR planes using standard QR-code **low-error-correction** level (L) to fit Base64 of 2,100+4 bytes, 3 pixels per module or higher and quiet zone at least four modules; combine R/G/B grayscale planes without flattening. Empty tail planes are all-white. The PDF/visual look is irrelevant; actual QR decoding of each separated PNG image channel is REQUIRED, using a real standards-compliant QR decoder. The reader reassembles indexed chunks in arbitrary image order, rejects gaps/duplicates/index corruption, and checks the SHA against the pinned original. A Node.js implementation independently parses/reassembles exact **QR-extracted UTF-8 strings** and validates byte-for-byte source hash. Node is not claimed to have independently decoded image pixels; Python's image-to-QR decode is separately evidenced.

**Required actual negative trials:**
- Remove an entire occupied colour plane in one PNG and attempt a full reconstruction → MUST fail closed as missing index.
- Change a decoded chunk's body byte while retaining original source hash → MUST fail SHA.
- Duplicate a chunk index with conflicting contents → MUST fail.
- Reorder image array → exact original memory bytes restored.
- Mix original data with a manifest of changed expected hash → MUST fail.
- Projector common-mode difference remains undetectable without retained sum; with retained sum all 81 integer triples reconstruct exactly and a modified residual is rejected.
- Reference SHA known only from the same mutable source is NOT proof of external origin. Report cooperative source spoof and fully coherent source+manifest compromise as **HELD**, not detected.

## Synthetic photocycle read gate (not optical measurement)

Use the **previously preregistered Phase B** conservative integer 3-state kinetics at dt=20 ms for 24 s and two pulse-pair schedules; rate units and assumed `g,V,E_rev` identical to Round 2B prereg. Test the `dark`, `open_loop_full`, `feedback_now`, `feedback_delay10` and `feedback_stale100` arms on 81 identities. A gate logically authorizes *software read* at sample ticks when `O >= 50,000,000` of `S=1,000,000,000` and light was commanded that tick. Dark must authorize zero; illuminated arms must authorize some. No biological activation or actual emitted photons are measured. Memory source, RGB image files and QR decode are the **same deterministic files** across arms; the gate controls reading them logically and MUST NOT be represented as security authority or physical exposure.

For each arm/profile record 81 site traces as hashes and aggregate `authorized_reads`, `light_commands`, `target_error`, `mass_or_identity_failures`, and `I_proxy` sanity. Rates, light waveforms, pixel dimensions and sample protocol are fixed; exact per-metric outcome is measured after implementation. Phase C does NOT alter or combine the old 8,748 Phase A source/digest. A separate four-state kinetic model is a challenge for Seat 3 and must not be assumed to agree.

## Acceptance evidence

1. Standard RGB QR image files (not a mock or JSON-only QR); full reverse read including actual per-plane QR decoder and SHA pin; do not silently repair corrupt/missing planes.
2. 81 memories × three labeled language views × 27 address classes exactly; independent Node and Python logical reassembly; exact projector and loss-of-centre falsifier.
3. Positive mass, conserved sum, gate dark null and real injected failures; integrity and replay tests on Ubuntu and Windows with raw files and SHA sidecars as CI downloadable artifacts.
4. Independent Seat 2 provenance review, Seat 3 math review, Seat 4 replay; **draft PR only**, no automatic merge, HF upload or physical/electro-optical claims.
5. Classify **software encoded RGB light memory PASS** only after CI; **true optical physical storage, light-speed travel, channelrhodopsin calibration and photon experiments = NOT TESTED**.

Potential limitation: 2,100-byte chunk Base64 may exceed some QR correction levels, hence explicit EC-L. Full-resolution plane splitting is compulsory. The Brown-Hilbert room-44 label is retained as provenance metadata and not a storage address proof.
