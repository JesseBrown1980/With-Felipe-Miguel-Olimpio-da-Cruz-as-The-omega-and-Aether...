'use strict';
/** Independent Node 22 audit of all Asolaria ternary 100 additional powers.
 * Validates independently generated Python JSON, but derives expected values
 * from BigInt arithmetic, an independent basis-state GF3 evolution, and
 * an independent time/hash separation. */
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const here=__dirname;
const raw=fs.readFileSync(here+'/RUNG-100-RESULTS.json');
const doc=JSON.parse(raw);
assert.equal(doc.schema,'ASOLARIA-TERNARY-RUNG-100-EXACT-V1');
assert.equal(doc.rungs.length,101);
assert.equal(doc.additional_three_multiplications,100);
const N=81;
function step(state,taps) {const y=[];for(let i=0;i<N;i++){let s=0;for(const tap of taps)s+=state[(i-tap+N)%N];y.push(s%3);}return y;}
const directLawResults=[];
for(const taps of [[0,1,3],[0,4,7]]){
  let seenCollisions=0;
  // The 81 input basis vectors each become zero by 81 updates.
  for(let j=0;j<N;j++){
    let s=Array(N).fill(0);s[j]=1;
    for(let k=0;k<81;k++)s=step(s,taps);
    assert(s.every(x=>x===0));seenCollisions++;
  }
  directLawResults.push({taps,zero_after_81_for_all_81_basis_vectors:seenCollisions});
}
const summary=[];
for(let i=0;i<doc.rungs.length;i++){
  const row=doc.rungs[i],e=BigInt(16+i),n=3n**e;
  assert.equal(row.exponent,Number(e));
  assert.equal(row.logical_steps,n.toString());
  assert.equal(row.decimal_digits,n.toString().length);
  assert.equal(row.base3_one_hot_position,Number(e));
  assert.equal(row.gf3_taps_0_1_3_nonzero,0);
  assert.equal(row.gf3_taps_0_4_7_nonzero,0);
  assert.equal(row.registered_phase_layers,Number(e)-5);
  assert.equal(row.phase_zero_observers,Number(e)-5);
  assert.equal(row.newly_introduced_phase_period,(3n**(e-1n)).toString());
  if (i>0)assert.equal(n,3n*BigInt(doc.rungs[i-1].logical_steps));
  for(let j=5n;j<e;j++)assert.equal(n%(3n**j),0n);
  summary.push({exponent:Number(e),decimal_digits:n.toString().length,observers:Number(e)-5});
}
const e100=10n**100n;
assert.equal(doc.e100.logical_steps,e100.toString());
assert.equal(doc.e100.registered_phase_layers_3pow116,111);
assert.equal(doc.e100.phase_zero_observers,0);
for(let j=5n;j<116n;j++)assert.notEqual(e100%(3n**j),0n);
assert(3n**209n<e100&&e100<3n**210n);
const closer=(e100-3n**209n)<(3n**210n-e100)?209:210;
assert.equal(doc.e100.closer_power_by_absolute_difference,closer);
const result={schema:'ASOLARIA-100-RUNG-INDEPENDENT-NODE-V1',checked_rows:101,
  baseline_power:16,endpoint_power:116,
  direct_GF3_basis_nilpotency:directLawResults,
  all_101_phases_and_onehot_exponents_checked:true,
  e100_actual_independent_transition_iterations_executed:false,
  e100_zero_phase_observers:0,
  e100_bracketing_powers:[209,210],
  e100_closest_power_absolute:closer,
  final_3pow116_decimal_digits:doc.rungs[100].decimal_digits,
  final_constructed_phase_registers:doc.rungs[100].registered_phase_layers,
  source_json_sha256:crypto.createHash('sha256').update(raw).digest('hex'),
  original_GF3_memories_dont_reappear_after_nilpotency:true,
  independently_measured_photonic_emergence:false};
fs.writeFileSync(here+'/INDEPENDENT-NODE-REVIEW.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS 101 checked rungs, 162 independent nilpotent GF3 basis evolutions');
console.log('E100 phase count',0,'nearest power',closer,'3^116 decimal digits',doc.rungs[100].decimal_digits);
console.log('SHA256',result.source_json_sha256);
