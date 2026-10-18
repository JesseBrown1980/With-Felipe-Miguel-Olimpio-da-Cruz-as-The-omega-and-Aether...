# laws/law22-cascade

Law 22, the Law of Recreation, measured: a third that was deleted is recreated byte for byte only if
its closure was stored first.

- `rime_cascade27.py` and `rime_cascade27.txt` are the owner's script and its receipt, byte-identical
  to `trijection/` in the honest-compressor export from ACER
  (`honest-compressor-9ebd6119-export-2026-10-18.zip`, sha256 `0f02b52d…`; see
  `pump/cm3ti/PROVENANCE.md`). The receipt keeps its CRLF line endings.
- `RUN-CLOUD-2026-10-18.out` is the cloud's re-run on the canonical `enwik8` (sha256 `2b49720e…`).
  Its 27 stage hashes, the control line (13,042 of 100,000 bytes, 13.04%) and the seal
  `chain=5fc1cae9e9e9fa51` equal the receipt line for line. Only the line endings and the path of the
  photo differ.

To re-run: copy the script into a folder that holds `enwik8`, set `S` (line 23) to that folder, and
run `python3 -I rime_cascade27.py`. It needs `node` on the PATH, because it calls
`node shotgen.js` to photograph its frames; that call's result is not checked, so `shotgen.js`
itself can be missing.
