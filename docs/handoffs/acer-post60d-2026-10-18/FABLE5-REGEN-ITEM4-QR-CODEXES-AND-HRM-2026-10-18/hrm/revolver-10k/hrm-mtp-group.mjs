// hrm-mtp-group.mjs — HRM mini-model MTP group predictor
//
// Anchor: ASOLARIA-FROZEN-BRAIN-SLICE-ARCH-V1-PID-2026-05-21
// Component 3 of 7.
//
// K=3 HRM mini-models predict next-K tokens at a slice in parallel.
// Aggregation: confidence-weighted vote.
// Descriptor-only until Python adapter wired (HRM_GPU_OK gate).

import crypto from 'node:crypto';
import { bridgeHrm, hrmAvailable } from './planes/hrm.mjs';

const K_HEADS = 3;                  // 3 MTP heads (Gemma 4 canonical)
const CONFIDENCE_THRESHOLD_DEFAULT = 0.85;

const STATE = {
  predictions: 0,
  high_confidence_hits: 0,
  low_confidence_fallbacks: 0,
  hrm_calls: 0,
};

// Predict next-K tokens at slice via K HRM heads in parallel
export async function predictAtSlice(sliceAddress, query, options = {}) {
  STATE.predictions++;

  const K = options.K || K_HEADS;
  const promises = [];

  // Spawn K parallel HRM bridge calls
  for (let head = 0; head < K; head++) {
    const headPrompt = `[HRM-HEAD-${head} @ slice L${sliceAddress.layer} offset ${sliceAddress.slice_start}]\n${query || ''}`;
    promises.push(bridgeHrm(headPrompt, { model: 'gemma-4b-hrm-mtp' }).then(frame => ({
      head, frame, frame_bytes: frame.length,
    })).catch(e => ({ head, error: String(e?.message || e) })));
  }

  STATE.hrm_calls += K;
  const results = await Promise.all(promises);
  const valid = results.filter(r => !r.error);

  if (valid.length === 0) {
    return { ok: false, reason: 'all_hrm_heads_failed', errors: results, descriptor_only: true };
  }

  // Aggregate via confidence-weighted vote (descriptor stub: hash agreement)
  const agreement = computeAgreement(valid);
  const confidence = agreement.confidence;
  const high = confidence >= (options.threshold || CONFIDENCE_THRESHOLD_DEFAULT);

  if (high) STATE.high_confidence_hits++;
  else STATE.low_confidence_fallbacks++;

  return {
    ok: true,
    slice_address: sliceAddress,
    query_sha16: crypto.createHash('sha256').update(query || '').digest('hex').slice(0, 16),
    head_count: K,
    valid_heads: valid.length,
    aggregated_prediction: agreement.winner,
    confidence,
    high_confidence: high,
    descriptor_only: !hrmAvailable() ? true : 'pending-runtime-adapter',
    ts: new Date().toISOString(),
  };
}

function computeAgreement(heads) {
  // For descriptor stub: hash each frame, count majority
  // In live mode: use logit/embedding distance
  const hashes = heads.map(h => crypto.createHash('sha256').update(h.frame).digest('hex').slice(0, 8));
  const counts = {};
  for (const h of hashes) counts[h] = (counts[h] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const winnerHash = sorted[0][0];
  const winnerCount = sorted[0][1];
  return {
    winner: winnerHash,
    confidence: winnerCount / heads.length,
    distribution: counts,
  };
}

export function state() {
  return {
    ...STATE,
    hit_rate: STATE.predictions > 0 ? (STATE.high_confidence_hits / STATE.predictions) : 0,
    hrm_available: hrmAvailable(),
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const sliceAddr = { layer: 12, slice_start: 1024, slice_end: 1168, slice_width: 144, mtp_head: 0 };
  const result = await predictAtSlice(sliceAddr, 'classify this envelope');
  console.log(JSON.stringify({ result, state: state() }, null, 2));
}
