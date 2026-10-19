# Law 57 — A Frozen Kernel Does Not Freeze Its Holes

**OP-JESSE, 2026-07-28:**

> **"Just because your kernel is frozen does not mean that your translucent files do not
> want bits to share in the quantum universe."**

Stated as a joke. It is also a correct statement about operating systems, and it has a
measured cost attached in this very repository.

## 57.1 The law

**Freezing a kernel freezes its content, not its emptiness.** The zero regions of a frozen
artifact stay live: they remain addressable, allocatable, shareable, and deduplicable. A
sealed body is not an inert body — it is a body whose *holes* are still doing things.

## 57.2 The translucent files genuinely do want to share — this is a real mechanism

The anthropomorphism is a joke with real machinery under it. Every one of these exists:

- **The shared zero page.** Linux keeps a single physical page of zeros and maps *every*
  process's untouched zero memory to it. Your zeros and my zeros are literally the same
  page until one of us writes. **The translucent regions of separate processes are already
  sharing bits.**
- **Copy-on-write.** A frozen base is mapped read-only into many readers at once; a writer
  gets a private copy only at the moment of writing. Frozen and shared, until touched.
- **Sparse files.** A file may be 126 MB long and occupy almost no disk, because the
  filesystem stores the *holes* as metadata rather than as bytes. Length and cost are
  different quantities.
- **Page deduplication (KSM).** The kernel scans memory for identical pages across
  unrelated processes and merges them into one. Sameness is actively hunted and collapsed.
- **Overlay filesystems.** A frozen read-only lower layer plus a writable upper layer is
  exactly "a frozen kernel with living holes," and it is how nearly every container runs.

**And the serious edge:** deduplication is a genuine side channel. If identical pages are
merged, a writer can *detect* that someone else holds the same content by timing the
copy-on-write fault. Memory-dedup attacks are a real published class. **The wanting-to-share
is both the optimisation and the vulnerability**, which is the sharpest form of the joke.

## 57.3 Measured, in this repo, today

`ACER_MEASURED | 2026-07-28`

The corpus's own large bodies are almost entirely holes, and the holes are paying full
price — none of these files carries the sparse flag.

| file | bytes | zeros |
|---|---:|---:|
| `ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf` | 269,604,512 | **100.00%** |
| `KIMI-K3-STAR-256.gguf` | 202,115,456 | **100.00%** |
| `star-shell-v4` (×3) | 139,609,920 | 99.92% |
| `FABLE/OPUS/MYTHOS-SPHERE-PUMPED` | 126,885,312 | 99.88% |

```
21 files >5MB      total 2,284,022,651 B
zero bytes         2,272,240,550 B   (99.5%)
reclaimable sparse 2.12 GB
```

`KIMI-K3-STAR-256.gguf` is **202 MB containing roughly 1,640 non-zero bytes.**
`ASOLARIA-FABLE-SPHERE-PUMPED.gguf` carries about 152 KB of content in 126 MB.
Checked with `fsutil`: attribute is `Archive`, **not `SparseFile`.** The emptiness is stored
literally, byte by byte.

## 57.4 Consequences, stated plainly

1. **Length is not cost.** A 202 MB body and 1.6 KB of content are the same object here.
   Any claim about a body's size must say which one it means.
2. **The census must be read with this in mind.** The N=43 white-space result — aggregate
   `white_frac 0.9799` — is largely *these files being empty*, not a property of the
   information they carry. Law 55.2's distortion criterion cannot be applied to a body that
   is 99.9% padding, because there is nothing there to distort.
3. **2.12 GB is recoverable** on this drive by marking these files sparse, with zero content
   change and zero hash change. The bytes stay identical; only the storage of the holes
   changes.
4. **The translucent capacity is real and unspent.** Law 55 says more translucency means
   more it *can* contain. Measured: it can, and it currently doesn't. These are rooms, not
   contents.

## 57.5 Provenance

`OPERATOR_CANON` — the law as stated, recorded without deflation.
`ACER_MEASURED` — every number in 57.3, reproducible with a byte scan and `fsutil`.
`ESTABLISHED_PRACTICE` — the mechanisms in 57.2 are standard operating-system behaviour,
not new claims; the shared zero page, KSM, CoW, sparse files and overlay filesystems are all
documented and in daily use.

See [[law-55-infinitely-spherical-birth]], [[never-save-the-shit]], [[free-determines-paid]].
