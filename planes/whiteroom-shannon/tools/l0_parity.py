#!/usr/bin/env python3
"""Cold-lane torch measurement for the L0 requests of this crate (torch 2.14.1+cpu, torch_geometric 2.8.1).

The white-room L0GnnScorer (liris-whiteroom-engine.mjs:113-124) and fabric-thinker realInfer
(fabric-thinker-gnn.mjs:31-51, :103-107) POST a two-node sha graph to the L0 server on port 4792. This
crate scores those graphs in process with model/l0-edge (Q24). This tool runs the server's own model on
the same graphs: it imports model/l0-edge/vendor/gnn-sidecar/inference_server.py in place (MODEL as the
server builds it from baseline_model.pt, sha256 a0999336...; serve_forever is never called, no port is
bound) and runs its line 24 call one request at a time, with the kernel settings of
model/l0-edge/tools/model_parity.py. It writes the float32 output bits per request to
tests/fixtures/l0-torch.hbp; tests/l0_torch.rs compares them with the Rust Q24 scores in integers.
--check regenerates the file in memory and diffs.

Float appears only inside the owner's torch model and in the node feature doubles handed to it (the
JSON body values b / 255 of the upstream JavaScript, each the binary64 nearest b / 255, built here from
integers); the output is read back as float32 bit patterns (torch .view(torch.int32)), not as floats.
Inputs: request i uses pid "BH.WR.liris-whiteroom.<i>" and mark / query "bigpickle:room:<i>:work" (the
white-room smoke run's PID and mark pattern, liris-whiteroom-engine.mjs:26, :194, extended to N).
Run: <torch venv>/bin/python -I -B tools/l0_parity.py [--check]
"""
import hashlib
import os
import pathlib
import sys
from fractions import Fraction

CRATE = pathlib.Path(__file__).resolve().parent.parent
SIDECAR = CRATE.parent.parent / "model" / "l0-edge" / "vendor" / "gnn-sidecar"
OUT = CRATE / "tests" / "fixtures" / "l0-torch.hbp"
COUNT = 2000

KERNEL_ENV = {"ATEN_CPU_CAPABILITY": "default", "MKL_CBWR": "COMPATIBLE", "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
os.environ.update(KERNEL_ENV)
sys.dont_write_bytecode = True
sys.path.insert(0, str(SIDECAR))
import inference_server  # noqa: E402  (builds MODEL at import, as the server does)
import torch  # noqa: E402

MODEL = inference_server.MODEL
BASELINE_SHA256 = "a09993369d31ca73345914812e5226b513f5fb9092f43e487a2eafc8c3b621f5"


def double_of_ratio(num, den):
    """The binary64 nearest num / den (0 <= num <= den), ties to even, as JavaScript's num / den gives it;
    built from integers, then handed to torch as the JSON body's number."""
    if num == 0:
        return 0.0
    q = Fraction(num, den)
    e = q.numerator.bit_length() - q.denominator.bit_length()  # 2^(e-1) <= q < 2^(e+1)
    if q >= Fraction(2) ** e:
        e += 1
    sh = e - 53  # 2^(e-1) <= q < 2^e, so q / 2^sh lies in [2^52, 2^53)
    scaled = q / Fraction(2) ** sh
    m, r = divmod(scaled.numerator, scaled.denominator)
    if 2 * r > scaled.denominator or (2 * r == scaled.denominator and m & 1):
        m += 1
    exact = m * Fraction(2) ** sh
    value = exact.numerator / exact.denominator  # exact: a binary64 value
    assert Fraction(value) == exact
    return value


def features(bytes6):
    return [double_of_ratio(b, 255) for b in bytes6]


def whiteroom_nodes(i):
    # liris-whiteroom-engine.mjs:113-117: h = sha256hex(pid + "|" + mark); nodes [b0..b5], [b6..b11].
    h = hashlib.sha256(f"BH.WR.liris-whiteroom.{i}|bigpickle:room:{i}:work".encode()).digest()
    return [features(h[0:6]), features(h[6:12])]


def fabric_nodes(i):
    # fabric-thinker-gnn.mjs:34-38: nodes [sha256(pid)[0..6]], [sha256(query)[0..6]].
    p = hashlib.sha256(f"BH.WR.liris-whiteroom.{i}".encode()).digest()
    q = hashlib.sha256(f"bigpickle:room:{i}:work".encode()).digest()
    return [features(p[0:6]), features(q[0:6])]


def server_bits(nodes):
    # inference_server.py:24 for edges [[0, 1]]; the float32 output's bit pattern.
    with torch.no_grad():
        out = MODEL(torch.tensor(nodes, dtype=torch.float32), torch.tensor([[0, 1]], dtype=torch.long).t().contiguous())
    words = out.reshape(-1).contiguous().view(torch.int32).tolist()
    assert len(words) == 1
    return words[0] & 0xFFFFFFFF


def build():
    digest = hashlib.sha256((SIDECAR / "baseline_model.pt").read_bytes()).hexdigest()
    assert digest == BASELINE_SHA256, digest
    rows = []
    for i in range(COUNT):
        rows.append(f"WR|i={i}|out_bits={server_bits(whiteroom_nodes(i)):08x}")
    for i in range(COUNT):
        rows.append(f"FT|i={i}|out_bits={server_bits(fabric_nodes(i)):08x}")
    header = ("# l0-torch.hbp from tools/l0_parity.py (torch " + torch.__version__ + "); do not edit\n"
              "# The L0 server's MODEL (model/l0-edge/vendor/gnn-sidecar/inference_server.py, baseline_model.pt sha256\n"
              f"#   {BASELINE_SHA256}) on request i, one request at a time; out_bits = its float32 score.\n"
              "# WR: the white-room L0GnnScorer graph of pid BH.WR.liris-whiteroom.<i>, mark bigpickle:room:<i>:work.\n"
              "# FT: the fabric-thinker pidQueryToGraph graph of the same pid and query.\n")
    return header + "".join(r + "\n" for r in rows)


def main():
    text = build()
    if "--check" in sys.argv[1:]:
        committed = OUT.read_text(encoding="utf-8") if OUT.exists() else None
        print(("OK " if committed == text else "DIFF ") + str(OUT.relative_to(CRATE)))
        return 0 if committed == text else 1
    OUT.write_text(text, encoding="utf-8")
    print(f"WROTE {OUT.relative_to(CRATE)} ({text.count(chr(10))} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
