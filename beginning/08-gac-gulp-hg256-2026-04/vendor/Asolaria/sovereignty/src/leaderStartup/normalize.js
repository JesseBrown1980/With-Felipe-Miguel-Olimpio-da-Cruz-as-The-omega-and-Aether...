const {
  DEFAULT_MEMORY_LIMIT,
  DEFAULT_SECURITY_FALLBACKS,
  DEFAULT_LEADERS,
  DEFAULT_RULERS
} = require("./constants");

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function normalizeMemoryLimit(value) {
  return Number(value) === 2 ? 2 : DEFAULT_MEMORY_LIMIT;
}

function normalizeSecurityFallbacks(fallbacks) {
  const values = Array.isArray(fallbacks) ? fallbacks : DEFAULT_SECURITY_FALLBACKS;
  return Array.from(new Set(values.map((entry) => String(entry || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).filter(Boolean)));
}

function normalizeLeaders(leaders) {
  const values = Array.isArray(leaders) && leaders.length > 0 ? leaders : DEFAULT_LEADERS;
  return values.map((entry) => typeof entry === "string"
    ? { id: slugify(entry), title: entry, mission: "use the mapped startup packet before acting" }
    : { id: slugify(entry.id || entry.title), title: String(entry.title || entry.id || "leader").trim(), mission: String(entry.mission || "use the mapped startup packet before acting").trim() });
}

function normalizeRulers(rulers) {
  const values = Array.isArray(rulers) && rulers.length > 0 ? rulers : DEFAULT_RULERS;
  return values.map((entry) => ({
    id: slugify(entry.id || entry.title),
    title: String(entry.title || entry.id || "ruler").trim(),
    pid: String(entry.pid || entry.id || "operator").trim(),
    omniProfile: String(entry.omniProfile || "omni-operator").trim(),
    authorityRank: String(entry.authorityRank || "operator").trim(),
    trustClass: String(entry.trustClass || "trusted").trim()
  }));
}

module.exports = {
  slugify,
  normalizeMemoryLimit,
  normalizeSecurityFallbacks,
  normalizeLeaders,
  normalizeRulers
};
