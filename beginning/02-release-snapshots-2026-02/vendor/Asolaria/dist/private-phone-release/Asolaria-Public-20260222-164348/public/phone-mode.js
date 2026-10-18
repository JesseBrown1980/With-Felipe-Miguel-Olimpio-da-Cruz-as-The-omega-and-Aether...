const refreshMirrorBtn = document.getElementById("refreshMirrorBtn");
const toggleAutoBtn = document.getElementById("toggleAutoBtn");
const refreshObserverBtn = document.getElementById("refreshObserverBtn");
const openWhatsappBtn = document.getElementById("openWhatsappBtn");
const armControlBtn = document.getElementById("armControlBtn");
const controlGuardStatus = document.getElementById("controlGuardStatus");
const observerFollowToggle = document.getElementById("observerFollowToggle");
const phoneMirrorImage = document.getElementById("phoneMirrorImage");
const observerMirrorImage = document.getElementById("observerMirrorImage");
const mirrorMeta = document.getElementById("mirrorMeta");
const observerMeta = document.getElementById("observerMeta");
const screenFrame = document.getElementById("screenFrame");
const observerScreenFrame = document.getElementById("observerScreenFrame");
const deviceBadge = document.getElementById("deviceBadge");
const orientationBadge = document.getElementById("orientationBadge");
const mirrorBadge = document.getElementById("mirrorBadge");
const eventLog = document.getElementById("eventLog");
const swipeUpBtn = document.getElementById("swipeUpBtn");
const swipeDownBtn = document.getElementById("swipeDownBtn");
const typeInput = document.getElementById("typeInput");
const typeSendBtn = document.getElementById("typeSendBtn");
const waEnabled = document.getElementById("waEnabled");
const waNotifyMode = document.getElementById("waNotifyMode");
const waSaveConfigBtn = document.getElementById("waSaveConfigBtn");
const waMessage = document.getElementById("waMessage");
const waIncludeVoice = document.getElementById("waIncludeVoice");
const waVoiceText = document.getElementById("waVoiceText");
const waSendBtn = document.getElementById("waSendBtn");
const playVoiceBtn = document.getElementById("playVoiceBtn");
const latestVoice = document.getElementById("latestVoice");
const waStatus = document.getElementById("waStatus");
const proMirrorMaxFps = document.getElementById("proMirrorMaxFps");
const proMirrorBitRate = document.getElementById("proMirrorBitRate");
const proMirrorAlwaysOnTop = document.getElementById("proMirrorAlwaysOnTop");
const proMirrorNoAudio = document.getElementById("proMirrorNoAudio");
const proMirrorStartBtn = document.getElementById("proMirrorStartBtn");
const proMirrorStopBtn = document.getElementById("proMirrorStopBtn");
const proMirrorRefreshBtn = document.getElementById("proMirrorRefreshBtn");
const proMirrorStatus = document.getElementById("proMirrorStatus");
const linkedToNumber = document.getElementById("linkedToNumber");
const linkedPrefillText = document.getElementById("linkedPrefillText");
const linkedOpenChatBtn = document.getElementById("linkedOpenChatBtn");
const linkedMicX = document.getElementById("linkedMicX");
const linkedMicY = document.getElementById("linkedMicY");
const linkedHoldMs = document.getElementById("linkedHoldMs");
const linkedVoiceText = document.getElementById("linkedVoiceText");
const linkedApprovalId = document.getElementById("linkedApprovalId");
const linkedVoiceNoteBtn = document.getElementById("linkedVoiceNoteBtn");
const linkedStatus = document.getElementById("linkedStatus");
const keyButtons = Array.from(document.querySelectorAll("[data-key]"));

const state = {
  mirror: null,
  snapshot: null,
  observerSnapshot: null,
  selectedDeviceId: "",
  orientation: "unknown",
  proMirror: null,
  autoRefresh: true,
  observerFollowsLive: true,
  controlsArmedUntilMs: 0,
  controlGuardTimer: null,
  refreshTimer: null,
  refreshing: false
};

const CONTROL_ARM_WINDOW_MS = 90 * 1000;

function logLine(text) {
  const timestamp = new Date().toLocaleTimeString();
  const line = `${timestamp} | ${String(text || "").trim()}`;
  if (!eventLog) {
    return;
  }
  const rows = String(eventLog.textContent || "")
    .split("\n")
    .filter(Boolean)
    .slice(-80);
  rows.push(line);
  eventLog.textContent = rows.join("\n");
  eventLog.scrollTop = eventLog.scrollHeight;
}

async function requestJson(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const init = {
    method,
    headers: {}
  };
  if (options.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, init);
  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { ok: false, error: text };
    }
  }
  if (!response.ok) {
    const error = new Error(String(payload?.error || response.statusText || "Request failed."));
    error.status = response.status;
    error.data = payload;
    throw error;
  }
  return payload || { ok: true };
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTime(value) {
  const text = String(value || "").trim();
  if (!text) return "n/a";
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return text;
  return parsed.toLocaleTimeString();
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 18);
}

function renderLinkedStatus(text) {
  if (!linkedStatus) {
    return;
  }
  linkedStatus.textContent = String(text || "").trim() || "Linked mode idle.";
}

function setFrameOrientation(frame, nextOrientation, options = {}) {
  const next = String(nextOrientation || "unknown");
  if (!frame) {
    return next;
  }
  const previous = String(frame.dataset.orientation || "unknown");
  if (options.spin && previous !== "unknown" && next !== "unknown" && previous !== next) {
    frame.classList.add("spin");
    window.setTimeout(() => {
      frame.classList.remove("spin");
    }, 540);
  }
  frame.dataset.orientation = next;
  return next;
}

function resolveSnapshotOrientation(snapshot = {}) {
  const raw = String(snapshot?.orientation || "").trim().toLowerCase();
  if (raw === "portrait" || raw === "landscape") {
    return raw;
  }
  const width = asNumber(snapshot?.width, 0);
  const height = asNumber(snapshot?.height, 0);
  if (width > 0 && height > 0) {
    return width >= height ? "landscape" : "portrait";
  }
  return "unknown";
}

function applyFrameGeometry(frame, snapshot = {}, options = {}) {
  const orientation = resolveSnapshotOrientation(snapshot);
  const width = asNumber(snapshot?.width, 0);
  const height = asNumber(snapshot?.height, 0);
  if (frame) {
    if (width > 0 && height > 0) {
      const ratio = Math.max(0.2, Math.min(6, width / height));
      frame.style.setProperty("--phone-aspect", ratio.toFixed(4));
    } else {
      frame.style.removeProperty("--phone-aspect");
    }
  }
  return setFrameOrientation(frame, orientation, options);
}

function getArmedRemainingMs() {
  return Math.max(0, asNumber(state.controlsArmedUntilMs, 0) - Date.now());
}

function isControlsArmed() {
  return getArmedRemainingMs() > 0;
}

function getGuardedElements() {
  return [
    openWhatsappBtn,
    swipeUpBtn,
    swipeDownBtn,
    typeSendBtn,
    linkedOpenChatBtn,
    linkedVoiceNoteBtn,
    ...keyButtons
  ].filter(Boolean);
}

function refreshControlInteractivity() {
  const armed = isControlsArmed();
  for (const element of getGuardedElements()) {
    element.disabled = !armed;
  }
  if (screenFrame) {
    screenFrame.classList.toggle("disarmed", !armed);
  }
}

function renderControlGuard() {
  const armed = isControlsArmed();
  const remainingSec = Math.ceil(getArmedRemainingMs() / 1000);
  if (controlGuardStatus) {
    controlGuardStatus.classList.remove("on", "off");
    controlGuardStatus.classList.add(armed ? "on" : "off");
    controlGuardStatus.textContent = armed
      ? `Control: armed (${remainingSec}s left)`
      : "Control: disarmed";
  }
  if (armControlBtn) {
    armControlBtn.className = armed ? "ok" : "warn";
    armControlBtn.textContent = armed ? `Disarm Controls (${remainingSec}s)` : "Arm Controls (90s)";
  }
  refreshControlInteractivity();
  renderMirrorMeta();
}

function disarmControls(options = {}) {
  const wasArmed = isControlsArmed();
  state.controlsArmedUntilMs = 0;
  if (state.controlGuardTimer) {
    window.clearInterval(state.controlGuardTimer);
    state.controlGuardTimer = null;
  }
  renderControlGuard();
  if (options.log !== false && wasArmed) {
    logLine("Controls disarmed.");
  }
}

function armControls(durationMs = CONTROL_ARM_WINDOW_MS, options = {}) {
  const safeMs = Math.max(15 * 1000, asNumber(durationMs, CONTROL_ARM_WINDOW_MS));
  state.controlsArmedUntilMs = Date.now() + safeMs;
  if (state.controlGuardTimer) {
    window.clearInterval(state.controlGuardTimer);
  }
  state.controlGuardTimer = window.setInterval(() => {
    if (!isControlsArmed()) {
      disarmControls({ log: false });
      logLine("Control guard auto-disarmed.");
      return;
    }
    renderControlGuard();
  }, 240);
  renderControlGuard();
  if (options.log !== false) {
    logLine(`Controls armed for ${Math.round(safeMs / 1000)} seconds.`);
  }
}

function requireControlsArmed(actionLabel) {
  if (isControlsArmed()) {
    return;
  }
  throw new Error(
    `Controls are disarmed. Arm Controls (90s) before ${String(actionLabel || "sending control input")}.`
  );
}

function renderObserverMeta() {
  if (!observerMeta) {
    return;
  }
  const snapshot = state.observerSnapshot || {};
  observerMeta.textContent = [
    `Mode: ${state.observerFollowsLive ? "follow live" : "frozen/manual"}`,
    `Captured: ${formatTime(snapshot.capturedAt)}`,
    `Size: ${asNumber(snapshot.width, 0)} x ${asNumber(snapshot.height, 0)}`,
    `Orientation: ${resolveSnapshotOrientation(snapshot)}`
  ].join("\n");
}

function renderBadges() {
  const mirror = state.mirror || {};
  const snapshot = state.snapshot || {};
  const device = state.selectedDeviceId || mirror.selectedDeviceId || snapshot.deviceId || "none";
  if (deviceBadge) {
    deviceBadge.textContent = `Device: ${device}`;
  }
  if (orientationBadge) {
    orientationBadge.textContent = `Orientation: ${resolveSnapshotOrientation(snapshot)}`;
  }
  if (mirrorBadge) {
    const adbText = mirror.adbFound ? "adb ok" : "adb missing";
    const count = asNumber(mirror.authorizedDeviceCount, 0);
    mirrorBadge.textContent = `Mirror: ${adbText}, phones ${count}`;
  }
}

function renderMirrorMeta() {
  if (!mirrorMeta) {
    return;
  }
  const snapshot = state.snapshot || {};
  const lines = [
    `Captured: ${formatTime(snapshot.capturedAt)}`,
    `Size: ${asNumber(snapshot.width, 0)} x ${asNumber(snapshot.height, 0)}`,
    `Orientation: ${resolveSnapshotOrientation(snapshot)}`,
    `Auto refresh: ${state.autoRefresh ? "on" : "off"}`,
    `Control guard: ${isControlsArmed() ? "armed" : "disarmed"}`
  ];
  mirrorMeta.textContent = lines.join("\n");
}

function renderWhatsAppStatus(summary = {}) {
  if (!waStatus) {
    return;
  }
  const enabled = Boolean(summary.enabled);
  const configured = Boolean(summary.configured);
  waStatus.textContent = [
    `Enabled: ${enabled ? "yes" : "no"}`,
    `Configured: ${configured ? "yes" : "no"}`,
    `Notify mode: ${String(summary.notifyMode || "critical_or_security")}`,
    `Updated: ${formatTime(summary.updatedAt)}`
  ].join("\n");
}

function renderProMirrorStatus(summary = {}) {
  if (!proMirrorStatus) {
    return;
  }
  const running = Boolean(summary.running);
  const lines = [
    `Running: ${running ? "yes" : "no"}`,
    `PID: ${summary.pid || 0}`,
    `scrcpy: ${summary.scrcpyFound ? "found" : "missing"}`,
    `Version: ${String(summary.scrcpyVersion || "n/a")}`,
    `Device: ${String(summary.lastDeviceId || state.selectedDeviceId || "none")}`,
    `Last start: ${formatTime(summary.lastStartedAt)}`
  ];
  proMirrorStatus.textContent = lines.join("\n");
}

function renderSnapshotImage(snapshot = {}) {
  const capturedAtMs = asNumber(snapshot.capturedAtMs, 0);
  if (!phoneMirrorImage) {
    return;
  }
  phoneMirrorImage.src = `/api/phone/mirror/image?v=${encodeURIComponent(String(capturedAtMs || Date.now()))}`;
  state.orientation = applyFrameGeometry(screenFrame, snapshot, { spin: true });
}

function renderObserverImage(snapshot = {}) {
  const capturedAtMs = asNumber(snapshot.capturedAtMs, 0);
  if (!observerMirrorImage) {
    return;
  }
  observerMirrorImage.src = `/api/phone/mirror/image?v=${encodeURIComponent(String(capturedAtMs || Date.now()))}`;
  applyFrameGeometry(observerScreenFrame, snapshot);
}

function setObserverSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }
  state.observerSnapshot = snapshot;
  renderObserverImage(snapshot);
  renderObserverMeta();
}

function setObserverFollow(enabled, options = {}) {
  state.observerFollowsLive = Boolean(enabled);
  if (observerFollowToggle) {
    observerFollowToggle.checked = state.observerFollowsLive;
  }
  if (state.observerFollowsLive && state.snapshot) {
    setObserverSnapshot(state.snapshot);
  } else {
    renderObserverMeta();
  }
  if (!options.silent) {
    logLine(`Shadow mode: ${state.observerFollowsLive ? "follow live" : "manual/frozen"}.`);
  }
}

function applyStatusPayload(payload = {}) {
  state.mirror = payload.mirror || {};
  state.proMirror = payload.proMirror || state.proMirror || null;
  state.snapshot = payload.snapshot || state.mirror.snapshot || state.snapshot || null;
  state.selectedDeviceId = String(state.mirror.selectedDeviceId || state.snapshot?.deviceId || "").trim();

  if (waEnabled) {
    waEnabled.checked = Boolean(payload.whatsapp?.enabled);
  }
  if (waNotifyMode && payload.whatsapp?.notifyMode) {
    waNotifyMode.value = String(payload.whatsapp.notifyMode);
  }
  renderWhatsAppStatus(payload.whatsapp || {});
  renderProMirrorStatus(state.proMirror || {});
  renderBadges();
  renderMirrorMeta();
  if (state.snapshot?.imageReady || state.snapshot?.capturedAtMs) {
    renderSnapshotImage(state.snapshot);
    if (state.observerFollowsLive || !state.observerSnapshot) {
      setObserverSnapshot(state.snapshot);
    } else {
      renderObserverMeta();
    }
  }
}

async function loadStatus(options = {}) {
  const query = state.selectedDeviceId
    ? `?deviceId=${encodeURIComponent(state.selectedDeviceId)}`
    : "";
  const payload = await requestJson(`/api/phone/mirror/status${query}`);
  applyStatusPayload(payload);
  if (!options.silent) {
    logLine("Mirror status refreshed.");
  }
  return payload;
}

async function loadProMirrorStatus(options = {}) {
  const payload = await requestJson("/api/phone/pro-mirror/status");
  state.proMirror = payload.proMirror || null;
  renderProMirrorStatus(state.proMirror || {});
  if (!options.silent) {
    logLine("Pro mirror status refreshed.");
  }
  return payload;
}

async function startProMirror() {
  const payload = await requestJson("/api/phone/pro-mirror/start", {
    method: "POST",
    body: {
      deviceId: state.selectedDeviceId || undefined,
      maxFps: asNumber(proMirrorMaxFps?.value, 60),
      videoBitRate: String(proMirrorBitRate?.value || "8M").trim(),
      alwaysOnTop: Boolean(proMirrorAlwaysOnTop?.checked),
      noAudio: Boolean(proMirrorNoAudio?.checked)
    }
  });
  state.proMirror = payload?.result?.status || state.proMirror;
  renderProMirrorStatus(state.proMirror || {});
  logLine(`Pro mirror started (pid ${payload?.result?.pid || payload?.result?.status?.pid || 0}).`);
  return payload;
}

async function stopProMirror() {
  const payload = await requestJson("/api/phone/pro-mirror/stop", {
    method: "POST"
  });
  state.proMirror = payload?.result?.status || state.proMirror;
  renderProMirrorStatus(state.proMirror || {});
  logLine("Pro mirror stopped.");
  return payload;
}

async function captureFrame(options = {}) {
  if (state.refreshing) {
    return null;
  }
  state.refreshing = true;
  try {
    const payload = await requestJson("/api/phone/mirror/capture", {
      method: "POST",
      body: {
        deviceId: state.selectedDeviceId || undefined
      }
    });
    if (payload?.snapshot) {
      state.snapshot = payload.snapshot;
      if (payload.snapshot.deviceId) {
        state.selectedDeviceId = String(payload.snapshot.deviceId);
      }
      renderSnapshotImage(payload.snapshot);
      if (options.syncObserver === true || (options.syncObserver !== false && (state.observerFollowsLive || !state.observerSnapshot))) {
        setObserverSnapshot(payload.snapshot);
      } else {
        renderObserverMeta();
      }
      renderBadges();
      renderMirrorMeta();
    }
    if (!options.silent) {
      logLine("Mirror frame captured.");
    }
    return payload;
  } finally {
    state.refreshing = false;
  }
}

function setAutoRefresh(enabled) {
  state.autoRefresh = Boolean(enabled);
  if (toggleAutoBtn) {
    toggleAutoBtn.textContent = `Auto Refresh: ${state.autoRefresh ? "ON" : "OFF"}`;
    toggleAutoBtn.className = state.autoRefresh ? "ok" : "danger";
  }
  if (state.refreshTimer) {
    window.clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
  if (state.autoRefresh) {
    state.refreshTimer = window.setInterval(async () => {
      try {
        await captureFrame({ silent: true });
      } catch (error) {
        logLine(`Auto refresh failed: ${error.message}`);
      }
    }, 1600);
  }
  renderMirrorMeta();
}

function getControlSize() {
  const snapshot = state.snapshot || {};
  const width = asNumber(snapshot.width, 0);
  const height = asNumber(snapshot.height, 0);
  return {
    width,
    height
  };
}

async function sendKey(key) {
  requireControlsArmed(`sending key ${String(key || "").trim() || "input"}`);
  const result = await requestJson("/api/phone/mirror/control/key", {
    method: "POST",
    body: {
      deviceId: state.selectedDeviceId || undefined,
      key
    }
  });
  logLine(`Key sent: ${key}`);
  return result;
}

async function sendSwipe(direction) {
  requireControlsArmed(`swiping ${direction}`);
  const size = getControlSize();
  const payload = direction === "up"
    ? { startX: 0.5, startY: 0.75, endX: 0.5, endY: 0.27, durationMs: 280 }
    : { startX: 0.5, startY: 0.28, endX: 0.5, endY: 0.78, durationMs: 280 };
  await requestJson("/api/phone/mirror/control/swipe", {
    method: "POST",
    body: {
      ...payload,
      deviceId: state.selectedDeviceId || undefined,
      screenWidth: size.width,
      screenHeight: size.height
    }
  });
  logLine(direction === "up" ? "Swipe up." : "Swipe down.");
}

function mapTapToScreen(event) {
  if (!phoneMirrorImage) {
    return null;
  }
  const snapshot = state.snapshot || {};
  const naturalWidth = Math.max(1, asNumber(snapshot.width, phoneMirrorImage.naturalWidth));
  const naturalHeight = Math.max(1, asNumber(snapshot.height, phoneMirrorImage.naturalHeight));
  const rect = phoneMirrorImage.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    return null;
  }

  const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  const offsetX = (rect.width - drawWidth) / 2;
  const offsetY = (rect.height - drawHeight) / 2;
  const localX = event.clientX - rect.left - offsetX;
  const localY = event.clientY - rect.top - offsetY;
  if (localX < 0 || localY < 0 || localX > drawWidth || localY > drawHeight) {
    return null;
  }

  return {
    x: Math.max(0, Math.min(naturalWidth - 1, Math.round(localX / scale))),
    y: Math.max(0, Math.min(naturalHeight - 1, Math.round(localY / scale))),
    width: naturalWidth,
    height: naturalHeight
  };
}

async function saveWhatsAppConfig() {
  const payload = await requestJson("/api/guardian/whatsapp", {
    method: "POST",
    body: {
      enabled: Boolean(waEnabled?.checked),
      notifyMode: String(waNotifyMode?.value || "critical_or_security")
    }
  });
  renderWhatsAppStatus(payload.whatsapp || {});
  logLine("WhatsApp policy saved.");
}

async function sendWhatsAppMessage() {
  const message = String(waMessage?.value || "").trim();
  if (!message) {
    throw new Error("Message is required.");
  }
  const includeVoice = Boolean(waIncludeVoice?.checked);
  const voiceText = String(waVoiceText?.value || "").trim();
  const payload = await requestJson("/api/phone/mirror/whatsapp/send", {
    method: "POST",
    body: {
      message,
      voice: includeVoice,
      voiceText: voiceText || undefined
    }
  });
  if (payload?.voice?.ok && latestVoice) {
    latestVoice.src = `/api/phone/mirror/voice/latest?v=${Date.now()}`;
  }
  logLine(`WhatsApp sent (${String(payload?.whatsapp?.method || "unknown")}).`);
  return payload;
}

async function playLatestVoice() {
  if (!latestVoice) {
    return;
  }
  latestVoice.src = `/api/phone/mirror/voice/latest?v=${Date.now()}`;
  await latestVoice.play();
  logLine("Playing latest voice clip.");
}

async function openLinkedChat() {
  requireControlsArmed("opening linked chat");
  const toNumber = normalizePhoneDigits(linkedToNumber?.value || "");
  const prefillText = String(linkedPrefillText?.value || "").trim();
  const payload = await requestJson("/api/phone/mirror/whatsapp/linked/open-chat", {
    method: "POST",
    body: {
      deviceId: state.selectedDeviceId || undefined,
      toNumber: toNumber || undefined,
      message: prefillText || undefined
    }
  });
  const phone = String(payload?.result?.phone || toNumber || "");
  renderLinkedStatus(`Linked chat opened${phone ? ` for ${phone}` : ""}.`);
  logLine(`Linked chat opened${phone ? ` (${phone})` : ""}.`);
  return payload;
}

async function runLinkedVoiceNote() {
  requireControlsArmed("running linked voice-note macro");
  const toNumber = normalizePhoneDigits(linkedToNumber?.value || "");
  const prefillText = String(linkedPrefillText?.value || "").trim();
  const voiceText = String(linkedVoiceText?.value || "").trim();
  const approvalId = String(linkedApprovalId?.value || "").trim();
  const micX = Number(linkedMicX?.value);
  const micY = Number(linkedMicY?.value);
  const holdMs = Math.max(700, Math.min(12000, Math.round(asNumber(linkedHoldMs?.value, 2400))));

  if (!Number.isFinite(micX) || !Number.isFinite(micY)) {
    throw new Error("micX and micY are required.");
  }

  const body = {
    deviceId: state.selectedDeviceId || undefined,
    toNumber: toNumber || undefined,
    prefillText: prefillText || undefined,
    voiceText: voiceText || undefined,
    micX,
    micY,
    holdMs
  };
  if (approvalId) {
    body.approvalId = approvalId;
  }

  try {
    const payload = await requestJson("/api/phone/mirror/whatsapp/linked/voice-note", {
      method: "POST",
      body
    });
    renderLinkedStatus(`Voice-note macro executed. Approval used: ${payload.approvalUsed || "auto-override"}.`);
    logLine(`Linked voice-note macro executed (${payload.approvalUsed || "override"}).`);
    if (linkedApprovalId) {
      linkedApprovalId.value = "";
    }
    return payload;
  } catch (error) {
    const approvalRequest = error?.data?.approvalRequest;
    if (approvalRequest?.id) {
      if (linkedApprovalId) {
        linkedApprovalId.value = String(approvalRequest.id);
      }
      renderLinkedStatus(
        [
          `Approval required: ${approvalRequest.id}`,
          `Approve it in Approval Center, then tap Run Voice Note again.`,
          `Expires: ${String(approvalRequest.expiresAt || "n/a")}`
        ].join("\n")
      );
      logLine(`Linked voice-note approval requested (${approvalRequest.id}).`);
      return null;
    }
    throw error;
  }
}

if (refreshMirrorBtn) {
  refreshMirrorBtn.addEventListener("click", async () => {
    try {
      await captureFrame();
    } catch (error) {
      logLine(`Capture failed: ${error.message}`);
    }
  });
}

if (toggleAutoBtn) {
  toggleAutoBtn.addEventListener("click", () => {
    setAutoRefresh(!state.autoRefresh);
    logLine(`Auto refresh ${state.autoRefresh ? "enabled" : "disabled"}.`);
  });
}

if (refreshObserverBtn) {
  refreshObserverBtn.addEventListener("click", async () => {
    try {
      const payload = await captureFrame({ silent: true, syncObserver: true });
      if (payload?.snapshot) {
        logLine("Shadow workspace refreshed.");
      } else {
        logLine("Shadow refresh skipped: capture already in progress.");
      }
    } catch (error) {
      logLine(`Shadow refresh failed: ${error.message}`);
    }
  });
}

if (observerFollowToggle) {
  observerFollowToggle.addEventListener("change", () => {
    setObserverFollow(Boolean(observerFollowToggle.checked));
  });
}

if (armControlBtn) {
  armControlBtn.addEventListener("click", () => {
    if (isControlsArmed()) {
      disarmControls();
      return;
    }
    armControls(CONTROL_ARM_WINDOW_MS);
  });
}

if (openWhatsappBtn) {
  openWhatsappBtn.addEventListener("click", async () => {
    try {
      requireControlsArmed("opening WhatsApp");
      await requestJson("/api/phone/mirror/whatsapp/open", {
        method: "POST",
        body: {
          deviceId: state.selectedDeviceId || undefined
        }
      });
      logLine("WhatsApp app launch sent to phone.");
    } catch (error) {
      logLine(`WhatsApp app launch failed: ${error.message}`);
    }
  });
}

if (proMirrorRefreshBtn) {
  proMirrorRefreshBtn.addEventListener("click", async () => {
    try {
      await loadProMirrorStatus();
    } catch (error) {
      logLine(`Pro mirror status failed: ${error.message}`);
    }
  });
}

if (proMirrorStartBtn) {
  proMirrorStartBtn.addEventListener("click", async () => {
    try {
      await startProMirror();
    } catch (error) {
      logLine(`Pro mirror start failed: ${error.message}`);
    }
  });
}

if (proMirrorStopBtn) {
  proMirrorStopBtn.addEventListener("click", async () => {
    try {
      await stopProMirror();
    } catch (error) {
      logLine(`Pro mirror stop failed: ${error.message}`);
    }
  });
}

if (phoneMirrorImage) {
  phoneMirrorImage.addEventListener("click", async (event) => {
    try {
      requireControlsArmed("tapping on the live screen");
      const mapped = mapTapToScreen(event);
      if (!mapped) {
        return;
      }
      await requestJson("/api/phone/mirror/control/tap", {
        method: "POST",
        body: {
          deviceId: state.selectedDeviceId || undefined,
          x: mapped.x,
          y: mapped.y,
          screenWidth: mapped.width,
          screenHeight: mapped.height
        }
      });
      logLine(`Tap (${mapped.x}, ${mapped.y}).`);
      window.setTimeout(() => {
        captureFrame({ silent: true }).catch(() => {});
      }, 240);
    } catch (error) {
      logLine(`Tap failed: ${error.message}`);
    }
  });
}

for (const button of keyButtons) {
  button.addEventListener("click", async () => {
    const key = String(button.dataset.key || "").trim();
    if (!key) {
      return;
    }
    try {
      await sendKey(key);
      window.setTimeout(() => {
        captureFrame({ silent: true }).catch(() => {});
      }, 180);
    } catch (error) {
      logLine(`Key failed (${key}): ${error.message}`);
    }
  });
}

if (swipeUpBtn) {
  swipeUpBtn.addEventListener("click", async () => {
    try {
      await sendSwipe("up");
      window.setTimeout(() => {
        captureFrame({ silent: true }).catch(() => {});
      }, 220);
    } catch (error) {
      logLine(`Swipe up failed: ${error.message}`);
    }
  });
}

if (swipeDownBtn) {
  swipeDownBtn.addEventListener("click", async () => {
    try {
      await sendSwipe("down");
      window.setTimeout(() => {
        captureFrame({ silent: true }).catch(() => {});
      }, 220);
    } catch (error) {
      logLine(`Swipe down failed: ${error.message}`);
    }
  });
}

if (typeSendBtn) {
  typeSendBtn.addEventListener("click", async () => {
    const text = String(typeInput?.value || "").trim();
    if (!text) {
      return;
    }
    try {
      requireControlsArmed("typing text");
      await requestJson("/api/phone/mirror/control/text", {
        method: "POST",
        body: {
          deviceId: state.selectedDeviceId || undefined,
          text
        }
      });
      logLine(`Text sent (${text.length} chars).`);
      typeInput.value = "";
      window.setTimeout(() => {
        captureFrame({ silent: true }).catch(() => {});
      }, 220);
    } catch (error) {
      logLine(`Text failed: ${error.message}`);
    }
  });
}

if (typeInput) {
  typeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      typeSendBtn?.click();
    }
  });
}

if (waSaveConfigBtn) {
  waSaveConfigBtn.addEventListener("click", async () => {
    try {
      await saveWhatsAppConfig();
    } catch (error) {
      logLine(`WA config save failed: ${error.message}`);
    }
  });
}

if (waSendBtn) {
  waSendBtn.addEventListener("click", async () => {
    try {
      await sendWhatsAppMessage();
    } catch (error) {
      const reason = error?.data?.whatsapp?.reason || error.message;
      logLine(`WA send failed: ${reason}`);
    }
  });
}

if (playVoiceBtn) {
  playVoiceBtn.addEventListener("click", async () => {
    try {
      await playLatestVoice();
    } catch (error) {
      logLine(`Voice playback failed: ${error.message}`);
    }
  });
}

if (linkedOpenChatBtn) {
  linkedOpenChatBtn.addEventListener("click", async () => {
    try {
      await openLinkedChat();
    } catch (error) {
      renderLinkedStatus(`Open chat failed: ${error.message}`);
      logLine(`Linked open chat failed: ${error.message}`);
    }
  });
}

if (linkedVoiceNoteBtn) {
  linkedVoiceNoteBtn.addEventListener("click", async () => {
    try {
      await runLinkedVoiceNote();
    } catch (error) {
      renderLinkedStatus(`Voice-note failed: ${error.message}`);
      logLine(`Linked voice-note failed: ${error.message}`);
    }
  });
}

async function initialize() {
  logLine("Asolaria phone mode starting.");
  renderLinkedStatus("Linked mode idle.");
  setObserverFollow(Boolean(observerFollowToggle?.checked), { silent: true });
  disarmControls({ log: false });
  renderObserverMeta();
  try {
    await loadStatus({ silent: true });
  } catch (error) {
    logLine(`Status load failed: ${error.message}`);
  }
  try {
    await loadProMirrorStatus({ silent: true });
  } catch (error) {
    logLine(`Pro mirror status load failed: ${error.message}`);
  }
  try {
    await captureFrame({ silent: true });
  } catch (error) {
    logLine(`Initial capture failed: ${error.message}`);
  }
  setAutoRefresh(true);
}

initialize().catch((error) => {
  logLine(`Startup failed: ${error.message}`);
});
