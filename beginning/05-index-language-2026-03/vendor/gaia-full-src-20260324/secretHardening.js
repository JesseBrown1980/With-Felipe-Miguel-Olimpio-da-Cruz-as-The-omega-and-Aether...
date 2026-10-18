/**
 * Secret Hardening — Phase 2 Security Fabric
 *
 * Wraps sensitive data using Windows DPAPI (Data Protection API)
 * so vault master keys are not stored as plaintext on disk.
 *
 * DPAPI encrypts data using the current Windows user's credentials,
 * meaning only the same user on the same machine can decrypt.
 *
 * Falls back to plaintext with a warning if DPAPI is unavailable.
 */

const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const IS_WINDOWS = process.platform === "win32";

// ---------- DPAPI via PowerShell ----------

function dpapiProtect(plaintext) {
  if (!IS_WINDOWS) return null;

  try {
    const base64Input = Buffer.from(plaintext, "utf8").toString("base64");
    const script = `
      Add-Type -AssemblyName System.Security
      $bytes = [System.Convert]::FromBase64String('${base64Input}')
      $protected = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
      [System.Convert]::ToBase64String($protected)
    `;
    const result = childProcess.execSync(
      `powershell.exe -NoProfile -Command "${script.replace(/\n/g, " ")}"`,
      { encoding: "utf8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    return result || null;
  } catch (err) {
    console.warn("[secretHardening] DPAPI protect failed:", err.message);
    return null;
  }
}

function dpapiUnprotect(protectedBase64) {
  if (!IS_WINDOWS) return null;

  try {
    const script = `
      Add-Type -AssemblyName System.Security
      $protected = [System.Convert]::FromBase64String('${protectedBase64}')
      $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
      [System.Text.Encoding]::UTF8.GetString($bytes)
    `;
    const result = childProcess.execSync(
      `powershell.exe -NoProfile -Command "${script.replace(/\n/g, " ")}"`,
      { encoding: "utf8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    return result || null;
  } catch (err) {
    console.warn("[secretHardening] DPAPI unprotect failed:", err.message);
    return null;
  }
}

// ---------- Hardened Secret Store ----------

const HARDENED_STORE_PATH = path.join(__dirname, "..", "data", "vault", "hardened-secrets.json");

function loadHardenedStore() {
  try {
    if (!fs.existsSync(HARDENED_STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(HARDENED_STORE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveHardenedStore(store) {
  const dir = path.dirname(HARDENED_STORE_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = HARDENED_STORE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tmp, HARDENED_STORE_PATH);
}

function hardenSecret(key, plaintext) {
  const store = loadHardenedStore();

  const protected64 = dpapiProtect(plaintext);
  if (protected64) {
    store[key] = {
      method: "dpapi_current_user",
      data: protected64,
      hardenedAt: new Date().toISOString(),
      platform: process.platform
    };
    saveHardenedStore(store);
    return { ok: true, method: "dpapi_current_user", key };
  }

  // Fallback: AES-256 with machine-derived key (weaker than DPAPI but better than plaintext)
  const machineKey = crypto.createHash("sha256")
    .update(`${process.env.COMPUTERNAME || "asolaria"}-${process.env.USERNAME || "user"}-${__dirname}`)
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", machineKey, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  store[key] = {
    method: "aes_256_gcm_machine",
    data: encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    hardenedAt: new Date().toISOString(),
    platform: process.platform,
    warning: "DPAPI unavailable — using machine-derived key (weaker protection)"
  };
  saveHardenedStore(store);
  return { ok: true, method: "aes_256_gcm_machine", key, warning: "DPAPI unavailable" };
}

function retrieveSecret(key) {
  const store = loadHardenedStore();
  const entry = store[key];
  if (!entry) return null;

  if (entry.method === "dpapi_current_user") {
    const plaintext = dpapiUnprotect(entry.data);
    if (plaintext) return plaintext;
    console.warn(`[secretHardening] DPAPI unprotect failed for key '${key}'`);
    return null;
  }

  if (entry.method === "aes_256_gcm_machine") {
    try {
      const machineKey = crypto.createHash("sha256")
        .update(`${process.env.COMPUTERNAME || "asolaria"}-${process.env.USERNAME || "user"}-${__dirname}`)
        .digest();
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        machineKey,
        Buffer.from(entry.iv, "base64")
      );
      decipher.setAuthTag(Buffer.from(entry.tag, "base64"));
      let decrypted = decipher.update(entry.data, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      console.warn(`[secretHardening] AES decrypt failed for key '${key}':`, err.message);
      return null;
    }
  }

  return null;
}

function listHardenedKeys() {
  const store = loadHardenedStore();
  return Object.entries(store).map(([key, entry]) => ({
    key,
    method: entry.method,
    hardenedAt: entry.hardenedAt,
    warning: entry.warning || null
  }));
}

function removeHardenedSecret(key) {
  const store = loadHardenedStore();
  if (!store[key]) return false;
  delete store[key];
  saveHardenedStore(store);
  return true;
}

function getHardeningStatus() {
  return {
    platform: process.platform,
    dpapiAvailable: IS_WINDOWS,
    hardenedKeys: listHardenedKeys(),
    storePath: HARDENED_STORE_PATH
  };
}

module.exports = {
  hardenSecret,
  retrieveSecret,
  listHardenedKeys,
  removeHardenedSecret,
  getHardeningStatus,
  dpapiProtect,
  dpapiUnprotect
};
