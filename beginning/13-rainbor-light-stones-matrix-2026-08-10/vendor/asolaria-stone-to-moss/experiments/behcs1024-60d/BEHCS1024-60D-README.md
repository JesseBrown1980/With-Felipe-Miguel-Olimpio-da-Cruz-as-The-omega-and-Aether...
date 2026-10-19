# BEHCS-1024 / 60D — pinned clean public kernel

The clean source code is in [asolaria-tribit, merged revision 52b712d8e8555b6f963121c2b464168c6a4de53a](https://github.com/JesseBrown1980/asolaria-tribit/tree/52b712d8e8555b6f963121c2b464168c6a4de53a/kernel/behcs1024-60d). This stone home references the exact source by commit and SHA-256 instead of copying the operational federation tree.

The kernel generates 60 SHA-256-derived glyph indices (0–1023), followed by an 8-byte truncated Host8 hash address. `project_60d_legacy` retains the source's old SHA-256 truncation behavior; `project_60d_checked` rejects inputs exceeding **508 bytes**, because source counters repeat for **509–512-byte** inputs. A glyph is losslessly represented by seven balanced trits; the underlying SHA-256 is still binary.

[Verified Rust 1.81 CI](https://github.com/JesseBrown1980/asolaria-tribit/actions/runs/38973390806): 9 Rust tests, Clippy zero warnings, Python reference vectors and a scan excluding private data. `BEHCS1024-60D-LINK.hbi` pins the address specification and `BEHCS1024-60D-LINK.hbp` pins evidence; both have SHA-256 sidecars. Cross-home integration is a **source-verified link**, not live GGUF operation, physical 60D space, a photonic-memory measurement, or a new planet.

No private key, host roster, LAN map, customer record, access token, JSON data interchange or Node.js runtime is included.
