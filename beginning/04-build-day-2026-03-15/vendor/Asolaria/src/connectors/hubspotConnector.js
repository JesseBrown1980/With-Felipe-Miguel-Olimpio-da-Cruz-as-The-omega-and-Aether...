const crypto = require("crypto");
const { getSecret, setSecret, deleteSecret } = require("../secureVault");

const HUBSPOT_OAUTH_SECRET_NAME = "integrations.hubspot.oauth";
const HUBSPOT_ACCOUNTS_SECRET_NAME = "integrations.hubspot.accounts";

const HUBSPOT_AUTH_URL = "https://mcp.hubspot.com/oauth/authorize/user";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
const HUBSPOT_API_BASE = "https://api.hubapi.com";

// Default to a read-only CRM footprint.  Adjust per your HubSpot MCP Auth App scopes.
const DEFAULT_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "crm.objects.deals.read",
  "crm.schemas.contacts.read",
  "crm.schemas.companies.read",
  "crm.schemas.deals.read"
];

const OAUTH_STATE_TTL_MS = 12 * 60 * 1000;
const HUBSPOT_NETWORK_RETRY_DELAYS_MS = [500, 1200];
const pendingOauthStates = new Map(); // state -> { createdAtMs, portalHint, scopes, codeVerifier }

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function clipText(value, limit = 900) {
  const text = String(value || "");
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3))}...`;
}

function normalizePortalId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{1,20}$/.test(raw)) return raw;
  return "";
}

function normalizeScope(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // HubSpot scopes are dotted identifiers like crm.objects.contacts.read
  if (!/^[a-z0-9][a-z0-9._-]{1,120}$/i.test(raw)) return "";
  return raw;
}

function normalizeScopeList(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const normalized = items
    .map((item) => normalizeScope(item))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function maskSecret(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 8) return "*".repeat(text.length);
  return `${text.slice(0, 4)}${"*".repeat(Math.max(4, text.length - 8))}${text.slice(-4)}`;
}

function sleep(ms) {
  const delay = Number(ms);
  return new Promise((resolve) => setTimeout(resolve, Number.isFinite(delay) && delay > 0 ? delay : 0));
}

function isRetryableNetworkError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (!message) return false;
  return (
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("network")
  );
}

async function withHubSpotNetworkRetries(label, action) {
  const runner = typeof action === "function" ? action : null;
  if (!runner) {
    throw new Error(`HubSpot network retry action is missing for ${label || "operation"}.`);
  }
  let lastError = null;
  for (let attempt = 0; attempt <= HUBSPOT_NETWORK_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await runner();
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt >= HUBSPOT_NETWORK_RETRY_DELAYS_MS.length) {
        throw error;
      }
      await sleep(HUBSPOT_NETWORK_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError || new Error(`HubSpot network action failed: ${label || "operation"}`);
}

function resolveRedirectUri() {
  const port = Number(process.env.ASOLARIA_PORT || 4781);
  return `http://127.0.0.1:${port}/api/integrations/hubspot/oauth/callback`;
}

function resolveHubSpotOAuthConfig() {
  const envClientId = String(process.env.ASOLARIA_HUBSPOT_CLIENT_ID || "").trim();
  const envClientSecret = String(process.env.ASOLARIA_HUBSPOT_CLIENT_SECRET || "").trim();
  const envScopes = normalizeScopeList(process.env.ASOLARIA_HUBSPOT_OAUTH_SCOPES || "");
  if (envClientId && envClientSecret) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      scopes: envScopes,
      source: "env",
      updatedAt: null
    };
  }

  const secret = getSecret(HUBSPOT_OAUTH_SECRET_NAME, { namespace: "owner" });
  const value = secret?.value && typeof secret.value === "object" ? secret.value : {};
  const clientId = String(value.clientId || "").trim();
  const clientSecret = String(value.clientSecret || "").trim();
  const scopes = normalizeScopeList(value.scopes || envScopes);
  return {
    clientId,
    clientSecret,
    scopes,
    source: clientId && clientSecret ? "vault" : "none",
    updatedAt: secret?.updatedAt || null
  };
}

function getHubSpotConfigSummary(policy = {}) {
  const resolved = resolveHubSpotOAuthConfig();
  const effectiveScopes = resolved.scopes && resolved.scopes.length ? resolved.scopes : DEFAULT_SCOPES;
  const connectedAccounts = listConnectedAccounts();
  return {
    enabled: policy.enabled !== false,
    configured: Boolean(resolved.clientId && resolved.clientSecret),
    clientIdHint: resolved.clientId ? maskSecret(resolved.clientId) : "",
    clientSecretHint: resolved.clientSecret ? maskSecret(resolved.clientSecret) : "",
    configSource: resolved.source,
    oauthScopes: effectiveScopes,
    redirectUri: resolveRedirectUri(),
    connectedAccounts,
    updatedAt: resolved.updatedAt || null
  };
}

function setHubSpotOAuthConfig(input = {}) {
  if (input?.clear === true) {
    deleteSecret(HUBSPOT_OAUTH_SECRET_NAME, { namespace: "owner" });
    return getHubSpotConfigSummary();
  }

  const current = resolveHubSpotOAuthConfig();
  const clientId = String(input.clientId || "").trim() || String(current.clientId || "").trim();
  const clientSecret = String(input.clientSecret || "").trim() || String(current.clientSecret || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("HubSpot clientId and clientSecret are required (missing from request and vault).");
  }

  const scopesRaw = input.scopes === undefined && input.oauthScopes === undefined
    ? current.scopes
    : (input.scopes || input.oauthScopes || []);
  const scopes = normalizeScopeList(scopesRaw || []);

  setSecret(HUBSPOT_OAUTH_SECRET_NAME, {
    clientId,
    clientSecret,
    scopes,
    updatedAt: new Date().toISOString()
  }, {
    app: "Asolaria",
    component: "hubspot-integration",
    credentialOwner: "owner",
    actor: "owner",
    updatedBy: "api"
  }, { namespace: "owner" });

  return getHubSpotConfigSummary();
}

// ── OAuth state management ──────────────────────────────────────────────

function cleanupPendingOauthStates() {
  const now = Date.now();
  for (const [key, value] of pendingOauthStates.entries()) {
    if (!value || !Number.isFinite(value.createdAtMs) || now - value.createdAtMs > OAUTH_STATE_TTL_MS) {
      pendingOauthStates.delete(key);
    }
  }
}

function generateCodeVerifier() {
  // PKCE code_verifier: 43-128 chars from unreserved charset [A-Z a-z 0-9 - . _ ~]
  return crypto.randomBytes(48).toString("base64url").slice(0, 96);
}

function generateCodeChallenge(codeVerifier) {
  // S256: BASE64URL(SHA256(code_verifier))
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

function issueOauthState(meta = {}) {
  cleanupPendingOauthStates();
  const state = crypto.randomBytes(18).toString("hex");
  const codeVerifier = generateCodeVerifier();
  pendingOauthStates.set(state, {
    createdAtMs: Date.now(),
    portalHint: normalizePortalId(meta.portalId || meta.portalHint || ""),
    scopes: Array.isArray(meta.scopes) && meta.scopes.length ? meta.scopes : DEFAULT_SCOPES,
    codeVerifier
  });
  return { state, codeVerifier };
}

function consumeOauthState(state) {
  cleanupPendingOauthStates();
  const key = String(state || "").trim();
  if (!key) {
    throw new Error("OAuth state is missing.");
  }
  const entry = pendingOauthStates.get(key);
  if (!entry) {
    throw new Error("OAuth state was not found or expired. Start auth again.");
  }
  pendingOauthStates.delete(key);
  return entry;
}

// ── OAuth flow ──────────────────────────────────────────────────────────

function startHubSpotOAuth(input = {}) {
  const resolved = resolveHubSpotOAuthConfig();
  if (!resolved.clientId || !resolved.clientSecret) {
    throw new Error("HubSpot integration is not configured yet (clientId/clientSecret missing).");
  }

  const redirectUri = resolveRedirectUri();
  const configScopes = resolved.scopes && resolved.scopes.length ? resolved.scopes : DEFAULT_SCOPES;
  const requestedScopes = normalizeScopeList(input.scopes || []);
  const scopes = requestedScopes.length ? requestedScopes : configScopes;
  const portalHint = normalizePortalId(input.portalId || input.portalHint || "");
  const { state, codeVerifier } = issueOauthState({ portalHint, scopes });
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams();
  params.set("client_id", resolved.clientId);
  params.set("redirect_uri", redirectUri);
  params.set("scope", scopes.join(" "));
  params.set("state", state);
  params.set("code_challenge", codeChallenge);
  params.set("code_challenge_method", "S256");

  return {
    state,
    redirectUri,
    scopes,
    portalHint,
    authUrl: `${HUBSPOT_AUTH_URL}?${params.toString()}`
  };
}

async function hubspotTokenRequest(payload) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload || {})) {
    if (value === undefined || value === null || value === "") continue;
    body.set(key, String(value));
  }
  const response = await withHubSpotNetworkRetries("hubspot-token-request", () => fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  }));

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_error) {
    parsed = null;
  }

  if (!response.ok) {
    const msg = String(parsed?.message || parsed?.error_description || parsed?.error || `HTTP ${response.status}` || "token_request_failed");
    throw new Error(`HubSpot token request failed: ${msg}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("HubSpot token request returned invalid JSON.");
  }
  return parsed;
}

async function hubspotApiGetJson(url, accessToken) {
  const response = await withHubSpotNetworkRetries("hubspot-api-get-json", () => fetch(String(url), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  }));
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_error) {
    parsed = null;
  }

  if (!response.ok) {
    const msg = String(parsed?.message || parsed?.error_description || parsed?.error || `HTTP ${response.status}`);
    throw new Error(msg);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("HubSpot API returned invalid JSON.");
  }
  return parsed;
}

// ── Account / token storage ─────────────────────────────────────────────

function loadAccountsDoc() {
  const secret = getSecret(HUBSPOT_ACCOUNTS_SECRET_NAME, { namespace: "owner" });
  const value = secret?.value && typeof secret.value === "object" ? secret.value : {};
  const accounts = value.accounts && typeof value.accounts === "object" ? value.accounts : {};
  return {
    updatedAt: secret?.updatedAt || null,
    accounts: { ...accounts }
  };
}

function saveAccountsDoc(doc, meta) {
  const payload = {
    accounts: doc.accounts || {},
    updatedAt: new Date().toISOString()
  };
  setSecret(HUBSPOT_ACCOUNTS_SECRET_NAME, payload, meta || {
    app: "Asolaria",
    component: "hubspot-integration",
    credentialOwner: "owner",
    actor: "owner",
    updatedBy: "api"
  }, { namespace: "owner" });
}

function listConnectedAccounts() {
  const doc = loadAccountsDoc();
  const accounts = doc.accounts && typeof doc.accounts === "object" ? doc.accounts : {};
  const rows = Object.entries(accounts).map(([portalId, record]) => {
    const safe = record && typeof record === "object" ? record : {};
    const expiresAtMs = Number(safe.expiry_date_ms || 0);
    return {
      portalId: String(portalId),
      hubId: String(safe.hub_id || portalId),
      user: String(safe.user || "").trim(),
      hasRefreshToken: Boolean(String(safe.refresh_token || "").trim()),
      expiresAt: expiresAtMs > 0 ? new Date(expiresAtMs).toISOString() : null,
      expiresInSec: expiresAtMs > 0 ? Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)) : null,
      updatedAt: String(safe.updatedAt || safe.createdAt || "").trim() || null
    };
  });
  rows.sort((a, b) => String(a.portalId).localeCompare(String(b.portalId)));
  return rows;
}

function upsertAccountTokens(portalId, tokenResponse, meta) {
  const resolvedPortal = String(portalId || "").trim();
  if (!resolvedPortal) {
    throw new Error("HubSpot portal ID could not be resolved.");
  }
  const doc = loadAccountsDoc();
  const existing = doc.accounts[resolvedPortal] && typeof doc.accounts[resolvedPortal] === "object"
    ? doc.accounts[resolvedPortal]
    : {};
  const now = Date.now();
  const expiresIn = Number(tokenResponse?.expires_in || 0);
  const expiryDateMs = expiresIn > 0 ? now + expiresIn * 1000 : Number(existing.expiry_date_ms || 0);
  const refresh = String(tokenResponse?.refresh_token || "").trim();
  const record = {
    access_token: String(tokenResponse?.access_token || existing.access_token || "").trim(),
    refresh_token: refresh || String(existing.refresh_token || "").trim(),
    hub_id: String(tokenResponse?.hub_id || existing.hub_id || portalId).trim(),
    user: String(tokenResponse?.user || existing.user || "").trim(),
    hub_domain: String(tokenResponse?.hub_domain || existing.hub_domain || "").trim(),
    token_type: String(tokenResponse?.token_type || existing.token_type || "").trim() || "Bearer",
    expiry_date_ms: Number.isFinite(expiryDateMs) ? Math.max(0, Math.round(expiryDateMs)) : 0,
    createdAt: String(existing.createdAt || new Date().toISOString()),
    updatedAt: new Date().toISOString()
  };
  doc.accounts[resolvedPortal] = record;
  saveAccountsDoc(doc, meta);
  return record;
}

function resolvePortalId(requestedPortal) {
  const wanted = String(requestedPortal || "").trim();
  const doc = loadAccountsDoc();
  const available = Object.keys(doc.accounts || {}).filter(Boolean);
  if (wanted) {
    if (!doc.accounts[wanted]) {
      throw new Error(`HubSpot portal is not connected: ${wanted}`);
    }
    return wanted;
  }
  if (available.length === 1) {
    return available[0];
  }
  if (available.length === 0) {
    throw new Error("No HubSpot accounts are connected yet.");
  }
  throw new Error(`Multiple HubSpot portals are connected (${available.join(", ")}). Specify portalId.`);
}

async function ensureAccessToken(portalId) {
  const resolvedPortal = resolvePortalId(portalId);
  const oauth = resolveHubSpotOAuthConfig();
  if (!oauth.clientId || !oauth.clientSecret) {
    throw new Error("HubSpot integration is not configured yet (clientId/clientSecret missing).");
  }

  const doc = loadAccountsDoc();
  const record = doc.accounts[resolvedPortal];
  if (!record || typeof record !== "object") {
    throw new Error(`HubSpot portal is not connected: ${resolvedPortal}`);
  }
  const now = Date.now();
  const expiry = Number(record.expiry_date_ms || 0);
  const accessToken = String(record.access_token || "").trim();
  if (accessToken && expiry > now + 2 * 60 * 1000) {
    return { portalId: resolvedPortal, accessToken };
  }

  const refreshToken = String(record.refresh_token || "").trim();
  if (!refreshToken) {
    throw new Error(`HubSpot refresh token missing for portal ${resolvedPortal}. Reconnect the account.`);
  }

  const refreshed = await hubspotTokenRequest({
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  upsertAccountTokens(resolvedPortal, refreshed, {
    app: "Asolaria",
    component: "hubspot-integration",
    credentialOwner: "owner",
    actor: "owner",
    updatedBy: "token-refresh"
  });

  const nextAccess = String(refreshed.access_token || "").trim();
  if (!nextAccess) {
    throw new Error("HubSpot refresh did not return an access_token.");
  }
  return { portalId: resolvedPortal, accessToken: nextAccess };
}

// ── OAuth callback ──────────────────────────────────────────────────────

async function completeHubSpotOAuthCallback(input = {}) {
  const code = String(input.code || "").trim();
  const state = String(input.state || "").trim();
  if (!code) {
    throw new Error("OAuth callback missing code.");
  }
  if (!state) {
    throw new Error("OAuth callback missing state.");
  }
  const entry = consumeOauthState(state);
  const oauth = resolveHubSpotOAuthConfig();
  if (!oauth.clientId || !oauth.clientSecret) {
    throw new Error("HubSpot integration is not configured yet (clientId/clientSecret missing).");
  }

  const codeVerifier = entry.codeVerifier || "";
  if (!codeVerifier) {
    throw new Error("PKCE code_verifier is missing from OAuth state. Start auth again.");
  }

  const redirectUri = resolveRedirectUri();
  let tokenResponse = null;
  try {
    tokenResponse = await hubspotTokenRequest({
      code,
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`HubSpot OAuth code exchange failed: ${message}`);
  }

  const accessToken = String(tokenResponse.access_token || "").trim();
  if (!accessToken) {
    throw new Error("HubSpot OAuth did not return an access_token.");
  }

  // Fetch token info to identify the portal
  let tokenInfo = null;
  try {
    tokenInfo = await hubspotApiGetJson(
      `${HUBSPOT_API_BASE}/oauth/v1/access-tokens/${accessToken}`,
      accessToken
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`HubSpot token info lookup after OAuth failed: ${message}`);
  }

  const portalId = String(tokenInfo?.hub_id || tokenResponse?.hub_id || entry.portalHint || "").trim();
  if (!portalId) {
    throw new Error("Could not determine HubSpot portal ID after OAuth.");
  }

  const record = upsertAccountTokens(portalId, {
    ...tokenResponse,
    hub_id: tokenInfo?.hub_id || tokenResponse?.hub_id || portalId,
    user: tokenInfo?.user || tokenResponse?.user || "",
    hub_domain: tokenInfo?.hub_domain || tokenResponse?.hub_domain || ""
  }, {
    app: "Asolaria",
    component: "hubspot-integration",
    credentialOwner: "owner",
    actor: "owner",
    updatedBy: "oauth-callback"
  });

  return {
    portalId,
    hubId: String(record.hub_id || portalId),
    user: String(record.user || "").trim(),
    hubDomain: String(record.hub_domain || "").trim(),
    tokenType: String(record.token_type || "").trim(),
    expiresAt: record.expiry_date_ms ? new Date(Number(record.expiry_date_ms)).toISOString() : null,
    hasRefreshToken: Boolean(String(record.refresh_token || "").trim())
  };
}

// ── CRM API helpers ─────────────────────────────────────────────────────

async function listContacts(input = {}, policy = {}) {
  const limit = clampInt(input.limit, 10, 1, clampInt(policy.maxResults, 100, 5, 200));
  const portal = resolvePortalId(input.portalId || "");
  const { accessToken } = await ensureAccessToken(portal);

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (input.after) {
    params.set("after", String(input.after));
  }
  const properties = Array.isArray(input.properties) && input.properties.length
    ? input.properties
    : ["firstname", "lastname", "email", "company", "phone"];
  params.set("properties", properties.join(","));

  const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?${params.toString()}`;
  const data = await hubspotApiGetJson(url, accessToken);
  return {
    portalId: portal,
    results: Array.isArray(data.results) ? data.results : [],
    paging: data.paging || null,
    total: data.total ?? null
  };
}

async function listCompanies(input = {}, policy = {}) {
  const limit = clampInt(input.limit, 10, 1, clampInt(policy.maxResults, 100, 5, 200));
  const portal = resolvePortalId(input.portalId || "");
  const { accessToken } = await ensureAccessToken(portal);

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (input.after) {
    params.set("after", String(input.after));
  }
  const properties = Array.isArray(input.properties) && input.properties.length
    ? input.properties
    : ["name", "domain", "industry", "city", "state"];
  params.set("properties", properties.join(","));

  const url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies?${params.toString()}`;
  const data = await hubspotApiGetJson(url, accessToken);
  return {
    portalId: portal,
    results: Array.isArray(data.results) ? data.results : [],
    paging: data.paging || null,
    total: data.total ?? null
  };
}

async function listDeals(input = {}, policy = {}) {
  const limit = clampInt(input.limit, 10, 1, clampInt(policy.maxResults, 100, 5, 200));
  const portal = resolvePortalId(input.portalId || "");
  const { accessToken } = await ensureAccessToken(portal);

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (input.after) {
    params.set("after", String(input.after));
  }
  const properties = Array.isArray(input.properties) && input.properties.length
    ? input.properties
    : ["dealname", "amount", "dealstage", "pipeline", "closedate"];
  params.set("properties", properties.join(","));

  const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals?${params.toString()}`;
  const data = await hubspotApiGetJson(url, accessToken);
  return {
    portalId: portal,
    results: Array.isArray(data.results) ? data.results : [],
    paging: data.paging || null,
    total: data.total ?? null
  };
}

async function hubspotApiRequest(input = {}, policy = {}) {
  const portal = resolvePortalId(input.portalId || input.account || "");
  const method = String(input.method || "GET").trim().toUpperCase() || "GET";
  const rawUrl = String(input.url || "").trim();
  if (!rawUrl) {
    throw new Error("HubSpot API request url is required.");
  }

  let parsedUrl = null;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_error) {
    parsedUrl = null;
  }
  if (!parsedUrl) {
    throw new Error("HubSpot API request url is not valid.");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("HubSpot API requests must use https.");
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("HubSpot API request url must not include credentials.");
  }
  const allowed = parsedUrl.hostname === "api.hubapi.com" || parsedUrl.hostname.endsWith(".hubapi.com");
  if (!allowed) {
    throw new Error("HubSpot API request host is not allowed (only *.hubapi.com).");
  }

  const { accessToken } = await ensureAccessToken(portal);

  let requestBody = null;
  if (input.body && typeof input.body === "object") {
    requestBody = JSON.stringify(input.body);
  } else if (input.body && typeof input.body === "string") {
    requestBody = input.body;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json"
  };
  if (requestBody) {
    headers["Content-Type"] = "application/json; charset=utf-8";
  }

  const response = await fetch(parsedUrl.toString(), {
    method,
    headers,
    body: requestBody || undefined
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_error) {
    parsed = null;
  }

  if (!response.ok) {
    const msg = String(parsed?.message || parsed?.error_description || parsed?.error || clipText(text, 600) || `HTTP ${response.status}`);
    throw new Error(msg);
  }

  return {
    portalId: portal,
    method,
    url: parsedUrl.toString(),
    status: response.status,
    data: parsed !== null ? parsed : text
  };
}

// ── Status ──────────────────────────────────────────────────────────────

function getHubSpotIntegrationStatus(policy = {}) {
  const summary = getHubSpotConfigSummary(policy);
  const connected = listConnectedAccounts();
  return {
    ...summary,
    policy: {
      backendOnly: true,
      noLinkNavigation: true
    },
    accounts: connected,
    oauth: {
      pendingStates: pendingOauthStates.size,
      stateTtlMs: OAUTH_STATE_TTL_MS
    }
  };
}

function manifest() {
  return {
    id: "hubspot",
    version: "1.0.0",
    description: "HubSpot CRM integration — OAuth PKCE flow, token management, contacts/companies/deals listing, generic API passthrough with network retry",
    capabilities: ["oauth_flow", "token_refresh", "list_contacts", "list_companies", "list_deals", "api_request", "multi_portal"],
    readScopes: ["crm.objects.contacts.read", "crm.objects.companies.read", "crm.objects.deals.read"],
    writeScopes: ["hubspot_oauth_config", "hubspot_account_tokens"],
    approvalRequired: false,
    healthCheck: false,
    retrySemantics: "network_retry_with_backoff",
    timeoutMs: 30000,
    secretRequirements: ["integrations.hubspot.oauth (clientId, clientSecret)", "integrations.hubspot.accounts (per-portal tokens)"],
    sideEffects: ["exchanges OAuth codes with HubSpot", "stores/refreshes tokens in vault", "makes API calls to api.hubapi.com"],
    failureModes: ["oauth_state_expired", "token_request_failed", "token_refresh_failed", "portal_not_connected", "api_request_failed"],
    emittedEvents: ["hubspot.oauth_started", "hubspot.oauth_completed", "hubspot.token_refreshed", "hubspot.api_request"]
  };
}

module.exports = {
  HUBSPOT_OAUTH_SECRET_NAME,
  HUBSPOT_ACCOUNTS_SECRET_NAME,
  DEFAULT_SCOPES,
  ensureAccessToken,
  getHubSpotConfigSummary,
  setHubSpotOAuthConfig,
  startHubSpotOAuth,
  completeHubSpotOAuthCallback,
  listContacts,
  listCompanies,
  listDeals,
  hubspotApiRequest,
  getHubSpotIntegrationStatus,
  manifest
};
