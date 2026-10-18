/**
 * Settings Singleton — extracted from server.js (ADR-0001 Phase 3)
 *
 * The settings object is initialized once by server.js at startup via init().
 * Route modules can then require this module directly to access settings
 * without factory injection.
 *
 * This is a deliberate shared mutable singleton — settings change at runtime
 * via the /api/settings endpoint. All consumers see the same live object.
 */

let _settings = null;

/**
 * Initialize the settings singleton. Called once from server.js at startup.
 * @param {Object} settingsObj — the live mutable settings object from server.js
 */
function init(settingsObj) {
  _settings = settingsObj;
}

/**
 * Get the live settings object. Throws if not initialized.
 * @returns {Object} the settings reference (mutable)
 */
function get() {
  if (!_settings) {
    throw new Error("Settings not initialized. Call settings.init() from server.js first.");
  }
  return _settings;
}

/**
 * Read a specific setting value.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function read(key, fallback) {
  if (!_settings) return fallback;
  return _settings[key] !== undefined ? _settings[key] : fallback;
}

module.exports = { init, get, read };
