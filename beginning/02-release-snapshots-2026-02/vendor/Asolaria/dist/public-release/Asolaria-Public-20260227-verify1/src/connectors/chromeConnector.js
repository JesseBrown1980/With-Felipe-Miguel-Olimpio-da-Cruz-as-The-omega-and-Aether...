const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveToolPaths } = require('./systemPaths');
const RESTRICTED_PROFILE_REGEX = /(sp+i+n+utech|csi|emergencetek|emergene[\s_-]*tek)/i;

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

function normalizeProfileName(raw) {
  return String(raw || "asolaria-ui")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
}

function resolveIsolatedProfilePath(profileName) {
  const safeName = normalizeProfileName(profileName || "asolaria-ui");
  return path.join(os.tmpdir(), "asolaria-chrome", safeName);
}

function getChromeUserDataPath() {
  const override = String(process.env.ASOLARIA_UI_CHROME_USER_DATA_DIR || '').trim();
  if (override) return override;
  const localAppData = String(process.env.LOCALAPPDATA || '').trim();
  if (localAppData) {
    return path.join(localAppData, 'Google', 'Chrome', 'User Data');
  }
  return path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
}

function readLocalStateInfoCache(userDataPath) {
  try {
    const localStatePath = path.join(userDataPath, 'Local State');
    if (!fs.existsSync(localStatePath)) return {};
    const raw = fs.readFileSync(localStatePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && parsed.profile && parsed.profile.info_cache && typeof parsed.profile.info_cache === 'object'
      ? parsed.profile.info_cache
      : {};
  } catch {
    return {};
  }
}

function listChromeProfiles(userDataPath) {
  const infoCache = readLocalStateInfoCache(userDataPath);
  let entries = [];
  try {
    entries = fs.readdirSync(userDataPath, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry && entry.isDirectory())
    .map((entry) => String(entry.name || '').trim())
    .filter((name) => name === 'Default' || /^Profile\s+\d+$/i.test(name))
    .map((directory) => {
      const cached = infoCache[directory] || {};
      const displayName = String(cached.name || directory).trim() || directory;
      const email = String(cached.user_name || '').trim();
      const gaiaName = String(cached.gaia_name || '').trim();
      const identity = `${directory}|${displayName}|${email}|${gaiaName}`;
      const restricted = RESTRICTED_PROFILE_REGEX.test(identity);
      return { directory, displayName, email, restricted };
    });
}

function listManagedChromeProfiles(options = {}) {
  const userDataPath = getChromeUserDataPath();
  const allowRestricted = Boolean(options.allowRestrictedProfile || options.includeRestricted);
  const allProfiles = listChromeProfiles(userDataPath);
  const profiles = allowRestricted
    ? allProfiles
    : allProfiles.filter((entry) => !entry.restricted);
  let defaultProfile = null;
  try {
    defaultProfile = resolveManagedProfile({
      allowRestrictedProfile: allowRestricted,
      profileDirectory: String(options.profileDirectory || "").trim(),
      profileEmail: String(options.profileEmail || "").trim()
    });
  } catch {
    defaultProfile = null;
  }
  return {
    userDataPath,
    allowRestrictedProfile: allowRestricted,
    totalDiscovered: allProfiles.length,
    totalAllowed: profiles.length,
    defaultProfile,
    profiles
  };
}

function resolveManagedProfile(options = {}) {
  const userDataPath = getChromeUserDataPath();
  const allowRestricted = Boolean(options.allowRestrictedProfile);
  const preferredDirectory = String(
    options.profileDirectory
    || process.env.ASOLARIA_UI_CHROME_PROFILE_DIRECTORY
    || ''
  ).trim();
  const preferredEmail = String(
    options.profileEmail
    || process.env.ASOLARIA_UI_CHROME_EMAIL
    || 'plasmatoid@gmail.com'
  ).trim().toLowerCase();

  const profiles = listChromeProfiles(userDataPath);
  if (!profiles.length) {
    throw new Error(`No Chrome profiles were found under ${userDataPath}.`);
  }

  const allowed = allowRestricted ? profiles : profiles.filter((entry) => !entry.restricted);
  if (!allowed.length) {
    throw new Error('No permitted Chrome profiles are available (all discovered profiles are restricted).');
  }

  if (preferredDirectory) {
    const match = allowed.find((entry) => entry.directory.toLowerCase() === preferredDirectory.toLowerCase());
    if (match) return match;
    throw new Error(`Preferred Chrome profile directory was not found or not permitted: ${preferredDirectory}`);
  }

  if (preferredEmail) {
    const match = allowed.find((entry) => entry.email.toLowerCase() === preferredEmail);
    if (match) return match;
    if (preferredEmail !== 'plasmatoid@gmail.com') {
      throw new Error(`Preferred Chrome profile email was not found or not permitted: ${preferredEmail}`);
    }
  }

  const profile3 = allowed.find((entry) => entry.directory.toLowerCase() === 'profile 3');
  if (profile3) return profile3;
  throw new Error('Plasmatoid Chrome profile could not be resolved.');
}

function normalizeWindowBounds(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const x = Number(source.x);
  const y = Number(source.y);
  const width = Number(source.width);
  const height = Number(source.height);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  const bounded = {
    x: Math.max(-50000, Math.min(50000, Math.round(x))),
    y: Math.max(-50000, Math.min(50000, Math.round(y))),
    width: Math.max(320, Math.min(12000, Math.round(width))),
    height: Math.max(220, Math.min(12000, Math.round(height)))
  };
  return bounded;
}

async function openChromeUrl(url, options = {}) {
  const launched = launchChromeUrl(url, options);
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
  const useManagedProfile = options.useManagedProfile !== false && !isolatedProfile;
  const disableTranslate = options.disableTranslate !== false;
  const windowBounds = normalizeWindowBounds(options.windowBounds || {});
  const args = [];
  let profilePath = '';
  let profileDirectory = '';
  let profileEmail = '';
  if (disableTranslate) {
    // Prevent Chrome's translation UI from obscuring Asolaria app surfaces.
    args.push('--disable-translate');
    args.push('--disable-features=Translate,TranslateUI');
  }
  if (isolatedProfile) {
    const profileName = normalizeProfileName(options.profileName || "asolaria-ui");
    profilePath = resolveIsolatedProfilePath(profileName);
    fs.mkdirSync(profilePath, { recursive: true });
    args.push(`--user-data-dir=${profilePath}`);
    args.push('--no-first-run', '--no-default-browser-check');
  } else if (useManagedProfile) {
    const resolved = resolveManagedProfile(options);
    profileDirectory = resolved.directory;
    profileEmail = resolved.email;
    args.push(`--profile-directory=${profileDirectory}`);
  }
  if (windowBounds) {
    args.push(`--window-position=${windowBounds.x},${windowBounds.y}`);
    args.push(`--window-size=${windowBounds.width},${windowBounds.height}`);
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
    profilePath,
    profileDirectory,
    profileEmail,
    windowBounds
  };
}

module.exports = {
  openChromeUrl,
  launchChromeUrl,
  normalizeUrl,
  resolveIsolatedProfilePath,
  resolveManagedProfile,
  listManagedChromeProfiles
};
