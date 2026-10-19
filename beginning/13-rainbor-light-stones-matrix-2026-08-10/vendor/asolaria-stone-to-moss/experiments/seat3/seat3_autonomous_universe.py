#!/usr/bin/env python3
"""Seat 3 finite autonomous light-universe MODEL, independently replayable.
Stable identities; mutable integer state; no human-per-tick prompting.
Not physical photons, actual Q-PRISM, WASM, or an upstream N-Nest agent farm.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

SCHEMA = "ASOLARIA-SEAT3-AUTONOMOUS-IDENTITY-V1"
LAW_BLOB = "f84710d3018882b7282b9fda227638c57568ffe4"
TICKS = 1080
FAULTS = {31: "light", 401: "phase", 799: "position", 1000: "id"}
META = ("id", "parent", "root", "color", "depth")


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def snapshot_digest(entities: dict, tick: int) -> str:
    # Stable portable ASCII wire format; no Python object or JSON encoding variation.
    lines = ["tick=" + str(tick)]
    for ident in sorted(entities):
        e = entities[ident]
        lines.append("|".join(str(e[k]) if e[k] is not None else "-"
                              for k in ("id", "parent", "root", "color", "depth",
                                        "light", "phase", "position")))
    return sha(("\n".join(lines) + "\n").encode("ascii"))


def initial_entities():
    result = {}
    for t in range(3):
        for c in range(3):
            for s in range(3):
                for l in range(3):
                    ident = f"E:{t}:{c}:{s}:{l}"
                    result[ident] = dict(
                        id=ident, parent=None, root=ident, color=c, depth=0,
                        light=(17*t+31*c+43*s+13*l) % 256,
                        phase=(9*t+3*c+s+l) % 81,
                        position=(t+c+s+l) % 27)
    assert len(result) == 81
    return result


def next_candidate(old, neighbor, parent_light, tick):
    new_light = (5*old["light"] + 3*neighbor["light"] +
                 parent_light + tick + old["color"]) % 256
    return dict(id=old["id"], light=new_light,
                phase=(old["phase"]+new_light+(tick % 81)) % 81,
                position=(old["position"]+(new_light % 3)+1) % 27)


def watcher_recompute(old, adjacent_light, parent_light, tick):
    # Recompute independently from trusted prior snapshot, not the submitted candidate.
    light = (tick + old["color"] + parent_light +
             adjacent_light*3 + old["light"]*5) & 255
    phase = (tick % 81 + light + old["phase"]) % 81
    position = (1 + light % 3 + old["position"]) % 27
    return dict(id=old["id"], light=light, phase=phase, position=position)


class Halted(Exception):
    pass


class Universe:
    def __init__(self, faulted: bool, log: bool = False):
        self.entities = initial_entities()
        self.base_ids = sorted(self.entities)
        self.identity_records = {k: tuple(v[x] for x in META)
                                 for k, v in self.entities.items()}
        self.tick = 0
        self.spawns = 0
        self.last_spawn = None
        self.faulted = faulted
        self.log = log
        self.records = []
        self.corrections = []
        self.moved = 0
        self.max_depth_seen = 0
        self.operator_prompts_per_tick = 0
        self.standing_grants = 1  # Model fixture: one delegated policy; not a real signature.
        self.halted = False
        self.halt_count = 0
        self.resume_grants = 0
        self.invalid_resume_denials = 0
        self.denied_hardware = 0
        self.denied_budget = 0

    def lineage(self, ident):
        names = []
        while ident is not None:
            names.append(ident)
            ident = self.entities[ident]["parent"]
        return ">".join(reversed(names))

    def spawn(self, at_tick):
        if len(self.entities) >= 108:
            self.denied_budget += 1
            return False
        if self.last_spawn is not None and self.entities[self.last_spawn]["depth"] < 7:
            parent_id = self.last_spawn
        else:
            parent_id = self.base_ids[(self.spawns*7) % 81]
        parent = self.entities[parent_id]
        ident = f"V:{at_tick:04d}"
        assert ident not in self.entities
        depth = parent["depth"] + 1
        assert 1 <= depth <= 7
        child = dict(id=ident, parent=parent_id, root=parent["root"],
                     color=parent["color"], depth=depth,
                     light=(parent["light"]+at_tick) % 256,
                     phase=(parent["phase"]+at_tick) % 81,
                     position=parent["position"])
        self.entities[ident] = child
        self.identity_records[ident] = tuple(child[x] for x in META)
        self.spawns += 1
        self.last_spawn = ident
        self.max_depth_seen = max(self.max_depth_seen, depth)
        if self.log:
            self.records.append(f"SPAWN|tick={at_tick:04d}|id={ident}|parent={parent_id}"
                                f"|depth={depth}|policy=PREAUTHORIZED|json=0")
        return True

    def request_external_hardware(self):
        # An authenticated external permission is not available in this model.
        self.denied_hardware += 1
        return False

    def operator_halt(self):
        self.halted = True
        self.halt_count += 1

    def operator_resume(self, grant):
        if not grant:
            self.invalid_resume_denials += 1
            return False
        assert self.halted
        self.halted = False
        self.resume_grants += 1
        return True

    def step(self, tick):
        if self.halted:
            raise Halted("HALT: no tick may advance without a separate operator resume")
        assert tick == self.tick + 1 and 1 <= tick <= TICKS
        order = sorted(self.entities)
        frozen = {k: self.entities[k].copy() for k in order}
        target = None
        if self.faulted and tick in FAULTS:
            if tick == 1000:
                target = sorted(order, key=lambda k: (-frozen[k]["depth"], k))[0]
            else:
                target = order[tick % len(order)]

        proposed = {}
        expected = {}
        for j, ident in enumerate(order):
            old = frozen[ident]
            neighbor = frozen[order[(j+1) % len(order)]]
            parent_light = frozen[old["parent"]]["light"] if old["parent"] else 0
            proposed[ident] = next_candidate(old, neighbor, parent_light, tick)
            expected[ident] = watcher_recompute(
                old, neighbor["light"], parent_light, tick)
            assert proposed[ident] == expected[ident]

        if target is not None:
            which = FAULTS[tick]
            if which == "id":
                proposed[target]["id"] += "-FORGED"
            else:
                proposed[target][which] += 1
        for ident in order:
            anticipated = expected[ident]
            claim = proposed[ident]
            if claim != anticipated:
                assert ident == target
                field = FAULTS[tick]
                failure_path = self.lineage(ident)
                assert failure_path.endswith(ident)
                self.corrections.append(
                    {"tick": tick, "id": ident, "field": field, "path": failure_path})
                if self.log:
                    self.records.append(f"CORRECTED|tick={tick:04d}|id={ident}"
                                        f"|field={field}|path={failure_path}"
                                        "|raw_report_rejected=1|source_authenticated=0|json=0")
            e = self.entities[ident]
            if (e["light"], e["phase"], e["position"]) != (
                    anticipated["light"], anticipated["phase"], anticipated["position"]):
                self.moved += 1
            for key in ("light", "phase", "position"):
                e[key] = anticipated[key]

        self.tick = tick
        if tick % 40 == 0:
            assert self.spawn(tick)
        assert len(self.entities) == len(self.identity_records)
        assert all(tuple(v[x] for x in META) == self.identity_records[k]
                   for k, v in self.entities.items())
        if self.log:
            self.records.append(f"TICK|k={tick:04d}|entities={len(self.entities)}"
                                f"|state_sha256={snapshot_digest(self.entities,tick)}|json=0")

    def run(self, end_tick):
        for tick in range(self.tick+1, end_tick+1):
            self.step(tick)


def audit():
    baseline = Universe(faulted=False)
    baseline.run(TICKS)
    faulted = Universe(faulted=True, log=True)
    faulted.run(TICKS)
    paused = Universe(faulted=True)
    paused.run(776)
    before = snapshot_digest(paused.entities, paused.tick)
    paused.operator_halt()
    try:
        paused.step(777)
    except Halted:
        pass
    else:
        raise AssertionError("operator halt failed to block tick")
    assert paused.tick == 776
    assert snapshot_digest(paused.entities,paused.tick) == before
    assert paused.operator_resume(False) is False
    assert paused.tick == 776 and paused.halted
    assert paused.operator_resume(True) is True
    paused.run(TICKS)

    final_sha = snapshot_digest(baseline.entities,TICKS)
    assert final_sha == snapshot_digest(faulted.entities,TICKS)
    assert final_sha == snapshot_digest(paused.entities,TICKS)
    assert baseline.entities == faulted.entities == paused.entities
    assert len(faulted.corrections) == len(paused.corrections) == 4
    assert [e["tick"] for e in faulted.corrections] == [31,401,799,1000]
    assert faulted.corrections == paused.corrections
    assert faulted.max_depth_seen == 7
    assert baseline.max_depth_seen == 7
    assert all(u.tick == TICKS and len(u.entities) == 108 and u.spawns == 27
               for u in (baseline,faulted,paused))
    assert all(u.moved > 1080 for u in (baseline,faulted,paused))
    assert len({k for k in faulted.entities}) == 108
    assert faulted.corrections[-1]["path"].count(">") >= 1
    assert faulted.operator_prompts_per_tick == paused.operator_prompts_per_tick == 0
    assert not faulted.request_external_hardware()
    assert faulted.spawn(1081) is False
    assert faulted.denied_hardware == 1 and faulted.denied_budget == 1
    assert paused.halt_count == paused.resume_grants == paused.invalid_resume_denials == 1

    header=(f"PORTAL|schema={SCHEMA}|base=81|ticks=1080|law_blob={LAW_BLOB}"
            "|physical=0|operator_grants=1|json=0")
    end=(f"END|ticks=1080|initial=81|children=27|final_entities=108"
         f"|max_depth=7|corrections=4|baseline_sha256={final_sha}"
         "|restored_equals_baseline=1|operator_prompts_per_tick=0"
         "|real_hardware=0|physical_hosts=0|json=0")
    rows=[header]+faulted.records + [
        "HALT|before_tick=777|blocked_tick=777|no_advance=1|resume_grants=1"
        "|cooperative_boundary_only=1|json=0",
        "POLICY|denied_external_hardware=1|denied_109th_child=1"
        "|operator_prompts_per_tick=0|json=0",end]
    raw=("\n".join(rows)+"\n").encode("ascii")
    assert len([x for x in rows if x.startswith("TICK|")]) == 1080
    assert len([x for x in rows if x.startswith("SPAWN|")]) == 27
    assert len([x for x in rows if x.startswith("CORRECTED|")]) == 4
    metrics={"schema":SCHEMA,"scope":"finite synthetic light-state simulation, NOT physical light",
             "law_blob_sha1":LAW_BLOB,"status":"PASS","initial_entities":81,
             "final_entities":108,"virtual_spawns":27,"max_depth":7,
             "ticks":1080,"corrections":faulted.corrections,
             "baseline_final_sha256":final_sha,"faulted_final_sha256":final_sha,
             "paused_resumed_final_sha256":final_sha,
             "operator_prompts_per_tick":0,"standing_policy_grants":1,
             "halt_blocked_tick":777,"invalid_resume_denials":1,
             "authorized_resume_grants":1,"denied_hardware":1,"denied_budget":1,
             "movement_events":faulted.moved,
             "trace_bytes":len(raw),"trace_sha256":sha(raw),
             "physical_host_attested":False,"source_authenticated":False}
    return raw,metrics


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: python seat3_autonomous_universe.py out.hbp metrics.json")
    raw,report=audit()
    Path(sys.argv[1]).write_bytes(raw)
    Path(sys.argv[2]).write_text(json.dumps(report,sort_keys=True,indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k!="corrections"},sort_keys=True))


if __name__ == "__main__":
    main()
