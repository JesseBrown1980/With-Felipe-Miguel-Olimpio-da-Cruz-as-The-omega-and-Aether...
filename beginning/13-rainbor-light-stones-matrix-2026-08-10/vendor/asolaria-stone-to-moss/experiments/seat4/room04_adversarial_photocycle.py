#!/usr/bin/env python3
"""Seat 4 Room 04: autonomous, source-anchored three-state photocycle watchdog.

PREREG: PREREG-ROOM04-PHOTOCYCLE-WATCHER-B2-20261015.md
Frozen Phase A: original Seat 1 SHA; Phase B2: independent watcher, 108 clean
checkpoints, 1,296 real fault rejections, 349,920 site-tick checks and HALT.

All frames/PIDs/photons here are SYNTHETIC digital objects. The trusted
source is a pinned *software* fixture, not a physical authenticated observer.
"""
import argparse
import hashlib
import json
from pathlib import Path

N=81
WAVES=27
TICKS=40
SCALE=1_000_000
GOAL=400_000
ARMS=("dark","open_loop","feedback_truth","feedback_corrupt")
SCHEMA="ASOLARIA-SEAT1-OPTOGATE-3STATE-1080-V1"
ORIGINAL_SHA="de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b"
NONCE="ROOM04-20261015-PUBLIC-SOFTWARE-FRAME-NONCE"
FAULTS=(
    "alter_rgb_frame_bytes",
    "alter_frame_digest",
    "swap_pid",
    "alter_total_population",
    "wrong_light_pulse",
    "stale_source_state",
    "stale_tick",
    "stale_nonce",
    "mass_preserving_wrong_output",
    "forge_watcher_digest",
    "coherent_forged_report_and_watcher",
    "external_privilege_request",
)
FRAME_HEADER=b"P6\n9 9\n255\n"
SYNTHETIC_PERMISSION="synthetic.tick"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pid(site):
    return sha(f"ASOLARIA|SEAT4|ROOM04|IMMUTABLE_PID|{site}".encode("ascii"))[:24]


PIDS=tuple(pid(i) for i in range(N))
assert len(PIDS)==len(set(PIDS))==N


def producer_transition(source,lit):
    c,o,r=source
    activated=(c*300_000)//SCALE if lit else 0
    inactive=(o*60_000)//SCALE
    recovery=(r*25_000)//SCALE
    output=(c-activated+recovery,o+activated-inactive,r+inactive-recovery)
    assert min(output)>=0 and sum(output)==SCALE
    return output,activated


def watcher_transition(source,lit):
    # A different structure: individually recomputed directed flow ledger.
    flow={
        "closed_to_open":(source["closed"]*(300_000 if lit else 0))//SCALE,
        "open_to_refractory":(source["open"]*60_000)//SCALE,
        "refractory_to_closed":(source["refractory"]*25_000)//SCALE,
    }
    next_state={
        "closed":source["closed"]-flow["closed_to_open"]+flow["refractory_to_closed"],
        "open":source["open"]+flow["closed_to_open"]-flow["open_to_refractory"],
        "refractory":source["refractory"]+flow["open_to_refractory"]-flow["refractory_to_closed"],
    }
    assert sum(next_state.values())==SCALE and min(next_state.values())>=0
    return next_state


def to_tuple(state):
    return (state["closed"],state["open"],state["refractory"])


def pulse(arm,wave,tick,site,prev_open):
    target=(site+wave)%3==0
    if arm=="dark":
        return False
    if arm=="open_loop":
        return target and tick%12<4
    if arm=="feedback_truth":
        return target and prev_open<GOAL
    if arm=="feedback_corrupt":
        return target and min(SCALE,prev_open+250_000)<GOAL
    raise AssertionError("Unknown source arm")


def frame(values):
    # Digital RGB 9x9: no colors, wavelengths or photons are measured.
    data=bytearray(FRAME_HEADER)
    for closed,opened,refractory in values:
        data.extend((closed*255//SCALE,opened*255//SCALE,refractory*255//SCALE))
    assert len(data)==len(FRAME_HEADER)+N*3
    return bytes(data)


def observer_digest(arm,wave,tick,site,prev,nxt,lit):
    # This hash binds a watcher expectation; it is NOT its own proof of source.
    line="|".join((
        "SEAT4_ROOM04_WATCHER_V1",arm,str(wave),str(tick),str(site),
        ",".join(map(str,prev)),",".join(map(str,nxt)),str(int(lit)),NONCE,
    ))
    return sha(line.encode("ascii"))


def report_for(arm,wave,tick,site,prev,nxt,light,all_next):
    picture=frame(all_next)
    return {
        "arm":arm,"wave":wave,"tick":tick,"site":site,"pid":PIDS[site],
        "source_nonce":NONCE,"prev":prev,"state":nxt,"light":int(light),
        "rgb":picture,"rgb_sha":sha(picture),
        "watcher":observer_digest(arm,wave,tick,site,prev,nxt,light),
        "permission":SYNTHETIC_PERMISSION,
    }


def verified(report,arm,wave,tick,site,prev,watcher_next):
    # Source truth originates from the watchdog's own unmodified prior state,
    # NEVER from a submitted state, watcher digest, frame, or reported light.
    expected_light=pulse(arm,wave,tick,site,prev[1])
    predicted=to_tuple(watcher_transition({
        "closed":prev[0],"open":prev[1],"refractory":prev[2]
    },expected_light))
    expected_all=tuple(to_tuple(s) for s in watcher_next)
    expected_rgb=frame(expected_all)
    return (
        report.get("arm")==arm
        and report.get("wave")==wave
        and report.get("tick")==tick
        and report.get("site")==site
        and report.get("pid")==PIDS[site]
        and report.get("source_nonce")==NONCE
        and report.get("permission")==SYNTHETIC_PERMISSION
        and report.get("prev")==prev
        and report.get("state")==predicted==expected_all[site]
        and report.get("light")==int(expected_light)
        and report.get("rgb")==expected_rgb
        and report.get("rgb_sha")==sha(expected_rgb)
        and report.get("watcher")==observer_digest(
            arm,wave,tick,site,prev,predicted,expected_light)
    )


def mutate_mass_preserving(nxt):
    c,o,r=nxt
    return (c-1,o+1,r) if c else (c+1,o-1,r)


def mutations(honest,arm,wave,tick,site,all_next):
    for fault in FAULTS:
        fake=dict(honest)
        if fault=="alter_rgb_frame_bytes":
            pixels=bytearray(fake["rgb"])
            pixels[len(FRAME_HEADER)]^=1
            fake["rgb"]=bytes(pixels)
        elif fault=="alter_frame_digest":
            fake["rgb_sha"]="0"*64
        elif fault=="swap_pid":
            fake["pid"]=PIDS[(site+1)%N]
        elif fault=="alter_total_population":
            a,b,c=fake["state"]
            fake["state"]=(a+1,b,c)
        elif fault=="wrong_light_pulse":
            fake["light"]=1-fake["light"]
        elif fault=="stale_source_state":
            a,b,c=fake["prev"]
            fake["prev"]=(a+1,b,c)
        elif fault=="stale_tick":
            fake["tick"]=tick-1
        elif fault=="stale_nonce":
            fake["source_nonce"]=NONCE+"-STALE"
        elif fault=="mass_preserving_wrong_output":
            fake["state"]=mutate_mass_preserving(fake["state"])
        elif fault=="forge_watcher_digest":
            fake["watcher"]="a"*64
        elif fault=="coherent_forged_report_and_watcher":
            # The producer lies coherently about state, visual evidence and
            # "watcher"; the independent frozen-source watcher must still HOLD.
            fake_state=mutate_mass_preserving(fake["state"])
            fake["state"]=fake_state
            fake_next=list(all_next)
            fake_next[site]=fake_state
            picture=frame(fake_next)
            fake["rgb"]=picture
            fake["rgb_sha"]=sha(picture)
            fake["watcher"]=observer_digest(
                arm,wave,tick,site,fake["prev"],fake_state,bool(fake["light"]))
        elif fault=="external_privilege_request":
            fake["permission"]="network.write"
        else:
            raise AssertionError("Unpreregistered fault")
        yield fault,fake


class BoundedWatchdog:
    """Autonomous bounded local state machine; no external-IO capability."""
    def __init__(self):
        self.halted=False
        self.accepted=0
        self.blocked=0
        self.prompts=0
        self.external_permissions=0

    def halt(self):
        self.halted=True

    def execute(self,operation):
        if self.halted or operation!="synthetic.tick":
            self.blocked+=1
            return False
        self.accepted+=1
        return True


def halt_trial():
    watch=BoundedWatchdog()
    for step in range(81):
        if step==17:
            watch.halt()
            watch.halt()  # repeated HALT cannot undo it
        watch.execute("synthetic.tick")
    assert watch.halted and watch.accepted==17 and watch.blocked==64
    assert not watch.execute("external.network.write")
    assert watch.blocked==65 and watch.accepted==17
    assert watch.external_permissions==watch.prompts==0
    return {"accepted_before_halt":17,"post_halt_denied":64,
            "external_privileges_granted":0,"human_prompts":0,
            "halt_idempotent":True}


def run(tick_path,fault_path,phase_a_path):
    phase_a=[f"OPTO|schema={SCHEMA}|N={N}|waves={WAVES}|ticks_per_wave={TICKS}|scale={SCALE}|physical_photons=0"]
    total_transition=0
    positive_checks=0
    check_count=0
    reject_counts={fault:0 for fault in FAULTS}
    counters={}
    with tick_path.open("wb") as tick_file, fault_path.open("wb") as faults_file:
        tick_digest=hashlib.sha256()
        fault_digest=hashlib.sha256()

        def tick_record(row):
            raw=row.encode("ascii")
            tick_file.write(raw)
            tick_digest.update(raw)

        def fault_record(row):
            raw=row.encode("ascii")
            faults_file.write(raw)
            fault_digest.update(raw)

        for arm in ARMS:
            # Independent memory representations and separate transition code.
            states=[(SCALE,0,0) for _ in range(N)]
            watcher={PIDS[i]:{"closed":SCALE,"open":0,"refractory":0}
                     for i in range(N)}
            error=commands=activated=0
            for w in range(WAVES):
                for t in range(TICKS):
                    producer_next=[]
                    watcher_next=[]
                    prevs=[]
                    lights=[]
                    for i in range(N):
                        source=states[i]
                        true_prev=to_tuple(watcher[PIDS[i]])
                        assert source==true_prev
                        lit=pulse(arm,w,t,i,true_prev[1])
                        ns,act=producer_transition(source,lit)
                        independently_recomputed=watcher_transition(
                            watcher[PIDS[i]],lit)
                        assert to_tuple(independently_recomputed)==ns
                        assert min(ns)>=0 and sum(ns)==SCALE
                        assert PIDS[i]==pid(i)
                        producer_next.append(ns)
                        watcher_next.append(independently_recomputed)
                        prevs.append(true_prev)
                        lights.append(lit)
                        total_transition+=1
                        error+=abs(ns[1]-(GOAL if (i+w)%3==0 else 0))
                        commands+=int(lit)
                        activated+=act
                        tick_record(
                            f"T|arm={arm}|w={w:02d}|tick={t:02d}|site={i:02d}"
                            f"|pid={PIDS[i]}|light={int(lit)}|c={ns[0]}|o={ns[1]}|r={ns[2]}\n")
                    assert len(producer_next)==len(watcher_next)==N
                    # In Phase B2 the time/cost of true frame-source custody is
                    # not modeled. Here only the fixed software policy is truth.
                    if t==TICKS-1:
                        site=(w*17+ARMS.index(arm)*13+7)%N
                        honest=report_for(arm,w,t,site,prevs[site],
                                          producer_next[site],lights[site],
                                          tuple(producer_next))
                        assert verified(honest,arm,w,t,site,prevs[site],watcher_next)
                        positive_checks+=1
                        fault_record(
                            f"CHECK|arm={arm}|wave={w}|tick={t}|site={site}|clean=PASS\n")
                        for fault,changed in mutations(
                            honest,arm,w,t,site,tuple(producer_next)):
                            assert changed!=honest,("nonmutation",fault)
                            assert not verified(changed,arm,w,t,site,prevs[site],watcher_next),(
                                "watcher accepted poisoned report",arm,w,fault)
                            reject_counts[fault]+=1
                            check_count+=1
                            fault_record(
                                f"FAULT|arm={arm}|wave={w}|tick={t}|site={site}"
                                f"|fault={fault}|verdict=HELD\n")
                    states=producer_next
                    for i in range(N):
                        watcher[PIDS[i]]=watcher_next[i]
                for i,(c,o,r) in enumerate(states):
                    assert to_tuple(watcher[PIDS[i]])==(c,o,r)
                    phase_a.append(
                        f"ARM|{arm}|WAVE|{w}|id={i}|closed={c}|open={o}|refractory={r}")
            counters[arm]={
                "total_absolute_open_error":error,
                "light_commands":commands,
                "total_closed_to_open_transitions":activated,
                "final_open_population":sum(x[1] for x in states),
            }
        # Seat 1 emits all ARM/WAVE lines first, then all MEASURE lines.
        # Keep the original frozen canonical layout byte-for-byte.
        for name in ARMS:
            m=counters[name]
            phase_a.append(
                f"MEASURE|arm={name}|error={m['total_absolute_open_error']}"
                f"|light_commands={m['light_commands']}"
                f"|activations={m['total_closed_to_open_transitions']}"
                f"|open_final={m['final_open_population']}")
        phase_a.append(
            "GATES|mass=PASS|ids_immutable=PASS|rate_mutation=HELD|id_swap=HELD"
            "|corrupt_obs_anchor=HELD|true_physical_source_authenticated=0")
        phase_a.append(
            "END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0")
        original=("\n".join(phase_a)+"\n").encode("ascii")
        phase_a_path.write_bytes(original)
    assert sha(original)==ORIGINAL_SHA, "Phase A canonical HBP SHA DRIFT"
    assert original.count(b"ARM|")==8748
    assert total_transition==349920
    assert positive_checks==108 and check_count==108*len(FAULTS)==1296
    assert all(v==108 for v in reject_counts.values())
    assert counters["dark"]["light_commands"]==0
    assert counters["dark"]["total_closed_to_open_transitions"]==0
    assert [counters[x]["total_absolute_open_error"] for x in ARMS]==[
        11664000000,5878733220,4516776378,8221918824]
    assert [counters[x]["light_commands"] for x in ARMS]==[0,11664,17820,2835]
    halt=halt_trial()
    return {
        "schema":"ASOLARIA-SEAT4-ROOM04-ADVERSARIAL-WATCHER-B2-V1",
        "seat":"seat-4",
        "evidence_class":"INDEPENDENT_DIGITAL_SOFTWARE_SOURCE_WATCHER",
        "prereg":"experiments/seat4/PREREG-ROOM04-PHOTOCYCLE-WATCHER-B2-20261015.md",
        "frozen_phase_a_sha256":sha(original),
        "frozen_phase_a_snapshots":8748,
        "b2_verified_site_tick_transitions":total_transition,
        "b2_clean_checkpoints_accepted":positive_checks,
        "b2_negative_mutations_rejected":check_count,
        "faults_rejected_by_type":reject_counts,
        "fault_types":list(FAULTS),
        "tick_hbp_sha256":tick_digest.hexdigest(),
        "tick_hbp_bytes":tick_path.stat().st_size,
        "fault_hbp_sha256":fault_digest.hexdigest(),
        "fault_hbp_bytes":fault_path.stat().st_size,
        "metrics":counters,
        "halt":halt,
        "stable_immutable_pids":N,
        "synthetic_rgb_bytes":True,
        "independent_physical_source_authenticated":False,
        "physical_light_or_biology_measured":False,
        "external_authorization_granted":False,
        "coherent_fake_source_plus_fake_watcher_without_anchor":"PROVENANCE_HOLD",
    }


def main():
    a=argparse.ArgumentParser()
    a.add_argument("--tick-hbp",type=Path,required=True)
    a.add_argument("--fault-hbp",type=Path,required=True)
    a.add_argument("--phase-a-hbp",type=Path,required=True)
    a.add_argument("--receipt",type=Path,required=True)
    opt=a.parse_args()
    for path in (opt.tick_hbp,opt.fault_hbp,opt.phase_a_hbp,opt.receipt):
        path.parent.mkdir(parents=True,exist_ok=True)
    receipt=run(opt.tick_hbp,opt.fault_hbp,opt.phase_a_hbp)
    opt.receipt.write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n",encoding="utf-8",newline="\n")
    print(json.dumps({
        "status":"PASS",
        "seat":"seat-4","phase_a_sha256":receipt["frozen_phase_a_sha256"],
        "site_tick_checks":receipt["b2_verified_site_tick_transitions"],
        "snapshots":receipt["frozen_phase_a_snapshots"],
        "clean_checkpoints":receipt["b2_clean_checkpoints_accepted"],
        "rejected_fault_cases":receipt["b2_negative_mutations_rejected"],
        "fault_classes":len(FAULTS),
        "tick_trace_sha256":receipt["tick_hbp_sha256"],
        "fault_trace_sha256":receipt["fault_hbp_sha256"],
        "halt":receipt["halt"],
        "physical_measurement":False,
    },sort_keys=True))


if __name__=="__main__":
    main()
