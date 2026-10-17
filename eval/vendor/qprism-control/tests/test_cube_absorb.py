"""Cube-absorption tests: canonical 3200-byte tuple, kernel-native json=0 HBP row, Host-8
handle parity with graphify, graphify-60D selector envelope, and CubeSource -> prism arm."""
import numpy as np
from qprism.physics import Apparatus, observe
from qprism.sources import PrismSource, denormalize
from qprism.cube_absorb import (absorb_window, quant_tuple, cube_to_control,
                                 CubeSource, TUPLE_BYTES, handle8, glyphword)


def _fixture_window(seed=1, T=25, F=64):
    rng = np.random.default_rng(seed)
    return np.sin(np.linspace(0, 8 * np.pi, T)[:, None] * rng.uniform(0.5, 3, (1, F))) \
        + 0.3 * rng.standard_normal((T, F))


def test_tuple_is_canonical_3200_bytes():
    assert len(quant_tuple(_fixture_window())) == TUPLE_BYTES == 3200


def test_handle8_matches_graphify_fnv1a64():
    # byte-identical Host-8 8-byte PK (FNV-1a 64-bit) -> hex 16 chars
    assert len(handle8("qprism/cube/x")) == 16          # 8-byte PK -> 16 hex chars
    # verify the exact FNV-1a-64 algorithm (byte-identical to graphify.py)
    ref = 0xcbf29ce484222325
    for ch in b"a":
        ref = ((ref ^ ch) * 0x100000001b3) & 0xffffffffffffffff
    assert handle8("a") == format(ref, "016x")
    assert glyphword("a").startswith("gly-")


def test_hbp_row_is_json0_v3_converged():
    from qprism.cube_absorb import SELECTOR_AXES
    ch = absorb_window(_fixture_window(), subject="S5", session="1", window_start_s=12.5)
    row = ch.hbp_row()
    assert row.startswith("QPRISMCUBE|") and row.endswith("|json=0")
    assert "{" not in row and "}" not in row and '"' not in row          # no JSON carrier
    # three Host-8 handles: node PK (FNV1a64) + two sha256-prefix content handles (liris)
    for h in (ch.handle8, ch.source8, ch.tuple8):
        assert len(h) == 16
    assert ch.handle8 != ch.source8 and ch.handle8 != ch.tuple8          # distinct derivations
    assert f"handle8={ch.handle8}" in row and f"source8={ch.source8}" in row and f"tuple8={ch.tuple8}" in row
    # graphify-V3 schema + canonical 11-axis vocabulary
    assert "graphify_schema=ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D" in row
    assert "selector_constraint:hyperbehcs-selector-router-60d" in row and "axis_count=11" in row
    for a in SELECTOR_AXES:
        assert f"|selector_axis:{a}=" in row
    # gated laws (representation-only, E=0)
    for law in ("compile=0", "interpret=0", "fire=0", "agentterms_fedenv_fire=0", "dispatch=0", "nodejs=0"):
        assert law in row
    assert "raw_in_repo=0" in row and "derived_only=1" in row


def test_source8_is_sha256_prefix_and_node_is_fnv():
    from qprism.cube_absorb import handle8
    ch = absorb_window(_fixture_window(), source_sha256="a" * 64)
    assert ch.source8 == "a" * 16                                        # sha256 prefix content handle
    assert ch.node_id == f"qprism_cube:{ch.tuple8}"                      # canonical content-addressed node id
    assert ch.handle8 == handle8(ch.node_id)                             # node PK = FNV1a64(id) (graphify)


def test_cross_colony_node_pk_parity():
    # both colonies: tuple8=7be9d49b3af31036 -> node PK 5edd3a45544437d4
    from qprism.cube_absorb import handle8
    assert handle8("qprism_cube:7be9d49b3af31036") == "5edd3a45544437d4"


def test_deterministic():
    w = _fixture_window(3)
    assert quant_tuple(w) == quant_tuple(w)
    assert absorb_window(w).handle8 == absorb_window(w).handle8


def test_cube_source_drives_prism_arm():
    chunks = [absorb_window(_fixture_window(s), subject=f"S{s}", window_start_s=s) for s in range(6)]
    src = CubeSource(chunks)
    ap = Apparatus()
    arm = PrismSource(seed=7, stream=src, influence=0.5)
    best = -np.inf
    for _ in range(40):
        x = arm.ask()
        snr = observe(denormalize(x, ap), ap)["snr"]
        arm.tell(x, snr)
        best = max(best, snr)
    assert 0.0 <= best <= 1.0


def test_control_vector_valid():
    v = cube_to_control(absorb_window(_fixture_window()))
    assert v.shape == (5,) and np.all((v >= 0) & (v <= 1))


def test_active_glyph_law_is_gated():
    ch = absorb_window(_fixture_window(), subject="S5")
    law = ch.active_glyph_law()
    assert law.startswith("QPRISMACTIVEGLYPH|") and law.endswith("|json=0")
    for gate in ("compile=0", "interpret=0", "fire=0", "behavior=represent_address",
                 "geometry=graphify60d"):
        assert gate in law
    assert f"handle8={ch.handle8}" in law


def test_space_expandable_inject_between():
    from qprism.cube_absorb import bh_prefix, bh_inject_between, _bh_int, BH_DEPTH
    a, b = bh_prefix("0000000000000005"), bh_prefix("0000000000000006")
    c = bh_inject_between(a, b)                                   # inject one slice deeper
    la = _bh_int(a + [0] * (len(c) - len(a)))
    lb = _bh_int(b + [0] * (len(c) - len(b)))
    ci = _bh_int(c)
    assert min(la, lb) < ci < max(la, lb)                        # strictly BETWEEN (new pid point)
    assert len(c) == BH_DEPTH + 1                                # deeper = the next slice
    row = absorb_window(_fixture_window(), frame=3).hbp_row()
    assert "space_expandable=1" in row and "frame=3" in row
    assert "inject_between=bh_digital_expansion" in row and "bh_prefix=" in row


def test_roundtrip_lossless_transcode_comb_coherence():
    from qprism.cube_absorb import roundtrip_proof, absorb_window
    ch = absorb_window(_fixture_window(), subject="S5")
    p = roundtrip_proof(ch.tuple)
    assert p["byte_identical"] is True                       # 0 loss on our own artifact
    assert p["orig_sha256"] == p["recovered_sha256"]         # sha-identical recovery
    assert p["orig_bytes"] == 3200 and p["symbols_1024"] == 2560   # 25600 bits = 2560 x 10-bit
