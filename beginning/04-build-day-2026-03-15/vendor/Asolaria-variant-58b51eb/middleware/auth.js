/**
 * Gateway Auth Middleware — Phase 2 Security Fabric
 *
 * Layered auth that coexists with existing mobile/remote token systems:
 * 1. Loopback (127.0.0.1) → admin (backward compat)
 * 2. Mobile token (x-asolaria-token / query ?token=) → mobile role
 * 3. Bearer token (Authorization: Bearer ...) → role from token store
 * 4. Otherwise → 401
 *
 * RBAC Roles (enforced):
 *   sovereign  — full control (owner only)
 *   admin      — all operations (loopback, trusted tokens)
 *   lane       — bridge lane operations only
 *   external   — bounded external AI/MCP operations
 *   readonly   — read-only API access
 *   mobile     — phone-authenticated operations
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { hardenSecret, retrieveSecret } = require("../src/secretHardening");

const TOKEN_PATH = path.join(__dirname, "..", "data", "gateway-auth-tokens.json");
const DPAPI_TOKEN_KEY = "gateway_auth_tokens";

// ---------- RBAC Definitions ----------

const ROLES = Object.freeze({
  sovereign: { level: 0, label: "Sovereign", canWrite: true, canAdmin: true, canMutateSecrets: true },
  admin:     { level: 1, label: "Admin", canWrite: true, canAdmin: true, canMutateSecrets: false },
  lane:      { level: 2, label: "Lane", canWrite: true, canAdmin: false, canMutateSecrets: false },
  mobile:    { level: 3, label: "Mobile", canWrite: true, canAdmin: false, canMutateSecrets: false },
  external:  { level: 4, label: "External", canWrite: false, canAdmin: false, canMutateSecrets: false },
  readonly:  { level: 5, label: "Read-only", canWrite: false, canAdmin: false, canMutateSecrets: false }
});

function getRole(roleName) {
  return ROLES[roleName] || ROLES.readonly;
}

function hasPermission(roleName, permission) {
  const role = getRole(roleName);
  switch (permission) {
    case "write": return role.canWrite;
    case "admin": return role.canAdmin;
    case "mutate_secrets": return role.canMutateSecrets;
    case "read": return true;
    default: return false;
  }
}

// ---------- Token Store ----------

function loadTokens() {
  // 1. Try DPAPI-hardened store first
  try {
    const hardened = retrieveSecret(DPAPI_TOKEN_KEY);
    if (hardened) return JSON.parse(hardened);
  } catch { /* fall through to plaintext */ }

  // 2. Fallback to plaintext file (migration path)
  try {
    if (!fs.existsSync(TOKEN_PATH)) return {};
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveTokens(tokens) {
  // Save to DPAPI-hardened store
  try {
    hardenSecret(DPAPI_TOKEN_KEY, JSON.stringify(tokens));
  } catch (err) {
    console.warn("[auth] DPAPI hardening failed, falling back to file:", err.message);
  }

  // Also write plaintext file for backward compat (will be removed in Phase 2 final)
  const tmp = TOKEN_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(tokens, null, 2), "utf8");
  fs.renameSync(tmp, TOKEN_PATH);
}

function generateToken(label, role = "admin") {
  if (!ROLES[role]) throw new Error(`Invalid role: ${role}. Valid roles: ${Object.keys(ROLES).join(", ")}`);
  const token = crypto.randomBytes(32).toString("hex");
  const tokens = loadTokens();
  tokens[token] = {
    label,
    role,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    useCount: 0
  };
  saveTokens(tokens);
  return { token, label, role };
}

function validateToken(token) {
  if (!token) return null;
  const tokens = loadTokens();
  const entry = tokens[token];
  if (!entry) return null;
  entry.lastUsedAt = new Date().toISOString();
  entry.useCount = (entry.useCount || 0) + 1;
  try { saveTokens(tokens); } catch {}
  return entry;
}

function listTokens() {
  const tokens = loadTokens();
  return Object.entries(tokens).map(([token, entry]) => ({
    tokenHint: token.slice(0, 8) + "..." + token.slice(-4),
    label: entry.label,
    role: entry.role,
    createdAt: entry.createdAt,
    lastUsedAt: entry.lastUsedAt,
    useCount: entry.useCount || 0
  }));
}

function revokeToken(tokenHint) {
  const tokens = loadTokens();
  const match = Object.keys(tokens).find(t =>
    t.startsWith(tokenHint) || t.endsWith(tokenHint) || (t.slice(0, 8) + "..." + t.slice(-4)) === tokenHint
  );
  if (!match) return false;
  delete tokens[match];
  saveTokens(tokens);
  return true;
}

// ---------- Middleware ----------

function isLoopback(req) {
  const ip = req.ip || req.connection?.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function gatewayAuth(options = {}) {
  const { enforceForLoopback = false } = options;

  return function authMiddleware(req, res, next) {
    // 1. Loopback bypass
    if (!enforceForLoopback && isLoopback(req)) {
      req.authSource = "loopback";
      req.authRole = "admin";
      req.authPermissions = ROLES.admin;
      return next();
    }

    // 2. Check bearer token
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (bearerToken) {
      const entry = validateToken(bearerToken);
      if (entry) {
        req.authSource = "bearer_token";
        req.authRole = entry.role;
        req.authLabel = entry.label;
        req.authPermissions = getRole(entry.role);
        return next();
      }
      return res.status(403).json({ ok: false, error: "Invalid or revoked token." });
    }

    // 3. Check mobile token (existing system — don't break it)
    // Mobile auth is handled by requireMobileAuth in server.js, so if we get
    // here without any auth, let the existing per-route middleware handle it
    // for routes that have their own auth. For unprotected routes, deny.

    // 4. Check x-asolaria-token header (bridge/MCP tokens)
    const bridgeToken = req.headers["x-asolaria-token"] || req.headers["x-asolaria-bridge-token"] || "";
    if (bridgeToken) {
      const entry = validateToken(bridgeToken);
      if (entry) {
        req.authSource = "bridge_token";
        req.authRole = entry.role;
        req.authLabel = entry.label;
        req.authPermissions = getRole(entry.role);
        return next();
      }
    }

    // 5. No auth provided — deny
    return res.status(401).json({ ok: false, error: "Authorization required." });
  };
}

// ---------- RBAC Enforcement Middleware ----------

function requireRole(minimumRole) {
  return function roleCheck(req, res, next) {
    const currentRole = getRole(req.authRole);
    const requiredRole = getRole(minimumRole);
    if (currentRole.level <= requiredRole.level) {
      return next();
    }
    return res.status(403).json({
      ok: false,
      error: `Insufficient permissions. Required: ${minimumRole}, current: ${req.authRole || "none"}`
    });
  };
}

function requirePermission(permission) {
  return function permCheck(req, res, next) {
    if (hasPermission(req.authRole, permission)) {
      return next();
    }
    return res.status(403).json({
      ok: false,
      error: `Permission '${permission}' denied for role '${req.authRole || "none"}'.`
    });
  };
}

module.exports = {
  gatewayAuth,
  generateToken,
  validateToken,
  listTokens,
  revokeToken,
  isLoopback,
  requireRole,
  requirePermission,
  hasPermission,
  getRole,
  ROLES
};
