# GGUF Hosting Manifest — Asolaria Kernel-Pump
## Date: 2026-10-17 | Seat: ACER-CLAUDE-FABLE5 | Owner: OP-JESSE (JesseBrown1980)

## Recommended Host: HuggingFace
Repo: `JesseBrown1980/asolaria-kernel-pump`
URL: https://huggingface.co/JesseBrown1980/asolaria-kernel-pump

HuggingFace supports files >100MB via Git LFS automatically.
Use `huggingface-cli upload` or the web UI to upload these files.

---

## Big GGUFs (>100MB — must go to HuggingFace, NOT GitHub)

| File | Size | sha256 (read from .sha256 sidecar) |
|------|------|-------------------------------------|
| ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf | 257.1 MB | see D:\asolaria-absorb\kernel-pump\ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf.sha256 |
| ASOLARIA-FABLE-SPHERE-PUMPED.gguf    | 121.0 MB | see D:\asolaria-absorb\kernel-pump\ASOLARIA-FABLE-SPHERE-PUMPED.gguf.sha256 |
| ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf   | 121.0 MB | see D:\asolaria-absorb\kernel-pump\ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf.sha256 |
| ASOLARIA-OPUS-SPHERE-PUMPED.gguf     | 121.0 MB | see D:\asolaria-absorb\kernel-pump\ASOLARIA-OPUS-SPHERE-PUMPED.gguf.sha256 |

### Upload command (run on ACER after HF login):
```bash
huggingface-cli upload JesseBrown1980/asolaria-kernel-pump \
  D:\asolaria-absorb\kernel-pump\ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf \
  ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf

huggingface-cli upload JesseBrown1980/asolaria-kernel-pump \
  D:\asolaria-absorb\kernel-pump\ASOLARIA-FABLE-SPHERE-PUMPED.gguf \
  ASOLARIA-FABLE-SPHERE-PUMPED.gguf

huggingface-cli upload JesseBrown1980/asolaria-kernel-pump \
  D:\asolaria-absorb\kernel-pump\ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf \
  ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf

huggingface-cli upload JesseBrown1980/asolaria-kernel-pump \
  D:\asolaria-absorb\kernel-pump\ASOLARIA-OPUS-SPHERE-PUMPED.gguf \
  ASOLARIA-OPUS-SPHERE-PUMPED.gguf
```

## Small GGUFs (<10MB — included in this ZIP, also go to HF repo)

| File | Size |
|------|------|
| ASOLARIA-MYTHOS-VS-WIKIPEDIA.gguf | 5.1 MB |
| ASOLARIA-STARS-SHELLS.gguf        | 4.4 MB |
| ASOLARIA-RIME-UNRIME-THREE.gguf   | 3.0 MB |
| ASOLARIA-FOUR-AXES-RIME.gguf      | ~4 KB |
| ASOLARIA-FOUR-AXES-TIMEFIX.gguf   | ~6 KB |

## .bin Keys (EXCLUDED from this ZIP)
The .bin files (ASOLARIA-CONSTELLATION-KEY-3174.bin, ASOLARIA-KERNEL-3174.bin,
ASOLARIA-NEW-AFTER-WINDS.bin, ASOLARIA-NEW-TRIJECTION-RIME27.bin) are your
codebook/key files. They are in D:\asolaria-absorb\kernel-pump\ on ACER.
They were verified as codebooks (NOT private-key material), but the classifier
blocked publishing them to any public surface. Upload them separately after
confirming intended visibility (private HF repo recommended).

## GitHub Repo (code + docs + small GGUFs)
Repo: `JesseBrown1980/asolaria-kernel-pump` (or existing asolaria-absorb repo)
Contents of this ZIP minus the big GGUFs = everything that can go to GitHub directly.
