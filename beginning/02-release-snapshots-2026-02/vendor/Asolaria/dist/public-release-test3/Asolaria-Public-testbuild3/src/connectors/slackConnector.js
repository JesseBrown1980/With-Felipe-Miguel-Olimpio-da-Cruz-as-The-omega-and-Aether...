const { getSecret, setSecret, deleteSecret } = require("../secureVault");

const SLACK_SECRET_NAME = "integrations.slack";
const SLACK_API_BASE = "https://slack.com/api";

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeToken(value) {
  const token = String(value || "").trim();
  if (!token) return "";
  if (!/^xox[baprs]-[A-Za-z0-9-]+$/.test(token)) {
    return "";
  }
  return token;
}

function normalizeChannelList(list) {
  const items = Array.isArray(list) ? list : [];
  const normalized = items
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .filter((item) => /^[a-z0-9._:-]+$/.test(item));
  return Array.from(new Set(normalized));
}

function maskToken(token) {
  const value = String(token || "");
  if (!value) return "";
  if (value.length <= 10) return "*".repeat(value.length);
  return `${value.slice(0, 6)}${"*".repeat(Math.max(4, value.length - 10))}${value.slice(-4)}`;
}

function resolveSlackToken() {
  const envToken = normalizeToken(
    process.env.ASOLARIA_SLACK_BOT_TOKEN
    || process.env.ASOLARIA_SLACK_TOKEN
    || ""
  );
  if (envToken) {
    return {
      token: envToken,
      source: "env",
      updatedAt: null
    };
  }

  const secret = getSecret(SLACK_SECRET_NAME, { namespace: "owner" });
  const vaultToken = normalizeToken(secret?.value?.botToken || secret?.value?.token || "");
  if (vaultToken) {
    return {
      token: vaultToken,
      source: "vault",
      updatedAt: secret.updatedAt || null,
      defaultChannel: String(secret.value?.defaultChannel || "").trim()
    };
  }

  return {
    token: "",
    source: "none",
    updatedAt: null,
    defaultChannel: ""
  };
}

function getSlackConfigSummary(policy = {}) {
  const resolved = resolveSlackToken();
  return {
    enabled: policy.enabled !== false,
    configured: Boolean(resolved.token),
    tokenSource: resolved.source,
    tokenHint: maskToken(resolved.token),
    defaultChannel: resolved.defaultChannel || "",
    updatedAt: resolved.updatedAt || null
  };
}

function setSlackConfig(input = {}) {
  if (input?.clear === true) {
    deleteSecret(SLACK_SECRET_NAME, { namespace: "owner" });
    return getSlackConfigSummary();
  }

  const token = normalizeToken(input.botToken || input.token);
  if (!token) {
    throw new Error("A valid Slack token is required (expected format xoxb-... or similar).");
  }

  const payload = {
    botToken: token,
    defaultChannel: String(input.defaultChannel || "").trim(),
    updatedAt: new Date().toISOString()
  };
  setSecret(SLACK_SECRET_NAME, payload, {
    app: "Asolaria",
    component: "slack-integration",
    credentialOwner: "owner",
    actor: "owner",
    updatedBy: "api"
  }, { namespace: "owner" });

  return getSlackConfigSummary();
}

async function slackApiCall(method, payload, token) {
  const response = await fetch(`${SLACK_API_BASE}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload || {})
  });

  let parsed;
  try {
    parsed = await response.json();
  } catch (_error) {
    throw new Error(`Slack API ${method} returned a non-JSON response.`);
  }

  if (!response.ok) {
    throw new Error(`Slack API ${method} HTTP ${response.status}.`);
  }
  if (!parsed || parsed.ok !== true) {
    const code = String(parsed?.error || "unknown_error");
    throw new Error(`Slack API ${method} failed: ${code}`);
  }
  return parsed;
}

function normalizeSlackChannel(entry) {
  return {
    id: String(entry?.id || ""),
    name: String(entry?.name || ""),
    isPrivate: Boolean(entry?.is_private),
    isArchived: Boolean(entry?.is_archived),
    isIm: Boolean(entry?.is_im),
    isMpim: Boolean(entry?.is_mpim),
    isChannel: Boolean(entry?.is_channel),
    isGroup: Boolean(entry?.is_group),
    members: Number.isFinite(Number(entry?.num_members)) ? Number(entry.num_members) : null
  };
}

function channelAllowedByPolicy(channel, policy = {}) {
  if (!channel || !channel.id) {
    return false;
  }
  if (!policy.allowPrivateChannels && channel.isPrivate) {
    return false;
  }
  if (!policy.allowDirectMessages && (channel.isIm || channel.isMpim)) {
    return false;
  }
  const allowed = normalizeChannelList(policy.allowedChannels || []);
  if (!allowed.length) {
    return true;
  }
  const id = String(channel.id || "").toLowerCase();
  const name = String(channel.name || "").toLowerCase();
  return allowed.includes(id) || (name && allowed.includes(name));
}

function sanitizeChannelReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("#")) {
    return raw.slice(1).trim();
  }
  return raw;
}

async function listSlackChannels(input = {}, policy = {}) {
  const resolved = resolveSlackToken();
  if (!resolved.token) {
    throw new Error("Slack integration is not configured.");
  }

  const limit = clampInt(input.limit, 60, 1, 200);
  const types = [];
  types.push("public_channel");
  if (policy.allowPrivateChannels !== false) {
    types.push("private_channel");
  }
  if (policy.allowDirectMessages) {
    types.push("im", "mpim");
  }
  const payload = {
    limit,
    cursor: String(input.cursor || "").trim() || undefined,
    exclude_archived: input.excludeArchived !== false,
    types: types.join(",")
  };

  const data = await slackApiCall("conversations.list", payload, resolved.token);
  const channels = Array.isArray(data.channels)
    ? data.channels.map(normalizeSlackChannel).filter((channel) => channelAllowedByPolicy(channel, policy))
    : [];
  return {
    channels,
    nextCursor: String(data?.response_metadata?.next_cursor || "").trim(),
    hasMore: Boolean(String(data?.response_metadata?.next_cursor || "").trim())
  };
}

async function resolveSlackChannel(input = {}, policy = {}) {
  const resolved = resolveSlackToken();
  if (!resolved.token) {
    throw new Error("Slack integration is not configured.");
  }
  const requested = sanitizeChannelReference(input.channel || resolved.defaultChannel || "");
  if (!requested) {
    throw new Error("Slack channel is required.");
  }
  const requestedLower = requested.toLowerCase();
  const isId = /^[cgd][a-z0-9]{8,}$/i.test(requested);

  let cursor = "";
  for (let page = 0; page < 25; page += 1) {
    const batch = await listSlackChannels({
      limit: 200,
      cursor,
      excludeArchived: true
    }, policy);
    const found = batch.channels.find((channel) => {
      const id = String(channel.id || "").toLowerCase();
      const name = String(channel.name || "").toLowerCase();
      if (isId) {
        return id === requestedLower;
      }
      return name === requestedLower || `#${name}` === requestedLower || id === requestedLower;
    });
    if (found) {
      return {
        token: resolved.token,
        channel: found
      };
    }
    if (!batch.hasMore || !batch.nextCursor) {
      break;
    }
    cursor = batch.nextCursor;
  }

  throw new Error(`Slack channel not found or not allowed by policy: ${requested}`);
}

function decodeSlackToken(text) {
  const raw = String(text || "");
  return raw.replace(/<([^>]+)>/g, (_match, insideRaw) => {
    const inside = String(insideRaw || "");
    const [left, label] = inside.split("|");
    if (/^https?:\/\//i.test(left)) {
      return label ? `${label} [link omitted]` : "[link omitted]";
    }
    if (left.startsWith("@")) {
      return `@${left.slice(1)}`;
    }
    if (left.startsWith("#")) {
      return label ? `#${label}` : "#channel";
    }
    if (left.startsWith("!")) {
      return "";
    }
    return label || left;
  });
}

function sanitizeSlackText(text) {
  const decoded = decodeSlackToken(text);
  return decoded
    .replace(/\bhttps?:\/\/\S+/gi, "[link omitted]")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clipText(value, limit = 900) {
  const text = String(value || "");
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit - 3))}...`;
}

function toIsoFromSlackTs(ts) {
  const num = Number(ts);
  if (!Number.isFinite(num)) {
    return "";
  }
  return new Date(Math.round(num * 1000)).toISOString();
}

async function resolveUserLabels(messages, token) {
  const ids = Array.from(new Set(
    (Array.isArray(messages) ? messages : [])
      .map((msg) => String(msg?.user || "").trim())
      .filter(Boolean)
  )).slice(0, 25);
  if (!ids.length) {
    return {};
  }

  const labels = {};
  await Promise.all(ids.map(async (id) => {
    try {
      const info = await slackApiCall("users.info", { user: id }, token);
      const profile = info?.user?.profile || {};
      const name = String(
        profile.display_name
        || profile.real_name
        || info?.user?.real_name
        || info?.user?.name
        || id
      ).trim();
      labels[id] = name || id;
    } catch (_error) {
      labels[id] = id;
    }
  }));
  return labels;
}

function normalizeSlackMessage(msg, userLabels = {}) {
  const rawText = String(msg?.text || "");
  const subtype = String(msg?.subtype || "").trim();
  const userId = String(msg?.user || "").trim();
  const author = userId
    ? (userLabels[userId] || userId)
    : String(msg?.bot_id || subtype || "system");
  let text = sanitizeSlackText(rawText);

  const fileNames = Array.isArray(msg?.files)
    ? msg.files
      .map((file) => String(file?.name || file?.title || "").trim())
      .filter(Boolean)
      .slice(0, 5)
    : [];
  if (fileNames.length) {
    text = text ? `${text}\n[files: ${fileNames.join(", ")}]` : `[files: ${fileNames.join(", ")}]`;
  }
  if (!text && subtype) {
    text = `[event:${subtype}]`;
  }

  return {
    id: String(msg?.client_msg_id || msg?.ts || ""),
    ts: String(msg?.ts || ""),
    at: toIsoFromSlackTs(msg?.ts),
    author: clipText(author, 120),
    text: clipText(text, 1800),
    subtype,
    hasLinksRedacted: /\bhttps?:\/\/|<https?:\/\//i.test(rawText)
  };
}

function buildSlackConversationDigest(messages, options = {}) {
  const maxChars = clampInt(options.maxChars, 24000, 2000, 120000);
  const lines = [];
  for (const message of Array.isArray(messages) ? messages : []) {
    const at = String(message.at || "").replace("T", " ").replace("Z", " UTC");
    const author = String(message.author || "unknown");
    const text = String(message.text || "");
    const row = `${at} | ${author}: ${text}`;
    lines.push(row);
  }
  const joined = lines.join("\n");
  if (joined.length <= maxChars) {
    return joined;
  }
  return `${joined.slice(0, maxChars - 3)}...`;
}

async function reviewSlackConversation(input = {}, policy = {}) {
  const limit = clampInt(
    input.limit,
    Math.min(50, clampInt(policy.maxMessages, 60, 5, 200)),
    1,
    clampInt(policy.maxMessages, 60, 5, 200)
  );

  const { token, channel } = await resolveSlackChannel({
    channel: input.channel
  }, policy);

  const history = await slackApiCall("conversations.history", {
    channel: channel.id,
    limit,
    inclusive: Boolean(input.inclusive),
    oldest: input.oldest ? String(input.oldest) : undefined,
    latest: input.latest ? String(input.latest) : undefined
  }, token);

  const rawMessages = Array.isArray(history.messages) ? history.messages : [];
  const userLabels = await resolveUserLabels(rawMessages, token);
  const normalized = rawMessages
    .map((msg) => normalizeSlackMessage(msg, userLabels))
    .filter((msg) => msg.text)
    .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));

  const digest = buildSlackConversationDigest(normalized, {
    maxChars: clampInt(policy.maxDigestChars, 26000, 2000, 120000)
  });

  return {
    channel,
    messageCount: normalized.length,
    hasMore: Boolean(history.has_more),
    messages: normalized,
    digest
  };
}

async function getSlackIntegrationStatus(policy = {}) {
  const summary = getSlackConfigSummary(policy);
  const status = {
    ...summary,
    policy: {
      allowPrivateChannels: policy.allowPrivateChannels !== false,
      allowDirectMessages: Boolean(policy.allowDirectMessages),
      allowedChannels: normalizeChannelList(policy.allowedChannels || []),
      maxMessages: clampInt(policy.maxMessages, 60, 5, 200),
      maxDigestChars: clampInt(policy.maxDigestChars, 26000, 2000, 120000),
      backendOnly: true,
      noLinkNavigation: true,
      linkRedaction: true
    },
    connection: {
      ok: false,
      error: summary.configured ? "not_tested" : "not_configured"
    },
    workspace: null,
    botUser: null
  };
  if (!summary.enabled || !summary.configured) {
    return status;
  }

  const resolved = resolveSlackToken();
  try {
    const auth = await slackApiCall("auth.test", {}, resolved.token);
    status.connection.ok = true;
    status.connection.error = "";
    status.workspace = {
      id: String(auth.team_id || ""),
      name: String(auth.team || "")
    };
    status.botUser = {
      id: String(auth.user_id || ""),
      name: String(auth.user || "")
    };
  } catch (error) {
    status.connection.ok = false;
    status.connection.error = String(error?.message || error || "auth_failed");
  }
  return status;
}

module.exports = {
  SLACK_SECRET_NAME,
  getSlackConfigSummary,
  setSlackConfig,
  getSlackIntegrationStatus,
  listSlackChannels,
  reviewSlackConversation,
  buildSlackConversationDigest
};
