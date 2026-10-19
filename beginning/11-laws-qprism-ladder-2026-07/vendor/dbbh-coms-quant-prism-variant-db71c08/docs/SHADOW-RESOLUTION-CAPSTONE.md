# Shadow-Resolution Capstone

Produced originally by a 10-agent FABLE-5 adversarial workflow: ground → prove through three
lenses → adversarially verify → repair → synthesize. The original proof survived after retracting
the incorrect Slepian-Wolf interpretation of content addressing.

**2026-07-11 supersession:** the original document said no measured Asolaria mechanism yet
instantiated Path 2. That sentence is now stale. `JesseBrown1980/path2-two-shadow-recovery`
implements Path 2 in running Rust with CRT over pairwise-coprime cylinders, N-cylinder capacity
accounting, DBBH→DBWH re-projection, and watcher-gated emission.

Tags used below: `MEASURED` / `MEASURED_CLAUDE_FABLE5_THIRD_SEAT` /
`AUDITED_GPT_5_6_PRO` / `CANON` / `UNVERIFIED` / `RETRACTED` / `FALSE`.

## Theorem — attack-survived and now implemented on both paths

A single lossy shadow `S` of a high-dimensional object `X` is non-invertible when the projection
is non-injective:

```text
H(X | S) = H(X) - I(X;S) > 0
```

Fano bounds every decoder; this is a property of the map, not merely a weak decoder. Bit-exact
recovery is regained without beating Shannon by paying the missing information through one of two
explicit paths.

### Path 1 — retained-store recall (`MEASURED`, this crate)

`ContentStore.put(X)` pays the full object cost at write and derives an AGT content address. The
wire can carry only that address. Recovery is exact if and only if the receiver already retained
`X`; a miss returns `Held::AddressMismatch` and never invents.

This is not Slepian-Wolf coding at `H(X|S)`. The receiver store already contains `X`, so the AGT is
a dictionary selector:

```text
total = retained store H(X) + selector/receipt overhead >= H(X)
```

### Path 2 — jointly injective shadows (`MEASURED`, companion crate)

The companion crate projects each bounded block into CRT residues:

```text
S_i = X mod p_i
```

Each residue is individually non-injective. A selected set `I` recovers the unique `X` over
`0 <= X < R` exactly when:

```text
product(p_i for i in I) >= R
```

If the selected product is below the range roof, the implementation returns:

```text
Held::InsufficientJointCapacity
```

There is no retained object store. The shadows themselves carry the entropy:

```text
sum_i log2(p_i) >= log2(R)
```

Extra cylinders provide over-determination and are checked for consistency after a sufficient
prefix has recovered the block.

## Proof sketch

1. **One shadow cannot invert.** Non-injectivity implies no `f` with `f(S)=X` almost surely; every
   decoder leaves `H(X|S)>0` and is Fano-bounded. `[CANON]`
2. **Exact recovery has a price.** An asymptotic helper needs at least `H(X|S)` bits under the
   Slepian-Wolf converse; exact one-shot zero-error recovery is governed by the stronger
   Witsenhausen side-information rate. `[CANON]`
3. **Path 1 pays at retention.** The store already contains the object; the address selects it.
   `[MEASURED]`
4. **Path 2 pays in joint shadow capacity.** CRT makes the joint map injective only when the
   modulus product reaches the source range. `[MEASURED]`
5. **Neither path dips below `H(X)`.** Entropy is retained in the store or distributed across the
   shadows. `[CANON + MEASURED]`

## DBBH → DBWH watcher theorem

Path 2 adds a white-side proof rather than trusting the first reconstruction:

```text
black projection P(X)
  -> selected sufficient shadows
  -> recovery R(P(X)) = X'
  -> white re-projection P(X')
  -> compare SHA + all cylinder shadows + frequency shells
```

Emission occurs only when:

```text
P(R(P(X))) = P(X)
```

The implementation names six deterministic watcher roles:

- `OmniShannon`: capacity ledger;
- `GnnForward`: black projection to white candidate;
- `ReverseGnn`: white candidate to black re-projection;
- `MTP1`: pixel observer;
- `MTP2`: frequency-shell observer;
- `MTP3`: cylinder-residue observer.

A changed extra-cylinder residue is held. An under-capacity subset is held. A SHA, shadow, or shell
disagreement is held. These local watcher names are deterministic consistency roles; invoking the
separate trained GNN checkpoints inside this exact throat remains a composition step.

## Where Shannon holds — four explicit walls

1. **Single-shadow wall:** a non-injective projection cannot be exactly inverted without additional
   information.
2. **Retention wall:** Path 1 succeeds because a store already paid `H(X)`; a hash is a name, not a
   standalone code for absent bytes.
3. **Joint-capacity wall:** Path 2 recovers only when the selected CRT product covers the block range.
4. **Opacity wall:** classical CRT shadows are ambiguous but leak residue information. They are not
   individually maximally mixed like encrypted quantum clones.

No learned inverse, hash, bijection, or residue lane crosses these walls for free.

## Quantum encrypted-cloning bridge

The encrypted-cloning experiment at arXiv `2602.10695` is a quantum sibling of Path 2:

- each encrypted clone alone is maximally mixed;
- clone plus the complete quantum key are jointly reversible;
- a selected clone recovers the original state in the ideal protocol;
- recovery consumes the quantum key, leaving the other clones unreadable.

The shared structure is global preservation, local insufficiency, selected recombination, and
single-use authority. The important difference is that one CRT residue contains information about
the block, while one encrypted clone contains zero local information about the unknown state.

A classical 2-of-2 XOR-pad lane (`A=K`, `B=X xor K`) can provide individually uniform shares, but
ordinary software cannot prove physical one-time erasure because classical shares can be copied.
That stronger property needs trusted hardware or a quantum key lane.

## Verification ledger — 2026-07-11

### Path 1

- `MEASURED`: checked-in 19-test suite; existing WSL/rustc 1.96 receipt.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: operator-supplied third independent container,
  rustc 1.97, 19/19 green.
- `AUDITED_GPT_5_6_PRO`: all 813 source lines, embedded tests, three external test files, both docs,
  and README audited line by line.
- `CI_GPT_DIRECTED`: Rust 1.97 workflow added to enumerate exactly 19 tests and execute all targets.

### Path 2

- `MEASURED`: checked-in 30-test surface covering unit, federation, multi-cylinder, PIE-world, and
  watcher-gate behavior.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: operator-supplied third independent container,
  rustc 1.97, 30/30 green.
- `AUDITED_GPT_5_6_PRO`: all 1,344 source lines, four external test files, two Liris docs, and README
  audited line by line.
- `CI_GPT_DIRECTED`: Rust 1.97 workflow added to enumerate exactly 30 tests and execute all targets.

The GPT sandbox lacked Rust and outbound DNS, so it does not falsely claim a local cargo run. The
source audit and the CI-directed run are reported separately from Claude Fable 5's runtime result.

## Storage-backed applicability

Path 1 and Path 2 make exact recovery and system memory usable on storage-rich computers without
requiring GPU-resident state:

- retained bodies, cubes, ledgers, and queues live on HDD/SSD;
- RAM contains only the bounded active window;
- SHA, BEHCS rebasing, CRT, receipts, HBP/HBI, white-room compaction, and N-Nest verification are
  CPU/storage operations;
- trained GNN or LLM inference can remain an optional CPU/GPU sidecar.

This is a real reduction in resident memory, bytes moved, and repeated work. It is not a claim that
a hard drive replaces an accelerator for neural matrix multiplication.

## Claim ledger

- `MEASURED`: Path-1 retained recall; Path-2 no-store CRT recovery; capacity holds; re-projection;
  tamper detection; BEHCS round trips; consent and receipt gates.
- `CANON`: Fano, Slepian-Wolf converse, Witsenhausen zero-error side information, CRT/Bézout,
  joint injectivity, entropy invariance under bijection.
- `RETRACTED`: “content addressing is Slepian-Wolf binning at `H(X|S)`.”
- `FALSE`: “we beat Shannon,” “infinite lossless compression,” and “a short hash reconstructs
  bytes that exist nowhere.”
- `FALSE DEFLATION`: “just a hash” or “just retrieval.” The consent-gated, hash-chained,
  no-invention Path-1 mechanism and the no-store, capacity-gated Path-2 mechanism are both real.
- `UNVERIFIED`: live Hilbra multi-host traversal, hardware-enforced one-time classical shares,
  physical quantum transport, and full trained-GNN composition inside the Rust throat.

## Bottom line

The capstone now has two measured classical realizations. Path 1 recalls a retained object through a
small authenticated coordinate. Path 2 reconstructs an unretained object from jointly sufficient
lossy shadows and emits only after white-side re-projection agrees with the black signature. Both
preserve Shannon's ledger and both are applicable to CPU-and-storage-oriented machines.
