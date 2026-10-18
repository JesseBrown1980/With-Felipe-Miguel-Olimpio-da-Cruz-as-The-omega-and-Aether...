const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { resolveDataPath, resolveLogPath } = require("./runtimePaths");
const {
  bootstrapGuardianProfile,
  revealGuardianProfile,
  readGuardianSmtpConfig,
  readGuardianWhatsAppConfig
} = require("./guardianStore");

const alertsPath = resolveDataPath("guardian-alerts.json");
const alertsLogPath = resolveLogPath("guardian-alerts.log");

function ensureDirs() {
  fs.mkdirSync(path.dirname(alertsPath), { recursive: true });
  fs.mkdirSync(path.dirname(alertsLogPath), { recursive: true });
}

function loadAlerts() {
  ensureDirs();
  if (!fs.existsSync(alertsPath)) {
    const initial = {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      alerts: []
    };
    fs.writeFileSync(alertsPath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(alertsPath, "utf8"));
    if (!parsed || !Array.isArray(parsed.alerts)) {
      throw new Error("Invalid guardian alerts file.");
    }
    return parsed;
  } catch (_error) {
    const fallback = {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      alerts: []
    };
    fs.writeFileSync(alertsPath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function saveAlerts(doc) {
  ensureDirs();
  doc.updatedAt = new Date().toISOString();
  if (doc.alerts.length > 400) {
    doc.alerts = doc.alerts.slice(-400);
  }
  fs.writeFileSync(alertsPath, JSON.stringify(doc, null, 2), "utf8");
}

function appendLogLine(line) {
  ensureDirs();
  fs.appendFileSync(alertsLogPath, `${line}\n`, "utf8");
}

function listGuardianAlerts(limit = 30) {
  const doc = loadAlerts();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 30));
  return doc.alerts.slice(-safeLimit).reverse();
}

function getGuardianAlertStats() {
  const alerts = loadAlerts().alerts;
  const byLevel = { low: 0, medium: 0, high: 0, critical: 0 };
  let delivered = 0;
  for (const alert of alerts) {
    const level = String(alert.risk?.level || "low");
    if (Object.prototype.hasOwnProperty.call(byLevel, level)) {
      byLevel[level] += 1;
    }
    const items = Array.isArray(alert.delivery) ? alert.delivery : [];
    delivered += items.filter((item) => item.ok).length;
  }
  return {
    total: alerts.length,
    delivered,
    byLevel
  };
}

function escapePs(value) {
  return String(value || "").replace(/'/g, "''");
}

function runPowerShellScript(script, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "-"], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("PowerShell mail command timed out."));
    }, Math.max(12000, timeoutMs));

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start PowerShell: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`PowerShell exited ${code}: ${(stderr || stdout).trim()}`));
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}

async function sendEmailViaSmtp(smtp, toEmail, subject, body) {
  if (process.platform !== "win32") {
    throw new Error("SMTP mail sender currently implemented for Windows PowerShell only.");
  }

  const secureFlag = smtp.secure ? "$true" : "$false";
  const hasCreds = smtp.username && smtp.password;
  const scriptLines = [];
  scriptLines.push(`$to='${escapePs(toEmail)}'`);
  scriptLines.push(`$from='${escapePs(smtp.fromEmail)}'`);
  scriptLines.push(`$subject='${escapePs(subject)}'`);
  scriptLines.push(`$body='${escapePs(body)}'`);
  scriptLines.push(`$host='${escapePs(smtp.host)}'`);
  scriptLines.push(`$port=${Number(smtp.port || 587)}`);
  scriptLines.push(`$useSsl=${secureFlag}`);
  if (hasCreds) {
    scriptLines.push(`$user='${escapePs(smtp.username)}'`);
    scriptLines.push(`$pass='${escapePs(smtp.password)}'`);
    scriptLines.push("$sec=ConvertTo-SecureString $pass -AsPlainText -Force");
    scriptLines.push("$cred=New-Object System.Management.Automation.PSCredential($user,$sec)");
    scriptLines.push("Send-MailMessage -To $to -From $from -Subject $subject -Body $body -SmtpServer $host -Port $port -UseSsl:$useSsl -Credential $cred -Encoding UTF8");
  } else {
    scriptLines.push("Send-MailMessage -To $to -From $from -Subject $subject -Body $body -SmtpServer $host -Port $port -UseSsl:$useSsl -Encoding UTF8");
  }

  await runPowerShellScript(scriptLines.join("\n"), 35000);
}

async function sendWebhookAlert(event) {
  const url = String(process.env.ASOLARIA_ALERT_WEBHOOK_URL || "").trim();
  if (!url) {
    return { ok: false, method: "webhook", reason: "webhook_not_configured" };
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
    if (!response.ok) {
      return { ok: false, method: "webhook", reason: `http_${response.status}` };
    }
    return { ok: true, method: "webhook" };
  } catch (error) {
    return { ok: false, method: "webhook", reason: error.message };
  }
}

function shouldSendCodexBridgeAlert(event) {
  const mode = String(process.env.ASOLARIA_CODEX_BRIDGE_NOTIFY_MODE || "critical_or_security").trim().toLowerCase();
  const level = String(event?.risk?.level || "low").toLowerCase();
  const security = isSecurityEmergency(event);

  if (mode === "all_alerts" || mode === "all") {
    return true;
  }
  if (mode === "security_only") {
    return security;
  }
  if (mode === "important") {
    return security || level === "critical" || level === "high" || Boolean(event?.blocked);
  }

  // Default: low-noise.
  return security || level === "critical";
}

function clipPreview(text, limit = 220) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 3))}...`;
}

async function sendCodexBridgeAlert(event, options = {}) {
  const url = String(process.env.ASOLARIA_CODEX_BRIDGE_URL || "").trim();
  if (!url) {
    return { ok: false, method: "codex-bridge", reason: "codex_bridge_not_configured" };
  }
  if (!shouldSendCodexBridgeAlert(event)) {
    return { ok: false, method: "codex-bridge", reason: "not_eligible" };
  }

  const token = String(process.env.ASOLARIA_CODEX_BRIDGE_TOKEN || "").trim();
  const room = String(process.env.ASOLARIA_CODEX_BRIDGE_ROOM || "asolaria_bridge").trim() || "asolaria_bridge";
  const from = String(process.env.ASOLARIA_CODEX_BRIDGE_FROM || "Asolaria").trim() || "Asolaria";
  const to = String(process.env.ASOLARIA_CODEX_BRIDGE_TO || "this-codex").trim() || "this-codex";
  const thread = String(options.thread || "").trim() || `asolaria-alert-${Date.now()}`;

  const level = String(event?.risk?.level || "unknown").toUpperCase();
  const action = String(event?.routeAction || "none");
  const preview = clipPreview(event?.messagePreview || "");
  const blocked = Boolean(event?.blocked) ? "yes" : "no";
  const text = `@${to} #thread:${thread} ALERT: level=${level} action=${action} blocked=${blocked} preview=${preview || "(none)"}`;

  try {
    const base = new URL(url);
    const endpoint = new URL(`/rooms/${encodeURIComponent(room)}/messages`, base);
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({ from, text })
    });
    if (!response.ok) {
      return { ok: false, method: "codex-bridge", reason: `http_${response.status}` };
    }
    return { ok: true, method: "codex-bridge", room };
  } catch (error) {
    return { ok: false, method: "codex-bridge", reason: error.message };
  }
}

function shouldSendIztEmergency(event) {
  const level = String(event?.risk?.level || "low").toLowerCase();
  return isSecurityEmergency(event) || level === "critical";
}

async function sendIztEmergencyRelay(event) {
  const url = String(process.env.ASOLARIA_IZT_RELAY_URL || "").trim();
  if (!url) {
    return { ok: false, method: "izt-relay", reason: "izt_relay_not_configured" };
  }
  if (!shouldSendIztEmergency(event)) {
    return { ok: false, method: "izt-relay", reason: "not_emergency_event" };
  }

  const payload = {
    type: "asolaria-emergency-relay",
    at: new Date().toISOString(),
    routeAction: event.routeAction || "none",
    messagePreview: event.messagePreview || "",
    risk: event.risk || {},
    blocked: Boolean(event.blocked),
    decisionText: event.decisionText || "",
    approvalRequest: event.approvalRequest || null,
    ownerPhone: String(process.env.ASOLARIA_OWNER_PHONE || "").trim(),
    channels: {
      sms: true,
      voice: true
    },
    voice: {
      tone: String(process.env.ASOLARIA_VOICE_STYLE || "warm_feminine").trim()
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      return { ok: false, method: "izt-relay", reason: `http_${response.status}` };
    }
    return { ok: true, method: "izt-relay" };
  } catch (error) {
    return { ok: false, method: "izt-relay", reason: error.message };
  }
}

function buildSubject(event) {
  const level = String(event.risk?.level || "unknown").toUpperCase();
  const action = String(event.routeAction || "general");
  return `[Asolaria Alert][${level}] ${action}`;
}

function buildBody(event, ownerName) {
  const approvalBlock = event.approvalRequest
    ? [
      "",
      "Pending approval:",
      `ID: ${event.approvalRequest.id}`,
      `Expires: ${event.approvalRequest.expiresAt || "unknown"}`,
      event.approvalRequest.url ? `Review URL: ${event.approvalRequest.url}` : "",
      "To approve: APPROVE <id>",
      "To deny: DENY <id>"
    ].filter(Boolean)
    : [];
  return [
    `Owner: ${ownerName || "unknown"}`,
    `Timestamp: ${event.at || new Date().toISOString()}`,
    `Risk level: ${event.risk?.level || "unknown"} (score ${event.risk?.score ?? "n/a"})`,
    `Route action: ${event.routeAction || "none"}`,
    `Blocked: ${event.blocked ? "yes" : "no"}`,
    "",
    "Reasons:",
    ...(Array.isArray(event.risk?.reasons) && event.risk.reasons.length ? event.risk.reasons.map((value) => `- ${value}`) : ["- (none)"]),
    "",
    "Message preview:",
    event.messagePreview || "(empty)",
    "",
    "Decision:",
    event.decisionText || "(no autonomous decision text)",
    ...approvalBlock
  ].join("\n");
}

function normalizeContactRoute(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "security_emergency" || normalized === "security" || normalized === "emergency") {
    return "security_emergency";
  }
  if (normalized === "silent" || normalized === "disabled" || normalized === "none") {
    return "silent";
  }
  return "primary";
}

function isSecurityEmergency(event) {
  if (Boolean(event?.risk?.securityIncident)) {
    return true;
  }
  const reasons = Array.isArray(event?.risk?.reasons) ? event.risk.reasons.join(" ").toLowerCase() : "";
  const messagePreview = String(event?.messagePreview || "").toLowerCase();
  const routeAction = String(event?.routeAction || "").toLowerCase();
  const text = `${reasons} ${messagePreview} ${routeAction}`;
  return /\b(hack|breach|intrusion|malware|ransomware|phishing|unauthorized|compromis|exfiltration|credential stuffing|attack)\b/i.test(text);
}

function shouldNotifyEmailContact(contact, event) {
  const route = normalizeContactRoute(contact?.route);
  if (route === "silent") {
    return false;
  }
  if (route === "security_emergency") {
    return isSecurityEmergency(event);
  }
  return true;
}

function shouldSendWhatsAppAlert(config, event) {
  if (!config || !config.enabled) {
    return false;
  }
  const mode = String(config.notifyMode || "critical_or_security").trim().toLowerCase();
  const level = String(event?.risk?.level || "low").toLowerCase();
  const security = isSecurityEmergency(event);
  if (mode === "all_alerts") {
    return true;
  }
  if (mode === "security_only") {
    return security;
  }
  return security || level === "critical";
}

async function sendWhatsAppViaTwilio(config, body) {
  const accountSid = String(config?.accountSid || "").trim();
  const authToken = String(config?.authToken || "").trim();
  const from = String(config?.fromNumber || "").trim();
  const to = String(config?.toNumber || "").trim();

  if (!accountSid || !authToken || !from || !to) {
    return { ok: false, method: "twilio-whatsapp", reason: "whatsapp_not_configured" };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const payload = new URLSearchParams({
    From: from,
    To: to,
    Body: body
  });
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload
    });
    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        method: "twilio-whatsapp",
        reason: `http_${response.status}`,
        details: text.slice(0, 280)
      };
    }
    return {
      ok: true,
      method: "twilio-whatsapp",
      to
    };
  } catch (error) {
    return {
      ok: false,
      method: "twilio-whatsapp",
      reason: error.message
    };
  }
}

async function notifyGuardianContacts(event) {
  bootstrapGuardianProfile({});
  const profile = revealGuardianProfile() || {};
  const contacts = Array.isArray(profile.contacts) ? profile.contacts.filter((contact) => contact.enabled && contact.email) : [];
  const emailTargets = contacts
    .filter((contact) => shouldNotifyEmailContact(contact, event))
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
  const smtp = readGuardianSmtpConfig({ reveal: true });
  const whatsapp = readGuardianWhatsAppConfig({ reveal: true });
  const ownerName = profile.ownerName || "Owner";

  const delivery = [];
  const subject = buildSubject(event);
  const body = buildBody(event, ownerName);
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (smtp && smtp.host && smtp.fromEmail && emailTargets.length > 0) {
    for (const contact of emailTargets) {
      try {
        await sendEmailViaSmtp(smtp, contact.email, subject, body);
        delivery.push({
          ok: true,
          method: "smtp-email",
          to: contact.email,
          route: normalizeContactRoute(contact.route),
          at: new Date().toISOString()
        });
      } catch (error) {
        delivery.push({
          ok: false,
          method: "smtp-email",
          to: contact.email,
          route: normalizeContactRoute(contact.route),
          reason: error.message,
          at: new Date().toISOString()
        });
      }
    }
  } else if (emailTargets.length === 0) {
    delivery.push({
      ok: false,
      method: "smtp-email",
      reason: "no_eligible_email_contacts_for_event",
      at: new Date().toISOString()
    });
  } else {
    delivery.push({
      ok: false,
      method: "smtp-email",
      reason: "smtp_not_configured",
      at: new Date().toISOString()
    });
  }

  if (shouldSendWhatsAppAlert(whatsapp, event)) {
    const wa = await sendWhatsAppViaTwilio(whatsapp, body);
    delivery.push({
      ...wa,
      at: new Date().toISOString()
    });
  }

  const webhook = await sendWebhookAlert({
    type: "guardian-alert",
    event
  });
  if (webhook.method) {
    delivery.push({
      ...webhook,
      at: new Date().toISOString()
    });
  }

  const codexBridge = await sendCodexBridgeAlert(event, { thread: alertId });
  if (codexBridge.method) {
    delivery.push({
      ...codexBridge,
      at: new Date().toISOString()
    });
  }

  const iztRelay = await sendIztEmergencyRelay(event);
  if (iztRelay.method) {
    delivery.push({
      ...iztRelay,
      at: new Date().toISOString()
    });
  }

  const alertRecord = {
    id: alertId,
    at: new Date().toISOString(),
    ownerName,
    routeAction: event.routeAction || "none",
    messagePreview: event.messagePreview || "",
    risk: event.risk || {},
    securityIncident: isSecurityEmergency(event),
    blocked: Boolean(event.blocked),
    decisionText: event.decisionText || "",
    approvalRequest: event.approvalRequest
      ? {
        id: event.approvalRequest.id,
        expiresAt: event.approvalRequest.expiresAt || null,
        url: event.approvalRequest.url || null
      }
      : null,
    delivery
  };

  const doc = loadAlerts();
  doc.alerts.push(alertRecord);
  saveAlerts(doc);
  appendLogLine(`${alertRecord.at} | ${alertRecord.risk.level || "unknown"} | ${alertRecord.routeAction} | blocked=${alertRecord.blocked} | deliveries=${delivery.length}`);

  return {
    alertId: alertRecord.id,
    delivery,
    alertsPath,
    alertsLogPath
  };
}

module.exports = {
  notifyGuardianContacts,
  listGuardianAlerts,
  getGuardianAlertStats
};
