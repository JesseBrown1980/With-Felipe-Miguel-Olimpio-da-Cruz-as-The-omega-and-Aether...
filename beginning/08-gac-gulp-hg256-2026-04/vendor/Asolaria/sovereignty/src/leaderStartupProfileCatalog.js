const { RULE_ID, TASK_ID, DEFAULT_LEADERS, DEFAULT_MEMORY_LIMIT, DEFAULT_SECURITY_FALLBACKS } = require("./leaderStartup/constants");
const { normalizeMemoryLimit } = require("./leaderStartup/normalize");
const { normalizeRecentMemories } = require("./leaderStartup/memories");
const { parseKeyValuePacket } = require("./leaderStartup/context");
const { buildLeaderStartupProfileCatalog } = require("./leaderStartup/build");

module.exports = {
  RULE_ID,
  TASK_ID,
  DEFAULT_LEADERS,
  DEFAULT_MEMORY_LIMIT,
  DEFAULT_SECURITY_FALLBACKS,
  buildLeaderStartupProfileCatalog,
  normalizeMemoryLimit,
  normalizeRecentMemories,
  parseKeyValuePacket
};

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(buildLeaderStartupProfileCatalog().manifest, null, 2)}\n`);
}
