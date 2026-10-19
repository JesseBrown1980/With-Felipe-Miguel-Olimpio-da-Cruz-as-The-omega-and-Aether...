import concurrent.futures
import contextlib
import importlib.util
import io
from pathlib import Path
import random
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("asolaria_rime_tool", ROOT / "tools" / "rime.py")
RIME = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RIME)


def sparse_body(size=240_000):
    body = bytearray(size)
    for n, start in enumerate(range(37, size, 997)):
        length = 1 + (n % 41)
        end = min(size, start + length)
        body[start:end] = bytes(1 + ((n + i) % 255) for i in range(end - start))
    return bytes(body)


class RimeToolTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def make_slice(self, data=None):
        data = sparse_body() if data is None else data
        source = self.root / "body.bin"
        source.write_bytes(data)
        rime_path, body_bytes, slice_bytes, runs = RIME.write_rime(str(source))
        self.assertEqual(body_bytes, len(data))
        self.assertGreater(runs, 0)
        return source, Path(rime_path), data, slice_bytes

    def test_sparse_slice_roundtrip_and_random_ranges(self):
        _, rime_path, data, _ = self.make_slice()
        rng = random.Random(20260728)
        with RIME.Body(str(rime_path)) as body:
            self.assertEqual(b"".join(body.stream(4093)), data)
            self.assertTrue(body.sha_matches())
            for _ in range(500):
                start = rng.randrange(0, len(data))
                length = rng.randrange(0, min(8192, len(data) - start) + 1)
                self.assertEqual(body.read(start, length), data[start:start + length])

    def test_corrupt_restore_does_not_replace_existing_output(self):
        source, rime_path, _, _ = self.make_slice()
        damaged = bytearray(rime_path.read_bytes())
        damaged[-1] ^= 0x01
        rime_path.write_bytes(damaged)
        sentinel = b"EXISTING ORIGINAL MUST SURVIVE"
        source.write_bytes(sentinel)

        with contextlib.redirect_stdout(io.StringIO()):
            result = RIME.cmd_restore(str(rime_path))

        self.assertEqual(result, 1)
        self.assertEqual(source.read_bytes(), sentinel)
        self.assertEqual(list(self.root.glob("*.rime-restore")), [])

    def test_verified_restore_atomically_replaces_output(self):
        source, rime_path, data, _ = self.make_slice()
        source.write_bytes(b"old")
        with contextlib.redirect_stdout(io.StringIO()):
            result = RIME.cmd_restore(str(rime_path))
        self.assertEqual(result, 0)
        self.assertEqual(source.read_bytes(), data)

    def test_concurrent_reads_are_byte_exact(self):
        _, rime_path, data, _ = self.make_slice(sparse_body(900_000))
        rng = random.Random(60)
        queries = []
        for _ in range(5000):
            start = rng.randrange(0, len(data))
            length = rng.randrange(1, min(32768, len(data) - start) + 1)
            queries.append((start, length))

        with RIME.Body(str(rime_path)) as body:
            def read_one(query):
                start, length = query
                return body.read(start, length) == data[start:start + length]

            with concurrent.futures.ThreadPoolExecutor(max_workers=32) as pool:
                results = list(pool.map(read_one, queries))
        self.assertEqual(sum(results), len(queries))

    def test_range_parser_supports_suffix_and_rejects_invalid_ranges(self):
        self.assertEqual(RIME.parse_byte_range("bytes=0-9", 100), (0, 9))
        self.assertEqual(RIME.parse_byte_range("bytes=90-", 100), (90, 99))
        self.assertEqual(RIME.parse_byte_range("bytes=-5", 100), (95, 99))
        self.assertEqual(RIME.parse_byte_range("bytes=-500", 100), (0, 99))
        for value in ("items=0-1", "bytes=", "bytes=1-2,4-5", "bytes=100-",
                      "bytes=9-3", "bytes=-0", "bytes=a-b"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    RIME.parse_byte_range(value, 100)

    def test_body_rejects_truncation_trailing_bytes_and_overlap(self):
        _, rime_path, _, _ = self.make_slice()
        good = rime_path.read_bytes()

        truncated = self.root / "truncated.rime"
        truncated.write_bytes(good[:-1])
        with self.assertRaises(ValueError):
            RIME.Body(str(truncated))

        trailing = self.root / "trailing.rime"
        trailing.write_bytes(good + b"x")
        with self.assertRaises(ValueError):
            RIME.Body(str(trailing))

        overlap_bytes = bytearray(good)
        _, first_length = RIME.RUN.unpack_from(overlap_bytes, RIME.HDR.size)
        second_header = RIME.HDR.size + RIME.RUN.size + first_length
        RIME.RUN.pack_into(overlap_bytes, second_header, 0, 1)
        overlap = self.root / "overlap.rime"
        overlap.write_bytes(overlap_bytes)
        with self.assertRaises(ValueError):
            RIME.Body(str(overlap))

    def test_server_refuses_slice_with_wrong_embedded_sha(self):
        _, rime_path, _, _ = self.make_slice()
        damaged = bytearray(rime_path.read_bytes())
        damaged[-1] ^= 0x01
        rime_path.write_bytes(damaged)
        with self.assertRaisesRegex(ValueError, "stored body SHA"):
            RIME.cmd_serve(str(rime_path), 0)

    def test_dense_control_is_larger_than_body(self):
        dense = bytes((i % 255) + 1 for i in range(3174))
        _, _, _, slice_bytes = self.make_slice(dense)
        self.assertEqual(slice_bytes, RIME.HDR.size + RIME.RUN.size + len(dense))
        self.assertGreater(slice_bytes, len(dense))


if __name__ == "__main__":
    unittest.main()
