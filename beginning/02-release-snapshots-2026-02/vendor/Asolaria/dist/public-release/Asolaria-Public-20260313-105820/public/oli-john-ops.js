(() => {
  "use strict";

  const REFRESH_MS = 10000;
  const TOKEN_KEY = "asolaria.oli_john.mobile_token";
  const WATCHED_LANES = ["vector", "rook", "forge", "falcon", "watchdog"];
  const WHATSAPP_OPEN_PATH = "/api/phone/mirror/whatsapp/open";
  const WHATSAPP_LINKED_OPEN_CHAT_PATH = "/api/phone/mirror/whatsapp/linked/open-chat";

  const els = {
    refreshBtn: document.getElementById("refreshBtn"),
    autoRefreshToggle: document.getElementById("autoRefreshToggle"),
    lastUpdated: document.getElementById("lastUpdated"),
    runtimeBadge: document.getElementById("runtimeBadge"),
    bridgeBadge: document.getElementById("bridgeBadge"),
    watchdogBadge: document.getElementById("watchdogBadge"),
    vertexBadge: document.getElementById("vertexBadge"),
    phoneBadge: document.getElementById("phoneBadge"),
    statusSummary: document.getElementById("statusSummary"),
    laneRows: document.getElementById("laneRows"),
    tokenInput: document.getElementById("tokenInput"),
    saveTokenBtn: document.getElementById("saveTokenBtn"),
    clearTokenBtn: document.getElementById("clearTokenBtn"),
    tokenStatus: document.getElementById("tokenStatus"),
    openConsoleBtn: document.getElementById("openConsoleBtn"),
    openApprovalsBtn: document.getElementById("openApprovalsBtn"),
    copyPacketBtn: document.getElementById("copyPacketBtn"),
    handoffPacket: document.getElementById("handoffPacket")
  };

  let latest = null;
  let timer = null;

  function readToken() {
    return String(localStorage.getItem(TOKEN_KEY) || "").trim();
  }

  function writeToken(value) {
    const token = String(value || "").trim();
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      return "";
    }
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  }

  function syncTokenUi() {
    const token = readToken();
    if (els.tokenInput) {
      els.tokenInput.value = token;
    }
    if (els.tokenStatus) {
      els.tokenStatus.textContent = token
        ? `Token saved locally (${token.length} chars).`
        : "Token is not set.";
    }
  }

  function scrubTokenQuery() {
    try {
      const url = new URL(window.location.href);
      const queryToken = String(url.searchParams.get("token") || "").trim();
      if (queryToken) {
        writeToken(queryToken);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (error) {
      console.warn("Failed to parse URL token:", error);
    }
  }

  function setBadge(element, text, level) {
    if (!element) return;
    element.textContent = String(text || "");
    element.classList.remove("ok", "warn", "bad", "neutral");
    const valid = level === "ok" || level === "warn" || level === "bad" || level === "neutral";
    element.classList.add(valid ? level : "neutral");
  }

  function toIso(value) {
    if (!value) return "n/a";
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return String(value);
    }
  }

  function formatChannel(selected) {
    if (!selected || typeof selected !== "object") return "unknown";
    const channel = String(selected.channel || "none");
    const reason = String(selected.reason || "");
    if (!reason) return channel;
    return `${channel} (${reason})`;
  }

  async function api(path, options = {}) {
    const token = readToken();
    const headers = Object.assign({}, options.headers || {});
    if (token) {
      headers["x-asolaria-mobile-token"] = token;
      headers["x-asolaria-token"] = token;
    }
    const timeoutMs = Math.max(2000, Number(options.timeoutMs || 9000));
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(path, {
        method: options.method || "GET",
        headers,
        body: options.body,
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        const message = String(data.error || `HTTP ${response.status}`);
        const err = new Error(message);
        err.status = response.status;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timerId);
    }
  }

  async function safeApi(path) {
    try {
      return await api(path);
    } catch (error) {
      return {
        ok: false,
        error: String(error?.message || "request_failed"),
        status: Number(error?.status || 0)
      };
    }
  }

  function renderLaneTable(agents) {
    if (!els.laneRows) return;
    const list = Array.isArray(agents) ? agents : [];
    const filtered = WATCHED_LANES.map((id) => list.find((agent) => String(agent?.id || "") === id)).filter(Boolean);
    if (filtered.length < 1) {
      els.laneRows.innerHTML = '<tr><td colspan="4" class="hint">No lane data returned.</td></tr>';
      return;
    }
    els.laneRows.innerHTML = filtered.map((agent) => {
      const lane = String(agent.name || agent.id || "lane");
      const state = String(agent.state || "unknown");
      const running = agent.running ? "yes" : "no";
      const lastSeen = toIso(agent.lastSeenAt);
      return `<tr><td>${escapeHtml(lane)}</td><td>${escapeHtml(state)}</td><td>${escapeHtml(running)}</td><td>${escapeHtml(lastSeen)}</td></tr>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function collectSummary(payload) {
    const health = payload?.health || {};
    const colony = health?.agentColony || {};
    const vertex = payload?.vertex?.status || {};
    const budget = payload?.budget?.status || {};
    const keeper = health?.networkPolicy?.phoneBridgeKeeper || {};
    const monitor = health?.networkPolicy?.phoneTunnelMonitor || {};
    return {
      runtimeOk: Boolean(health.ok),
      lanesOnline: Number(colony?.counts?.online || 0),
      lanesTotal: Number(colony?.counts?.total || 0),
      watchdogEnabled: Boolean(colony?.watchdog?.enabled),
      watchdogDue: Boolean(colony?.watchdog?.due),
      vertexConfigured: Boolean(vertex.configured),
      vertexBudgetNearLimit: Boolean(budget.nearLimit),
      vertexBudgetExhausted: Boolean(budget.exhausted),
      keeperRunning: Boolean(keeper.running),
      monitorRunning: Boolean(monitor.running),
      selectedChannel: formatChannel(health?.connectionRouting?.selected),
      remoteBaseConfigured: Boolean(String(health?.networkPolicy?.connectionResolvedRemoteBaseUrl || "").trim())
    };
  }

  function render(payload) {
    const summary = collectSummary(payload);
    latest = payload;

    setBadge(
      els.runtimeBadge,
      summary.runtimeOk ? "runtime online" : "runtime unavailable",
      summary.runtimeOk ? "ok" : "bad"
    );

    const bridgeText = `lanes ${summary.lanesOnline}/${summary.lanesTotal}`;
    setBadge(
      els.bridgeBadge,
      bridgeText,
      summary.lanesOnline >= Math.max(1, summary.lanesTotal - 1) ? "ok" : "warn"
    );

    const watchdogText = summary.watchdogEnabled
      ? (summary.watchdogDue ? "enabled (digest due)" : "enabled (healthy)")
      : "disabled";
    setBadge(
      els.watchdogBadge,
      watchdogText,
      summary.watchdogEnabled ? (summary.watchdogDue ? "warn" : "ok") : "bad"
    );

    const vertexText = summary.vertexConfigured
      ? (summary.vertexBudgetExhausted ? "configured (budget exhausted)" : summary.vertexBudgetNearLimit ? "configured (budget near limit)" : "configured")
      : "not configured";
    setBadge(
      els.vertexBadge,
      vertexText,
      !summary.vertexConfigured ? "bad" : summary.vertexBudgetExhausted ? "bad" : summary.vertexBudgetNearLimit ? "warn" : "ok"
    );

    const phoneText = summary.keeperRunning && summary.monitorRunning
      ? "keeper+monitor running"
      : summary.keeperRunning || summary.monitorRunning
        ? "partially running"
        : "not running";
    setBadge(
      els.phoneBadge,
      phoneText,
      summary.keeperRunning && summary.monitorRunning ? "ok" : summary.keeperRunning || summary.monitorRunning ? "warn" : "bad"
    );

    if (els.statusSummary) {
      els.statusSummary.textContent = [
        `Selected route: ${summary.selectedChannel}.`,
        `Remote base configured: ${summary.remoteBaseConfigured ? "yes" : "no"}.`,
        "John phone pairing is required before full control tests will pass."
      ].join(" ");
    }

    const agents = Array.isArray(payload?.health?.agentColony?.agents) ? payload.health.agentColony.agents : [];
    renderLaneTable(agents);

    if (els.lastUpdated) {
      els.lastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
      els.lastUpdated.classList.remove("bad");
      els.lastUpdated.classList.add("neutral");
    }

    renderHandoffPacket();
  }

  async function refresh() {
    const [health, vertex, budget] = await Promise.all([
      safeApi("/api/health"),
      safeApi("/api/integrations/vertex/status"),
      safeApi("/api/integrations/vertex/budget/status")
    ]);
    render({ health, vertex, budget });
  }

  function autoRefresh() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (els.autoRefreshToggle && els.autoRefreshToggle.checked) {
      timer = setInterval(() => {
        refresh().catch((error) => console.warn("refresh failed:", error));
      }, REFRESH_MS);
    }
  }

  function resolveBaseUrl() {
    const preferred = String(latest?.health?.networkPolicy?.connectionResolvedRemoteBaseUrl || "").trim();
    if (preferred) return preferred;
    return window.location.origin;
  }

  function buildConsoleUrl() {
    const token = readToken();
    if (!token) return "";
    const base = resolveBaseUrl();
    const query = new URLSearchParams({
      token,
      channel: "public_internet",
      viewer: "falcon"
    });
    return `${base.replace(/\/$/, "")}/mobile-console.html?${query.toString()}`;
  }

  function buildApprovalsUrl() {
    const token = readToken();
    if (!token) return "";
    const base = resolveBaseUrl();
    const query = new URLSearchParams({
      token,
      channel: "public_internet"
    });
    return `${base.replace(/\/$/, "")}/mobile-approvals.html?${query.toString()}`;
  }

  function renderHandoffPacket() {
    if (!els.handoffPacket) return;
    const token = readToken();
    const summary = collectSummary(latest || {});
    const base = resolveBaseUrl().replace(/\/$/, "");
    const packet = {
      generatedAt: new Date().toISOString(),
      profile: "oli_john_mac_handoff_v1",
      runtime: {
        lanes_online: summary.lanesOnline,
        lanes_total: summary.lanesTotal,
        watchdog_enabled: summary.watchdogEnabled,
        vertex_configured: summary.vertexConfigured
      },
      urls: {
        john_console: token ? buildConsoleUrl() : `${base}/mobile-console.html?token=<MOBILE_TOKEN>&channel=public_internet&viewer=falcon`,
        john_approvals: token ? buildApprovalsUrl() : `${base}/mobile-approvals.html?token=<MOBILE_TOKEN>&channel=public_internet`,
        whatsapp_open_api: `${base}${WHATSAPP_OPEN_PATH}`,
        whatsapp_linked_open_chat_api: `${base}${WHATSAPP_LINKED_OPEN_CHAT_PATH}`
      },
      mac_quick_start: [
        "brew install --cask android-platform-tools",
        "adb devices",
        "open '<john_console_url_with_token>'"
      ],
      john_phone_setup: [
        "Install/open Asolaria companion on John's phone.",
        "Enable Developer Options and USB debugging on John's phone.",
        "Save mobile token in Oli's Mac browser session.",
        "Run one click/type control test and one push subscribe test.",
        "Run WhatsApp open check and confirm manual biometric approval on John's phone."
      ],
      whatsapp_checks: [
        "POST /api/phone/mirror/whatsapp/open",
        "POST /api/phone/mirror/whatsapp/linked/open-chat with body {\"toNumber\":\"<E164_PHONE>\"}",
        "Manual biometric approval on phone is expected for WhatsApp auth screens."
      ]
    };
    els.handoffPacket.value = JSON.stringify(packet, null, 2);
  }

  function openUrl(url) {
    if (!url) {
      if (els.tokenStatus) {
        els.tokenStatus.textContent = "Token required: paste token, then open the page.";
      }
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  async function copyHandoffPacket() {
    if (!els.handoffPacket) return;
    const text = String(els.handoffPacket.value || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (els.tokenStatus) {
        els.tokenStatus.textContent = "Sanitized handoff packet copied.";
      }
    } catch (error) {
      if (els.tokenStatus) {
        els.tokenStatus.textContent = `Copy failed: ${String(error?.message || "clipboard_unavailable")}`;
      }
    }
  }

  function wireEvents() {
    if (els.refreshBtn) {
      els.refreshBtn.addEventListener("click", () => {
        refresh().catch((error) => console.warn("manual refresh failed:", error));
      });
    }
    if (els.autoRefreshToggle) {
      els.autoRefreshToggle.addEventListener("change", autoRefresh);
    }
    if (els.saveTokenBtn) {
      els.saveTokenBtn.addEventListener("click", () => {
        const saved = writeToken(els.tokenInput ? els.tokenInput.value : "");
        if (els.tokenStatus) {
          els.tokenStatus.textContent = saved ? "Token saved locally." : "Token cleared.";
        }
        syncTokenUi();
        renderHandoffPacket();
      });
    }
    if (els.clearTokenBtn) {
      els.clearTokenBtn.addEventListener("click", () => {
        writeToken("");
        syncTokenUi();
        renderHandoffPacket();
      });
    }
    if (els.openConsoleBtn) {
      els.openConsoleBtn.addEventListener("click", () => openUrl(buildConsoleUrl()));
    }
    if (els.openApprovalsBtn) {
      els.openApprovalsBtn.addEventListener("click", () => openUrl(buildApprovalsUrl()));
    }
    if (els.copyPacketBtn) {
      els.copyPacketBtn.addEventListener("click", () => {
        copyHandoffPacket().catch((error) => console.warn("copy failed:", error));
      });
    }
  }

  scrubTokenQuery();
  syncTokenUi();
  wireEvents();
  refresh().catch((error) => console.warn("initial refresh failed:", error));
  autoRefresh();
})();
