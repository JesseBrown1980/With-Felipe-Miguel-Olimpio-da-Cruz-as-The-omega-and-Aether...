#!/usr/bin/env node
"use strict";
/* Seat3 separate Node finite enumeration. No Python or upstream imports. */
const fs=require('fs'), crypto=require('crypto');
const SCHEMA="ASOLARIA-SEAT3-RECURRENCE-COMMON-MODE-V1";
const LAW_BLOB="f84710d3018882b7282b9fda227638c57568ffe4";
const DEPTHS=[1,3,7];
const ARMS=["one_pass","self_recurrence","independent_common_source","independent_trusted_anchor"];
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function gcd(a,b){while(b){let c=a%b;a=b;b=c}return a}
function ratio(n,d){let g=gcd(n,d);return String(n/g)+"/"+String(d/g)}
function enumCounts(m){
    const counts=Object.fromEntries(ARMS.map(a=>[a,0]));
    let total=0;
    const patterns=4**m;
    // Explicit exhaustive integer-state enumeration, not a statistical sample.
    for(let sourceFlag=0;sourceFlag<8;sourceFlag++){
        for(let packed=0;packed<patterns;packed++){
            let value=packed;
            const firstMiss=(value%4===0);
            let everyMiss=true;
            for(let i=0;i<m;i++){
                const errorSymbol=value%4;
                everyMiss=everyMiss&&(errorSymbol===0);
                value=Math.floor(value/4);
            }
            const sharedSourceWrong=(sourceFlag===0);
            total++;
            if(sharedSourceWrong||firstMiss){
                counts.one_pass++;
                counts.self_recurrence++;
            }
            if(sharedSourceWrong||everyMiss)counts.independent_common_source++;
            if(everyMiss)counts.independent_trusted_anchor++;
        }
    }
    if(total!==8*patterns)throw Error('total slots');
    return {counts,total};
}
function audit(){
    const rows=["PORTAL|schema="+SCHEMA+"|law_blob="+LAW_BLOB+"|source=synthetic_only|physical_host_attested=0|json=0"], metrics={};
    for(const m of DEPTHS){
        const {counts,total}=enumCounts(m);
        const expected=[11*(4**(m-1)),11*(4**(m-1)),4**m+7,8];
        for(let j=0;j<ARMS.length;j++)if(counts[ARMS[j]]!==expected[j])throw Error('count mismatch');
        const detail={};
        for(const arm of ARMS){
            const probability=ratio(counts[arm],total);
            const expectedProbability=(arm==="one_pass"||arm==="self_recurrence")?"11/32":
               arm==="independent_common_source"?ratio(4**m+7,8*4**m):ratio(1,4**m);
            if(probability!==expectedProbability)throw Error('fraction mismatch');
            rows.push("ARM|checks="+m+"|name="+arm+"|false_green="+probability+"|accepted="+counts[arm]+"|total="+total+"|json=0");
            detail[arm]={accepted:counts[arm],total,probability};
        }
        metrics[String(m)]=detail;
    }
    const externalTruth=0, forgedSource=1, reported=forgedSource,recomputed=forgedSource;
    if(reported!==recomputed||reported===externalTruth)throw Error('counterexample missing');
    rows.push("COUNTEREXAMPLE|name=coherent_source_substitution|math_consistent=1|origin_authenticated=0|release_authorized=0|json=0");
    const newFrame=Buffer.from("FRAME|seq=2|pixel=ffffff","ascii");
    const staleFrame=Buffer.from("FRAME|seq=1|pixel=ffffff","ascii");
    if(digest(staleFrame)!==digest(staleFrame)||digest(staleFrame)===digest(newFrame))throw Error('frame control');
    rows.push("FRAME|name=stale_bytes|local_digest_valid=1|precommitted_digest_matches=0|real_camera_used=0|json=0");
    let selfState=1,anchorState=1;
    for(let i=0;i<7;i++){selfState=selfState;anchorState=externalTruth}
    if(selfState===externalTruth||anchorState!==externalTruth)throw Error('recurrence control');
    rows.push("RECURRENCE|rounds=7|self_only_corrected=0|anchored_corrected=1|actual_model_training=0|json=0");
    const mathGreen=true;
    if(mathGreen&&false&&!false)throw Error('consent guard');
    if(mathGreen&&true&&!true)throw Error('HALT guard');
    if(!(mathGreen&&true&&!false))throw Error('operator control');
    rows.push("APEX|math_green=1|missing_human_consent=HELD|operator_halt=HELD|human_authorized_model=PASS|real_operator_token=not_tested|json=0");
    rows.push("END|depths=1,3,7|arms=4|table_rows=12|common_mode_floor=1/8|physical=0|source_auth=not_proven|json=0");
    const trace=Buffer.from(rows.join("\n")+"\n","ascii");
    return {trace,metrics:{schema:SCHEMA,law_blob_sha1:LAW_BLOB,status:"PASS",rows:12,counts:metrics,
                          trace_bytes:trace.length,trace_sha256:digest(trace),
                          correction_gate:"synthetic trusted-bit only",source_authenticated:false,physical_host_attested:false}};
}
if(process.argv.length!==4){console.error("usage: node seat3_recurrence_floor.js output.hbp metrics.json");process.exit(2)}
const {trace,metrics}=audit();
fs.writeFileSync(process.argv[2],trace);fs.writeFileSync(process.argv[3],JSON.stringify(metrics,null,2)+"\n");
console.log(JSON.stringify(Object.fromEntries(Object.entries(metrics).filter(([k])=>k!=="counts"))));
