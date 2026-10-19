#!/usr/bin/env python3
"""Round3 216-context digital checkpoint memory reconstruction and recurrence replay.
Uses the frozen published unified model. NOT physical optical or photonic storage.
Command: python round3_memory_resume.py source.hbp result.hbp
"""
import sys, hashlib, base64, struct, json
import round3_unified as reference
SHA='b4672f15a1003ef1714073eb0664942921f15b6ea8588a39701a42fc9485f8a9'
def hash_of(v): return hashlib.sha256(v).hexdigest()
def read(raw):
    assert hash_of(raw)==SHA
    out={}
    for line in raw.splitlines():
        fields=dict(x.split('=',1) for x in line.decode('ascii').split('|'))
        key=(fields['model'],fields['arm'],int(fields['wave']),int(fields['tick']))
        assert key not in out
        out[key]=(base64.b64decode(fields['sites'],validate=True),int(fields['total_current']))
    assert len(out)==1512
    return out

def restore(a,b,p,pair):
    if pair=='AB':return a+b
    if pair=='AP':return a+bytes(x^y for x,y in zip(a,p))
    if pair=='BP':return bytes(x^y for x,y in zip(b,p))+b
    raise AssertionError('bad pair')

def run(source,destination):
    source=read(open(source,'rb').read())
    h=hashlib.sha256();contexts=0;recoveries=0;updates=0;bad_held=0
    with open(destination,'wb') as dest:
      for model in ('3','4'):
       for arm in reference.ARMS:
        for wave in range(27):
         original,oldcurrent=source[(model,arm,wave,63)]
         assert len(original)==1296
         A=original[:648];B=original[648:];P=bytes(x^y for x,y in zip(A,B))
         originalsha=hash_of(original)
         broken=bytearray(B);broken[0]^=1
         assert hash_of(restore(A,bytes(broken),P,'AB'))!=originalsha
         bad_held+=1
         expected,end_current=source[(model,arm,wave,239)]
         for pair in ('AB','AP','BP'):
          recovered=restore(A,B,P,pair)
          assert hash_of(recovered)==originalsha
          states=[tuple(v[:3]) if model=='3' else tuple(v)
                  for v in struct.iter_unpack('<4I',recovered)]
          assert len(states)==81
          for tick in range(64,240):
           for site in range(81):
            lit=reference.light(tick,site,wave,arm)
            nxt=reference.step3(states[site],lit) if model=='3' else reference.step4(states[site],lit)
            assert all(x>=0 for x in nxt) and sum(nxt)==reference.Q
            states[site]=nxt; updates+=1
          packed=b''.join(struct.pack('<4I',*(s+(0,) if model=='3' else s)) for s in states)
          assert packed==expected
          current=sum((2000*s[1] if model=='3' else 2000*s[1]+500*s[2]) for s in states)
          assert current==end_current
          line=(f'model={model}|arm={arm}|wave={wave:02d}|pair={pair}|'+
                f'checkpoint_sha256={originalsha}|final_sha256={hash_of(packed)}|current={current}\n').encode('ascii')
          dest.write(line);h.update(line);recoveries+=1
         contexts+=1
    assert (contexts,recoveries,updates,bad_held)==(216,648,9237888,216)
    return {'status':'PASS_DIGITAL_MEMORY_RESTART','contexts':contexts,
        'recoveries':recoveries,'site_tick_updates':updates,'bad_pair_held':bad_held,
        'resume_hbp_sha256':h.hexdigest(),'physical_optical_storage':False,
        'peer_independence':'same frozen model code reused, no cross-seat acceptance'}
if __name__=='__main__':
    assert len(sys.argv)==3,'usage: python round3_memory_resume.py source.hbp result.hbp'
    print(json.dumps(run(sys.argv[1],sys.argv[2]),sort_keys=True))
