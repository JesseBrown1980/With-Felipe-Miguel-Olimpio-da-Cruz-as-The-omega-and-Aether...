# model/hrm-fork

Two owner components, brought in unchanged. Provenance, sha256 pins and every measurement are in
[PROVENANCE.md](PROVENANCE.md).

| Part | Upstream | Lane | Here |
|---|---|---|---|
| HRM fork (model code + configs) | `JesseBrown1980/HRM` @ `74ecc8b5` (Sapient HRM @ `ac15626f` + 6 star-port commits) | cold (Python / torch, not run here) | `vendor/HRM/` |
| `hp_mix` lossless codec + its workflows and receipt | `JesseBrown1980/asolaria-cube-cloud` @ `f91bb2c3` `hutter/variants/mix/hp_mix.rs` | Rust 1.81, integer only | `vendor/asolaria-cube-cloud/`, built as the `hp_mix` binary |

## HRM

No trained HRM checkpoint of the owner was found in the public GitHub (`JesseBrown1980`) and
Hugging Face (`Jessedbrown`, `JesseBrown1980`) listings searched; the search and its scope are
listed in PROVENANCE.md. The owner's stub says the trained model "lives at D:/Asolaria-HRM/"
(bigpickle-rebuild `src/hrm-slow-fast.mjs:14-15`); that checkout is on the ACER machine (handoff
item C). With no weights there is nothing to port, so this directory holds the model code and
configs only, pinned.

## hp_mix

```
cargo +1.81.0 build --locked --release
target/release/hp_mix verify <file>                 # in-memory roundtrip, prints PILOT|... and ROUNDTRIP_OK
target/release/hp_mix compress <in> <archive>
target/release/hp_mix decompress <archive> <out>
```

Run it from this directory: `decoder_src_bytes` is the size of the file named by `file!()`
(`hp_mix.rs:325-328`), the vendored source here.

Measured on enwik8 and enwik9 (sha256-pinned), compress then decompress as separate runs
(`hutter-tournament.yml:75-79`): the archives are 26,421,998 and 236,419,493 bytes, the sizes in
the owner's receipt rows `E8|variant=mix` and `E9|system=mix`, and both restore byte-exact.

## Checks

```
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I tools/hp_mix_referee.py --check
```

`tools/hp_mix_referee.py` is a stdlib Python mirror of `hp_mix.rs`, line by line; it writes
`tests/fixtures/hp-mix.hbp`, which the Rust tests compare with the binary's output.
