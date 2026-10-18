# PINNED — recorded by blob, not vendored

These objects are part of the build-day record but are not copied into `vendor/`. Each is pinned by its git blob id (and sha256 where a full file is meant), so the full build-day tree is traceable without duplicating it. Source repo is `JesseBrown1980/Asolaria`, read from the bare mirror of all 132 refs.

## 1. The rest of commit `e8c3369` (routes/ src/ lib/ middleware/ tests/ services/)

`e8c3369dca59a2316837d438041c5067d9612c7f` — 2026-03-15 15:20:53 -03:00, "Phase 2 security hardening: RBAC enforcement, DPAPI, auth middleware, log rotation".

The full tree of those six directories at `e8c3369` (139 files) is listed in `pins/e8c3369-routes-src-lib-middleware-tests-services.pin.tsv`, one row per `path<TAB>blob<TAB>bytes<TAB>flag`. The `V` flag marks the 74 blobs that are also vendored byte-identical somewhere under `vendor/` in this step (the b49a725 first-commit set that survives unchanged into `e8c3369`, plus the `58b51eb` guardian/hook/approvalEngine files and the hardened `middleware/auth.js` `f1c32b7`). The remaining 65 are new at `e8c3369` (the security-hardening additions) and are recorded by blob only.

## 2. TASKS.md — later versions (first version vendored)

The first `TASKS.md` (`02ad906b201669575f02a0779ab1ce9b2988a277`, 232401 bytes, first at `e8c3369` 2026-03-15) is vendored at `vendor/Asolaria/TASKS.md` (restored on the owner's word that his number is public). Its later versions are pinned only, by blob:

| blob | bytes | first commit | date |
|---|---:|---|---|
| `8a33900f2fd175cafdab8c98d372529b88cb0995` | 321074 | `217ec3f` | 2026-04-10 |
| `4ddc6021d67f36b68c480b26b62752c68a3d1077` | 322333 | `1228174` | 2026-04-24 |
| `ecd8d1ba40c928d57bb195b59b552ce0530b5a03` | 322070 | `b944586` | 2026-04-25 |
| `5d7272b8e0f435202ae11af68bac55a1aeaa2b17` | 322294 | `461f3ed` | 2026-04-25 |
| `1474aad4f354fcda73c3e34f353f941128679f17` | 781643 | `9952a0b` | 2026-04-29 |
| `f5b3628a7e77535dccdd4e506298ce7d0758361c` | 782862 | `27f4967` | 2026-04-29 |

## 3. ADR-0013 (series completes after the build day)

`docs/adr/ADR-0013-colony-memory-registry-and-transport-epoch.md`, blob `372c8a8c54ab0d622520545b1efe27eef66f106e`, 2028 bytes, first at `fbcb630` 2026-04-11. ADR-0000..0012 (13 files) exist by the end of the build day and are vendored; ADR-0013 is a later addition and belongs to build-order step 6 (shannon-consensus / colony-memory). Pinned here only, vendored by that step.

## 4. The legacy-import guardian route

`packages-legacy-import/routes/routes/guardian.js`, blob `02e938862a818ee3267b734008964af855864f37`, 7998 bytes, first at commit on 2026-04-30. This is the `routes/routes/guardian.js` path named in the gap map; on the build day itself the guardian route is `routes/guardian.js` (blob `9302813a0da055660e2b6589afc0e246120cd0b5`, first at `64b1a14` 2026-03-15), which IS vendored. The legacy-import copy is a later re-import and is pinned only.
