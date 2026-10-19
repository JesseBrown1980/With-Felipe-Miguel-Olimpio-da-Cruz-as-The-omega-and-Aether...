#!/usr/bin/env python3
"""Independently check complete Round3 HBP bytes, bounds and false-positive failure."""
import sys,hashlib,base64,struct,json
SHA='b4672f15a1003ef1714073eb0664942921f15b6ea8588a39701a42fc9485f8a9'
Q=1000000
TICKS=(0,7,31,63,127,191,239)
ARMS=('dark','short','long','continuous_then_dark')
def audit(raw):
    assert hashlib.sha256(raw).hexdigest()==SHA,'full trace SHA mismatch'
    lines=raw.splitlines(keepends=True)
    assert len(lines)==1512,'wrong snapshots'
    n=0
    for model in ('3','4'):
      for arm in ARMS:
       for wave in range(27):
        for tick in TICKS:
         row=lines[n];assert row.endswith(b'\n') and b'\r' not in row
         parts=row[:-1].decode('ascii').split('|');assert len(parts)==6
         fields={k:v for k,v in (part.split('=',1) for part in parts)}
         assert (fields['model'],fields['arm'],int(fields['wave']),int(fields['tick']))==(model,arm,wave,tick)
         assert len(fields['wave'])==2 and len(fields['tick'])==3
         state=base64.b64decode(fields['sites'],validate=True)
         assert len(state)==1296
         nums=struct.unpack('<324I',state)
         current=0
         for s in range(81):
          a,b,c,d=nums[s*4:s*4+4]
          assert a+b+c+d==Q
          if model=='3':
           assert d==0;current+=2000*b
          else: current+=2000*b+500*c
          if arm=='dark':assert b==c==0
         assert int(fields['total_current'])==current
         n+=1
    assert n==1512
    bad=bytearray(raw);bad[len(bad)//2]^=1
    assert hashlib.sha256(bad).hexdigest()!=SHA
    return {'status':'PASS_INDEPENDENT_AUDIT','snapshots_checked':n,'sites_per_snapshot':81,
            'snapshot_state_bytes_each':1296,'sha256':SHA,'tamper_detected':True,
            'raw_bytes':len(raw),'physical_source_attested':False}
if __name__=='__main__':
    assert len(sys.argv)==2,'usage: python verify_round3.py <hbp>'
    with open(sys.argv[1],'rb') as f:print(json.dumps(audit(f.read()),sort_keys=True))
