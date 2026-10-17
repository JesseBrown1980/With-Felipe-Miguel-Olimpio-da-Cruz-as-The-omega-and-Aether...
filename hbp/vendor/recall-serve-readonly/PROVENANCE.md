# vendored read-only: recall-serve (Rust engine), partial

- Upstream: asolaria-federation-1024 @ commit dc1da1a9cd88b77eb463053312b7c42a7dbe9b33,
  path `tools/recall-serve`.
- Brought in **read-only** (files are mode 0444); this directory is for reading, not for building
  or running the engine here.

## Vendored (byte-identical, upstream git blob ids)

| file | git blob id | sha256 |
|---|---|---|
| `Cargo.toml` | cf8e97d8f26bda377c1dc05b1ad6a2b590149ef1 | 9ed054244d96caa357bf838b9dda37f7e81ebca0a4e8146ee8ecaf69885b7b63 |
| `METRICS-2026-06-23.md` | 9a6b80c38715b7204b147172d937f0acf648cfda | d0bca7cc5e274277a9765362184c4d56ecdadb6b2691e2c92715be5b23644ae5 |

`UPSTREAM.sha256` pins both; `sha256sum -c UPSTREAM.sha256` from this directory passes (2/2).
`Cargo.toml` names `src/main.rs` as its `[[bin]]` path; that file is not vendored (below), so this
directory does not build, which matches its read-only purpose.

## Present upstream at `tools/recall-serve`, not vendored

| path | git blob id | reason |
|---|---|---|
| `src/main.rs` | 8deca5e5f60956361e38436081a8a055f241884b | contains third-party personal data (a private person's name in a chat-path entry and in default owner-pid/grant strings); cannot be redacted and stay byte-identical |
| `src/atlas.html` | aec053e3eee65c130b9e1b2d19bc7a21a2a6ffce | contains third-party personal data (the same private person's name in an access-policy sentence) |
| `recall-bench.cjs` | 054c2fefd8e95c10da00c5525ac814811da5615f | upstream Node benchmark driver; this lane is Node-free (OWNER-RULES rule 3) |
| `recall-bench-1m.cjs` | a45d1b5dd9f2845be43126d28a56b6f4523d7e3a | as above |
| `recall-bench-1m-ka.cjs` | 2f72a32341a6b1eae0c37e4c098ba76d40ecb67b | as above |

The engine source (`src/main.rs`) is therefore not in this repository. What it computes (an
inverted index over `.hbp`/`.hbi` rows with byte-offset seeks, thread-per-connection serving,
default bind `127.0.0.1`, remote access gated by HMAC-SHA256 plus an owner pid) is described by the
vendored `Cargo.toml` header and `METRICS-2026-06-23.md`; it is not ported here.

## Privacy scan

Each upstream file was scanned for names of private people, chat references, emails, phone
numbers, LAN addresses and keys. `src/main.rs` and `src/atlas.html` carry a private third party's
name and were removed from this directory. `Cargo.toml` has no hits. `METRICS-2026-06-23.md` has no
third-party personal data: it names the owner's own machine (`acer`, its Windows host name) and the
owner's seats (`acer`, `liris`), and its "PII" mentions are the engine's own L0 probe results.
