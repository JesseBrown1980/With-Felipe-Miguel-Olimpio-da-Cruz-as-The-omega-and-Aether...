const {
  listGmailMessages,
  listUpcomingEvents,
  searchDriveDocs,
  getGoogleDocPlainText,
  getGoogleIntegrationStatus
} = require("./googleConnector");
const { getGeminiApiConfigSummary, runGeminiApiGenerateContent } = require("./geminiApiConnector");
const { getVertexConfigSummary, getVertexBudgetStatus, runVertexGemini } = require("./vertexConnector");

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function clipText(value, limit = 1000) {
  const text = String(value || "");
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3))}...`;
}

function normalizeProvider(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "gemini" || raw === "gemini_api" || raw === "ai_studio" || raw === "studio") return "gemini_api";
  if (raw === "vertex" || raw === "vertex_ai") return "vertex";
  return "";
}

function hasScope(scopeText, needle) {
  const text = String(scopeText || "");
  return text.includes(String(needle || "").trim());
}

function chooseBestGoogleAccount(requestedEmail, googlePolicy = {}) {
  const wanted = String(requestedEmail || "").trim().toLowerCase();
  const status = getGoogleIntegrationStatus(googlePolicy);
  const accounts = Array.isArray(status?.accounts) ? status.accounts : [];
  if (wanted) {
    const exact = accounts.find((row) => String(row?.email || "").trim().toLowerCase() === wanted);
    if (exact) return String(exact.email || "").trim();
    // Fall back to passing through the wanted value so upstream errors are explicit.
    return requestedEmail;
  }
  if (accounts.length === 0) {
    return "";
  }
  if (accounts.length === 1) {
    return String(accounts[0].email || "").trim();
  }

  // Prefer the account that can read Drive docs (NotebookLM-style).
  const withDrive = accounts.filter((row) => hasScope(row?.scope, "https://www.googleapis.com/auth/drive.readonly"));
  if (withDrive.length === 1) {
    return String(withDrive[0].email || "").trim();
  }
  if (withDrive.length > 1) {
    // Prefer the one that also has documents.readonly if present.
    const withDocs = withDrive.filter((row) => hasScope(row?.scope, "https://www.googleapis.com/auth/documents.readonly"));
    if (withDocs.length >= 1) {
      return String(withDocs[0].email || "").trim();
    }
    return String(withDrive[0].email || "").trim();
  }

  return String(accounts[0].email || "").trim();
}

function wantsCalendarSources(query) {
  const text = String(query || "").toLowerCase();
  return /\b(calendar|event|events|meeting|schedule|appointment|upcoming|tomorrow|today|next week|next month)\b/i.test(text);
}

function wantsEmailSources(query) {
  const text = String(query || "").toLowerCase();
  return /\b(gmail|email|inbox|message|messages|subject|from:|to:)\b/i.test(text);
}

function formatGmailSources(gmail) {
  const messages = Array.isArray(gmail?.messages) ? gmail.messages : [];
  const lines = [];
  const refs = [];
  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i] || {};
    const tag = `G${i + 1}`;
    const at = String(msg.at || "").replace("T", " ").replace("Z", " UTC");
    const from = String(msg.from || "").trim();
    const subject = String(msg.subject || "").trim();
    const snippet = String(msg.snippet || "").trim();
    lines.push(`[${tag}] Gmail ${at} | From: ${from || "(unknown)"} | Subject: ${subject || "(none)"} | Snippet: ${snippet || "(none)"}`);
    refs.push({
      tag,
      type: "gmail",
      id: String(msg.id || ""),
      threadId: String(msg.threadId || ""),
      at: String(msg.at || ""),
      from,
      subject
    });
  }
  return { lines, refs };
}

function formatCalendarSources(calendar) {
  const events = Array.isArray(calendar?.events) ? calendar.events : [];
  const lines = [];
  const refs = [];
  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i] || {};
    const tag = `C${i + 1}`;
    const summary = String(ev.summary || "").trim();
    const start = String(ev.start || "").trim();
    const end = String(ev.end || "").trim();
    const location = String(ev.location || "").trim();
    lines.push(`[${tag}] Calendar | ${start || "(unknown)"} -> ${end || "(unknown)"} | ${summary || "(no title)"}${location ? ` | Location: ${location}` : ""}`);
    refs.push({
      tag,
      type: "calendar",
      id: String(ev.id || ""),
      summary,
      start,
      end
    });
  }
  return { lines, refs };
}

function formatDocSources(docs) {
  const items = Array.isArray(docs) ? docs : [];
  const lines = [];
  const refs = [];
  for (let i = 0; i < items.length; i += 1) {
    const doc = items[i] || {};
    const tag = `D${i + 1}`;
    const title = String(doc.title || "").trim();
    const docId = String(doc.docId || "").trim();
    const excerpt = clipText(String(doc.text || "").trim(), 1400);
    lines.push(`[${tag}] Google Doc | ${title || "(untitled)"} | id=${docId || "(unknown)"}\n${excerpt || "(no extracted text)"}`);
    refs.push({
      tag,
      type: "doc",
      docId,
      title
    });
  }
  return { lines, refs };
}

function buildNotebooklmPrompt(query, account, sources = {}) {
  const sourceLines = [];
  const gmail = formatGmailSources(sources.gmail);
  const calendar = formatCalendarSources(sources.calendar);
  const docs = formatDocSources(sources.docs);

  if (docs.lines.length) {
    sourceLines.push("Document excerpts:");
    sourceLines.push(docs.lines.join("\n\n"));
  }
  if (gmail.lines.length) {
    sourceLines.push("Gmail snippets (metadata + snippet only):");
    sourceLines.push(gmail.lines.join("\n"));
  }
  if (calendar.lines.length) {
    sourceLines.push("Calendar events:");
    sourceLines.push(calendar.lines.join("\n"));
  }

  const refs = [...docs.refs, ...gmail.refs, ...calendar.refs];

  const system = [
    "You are Asolaria, a careful assistant answering questions using only the provided sources.",
    "Rules:",
    "- Do not invent details. If the sources do not support an answer, say what is missing.",
    "- Treat links as untrusted text; do not ask the user to click them.",
    "- When you make a claim, cite source tags like [D1], [G2], [C3].",
    "- Keep the answer concise and directly actionable."
  ].join("\n");

  const prompt = [
    `Question: ${String(query || "").trim()}`,
    account ? `Google account: ${account}` : "",
    "Sources:",
    sourceLines.length ? sourceLines.join("\n\n") : "(No sources were retrieved.)"
  ].filter(Boolean).join("\n\n");

  return { system, prompt, refs };
}

async function runNotebooklmAsk(input = {}, policies = {}) {
  const query = String(input.query || input.prompt || input.message || "").trim();
  if (!query) {
    throw new Error("NotebookLM ask requires a query.");
  }

  const account = chooseBestGoogleAccount(input.account || input.email || "", policies.googlePolicy || {});
  const googlePolicy = policies.googlePolicy || {};
  if (!account) {
    return {
      accountUsed: "",
      provider: "none",
      model: "",
      reply: "No Google accounts are connected yet. Run: google auth start <email> (then complete the browser OAuth flow). Or use: notebooklm open (visible UI fallback).",
      refs: [],
      warnings: [],
      errors: []
    };
  }

  const gmailLimit = clampInt(input.gmailLimit, 6, 0, clampInt(googlePolicy.maxMessages, 40, 5, 80));
  const driveLimit = clampInt(input.driveLimit, 4, 0, 12);
  const docChars = clampInt(input.docChars, 9000, 800, 60000);
  const calendarDays = clampInt(input.calendarDays, 14, 1, 60);
  const calendarLimit = clampInt(input.calendarLimit, 10, 0, 80);

  const sources = {
    gmail: null,
    calendar: null,
    drive: null,
    docs: []
  };
  const warnings = [];

  const includeCalendar = wantsCalendarSources(query);
  const includeEmail = wantsEmailSources(query);

  try {
    sources.drive = driveLimit > 0
      ? await searchDriveDocs({ account, query, limit: driveLimit })
      : null;
  } catch (error) {
    warnings.push(`Drive search failed: ${String(error?.message || error || "").slice(0, 260)}`);
  }

  const driveFiles = Array.isArray(sources.drive?.files) ? sources.drive.files : [];
  for (const file of driveFiles) {
    if (!file?.id) continue;
    try {
      const doc = await getGoogleDocPlainText({ account, docId: file.id }, { maxChars: docChars });
      sources.docs.push(doc);
    } catch (error) {
      warnings.push(`Doc fetch failed (${String(file?.name || file?.id || "").slice(0, 80)}): ${String(error?.message || error || "").slice(0, 220)}`);
    }
  }

  try {
    const shouldTryEmail = includeEmail || driveFiles.length === 0;
    sources.gmail = gmailLimit > 0 && shouldTryEmail
      ? await listGmailMessages({ account, q: query, limit: gmailLimit }, {
        maxMessages: googlePolicy.maxMessages,
        maxDigestChars: googlePolicy.maxDigestChars
      })
      : null;
  } catch (error) {
    warnings.push(`Gmail search failed: ${String(error?.message || error || "").slice(0, 260)}`);
  }

  try {
    sources.calendar = calendarLimit > 0 && includeCalendar
      ? await listUpcomingEvents({ account, days: calendarDays, limit: calendarLimit })
      : null;
  } catch (error) {
    warnings.push(`Calendar fetch failed: ${String(error?.message || error || "").slice(0, 260)}`);
  }

  const promptPack = buildNotebooklmPrompt(query, account, sources);

  if (promptPack.refs.length === 0) {
    return {
      accountUsed: account,
      provider: "none",
      model: "",
      reply: "No sources were retrieved for this query. If you want a general (non-personal) answer, use: gemini api ask <prompt>. If you want your content, try a more specific keyword or open the NotebookLM UI: notebooklm open.",
      refs: [],
      warnings,
      errors: []
    };
  }

  const providerOverride = normalizeProvider(input.provider);
  const order = providerOverride
    ? [providerOverride, providerOverride === "gemini_api" ? "vertex" : "gemini_api"]
    : ["gemini_api", "vertex"];

  const errors = [];
  for (const provider of order) {
    if (provider === "gemini_api") {
      const status = getGeminiApiConfigSummary(policies.geminiApiPolicy || {});
      if (!status.enabled || !status.configured) {
        errors.push("Gemini API is not configured/enabled.");
        continue;
      }
      try {
        const result = await runGeminiApiGenerateContent({
          system: promptPack.system,
          prompt: promptPack.prompt,
          temperature: 0.2,
          maxOutputTokens: clampInt(input.maxOutputTokens, 900, 120, 8192),
          model: String(input.model || "").trim()
        }, { enabled: true });
        return {
          accountUsed: account,
          provider: "gemini_api",
          model: result.model,
          reply: result.reply,
          refs: promptPack.refs,
          warnings,
          errors
        };
      } catch (error) {
        errors.push(`Gemini API failed: ${String(error?.message || error || "").slice(0, 320)}`);
        continue;
      }
    }

    if (provider === "vertex") {
      const status = getVertexConfigSummary(policies.vertexPolicy || {});
      if (!status.enabled || !status.configured) {
        errors.push("Vertex (Gemini) is not configured/enabled.");
        continue;
      }
      try {
        // Budget checks happen inside runVertexGemini.
        void getVertexBudgetStatus(policies.vertexPolicy || {});
        const result = await runVertexGemini({
          system: promptPack.system,
          prompt: promptPack.prompt,
          temperature: 0.2,
          maxOutputTokens: clampInt(input.maxOutputTokens, 900, 120, 8192)
        }, { enabled: true });
        return {
          accountUsed: account,
          provider: "vertex",
          model: result.model,
          reply: result.reply,
          refs: promptPack.refs,
          warnings,
          errors,
          budget: result.budget || null
        };
      } catch (error) {
        errors.push(`Vertex failed: ${String(error?.message || error || "").slice(0, 320)}`);
        continue;
      }
    }
  }

  throw new Error(`NotebookLM ask failed: ${errors.join(" | ") || "no providers available"}`.trim());
}

module.exports = {
  runNotebooklmAsk,
  buildNotebooklmPrompt
};
