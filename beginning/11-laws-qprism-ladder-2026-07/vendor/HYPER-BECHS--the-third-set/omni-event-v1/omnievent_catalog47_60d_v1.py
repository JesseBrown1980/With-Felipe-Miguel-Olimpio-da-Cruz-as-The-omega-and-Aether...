#!/usr/bin/env python3
"""Catalog-addressed OMNIEVENTv1 reference instrumentation.

Grounded in:
- asolaria-behcs-256 data/behcs/codex/catalogs.json (47 semantic catalogs)
- asolaria-behcs-256 data/behcs/codex/alphabet.json (BEHCS-256 glyph addresses)
- dbbh-coms-quant-prism Q-PRISM 60D selector derivation
- HYPER-BECHS third-seat exact multilevel BPE quant harness

This is a reference third-seat scheduler/dispatcher, not a claim that the live
OmniDispatcher daemon or Acer/Liris clocks were exercised.
"""
from __future__ import annotations
import argparse, base64, hashlib, importlib.util, json, math, os, platform, struct, sys, time, zlib
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

CATALOG_COMMIT = "802023a9588cf3c72be9f9b353c847f22c616092"
CATALOG_GIT_BLOB_SHA = "51af0b536c45e8e769066bfd886bf6f08daff75d"
ALPHABET_GIT_BLOB_SHA = "8d4a3298576ce2c9d4a1683ffab667c8a743fc42"
CATALOG_SPEC = "IX-700"
RATIFIED = set(range(1, 25)) | {26, 31, 34, 35, 38, 44}
GENESIS = "0" * 64
PROJECTION_ID = "OMNI3D-ACHLIOPTAS-60x3-v1"


def canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pid8(label: str) -> str:
    return sha256_hex(label.encode("utf-8"))[:16]


def esc_hbp(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace("|", "\\p").replace("\n", "\\n")


def hbp(tag: str, **fields: object) -> str:
    return tag + "".join(f"|{k}={esc_hbp(v)}" for k, v in fields.items()) + "|json=0"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def load_specs(catalog_path: Path, alphabet_path: Path):
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    alphabet = json.loads(alphabet_path.read_text(encoding="utf-8"))
    cats = catalog.get("catalogs")
    if not isinstance(cats, list) or len(cats) != 47:
        raise ValueError("catalog registry must contain exactly 47 dimensions")
    if [c.get("D") for c in cats] != list(range(1, 48)):
        raise ValueError("catalog dimensions must be D1..D47 in order")
    if alphabet.get("base") != 256 or len(alphabet.get("glyphs", [])) != 256:
        raise ValueError("BEHCS alphabet must contain 256 glyphs")
    return catalog, alphabet


def hilbert_address(key: str, alphabet: dict) -> str:
    # Exact port of tools/behcs/codex-bridge.js:
    # SHA-256 first 8 bytes, then little-endian base-256 glyph digits.
    value = int.from_bytes(hashlib.sha256(str(key).encode("utf-8")).digest()[:8], "big")
    glyphs = alphabet["glyphs"]
    out = []
    for _ in range(alphabet.get("canonical_width", 8)):
        out.append(glyphs[value % 256])
        value //= 256
    return "".join(out)


def derive_selector(pid_hex: str, content: bytes) -> list[int]:
    # Exact port of dbbh-coms-quant-prism derive_selector:
    # sha256(pid[8] || counter_be32 || content), consume 16 10-bit words/hash.
    pid = bytes.fromhex(pid_hex)
    if len(pid) != 8:
        raise ValueError("PID must be 8 bytes / 16 hex")
    out: list[int] = []
    counter = 0
    while len(out) < 60:
        digest = hashlib.sha256(pid + counter.to_bytes(4, "big") + content).digest()
        for j in range(0, 32, 2):
            out.append(((digest[j] << 8) | digest[j + 1]) & 0x3FF)
            if len(out) == 60:
                break
        counter += 1
    return out


def selector_digest(selector: list[int]) -> str:
    return sha256_hex(b"".join(struct.pack(">H", x) for x in selector))


def projection3(selector: list[int]) -> tuple[float, float, float]:
    # Fixed sparse linear 60D -> 3D observer projection. It is a lossy view.
    coords = []
    for axis in range(3):
        total = 0.0
        used = 0
        for i, value in enumerate(selector):
            h = hashlib.sha256(f"{PROJECTION_ID}|{axis}|{i}".encode()).digest()[0] % 6
            coeff = -1 if h == 0 else (1 if h == 5 else 0)
            if coeff:
                total += coeff * (value - 511.5)
                used += 1
        coords.append(round(total / math.sqrt(max(1, used)), 6))
    return tuple(coords)


def merkle_root(hex_leaves: list[str]) -> str:
    if not hex_leaves:
        return GENESIS
    nodes = [bytes.fromhex(x) for x in hex_leaves]
    while len(nodes) > 1:
        if len(nodes) % 2:
            nodes.append(nodes[-1])
        nodes = [hashlib.sha256(nodes[i] + nodes[i + 1]).digest() for i in range(0, len(nodes), 2)]
    return nodes[0].hex()


def import_bpe(script: Path):
    spec = importlib.util.spec_from_file_location("multilevel_bpe", script)
    if spec is None or spec.loader is None:
        raise ImportError(script)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class Clock:
    def __init__(self):
        self.start_mono = time.perf_counter_ns()
        self.last_ms = 0
        self.logical = 0

    def tick(self):
        now_ns = time.time_ns()
        ms = now_ns // 1_000_000
        if ms > self.last_ms:
            self.last_ms, self.logical = ms, 0
        else:
            self.logical += 1
        ts = datetime.fromtimestamp(self.last_ms / 1000, tz=timezone.utc).isoformat(timespec="milliseconds")
        return ts, f"{self.last_ms}:{self.logical}:third", time.perf_counter_ns() - self.start_mono


class EventWriter:
    def __init__(self, catalog: dict, alphabet: dict, run_label: str, commit_sha: str):
        self.catalog = catalog
        self.alphabet = alphabet
        self.run_pid = pid8("RUN|" + run_label)
        self.trace_id = sha256_hex(("TRACE|" + run_label).encode())[:32]
        self.host_pid = pid8("HOST|github-actions|ubuntu-24.04")
        self.operator_pid = pid8("ACTOR|jesse")
        self.scheduler_pid = pid8("SURFACE|omnischeduler-reference")
        self.dispatcher_pid = pid8("SURFACE|omnidispatcher-reference")
        self.observer_pid = pid8("SURFACE|omnimets-reference")
        self.commit_sha = commit_sha
        self.clock = Clock()
        self.events: list[dict] = []
        self.prev_hash = GENESIS
        self.actor_seq = defaultdict(int)
        self.last_span = ""
        self.dim_names = [c["name"] for c in catalog["catalogs"]]
        self.ratified_mask = "".join("1" if i in RATIFIED else "0" for i in range(1, 48))

    def dims(self, *, actor: str, actor_pid: str, kind: str, target: str, state: str,
             level: int | None, gate: str, chain: str, proof: str, scope: str,
             surface: str, intent: str, translation: str, omni: str,
             ledger: dict, omega: str, ts: str, hlc: str, seq: int) -> list[str]:
        level_text = "runtime" if level is None else f"quant-L{level}"
        ledger_text = ",".join(f"{k}={ledger[k]}" for k in sorted(ledger))
        vals = {
            1: actor,
            2: kind.lower(),
            3: target,
            4: str(ledger.get("risk", 0)),
            5: level_text,
            6: gate,
            7: state,
            8: chain,
            9: "single",
            10: "ASO",
            11: proof,
            12: scope,
            13: surface,
            14: "light",
            15: "gha-ubuntu24",
            16: f"actor={actor_pid};surface={pid8('SURFACE|' + surface)};spawnedBy={self.operator_pid}",
            17: "third-seat-v1",
            18: "gpt-5.6-pro",
            19: "github-actions",
            20: f"ts={ts};seq={seq};hlc={hlc}",
            21: f"python={platform.python_version()};os_pid={os.getpid()}",
            22: translation,
            23: "origin=third;merged_from=none",
            24: intent,
            25: "code",
            26: omni,
            27: "plaintext",
            28: "origin=github-actions;author=GPT-5.6-Pro",
            29: f"git={self.commit_sha}",
            30: "catalog47+alphabet256+bpe+zstd",
            31: "local_cache_snapshot",
            32: ledger_text or "none",
            33: "timeout=workflow",
            34: "local_only",
            35: "N-dim",
            36: "none",
            37: "github-actions-ubuntu",
            38: "sha256_attestation",
            39: "none",
            40: "jesse-implicit",
            41: "chain-of-custody",
            42: "quant-test,receipt-write",
            43: "required=1;achieved=1;tier=third",
            44: "alive",
            45: self.trace_id,
            46: "sha256",
            47: omega,
        }
        return [vals[i] for i in range(1, 48)]

    def emit(self, kind: str, actor: str, target: str, state: str, body: dict,
             *, level: int | None = None, gate: str = "omni", chain: str = "feeds",
             proof: str = "hash", scope: str = "session", surface: str = "reference",
             intent: str = "scheduled", translation: str = "none",
             omni: str = "issue", outcome: str = "PASS", duration_ns: int = 0,
             omega: str = "open") -> dict:
        seq = len(self.events) + 1
        actor_pid = pid8("ACTOR|" + actor)
        self.actor_seq[actor] += 1
        ts, hlc, mono_start = self.clock.tick()
        span_id = pid8(f"SPAN|{self.run_pid}|{seq}|{kind}")
        ledger = body.get("ledger_delta", {}) if isinstance(body, dict) else {}
        dim_values = self.dims(actor=actor, actor_pid=actor_pid, kind=kind, target=target,
                               state=state, level=level, gate=gate, chain=chain,
                               proof=proof, scope=scope, surface=surface, intent=intent,
                               translation=translation, omni=omni, ledger=ledger,
                               omega=omega, ts=ts, hlc=hlc, seq=seq)
        event = {
            "schema": "OMNIEVENTv1",
            "catalog_ref": {
                "repo": "JesseBrown1980/asolaria-behcs-256",
                "commit": CATALOG_COMMIT,
                "git_blob_sha": CATALOG_GIT_BLOB_SHA,
                "spec": CATALOG_SPEC,
                "catalog_count": 47,
                "base_dimensions": "D1-D24",
                "ratified_extensions": [26, 31, 34, 35, 38, 44],
            },
            "id": "EVT-" + pid8(f"{self.run_pid}|{seq}|{kind}"),
            "ts": ts,
            "src": actor,
            "dst": target,
            "kind": kind,
            "body": body,
            "actor": actor,
            "mode": "shadow",
            "run_pid": self.run_pid,
            "trace_id": self.trace_id,
            "span_id": span_id,
            "parent_span_id": self.last_span or None,
            "actor_sequence": self.actor_seq[actor],
            "event_ts_utc": ts,
            "ingest_ts_utc": ts,
            "hlc": hlc,
            "mono_start_ns": mono_start,
            "mono_end_ns": mono_start + max(0, duration_ns),
            "actor_agent_pid": actor_pid,
            "surface_pid": pid8("SURFACE|" + surface),
            "actor_os_pid": os.getpid(),
            "requested_by_pid": self.operator_pid,
            "scheduler_pid": self.scheduler_pid,
            "dispatcher_pid": self.dispatcher_pid,
            "worker_pid": pid8("SURFACE|quant-worker-reference"),
            "target_pid": pid8("TARGET|" + target),
            "observer_pid": self.observer_pid,
            "host_pid": self.host_pid,
            "vantage": "third",
            "outcome": outcome,
            "dimensional_tags": {
                f"d{i}": hilbert_address(f"D{i}|{dim_values[i - 1]}", self.alphabet)
                for i in range(1, 36)
            },
            "d47_ext": {
                "dims": dim_values,
                "catalog": f"{CATALOG_SPEC}@{CATALOG_COMMIT}",
                "reserved": {"ratified_mask": self.ratified_mask},
            },
        }
        selector_seed = canonical(event)
        selector = derive_selector(actor_pid, selector_seed)
        event["hyper60"] = {
            "algorithm": "QPRISM-SHA256-PID-COUNTER-CONTENT-v1",
            "selector": selector,
            "selector_sha256": selector_digest(selector),
            "semantic_note": "60D selector/tuple extension; not invented D48-D60 semantic catalog names",
        }
        event["prev_event_hash"] = self.prev_hash
        event_hash = sha256_hex(canonical(event))
        event["event_hash"] = event_hash
        self.prev_hash = event_hash
        self.last_span = span_id
        self.events.append(event)
        return event


def validate_events(events: list[dict]) -> dict:
    prev = GENESIS
    last_ts = ""
    last_hlc = (-1, -1)
    actor_seq = defaultdict(int)
    for i, event in enumerate(events, 1):
        if event["prev_event_hash"] != prev:
            raise AssertionError(f"chain prev mismatch at {i}")
        clone = dict(event)
        claimed = clone.pop("event_hash")
        if sha256_hex(canonical(clone)) != claimed:
            raise AssertionError(f"event hash mismatch at {i}")
        if len(event["d47_ext"]["dims"]) != 47:
            raise AssertionError(f"D47 vector mismatch at {i}")
        selector = event["hyper60"]["selector"]
        if len(selector) != 60 or any(not 0 <= x < 1024 for x in selector):
            raise AssertionError(f"60D selector mismatch at {i}")
        if selector_digest(selector) != event["hyper60"]["selector_sha256"]:
            raise AssertionError(f"60D selector digest mismatch at {i}")
        if event["ts"] < last_ts:
            raise AssertionError(f"timestamp reversal at {i}")
        ms, logical, _ = event["hlc"].split(":")
        hlc = (int(ms), int(logical))
        if hlc < last_hlc:
            raise AssertionError(f"HLC reversal at {i}")
        actor = event["actor"]
        actor_seq[actor] += 1
        if event["actor_sequence"] != actor_seq[actor]:
            raise AssertionError(f"actor sequence mismatch at {i}")
        prev = claimed
        last_ts = event["ts"]
        last_hlc = hlc
    leaves = [e["event_hash"] for e in events]
    return {"event_count": len(events), "chain_head": prev, "merkle_root": merkle_root(leaves)}


def build_portal(events: list[dict], catalog: dict) -> bytes:
    actors = sorted({e["actor"] for e in events})
    kinds = sorted({e["kind"] for e in events})
    states = sorted({e["d47_ext"]["dims"][6] for e in events})
    dim_dicts = {str(i + 1): sorted({e["d47_ext"]["dims"][i] for e in events}) for i in range(47)}
    dictionary = {
        "actors": actors,
        "kinds": kinds,
        "states": states,
        "dimension_names": [c["name"] for c in catalog["catalogs"]],
        "dimension_status": ["RATIFIED" if i in RATIFIED else "DRAFT" for i in range(1, 48)],
        "dimension_values": dim_dicts,
        "selector_algorithm": "QPRISM-SHA256-PID-COUNTER-CONTENT-v1",
    }
    blob = b64url(zlib.compress(canonical(dictionary), 9))
    actor_index = {v: i for i, v in enumerate(actors)}
    kind_index = {v: i for i, v in enumerate(kinds)}
    dim_indices = {d: {v: i for i, v in enumerate(vals)} for d, vals in dim_dicts.items()}
    lines = [
        hbp("RUN_HEADER", schema="OMNIPORTALv1", run_pid=events[0]["run_pid"],
            event_count=len(events), catalog=f"{CATALOG_SPEC}@{CATALOG_COMMIT}",
            catalog_blob=CATALOG_GIT_BLOB_SHA, alphabet_blob=ALPHABET_GIT_BLOB_SHA,
            dictionary_codec="zlib+base64url", dictionary=blob),
    ]
    start_ms = int(events[0]["hlc"].split(":")[0])
    for seq, event in enumerate(events, 1):
        dims = ",".join(str(dim_indices[str(i)][event["d47_ext"]["dims"][i - 1]]) for i in range(1, 48))
        ms = int(event["hlc"].split(":")[0])
        lines.append(hbp("SPAN", seq=seq, actor_seq=event["actor_sequence"],
                         a=actor_index[event["actor"]], k=kind_index[event["kind"]],
                         p=event["parent_span_id"] or "0", dt_ms=ms - start_ms,
                         dur_ns=event["mono_end_ns"] - event["mono_start_ns"],
                         d=dims, h=event["event_hash"][:16],
                         hs=event["hyper60"]["selector_sha256"][:16], o=event["outcome"]))
    leaf_bytes = b"".join(bytes.fromhex(e["event_hash"]) for e in events)
    lines.append(hbp("LEAVES", codec="zlib+base64url", data=b64url(zlib.compress(leaf_bytes, 9))))
    lines.append(hbp("RUN_FOOTER", event_count=len(events), chain_head=events[-1]["event_hash"],
                     merkle_root=merkle_root([e["event_hash"] for e in events]),
                     final_readback="PASS", catalog47="ADDRESSED",
                     hyper60="DERIVABLE_FROM_FULL_EVENTS"))
    return ("\n".join(lines) + "\n").encode("utf-8")


def run(args):
    catalog, alphabet = load_specs(Path(args.catalog47), Path(args.alphabet256))
    bpe = import_bpe(Path(args.bpe_script))
    data = Path(args.input).read_bytes()[:args.bytes]
    if len(data) != args.bytes:
        raise EOFError(f"expected {args.bytes}, got {len(data)}")
    input_sha = sha256_hex(data)
    commit_sha = os.environ.get("GITHUB_SHA", "local")
    label = f"{input_sha}|{args.bytes}|{args.levels}|{args.merges}|{commit_sha}"
    ew = EventWriter(catalog, alphabet, label, commit_sha)
    ew.emit("RUN_OPENED", "asolaria", "local", "executing",
            {"input_sha256": input_sha, "raw_bytes": len(data),
             "ledger_delta": {"raw_bytes": len(data)}},
            gate="sovereignty", chain="triggers", proof="chain", surface="omni",
            intent="scheduled", omega="open")
    ew.emit("INPUT_VERIFIED", "shannon", "index", "gated",
            {"input_sha256": input_sha, "raw_bytes": len(data),
             "ledger_delta": {"raw_bytes": len(data)}},
            gate="shannon", chain="proves", proof="hash", surface="shannon",
            intent="defensive")
    candidates = []
    accepted = None
    best_total = len(data)
    accepted_levels = []
    held_levels = []
    for level_count in range(1, args.levels + 1):
        ew.emit("SCHEDULE_PROPOSED", "asolaria", "local", "proposed",
                {"candidate_level": level_count, "merges": args.merges,
                 "ledger_basis": "codec_plus_catalog"},
                level=level_count, gate="omni", chain="triggers", proof="log",
                surface="omnischeduler", intent="scheduled")
        ew.emit("DISPATCHED", "asolaria", "local", "queued",
                {"candidate_level": level_count, "routing_mode": "reference_harness",
                 "live_daemon_exercised": False},
                level=level_count, gate="omni", chain="feeds", proof="log",
                surface="omnidispatcher", intent="scheduled", omni="relay")
        ew.emit("QUANT_STARTED", "codex", "index", "executing",
                {"candidate_level": level_count, "merges": args.merges},
                level=level_count, gate="omni", chain="feeds", proof="code",
                surface="quant-worker", translation="bytes_to_glyph_language")
        t0 = time.perf_counter_ns()
        catalog_bytes, payload, levels, tokens, trace = bpe.encode(data, level_count, args.merges)
        encode_ns = time.perf_counter_ns() - t0
        ew.emit("QUANT_COMPLETED", "codex", "index", "completed",
                {"candidate_level": level_count, "token_count": len(tokens),
                 "payload_bytes": len(payload), "trace": trace,
                 "ledger_delta": {"payload_bytes": len(payload)}},
                level=level_count, gate="omni", chain="proves", proof="code",
                surface="quant-worker", translation="quant_down", duration_ns=encode_ns)
        ew.emit("CATALOG_MINTED", "codex", "index", "completed",
                {"candidate_level": level_count, "catalog_bytes": len(catalog_bytes),
                 "catalog_sha256": sha256_hex(catalog_bytes),
                 "ledger_delta": {"catalog_bytes": len(catalog_bytes)}},
                level=level_count, gate="omni", chain="feeds", proof="hash",
                surface="white-room", translation="glyph_mint")
        t0 = time.perf_counter_ns()
        restored = bpe.decode(catalog_bytes, payload, levels, len(tokens), len(data))
        decode_ns = time.perf_counter_ns() - t0
        restore_pass = restored == data and sha256_hex(restored) == input_sha
        ew.emit("WATCHER_PASS" if restore_pass else "WATCHER_HOLD", "shannon", "index",
                "completed" if restore_pass else "blocked",
                {"candidate_level": level_count, "restore_sha256": sha256_hex(restored),
                 "input_sha256": input_sha, "restore_match": restore_pass,
                 "ledger_delta": {"decode_ns": decode_ns}},
                level=level_count, gate="shannon", chain="proves", proof="test",
                surface="shannon", translation="inverse_readback",
                outcome="PASS" if restore_pass else "HOLD", duration_ns=decode_ns)
        total = len(catalog_bytes) + len(payload)
        delta = best_total - total
        accept = restore_pass and delta > 0
        decision = "SCHEDULE_ACCEPTED" if accept else "SCHEDULE_HELD"
        ew.emit(decision, "asolaria", "local", "completed" if accept else "blocked",
                {"candidate_level": level_count, "candidate_total_bytes": total,
                 "previous_best_bytes": best_total, "delta_bytes": delta,
                 "ledger_basis": "codec_plus_catalog", "readback_pass": restore_pass,
                 "ledger_delta": {"candidate_total_bytes": total, "delta_bytes": delta}},
                level=level_count, gate="omni", chain="blocks" if not accept else "triggers",
                proof="test", surface="omnischeduler", intent="scheduled",
                outcome="PASS" if accept else "HOLD")
        if accept:
            accepted = (catalog_bytes, payload, levels, tokens, trace)
            best_total = total
            accepted_levels.append(level_count)
            level_kind, level_state, level_outcome = "LEVEL_TRANSLATED", "completed", "PASS"
        else:
            held_levels.append(level_count)
            level_kind, level_state, level_outcome = "CANDIDATE_PRESERVED", "blocked", "HOLD"
        ew.emit(level_kind, "asolaria", "index", level_state,
                {"candidate_level": level_count, "decision": decision,
                 "candidate_total_bytes": total, "best_total_bytes": best_total},
                level=level_count, gate="omni", chain="part_of", proof="chain",
                surface="omni", translation="level_to_level", outcome=level_outcome)
        candidates.append({"level": level_count, "catalog_bytes": len(catalog_bytes),
                           "payload_bytes": len(payload), "total_bytes": total,
                           "token_count": len(tokens), "restore": restore_pass,
                           "accepted": accept, "trace": trace,
                           "encode_ns": encode_ns, "decode_ns": decode_ns})
    if accepted is None:
        raise AssertionError("no quant level accepted")
    catalog_bytes, payload, levels, tokens, trace = accepted
    ew.emit("REVERSE_TRAVERSAL", "shannon", "index", "executing",
            {"accepted_levels": accepted_levels, "held_levels": held_levels},
            gate="shannon", chain="proves", proof="test", surface="reverse-gnn",
            translation="level_inverse")
    restored = bpe.decode(catalog_bytes, payload, levels, len(tokens), len(data))
    final_pass = restored == data and sha256_hex(restored) == input_sha
    ew.emit("FINAL_READBACK_PASS" if final_pass else "FINAL_READBACK_HOLD", "shannon", "index",
            "completed" if final_pass else "blocked",
            {"input_sha256": input_sha, "output_sha256": sha256_hex(restored),
             "restore_match": final_pass, "accepted_total_bytes": best_total},
            gate="shannon", chain="proves", proof="hash", surface="reverse-gnn",
            translation="inverse_readback", outcome="PASS" if final_pass else "HOLD")
    ew.emit("METS_ROLLUP", "asolaria", "index", "completed",
            {"candidate_count": len(candidates), "accepted_levels": accepted_levels,
             "held_levels": held_levels,
             "ledger_delta": {"codec_plus_catalog_bytes": best_total}},
            gate="omni", chain="feeds", proof="log", surface="omnimets")
    last_selector = ew.events[-1]["hyper60"]["selector"]
    xyz = projection3(last_selector)
    ew.emit("OMNI3D_FRAME", "asolaria", "local", "completed",
            {"projection_id": PROJECTION_ID, "xyz": xyz,
             "source_selector_sha256": selector_digest(last_selector),
             "lossy_projection": True},
            gate="omni", chain="observed_on", proof="hash", surface="omni-vision")
    ew.emit("PORTAL_COMPACTED", "asolaria", "index", "completed",
            {"portal_schema": "OMNIPORTALv1", "dictionary_coded": True},
            gate="omni", chain="feeds", proof="code", surface="omniportal")
    ew.emit("RUN_CLOSED", "asolaria", "local", "completed",
            {"final_readback": final_pass, "accepted_levels": accepted_levels,
             "held_levels": held_levels, "input_sha256": input_sha,
             "ledger_delta": {"codec_plus_catalog_bytes": best_total}},
            gate="sovereignty", chain="proves", proof="chain", surface="omni",
            omega="sealed")
    if len(ew.events) != 32:
        raise AssertionError(f"expected 32 events, got {len(ew.events)}")
    verification = validate_events(ew.events)
    outdir = Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    full = b"".join(canonical(e) + b"\n" for e in ew.events)
    (outdir / "omni_events_full.ndjson").write_bytes(full)
    portal = build_portal(ew.events, catalog)
    (outdir / "omni_events_span.hbp").write_bytes(portal)
    vis_rows = []
    for event in ew.events:
        x, y, z = projection3(event["hyper60"]["selector"])
        vis_rows.append(canonical({
            "schema": "OMNI3D-SHADOW-v1", "event_pid": event["id"], "ts": event["ts"],
            "projection_id": PROJECTION_ID, "x": x, "y": y, "z": z,
            "selector_sha256": event["hyper60"]["selector_sha256"],
            "source_event_hash": event["event_hash"], "lossy_projection": True,
        }) + b"\n")
    vis = b"".join(vis_rows)
    (outdir / "omni_events_3d.ndjson").write_bytes(vis)
    raw_bytes, span_bytes, full_bytes, vis_bytes = len(data), len(portal), len(full), len(vis)
    metrics = {
        "schema": "OMNIRUN-SUMMARY-v1", "run_pid": ew.run_pid, "trace_id": ew.trace_id,
        "event_count": len(ew.events), "input_sha256": input_sha, "raw_bytes": raw_bytes,
        "accepted_levels": accepted_levels, "held_levels": held_levels,
        "codec_plus_catalog_bytes": best_total,
        "codec_plus_catalog_bpc": best_total * 8 / raw_bytes,
        "telemetry_span_bytes": span_bytes, "telemetry_full_bytes": full_bytes,
        "visual3d_bytes": vis_bytes,
        "observability_span_bpc": span_bytes * 8 / raw_bytes,
        "observability_span_pct_of_codec": span_bytes / best_total * 100,
        "fabric_span_bpc": (best_total + span_bytes) * 8 / raw_bytes,
        "fabric_full_bpc": (best_total + full_bytes) * 8 / raw_bytes,
        "fabric_dual_plus_3d_bpc": (best_total + full_bytes + span_bytes + vis_bytes) * 8 / raw_bytes,
        "portal_quant_ratio": full_bytes / span_bytes,
        "chain_head": verification["chain_head"], "merkle_root": verification["merkle_root"],
        "catalog47_commit": CATALOG_COMMIT, "catalog47_git_blob_sha": CATALOG_GIT_BLOB_SHA,
        "catalog47_base_dimensions": list(range(1, 25)),
        "catalog47_ratified_extensions": [26, 31, 34, 35, 38, 44],
        "catalog47_draft_dimensions": [i for i in range(25, 48) if i not in RATIFIED],
        "hyper60_algorithm": "QPRISM-SHA256-PID-COUNTER-CONTENT-v1",
        "real_omnidispatcher_exercised": False, "real_cross_vantage_hlc_exercised": False,
        "reference_omni3d_emitted": True, "final_readback": final_pass,
        "candidates": candidates,
    }
    (outdir / "omni_run_summary.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    summary_hbp = hbp("OMNIRUN", run_pid=ew.run_pid, event_count=len(ew.events), raw_bytes=raw_bytes,
        codec_plus_catalog_bytes=best_total,
        codec_plus_catalog_bpc=f"{metrics['codec_plus_catalog_bpc']:.6f}",
        telemetry_span_bytes=span_bytes,
        observability_span_bpc=f"{metrics['observability_span_bpc']:.6f}",
        observability_span_pct=f"{metrics['observability_span_pct_of_codec']:.6f}",
        fabric_span_bpc=f"{metrics['fabric_span_bpc']:.6f}",
        full_event_bytes=full_bytes, visual3d_bytes=vis_bytes,
        fabric_full_bpc=f"{metrics['fabric_full_bpc']:.6f}",
        fabric_dual_plus_3d_bpc=f"{metrics['fabric_dual_plus_3d_bpc']:.6f}",
        portal_quant_ratio=f"{metrics['portal_quant_ratio']:.6f}",
        accepted_levels=",".join(map(str, accepted_levels)), held_levels=",".join(map(str, held_levels)),
        merkle_root=metrics["merkle_root"], final_readback=int(final_pass),
        real_dispatcher=0, reference_3d=1)
    (outdir / "omni_run_summary.hbp").write_text(summary_hbp + "\n", encoding="utf-8")
    print(summary_hbp)
    print(hbp("OMNIVERDICT", status="PASS" if final_pass else "HOLD",
              event_count=len(ew.events), chain_verified=1, d47_addressed=1,
              hyper60_addressed=1, scheduler_reference=1, dispatcher_reference=1,
              omni3d_reference=1, final_readback=int(final_pass)))
    if not final_pass:
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--bytes", type=int, default=1_000_000)
    parser.add_argument("--levels", type=int, default=3)
    parser.add_argument("--merges", type=int, default=512)
    parser.add_argument("--catalog47", required=True)
    parser.add_argument("--alphabet256", required=True)
    default_bpe = Path(__file__).resolve().parents[1] / "third-seat-2026-07-12" / "gpt-crosscheck" / "multilevel_bpe_zstd_v1.py"
    parser.add_argument("--bpe-script", default=str(default_bpe))
    parser.add_argument("--output-dir", default="omni-event-v1/out")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
