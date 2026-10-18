/**
 * Work Context & Policy helpers — extracted from server.js (ADR-0001 Phase 3)
 *
 * Pure policy functions that evaluate work organization context,
 * URL policies, and VPN gate enforcement. Stateful dependencies
 * (settings, workOrgPolicy, workLinkPolicy, routing) are passed
 * via the init() call.
 */

const { normalizeChannels } = require("../src/connectionPolicy");

let _ctx = null;

function init(ctx) {
  _ctx = ctx;
}

function combinePolicyWarnings(...messages) {
  return messages.map((item) => String(item || "").trim()).filter(Boolean).join("\n");
}

function resolveWorkContextFromRequest(req = {}) {
  const raw = String(
    req.body?.organization || req.body?.org
    || req.query?.organization || req.query?.org
    || req.headers?.["x-asolaria-org"] || ""
  ).trim();
  const resolved = _ctx.resolveWorkOrgContext(raw, true);
  return {
    organization: resolved.key,
    organizationLabel: String(resolved.profile?.label || resolved.key || ""),
    organizationSource: resolved.source,
    organizationProvided: Boolean(raw),
    profile: resolved.profile || null
  };
}

function normalizeUrlForPolicy(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  try { return new URL(value).toString(); }
  catch (_) {
    try { return new URL(`https://${value}`).toString(); }
    catch (_2) { return ""; }
  }
}

function hostMatchesDomain(hostname, domain) {
  const host = String(hostname || "").trim().toLowerCase();
  const suffix = String(domain || "").trim().toLowerCase();
  if (!host || !suffix) return false;
  return host === suffix || host.endsWith(`.${suffix}`);
}

function findDomainInList(url, domains = []) {
  const normalized = normalizeUrlForPolicy(url);
  if (!normalized) return "";
  let host = "";
  try { host = String(new URL(normalized).hostname || "").toLowerCase(); }
  catch (_) { return ""; }
  for (const domain of Array.isArray(domains) ? domains : []) {
    if (hostMatchesDomain(host, domain)) return domain;
  }
  return "";
}

function enforceRestrictedOrgVpnGate(contextLabel = "browser action", organization = "") {
  if (!_ctx.workOrgPolicy.enabled) {
    return { allowed: true, warning: "", restricted: false, organization: "", organizationLabel: "" };
  }
  const resolved = _ctx.resolveWorkOrgContext(organization || "", true);
  const orgKey = _ctx.normalizeWorkOrgKey(resolved.key || "");
  const orgLabel = String(resolved.profile?.label || resolved.key || orgKey || "");
  if (!orgKey || !_ctx.hardRestrictedWorkOrgVpnRequired.has(orgKey)) {
    return { allowed: true, warning: "", restricted: false, organization: resolved.key || "", organizationLabel: orgLabel };
  }
  const routing = _ctx.getConnectionRoutingState();
  const selectedChannel = String(routing?.selected?.channel || "none");
  const detectedChannels = normalizeChannels(routing?.detectedAvailable || []);
  const vpnLocationHint = String(resolved.profile?.teams?.vpnLocationHint || _ctx.configuredWorkOrgVpnLocationHint || "charleston_sc_us").trim();
  if (selectedChannel === "vpn" && detectedChannels.includes("vpn")) {
    return { allowed: true, warning: "", restricted: true, organization: resolved.key || "", organizationLabel: orgLabel, selectedChannel, detectedChannels, vpnLocationHint };
  }
  const message = [
    `Restricted work-organization policy blocked ${contextLabel} for "${orgLabel || orgKey}".`,
    "This organization requires ExpressVPN connected to Charleston, SC (USA) before browser access.",
    `Current channel: ${selectedChannel}.`,
    `Detected channels: ${detectedChannels.length ? detectedChannels.join(", ") : "none"}.`,
    `Expected VPN location: ${vpnLocationHint}.`,
    "Connect VPN, refresh heartbeat, and retry."
  ].join(" ");
  if (_ctx.workOrgHardVpnWarnOnly) {
    return { allowed: true, warning: message, restricted: true, organization: resolved.key || "", organizationLabel: orgLabel, selectedChannel, detectedChannels, vpnLocationHint };
  }
  throw new Error(message);
}

function enforceWorkLinkPolicyForUrl(rawUrl, contextLabel = "navigation", context = {}) {
  if (!_ctx.workLinkPolicy.enabled) return { allowed: true, warning: "" };
  const matchedDomain = findDomainInList(rawUrl, _ctx.workLinkPolicy.sensitiveDomains || []);
  if (!matchedDomain) return { allowed: true, warning: "" };
  const org = _ctx.resolveWorkOrgContext(context.organization || "", true);
  const orgProfile = org.profile || null;
  if (_ctx.workOrgPolicy.enabled && orgProfile?.teams?.enabled === false) {
    const msg = `Work-link policy blocked ${contextLabel} for sensitive domain "${matchedDomain}". Organization "${orgProfile.label || org.key}" is configured for Slack-only access.`;
    if (_ctx.workLinkPolicy.warnOnly) return { allowed: true, warning: msg, sensitiveDomain: matchedDomain, organization: org.key, organizationLabel: orgProfile.label || org.key };
    throw new Error(msg);
  }
  // VPN requirement check delegated to caller or inline expansion when needed
  return { allowed: true, warning: "", sensitiveDomain: matchedDomain };
}

module.exports = {
  init,
  combinePolicyWarnings,
  resolveWorkContextFromRequest,
  normalizeUrlForPolicy,
  hostMatchesDomain,
  findDomainInList,
  enforceRestrictedOrgVpnGate,
  enforceWorkLinkPolicyForUrl
};
