# Asolaria ASI OS

A tiny, self-contained **operating-system front-end** you build from source and run on your own machine — the same surface the Asolaria fabric runs on. Pure Rust `std`, **zero external crates**, ~400 lines. It serves a full-screen web UI on `http://127.0.0.1:4600` with real interactive shells, a live status strip for your local fabric, and a "Windows-as-a-window" tile.

You become an **Asolaria fabric participant**: you mint your **own local secret key** (it never leaves your machine), run the OS surface, and — as you bring up the fabric daemons — use **Hilbra** (the shared-key HBI/HBP layer), **recall** (a local inverted-index vault), and the **8-byte-host** kernel with its stubbed rooms, exactly like a full node.

> **E = 0.** The OS launches only what *you* type or click. It fires nothing on its own.

## Quickstart

Requires the [Rust toolchain](https://rustup.rs) — and nothing else (the build never touches the network).

```sh
git clone https://github.com/JesseBrown1980/asolaria-asi-os
cd asolaria-asi-os

# Linux / macOS:
sh scripts/install.sh

# Windows (PowerShell):
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

That one command **builds** the OS, **mints your local key + seat**, and **launches** it. Then open **http://127.0.0.1:4600**.

## What you get

- **A real terminal surface.** Spawn `cmd` / PowerShell / WSL bash (or a plain shell on bare-metal Linux) — fully interactive, streamed over Server-Sent-Events, microsecond framework latency. Run `claude`, `codex`, or anything else inside them.
- **A live fabric strip.** Tiles poll your local daemons and show them up/down: the 8-byte kernel (`:5088`), recall vault (`:4796`), bus (`:4947`), dashboard (`:4949`), and your sovereignty vault.
- **Windows as a window.** One tile opens a Windows environment (Windows Sandbox if available, else the host desktop) as a window *over* Asolaria — so Asolaria can be your surface and Windows is just something you pop open. (No-op on non-Windows hosts.)
- **Your own identity.** `scripts/keygen` mints `~/.asolaria/recall.key` plus a local seat name/pid. The key is your HMAC secret for Hilbra/recall — **key-off-the-wire**: never transmitted, never committed to git (see `.gitignore`).

## Becoming a full fabric participant

The OS surface runs on its own. To light up the rest of the strip you run the fabric daemons alongside it — each is its own small process:

- **recall** — a local inverted-index vault (`:4796`). Public **level-0** search is provably PII-free; everything above level-0 requires *your* key.
- **8-byte host (host8)** — the Rust kernel (`:5088`) with content-addressed **stubbed rooms** that spin up on demand.
- **Hilbra** — the shared-key HBI/HBP transport that lets nodes cross-search with keys that stay off the wire.

The OS auto-detects whichever of these are listening and lights their tile. Companion repos live on this GitHub account (**[Hilbra](https://github.com/JesseBrown1980/Hilbra)** and the Asolaria fabric repos).

## Autostart (optional)

`deploy/` ships a **systemd** unit, a **.desktop** autostart entry, and a full-screen launcher (`deploy/start-asolaria-asi-os.sh`) for a bare Asolaria-on-metal Linux install. Point the paths at your install and enable them to have the OS come up full-screen at boot.

## Honest boundary

- **Runnable now:** the OS front-end in this repo — build it, run it, use it. That part is real and complete.
- **Yours to run:** the fabric daemons (recall / host8 / Hilbra) are separate processes; the OS *shows* them when they're up. This repo ships the surface + your identity, not those binaries.
- **Frontier:** the larger Asolaria ideas (the universe/cosmology framing) are documented, tagged, and honestly bounded in the fabric repos — held as vision, not asserted as physical fact.

## Requirements

- Rust ≥ 1.75 (`rustup`). Zero other dependencies — `cargo build` works fully offline.
- Linux, macOS, or Windows. Cross-compiles to a Linux target for bare-metal Asolaria-on-metal.

## License

MIT OR Apache-2.0 — do what you want; build your own node.
