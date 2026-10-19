#!/usr/bin/env python3
"""81-cell SHA dependency reproduction, not a light/quantum/FTL measurement.

Uses the exact length-prefixed upstream domain_hash algorithm and the
upstream FLOWE_ID / CELL_COMMITMENT dependency pattern. Synthetic source bytes
are intentionally smaller than the published 31,824-cell timed fixture.
"""
import hashlib
import json

SCHEMA="ASOLARIA-TIMED-86400-FOLDER-CALMING-OILS-FLOWes-X3-X3-V2"
FAMILIES=("BROWN","ANTI_BROWN","ANTI_ANTI_BROWN")
DIRECTIONS=("NEGATIVE","CENTRE","POSITIVE")
LABELS=("HBI","HBP","SHA","SH","HASH")
TIMES=(1,2,3,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768,65536,86400)
WAVES=(0,1,2,3,9,13,17,25,26)

def domain_hash(domain,*parts):
    h=hashlib.sha256()
    for raw in (domain,*parts):
        b=raw if isinstance(raw,bytes) else str(raw).encode()
        h.update(len(b).to_bytes(8,"big"));h.update(b)
    return h.hexdigest()

def source_leaves():
    return [
        {"i":i,"folder":i//3,"family":FAMILIES[i%3],
         "id":domain_hash("ASOLARIA|LEAF_STABLE_ID",i//3,FAMILIES[i%3]),
         "body":domain_hash("ASOLARIA|BODY_SHA",i//3,FAMILIES[i%3],"STATE0")}
        for i in range(27)
    ]

def compute(leaves):
    rows=["HBP|SYNTHETIC_SOURCE|81_CELLS"]
    rows.extend(f'{x["i"]}|{x["folder"]}|{x["family"]}|{x["id"]}|{x["body"]}' for x in leaves)
    root=hashlib.sha256(("\n".join(rows)+"\n").encode()).hexdigest()
    cells=[]
    for leaf in leaves:
        for direction in DIRECTIONS:
            ident=domain_hash(SCHEMA+"|FLOWE_ID",root,leaf["folder"],leaf["family"],leaf["id"],direction)
            registers=tuple(
                domain_hash(SCHEMA+"|CELL_COMMITMENT|"+label,root,
                            leaf["folder"],leaf["family"],leaf["id"],direction,ident)
                for label in LABELS
            )
            assert len(set(registers))==5
            cells.append((ident,registers))
    rings=[]
    previous={(f,d):domain_hash(SCHEMA+"|RING_GENESIS",root,f,d)
              for f in FAMILIES for d in DIRECTIONS}
    for level,seconds in enumerate(TIMES):
        for family in FAMILIES:
            for direction in DIRECTIONS:
                prior=previous[(family,direction)]
                # Fixed observation fixture: mutations alter the common source
                # root; ring previous-hash chaining mirrors the builder.
                r=domain_hash(SCHEMA+"|RING_CHAIN",prior,level,seconds,
                              family,direction,9,
                              domain_hash("FIXTURE|REFLECT",family,direction,seconds),
                              domain_hash("FIXTURE|COLLECT",family,direction,seconds),
                              domain_hash("FIXTURE|SIGNED",family,direction,seconds))
                rings.append(r)
                previous[(family,direction)]=r
    cellroot=domain_hash(SCHEMA+"|ALL_CELLS",*(x for _,reg in cells for x in reg))
    ringroot=domain_hash(SCHEMA+"|ALL_RINGS",*rings)
    final=domain_hash(SCHEMA+"|OBJECT",root,cellroot,ringroot)
    return root,cells,rings,final

def main():
    leaves=source_leaves()
    baseline=compute(leaves)
    records=[]
    for k in WAVES:
        modified=[dict(x) for x in leaves]
        old=modified[k]["body"]
        modified[k]["body"]=("f" if old[0]!="f" else "e")+old[1:]
        updated=compute(modified)
        changed_cells=sum(a!=b for a,b in zip(baseline[1],updated[1]))
        changed_rings=sum(a!=b for a,b in zip(baseline[2],updated[2]))
        changed_registers=sum(
            a!=b for (_,ca),(_,cb) in zip(baseline[1],updated[1])
            for a,b in zip(ca,cb)
        )
        assert (changed_cells,changed_rings,changed_registers)==(81,171,405)
        assert baseline[0]!=updated[0] and baseline[3]!=updated[3]
        records.append({"leaf":k,"cells":changed_cells,"rings":changed_rings,
                        "registers":changed_registers,"root_flips":(
                            int(baseline[3],16)^int(updated[3],16)).bit_count()})
    # Control: a one-cell edit, with no source digest rebuild, touches only
    # that cell's stored commitment; other 80 cell records do not auto-change.
    tampered=list(baseline[1])
    ident,regs=tampered[0]
    tampered[0]=(ident,(("f" if regs[0][0]!="f" else "e")+regs[0][1:],*regs[1:]))
    assert sum(a!=b for a,b in zip(baseline[1],tampered))==1
    print(json.dumps({"schema":"ASOLARIA-81-HASH-CASCADE-REPRO-V1",
                      "evidence":"synthetic deterministic CPU fixture",
                      "waves":records,
                      "without_recompute_peer_changes":0,
                      "tampered_cell_without_recompute":1,
                      "physical_FTL_demonstrated":False},indent=2))
if __name__=="__main__":
    main()
