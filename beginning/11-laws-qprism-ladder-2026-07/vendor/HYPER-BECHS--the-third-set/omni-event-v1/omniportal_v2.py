#!/usr/bin/env python3
"""OMNIPORTALv2 compact index for OMNIEVENTv1 rows.

The authoritative full NDJSON rows remain the audit body. This portal carries:
- run-local dictionaries for the changing Catalog47 axes;
- delta wall/HLC and monotonic duration;
- actor sequence, level and outcome;
- span and parent-span IDs;
- every full 256-bit event hash.

The event hash commits the full 47D coordinates and Hyper60 selector, so the portal
need not duplicate every selector tooth. The Merkle root binds the ordered leaves.
"""
from __future__ import annotations
import argparse, base64, json, struct, zlib
from pathlib import Path

FIELDS = [
    ("actor", lambda e: e["actor"]),
    ("kind", lambda e: e["kind"]),
    ("target", lambda e: e.get("dst", "")),
    ("state", lambda e: e["d47_ext"]["dims"][6]),
    ("gate", lambda e: e["d47_ext"]["dims"][5]),
    ("chain", lambda e: e["d47_ext"]["dims"][7]),
    ("proof", lambda e: e["d47_ext"]["dims"][10]),
    ("surface", lambda e: e["d47_ext"]["dims"][12]),
    ("intent", lambda e: e["d47_ext"]["dims"][23]),
    ("translation", lambda e: e["d47_ext"]["dims"][21]),
    ("omni", lambda e: e["d47_ext"]["dims"][25]),
]
OUTCOME_TO_INT = {"PASS": 0, "HOLD": 1, "ERROR": 2}
INT_TO_OUTCOME = {v: k for k, v in OUTCOME_TO_INT.items()}


def varint(n: int) -> bytes:
    if n < 0:
        raise ValueError("varint requires non-negative integer")
    out = bytearray()
    while True:
        byte = n & 0x7F
        n >>= 7
        if n:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return bytes(out)


def read_varint(data: bytes, pos: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while True:
        if pos >= len(data) or shift > 63:
            raise ValueError("invalid varint")
        byte = data[pos]
        pos += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, pos
        shift += 7


def encode_string(value: str) -> bytes:
    raw = value.encode("utf-8")
    return varint(len(raw)) + raw


def decode_string(data: bytes, pos: int) -> tuple[str, int]:
    n, pos = read_varint(data, pos)
    end = pos + n
    if end > len(data):
        raise ValueError("truncated string")
    return data[pos:end].decode("utf-8"), end


def build(events: list[dict]) -> tuple[bytes, dict]:
    if not events:
        raise ValueError("no events")
    dictionaries = {}
    indices = {}
    for name, getter in FIELDS:
        values = sorted({getter(event) for event in events})
        dictionaries[name] = values
        indices[name] = {value: i for i, value in enumerate(values)}
    start_ms = int(events[0]["hlc"].split(":")[0])
    blob = bytearray(b"OPV2")
    blob += varint(len(events))
    for name, _ in FIELDS:
        values = dictionaries[name]
        blob += varint(len(values))
        for value in values:
            blob += encode_string(value)
    for event in events:
        for name, getter in FIELDS:
            blob += varint(indices[name][getter(event)])
        layer = event["d47_ext"]["dims"][4]
        level = 0 if layer == "runtime" else int(layer.replace("quant-L", ""))
        blob += varint(level)
        blob += varint(OUTCOME_TO_INT[event["outcome"]])
        blob += varint(event["actor_sequence"])
        ms, logical, _ = event["hlc"].split(":")
        blob += varint(int(ms) - start_ms)
        blob += varint(int(logical))
        blob += varint(event["mono_end_ns"] - event["mono_start_ns"])
        blob += bytes.fromhex(event["span_id"])
        blob += bytes.fromhex(event["parent_span_id"]) if event["parent_span_id"] else b"\x00" * 8
        blob += bytes.fromhex(event["event_hash"])
    compressed = zlib.compress(bytes(blob), 9)
    encoded = base64.urlsafe_b64encode(compressed).decode("ascii").rstrip("=")
    header = (
        f"RUN_HEADER|schema=OMNIPORTALv2|run_pid={events[0]['run_pid']}|"
        f"event_count={len(events)}|start_ms={start_ms}|"
        f"catalog={events[0]['d47_ext']['catalog']}|codec=zlib+base64url|json=0"
    )
    body = f"SPAN_BLOB|data={encoded}|json=0"
    leaves = [event["event_hash"] for event in events]
    summary = {
        "event_count": len(events),
        "start_ms": start_ms,
        "binary_bytes": len(blob),
        "compressed_bytes": len(compressed),
        "base64_bytes": len(encoded),
        "event_hashes": leaves,
    }
    return (header + "\n" + body + "\n").encode("utf-8"), summary


def finish(prefix: bytes, summary: dict, run_summary: dict) -> bytes:
    footer = (
        f"RUN_FOOTER|event_count={summary['event_count']}|"
        f"chain_head={run_summary['chain_head']}|merkle_root={run_summary['merkle_root']}|"
        f"final_readback={'PASS' if run_summary['final_readback'] else 'HOLD'}|"
        f"catalog47=ADDRESSED|hyper60=COMMITTED_BY_EVENT_HASH|json=0\n"
    )
    return prefix + footer.encode("utf-8")


def decode(portal: bytes) -> dict:
    lines = portal.decode("utf-8").splitlines()
    if len(lines) != 3 or not lines[0].startswith("RUN_HEADER|") or not lines[2].startswith("RUN_FOOTER|"):
        raise ValueError("invalid portal framing")
    data_field = next(x for x in lines[1].split("|") if x.startswith("data="))[5:]
    padded = data_field + "=" * ((4 - len(data_field) % 4) % 4)
    raw = zlib.decompress(base64.urlsafe_b64decode(padded))
    if raw[:4] != b"OPV2":
        raise ValueError("invalid binary magic")
    pos = 4
    count, pos = read_varint(raw, pos)
    dictionaries = {}
    for name, _ in FIELDS:
        n, pos = read_varint(raw, pos)
        values = []
        for _ in range(n):
            value, pos = decode_string(raw, pos)
            values.append(value)
        dictionaries[name] = values
    events = []
    for _ in range(count):
        values = {}
        for name, _ in FIELDS:
            index, pos = read_varint(raw, pos)
            values[name] = dictionaries[name][index]
        level, pos = read_varint(raw, pos)
        outcome, pos = read_varint(raw, pos)
        actor_sequence, pos = read_varint(raw, pos)
        dt_ms, pos = read_varint(raw, pos)
        logical, pos = read_varint(raw, pos)
        duration_ns, pos = read_varint(raw, pos)
        span_id = raw[pos:pos + 8].hex(); pos += 8
        parent = raw[pos:pos + 8].hex(); pos += 8
        event_hash = raw[pos:pos + 32].hex(); pos += 32
        events.append({**values, "level": level, "outcome": INT_TO_OUTCOME[outcome],
                       "actor_sequence": actor_sequence, "dt_ms": dt_ms,
                       "logical": logical, "duration_ns": duration_ns,
                       "span_id": span_id, "parent_span_id": parent,
                       "event_hash": event_hash})
    if pos != len(raw):
        raise ValueError("trailing bytes")
    return {"event_count": count, "events": events, "binary_bytes": len(raw)}


def run(events_path: Path, summary_path: Path, output_dir: Path):
    events = [json.loads(line) for line in events_path.read_text(encoding="utf-8").splitlines() if line]
    run_summary = json.loads(summary_path.read_text(encoding="utf-8"))
    prefix, portal_summary = build(events)
    portal = finish(prefix, portal_summary, run_summary)
    decoded = decode(portal)
    if decoded["event_count"] != len(events):
        raise AssertionError("decoded event count mismatch")
    if [x["event_hash"] for x in decoded["events"]] != [x["event_hash"] for x in events]:
        raise AssertionError("event hash list mismatch")
    output_dir.mkdir(parents=True, exist_ok=True)
    portal_path = output_dir / "omni_events_span_v2.hbp"
    portal_path.write_bytes(portal)
    codec_bytes = run_summary["codec_plus_catalog_bytes"]
    raw_bytes = run_summary["raw_bytes"]
    metrics = {
        "schema": "OMNIPORTALv2-SUMMARY",
        **portal_summary,
        "portal_bytes": len(portal),
        "observability_bpc": len(portal) * 8 / raw_bytes,
        "observability_pct_of_codec": len(portal) / codec_bytes * 100,
        "fabric_bpc": (codec_bytes + len(portal)) * 8 / raw_bytes,
        "full_event_bytes": run_summary["telemetry_full_bytes"],
        "portal_quant_ratio": run_summary["telemetry_full_bytes"] / len(portal),
        "merkle_root": run_summary["merkle_root"],
        "chain_head": run_summary["chain_head"],
        "full_events_retained_elsewhere": True,
    }
    (output_dir / "omni_portal_v2_summary.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    hbp_line = (
        f"OMNIPORTALv2|event_count={len(events)}|portal_bytes={len(portal)}|"
        f"observability_bpc={metrics['observability_bpc']:.6f}|"
        f"observability_pct={metrics['observability_pct_of_codec']:.6f}|"
        f"fabric_bpc={metrics['fabric_bpc']:.6f}|"
        f"full_event_bytes={metrics['full_event_bytes']}|"
        f"portal_quant_ratio={metrics['portal_quant_ratio']:.6f}|"
        f"merkle_root={metrics['merkle_root']}|full_events_retained_elsewhere=1|json=0"
    )
    (output_dir / "omni_portal_v2_summary.hbp").write_text(hbp_line + "\n", encoding="utf-8")
    print(hbp_line)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--events", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    run(Path(args.events), Path(args.summary), Path(args.output_dir))


if __name__ == "__main__":
    main()
