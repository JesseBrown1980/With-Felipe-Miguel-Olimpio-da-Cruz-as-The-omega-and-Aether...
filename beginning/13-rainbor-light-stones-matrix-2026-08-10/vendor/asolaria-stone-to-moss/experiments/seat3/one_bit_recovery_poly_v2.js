#!/usr/bin/env node
'use strict';
/* Cyclic-polynomial evolution + independent augmented GF(2) inverse.
   Public seat digests only. No private salts or verified physical hosts. */
const fs=require('node:fs'),crypto=require('node:crypto');
const N=81n,MASK=(1n<<N)-1n,LOW=(1n<<80n)-1n;
const EXPECTED='08fc44cd8e5c2e41ce2dadf55ab96edacbbe11435ce4b21d436ae5e602d23c9d';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),bit=i=>1n<<BigInt(i);
const rot=(v,k)=>k===0?v&MASK:((v<<BigInt(k))|(v>>(N-BigInt(k))))&MASK;
function mul(a,b){let out=0n,i=0;while(a){if(a&1n)out^=rot(b,i);a>>=1n;i++;}return out}
function power(taps,h){let p=taps.reduce((v,t)=>v^bit(t),0n),z=1n,n=BigInt(h);while(n){if(n&1n)z=mul(z,p);p=mul(p,p);n>>=1n;}return z}
function linear(cols,v){let r=0n,i=0;while(v){if(v&1n)r^=cols[i];v>>=1n;i++;}return r}
function inverse(cols){
 const rows=[];
 for(let i=0;i<81;i++){let r=0n;for(let j=0;j<81;j++)if(cols[j]&bit(i))r|=bit(j);rows.push(r|bit(81+i));}
 for(let i=0;i<81;i++){let p=i;while(p<81&&!(rows[p]&bit(i)))p++;if(p===81)throw Error('singular augmented map');
 [rows[i],rows[p]]=[rows[p],rows[i]];
 for(let j=0;j<81;j++)if(j!==i&&(rows[j]&bit(i)))rows[j]^=rows[i];}
 return Array.from({length:81},(_,j)=>rows.reduce((v,row,i)=>v|((row&bit(81+j))?bit(i):0n),0n));
}
function state(f,s,ti,c,sp,b){
 const [seat,digest,blob]=s;
 const fields=[f.domain,f.public_challenge_nonce,f.public_challenge_blob,seat,digest,blob,ti,c,sp,String(b)];
 return (BigInt('0x'+sha(Buffer.from(fields.join('|'),'ascii')))&MASK)^bit(b);
}
function main(fi,out){const f=JSON.parse(fs.readFileSync(fi,'utf8')),laws=f.laws,hs=f.horizons;
 if(f.schema!=='ASOLARIA-SEAT3-ONE-BIT-RECOVERY-FIXTURE-V2'||f.public_seed_only!==true||f.fresh_physical_challenge!==false||f.physical_hosts_verified!==0)throw Error('fixture scope');
 if(JSON.stringify(laws)!==JSON.stringify([[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]])||JSON.stringify(hs)!==JSON.stringify([10000000000000,10000000000001,10000000000081])||f.seats.length!==4)throw Error('fixture drift');
 const op=new Map(),revs=new Map(),ranks=new Map();
 for(let li=0;li<5;li++)for(const h of hs){
  const p=power(laws[li],h),r=laws[li].length%2===0?80:81,key=li+'|'+h;
  const cols=Array.from({length:81},(_,j)=>mul(p,bit(j)));
  if(mul(p,MASK)!==(r===80?0n:MASK))throw Error('rank/kernel mismatch');
  const augmented=r===80?cols.map((x,j)=>(x&LOW)|(j===0?bit(80):0n)):cols;
  const rev=inverse(augmented);
  for(let j=0;j<81;j++)if(linear(rev,augmented[j])!==bit(j))throw Error('inverse mismatch');
  op.set(key,p);revs.set(key,rev);ranks.set(key,r);
 }
 const logs=[],hex=x=>x.toString(16).padStart(21,'0');let loss=0,full=0;
 for(let w=0;w<27;w++){
  const ti=f.time[Math.floor(w/9)],c=f.color[Math.floor(w/3)%3],sp=f.space[w%3];
  for(const s of f.seats){const seat=s[0];
   for(let b=0;b<81;b++){const x=state(f,s,ti,c,sp,b),y=x^MASK;
    for(let li=0;li<5;li++)for(const h of hs){
     const key=li+'|'+h,r=ranks.get(key),p=op.get(key),rev=revs.get(key),a=mul(p,x),z=mul(p,y);
     let cx=a,cy=z;
     if(r===80){
      const parity=a.toString(2).replace(/0/g,'').length%2;
      if(a!==z||parity!==0)throw Error('loss case mismatch');
      cx=(a&LOW)|((x&1n)<<80n);cy=(z&LOW)|((y&1n)<<80n);
      if(cx===cy)throw Error('certificates collided');loss+=2;
     }else{if(a===z)throw Error('reversible collision');full+=2;}
     if(linear(rev,cx)!==x||linear(rev,cy)!==y)throw Error('reconstruction failed');
     logs.push('W|seat='+seat+'|w='+String(w).padStart(2,'0')+'|body='+String(b).padStart(2,'0')+
      '|law='+li+'|h='+h+'|rank='+r+'|fa='+hex(a)+'|fb='+hex(z)+'|cert_a='+hex(cx)+
      '|cert_b='+hex(cy)+'|recovered=2|extra_bits='+(81-r)+'\n');
    }
   }
  }
 }
 const raw=Buffer.from(logs.join(''),'ascii'),digest=sha(raw);
 fs.writeFileSync(out,raw);
 if(logs.length!==131220||loss!==157464||full!==104976||digest!==EXPECTED)throw Error('counts/digest '+digest);
 console.log(JSON.stringify({status:'PASS',sha256:digest,records:logs.length,recovered:2*logs.length,
     one_bit_recoveries:loss,zero_bit_recoveries:full,evidence_class:'PUBLIC_SOFTWARE_NOT_PHYSICAL_HOST'}));
}
main(process.argv[2],process.argv[3]);
