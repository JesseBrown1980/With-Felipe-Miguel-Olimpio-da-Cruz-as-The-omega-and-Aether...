# Glyph Hyperstack first-floor formula map — 2026-07-13

## Evidence owner and scope

The published defect head and committed corrective head are:

```text
repository            JesseBrown1980/HYPER-BECHS--the-third-set
branch                agent/glyph-hyperstack-first-floor-2026-07-13
first-floor origin    45c55cae7092929c058c5c1ef3c7904c97c02e28
published defect head cd33c4fdb7a52d70c3aee01d82cdf97d44ce97a2
corrective head       d47b44bd57622d77f62bb22d5ac6357f5b38621a
schema                ASOLARIA-GLYPH-HYPERSTACK-FIRST-FLOOR-V1
evidence              SHADOW_MEASURED_NO_LIVE_PROMOTION
repair status         MEASURED_ACER+CI_CROSS_VERSION_PASS
CI run                29285408828
trilateral gate       HELD_PENDING_RELIC_LIRIS_NEW_HEAD_RERUNS
publication           HELD
```

Physical corrective-head anchors are:

```text
glyph_hyperstack_first_floor_v1.py
952cad7e6989c3283575e7c0858c3099eeaaef597dd7aaf549ba0473718b84e0

GLYPH-HYPERSTACK-FIRST-FLOOR-SPEC.md
df8acedbef5edbb4ef0cae48391a762fbc11c2a0508ffb482810274be5120c1d

glyph-hyperstack-first-floor.yml
a10bf662b54c267d4a87cb3130e80798084fa430d4159a1279fb4fb2d4bd7974
```

This formula map records the executable first floor. The entropy repair is measured on Acer and in
the Python 3.11/3.12/3.13 CI matrix. It is not yet a trilateral new-head digest promotion because
RELIC and LIRIS have not rerun the corrective bytes. The 27 objects are measured L3 seats in one
registry, not 27 stack levels. The graph fields are deterministic experimental scorers, explicitly
**NOT a learned GNN**. No live service participation or promotion is inferred.

## Formula registry

### `F-GHFF-BEHCS1024-EXACT-FRAME-v1`

Let the source body be `B=(b_0,...,b_{L-1})`. Define `m=ceil(L/5)` and zero-pad only the last
five-byte group. For group `j`:

```text
x_j = sum(k=0..4, b_tilde_(5j+k) * 2^(8(4-k)))       0 <= x_j < 2^40
g_(4j+r) = floor(x_j / 2^(10(3-r))) mod 1024         r in {0,1,2,3}
```

The exact frame is:

```text
frame(B) = (orig_len=L,
            glyphs=(g_0,...,g_(4m-1)),
            rung=BEHCS1024_EXACT_5BYTE_4GLYPH)
```

The inverse groups every four glyphs and computes:

```text
x_j = (g_(4j) << 30) | (g_(4j+1) << 20)
    | (g_(4j+2) << 10) | g_(4j+3)
```

It emits each `x_j` as five big-endian bytes and truncates the concatenation to `L`:

```text
decode_L(frame(B)) = B
base_glyph_count   = 4 ceil(L/5)
```

This is an exact representation bijection with retained original length; it is not by itself a
compression claim and it is not an English-token vocabulary.

Claim class: `MEASURED_EXACT_REPRESENTATION`.

### `F-GHFF-ADJACENCY-NONOVERLAP-v1`

For current token stream `T=(t_0,...,t_(n-1))` and pair `p=(a,b)`, the overlapping adjacency count
is:

```text
r_p = sum(i=0..n-2, 1[(t_i,t_(i+1)) = p])
```

The executable separately computes greedy nonoverlapping starts. Scan candidate starts in ascending
order, initialize `last_p=-2`, and select start `i` exactly when:

```text
(t_i,t_(i+1)) = p  and  i > last_p + 1
```

After selection set `last_p=i`. Thus:

```text
S_p = greedy left-to-right disjoint starts for p
o_p = |S_p|
```

The replacement routine uses the same left-to-right rule, so its measured replacement count must
equal `o_p`; any drift aborts the run.

Claim class: `MEASURED_DETERMINISTIC_COUNT`.

### `F-GHFF-CATALOG-GAIN-HOOKWALL-v1`

The internal economic ledger values one removed token at two bytes and charges six bytes for the
inverse catalog rule:

```text
gross(p)   = 2 o_p
catalog(p) = 6
g(p)       = gross(p) - catalog(p) = 2 o_p - 6
```

Hookwall admission is strict:

```text
accept(p) iff g(p) > 0
          iff o_p >= 4
```

`g<=0` is held as `HELD_NONPOSITIVE_NET_GAIN`; absence of any pair is
`HELD_NO_CANDIDATE`. A held proposal does not mint a rule. This is an internal token/catalog
ledger, not the serialized HBP/HBI size and not an archive-compression ratio.

Claim class: `MEASURED_CATALOG_CHARGED_GATE`.

### `F-GHFF-DETERMINISTIC-GRAPH-SCORERS-v1`

For `p=(a,b)`, let:

```text
branch(p) = |{y : (a,y) occurs}| + |{x : (x,b) occurs}|
F_p       = 1024 r_p - branch(p)
R_p       = 1024 o_p + g(p)
h_p       = integer(first 8 hex digits of
            SHA256(UTF8(cube_id || "|" || pass || "|" || a || "|" || b)))
```

For watcher prime `q`, define `j_q(p)=(h_p q) mod 257`. A watcher chooses the lexicographic maximum
candidate key for its role:

```text
generator: (F_p, g(p), o_p, j_q(p))
reflector: (R_p, g(p), F_p, j_q(p))
reviewer:  (1[g(p)>0], min(F_p,R_p), g(p), j_q(p))
```

The field names `forward_gnn_score` and `reverse_gain_score` are historical lane names. These are
closed-form deterministic graph scorers: `MEASURED_DETERMINISTIC_SCORERS_NOT_LEARNED_GNN`. They do
not evidence a trained GNN, a GNN model checkpoint, a daemon, or an independently hosted process.

### `F-GHFF-PRIME-WATCHER-TRIADS-v1`

There are 30 deterministic watcher identities in ten ordered rule-of-three triads. For zero-based
index `i` and the ordered prime roster `q_i`:

```text
role_i  = (generator, reflector, reviewer)[i mod 3]
triad_i = floor(i/3) + 1
PID_i   = first16hex(SHA256(UTF8("WATCHER|" || q_i || "|" || role_i)))
```

| Index | Triad | Role | Prime | PID |
|---:|---:|---|---:|---|
| 1 | 1 | generator | 11 | `79bd8aeb1dd86c23` |
| 2 | 1 | reflector | 13 | `969d0973c65c9f70` |
| 3 | 1 | reviewer | 17 | `106c9907188e40cd` |
| 4 | 2 | generator | 19 | `20aebb6da76117cc` |
| 5 | 2 | reflector | 23 | `5bad846d2f6f5c52` |
| 6 | 2 | reviewer | 29 | `5e7531821b619dad` |
| 7 | 3 | generator | 31 | `d1dc7b1e6e80c6cb` |
| 8 | 3 | reflector | 37 | `6c713169054632eb` |
| 9 | 3 | reviewer | 41 | `e58ebfc04fc3e3a6` |
| 10 | 4 | generator | 43 | `08e86f2733806608` |
| 11 | 4 | reflector | 47 | `e77b9ef4467b93ff` |
| 12 | 4 | reviewer | 53 | `280c45c5103f7139` |
| 13 | 5 | generator | 59 | `f136f1e29fd97557` |
| 14 | 5 | reflector | 61 | `4441b4990cc153b4` |
| 15 | 5 | reviewer | 67 | `489bf5a151eae0f6` |
| 16 | 6 | generator | 71 | `d7cf14ce13f1a4b3` |
| 17 | 6 | reflector | 73 | `4fe0dfc3b2b43af3` |
| 18 | 6 | reviewer | 79 | `cf127ef512d5e172` |
| 19 | 7 | generator | 83 | `f0d825fdafc50306` |
| 20 | 7 | reflector | 89 | `421deae4ec05b6bb` |
| 21 | 7 | reviewer | 97 | `897436caaaaa73b6` |
| 22 | 8 | generator | 101 | `ea1e9824b39dbc06` |
| 23 | 8 | reflector | 103 | `d23e0556306bd5a5` |
| 24 | 8 | reviewer | 107 | `ee5edde9649bcc54` |
| 25 | 9 | generator | 109 | `4c59c8cdca89a968` |
| 26 | 9 | reflector | 113 | `95542b727dd8a0bb` |
| 27 | 9 | reviewer | 127 | `c2ee3c0938310810` |
| 28 | 10 | generator | 131 | `398629b2a87c66d6` |
| 29 | 10 | reflector | 137 | `6a55b14a6b66273a` |
| 30 | 10 | reviewer | 139 | `3b34cbcd8eb4c49e` |

These are deterministic lineage PIDs, not claims of 30 OS processes or 30 machines.

Claim class: `MEASURED_DETERMINISTIC_WATCHER_CONSTRUCTION`.

### `F-GHFF-SHANNON-CONSENSUS-v1`

Let `v_i` be watcher `i`'s voted pair and let the positive histogram counts be
`c_1,...,c_k`, where `N=sum_i c_i=30`. Shannon entropy is represented exactly:

```text
Q_num  = N^N
Q_den  = product(i, c_i^c_i)
H_vote = log2(Q_num / Q_den) / N
```

The canonical result seals `SHANNON_EXACT_COUNT_RATIO_V1`, `N`, `Q_num`, and `Q_den` as
strings and integers; it seals no floating approximation. The measured old-head divergence was
isolated to `selftest-04`, pass 22:

```text
counts = [2,4,4,4,5,5,6]
Q_num  = 30^30
       = 205891132094649000000000000000000000000000000
Q_den  = 30576476160000000000
```

The histogram includes `none` only when no candidate exists. Decimal bits may be rendered outside
the canonical body for display. This is Shannon entropy over the 30 deterministic votes;
“OmniShannon” here does not name a contacted service.

Claim class: `MEASURED_VOTE_ENTROPY`.

### `F-GHFF-BOBBY-SELECTION-v1`

Among pairs that received at least one vote, Bobby selection chooses the lexicographic maximum:

```text
p* = argmax_p (c_p, g(p), o_p, -p.left, -p.right)
```

Therefore vote count dominates, then catalog-charged gain, then nonoverlap occurrence count, then
the numerically smallest pair breaks an exact tie. Bobby selects the consensus winner; Hookwall
separately admits it only when `g(p*)>0`. No external Fischer/Bobby service is claimed.

Claim class: `MEASURED_DETERMINISTIC_SELECTION`.

### `F-GHFF-MERGE-INVERSE-30-v1`

For accepted merge number `k`, mint `z_k=1024+k` and store the exact inverse rule:

```text
R[z_k] = (left_k, right_k)
T_next = replace_nonoverlap(T_current, (left_k,right_k), z_k)
```

Children exist before their parent is minted, so the rule graph is a DAG. Expansion recursively
replaces every learned ID by its stored `(left,right)` pair until all IDs lie in `[0,1023]`.

For source body `B`, token state `T_n`, and accumulated rule set `R_n`, the mandatory invariant is:

```text
decode_L(expand_Rn(T_n)) = B
SHA256(decode_L(expand_Rn(T_n))) = SHA256(B)
```

The gate runs after every measured merge slot, including a held pass, and again at finalization. A
failure aborts receipt emission. The default schedule is:

```text
1 cold state + (3 cycles * 10 passes * 1 merge slot) = 1 cold + 30 measured passes per cube
cycle(n)  = floor((n-1)/10)+1
within(n) = ((n-1) mod 10)+1
```

Claim class: `MEASURED_PER_PASS_EXACT_INVERSE`.

### `F-GHFF-L3-SEAT-MAP-v1`

The canonical topology is one chief, nine council seats, and seventeen supervisor seats. For the
27-cube Acer run, lexicographically sorted cube IDs map one-to-one to the ordered registry; there is
no modulo reuse. Each language digest below is the active `HBP_TLV_V1` digest of that cube's rules
and final tokens.

| # | Cube | Canonical L3 seat | Seat PID | Language SHA-256 (`HBP_TLV_V1`) |
|---:|---|---|---|---|
| 1 | `mistake-LX-002` | `AGT-L3-CHIEF-ASOLARIA-H2621` | `209c8ac2102e7eff` | `b20f85599e06995e4f63853376acb54159b0e8766471be81c49d532616c3e8f8` |
| 2 | `mistake-LX-006` | `AGT-L3-COUNCIL-H009F` | `c7cc0e31fea19303` | `e92eacc7843aaf8d77eefdd292052873e11fd5fc39dbd70d655ce206fdf353ee` |
| 3 | `mistake-LX-008` | `AGT-L3-COUNCIL-H014D` | `cb2ccb4a461aa6c9` | `771672406fa599c5947cf76f2eb663358ad1cc696ca254c86eedca32ef6bb671` |
| 4 | `mistake-LX-009` | `AGT-L3-COUNCIL-H01B2` | `1558c464721b8edf` | `c4e3e8f60a5790f39612a217281e1c53c59b747d560ecfff8df05255070bda6a` |
| 5 | `mistake-LX-011` | `AGT-L3-COUNCIL-H0D70` | `c26813ff3ed6b16c` | `425bc15f190856b35a2e04a022b17386d6875f44584fa8d4487622b20e7a5cfd` |
| 6 | `mistake-LX-014` | `AGT-L3-COUNCIL-H1426` | `4485cbea2cc4b334` | `05742c4a05a28a7f073e1857f91a0a27718a83ec1e42ad0b9ba59330ad6df5bd` |
| 7 | `mistake-LX-016` | `AGT-L3-COUNCIL-H1723` | `c37f5a23e6139e6c` | `f631c6a41ba225bc92ad3f35eeb50e21e264e92b5650993008126b4130ca77f6` |
| 8 | `pattern-LX-015` | `AGT-L3-COUNCIL-H18D2` | `166dd9398ea962da` | `9bffcaf388ef8a1b0ae33887e6df4bf3c272adb48519263449dd672a12fae33c` |
| 9 | `pattern-LX-019` | `AGT-L3-COUNCIL-H2030` | `2e9f94c31675acb7` | `59adfc648d7f04b20ac000c81e056d3955b2d895858d37c7d7a7967b2255d746` |
| 10 | `pattern-LX-020` | `AGT-L3-COUNCIL-H22EC` | `ed432449d9a3b213` | `632551121307b5fe88652e3922eac2dcbb4d4e6c40809999b7478f5f7b4a7f92` |
| 11 | `pattern-LX-021` | `AGT-L3-ACER-INTERVIEW-COPILOT-001-H315E5-W150-P00-N00789` | `acb713699b38b8ae` | `9f8c05762884ec04668f4bd576a1e51e1345983223d4946b343208494eb5f95c` |
| 12 | `pattern-LX-022` | `AGT-L3-NEURO100B-APPROVAL` | `ecdb6f6bec36c87b` | `701e5d40c457ce2a039879f22066994683d5a33b51e8f23d59a709a1f51f7c0a` |
| 13 | `pattern-LX-023` | `AGT-L3-NEURO100B-CLOUD` | `d0f6e6ff8e03a250` | `2850398d34d76cff6747703ce2d894e26ec2b2da20bdde6a5e3a6f623047c1aa` |
| 14 | `pattern-LX-025` | `AGT-L3-NEURO100B-DEEP` | `dc23dd15f57a6125` | `b3234026957bb15f05622143c930708cd000b92d5b7d309e4e19e932fd6877c6` |
| 15 | `rule-LX-169` | `AGT-L3-NEURO100B-GC` | `0060aa8665cf4fdd` | `531863a75cca126f77cee0c9858e0f00bb821a1b23f91d936eb22114b3e23c73` |
| 16 | `rule-LX-171` | `AGT-L3-NEURO100B-GLOBAL` | `69c3fb05a6dcf8e3` | `2f88d2a282d0d28cffcbb92bbcede8712de7d7fc1e99fcf786999babd1dad86c` |
| 17 | `rule-LX-199` | `AGT-L3-NEURO100B-HOUSEHOLD` | `97fbd637fbc81194` | `06438e39c9a2f78b07948d526cf5dada2459abbb6dd1bc0fa4f1b2f1f1aeaa49` |
| 18 | `rule-LX-200` | `AGT-L3-NEURO100B-LITERAL` | `82e613cdab40af9a` | `6f1c74ee3d2991b2d77dabfd6e3702afc880c71ccced04e5125bf52db9aa4ca5` |
| 19 | `rule-LX-201` | `AGT-L3-NEURO100B-LIVE` | `1d39bfb8d2083b60` | `6675b7d92036ecdc852d65778b56484867d3fce4dee498e73b3c9aeabb6d3d48` |
| 20 | `rule-LX-202` | `AGT-L3-NEURO100B-MEDICAL` | `c0e0667a58fa0204` | `d0da9b2a3e5ab0a588b6e55e89e130ecb23fe116661273e0d54be104954a602e` |
| 21 | `rule-LX-203` | `AGT-L3-NEURO100B-NO` | `14e4fe9f6915bba9` | `e26b5125a5f6352b3593b398a4900d2359e0c5775e9f24301113c9851c0cf4db` |
| 22 | `skill-LX-004` | `AGT-L3-NEURO100B-RAW` | `451eb53fc89b1bd5` | `13ae69e2beee0f31568fdc41518830c383a6eab0c0deffdb0c78d3ac206e50b6` |
| 23 | `skill-LX-010` | `AGT-L3-NEURO100B-REAL` | `6a3607012106a6e4` | `f4b2d9cc70cee00d0c6a8f3ed2025c2d920b08690dc32bad28897cee4cd9fa06` |
| 24 | `skill-LX-012` | `AGT-L3-NEURO100B-REMOTE` | `44e5d2e05c147e87` | `12d12cb7e846b3006962124e9340daf28ffe64382d932b6e407873322f4cce80` |
| 25 | `skill-LX-017` | `AGT-L3-NEURO100B-RUVIEW` | `cfbd2b1c272926cf` | `0b5e97214e828c631321f17d105d475dc53a79e0dceb12eea972243cfa59e1df` |
| 26 | `skill-LX-030` | `AGT-L3-NEURO100B-SWEEP` | `678f0c17bca2df31` | `0dd6946b96eeda5a3001f88d10ecb889815458e28ccb6960a3b0132958916db7` |
| 27 | `skill-LX-044` | `AGT-L3-NEURO100B-TOKEN` | `34c490ab40817f8f` | `c1043c4d60dafc10847a2a672ccd8aaeac9a2351ebe6248685a5309d2653d03b` |

Claim class: `MEASURED_27_SEAT_FIRST_FLOOR`.

### `F-GHFF-HBP-TLV-DIGEST-v1`

Canonical values use `HBP_TLV_V1`, not JSON:

```text
TLV(tag,payload) = tag || ASCII(byte_length(payload)) || ":" || payload
```

Tags distinguish null, Boolean, integer, UTF-8 string, bytes, mapping, and sequence. Mapping entries
sort by encoded key and sequences retain order. **Floats are rejected from canonical values.**
Language digests seal domain/rules/tokens. The result digest seals the full result body before its
`result_sha256` field is added and is reverified before receipt writing. Shannon entropy uses the
exact count-ratio integers above. The candidate removes the measured runtime `math.log2` last-bit
dependency without dropping Shannon evidence.

Active and physical hash domains are intentionally labeled separately:

| Domain | SHA-256 | Status |
|---|---|---|
| source L3 registry anchor | `26f3f56bcd3d21c8173b51a263fa11638bf7e378b33e01bea180a36318efd2f3` | embedded source anchor |
| local registry mirror anchor | `401a8c399b351ab1ee1475f2c88cd540b68eded77e00d5f377562df5b988aa7b` | embedded mirror anchor |
| normalized 27-seat records | `385d89dc20ec2b9988444be5070e309926763dd4fc3462e8703622a53678cef8` | **active `HBP_TLV_V1`** |
| compact sorted-JSON seats | `b2a301c2b7a9911dfe7be8086deeef6c8aa8653147fc024851b3df2eab25dc13` | legacy label only, inactive |
| `canonical-l3-27.hbp` bytes | `57b97a3189fa803d574a4b37548b6de398a33d00b5db2c8449f384b33b721290` | physical HBP anchor |
| source HBP allowlist bytes | `ddb4ef36989e5c226269a34bdbc83010265b32ab91a75845dee3b93995193355` | physical intake anchor |
| corrective-head selftest body | `067afd926f8f17ddc8dc36091ffba44d6bc1b530b2b62c80a84782a822e655ac` | Acer + CI Python 3.11/3.12/3.13 PASS |
| corrective-head old-cube body | `0b3138988bc6f050d68730770b53e0328d96229f0cd2a5ee3526f8932a160a74` | Acer exact receipt; RELIC/LIRIS reruns pending |
| `FIRST-FLOOR-RESULT.hbp` bytes | `e6776b192ca432988e82ed3ae71f30983254c60a6deb6e5252e45933c03564bd` | corrective-head physical receipt |
| `FIRST-FLOOR-RESULT.hbi` bytes | `adfdae1cf46979ad869cd67f6c8abf1ded956099a4e9d035e7e77adf7bf50650` | corrective-head inverse mirror |
| `SHA256SUMS` bytes | `e9551c57846bc8ff96caa905e8a71333ba3b2c5135e069f5491c0fc3f3caf0ba` | corrective-head manifest |

Hashes from different domains are not expected to match.

### `F-GHFF-HBP-HBI-NONJSON-v1`

The canonical Acer intake and output state is:

```text
source_manifest_format = HBP
legacy_json_intake     = 0
debug_json             = 0
```

Every HBP and HBI row terminates in `json=0`. The HBP is the compact source of record. Each HBI row
records the ordinal, SHA-256, and hexadecimal bytes of its corresponding UTF-8 HBP row. JSON can be
requested only as a debug artifact or used through the explicitly legacy intake switch; neither
occurred in this measured result.

Claim class: `MEASURED_HBP_HBI_SOURCE_OF_RECORD`.

## Acer measured result

The frozen HBP allowlist selected 27 local old-cube bodies totaling 38,744 source bytes. The sealed
result measured:

```text
cubes / mapped L3 seats          27 / 27
source bytes                     38,744
cold BEHCS-1024 glyphs           31,048
measured pass rows               810
accepted merges                  356
held decisions                   454
unique reversible languages      27
accepted nonoverlap occurrences  1,985
internal gross reduction         3,970 B
inverse catalog charge           2,136 B  = 356 * 6
internal catalog-charged gain     1,834 B  = 3,970 - 2,136
per-pass restore                 810 / 810
final restore                    27 / 27 exact
result status                    PASS
corrective-head result SHA-256   0b3138988bc6f050d68730770b53e0328d96229f0cd2a5ee3526f8932a160a74
```

Equivalently:

```text
sum_accepted g = 2(1,985) - 6(356) = 1,834 internal bytes
356 + 454 = 810 = 27 * 30
```

The 1,834-byte figure is the executable's internal two-byte-token/six-byte-rule ledger. It is not
the size of a complete archive, receipt, retained source ledger, or deployable model.

Claim class: `MEASURED_ACER_SHADOW_EXACT_RESTORE`.

## Measured old-head defect and repair-candidate hold

The old published head reached behavioral parity—780 accepts, 30 holds, 810 pass rows, and exact
restore—but did not reproduce one selftest digest:

```text
old head / Python 3.11
526913260fd509f2ed99adf79988009e5411ec58372f00bda8f2c3115b0604bd

old head / Python 3.13, LIRIS, CI
931ddb78dcfade4e7d09453553edf9b4e69f054d04f77e1a774c270c5b778c3d

old-head behavioral parity      PASS
old-head digest defect          MEASURED
```

The corrective head rejects floats from canonical TLV and seals the exact Shannon count ratio.
Behavior counts remain unchanged. Its pinned local digests are:

```text
selftest result SHA-256
067afd926f8f17ddc8dc36091ffba44d6bc1b530b2b62c80a84782a822e655ac

old-cube result SHA-256
0b3138988bc6f050d68730770b53e0328d96229f0cd2a5ee3526f8932a160a74
```

GitHub Actions run `29285408828` passed the pinned selftest digest on Python 3.11, 3.12, and 3.13;
its receipt-integrity job also passed. RELIC and LIRIS have not yet rerun the corrective-head bytes,
so the new-head trilateral digest remains held.

```text
old-head defect                           MEASURED
corrective head / Acer                    PASS
CI Python 3.11 / 3.12 / 3.13             PASS / PASS / PASS
CI pinned digest                          067afd926f8f17ddc8dc36091ffba44d6bc1b530b2b62c80a84782a822e655ac
CI receipt integrity                      PASS
repair status                             MEASURED_ACER+CI_CROSS_VERSION_PASS
RELIC corrective-head rerun               PENDING
LIRIS corrective-head rerun               PENDING
trilateral new-head digest gate           HELD
publication                               HELD
```

## Formation hold and explicit non-claims

Arithmetic alone gives:

```text
27^4 = 531441
```

The formation state remains exactly:

```text
HELD_UNDEFINED_AXES
```

Missing gates are `axis_1_semantics`, `axis_2_semantics`, `axis_3_semantics`,
`axis_4_semantics`, `positioning_law`, and `interlevel_training_receipt`. No four-axis object was
formed or placed on disk.

Explicit boundaries:

- deterministic graph scorers are **NOT learned GNNs**;
- no live GNN, OmniShannon, Bobby/Fischer, Hookwall, or fabric service is evidenced;
- no live absorption or promotion occurred;
- 27 means measured L3 seats, not 27 levels;
- no Hutter archive, Hutter Prize, record compression, or prize-readiness claim is made; and
- the 38,744-byte old-cube cohort and 1,834-byte internal gain are not an enwik archive result.

Final claim state:

```text
Acer old-cube behavioral measurement  PASS
repair / CI cross-version              MEASURED_ACER+CI_CROSS_VERSION_PASS
trilateral new-head digest             HELD_PENDING_RELIC_LIRIS_RERUNS
publication / promotion                HELD
```
