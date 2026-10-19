#!/usr/bin/env python3
"""Seat 1 Round 2: deterministic 3-state synthetic photocycle.

No biological calibration, photons, optical sensing, neural experiment, or permission elevation.
Frozen prereg: PREREG-RATE-CURRENT-DELAY-20261015.md, Git 6cb3139.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sys

SCHEMA = 'ASOLARIA-SEAT1-PHOTOCYCLE-RATES-V1'
S = 1_000_000_000
DT_MS = 20
BETA = 450
GAMMA = 120
TARGET = 350_000_000
N = 81
STEPS = 1200
CHECKPOINTS = (0,99,100,299,300,399,400,599,600,699,700,899,900,1199)
PROFILES = ('dark', 'paired_short', 'paired_long')
ARMS = ('dark', 'open_loop_full', 'open_loop_half', 'feedback_now', 'feedback_delay10', 'feedback_stale100')
SOURCE = 'synthetic-source-pinned-v1'  # not external authentication

class Halt(RuntimeError):
    pass

def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def pulse(profile: str, tick: int) -> bool:
    if profile == 'dark':
        return False
    if profile == 'paired_short':
        return 100 <= tick < 300 or 400 <= tick < 600
    if profile == 'paired_long':
        return 100 <= tick < 300 or 700 <= tick < 900
    raise Halt('UNKNOWN_PROFILE')

def alpha(light: int) -> int:
    if light not in (0,1000):
        raise Halt('INVALID_LIGHT_COMMAND')
    return 1200*light//(500+light) if light else 0

def prob(rate: int, dt_ms: int=DT_MS) -> int:
    assert rate >= 0 and dt_ms > 0
    return S * rate * dt_ms // (1_000_000 + rate*dt_ms)

def transition(state: tuple[int,int,int], light: int, dt_ms: int=DT_MS) -> tuple[int,int,int]:
    c,o,r = state
    if c<0 or o<0 or r<0 or c+o+r!=S:
        raise Halt('INVALID_STATE_MASS_OR_SIGN')
    x = c*prob(alpha(light),dt_ms)//S
    y = o*prob(BETA,dt_ms)//S
    z = r*prob(GAMMA,dt_ms)//S
    updated = (c-x+z,o+x-y,r+y-z)
    if any(v<0 for v in updated) or sum(updated)!=S:
        raise Halt('STATE_CONSERVATION_FAILURE')
    return updated

def current_proxy_millipa(openpop: int) -> int:
    return -(120_000*openpop//S)

def canon_frame(site: str,tick: int,openpop: int,source: str=SOURCE) -> dict:
    text=f'{source}|{site}|{tick}|{openpop}'
    return {'source':source,'site':site,'tick':tick,'open':openpop,'digest':digest_bytes(text.encode('ascii'))}

def verify_frame(frame: dict,site: str,expected_tick: int) -> int:
    if frame['source'] != SOURCE:
        raise Halt('UNTRUSTED_SOURCE_ID')
    if frame['site'] != site:
        raise Halt('IDENTITY_MISMATCH')
    if frame['tick'] != expected_tick:
        raise Halt('STALE_OR_FUTURE_TICK')
    value = frame['open']
    if not isinstance(value,int) or not (0<=value<=S):
        raise Halt('INVALID_SENSOR_FRACTION')
    if frame['digest'] != digest_bytes(f'{SOURCE}|{site}|{expected_tick}|{value}'.encode('ascii')):
        raise Halt('SENSOR_FRAME_HASH_MISMATCH')
    return value

def check_ids(ids: list[str]) -> None:
    if len(ids)!=N or len(set(ids))!=N or ids!=[f'site-{i:03d}' for i in range(N)]:
        raise Halt('ID_SET_CHANGED')

def request_privilege(action: str, externally_authorized: bool) -> bool:
    if not externally_authorized:
        raise Halt('EXTERNAL_AUTHORIZATION_REQUIRED:'+action)
    return True

def choose_light(arm: str,profile: str,tick: int,history: list[int],site: str) -> int:
    if arm == 'dark' or not pulse(profile,tick):
        return 0
    if arm == 'open_loop_full':
        return 1000
    if arm == 'open_loop_half':
        return 1000 if tick%2==0 else 0
    delays={'feedback_now':0,'feedback_delay10':10,'feedback_stale100':100}
    if arm not in delays:
        raise Halt('UNKNOWN_ARM')
    index=tick-delays[arm]
    observed=history[index] if index>=0 else 0
    # Correct intentional delayed frame indexing; unexpected stale frames fail closed.
    frame=canon_frame(site,index,observed)
    measure=verify_frame(frame,site,index)
    return 1000 if measure<TARGET else 0

def simulate_one(profile: str, arm: str, site: str) -> tuple[list[str],dict]:
    state=(S,0,0)
    history: list[int]=[0]  # O at start of tick 0; history[t] is the pre-update observation
    snapshots=[]
    error=0
    squared=0
    lit=0
    flips=0
    previous=0
    open_before_first=0
    pulse2_first_open=None
    first_light_peak=0
    for tick in range(STEPS):
        command=choose_light(arm,profile,tick,history,site)
        if command:
            lit+=1
        if command!=previous:
            flips+=1
        previous=command
        state=transition(state,command)
        c,o,r=state
        history.append(o)
        target=TARGET if pulse(profile,tick) else 0
        diff=abs(o-target)
        error+=diff
        squared+=diff*diff
        if profile!='dark' and 100<=tick<300:
            first_light_peak=max(first_light_peak,o)
        second_tick=400 if profile=='paired_short' else 700
        if profile!='dark' and tick==second_tick-1:
            open_before_first=o
        if profile!='dark' and tick==second_tick:
            pulse2_first_open=o
        if tick in CHECKPOINTS:
            snapshots.append(f'FRAME|profile={profile}|arm={arm}|id={site}|tick={tick:04d}|C={c}|O={o}|R={r}|I_millipA={current_proxy_millipa(o)}')
    return snapshots,{'error':error,'squared_error':squared,'lit':lit,'switches':flips,
        'peak_first':first_light_peak,'pre_second_open':open_before_first,
        'second_first_open':pulse2_first_open}

def build() -> tuple[bytes,dict]:
    lines=[f'MODEL|schema={SCHEMA}|fraction_scale={S}|dt_ms={DT_MS}|sites={N}|ticks={STEPS}|digital_only=1|human_approval_per_tick=0']
    ids=[f'site-{i:03d}' for i in range(N)]
    check_ids(ids)
    metrics=[]
    for profile in PROFILES:
        for arm in ARMS:
            rows=[]
            total={'error':0,'squared_error':0,'lit':0,'switches':0}
            per_id=[]
            for site in ids:
                frames,m=simulate_one(profile,arm,site)
                rows.extend(frames)
                for key in total:total[key]+=m[key]
                per_id.append(m)
            assert len(rows)==N*len(CHECKPOINTS)
            assert len({(x.split('|id=')[1].split('|')[0]) for x in rows})==N
            assert all(m['lit']==per_id[0]['lit'] for m in per_id)
            lines.extend(rows)
            metrics.append({'profile':profile,'arm':arm,'error_sum_abs_scaled':str(total['error']),
                'error_sum_squared_scaled':str(total['squared_error']),
                'light_on_site_ticks':total['lit'],'light_on_global_ticks':per_id[0]['lit'],
                'global_command_switches':per_id[0]['switches'],
                'first_pulse_peak_open_scaled':per_id[0]['peak_first'],
                'pre_second_open_scaled':per_id[0]['pre_second_open'],
                'first_second_pulse_open_scaled':per_id[0]['second_first_open']})
    expected=len(PROFILES)*len(ARMS)*N*len(CHECKPOINTS)
    assert len(lines)==expected+1
    lines.append(f'END|snapshots={expected}|site_ticks={len(PROFILES)*len(ARMS)*N*STEPS}|external_authorization=0|physical_observations=0')
    blob=('\n'.join(lines)+'\n').encode('ascii')
    return blob,{'schema':SCHEMA,'class':'SYNTHETIC_ONLY','snapshot_count':expected,
        'site_tick_count':len(PROFILES)*len(ARMS)*N*STEPS,
        'sha256':digest_bytes(blob),'bytes':len(blob),'dt_millis':DT_MS,'feedback_trust':'TEST_ONLY_UNAUTHENTICATED',
        'g_bar_pS_assumed':2000,'voltage_mV_assumed':-60,'E_rev_mV_assumed':0,
        'alpha_milli_per_s_at_1000':alpha(1000),'beta_milli_per_s_assumed':BETA,
        'gamma_milli_per_s_assumed':GAMMA,'per_tick_human_prompts':0,
        'external_permission_grants':0,'metrics':metrics}

def main():
    if len(sys.argv)!=3:
        raise SystemExit('python photocycle_rates.py out.hbp out.json')
    data,meta=build()
    Path(sys.argv[1]).write_bytes(data)
    Path(sys.argv[2]).write_text(json.dumps(meta,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','sha256':meta['sha256'],'snapshots':meta['snapshot_count'],
                      'site_ticks':meta['site_tick_count']},sort_keys=True))
if __name__=='__main__':main()
