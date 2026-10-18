#!/usr/bin/env python3
# asolaria graphify v3 — custom, ZERO-NODE whole-system graph. stdlib only.
# Sources: memory [[wikilinks]] + GNN edges + cube mesh (scrubbed) + repo map-of-maps.
# Built-in PII SCRUB GATE drops any node/edge with serial/LAN-IP/SSID/personal markers.
# Layout is BAKED in Python (phyllotaxis disk, layer-banded, hubs central) so the viewer is
# fully STATIC + deterministic (instant paint, fit-on-load, pan/zoom; no force sim to starve).
import os, re, json, math, hashlib

MEM   = os.environ.get("GRAPHIFY_MEM",   r"C:\Users\acer\.claude\projects\C--\memory")
GNN   = os.environ.get("GRAPHIFY_GNN",   r"C:\Users\acer\Asolaria\data\behcs\gnn-edges.ndjson")
CUBES = os.environ.get("GRAPHIFY_CUBES", r"C:\Users\acer\Asolaria\quarantine\falcon-phone-white-room-20260415-150246\extract\private-termux-latest\codex\connectors.json")
OUT   = os.environ.get("GRAPHIFY_OUT",   r"C:\asolaria-acer\tools\graphify")
os.makedirs(OUT, exist_ok=True)

PII = re.compile(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|R[0-9A-Z]{9,}|SM-[SA]\d|DESKTOP-[A-Z0-9]|_5G|Jesse'?s\s+(laptop|computer|phone)|Rayssa'?s|serial\s*=", re.I)
def ok(*xs): return all(not PII.search(str(x)) for x in xs)

COL = {"user":"#ffd166","feedback":"#ef476f","project":"#06d6a0","reference":"#118ab2",
       "memory":"#88aabb","index":"#c792ea","linked":"#556070",
       "gnn":"#f08a4b","cube":"#3ddc97","repo":"#b388ff"}
LCOL = {"memory":"#88aabb","gnn":"#f08a4b","cube":"#3ddc97","repo":"#b388ff"}

nodes, edges, dropped = {}, [], {"nodes":0,"edges":0}
def addn(nid, label, layer, typ="", present=True):
    if not ok(nid, label):
        dropped["nodes"] += 1; return False
    typ = typ or layer
    n = nodes.get(nid)
    if n:
        if present: n["present"] = True
        return True
    nodes[nid] = {"id":nid,"label":str(label)[:60],"layer":layer,"type":typ,"present":present,
                  "c":COL.get(typ, COL.get(layer,"#789"))}
    return True
def adde(a, b, kind, layer):
    if not ok(a, b):
        dropped["edges"] += 1; return
    edges.append({"source":a,"target":b,"kind":kind,"layer":layer})

# ---- 1: memory vault [[wikilinks]] ----
WL = re.compile(r"\[\[([^\]\|]+?)(?:\|[^\]]+)?\]\]"); ML = re.compile(r"\]\(([A-Za-z0-9._\-]+?\.md)\)")
FN = re.compile(r"^name:\s*(.+)$", re.M); FT = re.compile(r"^\s*type:\s*([A-Za-z|_ ]+)$", re.M)
def nid(s): s=s.strip(); return s[:-3] if s.lower().endswith(".md") else s
mem_files = [f for f in os.listdir(MEM) if f.lower().endswith(".md")] if os.path.isdir(MEM) else []
for f in mem_files:
    try: txt = open(os.path.join(MEM,f), encoding="utf-8", errors="ignore").read()
    except Exception: continue
    fid=nid(f); m=FN.search(txt); lbl=m.group(1).strip() if m else fid
    is_idx=f in ("MEMORY.md","MEMORY-ARCHIVE.md"); t=FT.search(txt)
    typ=t.group(1).strip().split("|")[0].strip() if t else ("index" if is_idx else "memory")
    addn(fid, lbl, "memory", typ, True)
    for w in WL.findall(txt):
        addn(nid(w), nid(w), "memory", "linked", False); adde(fid, nid(w), "wikilink", "memory")
    if is_idx:
        for l in ML.findall(txt):
            addn(nid(l), nid(l), "memory", "memory", False); adde(fid, nid(l), "index", "memory")

# ---- 2: GNN edges (cap to top-degree) ----
gdeg={}; graw=[]
if os.path.isfile(GNN):
    for line in open(GNN, encoding="utf-8", errors="ignore"):
        line=line.strip()
        if not line: continue
        try: e=json.loads(line)
        except Exception: continue
        a=str(e.get("from","")).strip()
        if not a: continue
        for b in str(e.get("to","")).split():
            b=b.strip()
            if not b or b.lower()=="unknown": continue
            graw.append((a,b)); gdeg[a]=gdeg.get(a,0)+1; gdeg[b]=gdeg.get(b,0)+1
keep=set(k for k,_ in sorted(gdeg.items(), key=lambda x:-x[1])[:320]); gseen=set()
for a,b in graw:
    if a in keep and b in keep:
        addn(a,a,"gnn","gnn"); addn(b,b,"gnn","gnn")
        if (a,b) not in gseen: gseen.add((a,b)); adde(a,b,"gnn","gnn")

# ---- 3: cube mesh (scrub to topology only) ----
cube_total=0
if os.path.isfile(CUBES):
    try: cj=json.load(open(CUBES, encoding="utf-8", errors="ignore"))
    except Exception: cj={}
    ce=cj.get("edges") or []; cube_total=len(ce); cseen=set()
    for e in ce:
        a=str(e.get("from","")).strip(); b=str(e.get("to","")).strip()
        if not a or not b: continue
        addn(a,a,"cube","cube"); addn(b,b,"cube","cube")
        if (a,b) in cseen: continue
        cseen.add((a,b)); adde(a,b,"cube","cube")
        if len(cseen)>=1500: break

# ---- 4: repo map-of-maps ----
REPOS=["what-is-asolaria","Algorithms-of-Asolaria","Asolaria-gac-working","N-Nest-Prime",
       "Omni-Asolaria-ASI-OS-Matrix-Fabric","asolaria-federation-1024","asolaria-behcs-256",
       "bigpickle-rebuild","asolaria-whiteroom-engine","35-TB-google-AI-Ultra-migration",
       "falcon-orbital","Hilbra","ASOLARIA-AS-NEURAL-NETWORK","Asolaria-ASI-On-Metal-Fabric-and-matrix",
       "HYPER-BECHS--the-third-set","omni-dispatcher","omnicoder---better-than-termux"]
for r in REPOS: addn("repo:"+r, r, "repo", "repo")
for r in REPOS:
    if r!="what-is-asolaria": adde("repo:what-is-asolaria","repo:"+r,"map-of-maps","repo")

# ---- 5: MIGRATION CONTROL LEDGER (MEASURED/CANON this session) — old -> new, typed status ----
SC={"cutover":"#06d6a0","done":"#06d6a0","merged":"#3ddc97","published":"#76d1ff","staged":"#ffd166","candidate":"#ffd166","next":"#ffd166","blocked":"#ef476f","held":"#ff8fa3"}
def scol(s):
    s=s.lower()
    for k,v in SC.items():
        if s.startswith(k): return v
    return "#b388ff"
# (old_id,old_label,new_id,new_label,status,tag)
MIG=[
 ("recall_node","Node recall serve-recall.cjs :4791 (retired)","recall_rust","Rust recall-serve :4796 SOLE (PR#8 eaa97fe; Node retired)","cutover-verified","MEASURED"),
 ("council_node","Node super-dashboard council/loop :4949","council_host8","Rust council-serve :5090 (PR#11 inc2; CI5/5; staged,gated)","staged-ci-green","MEASURED"),
 ("cosign_py","py cosign-chain :4953 (live, untouched)","cosign_ledger","Rust cosign-serve shadow (packet STAGED, liris-accepted; parity=cutover gate)","staged-packet","MEASURED"),
 ("votequorum_py","py vote-quorum :4952","votequorum_host8","Rust vote-quorum crate (PR#11 inc1; CI5/5; parity 187/187)","staged-ci-green","MEASURED"),
 ("fischer_node","Node fischer-live :4794 (additive)","fischer_rust","Rust fischer-eval (PR#9 80f47808 MERGED)","merged","MEASURED"),
 ("omnidispatcher_node","Node omnidispatcher :4950","omnidispatcher_pub","omni-dispatcher repo f0acdb2 (liris-verified)","published-verified","MEASURED"),
 ("omnicoder_falcon","Falcon Termux extract (phone)","omnicoder_pub","omnicoder repo (empty)","held-pii","MEASURED"),
 ("graphify_py","graphify.py (this mapper)","graphify_rust","Rust Host-8 graphifier (step 3)","next","CANON"),
 ("engine_drive","engine-drive: revolver+spinner+router","engine_drive_thread","engine-drive on own thread (council-serve C0.1; gated auto_fire=false; staged)","staged-gated","MEASURED"),
]
for oid,olbl,nidn,nlbl,status,tag in MIG:
    a="mig:"+oid; b="mig:"+nidn
    addn(a, olbl, "mig", "mig-old");
    if a in nodes: nodes[a]["c"]="#8aa6b2"; nodes[a]["status"]=status; nodes[a]["tag"]=tag
    addn(b, nlbl, "mig", "mig-new");
    if b in nodes: nodes[b]["c"]=scol(status); nodes[b]["status"]=status; nodes[b]["tag"]=tag
    adde(a, b, "MIGRATES_TO:"+status, "mig")
# hosts + substrate (carve-out clean: names only, no hostnames/serials)
for hid,hl,hc in [("mig:host_acer","acer (live runtime)","#c792ea"),("mig:host_liris","liris (bilateral peer)","#c792ea"),("mig:host_falcon","falcon (phone lane)","#c792ea"),("mig:sovlinux","SOVLINUX 2TB (frozen substrate)","#b388ff"),("mig:run100b","100B PID-packet run (file-verified)","#06d6a0")]:
    addn(hid, hl, "mig", "host")
    if hid in nodes: nodes[hid]["c"]=hc
for oid in ("recall_node","council_node","cosign_py","votequorum_py","fischer_node","omnidispatcher_node","engine_drive"):
    adde("mig:"+oid, "mig:host_acer", "RUNS_ON", "mig")
adde("mig:recall_rust","mig:host_liris","HAS_PEER","mig")
adde("mig:omnicoder_falcon","mig:host_falcon","RUNS_ON","mig")
adde("mig:sovlinux","mig:host_acer","SUBSTRATE","mig")
adde("mig:run100b","mig:host_acer","RAN_ON","mig")
# 5b: liris attack-verify finding (PR#11 inc2) — the one open boundary before parity becomes a cutover gate
addn("mig:parity_boundary","parity missing-ledger FIXED f0f0941 (missing->HTTP500)","mig","mig-new")
if "mig:parity_boundary" in nodes: nodes["mig:parity_boundary"]["c"]="#06d6a0"; nodes["mig:parity_boundary"]["status"]="done-fixed"; nodes["mig:parity_boundary"]["tag"]="MEASURED"
adde("mig:council_host8","mig:parity_boundary","RESOLVED_BY:f0f0941","mig")
adde("mig:parity_boundary","mig:host_acer","RUNS_ON","mig")
# 5c: PR#11 inc3 — read-only loop route surface (d64e076; CI 5/5; acer gate 7/7 + live probe)
addn("mig:loop_routes","loop routes RO staged d64e076 (GET pending/tick/veto; POST404)","mig","mig-new")
if "mig:loop_routes" in nodes: nodes["mig:loop_routes"]["c"]="#06d6a0"; nodes["mig:loop_routes"]["status"]="staged-ci-green"; nodes["mig:loop_routes"]["tag"]="MEASURED"
adde("mig:council_host8","mig:loop_routes","SERVES_READONLY:d64e076","mig")

# ---- 6: 60D HYPERBEHCS FRAME (decode-grounded; see HYPERBEHCS-60D-DECODE-REFRAME-SPEC.md) ----
# node identity gains glyph (deterministic baseN id) + handle8 (FNV1a64 Host-8 PK); the geometry
# (lineage + D-axis catalog + glyph layer + selector envelope) becomes the central layer; the
# corpus repos hang under it by 60D stratum (from the GitHub super-swarm trace). Carve-out clean.
B62="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
def glyphword(s):
    v=int.from_bytes(hashlib.sha256(s.encode()).digest()[:6],"big"); o=""
    for _ in range(4): o+=B62[v%62]; v//=62
    return "gly-"+o
def handle8(s):  # FNV-1a 64-bit = the Host-8 8-byte primary key
    h=0xcbf29ce484222325
    for ch in s.encode(): h=((h^ch)*0x100000001b3)&0xffffffffffffffff
    return format(h,"016x")
FCOL={"frame":"#ffd166","dim":"#c792ea","lineage":"#3ddc97","glyphsys":"#06d6a0","selaxis":"#76d1ff"}
def framen(fid,label,typ,**at):
    if not addn(fid,label,"frame",typ): return
    n=nodes[fid]; n["c"]=FCOL.get(typ,"#ffd166"); n["glyph"]=glyphword(fid); n["handle8"]=handle8(fid)
    for k,v in at.items(): n[k]=v
# 6a: generation lineage + D-ladder rungs (the decode bridge: old decodes new)
framen("hb:frame","60D HyperBEHCS substrate (tuple_dim=60, BEHCS-1024)","frame",tag="MEASURED")
for a,b in [("Old Index","BEHCS-256"),("BEHCS-256","BEHCS-1024"),("BEHCS-1024","HyperBEHCS")]:
    framen("gen:"+a,a,"lineage"); framen("gen:"+b,b,"lineage"); adde("gen:"+a,"gen:"+b,"EVOLVES_TO","frame")
adde("gen:HyperBEHCS","hb:frame","EVOLVES_TO","frame")
prev=None
for rid,rl in [("24D","INTENT base D1-24"),("35D","+HYPERLANGUAGE meta D25-35"),("47D","COSIGNED base D36-47"),("49D","+ATLAS/EXEC-PROOF D48-49 quintet"),("50D","+CFH on-disk cat50 staged"),("60D","live tuple_dim; D51-60 reserved")]:
    framen("rung:"+rid,rid+" — "+rl,"lineage",tag=("MEASURED" if rid in("50D","60D") else "CANON"))
    if prev: adde("rung:"+prev,"rung:"+rid,"BRIDGES_TO","frame")
    prev=rid
adde("rung:60D","hb:frame","DECODED_BY","frame")
# 6b: dimension catalog (carve-out clean meanings; each axis = prime(n)^3 values)
for d,m in [("D1","ACTOR"),("D2","VERB"),("D5","LAYER"),("D11","PROOF"),("D13","SURFACE host-port"),("D16","PID"),("D17","PROFILE"),("D22","TRANSLATION"),("D24","INTENT end-24D"),("D25","TRINITY first-35D"),("D34","CROSS_COLONY"),("D35","HYPERLANGUAGE meta"),("D36","INFERENCE first-47D"),("D37","AUTHORITY_TOPOLOGY"),("D38","ENCRYPTION"),("D39","GNN_EDGE"),("D43","MISTAKE_LEDGER"),("D46","VAULT"),("D47","BOUNDARY end-cosigned"),("D48","HYPERGLYPH_ATLAS"),("D49","EXEC_PROOF_SUPERGRAPH"),("D50","CFH/META_RATIFICATION")]:
    framen("dim:"+d,d+" "+m,"dim",tag="MEASURED"); adde("dim:"+d,"hb:frame","IN_DIM:"+d,"frame")
# 6c: glyph / meta-language layer (the multiple language systems)
for gid,gl in [("glyph:behcs256","BEHCS-256 alphabet (256 glyphs)"),("glyph:behcs1024","BEHCS-1024 alphabet (1024 glyphs,10b/sym)"),("glyph:families","14 glyph grammar families"),("glyph:metalang","meta-language / GNN signal taxonomy"),("glyph:genesis","glyph-genesis sha256->8byte->baseN")]:
    framen(gid,gl,"glyphsys",tag="MEASURED"); adde(gid,"dim:D22","CARRIES_GLYPH","frame")
# 6d: selector geometry (the real answer to PID/pipe/executor: addr = register x select)
framen("sel:selector","60D selector = register x select envelope","selaxis",tag="CANON",status="open-design")
for sid,sl,dref in [("sel:room","room_stub (REGISTERED_AS)","D37"),("sel:handle8","host_handle8 (FNV1a64 PK)","D16"),("sel:topid","to_pid [60-tuple]","D16"),("sel:portlabel","PortLabel [1024^K prefix]","D13"),("sel:domain","atlas-domain [1/8]","D37"),("sel:tier","access-tier [1/6]","D37"),("sel:executor","EXECUTED_BY lane x role x class x vantage","D1"),("sel:signgate","sign-gate verdict + cosign-seq","D11"),("sel:runtime","runtime/E-axis frozen->staged->live->cutover","D12")]:
    framen(sid,sl,"selaxis",tag="CANON"); adde("sel:selector",sid,"SELECTS_BY","frame"); adde(sid,"dim:"+dref,"IN_DIM:"+dref,"frame")
adde("sel:selector","hb:frame","CONSTRAINS","frame")
# 6e: corpus repos -> 60D stratum (from GitHub super-swarm trace; enrich existing repo nodes)
STRAT={"what-is-asolaria":"map-of-maps","Algorithms-of-Asolaria":"registration","Asolaria-gac-working":"map-of-maps","N-Nest-Prime":"proof","Omni-Asolaria-ASI-OS-Matrix-Fabric":"map-of-maps","asolaria-federation-1024":"substrate","asolaria-behcs-256":"runtime","bigpickle-rebuild":"runtime","asolaria-whiteroom-engine":"runtime","35-TB-google-AI-Ultra-migration":"migration","falcon-orbital":"proof","Hilbra":"comms","ASOLARIA-AS-NEURAL-NETWORK":"substrate","Asolaria-ASI-On-Metal-Fabric-and-matrix":"migration","HYPER-BECHS--the-third-set":"map-of-maps","omni-dispatcher":"runtime","omnicoder---better-than-termux":"tool"}
for r,strat in STRAT.items():
    rid="repo:"+r
    if rid in nodes:
        nodes[rid]["stratum"]=strat; nodes[rid]["glyph"]=glyphword(rid); nodes[rid]["handle8"]=handle8(rid)
        adde(rid,"hb:frame","IN_STRATUM:"+strat,"frame")
# 6f: wire migration cells onto the runtime/E axis (they already carry status+tag = runtime+D11)
for oid in ("recall_node","council_node","cosign_py","votequorum_py","fischer_node","graphify_py","engine_drive"):
    if "mig:"+oid in nodes: adde("mig:"+oid,"sel:runtime","ON_RUNTIME_AXIS","frame")

# ---- degree + BAKED phyllotaxis layout (layer-banded, hubs central) ----
deg={}
for e in edges:
    deg[e["source"]]=deg.get(e["source"],0)+1; deg[e["target"]]=deg.get(e["target"],0)+1
for nidk,n in nodes.items(): n["deg"]=deg.get(nidk,0)
order={"frame":0,"mig":1,"repo":2,"memory":3,"gnn":4,"cube":5}
arr=sorted(nodes.values(), key=lambda n:(order.get(n["layer"],9), -n["deg"], n["id"]))
GA=2.399963229728653; C=46.0
minx=miny=1e9; maxx=maxy=-1e9
for i,n in enumerate(arr):
    a=i*GA; r=C*math.sqrt(i+1)
    n["x"]=round(math.cos(a)*r,1); n["y"]=round(math.sin(a)*r,1)
    minx=min(minx,n["x"]); miny=min(miny,n["y"]); maxx=max(maxx,n["x"]); maxy=max(maxy,n["y"])

data={"nodes":list(nodes.values()),"edges":edges,
      "bounds":{"minx":minx,"miny":miny,"maxx":maxx,"maxy":maxy},
      "stats":{"nodes":len(nodes),"edges":len(edges),"mem_files":len(mem_files),
               "gnn_kept":len(keep),"cube_edges_total":cube_total,"repos":len(REPOS),
               "frame":sum(1 for n in nodes.values() if n.get("layer")=="frame"),
               "pii_dropped_nodes":dropped["nodes"],"pii_dropped_edges":dropped["edges"]}}
top=sorted(nodes.values(), key=lambda n:-n["deg"])[:14]
data["stats"]["top"]=[{"label":n["label"],"layer":n["layer"],"deg":n["deg"]} for n in top]
json.dump(data, open(os.path.join(OUT,"asolaria-system-graph.json"),"w",encoding="utf-8"))

HTML = r"""<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Asolaria System Graph - graphify v4 (60D HyperBEHCS)</title>
<style>html,body{margin:0;height:100%;background:#0a0e13;color:#cfe;font:13px system-ui;overflow:hidden}
#wrap{position:fixed;inset:0}#c{display:block;width:100%;height:100%}
#hud{position:fixed;top:8px;left:10px;line-height:1.5;text-shadow:0 0 4px #000}#hud b{color:#7fd1ff}
#leg{position:fixed;bottom:8px;left:10px;color:#9ab;text-shadow:0 0 4px #000}
#tip{position:fixed;background:#0f1822;border:1px solid #2a6;padding:5px 9px;border-radius:5px;display:none;pointer-events:none;max-width:420px;z-index:9}
#hubs{position:fixed;top:8px;right:10px;background:#0f1822cc;border:1px solid #243;border-radius:6px;padding:8px 11px;max-width:330px;line-height:1.5;font-size:12px}
#hubs b{color:#7fd1ff}</style></head>
<body><div id=wrap><canvas id=c></canvas></div><div id=hud></div><div id=leg></div><div id=hubs></div><div id=tip></div>
<script>const G=%%DATA%%;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const LCOL={memory:'#88aabb',gnn:'#f08a4b',cube:'#3ddc97',repo:'#b388ff',mig:'#ffd166',frame:'#c792ea'};
const N=G.nodes, idx={}; for(const n of N) idx[n.id]=n;
let DPR=1,Wp=0,Hp=0,zoom=1,panx=0,pany=0,hover=null,sel=null,drag=false,lx=0,ly=0,need=true,userMoved=false;
function fit(){const b=G.bounds,gw=Math.max(1,b.maxx-b.minx),gh=Math.max(1,b.maxy-b.miny);
 zoom=Math.min(Wp/(gw+120),Hp/(gh+120),1.6);panx=Wp/2-((b.minx+b.maxx)/2)*zoom;pany=Hp/2-((b.miny+b.maxy)/2)*zoom;need=true}
function resize(){DPR=Math.max(1,devicePixelRatio||1);Wp=Math.max(320,innerWidth|0);Hp=Math.max(240,innerHeight|0);
 cv.width=(Wp*DPR)|0;cv.height=(Hp*DPR)|0;ctx.setTransform(DPR,0,0,DPR,0,0);if(!userMoved)fit();need=true}
addEventListener('resize',resize);new ResizeObserver(resize).observe(cv);
const SX=x=>panx+x*zoom, SY=y=>pany+y*zoom;
function draw(){if(!need)return;need=false;ctx.clearRect(0,0,Wp,Hp);
 ctx.lineWidth=Math.max(.4,.7*zoom);
 for(const e of G.edges){const a=idx[e.source],b=idx[e.target];if(!a||!b)continue;
   const x1=SX(a.x),y1=SY(a.y),x2=SX(b.x),y2=SY(b.y);
   if((x1<0&&x2<0)||(x1>Wp&&x2>Wp)||(y1<0&&y2<0)||(y1>Hp&&y2>Hp))continue;
   ctx.strokeStyle=(LCOL[e.layer]||'#789')+'30';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
 for(const n of N){const x=SX(n.x),y=SY(n.y);if(x<-20||x>Wp+20||y<-20||y>Hp+20)continue;
   const r=(n.layer==='repo'?6:n.present?3.5:2.5)+Math.min(9,n.deg*0.4);
   ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=n.c||'#789';ctx.globalAlpha=(sel&&sel!==n&&!isNbr(n))?.25:(n.present?1:.5);ctx.fill();ctx.globalAlpha=1;
   if(n===sel||n===hover||n.layer==='repo'||n.layer==='mig'||n.layer==='frame'||n.deg>10){ctx.fillStyle='#dfeaf5';ctx.font='11px system-ui';ctx.fillText(n.label,x+r+3,y+3)}}}
let nbr=new Set();function isNbr(n){return nbr.has(n.id)}
function setSel(n){sel=n;nbr=new Set();if(n){nbr.add(n.id);for(const e of G.edges){if(e.source===n.id)nbr.add(e.target);if(e.target===n.id)nbr.add(e.source)}}need=true}
function tickDraw(){draw();requestAnimationFrame(tickDraw)}
function w2(ev){const r=cv.getBoundingClientRect();return{x:(ev.clientX-r.left-panx)/zoom,y:(ev.clientY-r.top-pany)/zoom,cx:ev.clientX,cy:ev.clientY}}
function hit(p){let h=null,bd=16/zoom;for(const n of N){const d=Math.hypot(n.x-p.x,n.y-p.y);if(d<bd){bd=d;h=n}}return h}
cv.addEventListener('pointerdown',ev=>{drag=true;userMoved=true;lx=ev.clientX;ly=ev.clientY;cv.setPointerCapture(ev.pointerId)});
cv.addEventListener('pointerup',ev=>{drag=false});
cv.addEventListener('pointermove',ev=>{if(drag){panx+=ev.clientX-lx;pany+=ev.clientY-ly;lx=ev.clientX;ly=ev.clientY;need=true;return}
 const p=w2(ev),h=hit(p),t=document.getElementById('tip');if(h!==hover){hover=h;need=true}
 if(h){t.style.display='block';t.style.left=(ev.clientX+12)+'px';t.style.top=(ev.clientY+12)+'px';t.innerHTML='<b>'+esc(h.label)+'</b><br>'+h.layer+(h.type!==h.layer?(' / '+h.type):'')+' &middot; deg '+h.deg+(h.glyph?('<br>'+h.glyph+' &middot; h8 '+h.handle8):'')+(h.stratum?('<br>stratum: '+esc(h.stratum)):'')+(h.status?('<br>'+esc(h.status)+(h.tag?(' ['+esc(h.tag)+']'):'')):'')+(h.present?'':' &middot; <i>dangling</i>')}else t.style.display='none'});
cv.addEventListener('click',ev=>{if(Math.abs(ev.clientX-lx)>4||Math.abs(ev.clientY-ly)>4)return;setSel(hit(w2(ev)))});
cv.addEventListener('wheel',ev=>{ev.preventDefault();const r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top,f=ev.deltaY<0?1.12:0.89;
 panx=mx-(mx-panx)*f;pany=my-(my-pany)*f;zoom*=f;userMoved=true;need=true},{passive:false});
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
const s=G.stats;
document.getElementById('hud').innerHTML='<b>Asolaria System Graph</b> &middot; graphify v4 &middot; 60D HyperBEHCS frame (zero-node, PII-scrubbed)<br>'+s.nodes+' nodes &middot; '+s.edges+' edges<br><span style=color:#789>60D-frame '+s.frame+' &middot; mem '+s.mem_files+'f &middot; gnn '+s.gnn_kept+' &middot; cube-edges '+s.cube_edges_total+' &middot; repos '+s.repos+' &middot; PII-dropped '+s.pii_dropped_nodes+'n/'+s.pii_dropped_edges+'e &middot; drag=pan wheel=zoom click=focus</span>';
document.getElementById('leg').innerHTML=Object.entries(LCOL).map(([k,v])=>'<span style=color:'+v+'>&#9679;</span> '+k).join(' &nbsp; ');
document.getElementById('hubs').innerHTML='<b>top hubs</b><br>'+s.top.map(t=>'<span style=color:'+(LCOL[t.layer]||'#9ab')+'>&#9679;</span> '+esc(t.label)+' <span style=color:#789>('+t.deg+')</span>').join('<br>');
resize();fit();tickDraw();
</script></body></html>"""
open(os.path.join(OUT,"asolaria-system-graph.html"),"w",encoding="utf-8").write(HTML.replace("%%DATA%%", json.dumps(data, ensure_ascii=False)))
st=data["stats"]
print("GRAPHIFY v4 OK — 60D HyperBEHCS frame (baked static, zero-node, PII-scrubbed)")
print("nodes=%d edges=%d | 60D-frame=%d mem=%d gnn=%d cube_edges=%d repos=%d | PII-dropped %dn/%de"%(
    st["nodes"],st["edges"],st["frame"],st["mem_files"],st["gnn_kept"],st["cube_edges_total"],st["repos"],st["pii_dropped_nodes"],st["pii_dropped_edges"]))
print("viewer:", os.path.join(OUT,"asolaria-system-graph.html"))
