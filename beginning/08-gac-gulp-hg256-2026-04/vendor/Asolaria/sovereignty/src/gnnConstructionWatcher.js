// Standalone gnnConstructionWatcher shim for USB sovereignty
// Lightweight construction prediction without full GNN runtime

const edgeHistory = [];
const MAX_HISTORY = 1000;

function recordRoutingEdge(pid, verb, target) {
  edgeHistory.push({ pid, verb, target, ts: Date.now() });
  if (edgeHistory.length > MAX_HISTORY) edgeHistory.shift();
}

function predictConstruction(verb) {
  // Simple frequency-based prediction from recent history
  const recent = edgeHistory.slice(-50);
  const afterVerb = [];
  for (let i = 0; i < recent.length - 1; i++) {
    if (recent[i].verb === verb) afterVerb.push(recent[i + 1].verb);
  }
  if (afterVerb.length === 0) return { nextVerb: '', confidence: 0, constructionId: '' };
  const freq = {};
  for (const v of afterVerb) freq[v] = (freq[v] || 0) + 1;
  const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  return { nextVerb: best[0], confidence: best[1] / afterVerb.length, constructionId: `freq_${verb}_${best[0]}` };
}

module.exports = { recordRoutingEdge, predictConstruction };
