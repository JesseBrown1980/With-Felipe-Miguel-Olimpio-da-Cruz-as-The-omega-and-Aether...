const healthBadge = document.getElementById("healthBadge");
const messages = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatRailNav = document.getElementById("chatRailNav");
const chatRailAppsSection = document.getElementById("chatRailAppsSection");
const chatRailTasksSection = document.getElementById("chatRailTasksSection");
const chatRailChatsSection = document.getElementById("chatRailChatsSection");
const chatThreadList = document.getElementById("chatThreadList");
const chatRecentlyActiveThreadList = document.getElementById("chatRecentlyActiveThreadList");
const chatPinnedThreadList = document.getElementById("chatPinnedThreadList");
const chatFocusTurnoverChip = document.getElementById("chatFocusTurnoverChip");
const chatExecutionChip = document.getElementById("chatExecutionChip");
const chatSafetyMetricsChip = document.getElementById("chatSafetyMetricsChip");
const chatFocusSuggestionRow = document.getElementById("chatFocusSuggestionRow");
const chatFocusSuggestionText = document.getElementById("chatFocusSuggestionText");
const chatFocusSuggestionBtn = document.getElementById("chatFocusSuggestionBtn");
const chatSafetyMetricsResetBtn = document.getElementById("chatSafetyMetricsResetBtn");
const chatClearFocusBtn = document.getElementById("chatClearFocusBtn");
const chatThreadSearch = document.getElementById("chatThreadSearch");
const chatTaskSearch = document.getElementById("chatTaskSearch");
const chatTaskCardList = document.getElementById("chatTaskCardList");
const chatNewThreadBtn = document.getElementById("chatNewThreadBtn");
const chatRenameThreadBtn = document.getElementById("chatRenameThreadBtn");
const chatCreateAbacusPackBtn = document.getElementById("chatCreateAbacusPackBtn");
const chatSeedAbacusPromptBtn = document.getElementById("chatSeedAbacusPromptBtn");
const chatAbacusPackStatus = document.getElementById("chatAbacusPackStatus");
const chatSeedFriendBootstrapBtn = document.getElementById("chatSeedFriendBootstrapBtn");
const chatCopyFriendBootstrapBtn = document.getElementById("chatCopyFriendBootstrapBtn");
const chatFriendBootstrapStatus = document.getElementById("chatFriendBootstrapStatus");
const chatActiveThreadHint = document.getElementById("chatActiveThreadHint");
const chatRouteModeSelect = document.getElementById("chatRouteMode");
const chatEscalateBtn = document.getElementById("chatEscalateBtn");
const nextActionStrip = document.getElementById("nextActionStrip");
const nextActionSubtitle = document.getElementById("nextActionSubtitle");
const nextActionReason = document.getElementById("nextActionReason");
const nextActionPrimaryBtn = document.getElementById("nextActionPrimaryBtn");
const nextActionSecondaryBtn = document.getElementById("nextActionSecondaryBtn");
const closeLoopPrompt = document.getElementById("closeLoopPrompt");
const closeLoopText = document.getElementById("closeLoopText");
const closeLoopMarkDoneBtn = document.getElementById("closeLoopMarkDoneBtn");
const closeLoopResumeBtn = document.getElementById("closeLoopResumeBtn");
const closeLoopToast = document.getElementById("closeLoopToast");
const closeLoopToastText = document.getElementById("closeLoopToastText");
const closeLoopToastReopenBtn = document.getElementById("closeLoopToastReopenBtn");
const chatImages = document.getElementById("chatImages");
const chatImageStatus = document.getElementById("chatImageStatus");
const chatFiles = document.getElementById("chatFiles");
const chatFileStatus = document.getElementById("chatFileStatus");
const eventLog = document.getElementById("eventLog");
const shotOutput = document.getElementById("shotOutput");
const chatChannelForm = document.getElementById("chatChannelForm");
const chatChannelUrlInput = document.getElementById("chatChannelUrl");
const chatChannelInputSelectorInput = document.getElementById("chatChannelInputSelector");
const chatChannelMessageInput = document.getElementById("chatChannelMessage");
const chatChannelSendSelectorInput = document.getElementById("chatChannelSendSelector");
const chatChannelResponseSelectorInput = document.getElementById("chatChannelResponseSelector");
const chatChannelSendKeyInput = document.getElementById("chatChannelSendKey");
const chatChannelExtractLinksToggle = document.getElementById("chatChannelExtractLinks");
const chatChannelOutput = document.getElementById("chatChannelOutput");
const stealthToggle = document.getElementById("stealthToggle");
const stealthLabel = document.getElementById("stealthLabel");
const stealthHint = document.getElementById("stealthHint");
const approvalModeSelect = document.getElementById("approvalMode");
const costModeSelect = document.getElementById("costMode");
const codexWebSearchSelect = document.getElementById("codexWebSearch");
const openclawModeSelect = document.getElementById("openclawMode");
const uiExperienceModeSelect = document.getElementById("uiExperienceMode");
const voiceOutputModeSelect = document.getElementById("voiceOutputMode");
const voiceAutoSpeakSelect = document.getElementById("voiceAutoSpeak");
const natural20DailyBtn = document.getElementById("natural20DailyBtn");
const memoryStats = document.getElementById("memoryStats");
const memoryPreview = document.getElementById("memoryPreview");
const memoryWindowTurnsInput = document.getElementById("memoryWindowTurns");
const saveMemoryWindowBtn = document.getElementById("saveMemoryWindowBtn");
const refreshMemoryBtn = document.getElementById("refreshMemoryBtn");
const clearMemoryBtn = document.getElementById("clearMemoryBtn");
const taskLedgerStats = document.getElementById("taskLedgerStats");
const taskLedgerTitle = document.getElementById("taskLedgerTitle");
const taskLedgerDescription = document.getElementById("taskLedgerDescription");
const taskLedgerCreatePriority = document.getElementById("taskLedgerCreatePriority");
const taskLedgerStatusFilter = document.getElementById("taskLedgerStatusFilter");
const taskLedgerPriorityFilter = document.getElementById("taskLedgerPriorityFilter");
const taskLedgerQuery = document.getElementById("taskLedgerQuery");
const taskLedgerIncludeArchived = document.getElementById("taskLedgerIncludeArchived");
const taskLedgerRefreshBtn = document.getElementById("taskLedgerRefreshBtn");
const taskLedgerAddBtn = document.getElementById("taskLedgerAddBtn");
const taskLedgerList = document.getElementById("taskLedgerList");
const taskLedgerEvents = document.getElementById("taskLedgerEvents");
const skillsRefreshBtn = document.getElementById("skillsRefreshBtn");
const skillsReloadBtn = document.getElementById("skillsReloadBtn");
const skillsRunForm = document.getElementById("skillsRunForm");
const skillsSelect = document.getElementById("skillsSelect");
const skillsInput = document.getElementById("skillsInput");
const skillsOutput = document.getElementById("skillsOutput");
const openclawCard = document.getElementById("openclawCard");
const openclawOutput = document.getElementById("openclawOutput");
const openclawCronRunForm = document.getElementById("openclawCronRunForm");
const openclawCronName = document.getElementById("openclawCronName");
const antigravityStatusBtn = document.getElementById("antigravityStatusBtn");
const cursorStatusBtn = document.getElementById("cursorStatusBtn");
const anthropicStatusBtn = document.getElementById("anthropicStatusBtn");
const geminiCliStatusBtn = document.getElementById("geminiCliStatusBtn");
const externalSaveDefaultBtn = document.getElementById("externalSaveDefaultBtn");
const externalClearDefaultBtn = document.getElementById("externalClearDefaultBtn");
const externalClearObservedBtn = document.getElementById("externalClearObservedBtn");
const externalClearObservedAllBtn = document.getElementById("externalClearObservedAllBtn");
const externalModelStatusBtn = document.getElementById("externalModelStatusBtn");
const externalObservedMaxAgeDaysInput = document.getElementById("externalObservedMaxAgeDays");
const externalPruneObservedBtn = document.getElementById("externalPruneObservedBtn");
const externalObservedAutoPruneEnabledToggle = document.getElementById("externalObservedAutoPruneEnabled");
const externalObservedAutoPruneDaysInput = document.getElementById("externalObservedAutoPruneDays");
const externalObservedAutoPruneHourInput = document.getElementById("externalObservedAutoPruneHour");
const externalSaveObservedPruneSettingsBtn = document.getElementById("externalSaveObservedPruneSettingsBtn");
const externalObservedPruneStatus = document.getElementById("externalObservedPruneStatus");
const externalRunForm = document.getElementById("externalRunForm");
const externalProviderSelect = document.getElementById("externalProviderSelect");
const externalModelInput = document.getElementById("externalModelInput");
const externalModelAliasList = document.getElementById("externalModelAliasList");
const externalModelHint = document.getElementById("externalModelHint");
const externalObservedHint = document.getElementById("externalObservedHint");
const externalPrompt = document.getElementById("externalPrompt");
const externalMcpTokenReductionProfileSelect = document.getElementById("externalMcpTokenReductionProfile");
const externalMcpToolSchemaModeSelect = document.getElementById("externalMcpToolSchemaMode");
const externalMcpPromptTokenLimitInput = document.getElementById("externalMcpPromptTokenLimit");
const externalMcpContextKeyInput = document.getElementById("externalMcpContextKey");
const externalMcpSkillHintsInput = document.getElementById("externalMcpSkillHints");
const externalMcpWebHintsInput = document.getElementById("externalMcpWebHints");
const externalOutput = document.getElementById("externalOutput");
const allowExternalPostingToggle = document.getElementById("allowExternalPosting");
const companyMissionBtn = document.getElementById("companyMissionBtn");
const companyDraftBtn = document.getElementById("companyDraftBtn");
const companyDecideBtn = document.getElementById("companyDecideBtn");
const companyHint = document.getElementById("companyHint");
const companyCreateAccountBtn = document.getElementById("companyCreateAccountBtn");
const companyShowAccountBtn = document.getElementById("companyShowAccountBtn");
const companyRevealAccountBtn = document.getElementById("companyRevealAccountBtn");
const companyMarkRegisteredBtn = document.getElementById("companyMarkRegisteredBtn");
const companyOpenSiteBtn = document.getElementById("companyOpenSiteBtn");
const companyAccountOutput = document.getElementById("companyAccountOutput");
const guardianModeSelect = document.getElementById("guardianMode");
const saveGuardianModeBtn = document.getElementById("saveGuardianModeBtn");
const guardianRiskThresholdSelect = document.getElementById("guardianRiskThreshold");
const saveGuardianThresholdBtn = document.getElementById("saveGuardianThresholdBtn");
const guardianAlertsEnabledToggle = document.getElementById("guardianAlertsEnabled");
const guardianAutoBlockCriticalToggle = document.getElementById("guardianAutoBlockCritical");
const guardianStatusBtn = document.getElementById("guardianStatusBtn");
const guardianBootstrapContactsBtn = document.getElementById("guardianBootstrapContactsBtn");
const guardianTestAlertBtn = document.getElementById("guardianTestAlertBtn");
const guardianOutput = document.getElementById("guardianOutput");
const gatewayAuditTypeSelect = document.getElementById("gatewayAuditType");
const gatewayAuditLimitInput = document.getElementById("gatewayAuditLimit");
const gatewayAuditRefreshBtn = document.getElementById("gatewayAuditRefreshBtn");
const gatewayAuditVerifyBtn = document.getElementById("gatewayAuditVerifyBtn");
const gatewayReadinessDrillBtn = document.getElementById("gatewayReadinessDrillBtn");
const gatewayHeartbeatRunBtn = document.getElementById("gatewayHeartbeatRunBtn");
const gatewayStartSandboxBtn = document.getElementById("gatewayStartSandboxBtn");
const gatewayAuthorityStatus = document.getElementById("gatewayAuthorityStatus");
const gatewayAuditStatus = document.getElementById("gatewayAuditStatus");
const gatewayReadinessDrillOutput = document.getElementById("gatewayReadinessDrillOutput");
const gatewayReadinessHints = document.getElementById("gatewayReadinessHints");
const gatewayAuditEvents = document.getElementById("gatewayAuditEvents");
const railFilter = document.getElementById("railFilter");
const projectNav = document.getElementById("projectNav");
const projectFolderTree = document.getElementById("projectFolderTree");
const projectFolderSearch = document.getElementById("projectFolderSearch");
const projectRefreshBtn = document.getElementById("projectRefreshBtn");
const projectCreateBtn = document.getElementById("projectCreateBtn");
const projectUpdateBtn = document.getElementById("projectUpdateBtn");
const projectDeleteBtn = document.getElementById("projectDeleteBtn");
const projectAdminOutput = document.getElementById("projectAdminOutput");
const openPhoneModeBtn = document.getElementById("openPhoneModeBtn");
const phoneRuntimeAlertBadge = document.getElementById("phoneRuntimeAlertBadge");
const colonyDashboardCard = document.getElementById("colonyDashboardCard");
const colonyGrid = document.getElementById("colonyGrid");
const colonySummary = document.getElementById("colonySummary");
const colonyUpdatedAt = document.getElementById("colonyUpdatedAt");
const adminTerminalCockpitCard = document.getElementById("adminTerminalCockpitCard");
const adminTerminalCockpitStatus = document.getElementById("adminTerminalCockpitStatus");
const adminTerminalCockpitSummary = document.getElementById("adminTerminalCockpitSummary");
const adminTerminalCockpitUpdatedAt = document.getElementById("adminTerminalCockpitUpdatedAt");
const adminTerminalCockpitEnsureBtn = document.getElementById("adminTerminalCockpitEnsureBtn");
const adminTerminalCockpitRefreshBtn = document.getElementById("adminTerminalCockpitRefreshBtn");
const adminTerminalCockpitRebriefBtn = document.getElementById("adminTerminalCockpitRebriefBtn");
const adminTerminalCockpitAutoEnsure = document.getElementById("adminTerminalCockpitAutoEnsure");
const adminTerminalCockpitStack = document.getElementById("adminTerminalCockpitStack");
const phoneAgentRuntimeCard = document.getElementById("phoneAgentRuntimeCard");
const phoneAgentGrid = document.getElementById("phoneAgentGrid");
const phoneAgentSummary = document.getElementById("phoneAgentSummary");
const phoneAgentUpdatedAt = document.getElementById("phoneAgentUpdatedAt");
const superCoderCard = document.getElementById("superCoderCard");
const superCoderStatus = document.getElementById("superCoderStatus");
const superCoderSummary = document.getElementById("superCoderSummary");
const superCoderGrid = document.getElementById("superCoderGrid");
const superCoderNotes = document.getElementById("superCoderNotes");
const superCoderUpdatedAt = document.getElementById("superCoderUpdatedAt");
const superCoderSetQualityBtn = document.getElementById("superCoderSetQualityBtn");
const superCoderOpenSwarmDeskBtn = document.getElementById("superCoderOpenSwarmDeskBtn");
const superCoderOpenGraphBtn = document.getElementById("superCoderOpenGraphBtn");
const superCoderRefreshBtn = document.getElementById("superCoderRefreshBtn");
const quickShell = document.getElementById("quickShell");
const quickAvatarStage = document.getElementById("quickAvatarStage");
const quickAvatarStatus = document.getElementById("quickAvatarStatus");
const quickColonyStatus = document.getElementById("quickColonyStatus");
const quickPhoneStatus = document.getElementById("quickPhoneStatus");
const quickAvatarModePill = document.getElementById("quickAvatarModePill");
const quickVoiceToggleBtn = document.getElementById("quickVoiceToggleBtn");
const quickVoicePushBtn = document.getElementById("quickVoicePushBtn");
const quickVoiceTestBtn = document.getElementById("quickVoiceTestBtn");
const quickOpenAvatarStageBtn = document.getElementById("quickOpenAvatarStageBtn");
const quickOpenPhoneBtn = document.getElementById("quickOpenPhoneBtn");
const quickOpenAdvancedBtn = document.getElementById("quickOpenAdvancedBtn");
const dashboardLauncherTiles = Array.from(document.querySelectorAll("[data-dashboard-action]"));
const quickRuntimeControl = document.getElementById("quickRuntimeControl");
const quickRealtimeCard = document.getElementById("quickRealtimeCard");
const brainConsolePanel = document.getElementById("brainConsolePanel");
const runtimeStartAsolariaBtn = document.getElementById("runtimeStartAsolariaBtn");
const runtimeStartPhoneBtn = document.getElementById("runtimeStartPhoneBtn");
const runtimeStartControlPlaneBtn = document.getElementById("runtimeStartControlPlaneBtn");
const runtimeStartControlPlaneSandboxBtn = document.getElementById("runtimeStartControlPlaneSandboxBtn");
const runtimeAdbHealthBtn = document.getElementById("runtimeAdbHealthBtn");
const runtimeStopAsolariaBtn = document.getElementById("runtimeStopAsolariaBtn");
const runtimeStopControlPlaneBtn = document.getElementById("runtimeStopControlPlaneBtn");
const quickRuntimeActionStatus = document.getElementById("quickRuntimeActionStatus");
const quickVoiceStatus = document.getElementById("quickVoiceStatus");
const quickRealtimeStartBtn = document.getElementById("quickRealtimeStartBtn");
const quickRealtimeStopBtn = document.getElementById("quickRealtimeStopBtn");
const quickRealtimeClearBtn = document.getElementById("quickRealtimeClearBtn");
const quickRealtimeCopyBtn = document.getElementById("quickRealtimeCopyBtn");
const quickRealtimeBridgeBtn = document.getElementById("quickRealtimeBridgeBtn");
const quickRealtimeAutoCopyToggle = document.getElementById("quickRealtimeAutoCopyToggle");
const quickRealtimeMirrorToChatToggle = document.getElementById("quickRealtimeMirrorToChatToggle");
const quickRealtimeCopyLastBtn = document.getElementById("quickRealtimeCopyLastBtn");
const quickRealtimeInstantAskBtn = document.getElementById("quickRealtimeInstantAskBtn");
const quickRealtimeStatus = document.getElementById("quickRealtimeStatus");
const quickRealtimeTranscript = document.getElementById("quickRealtimeTranscript");
const quickRealtimeChatMirrorBox = document.getElementById("quickRealtimeChatMirrorBox");
const quickRealtimeSourceSelect = document.getElementById("quickRealtimeSourceSelect");
const quickRealtimeTranscriptSourceSelect = document.getElementById("quickRealtimeTranscriptSourceSelect");
const quickRealtimeBridgeTokenInput = document.getElementById("quickRealtimeBridgeTokenInput");
const quickRealtimeBasicPresets = document.getElementById("quickRealtimeBasicPresets");
const quickRealtimeBasicHint = document.getElementById("quickRealtimeBasicHint");
const quickRealtimeBasicMeetBtn = document.getElementById("quickRealtimeBasicMeetBtn");
const quickRealtimeBasicTabBtn = document.getElementById("quickRealtimeBasicTabBtn");
const quickRealtimeBasicWindowBtn = document.getElementById("quickRealtimeBasicWindowBtn");
const quickRealtimeDualPanel = document.getElementById("quickRealtimeDualPanel");
const quickRealtimeLaneAInput = document.getElementById("quickRealtimeLaneAInput");
const quickRealtimeLaneBInput = document.getElementById("quickRealtimeLaneBInput");
const quickRealtimeCopyBridgeABtn = document.getElementById("quickRealtimeCopyBridgeABtn");
const quickRealtimeCopyBridgeBBtn = document.getElementById("quickRealtimeCopyBridgeBBtn");
const quickRealtimeLaneAStatus = document.getElementById("quickRealtimeLaneAStatus");
const quickRealtimeLaneBStatus = document.getElementById("quickRealtimeLaneBStatus");
const quickRealtimePasteHelperBtn = document.getElementById("quickRealtimePasteHelperBtn");
const quickRealtimePasteHelperDialog = document.getElementById("quickRealtimePasteHelperDialog");
const quickRealtimePasteHelperStatus = document.getElementById("quickRealtimePasteHelperStatus");
const quickRealtimePasteHelperScript = document.getElementById("quickRealtimePasteHelperScript");
const quickRealtimePasteHelperCopyBtn = document.getElementById("quickRealtimePasteHelperCopyBtn");
const quickRealtimePasteHelperCloseBtn = document.getElementById("quickRealtimePasteHelperCloseBtn");
const quickFlowMasterToggle = document.getElementById("quickFlowMasterToggle");
const quickFlowAnalyzeToggle = document.getElementById("quickFlowAnalyzeToggle");
const quickFlowRefreshBtn = document.getElementById("quickFlowRefreshBtn");
const quickFlowProbeText = document.getElementById("quickFlowProbeText");
const quickFlowProbeLane = document.getElementById("quickFlowProbeLane");
const quickFlowProbeBtn = document.getElementById("quickFlowProbeBtn");
const quickFlowBoard = document.getElementById("quickFlowBoard");
const quickInterviewQuestion = document.getElementById("quickInterviewQuestion");
const quickInterviewQuestionCount = document.getElementById("quickInterviewQuestionCount");
const quickInterviewAskBtn = document.getElementById("quickInterviewAskBtn");
const quickInterviewUseLastBtn = document.getElementById("quickInterviewUseLastBtn");
const quickInterviewClearBtn = document.getElementById("quickInterviewClearBtn");
const humanLauncherStatus = document.getElementById("humanLauncherStatus");
const startupBootstrap = document.getElementById("startupBootstrap");
const startupBootstrapAvatar = document.getElementById("startupBootstrapAvatar");
const startupBootstrapStatus = document.getElementById("startupBootstrapStatus");
const startupBootstrapProvider = document.getElementById("startupBootstrapProvider");
const startupBootstrapAttempt = document.getElementById("startupBootstrapAttempt");
const startupBootstrapTimeout = document.getElementById("startupBootstrapTimeout");
const startupBootstrapLoop = document.getElementById("startupBootstrapLoop");
const startupBootstrapProbeLog = document.getElementById("startupBootstrapProbeLog");
const launchSpeakBtn = document.getElementById("launchSpeakBtn");
const launchSimpleUiBtn = document.getElementById("launchSimpleUiBtn");
const launchAdminUiBtn = document.getElementById("launchAdminUiBtn");
const launchSuperAdminUiBtn = document.getElementById("launchSuperAdminUiBtn");
const voiceEnabledSelect = document.getElementById("voiceEnabled");
const avatarEnabledSelect = document.getElementById("avatarEnabled");
const avatarModeSelect = document.getElementById("avatarMode");
const voiceOutputModeRuntimeSelect = document.getElementById("voiceOutputModeRuntime");
const voiceInputCaptureModeSelect = document.getElementById("voiceInputCaptureMode");
const voiceInputDeviceSelect = document.getElementById("voiceInputDevice");
const voiceOutputDeviceIdSelect = document.getElementById("voiceOutputDeviceId");
const voiceAudioDevicesRefreshBtn = document.getElementById("voiceAudioDevicesRefreshBtn");
const voiceAudioDevicesStatus = document.getElementById("voiceAudioDevicesStatus");
const voiceWakeWordInput = document.getElementById("voiceWakeWord");
const kittyTtsUrlInput = document.getElementById("kittyTtsUrl");
const kittyTtsApiKeyInput = document.getElementById("kittyTtsApiKey");
const voiceAvatarSaveBtn = document.getElementById("voiceAvatarSaveBtn");
const voiceAvatarTestBtn = document.getElementById("voiceAvatarTestBtn");
const voiceAvatarStatus = document.getElementById("voiceAvatarStatus");
const avatarStageOverlay = document.getElementById("avatarStageOverlay");
const avatarStageCloseBtn = document.getElementById("avatarStageCloseBtn");
const avatarStageVisual = document.getElementById("avatarStageVisual");
const avatarStageStatus = document.getElementById("avatarStageStatus");
const avatarStagePushTalkBtn = document.getElementById("avatarStagePushTalkBtn");
const avatarStageTestSpeakBtn = document.getElementById("avatarStageTestSpeakBtn");
const superAdminConsoleStatus = document.getElementById("superAdminConsoleStatus");
const superAdminBrainMeta = document.getElementById("superAdminBrainMeta");
const superAdminBrainOutput = document.getElementById("superAdminBrainOutput");
const superAdminBrainWindowBtn = document.getElementById("superAdminBrainWindowBtn");
const superAdminAdminMeta = document.getElementById("superAdminAdminMeta");
const superAdminAdminOutput = document.getElementById("superAdminAdminOutput");
const superAdminAdminWindowBtn = document.getElementById("superAdminAdminWindowBtn");
const superAdminDirectMeta = document.getElementById("superAdminDirectMeta");
const superAdminDirectStatus = document.getElementById("superAdminDirectStatus");
const superAdminDirectTranscript = document.getElementById("superAdminDirectTranscript");
const superAdminDirectForm = document.getElementById("superAdminDirectForm");
const superAdminDirectInput = document.getElementById("superAdminDirectInput");
const superAdminDirectSend = document.getElementById("superAdminDirectSend");
const superAdminDirectClearBtn = document.getElementById("superAdminDirectClearBtn");
const superAdminDirectOpenThreadBtn = document.getElementById("superAdminDirectOpenThreadBtn");

const AGENT_DASHBOARD_ORDER = Object.freeze([
  "asolaria",
  "helm",
  "sentinel",
  "vector",
  "rook",
  "forge",
  "falcon",
  "watchdog"
]);

const AGENT_FALLBACK_META = Object.freeze({
  "asolaria": Object.freeze({ name: "Asolaria", role: "Core Runtime", icon: "A" }),
  "helm": Object.freeze({ name: "Helm", role: "Controller Admin Terminal", icon: "H" }),
  "sentinel": Object.freeze({ name: "Sentinel", role: "Helper/Watch Admin Terminal", icon: "S" }),
  "vector": Object.freeze({ name: "Vector", role: "Main Brain", icon: "V" }),
  "rook": Object.freeze({ name: "Rook", role: "Ops Lane", icon: "R" }),
  "forge": Object.freeze({ name: "Forge", role: "Build Lane", icon: "F" }),
  "falcon": Object.freeze({ name: "Falcon", role: "Phone Lane", icon: "P" }),
  "watchdog": Object.freeze({ name: "Watchdog", role: "Supervisor", icon: "W" })
});
const PHONE_AGENT_DASHBOARD_ORDER = Object.freeze([
  "falcon",
  "phone-link-keeper",
  "phone-tunnel-monitor"
]);

const PHONE_AGENT_FALLBACK_META = Object.freeze({
  "falcon": Object.freeze({ name: "Falcon", role: "Phone Lane", icon: "P" }),
  "phone-link-keeper": Object.freeze({ name: "Phone Link Keeper", role: "USB/Wi-Fi Keeper", icon: "LK" }),
  "phone-tunnel-monitor": Object.freeze({ name: "Phone Tunnel Monitor", role: "Tunnel Failover", icon: "TM" })
});
const PHONE_RUNTIME_ALERT_THRESHOLD_SECONDS = 90;
const ADMIN_TERMINAL_AUTOENSURE_STORAGE_KEY = "ASOLARIA_ADMIN_TERMINAL_AUTOENSURE_V1";

let stealthMode = false;
let uiExperienceMode = "simple";
let approvalMode = "smart";
let memoryWindowTurns = 12;
let costMode = "low";
let codexWebSearch = false;
let openclawMode = "read_only";
let voiceEnabled = true;
let voiceOutputMode = "browser";
let voiceAutoSpeakReplies = false;
let voiceWakeWord = "asolaria";
let voiceInputCaptureMode = "wasapi_loopback";
let voiceInputDevice = "";
let voiceOutputDeviceId = "default";
let kittyTtsUrl = "";
let kittyTtsApiKeyConfigured = false;
let avatarEnabled = true;
let avatarMode = "orb";
let allowExternalPosting = false;
let guardianMode = "autonomous";
let guardianRiskThreshold = "high";
let guardianAlertsEnabled = true;
let guardianAutoBlockCritical = false;
let activeProjectScope = "all";
let externalModelAliases = {};
let externalModelCatalog = {};
let externalDefaultModels = {};
let externalDefaultModelsRevision = "";
let externalObservedPruneRuntime = {
  enabled: true,
  maxAgeDays: 30,
  dailyHourLocal: 3,
  timerActive: false,
  nextRunAt: "",
  lastRunAt: "",
  lastError: "",
  lastSummary: null,
  runs: 0
};
let externalMcpStatusByProvider = Object.create(null);
let externalMcpProfilesCatalog = Object.freeze({
  balanced: {},
  aggressive: {},
  off: {}
});
let externalMcpUiDirty = false;
let quickRealtimePasteHelperPayload = {
  slotLabel: "",
  laneId: "",
  script: ""
};
let adminTerminalCockpitRefreshInFlight = false;
let adminTerminalCockpitLastSnapshot = null;
let superCoderRefreshInFlight = false;
let superCoderLastSnapshot = null;
let healthRefreshInFlight = false;

const PROJECT_SCOPE_STORAGE_KEY = "ASOLARIA_ACTIVE_PROJECT_SCOPE";
const UI_EXPERIENCE_MODE_STORAGE_KEY = "ASOLARIA_UI_EXPERIENCE_MODE_V1";
const NATURAL20_DAILY_STORAGE_KEY = "ASOLARIA_NATURAL20_DAILY_V1";
const NATURAL20_URL = "https://natural20.com";
const AVATAR_GREETING_STORAGE_KEY = "ASOLARIA_AVATAR_GREETING_V2";
const UI_EXPERIENCE_MODES = Object.freeze(["simple", "admin", "advanced"]);
const PROJECT_ALLOWED_GROUPS = Object.freeze(["projects", "tasks", "skills", "runtime"]);
const CHAT_THREADS_STORAGE_KEY = "ASOLARIA_CHAT_THREADS_V1";
const CHAT_ACTIVE_THREAD_STORAGE_KEY = "ASOLARIA_CHAT_ACTIVE_THREAD_V1";
const CHAT_ROUTE_MODE_STORAGE_KEY = "ASOLARIA_CHAT_ROUTE_MODE_V1";
const CHAT_PINNED_THREADS_STORAGE_KEY = "ASOLARIA_CHAT_PINNED_THREADS_V1";
const CHAT_RAIL_SECTION_STORAGE_KEY = "ASOLARIA_CHAT_RAIL_SECTION_V1";
const CHAT_TASK_LINKS_STORAGE_KEY = "ASOLARIA_CHAT_TASK_LINKS_V1";
const CHAT_CLOSE_LOOP_DISMISSALS_STORAGE_KEY = "ASOLARIA_CHAT_CLOSE_LOOP_DISMISSALS_V1";
const CHAT_FOCUS_TURNOVER_STORAGE_KEY = "ASOLARIA_CHAT_FOCUS_TURNOVER_V1";
const CHAT_SAFETY_METRICS_STORAGE_KEY = "ASOLARIA_CHAT_SAFETY_METRICS_V1";
const CHAT_ABACUS_PACK_STORAGE_KEY = "ASOLARIA_CHAT_ABACUS_PACK_V1";
const STARTUP_BRAIN_AUTORUN_STORAGE_KEY = "ASOLARIA_STARTUP_BRAIN_AUTORUN_V1";
const CHAT_FOCUS_MAX_ITEMS = 3;
const CHAT_RECENTLY_ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SPEECH_LANG = "en-US";
const CHAT_RECENTLY_ACTIVE_MAX_ITEMS = 5;
const CHAT_CLOSE_LOOP_INACTIVE_MS = 48 * 60 * 60 * 1000;
const DEFAULT_CHAT_THREAD_ID = "main";
const DEFAULT_CHAT_THREAD_TITLE = "Main Chat";
const SUPER_ADMIN_DIRECT_CHAT_ID = "super-admin-direct";
const SUPER_ADMIN_DIRECT_THREAD_TITLE = "Super Admin Direct";
const VOICE_KNOWN_WAKE_WORDS = Object.freeze(["Asolaria"]);
const EXTERNAL_MCP_TOKEN_PROFILE_FALLBACK = "balanced";
const EXTERNAL_MCP_TOOL_SCHEMA_MODE_FALLBACK = "compact";
const EXTERNAL_MCP_PROMPT_TOKEN_LIMIT_FALLBACK = 1600;
const ABACUS_UPGRADE_PROMPT = [
  "Today hard push for Asolaria UX and reliability.",
  "Scope: behavior-level improvements only, low-risk, no infrastructure refactor.",
  "Current shipped: Next Best Action strip, Focus max 3, Recently Active 24h, context badges, search actions, 48h close-loop prompt, safety metrics.",
  "Reference capability map to emulate: Data/Analytics, Content Generation, Dev/Engineering workflows, DeepAgent escalation, Connectivity/Connectors, UX memory/task linking.",
  "Deliver:",
  "1) Top 3 additional micro-improvements (<=30 min each) mapped to those capability areas.",
  "2) Exact UI copy for each.",
  "3) Exact acceptance checks for each.",
  "4) Rollback trigger for each.",
  "5) One today-only manual QA checklist for fast validation.",
  "6) Explicitly mark what is parity-level, what is workaround, and what remains future."
].join("\n");
const ABACUS_PARITY_TASK_TEMPLATES = Object.freeze([
  Object.freeze({
    title: "Abacus parity: data and analytical tools",
    description: "Map Python math/science execution, CSV/Excel manipulation, and SQL query workflows into explicit Asolaria quick actions.",
    priority: "high"
  }),
  Object.freeze({
    title: "Abacus parity: content and file generation",
    description: "Harden generation entry points for docs/PDF, image prompts, and short media workflows with clear status and outputs.",
    priority: "high"
  }),
  Object.freeze({
    title: "Abacus parity: development and engineering flow",
    description: "Improve large-codebase handoff, code editing precision flow, and playground-to-production transition behavior.",
    priority: "normal"
  }),
  Object.freeze({
    title: "Abacus parity: deep agent escalation",
    description: "Refine normal-vs-deep escalation triggers, with explicit guardrails for big tasks and long-running workflows.",
    priority: "normal"
  }),
  Object.freeze({
    title: "Abacus parity: communication and connectivity",
    description: "Audit web search, email, and external connector actions (Gmail/Slack/WhatsApp/Twitter style) for safe and clear behavior.",
    priority: "normal"
  }),
  Object.freeze({
    title: "Abacus parity: UI memory and momentum loop",
    description: "Strengthen voice/memory/task-chat linking feedback loops so users always know next action and progress state.",
    priority: "high"
  })
]);
const FRIEND_BOOTSTRAP_PACK_TITLE = "Friend Codex Bootstrap Pack";
const CHAT_TASK_QUICK_STATUS_OPTIONS = Object.freeze([
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Ready to Review" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done ✅" }
]);

let projectScopeList = [];
let projectScopeMap = Object.create(null);
let projectCatalogById = Object.create(null);
let chatThreads = [];
let chatTurnsByThread = Object.create(null);
let activeChatThreadId = DEFAULT_CHAT_THREAD_ID;
let chatRouteMode = "normal";
let chatPinnedThreadIds = [];
let chatRailSection = "chats";
let chatRailTasks = [];
let chatTaskLinks = Object.create(null);
let chatCloseLoopDismissals = Object.create(null);
let chatFocusTurnover = {
  day: "",
  adds: 0,
  removes: 0,
  replacements: 0,
  clears: 0
};
let chatExecutionMetrics = {
  active: 0,
  blocked: 0,
  doneToday: 0,
  day: buildLocalDayKey()
};
let chatSafetyMetrics = {
  day: "",
  nbaShown: 0,
  nbaClicked: 0,
  resolveClicks: 0,
  reopenClicks: 0
};
let lastNbaExposureSignature = "";
let lastSafetyWarningSignature = "";
let chatGoShortcutUntilMs = 0;
let quickVoiceRecognition = null;
let quickVoiceListening = false;
let quickVoiceRequested = false;
let quickVoiceOneShot = false;
let quickVoiceAbortTimer = 0;
let currentVoiceAudio = null;
const REALTIME_TRANSCRIBE_TIMESLICE_MS = 1000;
const REALTIME_TRANSCRIBE_MAX_QUEUE = 10;
const REALTIME_TRANSCRIBE_SOFT_QUEUE = 4;
const REALTIME_TRANSCRIBE_MODEL = "tiny.en";
const REALTIME_TRANSCRIBE_MAX_TEXT_CHARS = 24000;
const REALTIME_TRANSCRIBE_MAX_ENTRIES = 220;
const REALTIME_FLOW_MAX_LINES_PER_DIRECTION = 80;
const REALTIME_FLOW_PREFS_KEY = "ASOLARIA_REALTIME_FLOW_PREFS_V1";
const REALTIME_BRIDGE_TOKEN_SESSION_KEY = "ASOLARIA_REALTIME_BRIDGE_TOKEN_SESSION_V1";
const QUICK_INTERVIEW_MAX_WORDS = 200;
const REALTIME_TRANSCRIBE_MAX_PENDING_BLOB_BYTES = 5 * 1024 * 1024;
const REALTIME_TRANSCRIBE_CAPTURE_SOURCES = Object.freeze([
  "tab_audio",
  "window_audio",
  "screen_audio",
  "microphone",
  "server_loopback",
  "google_meet_caption",
  "custom_caption"
]);
const REALTIME_CAPTION_BRIDGE_SOURCES = Object.freeze([
  "google_meet_caption",
  "custom_caption"
]);
const REALTIME_TRANSCRIPT_SOURCES = Object.freeze([
  "live",
  "bridge",
  "all"
]);
let realtimeTranscribeState = {
  active: false,
  captureActive: false,
  draining: false,
  supported: Boolean(
    window.MediaRecorder
    && (navigator.mediaDevices?.getDisplayMedia || navigator.mediaDevices?.getUserMedia)
  ),
  captureSource: "tab_audio",
  sessionId: "",
  stream: null,
  recorder: null,
  mimeType: "",
  seedBlob: null,
  mode: "browser",
  serverPollTimer: 0,
  serverLastSegmentIndex: 0,
  meetBridgePollTimer: 0,
  meetBridgeRunToken: 0,
  meetBridgeLastId: 0,
  meetBridgeLaneStatusTimer: 0,
  meetBridgeLaneCount: 0,
  meetBridgeActiveLaneCount: 0,
  meetBridgeStaleLaneCount: 0,
  meetBridgeLastErrorMessage: "",
  meetBridgeLastErrorAtMs: 0,
  transcriptSource: "live",
  bridgePushToken: "",
  lastCompatTranscript: "",
  flowMonitorEnabled: true,
  flowAnalysisEnabled: false,
  flowLanes: {},
  flowLastUpdatedAt: "",
  chunkQueue: [],
  sending: false,
  sequence: 0,
  transcript: "",
  stopRequested: false,
  backpressureMerges: 0,
  droppedChunks: 0,
  emptyChunkStreak: 0,
  lastChunk: "",
  lastAutoCopiedChunk: "",
  lastMirroredChatLine: "",
  lastSpeaker: "",
  entries: [],
  autoCopy: true,
  autoMirrorToChat: true,
  finalizeReason: "",
  finalizeLevel: ""
};
let avatarVisualState = "idle";
let avatarStageOpen = false;
let voiceAvatarDirty = false;
let avatarStateSyncTimer = 0;
let avatarStateSyncPending = null;
let lastAvatarSyncSignature = "";
let voiceServerInputDevices = [];
let voiceBrowserOutputDevices = [];
let uiModeTransitionTimer = 0;
let nextActionState = {
  type: "start_new",
  chatId: "",
  taskId: "",
  reason: "Because you worked on this today",
  tooltip: "We surface what seems most relevant based on your recent activity."
};
let closeLoopToastTimer = 0;
let closeLoopToastState = {
  taskId: "",
  chatId: ""
};
let startupBootstrapForced = false;
let startupBootstrapActive = false;
let startupBootstrapReadyAnnounced = false;
let startupBootstrapInitialGreetingDone = false;
let startupBootstrapLastProviderAnnounced = "";
let startupBootstrapLastProbeSignature = "";
let startupBootstrapStatusTimer = 0;
let startupBrainTriggerInFlight = false;
let latestHealthSnapshot = null;
let superAdminTerminalRefreshInFlight = false;
let superAdminTerminalLastSignature = "";

function normalizeUiExperienceMode(value, fallback = "simple") {
  const normalized = String(value || "").trim().toLowerCase();
  if (UI_EXPERIENCE_MODES.includes(normalized)) {
    return normalized;
  }
  return UI_EXPERIENCE_MODES.includes(fallback) ? fallback : "simple";
}

function normalizeVoiceOutputMode(value, fallback = "browser") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "server" || normalized === "kitty_tts") {
    return normalized;
  }
  if (normalized === "browser") {
    return "browser";
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (safeFallback === "server" || safeFallback === "kitty_tts" || safeFallback === "browser") {
    return safeFallback;
  }
  return "browser";
}

function normalizeVoiceAutoSpeak(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "on" || normalized === "true" || normalized === "1") return true;
    if (normalized === "off" || normalized === "false" || normalized === "0") return false;
  }
  return Boolean(fallback);
}

function normalizeVoiceInputCaptureMode(value, fallback = "wasapi_loopback") {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "wasapi_meeting_mix"
    || normalized === "meeting_mix"
    || normalized === "meeting-mix"
    || normalized === "meeting"
    || normalized === "mix"
    || normalized === "incoming_outgoing"
    || normalized === "incoming+outgoing"
  ) {
    return "wasapi_meeting_mix";
  }
  if (normalized === "wasapi_microphone" || normalized === "microphone" || normalized === "mic") {
    return "wasapi_microphone";
  }
  if (normalized === "dshow_microphone" || normalized === "dshow" || normalized === "dshow_mic") {
    return "dshow_microphone";
  }
  if (normalized === "wasapi_loopback" || normalized === "loopback" || normalized === "speaker") {
    return "wasapi_loopback";
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (
    safeFallback === "wasapi_meeting_mix"
    || safeFallback === "wasapi_microphone"
    || safeFallback === "dshow_microphone"
    || safeFallback === "wasapi_loopback"
  ) {
    return safeFallback;
  }
  return "wasapi_loopback";
}

function normalizeVoiceOutputDeviceId(value, fallback = "default") {
  const normalized = String(value || "").trim();
  if (normalized) {
    return normalized.slice(0, 240);
  }
  const safeFallback = String(fallback || "").trim();
  if (safeFallback) {
    return safeFallback.slice(0, 240);
  }
  return "default";
}

function normalizeVoiceInputDevice(value, fallback = "") {
  const normalized = String(value || "").trim();
  if (normalized) {
    return normalized.slice(0, 240);
  }
  return String(fallback || "").trim().slice(0, 240);
}

function normalizeExternalMcpTokenReductionProfile(value, fallback = EXTERNAL_MCP_TOKEN_PROFILE_FALLBACK) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "off" || normalized === "balanced" || normalized === "aggressive") {
    return normalized;
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (safeFallback === "off" || safeFallback === "balanced" || safeFallback === "aggressive") {
    return safeFallback;
  }
  return EXTERNAL_MCP_TOKEN_PROFILE_FALLBACK;
}

function normalizeExternalMcpToolSchemaMode(value, fallback = EXTERNAL_MCP_TOOL_SCHEMA_MODE_FALLBACK) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "full" || normalized === "compact" || normalized === "pointer") {
    return normalized;
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (safeFallback === "full" || safeFallback === "compact" || safeFallback === "pointer") {
    return safeFallback;
  }
  return EXTERNAL_MCP_TOOL_SCHEMA_MODE_FALLBACK;
}

function normalizeExternalMcpPromptTokenLimit(value, fallback = EXTERNAL_MCP_PROMPT_TOKEN_LIMIT_FALLBACK) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.min(12000, Math.round(Number(fallback || EXTERNAL_MCP_PROMPT_TOKEN_LIMIT_FALLBACK))));
  }
  return Math.max(0, Math.min(12000, Math.round(parsed)));
}

function normalizeExternalMcpContextKey(value, fallback = "") {
  const text = String(value || "").trim();
  if (!text) {
    return String(fallback || "").trim().slice(0, 180);
  }
  return text.slice(0, 180);
}

function normalizeExternalHintList(value, maxItems = 24, maxLen = 72) {
  const raw = Array.isArray(value)
    ? value
    : String(value || "").split(/[,;\n]/g);
  return uniqueNonEmptyStrings(raw)
    .map((entry) => String(entry || "").trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeOnOff(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "on" || normalized === "true" || normalized === "1" || normalized === "enabled") {
    return true;
  }
  if (normalized === "off" || normalized === "false" || normalized === "0" || normalized === "disabled") {
    return false;
  }
  return Boolean(fallback);
}

function normalizeAvatarMode(value, fallback = "orb") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "video" || normalized === "live2d") {
    return normalized;
  }
  if (normalized === "orb") {
    return "orb";
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (safeFallback === "video" || safeFallback === "live2d" || safeFallback === "orb") {
    return safeFallback;
  }
  return "orb";
}

function normalizeWakeWord(value, fallback = "oli") {
  const normalized = String(value || "").trim().slice(0, 48);
  if (normalized) {
    return normalized;
  }
  const safeFallback = String(fallback || "").trim().slice(0, 48);
  return safeFallback || "asolaria";
}

function normalizeOptionalUrl(value, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return String(fallback || "").trim();
  }
  try {
    const parsed = new URL(raw);
    const protocol = String(parsed.protocol || "").toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return String(fallback || "").trim();
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(fallback || "").trim();
  }
}

function normalizeAvatarState(value, fallback = "idle") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "listening" || normalized === "thinking" || normalized === "speaking" || normalized === "error") {
    return normalized;
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (safeFallback === "listening" || safeFallback === "thinking" || safeFallback === "speaking" || safeFallback === "error") {
    return safeFallback;
  }
  return "idle";
}

function scheduleAvatarStateSync(payload = {}) {
  const next = {
    state: normalizeAvatarState(payload.state, "idle"),
    text: String(payload.text || "").trim().slice(0, 200),
    source: String(payload.source || "web-ui").trim().slice(0, 60) || "web-ui",
    mode: uiExperienceMode
  };
  const signature = `${next.state}|${next.mode}|${next.source}|${next.text}`;
  if (signature === lastAvatarSyncSignature) {
    return;
  }
  avatarStateSyncPending = next;
  if (avatarStateSyncTimer) {
    window.clearTimeout(avatarStateSyncTimer);
  }
  avatarStateSyncTimer = window.setTimeout(async () => {
    const pending = avatarStateSyncPending;
    avatarStateSyncPending = null;
    avatarStateSyncTimer = 0;
    if (!pending) return;
    try {
      await apiPost("/api/avatar/state", pending);
      lastAvatarSyncSignature = signature;
    } catch {
      // Avatar sync is best-effort and should not block UX.
    }
  }, 120);
}

function applyAvatarVisualClasses(target, state, mode) {
  if (!target) return;
  target.classList.remove("is-idle", "is-listening", "is-thinking", "is-speaking", "is-error");
  target.classList.remove("avatar-mode-orb", "avatar-mode-video", "avatar-mode-live2d");
  target.classList.add(`is-${state}`);
  target.classList.add(`avatar-mode-${mode}`);
}

function setAvatarVisualState(state = "idle") {
  avatarVisualState = normalizeAvatarState(state, "idle");
  const effectiveMode = avatarEnabled ? avatarMode : "orb";
  const effectiveState = avatarEnabled ? avatarVisualState : "idle";
  applyAvatarVisualClasses(quickAvatarStage, effectiveState, effectiveMode);
  applyAvatarVisualClasses(avatarStageVisual, effectiveState, effectiveMode);
}

function setVoiceAvatarStatus(text, level = "") {
  if (!voiceAvatarStatus) return;
  voiceAvatarStatus.textContent = String(text || "").trim() || "Voice and avatar controls are live for this Asolaria session.";
  voiceAvatarStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    voiceAvatarStatus.classList.add("is-live");
  } else if (level === "error") {
    voiceAvatarStatus.classList.add("is-error");
  }
}

function setVoiceAudioDevicesStatus(text, level = "") {
  if (!voiceAudioDevicesStatus) return;
  voiceAudioDevicesStatus.textContent = String(text || "").trim() || "Audio devices will appear after refresh.";
  voiceAudioDevicesStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    voiceAudioDevicesStatus.classList.add("is-live");
  } else if (level === "error") {
    voiceAudioDevicesStatus.classList.add("is-error");
  }
}

function renderVoiceInputCaptureModeOptions(modes = []) {
  if (!voiceInputCaptureModeSelect) return;
  const list = Array.isArray(modes) && modes.length > 0
    ? modes
    : [
      { id: "wasapi_meeting_mix", label: "Meeting Mix (incoming + outgoing)" },
      { id: "wasapi_loopback", label: "System / Speaker Loopback" },
      { id: "wasapi_microphone", label: "Microphone" },
      { id: "dshow_microphone", label: "Microphone (dshow fallback)" }
    ];
  voiceInputCaptureModeSelect.innerHTML = "";
  for (const item of list) {
    const modeId = normalizeVoiceInputCaptureMode(item?.id || item?.value || "wasapi_loopback", "wasapi_loopback");
    const option = document.createElement("option");
    option.value = modeId;
    option.textContent = String(item?.label || modeId).trim() || modeId;
    voiceInputCaptureModeSelect.appendChild(option);
  }
  if (!Array.from(voiceInputCaptureModeSelect.options).some((option) => option.value === voiceInputCaptureMode)) {
    const option = document.createElement("option");
    option.value = voiceInputCaptureMode;
    option.textContent = `${voiceInputCaptureMode} (saved)`;
    voiceInputCaptureModeSelect.appendChild(option);
  }
  voiceInputCaptureModeSelect.value = voiceInputCaptureMode;
}

function renderVoiceInputDeviceOptions() {
  if (!voiceInputDeviceSelect) return;
  const selected = normalizeVoiceInputDevice(voiceInputDevice, "");
  voiceInputDeviceSelect.innerHTML = "";
  const autoOption = document.createElement("option");
  autoOption.value = "";
  autoOption.textContent = "Auto (recommended)";
  voiceInputDeviceSelect.appendChild(autoOption);
  for (const row of Array.isArray(voiceServerInputDevices) ? voiceServerInputDevices : []) {
    const deviceId = normalizeVoiceInputDevice(row?.id || row?.label || "", "");
    if (!deviceId) continue;
    const option = document.createElement("option");
    option.value = deviceId;
    option.textContent = String(row?.label || deviceId).trim() || deviceId;
    voiceInputDeviceSelect.appendChild(option);
  }
  if (selected && !Array.from(voiceInputDeviceSelect.options).some((option) => option.value === selected)) {
    const custom = document.createElement("option");
    custom.value = selected;
    custom.textContent = `${selected} (saved)`;
    voiceInputDeviceSelect.appendChild(custom);
  }
  voiceInputDeviceSelect.value = selected;
}

function renderVoiceOutputDeviceOptions() {
  if (!voiceOutputDeviceIdSelect) return;
  const selected = normalizeVoiceOutputDeviceId(voiceOutputDeviceId, "default");
  voiceOutputDeviceIdSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "default";
  defaultOption.textContent = "System default";
  voiceOutputDeviceIdSelect.appendChild(defaultOption);
  for (const row of Array.isArray(voiceBrowserOutputDevices) ? voiceBrowserOutputDevices : []) {
    const deviceId = normalizeVoiceOutputDeviceId(row?.deviceId || "", "");
    if (!deviceId || deviceId === "default") continue;
    const option = document.createElement("option");
    option.value = deviceId;
    option.textContent = String(row?.label || `Output (${deviceId.slice(0, 10)})`).trim();
    voiceOutputDeviceIdSelect.appendChild(option);
  }
  if (selected && !Array.from(voiceOutputDeviceIdSelect.options).some((option) => option.value === selected)) {
    const custom = document.createElement("option");
    custom.value = selected;
    custom.textContent = `${selected} (saved)`;
    voiceOutputDeviceIdSelect.appendChild(custom);
  }
  voiceOutputDeviceIdSelect.value = selected;
}

function normalizeBrowserAudioOutputDevices(rawDevices = []) {
  const out = [];
  const seen = new Set();
  let unnamed = 0;
  for (const row of Array.isArray(rawDevices) ? rawDevices : []) {
    if (String(row?.kind || "").trim() !== "audiooutput") continue;
    const deviceId = normalizeVoiceOutputDeviceId(row?.deviceId || "", "");
    if (!deviceId || seen.has(deviceId)) continue;
    seen.add(deviceId);
    unnamed += 1;
    out.push({
      deviceId,
      label: String(row?.label || "").trim() || `Audio output ${unnamed}`
    });
  }
  return out;
}

async function refreshVoiceAudioDevices(options = {}) {
  const silent = Boolean(options.silent);
  const force = Boolean(options.force);
  if (voiceAudioDevicesRefreshBtn) {
    voiceAudioDevicesRefreshBtn.disabled = true;
  }
  if (!silent) {
    setVoiceAudioDevicesStatus("Refreshing audio devices...", "live");
  }
  try {
    const query = force ? "?refresh=true" : "";
    const inventoryPromise = request(`/api/voice/devices${query}`).catch(() => null);
    const browserDevicesPromise = navigator.mediaDevices?.enumerateDevices
      ? navigator.mediaDevices.enumerateDevices().catch(() => [])
      : Promise.resolve([]);
    const [inventory, browserDevices] = await Promise.all([inventoryPromise, browserDevicesPromise]);

    if (inventory?.selected && !voiceAvatarDirty) {
      voiceInputCaptureMode = normalizeVoiceInputCaptureMode(
        inventory.selected.inputCaptureMode,
        voiceInputCaptureMode
      );
      voiceInputDevice = normalizeVoiceInputDevice(inventory.selected.inputDevice, voiceInputDevice);
      voiceOutputDeviceId = normalizeVoiceOutputDeviceId(
        inventory.selected.outputDeviceId,
        voiceOutputDeviceId
      );
    }
    renderVoiceInputCaptureModeOptions(inventory?.captureModes || []);

    voiceServerInputDevices = Array.isArray(inventory?.inputDevices)
      ? inventory.inputDevices.map((row) => ({
        id: normalizeVoiceInputDevice(row?.id || row?.label || "", ""),
        label: String(row?.label || row?.id || "").trim()
      })).filter((row) => row.id)
      : [];
    renderVoiceInputDeviceOptions();

    voiceBrowserOutputDevices = normalizeBrowserAudioOutputDevices(browserDevices);
    renderVoiceOutputDeviceOptions();

    if (!silent) {
      const inputCount = voiceServerInputDevices.length;
      const outputCount = voiceBrowserOutputDevices.length;
      const ffmpegReady = Boolean(inventory?.ffmpeg?.available);
      const suffix = ffmpegReady ? "ffmpeg ready" : "ffmpeg missing";
      const level = ffmpegReady ? "live" : "error";
      setVoiceAudioDevicesStatus(
        `Audio devices loaded: inputs ${inputCount}, outputs ${outputCount} (${suffix}).`,
        level
      );
    }
  } catch (error) {
    if (!silent) {
      setVoiceAudioDevicesStatus(`Audio device refresh failed: ${error.message}`, "error");
    }
  } finally {
    if (voiceAudioDevicesRefreshBtn) {
      voiceAudioDevicesRefreshBtn.disabled = false;
    }
  }
}

function syncVoiceAvatarControlState(options = {}) {
  const skipFocused = Boolean(options.skipFocused);
  if (voiceEnabledSelect) {
    voiceEnabledSelect.value = voiceEnabled ? "on" : "off";
  }
  if (avatarEnabledSelect) {
    avatarEnabledSelect.value = avatarEnabled ? "on" : "off";
  }
  if (avatarModeSelect) {
    avatarModeSelect.value = avatarMode;
  }
  if (voiceOutputModeRuntimeSelect) {
    voiceOutputModeRuntimeSelect.value = voiceOutputMode;
  }
  if (voiceInputCaptureModeSelect) {
    renderVoiceInputCaptureModeOptions();
  }
  if (voiceInputDeviceSelect) {
    renderVoiceInputDeviceOptions();
  }
  if (voiceOutputDeviceIdSelect) {
    renderVoiceOutputDeviceOptions();
  }
  if (voiceWakeWordInput && (!skipFocused || document.activeElement !== voiceWakeWordInput)) {
    voiceWakeWordInput.value = voiceWakeWord;
  }
  if (kittyTtsUrlInput && (!skipFocused || document.activeElement !== kittyTtsUrlInput)) {
    kittyTtsUrlInput.value = kittyTtsUrl;
  }
  if (kittyTtsApiKeyInput && !kittyTtsApiKeyInput.value && kittyTtsApiKeyConfigured) {
    kittyTtsApiKeyInput.placeholder = "Kitty API key configured (enter to replace)";
  } else if (kittyTtsApiKeyInput && !kittyTtsApiKeyConfigured) {
    kittyTtsApiKeyInput.placeholder = "Kitty API key (optional)";
  }
  if (quickAvatarModePill) {
    const avatarLabel = avatarEnabled ? avatarMode : "off";
    const voiceLabel = voiceEnabled ? voiceOutputMode : "off";
    quickAvatarModePill.textContent = `Avatar: ${avatarLabel} | Voice: ${voiceLabel}`;
    quickAvatarModePill.classList.toggle("is-dim", !(avatarEnabled && voiceEnabled));
  }
}

function setAvatarStageOpen(open) {
  avatarStageOpen = Boolean(open);
  if (avatarStageOverlay) {
    avatarStageOverlay.hidden = !avatarStageOpen;
  }
  if (!avatarStageOpen && (quickVoiceListening || quickVoiceRequested) && quickVoiceOneShot) {
    stopQuickVoiceSession();
  }
  if (avatarStageOpen) {
    if (avatarStageStatus) {
      avatarStageStatus.textContent = String(quickAvatarStatus?.textContent || "Avatar ready.").trim();
    }
    if (avatarStageCloseBtn && typeof avatarStageCloseBtn.focus === "function") {
      try {
        avatarStageCloseBtn.focus({ preventScroll: true });
      } catch {
        avatarStageCloseBtn.focus();
      }
    }
  }
}

function setQuickAvatarStatus(text, state = "") {
  const message = String(text || "").trim() || "Avatar idle.";
  if (quickAvatarStatus) {
    quickAvatarStatus.textContent = message;
  }
  if (avatarStageStatus) {
    avatarStageStatus.textContent = message;
  }
  setAvatarVisualState(state || avatarVisualState || "idle");
  if (state) {
    scheduleAvatarStateSync({
      state,
      text: message,
      source: "quick-ui"
    });
  }
}

function setQuickVoiceStatus(text, level = "") {
  if (!quickVoiceStatus) return;
  quickVoiceStatus.textContent = String(text || "").trim() || "Voice is off. Web Speech runs now; Kitty.TTS can be swapped in as the output voice engine.";
  quickVoiceStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    quickVoiceStatus.classList.add("is-live");
  } else if (level === "error") {
    quickVoiceStatus.classList.add("is-error");
  }
}

function refreshQuickVoiceControls() {
  const voiceActive = quickVoiceListening || quickVoiceRequested;
  if (quickVoiceToggleBtn) {
    quickVoiceToggleBtn.textContent = voiceActive ? "Stop Voice" : "Start Voice";
  }
  if (quickVoicePushBtn) {
    quickVoicePushBtn.textContent = voiceActive && quickVoiceOneShot ? "Stop Push-to-Talk" : "Push-to-Talk";
  }
  if (launchSpeakBtn) {
    const title = launchSpeakBtn.querySelector("strong");
    if (title) {
      title.textContent = voiceActive ? "Pause Voice" : "Start Asolaria";
    }
    launchSpeakBtn.classList.toggle("is-active", voiceActive);
  }
}

function applyUiExperienceMode(mode, options = {}) {
  const normalized = normalizeUiExperienceMode(mode, uiExperienceMode || "simple");
  uiExperienceMode = normalized;
  const isSimple = normalized === "simple";
  const isAdmin = normalized === "admin";
  const isAdvanced = normalized === "advanced";
  if (!options.skipAnimation) {
    document.body.classList.add("ui-mode-transitioning");
    if (uiModeTransitionTimer) {
      window.clearTimeout(uiModeTransitionTimer);
    }
    uiModeTransitionTimer = window.setTimeout(() => {
      document.body.classList.remove("ui-mode-transitioning");
      uiModeTransitionTimer = 0;
    }, 260);
  }
  document.body.classList.toggle("ui-mode-simple", isSimple);
  document.body.classList.toggle("ui-mode-admin", isAdmin);
  document.body.classList.toggle("ui-mode-advanced", isAdvanced);
  syncLauncherModeCards();
  if (quickShell) {
    quickShell.hidden = !(isSimple || isAdmin || isAdvanced);
  }
  if (uiExperienceModeSelect) {
    uiExperienceModeSelect.value = normalized;
  }
  if (!options.skipPersist) {
    try {
      localStorage.setItem(UI_EXPERIENCE_MODE_STORAGE_KEY, normalized);
    } catch {}
  }
  if (!options.silent) {
    logEvent(`UI mode set to ${normalized}.`);
  }
  scheduleAvatarStateSync({
    state: "idle",
    text: isSimple
      ? "Simple mode active."
      : (isAdmin ? "Admin mode active." : "Super Admin mode active."),
    source: "ui-mode"
  });
  if (isAdvanced) {
    if (adminTerminalCockpitAutoEnsure?.checked) {
      void ensureAdminTerminalCockpit({
        autoBootstrap: true,
        reason: "advanced_mode_autolaunch"
      }).catch((error) => {
        setAdminTerminalCockpitStatus(`Admin auto-launch failed: ${error.message}`, "error");
      });
    } else {
      void refreshAdminTerminalCockpit({ silent: true });
    }
    void refreshSuperAdminTerminals({ force: true });
    void loadSuperAdminDirectConversation();
  } else {
    if (isAdmin) {
      void refreshAdminTerminalCockpit({ silent: true });
    }
    setSuperAdminConsoleStatus(
      isSimple
        ? "Switch to Super Admin to reveal live terminal feeds."
        : "Super Admin terminals are hidden in Admin mode."
    );
  }
  if (typeof renderActiveChatMessages === "function") {
    renderActiveChatMessages();
  }
}

function loadUiExperienceModeState() {
  let stored = "simple";
  try {
    stored = localStorage.getItem(UI_EXPERIENCE_MODE_STORAGE_KEY) || "simple";
  } catch {}
  applyUiExperienceMode(stored, { silent: true, skipPersist: true });
}

function getUiModePresetFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const uiMode = params.get("uiMode") || params.get("mode") || "";
    const raw = String(uiMode || "").trim().toLowerCase();
    if (!raw) {
      return "";
    }
    return UI_EXPERIENCE_MODES.includes(raw) ? raw : "";
  } catch {
    return "";
  }
}

function isStartupBootstrapRequestedByUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const raw = String(
      params.get("startup")
      || params.get("startupBootstrap")
      || params.get("boot")
      || ""
    ).trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
  } catch {
    return false;
  }
}

function parseUrlBooleanFlag(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return false;
  }
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function getRealtimeCapturePresetFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const rawSource = String(
      params.get("captureSource")
      || params.get("capture")
      || params.get("source")
      || ""
    ).trim();
    const normalizedSource = rawSource
      ? normalizeRealtimeCaptureSource(rawSource, realtimeTranscribeState.captureSource || "tab_audio")
      : "";
    const rawTranscriptSource = String(
      params.get("transcriptSource")
      || params.get("transcript")
      || ""
    ).trim();
    const normalizedTranscriptSource = rawTranscriptSource
      ? normalizeRealtimeTranscriptSource(rawTranscriptSource, realtimeTranscribeState.transcriptSource || "live")
      : "";
    const autoStart = parseUrlBooleanFlag(
      params.get("autoCapture")
      || params.get("autocapture")
      || params.get("autoStartCapture")
      || params.get("startCapture")
      || ""
    );
    return {
      source: normalizedSource || "",
      transcriptSource: normalizedTranscriptSource || "",
      autoStart
    };
  } catch {
    return {
      source: "",
      transcriptSource: "",
      autoStart: false
    };
  }
}

function formatBrainProviderName(providerId, model = "") {
  const normalized = String(providerId || "").trim().toLowerCase();
  const display = normalized === "codex"
    ? "Codex"
    : normalized === "anthropic"
      ? "Anthropic"
      : normalized === "gemini-api"
        ? "Gemini API"
        : normalized === "vertex"
          ? "Vertex"
          : normalized === "openclaw"
            ? "OSS fallback"
            : normalized === "gemini-cli"
              ? "Gemini CLI"
              : normalized === "cursor"
                ? "Cursor"
                : normalized === "antigravity"
                  ? "Antigravity"
                  : (normalized || "Unknown provider");
  const trimmedModel = String(model || "").trim();
  if (!trimmedModel) {
    return display;
  }
  return `${display} (${trimmedModel})`;
}

function setStartupBootstrapAvatarState(state = "thinking") {
  if (!startupBootstrapAvatar) return;
  const normalized = normalizeAvatarState(state, "thinking");
  startupBootstrapAvatar.classList.remove("is-thinking", "is-speaking", "is-error");
  startupBootstrapAvatar.classList.add(`is-${normalized}`);
}

function setStartupBootstrapActive(active) {
  startupBootstrapActive = Boolean(active);
  if (!startupBootstrap) return;
  startupBootstrap.hidden = !startupBootstrapActive;
  if (!startupBootstrapActive) {
    startupBootstrap.classList.remove("is-ready");
    if (startupBootstrapStatusTimer) {
      window.clearTimeout(startupBootstrapStatusTimer);
      startupBootstrapStatusTimer = 0;
    }
  }
}

function resetStartupBootstrapCycle(options = {}) {
  const keepForced = Boolean(options.keepForced);
  if (!keepForced) {
    startupBootstrapForced = false;
  }
  startupBootstrapReadyAnnounced = false;
  startupBootstrapInitialGreetingDone = false;
  startupBootstrapLastProviderAnnounced = "";
  startupBootstrapLastProbeSignature = "";
  if (startupBootstrapStatusTimer) {
    window.clearTimeout(startupBootstrapStatusTimer);
    startupBootstrapStatusTimer = 0;
  }
  if (startupBootstrap) {
    startupBootstrap.classList.remove("is-ready");
  }
  if (startupBootstrapProbeLog) {
    startupBootstrapProbeLog.innerHTML = "";
  }
  if (startupBootstrapAttempt) {
    startupBootstrapAttempt.textContent = "Attempt: 0";
  }
  if (startupBootstrapProvider) {
    startupBootstrapProvider.textContent = "Preparing provider probes...";
  }
}

async function triggerStartupBrainLeaderSelection(options = {}) {
  if (startupBrainTriggerInFlight) {
    return { started: false, running: true, reason: "already_running" };
  }
  startupBrainTriggerInFlight = true;
  const reason = String(options.reason || "launcher").trim().slice(0, 80) || "launcher";
  const silent = Boolean(options.silent);
  const showBootstrap = options.showBootstrap !== false;
  try {
    if (showBootstrap) {
      startupBootstrapForced = true;
      resetStartupBootstrapCycle({ keepForced: true });
      setStartupBootstrapActive(true);
      setStartupBootstrapAvatarState("thinking");
      if (startupBootstrapStatus) {
        startupBootstrapStatus.textContent = "Hello, I am Asolaria. Right now, we are loading the main brain...";
      }
      setHumanLauncherStatus("Asolaria is checking for a healthy main brain...", "live");
    }

    const data = await apiPost("/api/startup/brain-leader/run", {
      reason,
      continuous: true
    });
    if (!silent) {
      if (data.started) {
        logEvent("Startup brain leader probe launched.");
      } else if (data.running) {
        logEvent("Startup brain leader probe is already running.");
      }
    }
    await refreshHealth();
    return data;
  } catch (error) {
    if (!silent) {
      logEvent(`Startup brain trigger failed: ${error.message}`);
    }
    setHumanLauncherStatus(`Startup probe failed: ${error.message}`, "error");
    throw error;
  } finally {
    startupBrainTriggerInFlight = false;
  }
}

function shouldAutoRunStartupBrainLeader() {
  try {
    if (sessionStorage.getItem(STARTUP_BRAIN_AUTORUN_STORAGE_KEY) === "1") {
      return false;
    }
    sessionStorage.setItem(STARTUP_BRAIN_AUTORUN_STORAGE_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

async function speakStartupBootstrapLine(text) {
  const line = normalizeSpeakableText(text, 220);
  if (!line) {
    return false;
  }
  try {
    return await speakTextViaBrowser(line);
  } catch {
    return false;
  }
}

function renderStartupBootstrapProbeLog(probes = []) {
  if (!startupBootstrapProbeLog) return;
  startupBootstrapProbeLog.innerHTML = "";
  const rows = Array.isArray(probes) ? probes.slice(-8) : [];
  for (const probe of rows) {
    const providerLabel = formatBrainProviderName(probe?.provider, probe?.model);
    const healthy = Boolean(probe?.healthy);
    const latencyMs = Number(probe?.latencyMs);
    const latencyText = Number.isFinite(latencyMs) && latencyMs > 0 ? `${latencyMs}ms` : "n/a";
    const statusLabel = healthy
      ? "ready"
      : String(probe?.error || "unhealthy").trim() || "unhealthy";
    const item = document.createElement("li");
    item.textContent = `${providerLabel}: ${statusLabel} (${latencyText})`;
    startupBootstrapProbeLog.appendChild(item);
  }
}

async function updateStartupBootstrapFromHealth(data = null) {
  if (!startupBootstrap) return;
  const brainLeader = data && typeof data === "object" ? (data.brainLeader || {}) : {};
  const status = String(brainLeader.status || "idle").trim().toLowerCase();
  const loopStatus = String(brainLeader.loopStatus || "").trim().toLowerCase();
  const searching = Boolean(brainLeader.searching) || status === "probing" || status === "waiting_retry";
  const forcedActive = startupBootstrapForced && !startupBootstrapReadyAnnounced;
  const shouldShow = forcedActive || searching || loopStatus === "retrying" || (!startupBootstrapReadyAnnounced && status === "selected");
  setStartupBootstrapActive(shouldShow);
  if (!shouldShow) return;
  if (!data || !brainLeader || typeof brainLeader !== "object") {
    if (startupBootstrapStatus) {
      startupBootstrapStatus.textContent = "Connecting to Asolaria core...";
    }
    if (startupBootstrapProvider) {
      startupBootstrapProvider.textContent = "Waiting for brain leader status...";
    }
    setStartupBootstrapAvatarState("thinking");
    return;
  }

  const attempt = Math.max(0, Number(brainLeader.attempt || 0));
  const maxAttempts = Math.max(0, Number(brainLeader.maxAttempts || 0));
  const timeoutMs = Math.max(1000, Number(brainLeader.probeTimeoutMs || 30000));
  const loopLabel = loopStatus || status || "idle";
  const selectedProvider = String(brainLeader.selectedProvider || "").trim();
  const selectedModel = String(brainLeader.selectedModel || "").trim();
  const currentProvider = String(brainLeader.currentProvider || "").trim();
  const probes = Array.isArray(brainLeader.probes) ? brainLeader.probes : [];
  const latestProbe = probes.length > 0 ? probes[probes.length - 1] : null;
  const providerLabel = formatBrainProviderName(
    currentProvider || selectedProvider || latestProbe?.provider,
    latestProbe?.model || selectedModel
  );

  if (startupBootstrapAttempt) {
    startupBootstrapAttempt.textContent = maxAttempts > 0
      ? `Attempt: ${attempt}/${maxAttempts}`
      : `Attempt: ${attempt}`;
  }
  if (startupBootstrapTimeout) {
    startupBootstrapTimeout.textContent = `Timeout: ${Math.round(timeoutMs / 1000)}s per provider`;
  }
  if (startupBootstrapLoop) {
    startupBootstrapLoop.textContent = `Loop: ${loopLabel}`;
  }

  renderStartupBootstrapProbeLog(probes);

  if (!startupBootstrapInitialGreetingDone) {
    startupBootstrapInitialGreetingDone = true;
    const intro = "Hello, I am Asolaria, right now, we are loading the main brain.";
    if (startupBootstrapStatus) {
      startupBootstrapStatus.textContent = intro;
    }
    setQuickAvatarStatus(intro, "speaking");
    await speakStartupBootstrapLine(intro);
  }

  if (searching) {
    setStartupBootstrapAvatarState("thinking");
    if (startupBootstrapProvider) {
      startupBootstrapProvider.textContent = `${providerLabel} is being loaded right now.`;
    }
    const providerAnnouncementKey = `${providerLabel}|${attempt}`;
    if (providerAnnouncementKey && providerAnnouncementKey !== startupBootstrapLastProviderAnnounced) {
      startupBootstrapLastProviderAnnounced = providerAnnouncementKey;
      await speakStartupBootstrapLine(`${providerLabel} is being loaded right now.`);
    }
    if (startupBootstrapStatus) {
      startupBootstrapStatus.textContent = "Asolaria is still looking for a healthy main brain...";
    }
    setHumanLauncherStatus("Asolaria is still looking for a healthy model...", "live");
    return;
  }

  if (status === "selected") {
    startupBootstrap.classList.add("is-ready");
    setStartupBootstrapAvatarState("speaking");
    if (startupBootstrapStatus) {
      startupBootstrapStatus.textContent = "Main brain online.";
    }
    if (startupBootstrapProvider) {
      startupBootstrapProvider.textContent = `${formatBrainProviderName(selectedProvider, selectedModel)} is ready.`;
    }
    if (!startupBootstrapReadyAnnounced) {
      startupBootstrapReadyAnnounced = true;
      const readyLine = "Main brain online. How can I help you?";
      setQuickAvatarStatus("Main brain online. How can I help you?", "speaking");
      await speakStartupBootstrapLine(readyLine);
      setHumanLauncherStatus("Main brain online. How can I help you?", "live");
      startupBootstrapStatusTimer = window.setTimeout(() => {
        setStartupBootstrapActive(false);
      }, 5200);
    }
    return;
  }

  const shouldWarnFallback = (
    status === "degraded"
    || status === "waiting_retry"
    || status === "error"
    || (latestProbe && !latestProbe.healthy)
  );
  if (!shouldWarnFallback) {
    setStartupBootstrapAvatarState("thinking");
    if (startupBootstrapStatus) {
      startupBootstrapStatus.textContent = "Waiting for startup probe results...";
    }
    if (startupBootstrapProvider) {
      startupBootstrapProvider.textContent = "Preparing provider checks...";
    }
    return;
  }

  const probeSignature = JSON.stringify(probes.slice(-4));
  if (probeSignature && probeSignature !== startupBootstrapLastProbeSignature) {
    startupBootstrapLastProbeSignature = probeSignature;
    const fallbackLine = "Current model did not reply in time. I will keep switching models until a brain responds.";
    if (startupBootstrapStatus) {
      startupBootstrapStatus.textContent = fallbackLine;
    }
    if (startupBootstrapProvider) {
      startupBootstrapProvider.textContent = "Provider failed. Rotating to the next candidate...";
    }
    setStartupBootstrapAvatarState("error");
    setHumanLauncherStatus("Provider failed. Asolaria is switching to the next model.", "error");
    await speakStartupBootstrapLine(fallbackLine);
  }
}

function setHumanLauncherStatus(text = "", level = "") {
  if (!humanLauncherStatus) return;
  humanLauncherStatus.textContent = String(text || "").trim() || "Ready. Pick a mode to start.";
  humanLauncherStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    humanLauncherStatus.classList.add("is-live");
  } else if (level === "error") {
    humanLauncherStatus.classList.add("is-error");
  }
}

function syncLauncherModeCards() {
  const cards = [launchSimpleUiBtn, launchAdminUiBtn, launchSuperAdminUiBtn].filter(Boolean);
  for (const card of cards) {
    const target = normalizeUiExperienceMode(card.dataset.uiModeTarget || "", "simple");
    const active = target === uiExperienceMode;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function setSuperAdminConsoleStatus(text = "", level = "") {
  if (!superAdminConsoleStatus) return;
  superAdminConsoleStatus.textContent = String(text || "").trim() || "Waiting for super admin mode...";
  superAdminConsoleStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    superAdminConsoleStatus.classList.add("is-live");
  } else if (level === "error") {
    superAdminConsoleStatus.classList.add("is-error");
  }
}

function renderSuperAdminTerminalPanel(metaNode, outputNode, panel, fallbackMeta = "") {
  if (metaNode) {
    metaNode.textContent = String(panel?.meta || fallbackMeta || "").trim() || fallbackMeta;
  }
  if (outputNode) {
    outputNode.textContent = String(panel?.output || "").trim() || "No terminal output available yet.";
    outputNode.scrollTop = 0;
  }
}

function ensureSuperAdminDirectThread() {
  upsertChatThread({
    id: SUPER_ADMIN_DIRECT_CHAT_ID,
    title: SUPER_ADMIN_DIRECT_THREAD_TITLE
  });
  if (!Array.isArray(chatTurnsByThread[SUPER_ADMIN_DIRECT_CHAT_ID])) {
    chatTurnsByThread[SUPER_ADMIN_DIRECT_CHAT_ID] = [];
  }
}

function setSuperAdminDirectStatus(text = "", level = "") {
  if (!superAdminDirectStatus) return;
  superAdminDirectStatus.textContent = String(text || "").trim() || "Direct Codex lane idle.";
  superAdminDirectStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    superAdminDirectStatus.classList.add("is-live");
  } else if (level === "error") {
    superAdminDirectStatus.classList.add("is-error");
  }
}

function renderSuperAdminDirectWindow() {
  if (!superAdminDirectTranscript) {
    return;
  }
  ensureSuperAdminDirectThread();
  const turns = Array.isArray(chatTurnsByThread[SUPER_ADMIN_DIRECT_CHAT_ID])
    ? chatTurnsByThread[SUPER_ADMIN_DIRECT_CHAT_ID]
    : [];
  superAdminDirectTranscript.innerHTML = "";
  if (superAdminDirectMeta) {
    superAdminDirectMeta.textContent = "Internal-only lane. RouteLLM, routed shortcuts, and external fallback stay off here.";
  }
  if (turns.length < 1) {
    const empty = document.createElement("div");
    empty.className = "super-admin-direct-empty";
    empty.textContent = "Send a direct message to talk to internal Codex without routed shortcuts.";
    superAdminDirectTranscript.appendChild(empty);
    return;
  }
  for (const turn of turns.slice(-24)) {
    const role = String(turn?.role || "").toLowerCase() === "user" ? "user" : "assistant";
    const row = document.createElement("div");
    row.className = `super-admin-direct-line super-admin-direct-line--${role}`;
    const meta = document.createElement("div");
    meta.className = "super-admin-direct-line-meta";
    const at = turn?.at ? new Date(turn.at) : null;
    const timeLabel = at && Number.isFinite(at.getTime()) ? at.toLocaleTimeString() : "n/a";
    meta.textContent = role === "user"
      ? `Owner · ${timeLabel}`
      : `Direct Codex · ${timeLabel}`;
    const body = document.createElement("div");
    body.className = "super-admin-direct-line-body";
    body.textContent = String(turn?.text || "").trim() || "(empty)";
    row.append(meta, body);
    superAdminDirectTranscript.appendChild(row);
  }
  superAdminDirectTranscript.scrollTop = superAdminDirectTranscript.scrollHeight;
}

async function loadSuperAdminDirectConversation() {
  ensureSuperAdminDirectThread();
  try {
    await loadConversationTurns(SUPER_ADMIN_DIRECT_CHAT_ID, { render: false });
    renderSuperAdminDirectWindow();
    setSuperAdminDirectStatus("Direct Codex lane ready.", "live");
  } catch (error) {
    renderSuperAdminDirectWindow();
    setSuperAdminDirectStatus(`Direct conversation unavailable: ${error.message}`, "error");
  }
}

function openSuperAdminDirectThread() {
  ensureSuperAdminDirectThread();
  chatRouteMode = "direct";
  if (chatRouteModeSelect) {
    chatRouteModeSelect.value = "direct";
  }
  saveChatWorkspaceState();
  applyUiExperienceMode("advanced");
  applyChatRailSection("chats");
  setActiveChatThread(SUPER_ADMIN_DIRECT_CHAT_ID, { load: true });
  if (chatInput) {
    chatInput.focus();
  }
  setHumanLauncherStatus("Super Admin direct thread opened.", "live");
  setSuperAdminDirectStatus("Direct Codex lane ready.", "live");
}

async function submitSuperAdminDirectMessage() {
  const text = String(superAdminDirectInput?.value || "").trim();
  if (!text) {
    setSuperAdminDirectStatus("Type a direct message first.", "error");
    return;
  }
  ensureSuperAdminDirectThread();
  appendTurnToThread(SUPER_ADMIN_DIRECT_CHAT_ID, {
    role: "user",
    text,
    at: new Date().toISOString(),
    meta: {
      source: "super-admin-direct",
      chatId: SUPER_ADMIN_DIRECT_CHAT_ID,
      routeMode: "direct"
    }
  });
  setSuperAdminDirectStatus("Direct Codex lane thinking...", "live");
  if (superAdminDirectInput) {
    superAdminDirectInput.value = "";
  }
  if (superAdminDirectSend) {
    superAdminDirectSend.disabled = true;
  }
  if (superAdminDirectClearBtn) {
    superAdminDirectClearBtn.disabled = true;
  }
  try {
    const data = await apiPost("/api/chat", {
      message: text,
      chatId: SUPER_ADMIN_DIRECT_CHAT_ID,
      routeMode: "direct"
    });
    if (data.job?.id) {
      appendTurnToThread(SUPER_ADMIN_DIRECT_CHAT_ID, {
        role: "assistant",
        text: `${String(data.reply || "Queued direct Codex task.")}\nWaiting for completion...`,
        at: new Date().toISOString(),
        meta: {
          source: "brain",
          provider: "codex",
          chatId: SUPER_ADMIN_DIRECT_CHAT_ID,
          routeMode: "direct"
        }
      });
      setSuperAdminDirectStatus(`Direct Codex queued: ${data.job.id}`, "live");
      trackJob(data.job.id, {
        onUpdate: (job) => {
          setSuperAdminDirectStatus(`Direct Codex running: ${job.status}`, "live");
        },
        onCompleted: async (job) => {
          try {
            await loadConversationTurns(SUPER_ADMIN_DIRECT_CHAT_ID, { render: false });
          } catch {}
          renderSuperAdminDirectWindow();
          setSuperAdminDirectStatus(
            `Direct Codex replied${job?.elapsedMs ? ` in ${job.elapsedMs}ms` : ""}.`,
            "live"
          );
          refreshHealth();
          refreshMemory();
        },
        onFailed: (job) => {
          appendTurnToThread(SUPER_ADMIN_DIRECT_CHAT_ID, {
            role: "assistant",
            text: `Direct Codex failed: ${String(job?.error || "Unknown error")}`,
            at: new Date().toISOString(),
            meta: {
              source: "error",
              chatId: SUPER_ADMIN_DIRECT_CHAT_ID,
              routeMode: "direct"
            }
          });
          setSuperAdminDirectStatus(`Direct Codex failed: ${String(job?.error || "Unknown error")}`, "error");
          refreshHealth();
          refreshMemory();
        }
      });
      return;
    }
    const reply = String(data.reply || "Direct Codex replied.");
    appendTurnToThread(SUPER_ADMIN_DIRECT_CHAT_ID, {
      role: "assistant",
      text: reply,
      at: new Date().toISOString(),
      meta: {
        source: "brain",
        provider: "codex",
        chatId: SUPER_ADMIN_DIRECT_CHAT_ID,
        routeMode: "direct"
      }
    });
    setSuperAdminDirectStatus("Direct Codex replied.", "live");
    refreshMemory();
  } catch (error) {
    appendTurnToThread(SUPER_ADMIN_DIRECT_CHAT_ID, {
      role: "assistant",
      text: `Direct Codex failed: ${String(error?.message || error || "unknown_error")}`,
      at: new Date().toISOString(),
      meta: {
        source: "error",
        chatId: SUPER_ADMIN_DIRECT_CHAT_ID,
        routeMode: "direct"
      }
    });
    setSuperAdminDirectStatus(`Direct Codex failed: ${String(error?.message || error || "unknown_error")}`, "error");
  } finally {
    if (superAdminDirectSend) {
      superAdminDirectSend.disabled = false;
    }
    if (superAdminDirectClearBtn) {
      superAdminDirectClearBtn.disabled = false;
    }
    if (superAdminDirectInput) {
      superAdminDirectInput.focus();
    }
  }
}

async function refreshSuperAdminTerminals(options = {}) {
  const force = Boolean(options.force);
  if (!force && uiExperienceMode !== "advanced") {
    return;
  }
  if (superAdminTerminalRefreshInFlight) {
    return;
  }
  superAdminTerminalRefreshInFlight = true;
  setSuperAdminConsoleStatus("Syncing terminal feeds...", "live");
  try {
    const data = await request("/api/super-admin/terminals");
    const panels = data?.panels && typeof data.panels === "object" ? data.panels : {};
    const brainPanel = panels.brain || {};
    const adminPanel = panels.admin || {};
    const signature = JSON.stringify([
      brainPanel.meta || "",
      brainPanel.output || "",
      adminPanel.meta || "",
      adminPanel.output || ""
    ]);
    superAdminTerminalLastSignature = signature;
    renderSuperAdminTerminalPanel(
      superAdminBrainMeta,
      superAdminBrainOutput,
      brainPanel,
      "Main brain provider and model will appear here."
    );
    renderSuperAdminTerminalPanel(
      superAdminAdminMeta,
      superAdminAdminOutput,
      adminPanel,
      "Runtime control and startup status will appear here."
    );
    const updatedAt = formatLocalTimestamp(data?.generatedAt || "");
    setSuperAdminConsoleStatus(
      updatedAt === "n/a"
        ? "Terminal feeds live."
        : `Terminal feeds live. Updated ${updatedAt}.`,
      "live"
    );
  } catch (error) {
    setSuperAdminConsoleStatus(`Terminal feeds unavailable: ${error.message}`, "error");
    if (superAdminBrainOutput && !String(superAdminBrainOutput.textContent || "").trim()) {
      superAdminBrainOutput.textContent = "Brain terminal feed unavailable.";
    }
    if (superAdminAdminOutput && !String(superAdminAdminOutput.textContent || "").trim()) {
      superAdminAdminOutput.textContent = "Admin terminal feed unavailable.";
    }
  } finally {
    superAdminTerminalRefreshInFlight = false;
  }
}

function readNatural20DailyState() {
  try {
    const raw = localStorage.getItem(NATURAL20_DAILY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeNatural20DailyState(snapshot = {}) {
  try {
    localStorage.setItem(NATURAL20_DAILY_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort local cache only.
  }
}

function updateNatural20ButtonState(snapshot = {}) {
  if (!natural20DailyBtn) return;
  const checkedDay = String(snapshot.day || "").trim();
  const today = buildLocalDayKey();
  const isFresh = checkedDay === today;
  natural20DailyBtn.classList.toggle("is-fresh", isFresh);
  const title = String(snapshot.title || snapshot.siteTitle || "").trim();
  natural20DailyBtn.title = title
    ? `Open Natural20.com. Daily check: ${title}`
    : "Open Natural20 daily model update";
}

async function runNatural20DailyStartupCheck(options = {}) {
  const force = Boolean(options.force);
  const silent = Boolean(options.silent);
  const today = buildLocalDayKey();
  const cached = readNatural20DailyState();
  if (!force && String(cached.day || "").trim() === today) {
    updateNatural20ButtonState(cached);
    return cached;
  }
  try {
    const data = await request(`/api/daily-sites/natural20${force ? "?refresh=true" : ""}`);
    const snapshot = {
      day: today,
      checkedAt: String(data.checkedAt || new Date().toISOString()),
      title: String(data.title || "").trim(),
      summary: String(data.summary || "").trim(),
      url: String(data.url || NATURAL20_URL).trim() || NATURAL20_URL
    };
    writeNatural20DailyState(snapshot);
    updateNatural20ButtonState(snapshot);
    if (!silent) {
      logEvent(snapshot.title ? `Natural20 daily check: ${snapshot.title}` : "Natural20 daily check complete.");
    }
    return snapshot;
  } catch (error) {
    updateNatural20ButtonState(cached);
    if (!silent) {
      logEvent(`Natural20 daily check failed: ${error.message}`);
    }
    return cached;
  }
}

function scrollToDashboardTarget(target) {
  if (!target || typeof target.scrollIntoView !== "function") {
    return;
  }
  target.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function openNatural20Daily(options = {}) {
  const force = Boolean(options.force);
  const popup = window.open(NATURAL20_URL, "_blank", "noopener");
  if (!popup) {
    logEvent("Natural20 popup blocked by browser.");
  }
  await runNatural20DailyStartupCheck({
    force,
    silent: false
  });
}

function handleDashboardLauncherAction(actionId) {
  const action = String(actionId || "").trim().toLowerCase();
  if (!action) {
    return;
  }
  if (action === "chat") {
    scrollToDashboardTarget(brainConsolePanel);
    if (chatInput) {
      chatInput.focus();
    }
    setHumanLauncherStatus("Chat dashboard ready.", "live");
    return;
  }
  if (action === "runtime") {
    applyUiExperienceMode(uiExperienceMode === "advanced" ? "advanced" : "admin");
    applyActionGroupFilter("runtime");
    scrollToDashboardTarget(quickRuntimeControl || colonyDashboardCard);
    setHumanLauncherStatus("Runtime dashboard ready.", "live");
    return;
  }
  if (action === "transcript") {
    scrollToDashboardTarget(quickRealtimeCard);
    setHumanLauncherStatus("Transcript dashboard ready.", "live");
    return;
  }
  if (action === "phone") {
    if (quickOpenPhoneBtn) {
      quickOpenPhoneBtn.click();
    }
    setHumanLauncherStatus("Phone dashboard opened.", "live");
    return;
  }
  if (action === "natural20") {
    void openNatural20Daily({ force: true });
    setHumanLauncherStatus("Natural20 daily update opened.", "live");
    return;
  }
  if (action === "super_admin") {
    applyUiExperienceMode("advanced");
    scrollToDashboardTarget(superAdminBrainOutput || brainConsolePanel);
    setHumanLauncherStatus("Super Admin dashboard ready.", "live");
  }
}

function setQuickRuntimeActionStatus(text = "", level = "") {
  if (!quickRuntimeActionStatus) return;
  quickRuntimeActionStatus.textContent = String(text || "").trim() || "Runtime controls are ready.";
  quickRuntimeActionStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    quickRuntimeActionStatus.classList.add("is-live");
  } else if (level === "error") {
    quickRuntimeActionStatus.classList.add("is-error");
  }
}

async function runQuickRuntimeAction(actionId) {
  const action = String(actionId || "").trim();
  if (!action) {
    return;
  }
  const label = action.replace(/_/g, " ");
  setQuickRuntimeActionStatus(`Running ${label}...`, "live");
  try {
    const data = await apiPost("/api/asolaria/runtime-actions/run", {
      action,
      source: "dashboard_quick_runtime"
    });
    const title = String(data?.action?.title || label);
    setQuickRuntimeActionStatus(`Asolaria queued: ${title}.`, "live");
    logEvent(`Runtime action queued: ${title}.`);
    if (action === "start_asolaria") {
      setHumanLauncherStatus("Asolaria startup task queued from runtime controls.", "live");
    }
  } catch (error) {
    const message = String(error?.message || error || "runtime_action_failed");
    setQuickRuntimeActionStatus(`Runtime action failed: ${message}`, "error");
    logEvent(`Runtime action failed (${action}): ${message}`);
  }
}

async function saveLauncherVoicePreferences(enableVoice, autoSpeakReplies) {
  const voiceOn = Boolean(enableVoice);
  const autoSpeakOn = Boolean(autoSpeakReplies);
  voiceEnabled = voiceOn;
  voiceAutoSpeakReplies = autoSpeakOn;
  if (voiceEnabledSelect) {
    voiceEnabledSelect.value = voiceOn ? "on" : "off";
  }
  if (voiceAutoSpeakSelect) {
    voiceAutoSpeakSelect.value = autoSpeakOn ? "on" : "off";
  }
  try {
    const data = await apiPost("/api/settings", {
      voiceEnabled: voiceOn,
      voiceAutoSpeakReplies: autoSpeakOn
    });
    applySettingsUi(data?.settings || {});
    refreshHealth();
  } catch (error) {
    logEvent(`Launcher voice preset failed: ${error.message}`);
    setHumanLauncherStatus(`Voice preset failed: ${error.message}`, "error");
  }
}

async function activateHumanLauncherMode(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "speak") {
    if (quickVoiceListening || quickVoiceRequested) {
      stopQuickVoiceSession();
      setHumanLauncherStatus("Voice mode paused. Ask Asolaria to resume when ready.", "live");
      return;
    }
    await triggerStartupBrainLeaderSelection({
      reason: "launcher_speak",
      silent: true,
      showBootstrap: true
    }).catch(() => {});
    applyUiExperienceMode("simple");
    await saveLauncherVoicePreferences(true, true);
    const started = startQuickVoiceSession({ oneShot: false });
    if (!started) {
      setHumanLauncherStatus("Voice start failed. Check microphone/browser permissions.", "error");
      return;
    }
    setQuickAvatarStatus("Listening live. Speak when ready.", "listening");
    setHumanLauncherStatus("Asolaria dashboard live. Ask Asolaria to start any service.", "live");
    return;
  }
  if (normalized === "text") {
    stopQuickVoiceSession();
    applyUiExperienceMode("simple");
    await saveLauncherVoicePreferences(false, false);
    if (chatInput) {
      chatInput.focus();
    }
    setQuickAvatarStatus("Text mode active.", "idle");
    setHumanLauncherStatus("Text-only mode active.", "live");
    return;
  }
  if (normalized === "hybrid") {
    stopQuickVoiceSession();
    applyUiExperienceMode("simple");
    await saveLauncherVoicePreferences(true, true);
    if (chatInput) {
      chatInput.focus();
    }
    setQuickAvatarStatus("Type your message. Asolaria will speak replies.", "thinking");
    setHumanLauncherStatus("Hybrid mode active: type input, spoken output.", "live");
    return;
  }
  if (normalized === "admin") {
    stopQuickVoiceSession();
    applyUiExperienceMode("admin");
    setHumanLauncherStatus("Admin mode active.", "live");
    return;
  }
  stopQuickVoiceSession();
  applyUiExperienceMode("advanced");
  setHumanLauncherStatus("Super Admin mode active. Brain and admin terminals are visible.", "live");
}

function syncQuickRuntimeFromRenderedCards() {
  if (quickColonyStatus) {
    const text = String(colonySummary?.textContent || "").trim();
    quickColonyStatus.textContent = text ? `Agent Colony: ${text}` : "Agent Colony: unavailable";
  }
  if (quickPhoneStatus) {
    const text = String(phoneAgentSummary?.textContent || "").trim();
    quickPhoneStatus.textContent = text ? `Phone Lane: ${text}` : "Phone Lane: unavailable";
  }
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function escapeSpeechGrammarToken(value) {
  return String(value || "")
    .replace(/[;|=<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectSpeechHintWords(wakeWord = "") {
  const seed = [...VOICE_KNOWN_WAKE_WORDS, String(wakeWord || "").trim()];
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

function applySpeechRecognitionHints(recognition, wakeWord = "") {
  if (!recognition) return;
  const hints = collectSpeechHintWords(wakeWord);
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

function appendVoiceTranscriptToChat(text) {
  const trimmed = String(text || "").replace(/\s+/g, " ").trim();
  if (!trimmed || !chatInput) return "";
  const previous = String(chatInput.value || "").trim();
  chatInput.value = previous ? `${previous}\n${trimmed}` : trimmed;
  chatInput.focus();
  return trimmed;
}

function mirrorQuickRealtimeLineToChat(line, options = {}) {
  if (!realtimeTranscribeState.autoMirrorToChat) {
    return "";
  }
  const trimmed = normalizeRealtimeTranscriptChunk(line);
  if (!trimmed || trimmed === realtimeTranscribeState.lastMirroredChatLine) {
    return "";
  }
  const activeChatId = normalizeChatThreadId(activeChatThreadId, DEFAULT_CHAT_THREAD_ID);
  if (activeChatId) {
    const laneId = normalizeRealtimeFlowLaneId(options.laneId || "default");
    const direction = normalizeRealtimeFlowDirection(options.direction, "incoming");
    const source = normalizeRealtimeTranscriptChunk(options.source || "");
    const visibleLine = `[Live Transcript] ${trimmed}`;
    appendTurnToThread(activeChatId, {
      role: "user",
      text: visibleLine,
      at: new Date().toISOString(),
      meta: {
        source: "live_transcript",
        laneId,
        direction,
        captureSource: normalizeRealtimeCaptureSource(realtimeTranscribeState.captureSource, "tab_audio"),
        mode: normalizeRealtimeCaptureSource(realtimeTranscribeState.mode, "tab_audio"),
        transcriptSource: normalizeRealtimeTranscriptSource(realtimeTranscribeState.transcriptSource, "live"),
        bridgeSource: source || "live"
      }
    });
    if (activeChatId === normalizeChatThreadId(activeChatThreadId, DEFAULT_CHAT_THREAD_ID)) {
      renderActiveChatMessages();
    }
  }
  const mirrored = appendVoiceTranscriptToChat(trimmed);
  if (mirrored) {
    realtimeTranscribeState.lastMirroredChatLine = mirrored;
  }
  return mirrored;
}

function normalizeRealtimeCaptureSource(value, fallback = "tab_audio") {
  const normalizedRaw = String(value || "").trim().toLowerCase();
  const normalized = normalizedRaw === "verve_caption" ? "custom_caption" : normalizedRaw;
  if (REALTIME_TRANSCRIBE_CAPTURE_SOURCES.includes(normalized)) {
    return normalized;
  }
  const fallbackRaw = String(fallback || "").trim().toLowerCase();
  const safeFallback = fallbackRaw === "verve_caption" ? "custom_caption" : fallbackRaw;
  if (REALTIME_TRANSCRIBE_CAPTURE_SOURCES.includes(safeFallback)) {
    return safeFallback;
  }
  return "tab_audio";
}

function normalizeRealtimeTranscriptSource(value, fallback = "live") {
  const normalized = String(value || "").trim().toLowerCase();
  if (REALTIME_TRANSCRIPT_SOURCES.includes(normalized)) {
    return normalized;
  }
  const safeFallback = String(fallback || "").trim().toLowerCase();
  if (REALTIME_TRANSCRIPT_SOURCES.includes(safeFallback)) {
    return safeFallback;
  }
  return "live";
}

function normalizeRealtimeBridgePushToken(value, fallback = "") {
  const token = String(value || "").trim();
  if (token) {
    return token.slice(0, 240);
  }
  return String(fallback || "").trim().slice(0, 240);
}

function describeRealtimeTranscriptSource(value) {
  const source = normalizeRealtimeTranscriptSource(value, "live");
  if (source === "bridge") {
    return "bridge captions";
  }
  if (source === "all") {
    return "live + bridge";
  }
  return "live engine";
}

function isCaptionBridgeSource(value) {
  const source = normalizeRealtimeCaptureSource(value);
  return REALTIME_CAPTION_BRIDGE_SOURCES.includes(source);
}

function getCaptionBridgeSourceLabel(value) {
  const source = normalizeRealtimeCaptureSource(value);
  if (source === "custom_caption") return "Custom captions";
  return "Google Meet captions";
}

function normalizeCaptionBridgeOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

function buildCaptionBridgeOriginCandidates() {
  const candidates = [];
  const seen = new Set();
  const add = (value) => {
    const normalized = normalizeCaptionBridgeOrigin(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    candidates.push(normalized);
  };

  const current = normalizeCaptionBridgeOrigin(window.location.origin);
  const httpPort = Number(latestHealthSnapshot?.networkPolicy?.http?.port || window.location.port || 4781);
  const httpsPort = Number(latestHealthSnapshot?.networkPolicy?.https?.port || 5443);
  const remoteResolved = normalizeCaptionBridgeOrigin(
    latestHealthSnapshot?.networkPolicy?.connectionResolvedRemoteBaseUrl
      || latestHealthSnapshot?.networkPolicy?.connectionRemoteBaseUrl
      || ""
  );

  if (current.startsWith("https://")) {
    add(current);
  }
  if (remoteResolved.startsWith("https://")) {
    add(remoteResolved);
  }
  // Always include local HTTPS bridge targets so scripts copied early still work from secure pages like Meet.
  add(`https://127.0.0.1:${httpsPort}`);
  add(`https://localhost:${httpsPort}`);
  if (current.startsWith("http://")) {
    add(current);
  }
  add(`http://127.0.0.1:${httpPort}`);
  add(`http://localhost:${httpPort}`);

  return candidates;
}

function resolveCaptionBridgeIngestOrigin() {
  const candidates = buildCaptionBridgeOriginCandidates();
  if (candidates.length < 1) {
    return window.location.origin;
  }
  return candidates[0];
}

function readCaptionBridgePushTokenFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const token = String(
      params.get("bridgeToken")
      || params.get("captionToken")
      || params.get("token")
      || ""
    ).trim();
    return token.slice(0, 240);
  } catch {
    return "";
  }
}

function getQuickRealtimeBridgePushToken() {
  return normalizeRealtimeBridgePushToken(
    realtimeTranscribeState.bridgePushToken || quickRealtimeBridgeTokenInput?.value || readCaptionBridgePushTokenFromUrl(),
    readCaptionBridgePushTokenFromUrl()
  );
}

function describeRealtimeCaptureSource(value) {
  const source = normalizeRealtimeCaptureSource(value);
  if (source === "google_meet_caption") return "Google Meet captions";
  if (source === "custom_caption") return "custom captions";
  if (source === "server_loopback") return "system audio (server loopback)";
  if (source === "microphone") return "microphone";
  if (source === "window_audio") return "window audio";
  if (source === "screen_audio") return "screen audio";
  return "tab audio";
}

function buildRealtimeCapturePrompt(value) {
  const source = normalizeRealtimeCaptureSource(value);
  if (source === "google_meet_caption") {
    return "Uses Google Meet's own live captions and mirrors text directly into Asolaria.";
  }
  if (source === "custom_caption") {
    return "Uses a custom caption bridge and mirrors lines directly into Asolaria.";
  }
  if (source === "server_loopback") {
    return "Captures Windows system audio directly on server. No Chrome picker required.";
  }
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

function buildRealtimeNoAudioTrackMessage(value) {
  const source = normalizeRealtimeCaptureSource(value);
  if (source === "google_meet_caption") {
    return "No Google Meet captions detected. Enable captions in Meet first.";
  }
  if (source === "custom_caption") {
    return "No caption lines detected from custom bridge. Keep transcript panel open and rerun bridge.";
  }
  if (source === "server_loopback") {
    return "No system audio captured. Check selected Windows output device or FFmpeg loopback.";
  }
  if (source === "microphone") {
    return "No microphone track captured. Check mic permissions and selected input device.";
  }
  if (source === "screen_audio") {
    return "No audio track captured. In the picker, enable share system audio.";
  }
  if (source === "window_audio") {
    return "No audio track captured. Re-start and enable window audio sharing.";
  }
  return "No audio track captured. Re-start and enable Share tab audio.";
}

function buildQuickRealtimeDisplayMediaOptions(value) {
  const source = normalizeRealtimeCaptureSource(value);
  const base = {
    video: {
      frameRate: {
        ideal: 4,
        max: 8
      }
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

async function requestQuickRealtimeCaptureStream(value) {
  const source = normalizeRealtimeCaptureSource(value);
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
  const preferredOptions = buildQuickRealtimeDisplayMediaOptions(source);
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
    return devices.getDisplayMedia({
      video: true,
      audio: true
    });
  }
}

function syncQuickRealtimeCaptureSourceControl() {
  if (!quickRealtimeSourceSelect) {
    return;
  }
  const selected = normalizeRealtimeCaptureSource(
    quickRealtimeSourceSelect.value || realtimeTranscribeState.captureSource,
    realtimeTranscribeState.captureSource
  );
  if (!Array.from(quickRealtimeSourceSelect.options).some((option) => option.value === selected)) {
    const option = document.createElement("option");
    option.value = selected;
    option.textContent = `${describeRealtimeCaptureSource(selected)} (saved)`;
    quickRealtimeSourceSelect.appendChild(option);
  }
  quickRealtimeSourceSelect.value = selected;
  realtimeTranscribeState.captureSource = selected;
}

function syncQuickRealtimeTranscriptSourceControl() {
  if (!quickRealtimeTranscriptSourceSelect) {
    return;
  }
  const selected = normalizeRealtimeTranscriptSource(
    quickRealtimeTranscriptSourceSelect.value || realtimeTranscribeState.transcriptSource,
    realtimeTranscribeState.transcriptSource
  );
  if (!Array.from(quickRealtimeTranscriptSourceSelect.options).some((option) => option.value === selected)) {
    const option = document.createElement("option");
    option.value = selected;
    option.textContent = `${describeRealtimeTranscriptSource(selected)} (saved)`;
    quickRealtimeTranscriptSourceSelect.appendChild(option);
  }
  quickRealtimeTranscriptSourceSelect.value = selected;
  realtimeTranscribeState.transcriptSource = selected;
}

function syncQuickRealtimeBridgeTokenControl() {
  if (!quickRealtimeBridgeTokenInput) {
    return;
  }
  const token = normalizeRealtimeBridgePushToken(
    quickRealtimeBridgeTokenInput.value || realtimeTranscribeState.bridgePushToken,
    realtimeTranscribeState.bridgePushToken
  );
  quickRealtimeBridgeTokenInput.value = token;
  realtimeTranscribeState.bridgePushToken = token;
}

function resolveQuickRealtimePreset(preset) {
  const normalized = String(preset || "").trim().toLowerCase();
  if (normalized === "meet" || normalized === "meeting" || normalized === "meet_caption") {
    return {
      captureSource: "google_meet_caption",
      transcriptSource: "bridge",
      forceMirrorToChat: true,
      label: "Meeting Captions"
    };
  }
  if (normalized === "window" || normalized === "window_audio") {
    return {
      captureSource: "window_audio",
      transcriptSource: "live",
      forceMirrorToChat: false,
      label: "Window Audio"
    };
  }
  return {
    captureSource: "tab_audio",
    transcriptSource: "live",
    forceMirrorToChat: false,
    label: "Tab Audio"
  };
}

function applyQuickRealtimePreset(preset, options = {}) {
  const resolved = resolveQuickRealtimePreset(preset);
  const captureSource = normalizeRealtimeCaptureSource(
    resolved.captureSource,
    realtimeTranscribeState.captureSource
  );
  const transcriptSource = normalizeRealtimeTranscriptSource(
    resolved.transcriptSource,
    realtimeTranscribeState.transcriptSource
  );
  realtimeTranscribeState.captureSource = captureSource;
  realtimeTranscribeState.transcriptSource = transcriptSource;
  if (resolved.forceMirrorToChat) {
    realtimeTranscribeState.autoMirrorToChat = true;
  }
  if (quickRealtimeSourceSelect) {
    quickRealtimeSourceSelect.value = captureSource;
  }
  if (quickRealtimeTranscriptSourceSelect) {
    quickRealtimeTranscriptSourceSelect.value = transcriptSource;
  }
  syncQuickRealtimeCaptureSourceControl();
  syncQuickRealtimeTranscriptSourceControl();
  refreshQuickRealtimeControls();
  if (!options.skipStatus) {
    setQuickRealtimeStatus(
      `Preset ready: ${resolved.label}.`,
      "live"
    );
  }
  saveRealtimeFlowPrefs();
  return {
    ...resolved,
    captureSource,
    transcriptSource
  };
}

async function startQuickRealtimePreset(preset) {
  const resolved = applyQuickRealtimePreset(preset, { skipStatus: true });
  const targetSource = normalizeRealtimeCaptureSource(
    resolved.captureSource,
    realtimeTranscribeState.captureSource
  );
  if (realtimeTranscribeState.active) {
    const currentSource = normalizeRealtimeCaptureSource(
      realtimeTranscribeState.mode || realtimeTranscribeState.captureSource,
      realtimeTranscribeState.captureSource
    );
    if (currentSource !== targetSource) {
      stopQuickRealtimeTranscription({
        reason: `Switching to ${resolved.label}...`,
        level: "live"
      });
      const deadlineMs = Date.now() + 2800;
      while (realtimeTranscribeState.active && Date.now() < deadlineMs) {
        await sleepMs(80);
      }
      if (realtimeTranscribeState.active) {
        throw new Error("Current capture is still stopping. Click Stop once, then retry.");
      }
    } else {
      setQuickRealtimeStatus(`Already capturing ${resolved.label}.`, "live");
      return;
    }
  }
  await startQuickRealtimeTranscription({ captureSource: targetSource });
  if (isCaptionBridgeSource(targetSource)) {
    const bridgePushToken = getQuickRealtimeBridgePushToken();
    const script = targetSource === "custom_caption"
      ? buildCustomCaptionBridgeScript({
        sessionId: realtimeTranscribeState.sessionId,
        bridgeToken: bridgePushToken
      })
      : buildMeetCaptionBridgeScript({
        sessionId: realtimeTranscribeState.sessionId,
        bridgeToken: bridgePushToken
      });
    try {
      await copyTextToClipboard(script);
      quickRealtimePasteHelperPayload = {
        slotLabel: "A",
        laneId: "meet_a",
        script
      };
      setQuickRealtimeStatus(
        "Bridge script copied. Paste once in the meeting tab DevTools console to stream captions.",
        "live"
      );
      openQuickRealtimePasteHelper();
    } catch {
      setQuickRealtimeStatus(
        "Capture started. Click 'Copy Meet Bridge Script' and paste it in the meeting tab console.",
        "live"
      );
    }
  }
}

function getQuickRealtimeDualLaneId(value, fallback = "default") {
  const normalized = normalizeRealtimeFlowLaneId(value);
  if (normalized && normalized !== "default") {
    return normalized;
  }
  return normalizeRealtimeFlowLaneId(fallback);
}

function updateQuickRealtimeDualLaneStatus() {
  const updateOne = (inputEl, statusEl, fallbackLane) => {
    if (!statusEl) {
      return;
    }
    const laneId = getQuickRealtimeDualLaneId(inputEl?.value, fallbackLane);
    if (inputEl) {
      inputEl.value = laneId;
    }
    if (!realtimeTranscribeState.active || !isCaptionBridgeSource(realtimeTranscribeState.mode)) {
      statusEl.textContent = `Lane ${laneId}: idle`;
      return;
    }
    const lane = realtimeTranscribeState.flowLanes?.[laneId] || null;
    if (!lane) {
      statusEl.textContent = `Lane ${laneId}: waiting for captions`;
      return;
    }
    const incomingCount = Array.isArray(lane.incoming) ? lane.incoming.length : 0;
    const stamp = formatQuickFlowLineTime(lane.lastAt || "");
    statusEl.textContent = stamp
      ? `Lane ${laneId}: ${incomingCount} recent lines (${stamp})`
      : `Lane ${laneId}: ${incomingCount} recent lines`;
  };

  updateOne(quickRealtimeLaneAInput, quickRealtimeLaneAStatus, "meet_a");
  updateOne(quickRealtimeLaneBInput, quickRealtimeLaneBStatus, "meet_b");
}

function renderQuickRealtimePasteHelper() {
  if (quickRealtimePasteHelperStatus) {
    const slot = String(quickRealtimePasteHelperPayload.slotLabel || "").trim();
    const laneId = String(quickRealtimePasteHelperPayload.laneId || "").trim();
    quickRealtimePasteHelperStatus.textContent = slot && laneId
      ? `Ready for Meeting ${slot} (lane ${laneId}).`
      : "No bridge script copied yet.";
  }
  if (quickRealtimePasteHelperScript) {
    quickRealtimePasteHelperScript.value = String(quickRealtimePasteHelperPayload.script || "");
  }
}

function openQuickRealtimePasteHelper() {
  renderQuickRealtimePasteHelper();
  if (quickRealtimePasteHelperDialog && typeof quickRealtimePasteHelperDialog.showModal === "function") {
    if (!quickRealtimePasteHelperDialog.open) {
      quickRealtimePasteHelperDialog.showModal();
    }
    return;
  }
  if (quickRealtimePasteHelperScript) {
    quickRealtimePasteHelperScript.focus();
  }
}

async function copyMeetBridgeScriptForLane(slotLabel, laneIdRaw) {
  const laneId = getQuickRealtimeDualLaneId(laneIdRaw, slotLabel === "B" ? "meet_b" : "meet_a");
  const source = await ensureCaptionBridgeModeActive("google_meet_caption");
  const bridgePushToken = getQuickRealtimeBridgePushToken();
  const script = source === "custom_caption"
    ? buildCustomCaptionBridgeScript({
      sessionId: realtimeTranscribeState.sessionId,
      bridgeToken: bridgePushToken
    })
    : buildMeetCaptionBridgeScript({
      sessionId: realtimeTranscribeState.sessionId,
      bridgeToken: bridgePushToken,
      laneId
    });
  await copyTextToClipboard(script);
  quickRealtimePasteHelperPayload = {
    slotLabel: String(slotLabel || "").trim(),
    laneId,
    script
  };
  setQuickRealtimeStatus(
    `Meeting ${slotLabel} script copied for lane ${laneId}. Paste in that meeting tab console.`,
    "live"
  );
  openQuickRealtimePasteHelper();
  updateQuickRealtimeDualLaneStatus();
}

function clearRealtimeServerPollTimer() {
  if (realtimeTranscribeState.serverPollTimer) {
    clearInterval(realtimeTranscribeState.serverPollTimer);
    realtimeTranscribeState.serverPollTimer = 0;
  }
}

function clearMeetCaptionBridgePollTimer() {
  if (realtimeTranscribeState.meetBridgePollTimer) {
    clearInterval(realtimeTranscribeState.meetBridgePollTimer);
    realtimeTranscribeState.meetBridgePollTimer = 0;
  }
}

function clearMeetCaptionBridgeLaneStatusTimer() {
  if (realtimeTranscribeState.meetBridgeLaneStatusTimer) {
    clearInterval(realtimeTranscribeState.meetBridgeLaneStatusTimer);
    realtimeTranscribeState.meetBridgeLaneStatusTimer = 0;
  }
}

function bumpMeetCaptionBridgeRunToken() {
  const current = Math.max(0, Number(realtimeTranscribeState.meetBridgeRunToken || 0));
  const next = current >= 999999999 ? 1 : current + 1;
  realtimeTranscribeState.meetBridgeRunToken = next;
  return next;
}

function clearMeetCaptionBridgePollingError() {
  realtimeTranscribeState.meetBridgeLastErrorMessage = "";
  realtimeTranscribeState.meetBridgeLastErrorAtMs = 0;
}

function reportMeetCaptionBridgePollingError(
  context,
  error,
  runToken = realtimeTranscribeState.meetBridgeRunToken
) {
  if (runToken !== Number(realtimeTranscribeState.meetBridgeRunToken || 0)) {
    return;
  }
  if (!realtimeTranscribeState.active || !isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    return;
  }
  const message = String(error?.message || error || "unknown bridge polling error")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  const nowMs = Date.now();
  const previousMessage = String(realtimeTranscribeState.meetBridgeLastErrorMessage || "");
  const previousAtMs = Math.max(0, Number(realtimeTranscribeState.meetBridgeLastErrorAtMs || 0));
  if (message === previousMessage && (nowMs - previousAtMs) < 2400) {
    return;
  }
  realtimeTranscribeState.meetBridgeLastErrorMessage = message;
  realtimeTranscribeState.meetBridgeLastErrorAtMs = nowMs;
  setQuickRealtimeStatus(`Bridge ${context} issue: ${message}`, "error");
  logEvent(`Bridge ${context} issue: ${message}`);
}

function sleepMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

async function ensureCaptionBridgeModeActive(requestedSource) {
  const normalized = normalizeRealtimeCaptureSource(
    requestedSource || realtimeTranscribeState.captureSource,
    realtimeTranscribeState.captureSource
  );
  const bridgeSource = isCaptionBridgeSource(normalized) ? normalized : "google_meet_caption";
  realtimeTranscribeState.captureSource = bridgeSource;
  syncQuickRealtimeCaptureSourceControl();
  refreshQuickRealtimeControls();
  if (realtimeTranscribeState.active && realtimeTranscribeState.mode !== bridgeSource) {
    stopQuickRealtimeTranscription({
      reason: `Switching to ${getCaptionBridgeSourceLabel(bridgeSource)}...`,
      level: "live"
    });
    const deadlineMs = Date.now() + 2500;
    while (realtimeTranscribeState.active && Date.now() < deadlineMs) {
      await sleepMs(80);
    }
    if (realtimeTranscribeState.active) {
      throw new Error("Current capture is still stopping. Click Stop once and retry.");
    }
  }
  if (!realtimeTranscribeState.active || realtimeTranscribeState.mode !== bridgeSource) {
    await startQuickRealtimeTranscription({ captureSource: bridgeSource });
  }
  if (!realtimeTranscribeState.active || realtimeTranscribeState.mode !== bridgeSource) {
    throw new Error(`Failed to start ${getCaptionBridgeSourceLabel(bridgeSource)} mode.`);
  }
  const sessionId = String(realtimeTranscribeState.sessionId || "").trim();
  if (!sessionId) {
    throw new Error("Bridge session id is missing. Retry starting captions.");
  }
  return bridgeSource;
}

function normalizeRealtimeFlowDirection(value, fallback = "incoming") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "out" || normalized === "egress") return "outgoing";
  if (normalized === "sys" || normalized === "meta") return "system";
  if (normalized === "incoming" || normalized === "outgoing" || normalized === "system") {
    return normalized;
  }
  return fallback === "outgoing" || fallback === "system" ? fallback : "incoming";
}

function normalizeRealtimeFlowLaneId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "_");
  if (!normalized) return "default";
  return normalized.slice(0, 96);
}

function saveRealtimeFlowPrefs() {
  try {
    localStorage.setItem(REALTIME_FLOW_PREFS_KEY, JSON.stringify({
      autoCopy: Boolean(realtimeTranscribeState.autoCopy),
      autoMirrorToChat: Boolean(realtimeTranscribeState.autoMirrorToChat),
      flowMonitorEnabled: Boolean(realtimeTranscribeState.flowMonitorEnabled),
      flowAnalysisEnabled: Boolean(realtimeTranscribeState.flowAnalysisEnabled),
      transcriptSource: normalizeRealtimeTranscriptSource(realtimeTranscribeState.transcriptSource, "live")
    }));
  } catch {
    // best effort
  }
}

function loadRealtimeFlowPrefs() {
  try {
    const raw = localStorage.getItem(REALTIME_FLOW_PREFS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.autoCopy === "boolean") {
        realtimeTranscribeState.autoCopy = parsed.autoCopy;
      }
      if (typeof parsed.autoMirrorToChat === "boolean") {
        realtimeTranscribeState.autoMirrorToChat = parsed.autoMirrorToChat;
      }
      if (typeof parsed.flowMonitorEnabled === "boolean") {
        realtimeTranscribeState.flowMonitorEnabled = parsed.flowMonitorEnabled;
      }
      if (typeof parsed.flowAnalysisEnabled === "boolean") {
        realtimeTranscribeState.flowAnalysisEnabled = parsed.flowAnalysisEnabled;
      }
      if (typeof parsed.transcriptSource === "string") {
        realtimeTranscribeState.transcriptSource = normalizeRealtimeTranscriptSource(
          parsed.transcriptSource,
          realtimeTranscribeState.transcriptSource
        );
      }
    }
  } catch {
    // best effort
  }
}

function saveRealtimeBridgeTokenSession() {
  try {
    const token = normalizeRealtimeBridgePushToken(realtimeTranscribeState.bridgePushToken, "");
    if (!token) {
      sessionStorage.removeItem(REALTIME_BRIDGE_TOKEN_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(REALTIME_BRIDGE_TOKEN_SESSION_KEY, token);
  } catch {
    // best effort
  }
}

function loadRealtimeBridgeTokenSession() {
  try {
    const stored = String(sessionStorage.getItem(REALTIME_BRIDGE_TOKEN_SESSION_KEY) || "").trim();
    if (!stored) {
      return;
    }
    realtimeTranscribeState.bridgePushToken = normalizeRealtimeBridgePushToken(
      stored,
      realtimeTranscribeState.bridgePushToken
    );
  } catch {
    // best effort
  }
}

function trimRealtimeFlowLines(lines) {
  const rows = Array.isArray(lines) ? lines : [];
  if (rows.length <= REALTIME_FLOW_MAX_LINES_PER_DIRECTION) {
    return rows;
  }
  return rows.slice(rows.length - REALTIME_FLOW_MAX_LINES_PER_DIRECTION);
}

function getRealtimeFlowLaneState(laneId, options = {}) {
  const safeLaneId = normalizeRealtimeFlowLaneId(laneId);
  if (!realtimeTranscribeState.flowLanes || typeof realtimeTranscribeState.flowLanes !== "object") {
    realtimeTranscribeState.flowLanes = {};
  }
  const existing = realtimeTranscribeState.flowLanes[safeLaneId];
  if (existing && typeof existing === "object") {
    return existing;
  }
  const state = {
    laneId: safeLaneId,
    source: normalizeRealtimeTranscriptChunk(options.source || ""),
    target: normalizeRealtimeTranscriptChunk(options.target || "transcript"),
    status: normalizeRealtimeTranscriptChunk(options.status || "idle").toLowerCase() || "idle",
    outgoingEnabled: options.outgoingEnabled === false ? false : true,
    lastAnalysis: normalizeRealtimeTranscriptChunk(options.lastAnalysis || ""),
    lastAnalysisAt: options.lastAnalysisAt || "",
    lastAt: options.lastAt || "",
    lastText: normalizeRealtimeTranscriptChunk(options.lastText || ""),
    incoming: [],
    outgoing: [],
    system: []
  };
  realtimeTranscribeState.flowLanes[safeLaneId] = state;
  return state;
}

function resetRealtimeFlowState() {
  realtimeTranscribeState.flowLanes = {};
  realtimeTranscribeState.flowLastUpdatedAt = "";
  renderQuickRealtimeFlowBoard();
}

function mergeRealtimeFlowLaneFromOrchestratorLane(lane = {}) {
  const laneId = normalizeRealtimeFlowLaneId(lane?.laneId || "default");
  const laneState = getRealtimeFlowLaneState(laneId, lane);
  laneState.source = normalizeRealtimeTranscriptChunk(lane?.source || laneState.source || "");
  laneState.target = normalizeRealtimeTranscriptChunk(lane?.target || laneState.target || "transcript") || "transcript";
  laneState.status = normalizeRealtimeTranscriptChunk(lane?.status || laneState.status || "idle").toLowerCase() || "idle";
  laneState.outgoingEnabled = lane?.outgoingEnabled === false ? false : true;
  laneState.lastAnalysis = normalizeRealtimeTranscriptChunk(lane?.lastAnalysis || laneState.lastAnalysis || "");
  laneState.lastAnalysisAt = String(lane?.lastAnalysisAt || laneState.lastAnalysisAt || "");
  laneState.lastAt = String(lane?.lastEntryAt || lane?.lastAt || laneState.lastAt || "");
  laneState.lastText = normalizeRealtimeTranscriptChunk(lane?.lastText || laneState.lastText || "");
  return laneState;
}

function mergeRealtimeFlowLanesFromOrchestrator(lanes = []) {
  if (!Array.isArray(lanes)) {
    return;
  }
  for (const lane of lanes) {
    mergeRealtimeFlowLaneFromOrchestratorLane(lane);
  }
  realtimeTranscribeState.flowLastUpdatedAt = new Date().toISOString();
}

function appendRealtimeFlowEntry(entry = {}) {
  const laneId = normalizeRealtimeFlowLaneId(entry?.laneId || "default");
  const direction = normalizeRealtimeFlowDirection(entry?.direction, "incoming");
  const text = normalizeRealtimeTranscriptChunk(entry?.text);
  if (!text) return;
  const laneState = getRealtimeFlowLaneState(laneId, {
    source: entry?.source || ""
  });
  const row = {
    at: String(entry?.at || new Date().toISOString()),
    text,
    source: normalizeRealtimeTranscriptChunk(entry?.source || laneState.source || "")
  };
  if (direction === "outgoing") {
    laneState.outgoing = trimRealtimeFlowLines([...(laneState.outgoing || []), row]);
  } else if (direction === "system") {
    laneState.system = trimRealtimeFlowLines([...(laneState.system || []), row]);
  } else {
    laneState.incoming = trimRealtimeFlowLines([...(laneState.incoming || []), row]);
  }
  laneState.source = row.source || laneState.source;
  laneState.lastAt = row.at;
  laneState.lastText = row.text;
  realtimeTranscribeState.flowLastUpdatedAt = new Date().toISOString();
}

function formatQuickFlowLineTime(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function renderQuickRealtimeFlowBoard() {
  if (!quickFlowBoard) return;
  if (!realtimeTranscribeState.flowMonitorEnabled) {
    quickFlowBoard.textContent = "Flow monitor is off. Turn it on to map live audio lanes.";
    return;
  }
  const laneRows = Object.values(realtimeTranscribeState.flowLanes || {})
    .filter((lane) => lane && typeof lane === "object")
    .sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || "")));
  if (laneRows.length < 1) {
    quickFlowBoard.textContent = "No lanes detected yet. Start capture or bridge captions to discover flows.";
    return;
  }
  quickFlowBoard.textContent = "";
  const fragment = document.createDocumentFragment();
  for (const lane of laneRows) {
    const card = document.createElement("article");
    card.className = "quick-flow-card";

    const head = document.createElement("div");
    head.className = "quick-flow-card-head";

    const title = document.createElement("strong");
    title.textContent = `Lane ${lane.laneId}`;

    const pills = document.createElement("div");
    pills.className = "quick-flow-pill-row";

    const statePill = document.createElement("span");
    statePill.className = "quick-flow-pill";
    const status = String(lane.status || "").toLowerCase();
    if (status === "active") {
      statePill.classList.add("is-live");
    } else if (status === "stale") {
      statePill.classList.add("is-stale");
    }
    statePill.textContent = `Status: ${status || "idle"}`;

    const routePill = document.createElement("span");
    routePill.className = "quick-flow-pill";
    routePill.classList.add(lane.outgoingEnabled ? "is-live" : "is-stale");
    routePill.textContent = lane.outgoingEnabled ? "Outgoing ON" : "Outgoing OFF";

    pills.append(statePill, routePill);
    head.append(title, pills);

    const meta = document.createElement("div");
    meta.className = "quick-flow-meta";
    const parts = [];
    if (lane.source) parts.push(`source ${lane.source}`);
    if (lane.target) parts.push(`target ${lane.target}`);
    if (lane.lastAt) parts.push(`last ${formatQuickFlowLineTime(lane.lastAt) || lane.lastAt}`);
    meta.textContent = parts.join(" | ") || "No metadata yet.";

    const actions = document.createElement("div");
    actions.className = "quick-flow-actions";
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = `quick-secondary-btn quick-flow-toggle-btn ${lane.outgoingEnabled ? "is-on" : "is-off"}`;
    toggleBtn.textContent = lane.outgoingEnabled ? "Mute Outgoing" : "Enable Outgoing";
    toggleBtn.setAttribute("aria-pressed", lane.outgoingEnabled ? "true" : "false");
    toggleBtn.dataset.laneId = lane.laneId;
    toggleBtn.dataset.outgoingEnabled = lane.outgoingEnabled ? "1" : "0";
    actions.appendChild(toggleBtn);

    const probeBtn = document.createElement("button");
    probeBtn.type = "button";
    probeBtn.className = "quick-secondary-btn";
    probeBtn.textContent = "Probe This Lane";
    probeBtn.dataset.flowProbeLane = lane.laneId;
    actions.appendChild(probeBtn);

    const streams = document.createElement("div");
    streams.className = "quick-flow-stream-grid";

    const incoming = document.createElement("section");
    incoming.className = "quick-flow-stream quick-flow-stream--incoming";
    const incomingTitle = document.createElement("h4");
    incomingTitle.textContent = "Incoming";
    const incomingLines = document.createElement("div");
    incomingLines.className = "quick-flow-lines";
    const incomingRows = Array.isArray(lane.incoming) ? lane.incoming.slice(-10) : [];
    if (incomingRows.length < 1) {
      const empty = document.createElement("p");
      empty.textContent = "Waiting for incoming lines...";
      incomingLines.appendChild(empty);
    } else {
      for (const row of incomingRows) {
        const p = document.createElement("p");
        const stamp = formatQuickFlowLineTime(row?.at);
        p.textContent = stamp ? `${stamp} ${row.text}` : String(row?.text || "");
        incomingLines.appendChild(p);
      }
    }
    incoming.append(incomingTitle, incomingLines);

    const outgoing = document.createElement("section");
    outgoing.className = "quick-flow-stream quick-flow-stream--outgoing";
    const outgoingTitle = document.createElement("h4");
    outgoingTitle.textContent = "Outgoing";
    const outgoingLines = document.createElement("div");
    outgoingLines.className = "quick-flow-lines";
    const outgoingRows = Array.isArray(lane.outgoing) ? lane.outgoing.slice(-10) : [];
    if (outgoingRows.length < 1) {
      const empty = document.createElement("p");
      empty.textContent = "No outgoing lines yet.";
      outgoingLines.appendChild(empty);
    } else {
      for (const row of outgoingRows) {
        const p = document.createElement("p");
        const stamp = formatQuickFlowLineTime(row?.at);
        p.textContent = stamp ? `${stamp} ${row.text}` : String(row?.text || "");
        outgoingLines.appendChild(p);
      }
    }
    outgoing.append(outgoingTitle, outgoingLines);

    streams.append(incoming, outgoing);

    const analysis = document.createElement("p");
    analysis.className = "hint";
    analysis.textContent = lane.lastAnalysis
      ? `Analysis: ${lane.lastAnalysis}`
      : "Analysis idle. Turn AI analysis on to annotate lanes.";

    card.append(head, meta, actions, streams, analysis);
    fragment.appendChild(card);
  }
  quickFlowBoard.appendChild(fragment);
}

function refreshQuickFlowControls() {
  if (quickFlowMasterToggle) {
    quickFlowMasterToggle.classList.remove("quick-flow-toggle-btn--on", "quick-flow-toggle-btn--off");
    quickFlowMasterToggle.classList.add(realtimeTranscribeState.flowMonitorEnabled ? "quick-flow-toggle-btn--on" : "quick-flow-toggle-btn--off");
    quickFlowMasterToggle.setAttribute("aria-pressed", realtimeTranscribeState.flowMonitorEnabled ? "true" : "false");
    quickFlowMasterToggle.textContent = realtimeTranscribeState.flowMonitorEnabled
      ? "Flow Monitor On"
      : "Flow Monitor Off";
    quickFlowMasterToggle.classList.toggle("is-live", realtimeTranscribeState.flowMonitorEnabled);
  }
  if (quickFlowAnalyzeToggle) {
    quickFlowAnalyzeToggle.classList.remove("quick-flow-toggle-btn--on", "quick-flow-toggle-btn--off");
    quickFlowAnalyzeToggle.classList.add(realtimeTranscribeState.flowAnalysisEnabled ? "quick-flow-toggle-btn--on" : "quick-flow-toggle-btn--off");
    quickFlowAnalyzeToggle.setAttribute("aria-pressed", realtimeTranscribeState.flowAnalysisEnabled ? "true" : "false");
    quickFlowAnalyzeToggle.textContent = realtimeTranscribeState.flowAnalysisEnabled
      ? "AI Analysis On"
      : "AI Analysis Off";
    quickFlowAnalyzeToggle.classList.toggle("is-live", realtimeTranscribeState.flowAnalysisEnabled);
  }
  if (quickFlowRefreshBtn) {
    quickFlowRefreshBtn.disabled = !realtimeTranscribeState.flowMonitorEnabled;
  }
  if (quickFlowProbeBtn) {
    quickFlowProbeBtn.disabled = !realtimeTranscribeState.flowMonitorEnabled;
  }
}

async function setRealtimeFlowAnalysisEnabled(enabled) {
  const next = Boolean(enabled);
  realtimeTranscribeState.flowAnalysisEnabled = next;
  saveRealtimeFlowPrefs();
  refreshQuickFlowControls();
  if (realtimeTranscribeState.active && isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    try {
      await apiPost("/api/voice/bridge-caption/orchestrator/analysis", {
        analysisEnabled: next,
        analysisMode: next ? "heuristic" : "off"
      });
      await pollMeetCaptionBridgeLaneStatusOnce();
    } catch (error) {
      setQuickRealtimeStatus(`Flow analysis toggle failed: ${String(error?.message || error)}`, "error");
    }
  }
  renderQuickRealtimeFlowBoard();
}

function setRealtimeFlowMonitorEnabled(enabled) {
  realtimeTranscribeState.flowMonitorEnabled = Boolean(enabled);
  saveRealtimeFlowPrefs();
  refreshQuickFlowControls();
  renderQuickRealtimeFlowBoard();
}

async function setRealtimeFlowLaneOutgoingRoute(laneId, outgoingEnabled) {
  const safeLaneId = normalizeRealtimeFlowLaneId(laneId);
  const laneState = getRealtimeFlowLaneState(safeLaneId);
  laneState.outgoingEnabled = Boolean(outgoingEnabled);
  renderQuickRealtimeFlowBoard();
  try {
    const data = await apiPost("/api/voice/bridge-caption/orchestrator/route", {
      laneId: safeLaneId,
      outgoingEnabled: Boolean(outgoingEnabled)
    });
    const orchestrator = data?.orchestrator || {};
    mergeRealtimeFlowLanesFromOrchestrator(Array.isArray(orchestrator?.lanes) ? orchestrator.lanes : []);
    renderQuickRealtimeFlowBoard();
    setQuickRealtimeStatus(
      `${safeLaneId} outgoing ${outgoingEnabled ? "enabled" : "muted"}.`,
      "live"
    );
  } catch (error) {
    setQuickRealtimeStatus(`Lane route update failed: ${String(error?.message || error)}`, "error");
    laneState.outgoingEnabled = !Boolean(outgoingEnabled);
    renderQuickRealtimeFlowBoard();
  }
}

async function runRealtimeFlowLaneProbe(preferredLane = "") {
  const fallbackLane = Object.keys(realtimeTranscribeState.flowLanes || {})[0] || "default";
  const laneId = normalizeRealtimeFlowLaneId(preferredLane || quickFlowProbeLane?.value || fallbackLane);
  const textRaw = String(quickFlowProbeText?.value || "").trim();
  const text = textRaw || `Asolaria preflight probe lane ${laneId} ${new Date().toLocaleTimeString()}`;
  try {
    const response = await apiPost("/api/voice/bridge-caption/lane-test", {
      laneId,
      text,
      direction: "outgoing",
      speak: true,
      injectToLive: true,
      sessionId: realtimeTranscribeState.sessionId || undefined
    });
    const entry = response?.entry || null;
    if (entry) {
      appendRealtimeTranscriptChunk(String(entry.text || text), {
        at: entry.at || Date.now(),
        laneId: entry.laneId || laneId,
        direction: entry.direction || "outgoing",
        source: entry.source || "voice_lane_probe"
      });
    }
    const orchestrator = response?.orchestrator || {};
    mergeRealtimeFlowLanesFromOrchestrator(Array.isArray(orchestrator?.lanes) ? orchestrator.lanes : []);
    renderQuickRealtimeFlowBoard();
    setQuickRealtimeStatus(`Lane probe sent to ${laneId}.`, "live");
  } catch (error) {
    setQuickRealtimeStatus(`Lane probe failed: ${String(error?.message || error)}`, "error");
  }
}

function buildCaptionBridgeLiveStatusText() {
  const label = getCaptionBridgeSourceLabel(realtimeTranscribeState.mode);
  const laneCount = Math.max(0, Number(realtimeTranscribeState.meetBridgeLaneCount || 0));
  const activeCount = Math.max(0, Number(realtimeTranscribeState.meetBridgeActiveLaneCount || 0));
  if (laneCount > 0) {
    return `Capturing ${label}... lanes ${laneCount} (active ${activeCount})`;
  }
  return `Capturing ${label}...`;
}

async function pollMeetCaptionBridgeLaneStatusOnce(runToken = realtimeTranscribeState.meetBridgeRunToken) {
  if (runToken !== Number(realtimeTranscribeState.meetBridgeRunToken || 0)) {
    return;
  }
  if (!realtimeTranscribeState.active || !isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    clearMeetCaptionBridgeLaneStatusTimer();
    return;
  }
  const sessionId = encodeURIComponent(String(realtimeTranscribeState.sessionId || "").trim());
  const data = await request(
    `/api/voice/bridge-caption/orchestrator/status?maxLanes=24&sessionId=${sessionId}`
  );
  if (runToken !== Number(realtimeTranscribeState.meetBridgeRunToken || 0)) {
    return;
  }
  if (!realtimeTranscribeState.active || !isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    return;
  }
  clearMeetCaptionBridgePollingError();
  const orchestrator = data?.orchestrator || {};
  const laneCount = Math.max(0, Number(orchestrator.observedLaneCount || 0));
  const activeCount = Math.max(0, Number(orchestrator.activeLaneCount || 0));
  const staleCount = Math.max(0, Number(orchestrator.staleLaneCount || 0));
  const laneRows = Array.isArray(orchestrator.lanes) ? orchestrator.lanes : [];
  realtimeTranscribeState.meetBridgeLaneCount = laneCount;
  realtimeTranscribeState.meetBridgeActiveLaneCount = activeCount;
  realtimeTranscribeState.meetBridgeStaleLaneCount = staleCount;
  mergeRealtimeFlowLanesFromOrchestrator(laneRows);
  if (typeof orchestrator.analysisEnabled === "boolean") {
    realtimeTranscribeState.flowAnalysisEnabled = Boolean(orchestrator.analysisEnabled);
  }
  refreshQuickFlowControls();
  renderQuickRealtimeFlowBoard();
  if (realtimeTranscribeState.active && isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    setQuickRealtimeStatus(buildCaptionBridgeLiveStatusText(), "live");
  }
}

function startMeetCaptionBridgeLaneStatusPolling() {
  clearMeetCaptionBridgeLaneStatusTimer();
  const runToken = Number(realtimeTranscribeState.meetBridgeRunToken || 0);
  pollMeetCaptionBridgeLaneStatusOnce(runToken).catch((error) => {
    reportMeetCaptionBridgePollingError("lane status", error, runToken);
  });
  realtimeTranscribeState.meetBridgeLaneStatusTimer = setInterval(() => {
    pollMeetCaptionBridgeLaneStatusOnce(runToken).catch((error) => {
      reportMeetCaptionBridgePollingError("lane status", error, runToken);
    });
  }, 2500);
}

async function pollMeetCaptionBridgeOnce(runToken = realtimeTranscribeState.meetBridgeRunToken) {
  if (runToken !== Number(realtimeTranscribeState.meetBridgeRunToken || 0)) {
    return;
  }
  if (!realtimeTranscribeState.active || !isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    clearMeetCaptionBridgePollTimer();
    return;
  }
  const afterId = Math.max(0, Number(realtimeTranscribeState.meetBridgeLastId || 0));
  const requestedSessionId = String(realtimeTranscribeState.sessionId || "").trim();
  const sessionId = encodeURIComponent(requestedSessionId);
  const data = await request(
    `/api/voice/bridge-caption/pull?afterId=${afterId}&limit=80&sessionId=${sessionId}`
  );
  if (runToken !== Number(realtimeTranscribeState.meetBridgeRunToken || 0)) {
    return;
  }
  if (!realtimeTranscribeState.active || !isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    return;
  }
  clearMeetCaptionBridgePollingError();
  const serverSessionId = String(data?.sessionId || "").trim();
  if (requestedSessionId && serverSessionId && requestedSessionId !== serverSessionId) {
    const serverEntriesCount = Math.max(0, Number(data?.entriesCount || 0));
    const serverLastId = Math.max(0, Number(data?.lastId || 0));
    if (serverEntriesCount > 0 || serverLastId < afterId) {
      realtimeTranscribeState.sessionId = serverSessionId;
      realtimeTranscribeState.meetBridgeLastId = 0;
      setQuickRealtimeStatus("Bridge session changed. Auto-resyncing transcript stream...", "live");
      return;
    }
  }
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const serverLastId = Math.max(0, Number(data?.lastId || 0));
  if (entries.length < 1 && serverLastId < afterId) {
    realtimeTranscribeState.meetBridgeLastId = 0;
    return;
  }
  if (entries.length < 1) {
    return;
  }
  for (const entry of entries) {
    const id = Math.max(0, Number(entry?.id || 0));
    if (id > realtimeTranscribeState.meetBridgeLastId) {
      realtimeTranscribeState.meetBridgeLastId = id;
    }
    const text = normalizeRealtimeTranscriptChunk(entry?.text);
    if (!text) {
      continue;
    }
    const laneId = normalizeRealtimeFlowLaneId(entry?.laneId || "default");
    const direction = normalizeRealtimeFlowDirection(entry?.direction, "incoming");
    appendRealtimeTranscriptChunk(text, {
      at: entry?.at || Date.now(),
      laneId,
      direction,
      source: entry?.source || ""
    });
  }
  renderQuickRealtimeFlowBoard();
  setQuickRealtimeStatus(buildCaptionBridgeLiveStatusText(), "live");
}

function startMeetCaptionBridgePolling() {
  clearMeetCaptionBridgePollTimer();
  const runToken = bumpMeetCaptionBridgeRunToken();
  clearMeetCaptionBridgePollingError();
  realtimeTranscribeState.meetBridgeLastId = 0;
  pollMeetCaptionBridgeOnce(runToken).catch((error) => {
    reportMeetCaptionBridgePollingError("caption stream", error, runToken);
  });
  startMeetCaptionBridgeLaneStatusPolling();
  realtimeTranscribeState.meetBridgePollTimer = setInterval(() => {
    pollMeetCaptionBridgeOnce(runToken).catch((error) => {
      reportMeetCaptionBridgePollingError("caption stream", error, runToken);
    });
  }, 450);
}

function buildMeetCaptionBridgeScript(options = {}) {
  const ingestOriginsLiteral = JSON.stringify(buildCaptionBridgeOriginCandidates());
  const sessionIdLiteral = JSON.stringify(String(options.sessionId || "").trim());
  const laneIdLiteral = JSON.stringify(
    normalizeRealtimeFlowLaneId(String(options.laneId || "").trim())
  );
  const bridgeTokenLiteral = JSON.stringify(
    String(options.bridgeToken || realtimeTranscribeState.bridgePushToken || readCaptionBridgePushTokenFromUrl() || "").trim()
  );
  return [
    "(() => {",
    `  const ingestOriginsSeed = ${ingestOriginsLiteral};`,
    `  const sessionId = ${sessionIdLiteral};`,
    `  const laneIdOverride = ${laneIdLiteral};`,
    `  const bridgeToken = ${bridgeTokenLiteral};`,
    "  const ingestOrigins = (() => {",
    "    const seed = Array.isArray(ingestOriginsSeed) ? ingestOriginsSeed : [ingestOriginsSeed];",
    "    const list = [];",
    "    const seen = new Set();",
    "    for (const raw of seed) {",
    "      const base = String(raw || '').replace(/\\/+$/, '');",
    "      if (!base || seen.has(base)) continue;",
    "      seen.add(base);",
    "      list.push(base);",
    "    }",
    "    const currentOrigin = String(location.origin || '').replace(/\\/+$/, '');",
    "    if (currentOrigin && !seen.has(currentOrigin)) list.push(currentOrigin);",
    "    return list;",
    "  })();",
    "  const laneId = (() => {",
    "    const sanitize = (value) => String(value || '')",
    "      .toLowerCase()",
    "      .replace(/[^a-z0-9_.-]/g, '_')",
    "      .replace(/^_+|_+$/g, '')",
    "      .slice(0, 96);",
    "    const override = sanitize(laneIdOverride);",
    "    if (override) return override;",
    "    const raw = String(location.pathname || location.host || \"default\").toLowerCase();",
    "    const compact = raw.replace(/[^a-z0-9_.-]/g, \"_\").replace(/^_+|_+$/g, \"\");",
    "    return (compact || \"default\").slice(0, 96);",
    "  })();",
    "  const seenAt = new Map();",
    "  const normalize = (value) => String(value || \"\").replace(/\\s+/g, \" \").trim();",
    "  const pruneSeen = (nowMs) => {",
    "    for (const [key, stamp] of seenAt) {",
    "      if ((nowMs - Number(stamp || 0)) > 90000) {",
    "        seenAt.delete(key);",
    "      }",
    "    }",
    "    if (seenAt.size > 1200) {",
    "      const overflow = seenAt.size - 1000;",
    "      let removed = 0;",
    "      for (const key of seenAt.keys()) {",
    "        seenAt.delete(key);",
    "        removed += 1;",
    "        if (removed >= overflow) break;",
    "      }",
    "    }",
    "  };",
    "  const pushLine = (line) => {",
    "    const text = normalize(line);",
    "    if (text.length < 2) return;",
    "    const stamp = encodeURIComponent(new Date().toISOString());",
    "    for (const origin of ingestOrigins) {",
    "      const url = `${origin}/api/voice/bridge-caption/push`",
    "        + `?text=${encodeURIComponent(text)}`",
    "        + `&source=google_meet_caption`",
    "        + `&laneId=${encodeURIComponent(laneId)}`",
    "        + (sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : '')",
    "        + (bridgeToken ? `&token=${encodeURIComponent(bridgeToken)}` : '')",
    "        + `&at=${stamp}`;",
    "      try {",
    "        const sent = typeof navigator.sendBeacon === 'function'",
    "          ? navigator.sendBeacon(url)",
    "          : false;",
    "        if (!sent && typeof fetch === 'function') {",
    "          fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit', keepalive: true, cache: 'no-store' }).catch(() => {});",
    "        }",
    "      } catch {}",
    "    }",
    "  };",
    "  const collectLines = () => {",
    "    const selectors = [",
    "      '[aria-live]',",
    "      '[role=\"log\"]',",
    "      '[data-testid*=\"caption\" i]',",
    "      '[class*=\"caption\" i]',",
    "      '[id*=\"caption\" i]'",
    "    ];",
    "    const roots = Array.from(document.querySelectorAll(selectors.join(',')));",
    "    const out = [];",
    "    for (const root of roots) {",
    "      const text = normalize(root.innerText);",
    "      if (!text) continue;",
    "      for (const raw of text.split(/\\n+/)) {",
    "        const line = normalize(raw);",
    "        if (line.length < 2) continue;",
    "        out.push(line);",
    "      }",
    "    }",
    "    return out.slice(-12);",
    "  };",
    "  const push = () => {",
    "    const lines = collectLines();",
    "    const nowMs = Date.now();",
    "    pruneSeen(nowMs);",
    "    for (const line of lines) {",
    "      const key = line.toLowerCase();",
    "      const previous = Number(seenAt.get(key) || 0);",
    "      if (previous && (nowMs - previous) < 5000) continue;",
    "      seenAt.set(key, nowMs);",
    "      pushLine(line);",
    "    }",
    "  };",
  "  const observer = new MutationObserver(() => push());",
    "  observer.observe(document.body, { childList: true, subtree: true, characterData: true });",
    "  const timer = setInterval(push, 250);",
    "  window.__asolariaCaptionBridgeStop = () => {",
    "    clearInterval(timer);",
    "    observer.disconnect();",
    "    console.log('Asolaria caption bridge stopped.');",
    "  };",
    "  push();",
    "  console.log('Asolaria caption bridge active. Run __asolariaCaptionBridgeStop() to stop.');",
    "})();"
  ].join("\n");
}

function buildCustomCaptionBridgeScript(options = {}) {
  const ingestOriginsLiteral = JSON.stringify(buildCaptionBridgeOriginCandidates());
  const sessionIdLiteral = JSON.stringify(String(options.sessionId || "").trim());
  const bridgeTokenLiteral = JSON.stringify(
    String(options.bridgeToken || realtimeTranscribeState.bridgePushToken || readCaptionBridgePushTokenFromUrl() || "").trim()
  );
  return [
    "(() => {",
    `  const ingestOriginsSeed = ${ingestOriginsLiteral};`,
    `  const sessionId = ${sessionIdLiteral};`,
    `  const bridgeToken = ${bridgeTokenLiteral};`,
    "  const ingestOrigins = (() => {",
    "    const seed = Array.isArray(ingestOriginsSeed) ? ingestOriginsSeed : [ingestOriginsSeed];",
    "    const list = [];",
    "    const seen = new Set();",
    "    for (const raw of seed) {",
    "      const base = String(raw || '').replace(/\\/+$/, '');",
    "      if (!base || seen.has(base)) continue;",
    "      seen.add(base);",
    "      list.push(base);",
    "    }",
    "    const currentOrigin = String(location.origin || '').replace(/\\/+$/, '');",
    "    if (currentOrigin && !seen.has(currentOrigin)) list.push(currentOrigin);",
    "    return list;",
    "  })();",
    "  const laneId = (() => {",
    "    const raw = String(location.pathname || location.host || \"default\").toLowerCase();",
    "    const compact = raw.replace(/[^a-z0-9_.-]/g, \"_\").replace(/^_+|_+$/g, \"\");",
    "    return (compact || \"default\").slice(0, 96);",
    "  })();",
    "  const seenAt = new Map();",
    "  const normalize = (value) => String(value || \"\").replace(/\\s+/g, \" \").trim();",
    "  const pruneSeen = (nowMs) => {",
    "    for (const [key, stamp] of seenAt) {",
    "      if ((nowMs - Number(stamp || 0)) > 90000) {",
    "        seenAt.delete(key);",
    "      }",
    "    }",
    "    if (seenAt.size > 1800) {",
    "      const overflow = seenAt.size - 1500;",
    "      let removed = 0;",
    "      for (const key of seenAt.keys()) {",
    "        seenAt.delete(key);",
    "        removed += 1;",
    "        if (removed >= overflow) break;",
    "      }",
    "    }",
    "  };",
    "  const isNoise = (value) => {",
    "    const line = normalize(value).toLowerCase();",
    "    if (!line) return true;",
    "    if (line.length < 2 || line.length > 420) return true;",
    "    if (/^(summary|interview questions|transcript|usage|overview|analytics|interview feedback|date|domain|duration|relevance|accuracy|clarity)$/i.test(line)) return true;",
    "    if (/^share your microphone next interview to view all analytics\\.?$/i.test(line)) return true;",
    "    return false;",
    "  };",
    "  const pushLine = (line) => {",
    "    const text = normalize(line);",
    "    if (isNoise(text)) return;",
    "    const stamp = encodeURIComponent(new Date().toISOString());",
    "    for (const origin of ingestOrigins) {",
    "      const url = `${origin}/api/voice/bridge-caption/push`",
    "        + `?text=${encodeURIComponent(text)}`",
    "        + `&source=custom_caption`",
    "        + `&laneId=${encodeURIComponent(laneId)}`",
    "        + (sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : '')",
    "        + (bridgeToken ? `&token=${encodeURIComponent(bridgeToken)}` : '')",
    "        + `&at=${stamp}`;",
    "      try {",
    "        const sent = typeof navigator.sendBeacon === 'function'",
    "          ? navigator.sendBeacon(url)",
    "          : false;",
    "        if (!sent && typeof fetch === 'function') {",
    "          fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit', keepalive: true, cache: 'no-store' }).catch(() => {});",
    "        }",
    "      } catch {}",
    "    }",
    "  };",
    "  const collectLines = () => {",
    "    const selectors = [",
    "      '[aria-live]',",
    "      '[role=\"log\"]',",
    "      '[data-testid*=\"transcript\" i]',",
    "      '[class*=\"transcript\" i]',",
    "      '[id*=\"transcript\" i]',",
    "      '[class*=\"caption\" i]',",
    "      '[id*=\"caption\" i]'",
    "    ];",
    "    const roots = Array.from(document.querySelectorAll(selectors.join(',')));",
    "    const out = [];",
    "    for (const root of roots) {",
    "      const text = normalize(root.innerText || root.textContent || \"\");",
    "      if (!text) continue;",
    "      for (const raw of text.split(/\\n+/)) {",
    "        const line = normalize(raw);",
    "        if (isNoise(line)) continue;",
    "        out.push(line);",
    "      }",
    "    }",
    "    return out.slice(-16);",
    "  };",
    "  const push = () => {",
    "    const lines = collectLines();",
    "    const nowMs = Date.now();",
    "    pruneSeen(nowMs);",
    "    for (const line of lines) {",
    "      const key = line.toLowerCase();",
    "      const previous = Number(seenAt.get(key) || 0);",
    "      if (previous && (nowMs - previous) < 5000) continue;",
    "      seenAt.set(key, nowMs);",
    "      pushLine(line);",
    "    }",
    "  };",
    "  const observer = new MutationObserver(() => push());",
    "  observer.observe(document.body, { childList: true, subtree: true, characterData: true });",
    "  const timer = setInterval(push, 300);",
    "  window.__asolariaCaptionBridgeStop = () => {",
    "    clearInterval(timer);",
    "    observer.disconnect();",
    "    console.log('Asolaria custom caption bridge stopped.');",
    "  };",
    "  push();",
    "  console.log('Asolaria custom caption bridge active. Run __asolariaCaptionBridgeStop() to stop.');",
    "})();"
  ].join("\n");
}

function handleGoogleCaptionBridgeMessage(event) {
  if (!realtimeTranscribeState.active || realtimeTranscribeState.mode !== "google_meet_caption") {
    return;
  }
  const origin = String(event?.origin || "").trim().toLowerCase();
  if (origin !== "https://meet.google.com") {
    return;
  }
  const payload = event?.data || {};
  if (String(payload?.type || "").trim() !== "asolaria_google_caption") {
    return;
  }
  const chunkText = normalizeRealtimeTranscriptChunk(payload?.text);
  if (!chunkText) {
    return;
  }
  appendRealtimeTranscriptChunk(chunkText, {
    at: payload?.at || Date.now(),
    laneId: "default",
    direction: "incoming",
    source: "google_meet_caption"
  });
  setQuickRealtimeStatus("Capturing Google Meet captions...", "live");
}

window.addEventListener("message", handleGoogleCaptionBridgeMessage);

function buildLiveTranscriptCompatQuery(options = {}) {
  const source = normalizeRealtimeTranscriptSource(
    options.source || realtimeTranscribeState.transcriptSource,
    realtimeTranscribeState.transcriptSource
  );
  const params = new URLSearchParams();
  params.set("source", source);
  if (source !== "live") {
    params.set("includeBridgeCaptions", "1");
  }
  const bridgeSessionId = String(options.bridgeSessionId || "").trim();
  if (bridgeSessionId) {
    params.set("bridgeSessionId", bridgeSessionId);
  }
  const bridgeLaneId = String(options.bridgeLaneId || "").trim();
  if (bridgeLaneId) {
    params.set("bridgeLaneId", bridgeLaneId);
  }
  const maxEntriesRaw = Number(options.bridgeMaxEntries);
  const maxEntries = Number.isFinite(maxEntriesRaw)
    ? Math.max(1, Math.min(1000, Math.round(maxEntriesRaw)))
    : 220;
  params.set("bridgeMaxEntries", String(maxEntries));
  return params;
}

async function pullLiveTranscriptCompatSnapshot(options = {}) {
  const params = buildLiveTranscriptCompatQuery(options);
  return request(`/api/voice/live/transcript?${params.toString()}`);
}

function applyLiveTranscriptCompatSnapshot(snapshot = {}) {
  const transcript = String(snapshot?.transcript || "").trim();
  const previous = String(realtimeTranscribeState.lastCompatTranscript || "").trim();
  if (!transcript) {
    if (!previous && !String(realtimeTranscribeState.transcript || "").trim()) {
      return false;
    }
    realtimeTranscribeState.lastCompatTranscript = "";
    realtimeTranscribeState.transcript = "";
    realtimeTranscribeState.lastChunk = "";
    realtimeTranscribeState.lastMirroredChatLine = "";
    realtimeTranscribeState.lastSpeaker = "";
    realtimeTranscribeState.entries = [];
    resetRealtimeFlowState();
    renderQuickRealtimeTranscript();
    refreshQuickRealtimeControls();
    return true;
  }
  if (transcript === previous) {
    return false;
  }
  realtimeTranscribeState.lastCompatTranscript = transcript;
  realtimeTranscribeState.transcript = transcript;
  seedQuickRealtimeStateFromTranscriptText(220);
  if (realtimeTranscribeState.active && realtimeTranscribeState.autoMirrorToChat) {
    mirrorQuickRealtimeLineToChat(getQuickRealtimeLastChunk(), {
      laneId: "default",
      direction: "incoming",
      source: "compat_snapshot"
    });
  }
  renderQuickRealtimeTranscript();
  refreshQuickRealtimeControls();
  return true;
}

function startRealtimeServerLoopbackPolling(activeSessionId) {
  clearRealtimeServerPollTimer();
  const sessionId = String(activeSessionId || "").trim();
  realtimeTranscribeState.serverPollTimer = setInterval(async () => {
    if (!realtimeTranscribeState.active || realtimeTranscribeState.mode !== "server_loopback") {
      clearRealtimeServerPollTimer();
      return;
    }
    try {
      const transcriptSource = normalizeRealtimeTranscriptSource(
        realtimeTranscribeState.transcriptSource,
        "live"
      );
      const includeLiveSegments = transcriptSource !== "bridge";
      const data = await request("/api/voice/live/status?includeTranscript=false&includeSegments=true&maxSegments=8");
      const live = data?.live || {};
      const running = Boolean(live.running);
      const busy = Boolean(live.busy);
      const pollSessionId = String(live.sessionId || "");
      if (sessionId && pollSessionId && pollSessionId !== sessionId) {
        return;
      }
      const segments = Array.isArray(live.segments) ? live.segments : [];
      let changed = false;
      for (const segment of segments) {
        const index = Number(segment?.index || 0);
        if (!Number.isFinite(index) || index <= realtimeTranscribeState.serverLastSegmentIndex) {
          continue;
        }
        realtimeTranscribeState.serverLastSegmentIndex = index;
        if (!includeLiveSegments) {
          continue;
        }
        const chunkText = normalizeRealtimeTranscriptChunk(segment?.text);
        if (chunkText) {
          if (appendRealtimeTranscriptChunk(chunkText, {
            at: segment?.at || Date.now(),
            laneId: "loopback",
            direction: "incoming",
            source: "server_loopback"
          })) {
            changed = true;
          }
        } else {
          realtimeTranscribeState.emptyChunkStreak += 1;
        }
      }
      if (transcriptSource !== "live") {
        const compat = await pullLiveTranscriptCompatSnapshot({
          source: transcriptSource,
          bridgeMaxEntries: 220
        });
        if (applyLiveTranscriptCompatSnapshot(compat)) {
          changed = true;
        }
      } else {
        realtimeTranscribeState.lastCompatTranscript = "";
      }
      if (changed) {
        // UI already refreshed in appendRealtimeTranscriptChunk
      } else {
        if (includeLiveSegments) {
          const fallbackTranscript = String(live.transcript || "").trim();
          if (fallbackTranscript) {
            realtimeTranscribeState.transcript = mergeRealtimeTranscript(
              realtimeTranscribeState.transcript,
              fallbackTranscript
            );
            seedQuickRealtimeStateFromTranscriptText(160);
          }
        }
      }
      if (realtimeTranscribeState.active) {
        const sourceLabel = describeRealtimeTranscriptSource(transcriptSource);
        if (running) {
          const noSpeechYet = realtimeTranscribeState.emptyChunkStreak >= 2 && !realtimeTranscribeState.transcript;
          if (busy) {
            setQuickRealtimeStatus(`Processing live chunk (server loopback, ${sourceLabel})...`, "live");
          } else if (noSpeechYet) {
            setQuickRealtimeStatus(`Capturing (server loopback, ${sourceLabel}, no speech detected yet)`, "live");
          } else {
            setQuickRealtimeStatus(`Capturing (server loopback, ${sourceLabel})`, "live");
          }
        } else {
          setQuickRealtimeStatus("Server loopback stopped.", "error");
        }
      }
    } catch (error) {
      if (realtimeTranscribeState.active) {
        setQuickRealtimeStatus(`Caption poll error: ${String(error?.message || "poll_failed")}`, "error");
      }
    }
  }, 700);
}

function setQuickRealtimeStatus(text = "", level = "") {
  if (!quickRealtimeStatus) return;
  quickRealtimeStatus.textContent = String(text || "").trim() || "Idle";
  quickRealtimeStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    quickRealtimeStatus.classList.add("is-live");
  } else if (level === "error") {
    quickRealtimeStatus.classList.add("is-error");
  }
}

function getSpeechToTextRuntimeSnapshot(payload = {}) {
  const root = payload && typeof payload === "object" ? payload : {};
  const tools = root?.voice?.tools && typeof root.voice.tools === "object"
    ? root.voice.tools
    : (root?.tools && typeof root.tools === "object" ? root.tools : {});
  const available = tools?.available && typeof tools.available === "object"
    ? tools.available
    : {};
  const whisper = Boolean(available.whisper);
  const cloudTranscribe = Boolean(available.cloudTranscribe);
  const cloudSource = String(
    tools?.cloudTranscribeSource
    || (Array.isArray(tools?.cloudTranscribeSources) ? tools.cloudTranscribeSources.find(Boolean) : "")
    || ""
  ).trim();
  const cloudLabel = cloudSource ? `cloud (${cloudSource})` : "cloud";
  let modeLabel = "not configured";
  let shortLabel = "missing";
  if (whisper && cloudTranscribe) {
    modeLabel = `local whisper + ${cloudLabel}`;
    shortLabel = "local+cloud";
  } else if (whisper) {
    modeLabel = "local whisper";
    shortLabel = "local";
  } else if (cloudTranscribe) {
    modeLabel = cloudLabel;
    shortLabel = "cloud";
  }
  return {
    available: whisper || cloudTranscribe,
    whisper,
    cloudTranscribe,
    modeLabel,
    shortLabel,
    unavailableMessage: "No speech-to-text engine is configured. Configure ASOLARIA_WHISPER_CMD or cloud transcription key first."
  };
}

function refreshQuickRealtimeControls() {
  const sourceLabel = describeRealtimeCaptureSource(realtimeTranscribeState.captureSource);
  const isSimpleMode = uiExperienceMode === "simple";
  const sourceRequiresBrowserRecorder = !["server_loopback", "google_meet_caption", "custom_caption"].includes(realtimeTranscribeState.captureSource);
  const sourceSupported = sourceRequiresBrowserRecorder ? realtimeTranscribeState.supported : true;
  if (quickRealtimeStartBtn) {
    quickRealtimeStartBtn.disabled = !sourceSupported || realtimeTranscribeState.active;
    quickRealtimeStartBtn.textContent = realtimeTranscribeState.active
      ? (isSimpleMode ? "Capturing..." : `Capturing (${sourceLabel})`)
      : (isSimpleMode ? "Start" : `Start ${sourceLabel}`);
  }
  if (quickRealtimeStopBtn) {
    quickRealtimeStopBtn.disabled = !realtimeTranscribeState.active && !realtimeTranscribeState.recorder;
  }
  if (quickRealtimeSourceSelect) {
    quickRealtimeSourceSelect.disabled = realtimeTranscribeState.active;
  }
  if (quickRealtimeTranscriptSourceSelect) {
    syncQuickRealtimeTranscriptSourceControl();
    quickRealtimeTranscriptSourceSelect.disabled = false;
  }
  if (quickRealtimeBridgeTokenInput) {
    syncQuickRealtimeBridgeTokenControl();
  }
  if (quickRealtimeClearBtn) {
    quickRealtimeClearBtn.disabled = !realtimeTranscribeState.transcript;
  }
  if (quickRealtimeCopyBtn) {
    quickRealtimeCopyBtn.disabled = !realtimeTranscribeState.transcript;
  }
  const hasLastChunk = Boolean(getQuickRealtimeLastChunk());
  if (quickRealtimeCopyLastBtn) {
    quickRealtimeCopyLastBtn.disabled = !hasLastChunk;
  }
  if (quickRealtimeInstantAskBtn) {
    quickRealtimeInstantAskBtn.disabled = !hasLastChunk;
  }
  if (quickInterviewUseLastBtn) {
    quickInterviewUseLastBtn.disabled = !hasLastChunk;
  }
  const questionWords = countQuickInterviewWords(quickInterviewQuestion?.value || "");
  const hasQuestion = Boolean(String(quickInterviewQuestion?.value || "").trim());
  if (quickInterviewAskBtn) {
    quickInterviewAskBtn.disabled = !hasQuestion || questionWords > QUICK_INTERVIEW_MAX_WORDS;
  }
  if (quickInterviewClearBtn) {
    quickInterviewClearBtn.disabled = !hasQuestion;
  }
  if (quickRealtimeAutoCopyToggle) {
    quickRealtimeAutoCopyToggle.checked = Boolean(realtimeTranscribeState.autoCopy);
  }
  if (quickRealtimeMirrorToChatToggle) {
    quickRealtimeMirrorToChatToggle.checked = Boolean(realtimeTranscribeState.autoMirrorToChat);
  }
  if (quickRealtimeBridgeBtn) {
    const bridgeSource = isCaptionBridgeSource(realtimeTranscribeState.captureSource);
    quickRealtimeBridgeBtn.hidden = !bridgeSource;
    quickRealtimeBridgeBtn.disabled = !bridgeSource;
    if (bridgeSource) {
      quickRealtimeBridgeBtn.textContent = realtimeTranscribeState.captureSource === "custom_caption"
        ? "Copy Custom Bridge Script"
        : "Copy Meet Bridge Script";
    }
  }
  updateQuickRealtimeDualLaneStatus();
  refreshQuickFlowControls();
}

function renderQuickRealtimeTranscript() {
  if (!quickRealtimeTranscript) return;
  const entries = Array.isArray(realtimeTranscribeState.entries) ? realtimeTranscribeState.entries : [];
  if (entries.length < 1) {
    const transcriptText = String(realtimeTranscribeState.transcript || "").trim();
    if (!transcriptText) {
      quickRealtimeTranscript.textContent = "Transcript will appear here while capture is active.";
      renderQuickRealtimeChatMirrorBox();
      return;
    }
    const backfillLines = transcriptText
      .split(/\r?\n+/)
      .map((line) => normalizeRealtimeTranscriptChunk(line))
      .filter(Boolean)
      .slice(-120);
    if (backfillLines.length < 1) {
      quickRealtimeTranscript.textContent = "Transcript will appear here while capture is active.";
      renderQuickRealtimeChatMirrorBox();
      return;
    }
    quickRealtimeTranscript.textContent = "";
    const backfillFragment = document.createDocumentFragment();
    for (const text of backfillLines) {
      const row = document.createElement("div");
      row.className = "quick-realtime-line";
      const meta = document.createElement("div");
      meta.className = "quick-realtime-line-meta";
      meta.textContent = "Backfill";
      const line = document.createElement("div");
      line.className = "quick-realtime-line-text";
      line.textContent = text;
      row.append(meta, line);
      backfillFragment.appendChild(row);
    }
    quickRealtimeTranscript.appendChild(backfillFragment);
    quickRealtimeTranscript.scrollTop = quickRealtimeTranscript.scrollHeight;
    renderQuickRealtimeChatMirrorBox();
    return;
  }
  quickRealtimeTranscript.textContent = "";
  const fragment = document.createDocumentFragment();
  for (const entry of entries.slice(-140)) {
    const direction = normalizeRealtimeFlowDirection(entry?.direction, "incoming");
    const laneId = normalizeRealtimeFlowLaneId(entry?.laneId || "default");
    const row = document.createElement("div");
    row.className = `quick-realtime-line quick-realtime-line--${direction}`;
    const meta = document.createElement("div");
    meta.className = "quick-realtime-line-meta";
    const laneLabel = laneId && laneId !== "default" ? ` | lane ${laneId}` : "";
    const directionLabel = direction === "outgoing" ? " | outgoing" : (direction === "system" ? " | system" : "");
    meta.textContent = entry.speaker
      ? `${entry.time} - ${entry.speaker}${laneLabel}${directionLabel}`
      : `${entry.time}${laneLabel}${directionLabel}`;
    const line = document.createElement("div");
    line.className = "quick-realtime-line-text";
    line.textContent = entry.text;
    row.append(meta, line);
    fragment.appendChild(row);
  }
  quickRealtimeTranscript.appendChild(fragment);
  if (entries.length > 0) {
    quickRealtimeTranscript.scrollTop = quickRealtimeTranscript.scrollHeight;
  }
  renderQuickRealtimeChatMirrorBox();
}

function renderQuickRealtimeChatMirrorBox() {
  if (!quickRealtimeChatMirrorBox) {
    return;
  }
  const payload = buildQuickRealtimeTranscriptCopyPayload();
  quickRealtimeChatMirrorBox.value = payload || "";
  if (quickRealtimeChatMirrorBox.value) {
    quickRealtimeChatMirrorBox.scrollTop = quickRealtimeChatMirrorBox.scrollHeight;
  }
}

function formatQuickRealtimeEntryTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function parseQuickRealtimeSpeakerChunk(value) {
  const text = normalizeRealtimeTranscriptChunk(value);
  if (!text) {
    return {
      text: "",
      speaker: "",
      speakerOnly: false
    };
  }
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) {
    return {
      text: "",
      speaker: "",
      speakerOnly: false
    };
  }
  if (/^(audio shared|ask anything in one of three ways|ask a question\.{0,3}|type, paste your question in the input below|use quick actions below to ask from the transcript|press\s*\+\s*(\+\s*)?to .*|open keyboard shortcuts)$/i.test(text)) {
    return {
      text: "",
      speaker: "",
      speakerOnly: false
    };
  }
  const speakerOnlyMatch = text.match(/^(interviewer|candidate|host|speaker\s*\d+)$/i);
  if (speakerOnlyMatch) {
    return {
      text: "",
      speaker: String(speakerOnlyMatch[1] || "").trim(),
      speakerOnly: true
    };
  }
  const prefixedMatch = text.match(/^([A-Za-z][A-Za-z0-9 .'-]{1,40}):\s*(.+)$/);
  if (prefixedMatch) {
    return {
      text: normalizeRealtimeTranscriptChunk(prefixedMatch[2] || ""),
      speaker: String(prefixedMatch[1] || "").trim(),
      speakerOnly: false
    };
  }
  return {
    text,
    speaker: "",
    speakerOnly: false
  };
}

function pushQuickRealtimeEntry(entry) {
  if (!entry || !entry.text) {
    return;
  }
  if (!Array.isArray(realtimeTranscribeState.entries)) {
    realtimeTranscribeState.entries = [];
  }
  realtimeTranscribeState.entries.push({
    ...entry,
    laneId: normalizeRealtimeFlowLaneId(entry.laneId || "default"),
    direction: normalizeRealtimeFlowDirection(entry.direction, "incoming"),
    source: normalizeRealtimeTranscriptChunk(entry.source || "")
  });
  if (realtimeTranscribeState.entries.length > REALTIME_TRANSCRIBE_MAX_ENTRIES) {
    realtimeTranscribeState.entries = realtimeTranscribeState.entries
      .slice(realtimeTranscribeState.entries.length - REALTIME_TRANSCRIBE_MAX_ENTRIES);
  }
}

function getQuickRealtimeLastChunk() {
  return normalizeRealtimeTranscriptChunk(realtimeTranscribeState.lastChunk);
}

function buildQuickRealtimeTranscriptCopyPayload() {
  const entries = Array.isArray(realtimeTranscribeState.entries) ? realtimeTranscribeState.entries : [];
  const fromEntries = entries.length > 0
    ? entries
      .map((entry) => {
        const direction = normalizeRealtimeFlowDirection(entry?.direction, "incoming");
        if (direction === "system") {
          return "";
        }
        const text = normalizeRealtimeTranscriptChunk(entry?.text || "");
        if (!text) {
          return "";
        }
        const speaker = normalizeRealtimeTranscriptChunk(entry?.speaker || "");
        return speaker ? `${speaker}: ${text}` : text;
      })
      .filter(Boolean)
      .join("\n")
      .trim()
    : "";
  if (fromEntries) {
    return fromEntries;
  }
  return String(realtimeTranscribeState.transcript || "").trim();
}

function seedQuickRealtimeStateFromTranscriptText(maxLines = 140) {
  const transcriptText = String(realtimeTranscribeState.transcript || "").trim();
  if (!transcriptText) {
    return 0;
  }
  const lines = transcriptText
    .split(/\r?\n+/)
    .map((line) => normalizeRealtimeTranscriptChunk(line))
    .filter(Boolean)
    .slice(-Math.max(1, Number(maxLines || 140)));
  if (lines.length < 1) {
    return 0;
  }
  if (!Array.isArray(realtimeTranscribeState.entries)) {
    realtimeTranscribeState.entries = [];
  }
  const existing = new Set(
    realtimeTranscribeState.entries.map((entry) => {
      const speakerKey = String(entry?.speaker || "").trim().toLowerCase();
      const textKey = String(entry?.text || "").trim().toLowerCase();
      return `${speakerKey}|${textKey}`;
    })
  );
  let seeded = 0;
  for (const line of lines) {
    const parsed = parseQuickRealtimeSpeakerChunk(line);
    if (parsed.speakerOnly) {
      realtimeTranscribeState.lastSpeaker = parsed.speaker;
      continue;
    }
    const text = normalizeRealtimeTranscriptChunk(parsed.text);
    if (!text) {
      continue;
    }
    const speaker = normalizeRealtimeTranscriptChunk(parsed.speaker || realtimeTranscribeState.lastSpeaker || "");
    const key = `${speaker.toLowerCase()}|${text.toLowerCase()}`;
    if (existing.has(key)) {
      continue;
    }
    existing.add(key);
    const at = Date.now() + seeded;
    pushQuickRealtimeEntry({
      at,
      time: formatQuickRealtimeEntryTime(at),
      speaker,
      text,
      laneId: "default",
      direction: "incoming",
      source: "seed"
    });
    realtimeTranscribeState.lastChunk = speaker ? `${speaker}: ${text}` : text;
    seeded += 1;
  }
  if (seeded > 0) {
    renderQuickRealtimeTranscript();
    if (realtimeTranscribeState.flowMonitorEnabled) {
      for (const entry of realtimeTranscribeState.entries.slice(-seeded)) {
        appendRealtimeFlowEntry(entry);
      }
    }
    renderQuickRealtimeFlowBoard();
    refreshQuickRealtimeControls();
  }
  return seeded;
}

async function copyTextToClipboard(text, options = {}) {
  const payload = String(text || "").trim();
  if (!payload) {
    return false;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return true;
  }
  const helper = document.createElement("textarea");
  helper.value = payload;
  helper.setAttribute("readonly", "readonly");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(helper);
  if (!copied && !options.silent) {
    throw new Error("Clipboard copy is not available.");
  }
  return copied;
}

function appendRealtimeTranscriptChunk(chunkText, options = {}) {
  const parsed = parseQuickRealtimeSpeakerChunk(chunkText);
  if (parsed.speakerOnly) {
    realtimeTranscribeState.lastSpeaker = parsed.speaker;
    refreshQuickRealtimeControls();
    return false;
  }
  const normalized = normalizeRealtimeTranscriptChunk(parsed.text);
  if (!normalized) {
    return false;
  }
  const speaker = normalizeRealtimeTranscriptChunk(parsed.speaker || realtimeTranscribeState.lastSpeaker || "");
  const lineForActions = speaker ? `${speaker}: ${normalized}` : normalized;
  const at = options.at || Date.now();
  const laneId = normalizeRealtimeFlowLaneId(options.laneId || "default");
  const direction = normalizeRealtimeFlowDirection(options.direction, "incoming");
  const source = normalizeRealtimeTranscriptChunk(options.source || "");
  realtimeTranscribeState.emptyChunkStreak = 0;
  realtimeTranscribeState.lastChunk = lineForActions;
  if (speaker) {
    realtimeTranscribeState.lastSpeaker = speaker;
  }
  realtimeTranscribeState.transcript = mergeRealtimeTranscript(
    realtimeTranscribeState.transcript,
    lineForActions
  );
  pushQuickRealtimeEntry({
    at,
    time: formatQuickRealtimeEntryTime(at),
    speaker,
    text: normalized,
    laneId,
    direction,
    source
  });
  if (direction !== "system") {
    mirrorQuickRealtimeLineToChat(lineForActions, {
      laneId,
      direction,
      source
    });
  }
  if (realtimeTranscribeState.flowMonitorEnabled) {
    appendRealtimeFlowEntry({
      at,
      laneId,
      direction,
      source,
      text: lineForActions
    });
  }
  renderQuickRealtimeTranscript();
  renderQuickRealtimeFlowBoard();
  refreshQuickRealtimeControls();
  if (
    realtimeTranscribeState.autoCopy
    && lineForActions
    && lineForActions !== realtimeTranscribeState.lastAutoCopiedChunk
  ) {
    realtimeTranscribeState.lastAutoCopiedChunk = lineForActions;
    copyTextToClipboard(lineForActions, { silent: true }).catch(() => {});
  }
  return true;
}

function buildQuickRealtimeInstantAskPrompt(line) {
  const text = normalizeRealtimeTranscriptChunk(line);
  if (!text) {
    return "";
  }
  return [
    "Interview/meeting live line:",
    `"${text}"`,
    "",
    "Give:",
    "1) Best concise response",
    "2) Best follow-up question",
    "3) One meeting note bullet"
  ].join("\n");
}

function runQuickRealtimeInstantAsk(options = {}) {
  const line = getQuickRealtimeLastChunk();
  if (!line) {
    setQuickRealtimeStatus("No recent line yet for instant ask.", "error");
    return false;
  }
  if (!chatInput) {
    setQuickRealtimeStatus("Chat input is unavailable.", "error");
    return false;
  }
  const prompt = buildQuickRealtimeInstantAskPrompt(line);
  if (!prompt) {
    setQuickRealtimeStatus("No recent line yet for instant ask.", "error");
    return false;
  }
  const previous = String(chatInput.value || "").trim();
  chatInput.value = previous ? `${previous}\n\n${prompt}` : prompt;
  if (typeof chatInput.focus === "function") {
    chatInput.focus();
  }
  if (options.submit) {
    const submitted = submitChatFormFromQuickUi();
    if (submitted) {
      setQuickRealtimeStatus("Instant ask submitted from latest line.", "live");
      return true;
    }
    setQuickRealtimeStatus("Prepared instant ask prompt. Submit when ready.", "live");
    return true;
  }
  setQuickRealtimeStatus("Latest line inserted into prompt.", "live");
  return true;
}

function countQuickInterviewWords(value) {
  const words = String(value || "").trim().match(/\S+/g);
  return words ? words.length : 0;
}

function updateQuickInterviewQuestionCounter() {
  if (!quickInterviewQuestionCount) {
    return;
  }
  const count = countQuickInterviewWords(quickInterviewQuestion?.value || "");
  quickInterviewQuestionCount.textContent = `${count}/${QUICK_INTERVIEW_MAX_WORDS} words`;
  quickInterviewQuestionCount.classList.remove("is-live", "is-error");
  if (count > QUICK_INTERVIEW_MAX_WORDS) {
    quickInterviewQuestionCount.classList.add("is-error");
  } else if (count > 0) {
    quickInterviewQuestionCount.classList.add("is-live");
  }
}

function fillQuickInterviewWithLastLine() {
  if (!quickInterviewQuestion) {
    return false;
  }
  const line = getQuickRealtimeLastChunk();
  if (!line) {
    setQuickRealtimeStatus("No recent line yet to use.", "error");
    return false;
  }
  quickInterviewQuestion.value = `From live transcript: "${line}"\n\nHelp me respond concisely and propose one smart follow-up.`;
  updateQuickInterviewQuestionCounter();
  refreshQuickRealtimeControls();
  if (typeof quickInterviewQuestion.focus === "function") {
    quickInterviewQuestion.focus();
  }
  setQuickRealtimeStatus("Latest line inserted into Copilot question box.", "live");
  return true;
}

function clearQuickInterviewQuestion() {
  if (!quickInterviewQuestion) {
    return;
  }
  quickInterviewQuestion.value = "";
  updateQuickInterviewQuestionCounter();
  refreshQuickRealtimeControls();
}

function submitQuickInterviewQuestion() {
  if (!quickInterviewQuestion || !chatInput) {
    setQuickRealtimeStatus("Copilot question input is unavailable.", "error");
    return false;
  }
  const question = String(quickInterviewQuestion.value || "").trim();
  if (!question) {
    setQuickRealtimeStatus("Type a Copilot question first.", "error");
    return false;
  }
  const wordCount = countQuickInterviewWords(question);
  if (wordCount > QUICK_INTERVIEW_MAX_WORDS) {
    setQuickRealtimeStatus(`Question is ${wordCount} words. Keep it under ${QUICK_INTERVIEW_MAX_WORDS}.`, "error");
    return false;
  }
  const previous = String(chatInput.value || "").trim();
  const payload = [
    "Interview Copilot question:",
    question
  ].join("\n");
  chatInput.value = previous ? `${previous}\n\n${payload}` : payload;
  const submitted = submitChatFormFromQuickUi();
  if (submitted) {
    setQuickRealtimeStatus("Interview Copilot question sent.", "live");
    return true;
  }
  setQuickRealtimeStatus("Question prepared in chat input. Submit when ready.", "live");
  return true;
}

function handleQuickRealtimeHotkeys(event) {
  if (!event || event.defaultPrevented) {
    return;
  }
  const hasPrimary = Boolean(event.ctrlKey || event.metaKey);
  if (!hasPrimary || !event.shiftKey || event.altKey) {
    return;
  }
  const key = String(event.key || "").trim().toLowerCase();
  if (key === "m") {
    event.preventDefault();
    if (realtimeTranscribeState.active) {
      stopQuickRealtimeTranscription({ reason: "Stopped by Ctrl+Shift+M." });
      return;
    }
    startQuickRealtimeTranscription({
      captureSource: quickRealtimeSourceSelect?.value || realtimeTranscribeState.captureSource
    }).catch((error) => {
      setQuickRealtimeStatus(`Start failed: ${String(error?.message || error)}`, "error");
    });
    return;
  }
  if (key === "k") {
    event.preventDefault();
    runQuickRealtimeInstantAsk({ submit: true });
    return;
  }
  if (key === "l") {
    event.preventDefault();
    copyQuickRealtimeLastLine().catch((error) => {
      setQuickRealtimeStatus(`Copy last line failed: ${String(error?.message || error)}`, "error");
    });
    return;
  }
  if (key === "=" || key === "+" || key === "/" || key === "?") {
    event.preventDefault();
    setQuickRealtimeStatus("Hotkeys: Ctrl+Shift+M start/stop, Ctrl+Shift+K instant ask, Ctrl+Shift+L copy last line.", "live");
  }
}

function pickRealtimeTranscribeMimeType() {
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

function buildRealtimeTranscribeSessionId() {
  return `rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRealtimeTranscriptChunk(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function mergeRealtimeTranscript(previous, incoming) {
  const prior = normalizeRealtimeTranscriptChunk(previous);
  const next = normalizeRealtimeTranscriptChunk(incoming);
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
  if (merged.length > REALTIME_TRANSCRIBE_MAX_TEXT_CHARS) {
    merged = merged.slice(merged.length - REALTIME_TRANSCRIBE_MAX_TEXT_CHARS).trimStart();
  }
  return merged;
}

function realtimeBlobToBase64(blob) {
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

function buildRealtimePayloadBlob(blob) {
  if (!(blob instanceof Blob) || blob.size < 1) {
    return blob;
  }
  if (!realtimeTranscribeState.seedBlob) {
    realtimeTranscribeState.seedBlob = blob;
    return blob;
  }
  const seed = realtimeTranscribeState.seedBlob;
  if (!(seed instanceof Blob) || seed.size < 1 || seed === blob) {
    return blob;
  }
  const mime = String(realtimeTranscribeState.mimeType || blob.type || seed.type || "").toLowerCase();
  const needsSeed = mime.includes("webm") || mime.includes("ogg");
  if (!needsSeed) {
    return blob;
  }
  const stitched = new Blob(
    [seed, blob],
    { type: realtimeTranscribeState.mimeType || blob.type || seed.type || "audio/webm" }
  );
  if (stitched.size > REALTIME_TRANSCRIBE_MAX_PENDING_BLOB_BYTES) {
    return blob;
  }
  return stitched;
}

async function processRealtimeTranscribeQueue() {
  if (realtimeTranscribeState.sending || !realtimeTranscribeState.active) {
    return;
  }
  const next = realtimeTranscribeState.chunkQueue.shift();
  if (!next) {
    return;
  }
  realtimeTranscribeState.sending = true;
  const activeSessionId = String(realtimeTranscribeState.sessionId || "");
  try {
    const audioBase64 = await realtimeBlobToBase64(next.blob);
    const payload = await apiPost("/api/voice/transcribe-chunk", {
      sessionId: activeSessionId,
      sequence: next.sequence,
      mimeType: realtimeTranscribeState.mimeType || next.blob.type || "audio/webm",
      audioBase64,
      language: "en",
      model: REALTIME_TRANSCRIBE_MODEL,
      timeoutMs: 20000
    });
    if (!realtimeTranscribeState.active || String(realtimeTranscribeState.sessionId || "") !== activeSessionId) {
      return;
    }
    const chunkText = normalizeRealtimeTranscriptChunk(payload?.text);
    if (chunkText) {
      appendRealtimeTranscriptChunk(chunkText, {
        at: Date.now(),
        laneId: realtimeTranscribeState.captureSource || "default",
        direction: "incoming",
        source: "browser_audio"
      });
    } else {
      realtimeTranscribeState.emptyChunkStreak += 1;
    }
    const queued = realtimeTranscribeState.chunkQueue.length;
    if (realtimeTranscribeState.active) {
      if (!realtimeTranscribeState.captureActive || realtimeTranscribeState.draining) {
        setQuickRealtimeStatus(
          queued > 0 ? `Finalizing transcript (${queued} queued)...` : "Finalizing transcript...",
          "live"
        );
      } else {
        const noSpeechYet = realtimeTranscribeState.emptyChunkStreak >= 3 && !realtimeTranscribeState.transcript;
        setQuickRealtimeStatus(
          noSpeechYet
            ? (queued > 0 ? `Capturing (${queued} queued, no speech detected yet)` : "Capturing (no speech detected yet)")
            : (queued > 0 ? `Capturing (${queued} queued)` : "Capturing"),
          "live"
        );
      }
    }
  } catch (error) {
    const message = String(error?.message || "Chunk transcription failed.");
    setQuickRealtimeStatus(`Caption error: ${message}`, "error");
  } finally {
    realtimeTranscribeState.sending = false;
    if (realtimeTranscribeState.active && realtimeTranscribeState.chunkQueue.length > 0) {
      processRealtimeTranscribeQueue().catch(() => {});
      return;
    }
    if (
      realtimeTranscribeState.active
      && !realtimeTranscribeState.captureActive
      && !realtimeTranscribeState.sending
      && realtimeTranscribeState.chunkQueue.length < 1
    ) {
      finalizeRealtimeTranscription(
        realtimeTranscribeState.finalizeReason || "Captions stopped.",
        realtimeTranscribeState.finalizeLevel || ""
      );
    }
  }
}

function queueRealtimeTranscribeChunk(blob) {
  if (!realtimeTranscribeState.active || !blob || blob.size < 1) {
    return;
  }
  const payloadBlob = buildRealtimePayloadBlob(blob);
  realtimeTranscribeState.sequence += 1;
  if (realtimeTranscribeState.chunkQueue.length >= REALTIME_TRANSCRIBE_MAX_QUEUE) {
    const tailIndex = realtimeTranscribeState.chunkQueue.length - 1;
    const tail = tailIndex >= 0 ? realtimeTranscribeState.chunkQueue[tailIndex] : null;
    if (tail?.blob) {
      const merged = new Blob(
        [tail.blob, payloadBlob],
        { type: realtimeTranscribeState.mimeType || payloadBlob.type || tail.blob.type || "audio/webm" }
      );
      if (merged.size <= REALTIME_TRANSCRIBE_MAX_PENDING_BLOB_BYTES) {
        tail.blob = merged;
        tail.sequence = realtimeTranscribeState.sequence;
        realtimeTranscribeState.backpressureMerges += 1;
        setQuickRealtimeStatus(
          `Capturing (${realtimeTranscribeState.chunkQueue.length} queued, stabilizing...)`,
          "live"
        );
        return;
      }
    }
    realtimeTranscribeState.chunkQueue.shift();
    setQuickRealtimeStatus("Captions under heavy load. Dropping oldest chunk to recover.", "error");
  }
  let softDropped = 0;
  while (realtimeTranscribeState.chunkQueue.length >= REALTIME_TRANSCRIBE_SOFT_QUEUE) {
    realtimeTranscribeState.chunkQueue.shift();
    softDropped += 1;
  }
  if (softDropped > 0) {
    realtimeTranscribeState.droppedChunks += softDropped;
    setQuickRealtimeStatus(
      `Capturing (${realtimeTranscribeState.chunkQueue.length} queued, keeping live...)`,
      "live"
    );
  }
  realtimeTranscribeState.chunkQueue.push({
    blob: payloadBlob,
    sequence: realtimeTranscribeState.sequence
  });
  processRealtimeTranscribeQueue().catch(() => {});
}

function stopRealtimeTranscribeStreamTracks() {
  if (!realtimeTranscribeState.stream) {
    return;
  }
  for (const track of realtimeTranscribeState.stream.getTracks()) {
    try {
      track.stop();
    } catch {}
  }
  realtimeTranscribeState.stream = null;
}

function finalizeRealtimeTranscription(reason = "", level = "") {
  clearRealtimeServerPollTimer();
  clearMeetCaptionBridgePollTimer();
  clearMeetCaptionBridgeLaneStatusTimer();
  bumpMeetCaptionBridgeRunToken();
  realtimeTranscribeState.active = false;
  realtimeTranscribeState.captureActive = false;
  realtimeTranscribeState.draining = false;
  realtimeTranscribeState.sending = false;
  realtimeTranscribeState.chunkQueue = [];
  realtimeTranscribeState.sequence = 0;
  realtimeTranscribeState.sessionId = "";
  realtimeTranscribeState.mimeType = "";
  realtimeTranscribeState.seedBlob = null;
  realtimeTranscribeState.mode = "browser";
  realtimeTranscribeState.stopRequested = false;
  realtimeTranscribeState.backpressureMerges = 0;
  realtimeTranscribeState.droppedChunks = 0;
  realtimeTranscribeState.emptyChunkStreak = 0;
  realtimeTranscribeState.serverLastSegmentIndex = 0;
  realtimeTranscribeState.meetBridgeLastId = 0;
  realtimeTranscribeState.meetBridgeLaneCount = 0;
  realtimeTranscribeState.meetBridgeActiveLaneCount = 0;
  realtimeTranscribeState.meetBridgeStaleLaneCount = 0;
  clearMeetCaptionBridgePollingError();
  realtimeTranscribeState.finalizeReason = "";
  realtimeTranscribeState.finalizeLevel = "";
  realtimeTranscribeState.lastCompatTranscript = "";
  realtimeTranscribeState.lastMirroredChatLine = "";
  realtimeTranscribeState.recorder = null;
  stopRealtimeTranscribeStreamTracks();
  refreshQuickRealtimeControls();
  if (reason) {
    setQuickRealtimeStatus(reason, level);
  }
}

function beginRealtimeTranscriptionDrain(reason = "", level = "") {
  if (!realtimeTranscribeState.active) {
    return;
  }
  realtimeTranscribeState.captureActive = false;
  realtimeTranscribeState.draining = true;
  if (reason) {
    realtimeTranscribeState.finalizeReason = reason;
  }
  if (level) {
    realtimeTranscribeState.finalizeLevel = level;
  }
  if (realtimeTranscribeState.sending || realtimeTranscribeState.chunkQueue.length > 0) {
    const queued = realtimeTranscribeState.chunkQueue.length;
    setQuickRealtimeStatus(
      queued > 0 ? `Finalizing transcript (${queued} queued)...` : "Finalizing transcript...",
      "live"
    );
    if (!realtimeTranscribeState.sending && queued > 0) {
      processRealtimeTranscribeQueue().catch(() => {});
    }
    return;
  }
  finalizeRealtimeTranscription(
    realtimeTranscribeState.finalizeReason
      || reason
      || ((realtimeTranscribeState.emptyChunkStreak >= 3 && !realtimeTranscribeState.transcript)
        ? "Captions stopped. No speech detected; verify Share tab audio in Chrome picker."
        : "Captions stopped."),
    realtimeTranscribeState.finalizeLevel || level
  );
}

function stopQuickRealtimeTranscription(options = {}) {
  const reason = String(options.reason || "").trim();
  const level = String(options.level || "").trim();
  if (isCaptionBridgeSource(realtimeTranscribeState.mode)) {
    realtimeTranscribeState.stopRequested = true;
    if (reason) {
      realtimeTranscribeState.finalizeReason = reason;
    }
    if (level) {
      realtimeTranscribeState.finalizeLevel = level;
    }
    finalizeRealtimeTranscription(reason || "Caption bridge stopped.", level || "live");
    return;
  }
  if (realtimeTranscribeState.mode === "server_loopback") {
    realtimeTranscribeState.stopRequested = true;
    if (reason) {
      realtimeTranscribeState.finalizeReason = reason;
    }
    if (level) {
      realtimeTranscribeState.finalizeLevel = level;
    }
    apiPost("/api/voice/live/stop", {
      reason: reason || "Stopped from quick UI."
    }).catch(() => {});
    finalizeRealtimeTranscription(reason || "Captions stopped.", level || "live");
    return;
  }
  const recorder = realtimeTranscribeState.recorder;
  realtimeTranscribeState.stopRequested = true;
  if (reason) {
    realtimeTranscribeState.finalizeReason = reason;
  }
  if (level) {
    realtimeTranscribeState.finalizeLevel = level;
  }
  if (recorder && recorder.state !== "inactive") {
    try {
      recorder.stop();
      setQuickRealtimeStatus(reason || "Stopping capture. Finalizing transcript...", level || "live");
      return;
    } catch {}
  }
  beginRealtimeTranscriptionDrain(reason || "Captions stopped.", level);
}

async function startQuickRealtimeTranscription(options = {}) {
  if (realtimeTranscribeState.active) {
    return;
  }
  const captureSource = normalizeRealtimeCaptureSource(
    options.captureSource || quickRealtimeSourceSelect?.value || realtimeTranscribeState.captureSource,
    realtimeTranscribeState.captureSource
  );
  realtimeTranscribeState.captureSource = captureSource;
  if (isCaptionBridgeSource(captureSource) && !realtimeTranscribeState.autoMirrorToChat) {
    realtimeTranscribeState.autoMirrorToChat = true;
    if (quickRealtimeMirrorToChatToggle) {
      quickRealtimeMirrorToChatToggle.checked = true;
    }
    saveRealtimeFlowPrefs();
  }
  realtimeTranscribeState.transcript = "";
  realtimeTranscribeState.lastChunk = "";
  realtimeTranscribeState.lastAutoCopiedChunk = "";
  realtimeTranscribeState.lastMirroredChatLine = "";
  realtimeTranscribeState.lastSpeaker = "";
  realtimeTranscribeState.lastCompatTranscript = "";
  realtimeTranscribeState.entries = [];
  resetRealtimeFlowState();
  renderQuickRealtimeTranscript();
  syncQuickRealtimeCaptureSourceControl();
  syncQuickRealtimeTranscriptSourceControl();
  bumpMeetCaptionBridgeRunToken();
  clearMeetCaptionBridgePollTimer();
  clearMeetCaptionBridgeLaneStatusTimer();
  realtimeTranscribeState.meetBridgeLastId = 0;
  realtimeTranscribeState.meetBridgeLaneCount = 0;
  realtimeTranscribeState.meetBridgeActiveLaneCount = 0;
  realtimeTranscribeState.meetBridgeStaleLaneCount = 0;
  clearMeetCaptionBridgePollingError();
  if (!["server_loopback", "google_meet_caption", "custom_caption"].includes(captureSource) && (!window.MediaRecorder || !realtimeTranscribeState.supported)) {
    setQuickRealtimeStatus("Realtime capture is not supported in this browser.", "error");
    return;
  }
  try {
    let sttRuntime = getSpeechToTextRuntimeSnapshot({});
    let voiceStatus = null;
    if (!isCaptionBridgeSource(captureSource)) {
      voiceStatus = await request("/api/voice/status");
      sttRuntime = getSpeechToTextRuntimeSnapshot(voiceStatus);
      if (!sttRuntime.available) {
        throw new Error(sttRuntime.unavailableMessage);
      }
      setQuickRealtimeStatus(`Speech-to-text ready (${sttRuntime.modeLabel}). Preparing capture...`, "live");
    }
    if (captureSource === "server_loopback") {
      await apiPost("/api/voice/live/stop", { reason: "Switching source." }).catch(() => {});
      const liveStart = await apiPost("/api/voice/live/start", {
        captureMode: voiceInputCaptureMode || "wasapi_loopback",
        inputDevice: voiceInputDevice || undefined,
        chunkSeconds: 1,
        language: "en",
        model: REALTIME_TRANSCRIBE_MODEL
      });
      const live = liveStart?.live || {};
      realtimeTranscribeState.active = true;
      realtimeTranscribeState.captureActive = true;
      realtimeTranscribeState.draining = false;
      realtimeTranscribeState.stream = null;
      realtimeTranscribeState.recorder = null;
      realtimeTranscribeState.mimeType = "audio/wav";
      realtimeTranscribeState.seedBlob = null;
      realtimeTranscribeState.mode = "server_loopback";
      realtimeTranscribeState.sessionId = String(live.sessionId || buildRealtimeTranscribeSessionId());
      realtimeTranscribeState.serverLastSegmentIndex = 0;
      realtimeTranscribeState.chunkQueue = [];
      realtimeTranscribeState.sending = false;
      realtimeTranscribeState.sequence = 0;
      realtimeTranscribeState.stopRequested = false;
      realtimeTranscribeState.backpressureMerges = 0;
      realtimeTranscribeState.droppedChunks = 0;
      realtimeTranscribeState.emptyChunkStreak = 0;
      realtimeTranscribeState.finalizeReason = "";
      realtimeTranscribeState.finalizeLevel = "";
      realtimeTranscribeState.lastCompatTranscript = "";
      realtimeTranscribeState.transcript = String(live.transcript || "").trim();
      seedQuickRealtimeStateFromTranscriptText(160);
      if (normalizeRealtimeTranscriptSource(realtimeTranscribeState.transcriptSource, "live") !== "live") {
        try {
          const compat = await pullLiveTranscriptCompatSnapshot({
            source: realtimeTranscribeState.transcriptSource,
            bridgeMaxEntries: 220
          });
          applyLiveTranscriptCompatSnapshot(compat);
        } catch (error) {
          console.warn("live transcript compatibility warmup warning:", String(error?.message || error || "compat_warmup_failed"));
        }
      }
      renderQuickRealtimeTranscript();
      refreshQuickRealtimeControls();
      setQuickRealtimeStatus(`Capturing system audio (server loopback) via ${sttRuntime.modeLabel}...`, "live");
      startRealtimeServerLoopbackPolling(realtimeTranscribeState.sessionId);
      return;
    }
    if (isCaptionBridgeSource(captureSource)) {
      const bridgeLabel = getCaptionBridgeSourceLabel(captureSource);
      try {
        window.name = "asolaria_caption_receiver";
      } catch {
        // best effort
      }
      realtimeTranscribeState.active = true;
      realtimeTranscribeState.captureActive = true;
      realtimeTranscribeState.draining = false;
      realtimeTranscribeState.stream = null;
      realtimeTranscribeState.recorder = null;
      realtimeTranscribeState.mimeType = "text/plain";
      realtimeTranscribeState.seedBlob = null;
      realtimeTranscribeState.mode = captureSource;
      realtimeTranscribeState.sessionId = buildRealtimeTranscribeSessionId();
      realtimeTranscribeState.serverLastSegmentIndex = 0;
      realtimeTranscribeState.chunkQueue = [];
      realtimeTranscribeState.sending = false;
      realtimeTranscribeState.sequence = 0;
      realtimeTranscribeState.stopRequested = false;
      realtimeTranscribeState.backpressureMerges = 0;
      realtimeTranscribeState.droppedChunks = 0;
      realtimeTranscribeState.emptyChunkStreak = 0;
      realtimeTranscribeState.finalizeReason = "";
      realtimeTranscribeState.finalizeLevel = "";
      realtimeTranscribeState.lastCompatTranscript = "";
      realtimeTranscribeState.transcript = "";
      realtimeTranscribeState.meetBridgeLastId = 0;
      realtimeTranscribeState.meetBridgeLaneCount = 0;
      realtimeTranscribeState.meetBridgeActiveLaneCount = 0;
      realtimeTranscribeState.meetBridgeStaleLaneCount = 0;
      clearMeetCaptionBridgePollingError();
      try {
        await apiPost("/api/voice/bridge-caption/reset", {
          source: captureSource,
          sessionId: realtimeTranscribeState.sessionId
        });
      } catch (error) {
        console.warn("caption bridge reset warning:", String(error?.message || error || "bridge_reset_failed"));
      }
      try {
        await apiPost("/api/voice/bridge-caption/orchestrator/start", {
          reason: "quick_realtime_caption_start",
          sessionId: realtimeTranscribeState.sessionId,
          mode: "passive",
          analysisEnabled: realtimeTranscribeState.flowAnalysisEnabled,
          analysisMode: realtimeTranscribeState.flowAnalysisEnabled ? "heuristic" : "off"
        });
      } catch (error) {
        console.warn("caption orchestrator start warning:", String(error?.message || error || "orchestrator_start_failed"));
      }
      startMeetCaptionBridgePolling();
      renderQuickRealtimeTranscript();
      refreshQuickRealtimeControls();
      if (captureSource === "custom_caption") {
        setQuickRealtimeStatus("Custom bridge ready. Click 'Copy Custom Bridge Script' and run it in the target tab DevTools console. Script is session-safe and reusable.", "live");
      } else {
        setQuickRealtimeStatus("Google Meet bridge ready. Click 'Copy Meet Bridge Script' and run it in Meet tab DevTools console. Script is session-safe and reusable.", "live");
      }
      return;
    }
    const sttHint = isCaptionBridgeSource(captureSource) || !sttRuntime.available
      ? ""
      : ` Speech-to-text: ${sttRuntime.modeLabel}.`;
    setQuickRealtimeStatus(`${buildRealtimeCapturePrompt(captureSource)}${sttHint}`, "live");
    const stream = await requestQuickRealtimeCaptureStream(captureSource);
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length < 1) {
      stopRealtimeTranscribeStreamTracks();
      throw new Error(buildRealtimeNoAudioTrackMessage(captureSource));
    }
    const recorderStream = new MediaStream(audioTracks);
    const preferredMimeType = pickRealtimeTranscribeMimeType();
    const recorder = preferredMimeType
      ? new MediaRecorder(recorderStream, { mimeType: preferredMimeType })
      : new MediaRecorder(recorderStream);
    realtimeTranscribeState.active = true;
    realtimeTranscribeState.captureActive = true;
    realtimeTranscribeState.draining = false;
    realtimeTranscribeState.stream = stream;
    realtimeTranscribeState.recorder = recorder;
    realtimeTranscribeState.mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
    realtimeTranscribeState.seedBlob = null;
    realtimeTranscribeState.mode = "browser";
    realtimeTranscribeState.sessionId = buildRealtimeTranscribeSessionId();
    realtimeTranscribeState.chunkQueue = [];
    realtimeTranscribeState.sending = false;
    realtimeTranscribeState.sequence = 0;
    realtimeTranscribeState.stopRequested = false;
    realtimeTranscribeState.backpressureMerges = 0;
    realtimeTranscribeState.droppedChunks = 0;
    realtimeTranscribeState.emptyChunkStreak = 0;
    realtimeTranscribeState.finalizeReason = "";
    realtimeTranscribeState.finalizeLevel = "";

    recorder.ondataavailable = (event) => {
      queueRealtimeTranscribeChunk(event.data);
    };
    recorder.onerror = (event) => {
      const message = String(event?.error?.message || event?.error || "Recorder error");
      setQuickRealtimeStatus(`Capture error: ${message}`, "error");
    };
    recorder.onstop = () => {
      const manual = realtimeTranscribeState.stopRequested;
      const finalizeReason = String(realtimeTranscribeState.finalizeReason || "").trim()
        || (manual ? "Captions stopped." : "Capture ended.");
      const finalizeLevel = String(realtimeTranscribeState.finalizeLevel || "").trim()
        || (manual ? "live" : "");
      beginRealtimeTranscriptionDrain(
        finalizeReason,
        finalizeLevel
      );
    };
    for (const track of audioTracks) {
      track.addEventListener("ended", () => {
        if (realtimeTranscribeState.active) {
          stopQuickRealtimeTranscription({ reason: "Capture ended." });
        }
      }, { once: true });
    }

    recorder.start(REALTIME_TRANSCRIBE_TIMESLICE_MS);
    refreshQuickRealtimeControls();
    const captureStatus = isCaptionBridgeSource(captureSource) || !sttRuntime.available
      ? `Capturing ${describeRealtimeCaptureSource(captureSource)}...`
      : `Capturing ${describeRealtimeCaptureSource(captureSource)} via ${sttRuntime.modeLabel}...`;
    setQuickRealtimeStatus(captureStatus, "live");
  } catch (error) {
    const message = String(error?.message || "Failed to start realtime captions.");
    finalizeRealtimeTranscription();
    const normalizedMessage = message.toLowerCase();
    const browserCaptureSource = !isCaptionBridgeSource(captureSource) && captureSource !== "server_loopback";
    const looksLikeComFailure = browserCaptureSource
      && (
        normalizedMessage.includes("com")
        || normalizedMessage.includes("0x")
        || normalizedMessage.includes("catastrophic")
        || normalizedMessage.includes("media foundation")
      )
      && (
        normalizedMessage.includes("fail")
        || normalizedMessage.includes("error")
        || normalizedMessage.includes("exception")
        || normalizedMessage.includes("aborted")
      );
    if (looksLikeComFailure) {
      setQuickRealtimeStatus("Capture COM/media failure detected. Switching to System Audio (Server Loopback)...", "error");
      try {
        await startQuickRealtimeTranscription({ captureSource: "server_loopback" });
        return;
      } catch (fallbackError) {
        setQuickRealtimeStatus(`Fallback failed: ${String(fallbackError?.message || fallbackError)}`, "error");
        return;
      }
    }
    setQuickRealtimeStatus(message, "error");
  }
}

function clearQuickRealtimeTranscript() {
  realtimeTranscribeState.transcript = "";
  realtimeTranscribeState.lastChunk = "";
  realtimeTranscribeState.lastAutoCopiedChunk = "";
  realtimeTranscribeState.lastMirroredChatLine = "";
  realtimeTranscribeState.lastSpeaker = "";
  realtimeTranscribeState.lastCompatTranscript = "";
  realtimeTranscribeState.entries = [];
  resetRealtimeFlowState();
  renderQuickRealtimeTranscript();
  refreshQuickRealtimeControls();
}

async function copyQuickRealtimeTranscript() {
  const text = buildQuickRealtimeTranscriptCopyPayload();
  if (!text) {
    return;
  }
  await copyTextToClipboard(text);
  setQuickRealtimeStatus("Transcript copied as chat text.", "live");
}

async function copyQuickRealtimeLastLine() {
  const text = getQuickRealtimeLastChunk();
  if (!text) {
    setQuickRealtimeStatus("No recent line to copy yet.", "error");
    return;
  }
  await copyTextToClipboard(text);
  setQuickRealtimeStatus("Last line copied.", "live");
}

function submitChatFormFromQuickUi() {
  const message = String(chatInput?.value || "").trim();
  if (!message || !chatForm) {
    return false;
  }
  if (typeof chatForm.requestSubmit === "function") {
    chatForm.requestSubmit();
  } else {
    chatForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }
  return true;
}

function buildQuickVoiceRecognition() {
  const SpeechCtor = getSpeechRecognitionCtor();
  if (!SpeechCtor) {
    return null;
  }

  const recognition = new SpeechCtor();
  recognition.lang = getPreferredSpeechLang(voiceWakeWord);
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  applySpeechRecognitionHints(recognition, voiceWakeWord);

  recognition.onstart = () => {
    quickVoiceListening = true;
    quickVoiceRequested = true;
    refreshQuickVoiceControls();
    setQuickVoiceStatus(
      quickVoiceOneShot
        ? "Listening for one command..."
        : "Listening. Your speech will be added to chat.",
      "live"
    );
    setQuickAvatarStatus("Avatar listening...", "listening");
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = String(result?.[0]?.transcript || "").trim();
      if (!transcript) continue;
      if (result.isFinal) {
        finalTranscript += `${transcript} `;
      } else {
        setQuickVoiceStatus(`Listening: ${transcript}`, "live");
      }
    }
    const captured = appendVoiceTranscriptToChat(finalTranscript);
    if (captured) {
      setQuickAvatarStatus("Captured voice input.", "thinking");
      setQuickVoiceStatus("Voice captured and queued in chat.", "live");
      if (quickVoiceOneShot) {
        const submitted = submitChatFormFromQuickUi();
        setQuickAvatarStatus(submitted ? "Voice command sent." : "Voice captured. Review before sending.", "thinking");
      }
    }
  };

  recognition.onerror = (event) => {
    const reason = String(event?.error || "unknown");
    quickVoiceListening = false;
    quickVoiceRequested = false;
    quickVoiceOneShot = false;
    refreshQuickVoiceControls();
    setQuickVoiceStatus(`Voice error: ${reason}`, "error");
    setQuickAvatarStatus("Voice capture interrupted.", "error");
  };

  recognition.onend = () => {
    const wasOneShot = quickVoiceOneShot;
    quickVoiceListening = false;
    quickVoiceRequested = false;
    quickVoiceOneShot = false;
    refreshQuickVoiceControls();
    if (wasOneShot) {
      setQuickVoiceStatus("Voice command complete.");
    } else {
      setQuickVoiceStatus("Voice stopped.");
    }
    setQuickAvatarStatus("Avatar idle. Voice standby.", "idle");
  };

  return recognition;
}

function startQuickVoiceSession(options = {}) {
  if (!voiceEnabled) {
    setQuickVoiceStatus("Voice is disabled. Enable Voice first.", "error");
    setVoiceAvatarStatus("Voice input disabled. Save with Voice on.", "error");
    return false;
  }
  const oneShot = Boolean(options.oneShot);
  if (quickVoiceListening || quickVoiceRequested) {
    quickVoiceOneShot = oneShot;
    refreshQuickVoiceControls();
    return true;
  }
  if (!quickVoiceRecognition) {
    quickVoiceRecognition = buildQuickVoiceRecognition();
  }
  if (!quickVoiceRecognition) {
    setQuickVoiceStatus("Voice input is not supported in this browser.", "error");
    setQuickAvatarStatus("Voice unavailable in current browser.", "error");
    return false;
  }
  quickVoiceOneShot = oneShot;
  quickVoiceRequested = true;
  refreshQuickVoiceControls();
  try {
    quickVoiceRecognition.lang = getPreferredSpeechLang(voiceWakeWord);
    applySpeechRecognitionHints(quickVoiceRecognition, voiceWakeWord);
    quickVoiceRecognition.start();
    return true;
  } catch (error) {
    const message = String(error?.message || "Voice start failed.");
    quickVoiceRequested = false;
    quickVoiceListening = false;
    quickVoiceOneShot = false;
    refreshQuickVoiceControls();
    setQuickVoiceStatus(message, "error");
    setQuickAvatarStatus("Voice start failed.", "error");
    return false;
  }
}

function stopQuickVoiceSession() {
  quickVoiceOneShot = false;
  quickVoiceRequested = false;
  if (quickVoiceAbortTimer) {
    window.clearTimeout(quickVoiceAbortTimer);
    quickVoiceAbortTimer = 0;
  }
  if (quickVoiceRecognition) {
    try {
      quickVoiceRecognition.stop();
    } catch {
      try {
        quickVoiceRecognition.abort();
      } catch {}
    }
    quickVoiceAbortTimer = window.setTimeout(() => {
      if (!quickVoiceRecognition) {
        return;
      }
      if (quickVoiceListening || quickVoiceRequested) {
        try {
          quickVoiceRecognition.abort();
        } catch {}
      }
      quickVoiceAbortTimer = 0;
    }, 300);
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    } catch {}
    currentVoiceAudio = null;
  }
  quickVoiceListening = false;
  refreshQuickVoiceControls();
  setQuickVoiceStatus("Voice stopped.");
  setQuickAvatarStatus("Avatar idle. Voice standby.", "idle");
}

function getPreferredSpeechLang(text = "") {
  const raw = String(text || "").trim().toLowerCase();
  if (raw.startsWith("pt") || raw.includes("portuguese")) {
    return "pt-BR";
  }
  if (raw.startsWith("en") || raw.includes("english")) {
    return "en-US";
  }
  return DEFAULT_SPEECH_LANG;
}

const SPEECH_FEMININE_HINTS = Object.freeze([
  "female",
  "woman",
  "girl",
  "zira",
  "jenny",
  "samantha",
  "aria",
  "ava",
  "victoria",
  "maria",
  "camila",
  "helena",
  "google uk english female"
]);

const SPEECH_MASCULINE_HINTS = Object.freeze([
  "male",
  "man",
  "david",
  "mark",
  "jorge",
  "joao",
  "paulo"
]);

function scoreVoiceFemininity(voice) {
  const name = String(voice?.name || "").trim().toLowerCase();
  if (!name) {
    return 0;
  }
  let score = 0;
  if (SPEECH_FEMININE_HINTS.some((hint) => name.includes(hint))) {
    score += 3;
  }
  if (SPEECH_MASCULINE_HINTS.some((hint) => name.includes(hint))) {
    score -= 2;
  }
  return score;
}

function chooseSpeechVoice(voices = [], lang = "en-US") {
  const list = Array.isArray(voices) ? voices : [];
  if (list.length < 1) {
    return null;
  }
  const normalizedLang = String(lang || "en-US").toLowerCase();
  const sameLang = list.filter((voice) => String(voice?.lang || "").toLowerCase() === normalizedLang);
  if (sameLang.length > 0) {
    const feminineExact = sameLang
      .map((voice) => ({ voice, score: scoreVoiceFemininity(voice) }))
      .sort((a, b) => b.score - a.score)
      .find((entry) => entry.score > 0);
    if (feminineExact?.voice) {
      return feminineExact.voice;
    }
    return sameLang[0];
  }
  const base = normalizedLang.split("-")[0];
  if (base) {
    const sameFamily = list.filter((voice) => String(voice?.lang || "").toLowerCase().startsWith(`${base}-`));
    if (sameFamily.length > 0) {
      const feminineFamily = sameFamily
        .map((voice) => ({ voice, score: scoreVoiceFemininity(voice) }))
        .sort((a, b) => b.score - a.score)
        .find((entry) => entry.score > 0);
      if (feminineFamily?.voice) {
        return feminineFamily.voice;
      }
      return sameFamily[0];
    }
  }
  const enVoices = list.filter((voice) => String(voice?.lang || "").toLowerCase().startsWith("en-"));
  if (enVoices.length > 0) {
    const feminineEnglish = enVoices
      .map((voice) => ({ voice, score: scoreVoiceFemininity(voice) }))
      .sort((a, b) => b.score - a.score)
      .find((entry) => entry.score > 0);
    if (feminineEnglish?.voice) {
      return feminineEnglish.voice;
    }
    return enVoices[0];
  }
  const browserDefaultVoice = list.find((voice) => Boolean(voice?.default));
  if (browserDefaultVoice) {
    return browserDefaultVoice;
  }
  return list[0] || null;
}

function normalizeSpeakableText(value, limit = 700) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  if (cleaned.length <= limit) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(20, limit - 1)).trim()}...`;
}

async function speakTextViaServer(text) {
  const provider = normalizeVoiceOutputMode(voiceOutputMode, "server");
  const data = await apiPost("/api/voice/speak", {
    text,
    provider: provider === "browser" ? "auto" : provider
  });
  if (!data || data.mode === "fallback-text" || data.mode === "browser-client") {
    return false;
  }
  try {
    if (currentVoiceAudio) {
      try {
        currentVoiceAudio.pause();
        currentVoiceAudio.currentTime = 0;
      } catch {}
      currentVoiceAudio = null;
    }
    const audio = new Audio(`/api/voice/latest?v=${Date.now()}`);
    currentVoiceAudio = audio;
    const requestedOutputDevice = normalizeVoiceOutputDeviceId(voiceOutputDeviceId, "default");
    if (
      requestedOutputDevice
      && requestedOutputDevice !== "default"
      && typeof audio.setSinkId === "function"
    ) {
      try {
        await audio.setSinkId(requestedOutputDevice);
      } catch (error) {
        logEvent(`Voice output device fallback to default: ${String(error?.message || error || "setSinkId_failed")}`);
      }
    }
    audio.onended = () => {
      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
    };
    audio.onerror = () => {
      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
    };
    await audio.play();
    return true;
  } catch {
    currentVoiceAudio = null;
    return false;
  }
}

async function speakTextViaBrowser(text) {
  if (!("speechSynthesis" in window)) {
    return false;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const preferredLang = getPreferredSpeechLang(voiceWakeWord);
    const selectedVoice = chooseSpeechVoice(window.speechSynthesis.getVoices(), preferredLang);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || preferredLang;
    } else {
      utterance.lang = preferredLang;
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

async function speakAssistantReply(text, options = {}) {
  if (!voiceEnabled) {
    return;
  }
  if (!voiceAutoSpeakReplies && !options.force) {
    return;
  }
  const content = normalizeSpeakableText(text, 900);
  if (!content) {
    return;
  }
  const source = String(options.source || "assistant").trim();
  setQuickAvatarStatus("Avatar speaking...", "speaking");
  let spoken = false;
  try {
    if (voiceOutputMode === "browser") {
      spoken = await speakTextViaBrowser(content);
    } else {
      spoken = await speakTextViaServer(content);
      if (!spoken) {
        spoken = await speakTextViaBrowser(content);
      }
    }
    if (!spoken) {
      setQuickVoiceStatus("Voice reply unavailable. Check voice tools.", "error");
      setQuickAvatarStatus("Voice reply unavailable.", "error");
      return;
    }
    setQuickVoiceStatus(`Spoken reply (${voiceOutputMode})`, "live");
    setQuickAvatarStatus(`Spoken reply from ${source}.`, "speaking");
  } catch (error) {
    setQuickVoiceStatus(`Speak failed: ${String(error?.message || error || "unknown")}`, "error");
    setQuickAvatarStatus("Voice playback failed.", "error");
  } finally {
    window.setTimeout(() => {
      setQuickAvatarStatus("Avatar idle. Voice standby.", "idle");
    }, 1200);
  }
}

function hasAvatarGreetingRun() {
  try {
    return sessionStorage.getItem(AVATAR_GREETING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markAvatarGreetingRun() {
  try {
    sessionStorage.setItem(AVATAR_GREETING_STORAGE_KEY, "1");
  } catch {}
}

let avatarGreetingInFlight = false;
async function runStartupAvatarGreeting(options = {}) {
  if (avatarGreetingInFlight) {
    return;
  }
  const force = Boolean(options.force);
  if (!force && startupBootstrapActive) {
    return;
  }
  if (!force && hasAvatarGreetingRun()) {
    return;
  }
  if (!force && startupBootstrapInitialGreetingDone) {
    return;
  }
  avatarGreetingInFlight = true;
  startupBootstrapInitialGreetingDone = true;
  const greeting = "Hello, I am Asolaria. Right now, we are loading the main brain.";
  try {
    setQuickAvatarStatus(greeting, "speaking");
    setQuickVoiceStatus("Greeting from Asolaria...", "live");
    pushMessage("brain", greeting, "Avatar");
    await speakAssistantReply(greeting, { source: "Asolaria Hello", force: true });
  } catch (error) {
    setQuickVoiceStatus(`Greeting failed: ${String(error?.message || error || "unknown")}`, "error");
  } finally {
    markAvatarGreetingRun();
    avatarGreetingInFlight = false;
    window.setTimeout(() => {
      if (!quickVoiceListening && !quickVoiceRequested) {
        setQuickAvatarStatus("Avatar idle. Voice standby.", "idle");
      }
    }, 1200);
  }
}

async function runManualVoiceOutputTest(options = {}) {
  if (!voiceEnabled) {
    setQuickVoiceStatus("Voice is disabled. Enable Voice first.", "error");
    setVoiceAvatarStatus("Voice is disabled. Save with Voice on to test.", "error");
    return false;
  }
  const sample = normalizeSpeakableText(
    options.text || `Voice test online. Wake word ${voiceWakeWord || "asolaria"} is ready.`,
    240
  );
  if (!sample) {
    return false;
  }
  setQuickVoiceStatus("Running voice test...", "live");
  setQuickAvatarStatus("Running voice test...", "thinking");
  let spoken = false;
  const preferBrowserPreview = options.preferBrowserPreview !== false;
  try {
    if (preferBrowserPreview) {
      spoken = await speakTextViaBrowser(sample);
      if (!spoken && voiceOutputMode !== "browser") {
        spoken = await speakTextViaServer(sample);
      }
    } else if (voiceOutputMode === "browser") {
      spoken = await speakTextViaBrowser(sample);
    } else {
      spoken = await speakTextViaServer(sample);
      if (!spoken) {
        spoken = await speakTextViaBrowser(sample);
      }
    }
  } catch {
    spoken = false;
  }
  if (!spoken) {
    setQuickVoiceStatus(`Voice test failed (${voiceOutputMode}).`, "error");
    setVoiceAvatarStatus("Voice test failed. Verify output provider and tools.", "error");
    setQuickAvatarStatus("Voice test failed.", "error");
    window.setTimeout(() => {
      setQuickAvatarStatus("Avatar idle. Voice standby.", "idle");
    }, 1200);
    return false;
  }
  setQuickVoiceStatus(`Voice test passed (${voiceOutputMode}).`, "live");
  setVoiceAvatarStatus(`Voice test passed (${voiceOutputMode}).`, "live");
  setQuickAvatarStatus("Voice test complete.", "speaking");
  window.setTimeout(() => {
    setQuickAvatarStatus("Avatar idle. Voice standby.", "idle");
  }, 1000);
  return true;
}

async function saveVoiceAvatarSettings(options = {}) {
  const payload = {
    voiceEnabled: normalizeOnOff(voiceEnabledSelect?.value, voiceEnabled),
    avatarEnabled: normalizeOnOff(avatarEnabledSelect?.value, avatarEnabled),
    avatarMode: normalizeAvatarMode(avatarModeSelect?.value, avatarMode),
    voiceOutputMode: normalizeVoiceOutputMode(
      voiceOutputModeRuntimeSelect?.value || voiceOutputModeSelect?.value || voiceOutputMode,
      voiceOutputMode
    ),
    voiceInputCaptureMode: normalizeVoiceInputCaptureMode(
      voiceInputCaptureModeSelect?.value || voiceInputCaptureMode,
      voiceInputCaptureMode
    ),
    voiceInputDevice: normalizeVoiceInputDevice(
      voiceInputDeviceSelect?.value,
      voiceInputDevice
    ),
    voiceOutputDeviceId: normalizeVoiceOutputDeviceId(
      voiceOutputDeviceIdSelect?.value || voiceOutputDeviceId,
      voiceOutputDeviceId
    ),
    voiceWakeWord: normalizeWakeWord(voiceWakeWordInput?.value, voiceWakeWord),
    kittyTtsUrl: normalizeOptionalUrl(kittyTtsUrlInput?.value, kittyTtsUrl),
    avatarSyncEnabled: normalizeOnOff(avatarEnabledSelect?.value, avatarEnabled),
    voiceAutoSpeakReplies
  };
  const typedApiKey = String(kittyTtsApiKeyInput?.value || "");
  if (typedApiKey || options.clearKittyKey) {
    payload.kittyTtsApiKey = typedApiKey.trim();
  }
  const data = await apiPost("/api/settings", payload);
  applySettingsUi(data.settings || {});
  voiceAvatarDirty = false;
  if (kittyTtsApiKeyInput && typedApiKey) {
    kittyTtsApiKeyInput.value = "";
  }
  setVoiceAvatarStatus("Voice/avatar settings saved.", "live");
  logEvent("Voice/avatar settings saved.");
  return data;
}

function normalizeProjectScopeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function normalizeProjectGroup(value, fallback = "projects") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "all") {
    return "all";
  }
  if (PROJECT_ALLOWED_GROUPS.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeProjectFolders(value) {
  if (Array.isArray(value)) {
    return uniqueNonEmptyStrings(value).slice(0, 120);
  }
  const raw = String(value || "");
  if (!raw.trim()) {
    return [];
  }
  return uniqueNonEmptyStrings(raw.split(/[\n,]/g)).slice(0, 120);
}

function createProjectScopeFromValue(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const id = normalizeProjectScopeId(source.id || source.scopeId || source.name || source.label || "");
  if (!id) {
    return null;
  }
  const label = String(source.label || source.name || (id === "all" ? "All Projects" : id))
    .trim()
    .slice(0, 100) || (id === "all" ? "All Projects" : id);
  const marker = String(source.marker || "").replace(/\r/g, "").trim().slice(0, 80);
  const group = id === "all"
    ? "all"
    : normalizeProjectGroup(source.group, "projects");
  const folders = normalizeProjectFolders(source.folders);
  return {
    id,
    label,
    marker: id === "all" ? "" : marker,
    group,
    folders
  };
}

function buildAllProjectScope(scopes = []) {
  const folders = uniqueNonEmptyStrings(
    scopes.flatMap((scope) => (Array.isArray(scope?.folders) ? scope.folders : []))
  ).slice(0, 200);
  return {
    id: "all",
    label: "All Projects",
    marker: "",
    group: "all",
    folders
  };
}

function buildFallbackProjectScopes() {
  return [buildAllProjectScope([])];
}

function setProjectScopeCatalog(scopes = [], projects = []) {
  const list = [];
  const seen = new Set();
  const scopeRows = Array.isArray(scopes) ? scopes : [];
  for (const raw of scopeRows) {
    const scope = createProjectScopeFromValue(raw);
    if (!scope || !scope.id || scope.id === "all" || seen.has(scope.id)) {
      continue;
    }
    seen.add(scope.id);
    list.push(scope);
  }
  const projectRows = Array.isArray(projects) ? projects : [];
  for (const raw of projectRows) {
    if (Boolean(raw?.archived)) {
      continue;
    }
    const scope = createProjectScopeFromValue(raw);
    if (!scope || !scope.id || scope.id === "all" || seen.has(scope.id)) {
      continue;
    }
    seen.add(scope.id);
    list.push(scope);
  }
  list.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));

  const allScope = buildAllProjectScope(list);
  const explicitAll = scopeRows
    .map((scope) => createProjectScopeFromValue(scope))
    .find((scope) => scope?.id === "all");
  if (explicitAll) {
    allScope.label = explicitAll.label || allScope.label;
    allScope.folders = uniqueNonEmptyStrings([
      ...(explicitAll.folders || []),
      ...allScope.folders
    ]).slice(0, 200);
  }

  projectScopeList = [allScope, ...list];
  projectScopeMap = Object.create(null);
  for (const scope of projectScopeList) {
    projectScopeMap[scope.id] = scope;
  }

  projectCatalogById = Object.create(null);
  for (const raw of projectRows) {
    const scope = createProjectScopeFromValue(raw);
    if (!scope || !scope.id || scope.id === "all") {
      continue;
    }
    projectCatalogById[scope.id] = {
      id: scope.id,
      label: String(raw.label || scope.label || "").trim().slice(0, 100) || scope.label,
      marker: String(raw.marker || scope.marker || "").replace(/\r/g, "").trim().slice(0, 80),
      group: normalizeProjectGroup(raw.group, scope.group || "projects"),
      folders: normalizeProjectFolders(raw.folders),
      archived: Boolean(raw.archived),
      createdAt: String(raw.createdAt || ""),
      updatedAt: String(raw.updatedAt || "")
    };
  }
  for (const scope of list) {
    if (projectCatalogById[scope.id]) {
      continue;
    }
    projectCatalogById[scope.id] = {
      id: scope.id,
      label: scope.label,
      marker: scope.marker,
      group: scope.group,
      folders: scope.folders.slice(0),
      archived: false,
      createdAt: "",
      updatedAt: ""
    };
  }
}

function normalizeProjectScope(value) {
  const normalized = normalizeProjectScopeId(value);
  if (!normalized || !Object.prototype.hasOwnProperty.call(projectScopeMap, normalized)) {
    return "all";
  }
  return normalized;
}

function getActiveProjectScope() {
  const normalized = normalizeProjectScope(activeProjectScope);
  return projectScopeMap[normalized] || projectScopeMap.all || {
    id: "all",
    label: "All Projects",
    marker: "",
    group: "all",
    folders: []
  };
}

function renderProjectScopeNav() {
  if (!projectNav) {
    return;
  }
  const normalized = normalizeProjectScope(activeProjectScope);
  projectNav.innerHTML = "";
  for (const scope of projectScopeList) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-pill";
    button.dataset.project = scope.id;
    button.textContent = scope.label;
    if (scope.marker) {
      button.title = `${scope.marker} ${scope.label}`;
    }
    if (scope.id === normalized) {
      button.classList.add("active");
    }
    projectNav.appendChild(button);
  }
}

function renderProjectFolderTree(scopeId) {
  if (!projectFolderTree) {
    return;
  }
  const normalized = normalizeProjectScope(scopeId);
  const scope = projectScopeMap[normalized] || getActiveProjectScope();
  const allFolders = Array.isArray(scope.folders) ? scope.folders : [];
  const query = String(projectFolderSearch?.value || "").trim().toLowerCase();
  const folders = query
    ? allFolders.filter((folder) => String(folder || "").toLowerCase().includes(query))
    : allFolders;
  projectFolderTree.innerHTML = "";
  const title = document.createElement("div");
  title.className = "folder-tree-title";
  title.textContent = `${scope.label} folders (${folders.length}/${allFolders.length})`;
  projectFolderTree.appendChild(title);
  if (folders.length < 1) {
    const empty = document.createElement("div");
    empty.className = "folder-tree-empty";
    empty.textContent = "No folders match this filter.";
    projectFolderTree.appendChild(empty);
    return;
  }
  for (const folder of folders) {
    const line = document.createElement("div");
    line.className = "folder-tree-item";
    line.textContent = folder;
    projectFolderTree.appendChild(line);
  }
}

function applyProjectScope(scopeId, options = {}) {
  const normalized = normalizeProjectScope(scopeId);
  const scope = projectScopeMap[normalized] || getActiveProjectScope();
  activeProjectScope = normalized;
  if (options.persist !== false) {
    try {
      localStorage.setItem(PROJECT_SCOPE_STORAGE_KEY, normalized);
    } catch {}
  }

  renderProjectScopeNav();
  renderProjectFolderTree(normalized);

  if (taskLedgerTitle) {
    taskLedgerTitle.placeholder = scope.marker
      ? `${scope.marker} task title`
      : "Task title";
  }
  if (taskLedgerDescription) {
    taskLedgerDescription.placeholder = scope.marker
      ? `Notes for ${scope.label}`
      : "Task description (optional)";
  }
  if (memoryStats) {
    memoryStats.dataset.scope = scope.label;
  }

  if (options.syncGroupFilter !== false) {
    applyActionGroupFilter(scope.group || "all");
  }
  if (options.refreshLedger !== false) {
    refreshTaskLedger({ silent: true });
  }
  refreshChatRailTasks({ silent: true }).catch(() => {});
}

async function refreshProjectScopes(options = {}) {
  const limit = Number(options.limit);
  const boundedLimit = Number.isFinite(limit) ? Math.max(20, Math.min(1000, Math.round(limit))) : 500;
  const params = new URLSearchParams();
  params.set("limit", String(boundedLimit));
  if (options.includeArchived) {
    params.set("includeArchived", "true");
  }
  const data = await request(`/api/projects?${params.toString()}`);
  setProjectScopeCatalog(data.scopes, data.projects);
  const preferredScope = options.preferredScopeId || options.scopeId || activeProjectScope || "all";
  applyProjectScope(preferredScope, {
    syncGroupFilter: options.syncGroupFilter !== false,
    refreshLedger: options.refreshLedger !== false
  });
  if (!options.silent) {
    const count = Number(data.count || (Array.isArray(data.projects) ? data.projects.length : 0));
    setProjectAdminMessage(`Loaded ${count} project${count === 1 ? "" : "s"}.`);
  }
  return data;
}

function getProjectForEdit(scopeId) {
  const normalized = normalizeProjectScope(scopeId);
  if (!normalized || normalized === "all") {
    return null;
  }
  const cached = projectCatalogById[normalized];
  if (cached) {
    return JSON.parse(JSON.stringify(cached));
  }
  const scope = projectScopeMap[normalized];
  if (!scope) {
    return null;
  }
  return {
    id: scope.id,
    label: scope.label,
    marker: scope.marker,
    group: scope.group,
    folders: Array.isArray(scope.folders) ? scope.folders.slice(0) : [],
    archived: false,
    createdAt: "",
    updatedAt: ""
  };
}

function setProjectAdminMessage(message, isError = false) {
  if (!projectAdminOutput) {
    return;
  }
  const text = String(message || "").trim();
  projectAdminOutput.textContent = text || "Projects are persisted in local data storage.";
  projectAdminOutput.style.color = isError ? "#ffb8b8" : "";
}

function buildProjectInputPayload(mode, current = null) {
  const baseline = current && typeof current === "object" ? current : {};
  const currentLabel = String(baseline.label || "").trim();
  const labelPrompt = window.prompt("Project label:", currentLabel);
  if (labelPrompt === null) return null;
  const label = String(labelPrompt || "").trim();
  if (!label) {
    throw new Error("Project label is required.");
  }

  let id = "";
  if (mode === "create") {
    const suggestedId = normalizeProjectScopeId(String(baseline.id || label));
    const idPrompt = window.prompt("Project id (optional):", suggestedId);
    if (idPrompt === null) return null;
    id = normalizeProjectScopeId(idPrompt);
    if (id === "all") {
      throw new Error("Project id \"all\" is reserved.");
    }
  }

  const markerPrompt = window.prompt(
    "Marker (optional, e.g. [ASOLARIA]):",
    String(baseline.marker || "").trim()
  );
  if (markerPrompt === null) return null;
  const marker = String(markerPrompt || "").replace(/\r/g, "").trim().slice(0, 80);

  const currentGroup = normalizeProjectGroup(baseline.group, "projects");
  const groupPrompt = window.prompt(
    "Group (projects|tasks|skills|runtime):",
    currentGroup
  );
  if (groupPrompt === null) return null;
  const group = normalizeProjectGroup(groupPrompt, currentGroup || "projects");

  const foldersPrompt = window.prompt(
    "Folders/paths (comma or newline separated):",
    Array.isArray(baseline.folders) ? baseline.folders.join("\n") : ""
  );
  if (foldersPrompt === null) return null;
  const folders = normalizeProjectFolders(foldersPrompt);

  const payload = {
    label,
    marker,
    group,
    folders
  };
  if (mode === "create" && id) {
    payload.id = id;
  }
  return payload;
}

async function createProjectFromUi() {
  const payload = buildProjectInputPayload("create");
  if (!payload) return;
  const created = await apiPost("/api/projects", payload);
  const newScope = normalizeProjectScopeId(created?.project?.id || payload.id || payload.label || "");
  await refreshProjectScopes({
    preferredScopeId: newScope || activeProjectScope,
    syncGroupFilter: true,
    refreshLedger: true,
    silent: true
  });
  setProjectAdminMessage(`Project created: ${created?.project?.label || payload.label}`);
}

async function updateSelectedProjectFromUi() {
  const selected = getProjectForEdit(activeProjectScope);
  if (!selected || !selected.id || selected.id === "all") {
    throw new Error("Select a specific project before editing.");
  }
  const payload = buildProjectInputPayload("update", selected);
  if (!payload) return;
  await request(`/api/projects/${encodeURIComponent(selected.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  await refreshProjectScopes({
    preferredScopeId: selected.id,
    syncGroupFilter: true,
    refreshLedger: true,
    silent: true
  });
  setProjectAdminMessage(`Project updated: ${payload.label}`);
}

async function deleteSelectedProjectFromUi() {
  const selected = getProjectForEdit(activeProjectScope);
  if (!selected || !selected.id || selected.id === "all") {
    throw new Error("Select a specific project before deleting.");
  }
  const confirmed = window.confirm(`Delete project "${selected.label}"?\n\nOK = continue\nCancel = keep project`);
  if (!confirmed) return;
  const hard = window.confirm(`Hard delete "${selected.label}" permanently?\n\nOK = hard delete\nCancel = archive (soft delete)`);
  const query = hard ? "?hard=true" : "";
  await request(`/api/projects/${encodeURIComponent(selected.id)}${query}`, {
    method: "DELETE"
  });
  await refreshProjectScopes({
    preferredScopeId: "all",
    syncGroupFilter: true,
    refreshLedger: true,
    silent: true
  });
  setProjectAdminMessage(`${hard ? "Deleted" : "Archived"} project: ${selected.label}`);
}

setProjectScopeCatalog([], []);

function applyActionGroupFilter(group) {
  const normalized = String(group || "all").trim().toLowerCase() || "all";
  const cards = Array.from(document.querySelectorAll(".action-panel .card[data-group]"));
  for (const card of cards) {
    const cardGroup = String(card.getAttribute("data-group") || "runtime").trim().toLowerCase();
    const alwaysVisible = card.id === "workspaceCard" || card.id === "colonyDashboardCard";
    const match = alwaysVisible || normalized === "all" || cardGroup === normalized;
    card.classList.toggle("group-hidden", !match);
  }
  if (railFilter) {
    const buttons = Array.from(railFilter.querySelectorAll(".rail-filter-btn"));
    for (const button of buttons) {
      const btnGroup = String(button.dataset.group || "").trim().toLowerCase();
      button.classList.toggle("active", btnGroup === normalized);
    }
  }
}

function logEvent(text) {
  const row = document.createElement("div");
  row.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  eventLog.prepend(row);
}

function normalizeChatThreadId(value, fallback = DEFAULT_CHAT_THREAD_ID) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (normalized) return normalized;
  return String(fallback || DEFAULT_CHAT_THREAD_ID);
}

function normalizeChatRouteMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "direct"
    || normalized === "direct_codex"
    || normalized === "direct-codex"
    || normalized === "super_admin"
    || normalized === "super-admin"
    || normalized === "internal"
  ) {
    return "direct";
  }
  return normalized === "deep" ? "deep" : "normal";
}

function normalizeChatRailSection(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "tasks" || normalized === "chats") {
    return normalized;
  }
  return "apps";
}

function buildChatThreadTitle(value, fallback = "New Chat") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return fallback;
  }
  return text.length > 70 ? `${text.slice(0, 67).trim()}...` : text;
}

function parseIsoTimeMs(value) {
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLocalDayKey(ms = Date.now()) {
  const date = new Date(Number(ms) || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeFocusTurnover(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(source.day || "").trim())
    ? String(source.day).trim()
    : buildLocalDayKey();
  const parseCount = (input) => {
    const parsed = Number.parseInt(String(input ?? 0), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  };
  return {
    day,
    adds: parseCount(source.adds),
    removes: parseCount(source.removes),
    replacements: parseCount(source.replacements),
    clears: parseCount(source.clears)
  };
}

function ensureFocusTurnoverDay() {
  const today = buildLocalDayKey();
  if (chatFocusTurnover.day !== today) {
    chatFocusTurnover = sanitizeFocusTurnover({ day: today });
    saveFocusTurnoverState();
  }
}

function saveFocusTurnoverState() {
  try {
    localStorage.setItem(CHAT_FOCUS_TURNOVER_STORAGE_KEY, JSON.stringify(chatFocusTurnover));
  } catch {}
}

function loadFocusTurnoverState() {
  try {
    const raw = localStorage.getItem(CHAT_FOCUS_TURNOVER_STORAGE_KEY) || "{}";
    chatFocusTurnover = sanitizeFocusTurnover(JSON.parse(raw));
  } catch {
    chatFocusTurnover = sanitizeFocusTurnover({});
  }
  ensureFocusTurnoverDay();
  saveFocusTurnoverState();
  renderFocusTurnoverChip();
}

function sanitizeSafetyMetrics(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(source.day || "").trim())
    ? String(source.day).trim()
    : buildLocalDayKey();
  const parseCount = (input) => {
    const parsed = Number.parseInt(String(input ?? 0), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  };
  return {
    day,
    nbaShown: parseCount(source.nbaShown),
    nbaClicked: parseCount(source.nbaClicked),
    resolveClicks: parseCount(source.resolveClicks),
    reopenClicks: parseCount(source.reopenClicks)
  };
}

function saveSafetyMetricsState() {
  try {
    localStorage.setItem(CHAT_SAFETY_METRICS_STORAGE_KEY, JSON.stringify(chatSafetyMetrics));
  } catch {}
}

function ensureSafetyMetricsDay() {
  const today = buildLocalDayKey();
  if (chatSafetyMetrics.day !== today) {
    chatSafetyMetrics = sanitizeSafetyMetrics({ day: today });
    lastNbaExposureSignature = "";
    lastSafetyWarningSignature = "";
    saveSafetyMetricsState();
  }
}

function formatSafetyMetric(value) {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function formatSafetyRate(numerator, denominator) {
  const top = formatSafetyMetric(numerator);
  const base = formatSafetyMetric(denominator);
  if (base <= 0) {
    return "0%";
  }
  return `${Math.round((top / base) * 100)}%`;
}

function computeSafetyReopenRatio(metrics = chatSafetyMetrics) {
  const resolved = formatSafetyMetric(metrics.resolveClicks);
  const reopened = formatSafetyMetric(metrics.reopenClicks);
  if (resolved <= 0) {
    return 0;
  }
  return reopened / resolved;
}

function isSafetyRollbackRisk(metrics = chatSafetyMetrics) {
  const resolved = formatSafetyMetric(metrics.resolveClicks);
  return resolved > 0 && computeSafetyReopenRatio(metrics) > 0.5;
}

function formatSafetyMetricsChip(metrics = chatSafetyMetrics) {
  const shown = formatSafetyMetric(metrics.nbaShown);
  const clicked = formatSafetyMetric(metrics.nbaClicked);
  const resolved = formatSafetyMetric(metrics.resolveClicks);
  const reopened = formatSafetyMetric(metrics.reopenClicks);
  return `NBA ${clicked}/${shown} | Reopen ${reopened}/${resolved}`;
}

function renderChatSafetyMetricsChip() {
  if (!chatSafetyMetricsChip) {
    return;
  }
  ensureSafetyMetricsDay();
  const shown = formatSafetyMetric(chatSafetyMetrics.nbaShown);
  const clicked = formatSafetyMetric(chatSafetyMetrics.nbaClicked);
  const resolved = formatSafetyMetric(chatSafetyMetrics.resolveClicks);
  const reopened = formatSafetyMetric(chatSafetyMetrics.reopenClicks);
  const rollbackRisk = isSafetyRollbackRisk(chatSafetyMetrics);
  const baseLabel = formatSafetyMetricsChip();
  chatSafetyMetricsChip.textContent = rollbackRisk ? `WARN ${baseLabel}` : baseLabel;
  chatSafetyMetricsChip.classList.toggle("is-warning", rollbackRisk);
  chatSafetyMetricsChip.title = `Today (${chatSafetyMetrics.day}): NBA CTR ${clicked}/${shown} (${formatSafetyRate(clicked, shown)}), Reopen ratio ${reopened}/${resolved} (${formatSafetyRate(reopened, resolved)})${rollbackRisk ? " | Rollback trigger: reopen ratio > 50%" : ""}`;
  if (rollbackRisk) {
    const warningSignature = `${chatSafetyMetrics.day}|${reopened}|${resolved}`;
    if (warningSignature !== lastSafetyWarningSignature) {
      lastSafetyWarningSignature = warningSignature;
      logEvent(`Rollback warning: reopen ratio ${reopened}/${resolved} exceeded 50% today.`);
    }
  } else {
    lastSafetyWarningSignature = "";
  }
}

function loadSafetyMetricsState() {
  try {
    const raw = localStorage.getItem(CHAT_SAFETY_METRICS_STORAGE_KEY) || "{}";
    chatSafetyMetrics = sanitizeSafetyMetrics(JSON.parse(raw));
  } catch {
    chatSafetyMetrics = sanitizeSafetyMetrics({});
  }
  ensureSafetyMetricsDay();
  saveSafetyMetricsState();
  renderChatSafetyMetricsChip();
}

function resetSafetyMetricsToday(options = {}) {
  const silent = Boolean(options.silent);
  const day = buildLocalDayKey();
  chatSafetyMetrics = sanitizeSafetyMetrics({ day });
  lastNbaExposureSignature = "";
  lastSafetyWarningSignature = "";
  saveSafetyMetricsState();
  renderChatSafetyMetricsChip();
  if (!silent) {
    logEvent(`Safety metrics reset for ${day}.`);
  }
}

function recordSafetyMetric(type) {
  ensureSafetyMetricsDay();
  if (type === "nbaShown") {
    chatSafetyMetrics.nbaShown += 1;
  } else if (type === "nbaClicked") {
    chatSafetyMetrics.nbaClicked += 1;
  } else if (type === "resolveClicks") {
    chatSafetyMetrics.resolveClicks += 1;
  } else if (type === "reopenClicks") {
    chatSafetyMetrics.reopenClicks += 1;
  } else {
    return;
  }
  saveSafetyMetricsState();
  renderChatSafetyMetricsChip();
}

function recordNextActionExposure(state = nextActionState) {
  if (!state || typeof state !== "object") {
    return;
  }
  ensureSafetyMetricsDay();
  const signature = [
    chatSafetyMetrics.day,
    String(state.type || ""),
    String(state.chatId || ""),
    String(state.taskId || ""),
    String(state.subtitle || "")
  ].join("|");
  if (!signature || signature === lastNbaExposureSignature) {
    return;
  }
  lastNbaExposureSignature = signature;
  recordSafetyMetric("nbaShown");
}

function focusTurnoverSummary() {
  ensureFocusTurnoverDay();
  return `adds=${chatFocusTurnover.adds}, removes=${chatFocusTurnover.removes}, replacements=${chatFocusTurnover.replacements}, clears=${chatFocusTurnover.clears}`;
}

function formatFocusTurnoverChip() {
  ensureFocusTurnoverDay();
  return `A${chatFocusTurnover.adds} | R${chatFocusTurnover.removes} | X${chatFocusTurnover.replacements} | C${chatFocusTurnover.clears}`;
}

function renderFocusTurnoverChip() {
  if (!chatFocusTurnoverChip) {
    return;
  }
  chatFocusTurnoverChip.textContent = formatFocusTurnoverChip();
  chatFocusTurnoverChip.title = `Today's focus turnover (${chatFocusTurnover.day}): ${focusTurnoverSummary()}`;
}

function formatExecutionMetric(value) {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function formatExecutionChipLabel(metrics = chatExecutionMetrics) {
  const active = formatExecutionMetric(metrics.active);
  const blocked = formatExecutionMetric(metrics.blocked);
  const doneToday = formatExecutionMetric(metrics.doneToday);
  return `${active} Active | ${blocked} Blocked | ${doneToday} Done Today`;
}

function renderChatExecutionChip() {
  if (!chatExecutionChip) {
    return;
  }
  chatExecutionChip.textContent = formatExecutionChipLabel();
  chatExecutionChip.title = `Today (${chatExecutionMetrics.day}): active=${formatExecutionMetric(chatExecutionMetrics.active)}, blocked=${formatExecutionMetric(chatExecutionMetrics.blocked)}, done today=${formatExecutionMetric(chatExecutionMetrics.doneToday)}`;
}

function isDoneLedgerEvent(event = {}) {
  const type = String(event.type || "").trim().toLowerCase();
  const note = String(event.note || "").trim().toLowerCase();
  if (!type && !note) {
    return false;
  }
  if (type.includes("done") || note.includes("done")) {
    return true;
  }
  return false;
}

function computeChatExecutionMetrics(tasks = [], events = []) {
  const taskRows = Array.isArray(tasks) ? tasks : [];
  const eventRows = Array.isArray(events) ? events : [];
  let active = 0;
  let blocked = 0;
  let doneTodayByTask = 0;
  for (const task of taskRows) {
    if (task && typeof task === "object" && task.archived) {
      continue;
    }
    const status = normalizeTaskStatusValue(task?.status || "planned");
    if (status === "blocked") {
      blocked += 1;
    } else if (status === "in_progress" || status === "review") {
      active += 1;
    }
    if (status === "done" && isSameLocalDay(parseIsoTimeMs(task?.updatedAt || ""))) {
      doneTodayByTask += 1;
    }
  }
  let doneTodayByEvent = 0;
  for (const event of eventRows) {
    const atMs = parseIsoTimeMs(event?.at || "");
    if (!isSameLocalDay(atMs)) {
      continue;
    }
    if (isDoneLedgerEvent(event)) {
      doneTodayByEvent += 1;
    }
  }
  return {
    active,
    blocked,
    doneToday: Math.max(doneTodayByTask, doneTodayByEvent),
    day: buildLocalDayKey()
  };
}

function recordFocusTurnover(type, note = "") {
  ensureFocusTurnoverDay();
  if (type === "adds") {
    chatFocusTurnover.adds += 1;
  } else if (type === "removes") {
    chatFocusTurnover.removes += 1;
  } else if (type === "replacements") {
    chatFocusTurnover.replacements += 1;
  } else if (type === "clears") {
    chatFocusTurnover.clears += 1;
  } else {
    return;
  }
  saveFocusTurnoverState();
  renderFocusTurnoverChip();
  const suffix = note ? ` | ${note}` : "";
  logEvent(`Focus turnover (${chatFocusTurnover.day}): ${focusTurnoverSummary()}${suffix}`);
}

function announceFocusTurnoverSnapshot() {
  ensureFocusTurnoverDay();
  renderFocusTurnoverChip();
  logEvent(`Focus turnover (${chatFocusTurnover.day}): ${focusTurnoverSummary()}`);
}

function normalizeTaskStatusValue(value) {
  return String(value || "planned").trim().toLowerCase();
}

function isTaskStatusDone(value) {
  return normalizeTaskStatusValue(value) === "done";
}

function isTaskStatusActive(value) {
  return !isTaskStatusDone(value);
}

function describeTaskStatusBadge(value) {
  const status = normalizeTaskStatusValue(value);
  if (status === "in_progress") {
    return { label: "In Progress", className: "is-progress" };
  }
  if (status === "blocked") {
    return { label: "Blocked", className: "is-blocked" };
  }
  if (status === "review") {
    return { label: "Ready to Review", className: "is-review" };
  }
  if (status === "done") {
    return { label: "Done ✅", className: "is-done" };
  }
  return { label: "Planned", className: "is-planned" };
}

function sanitizePinnedThreadIds(value) {
  const rows = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[\n,;]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  return uniqueNonEmptyStrings(rows.map((item) => normalizeChatThreadId(item, "")))
    .filter(Boolean)
    .slice(0, CHAT_FOCUS_MAX_ITEMS);
}

function sanitizeTaskLinkMap(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const output = Object.create(null);
  const entries = Object.entries(source).slice(0, 400);
  for (const [taskIdRaw, chatIdRaw] of entries) {
    const taskId = String(taskIdRaw || "").trim();
    const chatId = normalizeChatThreadId(chatIdRaw, "");
    if (!taskId || !chatId) {
      continue;
    }
    output[taskId] = chatId;
  }
  return output;
}

function sanitizeCloseLoopDismissals(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const output = Object.create(null);
  const entries = Object.entries(source).slice(0, 400);
  for (const [chatIdRaw, atRaw] of entries) {
    const chatId = normalizeChatThreadId(chatIdRaw, "");
    if (!chatId) {
      continue;
    }
    const atMs = parseIsoTimeMs(atRaw);
    if (atMs <= 0) {
      continue;
    }
    output[chatId] = new Date(atMs).toISOString();
  }
  return output;
}

function getTaskLinkedChatId(taskId) {
  const id = String(taskId || "").trim();
  if (!id) {
    return "";
  }
  return normalizeChatThreadId(chatTaskLinks[id] || "", "");
}

function setTaskLinkedChatId(taskId, chatId) {
  const task = String(taskId || "").trim();
  const chat = normalizeChatThreadId(chatId, "");
  if (!task || !chat) {
    return;
  }
  chatTaskLinks[task] = chat;
  saveChatWorkspaceState();
}

function isChatThreadPinned(threadId) {
  const id = normalizeChatThreadId(threadId, "");
  return Boolean(id) && chatPinnedThreadIds.includes(id);
}

function getChatThreadTitleById(threadId) {
  const id = normalizeChatThreadId(threadId, "");
  if (!id) {
    return "Conversation";
  }
  const thread = chatThreads.find((item) => item.id === id);
  return buildChatThreadTitle(thread?.title || "", id === DEFAULT_CHAT_THREAD_ID ? DEFAULT_CHAT_THREAD_TITLE : "Conversation");
}

function requestFocusReplacementCandidate(nextThreadId) {
  const focusItems = chatPinnedThreadIds
    .map((chatId) => normalizeChatThreadId(chatId, ""))
    .filter((chatId) => chatThreads.some((thread) => thread.id === chatId))
    .slice(0, CHAT_FOCUS_MAX_ITEMS);
  if (focusItems.length < CHAT_FOCUS_MAX_ITEMS) {
    return "";
  }
  const rows = focusItems.map((chatId, index) => `${index + 1}) ${getChatThreadTitleById(chatId)}`);
  const answer = window.prompt(
    `Focus is full. Replace an existing priority?\n${rows.join("\n")}\n\nEnter 1-${focusItems.length} (or leave blank to cancel):`,
    "1"
  );
  if (answer === null) {
    return "";
  }
  const wanted = Number.parseInt(String(answer || "").trim(), 10);
  if (!Number.isInteger(wanted) || wanted < 1 || wanted > focusItems.length) {
    logEvent("Focus unchanged: invalid replacement selection.");
    return "";
  }
  const replaceId = focusItems[wanted - 1];
  if (!replaceId || normalizeChatThreadId(replaceId, "") === normalizeChatThreadId(nextThreadId, "")) {
    return "";
  }
  return replaceId;
}

function togglePinnedChatThread(threadId) {
  const id = normalizeChatThreadId(threadId, "");
  if (!id) return;
  if (isChatThreadPinned(id)) {
    chatPinnedThreadIds = chatPinnedThreadIds.filter((item) => item !== id);
    recordFocusTurnover("removes", `Removed: ${getChatThreadTitleById(id)}`);
  } else {
    const existing = chatPinnedThreadIds.filter((item) => chatThreads.some((thread) => thread.id === item));
    if (existing.length >= CHAT_FOCUS_MAX_ITEMS) {
      const replaceId = requestFocusReplacementCandidate(id);
      if (!replaceId) {
        return;
      }
      chatPinnedThreadIds = existing.map((item) => (item === replaceId ? id : item));
      logEvent(`Focus updated: replaced "${getChatThreadTitleById(replaceId)}" with "${getChatThreadTitleById(id)}".`);
      recordFocusTurnover("replacements", `Replaced: ${getChatThreadTitleById(replaceId)} -> ${getChatThreadTitleById(id)}`);
    } else {
      chatPinnedThreadIds = uniqueNonEmptyStrings([id, ...existing]).slice(0, CHAT_FOCUS_MAX_ITEMS);
      recordFocusTurnover("adds", `Added: ${getChatThreadTitleById(id)}`);
    }
  }
  saveChatWorkspaceState();
  renderChatThreadList();
}

function clearFocusThreads() {
  const existing = chatPinnedThreadIds.filter((item) => chatThreads.some((thread) => thread.id === item));
  if (existing.length < 1) {
    logEvent("Focus already clear.");
    return;
  }
  chatPinnedThreadIds = [];
  recordFocusTurnover("clears", `Cleared ${existing.length} focus item(s).`);
  saveChatWorkspaceState();
  renderChatThreadList();
}

function deriveFocusSuggestionCandidate(linkedTaskInfoByChatId = new Map(), options = {}) {
  const searchMode = Boolean(options.searchMode);
  if (searchMode) {
    return null;
  }
  const currentFocusCount = chatPinnedThreadIds
    .map((chatId) => normalizeChatThreadId(chatId, ""))
    .filter((chatId) => chatThreads.some((thread) => thread.id === chatId))
    .length;
  if (currentFocusCount >= CHAT_FOCUS_MAX_ITEMS) {
    return null;
  }

  let bestActiveTask = null;
  let bestActiveTaskMs = -1;
  for (const [chatId, info] of linkedTaskInfoByChatId.entries()) {
    if (!info?.isActiveTask || isChatThreadPinned(chatId)) {
      continue;
    }
    const thread = chatThreads.find((item) => item.id === chatId);
    if (!thread) {
      continue;
    }
    const updatedMs = Math.max(parseIsoTimeMs(thread.updatedAt || ""), Number(info.updatedMs || 0));
    if (updatedMs > bestActiveTaskMs) {
      bestActiveTaskMs = updatedMs;
      bestActiveTask = {
        chatId,
        title: getChatThreadTitleById(chatId),
        reason: "Linked to your active task"
      };
    }
  }
  if (bestActiveTask) {
    return bestActiveTask;
  }

  const nowMs = Date.now();
  let bestToolCandidate = null;
  let bestToolMs = -1;
  for (const thread of chatThreads) {
    const chatId = normalizeChatThreadId(thread?.id || "", "");
    if (!chatId || isChatThreadPinned(chatId)) {
      continue;
    }
    const toolLabel = extractThreadToolHint(chatId);
    if (!toolLabel) {
      continue;
    }
    const updatedMs = parseIsoTimeMs(thread?.updatedAt || "");
    if (updatedMs <= 0 || nowMs - updatedMs > CHAT_RECENTLY_ACTIVE_WINDOW_MS) {
      continue;
    }
    if (updatedMs > bestToolMs) {
      bestToolMs = updatedMs;
      bestToolCandidate = {
        chatId,
        title: getChatThreadTitleById(chatId),
        reason: `Recent tool use: ${toolLabel}`
      };
    }
  }
  if (bestToolCandidate) {
    return bestToolCandidate;
  }

  const activeThread = chatThreads.find((thread) => thread.id === activeChatThreadId) || null;
  if (activeThread && !isChatThreadPinned(activeThread.id)) {
    const updatedMs = parseIsoTimeMs(activeThread.updatedAt || "");
    return {
      chatId: activeThread.id,
      title: getChatThreadTitleById(activeThread.id),
      reason: isSameLocalDay(updatedMs) ? "You worked on this today" : "Current active conversation"
    };
  }

  const fallbackThread = chatThreads.find((thread) => !isChatThreadPinned(thread.id)) || null;
  if (!fallbackThread) {
    return null;
  }
  const fallbackUpdatedMs = parseIsoTimeMs(fallbackThread.updatedAt || "");
  return {
    chatId: fallbackThread.id,
    title: getChatThreadTitleById(fallbackThread.id),
    reason: isSameLocalDay(fallbackUpdatedMs) ? "Most recently edited today" : "Most recently edited"
  };
}

function renderFocusSuggestionRow(candidate) {
  if (!chatFocusSuggestionRow || !chatFocusSuggestionText || !chatFocusSuggestionBtn) {
    return;
  }
  const row = candidate && typeof candidate === "object" ? candidate : null;
  const chatId = normalizeChatThreadId(row?.chatId || "", "");
  if (!chatId || isChatThreadPinned(chatId)) {
    chatFocusSuggestionRow.hidden = true;
    chatFocusSuggestionBtn.dataset.chatId = "";
    return;
  }
  const title = buildChatThreadTitle(row?.title || "", "Conversation");
  const reason = String(row?.reason || "").trim();
  chatFocusSuggestionText.textContent = reason
    ? `Suggested Focus: ${title} - ${reason}`
    : `Suggested Focus: ${title}`;
  chatFocusSuggestionBtn.dataset.chatId = chatId;
  chatFocusSuggestionBtn.disabled = false;
  chatFocusSuggestionRow.hidden = false;
}

function isCloseLoopStaleThread(threadId, linkedTaskInfo) {
  const chatId = normalizeChatThreadId(threadId, "");
  if (!chatId || !linkedTaskInfo || !linkedTaskInfo.isActiveTask) {
    return false;
  }
  const thread = chatThreads.find((row) => row.id === chatId) || null;
  if (!thread) {
    return false;
  }
  const updatedMs = parseIsoTimeMs(thread.updatedAt || "");
  if (updatedMs <= 0) {
    return false;
  }
  if (Date.now() - updatedMs < CHAT_CLOSE_LOOP_INACTIVE_MS) {
    return false;
  }
  const dismissedAtMs = parseIsoTimeMs(chatCloseLoopDismissals[chatId] || "");
  return dismissedAtMs < updatedMs;
}

function formatThreadUpdatedAt(value) {
  const parsed = new Date(value || "");
  if (!Number.isFinite(parsed.getTime())) {
    return "n/a";
  }
  return parsed.toLocaleTimeString();
}

function createChatThread(id, title) {
  const now = new Date().toISOString();
  const chatId = normalizeChatThreadId(id, DEFAULT_CHAT_THREAD_ID);
  return {
    id: chatId,
    title: buildChatThreadTitle(title, chatId === DEFAULT_CHAT_THREAD_ID ? DEFAULT_CHAT_THREAD_TITLE : "New Chat"),
    createdAt: now,
    updatedAt: now,
    preview: "",
    totalTurns: 0
  };
}

function sortChatThreads() {
  chatThreads.sort((a, b) => {
    const left = new Date(String(a?.updatedAt || 0)).getTime();
    const right = new Date(String(b?.updatedAt || 0)).getTime();
    if (left !== right) return right - left;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

function upsertChatThread(thread = {}) {
  const id = normalizeChatThreadId(thread.id || thread.chatId || "", DEFAULT_CHAT_THREAD_ID);
  const existing = chatThreads.find((item) => item.id === id);
  const preserveExistingTitle = Boolean(thread._fromServer && existing && String(existing.title || "").trim());
  const next = {
    id,
    title: preserveExistingTitle
      ? String(existing.title || "").trim()
      : buildChatThreadTitle(
        thread.title,
        id === DEFAULT_CHAT_THREAD_ID ? DEFAULT_CHAT_THREAD_TITLE : "New Chat"
      ),
    createdAt: String(thread.createdAt || existing?.createdAt || new Date().toISOString()),
    updatedAt: String(thread.updatedAt || existing?.updatedAt || new Date().toISOString()),
    preview: String(thread.preview || existing?.preview || "").trim(),
    totalTurns: Math.max(0, Number(thread.totalTurns ?? existing?.totalTurns ?? 0))
  };
  if (existing) {
    Object.assign(existing, next);
  } else {
    chatThreads.push(next);
  }
  sortChatThreads();
  return chatThreads.find((item) => item.id === id) || next;
}

function ensureChatWorkspace() {
  if (!chatThreads.some((item) => item.id === DEFAULT_CHAT_THREAD_ID)) {
    chatThreads.push(createChatThread(DEFAULT_CHAT_THREAD_ID, DEFAULT_CHAT_THREAD_TITLE));
  }
  chatPinnedThreadIds = sanitizePinnedThreadIds(chatPinnedThreadIds)
    .filter((id) => chatThreads.some((thread) => thread.id === id));
  const sanitizedLinks = sanitizeTaskLinkMap(chatTaskLinks);
  for (const [taskId, chatId] of Object.entries(sanitizedLinks)) {
    if (!chatThreads.some((thread) => thread.id === chatId)) {
      delete sanitizedLinks[taskId];
    }
  }
  chatTaskLinks = sanitizedLinks;
  const sanitizedDismissals = sanitizeCloseLoopDismissals(chatCloseLoopDismissals);
  for (const chatId of Object.keys(sanitizedDismissals)) {
    if (!chatThreads.some((thread) => thread.id === chatId)) {
      delete sanitizedDismissals[chatId];
    }
  }
  chatCloseLoopDismissals = sanitizedDismissals;
  sortChatThreads();
  activeChatThreadId = normalizeChatThreadId(activeChatThreadId, DEFAULT_CHAT_THREAD_ID);
  if (!chatThreads.some((item) => item.id === activeChatThreadId)) {
    activeChatThreadId = chatThreads[0]?.id || DEFAULT_CHAT_THREAD_ID;
  }
}

function saveChatWorkspaceState() {
  try {
    const payload = chatThreads.map((thread) => ({
      id: normalizeChatThreadId(thread.id, DEFAULT_CHAT_THREAD_ID),
      title: buildChatThreadTitle(thread.title, "New Chat"),
      createdAt: String(thread.createdAt || ""),
      updatedAt: String(thread.updatedAt || ""),
      preview: String(thread.preview || ""),
      totalTurns: Math.max(0, Number(thread.totalTurns || 0))
    }));
    localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(CHAT_ACTIVE_THREAD_STORAGE_KEY, activeChatThreadId);
    localStorage.setItem(CHAT_ROUTE_MODE_STORAGE_KEY, chatRouteMode);
    localStorage.setItem(CHAT_PINNED_THREADS_STORAGE_KEY, JSON.stringify(chatPinnedThreadIds));
    localStorage.setItem(CHAT_RAIL_SECTION_STORAGE_KEY, chatRailSection);
    localStorage.setItem(CHAT_TASK_LINKS_STORAGE_KEY, JSON.stringify(chatTaskLinks));
    localStorage.setItem(CHAT_CLOSE_LOOP_DISMISSALS_STORAGE_KEY, JSON.stringify(chatCloseLoopDismissals));
  } catch {}
}

function loadChatWorkspaceState() {
  try {
    const raw = localStorage.getItem(CHAT_THREADS_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      chatThreads = parsed
        .map((entry) => {
          const id = normalizeChatThreadId(entry?.id || entry?.chatId || "", "");
          if (!id) return null;
          return {
            id,
            title: buildChatThreadTitle(entry?.title || "", id === DEFAULT_CHAT_THREAD_ID ? DEFAULT_CHAT_THREAD_TITLE : "New Chat"),
            createdAt: String(entry?.createdAt || ""),
            updatedAt: String(entry?.updatedAt || ""),
            preview: String(entry?.preview || ""),
            totalTurns: Math.max(0, Number(entry?.totalTurns || 0))
          };
        })
        .filter(Boolean);
    }
  } catch {
    chatThreads = [];
  }
  try {
    activeChatThreadId = normalizeChatThreadId(
      localStorage.getItem(CHAT_ACTIVE_THREAD_STORAGE_KEY) || DEFAULT_CHAT_THREAD_ID,
      DEFAULT_CHAT_THREAD_ID
    );
  } catch {
    activeChatThreadId = DEFAULT_CHAT_THREAD_ID;
  }
  try {
    chatRouteMode = normalizeChatRouteMode(localStorage.getItem(CHAT_ROUTE_MODE_STORAGE_KEY) || "normal");
  } catch {
    chatRouteMode = "normal";
  }
  try {
    const rawPinned = localStorage.getItem(CHAT_PINNED_THREADS_STORAGE_KEY) || "[]";
    chatPinnedThreadIds = sanitizePinnedThreadIds(JSON.parse(rawPinned));
  } catch {
    chatPinnedThreadIds = [];
  }
  try {
    const rawTaskLinks = localStorage.getItem(CHAT_TASK_LINKS_STORAGE_KEY) || "{}";
    chatTaskLinks = sanitizeTaskLinkMap(JSON.parse(rawTaskLinks));
  } catch {
    chatTaskLinks = Object.create(null);
  }
  try {
    const rawCloseLoopDismissals = localStorage.getItem(CHAT_CLOSE_LOOP_DISMISSALS_STORAGE_KEY) || "{}";
    chatCloseLoopDismissals = sanitizeCloseLoopDismissals(JSON.parse(rawCloseLoopDismissals));
  } catch {
    chatCloseLoopDismissals = Object.create(null);
  }
  try {
    chatRailSection = normalizeChatRailSection(localStorage.getItem(CHAT_RAIL_SECTION_STORAGE_KEY) || "chats");
  } catch {
    chatRailSection = "chats";
  }
  ensureChatWorkspace();
  if (chatRouteModeSelect) {
    chatRouteModeSelect.value = chatRouteMode;
  }
  applyChatRailSection(chatRailSection, { persist: false });
}

function applyChatRailSection(section, options = {}) {
  chatRailSection = normalizeChatRailSection(section);
  const sections = [chatRailAppsSection, chatRailTasksSection, chatRailChatsSection];
  for (const panel of sections) {
    if (!panel) continue;
    const panelName = normalizeChatRailSection(panel.dataset.chatRailSection || "");
    panel.classList.toggle("is-hidden", panelName !== chatRailSection);
  }
  if (chatRailNav) {
    const buttons = Array.from(chatRailNav.querySelectorAll(".chat-rail-nav-btn[data-chat-rail]"));
    for (const button of buttons) {
      const targetSection = normalizeChatRailSection(button.dataset.chatRail || "");
      button.classList.toggle("active", targetSection === chatRailSection);
    }
  }
  if (options.persist !== false) {
    saveChatWorkspaceState();
  }
}

function formatTurnMeta(turn = {}) {
  const role = String(turn.role || "").toLowerCase();
  const roleLabel = role === "user" ? "You" : "Asolaria";
  const at = turn.at ? new Date(turn.at) : null;
  const timeLabel = at && Number.isFinite(at.getTime()) ? at.toLocaleTimeString() : "";
  return timeLabel ? `${roleLabel} · ${timeLabel}` : roleLabel;
}

function mapTurnRoleToMessageRole(turn = {}) {
  return String(turn.role || "").toLowerCase() === "user" ? "user" : "brain";
}

function describeChatRouteMode(mode) {
  const normalized = normalizeChatRouteMode(mode);
  if (normalized === "direct") return "Direct Codex";
  if (normalized === "deep") return "Deep Agent Style";
  return "RouteLLM";
}

function summarizeThreadFromTurns(threadId) {
  const id = normalizeChatThreadId(threadId, DEFAULT_CHAT_THREAD_ID);
  const turns = Array.isArray(chatTurnsByThread[id]) ? chatTurnsByThread[id] : [];
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const thread = upsertChatThread({
    id,
    totalTurns: turns.length,
    updatedAt: String(lastTurn?.at || new Date().toISOString()),
    preview: String(lastTurn?.text || "").replace(/\s+/g, " ").trim().slice(0, 120)
  });
  if (thread.id !== DEFAULT_CHAT_THREAD_ID && !thread.title) {
    const firstUser = turns.find((turn) => String(turn.role || "").toLowerCase() === "user");
    thread.title = buildChatThreadTitle(firstUser?.text || "", "New Chat");
  }
  sortChatThreads();
}

function setThreadTurns(threadId, turns = []) {
  const id = normalizeChatThreadId(threadId, DEFAULT_CHAT_THREAD_ID);
  chatTurnsByThread[id] = Array.isArray(turns)
    ? turns
      .map((turn) => {
        const role = String(turn?.role || "").toLowerCase() === "user" ? "user" : "assistant";
        return {
          role,
          text: String(turn?.text || ""),
          at: String(turn?.at || ""),
          meta: turn?.meta && typeof turn.meta === "object" ? turn.meta : {}
        };
      })
      .filter((turn) => turn.text || turn.role === "assistant")
    : [];
  summarizeThreadFromTurns(id);
  saveChatWorkspaceState();
  renderChatThreadList();
  if (id === SUPER_ADMIN_DIRECT_CHAT_ID) {
    renderSuperAdminDirectWindow();
  }
}

function appendTurnToThread(threadId, turn = {}) {
  const id = normalizeChatThreadId(threadId, DEFAULT_CHAT_THREAD_ID);
  if (!Array.isArray(chatTurnsByThread[id])) {
    chatTurnsByThread[id] = [];
  }
  const role = String(turn.role || "").toLowerCase() === "user" ? "user" : "assistant";
  const text = String(turn.text || "");
  if (!text.trim()) {
    return null;
  }
  const row = {
    role,
    text,
    at: String(turn.at || new Date().toISOString()),
    meta: turn.meta && typeof turn.meta === "object" ? turn.meta : {}
  };
  chatTurnsByThread[id].push(row);
  if (chatTurnsByThread[id].length > 500) {
    chatTurnsByThread[id].splice(0, chatTurnsByThread[id].length - 500);
  }
  summarizeThreadFromTurns(id);
  saveChatWorkspaceState();
  renderChatThreadList();
  if (id === SUPER_ADMIN_DIRECT_CHAT_ID) {
    renderSuperAdminDirectWindow();
  }
  return row;
}

function buildThreadSearchQuery() {
  return String(chatThreadSearch?.value || "").trim().toLowerCase();
}

function buildTaskLinkInfo(taskIdValue, chatIdValue) {
  const taskId = String(taskIdValue || "").trim();
  const chatId = normalizeChatThreadId(chatIdValue, "");
  if (!taskId || !chatId) {
    return null;
  }
  const task = getTaskById(taskId);
  const status = normalizeTaskStatusValue(task?.status || "planned");
  const statusBadge = describeTaskStatusBadge(status);
  const taskTitle = buildChatThreadTitle(String(task?.title || ""), `Task ${taskId}`);
  return {
    taskId,
    chatId,
    taskTitle,
    status,
    statusLabel: statusBadge.label,
    statusClassName: statusBadge.className,
    isKnownTask: Boolean(task),
    isActiveTask: task ? (isTaskStatusActive(status) && !Boolean(task.archived)) : true,
    updatedMs: parseIsoTimeMs(task?.updatedAt || "")
  };
}

function normalizeThreadToolHintValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const normalized = raw.toLowerCase();
  if (normalized === "brain") return "Asolaria Brain";
  if (normalized === "routellm") return "RouteLLM";
  if (normalized === "direct" || normalized === "direct codex") return "Direct Codex";
  if (normalized === "deep" || normalized === "deep_agent") return "Deep Agent";
  if (normalized === "external") return "External Tool";
  if (normalized === "error") return "Error";
  if (normalized === "web-ui" || normalized === "user" || normalized === "assistant" || normalized === "system") {
    return "";
  }
  return raw.length > 34 ? `${raw.slice(0, 31)}...` : raw;
}

function extractThreadToolHint(threadId) {
  const id = normalizeChatThreadId(threadId, "");
  if (!id) {
    return "";
  }
  const turns = Array.isArray(chatTurnsByThread[id]) ? chatTurnsByThread[id] : [];
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    const meta = turn?.meta && typeof turn.meta === "object" ? turn.meta : null;
    if (!meta) {
      continue;
    }
    const candidates = [
      meta.tool,
      meta.provider,
      meta.source,
      meta.routeMode,
      meta.mode
    ];
    for (const candidate of candidates) {
      const label = normalizeThreadToolHintValue(candidate);
      if (label) {
        return label;
      }
    }
  }
  return "";
}

function buildLinkedTaskInfoByChatId() {
  const byChatId = new Map();
  for (const [taskId, linkedChatId] of Object.entries(chatTaskLinks || {})) {
    const info = buildTaskLinkInfo(taskId, linkedChatId);
    if (!info) {
      continue;
    }
    const existing = byChatId.get(info.chatId);
    if (!existing) {
      byChatId.set(info.chatId, info);
      continue;
    }
    if (info.isActiveTask && !existing.isActiveTask) {
      byChatId.set(info.chatId, info);
      continue;
    }
    if (info.isKnownTask && !existing.isKnownTask) {
      byChatId.set(info.chatId, info);
      continue;
    }
    if (info.updatedMs > existing.updatedMs) {
      byChatId.set(info.chatId, info);
    }
  }
  return byChatId;
}

function setCloseLoopDismissed(chatId, at = new Date().toISOString()) {
  const id = normalizeChatThreadId(chatId, "");
  if (!id) {
    return;
  }
  const atMs = parseIsoTimeMs(at);
  if (atMs <= 0) {
    return;
  }
  chatCloseLoopDismissals[id] = new Date(atMs).toISOString();
  saveChatWorkspaceState();
}

function clearCloseLoopDismissed(chatId) {
  const id = normalizeChatThreadId(chatId, "");
  if (!id) {
    return;
  }
  if (chatCloseLoopDismissals[id]) {
    delete chatCloseLoopDismissals[id];
    saveChatWorkspaceState();
  }
}

function promptAndLinkChatToTask(chatId, options = {}) {
  const id = normalizeChatThreadId(chatId, "");
  if (!id) {
    return;
  }
  const linkedTaskInfoByChatId = buildLinkedTaskInfoByChatId();
  const linkedTask = linkedTaskInfoByChatId.get(id) || null;
  const suggestedTaskId = String(options.taskId || linkedTask?.taskId || "").trim();
  const promptText = options.relink
    ? "Relink conversation to task ID:"
    : "Link conversation to task ID:";
  const answer = window.prompt(promptText, suggestedTaskId);
  if (answer === null) {
    return;
  }
  const taskId = String(answer || "").trim();
  if (!taskId) {
    logEvent("Task link skipped: missing task ID.");
    return;
  }
  setTaskLinkedChatId(taskId, id);
  clearCloseLoopDismissed(id);
  const task = getTaskById(taskId);
  const taskLabel = task ? buildChatThreadTitle(task.title || "", `Task ${taskId}`) : `Task ${taskId}`;
  logEvent(`Conversation linked to ${taskLabel}.`);
  renderChatRailTasks();
  renderChatThreadList();
}

function requestQuickTaskStatusValue(currentStatus = "") {
  const current = normalizeTaskStatusValue(currentStatus || "planned");
  const rows = CHAT_TASK_QUICK_STATUS_OPTIONS.map((row, index) => {
    const marker = row.value === current ? " (current)" : "";
    return `${index + 1}) ${row.label}${marker}`;
  });
  const answer = window.prompt(
    `Set task status:\n${rows.join("\n")}\n\nEnter 1-${CHAT_TASK_QUICK_STATUS_OPTIONS.length} (or leave blank to cancel):`,
    "1"
  );
  if (answer === null) {
    return "";
  }
  const wanted = Number.parseInt(String(answer || "").trim(), 10);
  if (!Number.isInteger(wanted) || wanted < 1 || wanted > CHAT_TASK_QUICK_STATUS_OPTIONS.length) {
    logEvent("Task status unchanged: invalid selection.");
    return "";
  }
  return CHAT_TASK_QUICK_STATUS_OPTIONS[wanted - 1].value;
}

async function updateLinkedTaskStatusFromCard(taskId, currentStatus, options = {}) {
  const id = String(taskId || "").trim();
  if (!id) {
    return;
  }
  const chatId = normalizeChatThreadId(String(options.chatId || "").trim(), "");
  const nextStatus = requestQuickTaskStatusValue(currentStatus);
  if (!nextStatus) {
    return;
  }
  const previous = normalizeTaskStatusValue(currentStatus || "planned");
  if (nextStatus === previous) {
    return;
  }
  await setTaskLedgerTaskStatus(
    id,
    nextStatus,
    { note: `Status changed from chat card (${previous} -> ${nextStatus}).` }
  );
  if (nextStatus === "done") {
    showCloseLoopDoneToast(id, chatId, { archived: false });
  }
  logEvent(`Task ${id} status changed from ${previous} to ${nextStatus} via chat card.`);
  refreshTaskLedger({ silent: true }).catch(() => {});
  refreshChatRailTasks({ silent: true }).catch(() => {});
  renderChatThreadList();
}

function buildChatThreadCard(thread, options = {}) {
  const row = document.createElement("div");
  row.className = "chat-thread-card";
  const threadId = normalizeChatThreadId(thread?.id || "", DEFAULT_CHAT_THREAD_ID);
  row.dataset.chatId = threadId;
  const pinned = isChatThreadPinned(threadId);
  if (threadId === activeChatThreadId) {
    row.classList.add("is-active");
  }
  if (pinned) {
    row.classList.add("is-pinned");
  }

  const top = document.createElement("div");
  top.className = "chat-thread-card-top";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "chat-thread-open";
  openBtn.dataset.action = "open-chat-thread";
  openBtn.dataset.chatId = threadId;
  openBtn.textContent = buildChatThreadTitle(
    String(thread?.title || ""),
    threadId === DEFAULT_CHAT_THREAD_ID ? DEFAULT_CHAT_THREAD_TITLE : "New Chat"
  );

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "chat-thread-pin";
  pinBtn.dataset.action = "toggle-chat-pin";
  pinBtn.dataset.chatId = threadId;
  pinBtn.textContent = pinned ? "Remove Focus" : "Add to Focus";
  if (pinned) {
    pinBtn.classList.add("is-pinned");
  }

  top.appendChild(openBtn);
  top.appendChild(pinBtn);
  row.appendChild(top);

  const preview = document.createElement("div");
  preview.className = "chat-thread-preview";
  preview.textContent = String(thread?.preview || "").trim() || "No messages yet.";
  row.appendChild(preview);
  const toolHint = extractThreadToolHint(threadId);
  if (toolHint) {
    const toolHintRow = document.createElement("div");
    toolHintRow.className = "chat-thread-tool-hint";
    toolHintRow.textContent = `Using: ${toolHint}`;
    row.appendChild(toolHintRow);
  }

  const linkedTaskInfoByChatId = options.linkedTaskInfoByChatId instanceof Map
    ? options.linkedTaskInfoByChatId
    : null;
  const linkedTaskInfo = linkedTaskInfoByChatId ? linkedTaskInfoByChatId.get(threadId) : null;
  if (linkedTaskInfo) {
    const contextRow = document.createElement("div");
    contextRow.className = "chat-thread-context-row";

    const contextBtn = document.createElement("button");
    contextBtn.type = "button";
    contextBtn.className = "chat-thread-context";
    contextBtn.dataset.action = "open-linked-task";
    contextBtn.dataset.chatId = threadId;
    contextBtn.dataset.taskId = linkedTaskInfo.taskId;
    contextBtn.textContent = `Connected to Task: ${linkedTaskInfo.taskTitle}`;
    contextRow.appendChild(contextBtn);

    const statusBadge = document.createElement("button");
    statusBadge.type = "button";
    statusBadge.className = `chat-task-state is-action ${linkedTaskInfo.statusClassName}`;
    statusBadge.dataset.action = "set-linked-task-status";
    statusBadge.dataset.chatId = threadId;
    statusBadge.dataset.taskId = linkedTaskInfo.taskId;
    statusBadge.dataset.taskStatus = linkedTaskInfo.status;
    statusBadge.title = "Set task status";
    statusBadge.textContent = linkedTaskInfo.statusLabel;
    contextRow.appendChild(statusBadge);
    if (isCloseLoopStaleThread(threadId, linkedTaskInfo)) {
      const staleHint = document.createElement("span");
      staleHint.className = "chat-thread-stale-hint";
      staleHint.textContent = "48h stale";
      contextRow.appendChild(staleHint);
      const staleResolveBtn = document.createElement("button");
      staleResolveBtn.type = "button";
      staleResolveBtn.className = "chat-thread-stale-action";
      staleResolveBtn.dataset.action = "resolve-stale-task";
      staleResolveBtn.dataset.chatId = threadId;
      staleResolveBtn.dataset.taskId = linkedTaskInfo.taskId;
      staleResolveBtn.textContent = "Resolve";
      contextRow.appendChild(staleResolveBtn);
    }
    row.appendChild(contextRow);
  }

  if (options.searchMode === true) {
    const searchActions = document.createElement("div");
    searchActions.className = "chat-thread-search-actions";

    const jumpBtn = document.createElement("button");
    jumpBtn.type = "button";
    jumpBtn.className = "chat-thread-context is-primary";
    jumpBtn.dataset.action = "open-chat-thread";
    jumpBtn.dataset.chatId = threadId;
    jumpBtn.textContent = "Jump back in";
    searchActions.appendChild(jumpBtn);

    const continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "chat-thread-context";
    continueBtn.dataset.action = "open-chat-thread";
    continueBtn.dataset.chatId = threadId;
    continueBtn.textContent = "Continue";
    searchActions.appendChild(continueBtn);

    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.className = pinned ? "chat-thread-context" : "chat-thread-context is-primary";
    focusBtn.dataset.action = "toggle-chat-pin";
    focusBtn.dataset.chatId = threadId;
    focusBtn.textContent = pinned ? "Remove Focus" : "Bring to Focus";
    searchActions.appendChild(focusBtn);

    const linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.className = "chat-thread-context";
    linkBtn.dataset.action = linkedTaskInfo ? "relink-chat-task" : "link-chat-task";
    linkBtn.dataset.chatId = threadId;
    if (linkedTaskInfo) {
      linkBtn.dataset.taskId = linkedTaskInfo.taskId;
    }
    linkBtn.textContent = linkedTaskInfo ? "Relink" : "Link to Task";
    searchActions.appendChild(linkBtn);

    row.appendChild(searchActions);
  }

  const meta = document.createElement("div");
  meta.className = "chat-thread-meta";
  const turns = Math.max(0, Number(thread?.totalTurns || 0));
  meta.textContent = `Turns: ${turns} • Updated: ${formatThreadUpdatedAt(thread?.updatedAt || "")}`;
  row.appendChild(meta);

  if (options.pinnedOnly === true) {
    row.title = `Focus chat: ${openBtn.textContent}`;
  }

  return row;
}

function renderChatThreadCards(container, rows = [], emptyText = "No chats yet.", options = {}) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!Array.isArray(rows) || rows.length < 1) {
    const empty = document.createElement("div");
    empty.className = "chat-thread-preview";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }
  for (const thread of rows) {
    container.appendChild(buildChatThreadCard(thread, options));
  }
}

function renderChatSearchFallbackAction(container, query) {
  if (!container) {
    return;
  }
  const text = String(query || "").trim();
  if (!text) {
    return;
  }
  const actionRow = document.createElement("div");
  actionRow.className = "chat-search-fallback";
  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "chat-thread-context is-primary";
  startBtn.dataset.action = "start-new-from-search";
  startBtn.dataset.query = text;
  startBtn.textContent = "Start New from Search";
  startBtn.title = `Start new conversation with: ${text}`;
  actionRow.appendChild(startBtn);
  container.appendChild(actionRow);
}

function isSameLocalDay(leftMs, rightMs = Date.now()) {
  if (!Number.isFinite(leftMs) || leftMs <= 0 || !Number.isFinite(rightMs) || rightMs <= 0) {
    return false;
  }
  const left = new Date(leftMs);
  const right = new Date(rightMs);
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function deriveNextActionState(linkedTaskInfoByChatId = new Map()) {
  const tooltip = "We surface what seems most relevant based on your recent activity.";
  const activeLinkedTask = linkedTaskInfoByChatId.get(activeChatThreadId);
  if (activeLinkedTask && activeLinkedTask.isActiveTask) {
    return {
      type: "task",
      chatId: activeChatThreadId,
      taskId: activeLinkedTask.taskId,
      subtitle: `Continue: ${activeLinkedTask.taskTitle}`,
      primaryLabel: "Continue",
      reason: "Linked to your active task",
      tooltip
    };
  }

  let bestTaskAction = null;
  let bestTaskMs = -1;
  for (const [chatId, info] of linkedTaskInfoByChatId.entries()) {
    if (!info.isActiveTask) {
      continue;
    }
    const thread = chatThreads.find((item) => item.id === chatId);
    if (!thread) {
      continue;
    }
    const updatedMs = parseIsoTimeMs(thread.updatedAt || "");
    if (updatedMs > bestTaskMs) {
      bestTaskMs = updatedMs;
      bestTaskAction = {
        type: "task",
        chatId,
        taskId: info.taskId,
        subtitle: `Continue: ${info.taskTitle}`,
        primaryLabel: "Continue",
        reason: info.status === "in_progress" ? "Still marked In Progress" : "Most recently edited",
        tooltip
      };
    }
  }
  if (bestTaskAction) {
    return bestTaskAction;
  }

  let bestDoneAction = null;
  let bestDoneMs = -1;
  for (const [chatId, info] of linkedTaskInfoByChatId.entries()) {
    if (normalizeTaskStatusValue(info.status) !== "done") {
      continue;
    }
    const thread = chatThreads.find((item) => item.id === chatId);
    if (!thread) {
      continue;
    }
    const threadUpdatedMs = parseIsoTimeMs(thread.updatedAt || "");
    const taskUpdatedMs = Number.isFinite(Number(info.updatedMs)) ? Number(info.updatedMs) : 0;
    const updatedMs = Math.max(threadUpdatedMs, taskUpdatedMs);
    if (!isSameLocalDay(updatedMs)) {
      continue;
    }
    if (updatedMs > bestDoneMs) {
      bestDoneMs = updatedMs;
      bestDoneAction = {
        type: "review",
        chatId,
        taskId: info.taskId,
        subtitle: `Review: ${info.taskTitle}`,
        primaryLabel: "Review",
        reason: "Completed today",
        tooltip
      };
    }
  }
  if (bestDoneAction) {
    return bestDoneAction;
  }

  const activeThread = chatThreads.find((thread) => thread.id === activeChatThreadId) || null;
  if (activeThread && isChatThreadPinned(activeThread.id)) {
    const updatedMs = parseIsoTimeMs(activeThread.updatedAt || "");
    return {
      type: "focus",
      chatId: activeThread.id,
      taskId: "",
      subtitle: `Resume focus: ${buildChatThreadTitle(activeThread.title || "", DEFAULT_CHAT_THREAD_TITLE)}`,
      primaryLabel: "Continue",
      reason: isSameLocalDay(updatedMs) ? "Because you worked on this today" : "Most recently edited",
      tooltip
    };
  }

  const topFocusId = chatPinnedThreadIds.find((chatId) => chatThreads.some((thread) => thread.id === chatId)) || "";
  if (topFocusId) {
    const focusThread = chatThreads.find((thread) => thread.id === topFocusId) || null;
    const updatedMs = parseIsoTimeMs(focusThread?.updatedAt || "");
    return {
      type: "focus",
      chatId: topFocusId,
      taskId: "",
      subtitle: `Resume focus: ${buildChatThreadTitle(focusThread?.title || "", "Conversation")}`,
      primaryLabel: "Continue",
      reason: isSameLocalDay(updatedMs) ? "Because you worked on this today" : "Most recently edited",
      tooltip
    };
  }

  return {
    type: "start_new",
    chatId: "",
    taskId: "",
    subtitle: "Start something new",
    primaryLabel: "Start new",
    reason: "No active task yet",
    tooltip
  };
}

function renderNextActionStrip(linkedTaskInfoByChatId = new Map()) {
  if (!nextActionStrip || !nextActionSubtitle || !nextActionPrimaryBtn || !nextActionSecondaryBtn || !nextActionReason) {
    return;
  }
  nextActionState = deriveNextActionState(linkedTaskInfoByChatId);
  nextActionSubtitle.textContent = nextActionState.subtitle;
  nextActionReason.textContent = nextActionState.reason || "Because you worked on this today";
  nextActionStrip.title = nextActionState.tooltip || "We surface what seems most relevant based on your recent activity.";
  nextActionPrimaryBtn.textContent = nextActionState.primaryLabel || "Continue";
  nextActionSecondaryBtn.textContent = "Start new";
  nextActionStrip.classList.toggle("is-default", nextActionState.type === "start_new");
  recordNextActionExposure(nextActionState);
}

function hideCloseLoopToast() {
  if (closeLoopToastTimer) {
    window.clearTimeout(closeLoopToastTimer);
    closeLoopToastTimer = 0;
  }
  if (closeLoopToast) {
    closeLoopToast.hidden = true;
  }
}

function showCloseLoopDoneToast(taskId, chatId, options = {}) {
  if (!closeLoopToast || !closeLoopToastText || !closeLoopToastReopenBtn) {
    return;
  }
  const id = String(taskId || "").trim();
  if (!id) {
    return;
  }
  closeLoopToastState = {
    taskId: id,
    chatId: normalizeChatThreadId(chatId, "")
  };
  const archived = Boolean(options.archived);
  closeLoopToastText.textContent = archived
    ? "✅ Resolved and archived. You can reopen anytime."
    : "✅ Resolved as done. You can reopen anytime.";
  closeLoopToastReopenBtn.disabled = false;
  closeLoopToast.hidden = false;
  if (closeLoopToastTimer) {
    window.clearTimeout(closeLoopToastTimer);
  }
  closeLoopToastTimer = window.setTimeout(() => {
    hideCloseLoopToast();
  }, 3000);
}

async function resolveTaskWithArchive(taskId, chatId, options = {}) {
  const id = String(taskId || "").trim();
  const linkedChatId = normalizeChatThreadId(chatId, "");
  if (!id) {
    return { cancelled: true, archived: false };
  }
  const sourceLabel = String(options.source || "close-loop prompt").trim() || "close-loop prompt";
  const skipRiskConfirm = Boolean(options.skipRiskConfirm);
  if (!skipRiskConfirm && isSafetyRollbackRisk()) {
    const proceed = window.confirm("Reopen ratio is above 50% today. Resolve and archive anyway?");
    if (!proceed) {
      logEvent(`Resolve cancelled due to rollback warning (${sourceLabel}).`);
      return { cancelled: true, archived: false };
    }
  }

  await setTaskLedgerTaskStatus(id, "done", { note: `Resolved from ${sourceLabel}.` });
  let archived = false;
  try {
    await archiveTaskLedgerTask(id);
    archived = true;
  } catch (archiveError) {
    logEvent(`Close-loop archive skipped for ${id}: ${archiveError.message}`);
  }
  if (linkedChatId) {
    setCloseLoopDismissed(linkedChatId);
  }
  showCloseLoopDoneToast(id, linkedChatId, { archived });
  logEvent(`Task ${id} resolved${archived ? " and archived" : ""} from ${sourceLabel}.`);
  refreshTaskLedger({ silent: true }).catch(() => {});
  refreshChatRailTasks({ silent: true }).catch(() => {});
  renderChatThreadList();
  return { cancelled: false, archived };
}

function renderCloseLoopPrompt(linkedTaskInfoByChatId = new Map()) {
  if (!closeLoopPrompt || !closeLoopText || !closeLoopMarkDoneBtn || !closeLoopResumeBtn) {
    return;
  }
  closeLoopPrompt.hidden = true;
  closeLoopMarkDoneBtn.disabled = false;
  closeLoopResumeBtn.disabled = false;
  closeLoopMarkDoneBtn.dataset.chatId = "";
  closeLoopMarkDoneBtn.dataset.taskId = "";
  closeLoopResumeBtn.dataset.chatId = "";

  const activeThread = chatThreads.find((thread) => thread.id === activeChatThreadId) || null;
  if (!activeThread) {
    return;
  }
  const linkedTaskInfo = linkedTaskInfoByChatId.get(activeThread.id);
  if (!linkedTaskInfo || !linkedTaskInfo.isActiveTask) {
    return;
  }
  const updatedMs = parseIsoTimeMs(activeThread.updatedAt || "");
  if (updatedMs <= 0) {
    return;
  }
  const nowMs = Date.now();
  if (nowMs - updatedMs < CHAT_CLOSE_LOOP_INACTIVE_MS) {
    return;
  }
  const dismissedAtMs = parseIsoTimeMs(chatCloseLoopDismissals[activeThread.id] || "");
  if (dismissedAtMs >= updatedMs) {
    return;
  }

  const taskLabel = buildChatThreadTitle(linkedTaskInfo.taskTitle || "", `Task ${linkedTaskInfo.taskId}`);
  closeLoopText.textContent = `${taskLabel} has been inactive for 48+ hours. Resolve and archive this or continue working?`;
  closeLoopMarkDoneBtn.dataset.chatId = activeThread.id;
  closeLoopMarkDoneBtn.dataset.taskId = linkedTaskInfo.taskId;
  closeLoopResumeBtn.dataset.chatId = activeThread.id;
  closeLoopPrompt.hidden = false;
}

function getChatThreadRecencyMs(thread, linkedTaskInfoByChatId = new Map()) {
  const threadUpdatedMs = parseIsoTimeMs(thread?.updatedAt || "");
  const threadId = normalizeChatThreadId(thread?.id || "", "");
  const linkedTaskInfo = threadId ? linkedTaskInfoByChatId.get(threadId) : null;
  const taskUpdatedMs = linkedTaskInfo ? Number(linkedTaskInfo.updatedMs || 0) : 0;
  return Math.max(threadUpdatedMs, Number.isFinite(taskUpdatedMs) ? taskUpdatedMs : 0);
}

function renderChatThreadList() {
  if (!chatThreadList || !chatPinnedThreadList) {
    return;
  }
  ensureChatWorkspace();
  const linkedTaskInfoByChatId = buildLinkedTaskInfoByChatId();
  const query = buildThreadSearchQuery();
  const filtered = chatThreads.filter((thread) => {
    if (!query) return true;
    const haystack = `${thread.title || ""} ${thread.preview || ""}`.toLowerCase();
    return haystack.includes(query);
  });
  const nowMs = Date.now();
  const pinnedRows = filtered.filter((thread) => isChatThreadPinned(thread.id));
  const recentRows = filtered
    .filter((thread) => !isChatThreadPinned(thread.id))
    .map((thread) => ({
      thread,
      recencyMs: getChatThreadRecencyMs(thread, linkedTaskInfoByChatId)
    }))
    .filter((row) => row.recencyMs > 0 && nowMs - row.recencyMs <= CHAT_RECENTLY_ACTIVE_WINDOW_MS)
    .sort((left, right) => right.recencyMs - left.recencyMs)
    .map((row) => row.thread)
    .slice(0, CHAT_RECENTLY_ACTIVE_MAX_ITEMS);
  const normalRows = filtered.filter((thread) => !isChatThreadPinned(thread.id));
  const focusSuggestion = deriveFocusSuggestionCandidate(
    linkedTaskInfoByChatId,
    { searchMode: Boolean(query) }
  );
  renderFocusSuggestionRow(focusSuggestion);
  renderChatThreadCards(
    chatPinnedThreadList,
    pinnedRows,
    "Your current priorities. Limited to 3.",
    { pinnedOnly: true, linkedTaskInfoByChatId, searchMode: Boolean(query) }
  );
  if (chatRecentlyActiveThreadList) {
    renderChatThreadCards(
      chatRecentlyActiveThreadList,
      recentRows,
      "No activity in the last 24 hours.",
      { linkedTaskInfoByChatId, searchMode: Boolean(query) }
    );
  }
  renderChatThreadCards(
    chatThreadList,
    normalRows,
    query ? "No matching conversations." : "No conversations yet.",
    { linkedTaskInfoByChatId, searchMode: Boolean(query) }
  );
  if (query && normalRows.length < 1) {
    renderChatSearchFallbackAction(chatThreadList, query);
  }
  const active = chatThreads.find((thread) => thread.id === activeChatThreadId) || chatThreads[0];
  if (chatActiveThreadHint) {
    chatActiveThreadHint.textContent = active?.title || DEFAULT_CHAT_THREAD_TITLE;
  }
  renderNextActionStrip(linkedTaskInfoByChatId);
  renderCloseLoopPrompt(linkedTaskInfoByChatId);
  renderChatExecutionChip();
  renderChatSafetyMetricsChip();
  renderFocusTurnoverChip();
}

function getChatRailTaskScope() {
  const scope = getActiveProjectScope();
  const scopeId = String(scope?.id || "").trim();
  if (!scopeId || scopeId === "all") {
    return "";
  }
  return scopeId;
}

function renderChatRailTasks() {
  if (!chatTaskCardList) {
    return;
  }
  const query = String(chatTaskSearch?.value || "").trim().toLowerCase();
  const rows = Array.isArray(chatRailTasks) ? chatRailTasks : [];
  const filtered = rows.filter((task) => {
    if (!query) return true;
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    return haystack.includes(query);
  });

  chatTaskCardList.innerHTML = "";
  if (filtered.length < 1) {
    const empty = document.createElement("div");
    empty.className = "chat-thread-preview";
    empty.textContent = "No tasks found.";
    chatTaskCardList.appendChild(empty);
    return;
  }

  for (const task of filtered) {
    const card = document.createElement("div");
    card.className = "chat-task-card";
    card.dataset.taskId = String(task.id || "");

    const title = document.createElement("div");
    title.className = "chat-task-title";
    title.textContent = String(task.title || task.id || "Task");
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "chat-task-meta";
    const status = String(task.status || "planned");
    const priority = String(task.priority || "normal");
    const linkedChatId = getTaskLinkedChatId(task.id);
    meta.textContent = `${status} • ${priority}${linkedChatId ? " • linked" : " • unlinked"}`;
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "chat-task-actions";

    const openConversationBtn = document.createElement("button");
    openConversationBtn.type = "button";
    openConversationBtn.className = "chat-task-open is-primary";
    openConversationBtn.dataset.action = "task-open-chat";
    openConversationBtn.dataset.taskId = String(task.id || "");
    openConversationBtn.textContent = linkedChatId ? "Open linked conversation" : "Start conversation";
    actions.appendChild(openConversationBtn);

    const useInChatBtn = document.createElement("button");
    useInChatBtn.type = "button";
    useInChatBtn.className = "chat-task-open";
    useInChatBtn.dataset.action = "task-to-chat";
    useInChatBtn.dataset.taskId = String(task.id || "");
    useInChatBtn.textContent = "Use in chat";
    actions.appendChild(useInChatBtn);

    card.appendChild(actions);

    chatTaskCardList.appendChild(card);
  }
}

async function refreshChatRailTasks(options = {}) {
  if (!chatTaskCardList) {
    return;
  }
  const scopeId = getChatRailTaskScope();
  const params = new URLSearchParams();
  params.set("limit", String(Math.max(4, Math.min(40, Number(options.limit) || 12))));
  params.set("includeArchived", "false");
  params.set("status", "all");
  if (scopeId) {
    params.set("projectScope", scopeId);
  }
  const search = String(options.query || "").trim();
  if (search) {
    params.set("q", search);
  }
  try {
    const data = await request(`/api/task-ledger/tasks?${params.toString()}`);
    chatRailTasks = Array.isArray(data.tasks) ? data.tasks.slice(0, 40) : [];
    renderChatRailTasks();
    renderChatThreadList();
  } catch (error) {
    if (!options.silent) {
      logEvent(`Task cards unavailable: ${error.message}`);
    }
    chatRailTasks = [];
    renderChatRailTasks();
    renderChatThreadList();
  }
}

function injectTaskIntoChat(taskId) {
  const wanted = String(taskId || "").trim();
  if (!wanted) return;
  const task = chatRailTasks.find((row) => String(row.id || "").trim() === wanted);
  if (!task) return;
  const title = String(task.title || wanted).trim();
  const desc = String(task.description || "").trim();
  const scoped = [`Focus task #${wanted}: ${title}`];
  if (desc) {
    scoped.push("", desc);
  }
  chatInput.value = scoped.join("\n");
  chatInput.focus();
}

function getTaskById(taskId) {
  const wanted = String(taskId || "").trim();
  if (!wanted) return null;
  return chatRailTasks.find((row) => String(row.id || "").trim() === wanted) || null;
}

function buildTaskConversationSeed(task = {}) {
  const taskId = String(task.id || "").trim();
  const title = buildChatThreadTitle(String(task.title || taskId || "Task"), "Task");
  const description = String(task.description || "").trim();
  const lines = [`Task ${taskId}: ${title}`];
  if (description) {
    lines.push("", description);
  }
  return lines.join("\n");
}

function startOrOpenTaskConversation(taskId) {
  const task = getTaskById(taskId);
  if (!task) {
    return;
  }
  const linked = getTaskLinkedChatId(task.id);
  if (linked && chatThreads.some((thread) => thread.id === linked)) {
    setActiveChatThread(linked, { load: true });
    refreshMemory();
    return;
  }

  const seed = `task-${String(task.id || "").trim().replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}-${Date.now().toString(36)}`;
  const nextId = normalizeChatThreadId(seed, DEFAULT_CHAT_THREAD_ID);
  const nextTitle = buildChatThreadTitle(String(task.title || "").trim(), "Task Conversation");
  const thread = upsertChatThread(createChatThread(nextId, nextTitle));
  setThreadTurns(thread.id, []);
  setTaskLinkedChatId(task.id, thread.id);
  setActiveChatThread(thread.id, { load: false });
  chatInput.value = buildTaskConversationSeed(task);
  chatInput.focus();
  refreshMemory();
}

function createMessage(role, text, meta, options = {}) {
  if (!messages) {
    return { wrap: null, head: null, body: null };
  }
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  const source = String(options?.source || "").trim().toLowerCase();
  if (source) {
    wrap.dataset.messageSource = source;
  }

  const head = document.createElement("div");
  head.className = "meta";
  head.textContent = meta;

  const body = document.createElement("div");
  body.textContent = text;

  wrap.appendChild(head);
  wrap.appendChild(body);
  messages.appendChild(wrap);
  applySimpleChatMessageWindow();
  messages.scrollTop = messages.scrollHeight;
  return { wrap, head, body };
}

function pushMessage(role, text, meta) {
  createMessage(role, text, meta);
}

function collectRenderedChatMessageNodes() {
  if (!messages) {
    return [];
  }
  const rows = [];
  for (const child of Array.from(messages.children)) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    if (child.classList.contains("message")) {
      rows.push(child);
      continue;
    }
    if (child.classList.contains("simple-chat-history")) {
      const nested = child.querySelectorAll(".message");
      for (const node of nested) {
        rows.push(node);
      }
    }
  }
  return rows;
}

function rebuildRenderedChatMessageNodes(nodes = []) {
  if (!messages) {
    return;
  }
  messages.innerHTML = "";
  for (const node of nodes) {
    messages.appendChild(node);
  }
}

function applySimpleChatMessageWindow() {
  if (!messages) {
    return;
  }
  const allMessages = collectRenderedChatMessageNodes();
  if (uiExperienceMode !== "simple") {
    rebuildRenderedChatMessageNodes(allMessages);
    return;
  }
  if (allMessages.length <= 1) {
    rebuildRenderedChatMessageNodes(allMessages);
    return;
  }

  let featuredIndex = -1;
  const latestMessage = allMessages[allMessages.length - 1] || null;
  if (latestMessage?.dataset?.messageSource === "live_transcript") {
    featuredIndex = allMessages.length - 1;
  } else {
    for (let idx = allMessages.length - 1; idx >= 0; idx -= 1) {
      if (allMessages[idx].classList.contains("brain")) {
        featuredIndex = idx;
        break;
      }
    }
  }
  if (featuredIndex < 0) {
    featuredIndex = allMessages.length - 1;
  }

  const featured = allMessages[featuredIndex];
  const historyNodes = allMessages.filter((_, idx) => idx !== featuredIndex);

  const historyDetails = document.createElement("details");
  historyDetails.className = "simple-chat-history";

  const historySummary = document.createElement("summary");
  historySummary.className = "simple-chat-history-summary";
  historySummary.textContent = `History (${historyNodes.length})`;
  historyDetails.appendChild(historySummary);

  const historyBody = document.createElement("div");
  historyBody.className = "simple-chat-history-body";
  for (const node of historyNodes) {
    historyBody.appendChild(node);
  }
  historyDetails.appendChild(historyBody);

  messages.innerHTML = "";
  messages.appendChild(historyDetails);
  messages.appendChild(featured);
}

function renderActiveChatMessages() {
  if (!messages) {
    return;
  }
  ensureChatWorkspace();
  const id = normalizeChatThreadId(activeChatThreadId, DEFAULT_CHAT_THREAD_ID);
  const turns = Array.isArray(chatTurnsByThread[id]) ? chatTurnsByThread[id] : [];
  messages.innerHTML = "";
  if (turns.length < 1) {
    createMessage("brain", "New chat ready. Ask me anything about your Asolaria task.", "System");
    return;
  }
  for (const turn of turns) {
    createMessage(
      mapTurnRoleToMessageRole(turn),
      String(turn.text || ""),
      formatTurnMeta(turn),
      {
        source: turn?.meta?.source || ""
      }
    );
  }
  applySimpleChatMessageWindow();
}

async function loadConversationTurns(chatId, options = {}) {
  const id = normalizeChatThreadId(chatId, DEFAULT_CHAT_THREAD_ID);
  const data = await request(`/api/chat/conversations/${encodeURIComponent(id)}?limit=180&clean=true`);
  setThreadTurns(id, Array.isArray(data.turns) ? data.turns : []);
  if (id === activeChatThreadId && options.render !== false) {
    renderActiveChatMessages();
  }
}

async function refreshConversationCatalog(options = {}) {
  const data = await request("/api/chat/conversations?limit=60&clean=true");
  const rows = Array.isArray(data.conversations) ? data.conversations : [];
  for (const row of rows) {
    upsertChatThread({
      id: row.chatId || row.id,
      title: row.title,
      preview: row.preview || row.lastText || "",
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      totalTurns: row.totalTurns,
      _fromServer: true
    });
  }
  ensureChatWorkspace();
  if (options.loadActive !== false) {
    await loadConversationTurns(activeChatThreadId, { render: true });
  } else {
    renderChatThreadList();
  }
  renderChatThreadList();
}

function setActiveChatThread(chatId, options = {}) {
  const id = normalizeChatThreadId(chatId, DEFAULT_CHAT_THREAD_ID);
  activeChatThreadId = id;
  ensureChatWorkspace();
  renderChatThreadList();
  saveChatWorkspaceState();
  if (options.load !== false) {
    loadConversationTurns(id, { render: true }).catch((error) => {
      logEvent(`Chat load failed: ${error.message}`);
    });
  } else {
    renderActiveChatMessages();
  }
}

function createNewChatThread() {
  const seed = `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const id = normalizeChatThreadId(seed, DEFAULT_CHAT_THREAD_ID);
  const thread = upsertChatThread(createChatThread(id, "New Chat"));
  setThreadTurns(thread.id, []);
  setActiveChatThread(thread.id, { load: false });
  chatInput.focus();
}

function createNewChatThreadFromSeed(seedText = "") {
  createNewChatThread();
  const seed = String(seedText || "").trim();
  if (seed) {
    chatInput.value = seed;
  }
  chatInput.focus();
  refreshMemory();
}

function renameActiveChatThread() {
  const current = chatThreads.find((thread) => thread.id === activeChatThreadId);
  if (!current) return;
  const next = window.prompt("Rename chat:", current.title || "New Chat");
  if (next === null) return;
  const title = buildChatThreadTitle(next, current.title || "New Chat");
  upsertChatThread({
    ...current,
    title
  });
  renderChatThreadList();
  saveChatWorkspaceState();
}

function runPrimaryNextAction() {
  const action = nextActionState && typeof nextActionState === "object"
    ? nextActionState
    : { type: "start_new" };
  if (action.type === "task" && action.taskId) {
    startOrOpenTaskConversation(action.taskId);
    return;
  }
  if (action.type === "focus" && action.chatId) {
    setActiveChatThread(action.chatId, { load: true });
    refreshMemory();
    return;
  }
  if (action.type === "review" && action.chatId) {
    setActiveChatThread(action.chatId, { load: true });
    refreshMemory();
    return;
  }
  createNewChatThread();
  refreshMemory();
}

function updateMessageBody(messageRef, text, meta) {
  messageRef.body.textContent = text;
  if (meta) {
    messageRef.head.textContent = meta;
  }
}

function resolveRequestTimeoutMs(path, options = {}) {
  const explicit = Number(options.timeoutMs);
  if (Number.isFinite(explicit) && explicit >= 0) {
    return explicit;
  }
  const target = String(path || "");
  if (target.startsWith("/api/health/fast")) {
    return 3000;
  }
  if (target.startsWith("/api/health")) {
    return 12000;
  }
  if (target.startsWith("/api/admin-terminals/cockpit")) {
    return 25000;
  }
  if (target.startsWith("/api/memory")) {
    return 25000;
  }
  if (target.startsWith("/api/task-ledger")) {
    return 25000;
  }
  if (target.startsWith("/api/chat/conversations")) {
    return 25000;
  }
  if (target.startsWith("/api/skills")) {
    return 20000;
  }
  if (target.startsWith("/api/projects") || target.startsWith("/api/project-scopes")) {
    return 20000;
  }
  if (target.startsWith("/api/gateway/")) {
    return 15000;
  }
  return 8000;
}

async function request(path, options = {}) {
  const requestOptions = { ...options };
  const headers = {
    ...(options && options.headers && typeof options.headers === "object" ? options.headers : {})
  };
  if (!headers["x-asolaria-viewer"] && !headers["X-Asolaria-Viewer"]) {
    headers["x-asolaria-viewer"] = "owner";
  }
  requestOptions.headers = headers;
  delete requestOptions.timeoutMs;
  const timeoutMs = resolveRequestTimeoutMs(path, options);
  let timeoutId = null;
  if (!requestOptions.signal && timeoutMs > 0 && typeof AbortController !== "undefined") {
    const controller = new AbortController();
    requestOptions.signal = controller.signal;
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }
  try {
    const response = await fetch(path, requestOptions);
    const data = await response.json();
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function apiPost(path, payload) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
}

async function apiDelete(path, payload) {
  const options = {
    method: "DELETE"
  };
  if (payload !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(payload || {});
  }
  return request(path, options);
}

const FALLBACK_EXTERNAL_MODEL_ALIASES = Object.freeze({
  anthropic: Object.freeze(["opus", "sonnet", "haiku"]),
  gemini: Object.freeze(["gemini-pro", "gemini-flash", "pro", "flash"]),
  cursor: Object.freeze(["opus", "sonnet", "gemini-pro", "gemini-flash"]),
  antigravity: Object.freeze([])
});

function uniqueNonEmptyStrings(values) {
  const seen = new Set();
  const output = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = String(value || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
}

function normalizeExternalProviderId(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "cursor" || provider === "antigravity" || provider === "anthropic" || provider === "gemini") {
    return provider;
  }
  return "anthropic";
}

function renderExternalMcpTokenProfileOptions(profileCatalog = {}) {
  if (!externalMcpTokenReductionProfileSelect) {
    return;
  }
  const source = profileCatalog && typeof profileCatalog === "object"
    ? profileCatalog
    : {};
  const currentValue = normalizeExternalMcpTokenReductionProfile(
    externalMcpTokenReductionProfileSelect.value,
    EXTERNAL_MCP_TOKEN_PROFILE_FALLBACK
  );
  const profileIds = uniqueNonEmptyStrings(
    Object.keys(source).map((key) => normalizeExternalMcpTokenReductionProfile(key, ""))
  ).filter(Boolean);
  const fallbackIds = ["balanced", "aggressive", "off"];
  const options = uniqueNonEmptyStrings([...profileIds, ...fallbackIds]);
  externalMcpTokenReductionProfileSelect.innerHTML = "";
  for (const id of options) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = id;
    externalMcpTokenReductionProfileSelect.appendChild(option);
  }
  if (!Array.from(externalMcpTokenReductionProfileSelect.options).some((entry) => entry.value === currentValue)) {
    const option = document.createElement("option");
    option.value = currentValue;
    option.textContent = `${currentValue} (current)`;
    externalMcpTokenReductionProfileSelect.appendChild(option);
  }
  externalMcpTokenReductionProfileSelect.value = currentValue;
}

function applyExternalMcpProviderStatus(providerStatus = {}) {
  const status = providerStatus && typeof providerStatus === "object" ? providerStatus : {};
  if (!externalMcpUiDirty) {
    if (externalMcpTokenReductionProfileSelect) {
      externalMcpTokenReductionProfileSelect.value = normalizeExternalMcpTokenReductionProfile(
        status.mcpTokenReductionProfile,
        externalMcpTokenReductionProfileSelect.value || EXTERNAL_MCP_TOKEN_PROFILE_FALLBACK
      );
    }
    if (externalMcpToolSchemaModeSelect) {
      externalMcpToolSchemaModeSelect.value = normalizeExternalMcpToolSchemaMode(
        status.mcpToolSchemaMode,
        externalMcpToolSchemaModeSelect.value || EXTERNAL_MCP_TOOL_SCHEMA_MODE_FALLBACK
      );
    }
    if (externalMcpPromptTokenLimitInput) {
      externalMcpPromptTokenLimitInput.value = String(
        normalizeExternalMcpPromptTokenLimit(
          status.mcpPromptTokenLimit,
          externalMcpPromptTokenLimitInput.value || EXTERNAL_MCP_PROMPT_TOKEN_LIMIT_FALLBACK
        )
      );
    }
  }
  if (externalMcpSkillHintsInput && !externalMcpSkillHintsInput.value.trim()) {
    const count = Math.max(0, Number(status.mcpSkillHintsCount || 0));
    externalMcpSkillHintsInput.placeholder = count > 0
      ? `Skill hints (configured: ${count}; add run-specific hints)`
      : "Skill hints (comma-separated, optional)";
  }
  if (externalMcpWebHintsInput && !externalMcpWebHintsInput.value.trim()) {
    const count = Math.max(0, Number(status.mcpWebMcpHintsCount || 0));
    externalMcpWebHintsInput.placeholder = count > 0
      ? `WebMCP hints (configured: ${count}; add run-specific hints)`
      : "WebMCP hints (comma-separated, optional)";
  }
}

async function refreshExternalMcpProviderStatus(options = {}) {
  const provider = normalizeExternalProviderId(
    options.provider || externalProviderSelect?.value || "anthropic"
  );
  const silent = Boolean(options.silent);
  try {
    const data = await request("/api/integrations/external/status");
    const providerRows = Array.isArray(data?.status) ? data.status : [];
    const nextByProvider = Object.create(null);
    for (const row of providerRows) {
      const id = normalizeExternalProviderId(row?.id || "");
      if (!id) continue;
      nextByProvider[id] = row;
    }
    externalMcpStatusByProvider = nextByProvider;
    const profiles = data?.mcpTokenReductionProfiles && typeof data.mcpTokenReductionProfiles === "object"
      ? data.mcpTokenReductionProfiles
      : {};
    externalMcpProfilesCatalog = Object.freeze({ ...profiles });
    renderExternalMcpTokenProfileOptions(externalMcpProfilesCatalog);
    applyExternalMcpProviderStatus(externalMcpStatusByProvider[provider] || {});
  } catch (error) {
    if (!silent) {
      logEvent(`External MCP status refresh failed: ${error.message}`);
    }
  }
}

function readExternalMcpRunOptions() {
  const tokenReductionProfile = normalizeExternalMcpTokenReductionProfile(
    externalMcpTokenReductionProfileSelect?.value,
    EXTERNAL_MCP_TOKEN_PROFILE_FALLBACK
  );
  const toolSchemaMode = normalizeExternalMcpToolSchemaMode(
    externalMcpToolSchemaModeSelect?.value,
    EXTERNAL_MCP_TOOL_SCHEMA_MODE_FALLBACK
  );
  const promptTokenLimit = normalizeExternalMcpPromptTokenLimit(
    externalMcpPromptTokenLimitInput?.value,
    EXTERNAL_MCP_PROMPT_TOKEN_LIMIT_FALLBACK
  );
  const contextKey = normalizeExternalMcpContextKey(externalMcpContextKeyInput?.value, "");
  const skillHints = normalizeExternalHintList(externalMcpSkillHintsInput?.value, 24, 72);
  const webHints = normalizeExternalHintList(externalMcpWebHintsInput?.value, 24, 72);
  if (externalMcpTokenReductionProfileSelect) {
    externalMcpTokenReductionProfileSelect.value = tokenReductionProfile;
  }
  if (externalMcpToolSchemaModeSelect) {
    externalMcpToolSchemaModeSelect.value = toolSchemaMode;
  }
  if (externalMcpPromptTokenLimitInput) {
    externalMcpPromptTokenLimitInput.value = String(promptTokenLimit);
  }
  if (externalMcpContextKeyInput) {
    externalMcpContextKeyInput.value = contextKey;
  }
  if (externalMcpSkillHintsInput) {
    externalMcpSkillHintsInput.value = skillHints.join(", ");
  }
  if (externalMcpWebHintsInput) {
    externalMcpWebHintsInput.value = webHints.join(", ");
  }
  return {
    mcpTokenReductionProfile: tokenReductionProfile,
    mcpToolSchemaMode: toolSchemaMode,
    mcpPromptTokenLimit: promptTokenLimit,
    mcpContextKey: contextKey || undefined,
    mcpSkillHints: skillHints,
    mcpWebMcpHints: webHints
  };
}

function normalizeExternalDefaultModelValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  let text = raw;
  if (
    (text.startsWith("\"") && text.endsWith("\""))
    || (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.slice(0, 160);
}

function normalizeExternalDefaultModelsMap(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {};
  const providers = ["anthropic", "gemini", "cursor", "antigravity"];
  for (const providerId of providers) {
    const provider = normalizeExternalProviderId(providerId);
    const model = normalizeExternalDefaultModelValue(source[provider]);
    if (model) {
      normalized[provider] = model;
    }
  }
  return normalized;
}

function serializeExternalDefaultModelsMap(value) {
  const normalized = normalizeExternalDefaultModelsMap(value);
  const keys = Object.keys(normalized).sort();
  return keys.map((key) => `${key}:${normalized[key]}`).join("|");
}

function getExternalDefaultModel(providerId) {
  const provider = normalizeExternalProviderId(providerId);
  return normalizeExternalDefaultModelValue(externalDefaultModels?.[provider]);
}

function normalizeExternalObservedModelDetailEntry(value) {
  const source = value && typeof value === "object" ? value : {};
  const model = normalizeExternalDefaultModelValue(
    source.model !== undefined
      ? source.model
      : value
  );
  if (!model) {
    return null;
  }
  const firstSeenAtRaw = String(source.firstSeenAt || source.firstSeen || source.first_seen_at || "").trim();
  const lastSeenAtRaw = String(source.lastSeenAt || source.lastSeen || source.last_seen_at || source.seenAt || "").trim();
  const firstSeenMs = Date.parse(firstSeenAtRaw);
  const lastSeenMs = Date.parse(lastSeenAtRaw);
  const firstSeenAt = Number.isFinite(firstSeenMs) ? new Date(firstSeenMs).toISOString() : "";
  const lastSeenAt = Number.isFinite(lastSeenMs) ? new Date(lastSeenMs).toISOString() : "";
  const seenCountRaw = Number(
    source.seenCount !== undefined
      ? source.seenCount
      : (source.count !== undefined ? source.count : source.seen)
  );
  const seenCount = Number.isFinite(seenCountRaw) ? Math.max(1, Math.round(seenCountRaw)) : 1;
  return {
    model,
    firstSeenAt,
    lastSeenAt: lastSeenAt || firstSeenAt,
    seenCount
  };
}

function getExternalObservedModelDetails(providerId) {
  const provider = normalizeExternalProviderId(providerId);
  const catalogEntry = externalModelCatalog?.[provider] && typeof externalModelCatalog[provider] === "object"
    ? externalModelCatalog[provider]
    : {};
  const rawDetails = Array.isArray(catalogEntry.observedModelDetails)
    ? catalogEntry.observedModelDetails
    : (Array.isArray(catalogEntry.observedModels) ? catalogEntry.observedModels : []);
  const seen = new Set();
  const details = [];
  for (const raw of rawDetails) {
    const parsed = normalizeExternalObservedModelDetailEntry(raw);
    if (!parsed) continue;
    const key = parsed.model.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    details.push(parsed);
  }
  return details;
}

function getExternalObservedModels(providerId) {
  return getExternalObservedModelDetails(providerId).map((entry) => entry.model);
}

function formatObservedAge(value) {
  const parsed = Date.parse(String(value || ""));
  if (!Number.isFinite(parsed)) {
    return "unknown";
  }
  const diffMs = Date.now() - parsed;
  if (!Number.isFinite(diffMs) || diffMs < 15 * 1000) {
    return "just now";
  }
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  }
  if (diffMs < day) {
    return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  }
  return `${Math.max(1, Math.floor(diffMs / day))}d ago`;
}

function readExternalObservedMaxAgeDays() {
  const parsed = Number(externalObservedMaxAgeDaysInput?.value || 30);
  const days = Number.isFinite(parsed) ? Math.max(1, Math.min(3650, Math.round(parsed))) : 30;
  if (externalObservedMaxAgeDaysInput) {
    externalObservedMaxAgeDaysInput.value = String(days);
  }
  return days;
}

function normalizeExternalObservedPruneDays(value, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(3650, Math.round(parsed)));
}

function normalizeExternalObservedPruneHour(value, fallback = 3) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(23, Math.round(parsed)));
}

function readExternalObservedAutoPruneDays() {
  const days = normalizeExternalObservedPruneDays(
    externalObservedAutoPruneDaysInput?.value,
    externalObservedPruneRuntime.maxAgeDays
  );
  if (externalObservedAutoPruneDaysInput) {
    externalObservedAutoPruneDaysInput.value = String(days);
  }
  return days;
}

function readExternalObservedAutoPruneHour() {
  const hour = normalizeExternalObservedPruneHour(
    externalObservedAutoPruneHourInput?.value,
    externalObservedPruneRuntime.dailyHourLocal
  );
  if (externalObservedAutoPruneHourInput) {
    externalObservedAutoPruneHourInput.value = String(hour);
  }
  return hour;
}

function renderExternalObservedPruneStatus() {
  if (!externalObservedPruneStatus) {
    return;
  }
  const enabled = Boolean(externalObservedPruneRuntime.enabled);
  const days = normalizeExternalObservedPruneDays(externalObservedPruneRuntime.maxAgeDays, 30);
  const hour = normalizeExternalObservedPruneHour(externalObservedPruneRuntime.dailyHourLocal, 3);
  const hourText = `${String(hour).padStart(2, "0")}:00`;
  const timerText = externalObservedPruneRuntime.timerActive ? "armed" : "idle";
  const nextRunText = externalObservedPruneRuntime.nextRunAt
    ? formatLocalTimestamp(externalObservedPruneRuntime.nextRunAt)
    : "n/a";
  const lastRunText = externalObservedPruneRuntime.lastRunAt
    ? formatLocalTimestamp(externalObservedPruneRuntime.lastRunAt)
    : "n/a";
  const runs = Math.max(0, Number(externalObservedPruneRuntime.runs || 0));
  const error = String(externalObservedPruneRuntime.lastError || "").trim();
  const errorText = error ? ` Error: ${error.slice(0, 140)}.` : "";
  if (enabled) {
    externalObservedPruneStatus.textContent = `Auto-prune ON (${timerText}): keep ${days} day(s), run daily at ${hourText} local. Next: ${nextRunText}. Last: ${lastRunText}. Runs: ${runs}.${errorText}`;
    return;
  }
  externalObservedPruneStatus.textContent = `Auto-prune OFF. Configured window: ${days} day(s), hour: ${hourText} local.${errorText}`;
}

function applyExternalObservedPruneRuntimeSnapshot(snapshot = {}) {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  if (source.enabled !== undefined) {
    externalObservedPruneRuntime.enabled = Boolean(source.enabled);
  }
  externalObservedPruneRuntime.maxAgeDays = normalizeExternalObservedPruneDays(
    source.maxAgeDays,
    externalObservedPruneRuntime.maxAgeDays
  );
  externalObservedPruneRuntime.dailyHourLocal = normalizeExternalObservedPruneHour(
    source.dailyHourLocal,
    externalObservedPruneRuntime.dailyHourLocal
  );
  externalObservedPruneRuntime.timerActive = Boolean(source.timerActive);
  externalObservedPruneRuntime.nextRunAt = String(source.nextRunAt || "");
  externalObservedPruneRuntime.lastRunAt = String(source.lastRunAt || "");
  externalObservedPruneRuntime.lastError = String(source.lastError || "");
  externalObservedPruneRuntime.lastSummary = source.lastSummary && typeof source.lastSummary === "object"
    ? source.lastSummary
    : null;
  externalObservedPruneRuntime.runs = Math.max(0, Number(source.runs || 0));
  renderExternalObservedPruneStatus();
}

function buildExternalModelSuggestions(providerId) {
  const provider = normalizeExternalProviderId(providerId);
  const fallback = Array.isArray(FALLBACK_EXTERNAL_MODEL_ALIASES[provider])
    ? FALLBACK_EXTERNAL_MODEL_ALIASES[provider]
    : [];
  const hints = Array.isArray(externalModelAliases?.[provider])
    ? externalModelAliases[provider]
    : fallback;
  const catalogEntry = externalModelCatalog?.[provider] && typeof externalModelCatalog[provider] === "object"
    ? externalModelCatalog[provider]
    : {};
  const aliasMap = catalogEntry.aliases && typeof catalogEntry.aliases === "object"
    ? Object.keys(catalogEntry.aliases)
    : [];
  const canonicalModels = Array.isArray(catalogEntry.canonicalModels)
    ? catalogEntry.canonicalModels
    : [];
  const defaultModel = getExternalDefaultModel(provider);
  return uniqueNonEmptyStrings([...hints, ...aliasMap, ...canonicalModels, defaultModel]).slice(0, 180);
}

function refreshExternalModelInputUi(options = {}) {
  const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
  const suggestions = buildExternalModelSuggestions(provider);
  const defaultModel = getExternalDefaultModel(provider);
  const observedModelDetails = getExternalObservedModelDetails(provider);
  const observedModels = getExternalObservedModels(provider);
  const syncValue = Boolean(options.syncValue);
  const forceValue = Boolean(options.forceValue);

  if (externalModelAliasList) {
    externalModelAliasList.innerHTML = "";
    for (const value of suggestions) {
      const option = document.createElement("option");
      option.value = value;
      externalModelAliasList.appendChild(option);
    }
  }

  if (externalModelInput) {
    externalModelInput.placeholder = defaultModel
      ? `Model alias or exact ID for ${provider} (default: ${defaultModel})`
      : `Model alias or exact ID for ${provider} (optional)`;
    const currentValue = String(externalModelInput.value || "").trim();
    if (syncValue && (forceValue || !currentValue)) {
      externalModelInput.value = defaultModel;
    }
  }

  if (externalModelHint) {
    const aliasHint = suggestions.length > 0
      ? `Aliases for ${provider}: ${suggestions.slice(0, 8).join(", ")}${suggestions.length > 8 ? ", ..." : ""}`
      : `No known aliases for ${provider}. You can still use an exact model ID.`;
    const defaultHint = defaultModel ? ` Default model: ${defaultModel}.` : "";
    const observedHint = observedModels.length > 0
      ? ` Observed: ${observedModels.length}.`
      : "";
    externalModelHint.textContent = `${aliasHint}${defaultHint}${observedHint}`.trim();
  }

  if (externalObservedHint) {
    if (observedModelDetails.length > 0) {
      const preview = observedModelDetails
        .slice(0, 5)
        .map((entry) => `${entry.model} (${formatObservedAge(entry.lastSeenAt)}, x${entry.seenCount})`)
        .join(", ");
      externalObservedHint.textContent = `Observed models for ${provider}: ${preview}${observedModelDetails.length > 5 ? ", ..." : ""}`;
    } else {
      externalObservedHint.textContent = `Observed models for ${provider}: none yet.`;
    }
  }
}

async function refreshExternalModelAliases(options = {}) {
  const silent = Boolean(options.silent);
  let defaultModelsChanged = false;
  try {
    const data = await request("/api/providers/model-aliases");
    externalModelAliases = data.aliases && typeof data.aliases === "object"
      ? data.aliases
      : {};
    externalModelCatalog = data.catalog && typeof data.catalog === "object"
      ? data.catalog
      : {};
    if (data.defaultModels && typeof data.defaultModels === "object") {
      const nextDefaults = normalizeExternalDefaultModelsMap(data.defaultModels);
      const nextRevision = serializeExternalDefaultModelsMap(nextDefaults);
      defaultModelsChanged = nextRevision !== externalDefaultModelsRevision;
      externalDefaultModels = nextDefaults;
      externalDefaultModelsRevision = nextRevision;
    }
    if (!silent) {
      logEvent("External model aliases refreshed.");
    }
  } catch (error) {
    externalModelAliases = { ...FALLBACK_EXTERNAL_MODEL_ALIASES };
    externalModelCatalog = {};
    if (!silent) {
      logEvent(`External model aliases unavailable: ${error.message}`);
    }
  } finally {
    refreshExternalModelInputUi({ syncValue: defaultModelsChanged });
  }
}

async function saveExternalDefaultModel(providerId, modelValue, options = {}) {
  const silent = Boolean(options.silent);
  const provider = normalizeExternalProviderId(providerId);
  const normalizedModel = normalizeExternalDefaultModelValue(modelValue);
  const currentDefault = getExternalDefaultModel(provider);
  if (currentDefault === normalizedModel) {
    return false;
  }
  const data = await apiPost("/api/providers/model-settings/default", {
    provider,
    model: normalizedModel
  });
  applySettingsUi(data.settings || {});
  if (data.modelSettings?.catalog && typeof data.modelSettings.catalog === "object") {
    externalModelCatalog = {
      ...externalModelCatalog,
      [provider]: data.modelSettings.catalog
    };
  }
  if (data.modelSettings?.observedPrune && typeof data.modelSettings.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.modelSettings.observedPrune);
  }
  refreshExternalModelInputUi({ syncValue: true });
  if (!silent) {
    logEvent(
      normalizedModel
        ? `Saved default model for ${provider}: ${data.model || normalizedModel}`
        : `Cleared default model for ${provider}.`
    );
  }
  return true;
}

async function clearObservedExternalModels(providerId, options = {}) {
  const silent = Boolean(options.silent);
  const provider = String(providerId || "").trim() || "all";
  const data = await apiPost("/api/providers/model-settings/observed/clear", {
    provider
  });
  if (!silent) {
    logEvent(`Observed external models cleared for ${data.cleared || provider}.`);
  }
  if (data.modelSettings?.observedPrune && typeof data.modelSettings.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.modelSettings.observedPrune);
  }
  await refreshExternalModelAliases({ silent: true });
  refreshExternalModelInputUi({ syncValue: true });
  return data;
}

async function pruneObservedExternalModels(providerId, maxAgeDays, options = {}) {
  const silent = Boolean(options.silent);
  const provider = String(providerId || "").trim() || "all";
  const days = Number.isFinite(Number(maxAgeDays))
    ? Math.max(1, Math.min(3650, Math.round(Number(maxAgeDays))))
    : 30;
  const data = await apiPost("/api/providers/model-settings/observed/prune", {
    provider,
    maxAgeDays: days
  });
  if (!silent) {
    const removed = Number(data.removed || 0);
    logEvent(`Pruned observed models for ${data.target || provider}: removed=${removed}, days=${days}.`);
  }
  if (data.modelSettings?.observedPrune && typeof data.modelSettings.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.modelSettings.observedPrune);
  }
  await refreshExternalModelAliases({ silent: true });
  refreshExternalModelInputUi({ syncValue: true });
  return data;
}

async function showExternalModelSettings(providerId = "") {
  const provider = normalizeExternalProviderId(providerId || externalProviderSelect?.value || "");
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  const data = await request(`/api/providers/model-settings${query}`);
  if (externalOutput) {
    externalOutput.textContent = provider
      ? `Loaded external model settings for ${provider}.`
      : "Loaded external model settings.";
  }
  if (data.observedPrune && typeof data.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.observedPrune);
  }
  pushMessage(
    "brain",
    JSON.stringify(data, null, 2),
    provider ? `Model Settings (${provider})` : "Model Settings"
  );
  return data;
}

async function getJob(jobId) {
  const data = await request(`/api/jobs/${encodeURIComponent(jobId)}`);
  return data.job;
}

function applyStealthUi(enabled) {
  stealthMode = Boolean(enabled);
  document.body.classList.toggle("stealth-on", stealthMode);

  if (stealthToggle) {
    stealthToggle.checked = stealthMode;
  }

  if (stealthLabel) {
    stealthLabel.textContent = stealthMode ? "Stealth ON" : "Stealth OFF";
  }

  if (stealthHint) {
    stealthHint.textContent = stealthMode
      ? "Stealth Mode is ON. Visible launch actions are hidden."
      : "Stealth Mode is OFF. Visible launch actions are available.";
  }
}

function normalizeApprovalMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "manual" || normalized === "deny") {
    return normalized;
  }
  return "smart";
}

function normalizeCostMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "balanced" || normalized === "quality") {
    return normalized;
  }
  return "low";
}

function normalizeCodexWebSearch(value) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "on" || normalized === "enabled" || normalized === "1";
}

function normalizeOpenclawMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "governed" || normalized === "disabled") {
    return normalized;
  }
  return "read_only";
}

function normalizeGuardianMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "off" || normalized === "notify" || normalized === "strict") {
    return normalized;
  }
  return "autonomous";
}

function normalizeGuardianRiskThreshold(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "critical") {
    return normalized;
  }
  return "high";
}

function normalizeMemoryWindow(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return memoryWindowTurns;
  }
  return Math.max(4, Math.min(40, Math.round(parsed)));
}

function applyOpenclawUi(mode) {
  const disabled = String(mode || "").toLowerCase() === "disabled";
  if (openclawCard) {
    openclawCard.style.display = disabled ? "none" : "";
  }
}

function applySettingsUi(settings = {}) {
  applyStealthUi(Boolean(settings.stealthMode));

  approvalMode = normalizeApprovalMode(settings.approvalMode || approvalMode);
  if (approvalModeSelect) {
    approvalModeSelect.value = approvalMode;
  }

  costMode = normalizeCostMode(settings.costMode || costMode);
  if (costModeSelect) {
    costModeSelect.value = costMode;
  }

  codexWebSearch = normalizeCodexWebSearch(settings.codexWebSearch ?? codexWebSearch);
  if (codexWebSearchSelect) {
    codexWebSearchSelect.value = codexWebSearch ? "on" : "off";
  }

  openclawMode = normalizeOpenclawMode(settings.openclawMode || openclawMode);
  if (openclawModeSelect) {
    openclawModeSelect.value = openclawMode;
  }
  applyOpenclawUi(openclawMode);

  voiceEnabled = normalizeOnOff(settings.voiceEnabled, voiceEnabled);
  voiceOutputMode = normalizeVoiceOutputMode(settings.voiceOutputMode, voiceOutputMode);
  if (voiceOutputModeSelect) {
    voiceOutputModeSelect.value = voiceOutputMode;
  }
  voiceAutoSpeakReplies = normalizeVoiceAutoSpeak(
    settings.voiceAutoSpeakReplies,
    voiceAutoSpeakReplies
  );
  if (voiceAutoSpeakSelect) {
    voiceAutoSpeakSelect.value = voiceAutoSpeakReplies ? "on" : "off";
  }
  voiceInputCaptureMode = normalizeVoiceInputCaptureMode(
    settings.voiceInputCaptureMode,
    voiceInputCaptureMode
  );
  voiceInputDevice = normalizeVoiceInputDevice(
    settings.voiceInputDevice,
    voiceInputDevice
  );
  voiceOutputDeviceId = normalizeVoiceOutputDeviceId(
    settings.voiceOutputDeviceId,
    voiceOutputDeviceId
  );
  avatarEnabled = normalizeOnOff(settings.avatarEnabled, avatarEnabled);
  avatarMode = normalizeAvatarMode(settings.avatarMode, avatarMode);
  voiceWakeWord = normalizeWakeWord(settings.voiceWakeWord, voiceWakeWord);
  kittyTtsUrl = normalizeOptionalUrl(settings.kittyTtsUrl, kittyTtsUrl);
  kittyTtsApiKeyConfigured = normalizeOnOff(
    settings.kittyTtsApiKeyConfigured,
    kittyTtsApiKeyConfigured
  );
  syncVoiceAvatarControlState({ skipFocused: true });
  setAvatarVisualState(avatarVisualState);
  if (!avatarEnabled) {
    setQuickAvatarStatus("Avatar disabled. Enable it in Voice & Avatar controls.", "idle");
  }

  allowExternalPosting = Boolean(settings.allowExternalPosting);
  if (allowExternalPostingToggle) {
    allowExternalPostingToggle.checked = allowExternalPosting;
  }
  if (companyHint) {
    companyHint.textContent = allowExternalPosting
      ? "External posting is ENABLED. Use with caution."
      : "External posting is DISABLED (recommended).";
  }

  const nextExternalDefaultModels = normalizeExternalDefaultModelsMap(settings.externalDefaultModels);
  const nextExternalDefaultModelsRevision = serializeExternalDefaultModelsMap(nextExternalDefaultModels);
  const externalDefaultsChanged = nextExternalDefaultModelsRevision !== externalDefaultModelsRevision;
  externalDefaultModels = nextExternalDefaultModels;
  externalDefaultModelsRevision = nextExternalDefaultModelsRevision;
  refreshExternalModelInputUi({ syncValue: externalDefaultsChanged });

  externalObservedPruneRuntime.enabled = Boolean(
    settings.externalObservedPruneEnabled ?? externalObservedPruneRuntime.enabled
  );
  externalObservedPruneRuntime.maxAgeDays = normalizeExternalObservedPruneDays(
    settings.externalObservedPruneMaxAgeDays,
    externalObservedPruneRuntime.maxAgeDays
  );
  externalObservedPruneRuntime.dailyHourLocal = normalizeExternalObservedPruneHour(
    settings.externalObservedPruneDailyHourLocal,
    externalObservedPruneRuntime.dailyHourLocal
  );
  if (externalObservedAutoPruneEnabledToggle) {
    externalObservedAutoPruneEnabledToggle.checked = externalObservedPruneRuntime.enabled;
  }
  if (externalObservedAutoPruneDaysInput) {
    externalObservedAutoPruneDaysInput.value = String(externalObservedPruneRuntime.maxAgeDays);
  }
  if (externalObservedAutoPruneHourInput) {
    externalObservedAutoPruneHourInput.value = String(externalObservedPruneRuntime.dailyHourLocal);
  }
  renderExternalObservedPruneStatus();

  guardianMode = normalizeGuardianMode(settings.guardianMode || guardianMode);
  if (guardianModeSelect) {
    guardianModeSelect.value = guardianMode;
  }

  guardianRiskThreshold = normalizeGuardianRiskThreshold(settings.guardianRiskThreshold || guardianRiskThreshold);
  if (guardianRiskThresholdSelect) {
    guardianRiskThresholdSelect.value = guardianRiskThreshold;
  }

  guardianAlertsEnabled = Boolean(settings.guardianAlertsEnabled ?? guardianAlertsEnabled);
  if (guardianAlertsEnabledToggle) {
    guardianAlertsEnabledToggle.checked = guardianAlertsEnabled;
  }

  guardianAutoBlockCritical = Boolean(settings.guardianAutoBlockCritical ?? guardianAutoBlockCritical);
  if (guardianAutoBlockCriticalToggle) {
    guardianAutoBlockCriticalToggle.checked = guardianAutoBlockCritical;
  }

  if (guardianOutput) {
    guardianOutput.textContent = `Mode=${guardianMode}, threshold=${guardianRiskThreshold}, alerts=${guardianAlertsEnabled ? "on" : "off"}, autoBlockCritical=${guardianAutoBlockCritical ? "on" : "off"}`;
  }

  memoryWindowTurns = normalizeMemoryWindow(settings.memoryWindowTurns ?? memoryWindowTurns);
  if (memoryWindowTurnsInput) {
    memoryWindowTurnsInput.value = String(memoryWindowTurns);
  }
}

function formatJobResult(job) {
  if (!job) return "No job data returned.";

  if (job.type === "brain") {
    const lines = [String(job.result?.reply || "Brain task completed with no reply.")];
    if (job.result?.provider) {
      lines.push(`Provider: ${job.result.provider}`);
    }

    if (Array.isArray(job.result?.imagesUsed) && job.result.imagesUsed.length > 0) {
      lines.push(`Images used: ${job.result.imagesUsed.map((item) => String(item).split(/[\\/]/).pop()).join(", ")}`);
    }

    if (Array.isArray(job.result?.approvals) && job.result.approvals.length > 0) {
      const approvalLines = job.result.approvals.map((entry) => {
        return `- ${entry.choice.toUpperCase()} (${entry.reason})`;
      });
      lines.push(`Approval choices:\n${approvalLines.join("\n")}`);
    }

    return lines.join("\n\n");
  }

  if (job.type === "screenshot") {
    return `Screenshot saved to: ${job.result?.outputPath || "unknown path"}`;
  }

  if (job.type === "browser_task") {
    const extracts = job.result?.extracts && typeof job.result.extracts === "object"
      ? job.result.extracts
      : {};
    const reply = String(extracts.chat_reply || "").trim();
    if (reply) {
      return reply;
    }
    return JSON.stringify(job.result || {}, null, 2);
  }

  if (job.type === "pad_run") {
    const code = job.result?.exitCode;
    return `PAD run finished${Number.isFinite(code) ? ` with exit code ${code}` : ""}.`;
  }

  if (job.type === "openclaw_read" || job.type === "openclaw_control") {
    const lines = [];
    if (job.result?.action) lines.push(`Action: ${job.result.action}`);
    if (job.result?.mode) lines.push(`Mode: ${job.result.mode}`);
    if (job.result?.caution) lines.push(`Safety: ${job.result.caution}`);

    if (job.result?.parsed) {
      lines.push(JSON.stringify(job.result.parsed, null, 2));
    } else if (job.result?.stdout) {
      lines.push(String(job.result.stdout));
    } else {
      lines.push("No output returned.");
    }

    return lines.join("\n\n");
  }

  if (job.type === "external_brain") {
    const lines = [];
    if (job.result?.provider) lines.push(`Provider: ${job.result.provider}`);
    if (job.result?.model) lines.push(`Model: ${job.result.model}`);
    if (job.result?.tokenReduction && typeof job.result.tokenReduction === "object") {
      const reduction = job.result.tokenReduction;
      const before = Number(reduction.beforePromptTokens || 0);
      const after = Number(reduction.afterPromptTokens || 0);
      const profile = String(reduction.profile || "balanced");
      const schemaMode = String(reduction.schemaMode || "");
      const compacted = Boolean(reduction.compacted);
      const summary = [
        `profile=${profile}`,
        schemaMode ? `schema=${schemaMode}` : "",
        before > 0 ? `prompt=${after}/${before}` : "",
        compacted ? "compacted=true" : ""
      ].filter(Boolean).join(", ");
      if (summary) {
        lines.push(`Token reduction: ${summary}`);
      }
    }
    if (job.result?.reply) lines.push(String(job.result.reply));
    if (!job.result?.reply && job.result?.raw) {
      lines.push(JSON.stringify(job.result.raw, null, 2));
    }
    return lines.join("\n\n") || "External provider finished with no reply.";
  }

  if (job.type === "notebooklm_ask") {
    const lines = [];
    if (job.result?.accountUsed) {
      lines.push(`Account: ${job.result.accountUsed}`);
    }
    if (job.result?.provider) {
      lines.push(`Provider: ${job.result.provider}${job.result?.model ? ` (${job.result.model})` : ""}`);
    }
    if (job.result?.noteId) {
      lines.push(`Saved note: ${job.result.noteId}`);
    }
    if (Array.isArray(job.result?.warnings) && job.result.warnings.length > 0) {
      lines.push(`Warnings:\n${job.result.warnings.map((w) => `- ${w}`).join("\n")}`);
    }
    if (job.result?.reply) {
      lines.push(String(job.result.reply));
    }
    return lines.join("\n\n") || "NotebookLM ask finished with no reply.";
  }

  return JSON.stringify(job.result || {}, null, 2);
}

function trackJob(jobId, handlers = {}) {
  const started = Date.now();
  const timeoutMs = 10 * 60 * 1000;

  async function tick() {
    try {
      const job = await getJob(jobId);
      if (handlers.onUpdate) {
        handlers.onUpdate(job);
      }

      if (job.status === "completed") {
        if (handlers.onCompleted) {
          handlers.onCompleted(job);
        }
        return;
      }

      if (job.status === "failed") {
        if (handlers.onFailed) {
          handlers.onFailed(job);
        }
        return;
      }

      if (Date.now() - started > timeoutMs) {
        if (handlers.onFailed) {
          handlers.onFailed({
            status: "failed",
            error: "Timed out while waiting for job completion."
          });
        }
        return;
      }

      setTimeout(tick, 800);
    } catch (error) {
      if (handlers.onFailed) {
        handlers.onFailed({
          status: "failed",
          error: error.message
        });
      }
    }
  }

  setTimeout(tick, 500);
}

function setChatImageStatus() {
  if (!chatImageStatus) return;

  const files = Array.from(chatImages?.files || []);
  if (files.length === 0) {
    chatImageStatus.textContent = "No images selected.";
    return;
  }

  chatImageStatus.textContent = `${files.length} image(s): ${files.map((file) => file.name).join(", ")}`;
}

function setChatFileStatus() {
  if (!chatFileStatus) return;

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

async function uploadSelectedImages() {
  const files = Array.from(chatImages?.files || []);
  if (files.length === 0) {
    return [];
  }

  const uploadedPaths = [];
  for (const file of files.slice(0, 6)) {
    const dataUrl = await fileToDataUrl(file);
    const response = await apiPost("/api/uploads/image", {
      fileName: file.name,
      dataUrl
    });
    if (response.image?.path) {
      uploadedPaths.push(response.image.path);
    }
  }

  return uploadedPaths;
}

async function uploadSelectedFiles() {
  const files = Array.from(chatFiles?.files || []);
  if (files.length === 0) {
    return [];
  }

  const uploadedPaths = [];
  const maxBytes = 5 * 1024 * 1024;
  for (const file of files.slice(0, 6)) {
    if (Number(file.size || 0) > maxBytes) {
      logEvent(`Skipped ${file.name}: too large (${Math.ceil(file.size / 1024)} KB).`);
      continue;
    }
    const dataUrl = await fileToDataUrl(file);
    const response = await apiPost("/api/uploads/file", {
      fileName: file.name,
      dataUrl
    });
    if (response.file?.path) {
      uploadedPaths.push(response.file.path);
    }
  }

  return uploadedPaths;
}

function mergeHealthSnapshot(previous = {}, incoming = {}) {
  const base = previous && typeof previous === "object" ? previous : {};
  const next = incoming && typeof incoming === "object" ? incoming : {};
  return {
    ...base,
    ...next,
    queue: { ...(base.queue || {}), ...(next.queue || {}) },
    settings: { ...(base.settings || {}), ...(next.settings || {}) },
    brainLeader: { ...(base.brainLeader || {}), ...(next.brainLeader || {}) },
    networkPolicy: { ...(base.networkPolicy || {}), ...(next.networkPolicy || {}) },
    mqtt: { ...(base.mqtt || {}), ...(next.mqtt || {}) },
    systemSupervisor: { ...(base.systemSupervisor || {}), ...(next.systemSupervisor || {}) },
    uiControl: {
      ...(base.uiControl || {}),
      ...(next.uiControl || {}),
      paths: { ...(base.uiControl?.paths || {}), ...(next.uiControl?.paths || {}) },
      tracked: { ...(base.uiControl?.tracked || {}), ...(next.uiControl?.tracked || {}) }
    },
    taskLedger: { ...(base.taskLedger || {}), ...(next.taskLedger || {}) },
    providers: { ...(base.providers || {}), ...(next.providers || {}) },
    vault: { ...(base.vault || {}), ...(next.vault || {}) },
    guardian: { ...(base.guardian || {}), ...(next.guardian || {}) },
    voice: { ...(base.voice || {}), ...(next.voice || {}) },
    memory: { ...(base.memory || {}), ...(next.memory || {}) },
    approvals: { ...(base.approvals || {}), ...(next.approvals || {}) },
    externalObservedPrune: { ...(base.externalObservedPrune || {}), ...(next.externalObservedPrune || {}) },
    agentColony: { ...(base.agentColony || {}), ...(next.agentColony || {}) }
  };
}

async function refreshHealth(options = {}) {
  if (healthRefreshInFlight && !options.force) {
    return latestHealthSnapshot;
  }
  healthRefreshInFlight = true;
  const fast = Boolean(options.fast);
  const endpoint = fast ? "/api/health/fast" : "/api/health";
  try {
    const incoming = await request(endpoint, { timeoutMs: fast ? 3000 : 6000 });
    const data = mergeHealthSnapshot(latestHealthSnapshot, incoming);
    latestHealthSnapshot = data;
    const toolPaths = data.toolPaths || {};
    const codex = toolPaths.codexPath ? "Codex ready" : "Codex missing";
    const chrome = toolPaths.chromePath ? "Chrome ready" : "Chrome missing";
    const pad = toolPaths.padConsolePath ? "PAD ready" : "PAD missing";
    const openclaw = !toolPaths.openclawPath
      ? "OpenClaw missing"
      : openclawMode === "disabled"
        ? "OpenClaw disabled"
        : "OpenClaw ready";
    const externalProviders = Array.isArray(data.providers?.external) ? data.providers.external : [];
    const externalConfigured = externalProviders.filter((provider) => provider?.configured && provider?.enabled).length;
    const external = `ExtBrains:${externalConfigured}`;
    const sttRuntime = getSpeechToTextRuntimeSnapshot(data);
    const stt = sttRuntime.available ? `STT:${sttRuntime.shortLabel}` : "STT:missing";
    const queue = data.queue ? `Q:${data.queue.queued} R:${data.queue.running}` : "Q:0 R:0";
    const memory = data.memory ? `M:${data.memory.totalTurns}` : "M:0";
    const tasks = data.taskLedger ? `T:${data.taskLedger.openTasks || 0}/${data.taskLedger.totalTasks || 0}` : "T:0/0";
    const approvals = data.approvals ? `P:${data.approvals.persistentPrefixes}` : "P:0";
    const vault = data.vault ? `V:${data.vault.entriesCount}` : "V:0";
    const guardian = data.guardian
      ? `G:${data.guardian.mode}/${data.guardian.riskThreshold}/A${data.guardian.alertsEnabled ? "1" : "0"}`
      : "G:n/a";
    const systemSupervisor = data.systemSupervisor || {};
    const systemSupervisorSnapshot = systemSupervisor && typeof systemSupervisor.latestSnapshot === "object"
      ? systemSupervisor.latestSnapshot
      : {};
    const formatSupervisorMetric = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return "?";
      }
      return String(Math.round(numeric * 10) / 10).replace(/\.0$/, "");
    };
    const supervisor = systemSupervisor.running
      ? `SV:M${formatSupervisorMetric(systemSupervisorSnapshot.memoryUsedPct)} C${formatSupervisorMetric(systemSupervisorSnapshot.cpuPct)} G${formatSupervisorMetric(systemSupervisorSnapshot.gpuPct)}${systemSupervisor.inAlert ? "!" : ""}`
      : (toolPaths.nvidiaSmiPath ? "SV:gpu-ready" : "SV:off");
    const brainLeader = data.brainLeader || {};
    const brain = String(brainLeader?.status || "").trim().toLowerCase() === "selected"
      ? `BL:${String(brainLeader?.selectedProvider || "ready").trim()}`
      : `BL:${String(brainLeader?.status || "idle").trim() || "idle"}`;
    const settings = data.settings || {};
    await updateStartupBootstrapFromHealth(data);
    applySettingsUi(settings);
    applyExternalObservedPruneRuntimeSnapshot(data.externalObservedPrune || {});
    renderAgentColony(data);
    if (!fast && uiExperienceMode !== "simple") {
      await refreshSuperCoderCockpit({ silent: true });
    }
    applyPhoneRuntimeAlertBadge(data);
    syncQuickRuntimeFromRenderedCards();
    if (!fast && uiExperienceMode !== "simple") {
      await refreshAdminTerminalCockpit({ silent: true });
    }
    if (!fast && uiExperienceMode === "advanced") {
      await refreshSuperAdminTerminals();
    }
    if (!voiceAvatarDirty) {
      const voiceTools = data?.voice?.tools?.available || {};
      const runtimeSummary = [
        `Voice ${voiceEnabled ? "on" : "off"}`,
        `Avatar ${avatarEnabled ? avatarMode : "off"}`,
        `Out ${voiceOutputMode}`
      ];
      if (voiceAutoSpeakReplies) {
        runtimeSummary.push("Auto speak on");
      }
      runtimeSummary.push(sttRuntime.available ? `STT ${sttRuntime.modeLabel}` : "STT missing");
      if (voiceOutputMode === "kitty_tts") {
        runtimeSummary.push(voiceTools.kittyTts ? "Kitty ready" : "Kitty missing");
      }
      const statusLevel = (voiceOutputMode === "kitty_tts" && !voiceTools.kittyTts) || !sttRuntime.available
        ? "error"
        : "";
      setVoiceAvatarStatus(runtimeSummary.join(" | "), statusLevel);
    }
    healthBadge.textContent = `${brain} | ${codex} | ${openclaw} | ${external} | ${stt} | ${chrome} | ${pad} | ${supervisor} | Stealth:${stealthMode ? "ON" : "OFF"} | A:${approvalMode} | C:${costMode} | WS:${codexWebSearch ? "ON" : "OFF"} | O:${openclawMode} | ${guardian} | W:${memoryWindowTurns} | ${queue} | ${memory} | ${tasks} | ${approvals} | ${vault}`;
  } catch (error) {
    const fallback = latestHealthSnapshot;
    renderAgentColony(fallback);
    applyPhoneRuntimeAlertBadge(fallback);
    syncQuickRuntimeFromRenderedCards();
    if (uiExperienceMode === "advanced") {
      setSuperAdminConsoleStatus("Terminal feeds unavailable while health check is down.", "error");
    }
    await updateStartupBootstrapFromHealth(fallback || null);
    healthBadge.textContent = fallback
      ? `Health refresh delayed: ${error.message}`
      : "Health check unavailable";
  } finally {
    healthRefreshInFlight = false;
  }
}

function formatLocalTimestamp(value) {
  const ms = Date.parse(String(value || ""));
  if (!Number.isFinite(ms)) {
    return "n/a";
  }
  return new Date(ms).toLocaleString();
}

function formatAgeFromSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) {
    return "n/a";
  }
  if (value < 60) {
    return `${Math.round(value)}s`;
  }
  if (value < 3600) {
    return `${Math.max(1, Math.round(value / 60))}m`;
  }
  if (value < 86400) {
    return `${Math.max(1, Math.round(value / 3600))}h`;
  }
  return `${Math.max(1, Math.round(value / 86400))}d`;
}

function setPhoneRuntimeAlertBadge(level, text) {
  if (!phoneRuntimeAlertBadge) {
    return;
  }
  const normalized = String(level || "").trim().toLowerCase();
  const safeLevel = normalized === "ok" || normalized === "warn" || normalized === "alert"
    ? normalized
    : "unknown";
  phoneRuntimeAlertBadge.classList.remove("is-ok", "is-warn", "is-alert", "is-unknown");
  phoneRuntimeAlertBadge.classList.add(`is-${safeLevel}`);
  phoneRuntimeAlertBadge.textContent = String(text || "Phone Agent Health: checking...");
}

function evaluatePhoneRuntimeAlert(healthData) {
  if (!healthData || typeof healthData !== "object") {
    return {
      level: "unknown",
      text: "Phone Agent Health: unavailable"
    };
  }

  const thresholdSeconds = PHONE_RUNTIME_ALERT_THRESHOLD_SECONDS;
  const thresholdLabel = formatAgeFromSeconds(thresholdSeconds);
  const colonyAgents = Array.isArray(healthData?.agentColony?.agents) ? healthData.agentColony.agents : [];
  const phoneLane = colonyAgents.find((agent) => {
    const id = String(agent?.id || "").trim().toLowerCase();
    return id === "falcon";
  }) || null;
  const keeper = healthData?.networkPolicy?.phoneBridgeKeeper;

  const issues = [];

  if (!phoneLane) {
    issues.push("Falcon missing");
  } else {
    const laneRunning = Boolean(phoneLane.running);
    const laneState = String(phoneLane.state || "").trim().toLowerCase();
    const laneSeenSecondsRaw = Number(phoneLane.lastSeenSeconds);
    const laneSeenSeconds = Number.isFinite(laneSeenSecondsRaw) ? laneSeenSecondsRaw : null;
    const lanePastThreshold = laneSeenSeconds === null || laneSeenSeconds >= thresholdSeconds;
    if ((!laneRunning || laneState === "offline") && lanePastThreshold) {
      issues.push(`Falcon offline ${laneSeenSeconds === null ? "n/a" : formatAgeFromSeconds(laneSeenSeconds)}`);
    }
  }

  if (!keeper || typeof keeper !== "object") {
    issues.push("Keeper missing");
  } else {
    const keeperRunning = Boolean(keeper.running);
    const keeperSeenRaw = Number(keeper.latestLogStaleSeconds);
    const keeperSeenSeconds = Number.isFinite(keeperSeenRaw) ? keeperSeenRaw : null;
    const keeperPastThreshold = keeperSeenSeconds === null || keeperSeenSeconds >= thresholdSeconds;
    if (!keeperRunning && keeperPastThreshold) {
      issues.push(`Keeper offline ${keeperSeenSeconds === null ? "n/a" : formatAgeFromSeconds(keeperSeenSeconds)}`);
    }
  }

  if (issues.length > 0) {
    return {
      level: "alert",
      text: `Phone Agent Alert (${thresholdLabel}+): ${issues.join(" | ")}`
    };
  }

  const monitor = healthData?.networkPolicy?.phoneTunnelMonitor;
  if (monitor && typeof monitor === "object" && monitor.running === false) {
    return {
      level: "warn",
      text: "Phone Agent Health: tunnel monitor offline"
    };
  }

  return {
    level: "ok",
    text: "Phone Agent Health: OK"
  };
}

function applyPhoneRuntimeAlertBadge(healthData) {
  const snapshot = evaluatePhoneRuntimeAlert(healthData);
  setPhoneRuntimeAlertBadge(snapshot.level, snapshot.text);
}

function normalizeAgentCardRows(agents = [], order = AGENT_DASHBOARD_ORDER) {
  const rows = [];
  const byId = Object.create(null);
  for (const raw of Array.isArray(agents) ? agents : []) {
    const id = String(raw?.id || "").trim().toLowerCase();
    if (!id) continue;
    byId[id] = raw;
  }
  const ordered = Array.isArray(order) ? order : [];
  for (const id of ordered) {
    rows.push(byId[id] || { id });
    delete byId[id];
  }
  for (const id of Object.keys(byId)) {
    rows.push(byId[id]);
  }
  return rows;
}

function buildAgentExecutionLabel(row = {}) {
  const execution = row && typeof row.execution === "object" ? row.execution : {};
  const label = String(execution.label || "").trim();
  if (label) {
    return label;
  }
  const order = Array.isArray(execution.providerOrder) ? execution.providerOrder : [];
  if (order.length > 0) {
    return order
      .slice(0, 3)
      .map((providerId) => formatBrainProviderName(providerId))
      .join(" > ");
  }
  const runner = String(execution.runner || "").trim().toLowerCase();
  if (runner === "asolaria_brain") {
    return "Asolaria Brain";
  }
  if (runner === "codex_cli") {
    return "Codex CLI";
  }
  return "";
}

function buildAgentLastExecutionLabel(row = {}) {
  const lastExecution = row && typeof row.lastExecution === "object" ? row.lastExecution : {};
  const provider = String(lastExecution.provider || "").trim().toLowerCase();
  const model = String(lastExecution.model || "").trim();
  if (!provider && !model) {
    return "";
  }
  const providerLabel = provider ? formatBrainProviderName(provider, model) : model;
  return providerLabel ? `last ${providerLabel}` : "";
}

function buildAgentTile(row, fallbackMeta = AGENT_FALLBACK_META) {
  const id = String(row?.id || "").trim().toLowerCase();
  if (!id) {
    return null;
  }
  const fallback = fallbackMeta[id] || { name: id, role: "Agent", icon: String(id || "?").slice(0, 1).toUpperCase() };
  const name = String(row?.name || fallback.name || id).trim() || id;
  const role = String(row?.role || fallback.role || "Agent").trim() || "Agent";
  const icon = String(row?.icon || fallback.icon || name.slice(0, 1) || "?").toUpperCase().slice(0, 2);
  const plane = String(row?.plane || "").trim().toLowerCase();
  const running = Boolean(row?.running);
  const rawState = String(row?.state || (running ? "active" : "offline")).trim().toLowerCase();
  const state = rawState === "active" || rawState === "idle" ? rawState : "offline";
  const pid = Number(row?.pid || 0);
  const rawLastSeenSeconds = row?.lastSeenSeconds;
  const lastSeenSeconds = rawLastSeenSeconds === null || rawLastSeenSeconds === undefined || rawLastSeenSeconds === ""
    ? null
    : Number(rawLastSeenSeconds);
  const seenLabel = Number.isFinite(lastSeenSeconds) ? formatAgeFromSeconds(lastSeenSeconds) : "n/a";
  const executionLabel = buildAgentExecutionLabel(row);
  const lastExecutionLabel = buildAgentLastExecutionLabel(row);

  const tile = document.createElement("article");
  tile.className = `agent-tile is-${state}`;
  tile.setAttribute("data-agent-id", id);
  tile.setAttribute("data-agent-plane", plane || "relay");
  tile.title = [
    `${name} | ${role}`,
    `plane=${plane || "relay"}`,
    `pid=${Number.isFinite(pid) && pid > 0 ? pid : "n/a"}`,
    `seen=${seenLabel}`,
    executionLabel ? `exec=${executionLabel}` : "",
    lastExecutionLabel
  ].filter(Boolean).join(" | ");

  const iconWrap = document.createElement("div");
  iconWrap.className = "agent-icon";
  iconWrap.textContent = icon;

  const indicator = document.createElement("span");
  indicator.className = `agent-indicator is-${state}`;
  indicator.setAttribute("aria-hidden", "true");
  iconWrap.appendChild(indicator);

  const copy = document.createElement("div");
  copy.className = "agent-copy";

  const title = document.createElement("div");
  title.className = "agent-name";
  title.textContent = name;

  const meta = document.createElement("div");
  meta.className = "agent-meta";
  meta.textContent = plane === "admin_terminal"
    ? [role, "Admin Plane", executionLabel].filter(Boolean).join(" • ")
    : [role, executionLabel].filter(Boolean).join(" • ");

  const status = document.createElement("div");
  status.className = "agent-state";
  status.textContent = [state.toUpperCase(), `seen ${seenLabel}`, lastExecutionLabel].filter(Boolean).join(" | ");

  copy.appendChild(title);
  copy.appendChild(meta);
  copy.appendChild(status);
  tile.appendChild(iconWrap);
  tile.appendChild(copy);
  return tile;
}

function normalizePhoneRuntimeRows(healthData, colonyRows = []) {
  const byId = Object.create(null);

  function addRow(raw) {
    const id = String(raw?.id || "").trim().toLowerCase();
    if (!id) {
      return;
    }
    byId[id] = raw;
  }

  for (const row of Array.isArray(colonyRows) ? colonyRows : []) {
    const id = String(row?.id || "").trim().toLowerCase();
    const role = String(row?.role || "").trim().toLowerCase();
    const profile = String(row?.profile || "").trim().toLowerCase();
    if (!id) {
      continue;
    }
    if (id.includes("phone") || role.includes("phone") || role.includes("mobile") || profile.includes("mobile")) {
      addRow(row);
    }
  }

  const keeper = healthData?.networkPolicy?.phoneBridgeKeeper;
  if (keeper && typeof keeper === "object") {
    const keeperSeenSeconds = Number(keeper.latestLogStaleSeconds);
    addRow({
      id: "phone-link-keeper",
      name: "Phone Link Keeper",
      role: "USB/Wi-Fi Keeper",
      icon: "LK",
      profile: "phone-link-keeper",
      running: Boolean(keeper.running),
      state: keeper.running ? "active" : "offline",
      pid: Number(keeper.pid || 0),
      lastSeenSeconds: Number.isFinite(keeperSeenSeconds) ? keeperSeenSeconds : null,
      lastSeenAt: String(keeper.latestLogUpdatedAt || "")
    });
  }

  const monitor = healthData?.networkPolicy?.phoneTunnelMonitor;
  if (monitor && typeof monitor === "object") {
    const monitorSeenSeconds = Number(monitor.latestLogStaleSeconds);
    const reportPass = monitor.latestReportPass;
    const running = Boolean(monitor.running);
    const state = running
      ? (reportPass === false ? "idle" : "active")
      : "offline";
    addRow({
      id: "phone-tunnel-monitor",
      name: "Phone Tunnel Monitor",
      role: "Tunnel Failover",
      icon: "TM",
      profile: "phone-tunnel-monitor",
      running,
      state,
      pid: Number(monitor.pid || 0),
      lastSeenSeconds: Number.isFinite(monitorSeenSeconds) ? monitorSeenSeconds : null,
      lastSeenAt: String(monitor.latestLogUpdatedAt || "")
    });
  }

  return normalizeAgentCardRows(Object.values(byId), PHONE_AGENT_DASHBOARD_ORDER);
}

function renderPhoneAgentRuntime(healthData, colony = {}, colonyRows = []) {
  if (!phoneAgentRuntimeCard || !phoneAgentGrid || !phoneAgentSummary || !phoneAgentUpdatedAt) {
    return;
  }
  const rows = normalizePhoneRuntimeRows(healthData, colonyRows);
  phoneAgentGrid.innerHTML = "";
  for (const row of rows) {
    const tile = buildAgentTile(row, PHONE_AGENT_FALLBACK_META);
    if (tile) {
      phoneAgentGrid.appendChild(tile);
    }
  }

  const totalCount = rows.length;
  const runningCount = rows.filter((row) => Boolean(row?.running)).length;
  const activeCount = rows.filter((row) => String(row?.state || "").trim().toLowerCase() === "active").length;
  const keeperRunning = Boolean(healthData?.networkPolicy?.phoneBridgeKeeper?.running);
  const tunnelMonitorRunning = Boolean(healthData?.networkPolicy?.phoneTunnelMonitor?.running);
  if (totalCount < 1) {
    phoneAgentSummary.textContent = "No phone runtime agents detected yet.";
  } else {
    phoneAgentSummary.textContent = `Active ${activeCount}/${totalCount} | Running ${runningCount}/${totalCount} | Keeper:${keeperRunning ? "ON" : "OFF"} | TunnelMon:${tunnelMonitorRunning ? "ON" : "OFF"}`;
  }
  const updatedAt = String(
    colony?.updatedAt
    || healthData?.networkPolicy?.phoneTunnelMonitor?.latestLogUpdatedAt
    || healthData?.networkPolicy?.phoneBridgeKeeper?.latestLogUpdatedAt
    || ""
  ).trim();
  phoneAgentUpdatedAt.textContent = `Updated: ${formatLocalTimestamp(updatedAt || new Date().toISOString())}`;
}

function setSuperCoderCockpitStatus(text = "", level = "") {
  if (!superCoderStatus) {
    return;
  }
  superCoderStatus.textContent = String(text || "").trim() || "Standby";
  superCoderStatus.classList.remove("is-live", "is-error", "is-warn");
  if (level === "live") {
    superCoderStatus.classList.add("is-live");
  } else if (level === "warn") {
    superCoderStatus.classList.add("is-warn");
  } else if (level === "error") {
    superCoderStatus.classList.add("is-error");
  }
}

function buildSuperCoderSystemCard(system = {}) {
  const article = document.createElement("article");
  const status = String(system?.status || "offline").trim().toLowerCase() || "offline";
  article.className = `super-coder-system is-${status}`;

  const head = document.createElement("div");
  head.className = "super-coder-system-head";

  const icon = document.createElement("span");
  icon.className = "super-coder-icon";
  icon.textContent = String(system?.icon || system?.label || "?").trim().slice(0, 3) || "?";

  const copy = document.createElement("div");
  const label = document.createElement("strong");
  label.textContent = String(system?.label || "System").trim() || "System";
  const statusText = document.createElement("div");
  statusText.className = "super-coder-system-status";
  statusText.textContent = status.toUpperCase();
  copy.append(label, statusText);

  const detail = document.createElement("div");
  detail.className = "super-coder-system-detail";
  detail.textContent = String(system?.detail || "").trim() || "No live detail yet.";

  head.append(icon, copy);
  article.append(head, detail);
  return article;
}

function renderSuperCoderCockpit(snapshot) {
  const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
  const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
  const systems = Array.isArray(payload?.systems) ? payload.systems : [];
  const blockers = Array.isArray(payload?.blockers) ? payload.blockers : [];
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  superCoderLastSnapshot = payload;

  if (superCoderGrid) {
    superCoderGrid.innerHTML = "";
    if (systems.length < 1) {
      const empty = document.createElement("div");
      empty.className = "admin-terminal-cockpit-empty";
      empty.textContent = "No super-coder systems reported yet.";
      superCoderGrid.appendChild(empty);
    } else {
      for (const system of systems) {
        superCoderGrid.appendChild(buildSuperCoderSystemCard(system));
      }
    }
  }

  if (superCoderSummary) {
    const readiness = String(payload?.readiness || summary.status || "standby").trim().toUpperCase();
    superCoderSummary.textContent = `${readiness} | Systems ${Number(summary.connectedSystems || 0)}/${Math.max(Number(summary.totalSystems || 0), systems.length)} | Colony ${Number(summary.colonyActive || 0)}/${Math.max(Number(summary.colonyOnline || 0), 0)} active | Admin ${Number(summary.adminOnline || 0)} online | World ${Number(summary.worldTowers || 0)} towers / ${Number(summary.worldRoutes || 0)} routes`;
  }

  if (superCoderNotes) {
    superCoderNotes.innerHTML = "";
    const noteLines = [];
    blockers.forEach((line) => noteLines.push({ level: "blocker", text: line }));
    warnings.forEach((line) => noteLines.push({ level: "warning", text: line }));
    if (noteLines.length < 1) {
      noteLines.push({
        level: "ok",
        text: "Critical lanes are aligned. Codex, cloud workers, connector towers, and the world projection are ready."
      });
    }
    for (const note of noteLines.slice(0, 5)) {
      const row = document.createElement("div");
      row.className = `super-coder-note is-${note.level}`;
      row.textContent = String(note.text || "").trim();
      superCoderNotes.appendChild(row);
    }
  }

  if (superCoderUpdatedAt) {
    superCoderUpdatedAt.textContent = `Updated: ${formatLocalTimestamp(payload?.generatedAt || new Date().toISOString())}`;
  }

  const readiness = String(payload?.readiness || summary.status || "").trim().toLowerCase();
  if (readiness === "ready") {
    setSuperCoderCockpitStatus("READY", "live");
  } else if (readiness === "warning") {
    setSuperCoderCockpitStatus("WARNING", "warn");
  } else if (readiness === "blocked") {
    setSuperCoderCockpitStatus("BLOCKED", "error");
  } else {
    setSuperCoderCockpitStatus("Standby");
  }
}

async function refreshSuperCoderCockpit(options = {}) {
  if (!superCoderCard || (superCoderRefreshInFlight && !options.force)) {
    return superCoderLastSnapshot;
  }
  superCoderRefreshInFlight = true;
  const silent = Boolean(options.silent);
  if (!silent) {
    setSuperCoderCockpitStatus("Syncing...", "live");
  }
  try {
    const data = await request("/api/worker-runtime/super-coder", {
      timeoutMs: options.timeoutMs || 12000
    });
    renderSuperCoderCockpit(data);
    if (!silent) {
      const readiness = String(data?.readiness || data?.summary?.status || "").trim().toLowerCase();
      if (readiness === "warning") {
        setSuperCoderCockpitStatus("WARNING", "warn");
      } else if (readiness === "blocked") {
        setSuperCoderCockpitStatus("BLOCKED", "error");
      } else {
        setSuperCoderCockpitStatus("READY", "live");
      }
    }
    return data;
  } catch (error) {
    if (!silent) {
      setSuperCoderCockpitStatus(`Unavailable: ${error.message}`, "error");
    }
    return superCoderLastSnapshot;
  } finally {
    superCoderRefreshInFlight = false;
  }
}

function renderAgentColony(healthData) {
  const colony = healthData && typeof healthData === "object" && healthData.agentColony && typeof healthData.agentColony === "object"
    ? healthData.agentColony
    : {};
  const rows = normalizeAgentCardRows(colony.agents);

  if (colonyGrid && colonySummary && colonyUpdatedAt && colonyDashboardCard) {
    colonyGrid.innerHTML = "";
    for (const row of rows) {
      const tile = buildAgentTile(row, AGENT_FALLBACK_META);
      if (tile) {
        colonyGrid.appendChild(tile);
      }
    }

    const counts = colony && typeof colony.counts === "object" ? colony.counts : {};
    const activeCount = Number.isFinite(Number(counts.active))
      ? Number(counts.active)
      : rows.filter((row) => String(row?.state || "").toLowerCase() === "active").length;
    const totalCount = Number.isFinite(Number(counts.total))
      ? Number(counts.total)
      : rows.length;
    const queueRunning = Number(healthData?.queue?.running || 0);
    const queueQueued = Number(healthData?.queue?.queued || 0);
    const relayOnline = Boolean(colony?.relay?.running);
    const tunnelOnline = Boolean(colony?.tunnel?.running);
    const updatedAt = String(colony?.updatedAt || "").trim();
    const adminTotal = Number(colony?.adminTerminals?.total || counts.adminTotal || 0);
    const adminActive = Number(colony?.adminTerminals?.active || counts.adminActive || 0);
    const adminSummary = adminTotal > 0 ? ` | Admin ${adminActive}/${adminTotal}` : "";
    colonySummary.textContent = `Active ${activeCount}/${Math.max(totalCount, 0)}${adminSummary} | Queue R:${queueRunning} Q:${queueQueued} | Relay:${relayOnline ? "ON" : "OFF"} | Tunnel:${tunnelOnline ? "ON" : "OFF"}`;
    colonyUpdatedAt.textContent = `Updated: ${formatLocalTimestamp(updatedAt || new Date().toISOString())}`;
  }

  renderPhoneAgentRuntime(healthData, colony, rows);
  syncQuickRuntimeFromRenderedCards();
}

function setAdminTerminalCockpitStatus(text = "", level = "") {
  if (!adminTerminalCockpitStatus) {
    return;
  }
  adminTerminalCockpitStatus.textContent = String(text || "").trim() || "Standby";
  adminTerminalCockpitStatus.classList.remove("is-live", "is-error");
  if (level === "live") {
    adminTerminalCockpitStatus.classList.add("is-live");
  } else if (level === "error") {
    adminTerminalCockpitStatus.classList.add("is-error");
  }
}

function loadAdminTerminalAutoEnsurePreference() {
  let enabled = true;
  try {
    const raw = localStorage.getItem(ADMIN_TERMINAL_AUTOENSURE_STORAGE_KEY);
    if (raw === "false") {
      enabled = false;
    }
  } catch {}
  if (adminTerminalCockpitAutoEnsure) {
    adminTerminalCockpitAutoEnsure.checked = enabled;
  }
}

function persistAdminTerminalAutoEnsurePreference() {
  if (!adminTerminalCockpitAutoEnsure) {
    return;
  }
  try {
    localStorage.setItem(
      ADMIN_TERMINAL_AUTOENSURE_STORAGE_KEY,
      adminTerminalCockpitAutoEnsure.checked ? "true" : "false"
    );
  } catch {}
}

function stripAdminTerminalEscapeSequences(value) {
  return String(value || "")
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-Z\\-_]/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function normalizeAdminTerminalOutputText(value) {
  return stripAdminTerminalEscapeSequences(value)
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildAdminTerminalPanel(terminal = {}) {
  const id = String(terminal?.id || "").trim().toLowerCase();
  const name = String(terminal?.name || id || "Admin Terminal").trim() || "Admin Terminal";
  const role = String(terminal?.role || "Admin Terminal").trim() || "Admin Terminal";
  const state = String(terminal?.state || "offline").trim().toLowerCase();
  const mission = terminal?.mission && typeof terminal.mission === "object" ? terminal.mission : {};
  const bootstrap = terminal?.bootstrap && typeof terminal.bootstrap === "object" ? terminal.bootstrap : {};
  const cockpit = terminal?.cockpit && typeof terminal.cockpit === "object" ? terminal.cockpit : {};

  const article = document.createElement("article");
  article.className = `admin-terminal-panel is-${state}`;
  article.setAttribute("data-terminal-id", id);

  const head = document.createElement("div");
  head.className = "admin-terminal-panel-head";

  const headingCopy = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = name;
  const subtitle = document.createElement("p");
  subtitle.textContent = `${role} | ${String(mission.title || "Mission pending").trim()}`;
  headingCopy.append(title, subtitle);

  const statePill = document.createElement("span");
  statePill.className = `admin-terminal-panel-state is-${state}`;
  statePill.textContent = state.toUpperCase();
  head.append(headingCopy, statePill);

  const meta = document.createElement("div");
  meta.className = "admin-terminal-panel-meta";
  const seen = document.createElement("span");
  const lastSeenSeconds = terminal?.lastSeenSeconds;
  seen.textContent = `Seen ${lastSeenSeconds === null || lastSeenSeconds === undefined ? "n/a" : formatAgeFromSeconds(lastSeenSeconds)}`;
  const packet = document.createElement("span");
  packet.textContent = `Packet: ${String(terminal?.files?.activeTaskPacketPath || "n/a").split(/[\\/]/).slice(-1)[0] || "n/a"}`;
  const boot = document.createElement("span");
  boot.textContent = bootstrap?.sentAt
    ? `Briefed ${formatLocalTimestamp(bootstrap.sentAt)}`
    : "Briefing pending";
  meta.append(seen, packet, boot);

  const missionLine = document.createElement("p");
  missionLine.className = "admin-terminal-panel-mission";
  missionLine.textContent = String(mission?.nextMove || "Awaiting mission briefing.").trim() || "Awaiting mission briefing.";

  const controls = document.createElement("div");
  controls.className = "admin-terminal-panel-controls";
  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "quick-secondary-btn";
  startBtn.dataset.adminTerminalAction = "ensure";
  startBtn.dataset.terminalId = id;
  startBtn.textContent = terminal?.running ? "Ensure Running" : "Start";
  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.className = "quick-secondary-btn";
  stopBtn.dataset.adminTerminalAction = "stop";
  stopBtn.dataset.terminalId = id;
  stopBtn.textContent = "Stop";
  stopBtn.disabled = !Boolean(terminal?.running);
  const rebriefBtn = document.createElement("button");
  rebriefBtn.type = "button";
  rebriefBtn.className = "quick-secondary-btn";
  rebriefBtn.dataset.adminTerminalAction = "rebrief";
  rebriefBtn.dataset.terminalId = id;
  rebriefBtn.textContent = "Re-brief";
  controls.append(startBtn, stopBtn, rebriefBtn);

  const output = document.createElement("pre");
  output.className = "admin-terminal-panel-output";
  output.textContent = normalizeAdminTerminalOutputText(cockpit?.transcriptTail || "")
    || "No transcript output yet. Launch the sidecar to start the live admin terminal.";
  window.setTimeout(() => {
    output.scrollTop = output.scrollHeight;
  }, 0);

  const form = document.createElement("form");
  form.className = "admin-terminal-panel-prompt-form";
  form.dataset.adminTerminalForm = "prompt";
  form.dataset.terminalId = id;

  const textarea = document.createElement("textarea");
  textarea.className = "admin-terminal-panel-input";
  textarea.rows = 3;
  textarea.placeholder = String(cockpit?.promptPlaceholder || `Prompt ${name}...`).trim();
  textarea.setAttribute("data-terminal-input", id);

  const formActions = document.createElement("div");
  formActions.className = "admin-terminal-panel-form-actions";
  const queueInfo = document.createElement("span");
  queueInfo.className = "admin-terminal-panel-queue";
  queueInfo.textContent = `Inbox ${Number(cockpit?.pendingInboxCount || 0)}`;
  const sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.className = "quick-primary-btn";
  sendBtn.textContent = `Prompt ${name}`;
  formActions.append(queueInfo, sendBtn);

  form.append(textarea, formActions);
  article.append(head, meta, missionLine, controls, output, form);
  return article;
}

function renderAdminTerminalCockpit(snapshot) {
  const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
  const terminals = Array.isArray(payload?.terminals) ? payload.terminals : [];
  adminTerminalCockpitLastSnapshot = payload;
  if (adminTerminalCockpitStack) {
    adminTerminalCockpitStack.innerHTML = "";
    if (terminals.length < 1) {
      const empty = document.createElement("div");
      empty.className = "admin-terminal-cockpit-empty";
      empty.textContent = "No admin terminals registered yet.";
      adminTerminalCockpitStack.appendChild(empty);
    } else {
      for (const terminal of terminals) {
        adminTerminalCockpitStack.appendChild(buildAdminTerminalPanel(terminal));
      }
    }
  }
  if (adminTerminalCockpitSummary) {
    const total = terminals.length || Number(payload?.summary?.total || 0);
    const online = terminals.filter((terminal) => Boolean(terminal?.running)).length;
    const active = terminals.filter((terminal) => String(terminal?.state || "").trim().toLowerCase() === "active").length;
    adminTerminalCockpitSummary.textContent = total > 0
      ? `Stacked cockpit ready. Active ${active}/${total} | Online ${online}/${total} | Auto-launch ${adminTerminalCockpitAutoEnsure?.checked ? "on" : "off"}`
      : "No admin terminals registered yet.";
  }
  if (adminTerminalCockpitUpdatedAt) {
    adminTerminalCockpitUpdatedAt.textContent = `Updated: ${formatLocalTimestamp(payload?.generatedAt || new Date().toISOString())}`;
  }
}

async function refreshAdminTerminalCockpit(options = {}) {
  if (!adminTerminalCockpitCard || adminTerminalCockpitRefreshInFlight) {
    return adminTerminalCockpitLastSnapshot;
  }
  adminTerminalCockpitRefreshInFlight = true;
  const silent = Boolean(options.silent);
  if (!silent) {
    setAdminTerminalCockpitStatus("Syncing admin cockpit...", "live");
  }
  try {
    const data = await request("/api/admin-terminals/cockpit");
    renderAdminTerminalCockpit(data);
    if (!silent) {
      setAdminTerminalCockpitStatus("Admin cockpit live.", "live");
    }
    return data;
  } catch (error) {
    if (!silent) {
      setAdminTerminalCockpitStatus(`Admin cockpit unavailable: ${error.message}`, "error");
    }
    return adminTerminalCockpitLastSnapshot;
  } finally {
    adminTerminalCockpitRefreshInFlight = false;
  }
}

async function ensureAdminTerminalCockpit(options = {}) {
  const payload = {
    autoBootstrap: options.autoBootstrap !== false,
    forceBootstrap: Boolean(options.forceBootstrap),
    replace: Boolean(options.replace),
    source: "Asolaria Dashboard",
    reason: options.reason || "dashboard_bootstrap"
  };
  if (options.terminalId) {
    payload.terminalId = String(options.terminalId).trim().toLowerCase();
  }
  setAdminTerminalCockpitStatus("Launching admin terminals...", "live");
  const data = await apiPost("/api/admin-terminals/cockpit/ensure", payload);
  renderAdminTerminalCockpit(data?.cockpit || data);
  const resultCount = Array.isArray(data?.results) ? data.results.length : 0;
  setAdminTerminalCockpitStatus(
    resultCount > 0
      ? `Admin cockpit ensured (${resultCount} terminal${resultCount === 1 ? "" : "s"}).`
      : "Admin cockpit ensured.",
    "live"
  );
  refreshHealth();
  return data;
}

async function stopAdminTerminalCockpit(terminalId = "") {
  const payload = terminalId ? { terminalId } : {};
  setAdminTerminalCockpitStatus("Stopping admin terminal...", "live");
  const data = await apiPost("/api/admin-terminals/cockpit/stop", payload);
  renderAdminTerminalCockpit(data?.cockpit || data);
  setAdminTerminalCockpitStatus("Admin terminal stopped.", "live");
  refreshHealth();
  return data;
}

function shortHash(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "-";
  }
  return raw.length > 14 ? `${raw.slice(0, 14)}...` : raw;
}

function readGatewayAuditLimit() {
  const parsed = Number(gatewayAuditLimitInput?.value || 15);
  const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.round(parsed))) : 15;
  if (gatewayAuditLimitInput) {
    gatewayAuditLimitInput.value = String(limit);
  }
  return limit;
}

function readGatewayAuditType() {
  const value = String(gatewayAuditTypeSelect?.value || "").trim();
  return value;
}

function renderGatewayAuditEvents(events = []) {
  if (!gatewayAuditEvents) {
    return;
  }
  gatewayAuditEvents.innerHTML = "";
  if (!Array.isArray(events) || events.length < 1) {
    const row = document.createElement("div");
    row.textContent = "No audit events returned.";
    gatewayAuditEvents.appendChild(row);
    return;
  }
  for (const event of events) {
    const row = document.createElement("div");
    const at = formatLocalTimestamp(event?.at);
    const type = String(event?.type || "event");
    const actor = String(event?.actor || "unknown");
    const hash = shortHash(event?.hash);
    row.textContent = `${at} | ${type} | actor=${actor} | hash=${hash}`;
    gatewayAuditEvents.appendChild(row);
  }
}

function renderGatewayReadinessHints(actions = []) {
  if (!gatewayReadinessHints) {
    return;
  }
  gatewayReadinessHints.innerHTML = "";
  const list = Array.isArray(actions) ? actions : [];
  if (list.length < 1) {
    const row = document.createElement("div");
    row.textContent = "Readiness recommendations appear here after running a drill.";
    gatewayReadinessHints.appendChild(row);
    return;
  }
  for (const action of list) {
    const row = document.createElement("div");
    row.textContent = `- ${String(action || "")}`;
    gatewayReadinessHints.appendChild(row);
  }
}

async function refreshGatewayAuditPanel(options = {}) {
  if (!gatewayAuditStatus || !gatewayAuthorityStatus || !gatewayAuditEvents) {
    return;
  }
  const silent = Boolean(options.silent);
  const limit = readGatewayAuditLimit();
  const type = readGatewayAuditType();
  try {
    const [authorityData, statusData] = await Promise.all([
      request("/api/gateway/authority/status"),
      request("/api/gateway/audit/status")
    ]);

    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (type) {
      query.set("type", type);
    }
    const eventsData = await request(`/api/gateway/audit/events?${query.toString()}`);
    const authority = authorityData.authority || {};
    const readiness = authorityData.readiness || {};
    const audit = statusData.audit || {};
    const integrity = audit.integrity || {};
    const gateLocked = Boolean(audit.gateLocked);
    const gateReason = String(audit.gateReason || "").trim();
    const gateLabel = gateLocked ? "LOCKED" : "OPEN";
    const readinessOk = Boolean(readiness.ok);
    const readinessLabel = readinessOk ? "READY" : "BLOCKED";
    const readinessReason = Array.isArray(readiness.blockingReasons) && readiness.blockingReasons.length > 0
      ? ` (${String(readiness.blockingReasons[0] || "").slice(0, 120)})`
      : "";

    gatewayAuthorityStatus.textContent = `Authority: ${String(authority.mode || "unknown")} | Handover ${readinessLabel}${readinessReason} | Updated ${formatLocalTimestamp(authority.updatedAt)} by ${String(authority.updatedBy || "unknown")}`;
    gatewayAuditStatus.textContent = `Audit: events=${Number(audit.totalEvents || 0)} | integrity=${integrity.ok ? "OK" : "FAIL"} | gate=${gateLabel}${gateLocked && gateReason ? ` (${gateReason})` : ""} | checked=${formatLocalTimestamp(integrity.checkedAt)} | hash=${shortHash(audit.lastHash)}`;
    renderGatewayAuditEvents(eventsData.events || []);
  } catch (error) {
    gatewayAuthorityStatus.textContent = "Authority: unavailable";
    gatewayAuditStatus.textContent = `Audit unavailable: ${error.message}`;
    renderGatewayAuditEvents([]);
    if (!silent) {
      logEvent(`Gateway audit refresh failed: ${error.message}`);
    }
  }
}

async function verifyGatewayAuditChain() {
  if (!gatewayAuditStatus) {
    return;
  }
  try {
    gatewayAuditStatus.textContent = "Audit: verifying chain...";
    const data = await apiPost("/api/gateway/audit/verify", {});
    const result = data.result || {};
    const ok = Boolean(result.ok);
    gatewayAuditStatus.textContent = `Audit verify: ${ok ? "OK" : "FAIL"} | errors=${Number(result.errorCount || 0)} | checked=${formatLocalTimestamp(result.checkedAt)} | hash=${shortHash(result.lastHash)}`;
    logEvent(`Gateway audit verify ${ok ? "passed" : "failed"} (errors=${Number(result.errorCount || 0)}).`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayAuditStatus.textContent = `Audit verify failed: ${error.message}`;
    logEvent(`Gateway audit verify failed: ${error.message}`);
  }
}

async function runGatewayReadinessDrill() {
  if (!gatewayReadinessDrillOutput) {
    return;
  }
  try {
    gatewayReadinessDrillOutput.textContent = "Running readiness drill...";
    const data = await apiPost("/api/gateway/authority/readiness/drill", {
      targetMode: "asolaria_primary"
    });
    const drill = data.drill || {};
    const readiness = drill.readiness || {};
    const blockingReasons = Array.isArray(readiness.blockingReasons) ? readiness.blockingReasons : [];
    const recommended = Array.isArray(drill.recommendedActions) ? drill.recommendedActions : [];
    const fallbackHints = blockingReasons.length > 0
      ? blockingReasons.map((reason) => `Resolve: ${String(reason || "").trim()}`)
      : [];
    const hintList = recommended.length > 0 ? recommended : fallbackHints;
    const reasonText = blockingReasons.length > 0 ? ` | reason=${String(blockingReasons[0] || "").slice(0, 140)}` : "";
    gatewayReadinessDrillOutput.textContent = `Drill ${drill.ok ? "PASS" : "FAIL"} | target=${String(drill.targetMode || "asolaria_primary")} | finished=${formatLocalTimestamp(drill.finishedAt)}${reasonText}`;
    renderGatewayReadinessHints(hintList);
    logEvent(`Gateway readiness drill ${drill.ok ? "passed" : "failed"} for ${String(drill.targetMode || "asolaria_primary")}.`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayReadinessDrillOutput.textContent = `Readiness drill failed: ${error.message}`;
    renderGatewayReadinessHints([
      "Verify gateway service is running and token auth is configured.",
      "Check Gateway Audit panel status and retry the drill."
    ]);
    logEvent(`Gateway readiness drill failed: ${error.message}`);
  }
}

async function runGatewayHeartbeat() {
  if (!gatewayReadinessDrillOutput) {
    return;
  }
  try {
    gatewayReadinessDrillOutput.textContent = "Running gateway heartbeat...";
    const data = await apiPost("/api/gateway/heartbeat/run", {});
    const result = data.result || {};
    const checks = Array.isArray(result.checks) ? result.checks : [];
    const failedChecks = checks.filter((check) => !check?.ok);
    const finishedAt = result.at || data.heartbeat?.lastRunAt || "";
    gatewayReadinessDrillOutput.textContent = `Heartbeat ${result.ok ? "OK" : "DEGRADED"} | checks=${checks.length} | failed=${failedChecks.length} | finished=${formatLocalTimestamp(finishedAt)}`;
    if (result.ok) {
      renderGatewayReadinessHints(["Heartbeat acknowledged as HEARTBEAT_OK."]);
    } else if (failedChecks.length > 0) {
      renderGatewayReadinessHints(
        failedChecks.slice(0, 6).map((item) => {
          const url = String(item?.url || "unknown target");
          return `Recover dependency: ${url}`;
        })
      );
    }
    logEvent(`Gateway heartbeat run ${result.ok ? "passed" : "degraded"} (failed=${failedChecks.length}).`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayReadinessDrillOutput.textContent = `Heartbeat run failed: ${error.message}`;
    logEvent(`Gateway heartbeat run failed: ${error.message}`);
  }
}

async function startGatewaySandboxRemediation() {
  if (!gatewayReadinessDrillOutput) {
    return;
  }
  try {
    gatewayReadinessDrillOutput.textContent = "Starting sandbox manager...";
    const data = await apiPost("/api/gateway/remediation/start-sandbox", {});
    const wait = data.wait || {};
    const health = data.health || {};
    const processInfo = data.process || {};
    const statusLabel = data.alreadyRunning
      ? "already running"
      : (data.ok ? "started" : "starting");
    const finishedAt = health?.data?.time || "";
    gatewayReadinessDrillOutput.textContent = `Sandbox remediation ${statusLabel} | health=${health.ok ? "OK" : "PENDING"} | attempts=${Number(wait.attempts || 0)} | finished=${formatLocalTimestamp(finishedAt)}`;

    const hints = [];
    if (health.ok) {
      hints.push("Sandbox manager health is reachable.");
      hints.push("Run Readiness Drill to confirm handover blockers are cleared.");
    } else {
      hints.push("Sandbox startup is still pending. Wait a few seconds and run Readiness Drill again.");
    }
    if (processInfo?.lastLogFile) {
      hints.push(`Sandbox log: ${String(processInfo.lastLogFile)}`);
    }
    renderGatewayReadinessHints(hints);
    logEvent(`Sandbox remediation ${statusLabel}; process pid=${processInfo?.pid || "n/a"}.`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayReadinessDrillOutput.textContent = `Sandbox remediation failed: ${error.message}`;
    logEvent(`Sandbox remediation failed: ${error.message}`);
  }
}

async function refreshSkillsList() {
  if (!skillsSelect || !skillsOutput) {
    return;
  }

  try {
    const data = await request("/api/skills");
    const skills = Array.isArray(data.skills) ? data.skills : [];
    const codex = data.codex && typeof data.codex === "object" ? data.codex : null;
    skillsSelect.innerHTML = "";

    if (skills.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No skills loaded";
      skillsSelect.appendChild(option);
      skillsOutput.textContent = "No skills found.";
      return;
    }

    for (const skill of skills) {
      const id = String(skill.id || "");
      if (!id) continue;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${id}${skill.title ? ` - ${skill.title}` : ""}`;
      skillsSelect.appendChild(option);
    }

    const codexRisk = codex && codex.riskCounts && typeof codex.riskCounts === "object"
      ? ` Risk low/med/high/crit: ${Number(codex.riskCounts.low || 0)}/${Number(codex.riskCounts.medium || 0)}/${Number(codex.riskCounts.high || 0)}/${Number(codex.riskCounts.critical || 0)}.`
      : "";
    const codexSummary = codex
      ? ` Codex refs: ${Number(codex.total || 0)} (wrapper ${Number(codex.wrapperTotal || 0)}, executable ${Number(codex.executableTotal || 0)}, reference-only ${Number(codex.referenceOnlyTotal || 0)}, overlap ${Number(codex.overlapWithAsolariaTotal || 0)}).${codexRisk}`
      : "";
    skillsOutput.textContent = `Loaded ${skills.length} skill(s).${codexSummary}`;
  } catch (error) {
    skillsOutput.textContent = `Skills unavailable: ${error.message}`;
  }
}

async function reloadSkillsRegistry() {
  if (!skillsOutput) return;
  try {
    const data = await apiPost("/api/skills/reload", {});
    const errors = Array.isArray(data.errors) ? data.errors.length : Number(data.errors || 0);
    skillsOutput.textContent = `Reloaded skills registry: ${data.total || 0} skill(s), errors: ${errors}.`;
    refreshSkillsList();
  } catch (error) {
    skillsOutput.textContent = `Reload failed: ${error.message}`;
  }
}

async function refreshMemory() {
  if (!memoryStats || !memoryPreview) {
    return;
  }

  try {
    const params = new URLSearchParams();
    params.set("limit", "12");
    if (activeChatThreadId) {
      params.set("chatId", normalizeChatThreadId(activeChatThreadId, DEFAULT_CHAT_THREAD_ID));
    }
    const data = await request(`/api/memory?${params.toString()}`);
    const memory = data.memory || {};
    memoryStats.textContent = `Turns: ${memory.totalTurns || 0} | Updated: ${memory.updatedAt ? new Date(memory.updatedAt).toLocaleTimeString() : "n/a"}`;

    memoryPreview.innerHTML = "";
    const turns = Array.isArray(memory.turns) ? memory.turns.slice().reverse() : [];
    if (turns.length === 0) {
      const row = document.createElement("div");
      row.textContent = "Memory is empty.";
      memoryPreview.appendChild(row);
      return;
    }

    for (const turn of turns) {
      const row = document.createElement("div");
      const prefix = `[${String(turn.role || "unknown").toUpperCase()}]`;
      const text = String(turn.textDisplay || turn.text || "").replace(/\s+/g, " ").trim();
      const clipped = text.length > 120 ? `${text.slice(0, 117)}...` : text;
      const imageNote = Array.isArray(turn.images) && turn.images.length > 0
        ? ` (images: ${turn.images.length})`
        : "";
      const fileNote = Array.isArray(turn.files) && turn.files.length > 0
        ? ` (files: ${turn.files.length})`
        : "";
      row.textContent = `${prefix} ${clipped}${imageNote}${fileNote}`;
      memoryPreview.appendChild(row);
    }
  } catch (error) {
    memoryStats.textContent = `Memory unavailable: ${error.message}`;
  }
}

function formatLedgerStatus(value) {
  return String(value || "planned").replace(/_/g, " ");
}

function formatLedgerPriority(value) {
  return String(value || "normal").toLowerCase();
}

function renderTaskLedgerTasks(tasks = []) {
  if (!taskLedgerList) return;
  taskLedgerList.innerHTML = "";
  if (!Array.isArray(tasks) || tasks.length < 1) {
    const empty = document.createElement("div");
    empty.textContent = "No tasks match the current filter.";
    taskLedgerList.appendChild(empty);
    return;
  }

  for (const task of tasks) {
    const taskId = String(task.id || "");
    const node = document.createElement("div");
    node.className = "ledger-task";

    const head = document.createElement("div");
    head.className = "ledger-task-head";

    const title = document.createElement("div");
    title.className = "ledger-task-title";
    title.textContent = task.titleDisplay || task.title || taskId || "Task";

    const meta = document.createElement("div");
    meta.className = "ledger-task-meta";
    const updatedAt = task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "n/a";
    meta.textContent = `${formatLedgerStatus(task.status)} | ${formatLedgerPriority(task.priority)} | ${Math.max(0, Math.min(100, Number(task.progress || 0)))}% | ${updatedAt}`;

    head.appendChild(title);
    head.appendChild(meta);
    node.appendChild(head);

    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "ledger-task-desc";
      desc.textContent = String(task.descriptionDisplay || task.description);
      node.appendChild(desc);
    }

    const actions = document.createElement("div");
    actions.className = "ledger-task-actions";
    const addAction = (action, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.taskId = taskId;
      button.dataset.action = action;
      button.textContent = label;
      actions.appendChild(button);
    };

    if (!task.archived && task.status !== "in_progress") addAction("start", "Start");
    if (!task.archived && task.status !== "review") addAction("review", "Review");
    if (!task.archived && task.status !== "blocked") addAction("block", "Block");
    if (!task.archived && task.status !== "done") addAction("done", "Done");
    if (!task.archived) {
      addAction("archive", "Archive");
    } else {
      addAction("unarchive", "Unarchive");
    }
    addAction("note", "Add Note");

    node.appendChild(actions);
    taskLedgerList.appendChild(node);
  }
}

function renderTaskLedgerEvents(events = []) {
  if (!taskLedgerEvents) return;
  taskLedgerEvents.innerHTML = "";
  if (!Array.isArray(events) || events.length < 1) {
    const empty = document.createElement("div");
    empty.textContent = "No events yet.";
    taskLedgerEvents.appendChild(empty);
    return;
  }
  for (const event of events) {
    const row = document.createElement("div");
    const stamp = event.at ? new Date(event.at).toLocaleString() : "n/a";
    const actor = String(event.actorDisplay || event.actor || "system");
    const type = String(event.type || "task_event");
    const note = String(event.noteDisplay || event.note || "").replace(/\s+/g, " ").trim();
    const clipped = note.length > 140 ? `${note.slice(0, 137)}...` : note;
    row.textContent = `${stamp} | ${event.taskId || "-"} | ${type} | ${actor}${clipped ? ` | ${clipped}` : ""}`;
    taskLedgerEvents.appendChild(row);
  }
}

function buildTaskLedgerStateUrl() {
  const params = new URLSearchParams();
  params.set("taskLimit", "60");
  params.set("eventLimit", "24");
  params.set("taskStatus", String(taskLedgerStatusFilter?.value || "all"));
  params.set("taskPriority", String(taskLedgerPriorityFilter?.value || "all"));
  params.set("includeArchived", String(Boolean(taskLedgerIncludeArchived?.checked)));
  const scope = getActiveProjectScope();
  if (scope?.id && scope.id !== "all") {
    params.set("projectScope", String(scope.id));
  }
  const q = String(taskLedgerQuery?.value || "").trim();
  if (q) {
    params.set("taskQuery", q);
  }
  return `/api/task-ledger/state?${params.toString()}`;
}

async function refreshTaskLedger(options = {}) {
  if (!taskLedgerStats || !taskLedgerList || !taskLedgerEvents) {
    return;
  }
  const silent = Boolean(options.silent);
  try {
    const data = await request(buildTaskLedgerStateUrl());
    const ledger = data.ledger || {};
    const summary = ledger.summary || {};
    const projectScope = data.projectScope && typeof data.projectScope === "object"
      ? data.projectScope
      : {};
    const scopeLabel = String(projectScope.label || getActiveProjectScope().label || "All Projects");
    const tasks = Array.isArray(ledger.tasks) ? ledger.tasks : [];
    const events = Array.isArray(ledger.events) ? ledger.events : [];
    const totalTasks = Number.isFinite(Number(summary.totalTasks)) ? Number(summary.totalTasks) : 0;
    const openTasks = Number.isFinite(Number(summary.openTasks)) ? Number(summary.openTasks) : 0;
    const archivedTasks = Number.isFinite(Number(summary.archivedTasks)) ? Number(summary.archivedTasks) : 0;
    const eventsCount = Number.isFinite(Number(summary.eventsCount)) ? Number(summary.eventsCount) : 0;

    taskLedgerStats.textContent = `Scope: ${scopeLabel} | Tasks: ${totalTasks} | Open: ${openTasks} | Archived: ${archivedTasks} | Events: ${eventsCount}`;
    chatExecutionMetrics = computeChatExecutionMetrics(tasks, events);
    renderChatExecutionChip();
    renderTaskLedgerTasks(tasks);
    renderTaskLedgerEvents(events);
    chatRailTasks = tasks.slice(0, 40);
    renderChatRailTasks();
    renderChatThreadList();
  } catch (error) {
    taskLedgerStats.textContent = `Task ledger unavailable: ${error.message}`;
    if (!silent) {
      logEvent(`Task ledger refresh failed: ${error.message}`);
    }
  }
}

async function setTaskLedgerTaskStatus(taskId, status, options = {}) {
  const id = String(taskId || "").trim();
  if (!id) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      actor: "web-ui",
      source: "web-ui",
      note: options.note || ""
    })
  });
}

async function archiveTaskLedgerTask(taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

async function unarchiveTaskLedgerTask(taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      archived: false,
      status: "planned",
      actor: "web-ui",
      source: "web-ui",
      note: "Unarchived from web UI."
    })
  });
}

async function addTaskLedgerNote(taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  const note = window.prompt("Task event note:");
  if (note === null) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "task_note",
      note: String(note || "").trim() || "UI note",
      actor: "web-ui",
      source: "web-ui"
    })
  });
}

function buildScopedTaskTitle(rawTitle, scope = getActiveProjectScope()) {
  const title = String(rawTitle || "").trim();
  const marker = String(scope?.marker || "").trim();
  if (!marker) {
    return title;
  }
  if (!title) {
    return `${marker} Task`;
  }
  if (title.toUpperCase().includes(marker.toUpperCase())) {
    return title;
  }
  return `${marker} ${title}`;
}

function buildScopedTaskDescription(rawDescription, scope = getActiveProjectScope()) {
  const description = String(rawDescription || "").trim();
  if (description) {
    return description;
  }
  const scopeLabel = String(scope?.label || "").trim();
  if (scopeLabel) {
    return `Project scope: ${scopeLabel}`;
  }
  return "";
}

function sanitizeAbacusPackState(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const dayRaw = String(source.day || "").trim();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) ? dayRaw : "";
  const countValue = Number(source.count);
  const count = Number.isFinite(countValue) ? Math.max(0, Math.floor(countValue)) : 0;
  const threadTitle = String(source.threadTitle || "").trim().slice(0, 120);
  return { day, count, threadTitle };
}

function readAbacusPackState() {
  try {
    const raw = localStorage.getItem(CHAT_ABACUS_PACK_STORAGE_KEY) || "{}";
    return sanitizeAbacusPackState(JSON.parse(raw));
  } catch {
    return sanitizeAbacusPackState({});
  }
}

function writeAbacusPackState(value = {}) {
  const sanitized = sanitizeAbacusPackState(value);
  try {
    localStorage.setItem(CHAT_ABACUS_PACK_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {}
  return sanitized;
}

function renderAbacusPackStatus(message = "") {
  if (!chatAbacusPackStatus) {
    return;
  }
  const override = String(message || "").trim();
  if (override) {
    chatAbacusPackStatus.textContent = override;
    return;
  }
  const state = readAbacusPackState();
  const today = buildLocalDayKey();
  if (state.day === today && state.count > 0) {
    if (state.threadTitle) {
      chatAbacusPackStatus.textContent = `Today's pack ready: ${state.count} task(s) linked to ${state.threadTitle}.`;
    } else {
      chatAbacusPackStatus.textContent = `Today's pack ready: ${state.count} task(s).`;
    }
    return;
  }
  if (state.day && state.count > 0) {
    chatAbacusPackStatus.textContent = `Last pack: ${state.day} (${state.count} task(s)).`;
    return;
  }
  chatAbacusPackStatus.textContent = "Create scoped tasks and seed a focused upgrade prompt.";
}

function setFriendBootstrapStatus(message = "") {
  if (!chatFriendBootstrapStatus) {
    return;
  }
  const text = String(message || "").trim();
  chatFriendBootstrapStatus.textContent = text || "Load the Codex bootstrap system card and task packet for a new machine.";
}

async function fetchFriendBootstrapPack() {
  const data = await request("/api/bootstrap/friend-codex-pack");
  return {
    title: String(data.title || FRIEND_BOOTSTRAP_PACK_TITLE).trim() || FRIEND_BOOTSTRAP_PACK_TITLE,
    systemCard: String(data.systemCard || "").trim(),
    taskPacket: String(data.taskPacket || "").trim()
  };
}

function buildFriendBootstrapPackText(pack) {
  const title = String(pack?.title || FRIEND_BOOTSTRAP_PACK_TITLE).trim() || FRIEND_BOOTSTRAP_PACK_TITLE;
  const systemCard = String(pack?.systemCard || "").trim();
  const taskPacket = String(pack?.taskPacket || "").trim();
  return [
    `${title}`,
    "",
    "System card:",
    systemCard,
    "",
    "Task packet template:",
    taskPacket
  ].filter(Boolean).join("\n");
}

async function seedFriendBootstrapPrompt() {
  if (!chatInput) {
    return;
  }
  const pack = await fetchFriendBootstrapPack();
  applyChatRailSection("chats");
  chatInput.value = buildFriendBootstrapPackText(pack);
  chatInput.focus();
  if (typeof chatInput.setSelectionRange === "function") {
    const cursor = chatInput.value.length;
    chatInput.setSelectionRange(cursor, cursor);
  }
  setFriendBootstrapStatus("Bootstrap system card loaded into chat input.");
  logEvent("Friend bootstrap system card seeded into chat input.");
}

async function copyFriendBootstrapPack() {
  const pack = await fetchFriendBootstrapPack();
  await copyTextToClipboard(buildFriendBootstrapPackText(pack));
  setFriendBootstrapStatus("Bootstrap pack copied to clipboard.");
  logEvent("Friend bootstrap pack copied to clipboard.");
}

function seedAbacusUpgradePrompt() {
  if (!chatInput) {
    return;
  }
  applyChatRailSection("chats");
  chatInput.value = ABACUS_UPGRADE_PROMPT;
  chatInput.focus();
  if (typeof chatInput.setSelectionRange === "function") {
    const cursor = chatInput.value.length;
    chatInput.setSelectionRange(cursor, cursor);
  }
  renderAbacusPackStatus("Prompt seeded. Press Send when ready.");
  logEvent("Abacus upgrade prompt seeded into chat input.");
}

async function createAbacusParityPackFromTemplates() {
  const templates = Array.isArray(ABACUS_PARITY_TASK_TEMPLATES) ? ABACUS_PARITY_TASK_TEMPLATES : [];
  if (templates.length === 0) {
    throw new Error("No Abacus parity task templates configured.");
  }
  const today = buildLocalDayKey();
  const previous = readAbacusPackState();
  if (previous.day === today && previous.count > 0) {
    const proceed = window.confirm(`Today's pack already exists (${previous.count} task(s)). Create another copy?`);
    if (!proceed) {
      renderAbacusPackStatus(`Kept current pack: ${previous.count} task(s) today.`);
      return { created: 0, failed: 0, skipped: true };
    }
  }

  const scope = getActiveProjectScope();
  const scopedProjectId = scope?.id && scope.id !== "all" ? String(scope.id) : "";
  const activeChatId = normalizeChatThreadId(activeChatThreadId, DEFAULT_CHAT_THREAD_ID);
  const threadTitle = getChatThreadTitleById(activeChatId);
  let created = 0;
  let failed = 0;
  let firstError = "";

  for (const template of templates) {
    const title = buildScopedTaskTitle(template.title, scope);
    const description = buildScopedTaskDescription(
      `${String(template.description || "").trim()} Source: Abacus capability map parity.`,
      scope
    );
    const priority = String(template.priority || "normal");
    try {
      const data = await apiPost("/api/task-ledger/tasks", {
        title,
        description,
        priority,
        projectScope: scopedProjectId,
        actor: "web-ui",
        source: "abacus-parity-pack"
      });
      const taskId = String(data?.task?.id || "").trim();
      if (taskId) {
        setTaskLinkedChatId(taskId, activeChatId);
      }
      created += 1;
    } catch (error) {
      failed += 1;
      if (!firstError) {
        firstError = String(error?.message || "Unknown task create failure");
      }
      logEvent(`Abacus pack task failed: ${title} (${error.message})`);
    }
  }

  if (created <= 0) {
    throw new Error(firstError || "Failed to create Abacus parity task pack.");
  }

  writeAbacusPackState({ day: today, count: created, threadTitle });
  renderAbacusPackStatus(
    failed > 0
      ? `Created ${created} task(s); ${failed} failed. Check Event Log.`
      : `Created ${created} task(s) and linked them to ${threadTitle}.`
  );
  logEvent(
    failed > 0
      ? `Abacus parity pack partial: ${created} created, ${failed} failed.`
      : `Abacus parity pack created: ${created} task(s).`
  );
  applyChatRailSection("tasks");
  await refreshTaskLedger({ silent: true });
  refreshHealth();
  renderChatThreadList();
  return { created, failed, skipped: false };
}

async function createTaskLedgerTaskFromUi() {
  const title = String(taskLedgerTitle?.value || "").trim();
  const description = String(taskLedgerDescription?.value || "").trim();
  if (!title && !description) {
    throw new Error("Task title or description is required.");
  }
  const scope = getActiveProjectScope();
  const scopedTitle = buildScopedTaskTitle(title, scope);
  const scopedDescription = buildScopedTaskDescription(description, scope);
  const priority = String(taskLedgerCreatePriority?.value || "normal");
  const scopedProjectId = scope?.id && scope.id !== "all" ? String(scope.id) : "";
  const data = await apiPost("/api/task-ledger/tasks", {
    title: scopedTitle,
    description: scopedDescription,
    priority,
    projectScope: scopedProjectId,
    actor: "web-ui",
    source: "web-ui"
  });
  if (taskLedgerTitle) taskLedgerTitle.value = "";
  if (taskLedgerDescription) taskLedgerDescription.value = "";
  return data;
}

async function handleTaskLedgerAction(action, taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  if (action === "start") {
    await setTaskLedgerTaskStatus(id, "in_progress", { note: "Moved to in_progress from web UI." });
  } else if (action === "review") {
    await setTaskLedgerTaskStatus(id, "review", { note: "Moved to review from web UI." });
  } else if (action === "block") {
    await setTaskLedgerTaskStatus(id, "blocked", { note: "Marked blocked from web UI." });
  } else if (action === "done") {
    await setTaskLedgerTaskStatus(id, "done", { note: "Marked done from web UI." });
    showCloseLoopDoneToast(id, getTaskLinkedChatId(id));
  } else if (action === "archive") {
    await archiveTaskLedgerTask(id);
  } else if (action === "unarchive") {
    await unarchiveTaskLedgerTask(id);
  } else if (action === "note") {
    await addTaskLedgerNote(id);
  } else {
    throw new Error(`Unknown task action: ${action}`);
  }
}

async function queueChatCommand(command, sourceMeta = "Asolaria Router") {
  const data = await apiPost("/api/chat", { message: String(command || "").trim() });
  if (data.mode === "routed") {
    pushMessage("brain", String(data.reply || "Done."), sourceMeta);
    logEvent(`Command completed: ${command}`);
    refreshHealth();
    refreshMemory();
    return;
  }

  if (data.job?.id) {
    const messageRef = createMessage(
      "brain",
      `${data.reply}\nWaiting for job completion...`,
      `Asolaria Brain (${data.job.id})`
    );
    trackJob(data.job.id, {
      onUpdate: (job) => {
        updateMessageBody(
          messageRef,
          `Job ${job.id} status: ${job.status}...`,
          `Asolaria Brain (${job.id})`
        );
      },
      onCompleted: (job) => {
        updateMessageBody(
          messageRef,
          formatJobResult(job),
          `Asolaria Brain (${job.id}, ${job.elapsedMs || 0}ms)`
        );
        logEvent(`Command job completed: ${job.id}`);
        refreshHealth();
        refreshMemory();
      },
      onFailed: (job) => {
        updateMessageBody(
          messageRef,
          `Job failed: ${job.error || "Unknown error"}`,
          `Asolaria Brain (${job.id || "unknown"})`
        );
        logEvent(`Command job failed: ${job.error || "Unknown error"}`);
        refreshHealth();
        refreshMemory();
      }
    });
    return;
  }

  pushMessage("brain", String(data.reply || "Done."), sourceMeta);
  refreshHealth();
  refreshMemory();
}

async function queueOpenclawAction(action, payload = {}) {
  if (!openclawOutput) {
    return;
  }

  openclawOutput.textContent = `Queued ${action}...`;
  const data = await apiPost("/api/openclaw/action", { action, payload });
  const jobId = data.job?.id;
  if (!jobId) {
    openclawOutput.textContent = "OpenClaw action queued with no job id.";
    return;
  }

  logEvent(`OpenClaw action queued: ${action} (${jobId})`);
  openclawOutput.textContent = `Tracking OpenClaw job: ${jobId}`;
  trackJob(jobId, {
    onUpdate: (job) => {
      openclawOutput.textContent = `OpenClaw ${action}: ${job.status}`;
    },
    onCompleted: (job) => {
      openclawOutput.textContent = `Completed ${action}.`;
      pushMessage("brain", formatJobResult(job), `OpenClaw (${job.id})`);
      refreshHealth();
    },
    onFailed: (job) => {
      openclawOutput.textContent = `Failed ${action}: ${job.error || "Unknown error"}`;
      logEvent(`OpenClaw action failed: ${job.error || "Unknown error"}`);
      refreshHealth();
    }
  });
}

async function queueExternalProvider(provider, prompt, options = {}) {
  if (!externalOutput) {
    return;
  }

  const providerId = normalizeExternalProviderId(provider);
  const model = normalizeExternalDefaultModelValue(options.model || "");
  externalOutput.textContent = model ? `Queued ${providerId} (${model})...` : `Queued ${providerId}...`;
  const payload = { provider: providerId, prompt };
  if (model) {
    payload.model = model;
  }
  const contextKey = normalizeExternalMcpContextKey(options.mcpContextKey, "");
  if (contextKey) {
    payload.mcpContextKey = contextKey;
  }
  if (options.mcpTokenReductionProfile !== undefined) {
    payload.mcpTokenReductionProfile = normalizeExternalMcpTokenReductionProfile(
      options.mcpTokenReductionProfile,
      EXTERNAL_MCP_TOKEN_PROFILE_FALLBACK
    );
  }
  if (options.mcpToolSchemaMode !== undefined) {
    payload.mcpToolSchemaMode = normalizeExternalMcpToolSchemaMode(
      options.mcpToolSchemaMode,
      EXTERNAL_MCP_TOOL_SCHEMA_MODE_FALLBACK
    );
  }
  if (options.mcpPromptTokenLimit !== undefined) {
    payload.mcpPromptTokenLimit = normalizeExternalMcpPromptTokenLimit(
      options.mcpPromptTokenLimit,
      EXTERNAL_MCP_PROMPT_TOKEN_LIMIT_FALLBACK
    );
  }
  const skillHints = normalizeExternalHintList(options.mcpSkillHints, 24, 72);
  if (skillHints.length > 0) {
    payload.mcpSkillHints = skillHints;
  }
  const webHints = normalizeExternalHintList(options.mcpWebMcpHints, 24, 72);
  if (webHints.length > 0) {
    payload.mcpWebMcpHints = webHints;
  }
  const data = await apiPost("/api/providers/external/run", payload);
  const jobId = data.job?.id;
  if (!jobId) {
    externalOutput.textContent = "External provider queued with no job id.";
    return;
  }

  logEvent(`External provider queued: ${providerId} (${jobId})`);
  externalOutput.textContent = `Tracking ${providerId} job: ${jobId}`;
  trackJob(jobId, {
    onUpdate: (job) => {
      const jobModel = String(job?.result?.model || model || "").trim();
      externalOutput.textContent = `${providerId}${jobModel ? ` (${jobModel})` : ""} job ${job.status}`;
    },
    onCompleted: (job) => {
      const jobModel = String(job?.result?.model || model || "").trim();
      const tokenReduction = job?.result?.tokenReduction || {};
      const before = Number(tokenReduction.beforePromptTokens || 0);
      const after = Number(tokenReduction.afterPromptTokens || 0);
      const compacted = Boolean(tokenReduction.compacted);
      const reductionText = before > 0
        ? ` Tokens ${after}/${before}${compacted ? " (compacted)" : ""}.`
        : "";
      externalOutput.textContent = `${providerId}${jobModel ? ` (${jobModel})` : ""} completed.${reductionText}`;
      if (before > 0) {
        const saved = Math.max(0, before - after);
        logEvent(
          `External token reduction (${providerId}): profile=${tokenReduction.profile || "n/a"}, schema=${tokenReduction.schemaMode || "n/a"}, saved=${saved}, before=${before}, after=${after}`
        );
      }
      pushMessage("brain", formatJobResult(job), `${providerId}${jobModel ? `/${jobModel}` : ""} (${job.id})`);
      refreshHealth();
    },
    onFailed: (job) => {
      externalOutput.textContent = `${providerId} failed: ${job.error || "Unknown error"}`;
      logEvent(`External provider failed: ${job.error || "Unknown error"}`);
      refreshHealth();
    }
  });
}

async function showCompanyAccountMasked() {
  const data = await request("/api/company/primary-signin");
  const account = data.account || null;
  const vault = data.vault || null;
  const text = JSON.stringify({ account, vault }, null, 2);
  if (companyAccountOutput) {
    companyAccountOutput.textContent = account
      ? `Account loaded (${account.status || "draft"}).`
      : "No company primary sign-in profile yet.";
  }
  pushMessage("brain", text, "Company Account");
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  const activeChatId = normalizeChatThreadId(activeChatThreadId, DEFAULT_CHAT_THREAD_ID);
  const brainLabel = chatRouteMode === "direct" ? "Direct Codex" : "Asolaria Brain";
  appendTurnToThread(activeChatId, {
    role: "user",
    text,
    at: new Date().toISOString(),
    meta: {
      source: "ui",
      chatId: activeChatId,
      routeMode: chatRouteMode
    }
  });
  renderActiveChatMessages();
  setQuickAvatarStatus("Thinking...", "thinking");
  chatSend.disabled = true;

  try {
    let uploadedImages = [];
    if ((chatImages?.files?.length || 0) > 0) {
      logEvent(`Uploading ${chatImages.files.length} image(s)...`);
      uploadedImages = await uploadSelectedImages();
      if (uploadedImages.length > 0) {
        logEvent(`Image ingest ready (${uploadedImages.length}).`);
      }
    }

    let uploadedFiles = [];
    if ((chatFiles?.files?.length || 0) > 0) {
      logEvent(`Uploading ${chatFiles.files.length} file(s)...`);
      uploadedFiles = await uploadSelectedFiles();
      if (uploadedFiles.length > 0) {
        logEvent(`File ingest ready (${uploadedFiles.length}).`);
      }
    }

    const data = await apiPost("/api/chat", {
      message: text,
      images: uploadedImages,
      files: uploadedFiles,
      chatId: activeChatId,
      routeMode: chatRouteMode
    });
    logEvent(data.reply || "Chat request accepted.");

    if (data.mode === "routed") {
      const routedReply = String(data.reply || "Routed command finished.");
      appendTurnToThread(activeChatId, {
        role: "assistant",
        text: routedReply,
        at: new Date().toISOString(),
        meta: {
          source: "router",
          chatId: activeChatId
        }
      });
      renderActiveChatMessages();
      speakAssistantReply(routedReply, { source: "router" });
      chatInput.value = "";
      if (chatImages) chatImages.value = "";
      if (chatFiles) chatFiles.value = "";
      setChatImageStatus();
      setChatFileStatus();
      loadConversationTurns(activeChatId, { render: activeChatId === activeChatThreadId }).catch(() => {});
      refreshMemory();
      return;
    }

    if (data.job?.id) {
      const messageRef = createMessage(
        "brain",
        `${data.reply}\nWaiting for job completion...`,
        `${brainLabel} (${data.job.id})`
      );

      trackJob(data.job.id, {
        onUpdate: (job) => {
          updateMessageBody(
            messageRef,
            `Job ${job.id} status: ${job.status}...`,
            `${brainLabel} (${job.id})`
          );
        },
        onCompleted: (job) => {
          updateMessageBody(
            messageRef,
            formatJobResult(job),
            `${brainLabel} (${job.id}, ${job.elapsedMs || 0}ms)`
          );
          logEvent(`Brain job completed: ${job.id}`);
          loadConversationTurns(activeChatId, { render: activeChatId === activeChatThreadId }).catch(() => {});
          refreshHealth();
          refreshMemory();
        },
        onFailed: (job) => {
          updateMessageBody(
            messageRef,
            `Job failed: ${job.error || "Unknown error"}`,
            `Asolaria Brain (${job.id || "unknown"})`
          );
          logEvent(`Brain job failed: ${job.error || "Unknown error"}`);
          loadConversationTurns(activeChatId, { render: activeChatId === activeChatThreadId }).catch(() => {});
          refreshHealth();
          refreshMemory();
        }
      });
      chatInput.value = "";
      if (chatImages) chatImages.value = "";
      if (chatFiles) chatFiles.value = "";
      setChatImageStatus();
      setChatFileStatus();
      return;
    }

    const assistantReply = String(data.reply || "Task accepted.");
    appendTurnToThread(activeChatId, {
      role: "assistant",
      text: assistantReply,
      at: new Date().toISOString(),
      meta: {
        source: "brain",
        chatId: activeChatId
      }
    });
    renderActiveChatMessages();
    speakAssistantReply(assistantReply, { source: "brain" });
    chatInput.value = "";
    if (chatImages) chatImages.value = "";
    if (chatFiles) chatFiles.value = "";
    setChatImageStatus();
    setChatFileStatus();
    loadConversationTurns(activeChatId, { render: activeChatId === activeChatThreadId }).catch(() => {});
    refreshMemory();
  } catch (error) {
    appendTurnToThread(activeChatId, {
      role: "assistant",
      text: String(error.message || "Unknown error"),
      at: new Date().toISOString(),
      meta: {
        source: "error",
        chatId: activeChatId
      }
    });
    renderActiveChatMessages();
    logEvent(`Chat failed: ${error.message}`);
    setQuickAvatarStatus("Request failed.", "error");
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
    if (!quickVoiceListening) {
      setQuickAvatarStatus("Avatar idle. Voice standby.", "idle");
    }
  }
});

if (chatImages) {
  chatImages.addEventListener("change", setChatImageStatus);
}

if (chatFiles) {
  chatFiles.addEventListener("change", setChatFileStatus);
}

if (chatNewThreadBtn) {
  chatNewThreadBtn.addEventListener("click", () => {
    createNewChatThread();
    refreshMemory();
  });
}

if (chatRenameThreadBtn) {
  chatRenameThreadBtn.addEventListener("click", () => {
    renameActiveChatThread();
  });
}

if (chatCreateAbacusPackBtn) {
  chatCreateAbacusPackBtn.addEventListener("click", async () => {
    chatCreateAbacusPackBtn.disabled = true;
    try {
      await createAbacusParityPackFromTemplates();
    } catch (error) {
      renderAbacusPackStatus(`Pack create failed: ${error.message}`);
      logEvent(`Abacus parity pack failed: ${error.message}`);
    } finally {
      chatCreateAbacusPackBtn.disabled = false;
    }
  });
}

if (chatSeedAbacusPromptBtn) {
  chatSeedAbacusPromptBtn.addEventListener("click", () => {
    seedAbacusUpgradePrompt();
  });
}

if (chatSeedFriendBootstrapBtn) {
  chatSeedFriendBootstrapBtn.addEventListener("click", async () => {
    chatSeedFriendBootstrapBtn.disabled = true;
    try {
      await seedFriendBootstrapPrompt();
    } catch (error) {
      setFriendBootstrapStatus(`Bootstrap seed failed: ${error.message}`);
      logEvent(`Friend bootstrap seed failed: ${error.message}`);
    } finally {
      chatSeedFriendBootstrapBtn.disabled = false;
    }
  });
}

if (chatCopyFriendBootstrapBtn) {
  chatCopyFriendBootstrapBtn.addEventListener("click", async () => {
    chatCopyFriendBootstrapBtn.disabled = true;
    try {
      await copyFriendBootstrapPack();
    } catch (error) {
      setFriendBootstrapStatus(`Bootstrap copy failed: ${error.message}`);
      logEvent(`Friend bootstrap copy failed: ${error.message}`);
    } finally {
      chatCopyFriendBootstrapBtn.disabled = false;
    }
  });
}

if (chatRouteModeSelect) {
  chatRouteModeSelect.addEventListener("change", () => {
    chatRouteMode = normalizeChatRouteMode(chatRouteModeSelect.value);
    chatRouteModeSelect.value = chatRouteMode;
    saveChatWorkspaceState();
    logEvent(`Chat route mode set to ${describeChatRouteMode(chatRouteMode)}.`);
  });
}

if (chatEscalateBtn) {
  chatEscalateBtn.addEventListener("click", () => {
    chatRouteMode = "deep";
    if (chatRouteModeSelect) {
      chatRouteModeSelect.value = "deep";
    }
    saveChatWorkspaceState();
    logEvent("Deep route mode armed for the next chat request.");
    chatInput.focus();
  });
}

function handleChatThreadCardClick(event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) return;
  const button = target.closest("button[data-action]");
  if (!button) return;
  const action = String(button.dataset.action || "").trim();
  const chatId = String(button.dataset.chatId || "").trim();
  const taskId = String(button.dataset.taskId || "").trim();
  if (action === "start-new-from-search") {
    const seed = String(button.dataset.query || "").trim();
    createNewChatThreadFromSeed(seed);
    logEvent("Started new conversation from search fallback.");
    return;
  }
  if (action === "resolve-stale-task" && taskId) {
    button.disabled = true;
    recordSafetyMetric("resolveClicks");
    resolveTaskWithArchive(taskId, chatId, { source: "stale rail card" })
      .catch((error) => {
        logEvent(`Stale resolve failed: ${error.message}`);
      })
      .finally(() => {
        button.disabled = false;
      });
    return;
  }
  if (action === "set-linked-task-status" && taskId) {
    updateLinkedTaskStatusFromCard(
      taskId,
      String(button.dataset.taskStatus || ""),
      { chatId }
    ).catch((error) => {
      logEvent(`Task status quick update failed: ${error.message}`);
    });
    return;
  }
  if (action === "open-linked-task" && taskId) {
    startOrOpenTaskConversation(taskId);
    applyChatRailSection("tasks");
    refreshChatRailTasks({ silent: true }).catch(() => {});
    return;
  }
  if (action === "link-chat-task" || action === "relink-chat-task") {
    promptAndLinkChatToTask(chatId, { relink: action === "relink-chat-task", taskId });
    return;
  }
  if (!chatId) return;
  if (action === "toggle-chat-pin") {
    togglePinnedChatThread(chatId);
    return;
  }
  if (action === "open-chat-thread") {
    setActiveChatThread(chatId, { load: true });
    refreshMemory();
  }
}

if (chatThreadList) {
  chatThreadList.addEventListener("click", handleChatThreadCardClick);
}

if (chatPinnedThreadList) {
  chatPinnedThreadList.addEventListener("click", handleChatThreadCardClick);
}

if (chatRecentlyActiveThreadList) {
  chatRecentlyActiveThreadList.addEventListener("click", handleChatThreadCardClick);
}

if (chatClearFocusBtn) {
  chatClearFocusBtn.addEventListener("click", () => {
    clearFocusThreads();
  });
}

if (chatFocusSuggestionBtn) {
  chatFocusSuggestionBtn.addEventListener("click", () => {
    const chatId = normalizeChatThreadId(String(chatFocusSuggestionBtn.dataset.chatId || "").trim(), "");
    if (!chatId) {
      return;
    }
    togglePinnedChatThread(chatId);
  });
}

if (chatSafetyMetricsResetBtn) {
  chatSafetyMetricsResetBtn.addEventListener("click", () => {
    const proceed = window.confirm("Reset today's safety metrics?");
    if (!proceed) {
      return;
    }
    resetSafetyMetricsToday();
  });
}

if (chatThreadSearch) {
  chatThreadSearch.addEventListener("input", () => {
    renderChatThreadList();
  });
}

if (nextActionPrimaryBtn) {
  nextActionPrimaryBtn.addEventListener("click", () => {
    recordSafetyMetric("nbaClicked");
    runPrimaryNextAction();
  });
}

if (nextActionSecondaryBtn) {
  nextActionSecondaryBtn.addEventListener("click", () => {
    createNewChatThread();
    refreshMemory();
  });
}

if (closeLoopMarkDoneBtn) {
  closeLoopMarkDoneBtn.addEventListener("click", async () => {
    const chatId = normalizeChatThreadId(String(closeLoopMarkDoneBtn.dataset.chatId || "").trim(), "");
    const taskId = String(closeLoopMarkDoneBtn.dataset.taskId || "").trim();
    if (!chatId || !taskId) {
      return;
    }
    closeLoopMarkDoneBtn.disabled = true;
    recordSafetyMetric("resolveClicks");
    try {
      await resolveTaskWithArchive(taskId, chatId, { source: "close-loop prompt" });
    } catch (error) {
      logEvent(`Close-loop mark done failed: ${error.message}`);
    } finally {
      closeLoopMarkDoneBtn.disabled = false;
    }
  });
}

if (closeLoopToastReopenBtn) {
  closeLoopToastReopenBtn.addEventListener("click", async () => {
    const taskId = String(closeLoopToastState.taskId || "").trim();
    const chatId = normalizeChatThreadId(String(closeLoopToastState.chatId || "").trim(), "");
    if (!taskId) {
      return;
    }
    closeLoopToastReopenBtn.disabled = true;
    recordSafetyMetric("reopenClicks");
    try {
      await unarchiveTaskLedgerTask(taskId);
      await setTaskLedgerTaskStatus(taskId, "in_progress", { note: "Reopened from done toast in web UI." });
      if (chatId) {
        clearCloseLoopDismissed(chatId);
        setActiveChatThread(chatId, { load: true });
      }
      if (closeLoopToastText) {
        closeLoopToastText.textContent = "↩ Reopened and set to In Progress.";
      }
      if (closeLoopToastTimer) {
        window.clearTimeout(closeLoopToastTimer);
      }
      closeLoopToastTimer = window.setTimeout(() => {
        hideCloseLoopToast();
      }, 3000);
      refreshTaskLedger({ silent: true }).catch(() => {});
      refreshChatRailTasks({ silent: true }).catch(() => {});
      renderChatThreadList();
      logEvent(`Task ${taskId} reopened from done toast.`);
    } catch (error) {
      logEvent(`Reopen failed: ${error.message}`);
      closeLoopToastReopenBtn.disabled = false;
      return;
    }
    closeLoopToastReopenBtn.disabled = false;
  });
}

if (closeLoopResumeBtn) {
  closeLoopResumeBtn.addEventListener("click", () => {
    const chatId = normalizeChatThreadId(String(closeLoopResumeBtn.dataset.chatId || "").trim(), "");
    if (!chatId) {
      return;
    }
    setCloseLoopDismissed(chatId);
    setActiveChatThread(chatId, { load: true });
    chatInput.focus();
    logEvent("Close-loop prompt dismissed; conversation resumed.");
    refreshMemory();
  });
}

if (chatRailNav) {
  chatRailNav.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const button = target.closest(".chat-rail-nav-btn[data-chat-rail]");
    if (!button) return;
    const section = String(button.dataset.chatRail || "").trim();
    applyChatRailSection(section);
    if (section === "tasks") {
      refreshChatRailTasks({ silent: true });
    }
  });
}

function handleChatRailHotkeys(event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const tag = String(target?.tagName || "").toLowerCase();
  if (target?.isContentEditable || tag === "input" || tag === "textarea" || tag === "select") {
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  const key = String(event.key || "").toLowerCase();
  const now = Date.now();
  if (key === "g") {
    chatGoShortcutUntilMs = now + 1200;
    return;
  }
  if (now > chatGoShortcutUntilMs) {
    return;
  }
  if (key === "t") {
    applyChatRailSection("apps");
    event.preventDefault();
  } else if (key === "w") {
    applyChatRailSection("tasks");
    refreshChatRailTasks({ silent: true });
    event.preventDefault();
  } else if (key === "c") {
    applyChatRailSection("chats");
    event.preventDefault();
  } else {
    return;
  }
  chatGoShortcutUntilMs = 0;
}

window.addEventListener("keydown", handleChatRailHotkeys);

if (chatTaskSearch) {
  chatTaskSearch.addEventListener("input", () => {
    renderChatRailTasks();
  });
}

if (chatTaskCardList) {
  chatTaskCardList.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const button = target.closest("button[data-action][data-task-id]");
    if (!button) return;
    const action = String(button.dataset.action || "").trim();
    const taskId = String(button.dataset.taskId || "").trim();
    if (!taskId) return;
    if (action === "task-open-chat") {
      startOrOpenTaskConversation(taskId);
      return;
    }
    injectTaskIntoChat(taskId);
  });
}

function normalizeChatChannelSendKey(value) {
  const key = String(value || "").trim();
  if (!key) {
    return "Enter";
  }
  return key.slice(0, 40);
}

function extractChatChannelReplyFromJob(job) {
  const extracts = job?.result?.extracts && typeof job.result.extracts === "object"
    ? job.result.extracts
    : {};
  const reply = String(extracts.chat_reply || "").trim();
  return reply;
}

async function queueBackendChatChannel() {
  const url = String(chatChannelUrlInput?.value || "").trim();
  const inputSelector = String(chatChannelInputSelectorInput?.value || "").trim();
  const message = String(chatChannelMessageInput?.value || "").trim();
  const sendSelector = String(chatChannelSendSelectorInput?.value || "").trim();
  const responseSelector = String(chatChannelResponseSelectorInput?.value || "").trim();
  const sendKey = normalizeChatChannelSendKey(chatChannelSendKeyInput?.value || "");
  const includeLinks = Boolean(chatChannelExtractLinksToggle?.checked);

  if (!url || !inputSelector || !message) {
    if (chatChannelOutput) {
      chatChannelOutput.textContent = "URL, input selector, and message are required.";
    }
    return;
  }

  if (chatChannelOutput) {
    chatChannelOutput.textContent = "Queueing backend chat channel...";
  }

  const payload = {
    url,
    inputSelector,
    message,
    sendSelector,
    responseSelector,
    sendKey,
    includeLinks
  };

  const data = await apiPost("/api/automation/chat-channel", payload);
  const jobId = String(data?.job?.id || "").trim();
  if (!jobId) {
    if (chatChannelOutput) {
      chatChannelOutput.textContent = "Chat-channel request queued with no job id.";
    }
    return;
  }

  if (chatChannelOutput) {
    chatChannelOutput.textContent = `Tracking chat-channel job ${jobId}`;
  }
  logEvent(`Chat-channel queued: ${jobId}`);

  trackJob(jobId, {
    onUpdate: (job) => {
      if (chatChannelOutput) {
        chatChannelOutput.textContent = `Chat-channel job ${job.status}`;
      }
    },
    onCompleted: (job) => {
      const reply = extractChatChannelReplyFromJob(job);
      if (chatChannelOutput) {
        chatChannelOutput.textContent = reply
          ? `Reply captured (${reply.length} chars).`
          : `Chat-channel completed (no reply extract).`;
      }
      pushMessage(
        "brain",
        reply || formatJobResult(job),
        `Chat Channel (${job.id})`
      );
      logEvent(`Chat-channel completed: ${job.id}`);
      refreshHealth();
    },
    onFailed: (job) => {
      const error = String(job?.error || "Unknown error");
      if (chatChannelOutput) {
        chatChannelOutput.textContent = `Chat-channel failed: ${error}`;
      }
      logEvent(`Chat-channel failed: ${error}`);
      refreshHealth();
    }
  });
}

document.getElementById("openChromeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = document.getElementById("chromeUrl").value.trim();
  if (!url) return;
  if (stealthMode) {
    logEvent("Blocked: Stealth Mode prevents visible Chrome launch.");
    return;
  }

  try {
    const data = await apiPost("/api/chrome/open", { url });
    logEvent(`Chrome launched: ${data.opened}`);
  } catch (error) {
    logEvent(`Open Chrome failed: ${error.message}`);
  }
});

document.getElementById("shotForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = document.getElementById("shotUrl").value.trim();
  const fileName = document.getElementById("shotFile").value.trim();
  if (!url) return;

  shotOutput.textContent = "Queued...";
  try {
    const data = await apiPost("/api/chrome/screenshot", { url, fileName });
    const jobId = data.job?.id;
    if (!jobId) {
      shotOutput.textContent = "No job id returned.";
      return;
    }

    shotOutput.textContent = `Tracking job: ${jobId}`;
    logEvent(`Screenshot queued: ${jobId}`);

    trackJob(jobId, {
      onUpdate: (job) => {
        shotOutput.textContent = `Job ${job.id}: ${job.status}`;
      },
      onCompleted: (job) => {
        shotOutput.textContent = `Saved: ${job.result?.outputPath || "unknown path"}`;
        logEvent(`Screenshot completed: ${job.id}`);
        refreshHealth();
      },
      onFailed: (job) => {
        shotOutput.textContent = `Failed: ${job.error || "Unknown error"}`;
        logEvent(`Screenshot failed: ${job.error || "Unknown error"}`);
        refreshHealth();
      }
    });
  } catch (error) {
    shotOutput.textContent = `Error: ${error.message}`;
    logEvent(`Screenshot request failed: ${error.message}`);
  }
});

if (chatChannelForm) {
  chatChannelForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await queueBackendChatChannel();
    } catch (error) {
      if (chatChannelOutput) {
        chatChannelOutput.textContent = `Chat-channel error: ${error.message}`;
      }
      logEvent(`Chat-channel request failed: ${error.message}`);
    }
  });
}

if (skillsRefreshBtn) {
  skillsRefreshBtn.addEventListener("click", () => {
    refreshSkillsList();
  });
}

if (skillsReloadBtn) {
  skillsReloadBtn.addEventListener("click", () => {
    reloadSkillsRegistry();
  });
}

if (skillsRunForm) {
  skillsRunForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!skillsSelect || !skillsOutput) return;

    const id = String(skillsSelect.value || "").trim();
    if (!id) {
      skillsOutput.textContent = "Select a skill to run.";
      return;
    }

    const rawInput = String(skillsInput?.value || "").trim();
    let input = {};
    if (rawInput) {
      try {
        input = JSON.parse(rawInput);
      } catch (_error) {
        input = { text: rawInput };
      }
    }

    try {
      skillsOutput.textContent = `Queued skill "${id}"...`;
      const data = await apiPost("/api/skills/run", { id, input });
      const jobId = data.job?.id;
      if (!jobId) {
        skillsOutput.textContent = "Skill queued with no job id.";
        return;
      }

      skillsOutput.textContent = `Tracking skill job: ${jobId}`;
      logEvent(`Skill queued: ${id} (${jobId})`);

      trackJob(jobId, {
        onUpdate: (job) => {
          skillsOutput.textContent = `Skill ${id}: ${job.status}`;
        },
        onCompleted: (job) => {
          skillsOutput.textContent = `Completed ${id}.`;
          pushMessage("brain", formatJobResult(job), `Skill ${id} (${job.id})`);
          refreshHealth();
        },
        onFailed: (job) => {
          skillsOutput.textContent = `Failed ${id}: ${job.error || "Unknown error"}`;
          logEvent(`Skill failed: ${job.error || "Unknown error"}`);
          refreshHealth();
        }
      });
    } catch (error) {
      skillsOutput.textContent = `Error: ${error.message}`;
      logEvent(`Skill run failed: ${error.message}`);
    }
  });
}

document.getElementById("openPadBtn").addEventListener("click", async () => {
  if (stealthMode) {
    logEvent("Blocked: Stealth Mode prevents opening PAD UI.");
    return;
  }

  try {
    const data = await apiPost("/api/pad/open");
    logEvent(`PAD opened: ${data.opened}`);
  } catch (error) {
    logEvent(`Open PAD failed: ${error.message}`);
  }
});

if (openPhoneModeBtn) {
  openPhoneModeBtn.addEventListener("click", () => {
    const popup = window.open("/phone-mode.html", "_blank", "noopener");
    if (!popup) {
      logEvent("Phone mode popup blocked by browser.");
      return;
    }
    logEvent("Opened Asolaria phone mode.");
  });
}

if (uiExperienceModeSelect) {
  uiExperienceModeSelect.addEventListener("change", () => {
    applyUiExperienceMode(uiExperienceModeSelect.value);
  });
}

if (voiceOutputModeSelect) {
  voiceOutputModeSelect.addEventListener("change", async () => {
    const requested = normalizeVoiceOutputMode(voiceOutputModeSelect.value, voiceOutputMode);
    try {
      const data = await apiPost("/api/settings", { voiceOutputMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Voice output mode set to ${voiceOutputMode}.`);
      refreshHealth();
    } catch (error) {
      voiceOutputModeSelect.value = voiceOutputMode;
      logEvent(`Voice output mode update failed: ${error.message}`);
    }
  });
}

if (voiceAutoSpeakSelect) {
  voiceAutoSpeakSelect.addEventListener("change", async () => {
    const requested = normalizeVoiceAutoSpeak(voiceAutoSpeakSelect.value, voiceAutoSpeakReplies);
    try {
      const data = await apiPost("/api/settings", { voiceAutoSpeakReplies: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Voice auto-speak ${voiceAutoSpeakReplies ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      voiceAutoSpeakSelect.value = voiceAutoSpeakReplies ? "on" : "off";
      logEvent(`Voice auto-speak update failed: ${error.message}`);
    }
  });
}

if (launchSpeakBtn) {
  launchSpeakBtn.addEventListener("click", async () => {
    await activateHumanLauncherMode("speak");
  });
}

if (natural20DailyBtn) {
  natural20DailyBtn.addEventListener("click", () => {
    void openNatural20Daily({ force: true });
  });
}

for (const card of [launchSimpleUiBtn, launchAdminUiBtn, launchSuperAdminUiBtn].filter(Boolean)) {
  card.addEventListener("click", () => {
    const target = normalizeUiExperienceMode(card.dataset.uiModeTarget || "", "simple");
    applyUiExperienceMode(target);
    if (target === "advanced") {
      setHumanLauncherStatus("Super Admin mode active. Brain and admin terminals are visible.", "live");
      return;
    }
    setHumanLauncherStatus(
      target === "admin"
        ? "Admin mode active."
        : "Simple mode active.",
      "live"
    );
  });
}

for (const tile of dashboardLauncherTiles) {
  tile.addEventListener("click", () => {
    handleDashboardLauncherAction(tile.dataset.dashboardAction || "");
  });
}

if (quickOpenAdvancedBtn) {
  quickOpenAdvancedBtn.addEventListener("click", () => {
    applyUiExperienceMode("advanced");
    setHumanLauncherStatus("Super Admin mode active. Brain and admin terminals are visible.", "live");
  });
}

if (quickOpenPhoneBtn) {
  quickOpenPhoneBtn.addEventListener("click", () => {
    if (openPhoneModeBtn) {
      openPhoneModeBtn.click();
      return;
    }
    const popup = window.open("/phone-mode.html", "_blank", "noopener");
    if (!popup) {
      logEvent("Phone mode popup blocked by browser.");
    }
  });
}

if (runtimeStartAsolariaBtn) {
  runtimeStartAsolariaBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("start_asolaria");
  });
}

if (runtimeStartPhoneBtn) {
  runtimeStartPhoneBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("start_phone");
  });
}

if (runtimeStartControlPlaneBtn) {
  runtimeStartControlPlaneBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("start_control_plane");
  });
}

if (runtimeStartControlPlaneSandboxBtn) {
  runtimeStartControlPlaneSandboxBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("start_control_plane_sandbox");
  });
}

if (runtimeAdbHealthBtn) {
  runtimeAdbHealthBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("run_adb_health");
  });
}

if (runtimeStopAsolariaBtn) {
  runtimeStopAsolariaBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("stop_asolaria");
  });
}

if (runtimeStopControlPlaneBtn) {
  runtimeStopControlPlaneBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("stop_control_plane");
  });
}

if (superAdminBrainWindowBtn) {
  superAdminBrainWindowBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("open_brain_terminal");
  });
}

if (superAdminAdminWindowBtn) {
  superAdminAdminWindowBtn.addEventListener("click", async () => {
    await runQuickRuntimeAction("open_admin_terminal");
  });
}

if (superAdminDirectOpenThreadBtn) {
  superAdminDirectOpenThreadBtn.addEventListener("click", () => {
    openSuperAdminDirectThread();
  });
}

if (superAdminDirectClearBtn) {
  superAdminDirectClearBtn.addEventListener("click", () => {
    if (superAdminDirectInput) {
      superAdminDirectInput.value = "";
      superAdminDirectInput.focus();
    }
    setSuperAdminDirectStatus("Direct draft cleared.", "live");
  });
}

if (superAdminDirectForm) {
  superAdminDirectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitSuperAdminDirectMessage();
  });
}

if (superCoderSetQualityBtn) {
  superCoderSetQualityBtn.addEventListener("click", async () => {
    try {
      setSuperCoderCockpitStatus("Locking quality mode...", "live");
      const data = await apiPost("/api/settings", { costMode: "quality" });
      applySettingsUi(data.settings || {});
      logEvent("Super coder cockpit locked runtime to quality mode.");
      await refreshHealth({ force: true });
      await refreshSuperCoderCockpit({ force: true });
    } catch (error) {
      setSuperCoderCockpitStatus(`Quality lock failed: ${error.message}`, "error");
      logEvent(`Super coder quality lock failed: ${error.message}`);
    }
  });
}

if (superCoderOpenSwarmDeskBtn) {
  superCoderOpenSwarmDeskBtn.addEventListener("click", () => {
    const target = String(
      superCoderLastSnapshot?.links?.civilizationUrl
      || "/swarm-civilization-preview.html"
    ).trim();
    const popup = window.open(target, "_blank", "noopener");
    if (!popup) {
      setSuperCoderCockpitStatus("Civilization popup blocked.", "warn");
      return;
    }
    setSuperCoderCockpitStatus("Civilization preview opened.", "live");
  });
}

if (superCoderOpenGraphBtn) {
  superCoderOpenGraphBtn.addEventListener("click", () => {
    const target = String(superCoderLastSnapshot?.links?.graphUrl || "/worker-runtime.html").trim();
    const popup = window.open(target, "_blank", "noopener");
    if (!popup) {
      setSuperCoderCockpitStatus("Graph popup blocked.", "warn");
      return;
    }
    setSuperCoderCockpitStatus("Graph opened.", "live");
  });
}

if (superCoderRefreshBtn) {
  superCoderRefreshBtn.addEventListener("click", async () => {
    await refreshSuperCoderCockpit({ force: true });
  });
}

if (adminTerminalCockpitAutoEnsure) {
  adminTerminalCockpitAutoEnsure.addEventListener("change", () => {
    persistAdminTerminalAutoEnsurePreference();
    renderAdminTerminalCockpit(adminTerminalCockpitLastSnapshot || { terminals: [], summary: { total: 0, online: 0, active: 0 } });
    setAdminTerminalCockpitStatus(
      adminTerminalCockpitAutoEnsure.checked
        ? "Auto-launch armed for Super Admin mode."
        : "Auto-launch disabled. Manual launch stays available.",
      "live"
    );
  });
}

if (adminTerminalCockpitEnsureBtn) {
  adminTerminalCockpitEnsureBtn.addEventListener("click", async () => {
    adminTerminalCockpitEnsureBtn.disabled = true;
    try {
      await ensureAdminTerminalCockpit({
        autoBootstrap: true,
        reason: "dashboard_launch_both"
      });
    } catch (error) {
      setAdminTerminalCockpitStatus(`Admin launch failed: ${error.message}`, "error");
    } finally {
      adminTerminalCockpitEnsureBtn.disabled = false;
    }
  });
}

if (adminTerminalCockpitRefreshBtn) {
  adminTerminalCockpitRefreshBtn.addEventListener("click", async () => {
    adminTerminalCockpitRefreshBtn.disabled = true;
    try {
      await refreshAdminTerminalCockpit();
    } finally {
      adminTerminalCockpitRefreshBtn.disabled = false;
    }
  });
}

if (adminTerminalCockpitRebriefBtn) {
  adminTerminalCockpitRebriefBtn.addEventListener("click", async () => {
    adminTerminalCockpitRebriefBtn.disabled = true;
    try {
      await ensureAdminTerminalCockpit({
        autoBootstrap: true,
        forceBootstrap: true,
        reason: "dashboard_rebrief_both"
      });
    } catch (error) {
      setAdminTerminalCockpitStatus(`Admin re-brief failed: ${error.message}`, "error");
    } finally {
      adminTerminalCockpitRebriefBtn.disabled = false;
    }
  });
}

if (adminTerminalCockpitStack) {
  adminTerminalCockpitStack.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target ? target.closest("button[data-admin-terminal-action]") : null;
    if (!button) {
      return;
    }
    const action = String(button.dataset.adminTerminalAction || "").trim();
    const terminalId = String(button.dataset.terminalId || "").trim().toLowerCase();
    if (!terminalId) {
      return;
    }
    button.disabled = true;
    try {
      if (action === "ensure") {
        await ensureAdminTerminalCockpit({
          terminalId,
          autoBootstrap: true,
          reason: "dashboard_ensure_single"
        });
      } else if (action === "rebrief") {
        await ensureAdminTerminalCockpit({
          terminalId,
          autoBootstrap: true,
          forceBootstrap: true,
          reason: "dashboard_rebrief_single"
        });
      } else if (action === "stop") {
        await stopAdminTerminalCockpit(terminalId);
      }
    } catch (error) {
      setAdminTerminalCockpitStatus(`${terminalId} action failed: ${error.message}`, "error");
    } finally {
      button.disabled = false;
    }
  });

  adminTerminalCockpitStack.addEventListener("submit", async (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form || String(form.dataset.adminTerminalForm || "") !== "prompt") {
      return;
    }
    event.preventDefault();
    const terminalId = String(form.dataset.terminalId || "").trim().toLowerCase();
    if (!terminalId) {
      return;
    }
    const textarea = form.querySelector("textarea[data-terminal-input]") instanceof HTMLTextAreaElement
      ? form.querySelector("textarea[data-terminal-input]")
      : null;
    const sendButton = form.querySelector("button[type='submit']") instanceof HTMLButtonElement
      ? form.querySelector("button[type='submit']")
      : null;
    const text = String(textarea?.value || "").trim();
    if (!text) {
      setAdminTerminalCockpitStatus(`Type a prompt for ${terminalId} first.`, "error");
      return;
    }
    if (sendButton) {
      sendButton.disabled = true;
    }
    try {
      const data = await apiPost("/api/admin-terminals/cockpit/prompt", {
        terminalId,
        text,
        source: "Asolaria Dashboard",
        reason: "dashboard_manual_prompt"
      });
      renderAdminTerminalCockpit({
        ...(adminTerminalCockpitLastSnapshot || {}),
        terminals: Array.isArray(adminTerminalCockpitLastSnapshot?.terminals)
          ? adminTerminalCockpitLastSnapshot.terminals.map((terminal) => (
            String(terminal?.id || "").trim().toLowerCase() === terminalId
              ? (data?.terminal || terminal)
              : terminal
          ))
          : [data?.terminal].filter(Boolean)
      });
      setAdminTerminalCockpitStatus(`Prompt queued for ${terminalId}.`, "live");
      if (textarea) {
        textarea.value = "";
      }
      await refreshAdminTerminalCockpit({ silent: true });
    } catch (error) {
      setAdminTerminalCockpitStatus(`Prompt failed: ${error.message}`, "error");
    } finally {
      if (sendButton) {
        sendButton.disabled = false;
      }
      if (textarea) {
        textarea.focus();
      }
    }
  });
}

if (quickVoiceToggleBtn) {
  quickVoiceToggleBtn.addEventListener("click", () => {
    if (quickVoiceListening || quickVoiceRequested) {
      stopQuickVoiceSession();
      return;
    }
    startQuickVoiceSession({ oneShot: false });
  });
}

if (quickVoicePushBtn) {
  quickVoicePushBtn.addEventListener("click", () => {
    if ((quickVoiceListening || quickVoiceRequested) && quickVoiceOneShot) {
      stopQuickVoiceSession();
      return;
    }
    startQuickVoiceSession({ oneShot: true });
  });
}

if (quickVoiceTestBtn) {
  quickVoiceTestBtn.addEventListener("click", async () => {
    try {
      await runManualVoiceOutputTest();
    } catch (error) {
      setQuickVoiceStatus(`Voice test failed: ${error.message}`, "error");
      setVoiceAvatarStatus(`Voice test failed: ${error.message}`, "error");
    }
  });
}

if (quickRealtimeSourceSelect) {
  quickRealtimeSourceSelect.addEventListener("change", () => {
    const nextSource = normalizeRealtimeCaptureSource(
      quickRealtimeSourceSelect.value,
      realtimeTranscribeState.captureSource
    );
    realtimeTranscribeState.captureSource = nextSource;
    syncQuickRealtimeCaptureSourceControl();
    refreshQuickRealtimeControls();
    if (!realtimeTranscribeState.active) {
      setQuickRealtimeStatus(
        `Ready for ${describeRealtimeCaptureSource(nextSource)}. ${buildRealtimeCapturePrompt(nextSource)}`,
        "live"
      );
    }
  });
}

if (quickRealtimeTranscriptSourceSelect) {
  quickRealtimeTranscriptSourceSelect.addEventListener("change", async () => {
    const nextSource = normalizeRealtimeTranscriptSource(
      quickRealtimeTranscriptSourceSelect.value,
      realtimeTranscribeState.transcriptSource
    );
    realtimeTranscribeState.transcriptSource = nextSource;
    syncQuickRealtimeTranscriptSourceControl();
    saveRealtimeFlowPrefs();
    refreshQuickRealtimeControls();
    const label = describeRealtimeTranscriptSource(nextSource);
    if (!realtimeTranscribeState.active) {
      setQuickRealtimeStatus(`Transcript source set to ${label}.`, "live");
      return;
    }
    if (realtimeTranscribeState.mode === "server_loopback" && nextSource !== "live") {
      try {
        const compat = await pullLiveTranscriptCompatSnapshot({
          source: nextSource,
          bridgeMaxEntries: 220
        });
        applyLiveTranscriptCompatSnapshot(compat);
      } catch (error) {
        setQuickRealtimeStatus(`Transcript source refresh failed: ${String(error?.message || error)}`, "error");
        return;
      }
    }
    if (nextSource === "live") {
      realtimeTranscribeState.lastCompatTranscript = "";
    }
    setQuickRealtimeStatus(`Transcript source: ${label}.`, "live");
  });
}

if (quickRealtimeBasicMeetBtn) {
  quickRealtimeBasicMeetBtn.addEventListener("click", async () => {
    try {
      await startQuickRealtimePreset("meet_caption");
    } catch (error) {
      setQuickRealtimeStatus(`Preset start failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickRealtimeBasicTabBtn) {
  quickRealtimeBasicTabBtn.addEventListener("click", async () => {
    try {
      await startQuickRealtimePreset("tab_audio");
    } catch (error) {
      setQuickRealtimeStatus(`Preset start failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickRealtimeBasicWindowBtn) {
  quickRealtimeBasicWindowBtn.addEventListener("click", async () => {
    try {
      await startQuickRealtimePreset("window_audio");
    } catch (error) {
      setQuickRealtimeStatus(`Preset start failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickRealtimeCopyBridgeABtn) {
  quickRealtimeCopyBridgeABtn.addEventListener("click", async () => {
    try {
      await copyMeetBridgeScriptForLane("A", quickRealtimeLaneAInput?.value || "meet_a");
    } catch (error) {
      setQuickRealtimeStatus(`Meeting A bridge failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickRealtimeCopyBridgeBBtn) {
  quickRealtimeCopyBridgeBBtn.addEventListener("click", async () => {
    try {
      await copyMeetBridgeScriptForLane("B", quickRealtimeLaneBInput?.value || "meet_b");
    } catch (error) {
      setQuickRealtimeStatus(`Meeting B bridge failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickRealtimeLaneAInput) {
  quickRealtimeLaneAInput.addEventListener("input", () => {
    quickRealtimeLaneAInput.value = getQuickRealtimeDualLaneId(quickRealtimeLaneAInput.value, "meet_a");
    updateQuickRealtimeDualLaneStatus();
  });
}

if (quickRealtimeLaneBInput) {
  quickRealtimeLaneBInput.addEventListener("input", () => {
    quickRealtimeLaneBInput.value = getQuickRealtimeDualLaneId(quickRealtimeLaneBInput.value, "meet_b");
    updateQuickRealtimeDualLaneStatus();
  });
}

if (quickRealtimePasteHelperBtn) {
  quickRealtimePasteHelperBtn.addEventListener("click", () => {
    openQuickRealtimePasteHelper();
  });
}

if (quickRealtimePasteHelperCopyBtn) {
  quickRealtimePasteHelperCopyBtn.addEventListener("click", async () => {
    const script = String(quickRealtimePasteHelperPayload.script || "").trim();
    if (!script) {
      setQuickRealtimeStatus("No bridge script available yet. Copy Script A/B first.", "error");
      return;
    }
    try {
      await copyTextToClipboard(script);
      setQuickRealtimeStatus("Bridge script copied again.", "live");
    } catch (error) {
      setQuickRealtimeStatus(`Copy failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickRealtimePasteHelperDialog) {
  quickRealtimePasteHelperDialog.addEventListener("close", () => {
    renderQuickRealtimePasteHelper();
  });
}

if (quickRealtimePasteHelperCloseBtn && quickRealtimePasteHelperDialog) {
  quickRealtimePasteHelperCloseBtn.addEventListener("click", () => {
    if (quickRealtimePasteHelperDialog.open) {
      quickRealtimePasteHelperDialog.close();
    }
  });
}

if (quickRealtimeBridgeTokenInput) {
  quickRealtimeBridgeTokenInput.addEventListener("input", () => {
    realtimeTranscribeState.bridgePushToken = normalizeRealtimeBridgePushToken(
      quickRealtimeBridgeTokenInput.value,
      realtimeTranscribeState.bridgePushToken
    );
    syncQuickRealtimeBridgeTokenControl();
    saveRealtimeBridgeTokenSession();
  });
}

if (quickRealtimeStartBtn) {
  quickRealtimeStartBtn.addEventListener("click", async () => {
    await startQuickRealtimeTranscription({
      captureSource: quickRealtimeSourceSelect?.value || realtimeTranscribeState.captureSource
    });
  });
}

if (quickRealtimeStopBtn) {
  quickRealtimeStopBtn.addEventListener("click", () => {
    stopQuickRealtimeTranscription({ reason: "Stopping captions..." });
  });
}

if (quickRealtimeClearBtn) {
  quickRealtimeClearBtn.addEventListener("click", () => {
    clearQuickRealtimeTranscript();
    if (!realtimeTranscribeState.active) {
      setQuickRealtimeStatus(`Idle. Ready for ${describeRealtimeCaptureSource(realtimeTranscribeState.captureSource)}.`);
    }
  });
}

if (quickRealtimeCopyBtn) {
  quickRealtimeCopyBtn.addEventListener("click", async () => {
    try {
      await copyQuickRealtimeTranscript();
    } catch (error) {
      setQuickRealtimeStatus(`Copy failed: ${error.message}`, "error");
    }
  });
}

if (quickRealtimeCopyLastBtn) {
  quickRealtimeCopyLastBtn.addEventListener("click", async () => {
    try {
      await copyQuickRealtimeLastLine();
    } catch (error) {
      setQuickRealtimeStatus(`Copy last line failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickRealtimeInstantAskBtn) {
  quickRealtimeInstantAskBtn.addEventListener("click", () => {
    runQuickRealtimeInstantAsk({ submit: true });
  });
}

if (quickRealtimeAutoCopyToggle) {
  quickRealtimeAutoCopyToggle.addEventListener("change", () => {
    realtimeTranscribeState.autoCopy = Boolean(quickRealtimeAutoCopyToggle.checked);
    saveRealtimeFlowPrefs();
    setQuickRealtimeStatus(
      realtimeTranscribeState.autoCopy
        ? "Auto-copy enabled for incoming lines."
        : "Auto-copy disabled.",
      "live"
    );
    refreshQuickRealtimeControls();
  });
}

if (quickRealtimeMirrorToChatToggle) {
  quickRealtimeMirrorToChatToggle.addEventListener("change", () => {
    realtimeTranscribeState.autoMirrorToChat = Boolean(quickRealtimeMirrorToChatToggle.checked);
    saveRealtimeFlowPrefs();
    setQuickRealtimeStatus(
      realtimeTranscribeState.autoMirrorToChat
        ? "Live lines will mirror into chat box and active console conversation."
        : "Live chat-box mirroring disabled.",
      "live"
    );
    refreshQuickRealtimeControls();
  });
}

if (quickInterviewQuestion) {
  quickInterviewQuestion.addEventListener("input", () => {
    updateQuickInterviewQuestionCounter();
    refreshQuickRealtimeControls();
  });
}

if (quickInterviewAskBtn) {
  quickInterviewAskBtn.addEventListener("click", () => {
    submitQuickInterviewQuestion();
  });
}

if (quickInterviewUseLastBtn) {
  quickInterviewUseLastBtn.addEventListener("click", () => {
    fillQuickInterviewWithLastLine();
  });
}

if (quickInterviewClearBtn) {
  quickInterviewClearBtn.addEventListener("click", () => {
    clearQuickInterviewQuestion();
    setQuickRealtimeStatus("Copilot question cleared.", "live");
  });
}

if (quickRealtimeBridgeBtn) {
  quickRealtimeBridgeBtn.addEventListener("click", async () => {
    try {
      const requestedSource = normalizeRealtimeCaptureSource(
        quickRealtimeSourceSelect?.value || realtimeTranscribeState.captureSource,
        realtimeTranscribeState.captureSource
      );
      const source = await ensureCaptionBridgeModeActive(requestedSource);
      const bridgePushToken = getQuickRealtimeBridgePushToken();
      const script = source === "custom_caption"
        ? buildCustomCaptionBridgeScript({
          sessionId: realtimeTranscribeState.sessionId,
          bridgeToken: bridgePushToken
        })
        : buildMeetCaptionBridgeScript({
          sessionId: realtimeTranscribeState.sessionId,
          bridgeToken: bridgePushToken
        });
      await copyTextToClipboard(script);
      const tokenHint = bridgePushToken ? " (token included)" : "";
      if (source === "custom_caption") {
        setQuickRealtimeStatus(`Custom bridge script copied${tokenHint}. Paste and run it in the target tab DevTools console.`, "live");
      } else {
        setQuickRealtimeStatus(`Meet bridge script copied${tokenHint}. Paste and run it in Meet tab DevTools console.`, "live");
      }
    } catch (error) {
      setQuickRealtimeStatus(`Bridge copy failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickFlowMasterToggle) {
  quickFlowMasterToggle.addEventListener("click", () => {
    setRealtimeFlowMonitorEnabled(!realtimeTranscribeState.flowMonitorEnabled);
    setQuickRealtimeStatus(
      realtimeTranscribeState.flowMonitorEnabled
        ? "Flow monitor enabled."
        : "Flow monitor disabled.",
      "live"
    );
  });
}

if (quickFlowAnalyzeToggle) {
  quickFlowAnalyzeToggle.addEventListener("click", () => {
    void setRealtimeFlowAnalysisEnabled(!realtimeTranscribeState.flowAnalysisEnabled);
  });
}

if (quickFlowRefreshBtn) {
  quickFlowRefreshBtn.addEventListener("click", async () => {
    try {
      await pollMeetCaptionBridgeLaneStatusOnce();
      await pollMeetCaptionBridgeOnce();
      setQuickRealtimeStatus("Flow lanes refreshed.", "live");
    } catch (error) {
      setQuickRealtimeStatus(`Flow refresh failed: ${String(error?.message || error)}`, "error");
    }
  });
}

if (quickFlowProbeBtn) {
  quickFlowProbeBtn.addEventListener("click", () => {
    void runRealtimeFlowLaneProbe(String(quickFlowProbeLane?.value || ""));
  });
}

if (quickFlowBoard) {
  quickFlowBoard.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const routeBtn = target.closest("[data-lane-id]");
    if (routeBtn instanceof HTMLElement) {
      const laneId = normalizeRealtimeFlowLaneId(routeBtn.dataset.laneId || "default");
      const outgoingEnabled = String(routeBtn.dataset.outgoingEnabled || "0") === "1";
      void setRealtimeFlowLaneOutgoingRoute(laneId, !outgoingEnabled);
      return;
    }
    const probeBtn = target.closest("[data-flow-probe-lane]");
    if (probeBtn instanceof HTMLElement) {
      const laneId = normalizeRealtimeFlowLaneId(probeBtn.dataset.flowProbeLane || "default");
      if (quickFlowProbeLane) {
        quickFlowProbeLane.value = laneId;
      }
      void runRealtimeFlowLaneProbe(laneId);
    }
  });
}

if (quickOpenAvatarStageBtn) {
  quickOpenAvatarStageBtn.addEventListener("click", () => {
    setAvatarStageOpen(true);
  });
}

if (avatarStageCloseBtn) {
  const closeAvatarStage = (event) => {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }
    setAvatarStageOpen(false);
  };
  avatarStageCloseBtn.addEventListener("click", closeAvatarStage);
  avatarStageCloseBtn.addEventListener("mousedown", closeAvatarStage);
  avatarStageCloseBtn.addEventListener("touchstart", closeAvatarStage);
  avatarStageCloseBtn.addEventListener("pointerup", closeAvatarStage);
}

if (avatarStageOverlay) {
  avatarStageOverlay.addEventListener("click", (event) => {
    if (event.target === avatarStageOverlay) {
      setAvatarStageOpen(false);
    }
  });
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) return;
  if (target.closest("#avatarStageCloseBtn")) {
    setAvatarStageOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && avatarStageOpen) {
    setAvatarStageOpen(false);
  }
});

document.addEventListener("keydown", handleQuickRealtimeHotkeys);

if (avatarStagePushTalkBtn) {
  avatarStagePushTalkBtn.addEventListener("click", () => {
    if (quickVoiceListening && quickVoiceOneShot) {
      stopQuickVoiceSession();
      return;
    }
    setAvatarStageOpen(true);
    startQuickVoiceSession({ oneShot: true });
  });
}

if (avatarStageTestSpeakBtn) {
  avatarStageTestSpeakBtn.addEventListener("click", async () => {
    setAvatarStageOpen(true);
    try {
      await runManualVoiceOutputTest();
    } catch (error) {
      setQuickVoiceStatus(`Voice test failed: ${error.message}`, "error");
    }
  });
}

if (voiceOutputModeRuntimeSelect) {
  voiceOutputModeRuntimeSelect.addEventListener("change", () => {
    const next = normalizeVoiceOutputMode(voiceOutputModeRuntimeSelect.value, voiceOutputMode);
    voiceOutputMode = next;
    voiceAvatarDirty = true;
    if (voiceOutputModeSelect) {
      voiceOutputModeSelect.value = next;
    }
    syncVoiceAvatarControlState({ skipFocused: true });
    setVoiceAvatarStatus("Unsaved change: output mode.", "live");
  });
}

if (voiceEnabledSelect) {
  voiceEnabledSelect.addEventListener("change", () => {
    voiceEnabled = normalizeOnOff(voiceEnabledSelect.value, voiceEnabled);
    voiceAvatarDirty = true;
    syncVoiceAvatarControlState({ skipFocused: true });
    setVoiceAvatarStatus("Unsaved change: voice toggle.", "live");
  });
}

if (avatarEnabledSelect) {
  avatarEnabledSelect.addEventListener("change", () => {
    avatarEnabled = normalizeOnOff(avatarEnabledSelect.value, avatarEnabled);
    voiceAvatarDirty = true;
    setAvatarVisualState(avatarVisualState);
    syncVoiceAvatarControlState({ skipFocused: true });
    setVoiceAvatarStatus("Unsaved change: avatar toggle.", "live");
  });
}

if (avatarModeSelect) {
  avatarModeSelect.addEventListener("change", () => {
    avatarMode = normalizeAvatarMode(avatarModeSelect.value, avatarMode);
    voiceAvatarDirty = true;
    setAvatarVisualState(avatarVisualState);
    syncVoiceAvatarControlState({ skipFocused: true });
    setVoiceAvatarStatus("Unsaved change: avatar mode.", "live");
  });
}

if (voiceInputCaptureModeSelect) {
  voiceInputCaptureModeSelect.addEventListener("change", () => {
    voiceInputCaptureMode = normalizeVoiceInputCaptureMode(
      voiceInputCaptureModeSelect.value,
      voiceInputCaptureMode
    );
    voiceAvatarDirty = true;
    setVoiceAvatarStatus("Unsaved change: input capture mode.", "live");
  });
}

if (voiceInputDeviceSelect) {
  voiceInputDeviceSelect.addEventListener("change", () => {
    voiceInputDevice = normalizeVoiceInputDevice(
      voiceInputDeviceSelect.value,
      voiceInputDevice
    );
    voiceAvatarDirty = true;
    setVoiceAvatarStatus("Unsaved change: input device.", "live");
  });
}

if (voiceOutputDeviceIdSelect) {
  voiceOutputDeviceIdSelect.addEventListener("change", () => {
    voiceOutputDeviceId = normalizeVoiceOutputDeviceId(
      voiceOutputDeviceIdSelect.value,
      voiceOutputDeviceId
    );
    voiceAvatarDirty = true;
    setVoiceAvatarStatus("Unsaved change: output device.", "live");
  });
}

if (voiceAudioDevicesRefreshBtn) {
  voiceAudioDevicesRefreshBtn.addEventListener("click", async () => {
    try {
      await refreshVoiceAudioDevices({ force: true });
    } catch (error) {
      setVoiceAudioDevicesStatus(`Audio device refresh failed: ${error.message}`, "error");
    }
  });
}

if (voiceWakeWordInput) {
  voiceWakeWordInput.addEventListener("change", () => {
    voiceWakeWord = normalizeWakeWord(voiceWakeWordInput.value, voiceWakeWord);
    voiceAvatarDirty = true;
    if (voiceWakeWordInput.value !== voiceWakeWord) {
      voiceWakeWordInput.value = voiceWakeWord;
    }
    setVoiceAvatarStatus("Unsaved change: wake word.", "live");
  });
}

if (kittyTtsUrlInput) {
  kittyTtsUrlInput.addEventListener("change", () => {
    kittyTtsUrl = normalizeOptionalUrl(kittyTtsUrlInput.value, kittyTtsUrl);
    voiceAvatarDirty = true;
    if (kittyTtsUrlInput.value !== kittyTtsUrl) {
      kittyTtsUrlInput.value = kittyTtsUrl;
    }
    setVoiceAvatarStatus("Unsaved change: Kitty URL.", "live");
  });
}

if (kittyTtsApiKeyInput) {
  kittyTtsApiKeyInput.addEventListener("input", () => {
    voiceAvatarDirty = true;
    setVoiceAvatarStatus("Unsaved change: Kitty API key.", "live");
  });
}

if (voiceAvatarSaveBtn) {
  voiceAvatarSaveBtn.addEventListener("click", async () => {
    try {
      await saveVoiceAvatarSettings();
      refreshHealth();
    } catch (error) {
      setVoiceAvatarStatus(`Save failed: ${error.message}`, "error");
      logEvent(`Voice/avatar save failed: ${error.message}`);
    }
  });
}

if (voiceAvatarTestBtn) {
  voiceAvatarTestBtn.addEventListener("click", async () => {
    try {
      await saveVoiceAvatarSettings();
      await runManualVoiceOutputTest();
      refreshHealth();
    } catch (error) {
      setVoiceAvatarStatus(`Test failed: ${error.message}`, "error");
      logEvent(`Voice/avatar test failed: ${error.message}`);
    }
  });
}

if (stealthToggle) {
  stealthToggle.addEventListener("change", async () => {
    const next = Boolean(stealthToggle.checked);
    try {
      const data = await apiPost("/api/settings", { stealthMode: next });
      applySettingsUi(data.settings || {});
      logEvent(`Stealth Mode ${data.settings?.stealthMode ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      stealthToggle.checked = stealthMode;
      logEvent(`Stealth toggle failed: ${error.message}`);
    }
  });
}

if (approvalModeSelect) {
  approvalModeSelect.addEventListener("change", async () => {
    const requested = normalizeApprovalMode(approvalModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { approvalMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Approval mode set to ${approvalMode}.`);
      refreshHealth();
    } catch (error) {
      approvalModeSelect.value = approvalMode;
      logEvent(`Approval mode update failed: ${error.message}`);
    }
  });
}

if (costModeSelect) {
  costModeSelect.addEventListener("change", async () => {
    const requested = normalizeCostMode(costModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { costMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Cost mode set to ${costMode}.`);
      refreshHealth();
    } catch (error) {
      costModeSelect.value = costMode;
      logEvent(`Cost mode update failed: ${error.message}`);
    }
  });
}

if (codexWebSearchSelect) {
  codexWebSearchSelect.addEventListener("change", async () => {
    const requested = normalizeCodexWebSearch(codexWebSearchSelect.value);
    try {
      const data = await apiPost("/api/settings", { codexWebSearch: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Codex web search ${codexWebSearch ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      codexWebSearchSelect.value = codexWebSearch ? "on" : "off";
      logEvent(`Codex web search update failed: ${error.message}`);
    }
  });
}

if (openclawModeSelect) {
  openclawModeSelect.addEventListener("change", async () => {
    const requested = normalizeOpenclawMode(openclawModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { openclawMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`OpenClaw mode set to ${openclawMode}.`);
      refreshHealth();
    } catch (error) {
      openclawModeSelect.value = openclawMode;
      logEvent(`OpenClaw mode update failed: ${error.message}`);
    }
  });
}

if (allowExternalPostingToggle) {
  allowExternalPostingToggle.addEventListener("change", async () => {
    const requested = Boolean(allowExternalPostingToggle.checked);
    try {
      const data = await apiPost("/api/settings", { allowExternalPosting: requested });
      applySettingsUi(data.settings || {});
      logEvent(`allowExternalPosting set to ${allowExternalPosting}.`);
      refreshHealth();
    } catch (error) {
      allowExternalPostingToggle.checked = allowExternalPosting;
      logEvent(`allowExternalPosting update failed: ${error.message}`);
    }
  });
}

if (saveGuardianModeBtn && guardianModeSelect) {
  saveGuardianModeBtn.addEventListener("click", async () => {
    const requested = normalizeGuardianMode(guardianModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { guardianMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian mode set to ${guardianMode}.`);
      refreshHealth();
    } catch (error) {
      guardianModeSelect.value = guardianMode;
      logEvent(`Guardian mode update failed: ${error.message}`);
    }
  });
}

if (saveGuardianThresholdBtn && guardianRiskThresholdSelect) {
  saveGuardianThresholdBtn.addEventListener("click", async () => {
    const requested = normalizeGuardianRiskThreshold(guardianRiskThresholdSelect.value);
    try {
      const data = await apiPost("/api/settings", { guardianRiskThreshold: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian risk threshold set to ${guardianRiskThreshold}.`);
      refreshHealth();
    } catch (error) {
      guardianRiskThresholdSelect.value = guardianRiskThreshold;
      logEvent(`Guardian threshold update failed: ${error.message}`);
    }
  });
}

if (guardianAlertsEnabledToggle) {
  guardianAlertsEnabledToggle.addEventListener("change", async () => {
    const requested = Boolean(guardianAlertsEnabledToggle.checked);
    try {
      const data = await apiPost("/api/settings", { guardianAlertsEnabled: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian alerts ${guardianAlertsEnabled ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      guardianAlertsEnabledToggle.checked = guardianAlertsEnabled;
      logEvent(`Guardian alerts update failed: ${error.message}`);
    }
  });
}

if (guardianAutoBlockCriticalToggle) {
  guardianAutoBlockCriticalToggle.addEventListener("change", async () => {
    const requested = Boolean(guardianAutoBlockCriticalToggle.checked);
    try {
      const data = await apiPost("/api/settings", { guardianAutoBlockCritical: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian auto-block critical ${guardianAutoBlockCritical ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      guardianAutoBlockCriticalToggle.checked = guardianAutoBlockCritical;
      logEvent(`Guardian auto-block update failed: ${error.message}`);
    }
  });
}

if (saveMemoryWindowBtn) {
  saveMemoryWindowBtn.addEventListener("click", async () => {
    const requested = normalizeMemoryWindow(memoryWindowTurnsInput?.value);
    try {
      const data = await apiPost("/api/settings", { memoryWindowTurns: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Memory window set to ${memoryWindowTurns} turns.`);
      refreshHealth();
    } catch (error) {
      if (memoryWindowTurnsInput) {
        memoryWindowTurnsInput.value = String(memoryWindowTurns);
      }
      logEvent(`Memory window update failed: ${error.message}`);
    }
  });
}

document.querySelectorAll(".openclaw-action").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = String(button.dataset.action || "").trim();
    if (!action) return;

    try {
      await queueOpenclawAction(action);
    } catch (error) {
      if (openclawOutput) {
        openclawOutput.textContent = `Error: ${error.message}`;
      }
      logEvent(`OpenClaw request failed: ${error.message}`);
    }
  });
});

if (openclawCronRunForm) {
  openclawCronRunForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = String(openclawCronName?.value || "").trim();
    if (!name) {
      if (openclawOutput) openclawOutput.textContent = "Cron name is required.";
      return;
    }

    try {
      await queueOpenclawAction("cron_run", { name });
    } catch (error) {
      if (openclawOutput) {
        openclawOutput.textContent = `Error: ${error.message}`;
      }
      logEvent(`OpenClaw cron run failed: ${error.message}`);
    }
  });
}

if (gatewayAuditRefreshBtn) {
  gatewayAuditRefreshBtn.addEventListener("click", () => {
    refreshGatewayAuditPanel();
  });
}

if (gatewayAuditVerifyBtn) {
  gatewayAuditVerifyBtn.addEventListener("click", () => {
    verifyGatewayAuditChain();
  });
}

if (gatewayReadinessDrillBtn) {
  gatewayReadinessDrillBtn.addEventListener("click", () => {
    runGatewayReadinessDrill();
  });
}

if (gatewayHeartbeatRunBtn) {
  gatewayHeartbeatRunBtn.addEventListener("click", () => {
    runGatewayHeartbeat();
  });
}

if (gatewayStartSandboxBtn) {
  gatewayStartSandboxBtn.addEventListener("click", () => {
    startGatewaySandboxRemediation();
  });
}

if (gatewayAuditTypeSelect) {
  gatewayAuditTypeSelect.addEventListener("change", () => {
    refreshGatewayAuditPanel({ silent: true });
  });
}

if (railFilter) {
  railFilter.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest(".rail-filter-btn");
    if (!button) {
      return;
    }
    const group = String(button.dataset.group || "all").trim().toLowerCase() || "all";
    applyActionGroupFilter(group);
  });
}

if (projectNav) {
  projectNav.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest(".project-pill");
    if (!button) {
      return;
    }
    const scopeId = String(button.dataset.project || "all");
    applyProjectScope(scopeId, { syncGroupFilter: true, refreshLedger: true });
  });
}

if (projectFolderSearch) {
  projectFolderSearch.addEventListener("input", () => {
    renderProjectFolderTree(activeProjectScope);
  });
}

if (projectRefreshBtn) {
  projectRefreshBtn.addEventListener("click", async () => {
    try {
      await refreshProjectScopes({
        preferredScopeId: activeProjectScope,
        syncGroupFilter: true,
        refreshLedger: true
      });
    } catch (error) {
      setProjectAdminMessage(`Refresh failed: ${error.message}`, true);
      logEvent(`Project refresh failed: ${error.message}`);
    }
  });
}

if (projectCreateBtn) {
  projectCreateBtn.addEventListener("click", async () => {
    try {
      await createProjectFromUi();
    } catch (error) {
      setProjectAdminMessage(`Create failed: ${error.message}`, true);
      logEvent(`Project create failed: ${error.message}`);
    }
  });
}

if (projectUpdateBtn) {
  projectUpdateBtn.addEventListener("click", async () => {
    try {
      await updateSelectedProjectFromUi();
    } catch (error) {
      setProjectAdminMessage(`Update failed: ${error.message}`, true);
      logEvent(`Project update failed: ${error.message}`);
    }
  });
}

if (projectDeleteBtn) {
  projectDeleteBtn.addEventListener("click", async () => {
    try {
      await deleteSelectedProjectFromUi();
    } catch (error) {
      setProjectAdminMessage(`Delete failed: ${error.message}`, true);
      logEvent(`Project delete failed: ${error.message}`);
    }
  });
}

if (antigravityStatusBtn) {
  antigravityStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("antigravity status", "Antigravity Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Antigravity status failed: ${error.message}`);
    }
  });
}

if (cursorStatusBtn) {
  cursorStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("cursor status", "Cursor Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Cursor status failed: ${error.message}`);
    }
  });
}

if (anthropicStatusBtn) {
  anthropicStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("anthropic status", "Anthropic Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Anthropic status failed: ${error.message}`);
    }
  });
}

if (geminiCliStatusBtn) {
  geminiCliStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("gemini cli status", "Gemini CLI Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Gemini CLI status failed: ${error.message}`);
    }
  });
}

if (externalProviderSelect) {
  externalProviderSelect.addEventListener("change", async () => {
    externalMcpUiDirty = false;
    refreshExternalModelInputUi({ syncValue: true, forceValue: true });
    await refreshExternalMcpProviderStatus({
      provider: externalProviderSelect.value,
      silent: true
    });
  });
}

[externalMcpTokenReductionProfileSelect, externalMcpToolSchemaModeSelect].forEach((element) => {
  if (!element) return;
  element.addEventListener("change", () => {
    externalMcpUiDirty = true;
  });
});

[externalMcpPromptTokenLimitInput, externalMcpContextKeyInput, externalMcpSkillHintsInput, externalMcpWebHintsInput].forEach((element) => {
  if (!element) return;
  element.addEventListener("input", () => {
    externalMcpUiDirty = true;
  });
});

if (externalSaveDefaultBtn) {
  externalSaveDefaultBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    const model = normalizeExternalDefaultModelValue(externalModelInput?.value || "");
    try {
      await saveExternalDefaultModel(provider, model);
      if (externalOutput) {
        externalOutput.textContent = model
          ? `Default model saved for ${provider}: ${model}`
          : `Default model cleared for ${provider}.`;
      }
      refreshHealth();
      await refreshExternalModelAliases({ silent: true });
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Save default model failed: ${error.message}`);
    }
  });
}

if (externalClearDefaultBtn) {
  externalClearDefaultBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    try {
      await saveExternalDefaultModel(provider, "");
      if (externalOutput) {
        externalOutput.textContent = `Default model cleared for ${provider}.`;
      }
      if (externalModelInput) {
        externalModelInput.value = "";
      }
      refreshHealth();
      await refreshExternalModelAliases({ silent: true });
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Clear default model failed: ${error.message}`);
    }
  });
}

if (externalClearObservedBtn) {
  externalClearObservedBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    try {
      await clearObservedExternalModels(provider);
      if (externalOutput) {
        externalOutput.textContent = `Observed models cleared for ${provider}.`;
      }
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Clear observed models failed: ${error.message}`);
    }
  });
}

if (externalClearObservedAllBtn) {
  externalClearObservedAllBtn.addEventListener("click", async () => {
    try {
      await clearObservedExternalModels("all");
      if (externalOutput) {
        externalOutput.textContent = "Observed models cleared for all providers.";
      }
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Clear observed models (all) failed: ${error.message}`);
    }
  });
}

if (externalPruneObservedBtn) {
  externalPruneObservedBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    const maxAgeDays = readExternalObservedMaxAgeDays();
    try {
      const data = await pruneObservedExternalModels(provider, maxAgeDays);
      if (externalOutput) {
        externalOutput.textContent = `Observed models pruned for ${data.target || provider}: removed ${Number(data.removed || 0)} older than ${maxAgeDays} day(s).`;
      }
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Prune observed models failed: ${error.message}`);
    }
  });
}

if (externalSaveObservedPruneSettingsBtn) {
  externalSaveObservedPruneSettingsBtn.addEventListener("click", async () => {
    const enabled = Boolean(externalObservedAutoPruneEnabledToggle?.checked);
    const maxAgeDays = readExternalObservedAutoPruneDays();
    const dailyHourLocal = readExternalObservedAutoPruneHour();
    try {
      const data = await apiPost("/api/settings", {
        externalObservedPruneEnabled: enabled,
        externalObservedPruneMaxAgeDays: maxAgeDays,
        externalObservedPruneDailyHourLocal: dailyHourLocal
      });
      applySettingsUi(data.settings || {});
      await refreshHealth();
      const hourText = `${String(dailyHourLocal).padStart(2, "0")}:00`;
      if (externalOutput) {
        externalOutput.textContent = `Auto-prune ${enabled ? "enabled" : "disabled"} (window ${maxAgeDays} day(s), hour ${hourText} local).`;
      }
      logEvent(`Observed model auto-prune saved: enabled=${enabled}, days=${maxAgeDays}, hour=${dailyHourLocal}.`);
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Save auto-prune settings failed: ${error.message}`);
    }
  });
}

if (externalModelStatusBtn) {
  externalModelStatusBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    try {
      await showExternalModelSettings(provider);
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Model settings lookup failed: ${error.message}`);
    }
  });
}

if (externalRunForm) {
  externalRunForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    let model = normalizeExternalDefaultModelValue(externalModelInput?.value || "");
    if (!model) {
      model = getExternalDefaultModel(provider);
    }
    const prompt = String(externalPrompt?.value || "").trim();
    if (!provider || !prompt) {
      if (externalOutput) externalOutput.textContent = "Provider and prompt are required.";
      return;
    }
    const mcpRunOptions = readExternalMcpRunOptions();

    try {
      if (externalModelInput) {
        externalModelInput.value = model;
      }
      try {
        await saveExternalDefaultModel(provider, model, { silent: true });
      } catch (error) {
        logEvent(`External model default save failed: ${error.message}`);
      }
      await queueExternalProvider(provider, prompt, {
        model,
        ...mcpRunOptions
      });
      externalMcpUiDirty = false;
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`External provider run failed: ${error.message}`);
    }
  });
}

if (guardianStatusBtn) {
  guardianStatusBtn.addEventListener("click", async () => {
    try {
      const data = await request("/api/guardian/status");
      if (guardianOutput) {
        guardianOutput.textContent = `Contacts=${data.summary?.profile?.contacts?.length || 0}, alerts=${data.alerts?.total || 0}`;
      }
      pushMessage("brain", JSON.stringify(data, null, 2), "Guardian Status");
    } catch (error) {
      if (guardianOutput) guardianOutput.textContent = `Error: ${error.message}`;
      logEvent(`Guardian status failed: ${error.message}`);
    }
  });
}

if (guardianBootstrapContactsBtn) {
  guardianBootstrapContactsBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/guardian/profile/bootstrap");
      if (guardianOutput) {
        guardianOutput.textContent = `Guardian contacts ready (${data.profile?.contacts?.length || 0}).`;
      }
      pushMessage("brain", JSON.stringify(data.profile || {}, null, 2), "Guardian Contacts");
      refreshHealth();
    } catch (error) {
      if (guardianOutput) guardianOutput.textContent = `Error: ${error.message}`;
      logEvent(`Guardian bootstrap failed: ${error.message}`);
    }
  });
}

if (guardianTestAlertBtn) {
  guardianTestAlertBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/guardian/alert/test");
      if (guardianOutput) {
        guardianOutput.textContent = `Guardian test alert sent (${data.result?.alertId || "unknown"}).`;
      }
      pushMessage("brain", JSON.stringify(data.result || {}, null, 2), "Guardian Alert Test");
      refreshHealth();
    } catch (error) {
      if (guardianOutput) guardianOutput.textContent = `Error: ${error.message}`;
      logEvent(`Guardian test alert failed: ${error.message}`);
    }
  });
}

if (companyMissionBtn) {
  companyMissionBtn.addEventListener("click", async () => {
    try {
      const data = await request("/api/company/mission");
      pushMessage("brain", data.mission || "No mission text.", "Company Mission");
      logEvent("Loaded Company mission policy.");
    } catch (error) {
      logEvent(`Company mission failed: ${error.message}`);
    }
  });
}

if (companyCreateAccountBtn) {
  companyCreateAccountBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/company/primary-signin/bootstrap", {
        displayName: "Asolaria"
      });
      const account = data.account || null;
      if (companyAccountOutput) {
        companyAccountOutput.textContent = account
          ? `AI account profile secured for ${account.usernameMasked || account.username || "Asolaria"}.`
          : "No account response.";
      }
      pushMessage("brain", JSON.stringify(account || {}, null, 2), "Company Account");
      refreshHealth();
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company account bootstrap failed: ${error.message}`);
    }
  });
}

if (companyShowAccountBtn) {
  companyShowAccountBtn.addEventListener("click", async () => {
    try {
      await showCompanyAccountMasked();
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company account status failed: ${error.message}`);
    }
  });
}

if (companyRevealAccountBtn) {
  companyRevealAccountBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/company/primary-signin/reveal", {
        confirm: true,
        confirmText: "I_UNDERSTAND_SECRET_REVEAL"
      });
      const account = data.account || {};
      if (companyAccountOutput) {
        companyAccountOutput.textContent = "Sensitive account data revealed in chat output.";
      }
      pushMessage("brain", JSON.stringify(account, null, 2), "Company Secret");
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company reveal failed: ${error.message}`);
    }
  });
}

if (companyMarkRegisteredBtn) {
  companyMarkRegisteredBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/company/primary-signin/mark-registered", {
        notes: "Marked as registered via Asolaria UI."
      });
      const account = data.account || {};
      if (companyAccountOutput) {
        companyAccountOutput.textContent = `Company status updated to ${account.status || "registered"}.`;
      }
      pushMessage("brain", JSON.stringify(account, null, 2), "Company Account");
      refreshHealth();
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company mark-registered failed: ${error.message}`);
    }
  });
}

if (companyOpenSiteBtn) {
  companyOpenSiteBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("company open", "Company Portal");
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company open-site failed: ${error.message}`);
    }
  });
}

if (companyDraftBtn) {
  companyDraftBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("company draft post", "Company Draft");
    } catch (error) {
      logEvent(`Company draft failed: ${error.message}`);
    }
  });
}

if (companyDecideBtn) {
  companyDecideBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("company decide proceed", "Company Decision");
    } catch (error) {
      logEvent(`Company decision failed: ${error.message}`);
    }
  });
}

document.getElementById("padRunForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const packagePath = document.getElementById("padPackage").value.trim();
  const mode = document.getElementById("padMode").value;
  const disableScreenshots = document.getElementById("padDisableShots").checked;
  if (!packagePath) return;

  logEvent("PAD run queued...");
  try {
    const data = await apiPost("/api/pad/run", { packagePath, mode, disableScreenshots });
    const jobId = data.job?.id;
    if (!jobId) {
      logEvent("PAD run request returned no job id.");
      return;
    }

    logEvent(`Tracking PAD job ${jobId}`);
    trackJob(jobId, {
      onCompleted: (job) => {
        logEvent(`PAD job completed: ${job.id}`);
        refreshHealth();
      },
      onFailed: (job) => {
        logEvent(`PAD job failed: ${job.error || "Unknown error"}`);
        refreshHealth();
      }
    });
  } catch (error) {
    logEvent(`PAD run failed: ${error.message}`);
  }
});

if (refreshMemoryBtn) {
  refreshMemoryBtn.addEventListener("click", () => {
    refreshMemory();
  });
}

if (clearMemoryBtn) {
  clearMemoryBtn.addEventListener("click", async () => {
    const proceed = window.confirm("Clear memory turns now? A backup snapshot and notebook audit note will be created.");
    if (!proceed) {
      return;
    }
    try {
      const result = await apiDelete("/api/memory", {
        confirm: "APPROVE_MEMORY_CLEAR"
      });
      const backupPath = String(result?.memory?.backupPath || "").trim();
      if (backupPath) {
        logEvent(`Memory cleared. Backup saved: ${backupPath}`);
      } else {
        logEvent("Memory cleared.");
      }
      refreshMemory();
      refreshHealth();
    } catch (error) {
      logEvent(`Clear memory failed: ${error.message}`);
    }
  });
}

if (taskLedgerRefreshBtn) {
  taskLedgerRefreshBtn.addEventListener("click", () => {
    refreshTaskLedger();
  });
}

if (taskLedgerAddBtn) {
  taskLedgerAddBtn.addEventListener("click", async () => {
    try {
      const created = await createTaskLedgerTaskFromUi();
      logEvent(`Task created: ${created.task?.id || "unknown"}`);
      refreshTaskLedger();
      refreshHealth();
    } catch (error) {
      logEvent(`Task create failed: ${error.message}`);
    }
  });
}

if (taskLedgerStatusFilter) {
  taskLedgerStatusFilter.addEventListener("change", () => {
    refreshTaskLedger({ silent: true });
  });
}

if (taskLedgerPriorityFilter) {
  taskLedgerPriorityFilter.addEventListener("change", () => {
    refreshTaskLedger({ silent: true });
  });
}

if (taskLedgerIncludeArchived) {
  taskLedgerIncludeArchived.addEventListener("change", () => {
    refreshTaskLedger({ silent: true });
  });
}

if (taskLedgerQuery) {
  taskLedgerQuery.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      refreshTaskLedger({ silent: true });
    }
  });
}

if (taskLedgerList) {
  taskLedgerList.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || target.tagName !== "BUTTON") {
      return;
    }
    const taskId = String(target.dataset.taskId || "").trim();
    const action = String(target.dataset.action || "").trim();
    if (!taskId || !action) {
      return;
    }
    target.disabled = true;
    try {
      await handleTaskLedgerAction(action, taskId);
      logEvent(`Task ${taskId}: ${action}`);
      refreshTaskLedger({ silent: true });
      refreshHealth();
    } catch (error) {
      logEvent(`Task action failed (${action}): ${error.message}`);
    } finally {
      target.disabled = false;
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && avatarStageOpen) {
    setAvatarStageOpen(false);
  }
});

window.addEventListener("beforeunload", () => {
  stopQuickRealtimeTranscription();
});

loadFocusTurnoverState();
loadSafetyMetricsState();
loadChatWorkspaceState();
loadUiExperienceModeState();
startupBootstrapForced = isStartupBootstrapRequestedByUrl();
setStartupBootstrapActive(startupBootstrapForced);
const startupUiModePreset = getUiModePresetFromUrl();
if (startupUiModePreset) {
  applyUiExperienceMode(startupUiModePreset, { silent: true });
  setHumanLauncherStatus(
    startupBootstrapForced
      ? `Startup monitor active. Launch preset: ${startupUiModePreset}.`
      : `Launch preset active: ${startupUiModePreset}.`,
    "live"
  );
} else {
  setHumanLauncherStatus(
    startupBootstrapForced
      ? "Startup monitor active. Asolaria is selecting the main brain."
      : "Ready. Pick a mode to start."
  );
}
setQuickAvatarStatus("Avatar idle. Voice is ready when you are.");
setQuickVoiceStatus("Voice is off. Web Speech runs now; Kitty.TTS can be swapped in as the output voice engine.");
setQuickRuntimeActionStatus("Runtime controls are ready. Ask Asolaria or use the quick buttons.");
loadRealtimeFlowPrefs();
loadRealtimeBridgeTokenSession();
realtimeTranscribeState.bridgePushToken = normalizeRealtimeBridgePushToken(
  readCaptionBridgePushTokenFromUrl(),
  realtimeTranscribeState.bridgePushToken
);
saveRealtimeBridgeTokenSession();
syncQuickRealtimeCaptureSourceControl();
syncQuickRealtimeTranscriptSourceControl();
syncQuickRealtimeBridgeTokenControl();
const startupCapturePreset = getRealtimeCapturePresetFromUrl();
if (startupCapturePreset.source) {
  realtimeTranscribeState.captureSource = startupCapturePreset.source;
  syncQuickRealtimeCaptureSourceControl();
}
if (startupCapturePreset.transcriptSource) {
  realtimeTranscribeState.transcriptSource = startupCapturePreset.transcriptSource;
  syncQuickRealtimeTranscriptSourceControl();
}
setQuickRealtimeStatus(`Idle. Ready for ${describeRealtimeCaptureSource(realtimeTranscribeState.captureSource)}.`);
renderQuickRealtimeTranscript();
renderQuickRealtimeFlowBoard();
updateQuickInterviewQuestionCounter();
refreshQuickRealtimeControls();
window.setTimeout(() => {
  runStartupAvatarGreeting().catch(() => {});
}, 420);
const startupGreetingOnGesture = () => {
  runStartupAvatarGreeting().catch(() => {});
  window.removeEventListener("pointerdown", startupGreetingOnGesture);
  window.removeEventListener("keydown", startupGreetingOnGesture);
};
window.addEventListener("pointerdown", startupGreetingOnGesture, { passive: true });
window.addEventListener("keydown", startupGreetingOnGesture);
syncVoiceAvatarControlState();
setAvatarVisualState("idle");
setVoiceAvatarStatus("Voice and avatar controls are live for this Asolaria session.");
refreshQuickVoiceControls();
renderChatThreadList();
renderAbacusPackStatus();
announceFocusTurnoverSnapshot();
let startupScope = "all";
try {
  startupScope = normalizeProjectScope(localStorage.getItem(PROJECT_SCOPE_STORAGE_KEY) || "all");
} catch {}
applyProjectScope(startupScope, { syncGroupFilter: true, refreshLedger: false });
renderGatewayReadinessHints([]);
renderExternalObservedPruneStatus();
renderExternalMcpTokenProfileOptions(externalMcpProfilesCatalog);
updateNatural20ButtonState(readNatural20DailyState());
loadAdminTerminalAutoEnsurePreference();
renderAdminTerminalCockpit({ terminals: [], summary: { total: 0, online: 0, active: 0 }, generatedAt: new Date().toISOString() });
renderSuperCoderCockpit({
  readiness: "standby",
  summary: { connectedSystems: 0, totalSystems: 0, colonyActive: 0, colonyOnline: 0, adminOnline: 0, worldTowers: 0, worldRoutes: 0 },
  systems: [],
  blockers: [],
  warnings: [],
  generatedAt: new Date().toISOString()
});
refreshHealth({ fast: true }).catch(() => {});
window.setTimeout(() => {
  refreshHealth({ force: true }).catch(() => {});
}, 6000);
window.setTimeout(() => {
  runNatural20DailyStartupCheck({ silent: true }).catch(() => {});
}, 120);
if (shouldAutoRunStartupBrainLeader()) {
  window.setTimeout(() => {
    triggerStartupBrainLeaderSelection({
      reason: "app_open",
      silent: true,
      showBootstrap: true
    }).catch(() => {});
  }, 260);
}
window.setTimeout(() => {
  refreshExternalModelAliases({ silent: true }).catch(() => {});
  refreshExternalMcpProviderStatus({
    provider: externalProviderSelect?.value || "anthropic",
    silent: true
  }).catch(() => {});
  refreshVoiceAudioDevices({ silent: true }).catch(() => {});
}, 1200);
if (startupCapturePreset.autoStart) {
  window.setTimeout(() => {
    if (realtimeTranscribeState.active) {
      return;
    }
    startQuickRealtimeTranscription({
      captureSource: startupCapturePreset.source || realtimeTranscribeState.captureSource
    }).catch((error) => {
      setQuickRealtimeStatus(`Auto-capture failed: ${String(error?.message || error)}`, "error");
    });
  }, 2200);
}
window.setTimeout(() => {
  refreshConversationCatalog({ loadActive: true }).catch((error) => {
    logEvent(`Chat workspace sync failed: ${error.message}`);
    renderActiveChatMessages();
  });
  refreshChatRailTasks({ silent: true }).catch(() => {});
}, 9000);
window.setTimeout(() => {
  refreshMemory().catch(() => {});
  refreshSkillsList().catch(() => {});
}, 12000);
window.setTimeout(() => {
  refreshProjectScopes({
    preferredScopeId: startupScope,
    syncGroupFilter: true,
    refreshLedger: true,
    silent: true
  }).catch((error) => {
    setProjectAdminMessage(`Project catalog unavailable: ${error.message}`, true);
    logEvent(`Project catalog refresh failed: ${error.message}`);
    refreshTaskLedger({ silent: true }).catch(() => {});
  });
}, 15000);
window.setTimeout(() => {
  if (uiExperienceMode !== "simple") {
    refreshAdminTerminalCockpit({ silent: true }).catch(() => {});
  }
}, 2500);
window.setTimeout(() => {
  if (uiExperienceMode !== "simple") {
    refreshSuperCoderCockpit({ silent: true }).catch(() => {});
  }
}, 3200);
window.setTimeout(() => {
  if (uiExperienceMode !== "simple") {
    refreshGatewayAuditPanel({ silent: true }).catch(() => {});
  }
}, 20000);
setInterval(() => {
  refreshHealth({ fast: true }).catch(() => {});
}, startupBootstrapForced ? 4000 : 10000);
setInterval(() => {
  if (!startupBootstrapActive) {
    return;
  }
  refreshHealth({ fast: true }).catch(() => {});
}, 4000);
setInterval(() => {
  if (document.hidden || uiExperienceMode === "simple") {
    return;
  }
  refreshAdminTerminalCockpit({ silent: true }).catch(() => {});
}, 15000);
setInterval(() => {
  if (document.hidden || uiExperienceMode === "simple") {
    return;
  }
  refreshSuperCoderCockpit({ silent: true }).catch(() => {});
}, 20000);
setInterval(() => refreshExternalModelAliases({ silent: true }), 60000);
setInterval(() => {
  refreshMemory().catch(() => {});
}, 60000);
setInterval(() => {
  refreshConversationCatalog({ loadActive: false }).catch(() => {});
}, 45000);
setInterval(() => {
  refreshChatRailTasks({ silent: true }).catch(() => {});
}, 60000);
setInterval(() => {
  refreshTaskLedger({ silent: true }).catch(() => {});
}, 60000);
setInterval(() => {
  if (document.hidden || uiExperienceMode === "simple") {
    return;
  }
  refreshGatewayAuditPanel({ silent: true }).catch(() => {});
}, 45000);
