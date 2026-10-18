/**
 * Request Attribution Middleware
 * Phase 2: Logs actor, source, IP, and timestamp for every API request.
 * Feeds into gateway-audit.ndjson for forensic review.
 */

const fs = require("fs");
const path = require("path");

const AUDIT_PATH = path.join(__dirname, "..", "data", "gateway-audit.ndjson");

function nowIso() {
  return new Date().toISOString();
}

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || "unknown";
}

function isLoopback(ip) {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function attributionMiddleware(options = {}) {
  const { logAllRequests = false, logMutationsOnly = true } = options;

  return function attribution(req, _res, next) {
    const ip = getClientIp(req);
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Attach attribution to request for downstream use
    req.attribution = {
      ip,
      isLoopback: isLoopback(ip),
      actor: req.authLabel || (isLoopback(ip) ? "loopback" : "external"),
      role: req.authRole || (isLoopback(ip) ? "admin" : "unknown"),
      source: req.authSource || (isLoopback(ip) ? "loopback" : "network"),
      method,
      path: url.split("?")[0],
      at: nowIso()
    };

    // Log mutations (POST/PUT/DELETE/PATCH) or all if configured
    const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
    if (logAllRequests || (logMutationsOnly && isMutation)) {
      const entry = {
        ...req.attribution,
        userAgent: (req.headers["user-agent"] || "").slice(0, 120),
        query: url.includes("?") ? url.split("?")[1]?.slice(0, 200) : undefined
      };

      try {
        fs.appendFileSync(AUDIT_PATH, JSON.stringify(entry) + "\n", "utf8");
      } catch {}
    }

    next();
  };
}

module.exports = { attributionMiddleware, getClientIp, isLoopback };
