# Formula PID registration crossverify - LIRIS (2026-06-19)

Scope: read-only Git verification of Acer's posted receipt. No Liris live office-feed, cosign, vote-quorum, cube write, or runtime crank was fired.

`MEASURED`: source branch `JesseBrown1980/Asolaria` `acer/formula-corpus-pid-registration-2026-06-19`, commit `e8268d2`, contains the registration receipt triple:

- `ALGORITHMS-PID-REGISTRATION-ACER-2026-06-19.hbp`
- `ALGORITHMS-PID-REGISTRATION-ACER-2026-06-19.hbi`
- `ALGORITHMS-PID-REGISTRATION-ACER-2026-06-19.hbp.sha256`

`MEASURED`: the HBP was mirrored into `acer/` byte-exact from the Git blob:

```text
sha256 = 782b39c159de8ca3c40f011e631fba57aab2562f706898fb91fe8ecb02f514af
CR = 0
LF = 277
sidecar_match = 1
```

`MEASURED`: receipt header and footer state:

```text
district = DISTRICT-F-FORMULA-CORPUS
mint_rule = sha256_name_slice_16
vantage = acer
source_scour = wnzybl0n6
chief = FORMULA-CHIEF
chief_pid = 0155964ffc8ef1f8
rows = 276
content_sha256 = 72f25c86627eec42f64c8e9dd64b31d218298e7c8396cb3cdbcc9b2273b8d0a4
count_formulas = 242
count_profs = 23
count_sos = 6
E = 0
live_roster_feed = GATED
cosign = PENDING
```

`MEASURED`: sample formula row observed:

```text
FORMULA|REALMATHPOS — node placement function|PID=84b4c6c420426dd7|...
```

Boundary: this crossverify proves the Git receipt bytes and the descriptor registration shape. It does not prove Liris-side live materialization, Acer-side live roster materialization, vote-quorum, cosign, cube write, or formula seats appearing in the running `:4949` roster. Those require a separate E-not-zero office-feed/cosign receipt.
