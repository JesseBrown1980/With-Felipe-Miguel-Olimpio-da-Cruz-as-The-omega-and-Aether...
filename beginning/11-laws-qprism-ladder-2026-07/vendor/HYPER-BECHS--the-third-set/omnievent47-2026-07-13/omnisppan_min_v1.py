#!/usr/bin/env python3
"""OMNISPAN_MINv1: compact portal over a canonical OMNIEVENT47 store.

The full NDJSON remains the authoritative audit body. This portal carries a fixed
schema codebook, actor dictionary, base-36 deltas and the full-store Merkle/file
roots. It intentionally omits each 64-hex row hash from every SPAN because those
hashes are already committed by the Merkle root and retained in the full store.

This is a storage/transport profile, not a replacement for the authoritative rows.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

KIND_ORDER = [
    "CATALOG_MINTED",
    "DISPATCHED",
    "FINAL_READBACK",
    "METS_ROLLUP",
    "METS_SAMPLE",
    "PORTAL_PACKED",
    "QUANT_COMPLETED",
    "QUANT_STARTED",
    "REVERSE_TRAVERSAL",
    "RUN_CLOSED",
    "RUN_OPENED",
    "SCHEDULER_READY",
    "SCHEDULE_ACCEPTED",
    "SCHEDULE_HELD",
    "SCHEDULE_PROPOSED",
    "VIS_FRAME_EMITTED",
    "WATCHER_PASS",
]
STATE_ORDER = ["blocked", "completed", "executing", "proposed", "queued"]
SCHEMA_FIELDS = [
    "event_sequence",
    "wall_delta_ms",
    "actor_index",
    "kind_code",
    "state_code",
    "level",
    "pass_bit",
    "bytes_before",
    "payload_bytes",
    "catalog_bytes",
    "total_bytes",
    "duration_ns",
    "parent_sequence",
]


def canonical(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def b36(number: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    number = int(number)
    if number < 0:
        raise ValueError("base36 values must be non-negative")
    if number == 0:
        return "0"
    out = ""
    while number:
        number, rem = divmod(number, 36)
        out = chars[rem] + out
    return out


def build(full_path: Path, metrics_path: Path) -> tuple[bytes, dict]:
    full_bytes = full_path.read_bytes()
    events = [json.loads(line) for line in full_bytes.decode("utf-8").splitlines() if line]
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    if len(events) != metrics["event_count"]:
        raise ValueError("event count mismatch")
    kinds = {event["event_kind"] for event in events}
    unknown_kinds = sorted(kinds - set(KIND_ORDER))
    if unknown_kinds:
        raise ValueError(f"unregistered event kinds: {unknown_kinds}")
    states = {event["state"] for event in events}
    unknown_states = sorted(states - set(STATE_ORDER))
    if unknown_states:
        raise ValueError(f"unregistered states: {unknown_states}")

    actors = sorted({event["actor_agent_pid"] for event in events})
    actor_codes = {actor: index for index, actor in enumerate(actors)}
    kind_codes = {kind: index for index, kind in enumerate(KIND_ORDER)}
    state_codes = {state: index for index, state in enumerate(STATE_ORDER)}
    span_to_sequence = {event["span_id"]: event["event_sequence"] for event in events}
    t0 = int(events[0]["hlc"].split(":", 1)[0])
    schema_sha = sha256(canonical({
        "schema": "OMNISPAN_MINv1",
        "fields": SCHEMA_FIELDS,
        "kind_order": KIND_ORDER,
        "state_order": STATE_ORDER,
        "actor_encoding": "AGT-prefix-implicit-16hex-suffix",
        "integer_encoding": "base36",
        "integrity": "full-store-row-hashes-plus-footer-merkle-and-file-sha",
    }))

    actor_suffixes = []
    for actor in actors:
        prefix, sep, suffix = actor.partition("-")
        if sep != "-" or prefix != "AGT" or len(suffix) != 16:
            raise ValueError(f"actor PID not compactable: {actor}")
        actor_suffixes.append(suffix)

    run_suffix = events[0]["run_pid"].split("-", 1)[-1]
    lines = [
        "H|1|"
        f"{run_suffix}|{b36(len(events))}|{','.join(actor_suffixes)}|"
        f"{metrics['catalog47_sha256']}|{schema_sha}"
    ]
    for event in events:
        payload = event.get("payload") or {}
        parent_sequence = span_to_sequence.get(event.get("parent_span_id"), 0)
        values = [
            event["event_sequence"],
            int(event["hlc"].split(":", 1)[0]) - t0,
            actor_codes[event["actor_agent_pid"]],
            kind_codes[event["event_kind"]],
            state_codes[event["state"]],
            event["level"],
            1 if event["outcome"] == "PASS" else 0,
            payload.get("bytes_before", 0),
            payload.get("payload_bytes", 0),
            payload.get("catalog_bytes", 0),
            payload.get("total_bytes", 0),
            event.get("duration_ns", 0),
            parent_sequence,
        ]
        lines.append("|".join(b36(value) for value in values))
    lines.append(
        "F|"
        f"{metrics['merkle_root']}|{metrics['full_ndjson_sha256']}|"
        f"{b36(metrics['best_level'])}|{b36(metrics['codec_plus_catalog_bytes'])}"
    )
    raw = ("\n".join(lines) + "\n").encode("utf-8")
    if sha256(full_bytes) != metrics["full_ndjson_sha256"]:
        raise ValueError("full NDJSON hash mismatch")
    return raw, {
        "schema": "OMNISPAN_MINv1",
        "schema_sha256": schema_sha,
        "bytes": len(raw),
        "sha256": sha256(raw),
        "actor_count": len(actors),
        "event_count": len(events),
        "integrity_dependency": "authoritative omni_events_full.ndjson retained and matched by footer roots",
        "per_span_row_hash_inline": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", required=True)
    parser.add_argument("--metrics", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    full_path = Path(args.full)
    metrics_path = Path(args.metrics)
    raw, portal = build(full_path, metrics_path)
    Path(args.output).write_bytes(raw)

    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    raw_bytes = metrics["input_bytes"]
    best_bytes = metrics["codec_plus_catalog_bytes"]
    visual_bytes = metrics["visual_bytes"]
    portal_bytes = portal["bytes"]
    metrics.update({
        "span_min_schema": portal["schema"],
        "span_min_schema_sha256": portal["schema_sha256"],
        "span_min_bytes": portal_bytes,
        "span_min_sha256": portal["sha256"],
        "span_min_bpc": portal_bytes * 8 / raw_bytes,
        "portal_min_quant_ratio": metrics["full_event_bytes"] / portal_bytes,
        "span_min_only_tax_pct": portal_bytes / (best_bytes + portal_bytes) * 100,
        "compact_min_observability_bpc": (portal_bytes + visual_bytes) * 8 / raw_bytes,
        "compact_min_full_fabric_bpc": (best_bytes + portal_bytes + visual_bytes) * 8 / raw_bytes,
        "compact_min_observability_tax_pct": (portal_bytes + visual_bytes) / (best_bytes + portal_bytes + visual_bytes) * 100,
        "span_min_integrity_dependency": portal["integrity_dependency"],
    })
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    receipt = (
        f"OMNISPANMINv1|run_pid={metrics['run_pid']}|events={portal['event_count']}|actors={portal['actor_count']}|"
        f"bytes={portal_bytes}|bpc={metrics['span_min_bpc']:.6f}|portal_ratio={metrics['portal_min_quant_ratio']:.6f}|"
        f"span_only_tax_pct={metrics['span_min_only_tax_pct']:.6f}|with_3d_bpc={metrics['compact_min_observability_bpc']:.6f}|"
        f"with_3d_full_fabric_bpc={metrics['compact_min_full_fabric_bpc']:.6f}|"
        f"with_3d_tax_pct={metrics['compact_min_observability_tax_pct']:.6f}|sha256={portal['sha256']}|"
        f"schema_sha256={portal['schema_sha256']}|row_hashes_inline=0|full_store_required=1|json=0\n"
    )
    Path(args.receipt).write_text(receipt, encoding="utf-8")
    print(receipt, end="")


if __name__ == "__main__":
    main()
