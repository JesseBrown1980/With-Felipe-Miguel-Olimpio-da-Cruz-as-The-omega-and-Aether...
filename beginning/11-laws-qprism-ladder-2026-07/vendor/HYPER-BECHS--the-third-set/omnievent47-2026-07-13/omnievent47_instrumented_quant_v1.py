#!/usr/bin/env python3
"""Catalog-grounded OMNIEVENT47 reference run.

This wraps the existing exact multi-level BPE quant-down/readback harness in a
single-host reference Omni lifecycle. Every event is stamped against the actual
Brown-Hilbert 47-catalog registry pinned from asolaria-behcs-256. The public
60D frame is referenced without inventing D48-D60 semantics.

Outputs:
  omni_events_full.ndjson   full 47D-stamped, hash-linked events
  omni_events_span.hbp      dictionary/delta portal representation, json=0
  omni3d_frame.json         explicit D1/D5/D20 3D shadow
  omni_run_metrics.json     byte and observability ledgers
  omni_run_receipt.hbp      machine-readable run receipt
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
import platform
import socket
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CATALOG_REPO = "JesseBrown1980/asolaria-behcs-256"
CATALOG_COMMIT = "802023a9588cf3c72be9f9b353c847f22c616092"
CATALOG_PATH = "data/behcs/codex/catalogs.json"
RATIFIED_EXTRA = {26, 31, 34, 35, 38, 44}


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_obj(value: Any) -> str:
    return sha256_bytes(canonical_bytes(value))


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def q(value: Any) -> str:
    return urllib.parse.quote(str(value), safe="._-:/")


def merkle_root(hex_hashes: list[str]) -> str:
    if not hex_hashes:
        return sha256_bytes(b"")
    layer = [bytes.fromhex(h) for h in hex_hashes]
    while len(layer) > 1:
        if len(layer) % 2:
            layer.append(layer[-1])
        layer = [hashlib.sha256(layer[i] + layer[i + 1]).digest() for i in range(0, len(layer), 2)]
    return layer[0].hex()


def load_module(path: Path):
    spec = importlib.util.spec_from_file_location("multilevel_bpe", path)
    if spec is None or spec.loader is None:
        raise ImportError(path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def catalog_status(d: int, ratified: set[int]) -> str:
    if d <= 24:
        return "OMNI_V3_BASE"
    if d in ratified:
        return "RATIFIED_2026_04_13"
    return "DRAFT_UNRATIFIED"


@dataclass(frozen=True)
class Actor:
    role: str
    catalog_actor: str
    profile: str
    surface: str
    pid: str


def make_pid(kind: str, name: str) -> str:
    return f"{kind.upper()}-{sha256_bytes((kind + '|' + name).encode())[:16]}"


class Catalog47:
    def __init__(self, path: Path):
        raw = path.read_bytes()
        self.file_sha256 = sha256_bytes(raw)
        parsed = json.loads(raw)
        if parsed.get("name") != "Brown Hilbert 47-catalog registry":
            raise ValueError("wrong catalog registry")
        rows = parsed.get("catalogs") or []
        if len(rows) != 47 or [row.get("D") for row in rows] != list(range(1, 48)):
            raise ValueError("catalog registry is not contiguous D1-D47")
        self.raw = parsed
        self.by_d = {row["D"]: row for row in rows}
        self.ratified = set(parsed.get("ratified_catalogs") or [])
        if self.ratified != RATIFIED_EXTRA:
            raise ValueError(f"unexpected ratified set: {self.ratified}")

    def stamp(self, coordinates: dict[int, Any]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for d in range(1, 48):
            row = self.by_d[d]
            value = coordinates.get(d)
            values = row.get("values")
            extension = False
            if isinstance(values, list) and not isinstance(value, dict) and value not in values:
                extension = True
            key = f"D{d:02d}_{row['name']}"
            out[key] = {
                "D": d,
                "name": row["name"],
                "prime": row["prime"],
                "cube": row["cube"],
                "status": catalog_status(d, self.ratified),
                "coordinate": value,
                "catalog_extension_value": extension,
            }
        return out

    def index_of(self, d: int, value: Any) -> int:
        values = self.by_d[d].get("values")
        if isinstance(values, list) and value in values:
            return values.index(value)
        digest = hashlib.sha256(canonical_bytes(value)).digest()
        return int.from_bytes(digest[:4], "big")


class EventBuilder:
    def __init__(self, catalog: Catalog47, input_sha: str):
        hostname = socket.gethostname()
        self.started_iso = iso_now()
        self.started_wall_ms = time.time_ns() // 1_000_000
        self.started_mono_ns = time.monotonic_ns()
        self.host_pid = make_pid("HOST", hostname)
        self.run_pid = make_pid("RUN", f"{input_sha}|{self.started_iso}|{hostname}")
        self.trace_id = sha256_bytes(f"trace|{self.run_pid}".encode())
        self.catalog = catalog
        self.events: list[dict[str, Any]] = []
        self.previous_hash: str | None = None
        self.actor_seq: dict[str, int] = {}
        self.actors = {
            "operator": Actor("operator", "jesse", "gaia-v1", "omni", make_pid("AGT", "jesse|operator")),
            "scheduler": Actor("scheduler", "asolaria", "gaia-v1", "omnischeduler", make_pid("AGT", "asolaria|omnischeduler")),
            "dispatcher": Actor("dispatcher", "asolaria", "gaia-v1", "omnidispatcher", make_pid("AGT", "asolaria|omnidispatcher")),
            "worker": Actor("worker", "codex", "shadow-builder-v1", "quant-worker", make_pid("AGT", "codex|quant-worker")),
            "watcher": Actor("watcher", "shannon", "omnishannon-wave-v1", "shannon", make_pid("AGT", "shannon|watcher")),
            "mets": Actor("mets", "asolaria", "gaia-v1", "omnimets", make_pid("AGT", "asolaria|omnimets")),
            "vision": Actor("vision", "vector", "shadow-builder-v1", "omni3d", make_pid("AGT", "vector|omni3d")),
        }

    def _coords(
        self,
        actor: Actor,
        kind: str,
        state: str,
        chain: str,
        level: int,
        sequence: int,
        ts: str,
        duration_ns: int,
        outcome: str,
        payload_digest: str,
        target: str,
    ) -> dict[int, Any]:
        omega = "sealed" if kind == "RUN_CLOSED" else "closure" if kind in {"FINAL_READBACK", "PORTAL_PACKED"} else "open"
        proof = "chain" if kind in {"RUN_CLOSED", "PORTAL_PACKED"} else "hash" if payload_digest else "test"
        scope = "persistent" if kind in {"CATALOG_MINTED", "RUN_CLOSED"} else "session"
        gate = "shannon" if "WATCHER" in kind or kind == "FINAL_READBACK" else "omni"
        wave = "relay" if kind in {"DISPATCHED", "PORTAL_PACKED"} else "single"
        omni_direction = "relay" if kind == "DISPATCHED" else "receive" if kind == "REVERSE_TRAVERSAL" else "issue"
        translation = "minted_glyph_to_byte" if kind == "REVERSE_TRAVERSAL" else "byte_to_minted_glyph" if "QUANT" in kind or "CATALOG" in kind else "tuple_to_english"
        return {
            1: actor.catalog_actor,
            2: kind.lower(),
            3: target,
            4: 0 if outcome == "PASS" else 3,
            5: "agent" if actor.role in {"worker", "watcher"} else "runtime",
            6: gate,
            7: state,
            8: chain,
            9: wave,
            10: "ASO",
            11: proof,
            12: scope,
            13: actor.surface,
            14: "light" if duration_ns < 1_000_000_000 else "medium",
            15: {"serial": self.host_pid, "model": platform.machine(), "firmware": platform.release(), "hw_class": "ci-runner", "gpu": "none", "form": "virtual"},
            16: {"surfaceId": actor.pid, "profileId": actor.profile, "pidVersion": 1, "spawnedBy": self.actors["operator"].pid, "spawnChain": [self.run_pid, actor.pid]},
            17: actor.profile,
            18: {"value": "deterministic-python", "catalog_extension": True},
            19: {"ip": "", "subnet": "", "geo": "", "room": f"QD43-L{level}", "network": "github-actions-or-local", "hilbert_level": level},
            20: {"timestamp": ts, "duration_ns": duration_ns, "sequence": sequence, "epoch": 1, "ttl": 0, "cron": ""},
            21: {"chip": platform.processor() or platform.machine(), "bus": "virtual", "port": "", "driver": platform.python_version(), "protocol": "OMNIEVENT47", "firmware_region": platform.platform()},
            22: {"value": translation, "catalog_extension": translation not in {"tuple_to_english", "english_to_tuple", "ix_to_tuple", "hilbert_to_human", "crlt_merge"}},
            23: {"origin_node": self.host_pid, "merged_from": [], "merge_count": 0, "last_sync": ts, "conflict_state": "none"},
            24: "scheduled" if "SCHEDULE" in kind else "cascade",
            25: "text",
            26: omni_direction,
            27: "sha256_attestation",
            28: {"origin": self.host_pid, "author_chain": [self.actors["operator"].pid, actor.pid], "signature": payload_digest, "witness_count": 1, "first_seen": ts, "canonical_source": CATALOG_REPO},
            29: {"semver": "1.0.0", "build": "OMNIEVENT47-REF", "git_sha": os.environ.get("GITHUB_SHA", "local"), "revision": sequence, "compat_min": "envelope-v1", "compat_max": "hyper60-ref"},
            30: {"required_cubes": [], "required_catalogs": [f"{CATALOG_REPO}@{CATALOG_COMMIT}:{CATALOG_PATH}"], "required_gates": ["readback", "economic"], "required_profiles": [actor.profile]},
            31: "local_cache_snapshot",
            32: {"dollars": 0, "tokens_in": 0, "tokens_out": 0, "joules": None, "credits": 0},
            33: {"by_when": "", "timeout_ms": 0, "ttl": 0, "not_before": ts, "hard_stop": False},
            34: "local_only",
            35: "47D",
            36: {"value": "none", "catalog_extension": True},
            37: {"temp_c": None, "humidity_pct": None, "noise_db": None, "light_lux": None, "battery_pct": None, "thermal_zone": "", "power_source": "host"},
            38: "sha256_attestation",
            39: "none",
            40: "owner-only",
            41: "chain-of-custody",
            42: {"token": "none", "scopes": ["observe", "quant", "readback"], "expires_at": "", "issuer": self.actors["operator"].pid},
            43: {"required": 1, "achieved": 1, "tier": "third-seat-reference", "agents": [actor.pid]},
            44: "alive",
            45: {"cluster_id": self.run_pid, "graph_distance": level, "embedding": "", "neighborhood": self.previous_hash or "genesis"},
            46: {"algo": "sha256-chain", "pubkey": "", "sig": "", "digest": payload_digest},
            47: omega,
        }

    def emit(
        self,
        kind: str,
        actor_key: str,
        *,
        state: str,
        chain: str,
        level: int = 0,
        outcome: str = "PASS",
        target: str = "local",
        payload: dict[str, Any] | None = None,
        duration_ns: int = 0,
        parent_span_id: str | None = None,
    ) -> dict[str, Any]:
        payload = payload or {}
        actor = self.actors[actor_key]
        seq = len(self.events) + 1
        self.actor_seq[actor.pid] = self.actor_seq.get(actor.pid, 0) + 1
        ts = iso_now()
        wall_ms = time.time_ns() // 1_000_000
        payload_digest = sha256_obj(payload)
        span_id = sha256_bytes(f"{self.run_pid}|{seq}|{kind}|{payload_digest}".encode())[:16]
        row = {
            "schema": "OMNIEVENTv1.47D",
            "catalog_ref": {
                "repository": CATALOG_REPO,
                "commit": CATALOG_COMMIT,
                "path": CATALOG_PATH,
                "file_sha256": self.catalog.file_sha256,
                "registry_name": self.catalog.raw["name"],
                "ratified_catalogs": sorted(self.catalog.ratified),
            },
            "run_pid": self.run_pid,
            "event_pid": make_pid("EVT", f"{self.run_pid}|{seq}|{kind}|{payload_digest}"),
            "trace_id": self.trace_id,
            "span_id": span_id,
            "parent_span_id": parent_span_id or (self.events[-1]["span_id"] if self.events else None),
            "actor_sequence": self.actor_seq[actor.pid],
            "event_sequence": seq,
            "event_ts_utc": ts,
            "ingest_ts_utc": ts,
            "hlc": f"{wall_ms}:{seq:06d}:{self.host_pid[-8:]}",
            "mono_since_run_ns": time.monotonic_ns() - self.started_mono_ns,
            "duration_ns": int(duration_ns),
            "actor_agent_pid": actor.pid,
            "actor_os_pid": os.getpid(),
            "requested_by_pid": self.actors["operator"].pid,
            "scheduler_pid": self.actors["scheduler"].pid,
            "dispatcher_pid": self.actors["dispatcher"].pid,
            "worker_pid": self.actors["worker"].pid,
            "target_pid": make_pid("OBJ", target),
            "observer_pid": self.actors["mets"].pid,
            "host_pid": self.host_pid,
            "event_kind": kind,
            "state": state,
            "outcome": outcome,
            "level": level,
            "payload": payload,
            "payload_sha256": payload_digest,
            "catalog47": self.catalog.stamp(self._coords(actor, kind, state, chain, level, seq, ts, duration_ns, outcome, payload_digest, target)),
            "hyper60_ref": {
                "frame": "HyperBEHCS/BEHCS-1024",
                "tuple_dim": 60,
                "status": "CANON_FRAME_RUNTIME_ROUTE_REPORTED",
                "d1_d47_source": f"{CATALOG_REPO}@{CATALOG_COMMIT}:{CATALOG_PATH}",
                "d48_d60_semantics": "UNRESOLVED_IN_ACCESSIBLE_CATALOG_DO_NOT_INVENT",
                "selector": None,
            },
            "antecedent_hash": self.previous_hash,
        }
        row_hash = sha256_obj(row)
        row["row_hash"] = row_hash
        self.previous_hash = row_hash
        self.events.append(row)
        return row


def build_span(events: list[dict[str, Any]], run_pid: str, catalog_sha: str, merkle: str, full_sha: str, best: dict[str, Any]) -> bytes:
    actor_values = sorted({event["actor_agent_pid"] for event in events})
    kind_values = sorted({event["event_kind"] for event in events})
    state_values = sorted({event["state"] for event in events})
    actors = {value: i + 1 for i, value in enumerate(actor_values)}
    kinds = {value: i + 1 for i, value in enumerate(kind_values)}
    states = {value: i + 1 for i, value in enumerate(state_values)}
    header = (
        f"RUN_HEADER|schema=OMNISPANv1|run_pid={q(run_pid)}|events={len(events)}|"
        f"catalog47_sha256={catalog_sha}|actors={q(','.join(f'{i}:{v}' for v,i in actors.items()))}|"
        f"kinds={q(','.join(f'{i}:{v}' for v,i in kinds.items()))}|states={q(','.join(f'{i}:{v}' for v,i in states.items()))}|json=0"
    )
    t0 = int(events[0]["hlc"].split(":", 1)[0])
    lines = [header]
    for event in events:
        wall_ms = int(event["hlc"].split(":", 1)[0])
        payload = event["payload"]
        lines.append(
            "SPAN|"
            f"seq={event['event_sequence']}|dt_ms={wall_ms-t0}|actor={actors[event['actor_agent_pid']]}|"
            f"kind={kinds[event['event_kind']]}|state={states[event['state']]}|level={event['level']}|"
            f"outcome={q(event['outcome'])}|before={payload.get('bytes_before',0)}|payload={payload.get('payload_bytes',0)}|"
            f"catalog={payload.get('catalog_bytes',0)}|total={payload.get('total_bytes',0)}|"
            f"duration_ns={event['duration_ns']}|parent={q(event['parent_span_id'] or '')}|"
            f"row_hash={event['row_hash']}|json=0"
        )
    lines.append(
        f"RUN_FOOTER|run_pid={q(run_pid)}|events={len(events)}|merkle_root={merkle}|full_ndjson_sha256={full_sha}|"
        f"best_level={best['levels']}|best_total_bytes={best['total_bytes']}|best_bpc={best['bpc']:.6f}|json=0"
    )
    return ("\n".join(lines) + "\n").encode("utf-8")


def build_visual(events: list[dict[str, Any]], catalog: Catalog47, run_pid: str) -> dict[str, Any]:
    nodes = []
    edges = []
    for event in events:
        actor = event["catalog47"]["D01_ACTOR"]["coordinate"]
        layer = event["catalog47"]["D05_LAYER"]["coordinate"]
        sequence = event["catalog47"]["D20_TIME"]["coordinate"]["sequence"]
        nodes.append({
            "event_pid": event["event_pid"],
            "event_kind": event["event_kind"],
            "actor_agent_pid": event["actor_agent_pid"],
            "x_d1_actor_index": catalog.index_of(1, actor),
            "y_d5_layer_index": catalog.index_of(5, layer),
            "z_d20_sequence": sequence,
            "outcome": event["outcome"],
            "row_hash": event["row_hash"],
        })
        if event["parent_span_id"]:
            edges.append({"from_span": event["parent_span_id"], "to_span": event["span_id"], "relation": "D8_CHAIN"})
    return {
        "schema": "OMNI3D_CATALOG_SHADOW_v1",
        "run_pid": run_pid,
        "projection_axes": ["D1_ACTOR", "D5_LAYER", "D20_TIME.sequence"],
        "projection_status": "DERIVED_3D_SHADOW_NOT_FULL_47D_OR_60D_OBJECT",
        "catalog_source": f"{CATALOG_REPO}@{CATALOG_COMMIT}:{CATALOG_PATH}",
        "nodes": nodes,
        "edges": edges,
    }


def run(args: argparse.Namespace) -> None:
    outdir = Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    catalog = Catalog47(Path(args.catalog47))
    bpe = load_module(Path(args.multilevel_module))
    data = Path(args.input).read_bytes()[: args.bytes]
    if len(data) != args.bytes:
        raise EOFError(f"wanted {args.bytes}, got {len(data)}")
    input_sha = sha256_bytes(data)
    builder = EventBuilder(catalog, input_sha)
    builder.emit("RUN_OPENED", "operator", state="executing", chain="triggers", payload={"input_sha256": input_sha, "input_bytes": len(data), "levels_requested": args.levels, "merges_per_level": args.merges})
    builder.emit("SCHEDULER_READY", "scheduler", state="executing", chain="part_of", payload={"policy": "READBACK_AND_DELTA_BYTES_POSITIVE", "baseline_total_bytes": len(data)})

    candidates: list[dict[str, Any]] = []
    best = {"levels": 0, "total_bytes": len(data), "bpc": 8.0, "catalog_bytes": 0, "payload_bytes": len(data), "restore": True}
    best_internal: tuple[Any, ...] | None = None

    for level_count in range(1, args.levels + 1):
        builder.emit("SCHEDULE_PROPOSED", "scheduler", state="proposed", chain="triggers", level=level_count, payload={"candidate_level": level_count, "best_total_before": best["total_bytes"], "economic_rule": "candidate_total < best_total"})
        builder.emit("DISPATCHED", "dispatcher", state="queued", chain="feeds", level=level_count, payload={"dispatch_mode": "REFERENCE_LOCAL", "real_omnidispatcher_invoked": False})
        builder.emit("QUANT_STARTED", "worker", state="executing", chain="part_of", level=level_count, payload={"bytes_before": len(data), "quant": "BPE512_PLUS_ZSTD19"})
        t0 = time.perf_counter_ns()
        catalog_bytes, payload_bytes, levels, tokens, trace = bpe.encode(data, level_count, args.merges)
        encode_ns = time.perf_counter_ns() - t0
        t0 = time.perf_counter_ns()
        restored = bpe.decode(catalog_bytes, payload_bytes, levels, len(tokens), len(data))
        decode_ns = time.perf_counter_ns() - t0
        restore = restored == data and sha256_bytes(restored) == input_sha
        total = len(catalog_bytes) + len(payload_bytes)
        row = {
            "levels": level_count,
            "raw_bytes": len(data),
            "catalog_bytes": len(catalog_bytes),
            "payload_bytes": len(payload_bytes),
            "total_bytes": total,
            "token_count": len(tokens),
            "bpc": total * 8 / len(data),
            "payload_bpc": len(payload_bytes) * 8 / len(data),
            "restore": restore,
            "encode_ns": encode_ns,
            "decode_ns": decode_ns,
            "trace": trace,
        }
        candidates.append(row)
        builder.emit("QUANT_COMPLETED", "worker", state="completed" if restore else "failed", chain="proves", level=level_count, outcome="PASS" if restore else "HOLD", duration_ns=encode_ns, payload={**row, "bytes_before": len(data)})
        builder.emit("CATALOG_MINTED", "worker", state="completed", chain="feeds", level=level_count, duration_ns=encode_ns, payload={"catalog_bytes": len(catalog_bytes), "rules_total": sum(len(level.rules) for level in levels), "catalog_sha256": sha256_bytes(catalog_bytes), "catalog_scope": "self-contained"})
        builder.emit("WATCHER_PASS" if restore else "WATCHER_HOLD", "watcher", state="completed" if restore else "blocked", chain="proves", level=level_count, outcome="PASS" if restore else "HOLD", duration_ns=decode_ns, payload={"input_sha256": input_sha, "output_sha256": sha256_bytes(restored), "readback": restore})
        accepted = restore and total < best["total_bytes"]
        if accepted:
            best = row
            best_internal = (catalog_bytes, payload_bytes, levels, tokens)
        builder.emit("SCHEDULE_ACCEPTED" if accepted else "SCHEDULE_HELD", "scheduler", state="completed" if accepted else "blocked", chain="caused", level=level_count, outcome="PASS" if accepted else "HOLD", payload={"candidate_total": total, "best_total_after": best["total_bytes"], "delta_bytes": (len(data) if level_count == 1 else candidates[level_count - 2]["total_bytes"]) - total, "accepted": accepted, "readback": restore})
        builder.emit("METS_SAMPLE", "mets", state="completed", chain="observed_on", level=level_count, payload={"candidate_bpc": row["bpc"], "best_bpc": best["bpc"], "encode_ns": encode_ns, "decode_ns": decode_ns, "token_count": len(tokens)})

    if best_internal is None:
        raise AssertionError("no accepted candidate")
    best_catalog, best_payload, best_levels, best_tokens = best_internal
    t0 = time.perf_counter_ns()
    final_restored = bpe.decode(best_catalog, best_payload, best_levels, len(best_tokens), len(data))
    reverse_ns = time.perf_counter_ns() - t0
    final_ok = final_restored == data and sha256_bytes(final_restored) == input_sha
    builder.emit("REVERSE_TRAVERSAL", "watcher", state="executing", chain="proves", level=best["levels"], outcome="PASS" if final_ok else "HOLD", duration_ns=reverse_ns, payload={"best_level": best["levels"], "translation": "minted_glyph_to_byte", "bytes_restored": len(final_restored)})
    builder.emit("FINAL_READBACK", "watcher", state="completed" if final_ok else "blocked", chain="proves", level=best["levels"], outcome="PASS" if final_ok else "HOLD", payload={"input_sha256": input_sha, "output_sha256": sha256_bytes(final_restored), "readback": final_ok})
    builder.emit("METS_ROLLUP", "mets", state="completed", chain="observed_on", level=best["levels"], payload={"candidate_count": len(candidates), "accepted_levels": [row["levels"] for row in candidates if row["restore"] and row["total_bytes"] <= best["total_bytes"]], "best_level": best["levels"], "best_bpc": best["bpc"]})
    builder.emit("VIS_FRAME_EMITTED", "vision", state="completed", chain="mirrors", level=best["levels"], payload={"projection_axes": ["D1_ACTOR", "D5_LAYER", "D20_TIME.sequence"], "projection_status": "3D_SHADOW"})
    builder.emit("PORTAL_PACKED", "dispatcher", state="completed", chain="feeds", level=best["levels"], payload={"portal_schema": "OMNISPANv1", "event_count": 32})
    builder.emit("RUN_CLOSED", "operator", state="completed" if final_ok else "failed", chain="proves", level=best["levels"], outcome="PASS" if final_ok else "HOLD", payload={"best_level": best["levels"], "best_total_bytes": best["total_bytes"], "best_bpc": best["bpc"], "final_readback": final_ok})

    if len(builder.events) != 32:
        raise AssertionError(f"expected 32 events, got {len(builder.events)}")
    hashes = [event["row_hash"] for event in builder.events]
    merkle = merkle_root(hashes)
    ndjson = ("\n".join(json.dumps(event, sort_keys=True, separators=(",", ":"), ensure_ascii=False) for event in builder.events) + "\n").encode("utf-8")
    full_sha = sha256_bytes(ndjson)
    span = build_span(builder.events, builder.run_pid, catalog.file_sha256, merkle, full_sha, best)
    visual = build_visual(builder.events, catalog, builder.run_pid)
    visual_bytes = canonical_bytes(visual)

    metrics = {
        "schema": "OMNI_RUN_METRICS_v1",
        "run_pid": builder.run_pid,
        "event_count": len(builder.events),
        "input_bytes": len(data),
        "input_sha256": input_sha,
        "best_level": best["levels"],
        "codec_plus_catalog_bytes": best["total_bytes"],
        "codec_plus_catalog_bpc": best["bpc"],
        "full_event_bytes": len(ndjson),
        "span_bytes": len(span),
        "visual_bytes": len(visual_bytes),
        "portal_quant_ratio": len(ndjson) / len(span),
        "span_telemetry_bpc": len(span) * 8 / len(data),
        "visual_bpc": len(visual_bytes) * 8 / len(data),
        "compact_observability_bpc": (len(span) + len(visual_bytes)) * 8 / len(data),
        "compact_full_fabric_bpc": (best["total_bytes"] + len(span) + len(visual_bytes)) * 8 / len(data),
        "full_audit_fabric_bpc": (best["total_bytes"] + len(ndjson) + len(visual_bytes)) * 8 / len(data),
        "compact_observability_tax_pct": (len(span) + len(visual_bytes)) / (best["total_bytes"] + len(span) + len(visual_bytes)) * 100,
        "full_audit_tax_pct": (len(ndjson) + len(visual_bytes)) / (best["total_bytes"] + len(ndjson) + len(visual_bytes)) * 100,
        "merkle_root": merkle,
        "full_ndjson_sha256": full_sha,
        "span_sha256": sha256_bytes(span),
        "visual_sha256": sha256_bytes(visual_bytes),
        "catalog47_sha256": catalog.file_sha256,
        "catalog47_commit": CATALOG_COMMIT,
        "catalog47_status": {"base_d1_d24": "OMNI_V3_BASE", "ratified_extra": sorted(catalog.ratified), "other_d25_d47": "DRAFT_UNRATIFIED"},
        "hyper60_status": "FRAME_REFERENCED_D48_D60_NOT_MAPPED",
        "scheduler_mode": "REFERENCE_POLICY_NOT_LIVE_OMNISCHEDULER",
        "dispatcher_mode": "REFERENCE_LOCAL_NOT_LIVE_OMNIDISPATCHER",
        "omnimets_mode": "COMPATIBLE_ROLLUP_NOT_PACKAGE_INVOCATION",
        "omni3d_mode": "DERIVED_D1_D5_D20_SHADOW",
        "cross_vantage_hlc": False,
        "candidates": candidates,
    }

    (outdir / "omni_events_full.ndjson").write_bytes(ndjson)
    (outdir / "omni_events_span.hbp").write_bytes(span)
    (outdir / "omni3d_frame.json").write_bytes(visual_bytes + b"\n")
    (outdir / "omni_run_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    receipt = (
        f"OMNIRUNv1|run_pid={builder.run_pid}|events=32|input_bytes={len(data)}|input_sha256={input_sha}|"
        f"best_level={best['levels']}|codec_plus_catalog_bytes={best['total_bytes']}|codec_plus_catalog_bpc={best['bpc']:.6f}|"
        f"full_event_bytes={len(ndjson)}|span_bytes={len(span)}|visual_bytes={len(visual_bytes)}|"
        f"portal_quant_ratio={metrics['portal_quant_ratio']:.6f}|compact_observability_bpc={metrics['compact_observability_bpc']:.6f}|"
        f"compact_full_fabric_bpc={metrics['compact_full_fabric_bpc']:.6f}|full_audit_fabric_bpc={metrics['full_audit_fabric_bpc']:.6f}|"
        f"compact_tax_pct={metrics['compact_observability_tax_pct']:.6f}|full_audit_tax_pct={metrics['full_audit_tax_pct']:.6f}|"
        f"merkle_root={merkle}|ndjson_sha256={full_sha}|span_sha256={metrics['span_sha256']}|visual_sha256={metrics['visual_sha256']}|"
        f"catalog47_sha256={catalog.file_sha256}|catalog47_commit={CATALOG_COMMIT}|final_readback={int(final_ok)}|"
        f"scheduler=REFERENCE|dispatcher=REFERENCE|omnimets=COMPAT|omni3d=D1_D5_D20_SHADOW|hyper60=UNMAPPED_EXTENSION|json=0\n"
    )
    (outdir / "omni_run_receipt.hbp").write_text(receipt, encoding="utf-8")
    print(receipt, end="")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--bytes", type=int, default=1_000_000)
    parser.add_argument("--levels", type=int, default=3)
    parser.add_argument("--merges", type=int, default=512)
    parser.add_argument("--catalog47", required=True)
    parser.add_argument("--multilevel-module", required=True)
    parser.add_argument("--output-dir", required=True)
    run(parser.parse_args())


if __name__ == "__main__":
    main()
