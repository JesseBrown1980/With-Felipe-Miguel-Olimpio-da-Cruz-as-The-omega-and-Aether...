from __future__ import annotations

import hashlib
import json
import shutil
import sys
import unittest
from collections import Counter
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any


MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import glyph_hyperstack_first_floor_v1 as subject  # noqa: E402


EXPECTED_ROLES = ("generator", "reflector", "reviewer")
EXPECTED_PRIMES30 = (
    11, 13, 17, 19, 23, 29, 31, 37, 41, 43,
    47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
    97, 101, 103, 107, 109, 113, 127, 131, 137, 139,
)


def canonical_tlv_bytes(value: Any) -> bytes:
    def tlv(tag: bytes, payload: bytes) -> bytes:
        return tag + str(len(payload)).encode("ascii") + b":" + payload

    if value is None:
        return tlv(b"N", b"")
    if isinstance(value, bool):
        return tlv(b"B", b"1" if value else b"0")
    if isinstance(value, int):
        return tlv(b"I", str(value).encode("ascii"))
    if isinstance(value, float):
        return tlv(b"F", value.hex().encode("ascii"))
    if isinstance(value, str):
        return tlv(b"S", value.encode("utf-8"))
    if isinstance(value, bytes):
        return tlv(b"Y", value)
    if isinstance(value, Mapping):
        pairs = []
        for key, item in value.items():
            encoded_key = canonical_tlv_bytes(key)
            pairs.append((encoded_key, encoded_key + canonical_tlv_bytes(item)))
        return tlv(b"M", b"".join(pair for _, pair in sorted(pairs)))
    if isinstance(value, (list, tuple)):
        return tlv(b"L", b"".join(canonical_tlv_bytes(item) for item in value))
    raise TypeError(type(value).__name__)


def field(value: Any, name: str) -> Any:
    if isinstance(value, Mapping):
        return value[name]
    return getattr(value, name)


def glyph_ids(frame: Any) -> list[int]:
    glyphs = field(frame, "glyphs")
    if hasattr(glyphs, "tolist"):
        glyphs = glyphs.tolist()
    return list(glyphs)


def hookwall_fields(pass_record: Mapping[str, Any]) -> tuple[float, bool, str]:
    hookwall = pass_record["hookwall"]
    net_gain = float(hookwall["net_gain"])
    accepted = bool(hookwall["accepted"])
    status = str(hookwall["status"])
    return net_gain, accepted, status


class GlyphHyperstackFirstFloorContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        # One body must make merges pay rent; the other is deliberately too small
        # and irregular for a catalog entry to earn positive net gain.
        cls.cubes = {
            "cube-repeat": b"\x00\x11\x22\x33\x44" * 128,
            "cube-tiny-randomlike": hashlib.sha256(
                b"glyph-hyperstack-tiny-no-repeat"
            ).digest()[:11],
        }
        cls.kwargs = {
            "passes_per_cycle": 10,
            "three_rule_cycles": 3,
            "merges_per_pass": 1,
        }
        cls.first = subject.build_first_floor(dict(cls.cubes), **cls.kwargs)
        cls.second = subject.build_first_floor(dict(cls.cubes), **cls.kwargs)

    def test_arbitrary_bytes_roundtrip_through_behcs1024_frame(self) -> None:
        payloads = [
            b"",
            bytes(range(256)),
            bytes((i * 73 + 19) & 0xFF for i in range(1_031)),
            b"\x00\xff\x00\x80\x7f" * 41 + b"\x01\x02\x03",
        ]
        for raw in payloads:
            with self.subTest(length=len(raw), sha256=hashlib.sha256(raw).hexdigest()):
                frame = subject.behcs1024_encode(raw)
                base = glyph_ids(frame)
                self.assertTrue(all(type(token) is int for token in base))
                self.assertTrue(all(0 <= token <= 1023 for token in base))
                self.assertEqual(subject.behcs1024_decode(frame), raw)

    def test_canonical_seats_and_rule_of_three_vantages(self) -> None:
        self.assertEqual(len(subject.CANONICAL_SEATS), 27)
        self.assertEqual(len({repr(seat) for seat in subject.CANONICAL_SEATS}), 27)
        seat_bytes = json.dumps(
            subject.CANONICAL_SEATS,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode("utf-8")
        self.assertEqual(hashlib.sha256(seat_bytes).hexdigest(),
                         subject.CANONICAL_SEATS_LEGACY_SORTED_JSON_SHA256)
        self.assertEqual(hashlib.sha256(canonical_tlv_bytes(
            subject.CANONICAL_SEATS)).hexdigest(), subject.CANONICAL_SEATS_SHA256)
        canonical_l3 = MODULE_DIR / "canonical-l3-27.hbp"
        self.assertEqual(hashlib.sha256(canonical_l3.read_bytes()).hexdigest(),
                         subject.CANONICAL_L3_HBP_SHA256)

        self.assertEqual(tuple(subject.ROLES), EXPECTED_ROLES)
        self.assertEqual(tuple(subject.PRIMES30), EXPECTED_PRIMES30)
        self.assertEqual(tuple(subject.TRIADS),
                         tuple(tuple(range(i * 3, i * 3 + 3)) for i in range(10)))
        self.assertEqual(len(subject.TRIADS), 10)
        self.assertTrue(all(isinstance(triad, Sequence) and len(triad) == 3
                            for triad in subject.TRIADS))
        self.assertEqual(len(subject.VANTAGES), 30)

        role_counts = Counter(field(vantage, "role") for vantage in subject.VANTAGES)
        triad_counts = Counter(int(field(vantage, "triad"))
                               for vantage in subject.VANTAGES)
        self.assertEqual(role_counts, Counter({role: 10 for role in EXPECTED_ROLES}))
        self.assertEqual(triad_counts, Counter({triad: 3 for triad in range(1, 11)}))
        self.assertEqual(len({field(row, "pid") for row in subject.VANTAGES}), 30)
        for index, (prime, vantage) in enumerate(
                zip(EXPECTED_PRIMES30, subject.VANTAGES, strict=True)):
            role = EXPECTED_ROLES[index % 3]
            expected_pid = hashlib.sha256(
                f"WATCHER|{prime}|{role}".encode("utf-8")
            ).hexdigest()[:16]
            self.assertEqual(int(field(vantage, "index")), index + 1)
            self.assertEqual(int(field(vantage, "triad")), index // 3 + 1)
            self.assertEqual(field(vantage, "role"), role)
            self.assertEqual(int(field(vantage, "prime")), prime)
            self.assertEqual(field(vantage, "pid"), expected_pid)
        for triad in range(1, 11):
            roles = {
                field(vantage, "role")
                for vantage in subject.VANTAGES
                if int(field(vantage, "triad")) == triad
            }
            self.assertEqual(roles, set(EXPECTED_ROLES))

    def test_each_cube_has_one_cold_and_thirty_three_rule_passes(self) -> None:
        self.assertEqual(set(self.first["cubes"]), set(self.cubes))
        for cube_id, cube_result in self.first["cubes"].items():
            with self.subTest(cube=cube_id):
                self.assertIsInstance(cube_result["cold"], Mapping)
                passes = cube_result["passes"]
                self.assertEqual(1 + len(passes), 31)
                self.assertEqual(
                    [(row["cycle"], row["pass_in_cycle"]) for row in passes],
                    [(cycle, pass_in_cycle)
                     for cycle in range(1, 4)
                     for pass_in_cycle in range(1, 11)],
                )

    def test_every_accepted_merge_is_positive_and_exactly_reversible(self) -> None:
        accepted_total = 0
        for cube_id, raw in self.cubes.items():
            cube_result = self.first["cubes"][cube_id]
            source_sha = hashlib.sha256(raw).hexdigest()
            self.assertEqual(cube_result["source_sha256"], source_sha)
            self.assertEqual(cube_result["restored_sha256"], source_sha)
            self.assertIs(cube_result["restore"], True)
            self.assertEqual(subject.reverse_cube_language(cube_result), raw)

            base = glyph_ids(cube_result["frame"])
            self.assertTrue(all(type(token) is int and 0 <= token <= 1023
                                for token in base))
            self.assertTrue(all(type(token) is int and token >= 0
                                for token in cube_result["final_tokens"]))
            language_body = {
                "domain": "ASOLARIA-GLYPH-LANGUAGE-V1",
                "rules": cube_result["accepted_merges"],
                "tokens": cube_result["final_tokens"],
            }
            self.assertEqual(
                hashlib.sha256(canonical_tlv_bytes(language_body)).hexdigest(),
                cube_result["language_sha256"],
            )

            for merge in cube_result["accepted_merges"]:
                accepted_total += 1
                self.assertGreaterEqual(int(merge["new_id"]), 1024)
                self.assertGreater(float(merge["net_gain"]), 0.0)
                self.assertIs(merge["restore"], True)
                self.assertEqual(merge["source_sha256"], source_sha)
                self.assertEqual(merge["restored_sha256"], source_sha)

        # Prevent a vacuous implementation from satisfying the exact-reversal
        # checks by holding every proposal, including the highly repetitive cube.
        self.assertGreater(accepted_total, 0)

    def test_hookwall_holds_every_nonpositive_gain(self) -> None:
        for cube_id, cube_result in self.first["cubes"].items():
            for pass_record in cube_result["passes"]:
                net_gain, accepted, status = hookwall_fields(pass_record)
                actual = int(pass_record["actual_occurrences"])
                gross = int(pass_record["gross_saved_bytes"])
                catalog = int(pass_record["catalog_bytes"])
                recomputed_net = gross - catalog
                self.assertEqual(gross, actual * 2, (cube_id, pass_record))
                self.assertEqual(int(pass_record["net_gain_bytes"]), recomputed_net)
                self.assertEqual(net_gain, recomputed_net)
                if accepted:
                    self.assertEqual(
                        int(pass_record["input_tokens"]) - int(pass_record["output_tokens"]),
                        actual,
                    )
                    self.assertGreater(recomputed_net, 0)
                else:
                    self.assertEqual(pass_record["input_tokens"], pass_record["output_tokens"])
                if net_gain <= 0:
                    self.assertFalse(accepted, (cube_id, pass_record))
                    self.assertTrue(status.startswith("HELD"),
                                    (cube_id, pass_record))

        tiny = self.first["cubes"]["cube-tiny-randomlike"]
        self.assertEqual(tiny["accepted_merges"], [])
        tiny_holds = [
            hookwall_fields(row)
            for row in tiny["passes"]
            if hookwall_fields(row)[0] <= 0
        ]
        self.assertEqual(len(tiny_holds), 30)
        self.assertTrue(all(not accepted and status.startswith("HELD")
                            for _, accepted, status in tiny_holds))

    def test_same_inputs_produce_identical_output(self) -> None:
        self.assertEqual(self.first, self.second)
        body = dict(self.first)
        result_sha = body.pop("result_sha256")
        self.assertEqual(hashlib.sha256(canonical_tlv_bytes(body)).hexdigest(), result_sha)

    def test_hbp_hbi_are_default_and_json_is_debug_only(self) -> None:
        def assert_lf_sealed(directory: Path) -> None:
            artifacts = [path for path in directory.iterdir() if path.is_file()]
            for path in artifacts:
                body = path.read_bytes()
                self.assertNotIn(b"\r\n", body, path.name)
                self.assertEqual(body, body.replace(b"\r\n", b"\n"), path.name)

            for row in (directory / "SHA256SUMS").read_bytes().splitlines():
                expected, encoded_name = row.split(b"  ", 1)
                target = directory / encoded_name.decode("ascii")
                canonical_lf = target.read_bytes().replace(b"\r\n", b"\n")
                self.assertEqual(hashlib.sha256(canonical_lf).hexdigest(),
                                 expected.decode("ascii"), target.name)

            for sidecar in directory.glob("*.sha256"):
                expected, encoded_name = sidecar.read_bytes().strip().split(b"  ", 1)
                target = directory / encoded_name.decode("ascii")
                canonical_lf = target.read_bytes().replace(b"\r\n", b"\n")
                self.assertEqual(hashlib.sha256(canonical_lf).hexdigest(),
                                 expected.decode("ascii"), sidecar.name)

        root = MODULE_DIR / "_test-receipts"
        shutil.rmtree(root, ignore_errors=True)
        root.mkdir()
        try:
            subject._write_receipts(self.first, root)
            self.assertEqual(list(root.glob("*.json")), [])
            self.assertTrue((root / "FIRST-FLOOR-RESULT.hbp").is_file())
            self.assertTrue((root / "FIRST-FLOOR-RESULT.hbi").is_file())
            for path in (root / "FIRST-FLOOR-RESULT.hbp",
                         root / "FIRST-FLOOR-RESULT.hbi"):
                self.assertTrue(all(row.endswith("|json=0")
                                    for row in path.read_text().splitlines()))
            assert_lf_sealed(root)
            debug = root / "debug"
            subject._write_receipts(self.first, debug, debug_json=True)
            self.assertTrue((debug / "first-floor-result.json").is_file())
            assert_lf_sealed(debug)
        finally:
            shutil.rmtree(root, ignore_errors=True)

    def test_selftest_units_are_five_byte_aligned_with_hold_control(self) -> None:
        cubes = subject._selftest_cubes(27)
        self.assertEqual(len(cubes), 27)
        self.assertEqual(len(set(cubes.values())), 27)
        for raw in list(cubes.values())[:-1]:
            self.assertEqual(len(raw) % 5, 0)
            self.assertGreaterEqual(len(raw), 400)
            self.assertEqual(raw, raw[:40] * (len(raw) // 40))
        self.assertEqual(len(list(cubes.values())[-1]), 11)

    def test_four_axis_27_power_4_formation_remains_held(self) -> None:
        formation = self.first["formation_27_power_4"]
        self.assertEqual(formation["status"], "HELD_UNDEFINED_AXES")
        self.assertEqual(27 ** 4, 531_441)


if __name__ == "__main__":
    unittest.main()
