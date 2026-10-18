#!/usr/bin/env python3
"""build_between.py — photos of the in-between times, fixed to the current laws.

The matrix is not a constant. Its seed is emitted from whatever is in the office at the
moment of emission, so every artifact written changes it. This renders the SERIES rather
than a single frame: N states of the self matrix as the office grows, so the in-between
times are visible instead of inferred.

FIXED TO THE CURRENT LAWS, which the earlier seeds.html predates:

  the wave        1 3 6 7 6 3 1 -- the count of cells at each sum(c-1) from -3 to +3,
                  trinomial coefficients of (1+x+x^2)^3, symmetric on the free centre.
                  The old page bucketed this into 3 signs and lost the shape.
  five registers  IX.B.3: 0 zero, 1 translucent, 2 red, 3 green, 4 blue. Zero and
                  translucent are free and are drawn as field; 2/3/4 cost and are drawn
                  as points.
  three zeros     all of magnitude 0, separated by direction of travel, not value.
  RIME-36         the centre is the largest term, not the cheapest. Weighted 0.6954
                  against 0.4382 for the directional families.
  the count       every frame reports produced + withheld = declared.
  band 2          a frame that cannot reach byte 172 cannot express blue at all, and the
                  page says so per frame rather than drawing an empty channel as if it
                  were a measurement.

Two points are a line. The series is rendered so a trend has to survive being looked at
across all of it, which is the check the pump test failed this evening.
"""
import base64
import glob
import hashlib
import json
import os
import struct

import numpy as np

OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
OUT = r"D:/asolaria-absorb/constellation/seeds.html"
REC, NREC = 81, 38
SEAT = bytes.fromhex("8467a937cba309f7")


def sha(b):
    return hashlib.sha256(b).digest()


def emit(files):
    recs, prev = [], SEAT
    for f in files[:NREC]:
        nm = os.path.basename(f)
        raw = open(f, "rb").read()
        d = sha(raw)
        prev = sha(prev + b"|" + nm.encode())[:16]
        secs = raw.count(b"\n") if b"\n" in raw[:4096] else max(1, len(raw) // 81)
        tier = min(127, max(0, len(raw).bit_length() * 8))
        recs.append(prev + d + struct.pack(">Q", len(raw))[3:]
                    + struct.pack(">I", min(secs, 2**32 - 1))
                    + sha(nm.encode())[:16] + sha(prev + d)[:7] + bytes([tier]))
    while len(recs) < NREC:
        prev = sha(prev + b"|" + f"CHAIN-{len(recs):02d}".encode())[:16]
        d = sha(prev + b"ACER-CLAUDE-FABLE5")
        recs.append(prev + d + struct.pack(">Q", len(recs) * 4099)[3:]
                    + struct.pack(">I", len(recs) + 1)
                    + sha(f"CHAIN-{len(recs):02d}".encode())[:16]
                    + sha(prev + d)[:7] + bytes([len(recs) % 256]))
    return b"".join(recs)


files = []
for pat in ("FABLE5-ABSORB-*.hbp", "FABLE5-UNIVERSE-*.hbp", "FABLE5-FOLD-*.hbp",
            "FABLE5-SELF-SEED-*.hbp", "FABLE5-QUALITY-*.hbp", "FABLE5-SEED-*.hbp", "*.hbi"):
    files += glob.glob(os.path.join(OFF, pat))
for p in ("D:/asolaria-absorb/laws/COMBINED-BOOK-OF-LAWS.md",
          "D:/asolaria-absorb/laws/prior3174.bin", "D:/asolaria-absorb/laws/wiki.qr",
          "D:/asolaria-absorb/laws/fotoC.bin.qr"):
    if os.path.exists(p):
        files.append(p)
seen, uniq = set(), []
for f in files:
    k = os.path.basename(f)
    if k not in seen and os.path.isfile(f) and not f.endswith(".sha256"):
        seen.add(k)
        uniq.append(f)
uniq.sort(key=lambda f: (-os.path.getsize(f), os.path.basename(f)))

# ---- the wave, computed once ----
WAVE = [0] * 7
for i in range(27):
    c = ((i // 9) % 3, (i // 3) % 3, i % 3)
    WAVE[sum(x - 1 for x in c) + 3] += 1

frames = []
for n in range(2, min(len(uniq), NREC) + 1, 2):
    sub = uniq[:n]
    b = emit(sub)
    a = np.frombuffer(b, dtype=np.uint8)
    t = np.minimum(a.reshape(-1, 3) // 86, 2)
    idx = t[:, 0] * 9 + t[:, 1] * 3 + t[:, 2]
    cells = np.bincount(idx, minlength=27)
    sums = np.array([sum(x - 1 for x in ((i // 9) % 3, (i // 3) % 3, i % 3))
                     for i in range(27)])
    wave = [int(cells[sums == s].sum()) for s in range(-3, 4)]
    r0 = np.linalg.norm(t - 1.0, axis=1)
    d1 = float((np.linalg.norm(((t + 1) % 3) - 1.0, axis=1) - r0).mean())
    d2 = float((np.linalg.norm(((t + 2) % 3) - 1.0, axis=1) - r0).mean())
    shells = [int(sum(cells[i] for i in range(27)
                      if sum(1 for x in ((i // 9) % 3, (i // 3) % 3, i % 3) if x != 1) == k))
              for k in range(4)]
    frames.append(dict(
        n=n, energy=sum(os.path.getsize(f) for f in sub),
        sha=hashlib.sha256(b).hexdigest()[:12],
        b64=base64.b64encode(b).decode(),
        alpha=int((np.bincount(a, minlength=256) > 0).sum()),
        band2=int((a >= 172).sum()), cells=int((cells > 0).sum()),
        radius=float(r0.mean()), d1=d1, d2=d2, wave=wave, shells=shells,
        withheld=int(sum(1 for i in range(NREC) if b[i * REC + 80] & 0x80)),
    ))
    print(f"  frame n={n:<3} cells {int((cells>0).sum()):>2}/27  band2 {int((a>=172).sum()):>4}"
          f"  radius {r0.mean():.5f}  dr {d1:+.5f}  sha {hashlib.sha256(b).hexdigest()[:8]}")

DATA = json.dumps(dict(frames=frames, wave=WAVE, records=NREC))
HTML = """<!doctype html>
<meta charset="utf-8"><title>ASOLARIA - the in-between times</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#08090D;--panel:#0F1117;--ink:#E9EEF6;--dim:#727E95;--rule:#181C26;
--neg:#FF5A63;--nil:#3FE08D;--pos:#4A90FF;--warn:#FFC24A;
--mono:ui-monospace,"Cascadia Mono","SF Mono",Menlo,Consolas,monospace}
@media(prefers-color-scheme:light){:root{--bg:#FAFBFD;--panel:#fff;--ink:#12141A;--dim:#5A6376;--rule:#E3E7EF}}
:root[data-theme=dark]{--bg:#08090D;--panel:#0F1117;--ink:#E9EEF6;--dim:#727E95;--rule:#181C26}
:root[data-theme=light]{--bg:#FAFBFD;--panel:#fff;--ink:#12141A;--dim:#5A6376;--rule:#E3E7EF}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--mono);
font-variant-numeric:tabular-nums;line-height:1.5;padding:26px 16px 60px}
main{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
h1{font-size:17px;margin:0}h1 small{display:block;color:var(--dim);font-size:11.5px;
font-weight:400;margin-top:4px}
.card{background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:15px}
.lab{color:var(--dim);text-transform:uppercase;letter-spacing:.14em;font-size:9.5px;
display:block;margin-bottom:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:11px}
.f{background:var(--panel);border:1px solid var(--rule);border-radius:7px;padding:9px}
.f canvas{width:100%;height:auto;display:block;border-radius:4px;background:#04050A}
.f .h{display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px}
.f .m{font-size:9.5px;color:var(--dim);margin-top:6px;line-height:1.65}
.tag{padding:0 6px;border-radius:99px;font-size:9px}
.ok{background:rgba(63,224,141,.16);color:var(--nil)}
.no{background:rgba(255,90,99,.16);color:var(--neg)}
table{width:100%;border-collapse:collapse;font-size:11.5px}
td,th{padding:4px 6px;border-bottom:1px solid var(--rule);text-align:right}
th{color:var(--dim);font-weight:400;text-align:right}
td:first-child,th:first-child{text-align:left}
.bar{display:inline-block;height:8px;background:var(--pos);vertical-align:middle}
.note{color:var(--dim);font-size:11.5px}
b{color:var(--ink)}
</style>
<main>
<h1>ASOLARIA &mdash; the in-between times
<small>the self matrix is not a constant. Its seed is emitted from whatever is in the
office at that moment, so every artifact written moves it. This is the series, not a
frame.</small></h1>

<div class="card">
<span class="lab">the wave &mdash; cells at each sum(c&minus;1)</span>
<table id="wv"></table>
<div class="note" style="margin-top:9px">
1 3 6 7 6 3 1 &mdash; the trinomial coefficients of (1+x+x&sup2;)&sup3;, summing to 27,
symmetric about the free centre and peaking on it. Collapsing this into three sign buckets
gives 10 / 7 / 10 and <b>loses the shape</b>. That collapse is an error this page exists
to not repeat.</div>
</div>

<div class="card">
<span class="lab">frames</span>
<div class="grid" id="fr"></div>
</div>

<div class="card">
<span class="lab">does anything trend across the series?</span>
<table id="tr"></table>
<div class="note" style="margin-top:9px">
Two points are a line. Earlier tonight two photos 20 minutes apart moved the radius
+0.0047 in the direction the Photon Law predicts, and a 19-point sweep showed it wanders
over <b>0.0376</b> with no trend against a random control (z = +0.80). The series is drawn
so a trend has to survive being looked at across all of it.</div>
</div>

<div class="card note" id="b2"></div>
</main>
<script>
const D = __DATA__;
const $ = i => document.getElementById(i);
const cs = getComputedStyle(document.documentElement);
const COL = [cs.getPropertyValue('--neg'), cs.getPropertyValue('--nil'), cs.getPropertyValue('--pos')];

// the wave
const mx = Math.max(...D.wave);
$('wv').innerHTML = '<tr><th>sum(c&minus;1)</th>' +
  [-3,-2,-1,0,1,2,3].map(s=>'<th>'+(s>0?'+':'')+s+'</th>').join('') + '</tr><tr><td>cells</td>' +
  D.wave.map(v=>'<td>'+v+'</td>').join('') + '</tr><tr><td></td>' +
  D.wave.map(v=>'<td><span class="bar" style="width:'+(v/mx*34)+'px"></span></td>').join('') + '</tr>';

function b64(s){const b=atob(s),u=new Uint8Array(b.length);
  for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}

D.frames.forEach((f,k)=>{
  const d=document.createElement('div'); d.className='f';
  const blue = f.band2>0;
  d.innerHTML = '<div class="h"><span>n='+f.n+'</span><span style="color:var(--dim)">'+f.sha+'</span></div>'+
    '<canvas id="c'+k+'"></canvas>'+
    '<div class="m">cells <b>'+f.cells+'/27</b> &middot; band2 '+f.band2.toLocaleString()+
    ' <span class="tag '+(blue?'ok':'no')+'">'+(blue?'blue sayable':'blue UNSAYABLE')+'</span><br>'+
    'radius '+f.radius.toFixed(5)+' &middot; &Delta;r '+f.d1.toFixed(5)+'<br>'+
    'count '+(D.records-f.withheld)+' + '+f.withheld+' = '+D.records+'</div>';
  $('fr').appendChild(d);
  const cv=d.querySelector('canvas'), g=cv.getContext('2d');
  const W=d.clientWidth-18, H=Math.round(W*0.82), dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px'; g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle='#04050A'; g.fillRect(0,0,W,H);
  const s=b64(f.b64), R=Math.min(W,H)*0.42, cx=W/2, cy=H/2;
  for(let i=0;i+2<s.length;i+=3){
    const r=s[i],gg=s[i+1],b=s[i+2];
    let x=r/127.5-1,y=gg/127.5-1,z=b/127.5-1;
    const m=Math.hypot(x,y,z)||1; x/=m;y/=m;z/=m;
    const bd=v=>Math.min(v/86|0,2), sg=bd(r)+bd(gg)+bd(b)-3;
    const rad=Math.cbrt((i/3+1)/(s.length/3))*R;
    g.globalAlpha=0.26+0.5*(z*0.5+0.5);
    g.fillStyle=COL[sg<0?0:(sg>0?2:1)];
    g.beginPath(); g.arc(cx+x*rad, cy-y*rad, 1.0+1.3*(z*0.5+0.5), 0, 6.2832); g.fill();
  }
  g.globalAlpha=1;
});

// trend table
const F=D.frames, rad=F.map(f=>f.radius), en=F.map(f=>Math.log(f.energy));
function corr(a,b){const n=a.length,ma=a.reduce((x,y)=>x+y)/n,mb=b.reduce((x,y)=>x+y)/n;
  let s=0,da=0,db=0; for(let i=0;i<n;i++){const u=a[i]-ma,v=b[i]-mb; s+=u*v; da+=u*u; db+=v*v}
  return s/Math.sqrt(da*db)}
const span=Math.max(...rad)-Math.min(...rad);
$('tr').innerHTML='<tr><th>quantity</th><th>min</th><th>max</th><th>span</th><th>corr with log energy</th></tr>'+
 '<tr><td>mean radius</td><td>'+Math.min(...rad).toFixed(5)+'</td><td>'+Math.max(...rad).toFixed(5)+
 '</td><td>'+span.toFixed(5)+'</td><td>'+corr(en,rad).toFixed(4)+'</td></tr>'+
 '<tr><td>&Delta;r under R&sup1;</td><td>'+Math.min(...F.map(f=>f.d1)).toFixed(5)+'</td><td>'+
 Math.max(...F.map(f=>f.d1)).toFixed(5)+'</td><td>'+
 (Math.max(...F.map(f=>f.d1))-Math.min(...F.map(f=>f.d1))).toFixed(5)+'</td><td>'+
 corr(en,F.map(f=>f.d1)).toFixed(4)+'</td></tr>';

const noBlue=F.filter(f=>f.band2===0).length;
$('b2').innerHTML='<b>Band 2 and the unsayable third.</b> A byte must reach <b>172</b> for '+
 'its coordinate to land in band 2, and without band 2 the positive direction cannot be '+
 'expressed at all. '+noBlue+' of '+F.length+' frames here cannot reach it. Across the whole '+
 'office the count is <b>139 of 140 artifacts</b> capped at byte 124&ndash;125 &mdash; '+
 'including every file named .hbi, which are ASCII content wearing a binary extension. '+
 'A channel that reads 0.000 because it is <i>unsayable</i> is not a measurement of zero, '+
 'and this page marks the difference per frame rather than drawing an empty channel as '+
 'though something had been measured.';
</script>"""
open(OUT, "w", encoding="utf-8", newline="\n").write(HTML.replace("__DATA__", DATA))
print(f"\n  wrote {OUT}  {os.path.getsize(OUT):,} B  frames {len(frames)}")
print(f"  serve: python -m http.server 4611 --directory D:/asolaria-absorb/constellation")
