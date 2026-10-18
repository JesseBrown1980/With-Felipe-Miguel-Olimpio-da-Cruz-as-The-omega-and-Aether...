"""Cold-lane receipts for registry slot 21 (needs numpy). Runs the owner's own Python,
Q-PRISM @ b4a21a2 `qprism/cube_absorb.py`, from aether's existing byte-identical copy
`eval/vendor/qprism-control` (git blob 542d6573; nothing is copied here), on the fixture window of
Q-PRISM `tests/test_cube_absorb.py:10-13`, and writes `tests/fixtures/qprism-receipts.hbp` for
`tests/qprism.rs` to check the vendored Rust contract against.

  python3 -I tools/qprism_receipts.py --write | --check
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CRATE = os.path.dirname(HERE)
AETHER = os.path.dirname(os.path.dirname(CRATE))
sys.path.insert(0, os.path.join(AETHER, "eval", "vendor", "qprism-control"))

import numpy as np  # noqa: E402
from qprism.cube_absorb import (absorb_window, bh_inject_between, bh_prefix, bh_render,  # noqa: E402
                                glyphword, handle8, roundtrip_proof, transcode_256_to_1024, _sha16)

FIXTURE = os.path.join(CRATE, "tests", "fixtures", "qprism-receipts.hbp")


def _fixture_window(seed=1, T=25, F=64):  # Q-PRISM tests/test_cube_absorb.py:10-13, unchanged
    rng = np.random.default_rng(seed)
    return np.sin(np.linspace(0, 8 * np.pi, T)[:, None] * rng.uniform(0.5, 3, (1, F))) \
        + 0.3 * rng.standard_normal((T, F))


def rows():
    out = ["QPRISMRECEIPTS|source=Q-PRISM@b4a21a2:qprism/cube_absorb.py+tests/test_cube_absorb.py:10-13|json=0"]
    # STAGE2-CUBE-ABSORPTION.md:43-48 records the row of `absorb_window(_fixture_window(), subject="S5",
    # session="1", window_start_s=12.5)` as cube_absorb.py stood at aee7e2c, whose node id was
    # f"qprism/cube/{dataset_id}/{subject}/{session}/{round(float(window_start_s),3)}/{feat_digest}"
    # (aee7e2c:qprism/cube_absorb.py:131); b4a21a2 keeps the tuple and digests, and names the node
    # `qprism_cube:{tuple8}` (cube_absorb.py:261).
    ch = absorb_window(_fixture_window(), subject="S5", session="1", window_start_s=12.5)
    tup = ch.tuple
    out.append("FIXTURE|seed=1|T=25|F=64|feat_sha16=%s|tuple_sha16=%s|tuple_sha256=%s|json=0"
               % (ch.feature_digest, ch.tuple_sha16, hashlib.sha256(tup).hexdigest()))
    out.append("TUPLE|hex=%s|json=0" % tup.hex())
    # "12.5" is the text aee7e2c:131's round(float(12.5), 3) renders; written as text so this tool does no float.
    old = "qprism/cube/%s/%s/%s/%s/%s" % ("bcbl190626/SpanishBCBL", "S5", "1", "12.5", ch.feature_digest)
    out.append("DOCROW|node=%s|handle8=%s|glyph=%s|json=0" % (old, handle8(old), glyphword(old)))
    out.append("CURRENT|node=%s|handle8=%s|tuple8=%s|source_sha256=%s|source8=%s|glyph=%s|bh_prefix=%s|json=0"
               % (ch.node_id, ch.handle8, ch.tuple8, ch.source_sha256, ch.source8, ch.glyph, ch.bh_prefix_str))
    out.append("XCOLONY|node=qprism_cube:7be9d49b3af31036|handle8=%s|json=0" % handle8("qprism_cube:7be9d49b3af31036"))
    p = roundtrip_proof(tup)
    sym = transcode_256_to_1024(tup)
    be16 = b"".join(int(s).to_bytes(2, "big") for s in sym)
    out.append("ROUNDTRIP|orig_bytes=%d|symbols_1024=%d|symbols_be16_sha256=%s|first4=%s|orig_sha256=%s|recovered_sha256=%s|byte_identical=%s|json=0"
               % (p["orig_bytes"], p["symbols_1024"], hashlib.sha256(be16).hexdigest(), ",".join(map(str, sym[:4])),
                  p["orig_sha256"], p["recovered_sha256"], p["byte_identical"]))
    out.append(ch.hbp_row())
    out.append(ch.active_glyph_law())
    hs = ["0000000000000005", "0000000000000006", ch.handle8, handle8(old), "ffffffffffffffff",
          "0000000000000000", "8000000000000000", "5edd3a45544437d4", "cbf29ce484222325"]
    for a in hs:
        for b in hs:
            pa, pb = bh_prefix(a), bh_prefix(b)
            out.append("BH|a=%s|b=%s|prefix_a=%s|prefix_b=%s|inject=%s|json=0"
                       % (a, b, bh_render(pa), bh_render(pb), bh_render(bh_inject_between(pa, pb))))
    for s in ("", "a", "qprism/cube/x", "qprism_cube:7be9d49b3af31036", old, ch.node_id):
        out.append("FNV|text_hex=%s|handle8=%s|json=0" % (s.encode().hex(), handle8(s)))
    return out


def main(argv):
    text = "\n".join(rows()) + "\n"
    if "--check" in argv:
        old = open(FIXTURE, encoding="utf-8", newline="").read()
        print(("SAME" if old == text else "DIFF") + "|fixture=qprism-receipts.hbp|numpy=%s|json=0" % np.__version__)
        return 0 if old == text else 1
    if "--write" in argv:
        with open(FIXTURE, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        print("WROTE|fixture=qprism-receipts.hbp|numpy=%s|json=0" % np.__version__)
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
