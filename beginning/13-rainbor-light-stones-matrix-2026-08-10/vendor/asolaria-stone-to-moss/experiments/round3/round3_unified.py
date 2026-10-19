#!/usr/bin/env python3
"""Round3 frozen synthetic 81-site, 3/4-state, four-arm reference.
Independent public fixture source only, not a physical biology measurement.
Use: python round3_unified.py <output.hbp>
"""
import sys, hashlib, base64, struct, json
Q=1000000
ARMS=('dark','short','long','continuous_then_dark')
TICKS=(0,7,31,63,127,191,239)
def light(t,site,wave,arm):
    k=t+(site%5)+(wave%7)
    return arm=='short' and k%32<4 or arm=='long' and k%64<24 or arm=='continuous_then_dark' and t<120

def step3(st,ill):
    c,o,r=st
    a=c*300000//Q if ill else 0
    b=o*170000//Q
    d=r*60000//Q
    return (c-a+d,o+a-b,r+b-d)

def step4(st,ill):
    c1,o1,o2,c2=st
    a=c1*300000//Q if ill else 0
    b=o1*110000//Q
    c=o1*80000//Q
    d=o2*40000//Q
    e=c2*55000//Q
    f=c1*20000//Q if ill else 0
    g=o2*25000//Q
    return (c1-a-f+c+e,o1+a-b-c+g,o2+b-d-g,c2+d+f-e)

def run(path):
    h=hashlib.sha256();checks=0;updates=0;dark_ok=True
    with open(path,'wb') as out:
        for model in ('3','4'):
            for arm in ARMS:
                for wave in range(27):
                    initial=(Q,0,0) if model=='3' else (Q,0,0,0)
                    states=[initial for _ in range(81)]
                    for t in range(240):
                        frame=bytearray(); current=0
                        for s in range(81):
                            nxt=step3(states[s],light(t,s,wave,arm)) if model=='3' else step4(states[s],light(t,s,wave,arm))
                            assert all(x>=0 for x in nxt) and sum(nxt)==Q
                            states[s]=nxt
                            current+=2000*nxt[1] if model=='3' else 2000*nxt[1]+500*nxt[2]
                            updates+=1
                            if t in TICKS:
                                frame.extend(struct.pack('<4I',*(nxt+(0,) if model=='3' else nxt)))
                        if arm=='dark' and current: dark_ok=False
                        if t in TICKS:
                            line=(f'wave={wave:02}|arm={arm}|model={model}|tick={t:03}|sites='+
                                  base64.b64encode(frame).decode('ascii')+
                                  f'|total_current={current}\n').encode('ascii')
                            out.write(line);h.update(line);checks+=1
    assert updates==4199040 and checks==1512 and dark_ok
    return {'status':'PASS_SOFTWARE_UNIFIED','site_tick_updates':updates,'whole_site_snapshots':checks,
            'trace_sha256':h.hexdigest(),'dark_null':dark_ok,'physical_sensor':False,
            'calibrated_photocycle':False,'model_units':'synthetic integer'}
if __name__=='__main__':
    assert len(sys.argv)==2,'usage: python round3_unified.py output.hbp'
    print(json.dumps(run(sys.argv[1]),sort_keys=True))
