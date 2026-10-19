# Asolaria Seat 5 — Versioned public evidence index (2026-10-15)

Status: **GitHub source-reference release manifest; Hugging Face archive pending authenticated write/upload and readback.** This index is not a binary archive and does not assert HF publication.

## Immutable commit anchors
- Latest per-particle memory stone: [081702718](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/08170271820a5139b67dd3c116dd18b2e4083e06)
- 100-rung independent physical CPU provenance: [fcd266cfd](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/fcd266cfd3bfc7c0ff322b5e87f21f5c4b6a5e27)
- Exact 101-rung GF3 source: [6140365a7](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/6140365a7b04e02083c3d123ff04f934a72ba00b)
- Independent Node GF3 verifier: [0364b95d6](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/0364b95d6b41ea4535549cd8a3de6f12b2bf3132)
- Direct CPU loop source: [ae73f9edd](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/ae73f9edd126360e5819fb743fc66a57fe3f9ef4)
- 100-rung CSV: [901065340](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/9010653402da1c86f1491e872f12dec70afa87c4)
- Ten-rung wave stone: [969aaa392](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/969aaa3924fb7b7f4655db3e49bbe698da80603b)
- Seat4 original 81-bit proof merge: [b8a141ea7](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/b8a141ea7fcc1a193713e785382eabd66350372f)
- Seat3 logical-hour matrix verification merge: [afc1a7ffe](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/afc1a7ffe)

## Rainbow27 factorization baseline
- [PR #86](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/86), [CI 38753226025](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38753226025): reported 3/3 Ubuntu/Windows/cross-OS PASS.
- 15,309 logical aliases resolve to 567 Rainbow7 entries / 81 original QR memories; bank 184,815 bytes.
- Expanded index SHA256: `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e`.
- Expanded metadata 2,344,761 bytes vs base 70,043 bytes; avoided repeated metadata 2,274,718 bytes.
- Canonical HBP SHA256: `b4d19c59c28b38e1b54a702d6898b98041966bbb5ae6cb14940be16397150f5c`.
- Twelve negative controls and missing violet/base-row controls were reported passed.

## Publication targets and verification gates
- [Hugging Face model repository](https://huggingface.co/Jessedbrown/asolaria-wasm81-rainbow-audit): existing public repo, **this release not uploaded/read back**.
- [Hugging Face tests target](https://huggingface.co/datasets/Jessedbrown/tests): **not verified created or uploaded**.
- Do not confuse logical aliases with physically stored memories, software CI with optical-memory experiments, GitHub runners with three independently attested hosts, or hashes with source authentication.
- Matrix fast-forward correctly represents many logical steps with fewer physical operations for supported transition laws. Model time is distinct from CPU/wall time.

Coordinator audit: [Issue #55 comment 6204682475](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55#issuecomment-6204682475).
