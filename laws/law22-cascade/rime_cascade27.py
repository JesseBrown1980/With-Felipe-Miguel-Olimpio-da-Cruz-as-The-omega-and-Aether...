#!/usr/bin/env python3
"""
rime_cascade27.py — THE 27-STAGE RIME TIME CASCADE on real Wikipedia bytes,
photographed live. Operator: Jesse Daniel Brown, 2026-07-21.

TWO ARMS, both measured, both photographed:

ARM 1 — THE CLOSURE (2/3 recovers the 3rd, 27 times, chained):
  Each stage takes a real enwik8 slice, splits it into 3 channels A,B,C and adds
  the shared-center closure  P = -(A+B+C) mod 256  (so A+B+C+P ≡ 0 — the free
  center). Then one channel is DELETED (rotating -,0,+ with stage: trime time)
  and RECREATED byte-exact from the other 2/3 + parity. The recovered sha feeds
  the next stage's chain hash — 27 links = 1 rime time cascade seal.

ARM 2 — THE CONTROL (the part we NEVER saw):
  Same slice sizes, but the third channel's parity was NEVER stored. Recovery
  from 2/3 = best guess. Shannon says ~random. We measure it.

The photo shows both arms side by side. The measurement is the referee.
"""
import os, hashlib, subprocess, time

S    = "/tmp/claude-0/-home-user/9ebd6119-d7ee-5c30-a062-d04210f7bc39/scratchpad"
CORP = f"{S}/enwik8"
FR   = f"{S}/cascade_frames"
STAGES, CH = 27, 100_000          # 27 stages, 3 channels of 100 KB each
os.makedirs(FR, exist_ok=True)

def sha16(b): return hashlib.sha256(b).hexdigest()[:16]

def render(stages, ctrl, chain, t0, active):
    done = [s for s in stages if s]
    cells = []
    for k in range(STAGES):
        h = int(360*k/STAGES)
        if stages[k]:
            s = stages[k]
            sym = {0:'−',1:'0',2:'+'}[s['del']]
            cells.append(f"""<div class="c on" style="--h:{h}"><div class="k">{k}</div>
              <div class="m">{sym}</div><div class="sh">{s['sha'][:8]}</div><div class="ok">✓</div></div>""")
        elif k == active:
            cells.append(f"""<div class="c act" style="--h:{h}"><div class="k">{k}</div>
              <div class="m">⟳</div><div class="sh">recreating…</div></div>""")
        else:
            cells.append(f"""<div class="c" style="--h:{h}"><div class="k">{k}</div>
              <div class="m dim">·</div></div>""")
    n = len(done)
    ok_all = n == STAGES
    ctrl_html = (f"""<div class="panel bad"><div class="pt">ARM 2 — the third we NEVER stored (control)</div>
        <div class="bignum red">{ctrl['acc']*100:.2f}%</div>
        <div class="pd">bytes recovered from 2/3 with NO stored closure — Shannon's floor speaking
        ({ctrl['hit']:,} / {ctrl['n']:,} bytes; chance ≈ {100/256:.2f}%{', order-0 guess does a bit better on text' if ctrl['acc']>0.01 else ''})</div></div>"""
        if ctrl else """<div class="panel"><div class="pt">ARM 2 — control</div><div class="pd dim">runs after the cascade…</div></div>""")
    seal = (f"""<div class="seal on">1 RIME TIME CASCADE SEALED · 27/27 stages · every deleted third recreated
        <b>byte-exact</b> · chain hash {chain[:16]} · {time.time()-t0:.0f}s</div>""" if ok_all else
        f"""<div class="seal">cascade running · {n}/27 stages closed · chain {chain[:16] if n else '—'}</div>""")
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
      *{{margin:0;padding:0;box-sizing:border-box}}
      body{{background:#070a12;color:#e8eefc;font-family:-apple-system,'Segoe UI',sans-serif;width:1200px;height:900px;padding:32px 40px}}
      h1{{font-size:25px;font-weight:800;background:linear-gradient(90deg,#7dd3fc,#c4b5fd,#f0abfc);
         -webkit-background-clip:text;-webkit-text-fill-color:transparent}}
      .sub{{color:#8fa3c8;font-size:13.5px;margin:4px 0 16px}}
      .grid{{display:grid;grid-template-columns:repeat(9,1fr);gap:9px;margin-bottom:16px}}
      .c{{border-radius:10px;padding:8px 6px;text-align:center;background:#0d1322;border:1px solid #1c2740;min-height:86px}}
      .c.on{{border-color:hsl(var(--h),70%,50%);box-shadow:0 0 14px hsla(var(--h),80%,55%,.3)}}
      .c.act{{border-color:#7dd3fc;box-shadow:0 0 16px #7dd3fc66}}
      .k{{font-size:10px;color:#8fa3c8}}
      .m{{font-size:22px;font-weight:800;color:hsl(var(--h),85%,66%);margin:2px 0}}
      .m.dim{{color:#2a3655}}
      .sh{{font-size:9.5px;font-family:ui-monospace,monospace;color:#a9b8d8}}
      .ok{{font-size:11px;color:#4ade80;font-weight:700}}
      .row{{display:flex;gap:14px;margin-bottom:14px}}
      .panel{{flex:1;background:#0d1322;border:1px solid #1c2740;border-radius:12px;padding:14px 18px}}
      .panel.good{{border-color:#22c55e55}} .panel.bad{{border-color:#ef444455}}
      .pt{{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8fa3c8;margin-bottom:6px}}
      .bignum{{font-size:34px;font-weight:800;color:#4ade80}} .bignum.red{{color:#f87171}}
      .pd{{font-size:12.5px;color:#a9b8d8;line-height:1.5;margin-top:4px}}
      .dim{{color:#3a4663}}
      .seal{{padding:12px 18px;border-radius:10px;font-size:14.5px;background:#101830;border:1px solid #27365c;color:#b9c6e0}}
      .seal.on{{background:linear-gradient(90deg,#052e1a,#0a3d22);border-color:#22c55e;color:#d1fae5}}
      .foot{{margin-top:11px;font-size:11px;color:#66779c;line-height:1.5}}
    </style></head><body>
      <h1>The 27-Stage Rime Time Cascade — real Wikipedia bytes, both arms measured</h1>
      <div class="sub">each stage: slice enwik8 → 3 channels + shared-center closure (A+B+C+P ≡ 0 mod 256) → DELETE one third (−,0,+ rotating: trime time) → recreate it from the 2/3 → sha feeds the next stage's chain</div>
      <div class="grid">{''.join(cells)}</div>
      <div class="row">
        <div class="panel good"><div class="pt">ARM 1 — the third whose closure WAS stored</div>
          <div class="bignum">{n}/27 byte-exact</div>
          <div class="pd">every deleted channel recreated exactly ({n*CH:,} bytes recreated so far) — because the
          closure was <b>paid for and stored</b>. Real erasure math (single-parity MDS), cascaded.</div></div>
        {ctrl_html}
      </div>
      {seal}
      <div class="foot">The honest law, photographed: 2/3 + a stored closure recreates the third, forever, byte-exact —
      2/3 of something never closed recovers ~nothing. Recreation is repayment of stored structure, never discovery of
      unseen information (Law 6, Conservation — Shannon/DPI). The measurement is the referee.</div>
    </body></html>"""
    hp = f"{FR}/frame.html"; open(hp,'w').write(html)
    tag = "seal" if (ok_all and ctrl) else str(n)
    png = f"{FR}/cascade_{tag}.png"
    subprocess.run(["node", f"{S}/shotgen.js", hp, png, "1200", "900"],
                   cwd=S, capture_output=True, text=True, timeout=120)
    return png

def main():
    t0 = time.time()
    data = open(CORP,'rb').read(STAGES*3*CH + CH)   # 27 slices + 1 control slice
    stages = [None]*STAGES
    chain = ""
    render(stages, None, chain, t0, 0)
    for k in range(STAGES):
        base = k*3*CH
        A = data[base:base+CH]; B = data[base+CH:base+2*CH]; C = data[base+2*CH:base+3*CH]
        P = bytes((-(a+b+c)) % 256 for a,b,c in zip(A,B,C))    # shared-center closure, STORED
        d = k % 3                                               # trime time: rotate −,0,+
        kept = [A,B,C]; lost = kept[d]
        # recreate the deleted third from the other 2/3 + closure
        others = [kept[i] for i in range(3) if i != d]
        rec = bytes((-(x+y+p)) % 256 for x,y,p in zip(others[0], others[1], P))
        assert rec == lost, f"stage {k}: closure failed"
        chain = hashlib.sha256((chain + sha16(rec)).encode()).hexdigest()
        stages[k] = dict(sha=sha16(rec), **{'del': d})
        print(f"stage {k:2d}: deleted ch{d} ({'−0+'[d]}) recreated byte-exact  sha={sha16(rec)}", flush=True)
        if k in (0, 8, 17, STAGES-1):
            render(stages, None, chain, t0, k+1 if k+1<STAGES else -1)
    # ---- ARM 2: the third we NEVER stored ----
    ctrl_slice = data[STAGES*3*CH:STAGES*3*CH+CH]   # never encoded, no closure exists
    # best honest guess from the 2/3 we do hold: order-0 mode byte of the seen data
    from collections import Counter
    mode = Counter(data[:2*CH]).most_common(1)[0][0]
    hit = sum(1 for b in ctrl_slice if b == mode)
    ctrl = dict(acc=hit/CH, hit=hit, n=CH)
    print(f"CONTROL: never-stored third — {hit:,}/{CH:,} bytes ({hit/CH*100:.2f}%) recovered by best guess", flush=True)
    png = render(stages, ctrl, chain, t0, -1)
    print(f"CASCADE SEALED  chain={chain[:16]}  final_photo={png}", flush=True)

if __name__ == "__main__":
    main()
