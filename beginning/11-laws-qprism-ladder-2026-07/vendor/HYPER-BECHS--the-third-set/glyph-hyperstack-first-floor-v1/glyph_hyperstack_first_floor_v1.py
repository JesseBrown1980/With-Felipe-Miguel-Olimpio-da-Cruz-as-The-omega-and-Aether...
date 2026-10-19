#!/usr/bin/env python3
"""Shadow-only first floor for the Asolaria glyph hyperstack.

This executable performs a reversible BEHCS-1024 language-mint experiment.  It
does not call live daemons, alter cubes, or claim that the four axes needed for
27**4 have been defined.  Thirty deterministic PID viewpoints (ten rule-of-three
triads) propose and review one graph merge on each measured training pass.
"""
from __future__ import annotations

import argparse
import hashlib
import math
from collections import Counter, defaultdict
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Iterable

ROLES = ("generator", "reflector", "reviewer")
PRIMES30 = (11, 13, 17, 19, 23, 29, 31, 37, 41, 43,
            47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
            97, 101, 103, 107, 109, 113, 127, 131, 137, 139)
TRIADS = tuple(tuple(range(i * 3, i * 3 + 3)) for i in range(10))

REGISTRY_SOURCE_SHA256 = "26f3f56bcd3d21c8173b51a263fa11638bf7e378b33e01bea180a36318efd2f3"
REGISTRY_MIRROR_SHA256 = "401a8c399b351ab1ee1475f2c88cd540b68eded77e00d5f377562df5b988aa7b"
CANONICAL_SEATS_SHA256 = "385d89dc20ec2b9988444be5070e309926763dd4fc3462e8703622a53678cef8"
CANONICAL_SEATS_LEGACY_SORTED_JSON_SHA256 = "b2a301c2b7a9911dfe7be8086deeef6c8aa8653147fc024851b3df2eab25dc13"
CANONICAL_L3_HBP_SHA256 = "57b97a3189fa803d574a4b37548b6de398a33d00b5db2c8449f384b33b721290"

_SEAT_ROWS = (
    ("AGT-L3-CHIEF-ASOLARIA-H2621", "209c8ac2102e7eff", 1241, "level3_chief", 706, 0),
    ("AGT-L3-COUNCIL-H009F", "c7cc0e31fea19303", 1242, "level3_council", 561, 1),
    ("AGT-L3-COUNCIL-H014D", "cb2ccb4a461aa6c9", 1243, "level3_council", 842, 4),
    ("AGT-L3-COUNCIL-H01B2", "1558c464721b8edf", 1244, "level3_council", 100, 0),
    ("AGT-L3-COUNCIL-H0D70", "c26813ff3ed6b16c", 1245, "level3_council", 1023, 2),
    ("AGT-L3-COUNCIL-H1426", "4485cbea2cc4b334", 1246, "level3_council", 1002, 3),
    ("AGT-L3-COUNCIL-H1723", "c37f5a23e6139e6c", 1247, "level3_council", 547, 2),
    ("AGT-L3-COUNCIL-H18D2", "166dd9398ea962da", 1248, "level3_council", 313, 0),
    ("AGT-L3-COUNCIL-H2030", "2e9f94c31675acb7", 1249, "level3_council", 195, 3),
    ("AGT-L3-COUNCIL-H22EC", "ed432449d9a3b213", 1250, "level3_council", 73, 3),
    ("AGT-L3-ACER-INTERVIEW-COPILOT-001-H315E5-W150-P00-N00789", "acb713699b38b8ae", 1330, "level3_supervisor", 873, 4),
    ("AGT-L3-NEURO100B-APPROVAL", "ecdb6f6bec36c87b", 1331, "level3_supervisor", 875, 3),
    ("AGT-L3-NEURO100B-CLOUD", "d0f6e6ff8e03a250", 1332, "level3_supervisor", 767, 4),
    ("AGT-L3-NEURO100B-DEEP", "dc23dd15f57a6125", 1333, "level3_supervisor", 277, 2),
    ("AGT-L3-NEURO100B-GC", "0060aa8665cf4fdd", 1334, "level3_supervisor", 646, 0),
    ("AGT-L3-NEURO100B-GLOBAL", "69c3fb05a6dcf8e3", 1335, "level3_supervisor", 773, 1),
    ("AGT-L3-NEURO100B-HOUSEHOLD", "97fbd637fbc81194", 1336, "level3_supervisor", 567, 1),
    ("AGT-L3-NEURO100B-LITERAL", "82e613cdab40af9a", 1337, "level3_supervisor", 973, 4),
    ("AGT-L3-NEURO100B-LIVE", "1d39bfb8d2083b60", 1338, "level3_supervisor", 952, 1),
    ("AGT-L3-NEURO100B-MEDICAL", "c0e0667a58fa0204", 1339, "level3_supervisor", 634, 0),
    ("AGT-L3-NEURO100B-NO", "14e4fe9f6915bba9", 1340, "level3_supervisor", 671, 1),
    ("AGT-L3-NEURO100B-RAW", "451eb53fc89b1bd5", 1341, "level3_supervisor", 319, 3),
    ("AGT-L3-NEURO100B-REAL", "6a3607012106a6e4", 1342, "level3_supervisor", 769, 3),
    ("AGT-L3-NEURO100B-REMOTE", "44e5d2e05c147e87", 1343, "level3_supervisor", 736, 1),
    ("AGT-L3-NEURO100B-RUVIEW", "cfbd2b1c272926cf", 1344, "level3_supervisor", 796, 2),
    ("AGT-L3-NEURO100B-SWEEP", "678f0c17bca2df31", 1345, "level3_supervisor", 23, 1),
    ("AGT-L3-NEURO100B-TOKEN", "34c490ab40817f8f", 1346, "level3_supervisor", 171, 3),
)

CANONICAL_SEATS = tuple({
    "name": name, "pid": pid, "hilbert": hilbert, "class": klass,
    "g1024": g1024, "g5": g5, "lane_mod3": hilbert % 3,
} for name, pid, hilbert, klass, g1024, g5 in _SEAT_ROWS)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pid8(label: str) -> str:
    return sha256_hex(label.encode("utf-8"))[:16]


VANTAGES = tuple({
    "index": i + 1,
    "triad": i // 3 + 1,
    "role": ROLES[i % 3],
    "prime": prime,
    "pid": pid8(f"WATCHER|{prime}|{ROLES[i % 3]}"),
} for i, prime in enumerate(PRIMES30))


def _tlv(tag: bytes, payload: bytes) -> bytes:
    """Length-delimit one deterministic HBP/TLV value."""
    return tag + str(len(payload)).encode("ascii") + b":" + payload


def canonical_tlv_bytes(value: Any) -> bytes:
    """Return cross-host canonical bytes without making JSON the hot path."""
    if value is None:
        return _tlv(b"N", b"")
    if isinstance(value, bool):
        return _tlv(b"B", b"1" if value else b"0")
    if isinstance(value, int):
        return _tlv(b"I", str(value).encode("ascii"))
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("non-finite float is not canonical")
        return _tlv(b"F", value.hex().encode("ascii"))
    if isinstance(value, str):
        return _tlv(b"S", value.encode("utf-8"))
    if isinstance(value, bytes):
        return _tlv(b"Y", value)
    if isinstance(value, Mapping):
        encoded = []
        for key, item in value.items():
            key_bytes = canonical_tlv_bytes(key)
            encoded.append((key_bytes, key_bytes + canonical_tlv_bytes(item)))
        payload = b"".join(pair for _, pair in sorted(encoded, key=lambda row: row[0]))
        return _tlv(b"M", payload)
    if isinstance(value, (list, tuple)):
        return _tlv(b"L", b"".join(canonical_tlv_bytes(item) for item in value))
    raise TypeError(f"unsupported canonical type: {type(value).__name__}")


def behcs1024_encode(raw: bytes) -> dict[str, Any]:
    glyphs: list[int] = []
    for offset in range(0, len(raw), 5):
        chunk = raw[offset:offset + 5].ljust(5, b"\0")
        value = int.from_bytes(chunk, "big")
        glyphs.extend(((value >> 30) & 1023, (value >> 20) & 1023,
                       (value >> 10) & 1023, value & 1023))
    return {"orig_len": len(raw), "glyphs": glyphs, "rung": "BEHCS1024_EXACT_5BYTE_4GLYPH"}


def behcs1024_decode(frame: dict[str, Any]) -> bytes:
    glyphs = list(frame["glyphs"])
    orig_len = int(frame["orig_len"])
    if len(glyphs) % 4:
        raise ValueError("glyph count must be divisible by four")
    if any(not isinstance(g, int) or isinstance(g, bool) or not 0 <= g <= 1023 for g in glyphs):
        raise ValueError("base glyph outside BEHCS-1024")
    restored = bytearray()
    for i in range(0, len(glyphs), 4):
        value = (glyphs[i] << 30) | (glyphs[i + 1] << 20) | (glyphs[i + 2] << 10) | glyphs[i + 3]
        restored.extend(value.to_bytes(5, "big"))
    if orig_len > len(restored):
        raise ValueError("orig_len exceeds framed body")
    return bytes(restored[:orig_len])


def _replace_pair(tokens: list[int], pair: tuple[int, int], new_id: int) -> tuple[list[int], int]:
    out: list[int] = []
    count = 0
    i = 0
    while i < len(tokens):
        if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == pair:
            out.append(new_id)
            count += 1
            i += 2
        else:
            out.append(tokens[i])
            i += 1
    return out, count


def _expand_tokens(tokens: Iterable[int], rules: list[dict[str, int]]) -> list[int]:
    by_id = {row["new_id"]: (row["left"], row["right"]) for row in rules}
    out: list[int] = []
    stack = list(reversed(list(tokens)))
    while stack:
        token = stack.pop()
        if token in by_id:
            left, right = by_id[token]
            stack.append(right)
            stack.append(left)
        else:
            if not 0 <= token <= 1023:
                raise ValueError(f"unresolved glyph {token}")
            out.append(token)
    return out


def reverse_cube_language(cube_result: dict[str, Any]) -> bytes:
    base = _expand_tokens(cube_result["final_tokens"], cube_result["accepted_merges"])
    return behcs1024_decode({"orig_len": cube_result["frame"]["orig_len"], "glyphs": base})


def _candidate_rows(tokens: list[int], pass_no: int, cube_id: str) -> list[dict[str, Any]]:
    counts: Counter[tuple[int, int]] = Counter()
    actual_counts: Counter[tuple[int, int]] = Counter()
    last_selected_start: dict[tuple[int, int], int] = {}
    left_neighbors: dict[int, set[int]] = defaultdict(set)
    right_neighbors: dict[int, set[int]] = defaultdict(set)
    for start, (left, right) in enumerate(zip(tokens, tokens[1:])):
        pair = (left, right)
        counts[pair] += 1
        previous_start = last_selected_start.get(pair, -2)
        if start > previous_start + 1:
            actual_counts[pair] += 1
            last_selected_start[pair] = start
        left_neighbors[left].add(right)
        right_neighbors[right].add(left)
    rows = []
    for pair, raw_count in counts.items():
        actual = actual_counts[pair]
        gross = actual * 2
        catalog = 6
        net = gross - catalog
        branching = len(left_neighbors[pair[0]]) + len(right_neighbors[pair[1]])
        forward = raw_count * 1024 - branching
        reverse = actual * 1024 + net
        tie = int(sha256_hex(f"{cube_id}|{pass_no}|{pair[0]}|{pair[1]}".encode())[:8], 16)
        rows.append({"pair": [pair[0], pair[1]], "raw_count": raw_count,
                     "actual_occurrences": actual, "gross_saved_bytes": gross,
                     "catalog_bytes": catalog, "net_gain_bytes": net,
                     "forward_gnn_score": forward, "reverse_gain_score": reverse,
                     "tie": tie})
    return sorted(rows, key=lambda row: (-row["net_gain_bytes"], -row["actual_occurrences"], row["pair"]))


def _vantage_vote(vantage: dict[str, Any], candidates: list[dict[str, Any]]) -> dict[str, Any]:
    if not candidates:
        return {"pid": vantage["pid"], "triad": vantage["triad"], "role": vantage["role"], "pair": None}
    prime = vantage["prime"]

    def key(row: dict[str, Any]) -> tuple[int, int, int, int]:
        jitter = (row["tie"] * prime) % 257
        if vantage["role"] == "generator":
            return row["forward_gnn_score"], row["net_gain_bytes"], row["actual_occurrences"], jitter
        if vantage["role"] == "reflector":
            return row["reverse_gain_score"], row["net_gain_bytes"], row["forward_gnn_score"], jitter
        hookwall = 1 if row["net_gain_bytes"] > 0 else 0
        return hookwall, min(row["forward_gnn_score"], row["reverse_gain_score"]), row["net_gain_bytes"], jitter

    chosen = max(candidates, key=key)
    return {"pid": vantage["pid"], "triad": vantage["triad"], "role": vantage["role"],
            "pair": chosen["pair"], "forward_gnn_score": chosen["forward_gnn_score"],
            "reverse_gain_score": chosen["reverse_gain_score"], "eligible": chosen["net_gain_bytes"] > 0}


def _train_cube(cube_id: str, raw: bytes, seat: dict[str, Any], passes: int,
                merges_per_pass: int) -> dict[str, Any]:
    frame = behcs1024_encode(raw)
    tokens = list(frame["glyphs"])
    rules: list[dict[str, int]] = []
    source_sha = sha256_hex(raw)
    cold = {"raw_bytes": len(raw), "base_glyphs": len(tokens), "source_sha256": source_sha,
            "base_language": "BEHCS1024_NOT_ENGLISH_TOKENS", "restore": behcs1024_decode(frame) == raw}
    pass_rows = []
    held = 0
    for pass_index in range(passes):
        start_tokens = len(tokens)
        for merge_slot in range(merges_per_pass):
            slot_input_tokens = len(tokens)
            candidates = _candidate_rows(tokens, pass_index + 1, cube_id)
            votes = [_vantage_vote(vantage, candidates) for vantage in VANTAGES]
            histogram = Counter(tuple(row["pair"]) if row["pair"] is not None else None for row in votes)
            probabilities = [count / len(VANTAGES) for count in histogram.values()]
            entropy = round(-sum(p * math.log2(p) for p in probabilities if p), 12)
            by_pair = {tuple(row["pair"]): row for row in candidates}
            voted_pairs = [pair for pair in histogram if pair is not None]
            if voted_pairs:
                chosen_pair = max(voted_pairs, key=lambda pair: (
                    histogram[pair], by_pair[pair]["net_gain_bytes"],
                    by_pair[pair]["actual_occurrences"], tuple(-x for x in pair)))
                chosen = by_pair[chosen_pair]
            else:
                chosen_pair = None
                chosen = None
            decision = "HELD_NO_CANDIDATE"
            new_id = None
            rule = None
            if chosen is not None and chosen["net_gain_bytes"] > 0:
                new_id = 1024 + len(rules)
                updated, actual = _replace_pair(tokens, chosen_pair, new_id)
                if actual != chosen["actual_occurrences"]:
                    raise AssertionError("replacement count drift")
                rule = {"new_id": new_id, "left": chosen_pair[0], "right": chosen_pair[1],
                        "pass": pass_index + 1, "slot": merge_slot + 1,
                        "net_gain": chosen["net_gain_bytes"],
                        "net_gain_bytes": chosen["net_gain_bytes"]}
                rules.append(rule)
                tokens = updated
                decision = "ACCEPTED_BOBBY_SHANNON_HOOKWALL"
            else:
                if chosen is not None:
                    decision = "HELD_NONPOSITIVE_NET_GAIN"
                held += 1
            restored = reverse_cube_language({"frame": frame, "final_tokens": tokens,
                                               "accepted_merges": rules})
            if restored != raw:
                raise AssertionError("reverse path failed during measured pass")
            restored_sha = sha256_hex(restored)
            if rule is not None:
                rule.update({
                    "restore": restored == raw,
                    "source_sha256": source_sha,
                    "restored_sha256": restored_sha,
                })
            pass_rows.append({
                "pass": pass_index + 1, "cycle": pass_index // 10 + 1,
                "within_cycle": pass_index % 10 + 1,
                "pass_in_cycle": pass_index % 10 + 1, "merge_slot": merge_slot + 1,
                "input_tokens": slot_input_tokens, "output_tokens": len(tokens),
                "candidate_count": len(candidates), "chosen_pair": list(chosen_pair) if chosen_pair else None,
                "new_id": new_id, "decision": decision,
                "actual_occurrences": chosen["actual_occurrences"] if chosen else 0,
                "gross_saved_bytes": chosen["gross_saved_bytes"] if chosen else 0,
                "catalog_bytes": chosen["catalog_bytes"] if chosen else 0,
                "net_gain_bytes": chosen["net_gain_bytes"] if chosen else 0,
                "forward_gnn_score": chosen["forward_gnn_score"] if chosen else 0,
                "reverse_gain_score": chosen["reverse_gain_score"] if chosen else 0,
                "shannon_vote_entropy_bits": entropy,
                "vote_histogram": {"none" if k is None else f"{k[0]}:{k[1]}": v for k, v in sorted(histogram.items(), key=lambda item: str(item[0]))},
                "vote_receipts": votes,
                "hookwall": {
                    "net_gain": chosen["net_gain_bytes"] if chosen else 0,
                    "accepted": rule is not None,
                    "status": decision,
                },
                "measurement_restore": True,
            })
        if merges_per_pass == 0:
            held += 1
            pass_rows.append({"pass": pass_index + 1, "cycle": pass_index // 10 + 1,
                              "within_cycle": pass_index % 10 + 1,
                              "pass_in_cycle": pass_index % 10 + 1,
                              "decision": "HELD_ZERO_SLOTS",
                              "input_tokens": start_tokens, "output_tokens": len(tokens),
                              "hookwall": {"net_gain": 0, "accepted": False,
                                           "status": "HELD_ZERO_SLOTS"},
                              "measurement_restore": True})
    result = {
        "cube_id": cube_id, "seat": seat, "cold": cold,
        "frame": {"orig_len": frame["orig_len"], "glyphs": list(frame["glyphs"]),
                  "rung": frame["rung"]},
        "passes": pass_rows, "accepted_merges": rules, "held_events": held,
        "final_tokens": tokens, "source_sha256": source_sha,
        "restored_sha256": sha256_hex(reverse_cube_language({"frame": frame,
                                                               "final_tokens": tokens,
                                                               "accepted_merges": rules})),
    }
    result["restore"] = result["source_sha256"] == result["restored_sha256"]
    result["language_sha256"] = sha256_hex(
        canonical_tlv_bytes({"domain": "ASOLARIA-GLYPH-LANGUAGE-V1",
                             "rules": rules, "tokens": tokens})
    )
    if not result["restore"]:
        raise AssertionError("final reverse path failed")
    return result


def build_first_floor(cubes: dict[str, bytes], passes_per_cycle: int = 10,
                      three_rule_cycles: int = 3, merges_per_pass: int = 1,
                      *, legacy_json_intake: bool = False,
                      source_manifest_sha256: str = "NONE",
                      source_manifest_format: str = "IN_MEMORY") -> dict[str, Any]:
    if passes_per_cycle < 1 or three_rule_cycles < 1 or merges_per_pass < 0:
        raise ValueError("invalid training dimensions")
    total_passes = passes_per_cycle * three_rule_cycles
    ordered = sorted(cubes.items())
    results = {cube_id: _train_cube(cube_id, raw, CANONICAL_SEATS[i % len(CANONICAL_SEATS)],
                                    total_passes, merges_per_pass)
               for i, (cube_id, raw) in enumerate(ordered)}
    unique_languages = len({row["language_sha256"] for row in results.values()})
    output = {
        "schema": "ASOLARIA-GLYPH-HYPERSTACK-FIRST-FLOOR-V1",
        "evidence": "SHADOW_MEASURED_NO_LIVE_PROMOTION",
        "digest_codec": "HBP_TLV_V1",
        "topology": {
            "canonical_seats": len(CANONICAL_SEATS), "input_cubes": len(results),
            "status": "MEASURED_27_SEAT_FIRST_FLOOR" if len(results) == 27 else "TEST_SUBSET",
            "registry_source_sha256": REGISTRY_SOURCE_SHA256,
            "registry_mirror_sha256": REGISTRY_MIRROR_SHA256,
            "canonical_seats_sha256": CANONICAL_SEATS_SHA256,
            "canonical_seats_legacy_sorted_json_sha256":
                CANONICAL_SEATS_LEGACY_SORTED_JSON_SHA256,
            "canonical_l3_hbp_sha256": CANONICAL_L3_HBP_SHA256,
        },
        "intake": {"legacy_json_intake": int(legacy_json_intake),
                   "source_manifest_sha256": source_manifest_sha256,
                   "source_manifest_format": source_manifest_format},
        "training": {"passes_per_cycle": passes_per_cycle,
                     "three_rule_cycles": three_rule_cycles, "passes_per_cube": total_passes,
                     "triads": len(TRIADS), "vantages": len(VANTAGES), "roles": list(ROLES),
                     "merges_per_pass": merges_per_pass},
        "vantages": VANTAGES,
        "cubes": results,
        "summary": {
            "cubes_completed": len(results),
            "all_restore": all(row["restore"] for row in results.values()),
            "measured_pass_rows": sum(len(row["passes"]) for row in results.values()),
            "accepted_merges": sum(len(row["accepted_merges"]) for row in results.values()),
            "held_events": sum(row["held_events"] for row in results.values()),
            "unique_glyph_languages": unique_languages,
        },
        "formation_27_power_4": {
            "arithmetic_objects": 27 ** 4,
            "status": "HELD_UNDEFINED_AXES",
            "missing": ["axis_1_semantics", "axis_2_semantics", "axis_3_semantics", "axis_4_semantics",
                        "positioning_law", "interlevel_training_receipt"],
        },
        "claim_boundary": {
            "behcs1024_roundtrip": "MEASURED",
            "thirty_pid_votes": "MEASURED_DETERMINISTIC_SCORERS_NOT_LEARNED_GNN",
            "glyph_language": "MEASURED_REVERSIBLE",
            "compression_record": "NOT_CLAIMED",
            "live_absorption": "HELD",
        },
    }
    output["result_sha256"] = sha256_hex(canonical_tlv_bytes(output))
    return output


def _verify_result_hash(result: Mapping[str, Any]) -> None:
    body = dict(result)
    expected = body.pop("result_sha256", None)
    actual = sha256_hex(canonical_tlv_bytes(body))
    if expected != actual:
        raise ValueError("result_sha256 does not match canonical HBP/TLV body")


def _balanced_rows_inputs(snapshot_root: Path, rows: list[dict[str, Any]],
                          count: int) -> dict[str, bytes]:
    if count < 1:
        raise ValueError("count must be positive")
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        buckets[row["axis"]].append(row)
    for rows in buckets.values():
        rows.sort(key=lambda row: (row["lx"], row["file"]))
    axes = sorted(buckets)
    if not axes or sum(len(bucket) for bucket in buckets.values()) < count:
        raise ValueError("manifest does not contain enough balanced inputs")
    selected: list[dict[str, Any]] = []
    for index in range(max(len(bucket) for bucket in buckets.values())):
        for axis in axes:
            if index < len(buckets[axis]):
                selected.append(buckets[axis][index])
                if len(selected) == count:
                    break
        if len(selected) == count:
            break
    cubes: dict[str, bytes] = {}
    root = snapshot_root.resolve()
    for row in selected:
        relative = Path(row["snapshot"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError(f"unsafe snapshot path: {relative}")
        path = (snapshot_root / relative).resolve()
        try:
            path.relative_to(root)
        except ValueError as error:
            raise ValueError(f"snapshot escapes root: {path}") from error
        raw = path.read_bytes()
        if len(raw) != row["bytes"] or sha256_hex(raw) != row["sha256"]:
            raise ValueError(f"source drift: {path}")
        cube_id = f"{row['axis']}-LX-{row['lx']:03d}"
        if cube_id in cubes:
            raise ValueError(f"duplicate cube id: {cube_id}")
        cubes[cube_id] = raw
    return cubes


def _hbp_unescape(value: str) -> str:
    output = []
    index = 0
    escapes = {"\\": "\\", "p": "|", "n": "\n"}
    while index < len(value):
        if value[index] != "\\":
            output.append(value[index])
            index += 1
            continue
        index += 1
        if index == len(value) or value[index] not in escapes:
            raise ValueError("invalid HBP escape")
        output.append(escapes[value[index]])
        index += 1
    return "".join(output)


def _parse_hbp_line(line: str) -> tuple[str, dict[str, str]]:
    parts = line.rstrip("\r\n").split("|")
    if not parts or not parts[0]:
        raise ValueError("HBP row missing tag")
    fields: dict[str, str] = {}
    for part in parts[1:]:
        if not part or "=" not in part:
            raise ValueError("malformed HBP field")
        key, value = part.split("=", 1)
        if key in fields:
            raise ValueError(f"duplicate HBP field: {key}")
        fields[key] = _hbp_unescape(value)
    if fields.get("json") != "0":
        raise ValueError("HBP row must declare json=0")
    return parts[0], fields


def _hbp_manifest_inputs(snapshot_root: Path, manifest_path: Path,
                         count: int) -> dict[str, bytes]:
    rows: list[dict[str, Any]] = []
    for line in manifest_path.read_text(encoding="utf-8").splitlines():
        if not line:
            continue
        tag, fields = _parse_hbp_line(line)
        if tag != "OLDCUBEREF":
            continue
        filename = fields.get("file", "")
        if not (filename.startswith("LX-") and filename.endswith(".md")):
            continue
        coordinate = filename[3:-3]
        if not coordinate.isdigit():
            raise ValueError(f"invalid LX file: {filename}")
        digest = fields.get("sha256", "")
        if len(digest) != 64 or any(char not in "0123456789abcdef" for char in digest):
            raise ValueError(f"invalid SHA-256 for {filename}")
        try:
            size = int(fields["bytes"])
            axis = fields["axis"]
            snapshot = fields["snapshot"]
        except (KeyError, ValueError) as error:
            raise ValueError(f"incomplete OLDCUBEREF for {filename}") from error
        rows.append({"axis": axis, "lx": int(coordinate), "file": filename,
                     "bytes": size, "sha256": digest, "snapshot": snapshot})
    return _balanced_rows_inputs(snapshot_root, rows, count)


def _legacy_json_manifest_inputs(snapshot_root: Path, manifest_path: Path,
                                 count: int) -> dict[str, bytes]:
    import json

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    return _balanced_rows_inputs(snapshot_root, list(manifest["cohort"]), count)


def _hbp(tag: str, **fields: Any) -> str:
    def esc(value: Any) -> str:
        return str(value).replace("\\", "\\\\").replace("|", "\\p").replace("\n", "\\n")
    return tag + "".join(f"|{key}={esc(value)}" for key, value in fields.items()) + "|json=0"


def _write_receipts(result: dict[str, Any], output_dir: Path,
                    debug_json: bool = False) -> None:
    _verify_result_hash(result)
    output_dir.mkdir(parents=True, exist_ok=True)

    def write_lf(path: Path, text: str, encoding: str) -> None:
        path.write_bytes(text.encode(encoding))

    rows = [_hbp("FIRSTFLOORHDR", schema=result["schema"], evidence=result["evidence"],
                 digest_codec=result["digest_codec"], result_sha256=result["result_sha256"],
                 cubes=result["summary"]["cubes_completed"], seats=result["topology"]["canonical_seats"],
                 canonical_seats_sha256=result["topology"]["canonical_seats_sha256"],
                 canonical_seats_legacy_sorted_json_sha256=
                     result["topology"]["canonical_seats_legacy_sorted_json_sha256"],
                 canonical_l3_hbp_sha256=result["topology"]["canonical_l3_hbp_sha256"],
                 vantages=result["training"]["vantages"], triads=result["training"]["triads"],
                 passes_per_cube=result["training"]["passes_per_cube"],
                 source_manifest_sha256=result["intake"]["source_manifest_sha256"],
                 source_manifest_format=result["intake"]["source_manifest_format"],
                 legacy_json_intake=result["intake"]["legacy_json_intake"],
                 debug_json=int(debug_json), fire=0)]
    for index, seat in enumerate(CANONICAL_SEATS, 1):
        rows.append(_hbp("SEAT", index=index, name=seat["name"], pid=seat["pid"],
                         hilbert=seat["hilbert"], seat_class=seat["class"],
                         g1024=seat["g1024"], g5=seat["g5"], lane_mod3=seat["lane_mod3"]))
    for vantage in VANTAGES:
        rows.append(_hbp("VANTAGE", index=vantage["index"], triad=vantage["triad"],
                         role=vantage["role"], prime=vantage["prime"], pid=vantage["pid"],
                         pid_lineage="WATCHER|prime|role"))
    for cube_id in sorted(result["cubes"]):
        cube = result["cubes"][cube_id]
        rows.append(_hbp("CUBE", id=cube["cube_id"], seat_pid=cube["seat"]["pid"],
                         source_sha256=cube["source_sha256"], language_sha256=cube["language_sha256"],
                         cold_glyphs=cube["cold"]["base_glyphs"], final_tokens=len(cube["final_tokens"]),
                         accepted=len(cube["accepted_merges"]), held=cube["held_events"], restore=int(cube["restore"])))
        for merge in cube["accepted_merges"]:
            rows.append(_hbp("MERGE", cube=cube["cube_id"], new_id=merge["new_id"],
                             left=merge["left"], right=merge["right"], n=merge["pass"],
                             slot=merge["slot"], net_gain=merge["net_gain"],
                             source_sha256=merge["source_sha256"],
                             restored_sha256=merge["restored_sha256"],
                             restore=int(merge["restore"])))
        for row in cube["passes"]:
            pair = row.get("chosen_pair")
            pair_text = "none" if pair is None else f"{pair[0]}:{pair[1]}"
            hookwall = row["hookwall"]
            rows.append(_hbp("PASS", cube=cube["cube_id"], n=row["pass"], cycle=row["cycle"],
                             within=row["within_cycle"], slot=row.get("merge_slot", 0),
                             chosen_pair=pair_text, new_id=row.get("new_id", "none"),
                             input_tokens=row["input_tokens"], output_tokens=row["output_tokens"],
                             candidates=row.get("candidate_count", 0),
                             actual=row.get("actual_occurrences", 0),
                             gross=row.get("gross_saved_bytes", 0),
                             catalog=row.get("catalog_bytes", 0), net=row.get("net_gain_bytes", 0),
                             forward=row.get("forward_gnn_score", 0),
                             reverse=row.get("reverse_gain_score", 0),
                             shannon_entropy=row.get("shannon_vote_entropy_bits", 0),
                             decision=row["decision"], hookwall_net=hookwall["net_gain"],
                             hookwall_accepted=int(hookwall["accepted"]),
                             hookwall_status=hookwall["status"],
                             restore=int(row["measurement_restore"])))
    rows.append(_hbp("FORMATION", name="27x27x27x27", arithmetic=27 ** 4,
                     status=result["formation_27_power_4"]["status"], live_promotion="HELD"))
    rows.append(_hbp("COMPLETE", all_restore=int(result["summary"]["all_restore"]),
                     pass_rows=result["summary"]["measured_pass_rows"],
                     result_sha256=result["result_sha256"], status="PASS"))
    hbp_path = output_dir / "FIRST-FLOOR-RESULT.hbp"
    write_lf(hbp_path, "\n".join(rows) + "\n", "utf-8")
    hbi_rows = [_hbp("HBI", row=i + 1, sha256=sha256_hex(row.encode("utf-8")),
                     hex=row.encode("utf-8").hex()) for i, row in enumerate(rows)]
    hbi_path = output_dir / "FIRST-FLOOR-RESULT.hbi"
    write_lf(hbi_path, "\n".join(hbi_rows) + "\n", "ascii")
    primary = [hbp_path, hbi_path]
    json_path = output_dir / "first-floor-result.json"
    json_sidecar = output_dir / "first-floor-result.json.sha256"
    if debug_json:
        import json

        write_lf(json_path, json.dumps(result, indent=2, sort_keys=True), "utf-8")
        primary.append(json_path)
    else:
        json_path.unlink(missing_ok=True)
        json_sidecar.unlink(missing_ok=True)
    sidecars = []
    for path in primary:
        sidecar = path.with_name(path.name + ".sha256")
        write_lf(sidecar, f"{sha256_hex(path.read_bytes())}  {path.name}\n", "ascii")
        sidecars.append(sidecar)
    manifest_entries = []
    for path in (*primary, *sidecars):
        manifest_entries.append(f"{sha256_hex(path.read_bytes())}  {path.name}")
    manifest_path = output_dir / "SHA256SUMS"
    write_lf(manifest_path, "\n".join(manifest_entries) + "\n", "ascii")
    write_lf(manifest_path.with_name("SHA256SUMS.sha256"),
             f"{sha256_hex(manifest_path.read_bytes())}  SHA256SUMS\n", "ascii")


def _selftest_cubes(count: int) -> dict[str, bytes]:
    if count < 1:
        raise ValueError("selftest cube count must be positive")
    cubes = {}
    for i in range(count):
        seed = hashlib.sha256(f"FIRST-FLOOR-SELFTEST-{i}".encode()).digest()
        unit = seed + hashlib.sha256(b"UNIT-LINEAGE|" + seed).digest()[:8]
        body = unit * (10 + i % 5)
        if i == count - 1:
            body = hashlib.sha256(b"FIRST-FLOOR-HELD-CONTROL").digest()[:11]
        cubes[f"selftest-{i:02d}"] = body
    return cubes


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    test = sub.add_parser("selftest")
    test.add_argument("--cubes", type=int, default=27)
    test.add_argument("--output-dir")
    run = sub.add_parser("run")
    run.add_argument("--snapshot-root", required=True)
    source = run.add_mutually_exclusive_group(required=True)
    source.add_argument("--source-hbp-manifest")
    source.add_argument("--legacy-json-manifest")
    run.add_argument("--count", type=int, default=27)
    run.add_argument("--output-dir", required=True)
    for command in (test, run):
        command.add_argument("--passes-per-cycle", type=int, default=10)
        command.add_argument("--three-rule-cycles", type=int, default=3)
        command.add_argument("--merges-per-pass", type=int, default=1)
        command.add_argument("--debug-json", action="store_true")
    args = parser.parse_args()
    if args.command == "selftest":
        cubes = _selftest_cubes(args.cubes)
        manifest_sha = "NONE"
        manifest_format = "SELFTEST"
        legacy_json = False
    else:
        manifest_path = Path(args.source_hbp_manifest or args.legacy_json_manifest)
        manifest_sha = sha256_hex(manifest_path.read_bytes())
        if args.source_hbp_manifest:
            cubes = _hbp_manifest_inputs(Path(args.snapshot_root), manifest_path, args.count)
            manifest_format = "HBP"
            legacy_json = False
        else:
            cubes = _legacy_json_manifest_inputs(Path(args.snapshot_root), manifest_path, args.count)
            manifest_format = "LEGACY_JSON"
            legacy_json = True
    result = build_first_floor(cubes, args.passes_per_cycle, args.three_rule_cycles,
                               args.merges_per_pass, legacy_json_intake=legacy_json,
                               source_manifest_sha256=manifest_sha,
                               source_manifest_format=manifest_format)
    if args.output_dir:
        _write_receipts(result, Path(args.output_dir), debug_json=args.debug_json)
    print(_hbp("FIRSTFLOORVERDICT", cubes=result["summary"]["cubes_completed"],
               passes=result["summary"]["measured_pass_rows"],
               accepted=result["summary"]["accepted_merges"], held=result["summary"]["held_events"],
               languages=result["summary"]["unique_glyph_languages"],
               restore=int(result["summary"]["all_restore"]),
               source_manifest_format=result["intake"]["source_manifest_format"],
               legacy_json_intake=result["intake"]["legacy_json_intake"],
               formation_27p4=result["formation_27_power_4"]["status"],
               result_sha256=result["result_sha256"], status="PASS"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
