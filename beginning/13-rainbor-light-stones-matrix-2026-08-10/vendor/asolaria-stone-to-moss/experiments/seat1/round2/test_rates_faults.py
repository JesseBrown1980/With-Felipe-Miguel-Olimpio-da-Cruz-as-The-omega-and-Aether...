#!/usr/bin/env python3
"""Actually injected software faults; source+watcher collusion remains HELD."""
import json
from pathlib import Path
import sys
import photocycle_rates as p

def assert_halt(label,fn,reason):
    try: fn()
    except p.Halt as exc:
        assert str(exc).startswith(reason),(label,exc,reason)
        return {'fault':label,'exercised':True,'stage':'before_actuation_or_state_commit',
                'detected':True,'reason':str(exc),'result':'HALT'}
    raise AssertionError('EXPECTED_HALT_NOT_SEEN:'+label)

def controller_accepts(frame,site,expected_tick,state):
    measured=p.verify_frame(frame,site,expected_tick)
    command=1000 if measured<p.TARGET else 0
    return p.transition(state,command)

def run():
    assert p.alpha(0)==0 and p.alpha(1000)==800
    assert p.transition((p.S,0,0),0)==(p.S,0,0)
    assert p.current_proxy_millipa(0)==0 and p.current_proxy_millipa(p.S)==-120000
    state=(p.S,0,0)
    for i in range(p.STEPS):
        drive=1000 if p.pulse('paired_short',i) else 0
        state=p.transition(state,drive)
        assert min(state)>=0 and sum(state)==p.S
        if i==99:pre_open=state[1]
        if i==110:on_open=state[1]
        if i==299:peak_open=state[1]
        if i==330:after_off=state[1]
    assert pre_open==0 and on_open>0 and after_off<peak_open
    after_24=state
    for t in range(5000):state=p.transition(state,0)
    assert state[0]>after_24[0] and state[1]<after_24[1]
    coarse=(p.S,0,0);fine=(p.S,0,0)
    for t in range(1200):coarse=p.transition(coarse,1000 if p.pulse('paired_short',t) else 0,20)
    for t in range(2400):fine=p.transition(fine,1000 if p.pulse('paired_short',t//2) else 0,10)
    discrepancy=abs(coarse[1]-fine[1]);assert discrepancy<=10_000_000,discrepancy
    site='site-042';tick=250;o=100_000_000;frame=p.canon_frame(site,tick,o)
    original=(p.S,0,0);events=[]
    f={**frame,'source':'forged-source'}
    events.append(assert_halt('wrong_source',lambda:controller_accepts(f,site,tick,original),'UNTRUSTED_SOURCE_ID'))
    f={**frame,'tick':tick-1}
    events.append(assert_halt('unexpected_stale_epoch',lambda:controller_accepts(f,site,tick,original),'STALE_OR_FUTURE_TICK'))
    f={**frame,'open':o+1}
    events.append(assert_halt('payload_change_without_digest',lambda:controller_accepts(f,site,tick,original),'SENSOR_FRAME_HASH_MISMATCH'))
    f={**frame,'site':'site-043'}
    events.append(assert_halt('wrong_identity_in_frame',lambda:controller_accepts(f,site,tick,original),'IDENTITY_MISMATCH'))
    events.append(assert_halt('mass_injection_into_live_state',lambda:p.transition((p.S+1,0,0),1000),'INVALID_STATE_MASS_OR_SIGN'))
    ids=[f'site-{i:03d}' for i in range(81)];ids[42]='site-041'
    events.append(assert_halt('duplicate_runtime_site_identity',lambda:p.check_ids(ids),'ID_SET_CHANGED'))
    events.append(assert_halt('unauthorized_external_publish',lambda:p.request_privilege('HUGGINGFACE_PUBLISH',False),'EXTERNAL_AUTHORIZATION_REQUIRED'))
    events.append(assert_halt('invalid_light_drive',lambda:p.transition(original,500),'INVALID_LIGHT_COMMAND'))
    # Authenticated-seeming coherent source+watcher forgery is not externally authenticated.
    forged=p.canon_frame(site,tick,900_000_000)
    assert p.verify_frame(forged,site,tick)==900_000_000
    return {'status':'PASS','test_class':'digital_fault_injections_not_source_proof',
            'events':events,'executed_negative_controls':len(events),
            'coherent_source_and_watcher_forgery':{'stage':'preactuation','exercised':True,
             'cryptographic_external_authentication':False,'status':'HELD_UNAUTHENTICATED'},
            'conservation_ticks':1200,'dark_null':True,'pulse_onset':True,
            'off_response':True,'post_pulse_dark_recovery':True,
            'refinement_abs_open_diff_scaled':discrepancy,
            'refinement_limit_scaled':10_000_000,
            'autonomous_per_tick_permission_prompts':0,
            'physical_biological_data':False}

if __name__=='__main__':
    result=run()
    if len(sys.argv)==2:Path(sys.argv[1]).write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='events'},sort_keys=True))
