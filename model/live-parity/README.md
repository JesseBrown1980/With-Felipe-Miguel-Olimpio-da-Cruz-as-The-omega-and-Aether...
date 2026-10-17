# live-parity

The Rust ports of L0 (`model/l0-edge`) and L4 (`model/l4-gslgnn`) checked against the owner's running servers.

On 2026-10-17 the ACER seat sent three requests to the live `:4792` (`inference_server.py`, L0) and `:4793`
(`gslgnn_inference_server.py`, L4 v2) servers, each built exactly as `asolaria-score.mjs:112-115` builds it
(pid `8467a937cba309f7`; contents `hello`, `asolaria`, `the was the will and the is`), and recorded the answers
(`LIVE-CAPTURES.txt`; process and source paths in `LIVE-DAEMONS-RECEIPT.hbp`).

| content | L0 live (Q24) | L0 Rust | L0 at 4 dp | L4 live (Q24) | L4 Rust |
|---|---|---|---|---|---|
| hello | 15,796,035 | 15,796,035 | 0.9415 = 0.9415 | 8,877,770 | 8,877,770 |
| asolaria | 15,625,724 | 15,625,725 | 0.9314 = 0.9314 | 8,877,771 | 8,877,771 |
| the was the will and the is | 15,577,767 | 15,577,768 | 0.9285 = 0.9285 | 8,877,766 | 8,877,766 |

L4 equals the live server exactly. L0 is within one Q24 unit (2^-24) and equal at the four decimals asolaria-score keeps.
`cargo +1.81.0 test --locked` asserts both.

The same session recorded that the live `:4949` dashboard answers `/api/gnn/score` with 404 (the route is not registered
in the running build; its route list includes `/api/gnn/topN` and `/api/gnn/active`). The copy of
`super-dashboard-server.mjs` in the private mirror at a876e21 has the same two `/api/gnn/` routes and no `/api/gnn/score`.
So in the running system asolaria-score's fabric query returns no G1, G2, G3 or G4 values.
