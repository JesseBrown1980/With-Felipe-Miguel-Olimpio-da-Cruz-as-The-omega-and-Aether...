(function () {
  const tokenInput = document.getElementById("tokenInput");
  const saveTokenBtn = document.getElementById("saveTokenBtn");
  const refreshAllBtn = document.getElementById("refreshAllBtn");
  const openApprovalsBtn = document.getElementById("openApprovalsBtn");
  const installAppBtn = document.getElementById("installAppBtn");
  const approvalStrategySelect = document.getElementById("approvalStrategySelect");
  const saveApprovalStrategyBtn = document.getElementById("saveApprovalStrategyBtn");
  const approvalStrategyStatus = document.getElementById("approvalStrategyStatus");
  const enablePushBtn = document.getElementById("enablePushBtn");
  const disablePushBtn = document.getElementById("disablePushBtn");
  const testPushBtn = document.getElementById("testPushBtn");
  const pushStatusBox = document.getElementById("pushStatus");
  const globalStatus = document.getElementById("globalStatus");
  const captureBtn = document.getElementById("captureBtn");
  const toggleAutoBtn = document.getElementById("toggleAutoBtn");
  const displaySelect = document.getElementById("displaySelect");
  const refreshDisplaysBtn = document.getElementById("refreshDisplaysBtn");
  const captureAllBtn = document.getElementById("captureAllBtn");
  const screenMeta = document.getElementById("screenMeta");
  const desktopImage = document.getElementById("desktopImage");
  const openImageBtn = document.getElementById("openImageBtn");
  const approvalList = document.getElementById("approvalList");
  const chatInput = document.getElementById("chatInput");
  const chatFiles = document.getElementById("chatFiles");
  const chatFileStatus = document.getElementById("chatFileStatus");
  const sendBtn = document.getElementById("sendBtn");
  const clearInputBtn = document.getElementById("clearInputBtn");
  const attachScreenBtn = document.getElementById("attachScreenBtn");
  const chatStatus = document.getElementById("chatStatus");
  const memoryList = document.getElementById("memoryList");
  const notebookList = document.getElementById("notebookList");
  const notebookSearchInput = document.getElementById("notebookSearchInput");
  const notebookSearchBtn = document.getElementById("notebookSearchBtn");
  const notebookRefreshBtn = document.getElementById("notebookRefreshBtn");
  const notebookTitleInput = document.getElementById("notebookTitleInput");
  const notebookTagsInput = document.getElementById("notebookTagsInput");
  const notebookTextInput = document.getElementById("notebookTextInput");
  const notebookAddBtn = document.getElementById("notebookAddBtn");
  const notebookClearBtn = document.getElementById("notebookClearBtn");
  const notebookStatus = document.getElementById("notebookStatus");
  const taskLedgerStatus = document.getElementById("taskLedgerStatus");
  const taskLedgerTitleInput = document.getElementById("taskLedgerTitleInput");
  const taskLedgerDescriptionInput = document.getElementById("taskLedgerDescriptionInput");
  const taskLedgerCreatePriority = document.getElementById("taskLedgerCreatePriority");
  const taskLedgerStatusFilter = document.getElementById("taskLedgerStatusFilter");
  const taskLedgerPriorityFilter = document.getElementById("taskLedgerPriorityFilter");
  const taskLedgerIncludeArchived = document.getElementById("taskLedgerIncludeArchived");
  const taskLedgerSearchInput = document.getElementById("taskLedgerSearchInput");
  const taskLedgerRefreshBtn = document.getElementById("taskLedgerRefreshBtn");
  const taskLedgerAddBtn = document.getElementById("taskLedgerAddBtn");
  const taskLedgerList = document.getElementById("taskLedgerList");
  const taskLedgerEvents = document.getElementById("taskLedgerEvents");
  const controlStatusBox = document.getElementById("controlStatus");
  const armControlBtn = document.getElementById("armControlBtn");
  const disarmControlBtn = document.getElementById("disarmControlBtn");
  const tapControlToggleBtn = document.getElementById("tapControlToggleBtn");
  const runControlDiagBtn = document.getElementById("runControlDiagBtn");
  const controlDiagStatus = document.getElementById("controlDiagStatus");
  const scrollUpBtn = document.getElementById("scrollUpBtn");
  const scrollDownBtn = document.getElementById("scrollDownBtn");
  const keyEnterBtn = document.getElementById("keyEnterBtn");
  const keyEscBtn = document.getElementById("keyEscBtn");
  const keyBackspaceBtn = document.getElementById("keyBackspaceBtn");
  const keyPageUpBtn = document.getElementById("keyPageUpBtn");
  const keyPageDownBtn = document.getElementById("keyPageDownBtn");
  const keyCtrlCBtn = document.getElementById("keyCtrlCBtn");
  const keyCtrlVBtn = document.getElementById("keyCtrlVBtn");
  const keyCtrlABtn = document.getElementById("keyCtrlABtn");
  const keyPrevTabBtn = document.getElementById("keyPrevTabBtn");
  const keyNextTabBtn = document.getElementById("keyNextTabBtn");
  const keyCloseTabBtn = document.getElementById("keyCloseTabBtn");
  const typeInput = document.getElementById("typeInput");
  const sendTypeBtn = document.getElementById("sendTypeBtn");
  const windowSearchInput = document.getElementById("windowSearchInput");
  const focusWindowBtn = document.getElementById("focusWindowBtn");
  const refreshWindowsBtn = document.getElementById("refreshWindowsBtn");
  const switchWindowBtn = document.getElementById("switchWindowBtn");
  const minimizeWindowBtn = document.getElementById("minimizeWindowBtn");
  const maximizeWindowBtn = document.getElementById("maximizeWindowBtn");
  const restoreWindowBtn = document.getElementById("restoreWindowBtn");
  const closeWindowBtn = document.getElementById("closeWindowBtn");
  const windowsStatus = document.getElementById("windowsStatus");
  const windowList = document.getElementById("windowList");
  const profileWifiBtn = document.getElementById("profileWifiBtn");
  const profileInternetBtn = document.getElementById("profileInternetBtn");
  const profileUsbBtn = document.getElementById("profileUsbBtn");
  const remoteBaseInput = document.getElementById("remoteBaseInput");
  const saveRemoteBaseBtn = document.getElementById("saveRemoteBaseBtn");
  const vpnHeartbeatBtn = document.getElementById("vpnHeartbeatBtn");
  const stealthToggleBtn = document.getElementById("stealthToggleBtn");
  const stealthStatus = document.getElementById("stealthStatus");
  const connectionStatus = document.getElementById("connectionStatus");
  const networkHistoryBox = document.getElementById("networkHistory");
  const workOrgSelect = document.getElementById("workOrgSelect");
  const setWorkOrgBtn = document.getElementById("setWorkOrgBtn");
  const refreshWorkOrgBtn = document.getElementById("refreshWorkOrgBtn");
  const workOrgStatus = document.getElementById("workOrgStatus");
  const powerDelayInput = document.getElementById("powerDelayInput");
  const powerShutdownBtn = document.getElementById("powerShutdownBtn");
  const powerRestartBtn = document.getElementById("powerRestartBtn");
  const powerAbortBtn = document.getElementById("powerAbortBtn");
  const wolDeviceSelect = document.getElementById("wolDeviceSelect");
  const wolTargetInput = document.getElementById("wolTargetInput");
  const wolWakeBtn = document.getElementById("wolWakeBtn");
  const wolRefreshBtn = document.getElementById("wolRefreshBtn");
  const powerStatusBox = document.getElementById("powerStatus");
  const refreshIntegrationsBtn = document.getElementById("refreshIntegrationsBtn");
  const openIntegrationsSetupBtn = document.getElementById("openIntegrationsSetupBtn");
  const integrationsHint = document.getElementById("integrationsHint");
  const slackStatusBtn = document.getElementById("slackStatusBtn");
  const slackChannelsBtn = document.getElementById("slackChannelsBtn");
  const slackChannelInput = document.getElementById("slackChannelInput");
  const slackLimitInput = document.getElementById("slackLimitInput");
  const slackAnalyzeSelect = document.getElementById("slackAnalyzeSelect");
  const slackReviewBtn = document.getElementById("slackReviewBtn");
  const slackStatusBox = document.getElementById("slackStatusBox");
  const googleStatusBtn = document.getElementById("googleStatusBtn");
  const googleAuthStartBtn = document.getElementById("googleAuthStartBtn");
  const googleOpenAuthBtn = document.getElementById("googleOpenAuthBtn");
  const googleAccountInput = document.getElementById("googleAccountInput");
  const googleLimitInput = document.getElementById("googleLimitInput");
  const gmailInboxBtn = document.getElementById("gmailInboxBtn");
  const gmailSearchInput = document.getElementById("gmailSearchInput");
  const gmailSearchBtn = document.getElementById("gmailSearchBtn");
  const calendarDaysInput = document.getElementById("calendarDaysInput");
  const calendarUpcomingBtn = document.getElementById("calendarUpcomingBtn");
  const calendarListBtn = document.getElementById("calendarListBtn");
  const googleApiUrlInput = document.getElementById("googleApiUrlInput");
  const googleApiGetBtn = document.getElementById("googleApiGetBtn");
  const googleStatusBox = document.getElementById("googleStatusBox");
  const googleAuthUrlBox = document.getElementById("googleAuthUrlBox");
  const gcpStatusBtn = document.getElementById("gcpStatusBtn");
  const gcpEnabledBtn = document.getElementById("gcpEnabledBtn");
  const gcpProjectInput = document.getElementById("gcpProjectInput");
  const gcpServiceInput = document.getElementById("gcpServiceInput");
  const gcpEnableBtn = document.getElementById("gcpEnableBtn");
  const gcpApiUrlInput = document.getElementById("gcpApiUrlInput");
  const gcpApiGetBtn = document.getElementById("gcpApiGetBtn");
  const gcpStatusBox = document.getElementById("gcpStatusBox");
  const androidStatusBtn = document.getElementById("androidStatusBtn");
  const androidOpenTermuxBtn = document.getElementById("androidOpenTermuxBtn");
  const androidOpenFdroidBtn = document.getElementById("androidOpenFdroidBtn");
  const androidTermuxCmdInput = document.getElementById("androidTermuxCmdInput");
  const androidTermuxRunBtn = document.getElementById("androidTermuxRunBtn");
  const androidTermuxSshdBtn = document.getElementById("androidTermuxSshdBtn");
  const androidStatusBox = document.getElementById("androidStatusBox");
  const clearJobResultBtn = document.getElementById("clearJobResultBtn");
  const jobResultMeta = document.getElementById("jobResultMeta");
  const jobResultBox = document.getElementById("jobResultBox");

  let autoRefreshTimer = null;
  const NETWORK_TUNING = {
    usb: {
      apiGetTimeoutMs: 14000,
      apiMutationTimeoutMs: 22000,
      apiGetRetries: 3,
      retryBackoffMs: 450,
      autoRefreshMs: 2200,
      windowsLimit: 14
    },
    remote: {
      apiGetTimeoutMs: 26000,
      apiMutationTimeoutMs: 32000,
      apiGetRetries: 4,
      retryBackoffMs: 700,
      autoRefreshMs: 3600,
      windowsLimit: 8
    }
  };
  const NETWORK_HISTORY_MAX = 12;
  const PUSH_SW_PATH = "/mobile-push-sw.js?v=20260211-2";
  const CONTROL_ARM_MS = 2 * 60 * 1000;
  let pushRegistration = null;
  let controlArmed = false;
  let controlTapEnabled = true;
  let controlClickInFlight = false;
  let controlStatusTimer = null;
  let sessionPollTimer = null;
  let lastNativePendingAlertCount = 0;
  let deferredInstallPrompt = null;
  const storedDisplayIndex = getStoredDisplayIndex();
  const storedDisplayDeviceName = getStoredDisplayDeviceName();
  let activeDisplayIndex = Number.isInteger(storedDisplayIndex) ? storedDisplayIndex : -1;
  let activeDisplayDeviceName = String(storedDisplayDeviceName || "");
  let displaySessionId = "";
  let captureAllMode = false;
  let captureRequestPromise = null;
  let attachScreenEnabled = true;
  let stealthMode = null;
  let cachedLoopbackHttpPort = null;
  let lastGoogleAuthUrl = "";
  let selectedWindowId = 0;
  let selectedWindowTitle = "";
  const networkHistory = [];

  function getStoredToken() {
    return String(localStorage.getItem("asolaria.mobile.token") || "").trim();
  }

  function setStoredToken(value) {
    const token = String(value || "").trim();
    if (!token) {
      localStorage.removeItem("asolaria.mobile.token");
      return;
    }
    localStorage.setItem("asolaria.mobile.token", token);
  }

  function getStoredDisplayIndex() {
    try {
      const raw = String(localStorage.getItem("asolaria.mobile.displayIndex") || "").trim();
      if (!raw) return null;
      const parsed = Number(raw);
      if (!Number.isInteger(parsed)) return null;
      if (parsed < -1 || parsed > 16) return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function getStoredDisplayDeviceName() {
    try {
      return String(localStorage.getItem("asolaria.mobile.displayDeviceName") || "").trim();
    } catch (_error) {
      return "";
    }
  }

  function setStoredDisplayIndex(value) {
    try {
      if (!Number.isInteger(value)) {
        localStorage.removeItem("asolaria.mobile.displayIndex");
        return;
      }
      localStorage.setItem("asolaria.mobile.displayIndex", String(value));
    } catch (_error) {
      // ignore localStorage failures
    }
  }

  function setStoredDisplayDeviceName(value) {
    try {
      const next = String(value || "").trim();
      if (!next) {
        localStorage.removeItem("asolaria.mobile.displayDeviceName");
        return;
      }
      localStorage.setItem("asolaria.mobile.displayDeviceName", next);
    } catch (_error) {
      // ignore localStorage failures
    }
  }

  function getStoredAttachScreen() {
    const raw = String(localStorage.getItem("asolaria.mobile.attachScreen") || "").trim().toLowerCase();
    if (!raw) return true;
    if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
    return true;
  }

  function setStoredAttachScreen(enabled) {
    localStorage.setItem("asolaria.mobile.attachScreen", enabled ? "1" : "0");
  }

  function renderAttachScreenButton() {
    if (!attachScreenBtn) return;
    attachScreenBtn.textContent = attachScreenEnabled ? "Attach Screen On" : "Attach Screen Off";
  }

  function getQuery(name) {
    const params = new URLSearchParams(window.location.search);
    return String(params.get(name) || "").trim();
  }

  function stripQueryTokenFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("token")) return;
      url.searchParams.delete("token");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", next || "/");
    } catch (_error) {
      // ignore history/local URL edge cases
    }
  }

  function detectChannel() {
    const fromQuery = getQuery("channel");
    if (fromQuery) return fromQuery;
    const host = String(window.location.hostname || "").toLowerCase();
    if (host === "127.0.0.1" || host === "localhost") return "usb";
    return "private_internet";
  }

  function isUsbChannel(channel) {
    return String(channel || "").trim().toLowerCase() === "usb";
  }

  function getNetworkTuning() {
    const channel = detectChannel();
    return isUsbChannel(channel) ? NETWORK_TUNING.usb : NETWORK_TUNING.remote;
  }

  function authToken() {
    const queryToken = getQuery("token");
    if (queryToken) {
      setStoredToken(queryToken);
      stripQueryTokenFromUrl();
      return queryToken;
    }
    return getStoredToken();
  }

  function hasToken() {
    return Boolean(authToken());
  }

  // If opened with ?token=..., persist it and scrub it from the URL immediately.
  authToken();

  function buildNavUrl(path, extraQuery) {
    const url = new URL(path, window.location.origin);
    const channel = detectChannel();
    if (channel) {
      url.searchParams.set("channel", channel);
    }
    if (extraQuery && typeof extraQuery === "object") {
      for (const [key, value] of Object.entries(extraQuery)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(String(key), String(value));
      }
    }
    return `${url.pathname}${url.search}`;
  }

  function buildAuthedUrl(path, extraQuery) {
    const url = new URL(path, window.location.origin);
    const token = authToken();
    if (token) {
      url.searchParams.set("token", token);
    }
    const channel = detectChannel();
    if (channel) {
      url.searchParams.set("channel", channel);
    }
    if (extraQuery && typeof extraQuery === "object") {
      for (const [key, value] of Object.entries(extraQuery)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(String(key), String(value));
      }
    }
    return `${url.pathname}${url.search}`;
  }

  function formatTimeStamp(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function renderNetworkHistory() {
    if (!networkHistoryBox) {
      return;
    }
    if (!Array.isArray(networkHistory) || networkHistory.length < 1) {
      networkHistoryBox.textContent = "Network events: none.";
      return;
    }
    const lines = networkHistory
      .slice(-NETWORK_HISTORY_MAX)
      .map((entry) => `${formatTimeStamp(entry.at)} | ${entry.level.toUpperCase()} | ${entry.text}`);
    networkHistoryBox.textContent = lines.reverse().join("\n");
  }

  function pushNetworkEvent(level, text) {
    const entry = {
      at: Date.now(),
      level: String(level || "info").toLowerCase(),
      text: String(text || "").trim() || "network event"
    };
    networkHistory.push(entry);
    if (networkHistory.length > NETWORK_HISTORY_MAX * 2) {
      networkHistory.splice(0, networkHistory.length - NETWORK_HISTORY_MAX * 2);
    }
    renderNetworkHistory();
  }

  function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
  }

  function classifyApiError(error, fallbackText, statusCode) {
    const text = String(error?.message || fallbackText || "request_failed").trim();
    const status = Number(statusCode || error?.status || 0);
    const byStatus = status === 408 || status === 429 || status >= 500;
    const byName = String(error?.name || "").toLowerCase() === "aborterror";
    const byText = /(failed to fetch|networkerror|network error|timeout|temporarily unavailable|econn|enotfound)/i.test(text);
    return {
      text,
      status,
      retryable: Boolean(byStatus || byName || byText)
    };
  }

  function isAuthFailure(error) {
    const status = Number(error?.status || 0);
    if (status === 401 || status === 403) {
      return true;
    }
    const text = String(error?.message || "").toLowerCase();
    return text.includes("unauthorized mobile approval access");
  }

  function isCaptureInProgressError(error) {
    const message = String(error?.message || "");
    return /desktop capture already in progress|already in progress/i.test(message);
  }

  async function api(path, options) {
    const headers = Object.assign({}, options?.headers || {});
    const tuning = getNetworkTuning();
    const token = authToken();
    if (token) {
      headers["x-asolaria-mobile-token"] = token;
      headers["x-asolaria-token"] = token;
    }
    const channel = detectChannel();
    if (channel) {
      headers["x-asolaria-channel"] = channel;
    }
    const method = String(options?.method || "GET").toUpperCase();
    const timeoutMs = Math.max(
      2500,
      Number(options?.timeoutMs || (method === "GET" ? tuning.apiGetTimeoutMs : tuning.apiMutationTimeoutMs))
    );
    const maxAttempts = method === "GET"
      ? Math.max(1, Number(options?.retries || tuning.apiGetRetries))
      : 1;
    const retryBackoffMs = Math.max(150, Number(options?.retryBackoffMs || tuning.retryBackoffMs));
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const requestOptions = Object.assign({}, options || {}, {
          headers,
          signal: controller.signal
        });
        delete requestOptions.timeoutMs;
        delete requestOptions.retries;
        const response = await fetch(path, requestOptions);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) {
          const classified = classifyApiError(
            new Error(data.error || `Request failed (${response.status})`),
            data.error || `Request failed (${response.status})`,
            response.status
          );
          const httpError = new Error(classified.text);
          httpError.status = classified.status;
          httpError.retryable = classified.retryable;
          throw httpError;
        }
        if (attempt > 1) {
          pushNetworkEvent("recover", `${method} ${path} recovered on attempt ${attempt}/${maxAttempts}`);
        }
        return data;
      } catch (error) {
        const normalized = classifyApiError(error, `Request failed (${method} ${path})`, error?.status);
        lastError = new Error(normalized.text);
        lastError.status = normalized.status;
        lastError.retryable = normalized.retryable;
        const shouldRetry = method === "GET" && attempt < maxAttempts && normalized.retryable;
        if (!shouldRetry) {
          pushNetworkEvent("fail", `${method} ${path} failed: ${normalized.text}`);
          break;
        }
        const backoffMs = retryBackoffMs * Math.pow(2, attempt - 1);
        pushNetworkEvent(
          "retry",
          `${method} ${path} attempt ${attempt}/${maxAttempts} failed (${normalized.text}); retry in ${backoffMs}ms`
        );
        await waitMs(backoffMs);
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError || new Error(`Request failed (${method} ${path})`);
  }

  function setGlobalStatus(text) {
    globalStatus.textContent = String(text || "Ready");
  }

  function setChatStatus(text) {
    if (chatStatus) {
      chatStatus.textContent = String(text || "");
    }
  }

  function setChatFileStatus() {
    if (!chatFileStatus) {
      return;
    }
    const files = Array.from(chatFiles?.files || []);
    if (files.length === 0) {
      chatFileStatus.textContent = "No files selected.";
      return;
    }
    chatFileStatus.textContent = `${files.length} file(s): ${files.map((file) => file.name).join(", ")}`;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function uploadSelectedChatFiles() {
    const files = Array.from(chatFiles?.files || []);
    if (files.length === 0) {
      return { images: [], files: [], skipped: 0 };
    }

    const images = [];
    const uploadedFiles = [];
    const maxBytes = 5 * 1024 * 1024;
    let skipped = 0;
    for (const file of files.slice(0, 6)) {
      if (Number(file.size || 0) > maxBytes) {
        skipped += 1;
        continue;
      }
      const dataUrl = await fileToDataUrl(file);

      const name = String(file.name || "").toLowerCase();
      const isImage = String(file.type || "").toLowerCase().startsWith("image/")
        || /\.(png|jpe?g|webp|gif|bmp)$/.test(name);

      if (isImage) {
        const response = await api("/api/uploads/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, dataUrl })
        });
        if (response.image?.path) {
          images.push(response.image.path);
        }
        continue;
      }

      const response = await api("/api/uploads/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, dataUrl })
      });
      if (response.file?.path) {
        uploadedFiles.push(response.file.path);
      }
    }

    return { images, files: uploadedFiles, skipped };
  }

  function setApprovalStrategyStatus(text) {
    if (approvalStrategyStatus) {
      approvalStrategyStatus.textContent = String(text || "");
    }
  }

  function setPushStatus(text) {
    if (pushStatusBox) {
      pushStatusBox.textContent = String(text || "Push: unavailable");
    }
  }

  function setControlStatus(text) {
    if (controlStatusBox) {
      controlStatusBox.textContent = String(text || "Control: unavailable");
    }
  }

  function setControlDiagnosticsStatus(text) {
    if (controlDiagStatus) {
      controlDiagStatus.textContent = String(text || "Diagnostics: not run.");
    }
  }

  function getSelectedDisplayTarget() {
    const selectedIndex = Number(displaySelect?.value);
    const selectedOption = displaySelect?.selectedOptions?.[0];
    const selectedDeviceName = String(selectedOption?.dataset?.deviceName || "").trim();
    const index = Number.isInteger(selectedIndex)
      ? selectedIndex
      : (Number.isInteger(activeDisplayIndex) ? activeDisplayIndex : -1);
    const deviceName = selectedDeviceName || String(activeDisplayDeviceName || "").trim();
    return { index, deviceName };
  }

  function setPowerStatus(text) {
    if (powerStatusBox) {
      powerStatusBox.textContent = String(text || "Power: idle.");
    }
  }

  function setStealthStatus(text) {
    if (stealthStatus) {
      stealthStatus.textContent = String(text || "");
    }
  }

  function setWorkOrgStatus(text) {
    if (workOrgStatus) {
      workOrgStatus.textContent = String(text || "");
    }
  }

  function setIntegrationsHint(text) {
    if (integrationsHint) {
      integrationsHint.textContent = String(text || "");
    }
  }

  function setSlackStatusText(text) {
    if (slackStatusBox) {
      slackStatusBox.textContent = String(text || "");
    }
  }

  function setGoogleStatusText(text) {
    if (googleStatusBox) {
      googleStatusBox.textContent = String(text || "");
    }
  }

  function setGoogleAuthUrlText(text) {
    if (googleAuthUrlBox) {
      googleAuthUrlBox.textContent = String(text || "");
    }
  }

  function setGcpStatusText(text) {
    if (gcpStatusBox) {
      gcpStatusBox.textContent = String(text || "");
    }
  }

  function clipText(value, limit) {
    const text = String(value || "");
    const max = Number.isFinite(Number(limit)) ? Number(limit) : 900;
    if (text.length <= max) {
      return text;
    }
    return `${text.slice(0, Math.max(0, max - 3))}...`;
  }

  function stringifyJobResult(job) {
    const payload = job && typeof job === "object" ? job.result : null;
    if (payload === undefined || payload === null) {
      return "";
    }
    let text = "";
    try {
      text = JSON.stringify(payload, null, 2);
    } catch (_error) {
      text = String(payload);
    }
    const maxChars = 45000;
    if (text.length <= maxChars) {
      return text;
    }
    return `${text.slice(0, maxChars - 3)}...`;
  }

  function renderJobResult(job) {
    if (!jobResultBox) {
      return;
    }
    if (!job) {
      if (jobResultMeta) {
        jobResultMeta.textContent = "";
      }
      jobResultBox.textContent = "(no job yet)";
      return;
    }

    const id = String(job.id || "");
    const type = String(job.type || "");
    const status = String(job.status || "");
    const elapsedMs = Number.isFinite(Number(job.elapsedMs)) ? Number(job.elapsedMs) : null;
    if (jobResultMeta) {
      jobResultMeta.textContent = [
        id ? `id:${id}` : "",
        type ? `type:${type}` : "",
        status ? `status:${status}` : "",
        elapsedMs !== null ? `elapsedMs:${elapsedMs}` : ""
      ].filter(Boolean).join(" | ");
    }

    if (status === "failed") {
      jobResultBox.textContent = String(job.error || "(job failed)");
      return;
    }

    const text = stringifyJobResult(job);
    jobResultBox.textContent = text || "(no result)";
  }

  function readPowerDelaySeconds() {
    const raw = Number(powerDelayInput?.value);
    if (!Number.isFinite(raw)) {
      return 15;
    }
    return Math.max(0, Math.min(3600, Math.round(raw)));
  }

  function renderWolDevices(summary) {
    if (!wolDeviceSelect) {
      return;
    }
    const devices = Array.isArray(summary?.devices) ? summary.devices : [];
    const wanted = String(wolDeviceSelect.value || "").trim();

    wolDeviceSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = devices.length ? "Select WOL device..." : "No WOL devices configured";
    wolDeviceSelect.appendChild(placeholder);

    for (const device of devices) {
      const name = String(device?.name || "").trim();
      if (!name) continue;
      const label = String(device?.label || "").trim();
      const option = document.createElement("option");
      option.value = name;
      option.textContent = label ? `${name} (${label})` : name;
      wolDeviceSelect.appendChild(option);
    }

    if (wanted && devices.some((d) => String(d?.name || "").trim() === wanted)) {
      wolDeviceSelect.value = wanted;
    }
  }

  async function refreshPowerStatus() {
    try {
      const data = await api("/api/power/status");
      const power = data?.power || {};
      const wol = data?.wol || {};
      renderWolDevices(wol);

      const lastAction = String(power?.lastAction || "").trim();
      const lastAt = String(power?.lastActionAt || "").trim();
      const lastErr = String(power?.lastError || "").trim();
      const wolCount = Array.isArray(wol?.devices) ? wol.devices.length : 0;
      const status = [
        lastErr ? `Power: ERROR: ${lastErr}` : "",
        lastAction ? `Power: last=${lastAction}` : "Power: idle.",
        lastAt ? `at=${lastAt}` : "",
        `WOL devices: ${wolCount}`
      ].filter(Boolean).join(" | ");
      setPowerStatus(status);
    } catch (error) {
      setPowerStatus(`Power: status unavailable: ${error.message}`);
    }
  }

  function renderStealthToggle() {
    if (!stealthToggleBtn) {
      return;
    }
    if (stealthMode === null) {
      stealthToggleBtn.textContent = "Stealth: unknown";
      stealthToggleBtn.classList.add("accent");
      stealthToggleBtn.classList.remove("warn");
      setStealthStatus("Stealth state unavailable.");
      return;
    }

    stealthToggleBtn.textContent = stealthMode ? "Stealth ON" : "Stealth OFF";
    if (stealthMode) {
      stealthToggleBtn.classList.add("accent");
      stealthToggleBtn.classList.remove("warn");
      setStealthStatus("Visible actions blocked (Open Chrome, PAD, etc.).");
    } else {
      stealthToggleBtn.classList.add("warn");
      stealthToggleBtn.classList.remove("accent");
      setStealthStatus("Visible actions allowed. Use with care.");
    }
  }

  async function refreshStealthMode() {
    if (!stealthToggleBtn) {
      return;
    }
    try {
      const data = await api("/api/settings");
      stealthMode = data?.settings?.stealthMode === undefined ? stealthMode : Boolean(data.settings.stealthMode);
      renderStealthToggle();
    } catch (error) {
      stealthMode = null;
      renderStealthToggle();
      setStealthStatus(`Stealth status unavailable: ${error.message}`);
    }
  }

  async function toggleStealthMode() {
    if (!stealthToggleBtn) {
      return;
    }
    setStealthStatus("Updating stealth...");
    try {
      const next = stealthMode === null ? false : !stealthMode;
      const data = await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stealthMode: next })
      });
      stealthMode = Boolean(data?.settings?.stealthMode);
      renderStealthToggle();
    } catch (error) {
      setStealthStatus(`Stealth toggle failed: ${error.message}`);
    }
  }

  function renderWorkOrgSummary(summary) {
    if (!workOrgSelect) {
      return;
    }
    const workOrgs = summary && typeof summary === "object" ? summary : {};
    const profiles = workOrgs.profiles && typeof workOrgs.profiles === "object" ? workOrgs.profiles : {};
    const keys = Object.keys(profiles);
    const activeKey = String(workOrgs.activeOrg || "").trim();
    const wanted = String(workOrgSelect.value || activeKey || "").trim();

    workOrgSelect.innerHTML = "";
    if (!keys.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "(no org profiles)";
      workOrgSelect.appendChild(opt);
      setWorkOrgStatus("Work org: no profiles configured.");
      return;
    }

    keys.sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
      const profile = profiles[key] || {};
      const label = String(profile.label || key).trim() || key;
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = label === key ? key : `${label} (${key})`;
      workOrgSelect.appendChild(opt);
    }
    if (wanted && workOrgSelect.querySelector(`option[value="${wanted}"]`)) {
      workOrgSelect.value = wanted;
    } else if (activeKey && workOrgSelect.querySelector(`option[value="${activeKey}"]`)) {
      workOrgSelect.value = activeKey;
    }

    const activeProfile = activeKey ? profiles[activeKey] : null;
    const apps = Array.isArray(activeProfile?.apps) ? activeProfile.apps.join(", ") : "";
    const teamsEnabled = Boolean(activeProfile?.teams?.enabled);
    const teamsChannels = Array.isArray(activeProfile?.teams?.requiredChannels)
      ? activeProfile.teams.requiredChannels.join(",")
      : "";
    const vpnHint = String(activeProfile?.teams?.vpnLocationHint || "").trim();
    const status = [
      `Active: ${String(workOrgs.activeOrgLabel || activeKey || "n/a")}`,
      apps ? `apps=${apps}` : "",
      teamsEnabled ? `teams=on${teamsChannels ? `(${teamsChannels})` : ""}` : "teams=off",
      vpnHint ? `vpnHint=${vpnHint}` : ""
    ].filter(Boolean).join(" | ");
    setWorkOrgStatus(status);
  }

  async function refreshWorkOrg() {
    if (!workOrgSelect) {
      return;
    }
    try {
      const data = await api("/api/policy/work-orgs");
      renderWorkOrgSummary(data?.workOrgs || {});
    } catch (error) {
      setWorkOrgStatus(`Work org unavailable: ${error.message}`);
    }
  }

  async function setWorkOrg() {
    if (!workOrgSelect) {
      return;
    }
    const selected = String(workOrgSelect.value || "").trim();
    if (!selected) {
      setWorkOrgStatus("Work org: select an organization first.");
      return;
    }
    setWorkOrgStatus(`Switching to ${selected}...`);
    try {
      const data = await api("/api/policy/work-org/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: selected })
      });
      const label = String(data?.selected?.label || selected).trim();
      setWorkOrgStatus(`Work org set: ${label}`);
      await refreshWorkOrg();
    } catch (error) {
      setWorkOrgStatus(`Work org set failed: ${error.message}`);
    }
  }

  async function resolveLoopbackHttpPort() {
    if (Number.isInteger(Number(cachedLoopbackHttpPort)) && Number(cachedLoopbackHttpPort) > 0) {
      return Number(cachedLoopbackHttpPort);
    }
    try {
      const health = await api("/api/health");
      const port = Number(health?.networkPolicy?.http?.port || 0);
      if (Number.isInteger(port) && port > 0) {
        cachedLoopbackHttpPort = port;
        return port;
      }
    } catch (_error) {
      // best effort
    }
    cachedLoopbackHttpPort = 4781;
    return Number(cachedLoopbackHttpPort);
  }

  async function openIntegrationsSetupOnDesktop() {
    setIntegrationsHint("Opening setup on desktop...");
    try {
      const httpPort = await resolveLoopbackHttpPort();
      const url = `http://127.0.0.1:${httpPort}/admin/integrations`;
      const data = await api("/api/chrome/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      setIntegrationsHint(`Opened setup: ${String(data?.opened || url).trim()}`);
    } catch (error) {
      setIntegrationsHint(`Open setup failed: ${error.message}`);
    }
  }

  function formatSlackStatus(status) {
    const value = status && typeof status === "object" ? status : {};
    const policy = value.policy || {};
    const allowedChannels = Array.isArray(policy.allowedChannels) ? policy.allowedChannels : [];
    const lines = [];
    lines.push(
      `enabled=${value.enabled ? "yes" : "no"} configured=${value.configured ? "yes" : "no"} source=${value.tokenSource || "n/a"}`
    );
    if (value.defaultChannel) {
      lines.push(`defaultChannel=${value.defaultChannel}`);
    }
    if (value.updatedAt) {
      lines.push(`updatedAt=${value.updatedAt}`);
    }
    const conn = value.connection || {};
    lines.push(`connection=${conn.ok ? "ok" : "fail"}${conn.error ? ` (${conn.error})` : ""}`);
    if (value.workspace?.name) {
      lines.push(`workspace=${value.workspace.name}`);
    }
    if (value.botUser?.name) {
      lines.push(`botUser=${value.botUser.name}`);
    }
    lines.push(
      `policy: private=${policy.allowPrivateChannels ? "yes" : "no"} dm=${policy.allowDirectMessages ? "yes" : "no"} allowed=${allowedChannels.length ? allowedChannels.join(",") : "(any)"}`
    );
    return lines.join("\n");
  }

  async function refreshSlackStatus() {
    setSlackStatusText("Slack: checking...");
    try {
      const data = await api("/api/integrations/slack/status");
      setSlackStatusText(formatSlackStatus(data?.status || {}));
    } catch (error) {
      setSlackStatusText(`Slack status failed: ${error.message}`);
    }
  }

  function formatGoogleStatus(status) {
    const value = status && typeof status === "object" ? status : {};
    const allowed = Array.isArray(value.allowedAccounts) ? value.allowedAccounts : [];
    const accounts = Array.isArray(value.accounts) ? value.accounts : [];
    const scopes = Array.isArray(value.oauthScopes) ? value.oauthScopes : [];
    const lines = [];
    lines.push(`enabled=${value.enabled ? "yes" : "no"} configured=${value.configured ? "yes" : "no"} source=${value.configSource || "n/a"}`);
    if (value.updatedAt) {
      lines.push(`updatedAt=${value.updatedAt}`);
    }
    if (value.redirectUri) {
      lines.push(`redirectUri=${value.redirectUri}`);
    }
    if (scopes.length) {
      const shown = scopes.slice(0, 8).join(",");
      lines.push(`oauthScopes=${shown}${scopes.length > 8 ? `, ... (+${scopes.length - 8})` : ""}`);
    }
    if (allowed.length) {
      lines.push(`allowedAccounts=${allowed.join(",")}`);
    }
    if (accounts.length) {
      lines.push("connected:");
      for (const account of accounts.slice(0, 6)) {
        const email = String(account?.email || "").trim();
        const expiresAt = String(account?.expiresAt || "").trim();
        lines.push(`- ${email || "unknown"}${expiresAt ? ` (exp ${expiresAt})` : ""}`);
      }
      if (accounts.length > 6) {
        lines.push(`- ... (${accounts.length - 6} more)`);
      }
    } else {
      lines.push("connected: none");
    }
    return lines.join("\n");
  }

  async function refreshGoogleStatus() {
    setGoogleStatusText("Google: checking...");
    try {
      const data = await api("/api/integrations/google/status");
      setGoogleStatusText(formatGoogleStatus(data?.status || {}));
    } catch (error) {
      setGoogleStatusText(`Google status failed: ${error.message}`);
    }
  }

  function formatGcpStatus(status) {
    const value = status && typeof status === "object" ? status : {};
    const allowedProjects = Array.isArray(value.allowedProjects) ? value.allowedProjects : [];
    const scopes = Array.isArray(value.defaultScopes) ? value.defaultScopes : [];
    const lines = [];
    lines.push(`enabled=${value.enabled ? "yes" : "no"} configured=${value.configured ? "yes" : "no"} source=${value.configSource || "n/a"}`);
    if (value.clientEmail) {
      lines.push(`clientEmail=${value.clientEmail}`);
    }
    if (value.defaultProject) {
      lines.push(`defaultProject=${value.defaultProject}`);
    }
    if (allowedProjects.length) {
      lines.push(`allowedProjects=${allowedProjects.join(",")}`);
    }
    if (scopes.length) {
      const shown = scopes.slice(0, 8).join(",");
      lines.push(`defaultScopes=${shown}${scopes.length > 8 ? `, ... (+${scopes.length - 8})` : ""}`);
    }
    if (value.updatedAt) {
      lines.push(`updatedAt=${value.updatedAt}`);
    }
    return lines.join("\n");
  }

  async function refreshGcpStatus() {
    setGcpStatusText("GCP: checking...");
    try {
      const data = await api("/api/integrations/gcp/status");
      setGcpStatusText(formatGcpStatus(data?.status || {}));
    } catch (error) {
      setGcpStatusText(`GCP status failed: ${error.message}`);
    }
  }

  async function refreshIntegrations() {
    setIntegrationsHint("Refreshing integration status...");
    await Promise.all([
      refreshSlackStatus(),
      refreshGoogleStatus(),
      refreshGcpStatus()
    ]);
    setIntegrationsHint(`Refreshed at ${new Date().toLocaleTimeString()}`);
  }

  function getAndroidBridge() {
    try {
      return window.AsolariaAndroid || null;
    } catch {
      return null;
    }
  }

  function androidNativeNotify(title, message) {
    const bridge = getAndroidBridge();
    if (!bridge || typeof bridge.nativeNotify !== "function") {
      return "bridge_unavailable";
    }
    try {
      return String(bridge.nativeNotify(String(title || ""), String(message || "")) || "");
    } catch (error) {
      return `error:${error.message}`;
    }
  }

  function setAndroidStatusText(text) {
    if (!androidStatusBox) {
      return;
    }
    androidStatusBox.textContent = String(text || "");
  }

  function formatAndroidStatus(status) {
    const s = status && typeof status === "object" ? status : {};
    const lines = [];
    lines.push(`bridge=${s.ok ? "yes" : "no"} trusted=${s.trusted ? "yes" : "no"}`);
    if (s.baseUrl) {
      lines.push(`baseUrl=${s.baseUrl}`);
    }
    lines.push(`termuxInstalled=${s.termuxInstalled ? "yes" : "no"} runPerm=${s.termuxRunCommandGranted ? "yes" : "no"}`);
    lines.push(`fdroidInstalled=${s.fdroidInstalled ? "yes" : "no"}`);
    if (s.lastTermuxResult) {
      lines.push(`lastTermuxResult=${String(s.lastTermuxResult)}`);
    }
    if (!s.trusted) {
      if (s.pageUrl) {
        lines.push(`pageUrl=${s.pageUrl}`);
      }
      if (s.originalUrl) {
        lines.push(`originalUrl=${s.originalUrl}`);
      }
      if (s.lastStartedUrl) {
        lines.push(`lastStartedUrl=${s.lastStartedUrl}`);
      }
      if (s.lastFinishedUrl) {
        lines.push(`lastFinishedUrl=${s.lastFinishedUrl}`);
      }
      if (typeof s.trustedCached === "boolean") {
        lines.push(`trustedCached=${s.trustedCached ? "yes" : "no"}`);
      }
      lines.push("NOTE: Termux bridge is only enabled for trusted origins (loopback 127.0.0.1/localhost, or the exact Base URL configured in the Asolaria Android app when it points to private LAN/VPN host ranges, including Tailscale 100.64.0.0/10).");
    }
    return lines.join("\n");
  }

  function refreshAndroidStatus() {
    const bridge = getAndroidBridge();
    if (!bridge || typeof bridge.getStatus !== "function") {
      setAndroidStatusText("Phone: Android bridge not detected. Open this page inside the Asolaria Android app.");
      return;
    }
    try {
      const raw = String(bridge.getStatus() || "");
      const parsed = JSON.parse(raw);
      setAndroidStatusText(formatAndroidStatus(parsed));
    } catch (error) {
      setAndroidStatusText(`Phone status failed: ${error.message}`);
    }
  }

  function androidOpenTermux() {
    const bridge = getAndroidBridge();
    if (!bridge || typeof bridge.openTermux !== "function") {
      setAndroidStatusText("Open Termux failed: Android bridge not available.");
      return;
    }
    try {
      bridge.openTermux();
    } catch (error) {
      setAndroidStatusText(`Open Termux failed: ${error.message}`);
    }
  }

  function androidOpenFdroid() {
    const bridge = getAndroidBridge();
    if (!bridge || typeof bridge.openFdroid !== "function") {
      setAndroidStatusText("Open F-Droid failed: Android bridge not available.");
      return;
    }
    try {
      bridge.openFdroid();
    } catch (error) {
      setAndroidStatusText(`Open F-Droid failed: ${error.message}`);
    }
  }

  function androidRunTermux() {
    const bridge = getAndroidBridge();
    if (!bridge || typeof bridge.runTermux !== "function") {
      setAndroidStatusText("Run Termux failed: Android bridge not available.");
      return;
    }
    const cmd = String(androidTermuxCmdInput?.value || "").trim();
    if (!cmd) {
      setAndroidStatusText("Run Termux: enter a command first.");
      return;
    }
    try {
      const res = String(bridge.runTermux(cmd) || "");
      setAndroidStatusText(`Run Termux: ${res || "sent"}`);
    } catch (error) {
      setAndroidStatusText(`Run Termux failed: ${error.message}`);
    }
  }

  function androidStartSshd() {
    const bridge = getAndroidBridge();
    if (!bridge || typeof bridge.startSshd !== "function") {
      setAndroidStatusText("Start sshd failed: Android bridge not available.");
      return;
    }
    try {
      const res = String(bridge.startSshd() || "");
      setAndroidStatusText(`Start sshd: ${res || "sent"}`);
    } catch (error) {
      setAndroidStatusText(`Start sshd failed: ${error.message}`);
    }
  }

  function readSlackLimit() {
    const raw = Number(slackLimitInput?.value);
    if (!Number.isFinite(raw)) {
      return 40;
    }
    return Math.max(1, Math.min(200, Math.round(raw)));
  }

  function readSlackAnalyze() {
    const raw = String(slackAnalyzeSelect?.value || "1").trim();
    return raw !== "0" && raw.toLowerCase() !== "false";
  }

  async function runSlackChannels() {
    setIntegrationsHint("Slack channels: queuing...");
    try {
      const limit = Math.max(10, Math.min(200, readSlackLimit()));
      const data = await api(`/api/integrations/slack/channels?limit=${encodeURIComponent(String(limit))}`);
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("Slack channels queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`Slack channels job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`Slack channels done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`Slack channels failed: ${error.message}`);
    }
  }

  async function runSlackReview() {
    const channel = String(slackChannelInput?.value || "").trim();
    if (!channel) {
      setIntegrationsHint("Slack review: enter a channel (ex: #general).");
      return;
    }
    const limit = readSlackLimit();
    const analyze = readSlackAnalyze();
    setIntegrationsHint(`Slack review: queuing ${channel} last ${limit}...`);
    try {
      const data = await api("/api/integrations/slack/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          limit,
          analyze
        })
      });
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("Slack review queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`Slack review job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`Slack review done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`Slack review failed: ${error.message}`);
    }
  }

  function readGoogleLimit() {
    const raw = Number(googleLimitInput?.value);
    if (!Number.isFinite(raw)) {
      return 12;
    }
    return Math.max(1, Math.min(80, Math.round(raw)));
  }

  function readCalendarDays() {
    const raw = Number(calendarDaysInput?.value);
    if (!Number.isFinite(raw)) {
      return 7;
    }
    return Math.max(1, Math.min(60, Math.round(raw)));
  }

  async function startGoogleAuth() {
    const account = String(googleAccountInput?.value || "").trim();
    setIntegrationsHint("Google auth: starting...");
    try {
      const data = await api("/api/integrations/google/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account
        })
      });
      const url = String(data?.oauth?.authUrl || "").trim();
      lastGoogleAuthUrl = url;
      setGoogleAuthUrlText(url ? `OAuth URL:\n${url}` : "OAuth URL: (none)");
      setIntegrationsHint(url ? "Google auth URL ready. Open on desktop to complete." : "Google auth did not return a URL.");
    } catch (error) {
      setGoogleAuthUrlText("OAuth URL: (none)");
      setIntegrationsHint(`Google auth start failed: ${error.message}`);
    }
  }

  async function openGoogleAuthOnDesktop() {
    const url = String(lastGoogleAuthUrl || "").trim();
    if (!url) {
      setIntegrationsHint("No OAuth URL yet. Tap Auth Start first.");
      return;
    }
    setIntegrationsHint("Opening OAuth URL on desktop...");
    try {
      await api("/api/chrome/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      setIntegrationsHint("OAuth URL opened on desktop. Finish login, then tap Google Status.");
    } catch (error) {
      setIntegrationsHint(`Open OAuth failed: ${error.message}`);
    }
  }

  async function runGmailInbox() {
    const account = String(googleAccountInput?.value || "").trim();
    const limit = readGoogleLimit();
    setIntegrationsHint("Gmail inbox: queuing...");
    try {
      const data = await api(`/api/integrations/gmail/inbox?account=${encodeURIComponent(account)}&limit=${encodeURIComponent(String(limit))}`);
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("Gmail inbox queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`Gmail inbox job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`Gmail inbox done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`Gmail inbox failed: ${error.message}`);
    }
  }

  async function runGmailSearch() {
    const account = String(googleAccountInput?.value || "").trim();
    const q = String(gmailSearchInput?.value || "").trim();
    if (!q) {
      setIntegrationsHint("Gmail search: enter a query first.");
      return;
    }
    const limit = readGoogleLimit();
    setIntegrationsHint("Gmail search: queuing...");
    try {
      const data = await api(`/api/integrations/gmail/search?account=${encodeURIComponent(account)}&q=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}`);
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("Gmail search queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`Gmail search job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`Gmail search done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`Gmail search failed: ${error.message}`);
    }
  }

  async function runCalendarUpcoming() {
    const account = String(googleAccountInput?.value || "").trim();
    const limit = readGoogleLimit();
    const days = readCalendarDays();
    setIntegrationsHint("Calendar upcoming: queuing...");
    try {
      const data = await api(`/api/integrations/calendar/upcoming?account=${encodeURIComponent(account)}&limit=${encodeURIComponent(String(limit))}&days=${encodeURIComponent(String(days))}`);
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("Calendar upcoming queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`Calendar upcoming job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`Calendar upcoming done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`Calendar upcoming failed: ${error.message}`);
    }
  }

  async function runCalendarList() {
    const account = String(googleAccountInput?.value || "").trim();
    setIntegrationsHint("Calendar list: queuing...");
    try {
      const data = await api(`/api/integrations/calendar/list?account=${encodeURIComponent(account)}`);
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("Calendar list queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`Calendar list job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`Calendar list done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`Calendar list failed: ${error.message}`);
    }
  }

  async function runGoogleApiGet() {
    const account = String(googleAccountInput?.value || "").trim();
    const url = String(googleApiUrlInput?.value || "").trim();
    if (!url) {
      setIntegrationsHint("Google API: enter a URL first.");
      return;
    }
    setIntegrationsHint("Google API: queuing...");
    try {
      const data = await api("/api/integrations/google/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          url
        })
      });
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("Google API queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`Google API job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`Google API done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`Google API failed: ${error.message}`);
    }
  }

  function readGcpProject() {
    return String(gcpProjectInput?.value || "").trim();
  }

  async function runGcpEnabledApis() {
    const project = readGcpProject();
    setIntegrationsHint("GCP enabled APIs: queuing...");
    try {
      const url = `/api/integrations/gcp/services/enabled?project=${encodeURIComponent(project)}&pageSize=120`;
      const data = await api(url);
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("GCP enabled APIs queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`GCP enabled APIs job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`GCP enabled APIs done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`GCP enabled APIs failed: ${error.message}`);
    }
  }

  async function runGcpEnableService() {
    const project = readGcpProject();
    const serviceName = String(gcpServiceInput?.value || "").trim();
    if (!serviceName) {
      setIntegrationsHint("GCP enable: enter a service like gmail.googleapis.com");
      return;
    }
    setIntegrationsHint(`GCP enable: queuing ${serviceName}...`);
    try {
      const data = await api("/api/integrations/gcp/services/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          serviceName
        })
      });
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("GCP enable queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`GCP enable job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 240000);
      renderJobResult(done || null);
      setIntegrationsHint(`GCP enable done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`GCP enable failed: ${error.message}`);
    }
  }

  async function runGcpApiGet() {
    const url = String(gcpApiUrlInput?.value || "").trim();
    if (!url) {
      setIntegrationsHint("GCP API: enter a URL first.");
      return;
    }
    setIntegrationsHint("GCP API: queuing...");
    try {
      const data = await api("/api/integrations/gcp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "GET",
          url
        })
      });
      const jobId = String(data?.job?.id || data?.id || "").trim();
      if (!jobId) {
        setIntegrationsHint("GCP API queued, but no job id returned.");
        return;
      }
      setIntegrationsHint(`GCP API job ${jobId}. Waiting...`);
      const done = await waitForJob(jobId, 180000);
      renderJobResult(done || null);
      setIntegrationsHint(`GCP API done: ${done?.status || "unknown"}.`);
    } catch (error) {
      setIntegrationsHint(`GCP API failed: ${error.message}`);
    }
  }

  async function requestShutdown() {
    const delaySeconds = readPowerDelaySeconds();
    const data = await api("/api/power/shutdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delaySeconds })
    });
    return data;
  }

  async function requestRestart() {
    const delaySeconds = readPowerDelaySeconds();
    const data = await api("/api/power/restart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delaySeconds })
    });
    return data;
  }

  async function requestAbortShutdown() {
    const data = await api("/api/power/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    return data;
  }

  async function requestWakeDevice() {
    const name = String(wolTargetInput?.value || wolDeviceSelect?.value || "").trim();
    if (!name) {
      throw new Error("Enter a Wake-on-LAN device name first.");
    }
    const data = await api("/api/power/wol/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    return data;
  }

  function setWindowsStatus(text) {
    if (windowsStatus) {
      windowsStatus.textContent = String(text || "");
    }
  }

  function renderCaptureModeUi() {
    if (captureAllBtn) {
      captureAllBtn.textContent = captureAllMode ? "All Screens On" : "All Screens Off";
    }
    if (displaySelect) {
      displaySelect.disabled = captureAllMode;
    }
  }

  function rememberWindowTarget(info) {
    const id = Number(info?.id || 0);
    const title = String(info?.title || "").trim();
    if (id > 0) {
      selectedWindowId = id;
    }
    if (title) {
      selectedWindowTitle = title;
    }
  }

  function getWindowTarget(windowId, windowTitle) {
    const explicitId = Number(windowId || 0);
    const explicitTitle = String(windowTitle || "").trim();
    if (explicitId > 0 || explicitTitle) {
      return { windowId: explicitId, windowTitle: explicitTitle };
    }
    if (selectedWindowId > 0 || selectedWindowTitle) {
      return { windowId: selectedWindowId, windowTitle: selectedWindowTitle };
    }
    const search = String(windowSearchInput?.value || "").trim();
    if (search) {
      return { windowId: 0, windowTitle: search };
    }
    return null;
  }

  function setConnectionStatus(text) {
    if (connectionStatus) {
      connectionStatus.textContent = String(text || "Connection mode: unavailable");
    }
  }

  function renderControlStatus(control) {
    const info = control && typeof control === "object" ? control : {};
    controlArmed = Boolean(info.armed);
    const remainingMs = Number(info.remainingMs || 0);
    const seconds = Math.max(0, Math.round(remainingMs / 1000));
    const lastAction = String(info.lastAction || "").trim();
    const lastError = String(info.lastError || "").trim();
    const parts = [];
    parts.push(`Control: ${controlArmed ? `armed (${seconds}s left)` : "disarmed"}`);
    if (lastAction) {
      parts.push(`last=${lastAction}`);
    }
    if (lastError) {
      parts.push(`error=${lastError}`);
    }
    setControlStatus(parts.join(" | "));
  }

  function setTapControlEnabled(enabled) {
    controlTapEnabled = Boolean(enabled);
    if (tapControlToggleBtn) {
      tapControlToggleBtn.textContent = controlTapEnabled ? "Tap-to-Click On" : "Tap-to-Click Off";
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function ensurePushRegistration() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service worker is not supported on this browser.");
    }
    if (!pushRegistration) {
      pushRegistration = await navigator.serviceWorker.register(PUSH_SW_PATH);
      await navigator.serviceWorker.ready;
    }
    return pushRegistration;
  }

  function updateInstallPromptState() {
    if (!installAppBtn) {
      return;
    }
    const ready = Boolean(deferredInstallPrompt);
    installAppBtn.hidden = false;
    installAppBtn.disabled = false;
    installAppBtn.textContent = ready ? "Install App" : "Install (Menu)";
  }

  async function showInstallPrompt() {
    if (!deferredInstallPrompt) {
      setGlobalStatus("Install prompt not available yet. In Chrome, open menu (three dots) and use Add to Home screen / Install app.");
      return;
    }
    try {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch (error) {
      setGlobalStatus(`Install prompt failed: ${error.message}`);
    } finally {
      deferredInstallPrompt = null;
      updateInstallPromptState();
    }
  }

  function joinChannels(value) {
    if (!Array.isArray(value)) {
      return "";
    }
    return value.map((item) => {
      if (item && typeof item === "object") {
        const channel = String(item.channel || "").trim();
        const reason = String(item.reason || "").trim();
        if (channel && reason) {
          return `${channel}:${reason}`;
        }
        return channel || reason;
      }
      return String(item || "").trim();
    }).filter(Boolean).join(" > ");
  }

  function renderConnectionRouting(routing) {
    const info = routing && typeof routing === "object" ? routing : {};
    const selected = String(info?.selected?.channel || "n/a");
    const detected = joinChannels(info.detectedAvailable);
    const preferred = joinChannels(info.preferred);
    const allowed = joinChannels(info.filteredAvailable);
    const removed = joinChannels(info.removedChannels);
    const remoteBase = String(info.remoteBaseUrl || info.policy?.remoteBaseUrl || "").trim();
    if (remoteBaseInput && document.activeElement !== remoteBaseInput) {
      remoteBaseInput.value = remoteBase;
    }
    const parts = [
      `route=${selected}`,
      detected ? `detected=${detected}` : "",
      preferred ? `pref=${preferred}` : "",
      allowed ? `allowed=${allowed}` : "",
      removed ? `blocked=${removed}` : "",
      `remote=${remoteBase || "(auto LAN)"}`
    ].filter(Boolean);
    setConnectionStatus(parts.join(" | "));
  }

  async function applyConnectionProfile(profile) {
    const mode = String(profile || "").trim().toLowerCase();
    let payload = null;
    if (mode === "wifi") {
      payload = {
        preference: ["private_internet", "vpn", "usb"],
        available: ["usb", "vpn", "private_internet"],
        allowPublicInternet: false,
        publicInternetPrivate: false,
        remoteAuthRequired: true,
        requireEncryptedRemote: true,
        stealthDeny: true
      };
    } else if (mode === "internet") {
      payload = {
        preference: ["vpn", "private_internet", "public_internet", "usb"],
        available: ["usb", "vpn", "private_internet", "public_internet"],
        allowPublicInternet: true,
        publicInternetPrivate: true,
        remoteAuthRequired: true,
        requireEncryptedRemote: true,
        stealthDeny: true
      };
    } else if (mode === "usb") {
      payload = {
        preference: ["usb", "private_internet", "vpn"],
        available: ["usb", "vpn", "private_internet"],
        allowPublicInternet: false,
        publicInternetPrivate: false,
        remoteAuthRequired: true,
        requireEncryptedRemote: true,
        stealthDeny: true
      };
    }
    if (!payload) {
      return;
    }
    setConnectionStatus(`Applying profile: ${mode}...`);
    try {
      const data = await api("/api/mobile/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      renderConnectionRouting(data.connectionRouting || {});
      setGlobalStatus(`Connection profile saved: ${mode}`);
    } catch (error) {
      setConnectionStatus(`Connection profile failed: ${error.message}`);
    }
  }

  async function saveRemoteBaseUrl() {
    const remoteBaseUrl = String(remoteBaseInput?.value || "").trim();
    setConnectionStatus("Saving remote base URL...");
    try {
      const data = await api("/api/mobile/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remoteBaseUrl })
      });
      renderConnectionRouting(data.connectionRouting || {});
      setGlobalStatus("Remote base URL saved.");
    } catch (error) {
      setConnectionStatus(`Save URL failed: ${error.message}`);
    }
  }

  async function markVpnActive() {
    setConnectionStatus("Marking VPN active...");
    try {
      const data = await api("/api/policy/channel/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "vpn" })
      });
      renderConnectionRouting(data.connectionRouting || {});
      setGlobalStatus("VPN heartbeat recorded.");
    } catch (error) {
      setConnectionStatus(`VPN heartbeat failed: ${error.message}`);
    }
  }

  async function refreshPushStatus() {
    try {
      const status = await api("/api/mobile/push/status");
      const permission = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
      const bridge = getAndroidBridge();
      const nativeReady = Boolean(bridge && typeof bridge.nativeNotify === "function");
      setPushStatus(
        `Push: ${status.push?.enabled ? "server-ready" : "off"} | subscriptions=${status.push?.subscriptions ?? 0} | permission=${permission} | native=${nativeReady ? "ready" : "off"}`
      );
    } catch (error) {
      if (isAuthFailure(error)) {
        setPushStatus("Push: token invalid/expired. Paste current token and tap Save Token.");
        return;
      }
      setPushStatus(`Push: ${error.message}`);
    }
  }

  async function enablePushAlerts() {
    try {
      if (typeof Notification === "undefined" || !("PushManager" in window)) {
        const nativeResult = androidNativeNotify(
          "Asolaria Alerts Enabled",
          "Web push is unsupported here. Native alerts are enabled while this app is open."
        );
        if (nativeResult === "ok") {
          setPushStatus("Push API unsupported. Native in-app alerts are enabled.");
          await refreshPushStatus();
          return;
        }
        throw new Error(`Push unsupported and native alert bridge unavailable (${nativeResult || "unknown"}).`);
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(`Notification permission is ${permission}.`);
      }
      const registration = await ensurePushRegistration();
      const keyInfo = await api("/api/mobile/push/public-key");
      if (!keyInfo.publicKey) {
        throw new Error("Push public key is not available on server.");
      }
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyInfo.publicKey)
        });
      }
      await api("/api/mobile/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: navigator.userAgent
        })
      });
      setPushStatus("Push enabled. Alerts can arrive while screen is off.");
    } catch (error) {
      setPushStatus(`Enable push failed: ${error.message}`);
    }
    await refreshPushStatus();
  }

  async function disablePushAlerts() {
    try {
      const registration = await ensurePushRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api("/api/mobile/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      setPushStatus("Push disabled for this browser.");
    } catch (error) {
      setPushStatus(`Disable push failed: ${error.message}`);
    }
    await refreshPushStatus();
  }

  async function testPushAlerts() {
    setPushStatus("Push: sending test...");
    try {
      const data = await api("/api/mobile/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: "Test push from mobile console"
        })
      });
      const result = data?.result || {};
      let message = `Push: test sent | ok=${result.ok ? "true" : "false"} | sent=${result.sent ?? 0} | failed=${result.failed ?? 0}`;
      const nativeResult = androidNativeNotify(
        "Asolaria Test Alert",
        "Test alert from Asolaria mobile console."
      );
      if (nativeResult && nativeResult !== "bridge_unavailable") {
        message += ` | native=${nativeResult}`;
      }
      setPushStatus(message);
    } catch (error) {
      setPushStatus(`Push: test failed (${error.message})`);
    }
    await refreshPushStatus();
  }

  function maybeNotifyPendingApprovals(session) {
    const pending = Number(session?.pendingCount ?? 0);
    if (!Number.isFinite(pending)) {
      return;
    }
    if (pending <= 0) {
      lastNativePendingAlertCount = 0;
      return;
    }
    if (pending === lastNativePendingAlertCount) {
      return;
    }
    lastNativePendingAlertCount = pending;
    androidNativeNotify(
      "Asolaria Approvals Pending",
      `${pending} approval${pending === 1 ? "" : "s"} pending. Open Approval Center.`
    );
  }

  async function refreshSessionSummary() {
    if (!hasToken()) {
      lastNativePendingAlertCount = 0;
      return;
    }
    try {
      const session = await api(`/api/mobile/session?channel=${encodeURIComponent(detectChannel())}`);
      maybeNotifyPendingApprovals(session);
    } catch (_error) {
      // Ignore background poll failures; status UI is handled elsewhere.
    }
  }

  async function refreshControlStatus() {
    try {
      if (!hasToken()) {
        controlArmed = false;
        setControlStatus("Control: token required (paste token and tap Save Token)");
        return;
      }
      const data = await api("/api/mobile/control/status");
      renderControlStatus(data.control || {});
    } catch (error) {
      controlArmed = false;
      setControlStatus(`Control: ${error.message}`);
    }
  }

  async function armControl() {
    try {
      const data = await api("/api/mobile/control/arm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ttlMs: CONTROL_ARM_MS,
          by: "mobile-console"
        })
      });
      renderControlStatus(data.control || {});
    } catch (error) {
      setControlStatus(`Arm failed: ${error.message}`);
    }
  }

  async function disarmControl(reason) {
    try {
      const data = await api("/api/mobile/control/disarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason || "manual_disarm"
        })
      });
      renderControlStatus(data.control || {});
    } catch (error) {
      setControlStatus(`Disarm failed: ${error.message}`);
    }
  }

  function getNormalizedImagePoint(event) {
    if (!desktopImage) return null;
    const rect = desktopImage.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    let clientX = Number(event?.clientX);
    let clientY = Number(event?.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      const touch = event?.touches?.[0] || event?.changedTouches?.[0];
      clientX = Number(touch?.clientX);
      clientY = Number(touch?.clientY);
    }
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }
    const xNorm = (clientX - rect.left) / rect.width;
    const yNorm = (clientY - rect.top) / rect.height;
    return {
      xNorm: Math.max(0, Math.min(1, xNorm)),
      yNorm: Math.max(0, Math.min(1, yNorm))
    };
  }

  async function sendControlClick(point, options = {}) {
    if (!point) {
      return;
    }
    const payload = {
      xNorm: point.xNorm,
      yNorm: point.yNorm,
      button: options.button || "left",
      doubleClick: Boolean(options.doubleClick),
      displayIndex: Number.isInteger(activeDisplayIndex) ? activeDisplayIndex : -1
    };
    const data = await api("/api/mobile/control/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderControlStatus(data.control || {});
  }

  async function sendControlScroll(direction) {
    const data = await api("/api/mobile/control/scroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: direction === "up" ? "up" : "down",
        steps: direction === "up" ? 3 : -3,
        displayIndex: Number.isInteger(activeDisplayIndex) ? activeDisplayIndex : -1
      })
    });
    renderControlStatus(data.control || {});
  }

  async function sendControlKey(key) {
    const data = await api("/api/mobile/control/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
    renderControlStatus(data.control || {});
  }

  async function sendControlType() {
    const text = String(typeInput?.value || "");
    if (!text.trim()) {
      setControlStatus("Type: enter text first.");
      return;
    }
    const data = await api("/api/mobile/control/type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (typeInput) {
      typeInput.value = "";
    }
    renderControlStatus(data.control || {});
  }

  async function refreshDisplays() {
    try {
      const data = await api("/api/mobile/screen/displays");
      const displays = Array.isArray(data.displays) ? data.displays : [];
      displaySessionId = String(data.sessionId || "").trim();
      if (displaySelect) {
        const previous = Number(displaySelect.value);
        const storedIndex = getStoredDisplayIndex();
        const storedDeviceName = getStoredDisplayDeviceName();
        displaySelect.innerHTML = "";
        const primaryOpt = document.createElement("option");
        primaryOpt.value = "-1";
        primaryOpt.textContent = "Primary Screen";
        primaryOpt.dataset.deviceName = "";
        displaySelect.appendChild(primaryOpt);
        for (const row of displays) {
          const index = Number(row?.index);
          const width = Number(row?.width || 0);
          const height = Number(row?.height || 0);
          const left = Number(row?.left || 0);
          const top = Number(row?.top || 0);
          const deviceName = String(row?.deviceName || "").trim();
          const primary = row?.primary ? " (Primary)" : "";
          const dimsText = (width > 0 && height > 0) ? `${width}x${height}` : "size n/a";
          const opt = document.createElement("option");
          opt.value = String(index);
          opt.dataset.deviceName = deviceName;
          opt.textContent = `Display ${index}${primary} ${dimsText}`;
          opt.title = `${deviceName ? `${deviceName} ` : ""}@ ${left},${top}`.trim();
          displaySelect.appendChild(opt);
        }

        let chosen = -1;
        let chosenDeviceName = "";
        const deviceCandidates = [
          String(activeDisplayDeviceName || "").trim(),
          String(storedDeviceName || "").trim()
        ];
        for (const candidateName of deviceCandidates) {
          if (!candidateName) continue;
          const match = displays.find((row) => String(row?.deviceName || "").trim().toLowerCase() === candidateName.toLowerCase());
          if (match && displaySelect.querySelector(`option[value="${Number(match.index)}"]`)) {
            chosen = Number(match.index);
            chosenDeviceName = String(match.deviceName || "").trim();
            break;
          }
        }

        if (!displaySelect.querySelector(`option[value="${chosen}"]`)) {
          const candidates = [];
          if (Number.isInteger(activeDisplayIndex)) candidates.push(activeDisplayIndex);
          if (Number.isInteger(previous)) candidates.push(previous);
          if (Number.isInteger(storedIndex)) candidates.push(storedIndex);
          if (Number.isInteger(Number(data.primaryIndex))) candidates.push(Number(data.primaryIndex));
          candidates.push(-1);

          chosen = -1;
          for (const candidate of candidates) {
            if (displaySelect.querySelector(`option[value="${candidate}"]`)) {
              chosen = candidate;
              break;
            }
          }
        }

        displaySelect.value = String(chosen);
        const selectedOption = displaySelect.selectedOptions?.[0];
        activeDisplayIndex = Number.isInteger(Number(chosen)) ? Number(chosen) : -1;
        activeDisplayDeviceName = String(selectedOption?.dataset?.deviceName || chosenDeviceName || "").trim();
        setStoredDisplayIndex(activeDisplayIndex);
        setStoredDisplayDeviceName(activeDisplayDeviceName);
      }
    } catch (error) {
      setGlobalStatus(`Display list failed: ${error.message}`);
    }
  }

  function renderWindowList(rows) {
    if (!windowList) return;
    const items = Array.isArray(rows) ? rows : [];
    windowList.innerHTML = "";
    if (items.length < 1) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No visible windows found.";
      windowList.appendChild(empty);
      return;
    }
    for (const row of items) {
      const id = Number(row?.id || 0);
      const process = String(row?.process || "");
      const title = String(row?.title || "").trim();
      const item = document.createElement("article");
      item.className = "item";
      item.setAttribute("data-window-id", String(id));
      item.setAttribute("data-window-title", title);
      if (selectedWindowId > 0 && id === selectedWindowId) {
        item.style.borderColor = "#2d7ca0";
      }
      item.innerHTML = `
        <div class="msg-role">${process || "window"} | pid=${id}</div>
        <div class="msg-text"></div>
        <div class="row" style="margin-top:8px;margin-bottom:0;">
          <button type="button" data-window-focus="${id}" class="accent">Focus</button>
          <button type="button" data-window-min="${id}">Min</button>
          <button type="button" data-window-max="${id}">Max</button>
        </div>
      `;
      const textNode = item.querySelector(".msg-text");
      if (textNode) {
        textNode.textContent = title || "(untitled window)";
      }
      windowList.appendChild(item);
    }
  }

  async function refreshWindows(options = {}) {
    try {
      const defaultLimit = Number(getNetworkTuning().windowsLimit || 14);
      const requestedLimit = Number(options?.limit || defaultLimit);
      const limit = Math.max(4, Math.min(40, Math.round(Number.isFinite(requestedLimit) ? requestedLimit : defaultLimit)));
      const data = await api(`/api/mobile/windows?limit=${encodeURIComponent(String(limit))}`);
      const windows = Array.isArray(data.windows) ? data.windows : [];
      const activeTitle = String(data?.activeWindow?.title || "").trim();
      const activePreview = activeTitle ? activeTitle.replace(/\s+/g, " ").slice(0, 60) : "";
      if (selectedWindowId < 1 && windows.length > 0) {
        const first = windows[0] || {};
        selectedWindowId = Number(first.id || 0);
        selectedWindowTitle = String(first.title || "").trim();
      }
      if (selectedWindowId > 0 && !windows.some((row) => Number(row?.id || 0) === selectedWindowId)) {
        selectedWindowId = 0;
      }
      renderWindowList(windows);
      const selectedText = selectedWindowId > 0 ? ` | selected=${selectedWindowId}` : "";
      const activeText = activePreview ? ` | active=${activePreview}` : "";
      setWindowsStatus(`Windows: ${windows.length} visible${selectedText}${activeText}.`);
    } catch (error) {
      setWindowsStatus(`Windows failed: ${error.message}`);
    }
  }

  async function focusWindow(windowId, windowTitle) {
    const target = getWindowTarget(windowId, windowTitle);
    if (!target) {
      throw new Error("Choose a window first (tap Focus on a row or type a title).");
    }
    const payload = {};
    if (target.windowId > 0) payload.windowId = Number(target.windowId);
    if (target.windowTitle) payload.windowTitle = String(target.windowTitle);
    const data = await api("/api/mobile/windows/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderControlStatus(data.control || {});
    const windowInfo = data?.result?.window || {};
    rememberWindowTarget(windowInfo);
    const title = String(windowInfo?.title || "").trim();
    setWindowsStatus(title ? `Focused: ${title}` : "Focused window.");
  }

  async function runWindowAction(action, windowId, windowTitle) {
    const target = getWindowTarget(windowId, windowTitle);
    if (!target) {
      throw new Error("Choose a window first (tap Focus on a row or type a title).");
    }
    const payload = { action };
    if (target.windowId > 0) payload.windowId = Number(target.windowId);
    if (target.windowTitle) payload.windowTitle = String(target.windowTitle);
    const data = await api("/api/mobile/windows/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderControlStatus(data.control || {});
    const windowInfo = data?.result?.window || {};
    rememberWindowTarget(windowInfo);
    const title = String(windowInfo?.title || "").trim();
    const actionText = String(windowInfo?.action || action || "").replace("window_", "");
    setWindowsStatus(title ? `${actionText}: ${title}` : `${actionText} executed.`);
  }

  async function focusWindowBySearch() {
    const query = String(windowSearchInput?.value || "").trim();
    if (!query) {
      setWindowsStatus("Enter part of the window title first.");
      return;
    }
    try {
      await focusWindow(0, query);
      await refreshWindows();
    } catch (error) {
      setWindowsStatus(`Focus failed: ${error.message}`);
    }
  }

  async function runControlDiagnostics() {
    setControlDiagnosticsStatus("Diagnostics: running...");
    try {
      const data = await api("/api/mobile/control/diagnostics");
      const diagnostics = data?.diagnostics || {};
      const displays = diagnostics?.checks?.displays || {};
      const windows = diagnostics?.checks?.windows || {};
      const parts = [
        `Diagnostics: ${data?.ready ? "ready" : "degraded"}`,
        `display=${displays.ok ? `ok(${Number(displays.count || 0)})` : "fail"}`,
        `windows=${windows.ok ? `ok(${Number(windows.count || 0)})` : "fail"}`,
        `armed=${diagnostics?.control?.armed ? "yes" : "no"}`
      ];
      if (!displays.ok && displays.error) {
        parts.push(`displayErr=${String(displays.error).slice(0, 80)}`);
      }
      if (!windows.ok && windows.error) {
        parts.push(`windowErr=${String(windows.error).slice(0, 80)}`);
      }
      setControlDiagnosticsStatus(parts.join(" | "));
      if (diagnostics?.control) {
        renderControlStatus(diagnostics.control);
      }
      if (windows.ok && Array.isArray(windows.windows) && windows.windows.length > 0) {
        renderWindowList(windows.windows);
      }
    } catch (error) {
      setControlDiagnosticsStatus(`Diagnostics failed: ${error.message}`);
    }
  }

  function riskClass(level) {
    const value = String(level || "low").toLowerCase();
    if (value === "critical") return "risk-critical";
    if (value === "high") return "risk-high";
    if (value === "medium") return "risk-medium";
    return "risk-low";
  }

  function renderApprovals(rows) {
    const approvals = Array.isArray(rows) ? rows : [];
    approvalList.innerHTML = "";
    if (approvals.length < 1) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No pending approvals.";
      approvalList.appendChild(empty);
      return;
    }

    for (const item of approvals) {
      const id = String(item?.id || "");
      const risk = String(item?.risk?.level || "low").toLowerCase();
      const preview = String(item?.messagePreview || "(no preview)");

      const node = document.createElement("article");
      node.className = "item";
      node.innerHTML = `
        <div class="approval-top">
          <span class="approval-id">${id}</span>
          <span class="badge ${riskClass(risk)}">${risk}</span>
        </div>
        <div class="msg-text">${preview}</div>
        <div class="row" style="margin-top:8px;margin-bottom:0;">
          <button type="button" data-action="approve" data-id="${id}" class="ok">Approve</button>
          <button type="button" data-action="approve_run" data-id="${id}" class="ok">Approve + Run</button>
          <button type="button" data-action="deny" data-id="${id}" class="no">Deny</button>
        </div>
      `;
      approvalList.appendChild(node);
    }
  }

  function renderMemory(turns) {
    const rows = Array.isArray(turns) ? turns : [];
    memoryList.innerHTML = "";
    if (rows.length < 1) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No memory yet.";
      memoryList.appendChild(empty);
      return;
    }

    for (const turn of rows.slice(-18).reverse()) {
      const role = String(turn?.role || "system").toUpperCase();
      const text = String(turn?.text || "").trim() || "(empty)";
      const at = turn?.at ? new Date(turn.at).toLocaleString() : "";
      const source = String(turn?.meta?.source || "").trim();
      const provider = String(turn?.meta?.provider || "").trim();
      const sourceTag = [
        source ? `src:${source}` : "",
        provider ? `provider:${provider}` : ""
      ].filter(Boolean).join(" | ");
      const node = document.createElement("article");
      node.className = "item";
      node.innerHTML = `
        <div class="msg-role">${[role, sourceTag, at].filter(Boolean).join(" | ")}</div>
        <div class="msg-text"></div>
      `;
      node.querySelector(".msg-text").textContent = text;
      memoryList.appendChild(node);
    }
  }

  function setNotebookStatus(text) {
    if (!notebookStatus) return;
    notebookStatus.textContent = String(text || "");
  }

  function escapeHtml(text) {
    const value = String(text || "");
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderNotebook(notes) {
    const rows = Array.isArray(notes) ? notes : [];
    if (!notebookList) return;
    notebookList.innerHTML = "";
    if (rows.length < 1) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No notebook notes yet.";
      notebookList.appendChild(empty);
      return;
    }

    for (const note of rows.slice(0, 18)) {
      const id = String(note?.id || "");
      const title = String(note?.title || "(untitled)");
      const tags = Array.isArray(note?.tags) ? note.tags.map((t) => String(t || "").trim()).filter(Boolean) : [];
      const pinned = Boolean(note?.pinned);
      const sensitive = Boolean(note?.sensitive);
      const body = String(note?.text || "").trim() || "(empty)";
      const at = note?.updatedAt ? new Date(note.updatedAt).toLocaleString() : (note?.createdAt ? new Date(note.createdAt).toLocaleString() : "");
      const badges = [
        pinned ? "pinned" : "",
        sensitive ? "sensitive" : ""
      ].filter(Boolean).join(" | ");
      const meta = [id, badges, at].filter(Boolean).join(" | ");
      const tagText = tags.length > 0 ? `tags: ${tags.slice(0, 6).join(", ")}` : "";

      const node = document.createElement("article");
      node.className = "item";
      node.innerHTML = `
        <div class="msg-role">${escapeHtml(meta)}</div>
        <div class="msg-text"></div>
        <div class="hint" style="margin-top:6px;">${escapeHtml(tagText)}</div>
        <div class="row" style="margin-top:8px;margin-bottom:0;">
          <button type="button" data-action="pin" data-id="${escapeHtml(id)}" data-pinned="${pinned ? "1" : "0"}" class="accent">${pinned ? "Unpin" : "Pin"}</button>
          <button type="button" data-action="delete" data-id="${escapeHtml(id)}" class="no">Delete</button>
          <span class="hint" style="margin-left:auto;">${escapeHtml(title)}</span>
        </div>
      `;
      node.querySelector(".msg-text").textContent = body;
      notebookList.appendChild(node);
    }
  }

  function setTaskLedgerStatus(text) {
    if (!taskLedgerStatus) return;
    taskLedgerStatus.textContent = String(text || "");
  }

  function formatTaskLedgerStatus(status) {
    return String(status || "planned").replace(/_/g, " ");
  }

  function renderTaskLedger(tasks) {
    const rows = Array.isArray(tasks) ? tasks : [];
    if (!taskLedgerList) return;
    taskLedgerList.innerHTML = "";
    if (rows.length < 1) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No tasks yet.";
      taskLedgerList.appendChild(empty);
      return;
    }

    for (const task of rows.slice(0, 20)) {
      const id = String(task?.id || "");
      const title = String(task?.title || "(untitled)");
      const description = String(task?.description || "").trim();
      const status = String(task?.status || "planned").toLowerCase();
      const priority = String(task?.priority || "normal").toLowerCase();
      const progress = Math.max(0, Math.min(100, Number(task?.progress || 0)));
      const archived = Boolean(task?.archived);
      const at = task?.updatedAt
        ? new Date(task.updatedAt).toLocaleString()
        : (task?.createdAt ? new Date(task.createdAt).toLocaleString() : "");
      const meta = [
        id,
        `${formatTaskLedgerStatus(status)} | ${priority} | ${progress}%`,
        at
      ].filter(Boolean).join(" | ");
      const bodyText = description ? `${title}\n${description}` : title;

      const actions = [];
      if (!archived && status !== "in_progress") actions.push(`<button type="button" data-task-action="start" data-id="${escapeHtml(id)}" class="ok">Start</button>`);
      if (!archived && status !== "review") actions.push(`<button type="button" data-task-action="review" data-id="${escapeHtml(id)}" class="accent">Review</button>`);
      if (!archived && status !== "blocked") actions.push(`<button type="button" data-task-action="block" data-id="${escapeHtml(id)}" class="warn">Block</button>`);
      if (!archived && status !== "done") actions.push(`<button type="button" data-task-action="done" data-id="${escapeHtml(id)}" class="ok">Done</button>`);
      if (!archived) {
        actions.push(`<button type="button" data-task-action="archive" data-id="${escapeHtml(id)}" class="no">Archive</button>`);
      } else {
        actions.push(`<button type="button" data-task-action="unarchive" data-id="${escapeHtml(id)}" class="accent">Unarchive</button>`);
      }
      actions.push(`<button type="button" data-task-action="note" data-id="${escapeHtml(id)}">Note</button>`);

      const node = document.createElement("article");
      node.className = "item";
      node.innerHTML = `
        <div class="msg-role">${escapeHtml(meta)}</div>
        <div class="msg-text"></div>
        <div class="row task-actions">${actions.join("")}</div>
      `;
      node.querySelector(".msg-text").textContent = bodyText;
      taskLedgerList.appendChild(node);
    }
  }

  function renderTaskLedgerEvents(events) {
    const rows = Array.isArray(events) ? events : [];
    if (!taskLedgerEvents) return;
    taskLedgerEvents.innerHTML = "";
    if (rows.length < 1) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No recent task events.";
      taskLedgerEvents.appendChild(empty);
      return;
    }

    for (const event of rows.slice(0, 10)) {
      const at = event?.at ? new Date(event.at).toLocaleString() : "";
      const meta = [
        String(event?.taskId || ""),
        String(event?.type || "task_event"),
        String(event?.actor || "system"),
        at
      ].filter(Boolean).join(" | ");
      const text = String(event?.note || "").trim() || "(no note)";
      const node = document.createElement("article");
      node.className = "item";
      node.innerHTML = `
        <div class="msg-role">${escapeHtml(meta)}</div>
        <div class="msg-text"></div>
      `;
      node.querySelector(".msg-text").textContent = text;
      taskLedgerEvents.appendChild(node);
    }
  }

  function buildTaskLedgerStatePath() {
    const params = new URLSearchParams();
    params.set("taskLimit", "24");
    params.set("eventLimit", "10");
    params.set("taskStatus", String(taskLedgerStatusFilter?.value || "all").trim().toLowerCase());
    params.set("taskPriority", String(taskLedgerPriorityFilter?.value || "all").trim().toLowerCase());
    params.set("includeArchived", String(Boolean(taskLedgerIncludeArchived?.checked)));
    const query = String(taskLedgerSearchInput?.value || "").trim();
    if (query) {
      params.set("taskQuery", query);
    }
    return `/api/task-ledger/state?${params.toString()}`;
  }

  async function refreshTaskLedger() {
    if (!taskLedgerList || !taskLedgerEvents) return;
    const data = await api(buildTaskLedgerStatePath());
    const ledger = data.ledger || {};
    const summary = ledger.summary || {};
    setTaskLedgerStatus(
      `Open ${summary.openTasks || 0} | Total ${summary.totalTasks || 0} | Archived ${summary.archivedTasks || 0} | Events ${summary.eventsCount || 0}`
    );
    renderTaskLedger(ledger.tasks || []);
    renderTaskLedgerEvents(ledger.events || []);
  }

  async function addTaskLedgerFromUi() {
    const title = String(taskLedgerTitleInput?.value || "").trim();
    const description = String(taskLedgerDescriptionInput?.value || "").trim();
    if (!title && !description) {
      setTaskLedgerStatus("Task title or description is required.");
      return;
    }
    setTaskLedgerStatus("Saving task...");
    const data = await api("/api/task-ledger/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        priority: String(taskLedgerCreatePriority?.value || "normal"),
        actor: "mobile-console",
        source: "mobile-console"
      })
    });
    if (taskLedgerTitleInput) taskLedgerTitleInput.value = "";
    if (taskLedgerDescriptionInput) taskLedgerDescriptionInput.value = "";
    setTaskLedgerStatus(`Task saved: ${data?.task?.id || "ok"}`);
    await refreshTaskLedger();
  }

  async function runTaskLedgerAction(action, id) {
    const taskId = String(id || "").trim();
    const mode = String(action || "").trim().toLowerCase();
    if (!taskId || !mode) return;
    if (mode === "archive") {
      await api(`/api/task-ledger/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
      return;
    }
    if (mode === "unarchive") {
      await api(`/api/task-ledger/tasks/${encodeURIComponent(taskId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archived: false,
          status: "planned",
          actor: "mobile-console",
          source: "mobile-console",
          note: "Unarchived from mobile console."
        })
      });
      return;
    }
    if (mode === "note") {
      const note = window.prompt("Task event note:");
      if (note === null) return;
      await api(`/api/task-ledger/tasks/${encodeURIComponent(taskId)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task_note",
          note: String(note || "").trim() || "Mobile note.",
          actor: "mobile-console",
          source: "mobile-console"
        })
      });
      return;
    }
    const nextStatusByAction = {
      start: "in_progress",
      review: "review",
      block: "blocked",
      done: "done"
    };
    const nextStatus = nextStatusByAction[mode];
    if (!nextStatus) {
      throw new Error(`Unsupported task action: ${mode}`);
    }
    await api(`/api/task-ledger/tasks/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        actor: "mobile-console",
        source: "mobile-console",
        note: `Status set to ${nextStatus} from mobile console.`
      })
    });
  }

  async function decideApproval(id, decision, execute) {
    try {
      if (decision === "approve") {
        await api(`/api/mobile/approvals/${encodeURIComponent(id)}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ execute: Boolean(execute), by: "mobile-console" })
        });
      } else {
        await api(`/api/mobile/approvals/${encodeURIComponent(id)}/deny`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ by: "mobile-console" })
        });
      }
      await refreshApprovals();
      await refreshMemory();
    } catch (error) {
      const message = String(error?.message || "Approval decision failed.");
      if (/not found/i.test(message)) {
        await refreshApprovals().catch(() => {});
        setGlobalStatus("Approval no longer exists (already used/expired). Refresh and try a current pending item.");
        return;
      }
      setGlobalStatus(`Approval decision failed: ${message}`);
    }
  }

  async function refreshApprovals() {
    const data = await api("/api/mobile/approvals?status=pending&limit=8");
    renderApprovals(data.approvals || []);
  }

  function applyScreenSnapshot(snapshot) {
    if (!snapshot) {
      screenMeta.textContent = "No capture yet. Tap Capture Now.";
      desktopImage.removeAttribute("src");
      return;
    }
    // Backward/forward compatible: API may expose either displayIndex or screenIndex.
    const displayIndex = Number(snapshot.displayIndex ?? snapshot.screenIndex ?? -1);
    const displayDeviceName = String(snapshot.displayDeviceName || "").trim();
    const snapshotDisplaySessionId = String(snapshot.displaySessionId || "").trim();
    const captureAll = Boolean(snapshot.captureAll);
    if (!captureAll && snapshotDisplaySessionId) {
      displaySessionId = snapshotDisplaySessionId;
    }
    if (!captureAll) {
      activeDisplayIndex = Number.isInteger(displayIndex) ? displayIndex : -1;
      if (displayDeviceName) {
        activeDisplayDeviceName = displayDeviceName;
      }
      setStoredDisplayIndex(activeDisplayIndex);
      setStoredDisplayDeviceName(activeDisplayDeviceName);
      if (displaySelect && Number.isInteger(activeDisplayIndex) && displaySelect.querySelector(`option[value="${activeDisplayIndex}"]`)) {
        displaySelect.value = String(activeDisplayIndex);
        const selectedOption = displaySelect.selectedOptions?.[0];
        const selectedDeviceName = String(selectedOption?.dataset?.deviceName || "").trim();
        if (selectedDeviceName) {
          activeDisplayDeviceName = selectedDeviceName;
          setStoredDisplayDeviceName(activeDisplayDeviceName);
        }
      }
    }
    const capturedAt = snapshot.capturedAt ? new Date(snapshot.capturedAt).toLocaleString() : "unknown";
    const sizeText = snapshot.sizeBytes ? `${Math.round(snapshot.sizeBytes / 1024)} KB` : "size n/a";
    const displayDeviceText = !captureAll && activeDisplayDeviceName ? ` (${activeDisplayDeviceName})` : "";
    const displayText = captureAll
      ? "all displays"
      : activeDisplayIndex >= 0
        ? `display ${activeDisplayIndex}${displayDeviceText}`
        : "primary";
    screenMeta.textContent = `Captured ${capturedAt} | ${sizeText} | ${displayText} | age ${Math.round((snapshot.ageMs || 0) / 1000)}s`;
    const baseImage = snapshot.imageUrl || "/api/mobile/screen/image";
    desktopImage.src = buildAuthedUrl(baseImage, { v: snapshot.capturedAtMs || Date.now() });
  }

  async function refreshScreenStatus() {
    const status = await api("/api/mobile/screen/status");
    applyScreenSnapshot(status.snapshot || null);
  }

  async function captureScreen(force, options = {}) {
    const skipIfBusy = Boolean(options.skipIfBusy);
    if (Object.prototype.hasOwnProperty.call(options, "captureAll")) {
      captureAllMode = Boolean(options.captureAll);
      renderCaptureModeUi();
    }
    const selectedTarget = getSelectedDisplayTarget();
    const preferredDisplay = Number.isInteger(selectedTarget.index) && selectedTarget.index >= 0
      ? selectedTarget.index
      : (Number.isInteger(activeDisplayIndex) && activeDisplayIndex >= 0 ? activeDisplayIndex : -1);
    const preferredDeviceName = String(selectedTarget.deviceName || activeDisplayDeviceName || "").trim();
    const preferredSessionId = String(displaySessionId || "").trim();
    if (captureRequestPromise) {
      if (skipIfBusy) {
        return captureRequestPromise;
      }
      await captureRequestPromise.catch(() => {});
    }
    const payload = {
      force: Boolean(force),
      maxAgeMs: force ? 0 : 900
    };
    if (captureAllMode) {
      payload.captureAll = true;
      payload.displayIndex = -1;
      payload.displayDeviceName = "";
      payload.displaySessionId = "";
      // Avoid runaway disk usage by using a stable filename during live refresh.
      payload.fileName = "desktop-all-latest.png";
    } else if (preferredDisplay >= 0) {
      payload.displayIndex = preferredDisplay;
      if (preferredDeviceName) {
        payload.displayDeviceName = preferredDeviceName;
      }
      if (preferredSessionId) {
        payload.displaySessionId = preferredSessionId;
      }
      // Keep per-display latest snapshots bounded (no timestamp spam).
      payload.fileName = `desktop-display${preferredDisplay}-latest.png`;
    } else {
      payload.displayIndex = -1;
      if (preferredDeviceName) {
        payload.displayDeviceName = preferredDeviceName;
      }
      if (preferredSessionId) {
        payload.displaySessionId = preferredSessionId;
      }
      payload.fileName = "desktop-latest.png";
    }
    const requestPromise = api("/api/mobile/screen/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then((data) => {
      applyScreenSnapshot(data.snapshot || null);
      return data;
    }).finally(() => {
      if (captureRequestPromise === requestPromise) {
        captureRequestPromise = null;
      }
    });
    captureRequestPromise = requestPromise;
    return requestPromise;
  }

  function setAutoRefresh(enabled) {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    if (enabled) {
      const refreshMs = Math.max(1200, Number(getNetworkTuning().autoRefreshMs || 2200));
      autoRefreshTimer = setInterval(() => {
        if (!hasToken()) {
          return;
        }
        captureScreen(true, { skipIfBusy: true }).catch((error) => {
          if (isAuthFailure(error)) {
            setAutoRefresh(false);
            setGlobalStatus("Token invalid/expired. Paste current mobile approval token and tap Save Token.");
            setConnectionStatus("Connection mode: token invalid/expired.");
            return;
          }
          if (isCaptureInProgressError(error)) {
            return;
          }
          const message = String(error?.message || "");
          setGlobalStatus(`Live refresh warning: ${message}`);
        });
      }, refreshMs);
      toggleAutoBtn.textContent = "Live Refresh On";
      return;
    }
    toggleAutoBtn.textContent = "Live Refresh Off";
  }

  async function waitForJob(jobId, timeoutMs) {
    const deadline = Date.now() + Number(timeoutMs || 120000);
    let last = null;
    while (Date.now() < deadline) {
      const data = await api(`/api/jobs/${encodeURIComponent(jobId)}`);
      const job = data.job || {};
      last = job;
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    return last;
  }

  async function refreshMemory() {
    const data = await api("/api/memory?limit=24&clean=true");
    renderMemory(data.memory?.turns || []);
  }

  async function refreshNotebook() {
    if (!notebookList) return;
    const data = await api("/api/notebook/notes?limit=24");
    renderNotebook(data.notebook?.notes || []);
  }

  async function searchNotebook() {
    if (!notebookList) return;
    const q = String(notebookSearchInput?.value || "").trim();
    if (!q) {
      setNotebookStatus("Showing recent notes.");
      await refreshNotebook();
      return;
    }
    setNotebookStatus("Searching...");
    const data = await api(`/api/notebook/search?q=${encodeURIComponent(q)}&limit=24`);
    renderNotebook(data.matches || []);
    setNotebookStatus(`Search: ${q} (${data.count || 0})`);
  }

  function clearNotebookInputs() {
    if (notebookTitleInput) notebookTitleInput.value = "";
    if (notebookTagsInput) notebookTagsInput.value = "";
    if (notebookTextInput) notebookTextInput.value = "";
    if (notebookSearchInput) notebookSearchInput.value = "";
    setNotebookStatus("");
  }

  async function addNotebookFromUi() {
    const title = String(notebookTitleInput?.value || "").trim();
    const tags = String(notebookTagsInput?.value || "").trim();
    const text = String(notebookTextInput?.value || "").trim();
    if (!title && !text) {
      setNotebookStatus("Title or note text is required.");
      return;
    }
    setNotebookStatus("Saving...");
    const data = await api("/api/notebook/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        tags,
        text
      })
    });
    if (data.warning) {
      setNotebookStatus(data.warning);
    } else {
      setNotebookStatus("Saved.");
    }
    if (notebookTextInput) notebookTextInput.value = "";
    await refreshNotebook();
  }

  async function sendChat() {
    const message = String(chatInput?.value || "").trim();
    if (!message) return;
    setChatStatus("Preparing...");
    try {
      const payload = { message };
      if (attachScreenEnabled) {
        const selectedTarget = getSelectedDisplayTarget();
        payload.includeScreen = true;
        payload.includeScreenMaxAgeMs = 1600;
        payload.includeScreenCaptureAll = captureAllMode;
        payload.includeScreenDisplayIndex = captureAllMode
          ? -1
          : (Number.isInteger(selectedTarget.index) ? selectedTarget.index : activeDisplayIndex);
        payload.includeScreenDisplayDeviceName = captureAllMode
          ? ""
          : String(selectedTarget.deviceName || activeDisplayDeviceName || "");
        payload.includeScreenDisplaySessionId = captureAllMode ? "" : String(displaySessionId || "");
      }

      if ((chatFiles?.files?.length || 0) > 0) {
        setChatStatus(`Uploading ${chatFiles.files.length} file(s)...`);
        const uploaded = await uploadSelectedChatFiles();
        if (uploaded.images.length > 0) {
          payload.images = uploaded.images;
        }
        if (uploaded.files.length > 0) {
          payload.files = uploaded.files;
        }
        if (uploaded.skipped > 0) {
          setGlobalStatus(`Skipped ${uploaded.skipped} file(s) over 5MB.`);
        }
      }

      setChatStatus("Sending...");
      const data = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      chatInput.value = "";
      if (chatFiles) chatFiles.value = "";
      setChatFileStatus();

      if (data.job?.id) {
        setChatStatus(`Queued job ${data.job.id}. Waiting...`);
        const done = await waitForJob(data.job.id, 180000);
        renderJobResult(done || null);
        if (done?.status === "completed") {
          const provider = String(done?.result?.provider || "").trim() || "n/a";
          const providersTried = Array.isArray(done?.result?.providersTried)
            ? done.result.providersTried.map((item) => String(item || "").trim()).filter(Boolean).join(" -> ")
            : "";
          const providerText = providersTried
            ? `provider=${provider}; tried=${providersTried}`
            : `provider=${provider}`;
          const replyPreview = String(done?.result?.reply || "").trim();
          if (replyPreview) {
            setChatStatus(`Completed (${done.elapsedMs || 0}ms, ${providerText}): ${replyPreview.slice(0, 180)}`);
          } else {
            setChatStatus(`Completed (${done.elapsedMs || 0}ms, ${providerText}).`);
          }
        } else if (done?.status) {
          const errorPreview = String(done?.error || "").trim();
          const provider = String(done?.result?.provider || "").trim();
          const providerText = provider ? ` | provider=${provider}` : "";
          if (errorPreview) {
            setChatStatus(`Job ended with status ${done.status}${providerText}: ${errorPreview.slice(0, 180)}`);
          } else {
            setChatStatus(`Job ended with status ${done.status}${providerText}.`);
          }
        } else {
          setChatStatus("Job timeout while waiting.");
        }
      } else {
        const directReply = String(data?.reply || "").trim();
        if (directReply) {
          setChatStatus(`Delivered: ${directReply.slice(0, 180)}`);
        } else {
          setChatStatus("Delivered.");
        }
      }

      await Promise.allSettled([
        refreshMemory(),
        refreshApprovals(),
        refreshTaskLedger()
      ]);
    } catch (error) {
      setChatStatus(`Send failed: ${error.message}`);
    }
  }

  async function saveApprovalStrategy() {
    const selected = String(approvalStrategySelect?.value || "balanced").trim().toLowerCase();
    if (!selected) {
      return;
    }
    setApprovalStrategyStatus("Saving...");
    try {
      const data = await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalMode: "smart",
          approvalPreference: selected
        })
      });
      const mode = data?.settings?.approvalMode || "smart";
      const pref = data?.settings?.approvalPreference || selected;
      setApprovalStrategyStatus(`Saved: ${mode}/${pref}`);
      await refreshAll();
    } catch (error) {
      setApprovalStrategyStatus(`Save failed: ${error.message}`);
    }
  }

  async function refreshAll() {
    if (!hasToken()) {
      lastNativePendingAlertCount = 0;
      setGlobalStatus("Token missing. Paste the mobile approval token and tap Save Token.");
      setConnectionStatus("Connection mode: token required (paste token and tap Save Token).");
      setWindowsStatus("Windows: token required.");
      setTaskLedgerStatus("Task ledger: token required.");
      return;
    }
    try {
      const session = await api(`/api/mobile/session?channel=${encodeURIComponent(detectChannel())}`);
      if (approvalStrategySelect && session?.approvals?.preference) {
        approvalStrategySelect.value = String(session.approvals.preference);
      }
      renderConnectionRouting(session?.connectionRouting || {});
      setApprovalStrategyStatus(
        `Active: ${session?.approvals?.mode || "n/a"}/${session?.approvals?.preference || "n/a"}`
      );
      renderControlStatus(session?.control || {});
      setGlobalStatus(
        `Connected | pending=${session.pendingCount} | guardian=${session.guardian?.mode || "n/a"} | approvals=${session.approvals?.mode || "n/a"}/${session.approvals?.preference || "n/a"} | path=${session.connectionRouting?.selected?.channel || "n/a"} | push=${session.push?.enabled ? "on" : "off"} | control=${session.control?.armed ? "armed" : "off"}`
      );
      maybeNotifyPendingApprovals(session);
      await refreshDisplays();
      const selectedChannel = String(session?.connectionRouting?.selected?.channel || detectChannel()).trim().toLowerCase();
      const remoteMode = !isUsbChannel(selectedChannel);
      const windowsLimit = Number(getNetworkTuning().windowsLimit || 14);
      const commonTasks = [
        refreshApprovals(),
        refreshWindows({ limit: windowsLimit }),
        captureScreen(true, { skipIfBusy: true }).catch((error) => {
          if (isCaptureInProgressError(error)) {
            return;
          }
          throw error;
        }),
        refreshPushStatus(),
        refreshControlStatus(),
        refreshPowerStatus(),
        refreshStealthMode(),
        refreshWorkOrg()
      ];
      if (remoteMode) {
        await Promise.all(commonTasks);
        await Promise.allSettled([
          refreshMemory(),
          refreshNotebook(),
          refreshTaskLedger()
        ]);
        setControlDiagnosticsStatus("Diagnostics: run manually in internet mode if needed.");
      } else {
        await Promise.all([
          ...commonTasks,
          refreshMemory(),
          refreshNotebook(),
          refreshTaskLedger()
        ]);
        runControlDiagnostics().catch(() => {});
      }
    } catch (error) {
      if (isAuthFailure(error)) {
        lastNativePendingAlertCount = 0;
        setGlobalStatus("Token invalid/expired. Paste current mobile approval token and tap Save Token.");
        setConnectionStatus("Connection mode: token invalid/expired.");
        setWindowsStatus("Windows: token invalid/expired.");
        setControlStatus("Control: token invalid/expired.");
        setTaskLedgerStatus("Task ledger: token invalid/expired.");
        return;
      }
      setGlobalStatus(`Connection failed: ${error.message}`);
      setConnectionStatus(`Connection mode error: ${error.message}`);
      setWindowsStatus(`Windows unavailable: ${error.message}`);
      setControlDiagnosticsStatus(`Diagnostics unavailable: ${error.message}`);
      setTaskLedgerStatus(`Task ledger unavailable: ${error.message}`);
    }
  }

  saveTokenBtn?.addEventListener("click", () => {
    setStoredToken(tokenInput?.value || "");
    if (tokenInput) tokenInput.value = "";
    refreshAll();
  });

  attachScreenEnabled = getStoredAttachScreen();
  renderAttachScreenButton();
  attachScreenBtn?.addEventListener("click", () => {
    attachScreenEnabled = !attachScreenEnabled;
    setStoredAttachScreen(attachScreenEnabled);
    renderAttachScreenButton();
  });

  refreshAllBtn?.addEventListener("click", () => {
    refreshAll();
  });

  openApprovalsBtn?.addEventListener("click", () => {
    const target = buildNavUrl("/mobile-approvals.html");
    window.location.href = target;
  });

  installAppBtn?.addEventListener("click", () => {
    showInstallPrompt();
  });

  profileWifiBtn?.addEventListener("click", () => {
    applyConnectionProfile("wifi");
  });

  profileInternetBtn?.addEventListener("click", () => {
    applyConnectionProfile("internet");
  });

  profileUsbBtn?.addEventListener("click", () => {
    applyConnectionProfile("usb");
  });

  saveRemoteBaseBtn?.addEventListener("click", () => {
    saveRemoteBaseUrl();
  });

  vpnHeartbeatBtn?.addEventListener("click", () => {
    markVpnActive();
  });

  stealthToggleBtn?.addEventListener("click", () => {
    toggleStealthMode();
  });

  remoteBaseInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveRemoteBaseUrl();
    }
  });

  refreshWorkOrgBtn?.addEventListener("click", () => {
    refreshWorkOrg();
  });

  setWorkOrgBtn?.addEventListener("click", () => {
    setWorkOrg();
  });

  refreshIntegrationsBtn?.addEventListener("click", () => {
    refreshIntegrations();
  });

  openIntegrationsSetupBtn?.addEventListener("click", () => {
    openIntegrationsSetupOnDesktop();
  });

  slackStatusBtn?.addEventListener("click", () => {
    refreshSlackStatus();
  });

  slackChannelsBtn?.addEventListener("click", () => {
    runSlackChannels();
  });

  slackReviewBtn?.addEventListener("click", () => {
    runSlackReview();
  });

  googleStatusBtn?.addEventListener("click", () => {
    refreshGoogleStatus();
  });

  googleAuthStartBtn?.addEventListener("click", () => {
    startGoogleAuth();
  });

  googleOpenAuthBtn?.addEventListener("click", () => {
    openGoogleAuthOnDesktop();
  });

  gmailInboxBtn?.addEventListener("click", () => {
    runGmailInbox();
  });

  gmailSearchBtn?.addEventListener("click", () => {
    runGmailSearch();
  });

  calendarUpcomingBtn?.addEventListener("click", () => {
    runCalendarUpcoming();
  });

  calendarListBtn?.addEventListener("click", () => {
    runCalendarList();
  });

  googleApiGetBtn?.addEventListener("click", () => {
    runGoogleApiGet();
  });

  gcpStatusBtn?.addEventListener("click", () => {
    refreshGcpStatus();
  });

  gcpEnabledBtn?.addEventListener("click", () => {
    runGcpEnabledApis();
  });

  gcpEnableBtn?.addEventListener("click", () => {
    runGcpEnableService();
  });

  gcpApiGetBtn?.addEventListener("click", () => {
    runGcpApiGet();
  });

  androidStatusBtn?.addEventListener("click", refreshAndroidStatus);
  androidOpenTermuxBtn?.addEventListener("click", androidOpenTermux);
  androidOpenFdroidBtn?.addEventListener("click", androidOpenFdroid);
  androidTermuxRunBtn?.addEventListener("click", androidRunTermux);
  androidTermuxSshdBtn?.addEventListener("click", androidStartSshd);
  androidTermuxCmdInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      androidRunTermux();
    }
  });

  openImageBtn?.addEventListener("click", () => {
    const src = String(desktopImage?.src || "").trim();
    if (!src) {
      setGlobalStatus("No desktop snapshot available yet.");
      return;
    }
    window.open(src, "_blank");
  });

  saveApprovalStrategyBtn?.addEventListener("click", saveApprovalStrategy);
  enablePushBtn?.addEventListener("click", enablePushAlerts);
  disablePushBtn?.addEventListener("click", disablePushAlerts);
  testPushBtn?.addEventListener("click", testPushAlerts);

  captureBtn?.addEventListener("click", () => {
    captureScreen(true).catch((error) => {
      setGlobalStatus(`Capture failed: ${error.message}`);
    });
  });

  refreshDisplaysBtn?.addEventListener("click", () => {
    refreshDisplays().catch((error) => {
      setGlobalStatus(`Display refresh failed: ${error.message}`);
    });
  });

  captureAllBtn?.addEventListener("click", () => {
    captureAllMode = !captureAllMode;
    renderCaptureModeUi();
    captureScreen(true, { captureAll: captureAllMode }).catch((error) => {
      setGlobalStatus(`Capture-all failed: ${error.message}`);
    });
  });

  displaySelect?.addEventListener("change", () => {
    captureAllMode = false;
    renderCaptureModeUi();
    const selected = Number(displaySelect.value);
    const selectedOption = displaySelect.selectedOptions?.[0];
    activeDisplayIndex = Number.isInteger(selected) ? selected : -1;
    activeDisplayDeviceName = String(selectedOption?.dataset?.deviceName || "").trim();
    setStoredDisplayIndex(activeDisplayIndex);
    setStoredDisplayDeviceName(activeDisplayDeviceName);
    captureScreen(true).catch(() => {});
  });

  toggleAutoBtn?.addEventListener("click", () => {
    setAutoRefresh(!autoRefreshTimer);
  });

  armControlBtn?.addEventListener("click", () => {
    armControl();
  });

  disarmControlBtn?.addEventListener("click", () => {
    disarmControl("manual_disarm");
  });

  tapControlToggleBtn?.addEventListener("click", () => {
    setTapControlEnabled(!controlTapEnabled);
  });

  runControlDiagBtn?.addEventListener("click", () => {
    runControlDiagnostics();
  });

  scrollUpBtn?.addEventListener("click", () => {
    sendControlScroll("up").catch((error) => {
      setControlStatus(`Scroll failed: ${error.message}`);
    });
  });

  scrollDownBtn?.addEventListener("click", () => {
    sendControlScroll("down").catch((error) => {
      setControlStatus(`Scroll failed: ${error.message}`);
    });
  });

  keyEnterBtn?.addEventListener("click", () => {
    sendControlKey("enter").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyEscBtn?.addEventListener("click", () => {
    sendControlKey("esc").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyBackspaceBtn?.addEventListener("click", () => {
    sendControlKey("backspace").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyPageUpBtn?.addEventListener("click", () => {
    sendControlKey("pageup").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyPageDownBtn?.addEventListener("click", () => {
    sendControlKey("pagedown").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyCtrlCBtn?.addEventListener("click", () => {
    sendControlKey("ctrl+c").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyCtrlVBtn?.addEventListener("click", () => {
    sendControlKey("ctrl+v").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyCtrlABtn?.addEventListener("click", () => {
    sendControlKey("ctrl+a").catch((error) => {
      setControlStatus(`Key failed: ${error.message}`);
    });
  });

  keyPrevTabBtn?.addEventListener("click", () => {
    sendControlKey("ctrl+shift+tab").catch((error) => {
      setControlStatus(`Tab switch failed: ${error.message}`);
    });
  });

  keyNextTabBtn?.addEventListener("click", () => {
    sendControlKey("ctrl+tab").catch((error) => {
      setControlStatus(`Tab switch failed: ${error.message}`);
    });
  });

  keyCloseTabBtn?.addEventListener("click", () => {
    sendControlKey("ctrl+w").catch((error) => {
      setControlStatus(`Close tab failed: ${error.message}`);
    });
  });

  powerShutdownBtn?.addEventListener("click", () => {
    setPowerStatus("Power: shutdown requested...");
    requestShutdown()
      .then((data) => {
        const delay = Number(data?.delaySeconds ?? readPowerDelaySeconds());
        const guardianText = data?.guardian?.decision?.text ? ` | ${data.guardian.decision.text}` : "";
        setPowerStatus(`Power: shutdown scheduled in ${delay}s.${guardianText}`);
      })
      .catch((error) => {
        setPowerStatus(`Power: shutdown failed: ${error.message}`);
      });
  });

  powerRestartBtn?.addEventListener("click", () => {
    setPowerStatus("Power: restart requested...");
    requestRestart()
      .then((data) => {
        const delay = Number(data?.delaySeconds ?? readPowerDelaySeconds());
        const guardianText = data?.guardian?.decision?.text ? ` | ${data.guardian.decision.text}` : "";
        setPowerStatus(`Power: restart scheduled in ${delay}s.${guardianText}`);
      })
      .catch((error) => {
        setPowerStatus(`Power: restart failed: ${error.message}`);
      });
  });

  powerAbortBtn?.addEventListener("click", () => {
    setPowerStatus("Power: abort requested...");
    requestAbortShutdown()
      .then(() => {
        setPowerStatus("Power: abort completed.");
      })
      .catch((error) => {
        setPowerStatus(`Power: abort failed: ${error.message}`);
      });
  });

  wolWakeBtn?.addEventListener("click", () => {
    setPowerStatus("Power: wake requested...");
    requestWakeDevice()
      .then((data) => {
        const target = String(data?.result?.device?.name || data?.result?.sentTo || "").trim() || "device";
        setPowerStatus(`Power: wake packet sent to ${target}.`);
      })
      .catch((error) => {
        setPowerStatus(`Power: wake failed: ${error.message}`);
      });
  });

  wolRefreshBtn?.addEventListener("click", () => {
    setPowerStatus("Power: refreshing WOL list...");
    refreshPowerStatus();
  });

  wolDeviceSelect?.addEventListener("change", () => {
    const selected = String(wolDeviceSelect.value || "").trim();
    if (selected && wolTargetInput) {
      wolTargetInput.value = selected;
    }
  });

  sendTypeBtn?.addEventListener("click", () => {
    sendControlType().catch((error) => {
      setControlStatus(`Type failed: ${error.message}`);
    });
  });

  focusWindowBtn?.addEventListener("click", focusWindowBySearch);
  refreshWindowsBtn?.addEventListener("click", () => {
    refreshWindows();
  });
  switchWindowBtn?.addEventListener("click", () => {
    sendControlKey("alt+tab").catch((error) => {
      setWindowsStatus(`Switch failed: ${error.message}`);
    });
  });
  minimizeWindowBtn?.addEventListener("click", () => {
    runWindowAction("window_minimize").then(() => refreshWindows()).catch((error) => {
      setWindowsStatus(`Minimize failed: ${error.message}`);
    });
  });
  maximizeWindowBtn?.addEventListener("click", () => {
    runWindowAction("window_maximize").then(() => refreshWindows()).catch((error) => {
      setWindowsStatus(`Maximize failed: ${error.message}`);
    });
  });
  restoreWindowBtn?.addEventListener("click", () => {
    runWindowAction("window_restore").then(() => refreshWindows()).catch((error) => {
      setWindowsStatus(`Restore failed: ${error.message}`);
    });
  });
  closeWindowBtn?.addEventListener("click", () => {
    runWindowAction("window_close").then(() => refreshWindows()).catch((error) => {
      setWindowsStatus(`Close failed: ${error.message}`);
    });
  });

  clearJobResultBtn?.addEventListener("click", () => {
    renderJobResult(null);
  });

  windowSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      focusWindowBySearch();
    }
  });

  typeInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendControlType().catch((error) => {
        setControlStatus(`Type failed: ${error.message}`);
      });
    }
  });

  desktopImage?.addEventListener("click", (event) => {
    if (!controlTapEnabled) {
      return;
    }
    if (!controlArmed) {
      setControlStatus("Control is disarmed. Tap Arm 2m first.");
      return;
    }
    if (controlClickInFlight) {
      return;
    }
    const point = getNormalizedImagePoint(event);
    if (!point) {
      return;
    }
    controlClickInFlight = true;
    sendControlClick(point)
      .then(() => captureScreen(true))
      .catch((error) => {
        setControlStatus(`Tap click failed: ${error.message}`);
      })
      .finally(() => {
        controlClickInFlight = false;
      });
  });

  approvalList?.addEventListener("click", (event) => {
    const button = event.target?.closest("button[data-action][data-id]");
    if (!button) return;
    const id = button.getAttribute("data-id");
    const action = button.getAttribute("data-action");
    if (!id || !action) return;
    if (action === "approve") decideApproval(id, "approve", false);
    if (action === "approve_run") decideApproval(id, "approve", true);
    if (action === "deny") decideApproval(id, "deny", false);
  });

  windowList?.addEventListener("click", (event) => {
    const row = event.target?.closest("article.item[data-window-id]");
    if (row) {
      const rowId = Number(row.getAttribute("data-window-id") || 0);
      const rowTitle = String(row.getAttribute("data-window-title") || "").trim();
      if (rowId > 0) {
        selectedWindowId = rowId;
      }
      if (rowTitle) {
        selectedWindowTitle = rowTitle;
      }
    }
    const focusBtn = event.target?.closest("button[data-window-focus]");
    if (focusBtn) {
      const windowId = Number(focusBtn.getAttribute("data-window-focus") || 0);
      focusWindow(windowId, "").then(() => refreshWindows()).catch((error) => {
        setWindowsStatus(`Focus failed: ${error.message}`);
      });
      return;
    }
    const minBtn = event.target?.closest("button[data-window-min]");
    if (minBtn) {
      const windowId = Number(minBtn.getAttribute("data-window-min") || 0);
      runWindowAction("window_minimize", windowId, "").then(() => refreshWindows()).catch((error) => {
        setWindowsStatus(`Minimize failed: ${error.message}`);
      });
      return;
    }
    const maxBtn = event.target?.closest("button[data-window-max]");
    if (maxBtn) {
      const windowId = Number(maxBtn.getAttribute("data-window-max") || 0);
      runWindowAction("window_maximize", windowId, "").then(() => refreshWindows()).catch((error) => {
        setWindowsStatus(`Maximize failed: ${error.message}`);
      });
    }
  });

  notebookRefreshBtn?.addEventListener("click", () => {
    setNotebookStatus("Refreshing...");
    refreshNotebook().then(() => setNotebookStatus("")).catch((error) => {
      setNotebookStatus(`Refresh failed: ${error.message}`);
    });
  });

  notebookSearchBtn?.addEventListener("click", () => {
    searchNotebook().catch((error) => {
      setNotebookStatus(`Search failed: ${error.message}`);
    });
  });

  notebookAddBtn?.addEventListener("click", () => {
    addNotebookFromUi().catch((error) => {
      setNotebookStatus(`Save failed: ${error.message}`);
    });
  });

  notebookClearBtn?.addEventListener("click", () => {
    clearNotebookInputs();
    refreshNotebook().catch(() => {});
  });

  notebookSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchNotebook().catch(() => {});
    }
  });

  notebookList?.addEventListener("click", (event) => {
    const button = event.target?.closest("button[data-action][data-id]");
    if (!button) return;
    const id = String(button.getAttribute("data-id") || "").trim();
    const action = String(button.getAttribute("data-action") || "").trim().toLowerCase();
    if (!id || !action) return;
    if (action === "pin") {
      const pinned = String(button.getAttribute("data-pinned") || "") === "1";
      setNotebookStatus(pinned ? "Unpinning..." : "Pinning...");
      api(`/api/notebook/notes/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned })
      }).then(() => refreshNotebook()).then(() => setNotebookStatus("")).catch((error) => {
        setNotebookStatus(`Pin failed: ${error.message}`);
      });
    }
    if (action === "delete") {
      if (!confirm("Delete this note?")) return;
      setNotebookStatus("Deleting...");
      api(`/api/notebook/notes/${encodeURIComponent(id)}`, { method: "DELETE" })
        .then(() => refreshNotebook())
        .then(() => setNotebookStatus(""))
        .catch((error) => setNotebookStatus(`Delete failed: ${error.message}`));
    }
  });

  taskLedgerRefreshBtn?.addEventListener("click", () => {
    setTaskLedgerStatus("Refreshing tasks...");
    refreshTaskLedger().catch((error) => {
      setTaskLedgerStatus(`Task refresh failed: ${error.message}`);
    });
  });

  taskLedgerAddBtn?.addEventListener("click", () => {
    addTaskLedgerFromUi().catch((error) => {
      setTaskLedgerStatus(`Task save failed: ${error.message}`);
    });
  });

  taskLedgerStatusFilter?.addEventListener("change", () => {
    refreshTaskLedger().catch(() => {});
  });

  taskLedgerPriorityFilter?.addEventListener("change", () => {
    refreshTaskLedger().catch(() => {});
  });

  taskLedgerIncludeArchived?.addEventListener("change", () => {
    refreshTaskLedger().catch(() => {});
  });

  taskLedgerSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      refreshTaskLedger().catch(() => {});
    }
  });

  taskLedgerList?.addEventListener("click", (event) => {
    const button = event.target?.closest("button[data-task-action][data-id]");
    if (!button) return;
    const id = String(button.getAttribute("data-id") || "").trim();
    const action = String(button.getAttribute("data-task-action") || "").trim().toLowerCase();
    if (!id || !action) return;
    setTaskLedgerStatus(`Task ${id}: ${action}...`);
    runTaskLedgerAction(action, id)
      .then(() => refreshTaskLedger())
      .then(() => setTaskLedgerStatus(""))
      .catch((error) => setTaskLedgerStatus(`Task action failed: ${error.message}`));
  });

  sendBtn?.addEventListener("click", sendChat);
  chatFiles?.addEventListener("change", setChatFileStatus);
  clearInputBtn?.addEventListener("click", () => {
    if (chatInput) chatInput.value = "";
    if (chatFiles) chatFiles.value = "";
    setChatFileStatus();
    setChatStatus("");
  });
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChat();
    }
  });

  const seed = getStoredToken();
  if (tokenInput && seed) {
    tokenInput.value = seed;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallPromptState();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallPromptState();
    setGlobalStatus("Asolaria app installed.");
  });

  updateInstallPromptState();
  setTapControlEnabled(true);
  setControlStatus("Control: checking...");
  setControlDiagnosticsStatus("Diagnostics: not run.");
  setConnectionStatus("Connection mode: checking...");
  setWindowsStatus("Windows: checking...");
  renderStealthToggle();
  setWorkOrgStatus("Work org: checking...");
  setIntegrationsHint("");
  setTaskLedgerStatus("Task ledger: checking...");
  renderCaptureModeUi();

  window.addEventListener("offline", () => {
    setGlobalStatus("Offline: phone network lost. Controls may fail until reconnect.");
    pushNetworkEvent("offline", "Browser went offline.");
  });

  window.addEventListener("online", () => {
    setGlobalStatus("Online: reconnecting to Asolaria...");
    pushNetworkEvent("online", "Browser is back online. Reconnecting...");
    refreshAll();
  });

  renderNetworkHistory();
  pushNetworkEvent("info", "Mobile console loaded.");
  ensurePushRegistration().catch(() => {
    setPushStatus("Push: service worker unavailable");
  });
  refreshPushStatus();
  refreshControlStatus();
  if (controlStatusTimer) {
    clearInterval(controlStatusTimer);
  }
  controlStatusTimer = setInterval(() => {
    refreshControlStatus().catch(() => {});
  }, 5000);
  if (sessionPollTimer) {
    clearInterval(sessionPollTimer);
  }
  sessionPollTimer = setInterval(() => {
    refreshSessionSummary().catch(() => {});
  }, 15000);
  setAutoRefresh(true);
  refreshAndroidStatus();
  refreshSessionSummary();
  refreshAll();
})();
