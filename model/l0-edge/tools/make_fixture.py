#!/usr/bin/env python3
"""Writes tests/fixtures/events.hbp: SYNTHETIC graph-runtime events from a fixed seed (--check diffs it).

Rows are the HBP form src/event.rs parses: EVENT|actor=|actor_type=|target=|target_type=|risk=|status=.
"""
import pathlib
import sys

EVENTS = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "events.hbp"
SEED = 0x4C30_4544_4745_0001
KEYS = ("actor", "actor_type", "target", "target_type", "risk", "status")
REQUEST_PAIRS = (
    ("agent:benign", "svc:ledger", "runtime -> local_client; risk 0-1; status ok"),
    ("agent:rogue", "svc:vault", "other -> other; risk >= 6; status failed or blocked"),
    ("agent:ghost", "svc:ledger", "agent:ghost never observed"),
)
HEADER = (
    "# SYNTHETIC graph-runtime events from tools/make_fixture.py (fixed seed); not observed data; do not edit.\n"
    "# Row: EVENT|actor=|actor_type=|target=|target_type=|risk=|status= (absent key = JS undefined).\n"
    + "".join(f"# REQUEST|actor={a}|target={t}|history={h}\n" for a, t, h in REQUEST_PAIRS)
    + "# AUDIT|node=svc:audit|edge_volume=40|total_risk=23 (JS Math.round(23 / 40 * 100) = 57)\n"
)
TYPES = ("runtime", "local_client", "other", None, "")
STATUSES = ("failed", "error", "blocked", "denied", "ok", None, "")


class Lcg:
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound

    def pick(self, items):
        return items[self.below(len(items))]

    def shuffle(self, items):
        for i in range(len(items) - 1, 0, -1):
            j = self.below(i + 1)
            items[i], items[j] = items[j], items[i]


def escape(value):
    out = bytearray()
    for byte in value.encode("utf-8"):
        if byte in b"%|=" or byte < 0x20 or byte == 0x7F:
            out += f"%{byte:02X}".encode("ascii")
        else:
            out.append(byte)
    return out.decode("utf-8")


def row(**fields):
    parts = ["EVENT"]
    for key in KEYS:
        value = fields.get(key)
        if value is not None:
            parts.append(f"{key}={escape(str(value))}")
    return "|".join(parts)


def edge_case_rows():
    return [
        # No actor id: node "unknown" is first seen in the actor slot and takes the target's type.
        row(actor_type="runtime", target="svc:catalog", target_type="other", risk=3, status="ok"),
        row(actor="", actor_type="local_client", target="svc:catalog", risk=2, status="error"),
        row(actor="agent:solo", actor_type="runtime", target="", target_type="local_client", risk=4, status="failed"),
        row(actor="node:loop", actor_type="local_client", target="node:loop", target_type="other", risk=7, status="error"),
        row(actor="unknown", actor_type="runtime", target="svc:catalog", risk=1),
        row(actor="agent:typeless", target="svc:typeless", risk=0, status="denied"),
        row(actor="agent:empty-type", actor_type="", target="svc:empty-type", target_type="", status=""),
        row(),
        row(actor="agent:p%|q=r\tz", actor_type="runtime", target="svc:nœud", target_type="local_client", risk=5, status="blocked"),
        row(actor="agent:hot", actor_type="other", target="svc:catalog", risk=21, status="blocked"),
        row(actor="svc:catalog", actor_type="runtime", target="agent:solo", target_type="other", risk=5, status="ok"),
        row(actor="node:loop", actor_type="runtime", target="node:loop", risk=0, status="failed"),
    ]


def request_pair_rows(rng):
    rows = []
    for _ in range(30):
        rows.append(row(actor="agent:benign", actor_type="runtime", target="svc:ledger",
                        target_type="local_client", risk=rng.below(2), status="ok"))
    for i in range(24):
        rows.append(row(actor="agent:rogue", actor_type="other", target="svc:vault", target_type="other",
                        risk=6 + rng.below(16), status=("failed", "blocked")[i % 2]))
    return rows


def background_nodes(rng):
    agents = [(f"agent:a{i:02d}", rng.pick(TYPES)) for i in range(16)]
    services = [(f"svc:s{i:02d}", rng.pick(TYPES)) for i in range(10)]
    return agents, services


def node_type(rng, declared):
    return declared if rng.below(5) else rng.pick(TYPES)


def audit_rows(rng, agents):
    risks = [0] * 40
    for _ in range(23):
        risks[rng.below(40)] += 1
    rows = []
    for risk in risks:
        actor, declared = rng.pick(agents)
        rows.append(row(actor=actor, actor_type=node_type(rng, declared), target="svc:audit",
                        target_type="local_client", risk=risk, status=rng.pick(STATUSES)))
    return rows


def background_rows(rng, agents, services):
    rows = []
    for _ in range(230):
        (actor, actor_declared), (target, target_declared) = rng.pick(agents), rng.pick(services)
        if rng.below(4) == 0:
            (actor, actor_declared), (target, target_declared) = (target, target_declared), (actor, actor_declared)
        rows.append(row(actor=actor, actor_type=node_type(rng, actor_declared), target=target,
                        target_type=node_type(rng, target_declared), risk=rng.below(22),
                        status=rng.pick(STATUSES)))
    return rows


def render():
    rng = Lcg(SEED)
    agents, services = background_nodes(rng)
    mixed = request_pair_rows(rng) + audit_rows(rng, agents) + background_rows(rng, agents, services)
    rng.shuffle(mixed)
    rows = edge_case_rows() + mixed
    return HEADER + "\n".join(rows) + "\n", len(rows)


def main():
    args = sys.argv[1:]
    text, count = render()
    if args == ["--check"]:
        if EVENTS.read_bytes() != text.encode("utf-8"):
            print("EVENTS_FIXTURE|check=FAIL|json=0")
            return 1
        print(f"EVENTS_FIXTURE|check=PASS|events={count}|json=0")
        return 0
    if args:
        print("usage: make_fixture.py [--check]", file=sys.stderr)
        return 2
    EVENTS.write_bytes(text.encode("utf-8"))
    print(f"EVENTS_FIXTURE|written={EVENTS.name}|events={count}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
