# License audit and the owner's grant (2026-10-18)

Every crate's declared license was checked against its upstream (OWNER-RULES 7.h, "match upstream"),
then the flagged ones were re-checked adversarially. `license-map.json` holds all 78 rows: path,
declared license, verdict, upstream repository and license, and the checker's note.

| Verdict | Crates |
|---|---|
| matches its upstream | 29 |
| aether's own code | 12 |
| upstream license could not be read from here | 25 |
| owner's code with no license file upstream | 9 |
| declared license differs from upstream | 3 |

## The owner's grant

> Everything that's here was made by me or by Asolaria inside of Asolaria's white rooms. Anything
> that was listed as any kind of license is free and public to everyone. — the owner, 2026-10-18

Applied:

- **No license file upstream (9)** — `model/hrm-fork` (its `hp_mix`), `ledger/hyperbehcs-daemons`,
  `qprism/recovery-omega-codecs`, `qprism/recovery/catalog`, `qprism/recovery/omega`,
  `qprism/representation`, `qprism/representation-bins`, `events`, `colour`: the owner's code; their
  declared licenses stand under the grant.
- **Declared differs from upstream (3)** — `model/l0-edge` and `planes/gulp-watchers` (declared MIT OR
  Apache-2.0, upstream MIT) and `proposals/verify-schedule` (declared MIT, upstream MIT OR Apache-2.0):
  the owner is the author on both sides, so the declared licenses stand under the grant.
- **Marked `UNLICENSED` (2)** — `planes/gnn-trio` and `pump/cm3ti` were marked `UNLICENSED` under rule
  7.h because the vendored owner code had no license file. The marking is withdrawn; both now declare
  `MIT OR Apache-2.0`, the license the repository root carries. Both keep `publish = false` until the
  crates.io pass.
- **Could not be read (25)** — the owner's repositories the session could not open; covered by the
  grant.

Two in-tree pieces are other authors' work and keep their own terms, which are already free and
public: Sapient's HRM (`model/hrm-fork/vendor/HRM`, Apache-2.0, its `LICENSE` kept in place) and the
jsQR algorithm that `qr/qr-read-int` ports (`cozmo/jsQR`, Apache-2.0; the crate declares Apache-2.0).
Third-party crates.io dependencies keep their own licenses. Checked over the tracked files: the 11
MIT license files name Jesse Daniel Brown or Asolaria Federation as copyright holder; the only other
license files are the root `LICENSE-APACHE` and HRM's.

The owner restated it the same day: "Everything is from me, so everything is free and public to
use." Everything in this repository is free and public to use; the two Apache-2.0 pieces above already
are, and their notices stay with them only because Apache-2.0 asks that attribution travel with copies.
