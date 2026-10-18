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
const phoneMirrorControlsCard = document.getElementById("phoneMirrorControlsCard");
const deviceBadge = document.getElementById("deviceBadge");
const oliLaneBadge = document.getElementById("oliLaneBadge");
const orientationBadge = document.getElementById("orientationBadge");
const mirrorBadge = document.getElementById("mirrorBadge");
const uiLevelSelect = document.getElementById("uiLevelSelect");
const uiLevelHint = document.getElementById("uiLevelHint");
const phoneLaunchVoiceBtn = document.getElementById("phoneLaunchVoiceBtn");
const phoneLaunchTextBtn = document.getElementById("phoneLaunchTextBtn");
const phoneLaunchVideoBtn = document.getElementById("phoneLaunchVideoBtn");
const phoneLaunchAdvancedBtn = document.getElementById("phoneLaunchAdvancedBtn");
const phoneLaunchSuperAdvancedBtn = document.getElementById("phoneLaunchSuperAdvancedBtn");
const phoneLauncherStatus = document.getElementById("phoneLauncherStatus");
const refreshInboxBtn = document.getElementById("refreshInboxBtn");
const openInboxApprovalsBtn = document.getElementById("openInboxApprovalsBtn");
const openInboxAdminBtn = document.getElementById("openInboxAdminBtn");
const inboxSummaryBadge = document.getElementById("inboxSummaryBadge");
const inboxSystemBadge = document.getElementById("inboxSystemBadge");
const inboxStatus = document.getElementById("inboxStatus");
const inboxApprovals = document.getElementById("inboxApprovals");
const inboxTasks = document.getElementById("inboxTasks");
const inboxNotes = document.getElementById("inboxNotes");
const eventLog = document.getElementById("eventLog");
const phoneLiveAvatarStage = document.getElementById("phoneLiveAvatarStage");
const phoneLiveAvatarStatus = document.getElementById("phoneLiveAvatarStatus");
const phoneLiveVoiceStatus = document.getElementById("phoneLiveVoiceStatus");
const phoneLiveVolume = document.getElementById("phoneLiveVolume");
const phoneLiveVolumeValue = document.getElementById("phoneLiveVolumeValue");
const phoneLiveRouteMode = document.getElementById("phoneLiveRouteMode");
const phoneLiveOpenControlsBtn = document.getElementById("phoneLiveOpenControlsBtn");
const phoneLiveCloseControlsBtn = document.getElementById("phoneLiveCloseControlsBtn");
const phoneLiveChatMessages = document.getElementById("phoneLiveChatMessages");
const phoneLiveChatInput = document.getElementById("phoneLiveChatInput");
const phoneLiveSendBtn = document.getElementById("phoneLiveSendBtn");
const phoneLiveSpeakBtn = document.getElementById("phoneLiveSpeakBtn");
const phoneLivePushBtn = document.getElementById("phoneLivePushBtn");
const phoneLiveStopBtn = document.getElementById("phoneLiveStopBtn");
const phoneLiveNotebookAskBtn = document.getElementById("phoneLiveNotebookAskBtn");
const phoneLiveNotebookStatusBtn = document.getElementById("phoneLiveNotebookStatusBtn");
const phoneLiveAutoSendToggle = document.getElementById("phoneLiveAutoSendToggle");
const phoneLiveWakeLoopToggle = document.getElementById("phoneLiveWakeLoopToggle");
const phoneLiveVoiceTestBtn = document.getElementById("phoneLiveVoiceTestBtn");
const phoneRealtimeSourceSelect = document.getElementById("phoneRealtimeSourceSelect");
const phoneRealtimeStartBtn = document.getElementById("phoneRealtimeStartBtn");
const phoneRealtimeStopBtn = document.getElementById("phoneRealtimeStopBtn");
const phoneRealtimeClearBtn = document.getElementById("phoneRealtimeClearBtn");
const phoneRealtimeCopyBtn = document.getElementById("phoneRealtimeCopyBtn");
const phoneRealtimeSendBtn = document.getElementById("phoneRealtimeSendBtn");
const phoneRealtimeStatus = document.getElementById("phoneRealtimeStatus");
const phoneRealtimeTranscript = document.getElementById("phoneRealtimeTranscript");
const geminiRelayInput = document.getElementById("geminiRelayInput");
const geminiRelaySendBtn = document.getElementById("geminiRelaySendBtn");
const swipeUpBtn = document.getElementById("swipeUpBtn");
const swipeDownBtn = document.getElementById("swipeDownBtn");
const typeInput = document.getElementById("typeInput");
const typeSendBtn = document.getElementById("typeSendBtn");
const waEnabled = document.getElementById("waEnabled");
const waNotifyMode = document.getElementById("waNotifyMode");
const waSaveConfigBtn = document.getElementById("waSaveConfigBtn");
const waAccountSid = document.getElementById("waAccountSid");
const waAuthToken = document.getElementById("waAuthToken");
const waFromNumber = document.getElementById("waFromNumber");
const waToNumber = document.getElementById("waToNumber");
const waBackupAsolariaNumber = document.getElementById("waBackupAsolariaNumber");
const waBackupUserNumber = document.getElementById("waBackupUserNumber");
const waMessage = document.getElementById("waMessage");
const waIncludeVoice = document.getElementById("waIncludeVoice");
const waVoiceText = document.getElementById("waVoiceText");
const waSendBtn = document.getElementById("waSendBtn");
const waBackupToAsolariaBtn = document.getElementById("waBackupToAsolariaBtn");
const waBackupToUserBtn = document.getElementById("waBackupToUserBtn");
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
  uiLevel: "talk",
  selectedDeviceId: "",
  orientation: "unknown",
  proMirror: null,
  whatsapp: null,
  phoneLiveRouteMode: "gemini",
  phoneLiveVoiceEnabled: true,
  phoneLiveVoiceOutputMode: "browser",
  phoneLiveVoiceAutoSpeakReplies: true,
  phoneLiveVoiceVolume: 80,
  phoneLiveWakeWord: "asolaria",
  phoneLiveAvatarState: "idle",
  launcherIntent: "voice",
  phoneLiveRecognition: null,
  phoneLiveListening: false,
  phoneLiveRequested: false,
  phoneLiveOneShot: false,
  phoneLiveVoiceDispatching: false,
  phoneLiveWakeLoopEnabled: false,
  phoneLiveWakeListening: false,
  phoneLiveWakeAwaitingCommand: false,
  phoneLiveWakeRestartTimer: null,
  phoneLiveWakeSuppressedUntilMs: 0,
  phoneLiveFollowupWindowUntilMs: 0,
  phoneLivePendingSpeechText: "",
  phoneLivePendingSpeechDispatched: false,
  phoneLiveSilenceTimer: null,
  phoneLiveSilenceTimeoutMs: 900,
  phoneLiveAutoSendAfterSpeech: true,
  phoneLiveTwoStageEnabled: true,
  phoneLiveCurrentAudio: null,
  phoneLiveChunk: {
    active: false,
    captureActive: false,
    draining: false,
    native: false,
    sessionId: "",
    stream: null,
    recorder: null,
    mimeType: "",
    seedBlob: null,
    chunkQueue: [],
    sending: false,
    sequence: 0,
    transcript: "",
    stopRequested: false,
    emptyChunkStreak: 0,
    finalizeReason: "",
    finalizeLevel: "",
    autoDispatch: false
  },
  autoRefresh: false,
  inboxRefreshTimer: null,
  inbox: null,
  observerFollowsLive: true,
  controlsSticky: true,
  controlsArmedUntilMs: 0,
  controlGuardTimer: null,
  refreshTimer: null,
  refreshing: false,
  phoneRealtime: {
    supported: Boolean(window.MediaRecorder && (navigator.mediaDevices?.getDisplayMedia || navigator.mediaDevices?.getUserMedia)),
    captureSource: "tab_audio",
    active: false,
    captureActive: false,
    draining: false,
    sessionId: "",
    stream: null,
    recorder: null,
    mimeType: "",
    seedBlob: null,
    chunkQueue: [],
    sending: false,
    sequence: 0,
    transcript: "",
    stopRequested: false,
    droppedChunks: 0,
    emptyChunkStreak: 0,
    finalizeReason: "",
    finalizeLevel: ""
  }
};

const CONTROL_ARM_WINDOW_MS = 5 * 60 * 1000;
const CONTROL_STICKY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const REMOTE_BASE_STORAGE_KEY = "asolaria.mobile.remote_base_url.v1";
const MOBILE_TOKEN_STORAGE_KEY = "asolaria.phone_mode.token";
const PHONE_LIVE_ROUTE_MODE_STORAGE_KEY = "asolaria.phone_live.route_mode.v2";
const PHONE_LIVE_VOLUME_STORAGE_KEY = "asolaria.phone_live.voice_volume";
const PHONE_LIVE_AUTO_SEND_STORAGE_KEY = "asolaria.phone_live.auto_send_after_speech.v1";
const PHONE_LIVE_WAKE_LOOP_STORAGE_KEY = "asolaria.phone_live.wake_loop.v1";
const PHONE_LIVE_FOLLOWUP_WINDOW_MS = 12_000;
const PHONE_LIVE_PENDING_RETRY_STORAGE_KEY = "asolaria.phone_live.pending_retry.v1";
const PHONE_UI_LEVEL_STORAGE_KEY = "asolaria.phone_mode.ui_level";
const PHONE_AVATAR_GREETING_STORAGE_KEY = "asolaria.phone_mode.avatar_greeting_v2";
const PHONE_LIVE_DEFAULT_CHAT_ID = "phone-live";
const ALLOWED_CHANNELS = new Set(["usb", "vpn", "private_internet", "public_internet"]);
const PHONE_LIVE_KNOWN_WAKE_WORDS = Object.freeze(["Asolaria"]);
const PHONE_LIVE_WAKE_ALIASES = Object.freeze(["asolaria", "hilaria", "hilary", "hillary", "solaria"]);
const PHONE_REALTIME_CAPTURE_SOURCES = Object.freeze([
  "tab_audio",
  "window_audio",
  "screen_audio",
  "microphone"
]);
const PHONE_REALTIME_TIMESLICE_MS = 1000;
const PHONE_REALTIME_MAX_QUEUE = 10;
const PHONE_REALTIME_SOFT_QUEUE = 4;
const PHONE_REALTIME_MODEL = "tiny.en";
const PHONE_REALTIME_MAX_TEXT_CHARS = 24000;
const PHONE_REALTIME_MAX_PENDING_BLOB_BYTES = 5 * 1024 * 1024;
const INBOX_REFRESH_INTERVAL_MS = 20000;
const PHONE_PUSH_SW_PATH = "/mobile-push-sw.js?v=20260222-1";
const USB_FAILOVER_HEALTH_PROBE_TIMEOUT_MS = 3500;
let usbFailoverInFlight = false;
let usbFailoverLastAt = 0;
let phoneLivePendingRetryReplayStarted = false;

function getQuery(name) {
  const url = new URL(window.location.href);
  return String(url.searchParams.get(name) || "").trim();
}

async function registerPhoneServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }
  try {
    await navigator.serviceWorker.register(PHONE_PUSH_SW_PATH);
    await navigator.serviceWorker.ready;
    return true;
  } catch {
    return false;
  }
}

function stripQueryTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token")) {
    return;
  }
  url.searchParams.delete("token");
  const normalized = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", normalized);
}

function getStoredToken() {
  return String(localStorage.getItem(MOBILE_TOKEN_STORAGE_KEY) || "").trim();
}

function setStoredToken(value) {
  const token = String(value || "").trim();
  if (!token) {
    localStorage.removeItem(MOBILE_TOKEN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(MOBILE_TOKEN_STORAGE_KEY, token);
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

function isPhoneLiveRouteSwitchError(error) {
  const message = String(error?.message || error || "").trim().toLowerCase();
  if (!message) {
    return false;
  }
  return message.includes("usb link lost")
    || message.includes("switching to internet path");
}

function setPendingPhoneLiveRetry(text, options = {}) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return;
  }
  const payload = {
    text: cleaned,
    displayText: String(options.displayText || "").replace(/\s+/g, " ").trim(),
    createdAt: Date.now()
  };
  try {
    sessionStorage.setItem(PHONE_LIVE_PENDING_RETRY_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function takePendingPhoneLiveRetry(maxAgeMs = 2 * 60 * 1000) {
  let raw = "";
  try {
    raw = String(sessionStorage.getItem(PHONE_LIVE_PENDING_RETRY_STORAGE_KEY) || "").trim();
    sessionStorage.removeItem(PHONE_LIVE_PENDING_RETRY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const text = String(parsed?.text || "").replace(/\s+/g, " ").trim();
    const createdAt = Number(parsed?.createdAt || 0);
    if (!text) {
      return null;
    }
    if (createdAt > 0 && (Date.now() - createdAt) > maxAgeMs) {
      return null;
    }
    return {
      text,
      displayText: String(parsed?.displayText || "").replace(/\s+/g, " ").trim()
    };
  } catch {
    return null;
  }
}

function clearPhoneLiveWakeRestartTimer() {
  if (state.phoneLiveWakeRestartTimer) {
    window.clearTimeout(state.phoneLiveWakeRestartTimer);
    state.phoneLiveWakeRestartTimer = null;
  }
}

function clearPhoneLiveFollowupWindow() {
  state.phoneLiveFollowupWindowUntilMs = 0;
}

function isPhoneLiveFollowupWindowActive() {
  return Number(state.phoneLiveFollowupWindowUntilMs || 0) > Date.now();
}

function openPhoneLiveFollowupWindow(durationMs = PHONE_LIVE_FOLLOWUP_WINDOW_MS) {
  const nextDuration = Math.max(3_000, Number(durationMs || PHONE_LIVE_FOLLOWUP_WINDOW_MS));
  state.phoneLiveWakeAwaitingCommand = false;
  state.phoneLiveFollowupWindowUntilMs = Date.now() + nextDuration;
}

function getPhoneWakeLoopReadyStatus() {
  if (state.phoneLiveWakeAwaitingCommand) {
    return "Wake word heard. Listening for your command...";
  }
  if (isPhoneLiveFollowupWindowActive()) {
    return "Listening for follow-up...";
  }
  return `Always listening for "Hello ${state.phoneLiveWakeWord || "Asolaria"}"...`;
}

function shouldKeepPhoneWakeLoopActive() {
  if (!state.phoneLiveWakeLoopEnabled) {
    return false;
  }
  if (document.visibilityState && document.visibilityState !== "visible") {
    return false;
  }
  return true;
}

function updatePhoneLiveWakeLoopToggle() {
  if (!phoneLiveWakeLoopToggle) {
    return;
  }
  phoneLiveWakeLoopToggle.checked = Boolean(state.phoneLiveWakeLoopEnabled);
}

function normalizePhoneWakeTranscript(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectPhoneWakeAliases() {
  const rawWakeWord = String(state.phoneLiveWakeWord || "").trim().toLowerCase();
  const values = new Set(PHONE_LIVE_WAKE_ALIASES);
  if (rawWakeWord) {
    values.add(rawWakeWord);
  }
  return Array.from(values).filter(Boolean);
}

function escapeRegex(text = "") {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripPhoneWakePrefix(text = "") {
  const raw = String(text || "").trim();
  if (!raw) {
    return "";
  }
  const aliases = collectPhoneWakeAliases();
  for (const alias of aliases) {
    const pattern = new RegExp(`^\\s*(?:hello|hey|hi)?\\s*${escapeRegex(alias)}\\b[\\s,:;.!?-]*`, "i");
    if (pattern.test(raw)) {
      return raw.replace(pattern, "").replace(/\s+/g, " ").trim();
    }
  }
  return raw.replace(/\s+/g, " ").trim();
}

function isPhoneWakePhrase(text = "") {
  const normalized = normalizePhoneWakeTranscript(text);
  if (!normalized) {
    return false;
  }
  return collectPhoneWakeAliases().some((alias) => {
    if (!alias) return false;
    return normalized === alias
      || normalized === `hello ${alias}`
      || normalized === `hey ${alias}`
      || normalized === `hi ${alias}`
      || normalized.startsWith(`${alias} `)
      || normalized.startsWith(`hello ${alias} `)
      || normalized.startsWith(`hey ${alias} `)
      || normalized.startsWith(`hi ${alias} `);
  });
}

function schedulePhoneWakeLoop(reason = "", delayMs = 450) {
  clearPhoneLiveWakeRestartTimer();
  if (!shouldKeepPhoneWakeLoopActive()) {
    return;
  }
  const nextDelay = Math.max(120, Number(delayMs || 0));
  state.phoneLiveWakeRestartTimer = window.setTimeout(() => {
    state.phoneLiveWakeRestartTimer = null;
    ensurePhoneWakeLoop(reason);
  }, nextDelay);
}

function ensurePhoneWakeLoop(reason = "") {
  if (!shouldKeepPhoneWakeLoopActive()) {
    return false;
  }
  if (Date.now() < Number(state.phoneLiveWakeSuppressedUntilMs || 0)) {
    schedulePhoneWakeLoop(reason || "suppressed", 400);
    return false;
  }
  if (state.phoneLiveVoiceDispatching || state.phoneLiveListening || state.phoneLiveRequested) {
    return false;
  }
  const started = startPhoneLiveVoice({ oneShot: false, wakeLoop: true });
  if (started) {
    setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
  }
  return started;
}

function savePhoneLiveWakeLoopPreference(enabled) {
  state.phoneLiveWakeLoopEnabled = Boolean(enabled);
  updatePhoneLiveWakeLoopToggle();
  try {
    localStorage.setItem(
      PHONE_LIVE_WAKE_LOOP_STORAGE_KEY,
      state.phoneLiveWakeLoopEnabled ? "true" : "false"
    );
  } catch {}
}

function setPhoneLiveWakeLoopEnabled(enabled, options = {}) {
  savePhoneLiveWakeLoopPreference(enabled);
  clearPhoneLiveWakeRestartTimer();
  if (!state.phoneLiveWakeLoopEnabled) {
    state.phoneLiveWakeAwaitingCommand = false;
    state.phoneLiveWakeListening = false;
    state.phoneLiveWakeSuppressedUntilMs = 0;
    clearPhoneLiveFollowupWindow();
    if (!options.silent) {
      setPhoneLiveVoiceStatus("Wake listening off. Press Push-to-Talk or type.", "ok");
    }
    if (!state.phoneLiveVoiceDispatching && (state.phoneLiveListening || state.phoneLiveRequested)) {
      stopPhoneLiveVoice({ preserveStatus: true, skipWakeRearm: true });
    }
    return;
  }
  if (!options.silent) {
    setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
  }
  schedulePhoneWakeLoop("toggle_enable", 120);
}

function loadPhoneLiveWakeLoopPreference() {
  let enabled = false;
  try {
    const raw = String(localStorage.getItem(PHONE_LIVE_WAKE_LOOP_STORAGE_KEY) || "").trim().toLowerCase();
    enabled = raw === "true" || raw === "1" || raw === "yes" || raw === "on";
  } catch {}
  setPhoneLiveWakeLoopEnabled(enabled, { silent: true });
}

function shouldTreatAsWakeLoopSession() {
  return Boolean(
    state.phoneLiveWakeListening
    || state.phoneLiveWakeAwaitingCommand
    || isPhoneLiveFollowupWindowActive()
  );
}

function queuePhoneLiveRecognizedText(text = "") {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return false;
  }
  state.phoneLivePendingSpeechText = cleaned;
  if (phoneLiveChatInput) {
    const previous = String(phoneLiveChatInput.value || "").trim();
    phoneLiveChatInput.value = previous ? `${previous}\n${cleaned}` : cleaned;
    phoneLiveChatInput.focus();
  }
  setPhoneLiveAvatarState("thinking", "Captured voice input.");
  if (shouldAutoDispatchPhoneLiveSpeech()) {
    state.phoneLivePendingSpeechDispatched = true;
    setPhoneLiveVoiceStatus("Sending captured voice automatically...", "ok");
    state.phoneLivePendingSpeechText = "";
    dispatchPhoneLiveVoiceText(cleaned).catch((error) => {
      state.phoneLivePendingSpeechDispatched = false;
      state.phoneLivePendingSpeechText = cleaned;
      setPhoneLiveVoiceStatus(`Voice send failed: ${error.message}`, "error");
      setPhoneLiveAvatarState("error", "Voice send failed.");
    });
  } else {
    state.phoneLivePendingSpeechDispatched = false;
    setPhoneLiveVoiceStatus("Voice captured. Press Send to continue.", "ok");
  }
  return true;
}

function handlePhoneWakeTranscript(text = "") {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return false;
  }
  if (!shouldTreatAsWakeLoopSession()) {
    return false;
  }
  const wakeOnly = isPhoneWakePhrase(cleaned) && !stripPhoneWakePrefix(cleaned);
  if (isPhoneLiveFollowupWindowActive()) {
    state.phoneLiveWakeListening = false;
    state.phoneLiveWakeAwaitingCommand = false;
    clearPhoneLiveFollowupWindow();
    state.phoneLiveWakeSuppressedUntilMs = Date.now() + 350;
    if (wakeOnly) {
      state.phoneLiveWakeAwaitingCommand = true;
      setPhoneLiveAvatarState("listening", "Follow-up window active.");
      setPhoneLiveVoiceStatus("Listening for your follow-up...", "ok");
      schedulePhoneWakeLoop("followup_wake_only", 220);
      return true;
    }
    queuePhoneLiveRecognizedText(cleaned);
    return true;
  }
  if (state.phoneLiveWakeAwaitingCommand && !wakeOnly) {
    state.phoneLiveWakeAwaitingCommand = false;
    state.phoneLiveWakeListening = false;
    clearPhoneLiveFollowupWindow();
    state.phoneLiveWakeSuppressedUntilMs = Date.now() + 500;
    queuePhoneLiveRecognizedText(cleaned);
    return true;
  }
  if (!isPhoneWakePhrase(cleaned)) {
    state.phoneLiveWakeListening = false;
    state.phoneLivePendingSpeechText = "";
    state.phoneLivePendingSpeechDispatched = false;
    setPhoneLiveAvatarState("idle", "Wake listener armed.");
    setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
    schedulePhoneWakeLoop("ignored_transcript", 300);
    return true;
  }
  const command = stripPhoneWakePrefix(cleaned);
  state.phoneLiveWakeListening = false;
  if (!command) {
    state.phoneLiveWakeAwaitingCommand = true;
    state.phoneLiveWakeSuppressedUntilMs = Date.now() + 350;
    setPhoneLiveAvatarState("listening", "Wake word heard.");
    setPhoneLiveVoiceStatus("Wake word heard. Listening for your command...", "ok");
    speakTextViaAndroid("Yes Jesse?", { volumePercent: state.phoneLiveVoiceVolume }).catch(() => {});
    schedulePhoneWakeLoop("awaiting_command", 450);
    return true;
  }
  state.phoneLiveWakeAwaitingCommand = false;
  clearPhoneLiveFollowupWindow();
  state.phoneLiveWakeSuppressedUntilMs = Date.now() + 500;
  queuePhoneLiveRecognizedText(command);
  return true;
}

function requestedChannel() {
  const raw = String(getQuery("channel") || "").trim().toLowerCase();
  if (ALLOWED_CHANNELS.has(raw)) {
    return raw;
  }
  return "";
}

function sanitizeRemoteBaseUrl(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  try {
    const parsed = new URL(text);
    const protocol = String(parsed.protocol || "").toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return "";
    }
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch (_error) {
    return "";
  }
}

function setStoredRemoteBaseUrl(value) {
  const normalized = sanitizeRemoteBaseUrl(value);
  try {
    if (!normalized) {
      localStorage.removeItem(REMOTE_BASE_STORAGE_KEY);
    } else {
      localStorage.setItem(REMOTE_BASE_STORAGE_KEY, normalized);
    }
  } catch (_error) {
    // ignore localStorage failures
  }
  return normalized;
}

function getStoredRemoteBaseUrl() {
  try {
    return sanitizeRemoteBaseUrl(localStorage.getItem(REMOTE_BASE_STORAGE_KEY) || "");
  } catch (_error) {
    return "";
  }
}

function isLoopbackHostName(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function parseIpv4Host(host) {
  const text = String(host || "").trim().toLowerCase();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) {
    return null;
  }
  const parts = text.split(".").map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts;
}

function isCarrierGradeNatHost(host) {
  const parts = parseIpv4Host(host);
  return Array.isArray(parts) && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

function isPrivateIpv4Host(host) {
  const parts = parseIpv4Host(host);
  if (!Array.isArray(parts)) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function inferChannelFromHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host || isLoopbackHostName(host)) {
    return "usb";
  }
  if (host.endsWith(".ts.net") || host.endsWith(".tailnet") || isCarrierGradeNatHost(host)) {
    return "vpn";
  }
  if (isPrivateIpv4Host(host)) {
    return "private_internet";
  }
  return "public_internet";
}

function resolveKnownRemoteBaseUrl() {
  const stored = getStoredRemoteBaseUrl();
  if (!stored) {
    return "";
  }
  try {
    const host = new URL(stored).hostname;
    return isLoopbackHostName(host) ? "" : stored;
  } catch (_error) {
    return "";
  }
}

function inferFallbackChannelFromRemoteBase(remoteBaseUrl) {
  const fallback = "private_internet";
  try {
    const parsed = new URL(String(remoteBaseUrl || "").trim());
    const inferred = inferChannelFromHost(parsed.hostname || "");
    if (inferred === "usb") {
      return fallback;
    }
    return inferred || fallback;
  } catch (_error) {
    return fallback;
  }
}

function hasHealthyUsbKeeperTail(statusPayload) {
  const keeper = statusPayload?.phoneBridgeKeeper || statusPayload?.keeper || {};
  if (!keeper || keeper.running !== true) {
    return false;
  }
  const tail = String(keeper.latestLogTail || "").toLowerCase();
  const authorizedMatch = tail.match(/authorized=(\d+)/i);
  const authorizedCount = authorizedMatch ? Number(authorizedMatch[1]) : 0;
  const reverseReady = tail.includes("reverse_present")
    || tail.includes("reverse_set")
    || tail.includes("reverse_ok=true");
  return authorizedCount > 0 && reverseReady;
}

async function isUsbPathHealthyForFailoverProbe() {
  if (requestedChannel() !== "usb") {
    return false;
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), USB_FAILOVER_HEALTH_PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(buildAbsoluteApiUrl("/api/mobile/control/status", { _ts: Date.now() }), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      return false;
    }
    const payload = await response.json().catch(() => null);
    if (!payload?.ok) {
      return false;
    }
    if (hasHealthyUsbKeeperTail(payload)) {
      return true;
    }
    const tunnel = payload?.phoneTunnelMonitor || payload?.monitor || {};
    const tunnelPass = tunnel.latestReportPass === true
      || /ok=true/i.test(String(tunnel.latestLogTail || ""));
    return Boolean(payload?.control && tunnelPass);
  } catch (_error) {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

async function maybeTriggerUsbFailover(reasonText = "") {
  if (requestedChannel() !== "usb") {
    return false;
  }
  if (usbFailoverInFlight) {
    return true;
  }
  const now = Date.now();
  if ((now - usbFailoverLastAt) < 25000) {
    return false;
  }
  const remoteBaseUrl = resolveKnownRemoteBaseUrl();
  if (!remoteBaseUrl) {
    return false;
  }
  let nextUrl = "";
  try {
    const remote = new URL(remoteBaseUrl);
    const next = new URL(window.location.pathname, `${remote.protocol}//${remote.host}`);
    const token = authToken();
    if (token) {
      next.searchParams.set("token", token);
    }
    next.searchParams.set("channel", inferFallbackChannelFromRemoteBase(remoteBaseUrl));
    nextUrl = next.toString();
  } catch (_error) {
    return false;
  }
  if (await isUsbPathHealthyForFailoverProbe()) {
    logLine("USB failover skipped because the local control path is still healthy.");
    return false;
  }
  usbFailoverInFlight = true;
  usbFailoverLastAt = now;
  logLine(`USB link lost (${String(reasonText || "network_error").slice(0, 120)}). Switching to internet path...`);
  window.setTimeout(() => {
    window.location.href = nextUrl;
  }, 140);
  return true;
}

function shouldAttemptUsbFailoverForError(error) {
  const message = String(error?.message || error || "").trim().toLowerCase();
  if (!message) {
    return false;
  }
  if (error?.name === "AbortError") {
    return false;
  }
  if (
    message.includes("request timed out")
    || message.includes("request_timeout")
    || message.includes("timed out")
    || message.includes("timeout")
  ) {
    return false;
  }
  return (
    message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("network error")
    || message.includes("err_connection_refused")
    || message.includes("connection refused")
    || message.includes("econnrefused")
    || message.includes("enotfound")
    || message.includes("dns")
    || message.includes("usb link lost")
  );
}

function buildApiUrl(path, extraQuery = null) {
  const url = new URL(String(path || "/"), window.location.origin);
  const token = authToken();
  if (token) {
    url.searchParams.set("token", token);
  }
  const channel = requestedChannel();
  if (channel) {
    url.searchParams.set("channel", channel);
  }
  if (extraQuery && typeof extraQuery === "object") {
    for (const [key, value] of Object.entries(extraQuery)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(String(key), String(value));
    }
  }
  return `${url.pathname}${url.search}`;
}

function buildAbsoluteApiUrl(path, extraQuery = null) {
  return new URL(buildApiUrl(path, extraQuery), window.location.origin).toString();
}

// If the page was opened with ?token=..., persist then scrub it from the URL.
authToken();

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
  const requestUrl = buildApiUrl(url, options.query);
  const init = {
    method,
    headers: {}
  };
  let abortTimer = null;
  let abortController = null;
  const timeoutMs = Math.max(0, Number(options.timeoutMs || 0));
  if (timeoutMs > 0 && typeof AbortController !== "undefined") {
    abortController = new AbortController();
    init.signal = abortController.signal;
    abortTimer = window.setTimeout(() => {
      try {
        abortController.abort(new Error("request_timeout"));
      } catch {}
    }, timeoutMs);
  }
  const token = authToken();
  if (token) {
    init.headers["x-asolaria-mobile-token"] = token;
    init.headers["x-asolaria-token"] = token;
  }
  const channel = requestedChannel();
  if (channel) {
    init.headers["x-asolaria-channel"] = channel;
  }
  if (options.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  let response = null;
  try {
    response = await fetch(requestUrl, init);
  } catch (error) {
    if (abortTimer) {
      window.clearTimeout(abortTimer);
      abortTimer = null;
    }
    const switched = shouldAttemptUsbFailoverForError(error)
      ? await maybeTriggerUsbFailover(`${method} ${url}: ${String(error?.message || "network_error")}`)
      : false;
    if (switched) {
      throw new Error("USB link lost. Switching to internet path...");
    }
    if (error?.name === "AbortError") {
      throw new Error("Request timed out.");
    }
    throw error;
  }
  let payload = null;
  const text = await response.text();
  if (abortTimer) {
    window.clearTimeout(abortTimer);
    abortTimer = null;
  }
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
    const retryable = Number(response.status || 0) >= 500 || /failed to fetch|network|econn|enotfound/i.test(String(error.message || ""));
    if (requestedChannel() === "usb" && retryable) {
      const switched = shouldAttemptUsbFailoverForError(error)
        ? await maybeTriggerUsbFailover(`${method} ${url}: ${error.message}`)
        : false;
      if (switched) {
        throw new Error("USB link lost. Switching to internet path...");
      }
    }
    throw error;
  }
  return payload || { ok: true };
}

function isNoAuthorizedPhoneDeviceError(error) {
  const dataError = String(error?.data?.error || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();
  return dataError === "no_authorized_phone_device"
    || message.includes("no_authorized_phone_device");
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeVoiceOutputMode(value, fallback = "browser") {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "browser"
    || normalized === "server"
    || normalized === "kitty_tts"
    || normalized === "android_tts"
    || normalized === "gemini_live_audio"
  ) {
    return normalized;
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (
    safeFallback === "browser"
    || safeFallback === "server"
    || safeFallback === "kitty_tts"
    || safeFallback === "android_tts"
    || safeFallback === "gemini_live_audio"
  ) {
    return safeFallback;
  }
  return "browser";
}

function normalizeUiLevel(value, fallback = "talk") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "talk" || normalized === "control" || normalized === "admin") {
    return normalized;
  }
  const fallbackValue = String(fallback || "").trim().toLowerCase();
  if (fallbackValue === "talk" || fallbackValue === "control" || fallbackValue === "admin") {
    return fallbackValue;
  }
  return "talk";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
  const parsed = new Date(value || "");
  if (!Number.isFinite(parsed.getTime())) {
    return "n/a";
  }
  return parsed.toLocaleString();
}

function formatRelativeAge(value) {
  const parsed = new Date(value || "");
  if (!Number.isFinite(parsed.getTime())) {
    return "n/a";
  }
  const deltaMs = Date.now() - parsed.getTime();
  const deltaMinutes = Math.max(0, Math.round(deltaMs / 60000));
  if (deltaMinutes < 1) return "just now";
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function riskClassName(level) {
  const normalized = String(level || "").trim().toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return `is-${normalized}`;
  }
  return "is-medium";
}

function navigatePhonePage(path) {
  window.location.href = buildApiUrl(path);
}

function setInboxStatus(text = "", level = "") {
  if (!inboxStatus) {
    return;
  }
  inboxStatus.textContent = String(text || "").trim() || "Inbox ready.";
  inboxStatus.classList.remove("is-ok", "is-warn");
  if (level === "ok") {
    inboxStatus.classList.add("is-ok");
  } else if (level === "warn") {
    inboxStatus.classList.add("is-warn");
  }
}

function renderInboxEmpty(target, text) {
  if (!target) {
    return;
  }
  target.innerHTML = `<div class="inbox-empty">${escapeHtml(text)}</div>`;
}

function prefillPhoneLiveChat(text, statusText = "Context copied into chat.") {
  const next = String(text || "").trim();
  if (!next || !phoneLiveChatInput) {
    return;
  }
  state.launcherIntent = "text";
  applyUiLevel("talk");
  phoneLiveChatInput.value = next;
  setPhoneLauncherStatus(statusText, "ok");
  focusPhoneLiveChatInput();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderUiLevelHint() {
  if (!uiLevelHint) {
    return;
  }
  if (state.uiLevel === "talk") {
    uiLevelHint.textContent = "Talk: voice/chat only";
    return;
  }
  if (state.uiLevel === "admin") {
    uiLevelHint.textContent = "Admin: full controls + linked mode";
    return;
  }
  uiLevelHint.textContent = "Control: mirror + WhatsApp + voice";
}

function setPhoneLauncherStatus(text = "", level = "") {
  if (!phoneLauncherStatus) {
    return;
  }
  const message = String(text || "").trim()
    || "Ready. Talk or type now, or switch to control/admin modes.";
  phoneLauncherStatus.textContent = message;
  phoneLauncherStatus.classList.remove("is-ok", "is-warn");
  if (level === "ok") {
    phoneLauncherStatus.classList.add("is-ok");
  } else if (level === "warn") {
    phoneLauncherStatus.classList.add("is-warn");
  }
}

function syncPhoneLauncherButtons() {
  const activeVoice = Boolean(state.phoneLiveListening || state.phoneLiveRequested);
  if (phoneLaunchVoiceBtn) {
    phoneLaunchVoiceBtn.classList.toggle("is-active", activeVoice || state.launcherIntent === "voice");
  }
  if (phoneLaunchTextBtn) {
    phoneLaunchTextBtn.classList.toggle("is-active", state.launcherIntent === "text");
  }
  if (phoneLaunchVideoBtn) {
    phoneLaunchVideoBtn.classList.toggle("is-active", state.launcherIntent === "video");
  }
  if (phoneLaunchAdvancedBtn) {
    phoneLaunchAdvancedBtn.classList.toggle("is-active", state.launcherIntent === "advanced");
  }
  if (phoneLaunchSuperAdvancedBtn) {
    phoneLaunchSuperAdvancedBtn.classList.toggle("is-active", state.launcherIntent === "super_advanced");
  }
}

function focusPhoneLiveChatInput() {
  if (!phoneLiveChatInput || typeof phoneLiveChatInput.focus !== "function") {
    return;
  }
  try {
    phoneLiveChatInput.focus({ preventScroll: true });
  } catch {
    phoneLiveChatInput.focus();
  }
}

function openMirrorControlsView() {
  if (phoneMirrorControlsCard && typeof phoneMirrorControlsCard.scrollIntoView === "function") {
    phoneMirrorControlsCard.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function applyUiLevel(level, options = {}) {
  const next = normalizeUiLevel(level, state.uiLevel || "talk");
  state.uiLevel = next;
  document.body.classList.toggle("ui-level-talk", next === "talk");
  document.body.classList.toggle("ui-level-control", next === "control");
  document.body.classList.toggle("ui-level-admin", next === "admin");
  if (uiLevelSelect && uiLevelSelect.value !== next) {
    uiLevelSelect.value = next;
  }
  renderUiLevelHint();
  syncPhoneLauncherButtons();
  if (!options.skipPersist) {
    try {
      localStorage.setItem(PHONE_UI_LEVEL_STORAGE_KEY, next);
    } catch {}
  }
  applyPhoneLiveChatWindow();
}

function loadUiLevel() {
  let saved = "talk";
  try {
    saved = String(localStorage.getItem(PHONE_UI_LEVEL_STORAGE_KEY) || "talk");
  } catch {
    saved = "talk";
  }
  applyUiLevel(saved, { skipPersist: true });
  if (state.uiLevel === "talk") {
    state.launcherIntent = "voice";
  } else if (state.uiLevel === "admin") {
    state.launcherIntent = "super_advanced";
  } else {
    state.launcherIntent = "advanced";
  }
  syncPhoneLauncherButtons();
}

function normalizeVolumePercent(value, fallback = 80) {
  if (value === null || value === undefined) {
    return Math.max(0, Math.min(100, Number(fallback) || 80));
  }
  if (typeof value === "string" && !value.trim()) {
    return Math.max(0, Math.min(100, Number(fallback) || 80));
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.min(100, Number(fallback) || 80));
  }
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function volumePercentToGain(value) {
  return Math.max(0, Math.min(1, normalizeVolumePercent(value, 80) / 100));
}

function hasAndroidSpeechTtsBridge() {
  const bridge = window.AsolariaAndroid;
  return Boolean(bridge && typeof bridge.speakText === "function");
}

function resolveEffectivePhoneVoiceOutputMode(value, fallback = "browser") {
  const configured = normalizeVoiceOutputMode(value, fallback);
  if (configured === "browser" && hasAndroidSpeechTtsBridge()) {
    return "android_tts";
  }
  return configured;
}

function escapeSpeechGrammarToken(value) {
  return String(value || "")
    .replace(/[;|=<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectPhoneSpeechHintWords(wakeWord = "") {
  const seed = [...PHONE_LIVE_KNOWN_WAKE_WORDS, String(wakeWord || "").trim()];
  const seen = new Set();
  const hints = [];
  for (const value of seed) {
    const cleaned = escapeSpeechGrammarToken(value).slice(0, 48);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push(cleaned);
  }
  return hints;
}

function applyPhoneSpeechRecognitionHints(recognition, wakeWord = "") {
  if (!recognition) return;
  const hints = collectPhoneSpeechHintWords(wakeWord);
  if (hints.length < 1) return;
  try {
    const GrammarCtor = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    if (typeof GrammarCtor !== "function") {
      return;
    }
    const grammar = `#JSGF V1.0; grammar wake; public <wake> = ${hints.join(" | ")} ;`;
    const grammarList = new GrammarCtor();
    grammarList.addFromString(grammar, 1);
    recognition.grammars = grammarList;
  } catch {
    // Speech grammar hints are best-effort per browser.
  }
}

function getPreferredSpeechLang(text = "") {
  const raw = String(text || "").trim().toLowerCase();
  if (raw.startsWith("pt") || raw.includes("portuguese")) return "pt-BR";
  if (raw.startsWith("en") || raw.includes("english")) return "en-US";
  return "en-US";
}

const SPEECH_FEMININE_HINTS = Object.freeze([
  "female",
  "woman",
  "girl",
  "zira",
  "jenny",
  "aria",
  "ava",
  "samantha",
  "victoria",
  "camila",
  "helena",
  "google uk english female"
]);

const SPEECH_MASCULINE_HINTS = Object.freeze([
  "male",
  "man",
  "david",
  "mark",
  "guy",
  "jorge",
  "joao",
  "paulo"
]);

const SPEECH_WINDOWS_PREFERRED_HINTS = Object.freeze([
  "microsoft aria",
  "microsoft jenny",
  "microsoft zira",
  "microsoft guy",
  "microsoft david",
  "natural"
]);

const SPEECH_WINDOWS_US_HINTS = Object.freeze([
  "united states",
  "en-us",
  " english us",
  " english (united states)"
]);

const SPEECH_WINDOWS_DEPRIORITIZED_HINTS = Object.freeze([
  "united kingdom",
  "great britain",
  "australia",
  "canada",
  "india",
  "ireland",
  "irish",
  "scotland",
  "scottish",
  "uk english"
]);

function isWindowsSpeechClient() {
  const platform = String(navigator?.userAgentData?.platform || navigator?.platform || "").toLowerCase();
  const agent = String(navigator?.userAgent || "").toLowerCase();
  return platform.includes("win") || agent.includes("windows");
}

function scoreSpeechVoice(voice, lang = "en-US") {
  const normalizedLang = String(lang || "en-US").toLowerCase();
  const voiceLang = String(voice?.lang || "").toLowerCase();
  const name = String(voice?.name || "").trim().toLowerCase();
  const identity = `${name} ${voiceLang}`.trim();
  let score = 0;
  if (!name) {
    return score;
  }
  if (voiceLang === normalizedLang) {
    score += 8;
  } else {
    const base = normalizedLang.split("-")[0];
    if (base && voiceLang.startsWith(`${base}-`)) {
      score += 5;
    } else if (voiceLang.startsWith("en-")) {
      score += 2;
    }
  }
  if (voice?.default) {
    score += 1;
  }
  if (voice?.localService) {
    score += 1;
  }
  if (SPEECH_FEMININE_HINTS.some((hint) => name.includes(hint))) {
    score += 3;
  }
  if (SPEECH_MASCULINE_HINTS.some((hint) => name.includes(hint))) {
    score -= 1;
  }
  if (isWindowsSpeechClient()) {
    if (SPEECH_WINDOWS_PREFERRED_HINTS.some((hint) => name.includes(hint))) {
      score += 5;
    }
    if (normalizedLang === "en-us") {
      if (SPEECH_WINDOWS_US_HINTS.some((hint) => identity.includes(hint))) {
        score += 4;
      }
      if (SPEECH_WINDOWS_DEPRIORITIZED_HINTS.some((hint) => identity.includes(hint))) {
        score -= 6;
      }
    }
  }
  return score;
}

function chooseSpeechVoice(voices = [], lang = "en-US") {
  const list = Array.isArray(voices) ? voices : [];
  if (list.length < 1) return null;
  const wanted = String(lang || "en-US").toLowerCase();
  const rankVoices = (voiceList) => voiceList
    .map((voice) => ({ voice, score: scoreSpeechVoice(voice, wanted) }))
    .sort((a, b) => b.score - a.score);
  const exact = rankVoices(
    list.filter((voice) => String(voice?.lang || "").toLowerCase() === wanted)
  )[0]?.voice;
  if (exact) return exact;
  const base = wanted.split("-")[0];
  if (base) {
    const family = rankVoices(
      list.filter((voice) => String(voice?.lang || "").toLowerCase().startsWith(`${base}-`))
    )[0]?.voice;
    if (family) return family;
  }
  const en = rankVoices(
    list.filter((voice) => String(voice?.lang || "").toLowerCase().startsWith("en-"))
  )[0]?.voice;
  if (en) return en;
  const browserDefault = rankVoices(
    list.filter((voice) => Boolean(voice?.default))
  )[0]?.voice;
  return browserDefault || list[0] || null;
}

function getPreferredBrowserSpeechVoice(lang = "en-US") {
  if (!("speechSynthesis" in window)) {
    return null;
  }
  return chooseSpeechVoice(window.speechSynthesis.getVoices(), lang);
}

function shouldPreferWindowsBrowserSpeech(mode = "") {
  const normalizedMode = normalizeVoiceOutputMode(mode, "browser");
  if (normalizedMode === "browser" || normalizedMode === "android_tts") {
    return false;
  }
  if (!isWindowsSpeechClient() || hasAndroidSpeechTtsBridge() || !("speechSynthesis" in window)) {
    return false;
  }
  const preferredLang = getPreferredSpeechLang(state.phoneLiveWakeWord);
  const preferredVoice = getPreferredBrowserSpeechVoice(preferredLang);
  if (!preferredVoice) {
    return false;
  }
  const voiceName = String(preferredVoice.name || "").toLowerCase();
  return Boolean(preferredVoice.localService)
    || voiceName.includes("microsoft")
    || SPEECH_WINDOWS_PREFERRED_HINTS.some((hint) => voiceName.includes(hint));
}

function renderPhoneLiveVolume() {
  const current = normalizeVolumePercent(state.phoneLiveVoiceVolume, 80);
  state.phoneLiveVoiceVolume = current;
  if (phoneLiveVolume) {
    phoneLiveVolume.value = String(current);
  }
  if (phoneLiveVolumeValue) {
    phoneLiveVolumeValue.textContent = `${current}%`;
  }
}

function savePhoneLiveVolume(value) {
  const current = normalizeVolumePercent(value, state.phoneLiveVoiceVolume || 80);
  state.phoneLiveVoiceVolume = current;
  renderPhoneLiveVolume();
  try {
    localStorage.setItem(PHONE_LIVE_VOLUME_STORAGE_KEY, String(current));
  } catch {}
}

function loadPhoneLiveVolume() {
  let saved = 80;
  try {
    saved = normalizeVolumePercent(localStorage.getItem(PHONE_LIVE_VOLUME_STORAGE_KEY), 80);
  } catch {
    saved = 80;
  }
  state.phoneLiveVoiceVolume = saved;
  renderPhoneLiveVolume();
}

function renderPhoneLiveAutoSendToggle() {
  if (phoneLiveAutoSendToggle) {
    phoneLiveAutoSendToggle.checked = Boolean(state.phoneLiveAutoSendAfterSpeech);
  }
}

function savePhoneLiveAutoSendPreference(enabled) {
  state.phoneLiveAutoSendAfterSpeech = Boolean(enabled);
  renderPhoneLiveAutoSendToggle();
  updatePhoneLiveVoiceButtons();
  try {
    localStorage.setItem(
      PHONE_LIVE_AUTO_SEND_STORAGE_KEY,
      state.phoneLiveAutoSendAfterSpeech ? "true" : "false"
    );
  } catch {}
}

function loadPhoneLiveAutoSendPreference() {
  let enabled = true;
  try {
    const raw = localStorage.getItem(PHONE_LIVE_AUTO_SEND_STORAGE_KEY);
    if (raw !== null) {
      const normalized = String(raw).trim().toLowerCase();
      enabled = !(normalized === "false" || normalized === "0" || normalized === "off");
    }
  } catch {
    enabled = true;
  }
  state.phoneLiveAutoSendAfterSpeech = enabled;
  renderPhoneLiveAutoSendToggle();
}

function parseVoiceVolumeDirective(rawText) {
  const text = String(rawText || "");
  const match = text.match(/^\s*(?:\/?vol(?:ume)?\s*[:=]?\s*(\d{1,3})%?)\s+([\s\S]*)$/i);
  if (!match) {
    return {
      cleanedText: text,
      volumePercent: null
    };
  }
  const volumePercent = normalizeVolumePercent(match[1], state.phoneLiveVoiceVolume || 80);
  const cleanedText = String(match[2] || "").trim();
  return {
    cleanedText,
    volumePercent
  };
}

function setPhoneLiveAvatarState(stateName = "idle", text = "") {
  const next = String(stateName || "idle").trim().toLowerCase();
  state.phoneLiveAvatarState = ["idle", "listening", "thinking", "speaking", "error"].includes(next) ? next : "idle";
  if (phoneLiveAvatarStage) {
    phoneLiveAvatarStage.classList.remove("is-idle", "is-listening", "is-thinking", "is-speaking", "is-error");
    phoneLiveAvatarStage.classList.add(`is-${state.phoneLiveAvatarState}`);
    phoneLiveAvatarStage.setAttribute(
      "aria-pressed",
      (state.phoneLiveListening || state.phoneLiveRequested) ? "true" : "false"
    );
  }
  if (phoneLiveAvatarStatus) {
    phoneLiveAvatarStatus.textContent = String(text || "").trim()
      || `Avatar ${state.phoneLiveAvatarState}.`;
  }
}

function setPhoneLiveVoiceStatus(text = "", level = "") {
  if (!phoneLiveVoiceStatus) return;
  phoneLiveVoiceStatus.textContent = String(text || "").trim()
    || "Voice standby. Press Push-to-Talk or type.";
  phoneLiveVoiceStatus.classList.remove("live-ok", "live-error");
  if (level === "ok") {
    phoneLiveVoiceStatus.classList.add("live-ok");
  } else if (level === "error") {
    phoneLiveVoiceStatus.classList.add("live-error");
  }
}

function hasPhoneLiveChunkCaptureSupport() {
  if (getAndroidNativeMicBridge()) {
    return true;
  }
  const devices = navigator.mediaDevices || {};
  return Boolean(window.MediaRecorder && typeof devices.getUserMedia === "function");
}

function shouldPreferPhoneLiveChunkCapture() {
  if (getAndroidSpeechBridge()) {
    return false;
  }
  if (getAndroidNativeMicBridge()) {
    return true;
  }
  if (!hasPhoneLiveChunkCaptureSupport()) {
    return false;
  }
  return Boolean(window.AsolariaAndroid) || !getSpeechRecognitionCtor();
}

function isPhoneLiveChunkCaptureActive() {
  const rt = state.phoneLiveChunk;
  return Boolean(rt.active || rt.captureActive || rt.recorder);
}

function stopPhoneLiveChunkTracks() {
  if (state.phoneLiveChunk.native) {
    const nativeBridge = getAndroidNativeMicBridge();
    if (nativeBridge && typeof nativeBridge.stopNativeMicCapture === "function") {
      try {
        nativeBridge.stopNativeMicCapture();
      } catch {}
    }
    state.phoneLiveChunk.stream = null;
    return;
  }
  const stream = state.phoneLiveChunk.stream;
  if (!stream) {
    return;
  }
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {}
  }
  state.phoneLiveChunk.stream = null;
}

function resetPhoneLiveChunkState() {
  const rt = state.phoneLiveChunk;
  rt.active = false;
  rt.captureActive = false;
  rt.draining = false;
  rt.native = false;
  rt.sessionId = "";
  rt.stream = null;
  rt.recorder = null;
  rt.mimeType = "";
  rt.seedBlob = null;
  rt.chunkQueue = [];
  rt.sending = false;
  rt.sequence = 0;
  rt.transcript = "";
  rt.stopRequested = false;
  rt.emptyChunkStreak = 0;
  rt.finalizeReason = "";
  rt.finalizeLevel = "";
  rt.autoDispatch = false;
}

function appendPhoneLiveCapturedText(text) {
  if (!phoneLiveChatInput) {
    return;
  }
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    return;
  }
  const previous = String(phoneLiveChatInput.value || "").trim();
  phoneLiveChatInput.value = previous ? `${previous}\n${cleaned}` : cleaned;
  phoneLiveChatInput.focus();
}

function shouldAutoDispatchPhoneLiveSpeech(options = {}) {
  const oneShot = options.oneShot === null || options.oneShot === undefined
    ? state.phoneLiveOneShot
    : Boolean(options.oneShot);
  return Boolean(state.phoneLiveAutoSendAfterSpeech || oneShot);
}

function normalizePhoneRealtimeSource(value, fallback = "tab_audio") {
  const normalized = String(value || "").trim().toLowerCase();
  if (PHONE_REALTIME_CAPTURE_SOURCES.includes(normalized)) {
    return normalized;
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (PHONE_REALTIME_CAPTURE_SOURCES.includes(safeFallback)) {
    return safeFallback;
  }
  return "tab_audio";
}

function describePhoneRealtimeSource(value) {
  const source = normalizePhoneRealtimeSource(value);
  if (source === "microphone") return "microphone";
  if (source === "window_audio") return "window audio";
  if (source === "screen_audio") return "screen audio";
  return "tab audio";
}

function buildPhoneRealtimeCapturePrompt(value) {
  const source = normalizePhoneRealtimeSource(value);
  if (source === "microphone") {
    return "Allow microphone access to start captions.";
  }
  if (source === "window_audio") {
    return "Select only the meeting app window and enable audio sharing in the picker.";
  }
  if (source === "screen_audio") {
    return "Select a screen. This may mix audio from multiple apps.";
  }
  return "Select the meeting tab and enable Share tab audio.";
}

function buildPhoneRealtimeNoAudioTrackMessage(value) {
  const source = normalizePhoneRealtimeSource(value);
  if (source === "microphone") {
    return "No microphone track captured. Check mic permissions.";
  }
  if (source === "window_audio") {
    return "No audio track captured. Re-start and enable window audio sharing.";
  }
  if (source === "screen_audio") {
    return "No audio track captured. Enable system audio sharing in the picker.";
  }
  return "No audio track captured. Re-start and enable Share tab audio.";
}

function setPhoneRealtimeStatus(text = "", level = "") {
  if (!phoneRealtimeStatus) {
    return;
  }
  phoneRealtimeStatus.textContent = String(text || "").trim() || "Idle";
  phoneRealtimeStatus.classList.remove("live-ok", "live-error");
  if (level === "ok") {
    phoneRealtimeStatus.classList.add("live-ok");
  } else if (level === "error") {
    phoneRealtimeStatus.classList.add("live-error");
  }
}

function renderPhoneRealtimeTranscript() {
  if (!phoneRealtimeTranscript) {
    return;
  }
  const text = String(state.phoneRealtime.transcript || "").trim();
  phoneRealtimeTranscript.textContent = text || "Transcript will appear here while captions are active.";
  if (text) {
    phoneRealtimeTranscript.scrollTop = phoneRealtimeTranscript.scrollHeight;
  }
}

function refreshPhoneRealtimeControls() {
  const rt = state.phoneRealtime;
  const sourceLabel = describePhoneRealtimeSource(rt.captureSource);
  if (phoneRealtimeStartBtn) {
    phoneRealtimeStartBtn.disabled = !rt.supported || rt.active;
    phoneRealtimeStartBtn.textContent = rt.active
      ? `Capturing (${sourceLabel})`
      : `Start ${sourceLabel}`;
  }
  if (phoneRealtimeStopBtn) {
    phoneRealtimeStopBtn.disabled = !rt.active && !rt.recorder;
  }
  if (phoneRealtimeClearBtn) {
    phoneRealtimeClearBtn.disabled = !rt.transcript;
  }
  if (phoneRealtimeCopyBtn) {
    phoneRealtimeCopyBtn.disabled = !rt.transcript;
  }
  if (phoneRealtimeSendBtn) {
    phoneRealtimeSendBtn.disabled = !rt.transcript;
  }
  if (phoneRealtimeSourceSelect) {
    phoneRealtimeSourceSelect.disabled = !rt.supported || rt.active;
  }
}

function syncPhoneRealtimeSourceControl() {
  if (!phoneRealtimeSourceSelect) {
    return;
  }
  const selected = normalizePhoneRealtimeSource(
    phoneRealtimeSourceSelect.value || state.phoneRealtime.captureSource,
    state.phoneRealtime.captureSource
  );
  if (!Array.from(phoneRealtimeSourceSelect.options).some((option) => option.value === selected)) {
    const option = document.createElement("option");
    option.value = selected;
    option.textContent = `${describePhoneRealtimeSource(selected)} (saved)`;
    phoneRealtimeSourceSelect.appendChild(option);
  }
  phoneRealtimeSourceSelect.value = selected;
  state.phoneRealtime.captureSource = selected;
}

function pickPhoneRealtimeMimeType() {
  if (!window.MediaRecorder || typeof window.MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ];
  for (const candidate of candidates) {
    if (window.MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "";
}

function buildPhoneRealtimeSessionId() {
  return `prt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePhoneRealtimeChunk(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function mergePhoneRealtimeTranscript(previous, incoming) {
  const prior = normalizePhoneRealtimeChunk(previous);
  const next = normalizePhoneRealtimeChunk(incoming);
  if (!next) return prior;
  if (!prior) return next;
  const priorWords = prior.split(" ");
  const nextWords = next.split(" ");
  const maxOverlap = Math.min(12, priorWords.length, nextWords.length);
  let overlap = 0;
  for (let size = maxOverlap; size >= 3; size -= 1) {
    const tail = priorWords.slice(priorWords.length - size).join(" ").toLowerCase();
    const head = nextWords.slice(0, size).join(" ").toLowerCase();
    if (tail === head) {
      overlap = size;
      break;
    }
  }
  const suffix = nextWords.slice(overlap).join(" ").trim();
  let merged = suffix ? `${prior} ${suffix}` : prior;
  if (merged.length > PHONE_REALTIME_MAX_TEXT_CHARS) {
    merged = merged.slice(merged.length - PHONE_REALTIME_MAX_TEXT_CHARS).trimStart();
  }
  return merged;
}

function phoneRealtimeBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to encode audio chunk."));
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const commaIndex = dataUrl.indexOf(",");
      if (commaIndex < 0) {
        reject(new Error("Invalid audio payload."));
        return;
      }
      resolve(dataUrl.slice(commaIndex + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function buildRealtimePayloadBlob(rt, blob) {
  if (!(blob instanceof Blob) || blob.size < 1) {
    return blob;
  }
  if (!rt.seedBlob) {
    rt.seedBlob = blob;
    return blob;
  }
  const seed = rt.seedBlob;
  if (!(seed instanceof Blob) || seed.size < 1 || seed === blob) {
    return blob;
  }
  const mime = String(rt.mimeType || blob.type || seed.type || "").toLowerCase();
  const needsSeed = mime.includes("webm") || mime.includes("ogg");
  if (!needsSeed) {
    return blob;
  }
  const stitched = new Blob(
    [seed, blob],
    { type: rt.mimeType || blob.type || seed.type || "audio/webm" }
  );
  if (stitched.size > PHONE_REALTIME_MAX_PENDING_BLOB_BYTES) {
    return blob;
  }
  return stitched;
}

function buildPhoneRealtimePayloadBlob(blob) {
  return buildRealtimePayloadBlob(state.phoneRealtime, blob);
}

function buildPhoneLivePayloadBlob(blob) {
  return buildRealtimePayloadBlob(state.phoneLiveChunk, blob);
}

function buildPhoneRealtimeDisplayMediaOptions(value) {
  const source = normalizePhoneRealtimeSource(value);
  const base = {
    video: {
      frameRate: { ideal: 4, max: 8 }
    },
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  };
  if (source === "window_audio") {
    return {
      ...base,
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
      surfaceSwitching: "exclude",
      monitorTypeSurfaces: "exclude",
      systemAudio: "exclude",
      windowAudio: "window"
    };
  }
  if (source === "screen_audio") {
    return {
      ...base,
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
      monitorTypeSurfaces: "include",
      systemAudio: "include",
      windowAudio: "system"
    };
  }
  return {
    ...base,
    preferCurrentTab: true,
    selfBrowserSurface: "exclude",
    surfaceSwitching: "exclude",
    monitorTypeSurfaces: "exclude",
    systemAudio: "exclude",
    windowAudio: "exclude"
  };
}

async function requestPhoneRealtimeCaptureStream(value) {
  const source = normalizePhoneRealtimeSource(value);
  const devices = navigator.mediaDevices || {};
  if (source === "microphone") {
    if (typeof devices.getUserMedia !== "function") {
      throw new Error("Microphone capture is not supported in this browser.");
    }
    return devices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      video: false
    });
  }
  if (typeof devices.getDisplayMedia !== "function") {
    throw new Error("Window/tab/screen capture is not supported in this browser.");
  }
  const preferredOptions = buildPhoneRealtimeDisplayMediaOptions(source);
  try {
    return await devices.getDisplayMedia(preferredOptions);
  } catch (error) {
    const name = String(error?.name || "");
    const message = String(error?.message || "");
    const recoverable = (
      name === "TypeError"
      || name === "OverconstrainedError"
      || /constraint|displaySurface|monitorTypeSurfaces|systemAudio|windowAudio/i.test(message)
    );
    if (!recoverable) {
      throw error;
    }
    return devices.getDisplayMedia({ video: true, audio: true });
  }
}

function stopPhoneRealtimeTracks() {
  const stream = state.phoneRealtime.stream;
  if (!stream) {
    return;
  }
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {}
  }
  state.phoneRealtime.stream = null;
}

function finalizePhoneRealtime(reason = "", level = "") {
  const rt = state.phoneRealtime;
  rt.active = false;
  rt.captureActive = false;
  rt.draining = false;
  rt.sending = false;
  rt.chunkQueue = [];
  rt.sequence = 0;
  rt.sessionId = "";
  rt.mimeType = "";
  rt.seedBlob = null;
  rt.stopRequested = false;
  rt.droppedChunks = 0;
  rt.emptyChunkStreak = 0;
  rt.finalizeReason = "";
  rt.finalizeLevel = "";
  rt.recorder = null;
  stopPhoneRealtimeTracks();
  refreshPhoneRealtimeControls();
  if (reason) {
    setPhoneRealtimeStatus(reason, level);
  }
}

function beginPhoneRealtimeDrain(reason = "", level = "") {
  const rt = state.phoneRealtime;
  if (!rt.active) {
    return;
  }
  rt.captureActive = false;
  rt.draining = true;
  if (reason) rt.finalizeReason = reason;
  if (level) rt.finalizeLevel = level;
  if (rt.sending || rt.chunkQueue.length > 0) {
    const queued = rt.chunkQueue.length;
    setPhoneRealtimeStatus(
      queued > 0 ? `Finalizing transcript (${queued} queued)...` : "Finalizing transcript...",
      "ok"
    );
    if (!rt.sending && queued > 0) {
      processPhoneRealtimeQueue().catch(() => {});
    }
    return;
  }
  finalizePhoneRealtime(
    rt.finalizeReason
      || reason
      || ((rt.emptyChunkStreak >= 3 && !rt.transcript)
        ? "Captions stopped. No speech detected; verify Share tab audio."
        : "Captions stopped."),
    rt.finalizeLevel || level
  );
}

async function processPhoneRealtimeQueue() {
  const rt = state.phoneRealtime;
  if (rt.sending || !rt.active) {
    return;
  }
  const next = rt.chunkQueue.shift();
  if (!next) {
    return;
  }
  rt.sending = true;
  const activeSessionId = String(rt.sessionId || "");
  try {
    const audioBase64 = await phoneRealtimeBlobToBase64(next.blob);
    const payload = await requestJson("/api/voice/transcribe-chunk", {
      method: "POST",
      body: {
        sessionId: activeSessionId,
        sequence: next.sequence,
        mimeType: rt.mimeType || next.blob.type || "audio/webm",
        audioBase64,
        language: "en",
        model: PHONE_REALTIME_MODEL,
        timeoutMs: 20000,
        providerPreference: state.phoneLiveRouteMode === "gemini" ? "gemini_first" : "openai_first"
      }
    });
    if (!rt.active || String(rt.sessionId || "") !== activeSessionId) {
      return;
    }
    const chunkText = normalizePhoneRealtimeChunk(payload?.text);
    if (chunkText) {
      rt.emptyChunkStreak = 0;
      rt.transcript = mergePhoneRealtimeTranscript(rt.transcript, chunkText);
      renderPhoneRealtimeTranscript();
      refreshPhoneRealtimeControls();
    } else {
      rt.emptyChunkStreak += 1;
    }
    const queued = rt.chunkQueue.length;
    if (rt.active) {
      if (!rt.captureActive || rt.draining) {
        setPhoneRealtimeStatus(
          queued > 0 ? `Finalizing transcript (${queued} queued)...` : "Finalizing transcript...",
          "ok"
        );
      } else {
        const noSpeechYet = rt.emptyChunkStreak >= 3 && !rt.transcript;
        setPhoneRealtimeStatus(
          noSpeechYet
            ? (queued > 0 ? `Capturing (${queued} queued, no speech detected yet)` : "Capturing (no speech detected yet)")
            : (queued > 0 ? `Capturing (${queued} queued)` : "Capturing"),
          "ok"
        );
      }
    }
  } catch (error) {
    setPhoneRealtimeStatus(`Caption error: ${String(error?.message || "chunk failed")}`, "error");
  } finally {
    rt.sending = false;
    if (rt.active && rt.chunkQueue.length > 0) {
      processPhoneRealtimeQueue().catch(() => {});
      return;
    }
    if (rt.active && !rt.captureActive && !rt.sending && rt.chunkQueue.length < 1) {
      finalizePhoneRealtime(
        rt.finalizeReason || "Captions stopped.",
        rt.finalizeLevel || ""
      );
    }
  }
}

function queuePhoneRealtimeChunk(blob) {
  const rt = state.phoneRealtime;
  if (!rt.active || !blob || blob.size < 1) {
    return;
  }
  const payloadBlob = buildPhoneRealtimePayloadBlob(blob);
  rt.sequence += 1;
  if (rt.chunkQueue.length >= PHONE_REALTIME_MAX_QUEUE) {
    const tailIndex = rt.chunkQueue.length - 1;
    const tail = tailIndex >= 0 ? rt.chunkQueue[tailIndex] : null;
    if (tail?.blob) {
      const merged = new Blob(
        [tail.blob, payloadBlob],
        { type: rt.mimeType || payloadBlob.type || tail.blob.type || "audio/webm" }
      );
      if (merged.size <= PHONE_REALTIME_MAX_PENDING_BLOB_BYTES) {
        tail.blob = merged;
        tail.sequence = rt.sequence;
        setPhoneRealtimeStatus(`Capturing (${rt.chunkQueue.length} queued, stabilizing...)`, "ok");
        return;
      }
    }
    rt.chunkQueue.shift();
    setPhoneRealtimeStatus("Captions under heavy load. Dropping oldest chunk to recover.", "error");
  }
  let softDropped = 0;
  while (rt.chunkQueue.length >= PHONE_REALTIME_SOFT_QUEUE) {
    rt.chunkQueue.shift();
    softDropped += 1;
  }
  if (softDropped > 0) {
    rt.droppedChunks += softDropped;
    setPhoneRealtimeStatus(`Capturing (${rt.chunkQueue.length} queued, keeping live...)`, "ok");
  }
  rt.chunkQueue.push({
    blob: payloadBlob,
    sequence: rt.sequence
  });
  processPhoneRealtimeQueue().catch(() => {});
}

function stopPhoneRealtime(options = {}) {
  const rt = state.phoneRealtime;
  const reason = String(options.reason || "").trim();
  const level = String(options.level || "").trim();
  rt.stopRequested = true;
  if (reason) rt.finalizeReason = reason;
  if (level) rt.finalizeLevel = level;
  const recorder = rt.recorder;
  if (recorder && recorder.state !== "inactive") {
    try {
      recorder.stop();
      setPhoneRealtimeStatus(reason || "Stopping capture. Finalizing transcript...", level || "ok");
      return;
    } catch {}
  }
  beginPhoneRealtimeDrain(reason || "Captions stopped.", level);
}

async function startPhoneRealtime(options = {}) {
  const rt = state.phoneRealtime;
  if (rt.active) {
    return;
  }
  const captureSource = normalizePhoneRealtimeSource(
    options.captureSource || phoneRealtimeSourceSelect?.value || rt.captureSource,
    rt.captureSource
  );
  rt.captureSource = captureSource;
  syncPhoneRealtimeSourceControl();
  if (!window.MediaRecorder || !rt.supported) {
    setPhoneRealtimeStatus("Realtime capture is not supported in this browser.", "error");
    return;
  }
  try {
    const voiceStatus = await requestJson("/api/voice/status");
    if (!voiceStatus?.tools?.available?.whisper && !voiceStatus?.tools?.available?.cloudTranscribe) {
      throw new Error("Speech transcription is not configured on server.");
    }
    setPhoneRealtimeStatus(buildPhoneRealtimeCapturePrompt(captureSource), "ok");
    const stream = await requestPhoneRealtimeCaptureStream(captureSource);
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length < 1) {
      stopPhoneRealtimeTracks();
      throw new Error(buildPhoneRealtimeNoAudioTrackMessage(captureSource));
    }
    const recorderStream = new MediaStream(audioTracks);
    const preferredMimeType = pickPhoneRealtimeMimeType();
    const recorder = preferredMimeType
      ? new MediaRecorder(recorderStream, { mimeType: preferredMimeType })
      : new MediaRecorder(recorderStream);
    rt.active = true;
    rt.captureActive = true;
    rt.draining = false;
    rt.stream = stream;
    rt.recorder = recorder;
    rt.mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
    rt.seedBlob = null;
    rt.sessionId = buildPhoneRealtimeSessionId();
    rt.chunkQueue = [];
    rt.sending = false;
    rt.sequence = 0;
    rt.stopRequested = false;
    rt.droppedChunks = 0;
    rt.emptyChunkStreak = 0;
    rt.finalizeReason = "";
    rt.finalizeLevel = "";
    recorder.ondataavailable = (event) => {
      queuePhoneRealtimeChunk(event.data);
    };
    recorder.onerror = (event) => {
      const message = String(event?.error?.message || event?.error || "Recorder error");
      setPhoneRealtimeStatus(`Capture error: ${message}`, "error");
    };
    recorder.onstop = () => {
      const manual = rt.stopRequested;
      const finalizeReason = String(rt.finalizeReason || "").trim()
        || (manual ? "Captions stopped." : "Capture ended.");
      const finalizeLevel = String(rt.finalizeLevel || "").trim()
        || (manual ? "ok" : "");
      beginPhoneRealtimeDrain(finalizeReason, finalizeLevel);
    };
    for (const track of audioTracks) {
      track.addEventListener("ended", () => {
        if (rt.active) {
          stopPhoneRealtime({ reason: "Capture ended." });
        }
      }, { once: true });
    }
    recorder.start(PHONE_REALTIME_TIMESLICE_MS);
    refreshPhoneRealtimeControls();
    setPhoneRealtimeStatus(`Capturing ${describePhoneRealtimeSource(captureSource)}...`, "ok");
  } catch (error) {
    finalizePhoneRealtime();
    setPhoneRealtimeStatus(String(error?.message || "Failed to start captions."), "error");
  }
}

function clearPhoneRealtimeTranscript() {
  state.phoneRealtime.transcript = "";
  renderPhoneRealtimeTranscript();
  refreshPhoneRealtimeControls();
}

async function copyPhoneRealtimeTranscript() {
  const text = String(state.phoneRealtime.transcript || "").trim();
  if (!text) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    setPhoneRealtimeStatus("Transcript copied.", "ok");
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "readonly");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(helper);
  if (!copied) {
    throw new Error("Clipboard copy is not available.");
  }
  setPhoneRealtimeStatus("Transcript copied.", "ok");
}

function buildMeetingAssistRelayMessage(transcript) {
  const raw = String(transcript || "").trim();
  const sourceLabel = describePhoneRealtimeSource(state.phoneRealtime.captureSource);
  const relayWindowChars = 6000;
  const clipped = raw.length > relayWindowChars
    ? raw.slice(raw.length - relayWindowChars).trimStart()
    : raw;
  const clippedNotice = clipped.length < raw.length
    ? "Only the most recent meeting excerpt is included below."
    : "This is the current meeting transcript.";
  return {
    relayMessage: [
      "[Meeting Assist Context]",
      `Source: ${sourceLabel}`,
      clippedNotice,
      "Study this conversation quietly. Watch for direct questions to Jesse, action items, commitments, risks, and contradictions.",
      "Prepare concise replies and follow-up tasks. Do not speak unless Jesse explicitly asks.",
      "",
      clipped
    ].join("\n"),
    userFacingSummary: `[Meeting Assist] ${sourceLabel} transcript sent (${clipped.length} chars).`
  };
}

async function sendPhoneRealtimeTranscriptToAsolaria() {
  const transcript = String(state.phoneRealtime.transcript || "").trim();
  if (!transcript) {
    throw new Error("Transcript is empty.");
  }
  const payload = buildMeetingAssistRelayMessage(transcript);
  await sendPhoneLiveChatMessage(payload.relayMessage, {
    displayText: payload.userFacingSummary,
    preserveInput: true,
    skipTwoStage: true,
    suppressVoiceReply: true
  });
  setPhoneRealtimeStatus("Transcript sent to Asolaria for quiet meeting assist.", "ok");
}

function collectPhoneLiveTurnNodes() {
  if (!phoneLiveChatMessages) {
    return [];
  }
  const rows = [];
  for (const child of Array.from(phoneLiveChatMessages.children)) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    if (child.classList.contains("chat-turn")) {
      rows.push(child);
      continue;
    }
    if (child.classList.contains("phone-chat-history")) {
      const nested = child.querySelectorAll(".chat-turn");
      for (const node of nested) {
        rows.push(node);
      }
    }
  }
  return rows;
}

function rebuildPhoneLiveTurnNodes(nodes = []) {
  if (!phoneLiveChatMessages) {
    return;
  }
  phoneLiveChatMessages.innerHTML = "";
  for (const node of nodes) {
    phoneLiveChatMessages.appendChild(node);
  }
}

function applyPhoneLiveChatWindow() {
  if (!phoneLiveChatMessages) {
    return;
  }
  const allTurns = collectPhoneLiveTurnNodes();
  const collapseHistory = state.uiLevel === "talk";
  if (!collapseHistory) {
    rebuildPhoneLiveTurnNodes(allTurns);
    return;
  }
  if (allTurns.length <= 1) {
    rebuildPhoneLiveTurnNodes(allTurns);
    return;
  }

  let featuredIndex = -1;
  for (let idx = allTurns.length - 1; idx >= 0; idx -= 1) {
    if (allTurns[idx].classList.contains("assistant")) {
      featuredIndex = idx;
      break;
    }
  }
  if (featuredIndex < 0) {
    featuredIndex = allTurns.length - 1;
  }

  const featured = allTurns[featuredIndex];
  const historyTurns = allTurns.filter((_, idx) => idx !== featuredIndex);

  const details = document.createElement("details");
  details.className = "phone-chat-history";

  const summary = document.createElement("summary");
  summary.className = "phone-chat-history-summary";
  summary.textContent = `History (${historyTurns.length})`;
  details.appendChild(summary);

  const historyBody = document.createElement("div");
  historyBody.className = "phone-chat-history-body";
  for (const node of historyTurns) {
    historyBody.appendChild(node);
  }
  details.appendChild(historyBody);

  phoneLiveChatMessages.innerHTML = "";
  phoneLiveChatMessages.appendChild(details);
  phoneLiveChatMessages.appendChild(featured);
}

function appendPhoneLiveTurn(role, text, meta = "") {
  if (!phoneLiveChatMessages) return;
  const node = document.createElement("div");
  node.className = `chat-turn ${role === "user" ? "user" : "assistant"}`;
  const body = String(text || "").trim() || "(empty)";
  const suffix = String(meta || "").trim();
  node.textContent = suffix ? `${body}\n\n${suffix}` : body;
  phoneLiveChatMessages.appendChild(node);
  const maxTurns = 80;
  const turns = collectPhoneLiveTurnNodes();
  if (turns.length > maxTurns) {
    rebuildPhoneLiveTurnNodes(turns.slice(turns.length - maxTurns));
  }
  applyPhoneLiveChatWindow();
  phoneLiveChatMessages.scrollTop = phoneLiveChatMessages.scrollHeight;
  return node;
}

function updatePhoneLiveVoiceButtons() {
  const active = state.phoneLiveListening || state.phoneLiveRequested;
  const autoSend = shouldAutoDispatchPhoneLiveSpeech();
  if (phoneLiveSpeakBtn) {
    phoneLiveSpeakBtn.textContent = active
      ? "Listening..."
      : autoSend
        ? "Speak (Auto)"
        : "Speak (Dictate)";
  }
  if (phoneLivePushBtn) {
    phoneLivePushBtn.textContent = active && state.phoneLiveOneShot ? "Stop Push-to-Talk" : "Push-to-Talk";
  }
  syncPhoneLauncherButtons();
}

async function speakTextViaServer(text, options = {}) {
  const provider = normalizeVoiceOutputMode(state.phoneLiveVoiceOutputMode, "server");
  const payload = await requestJson("/api/voice/speak", {
    method: "POST",
    body: {
      text,
      provider: provider === "browser" ? "auto" : provider
    }
  });
  if (!payload || payload.mode === "fallback-text" || payload.mode === "browser-client") {
    return false;
  }
  try {
    if (state.phoneLiveCurrentAudio) {
      try {
        state.phoneLiveCurrentAudio.pause();
        state.phoneLiveCurrentAudio.currentTime = 0;
      } catch {}
      state.phoneLiveCurrentAudio = null;
    }
    const volumePercent = options.volumePercent === null || options.volumePercent === undefined
      ? state.phoneLiveVoiceVolume
      : options.volumePercent;
    const latestUrl = buildAbsoluteApiUrl("/api/voice/latest", { v: Date.now() });
    const nativeBridge = window.AsolariaAndroid;
    if (nativeBridge && typeof nativeBridge.playAudioUrl === "function") {
      try {
        const nativeResult = String(
          nativeBridge.playAudioUrl(latestUrl, String(normalizeVolumePercent(volumePercent, state.phoneLiveVoiceVolume || 80)))
            || ""
        ).trim().toLowerCase();
        if (nativeResult === "ok" || nativeResult === "queued" || nativeResult === "started") {
          return true;
        }
      } catch {}
    }
    const audio = new Audio(latestUrl);
    audio.volume = volumePercentToGain(volumePercent);
    state.phoneLiveCurrentAudio = audio;
    audio.onended = () => {
      if (state.phoneLiveCurrentAudio === audio) {
        state.phoneLiveCurrentAudio = null;
      }
    };
    audio.onerror = () => {
      if (state.phoneLiveCurrentAudio === audio) {
        state.phoneLiveCurrentAudio = null;
      }
    };
    await audio.play();
    return true;
  } catch {
    state.phoneLiveCurrentAudio = null;
    return false;
  }
}

async function speakTextViaAndroid(text, options = {}) {
  const nativeBridge = window.AsolariaAndroid;
  if (!nativeBridge || typeof nativeBridge.speakText !== "function") {
    return false;
  }
  try {
    const volumePercent = options.volumePercent === null || options.volumePercent === undefined
      ? state.phoneLiveVoiceVolume
      : options.volumePercent;
    const result = String(
      nativeBridge.speakText(
        String(text || ""),
        String(normalizeVolumePercent(volumePercent, state.phoneLiveVoiceVolume || 80))
      ) || ""
    ).trim().toLowerCase();
    return result === "ok" || result === "queued" || result === "started";
  } catch {
    return false;
  }
}

async function speakTextViaBrowser(text, options = {}) {
  if (!("speechSynthesis" in window)) {
    return false;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const preferred = getPreferredSpeechLang(state.phoneLiveWakeWord);
    const voice = getPreferredBrowserSpeechVoice(preferred);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || preferred;
    } else {
      utterance.lang = preferred;
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    const volumePercent = options.volumePercent === null || options.volumePercent === undefined
      ? state.phoneLiveVoiceVolume
      : options.volumePercent;
    utterance.volume = volumePercentToGain(volumePercent);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

function buildSpeechFriendlyReplyText(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  let cleaned = raw
    .replace(/```[\s\S]*?```/g, " Code example is on screen. ")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1")
    .replace(/\[([^\]]+)\]\((\/[^\s)]+)\)/g, "$1")
    .replace(/\b(?:at|via|open|visit|see)\s+https?:\/\/\S+/gi, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\b(?:[a-z]:[\\/]|[\\/]{1,2})[^\s,;]+/gi, " ")
    .replace(/\b[\w.-]+\.(?:js|mjs|cjs|ts|tsx|jsx|kt|json|md|txt|html|css)(?::\d+(?::\d+)?)?\b/gi, " ")
    .replace(/^[>\-\*\#\d\.\)\s]+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\b(?:job|phase|route|provider|model|status)\s*:\s*[a-z0-9._/-]+\b/gi, "")
    .replace(/\b(?:api|http|https|json|yaml|xml|html|css|javascript|typescript|powershell|shell|bash)\b(?=\s*(?:code|snippet|block))/gi, "")
    .replace(/[_*~]+/g, " ")
    .replace(/(?:->|=>|::|==+|!=+|<=|>=)/g, " ")
    .replace(/&/g, " and ")
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/[\\|]+/g, " ")
    .replace(/\s*\/\s*/g, " ")
    .replace(/[{}[\]<>]+/g, " ")
    .replace(/([^\p{L}\p{N}\s]){2,}/gu, " ")
    .replace(/\b(?:at|via|open|visit|see)\s*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  cleaned = cleaned
    .split(/\s+/g)
    .filter((token) => {
      const symbolCount = (token.match(/[^\p{L}\p{N}]/gu) || []).length;
      const letterCount = (token.match(/[\p{L}\p{N}]/gu) || []).length;
      if (letterCount < 1 && symbolCount > 0) {
        return false;
      }
      if (symbolCount >= 2 && letterCount <= 2) {
        return false;
      }
      return true;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return "";
  }
  const sentences = cleaned
    .split(/(?<=[\.\!\?])\s+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  let spoken = sentences.length <= 2
    ? cleaned
    : `${sentences.slice(0, 2).join(" ")} I put the rest on screen.`;
  if (spoken.length > 280) {
    spoken = `${spoken.slice(0, 277).trim()}...`;
  }
  return spoken;
}

function normalizeGeminiEdgeReplyText(text, fallback = "") {
  const raw = String(text || "").trim();
  const safeFallback = String(fallback || "").trim();
  if (!raw) {
    return safeFallback || "Hello Jesse, Asolaria is taking this over now.";
  }
  let normalized = raw
    .replace(/[`*_#~]/g, " ")
    .replace(/\bstatusand\b/gi, "status and")
    .replace(/\bthis is gemini\b[,.]?\s*/i, "")
    .replace(/\bi am gemini\b[,.]?\s*(and\s*)?/i, "")
    .replace(/^hellojesse\b[:!,\s-]*/i, "Hello Jesse, ")
    .replace(/^hello\s+jesse\b[:!\s-]*/i, "Hello Jesse, ")
    .replace(/^hello,\s*jesse\b[:!\s-]*/i, "Hello Jesse, ")
    .replace(/^heyjesse\b[:!,\s-]*/i, "Hello Jesse, ")
    .replace(/^hey\s+jesse\b[:!\s-]*/i, "Hello Jesse, ")
    .replace(/^hey,\s*jesse\b[:!\s-]*/i, "Hello Jesse, ")
    .replace(/^hijesse\b[:!,\s-]*/i, "Hello Jesse, ")
    .replace(/^hi\s+jesse\b[:!\s-]*/i, "Hello Jesse, ")
    .replace(/^hi,\s*jesse\b[:!\s-]*/i, "Hello Jesse, ")
    .replace(/^jesse\b[:!\s-]*/i, "Hello Jesse, ")
    .replace(/\s+/g, " ")
    .trim();
  normalized = normalized.replace(/^hello jesse,\s*[,;:-]+\s*/i, "Hello Jesse, ");
  normalized = normalized.replace(/^hello jesse,\s*(yes|no),\s*/i, "Hello Jesse, ");
  if (/^(hello jesse,\s*){2,}/i.test(normalized)) {
    normalized = normalized.replace(/^(hello jesse,\s*)+/i, "Hello Jesse, ");
  }
  if (!/^hello jesse,/i.test(normalized)) {
    normalized = `Hello Jesse, ${normalized}`.replace(/\s+/g, " ").trim();
  }
  const spokenBody = normalized.replace(/^hello jesse,\s*/i, "").trim();
  if (!spokenBody || spokenBody.length < 10 || /^[^a-z0-9]+$/i.test(spokenBody)) {
    return safeFallback || "Hello Jesse, I am on it.";
  }
  return normalized;
}

function clearPhoneLiveSilenceTimer() {
  if (state.phoneLiveSilenceTimer) {
    window.clearTimeout(state.phoneLiveSilenceTimer);
    state.phoneLiveSilenceTimer = null;
  }
}

function schedulePhoneLiveSilenceStop() {
  clearPhoneLiveSilenceTimer();
  const timeoutMs = Math.max(600, asNumber(state.phoneLiveSilenceTimeoutMs, 1400));
  state.phoneLiveSilenceTimer = window.setTimeout(() => {
    state.phoneLiveSilenceTimer = null;
    if (state.phoneLiveListening || state.phoneLiveRequested) {
      stopPhoneLiveVoice({ preserveStatus: true });
      setPhoneLiveVoiceStatus("Auto-stopped after pause.", "ok");
    }
  }, timeoutMs);
}

function finalizePhoneLiveChunkCapture(reason = "", level = "") {
  const rt = state.phoneLiveChunk;
  const transcript = normalizePhoneRealtimeChunk(rt.transcript);
  const autoDispatch = Boolean(rt.autoDispatch);
  const noSpeechDetected = rt.emptyChunkStreak >= 2;
  stopPhoneLiveChunkTracks();
  resetPhoneLiveChunkState();
  clearPhoneLiveSilenceTimer();
  state.phoneLiveListening = false;
  state.phoneLiveRequested = false;
  state.phoneLiveOneShot = false;
  updatePhoneLiveVoiceButtons();
  if (transcript) {
    state.phoneLivePendingSpeechText = transcript;
    state.phoneLivePendingSpeechDispatched = false;
    appendPhoneLiveCapturedText(transcript);
    setPhoneLiveAvatarState("thinking", "Captured voice input.");
    if (autoDispatch) {
      state.phoneLivePendingSpeechDispatched = true;
      setPhoneLiveVoiceStatus("Sending captured voice automatically...", "ok");
      dispatchPhoneLiveVoiceText(transcript).catch((error) => {
        state.phoneLivePendingSpeechDispatched = false;
        setPhoneLiveVoiceStatus(`Voice send failed: ${error.message}`, "error");
        setPhoneLiveAvatarState("error", "Voice send failed.");
      }).finally(() => {
        state.phoneLivePendingSpeechText = "";
      });
      return;
    }
    setPhoneLiveVoiceStatus("Voice captured. Press Send to continue.", "ok");
    return;
  }
  state.phoneLivePendingSpeechText = "";
  state.phoneLivePendingSpeechDispatched = false;
  if (reason) {
    setPhoneLiveVoiceStatus(reason, level);
    setPhoneLiveAvatarState(level === "error" ? "error" : "idle", level === "error" ? "Voice input interrupted." : "Avatar idle.");
    return;
  }
  if (noSpeechDetected) {
    setPhoneLiveVoiceStatus("No speech detected. Try again.", "error");
    setPhoneLiveAvatarState("error", "No speech detected.");
    return;
  }
  setPhoneLiveVoiceStatus("Voice stopped.", "ok");
  setPhoneLiveAvatarState("idle", "Avatar idle.");
}

function beginPhoneLiveChunkDrain(reason = "", level = "") {
  const rt = state.phoneLiveChunk;
  if (!rt.active) {
    return;
  }
  rt.captureActive = false;
  rt.draining = true;
  if (reason) rt.finalizeReason = reason;
  if (level) rt.finalizeLevel = level;
  if (rt.sending || rt.chunkQueue.length > 0) {
    setPhoneLiveVoiceStatus(
      rt.chunkQueue.length > 0
        ? `Finalizing voice capture (${rt.chunkQueue.length} queued)...`
        : "Finalizing voice capture...",
      "ok"
    );
    if (!rt.sending && rt.chunkQueue.length > 0) {
      processPhoneLiveChunkQueue().catch(() => {});
    }
    return;
  }
  finalizePhoneLiveChunkCapture(rt.finalizeReason || reason, rt.finalizeLevel || level);
}

async function processPhoneLiveChunkQueue() {
  const rt = state.phoneLiveChunk;
  if (rt.sending || !rt.active) {
    return;
  }
  const next = rt.chunkQueue.shift();
  if (!next) {
    return;
  }
  rt.sending = true;
  const activeSessionId = String(rt.sessionId || "");
  try {
    const audioBase64 = await phoneRealtimeBlobToBase64(next.blob);
    const payload = await requestJson("/api/voice/transcribe-chunk", {
      method: "POST",
      body: {
        sessionId: activeSessionId,
        sequence: next.sequence,
        mimeType: rt.mimeType || next.blob.type || "audio/webm",
        audioBase64,
        language: "en",
        model: PHONE_REALTIME_MODEL,
        timeoutMs: 20000,
        providerPreference: state.phoneLiveRouteMode === "gemini" ? "gemini_first" : "openai_first"
      }
    });
    if (!rt.active || String(rt.sessionId || "") !== activeSessionId) {
      return;
    }
    const chunkText = normalizePhoneRealtimeChunk(payload?.text);
    if (chunkText) {
      rt.emptyChunkStreak = 0;
      rt.transcript = mergePhoneRealtimeTranscript(rt.transcript, chunkText);
      state.phoneLivePendingSpeechText = rt.transcript;
      setPhoneLiveVoiceStatus(`Listening: ${chunkText}`, "ok");
      setPhoneLiveAvatarState("listening", "Listening...");
      schedulePhoneLiveSilenceStop();
    } else {
      rt.emptyChunkStreak += 1;
    }
    if (rt.active && (rt.draining || !rt.captureActive)) {
      setPhoneLiveVoiceStatus(
        rt.chunkQueue.length > 0
          ? `Finalizing voice capture (${rt.chunkQueue.length} queued)...`
          : "Finalizing voice capture...",
        "ok"
      );
    }
  } catch (error) {
    rt.finalizeReason = `Voice capture failed: ${String(error?.message || "chunk failed")}`;
    rt.finalizeLevel = "error";
  } finally {
    rt.sending = false;
    if (rt.active && rt.chunkQueue.length > 0) {
      processPhoneLiveChunkQueue().catch(() => {});
      return;
    }
    if (rt.active && rt.finalizeLevel === "error") {
      finalizePhoneLiveChunkCapture(rt.finalizeReason, rt.finalizeLevel);
      return;
    }
    if (rt.active && !rt.captureActive && !rt.sending && rt.chunkQueue.length < 1) {
      finalizePhoneLiveChunkCapture(rt.finalizeReason, rt.finalizeLevel);
    }
  }
}

function queuePhoneLiveChunk(blob) {
  const rt = state.phoneLiveChunk;
  if (!rt.active || !(blob instanceof Blob) || blob.size < 1) {
    return;
  }
  const payloadBlob = buildPhoneLivePayloadBlob(blob);
  rt.sequence += 1;
  if (rt.chunkQueue.length >= PHONE_REALTIME_MAX_QUEUE) {
    rt.chunkQueue.shift();
  }
  rt.chunkQueue.push({
    blob: payloadBlob,
    sequence: rt.sequence
  });
  processPhoneLiveChunkQueue().catch(() => {});
}

async function startPhoneLiveChunkCapture(options = {}) {
  if (!hasPhoneLiveChunkCaptureSupport()) {
    throw new Error("Microphone capture is not supported in this browser.");
  }
  let stream = null;
  try {
    stopPhoneLiveAudioOutput();
    const voiceStatus = await requestJson("/api/voice/status");
    if (!voiceStatus?.tools?.available?.whisper && !voiceStatus?.tools?.available?.cloudTranscribe) {
      throw new Error("Server speech transcription is not configured.");
    }
    const nativeBridge = getAndroidNativeMicBridge();
    if (nativeBridge) {
      const rt = state.phoneLiveChunk;
      resetPhoneLiveChunkState();
      rt.active = true;
      rt.captureActive = true;
      rt.native = true;
      rt.sessionId = buildPhoneRealtimeSessionId();
      rt.autoDispatch = shouldAutoDispatchPhoneLiveSpeech({ oneShot: options.oneShot });
      state.phoneLiveListening = true;
      state.phoneLiveRequested = true;
      state.phoneLiveOneShot = Boolean(options.oneShot);
      state.phoneLivePendingSpeechText = "";
      state.phoneLivePendingSpeechDispatched = false;
      clearPhoneLiveSilenceTimer();
      updatePhoneLiveVoiceButtons();
      setPhoneLiveVoiceStatus(
        state.phoneLiveOneShot ? "Listening for one command..." : "Listening...",
        "ok"
      );
      setPhoneLiveAvatarState("listening", "Listening...");
      const providerPreference = state.phoneLiveRouteMode === "gemini" ? "gemini_first" : "openai_first";
      const result = String(
        nativeBridge.startNativeMicCapture(
          getPreferredSpeechLang(state.phoneLiveWakeWord),
          providerPreference
        ) || ""
      ).trim().toLowerCase();
      if (!result || result === "started" || result === "queued") {
        return;
      }
      resetPhoneLiveChunkState();
      state.phoneLiveListening = false;
      state.phoneLiveRequested = false;
      state.phoneLiveOneShot = false;
      updatePhoneLiveVoiceButtons();
      if (result === "permission_requested") {
        throw new Error("Microphone permission requested. Approve it in Android and try again.");
      }
      if (result === "unsupported") {
        throw new Error("Native microphone streaming is unavailable on this device.");
      }
      if (result === "untrusted_origin") {
        throw new Error("Android native mic bridge is blocked until the app returns to a trusted Asolaria page.");
      }
      if (result.startsWith("error:")) {
        throw new Error(result.slice(6));
      }
      throw new Error(result || "Native microphone streaming failed to start.");
    }
    stream = await requestPhoneRealtimeCaptureStream("microphone");
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length < 1) {
      throw new Error("No microphone track captured. Check mic permissions.");
    }
    const recorderStream = new MediaStream(audioTracks);
    const preferredMimeType = pickPhoneRealtimeMimeType();
    const recorder = preferredMimeType
      ? new MediaRecorder(recorderStream, { mimeType: preferredMimeType })
      : new MediaRecorder(recorderStream);
    const rt = state.phoneLiveChunk;
    resetPhoneLiveChunkState();
    rt.active = true;
    rt.captureActive = true;
    rt.stream = stream;
    rt.recorder = recorder;
    rt.mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
    rt.sessionId = buildPhoneRealtimeSessionId();
    rt.autoDispatch = shouldAutoDispatchPhoneLiveSpeech({ oneShot: options.oneShot });
    state.phoneLiveListening = true;
    state.phoneLiveRequested = true;
    state.phoneLiveOneShot = Boolean(options.oneShot);
    state.phoneLivePendingSpeechText = "";
    state.phoneLivePendingSpeechDispatched = false;
    clearPhoneLiveSilenceTimer();
    updatePhoneLiveVoiceButtons();
    setPhoneLiveVoiceStatus(
      state.phoneLiveOneShot ? "Listening for one command..." : "Listening...",
      "ok"
    );
    setPhoneLiveAvatarState("listening", "Listening...");
    recorder.ondataavailable = (event) => {
      queuePhoneLiveChunk(event.data);
    };
    recorder.onerror = (event) => {
      const message = String(event?.error?.message || event?.error || "Recorder error");
      state.phoneLiveChunk.finalizeReason = `Voice capture failed: ${message}`;
      state.phoneLiveChunk.finalizeLevel = "error";
      beginPhoneLiveChunkDrain(state.phoneLiveChunk.finalizeReason, "error");
    };
    recorder.onstop = () => {
      const manual = state.phoneLiveChunk.stopRequested;
      const finalizeReason = String(state.phoneLiveChunk.finalizeReason || "").trim()
        || (manual ? "Voice stopped." : "Microphone capture ended.");
      const finalizeLevel = String(state.phoneLiveChunk.finalizeLevel || "").trim()
        || (manual ? "ok" : "");
      beginPhoneLiveChunkDrain(finalizeReason, finalizeLevel);
    };
    for (const track of audioTracks) {
      track.addEventListener("ended", () => {
        if (state.phoneLiveChunk.active) {
          stopPhoneLiveChunkCapture({ reason: "Microphone capture ended." });
        }
      }, { once: true });
    }
    recorder.start(PHONE_REALTIME_TIMESLICE_MS);
  } catch (error) {
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {}
      }
    }
    stopPhoneLiveChunkTracks();
    resetPhoneLiveChunkState();
    throw error;
  }
}

function stopPhoneLiveChunkCapture(options = {}) {
  const rt = state.phoneLiveChunk;
  if (!isPhoneLiveChunkCaptureActive()) {
    return;
  }
  const reason = String(options.reason || "").trim();
  const level = String(options.level || "").trim();
  rt.stopRequested = true;
  if (reason) rt.finalizeReason = reason;
  if (level) rt.finalizeLevel = level;
  if (rt.native) {
    rt.captureActive = false;
    rt.draining = true;
    stopPhoneLiveChunkTracks();
    setPhoneLiveVoiceStatus("Finalizing voice capture...", "ok");
    return;
  }
  const recorder = rt.recorder;
  if (recorder && recorder.state !== "inactive") {
    try {
      recorder.stop();
      return;
    } catch {}
  }
  beginPhoneLiveChunkDrain(reason || "Voice stopped.", level || "ok");
}

function buildInstantAck(userText = "") {
  const text = String(userText || "").toLowerCase();
  if (
    text.includes("gemini")
    || text.includes("model")
    || text.includes("api")
    || text.includes("integrat")
    || text.includes("live")
  ) {
    return "Asolaria can use Gemini through the managed API and live voice paths. I am tightening that route now.";
  }
  if (
    text.includes("meeting")
    || text.includes("zoom")
    || text.includes("teams")
    || text.includes("slack")
    || text.includes("meet")
    || text.includes("call")
  ) {
    return "I can watch the meeting and track the conversation now. Speaking into the meeting is the next layer.";
  }
  if (text.includes("connect") || text.includes("not respond") || text.includes("offline")) {
    return "Got it. I'm checking connection and routing first, then I'll give the full breakdown.";
  }
  if (text.includes("voice") || text.includes("speak") || text.includes("mic")) {
    return "Got it. Quick pass now, then a deeper voice/system analysis next.";
  }
  return "Got it. Quick response first, then a deeper step-by-step follow-up.";
}

function shouldUseFastGeminiEdgeMode(userText = "") {
  const text = String(userText || "").trim().toLowerCase();
  if (!text) {
    return true;
  }
  if (
    /\b(status|route|routing|channel|connection|path|connected|online|offline|inbox|task|tasks|approval|approvals|notes?|voice mode|mic status|what route|which path)\b/i.test(text)
  ) {
    return true;
  }
  if (
    /\b(how|why|can|could|should|explain|compare|walk me through|tell me about|integration|integrate|architecture|design|strategy|gemini|model|models|api|meeting|zoom|teams|slack|call)\b/i.test(text)
  ) {
    return false;
  }
  return true;
}

function buildGeminiEdgeSystemPrompt(userText = "", options = {}) {
  const topic = String(userText || "").trim();
  const expanded = Boolean(options.expanded);
  return [
    "You are Gemini edge voice for Asolaria phone mode.",
    "Jesse is speaking to you hands-free.",
    "Start with exactly: Hello Jesse,",
    expanded
      ? "Give a direct spoken response in up to three short sentences."
      : "Give a fast spoken response in up to two short sentences.",
    "Use plain spoken English only.",
    "No markdown, no bullets, no backticks, and no code formatting.",
    "Be immediately useful, but do not pretend the deeper work is already done.",
    "Prefer a direct answer first.",
    "If Jesse asks how, why, or whether something can be done, answer directly before offering follow-up.",
    "Only mention Asolaria taking over when the owner clearly asked for continued work, monitoring, or a follow-up after this turn.",
    "Never say 'taking over next' unless the owner explicitly asked for a handoff after this turn.",
    "Never call Asolaria Hilary or Hillary.",
    "Sound natural and calm.",
    "Do not introduce yourself as Gemini.",
    "Do not repeat the greeting.",
    topic ? `Current request: ${topic}` : ""
  ].filter(Boolean).join("\n");
}

function normalizePhoneLiveAssistantAlias(text = "") {
  return String(text || "")
    .replace(/^\s*(?:asolaria|hilary|hillary)\b[:!,\s-]*/i, "")
    .trim();
}

async function fetchPhoneLiveGeminiEdgeReply(message, options = {}) {
  const useFastMode = shouldUseFastGeminiEdgeMode(message);
  const expanded = !useFastMode;
  const requestedModel = String(options.model || "").trim();
  const body = {
    mode: "assistant",
    prompt: String(message || "").trim(),
    chatId: PHONE_LIVE_DEFAULT_CHAT_ID,
    system: String(options.system || buildGeminiEdgeSystemPrompt(message, { expanded })).trim(),
    latencyMode: useFastMode ? "fast" : "normal",
    preferLive: expanded,
    temperature: 0.45,
    maxOutputTokens: useFastMode ? 120 : 220
  };
  if (useFastMode) {
    body.model = requestedModel || "gemini-2.5-flash";
  } else if (requestedModel) {
    body.model = requestedModel;
  }
  const payload = await requestJson("/api/phone/edge/gemini", {
    method: "POST",
    timeoutMs: Math.max(useFastMode ? 2500 : 6000, Number(options.timeoutMs || (useFastMode ? 6000 : 12000))),
    body
  });
  return {
    reply: normalizeGeminiEdgeReplyText(
      payload?.reply,
      buildInstantAck(message)
    ),
    taskLedgerTaskId: String(payload?.taskLedgerTaskId || "").trim(),
    toolCalls: Array.isArray(payload?.toolCalls) ? payload.toolCalls : []
  };
}

async function fetchPhoneLiveReply(message, routeMode = "normal", options = {}) {
  const requestBody = {
    message,
    chatId: PHONE_LIVE_DEFAULT_CHAT_ID,
    routeMode: routeMode === "deep" ? "deep" : "normal"
  };
  if (options.taskLedger && typeof options.taskLedger === "object") {
    requestBody.taskLedger = options.taskLedger;
  }
  const payload = await requestJson("/api/chat", {
    method: "POST",
    body: requestBody
  });
  const result = {
    reply: "",
    mode: String(payload?.mode || "").trim(),
    queuedReply: String(payload?.reply || "").trim(),
    taskLedgerTaskId: String(payload?.taskLedgerTaskId || "").trim(),
    jobId: String(payload?.job?.id || "").trim(),
    payload
  };
  if (payload?.mode === "routed") {
    result.reply = String(payload.reply || "Done.");
    return options.returnResult ? result : result.reply;
  }
  if (payload?.job?.id) {
    const queuedJobId = String(payload.job.id);
    if (typeof options.onQueued === "function") {
      try {
        options.onQueued({
          id: queuedJobId,
          reply: String(payload.reply || "").trim(),
          taskLedgerTaskId: result.taskLedgerTaskId
        });
      } catch {}
    }
    const job = await waitForJobResult(queuedJobId, {
      onUpdate: options.onUpdate
    });
    if (String(job.status || "").toLowerCase() === "failed") {
      throw new Error(String(job.error || "Job failed."));
    }
    result.jobId = queuedJobId;
    result.job = job;
    result.reply = formatPhoneLiveJobReply(job);
    return options.returnResult ? result : result.reply;
  }
  result.reply = String(payload?.reply || "Done.");
  return options.returnResult ? result : result.reply;
}

function buildDeepFollowupPrompt(userText, firstReply) {
  return [
    "Provide a deeper follow-up for the same user request.",
    `User request: ${String(userText || "").trim()}`,
    `Your initial reply: ${String(firstReply || "").trim()}`,
    "Return with this structure:",
    "1) Immediate action now",
    "2) Technical details",
    "3) Risks and safeguards",
    "4) Next 2 concrete steps"
  ].join("\n");
}

function buildGeminiHandoffPrompt(userText, geminiReply) {
  return [
    "Continue this request as Asolaria super-admin after a fast Gemini edge voice handoff.",
    `User request: ${String(userText || "").trim()}`,
    `Gemini edge reply: ${String(geminiReply || "").trim()}`,
    "Return with this structure:",
    "1) Immediate answer",
    "2) What Asolaria is doing now",
    "3) What you need from Jesse, if anything",
    "4) Risks or blockers"
  ].join("\n");
}

function inferTakeoverPriority(userText = "") {
  const normalized = String(userText || "").trim().toLowerCase();
  if (!normalized) return "normal";
  if (/(urgent|immediately|right now|emergency|broken|fix|error|not work|stuck|offline|down|voice|phone)/.test(normalized)) {
    return "high";
  }
  return "normal";
}

function buildGeminiTakeoverTaskLedger(userText, geminiReply) {
  const cleanUserText = String(userText || "").replace(/\s+/g, " ").trim();
  const cleanGeminiReply = String(geminiReply || "").replace(/\s+/g, " ").trim();
  return {
    source: "phone-takeover",
    actor: "phone-gemini",
    projectScope: "phone-live",
    title: cleanUserText ? `Phone takeover: ${cleanUserText}` : "",
    priority: inferTakeoverPriority(cleanUserText),
    note: "Auto-created from phone Gemini handoff.",
    tags: ["phone", "takeover", "gemini", "deep"],
    descriptionLines: cleanGeminiReply ? [`Gemini edge reply: ${cleanGeminiReply}`] : [],
    dedupeWithinMs: 10 * 60 * 1000
  };
}

async function dispatchPhoneLiveVoiceText(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned || state.phoneLiveVoiceDispatching) {
    return;
  }
  state.phoneLiveVoiceDispatching = true;
  try {
    await sendPhoneLiveChatMessage(cleaned, { fromVoice: true });
  } catch (error) {
    if (isPhoneLiveRouteSwitchError(error)) {
      setPendingPhoneLiveRetry(cleaned);
      setPhoneLiveVoiceStatus("Retrying the last voice request on the internet path...", "warn");
      setPhoneLiveAvatarState("thinking", "Retrying on fallback path.");
      return;
    }
    throw error;
  } finally {
    state.phoneLiveVoiceDispatching = false;
  }
}

function stopPhoneLiveAudioOutput() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  const nativeBridge = window.AsolariaAndroid;
  if (nativeBridge && typeof nativeBridge.stopAudioPlayback === "function") {
    try {
      nativeBridge.stopAudioPlayback();
    } catch {}
  }
  if (nativeBridge && typeof nativeBridge.stopSpeechOutput === "function") {
    try {
      nativeBridge.stopSpeechOutput();
    } catch {}
  }
  if (state.phoneLiveCurrentAudio) {
    try {
      state.phoneLiveCurrentAudio.pause();
      state.phoneLiveCurrentAudio.currentTime = 0;
    } catch {}
    state.phoneLiveCurrentAudio = null;
  }
}

async function speakPhoneLiveReply(text, options = {}) {
  const content = buildSpeechFriendlyReplyText(text);
  if (!content) return false;
  if (!state.phoneLiveVoiceEnabled) return false;
  if (!state.phoneLiveVoiceAutoSpeakReplies && !options.force) return false;
  let spoken = false;
  let spokenMode = "";
  try {
    setPhoneLiveAvatarState("speaking", "Speaking reply...");
    const volumePercent = options.volumePercent === null || options.volumePercent === undefined
      ? state.phoneLiveVoiceVolume
      : options.volumePercent;
    const replyVoiceMode = resolveEffectivePhoneVoiceOutputMode(state.phoneLiveVoiceOutputMode, "browser");
    if (replyVoiceMode === "android_tts") {
      spoken = await speakTextViaAndroid(content, { volumePercent });
      if (spoken) {
        spokenMode = "android_tts";
      } else {
        spoken = await speakTextViaBrowser(content, { volumePercent });
        if (spoken) {
          spokenMode = "browser";
        } else {
          spoken = await speakTextViaServer(content, { volumePercent });
          if (spoken) {
            spokenMode = "server";
          }
        }
      }
    } else if (replyVoiceMode === "browser") {
      spoken = await speakTextViaBrowser(content, { volumePercent });
      if (spoken) {
        spokenMode = "browser";
      } else if (hasAndroidSpeechTtsBridge()) {
        spoken = await speakTextViaAndroid(content, { volumePercent });
        if (spoken) {
          spokenMode = "android_tts";
        } else {
          spoken = await speakTextViaServer(content, { volumePercent });
          if (spoken) {
            spokenMode = "server";
          }
        }
      } else {
        spoken = await speakTextViaServer(content, { volumePercent });
        if (spoken) {
          spokenMode = "server";
        }
      }
    } else {
      if (shouldPreferWindowsBrowserSpeech(replyVoiceMode)) {
        spoken = await speakTextViaBrowser(content, { volumePercent });
        if (spoken) {
          spokenMode = "browser";
        }
      }
      if (!spoken) {
        spoken = await speakTextViaServer(content, { volumePercent });
      }
      if (spoken) {
        spokenMode = spokenMode || replyVoiceMode;
      } else if (hasAndroidSpeechTtsBridge()) {
        spoken = await speakTextViaAndroid(content, { volumePercent });
        if (spoken) {
          spokenMode = "android_tts";
        } else {
          spoken = await speakTextViaBrowser(content, { volumePercent });
          if (spoken) {
            spokenMode = "browser";
          }
        }
      } else {
        spoken = await speakTextViaBrowser(content, { volumePercent });
        if (spoken) {
          spokenMode = "browser";
        }
      }
    }
    if (spoken) {
      setPhoneLiveVoiceStatus(`Spoken reply (${spokenMode || replyVoiceMode}).`, "ok");
    } else {
      setPhoneLiveVoiceStatus("Spoken reply unavailable. Check voice provider.", "error");
      setPhoneLiveAvatarState("error", "Voice output unavailable.");
    }
    return spoken;
  } finally {
    window.setTimeout(() => {
      if (!state.phoneLiveListening && !state.phoneLiveRequested) {
        setPhoneLiveAvatarState("idle", "Avatar idle.");
      }
    }, 900);
  }
}

function hasSeenPhoneAvatarGreeting() {
  try {
    return sessionStorage.getItem(PHONE_AVATAR_GREETING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markPhoneAvatarGreetingSeen() {
  try {
    sessionStorage.setItem(PHONE_AVATAR_GREETING_STORAGE_KEY, "1");
  } catch {}
}

async function runPhoneAvatarGreeting(options = {}) {
  const force = Boolean(options.force);
  if (!force && hasSeenPhoneAvatarGreeting()) {
    return;
  }
  const greeting = "Hello Jesse. Asolaria phone avatar is live and ready.";
  appendPhoneLiveTurn("assistant", greeting, "phase:greeting");
  setPhoneLiveAvatarState("speaking", "Greeting...");
  setPhoneLiveVoiceStatus("Greeting from Asolaria...", "ok");
  try {
    const spoken = await speakPhoneLiveReply(greeting, { force: true });
    if (!spoken) {
      setPhoneLiveVoiceStatus("Greeting shown. Tap Voice to hear it out loud.", "ok");
    }
  } catch (error) {
    logLine(`Greeting voice failed: ${error.message}`);
  } finally {
    markPhoneAvatarGreetingSeen();
    window.setTimeout(() => {
      if (!state.phoneLiveListening && !state.phoneLiveRequested) {
        setPhoneLiveAvatarState("idle", "Avatar idle.");
      }
    }, 900);
  }
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getAndroidSpeechBridge() {
  const bridge = window.AsolariaAndroid;
  if (!bridge || typeof bridge.startSpeechRecognition !== "function") {
    return null;
  }
  return bridge;
}

function getAndroidNativeMicBridge() {
  const bridge = window.AsolariaAndroid;
  if (!bridge || typeof bridge.startNativeMicCapture !== "function") {
    return null;
  }
  return bridge;
}

function handleAndroidSpeechEvent(payload = {}) {
  const type = String(payload?.type || "").trim().toLowerCase();
  const text = String(payload?.text || "").replace(/\s+/g, " ").trim();
  if (!type) return;

  if (type === "start" || type === "ready" || type === "speech_start") {
    state.phoneLiveListening = true;
    state.phoneLiveRequested = true;
    if (type === "start") {
      state.phoneLivePendingSpeechText = "";
      state.phoneLivePendingSpeechDispatched = false;
    }
    clearPhoneLiveSilenceTimer();
    updatePhoneLiveVoiceButtons();
    setPhoneLiveVoiceStatus(
      shouldTreatAsWakeLoopSession()
        ? getPhoneWakeLoopReadyStatus()
        : (state.phoneLiveOneShot ? "Listening for one command..." : "Listening..."),
      "ok"
    );
    setPhoneLiveAvatarState("listening", "Listening...");
    return;
  }

  if (type === "partial") {
    if (text) {
      state.phoneLivePendingSpeechText = text;
      if (!shouldTreatAsWakeLoopSession() || state.phoneLiveWakeAwaitingCommand) {
        setPhoneLiveVoiceStatus(`Listening: ${text}`, "ok");
      } else {
        setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
      }
      setPhoneLiveAvatarState("listening", "Listening...");
    }
    return;
  }

  if (type === "final" || type === "result") {
    if (!text) return;
    if (!handlePhoneWakeTranscript(text)) {
      queuePhoneLiveRecognizedText(text);
    }
    return;
  }

  if (type === "error") {
    const reason = String(payload?.error || "unknown");
    clearPhoneLiveSilenceTimer();
    state.phoneLiveListening = false;
    state.phoneLiveRequested = false;
    state.phoneLiveOneShot = false;
    state.phoneLivePendingSpeechText = "";
    state.phoneLivePendingSpeechDispatched = false;
    updatePhoneLiveVoiceButtons();
    if (shouldKeepPhoneWakeLoopActive() && (reason === "no-match" || reason === "speech-timeout" || reason === "busy" || reason === "client")) {
      state.phoneLiveWakeListening = false;
      setPhoneLiveAvatarState("idle", "Wake listener armed.");
      setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
      schedulePhoneWakeLoop(`android_speech_error_${reason}`, 350);
      return;
    }
    const voiceMessage = reason === "not-allowed" || reason === "service-not-allowed"
      ? "Microphone permission is blocked. Allow microphone access for Asolaria and try again."
      : `Voice error: ${reason}`;
    setPhoneLiveVoiceStatus(voiceMessage, "error");
    setPhoneLiveAvatarState("error", "Voice input interrupted.");
    return;
  }

  if (type === "end") {
    clearPhoneLiveSilenceTimer();
    const wasOneShot = state.phoneLiveOneShot;
    const shouldAutoDispatch = shouldAutoDispatchPhoneLiveSpeech()
      && !state.phoneLivePendingSpeechDispatched
      && String(state.phoneLivePendingSpeechText || "").trim();
    state.phoneLiveListening = false;
    state.phoneLiveRequested = false;
    state.phoneLiveOneShot = false;
    updatePhoneLiveVoiceButtons();
    if (shouldTreatAsWakeLoopSession()) {
      if (!shouldAutoDispatch && !String(state.phoneLivePendingSpeechText || "").trim()) {
        state.phoneLiveWakeListening = false;
        setPhoneLiveAvatarState("idle", "Wake listener armed.");
        setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
        schedulePhoneWakeLoop("android_speech_end", 320);
        return;
      }
    }
    if (shouldAutoDispatch) {
      const pendingText = String(state.phoneLivePendingSpeechText || "").trim();
      state.phoneLivePendingSpeechDispatched = true;
      setPhoneLiveVoiceStatus("Sending captured voice automatically...", "ok");
      dispatchPhoneLiveVoiceText(pendingText).catch((error) => {
        state.phoneLivePendingSpeechDispatched = false;
        setPhoneLiveVoiceStatus(`Voice send failed: ${error.message}`, "error");
        setPhoneLiveAvatarState("error", "Voice send failed.");
      }).finally(() => {
        state.phoneLivePendingSpeechText = "";
      });
      return;
    }
    if (state.phoneLiveVoiceDispatching || state.phoneLivePendingSpeechDispatched) {
      return;
    }
    state.phoneLivePendingSpeechDispatched = false;
    if (String(state.phoneLivePendingSpeechText || "").trim()) {
      setPhoneLiveVoiceStatus("Voice captured. Press Send to continue.", "ok");
      setPhoneLiveAvatarState("thinking", "Captured voice input.");
      return;
    }
    setPhoneLiveVoiceStatus(wasOneShot ? "Push-to-talk complete." : "Voice stopped.", "ok");
    setPhoneLiveAvatarState("idle", "Avatar idle.");
  }
}

function handleAndroidNativeMicEvent(payload = {}) {
  const rt = state.phoneLiveChunk;
  const type = String(payload?.type || "").trim().toLowerCase();
  const text = String(payload?.text || "").replace(/\s+/g, " ").trim();
  if (!type || (!rt.native && type !== "error")) {
    return;
  }

  if (type === "start" || type === "ready") {
    state.phoneLiveListening = true;
    state.phoneLiveRequested = true;
    clearPhoneLiveSilenceTimer();
    updatePhoneLiveVoiceButtons();
    setPhoneLiveVoiceStatus(
      state.phoneLiveOneShot ? "Listening for one command..." : "Listening...",
      "ok"
    );
    setPhoneLiveAvatarState("listening", "Listening...");
    return;
  }

  if (type === "partial" || type === "final" || type === "result") {
    if (!text) {
      return;
    }
    rt.emptyChunkStreak = 0;
    rt.transcript = mergePhoneRealtimeTranscript(rt.transcript, text);
    state.phoneLivePendingSpeechText = rt.transcript;
    setPhoneLiveVoiceStatus(`Listening: ${text}`, "ok");
    setPhoneLiveAvatarState("listening", "Listening...");
    schedulePhoneLiveSilenceStop();
    return;
  }

  if (type === "error") {
    const reason = String(payload?.error || "native mic failed");
    rt.finalizeReason = reason === "not-allowed" || reason === "service-not-allowed"
      ? "Microphone permission is blocked. Allow microphone access for Asolaria and try again."
      : `Voice error: ${reason}`;
    rt.finalizeLevel = "error";
    beginPhoneLiveChunkDrain(rt.finalizeReason, rt.finalizeLevel);
    return;
  }

  if (type === "end") {
    beginPhoneLiveChunkDrain(rt.finalizeReason || "Voice stopped.", rt.finalizeLevel || "ok");
  }
}

function buildNativeAndroidRecognition() {
  const nativeBridge = getAndroidSpeechBridge();
  if (!nativeBridge) {
    return null;
  }
  return {
    lang: getPreferredSpeechLang(state.phoneLiveWakeWord),
    start() {
      const preferOffline = state.phoneLiveWakeListening || state.phoneLiveWakeLoopEnabled;
      const result = String(
        nativeBridge.startSpeechRecognition(
          this.lang || getPreferredSpeechLang(state.phoneLiveWakeWord),
          preferOffline ? "true" : "false"
        ) || ""
      ).trim().toLowerCase();
      if (!result || result === "started" || result === "queued") {
        return;
      }
      if (result === "permission_requested") {
        throw new Error("Microphone permission requested. Approve it in Android and try again.");
      }
      if (result === "unsupported") {
        throw new Error("Android speech recognition is unavailable on this device.");
      }
      if (result === "untrusted_origin") {
        throw new Error("Android speech bridge is blocked until the app returns to a trusted Asolaria page.");
      }
      if (result.startsWith("error:")) {
        throw new Error(result.slice(6));
      }
      throw new Error(result || "Native Android speech start failed.");
    },
    stop() {
      try {
        nativeBridge.stopSpeechRecognition?.();
      } catch {}
    },
    abort() {
      try {
        nativeBridge.stopSpeechRecognition?.();
      } catch {}
    }
  };
}

function buildPhoneLiveRecognition() {
  const nativeRecognition = buildNativeAndroidRecognition();
  if (nativeRecognition) {
    return nativeRecognition;
  }
  const SpeechCtor = getSpeechRecognitionCtor();
  if (!SpeechCtor) return null;

  const recognition = new SpeechCtor();
  recognition.lang = getPreferredSpeechLang(state.phoneLiveWakeWord);
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  applyPhoneSpeechRecognitionHints(recognition, state.phoneLiveWakeWord);

  recognition.onstart = () => {
    state.phoneLiveListening = true;
    state.phoneLiveRequested = true;
    state.phoneLivePendingSpeechText = "";
    state.phoneLivePendingSpeechDispatched = false;
    clearPhoneLiveSilenceTimer();
    updatePhoneLiveVoiceButtons();
    setPhoneLiveVoiceStatus(
      shouldTreatAsWakeLoopSession()
        ? getPhoneWakeLoopReadyStatus()
        : (state.phoneLiveOneShot ? "Listening for one command..." : "Listening..."),
      "ok"
    );
    setPhoneLiveAvatarState("listening", "Listening...");
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let lastObservedTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = String(result?.[0]?.transcript || "").trim();
      if (!transcript) continue;
      lastObservedTranscript = transcript;
      if (result.isFinal) {
        finalTranscript += `${transcript} `;
      } else if (!shouldTreatAsWakeLoopSession() || state.phoneLiveWakeAwaitingCommand) {
        setPhoneLiveVoiceStatus(`Listening: ${transcript}`, "ok");
      }
      schedulePhoneLiveSilenceStop();
    }
    const text = finalTranscript.replace(/\s+/g, " ").trim();
    const fallbackText = String(lastObservedTranscript || "").replace(/\s+/g, " ").trim();
    const bestText = text || fallbackText;
    if (bestText) {
      state.phoneLivePendingSpeechText = bestText;
    }
    if (!text) return;
    if (!handlePhoneWakeTranscript(text)) {
      queuePhoneLiveRecognizedText(text);
    }
  };

  recognition.onerror = (event) => {
    const reason = String(event?.error || "unknown");
    clearPhoneLiveSilenceTimer();
    state.phoneLiveListening = false;
    state.phoneLiveRequested = false;
    state.phoneLiveOneShot = false;
    state.phoneLivePendingSpeechText = "";
    state.phoneLivePendingSpeechDispatched = false;
    updatePhoneLiveVoiceButtons();
    if (shouldKeepPhoneWakeLoopActive() && (reason === "no-match" || reason === "speech-timeout" || reason === "network" || reason === "network-timeout")) {
      state.phoneLiveWakeListening = false;
      setPhoneLiveAvatarState("idle", "Wake listener armed.");
      setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
      schedulePhoneWakeLoop(`browser_speech_error_${reason}`, 350);
      return;
    }
    const voiceMessage = reason === "not-allowed" || reason === "service-not-allowed"
      ? "Microphone permission is blocked. Allow microphone access for Asolaria and try again."
      : `Voice error: ${reason}`;
    setPhoneLiveVoiceStatus(voiceMessage, "error");
    setPhoneLiveAvatarState("error", "Voice input interrupted.");
  };

  recognition.onend = () => {
    clearPhoneLiveSilenceTimer();
    const wasOneShot = state.phoneLiveOneShot;
    const shouldAutoDispatch = shouldAutoDispatchPhoneLiveSpeech()
      && !state.phoneLivePendingSpeechDispatched
      && String(state.phoneLivePendingSpeechText || "").trim();
    state.phoneLiveListening = false;
    state.phoneLiveRequested = false;
    state.phoneLiveOneShot = false;
    updatePhoneLiveVoiceButtons();
    if (shouldTreatAsWakeLoopSession()) {
      if (!shouldAutoDispatch && !String(state.phoneLivePendingSpeechText || "").trim()) {
        state.phoneLiveWakeListening = false;
        setPhoneLiveAvatarState("idle", "Wake listener armed.");
        setPhoneLiveVoiceStatus(getPhoneWakeLoopReadyStatus(), "ok");
        schedulePhoneWakeLoop("browser_speech_end", 320);
        return;
      }
    }
    if (shouldAutoDispatch) {
      const pendingText = String(state.phoneLivePendingSpeechText || "").trim();
      state.phoneLivePendingSpeechDispatched = true;
      setPhoneLiveVoiceStatus("Sending captured voice automatically...", "ok");
      dispatchPhoneLiveVoiceText(pendingText).catch((error) => {
        state.phoneLivePendingSpeechDispatched = false;
        setPhoneLiveVoiceStatus(`Voice send failed: ${error.message}`, "error");
        setPhoneLiveAvatarState("error", "Voice send failed.");
      }).finally(() => {
        state.phoneLivePendingSpeechText = "";
      });
      return;
    }
    if (state.phoneLiveVoiceDispatching || state.phoneLivePendingSpeechDispatched) {
      return;
    }
    state.phoneLivePendingSpeechDispatched = false;
    if (String(state.phoneLivePendingSpeechText || "").trim()) {
      setPhoneLiveVoiceStatus("Voice captured. Press Send to continue.", "ok");
      setPhoneLiveAvatarState("thinking", "Captured voice input.");
      return;
    }
    setPhoneLiveVoiceStatus(wasOneShot ? "Push-to-talk complete." : "Voice stopped.", "ok");
    setPhoneLiveAvatarState("idle", "Avatar idle.");
  };

  return recognition;
}

function startPhoneLiveVoice(options = {}) {
  if (!state.phoneLiveVoiceEnabled) {
    setPhoneLiveVoiceStatus("Voice disabled in settings.", "error");
    return false;
  }
  const oneShot = Boolean(options.oneShot);
  const wakeLoop = Boolean(options.wakeLoop);
  if (state.phoneLiveListening || state.phoneLiveRequested) {
    state.phoneLiveOneShot = oneShot;
    state.phoneLiveWakeListening = wakeLoop && state.phoneLiveWakeLoopEnabled;
    updatePhoneLiveVoiceButtons();
    return true;
  }
  state.phoneLiveWakeListening = wakeLoop && state.phoneLiveWakeLoopEnabled;
  if (!state.phoneLiveWakeListening) {
    state.phoneLiveWakeAwaitingCommand = false;
  }
  if (shouldPreferPhoneLiveChunkCapture()) {
    state.phoneLiveOneShot = oneShot;
    state.phoneLiveRequested = true;
    clearPhoneLiveSilenceTimer();
    updatePhoneLiveVoiceButtons();
    setPhoneLiveVoiceStatus("Preparing microphone...", "ok");
    setPhoneLiveAvatarState("listening", "Preparing microphone...");
    startPhoneLiveChunkCapture({ oneShot }).catch((error) => {
      state.phoneLiveListening = false;
      state.phoneLiveRequested = false;
      state.phoneLiveOneShot = false;
      updatePhoneLiveVoiceButtons();
      setPhoneLiveVoiceStatus(String(error?.message || "Voice start failed."), "error");
      setPhoneLiveAvatarState("error", "Voice start failed.");
    });
    return true;
  }
  if (!state.phoneLiveRecognition) {
    state.phoneLiveRecognition = buildPhoneLiveRecognition();
  }
  if (!state.phoneLiveRecognition) {
    setPhoneLiveVoiceStatus("Speech recognition not supported in this browser.", "error");
    setPhoneLiveAvatarState("error", "Voice input unavailable.");
    return false;
  }
  state.phoneLiveOneShot = oneShot;
  state.phoneLiveRequested = true;
  clearPhoneLiveSilenceTimer();
  updatePhoneLiveVoiceButtons();
  try {
    state.phoneLiveRecognition.lang = getPreferredSpeechLang(state.phoneLiveWakeWord);
    applyPhoneSpeechRecognitionHints(state.phoneLiveRecognition, state.phoneLiveWakeWord);
    state.phoneLiveRecognition.start();
    if (getAndroidSpeechBridge()) {
      setPhoneLiveVoiceStatus(
        oneShot ? "Listening with Android speech..." : "Listening with Android speech...",
        "ok"
      );
      setPhoneLiveAvatarState("listening", "Listening...");
    }
    return true;
  } catch (error) {
    const message = String(error?.message || "Voice start failed.");
    if (getAndroidNativeMicBridge() && !/permission|blocked|untrusted/i.test(message)) {
      setPhoneLiveVoiceStatus("Android speech start failed. Falling back to native mic capture...", "ok");
      setPhoneLiveAvatarState("listening", "Preparing microphone...");
      startPhoneLiveChunkCapture({ oneShot }).catch((chunkError) => {
        state.phoneLiveListening = false;
        state.phoneLiveRequested = false;
        state.phoneLiveOneShot = false;
        updatePhoneLiveVoiceButtons();
        setPhoneLiveVoiceStatus(String(chunkError?.message || "Voice start failed."), "error");
        setPhoneLiveAvatarState("error", "Voice start failed.");
      });
      return true;
    }
    state.phoneLiveListening = false;
    state.phoneLiveRequested = false;
    state.phoneLiveOneShot = false;
    updatePhoneLiveVoiceButtons();
    setPhoneLiveVoiceStatus(message, "error");
    setPhoneLiveAvatarState("error", "Voice start failed.");
    return false;
  }
}

function stopPhoneLiveVoice(options = {}) {
  const skipWakeRearm = Boolean(options.skipWakeRearm);
  const usingChunkCapture = isPhoneLiveChunkCaptureActive();
  if (usingChunkCapture) {
    stopPhoneLiveChunkCapture({
      reason: options.preserveStatus ? "" : "Voice stopped.",
      level: options.preserveStatus ? "" : "ok"
    });
  }
  state.phoneLiveOneShot = false;
  state.phoneLiveRequested = false;
  state.phoneLiveWakeListening = false;
  clearPhoneLiveSilenceTimer();
  if (!usingChunkCapture && state.phoneLiveRecognition) {
    try {
      state.phoneLiveRecognition.stop();
    } catch {
      try {
        state.phoneLiveRecognition.abort();
      } catch {}
    }
  }
  stopPhoneLiveAudioOutput();
  if (usingChunkCapture) {
    return;
  }
  state.phoneLiveListening = false;
  updatePhoneLiveVoiceButtons();
  if (!options.preserveStatus) {
    setPhoneLiveVoiceStatus("Voice stopped.", "ok");
  }
  setPhoneLiveAvatarState("idle", "Avatar idle.");
  if (!skipWakeRearm) {
    schedulePhoneWakeLoop("manual_stop", 500);
  }
}

function formatPhoneLiveJobReply(job = {}) {
  const result = job?.result;
  if (result?.reply) return String(result.reply);
  if (result?.text) return String(result.text);
  if (result?.output) return String(result.output);
  if (result) {
    return JSON.stringify(result, null, 2);
  }
  return "Task completed.";
}

function buildPhoneTakeoverNoticeText(baseText, meta = {}) {
  const lines = [String(baseText || "Asolaria is taking over for deeper work.").trim()];
  if (meta.taskLedgerTaskId) {
    lines.push(`task:${meta.taskLedgerTaskId}`);
  }
  if (meta.id) {
    lines.push(`job:${meta.id}`);
  }
  return lines.filter(Boolean).join("\n\n");
}

async function waitForJobResult(jobId, options = {}) {
  const pollMs = Math.max(600, asNumber(options.pollMs, 1200));
  const timeoutMs = Math.max(10_000, asNumber(options.timeoutMs, 180_000));
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const payload = await requestJson(`/api/jobs/${encodeURIComponent(jobId)}`);
    const job = payload?.job || {};
    if (typeof options.onUpdate === "function") {
      try {
        options.onUpdate(job);
      } catch {}
    }
    const status = String(job.status || "").toLowerCase();
    if (status === "completed" || status === "failed") {
      return job;
    }
    await new Promise((resolve) => window.setTimeout(resolve, pollMs));
  }
  throw new Error(`Timed out waiting for job ${jobId}.`);
}

async function sendPhoneLiveChatMessage(rawText, options = {}) {
  const rawValue = rawText ?? phoneLiveChatInput?.value ?? "";
  const parsed = parseVoiceVolumeDirective(rawValue);
  const requestVolumePercent = parsed.volumePercent;
  const text = normalizePhoneLiveAssistantAlias(parsed.cleanedText || "");
  if (!text) return;
  const displayText = String(options.displayText || "").trim() || text;

  appendPhoneLiveTurn("user", displayText);
  if (phoneLiveChatInput) {
    const currentInput = String(phoneLiveChatInput.value || "").trim();
    const shouldClearInput = !options.preserveInput
      && (currentInput === text || currentInput === displayText || !options.fromVoice);
    if (shouldClearInput) {
      phoneLiveChatInput.value = "";
    }
  }
  setPhoneLiveAvatarState("thinking", "Thinking...");
  setPhoneLiveVoiceStatus("Sending to Asolaria...", "ok");
  if (phoneLiveSendBtn) phoneLiveSendBtn.disabled = true;

  try {
    if (requestVolumePercent !== null) {
      setPhoneLiveVoiceStatus(`Using request volume ${requestVolumePercent}%`, "ok");
      logLine(`Phone Live request volume override: ${requestVolumePercent}%.`);
    }
    if (state.phoneLiveRouteMode === "gemini") {
      let geminiReply = "";
      let geminiTaskLedgerTaskId = "";
      const geminiNotice = appendPhoneLiveTurn("assistant", "Gemini edge is responding...", "phase:gemini-edge");
      try {
        setPhoneLiveVoiceStatus("Gemini edge is answering...", "ok");
        const geminiResult = await fetchPhoneLiveGeminiEdgeReply(text);
        geminiReply = String(geminiResult?.reply || "").trim();
        geminiTaskLedgerTaskId = String(geminiResult?.taskLedgerTaskId || "").trim();
      } catch (error) {
        logLine(`Gemini edge quick reply failed: ${error.message}`);
        geminiReply = buildInstantAck(text);
      }
      if (geminiNotice && geminiNotice.parentNode) {
        geminiNotice.parentNode.removeChild(geminiNotice);
        applyPhoneLiveChatWindow();
      }
      appendPhoneLiveTurn("assistant", geminiReply, "phase:gemini-edge");
      if (!options.suppressVoiceReply) {
        await speakPhoneLiveReply(geminiReply, { volumePercent: requestVolumePercent });
      }

      if (geminiTaskLedgerTaskId) {
        appendPhoneLiveTurn(
          "assistant",
          `Takeover tracked in Inbox as ${geminiTaskLedgerTaskId}.`,
          "phase:deep-track"
        );
        setPhoneLiveVoiceStatus(`Tracked in Inbox as ${geminiTaskLedgerTaskId}.`, "ok");
        loadInbox({ silent: true }).catch(() => {});
      }
      if (state.phoneLiveWakeLoopEnabled) {
        openPhoneLiveFollowupWindow();
        setPhoneLiveVoiceStatus("Listening for follow-up...", "ok");
      }
      setPhoneLiveAvatarState("idle", "Avatar idle.");
      return;
    }
    if (!options.skipInstantAck) {
      const instantText = buildInstantAck(text);
      appendPhoneLiveTurn("assistant", instantText, "phase:instant");
      if (!options.suppressVoiceReply) {
        await speakPhoneLiveReply(instantText, { volumePercent: requestVolumePercent });
      }
    }
    const queueLabel = "Working on the detailed response...";
    const queueNotice = appendPhoneLiveTurn("assistant", queueLabel, "phase:primary-queue");
    const firstReply = await fetchPhoneLiveReply(text, state.phoneLiveRouteMode, {
      onQueued: (job) => {
        if (queueNotice) {
          queueNotice.textContent = `${queueLabel}\n\njob:${job.id}`;
        }
        setPhoneLiveVoiceStatus(`Detailed pass queued (${job.id}).`, "ok");
      },
      onUpdate: (job) => {
        const status = String(job?.status || "running").toLowerCase();
        setPhoneLiveVoiceStatus(`Detailed pass: ${status}...`, "ok");
      }
    });
    if (queueNotice && queueNotice.parentNode) {
      queueNotice.parentNode.removeChild(queueNotice);
      applyPhoneLiveChatWindow();
    }
    appendPhoneLiveTurn("assistant", firstReply, "phase:primary");
    if (!options.suppressVoiceReply) {
      await speakPhoneLiveReply(firstReply, { volumePercent: requestVolumePercent });
    }
    if (!options.skipTwoStage && state.phoneLiveTwoStageEnabled) {
      const deepNotice = appendPhoneLiveTurn("assistant", "Running deeper analysis...", "phase:deep-start");
      const deepPrompt = buildDeepFollowupPrompt(text, firstReply);
      const deepReply = await fetchPhoneLiveReply(deepPrompt, "deep", {
        onQueued: (job) => {
          if (deepNotice) {
            deepNotice.textContent = `Running deeper analysis...\n\njob:${job.id}`;
          }
          setPhoneLiveVoiceStatus(`Deep pass queued (${job.id}).`, "ok");
        },
        onUpdate: (job) => {
          const status = String(job?.status || "running").toLowerCase();
          setPhoneLiveVoiceStatus(`Deep pass: ${status}...`, "ok");
        }
      });
      if (deepNotice && deepNotice.parentNode) {
        deepNotice.parentNode.removeChild(deepNotice);
        applyPhoneLiveChatWindow();
      }
      appendPhoneLiveTurn("assistant", deepReply, "phase:deep");
      if (!options.suppressVoiceReply) {
        await speakPhoneLiveReply(deepReply, { volumePercent: requestVolumePercent });
      }
    }
    if (state.phoneLiveWakeLoopEnabled) {
      openPhoneLiveFollowupWindow();
      setPhoneLiveVoiceStatus("Listening for follow-up...", "ok");
    }
    setPhoneLiveAvatarState("idle", "Avatar idle.");
  } catch (error) {
    const message = String(error?.message || "Chat failed.");
    if (!isPhoneLiveRouteSwitchError(error)) {
      appendPhoneLiveTurn("assistant", message, "error");
      setPhoneLiveAvatarState("error", "Request failed.");
      setPhoneLiveVoiceStatus(`Chat failed: ${message}`, "error");
    } else {
      setPhoneLiveAvatarState("thinking", "Switching routes...");
      setPhoneLiveVoiceStatus(message, "warn");
      logLine(`Phone Live rerouting: ${message}`);
    }
    throw error;
  } finally {
    if (phoneLiveSendBtn) phoneLiveSendBtn.disabled = false;
    if (phoneLiveChatInput && !options.fromVoice) {
      phoneLiveChatInput.focus();
    }
    if (state.phoneLiveWakeLoopEnabled) {
      schedulePhoneWakeLoop("chat_complete", 220);
    }
  }
}

function setPhoneLiveNotebookShortcutBusy(busy) {
  const disabled = Boolean(busy);
  if (phoneLiveSendBtn) phoneLiveSendBtn.disabled = disabled;
  if (phoneLiveNotebookAskBtn) phoneLiveNotebookAskBtn.disabled = disabled;
  if (phoneLiveNotebookStatusBtn) phoneLiveNotebookStatusBtn.disabled = disabled;
}

async function runPhoneLiveNotebookShortcut(commandText, options = {}) {
  const command = String(commandText || "").trim();
  if (!command) return "";
  const displayText = String(options.displayText || command).trim() || command;
  const statusText = String(options.statusText || "Checking NotebookLM...").trim() || "Checking NotebookLM...";
  const volumePercent = options.volumePercent === null || options.volumePercent === undefined
    ? state.phoneLiveVoiceVolume
    : options.volumePercent;

  appendPhoneLiveTurn("user", displayText);
  if (phoneLiveChatInput && options.clearInput) {
    phoneLiveChatInput.value = "";
  }
  setPhoneLiveAvatarState("thinking", "Checking NotebookLM...");
  setPhoneLiveVoiceStatus(statusText, "ok");
  setPhoneLiveNotebookShortcutBusy(true);

  try {
    const reply = await fetchPhoneLiveReply(command, "normal", {
      onQueued: (job) => {
        const jobId = String(job?.id || "").trim();
        setPhoneLiveVoiceStatus(
          jobId ? `NotebookLM queued (${jobId}).` : "NotebookLM queued.",
          "ok"
        );
      },
      onUpdate: (job) => {
        const jobStatus = String(job?.status || "running").trim().toLowerCase() || "running";
        setPhoneLiveVoiceStatus(`NotebookLM: ${jobStatus}...`, "ok");
      }
    });
    appendPhoneLiveTurn("assistant", reply, "phase:notebooklm");
    if (!options.suppressVoiceReply) {
      await speakPhoneLiveReply(reply, { volumePercent });
    }
    if (state.phoneLiveWakeLoopEnabled) {
      openPhoneLiveFollowupWindow();
      setPhoneLiveVoiceStatus("Listening for follow-up...", "ok");
    } else {
      setPhoneLiveVoiceStatus("NotebookLM reply ready.", "ok");
    }
    setPhoneLiveAvatarState("idle", "Avatar idle.");
    return reply;
  } catch (error) {
    const message = String(error?.message || "NotebookLM request failed.");
    appendPhoneLiveTurn("assistant", message, "error");
    setPhoneLiveVoiceStatus(`NotebookLM failed: ${message}`, "error");
    setPhoneLiveAvatarState("error", "NotebookLM request failed.");
    throw error;
  } finally {
    setPhoneLiveNotebookShortcutBusy(false);
    phoneLiveChatInput?.focus();
    if (state.phoneLiveWakeLoopEnabled) {
      schedulePhoneWakeLoop("notebooklm_complete", 220);
    }
  }
}

async function askNotebooklmFromPhoneInput() {
  const query = String(phoneLiveChatInput?.value || "").trim();
  if (!query) {
    setPhoneLiveVoiceStatus("Type a NotebookLM question first.", "error");
    phoneLiveChatInput?.focus();
    return "";
  }
  return runPhoneLiveNotebookShortcut(`notebooklm ask ${query}`, {
    displayText: `NotebookLM ask: ${query}`,
    statusText: "Sending NotebookLM question...",
    clearInput: true
  });
}

async function requestPhoneNotebooklmStatus() {
  return runPhoneLiveNotebookShortcut("notebooklm status", {
    displayText: "NotebookLM status",
    statusText: "Checking NotebookLM status..."
  });
}

async function sendGeminiRelayTranscript() {
  const transcript = String(geminiRelayInput?.value || "").trim();
  if (!transcript) {
    throw new Error("Gemini relay transcript is required.");
  }
  const relayMessage = [
    "[Gemini Live Relay Transcript]",
    transcript,
    "",
    "Please respond in two phases:",
    "1) fast immediate guidance",
    "2) deeper analysis with practical next steps."
  ].join("\n");
  if (geminiRelayInput) {
    geminiRelayInput.value = "";
  }
  await sendPhoneLiveChatMessage(relayMessage, { skipInstantAck: true });
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
  const sticky = Boolean(state.controlsSticky);
  if (controlGuardStatus) {
    controlGuardStatus.classList.remove("on", "off");
    controlGuardStatus.classList.add(armed ? "on" : "off");
    controlGuardStatus.textContent = armed
      ? (sticky ? "Control: armed (sticky)" : `Control: armed (${remainingSec}s left)`)
      : "Control: disarmed";
  }
  if (armControlBtn) {
    armControlBtn.className = armed ? "ok" : "warn";
    armControlBtn.textContent = armed
      ? (sticky ? "Disarm Controls (Sticky)" : `Disarm Controls (${remainingSec}s)`)
      : (sticky ? "Arm Controls (Sticky)" : "Arm Controls");
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
  const sticky = Boolean(state.controlsSticky);
  const safeMs = sticky
    ? CONTROL_STICKY_WINDOW_MS
    : Math.max(15 * 1000, asNumber(durationMs, CONTROL_ARM_WINDOW_MS));
  state.controlsArmedUntilMs = Date.now() + safeMs;
  if (state.controlGuardTimer) {
    window.clearInterval(state.controlGuardTimer);
  }
  state.controlGuardTimer = window.setInterval(() => {
    if (!sticky && !isControlsArmed()) {
      disarmControls({ log: false });
      logLine("Control guard auto-disarmed.");
      return;
    }
    if (sticky && getArmedRemainingMs() < (12 * 60 * 60 * 1000)) {
      state.controlsArmedUntilMs = Date.now() + CONTROL_STICKY_WINDOW_MS;
    }
    renderControlGuard();
  }, 240);
  renderControlGuard();
  if (options.log !== false) {
    logLine(sticky
      ? "Controls armed (sticky until manual disarm)."
      : `Controls armed for ${Math.round(safeMs / 1000)} seconds.`);
  }
}

function requireControlsArmed(actionLabel) {
  if (isControlsArmed()) {
    return;
  }
  throw new Error(
    `Controls are disarmed. Arm Controls before ${String(actionLabel || "sending control input")}.`
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
  const devices = Array.isArray(mirror.devices) ? mirror.devices : [];
  const physicalIds = devices
    .map((item) => String(item?.id || "").trim())
    .filter(Boolean)
    .filter((id) => !/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(id));
  const physicalCount = new Set(physicalIds).size;
  if (deviceBadge) {
    deviceBadge.textContent = `Primary: Jesse's Phone (${device})`;
  }
  if (oliLaneBadge) {
    if (physicalCount > 1) {
      oliLaneBadge.textContent = "Falcon lane: separate phone available";
    } else {
      oliLaneBadge.textContent = "Falcon lane: alert lane on Jesse's phone";
    }
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
  const lines = [
    `Enabled: ${enabled ? "yes" : "no"}`,
    `Configured: ${configured ? "yes" : "no"}`,
    `Notify mode: ${String(summary.notifyMode || "critical_or_security")}`,
    `Backup (Asolaria): ${summary.hasBackupAsolariaNumber ? "set" : "not set"}`,
    `Backup (User): ${summary.hasBackupUserNumber ? "set" : "not set"}`,
    `Updated: ${formatTime(summary.updatedAt)}`
  ];
  if (
    summary.hasAccountSid !== undefined
    || summary.hasAuthToken !== undefined
    || summary.hasFromNumber !== undefined
    || summary.hasToNumber !== undefined
  ) {
    lines.push(
      `Secrets: sid=${summary.hasAccountSid ? "yes" : "no"}, token=${summary.hasAuthToken ? "yes" : "no"}, from=${summary.hasFromNumber ? "yes" : "no"}, to=${summary.hasToNumber ? "yes" : "no"}`
    );
  }
  waStatus.textContent = lines.join("\n");
}

function applyWhatsAppFieldHints(summary = {}) {
  if (waAccountSid) {
    waAccountSid.placeholder = summary.accountSid
      ? `Twilio Account SID (saved: ${String(summary.accountSid)})`
      : "Twilio Account SID (optional update)";
  }
  if (waFromNumber) {
    waFromNumber.placeholder = summary.fromNumber
      ? `Twilio WhatsApp sender (saved: ${String(summary.fromNumber)})`
      : "Twilio WhatsApp sender (e.g. whatsapp:+14155238886)";
  }
  if (waToNumber) {
    waToNumber.placeholder = summary.toNumber
      ? `Target WhatsApp recipient (saved: ${String(summary.toNumber)})`
      : "Target WhatsApp recipient (e.g. whatsapp:+15551234567)";
  }
  if (waBackupAsolariaNumber) {
    waBackupAsolariaNumber.placeholder = summary.backupAsolariaNumber
      ? `Asolaria backup number (saved: ${String(summary.backupAsolariaNumber)})`
      : "Asolaria backup number (e.g. whatsapp:+15550123456)";
  }
  if (waBackupUserNumber) {
    waBackupUserNumber.placeholder = summary.backupUserNumber
      ? `Your backup number (saved: ${String(summary.backupUserNumber)})`
      : "Your backup number (e.g. whatsapp:+15550987654)";
  }
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
  phoneMirrorImage.src = buildApiUrl("/api/phone/mirror/image", {
    v: String(capturedAtMs || Date.now())
  });
  state.orientation = applyFrameGeometry(screenFrame, snapshot, { spin: true });
}

function renderObserverImage(snapshot = {}) {
  const capturedAtMs = asNumber(snapshot.capturedAtMs, 0);
  if (!observerMirrorImage) {
    return;
  }
  observerMirrorImage.src = buildApiUrl("/api/phone/mirror/image", {
    v: String(capturedAtMs || Date.now())
  });
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
  state.whatsapp = {
    ...(state.whatsapp || {}),
    ...(payload.whatsapp || {})
  };
  state.selectedDeviceId = String(state.mirror.selectedDeviceId || state.snapshot?.deviceId || "").trim();

  if (waEnabled) {
    waEnabled.checked = Boolean(state.whatsapp?.enabled);
  }
  if (waNotifyMode && state.whatsapp?.notifyMode) {
    waNotifyMode.value = String(state.whatsapp.notifyMode);
  }
  if (waBackupAsolariaNumber && document.activeElement !== waBackupAsolariaNumber && !waBackupAsolariaNumber.value) {
    waBackupAsolariaNumber.value = "";
  }
  if (waBackupUserNumber && document.activeElement !== waBackupUserNumber && !waBackupUserNumber.value) {
    waBackupUserNumber.value = "";
  }
  renderWhatsAppStatus(state.whatsapp || {});
  applyWhatsAppFieldHints(state.whatsapp || {});
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
  const payload = await requestJson("/api/phone/mirror/status", {
    query: {
      deviceId: state.selectedDeviceId || undefined
    }
  });
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

async function loadWhatsAppConfig(options = {}) {
  const payload = await requestJson("/api/guardian/whatsapp");
  state.whatsapp = {
    ...(state.whatsapp || {}),
    ...(payload.whatsapp || {})
  };
  if (waEnabled) {
    waEnabled.checked = Boolean(state.whatsapp?.enabled);
  }
  if (waNotifyMode && state.whatsapp?.notifyMode) {
    waNotifyMode.value = String(state.whatsapp.notifyMode);
  }
  renderWhatsAppStatus(state.whatsapp || {});
  applyWhatsAppFieldHints(state.whatsapp || {});
  if (!options.silent) {
    logLine("WhatsApp policy refreshed.");
  }
  return payload;
}

function findInboxApproval(id) {
  const rows = Array.isArray(state.inbox?.approvals) ? state.inbox.approvals : [];
  return rows.find((row) => String(row?.id || "") === String(id || ""));
}

function findInboxTask(id) {
  const rows = Array.isArray(state.inbox?.tasks) ? state.inbox.tasks : [];
  return rows.find((row) => String(row?.id || "") === String(id || ""));
}

function findInboxNote(id) {
  const rows = Array.isArray(state.inbox?.notes) ? state.inbox.notes : [];
  return rows.find((row) => String(row?.id || "") === String(id || ""));
}

function renderInboxApprovals(rows) {
  if (!inboxApprovals) {
    return;
  }
  const approvals = Array.isArray(rows) ? rows : [];
  if (approvals.length < 1) {
    renderInboxEmpty(inboxApprovals, "No pending approvals.");
    return;
  }
  inboxApprovals.innerHTML = approvals.map((approval) => {
    const risk = String(approval?.riskLevel || "medium").trim().toLowerCase();
    const meta = [
      approval?.action ? `action ${approval.action}` : "",
      approval?.source ? `source ${approval.source}` : "",
      approval?.createdAt ? formatRelativeAge(approval.createdAt) : ""
    ].filter(Boolean).join(" | ");
    return `
      <article class="inbox-item">
        <div class="inbox-item-head">
          <h4 class="inbox-item-title">${escapeHtml(approval?.id || "approval")}</h4>
          <span class="risk-pill ${riskClassName(risk)}">${escapeHtml(risk)}</span>
        </div>
        <div class="inbox-item-meta">${escapeHtml(meta || "Pending approval")}</div>
        <div class="inbox-item-body">${escapeHtml(approval?.messagePreview || "Approval requested.")}</div>
        <div class="inbox-item-actions">
          <button type="button" class="ok" data-inbox-action="approve" data-id="${escapeHtml(approval?.id || "")}">Approve</button>
          <button type="button" class="danger" data-inbox-action="deny" data-id="${escapeHtml(approval?.id || "")}">Deny</button>
          <button type="button" data-inbox-action="open-approvals">Details</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderInboxTasks(rows) {
  if (!inboxTasks) {
    return;
  }
  const tasks = Array.isArray(rows) ? rows : [];
  if (tasks.length < 1) {
    renderInboxEmpty(inboxTasks, "No active tasks.");
    return;
  }
  inboxTasks.innerHTML = tasks.map((task) => {
    const meta = [
      task?.sourceLabel || "",
      `${task?.status || "planned"} / ${task?.priority || "normal"}`,
      typeof task?.progress === "number" ? `${task.progress}%` : "",
      task?.updatedAt ? formatRelativeAge(task.updatedAt) : "",
      Number(task?.duplicateCount || 1) > 1 ? `dupes ${task.duplicateCount}` : ""
    ].filter(Boolean).join(" | ");
    const actionLabel = String(task?.status || "").toLowerCase() === "blocked" ? "Review" : "Done";
    const actionTarget = String(task?.status || "").toLowerCase() === "blocked" ? "review-task" : "done-task";
    return `
      <article class="inbox-item">
        <div class="inbox-item-head">
          <h4 class="inbox-item-title">${escapeHtml(task?.title || "Task")}</h4>
          <span class="risk-pill ${riskClassName(task?.priority || "medium")}">${escapeHtml(task?.priority || "normal")}</span>
        </div>
        <div class="inbox-item-meta">${escapeHtml(meta || "Active task")}</div>
        <div class="inbox-item-body">${escapeHtml(task?.descriptionPreview || "No description.")}</div>
        <div class="inbox-item-actions">
          <button type="button" class="accent" data-inbox-action="use-task" data-id="${escapeHtml(task?.id || "")}">Use in Chat</button>
          <button type="button" class="ok" data-inbox-action="${escapeHtml(actionTarget)}" data-id="${escapeHtml(task?.id || "")}">${escapeHtml(actionLabel)}</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderInboxNotes(rows) {
  if (!inboxNotes) {
    return;
  }
  const notes = Array.isArray(rows) ? rows : [];
  if (notes.length < 1) {
    renderInboxEmpty(inboxNotes, "No priority notes.");
    return;
  }
  inboxNotes.innerHTML = notes.map((note) => {
    const meta = [
      note?.pinned ? "pinned" : "",
      note?.updatedAt ? formatRelativeAge(note.updatedAt) : "",
      Array.isArray(note?.tags) && note.tags.length > 0 ? note.tags.slice(0, 3).join(", ") : ""
    ].filter(Boolean).join(" | ");
    return `
      <article class="inbox-item">
        <div class="inbox-item-head">
          <h4 class="inbox-item-title">${escapeHtml(note?.title || "Note")}</h4>
          <span class="risk-pill ${note?.pinned ? "is-low" : "is-medium"}">${note?.pinned ? "pinned" : "note"}</span>
        </div>
        <div class="inbox-item-meta">${escapeHtml(meta || "Notebook note")}</div>
        <div class="inbox-item-body">${escapeHtml(note?.textPreview || "No preview.")}</div>
        <div class="inbox-item-actions">
          <button type="button" class="accent" data-inbox-action="use-note" data-id="${escapeHtml(note?.id || "")}">Use in Chat</button>
          <button type="button" data-inbox-action="open-admin">Open Admin</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderInbox(inbox) {
  const data = inbox || {};
  const summary = data.summary || {};
  const system = data.system || {};
  state.inbox = data;
  if (inboxSummaryBadge) {
    inboxSummaryBadge.textContent = `Approvals ${summary.pendingApprovals || 0} | Tasks ${summary.activeTasks || 0} | Notes ${summary.visibleNotes || 0}`;
  }
  if (inboxSystemBadge) {
    const pushState = system.pushEnabled
      ? (Number(system.pushSubscriptions || 0) > 0 ? "push ready" : "push needs-sub")
      : "push off";
    inboxSystemBadge.textContent = `Route ${system.selectedChannel || "n/a"} | ${pushState} | ${system.controlArmed ? "control armed" : "control off"}`;
  }
  const hiddenBits = [
    Number(summary.hiddenTaskDuplicates || 0) > 0 ? `task dupes ${summary.hiddenTaskDuplicates}` : "",
    Number(summary.hiddenNoteDuplicates || 0) > 0 ? `note dupes ${summary.hiddenNoteDuplicates}` : "",
    Number(summary.hiddenApprovals || 0) > 0 ? `more approvals ${summary.hiddenApprovals}` : ""
  ].filter(Boolean).join(" | ");
  setInboxStatus(
    `Synced ${formatDateTime(data.generatedAt)}${hiddenBits ? ` | hidden ${hiddenBits}` : ""}`,
    "ok"
  );
  renderInboxApprovals(data.approvals || []);
  renderInboxTasks(data.tasks || []);
  renderInboxNotes(data.notes || []);
}

async function decideInboxApproval(id, decision) {
  const approvalId = String(id || "").trim();
  if (!approvalId) {
    return;
  }
  const endpoint = decision === "approve"
    ? `/api/mobile/approvals/${encodeURIComponent(approvalId)}/approve`
    : `/api/mobile/approvals/${encodeURIComponent(approvalId)}/deny`;
  setInboxStatus(`${decision === "approve" ? "Approving" : "Denying"} ${approvalId}...`);
  await requestJson(endpoint, {
    method: "POST",
    body: decision === "approve"
      ? { execute: false, by: "phone-mode" }
      : { by: "phone-mode" }
  });
  await loadInbox({ silent: true });
}

async function updateInboxTaskStatus(id, status) {
  const taskId = String(id || "").trim();
  const nextStatus = String(status || "").trim().toLowerCase();
  if (!taskId || !nextStatus) {
    return;
  }
  setInboxStatus(`Updating task ${taskId} -> ${nextStatus}...`);
  await requestJson(`/api/mobile/task-ledger/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    body: {
      status: nextStatus,
      actor: "phone-mode",
      source: "phone-mode",
      note: `Status set to ${nextStatus} from phone inbox.`
    }
  });
  await loadInbox({ silent: true });
}

async function loadInbox(options = {}) {
  const payload = await requestJson("/api/mobile/inbox", {
    query: {
      approvalLimit: 6,
      taskLimit: 6,
      noteLimit: 4
    }
  });
  renderInbox(payload?.inbox || {});
  if (!options.silent) {
    logLine("Inbox refreshed.");
  }
  return payload;
}

function setInboxRefresh(enabled = true) {
  if (state.inboxRefreshTimer) {
    window.clearInterval(state.inboxRefreshTimer);
    state.inboxRefreshTimer = null;
  }
  if (!enabled) {
    return;
  }
  state.inboxRefreshTimer = window.setInterval(() => {
    loadInbox({ silent: true }).catch((error) => {
      logLine(`Inbox refresh failed: ${error.message}`);
    });
  }, INBOX_REFRESH_INTERVAL_MS);
}

function loadPhoneLiveRouteMode() {
  let saved = "gemini";
  try {
    saved = String(localStorage.getItem(PHONE_LIVE_ROUTE_MODE_STORAGE_KEY) || "gemini").trim().toLowerCase();
  } catch {}
  if (saved === "deep" || saved === "gemini") {
    state.phoneLiveRouteMode = saved;
  } else {
    state.phoneLiveRouteMode = "gemini";
  }
  if (phoneLiveRouteMode) {
    phoneLiveRouteMode.value = state.phoneLiveRouteMode;
  }
}

function savePhoneLiveRouteMode(mode) {
  const raw = String(mode || "").trim().toLowerCase();
  const next = raw === "deep" || raw === "gemini" ? raw : "normal";
  state.phoneLiveRouteMode = next;
  if (phoneLiveRouteMode) {
    phoneLiveRouteMode.value = next;
  }
  try {
    localStorage.setItem(PHONE_LIVE_ROUTE_MODE_STORAGE_KEY, next);
  } catch {}
}

async function loadPhoneLiveSettings(options = {}) {
  try {
    const payload = await requestJson("/api/mobile/settings");
    const settings = payload?.settings || {};
    const remoteBase = setStoredRemoteBaseUrl(
      settings.connectionResolvedRemoteBaseUrl
      || settings.connectionRemoteBaseUrl
      || ""
    );
    state.phoneLiveVoiceEnabled = Boolean(settings.voiceEnabled ?? state.phoneLiveVoiceEnabled);
    state.phoneLiveVoiceOutputMode = normalizeVoiceOutputMode(
      settings.voiceOutputMode,
      state.phoneLiveVoiceOutputMode
    );
    state.phoneLiveVoiceAutoSpeakReplies = Boolean(
      settings.voiceAutoSpeakReplies ?? state.phoneLiveVoiceAutoSpeakReplies
    );
    state.phoneLiveWakeWord = String(settings.voiceWakeWord || state.phoneLiveWakeWord || "asolaria").trim() || "asolaria";
    if (!options.silent) {
      logLine(
        `Phone Live voice: ${state.phoneLiveVoiceEnabled ? "on" : "off"} | out=${state.phoneLiveVoiceOutputMode} | autoSpeak=${state.phoneLiveVoiceAutoSpeakReplies ? "on" : "off"}`
      );
      if (remoteBase) {
        logLine(`Remote fallback base synced: ${remoteBase}`);
      }
    }
    setPhoneLiveVoiceStatus("Voice settings synced from Asolaria.", "ok");
    return payload;
  } catch (error) {
    if (!options.silent) {
      logLine(`Phone Live settings load failed: ${error.message}`);
    }
    return null;
  }
}

async function loadConnectionRoutingHint(options = {}) {
  try {
    const payload = await requestJson("/api/mobile/session", {
      query: {
        channel: requestedChannel() || undefined
      }
    });
    const remoteBase = setStoredRemoteBaseUrl(
      payload?.connectionRouting?.remoteBaseUrl
      || payload?.connectionRouting?.policy?.remoteBaseUrl
      || ""
    );
    if (remoteBase && !options.silent) {
      logLine(`Remote fallback base available: ${remoteBase}`);
    }
    return payload;
  } catch (error) {
    if (!options.silent) {
      logLine(`Connection routing hint failed: ${error.message}`);
    }
    return null;
  }
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
        if (isNoAuthorizedPhoneDeviceError(error)) {
          setAutoRefresh(false);
          logLine("Auto refresh paused: no authorized phone device. Connect a phone, then tap Refresh.");
          return;
        }
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
  const body = {
    enabled: Boolean(waEnabled?.checked),
    notifyMode: String(waNotifyMode?.value || "critical_or_security")
  };
  const accountSid = String(waAccountSid?.value || "").trim();
  const authToken = String(waAuthToken?.value || "").trim();
  const fromNumber = String(waFromNumber?.value || "").trim();
  const toNumber = String(waToNumber?.value || "").trim();
  const backupAsolariaNumber = String(waBackupAsolariaNumber?.value || "").trim();
  const backupUserNumber = String(waBackupUserNumber?.value || "").trim();
  if (accountSid) {
    body.accountSid = accountSid;
  }
  if (authToken) {
    body.authToken = authToken;
  }
  if (fromNumber) {
    body.fromNumber = fromNumber;
  }
  if (toNumber) {
    body.toNumber = toNumber;
  }
  if (backupAsolariaNumber) {
    body.backupAsolariaNumber = backupAsolariaNumber;
  }
  if (backupUserNumber) {
    body.backupUserNumber = backupUserNumber;
  }
  const payload = await requestJson("/api/guardian/whatsapp", {
    method: "POST",
    body
  });
  state.whatsapp = {
    ...(state.whatsapp || {}),
    ...(payload.whatsapp || {})
  };
  renderWhatsAppStatus(state.whatsapp || {});
  applyWhatsAppFieldHints(state.whatsapp || {});
  if (waAuthToken) {
    waAuthToken.value = "";
  }
  if (waBackupAsolariaNumber) {
    waBackupAsolariaNumber.value = "";
  }
  if (waBackupUserNumber) {
    waBackupUserNumber.value = "";
  }
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
    latestVoice.src = buildApiUrl("/api/phone/mirror/voice/latest", { v: Date.now() });
  }
  logLine(`WhatsApp sent (${String(payload?.whatsapp?.method || "unknown")}).`);
  return payload;
}

async function sendWhatsAppBackup(targetPreset) {
  const message = String(waMessage?.value || "").trim();
  if (!message) {
    throw new Error("Message is required.");
  }
  const includeVoice = Boolean(waIncludeVoice?.checked);
  const voiceText = String(waVoiceText?.value || "").trim();
  const normalizedTarget = String(targetPreset || "").trim().toLowerCase();
  if (normalizedTarget !== "backup_asolaria" && normalizedTarget !== "backup_user") {
    throw new Error("Invalid backup target.");
  }
  const payload = await requestJson("/api/phone/mirror/whatsapp/send", {
    method: "POST",
    body: {
      message,
      targetPreset: normalizedTarget,
      voice: includeVoice,
      voiceText: voiceText || undefined
    }
  });
  if (payload?.voice?.ok && latestVoice) {
    latestVoice.src = buildApiUrl("/api/phone/mirror/voice/latest", { v: Date.now() });
  }
  const label = normalizedTarget === "backup_asolaria" ? "Asolaria" : "User";
  logLine(`WhatsApp backup sent to ${label} number (${String(payload?.whatsapp?.method || "unknown")}).`);
  return payload;
}

async function playLatestVoice() {
  if (!latestVoice) {
    return;
  }
  latestVoice.src = buildApiUrl("/api/phone/mirror/voice/latest", { v: Date.now() });
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

if (phoneLiveRouteMode) {
  phoneLiveRouteMode.addEventListener("change", () => {
    savePhoneLiveRouteMode(phoneLiveRouteMode.value);
    const routeLabel = state.phoneLiveRouteMode === "deep"
      ? "Deep Agent Style"
      : (state.phoneLiveRouteMode === "gemini" ? "Gemini Edge + Asolaria" : "RouteLLM");
    logLine(`Phone Live route set to ${routeLabel}.`);
  });
}

if (refreshInboxBtn) {
  refreshInboxBtn.addEventListener("click", async () => {
    try {
      await loadInbox();
    } catch (error) {
      setInboxStatus(`Inbox refresh failed: ${error.message}`, "warn");
      logLine(`Inbox refresh failed: ${error.message}`);
    }
  });
}

if (openInboxApprovalsBtn) {
  openInboxApprovalsBtn.addEventListener("click", () => {
    navigatePhonePage("/mobile-approvals.html");
  });
}

if (openInboxAdminBtn) {
  openInboxAdminBtn.addEventListener("click", () => {
    navigatePhonePage("/mobile-console.html");
  });
}

inboxApprovals?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-inbox-action]");
  if (!button) {
    return;
  }
  const action = String(button.getAttribute("data-inbox-action") || "").trim();
  const id = String(button.getAttribute("data-id") || "").trim();
  try {
    if (action === "approve") {
      await decideInboxApproval(id, "approve");
      return;
    }
    if (action === "deny") {
      await decideInboxApproval(id, "deny");
      return;
    }
    if (action === "open-approvals") {
      navigatePhonePage("/mobile-approvals.html");
    }
  } catch (error) {
    setInboxStatus(`Approval action failed: ${error.message}`, "warn");
    logLine(`Inbox approval action failed: ${error.message}`);
  }
});

inboxTasks?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-inbox-action]");
  if (!button) {
    return;
  }
  const action = String(button.getAttribute("data-inbox-action") || "").trim();
  const id = String(button.getAttribute("data-id") || "").trim();
  try {
    if (action === "use-task") {
      const task = findInboxTask(id);
      if (!task) {
        return;
      }
      const message = [
        `Task ${task.id}: ${task.title}`,
        `Status: ${task.status} | Priority: ${task.priority} | Progress: ${task.progress}%`,
        task.descriptionPreview || ""
      ].filter(Boolean).join("\n");
      prefillPhoneLiveChat(message, "Task context copied into chat.");
      return;
    }
    if (action === "done-task") {
      await updateInboxTaskStatus(id, "done");
      return;
    }
    if (action === "review-task") {
      await updateInboxTaskStatus(id, "review");
    }
  } catch (error) {
    setInboxStatus(`Task action failed: ${error.message}`, "warn");
    logLine(`Inbox task action failed: ${error.message}`);
  }
});

inboxNotes?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-inbox-action]");
  if (!button) {
    return;
  }
  const action = String(button.getAttribute("data-inbox-action") || "").trim();
  const id = String(button.getAttribute("data-id") || "").trim();
  if (action === "open-admin") {
    navigatePhonePage("/mobile-console.html");
    return;
  }
  if (action === "use-note") {
    const note = findInboxNote(id);
    if (!note) {
      return;
    }
    const message = [
      `Notebook note: ${note.title}`,
      Array.isArray(note.tags) && note.tags.length > 0 ? `Tags: ${note.tags.join(", ")}` : "",
      note.textPreview || ""
    ].filter(Boolean).join("\n");
    prefillPhoneLiveChat(message, "Notebook context copied into chat.");
  }
});

if (uiLevelSelect) {
  uiLevelSelect.addEventListener("change", () => {
    applyUiLevel(uiLevelSelect.value);
    if (state.uiLevel === "talk" && state.launcherIntent !== "voice") {
      state.launcherIntent = "text";
    } else if (state.uiLevel === "control" && !["video", "advanced"].includes(state.launcherIntent)) {
      state.launcherIntent = "advanced";
    } else if (state.uiLevel === "admin") {
      state.launcherIntent = "super_advanced";
    }
    syncPhoneLauncherButtons();
    logLine(`UI level set to ${state.uiLevel}.`);
  });
}

if (phoneLiveOpenControlsBtn) {
  phoneLiveOpenControlsBtn.addEventListener("click", () => {
    state.launcherIntent = "video";
    applyUiLevel("control");
    setPhoneLauncherStatus("Video mode open. Mirror controls are visible.", "ok");
    openMirrorControlsView();
  });
}

if (phoneLiveCloseControlsBtn) {
  phoneLiveCloseControlsBtn.addEventListener("click", () => {
    state.launcherIntent = "text";
    applyUiLevel("talk");
    stopPhoneLiveVoice();
    setPhoneLauncherStatus("Controls closed. Back to talk-only mode.", "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
    focusPhoneLiveChatInput();
  });
}

if (phoneLaunchTextBtn) {
  phoneLaunchTextBtn.addEventListener("click", () => {
    state.launcherIntent = "text";
    applyUiLevel("talk");
    stopPhoneLiveVoice();
    setPhoneLauncherStatus("Text mode ready. Type and send.", "ok");
    focusPhoneLiveChatInput();
  });
}

if (phoneLaunchVoiceBtn) {
  phoneLaunchVoiceBtn.addEventListener("click", () => {
    state.launcherIntent = "voice";
    applyUiLevel("talk");
    setPhoneLauncherStatus("Voice mode active. Speak naturally and pause to send.", "ok");
    startPhoneLiveVoice({ oneShot: true });
  });
}

if (phoneLaunchVideoBtn) {
  phoneLaunchVideoBtn.addEventListener("click", async () => {
    state.launcherIntent = "video";
    applyUiLevel("control");
    setPhoneLauncherStatus("Video mode open. Live mirror ready.", "ok");
    openMirrorControlsView();
    try {
      await captureFrame({ silent: true });
    } catch (error) {
      setPhoneLauncherStatus(`Video mode warning: ${error.message}`, "warn");
      logLine(`Video launcher capture failed: ${error.message}`);
    }
  });
}

if (phoneLaunchAdvancedBtn) {
  phoneLaunchAdvancedBtn.addEventListener("click", () => {
    state.launcherIntent = "advanced";
    applyUiLevel("control");
    setPhoneLauncherStatus("Advanced mode enabled. Mirror, WhatsApp, and controls are available.", "ok");
    openMirrorControlsView();
  });
}

if (phoneLaunchSuperAdvancedBtn) {
  phoneLaunchSuperAdvancedBtn.addEventListener("click", () => {
    state.launcherIntent = "super_advanced";
    applyUiLevel("admin");
    setPhoneLauncherStatus("Super Advanced mode enabled. Full admin tools are visible.", "warn");
    openMirrorControlsView();
  });
}

if (phoneLiveSendBtn) {
  phoneLiveSendBtn.addEventListener("click", async () => {
    try {
      await sendPhoneLiveChatMessage();
    } catch (error) {
      logLine(`Phone Live chat failed: ${error.message}`);
    }
  });
}

if (phoneLiveNotebookAskBtn) {
  phoneLiveNotebookAskBtn.addEventListener("click", async () => {
    try {
      await askNotebooklmFromPhoneInput();
    } catch (error) {
      logLine(`Phone NotebookLM ask failed: ${error.message}`);
    }
  });
}

if (phoneLiveNotebookStatusBtn) {
  phoneLiveNotebookStatusBtn.addEventListener("click", async () => {
    try {
      await requestPhoneNotebooklmStatus();
    } catch (error) {
      logLine(`Phone NotebookLM status failed: ${error.message}`);
    }
  });
}

if (phoneLiveChatInput) {
  phoneLiveChatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      phoneLiveSendBtn?.click();
    }
  });
}

if (phoneLiveAutoSendToggle) {
  phoneLiveAutoSendToggle.addEventListener("change", () => {
    const enabled = Boolean(phoneLiveAutoSendToggle.checked);
    savePhoneLiveAutoSendPreference(enabled);
    const message = enabled
      ? "Hands-free voice is on. Speech sends automatically after transcription."
      : "Dictation mode is on. Speech stays in the text box until you press Send.";
    setPhoneLiveVoiceStatus(message, "ok");
    logLine(message);
  });
}

if (phoneLiveWakeLoopToggle) {
  phoneLiveWakeLoopToggle.addEventListener("change", () => {
    const enabled = Boolean(phoneLiveWakeLoopToggle.checked);
    setPhoneLiveWakeLoopEnabled(enabled);
    const message = enabled
      ? `Wake listening armed for "Hello ${state.phoneLiveWakeWord || "Asolaria"}" while this screen stays open.`
      : "Wake listening disabled.";
    setPhoneLiveVoiceStatus(message, "ok");
    logLine(message);
  });
}

if (phoneLiveSpeakBtn) {
  phoneLiveSpeakBtn.addEventListener("click", () => {
    state.launcherIntent = "voice";
    syncPhoneLauncherButtons();
    startPhoneLiveVoice({ oneShot: true });
  });
}

if (phoneLivePushBtn) {
  phoneLivePushBtn.addEventListener("click", () => {
    state.launcherIntent = "voice";
    syncPhoneLauncherButtons();
    startPhoneLiveVoice({ oneShot: true });
  });
}

if (phoneLiveStopBtn) {
  phoneLiveStopBtn.addEventListener("click", () => {
    stopPhoneLiveVoice();
    if (state.uiLevel === "talk") {
      state.launcherIntent = "text";
      syncPhoneLauncherButtons();
    }
  });
}

if (phoneLiveAvatarStage) {
  const runAvatarVoiceToggle = () => {
    if (state.phoneLiveListening || state.phoneLiveRequested) {
      stopPhoneLiveVoice();
      setPhoneLauncherStatus("Avatar voice stopped.", "ok");
      return;
    }
    state.launcherIntent = "voice";
    syncPhoneLauncherButtons();
    setPhoneLauncherStatus("Avatar voice active. Speak naturally and pause to send.", "ok");
    startPhoneLiveVoice({ oneShot: true });
  };

  phoneLiveAvatarStage.addEventListener("click", runAvatarVoiceToggle);
  phoneLiveAvatarStage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      runAvatarVoiceToggle();
    }
  });
}

if (phoneLiveVoiceTestBtn) {
  phoneLiveVoiceTestBtn.addEventListener("click", async () => {
    const sample = `Phone live voice test. Wake word ${state.phoneLiveWakeWord || "asolaria"} ready.`;
    try {
      setPhoneLiveAvatarState("thinking", "Running voice test...");
      const spoken = await speakPhoneLiveReply(sample, {
        force: true,
        volumePercent: state.phoneLiveVoiceVolume
      });
      if (spoken) {
        setPhoneLiveVoiceStatus(`Voice test passed (${state.phoneLiveVoiceOutputMode}).`, "ok");
        setPhoneLiveAvatarState("speaking", "Voice test complete.");
        window.setTimeout(() => setPhoneLiveAvatarState("idle", "Avatar idle."), 900);
      } else {
        setPhoneLiveVoiceStatus(`Voice test failed (${state.phoneLiveVoiceOutputMode}).`, "error");
        setPhoneLiveAvatarState("error", "Voice test failed.");
      }
    } catch (error) {
      setPhoneLiveVoiceStatus(`Voice test error: ${error.message}`, "error");
      setPhoneLiveAvatarState("error", "Voice test error.");
    }
  });
}

if (phoneRealtimeSourceSelect) {
  phoneRealtimeSourceSelect.addEventListener("change", () => {
    const selected = normalizePhoneRealtimeSource(
      phoneRealtimeSourceSelect.value,
      state.phoneRealtime.captureSource
    );
    state.phoneRealtime.captureSource = selected;
    syncPhoneRealtimeSourceControl();
    refreshPhoneRealtimeControls();
    if (!state.phoneRealtime.active) {
      setPhoneRealtimeStatus(buildPhoneRealtimeCapturePrompt(selected), "ok");
    }
  });
}

if (phoneRealtimeStartBtn) {
  phoneRealtimeStartBtn.addEventListener("click", () => {
    startPhoneRealtime({
      captureSource: state.phoneRealtime.captureSource
    }).catch((error) => {
      setPhoneRealtimeStatus(String(error?.message || "Failed to start captions."), "error");
    });
  });
}

if (phoneRealtimeStopBtn) {
  phoneRealtimeStopBtn.addEventListener("click", () => {
    stopPhoneRealtime({
      reason: "Captions stopped.",
      level: "ok"
    });
  });
}

if (phoneRealtimeClearBtn) {
  phoneRealtimeClearBtn.addEventListener("click", () => {
    clearPhoneRealtimeTranscript();
    if (!state.phoneRealtime.active) {
      setPhoneRealtimeStatus("Transcript cleared.", "ok");
    }
  });
}

if (phoneRealtimeCopyBtn) {
  phoneRealtimeCopyBtn.addEventListener("click", async () => {
    try {
      await copyPhoneRealtimeTranscript();
    } catch (error) {
      setPhoneRealtimeStatus(`Copy failed: ${String(error?.message || "clipboard unavailable")}`, "error");
    }
  });
}

if (phoneRealtimeSendBtn) {
  phoneRealtimeSendBtn.addEventListener("click", async () => {
    try {
      await sendPhoneRealtimeTranscriptToAsolaria();
    } catch (error) {
      setPhoneRealtimeStatus(`Meeting assist send failed: ${String(error?.message || "unknown error")}`, "error");
    }
  });
}

if (phoneLiveVolume) {
  phoneLiveVolume.addEventListener("input", () => {
    savePhoneLiveVolume(phoneLiveVolume.value);
  });
}

if (geminiRelaySendBtn) {
  geminiRelaySendBtn.addEventListener("click", async () => {
    try {
      await sendGeminiRelayTranscript();
      logLine("Gemini relay transcript sent to Asolaria.");
    } catch (error) {
      logLine(`Gemini relay failed: ${error.message}`);
    }
  });
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
      const payload = await requestJson("/api/phone/mirror/whatsapp/open", {
        method: "POST",
        body: {
          deviceId: state.selectedDeviceId || undefined
        }
      });
      const result = payload?.result || {};
      if (result?.foreground?.component) {
        logLine(`Foreground: ${result.foreground.component}`);
      }
      if (result?.authenticationRequired) {
        logLine("WhatsApp launch sent. Manual biometric approval is required on the phone.");
      } else {
        logLine("WhatsApp app launch sent to phone.");
      }
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

if (waBackupToAsolariaBtn) {
  waBackupToAsolariaBtn.addEventListener("click", async () => {
    try {
      await sendWhatsAppBackup("backup_asolaria");
    } catch (error) {
      const reason = error?.data?.whatsapp?.reason || error.message;
      logLine(`WA backup (Asolaria) failed: ${reason}`);
    }
  });
}

if (waBackupToUserBtn) {
  waBackupToUserBtn.addEventListener("click", async () => {
    try {
      await sendWhatsAppBackup("backup_user");
    } catch (error) {
      const reason = error?.data?.whatsapp?.reason || error.message;
      logLine(`WA backup (User) failed: ${reason}`);
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
  await registerPhoneServiceWorker();
  logLine("Asolaria phone mode starting.");
  if (authToken()) {
    logLine("Mobile token loaded.");
  } else {
    logLine("No mobile token found; remote phone-mode API calls may be denied.");
  }
  loadUiLevel();
  loadPhoneLiveRouteMode();
  loadPhoneLiveAutoSendPreference();
  loadPhoneLiveWakeLoopPreference();
  loadPhoneLiveVolume();
  syncPhoneRealtimeSourceControl();
  renderPhoneRealtimeTranscript();
  refreshPhoneRealtimeControls();
  if (state.phoneRealtime.supported) {
    setPhoneRealtimeStatus(
      `Pick a capture source. ${buildPhoneRealtimeCapturePrompt(state.phoneRealtime.captureSource)}`,
      "ok"
    );
  } else {
    setPhoneRealtimeStatus("Realtime captions are not supported in this browser.", "error");
  }
  setPhoneLauncherStatus();
  syncPhoneLauncherButtons();
  updatePhoneLiveVoiceButtons();
  setPhoneLiveAvatarState("idle", "Avatar idle.");
  setPhoneLiveVoiceStatus("Voice standby. Press Push-to-Talk or type.");
  if (phoneLiveChatMessages && phoneLiveChatMessages.children.length < 1) {
    appendPhoneLiveTurn(
      "assistant",
      "Asolaria phone live is connected. Talk or type when ready."
    );
  }
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
    await loadWhatsAppConfig({ silent: true });
  } catch (error) {
    logLine(`WhatsApp policy load failed: ${error.message}`);
  }
  await loadConnectionRoutingHint({ silent: true });
  await loadPhoneLiveSettings({ silent: true });
  const pendingPhoneLiveRetry = phoneLivePendingRetryReplayStarted ? null : takePendingPhoneLiveRetry();
  if (pendingPhoneLiveRetry) {
    phoneLivePendingRetryReplayStarted = true;
    setPhoneLiveVoiceStatus("Retrying the last voice request on the current route...", "ok");
    setPhoneLiveAvatarState("thinking", "Retrying last voice request.");
    logLine("Replaying the last pending voice request after route change.");
    sendPhoneLiveChatMessage(pendingPhoneLiveRetry.text, {
      fromVoice: true,
      displayText: pendingPhoneLiveRetry.displayText || pendingPhoneLiveRetry.text
    }).catch((error) => {
      logLine(`Pending voice replay failed: ${error.message}`);
    });
  }
  try {
  await loadInbox({ silent: true });
  } catch (error) {
    setInboxStatus(`Inbox unavailable: ${error.message}`, "warn");
    logLine(`Inbox load failed: ${error.message}`);
  }
  await runPhoneAvatarGreeting();
  if (state.phoneLiveWakeLoopEnabled) {
    schedulePhoneWakeLoop("initialize", 700);
  }
  let shouldEnableAutoRefresh = true;
  try {
    await captureFrame({ silent: true });
  } catch (error) {
    logLine(`Initial capture failed: ${error.message}`);
    if (isNoAuthorizedPhoneDeviceError(error)) {
      shouldEnableAutoRefresh = false;
      logLine("Auto refresh remains off until a phone device is authorized.");
    }
  }
  setInboxRefresh(true);
  setAutoRefresh(shouldEnableAutoRefresh);
}

window.onAsolariaAndroidSpeechEvent = handleAndroidSpeechEvent;
window.onAsolariaAndroidNativeMicEvent = handleAndroidNativeMicEvent;

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    schedulePhoneWakeLoop("visibility_visible", 500);
    return;
  }
  clearPhoneLiveWakeRestartTimer();
  if (state.phoneLiveWakeLoopEnabled && state.phoneLiveWakeListening) {
    stopPhoneLiveVoice({ preserveStatus: true, skipWakeRearm: true });
  }
});

window.addEventListener("beforeunload", () => {
  setAutoRefresh(false);
  setInboxRefresh(false);
  clearPhoneLiveWakeRestartTimer();
  stopPhoneLiveVoice();
  if (state.phoneRealtime.active || state.phoneRealtime.recorder) {
    stopPhoneRealtime({
      reason: "Capture ended."
    });
  }
});

initialize().catch((error) => {
  logLine(`Startup failed: ${error.message}`);
});

