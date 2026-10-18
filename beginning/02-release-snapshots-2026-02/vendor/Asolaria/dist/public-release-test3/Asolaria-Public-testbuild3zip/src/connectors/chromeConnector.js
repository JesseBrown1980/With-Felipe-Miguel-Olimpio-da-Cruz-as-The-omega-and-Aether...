const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveToolPaths } = require('./systemPaths');

function normalizeUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) {
    throw new Error('URL is empty.');
  }
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  const parsed = new URL(value);
  return parsed.toString();
}

async function openChromeUrl(url) {
  const launched = launchChromeUrl(url);
  return launched.url;
}

function launchChromeUrl(url, options = {}) {
  const toolPaths = resolveToolPaths();
  if (!toolPaths.chromePath) {
    throw new Error('Google Chrome was not found on this machine.');
  }

  const normalized = normalizeUrl(url);
  const appMode = Boolean(options.appMode);
  const newWindow = options.newWindow !== false;
  const isolatedProfile = Boolean(options.isolatedProfile);
  const args = [];
  let profilePath = '';
  if (isolatedProfile) {
    const profileName = String(options.profileName || 'asolaria-ui')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    profilePath = path.join(os.tmpdir(), 'asolaria-chrome', profileName);
    fs.mkdirSync(profilePath, { recursive: true });
    args.push(`--user-data-dir=${profilePath}`);
    args.push('--no-first-run', '--no-default-browser-check');
  }
  if (newWindow) {
    args.push('--new-window');
  }
  if (appMode) {
    args.push(`--app=${normalized}`);
  } else {
    args.push(normalized);
  }

  const child = spawn(toolPaths.chromePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  child.unref();

  return {
    url: normalized,
    pid: Number(child.pid || 0) || null,
    appMode,
    profilePath
  };
}

module.exports = {
  openChromeUrl,
  launchChromeUrl,
  normalizeUrl
};
