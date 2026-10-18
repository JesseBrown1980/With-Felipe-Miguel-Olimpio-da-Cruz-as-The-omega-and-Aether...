// IX registry | PID: asolaria | Profile: asolaria
// Exports all IX modules as a single registry
module.exports = {
  // nouns (GET state)
  health:      require('./nouns/health'),
  sovereignty: require('./nouns/sovereignty'),
  nerve:       require('./nouns/nerve'),
  falcon:      require('./nouns/falcon'),
  // verbs (POST actions)
  dispatch:    require('./verbs/dispatch'),
  observe:     require('./verbs/observe'),
  sync:        require('./verbs/sync'),
  // chains
  heartbeat:   require('./chains/heartbeat'),
  report:      require('./chains/report'),
  // gates
  sovereign:   require('./gates/sovereign')
};
