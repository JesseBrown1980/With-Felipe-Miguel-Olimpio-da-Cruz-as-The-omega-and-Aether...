/**
 * Skill Correlator System — Indexes skills, tools, knowledge, and mistakes
 * into a searchable correlation map for the swarm.
 *
 * Correlates:
 * - Skills (what Asolaria can do)
 * - Tools (what connectors provide)
 * - Knowledge (what the semantic KB knows)
 * - Mistakes (what went wrong before and how to avoid it)
 * - Projects (QDD workstreams, Asolaria phases)
 * - Hooks (Dan's guard patterns)
 */

const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("./runtimePaths");

function buildCorrelationIndex() {
  const index = {
    generatedAt: new Date().toISOString(),
    skills: [],
    tools: [],
    connectors: [],
    mistakes: [],
    projects: [],
    hooks: [],
    correlations: []
  };

  // ── Skills from skills directory ──
  try {
    const skillsDir = path.join(__dirname, "..", "skills");
    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const metaPath = path.join(skillsDir, dir.name, "skill.json");
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            index.skills.push({
              id: dir.name,
              name: meta.name || dir.name,
              description: meta.description || "",
              risk: meta.risk || "low",
              tags: meta.tags || []
            });
          } catch (_) {}
        } else {
          index.skills.push({ id: dir.name, name: dir.name, description: "", risk: "low", tags: [] });
        }
      }
    }
  } catch (_) {}

  // ── Tools from connector manifests ──
  try {
    const connectorsDir = path.join(__dirname, "connectors");
    const files = fs.readdirSync(connectorsDir).filter(f => f.endsWith("Connector.js"));
    for (const file of files) {
      try {
        const mod = require(path.join(connectorsDir, file));
        if (typeof mod.manifest === "function") {
          const m = mod.manifest();
          index.connectors.push({
            id: m.id,
            file,
            capabilities: m.capabilities || [],
            readScopes: m.readScopes || [],
            writeScopes: m.writeScopes || [],
            healthCheck: m.healthCheck || false
          });
          for (const cap of (m.capabilities || [])) {
            index.tools.push({ id: `${m.id}.${cap}`, connector: m.id, capability: cap });
          }
        }
      } catch (_) {}
    }
  } catch (_) {}

  // ── Mistakes from pattern store ──
  try {
    const mistakePath = resolveDataPath("mistake-patterns.json");
    if (fs.existsSync(mistakePath)) {
      const patterns = JSON.parse(fs.readFileSync(mistakePath, "utf8"));
      const active = (patterns.patterns || []).filter(p => p.status === "active");
      index.mistakes = active.map(p => ({
        id: p.id,
        pattern: p.pattern,
        avoidance: p.avoidance,
        severity: p.severity,
        skillId: p.skillId,
        toolId: p.toolId
      }));
    }
  } catch (_) {}

  // ── Hooks from hooksConnector ──
  try {
    index.hooks = [
      { id: "pre_tool_guard", type: "pre_tool_use", description: "Blocks dangerous rm commands and .env file access" },
      { id: "session_tracking", type: "session_lifecycle", description: "Tracks agent sessions with start/end/prompt events" },
      { id: "transcript_backup", type: "pre_compact", description: "Backs up transcripts before memory compaction" },
      { id: "syntax_checker", type: "post_tool_use", description: "Dan's hooks: validates syntax after Write/Edit to guarded files" },
      { id: "safety_net", type: "process", description: "Catches uncaught exceptions and unhandled rejections" },
      { id: "approval_guard", type: "pre_mutation", description: "Guardian approval engine with 7 risk classes + hook guards" }
    ];
  } catch (_) {}

  // ── Projects ──
  index.projects = [
    {
      id: "asolaria",
      name: "Asolaria Civilization",
      status: "active",
      phases: 11,
      phasesComplete: 11,
      description: "Sovereign control plane, monolith decomposition, GNN, federation"
    },
    {
      id: "qdd-ezprotect",
      name: "QDD EZ Protect",
      status: "active",
      completionPercent: 89,
      requirements: { total: 38, done: 34, partial: 1, blocked: 1, notDone: 2 },
      description: "Charm Sciences EZ Protect module for eBacMap"
    },
    {
      id: "qdd-pqbid",
      name: "QDD PQ Bid System",
      status: "scaffolded",
      completionPercent: 15,
      description: "Specialized Testing bid management, scheduling, QuickBooks invoicing"
    },
    {
      id: "qdd-scheduler",
      name: "QDD eBacMap Scheduler",
      status: "maintenance",
      openBranches: 35,
      description: "Ongoing scheduler bug fixes and improvements"
    }
  ];

  // ── Build correlations ──
  // Skill → Connector correlations
  for (const skill of index.skills) {
    for (const connector of index.connectors) {
      const overlap = (skill.tags || []).filter(t =>
        (connector.capabilities || []).some(c => c.includes(t) || t.includes(c))
      );
      if (overlap.length > 0) {
        index.correlations.push({
          type: "skill_uses_connector",
          from: skill.id,
          to: connector.id,
          strength: overlap.length,
          via: overlap
        });
      }
    }
  }

  // Mistake → Skill correlations
  for (const mistake of index.mistakes) {
    if (mistake.skillId) {
      index.correlations.push({
        type: "mistake_for_skill",
        from: mistake.id,
        to: mistake.skillId,
        strength: 1,
        via: [mistake.pattern]
      });
    }
  }

  return index;
}

function saveCorrelationIndex(outputPath) {
  const index = buildCorrelationIndex();
  const fullPath = outputPath || resolveDataPath("skill-correlation-index.json");
  fs.writeFileSync(fullPath, JSON.stringify(index, null, 2), "utf8");
  return {
    ok: true,
    path: fullPath,
    stats: {
      skills: index.skills.length,
      tools: index.tools.length,
      connectors: index.connectors.length,
      mistakes: index.mistakes.length,
      hooks: index.hooks.length,
      projects: index.projects.length,
      correlations: index.correlations.length
    }
  };
}

module.exports = { buildCorrelationIndex, saveCorrelationIndex };
