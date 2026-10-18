const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("./runtimePaths");

const rulesPath = resolveDataPath("approval-rules.json");
const defaultRules = {
  version: 1,
  persistentPrefixes: []
};

let rulesCache = null;

function ensureRulesDir() {
  fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
}

function loadRules() {
  if (rulesCache) {
    return rulesCache;
  }

  try {
    if (!fs.existsSync(rulesPath)) {
      rulesCache = { ...defaultRules };
      saveRules(rulesCache);
      return rulesCache;
    }

    const parsed = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
    if (!parsed || !Array.isArray(parsed.persistentPrefixes)) {
      throw new Error("Invalid approval rules file.");
    }

    rulesCache = {
      version: 1,
      persistentPrefixes: parsed.persistentPrefixes
        .map((value) => String(value || "").toLowerCase().trim())
        .filter(Boolean)
    };
    return rulesCache;
  } catch (_error) {
    rulesCache = { ...defaultRules };
    saveRules(rulesCache);
    return rulesCache;
  }
}

function saveRules(rules) {
  ensureRulesDir();
  fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2), "utf8");
}

function tokenize(commandText) {
  const text = String(commandText || "").trim();
  if (!text) {
    return [];
  }

  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const tokens = [];
  let match;

  while ((match = regex.exec(text))) {
    const token = match[1] || match[2] || match[3] || "";
    if (token) {
      tokens.push(token);
    }
    if (tokens.length >= 6) {
      break;
    }
  }

  return tokens;
}

function commandPrefix(commandText) {
  const tokens = tokenize(commandText).map((token) => token.toLowerCase());
  if (tokens.length === 0) {
    return "";
  }

  if (tokens.length >= 2 && tokens[0].includes("powershell") && tokens[1] === "-command") {
    return `${tokens[0]} ${tokens[1]}`;
  }

  return tokens.slice(0, 2).join(" ");
}

function isReadOnly(commandText) {
  const value = String(commandText || "").toLowerCase();
  const patterns = [
    /\b(get-childitem|get-content|cat|type|dir|ls|pwd|whoami|where|which|rg|find|findstr|select-string)\b/,
    /\bgit\s+(status|diff|log|show)\b/,
    /\bnode\s+--check\b/,
    /\bwsl\s+(-l|--status|--version)\b/,
    /\bsysteminfo\b/
  ];
  return patterns.some((pattern) => pattern.test(value));
}

function isDestructive(commandText) {
  const value = String(commandText || "").toLowerCase();
  const patterns = [
    /\brm\b/,
    /\bdel\b/,
    /\bremove-item\b/,
    /\bformat-volume\b/,
    /\bformat\.com\b/,
    /(?:^|[\s"'])format(?:\.com)?\s+[a-z]:(?=\s|$|["'])/,
    /\bdiskpart\b/,
    /\breg\s+delete\b/,
    /\bshutdown\b/,
    /\brestart-computer\b/,
    /\bgit\s+reset\s+--hard\b/,
    /\bgit\s+clean\s+-f/
  ];
  return patterns.some((pattern) => pattern.test(value));
}

function isHigherRiskWrite(commandText) {
  const value = String(commandText || "").toLowerCase();
  const patterns = [
    /\bwinget\s+install\b/,
    /\bchoco\s+install\b/,
    /\bnpm\s+install\b/,
    /\bset-content\b/,
    /\bout-file\b/,
    /\bnew-item\b/,
    /\bcopy-item\b/,
    /\bmove-item\b/,
    /\brename-item\b/,
    /\bset-itemproperty\b/
  ];
  return patterns.some((pattern) => pattern.test(value));
}

function detectApprovalPrompt(text) {
  const value = String(text || "");
  if (!value.trim()) {
    return false;
  }

  const lower = value.toLowerCase();
  const hasIntent = /(approve|approval|allow|permission|confirm|run this command|escalat|don't ask again|do not ask again|request)/.test(lower);
  const hasChoices = /(\(p\)|\(a\)|\(y\)|\by\/n\b|\bno\b|\(n\))/.test(lower);
  return hasIntent && hasChoices;
}

function createApprovalSession() {
  const rules = loadRules();
  const persistentPrefixes = new Set(
    (rules.persistentPrefixes || [])
      .map((value) => String(value || "").toLowerCase().trim())
      .filter(Boolean)
  );
  return {
    rules,
    persistentPrefixes,
    seenPrefixes: new Set(),
    alwaysPrefixes: new Set()
  };
}

function persistPrefix(session, prefix) {
  if (!prefix) {
    return;
  }

  const normalized = prefix.toLowerCase().trim();
  if (!normalized) {
    return;
  }

  const rules = session.rules;
  if (rules.persistentPrefixes.includes(normalized)) {
    session.persistentPrefixes.add(normalized);
    return;
  }

  rules.persistentPrefixes.push(normalized);
  session.persistentPrefixes.add(normalized);
  saveRules(rules);
}

function chooseApprovalChoice({ command, mode = "smart", session, preference = "balanced" }) {
  const normalizedMode = String(mode || "smart").toLowerCase();
  const normalizedPreference = String(preference || "balanced").toLowerCase();
  const normalizedCommand = String(command || "").trim();
  const prefix = commandPrefix(normalizedCommand);
  const isPersistentPrefix = Boolean(prefix && session?.persistentPrefixes?.has(prefix));

  if (normalizedMode === "manual") {
    return { choice: null, reason: "Manual approval mode." };
  }

  if (normalizedMode === "deny") {
    return { choice: "n", reason: "Deny mode active." };
  }

  if (!normalizedCommand) {
    return { choice: "y", reason: "No command context; approve once." };
  }

  if (isDestructive(normalizedCommand)) {
    return {
      choice: normalizedMode === "deny" ? "n" : null,
      escalate: normalizedMode !== "deny",
      reason: normalizedMode === "deny"
        ? "Destructive pattern detected and deny mode active."
        : "Destructive pattern detected; owner approval required.",
      prefix
    };
  }

  if (isPersistentPrefix) {
    return { choice: "p", reason: "Persistent trusted prefix matched.", prefix };
  }

  if (normalizedPreference === "pay_priority") {
    if (isReadOnly(normalizedCommand)) {
      persistPrefix(session, prefix);
      return { choice: "p", reason: "Read-only command promoted to persistent prefix.", prefix };
    }

    if (prefix && session.alwaysPrefixes.has(prefix)) {
      return { choice: "a", reason: "Prefix already trusted for this run.", prefix };
    }

    if (prefix && session.seenPrefixes.has(prefix)) {
      session.alwaysPrefixes.add(prefix);
      return { choice: "a", reason: "Repeated prefix promoted to always for this run.", prefix };
    }

    if (prefix) {
      session.seenPrefixes.add(prefix);
    }

    return { choice: "y", reason: "P/A unavailable; approved once with y.", prefix };
  }

  if (isReadOnly(normalizedCommand)) {
    persistPrefix(session, prefix);
    return { choice: "p", reason: "Trusted read-only command prefix persisted.", prefix };
  }

  if (prefix && session.alwaysPrefixes.has(prefix)) {
    return { choice: "a", reason: "Prefix already approved for this run.", prefix };
  }

  if (prefix && session.seenPrefixes.has(prefix)) {
    session.alwaysPrefixes.add(prefix);
    return { choice: "a", reason: "Repeated prefix promoted to always for this run.", prefix };
  }

  if (prefix) {
    session.seenPrefixes.add(prefix);
  }

  if (isHigherRiskWrite(normalizedCommand)) {
    return { choice: "y", reason: "Higher-risk write/install command approved once.", prefix };
  }

  return { choice: "y", reason: "Default one-time approval.", prefix };
}

function formatApprovalInput(choice) {
  const normalized = String(choice || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "n" || normalized === "no") {
    return "no\n";
  }
  return `${normalized[0]}\n`;
}

function approvalStats() {
  const rules = loadRules();
  return {
    persistentPrefixes: rules.persistentPrefixes.length
  };
}

// ---------- Structured Command Risk Classification (Phase 2) ----------

const COMMAND_RISK_CLASSES = Object.freeze({
  destructive:        { level: 9, label: "Destructive", requiresApproval: true, autoBlock: true },
  privileged_write:   { level: 7, label: "Privileged Write", requiresApproval: true, autoBlock: false },
  secret_touch:       { level: 8, label: "Secret Access", requiresApproval: true, autoBlock: false },
  network_mutation:   { level: 6, label: "Network Mutation", requiresApproval: true, autoBlock: false },
  process_control:    { level: 5, label: "Process Control", requiresApproval: true, autoBlock: false },
  install_package:    { level: 4, label: "Package Install", requiresApproval: false, autoBlock: false },
  higher_risk_write:  { level: 3, label: "Higher Risk Write", requiresApproval: false, autoBlock: false },
  standard_write:     { level: 2, label: "Standard Write", requiresApproval: false, autoBlock: false },
  read_only:          { level: 1, label: "Read Only", requiresApproval: false, autoBlock: false },
  benign:             { level: 0, label: "Benign", requiresApproval: false, autoBlock: false }
});

const RISK_PATTERNS = [
  // Destructive (level 9)
  { class: "destructive", patterns: [
    /\brm\s+.*-[a-z]*r[a-z]*f/i, /\brm\s+.*-[a-z]*f[a-z]*r/i,
    /\bformat-volume\b/i, /\bdiskpart\b/i,
    /\bgit\s+reset\s+--hard\b/i, /\bgit\s+clean\s+-f/i,
    /\bgit\s+push\s+.*--force\b/i,
    /\bdrop\s+table\b/i, /\bdrop\s+database\b/i,
    /\btruncate\s+table\b/i
  ]},
  // Secret access (level 8)
  { class: "secret_touch", patterns: [
    /\.env\b(?!\.sample)/i, /vault\.secrets/i,
    /api[_-]?key/i, /\bpassword\s*=/i,
    /\bsecret\s*=/i, /\btoken\s*=/i,
    /\bcredential/i, /\bprivate[_-]?key/i
  ]},
  // Privileged write (level 7)
  { class: "privileged_write", patterns: [
    /\breg\s+(add|delete)\b/i, /\bNew-NetFirewallRule\b/i,
    /\bnetsh\b.*\b(advfirewall|interface)\b/i,
    /\bsc\s+(create|delete|config)\b/i,
    /\bschtasks\s+\/(create|delete)\b/i,
    /\bchmod\s+[0-7]*[76]/i, /\bchown\b/i
  ]},
  // Network mutation (level 6)
  { class: "network_mutation", patterns: [
    /\bcurl\s+.*-X\s*(POST|PUT|DELETE|PATCH)\b/i,
    /\bInvoke-WebRequest\s+.*-Method\s*(Post|Put|Delete|Patch)\b/i,
    /\bgit\s+push\b/i,
    /\bnpm\s+publish\b/i
  ]},
  // Process control (level 5)
  { class: "process_control", patterns: [
    /\bkill\b/i, /\btaskkill\b/i, /\bStop-Process\b/i,
    /\bshutdown\b/i, /\brestart-computer\b/i,
    /\bnet\s+(start|stop)\b/i,
    /\bsystemctl\s+(start|stop|restart|enable|disable)\b/i
  ]},
  // Package install (level 4)
  { class: "install_package", patterns: [
    /\bnpm\s+install\b/i, /\bpip\s+install\b/i,
    /\bwinget\s+install\b/i, /\bchoco\s+install\b/i,
    /\bapt\s+(install|remove)\b/i, /\bbrew\s+install\b/i
  ]},
  // Higher risk write (level 3)
  { class: "higher_risk_write", patterns: [
    /\bset-content\b/i, /\bout-file\b/i,
    /\bnew-item\b/i, /\bcopy-item\b/i,
    /\bmove-item\b/i, /\brename-item\b/i,
    /\bmkdir\b/i, /\bcp\s+-r/i, /\bmv\b/i
  ]}
];

const READ_ONLY_PATTERNS = [
  /\b(get-childitem|get-content|cat|type|dir|ls|pwd|whoami|where|which|rg|find|findstr|select-string)\b/i,
  /\bgit\s+(status|diff|log|show|branch)\b/i,
  /\bnode\s+(--check|-c|-e)\b/i,
  /\bcurl\s+.*-s\b(?!.*-X)/i,
  /\bhead\b/i, /\btail\b/i, /\bwc\b/i, /\bgrep\b/i
];

function classifyCommandRisk(commandText) {
  const text = String(commandText || "").trim();
  if (!text) return { class: "benign", ...COMMAND_RISK_CLASSES.benign, reasons: [] };

  const reasons = [];

  // Check destructive and high-risk patterns first
  for (const group of RISK_PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(text)) {
        reasons.push({ class: group.class, pattern: pattern.source });
      }
    }
  }

  // If any matches found, return the highest risk class
  if (reasons.length > 0) {
    const highest = reasons.reduce((max, r) => {
      const cls = COMMAND_RISK_CLASSES[r.class];
      return cls.level > (COMMAND_RISK_CLASSES[max.class]?.level || 0) ? r : max;
    });
    return {
      class: highest.class,
      ...COMMAND_RISK_CLASSES[highest.class],
      reasons
    };
  }

  // Check read-only
  if (READ_ONLY_PATTERNS.some(p => p.test(text))) {
    return { class: "read_only", ...COMMAND_RISK_CLASSES.read_only, reasons: [] };
  }

  // Default to standard write if it looks like a command
  if (/^[a-z]/i.test(text) && text.length > 2) {
    return { class: "standard_write", ...COMMAND_RISK_CLASSES.standard_write, reasons: [] };
  }

  return { class: "benign", ...COMMAND_RISK_CLASSES.benign, reasons: [] };
}

module.exports = {
  createApprovalSession,
  chooseApprovalChoice,
  detectApprovalPrompt,
  formatApprovalInput,
  approvalStats,
  classifyCommandRisk,
  COMMAND_RISK_CLASSES,
  isReadOnly,
  isDestructive,
  isHigherRiskWrite
};
