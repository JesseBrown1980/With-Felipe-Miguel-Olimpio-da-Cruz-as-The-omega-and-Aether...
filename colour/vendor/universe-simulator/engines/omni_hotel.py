#!/usr/bin/env python3
"""OMNIMETS + OMNIHOTEL + OMNISCHEDULER + COLOR-PID (container, E=0).

- OmniMets     : per-lane message-collection telemetry (ported from packages/omnimets/mets.ts).
- OmniHotel    : room-sector substrate — 12 lanes x 100 shards (ROOM-SECTOR-SUBSTRATE-CANON),
                 Hilbert-Hotel rooms that extend without repacking.
- OmniScheduler: call-driven task-row emitter (faithful minimal port; acer source is private).
- ColorPID     : gradient-color addressing. PID = (r,g,b) 3D coordinate. From ONE center you read
                 every PID's blast_radius (distance) + direction (hue). 12 rainbow types, 27 (3x3x3)
                 spheres, 256^3 holes. Important PIDs ("stars") = brightest/most-saturated colors.
                 HONEST: radius alone is a shell (degenerate); the full color carries direction too."""
import math, hashlib, colorsys

# ---- OmniMets: 7 body-lanes (matches the revolver LANE_CYCLE) ----
LANES = ['nervous','circulatory','skeletal','muscular','immune','memory','lymphatic']
class OmniMets:
    def __init__(self): self.s={l:{'dispatch':0,'promote':0,'defer':0,'halt':0,'error':0} for l in LANES}
    def bump(self, lane, kind): self.s.setdefault(lane,{k:0 for k in ('dispatch','promote','defer','halt','error')})[kind]+=1
    def snapshot(self):
        tot={k:sum(self.s[l][k] for l in self.s) for k in ('dispatch','promote','defer','halt','error')}
        return {'per_lane':self.s,'totals':tot}

# ---- OmniHotel: 12 room-sector lanes x 100 shards ----
class OmniHotel:
    LANES=12; SHARDS=100
    def __init__(self): self.rooms={}   # (lane,shard) -> pid, sparse (Hilbert-Hotel: only occupied kept)
    def assign(self, pid, key):
        h=int.from_bytes(hashlib.sha256(key.encode()).digest()[:4],'big')
        lane=h%self.LANES; shard=(h//self.LANES)%self.SHARDS
        self.rooms[(lane,shard)]=pid; return lane,shard
    def occupancy(self): return len(self.rooms)

# ---- OmniScheduler: call-driven, emits task rows, promote=0 (E=0) ----
class OmniScheduler:
    def __init__(self): self.rows=[]
    def emit(self, verb, pid):
        self.rows.append({'verb':verb,'pid':pid,'promote':0,'fire':0}); return self.rows[-1]

# ---- ColorPID: gradient addressing ----
CENTER=(128,128,128)
def pid_color(key):
    h=hashlib.sha256(key.encode()).digest(); return (h[0],h[1],h[2])
def blast_radius(c): return math.dist(c, CENTER)
def color_dist(a,b): return math.dist(a,b)
def rainbow12(c):
    hh,_,_=colorsys.rgb_to_hsv(c[0]/255,c[1]/255,c[2]/255); return int(hh*12)%12
def sphere27(c): return (c[0]//86)*9+(c[1]//86)*3+(c[2]//86)
def saturation(c):
    _,s,v=colorsys.rgb_to_hsv(c[0]/255,c[1]/255,c[2]/255); return s*v

if __name__=='__main__':
    mets=OmniMets(); hotel=OmniHotel(); sched=OmniScheduler()
    colors={}
    for i in range(2000):
        pid=f"PID{i}"; colors[pid]=pid_color(pid)
        mets.bump(LANES[i%7],'dispatch'); mets.bump(LANES[i%7],'promote' if i%3 else 'defer')
        hotel.assign(pid, pid); sched.emit('evaluate', pid)
    snap=mets.snapshot()
    print(f"OmniMets   : {snap['totals']['dispatch']} dispatch / {snap['totals']['promote']} promote collected across {len(LANES)} lanes")
    print(f"OmniHotel  : {hotel.occupancy()} rooms occupied of {hotel.LANES}x{hotel.SHARDS}={hotel.LANES*hotel.SHARDS}")
    print(f"OmniSched  : {len(sched.rows)} task rows emitted (promote=0, fire=0)")
    # color addressing: 1 center -> distances to all; coarse lattices populated
    from collections import Counter
    r12=len(Counter(rainbow12(c) for c in colors.values())); s27=len(Counter(sphere27(c) for c in colors.values()))
    a,b="PID0","PID500"
    print(f"ColorPID   : dist({a},{b})={color_dist(colors[a],colors[b]):.1f} from colors alone; "
          f"{r12}/12 rainbow, {s27}/27 spheres, {256**3:,} holes")
    star=max(colors, key=lambda p:saturation(colors[p]))
    print(f"             brightest 'star' PID: {star} {colors[star]}")
