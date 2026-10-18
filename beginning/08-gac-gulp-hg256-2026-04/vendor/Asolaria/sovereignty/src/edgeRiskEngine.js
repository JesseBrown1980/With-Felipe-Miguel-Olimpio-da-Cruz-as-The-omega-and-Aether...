// Standalone edgeRiskEngine shim for USB sovereignty
// Lightweight risk scoring without the full Asolaria graph runtime

const RISK_MAP = {
  // sovereignty verbs (from verb-table.json)
  'firmware.read': 3, 'firmware.write': 8, 'me.neutralize': 9,
  'firmware_status': 1, 'firmware_backup': 3,
  'boot_guard_check': 1, 'me_status': 1,
  'hypervisor_start': 7, 'hypervisor_stop': 7, 'hypervisor_snapshot': 5, 'hypervisor_restore': 8,
  'sovereignty_boot': 2, 'sovereignty_gate': 0,
  'gnn_train': 4, 'gnn_infer': 1, 'shannon_scan': 3,
  'alpine_install': 6, 'usb_partition': 7, 'luks_create': 7, 'luks_open': 3,
  // standard verbs
  'dispatch': 3, 'observe': 1, 'sync': 2,
  'health': 0, 'sovereignty': 0, 'nerve': 0, 'falcon': 1, 'firmware': 1,
  'heartbeat': 0, 'report': 1,
  // defaults by category
  'send_desktop_input': 6, 'send_phone_input': 6, 'phone_call': 7,
  'raw_api_call': 5, 'run_local_task': 5
};

function scoreEdgeRisk({ action, actor, target, context, policy }) {
  const baseScore = RISK_MAP[action] ?? 3;
  const reasons = [];

  // Escalate if unknown actor
  let score = baseScore;
  if (!actor || actor === 'unknown') { score = Math.min(9, score + 2); reasons.push('unknown actor'); }

  // Escalate if targeting sovereignty root
  if (target && /sovereignty|firmware|spi|bios|uefi/i.test(target)) { score = Math.min(9, score + 1); reasons.push('sovereignty target'); }

  // De-escalate if observer permission tier
  if (context?.permissionTier === 'owner') { score = Math.max(0, score - 1); }

  return { score, level: score <= 2 ? 'low' : score <= 5 ? 'medium' : score <= 7 ? 'high' : 'critical', reasons };
}

module.exports = { scoreEdgeRisk };
