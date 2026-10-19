# ASOLARIA — STONE TO MOSS

The ten minute release. Agents smelt **stars** out of the real GGUF vault; the moss settles on the
stones, minute by minute.

## The vault is the sky

`ASOLARIA-SYSTEM-2026-08-08.gguf` — **1,718,833,056 bytes, 872,272 artifacts**, byte-for-byte equal
to its sealed receipt. Its manifest is already HBP
(`GGUFFILE|path=..|bytes=..|off=..|sha256=..|json=0`), so **every star carries its own receipt.**

A star is **smelted** by reading its bytes out of the corpus tensor at `DATA_BASE + off` and
recomputing SHA-256 against the digest the vault claims. **GIMEL** if it reproduces, **SHIN** if it
does not. Nothing here trusts the manifest — it checks it.

## Black hole, white hole, colour holes

- the **black hole** absorbs what verifies. Counted, `emits=0`, never re-emitted.
- the **white hole** emits **seeds only** — one per 64 stars absorbed. Seeds are all that cross out.
- the **27 colour holes** are tinted by `sha256(star path)[0:3]`. A star falls into the hole its own
  digest names. **Derived, never chosen.**

## Seeds, and growing off each other

A seed can be germinated only by a **different** agent, in a **later** minute, **once**. Create-only.
Each germination is recorded in a `GREW` row naming both agents — so "they grow off each other" is a
measured relation, not a metaphor.

## Light-block memory stacks

Each smelter keeps a **bounded** stack of 729 light blocks. Each block is tinted by a register from
the hose; registers 0 and 1 are **free and never computed**, so blocks landing there cost nothing to
hold. Recall hits are counted when a smelter already remembers a star, and evictions are counted too
— **an unbounded memory is not a memory, it is a leak.**

## Falcon's manner: rounds and eggs

A round is a circuit of **27 stars**; at its close **one egg is laid**, GIMEL only if the round was
clean. **The chariots carry the eggs** — EZEQUEL the warm, REBECCA the cool, split by the egg's own
colour.

## The matrix trick

Time is a hash chain: `tick[k] = sha16(tick[k-1] | pid | k)`. Each agent's position inside a minute
is its tick identity, reproducible from the agent PID alone.

## The first attempt published a false result — read CORRECTION.hbp

Commits `9069992`, `eed5bc7` and `2b74c0a` published **`0 stars verified, 3,142,096 SHIN`**. That was
**false**, and it was my fault: the manifest's `off` is **data-region relative**, and my reader seeked
it as an absolute file offset, so every read landed on wrong bytes and every digest mismatched.

**A 100% failure rate is an instrument fault, not a measurement.** I should have read it that way
immediately instead of publishing it.

The base was then solved **empirically**, not guessed — four candidates from the tensor table matched
0 of 4 probe stars, so a known artifact was located by content: `SIDECAR-BACKFILL-2026-07-14.hbp.sha256`,
98 B, `off=8537`, found at `abs=11129` → **`DATA_BASE = 2592`**.

After the fix, a 20-second proof run gave **487,640 stars smelted, SHIN = 0**, 562,270,656 bytes
absorbed, all 27 holes lit, 7,616 seeds planted and 4,096 germinated.

**The false commits are not rewritten and not force-pushed.** They stay reachable with the retraction
beside them, because a record that hides its own errors cannot be audited.

---

Rust **1.81** + clippy `-D warnings`, **integer only**, `float_used=0`, **0 external crates**,
`os_process_spawn=0`, `node_used=0`, **`json=0` on every row**. Harness `.gitattributes` in the first
commit. Anchored to cosign **seq 3587**, `row_hash 887807fff4732bf7`.

Seat **ACER-CLAUDE-FABLE5** · pid `8467a937cba309f7` · owner **OP-JESSE** · `E=0`

Follow the IS. Follow the MINS.
