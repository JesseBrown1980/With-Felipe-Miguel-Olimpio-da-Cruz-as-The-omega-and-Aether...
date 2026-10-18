(() => {
  const $ = (id) => document.getElementById(id);

  const e = {
    root: $("interviewCopilotV2"),
    start: $("icv2StartBtn"),
    share: $("icv2ShareAudioBtn"),
    stop: $("icv2StopAudioBtn"),
    prefs: $("icv2PrefsBtn"),
    hotkeys: $("icv2HotkeysBtn"),
    role: $("icv2RoleInput"),
    tl: $("icv2TimeLimitInput"),
    sl: $("icv2SessionsLeftInput"),
    lang: $("icv2LanguageSelect"),
    stealth: $("icv2StealthToggle"),
    src: $("icv2CaptureSourceSelect"),
    status: $("icv2Status"),
    flow: $("icv2FlowBadge"),
    flowLane: $("icv2FlowLane"),
    stepSetup: $("icv2StepSetup"),
    stepCapture: $("icv2StepCapture"),
    stepAsk: $("icv2StepAsk"),
    stepAnswer: $("icv2StepAnswer"),
    stepSetupState: $("icv2StepSetupState"),
    stepCaptureState: $("icv2StepCaptureState"),
    stepAskState: $("icv2StepAskState"),
    stepAnswerState: $("icv2StepAnswerState"),
    runtimeStrip: $("icv2RuntimeStrip"),
    transcriptStateChip: $("icv2TranscriptStateChip"),
    sourceStateChip: $("icv2SourceStateChip"),
    swarmStateChip: $("icv2SwarmStateChip"),
    mistakeStateChip: $("icv2MistakeStateChip"),
    model: $("icv2ModelSelect"),
    meta: $("icv2ModelMeta"),
    lenWrap: $("icv2ResponseLengthWrap"),
    len: $("icv2ResponseLengthSelect"),
    shareLink: $("icv2ShareLinkInput"),
    copyShare: $("icv2CopyShareLinkBtn"),
    q: $("icv2QuestionInput"),
    ask: $("icv2AskBtn"),
    useLast: $("icv2UseLastLineBtn"),
    clear: $("icv2ClearQuestionBtn"),
    routeDebug: $("icv2RouteDebug"),
    answer: $("icv2AnswerBox"),
    ts: $("icv2TranscriptStatus"),
    tm: $("icv2TranscriptMirror"),
    prefDlg: $("icv2PrefsDialog"),
    hkDlg: $("icv2HotkeysDialog"),
    pa: $("icv2PrefAutoScroll"),
    pq: $("icv2PrefShowQuestion"),
    pl: $("icv2PrefResponseLengthControl"),
    pp: $("icv2PrefPrompterMode"),
    pi: $("icv2PrefPip"),
    pipBtn: $("icv2OpenPipBtn"),
    presetMeet: $("icv2PresetMeetBtn"),
    presetZoom: $("icv2PresetZoomBtn"),
    presetTeams: $("icv2PresetTeamsBtn"),
    presetCustom: $("icv2PresetCustomBtn"),
    applyPreset: $("icv2ApplyPresetBtn"),
    startPresetCapture: $("icv2StartPresetCaptureBtn"),
    resetChecks: $("icv2ResetChecksBtn"),
    presetStatus: $("icv2PresetStatus"),
    presetChecklist: $("icv2SourceChecklist"),
    presetTag: $("icv2PresetTag"),
    presetSourceHint: $("icv2PresetSourceHint"),
    presetTip: $("icv2PresetProTip"),
    checksStatus: $("icv2ChecklistStatus"),
    onboardingNext: $("icv2OnboardingNextStep"),
    check1: $("icv2Check1"),
    check2: $("icv2Check2"),
    check3: $("icv2Check3"),
    check1Label: $("icv2Check1Label"),
    check2Label: $("icv2Check2Label"),
    check3Label: $("icv2Check3Label"),
    mainStealth: $("stealthToggle"),
    qrs: $("quickRealtimeStatus"),
    qrt: $("quickRealtimeTranscript"),
    qstart: $("quickRealtimeStartBtn"),
    qstop: $("quickRealtimeStopBtn"),
    qsrc: $("quickRealtimeSourceSelect"),
    quse: $("quickInterviewUseLastBtn"),
    qq: $("quickInterviewQuestion"),
    injDevice: $("icv2InjectOutputDevice"),
    injText: $("icv2InjectText"),
    injSpeak: $("icv2InjectSpeakBtn"),
    injTest: $("icv2InjectSelfTestBtn"),
    injWizard: $("icv2InjectWizardBtn"),
    injRefresh: $("icv2InjectRefreshDevicesBtn"),
    injStatus: $("icv2InjectStatus")
  };

  if (!e.root) return;

  const MODELS = [
    ["gpt-5-mini", "GPT-5-Mini", "OpenAI (Recommended)"],
    ["gpt-5.2-instant", "GPT-5.2 Instant", "OpenAI | Pro Plan Only"],
    ["gpt-5.2", "GPT-5.2", "OpenAI | Pro Plan Only"],
    ["gpt-5.1", "GPT-5.1", "OpenAI | Pro Plan Only"],
    ["gpt-5", "GPT-5", "OpenAI | Pro Plan Only"],
    ["gpt-oss-120b", "GPT-OSS-120B", "OpenAI"],
    ["kimi-k2", "Kimi K2", "Kimi"],
    ["kimi-k2.5", "Kimi K2.5", "Kimi"],
    ["kimi-k2-thinking", "Kimi K2 Thinking", "Kimi | Pro Plan Only"],
    ["deepseek-v3.1", "DeepSeek V3.1", "DeepSeek"],
    ["gemini-3-pro", "Gemini 3 Pro", "Google | Pro Plan Only"],
    ["gemini-3-flash", "Gemini 3 Flash", "Google"],
    ["gemini-2.5-flash", "Gemini 2.5 Flash", "Google"],
    ["gemini-2.5-pro", "Gemini 2.5 Pro", "Google | Pro Plan Only"],
    ["grok-4", "Grok 4", "xAI | Pro Plan Only"],
    ["grok-4-reasoning", "Grok 4 Reasoning", "xAI | Pro Plan Only"],
    ["grok-code-fast", "Grok Code Fast", "xAI"],
    ["claude-4-sonnet", "Claude 4 Sonnet", "Anthropic | Pro Plan Only"],
    ["claude-4.5-sonnet", "Claude 4.5 Sonnet", "Anthropic | Pro Plan Only"],
    ["qwen-2.5-235b", "Qwen-2.5-235B", "Qwen | Pro Plan Only"],
    ["minimax-m2.5", "MiniMax M2.5", "Fireworks"],
    ["glm-5", "GLM-5", "Fireworks"]
  ];

  const SOURCE_PRESETS = {
    meet: {
      label: "Google Meet",
      badge: "Fastest setup",
      source: "tab_audio",
      sourceHint: "Meeting Tab Audio (Recommended)",
      tip: "If lines lag, restart capture and confirm Share tab audio is enabled in the picker.",
      steps: [
        "Choose the Meet tab as capture source.",
        "Enable Share tab audio in the browser picker.",
        "Keep the meeting tab focused for cleaner live lines."
      ],
      checks: [
        "Select the Meet tab in the capture picker.",
        "Confirm Share tab audio is enabled before start.",
        "Start capture and confirm transcript mirror movement."
      ]
    },
    zoom: {
      label: "Zoom",
      badge: "Desktop app stable",
      source: "window_audio",
      sourceHint: "App Window Audio",
      tip: "If transcript misses first lines, stop and restart capture after Zoom joins computer audio.",
      steps: [
        "Choose the Zoom meeting window as your source.",
        "Confirm interviewer audio is routed to speakers or headset.",
        "Start capture, wait for live transcript movement, then ask Copilot."
      ],
      checks: [
        "Join Zoom with computer audio enabled.",
        "Select Zoom app window as capture source.",
        "Run a short self-check phrase before interview starts."
      ]
    },
    teams: {
      label: "Microsoft Teams",
      badge: "Noise resilient",
      source: "window_audio",
      sourceHint: "App Window Audio",
      tip: "For cleaner lines in Teams, avoid aggressive OS noise suppression while capturing.",
      steps: [
        "Select the Teams app window audio source.",
        "Keep meeting volume up and disable aggressive OS noise filters.",
        "Use bridge self-test once before the interview begins."
      ],
      checks: [
        "Confirm Teams meeting audio is playing through selected output.",
        "Capture Teams window audio before the first question.",
        "Use bridge self-test once to confirm transcript pickup."
      ]
    },
    manual: {
      label: "Manual",
      badge: "Custom routing",
      source: null,
      sourceHint: "Use selected Capture Source",
      tip: "Pick the source with the least background noise, then confirm transcript movement before asking.",
      steps: [
        "Pick a capture source that matches your interview app.",
        "Start capture and confirm transcript mirror is updating.",
        "Run bridge wizard if you need injected voice replies."
      ],
      checks: [
        "Select the right source for your meeting app.",
        "Start capture and watch for first transcript lines.",
        "Validate bridge routing only if voice injection is required."
      ]
    }
  };

  const CHECK_KEYS = ["check1", "check2", "check3"];

  const K = "ASOLARIA_INTERVIEW_COPILOT_V1";
  const D = {
    role: "Software engineer @ Capital RX",
    tl: 15,
    sl: 2,
    lang: "English",
    stealth: false,
    src: "tab_audio",
    model: "gpt-5-mini",
    len: "balanced",
    active: false,
    sid: (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 20),
    auto: true,
    showq: true,
    showlen: true,
    prompter: false,
    pip: false,
    injDevice: "default",
    checks: {
      check1: false,
      check2: false,
      check3: false
    },
    preset: "manual"
  };

  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem(K) || "{}");
    } catch {
      return {};
    }
  })();
  const S = Object.assign({}, D, stored);
  if (!SOURCE_PRESETS[S.preset]) S.preset = D.preset;
  if (String(S.src || "").trim().toLowerCase() === "verve_caption") S.src = "custom_caption";
  if (!S.src) S.src = D.src;
  if (!S.checks || typeof S.checks !== "object") S.checks = Object.assign({}, D.checks);
  CHECK_KEYS.forEach((key) => {
    S.checks[key] = !!S.checks[key];
  });

  let busy = false;
  let healthPollBusy = false;

  const CHIP_STATES = ["icv2-state-chip--idle", "icv2-state-chip--info", "icv2-state-chip--live", "icv2-state-chip--warn"];

  const n = (v, a, b, d) => {
    const value = Number(v);
    if (!Number.isFinite(value)) return d;
    return Math.max(a, Math.min(b, Math.round(value)));
  };

  const save = () => {
    localStorage.setItem(K, JSON.stringify(S));
  };

  const getModel = () => MODELS.find((m) => m[0] === S.model) || MODELS[0];

  const routeProvider = (modelId) => {
    const id = String(modelId || "").toLowerCase();
    if (id.startsWith("gpt-")) return "openai";
    if (id.startsWith("claude-")) return "anthropic";
    if (id.startsWith("gemini-")) return "gemini";
    if (
      id.startsWith("grok-") ||
      id.startsWith("kimi-") ||
      id.startsWith("deepseek-") ||
      id.startsWith("qwen-") ||
      id.startsWith("minimax-") ||
      id.startsWith("glm-")
    ) {
      return "antigravity";
    }
    return "";
  };

  const routeLabel = (modelId) => {
    const provider = routeProvider(modelId);
    if (!provider) return "Core route: Asolaria /api/chat";
    if (provider === "openai") return "Locked route: /api/providers/openai/run";
    return `External route: ${provider} /api/providers/external/run`;
  };

  const status = (text, isError) => {
    if (!e.status) return;
    e.status.textContent = text || "Idle.";
    e.status.classList.remove("is-live", "is-error");
    e.status.classList.add(isError ? "is-error" : "is-live");
    renderFlowLane();
  };

  const checklistCount = () => CHECK_KEYS.reduce((sum, key) => sum + (S.checks[key] ? 1 : 0), 0);

  const hasTranscript = () => {
    const text = String(e.qrt?.textContent || "").trim();
    if (!text) return false;
    return !/transcript will appear here while (captions|capture) are active\./i.test(text);
  };

  const captureSignals = () => {
    const raw = String(e.qrs?.textContent || "").toLowerCase();
    const liveClass = !!e.qrs?.classList.contains("is-live");
    const errorClass = !!e.qrs?.classList.contains("is-error");
    const liveText = /(captur|listen|running|stream|ready for)/.test(raw) && !/(stopped|idle|error|fail|denied|blocked|unavailable)/.test(raw);
    const errorText = /(error|fail|denied|blocked|unavailable)/.test(raw);
    return {
      live: liveClass || liveText,
      error: errorClass || errorText,
      raw
    };
  };

  const setFlowStep = (card, stateNode, mode, text) => {
    if (!card || !stateNode) return;
    card.classList.remove("is-pending", "is-active", "is-done", "is-warn");
    card.classList.add(mode || "is-pending");
    stateNode.textContent = String(text || "").trim();
  };

  const setStateChip = (node, tone, text) => {
    if (!node) return;
    node.hidden = false;
    node.classList.remove(...CHIP_STATES);
    node.classList.add(CHIP_STATES.includes(tone) ? tone : "icv2-state-chip--idle");
    node.textContent = String(text || "").trim();
  };

  const hideStateChip = (node) => {
    if (!node) return;
    node.hidden = true;
  };

  const renderRuntimeStrip = () => {
    if (!e.runtimeStrip) return;
    const capture = captureSignals();
    const transcriptReady = hasTranscript();
    const preset = getPreset();
    const sourceLabel = String(e.src?.selectedOptions?.[0]?.textContent || S.src || "not selected").trim();

    if (capture.error) {
      setStateChip(e.transcriptStateChip, "icv2-state-chip--warn", "Transcript: capture error");
    } else if (capture.live && transcriptReady) {
      setStateChip(e.transcriptStateChip, "icv2-state-chip--live", "Transcript: live lines flowing");
    } else if (capture.live) {
      setStateChip(e.transcriptStateChip, "icv2-state-chip--warn", "Transcript: listening, waiting first line");
    } else if (S.active) {
      setStateChip(e.transcriptStateChip, "icv2-state-chip--warn", "Transcript: copilot active, capture idle");
    } else {
      setStateChip(e.transcriptStateChip, "icv2-state-chip--idle", "Transcript: idle");
    }

    setStateChip(
      e.sourceStateChip,
      "icv2-state-chip--info",
      `Source: ${sourceLabel} | Preset: ${preset.label}`
    );

    const checks = checklistCount();
    const question = String(e.q?.value || "").trim();
    let nextStep = "Next: choose a preset, complete checklist, then start capture.";

    if (checks >= 3 && !S.active) {
      nextStep = "Next: press Start Interview Copilot, then click Share Audio.";
    }
    if (S.active && !capture.live) {
      nextStep = "Next: click Share Audio and confirm your meeting app route is correct.";
    }
    if (S.active && capture.live && !transcriptReady) {
      nextStep = "Next: wait for the first transcript line (or re-check source/audio sharing).";
    }
    if (S.active && capture.live && transcriptReady && !question) {
      nextStep = "Next: use last transcript line or type your question for Copilot.";
    }
    if (busy) {
      nextStep = "Next: Copilot is generating. Keep speaking while transcript captures.";
    }

    if (e.onboardingNext) {
      e.onboardingNext.textContent = nextStep;
    }
  };

  const readSwarmChipSnapshot = (healthData) => {
    const settings = healthData?.settings || {};
    const swarm = healthData?.swarm;
    const hasSettingsField = typeof settings.swarmModeEnabled === "boolean";
    const hasSwarmObject = swarm && typeof swarm === "object";
    if (!hasSettingsField && !hasSwarmObject) return null;

    const enabled = typeof swarm?.enabled === "boolean"
      ? swarm.enabled
      : (typeof settings.swarmModeEnabled === "boolean" ? settings.swarmModeEnabled : null);
    const activeCountRaw = healthData?.agentColony?.counts?.active ?? swarm?.activeAgents ?? swarm?.active;
    const activeCount = Number(activeCountRaw);

    return {
      enabled,
      activeCount: Number.isFinite(activeCount) ? activeCount : null
    };
  };

  const readMistakeChipSnapshot = (healthData) => {
    const settings = healthData?.settings || {};
    const mistakes = healthData?.mistakes;
    const hasSettingsField = typeof settings.mistakeTaxonomyEnabled === "boolean";
    const hasMistakesObject = mistakes && typeof mistakes === "object";
    if (!hasSettingsField && !hasMistakesObject) return null;

    const enabled = typeof mistakes?.enabled === "boolean"
      ? mistakes.enabled
      : (typeof settings.mistakeTaxonomyEnabled === "boolean" ? settings.mistakeTaxonomyEnabled : null);
    const patternRaw = mistakes?.patterns ?? mistakes?.totalPatterns ?? mistakes?.count;
    const hintRaw = mistakes?.hints ?? mistakes?.hintCount;
    const patternCount = Number(patternRaw);
    const hintCount = Number(hintRaw);

    return {
      enabled,
      patternCount: Number.isFinite(patternCount) ? patternCount : null,
      hintCount: Number.isFinite(hintCount) ? hintCount : null
    };
  };

  const renderOptionalRuntimeChips = (healthData) => {
    const swarmSnapshot = readSwarmChipSnapshot(healthData);
    if (!swarmSnapshot) {
      hideStateChip(e.swarmStateChip);
    } else {
      const enabledText = swarmSnapshot.enabled === true ? "on" : swarmSnapshot.enabled === false ? "off" : "unknown";
      const activeText = swarmSnapshot.activeCount === null ? "" : ` | active ${swarmSnapshot.activeCount}`;
      const tone = swarmSnapshot.enabled === false ? "icv2-state-chip--warn" : swarmSnapshot.enabled === true ? "icv2-state-chip--live" : "icv2-state-chip--info";
      setStateChip(e.swarmStateChip, tone, `Swarm mode: ${enabledText}${activeText}`);
    }

    const mistakeSnapshot = readMistakeChipSnapshot(healthData);
    if (!mistakeSnapshot) {
      hideStateChip(e.mistakeStateChip);
    } else {
      const enabledText = mistakeSnapshot.enabled === true ? "on" : mistakeSnapshot.enabled === false ? "off" : "unknown";
      const patternText = mistakeSnapshot.patternCount === null ? "" : ` | patterns ${mistakeSnapshot.patternCount}`;
      const hintText = mistakeSnapshot.hintCount === null ? "" : ` | hints ${mistakeSnapshot.hintCount}`;
      const tone = mistakeSnapshot.enabled === false ? "icv2-state-chip--warn" : mistakeSnapshot.enabled === true ? "icv2-state-chip--live" : "icv2-state-chip--info";
      setStateChip(e.mistakeStateChip, tone, `Mistake hints: ${enabledText}${patternText}${hintText}`);
    }
  };

  const refreshOptionalRuntimeChips = async () => {
    if (healthPollBusy) return;
    healthPollBusy = true;
    try {
      const healthData = await get("/api/health");
      renderOptionalRuntimeChips(healthData || {});
    } catch {
      hideStateChip(e.swarmStateChip);
      hideStateChip(e.mistakeStateChip);
    } finally {
      healthPollBusy = false;
    }
  };

  const renderFlowLane = () => {
    if (!e.flowLane) return;
    const capture = captureSignals();
    const checklist = checklistCount();
    const question = String(e.q?.value || "").trim();
    const answer = String(e.answer?.textContent || "").trim();
    const hasAnswer = !!answer && !/^copilot responses will appear here\.$/i.test(answer);
    const transcriptReady = hasTranscript();

    if (S.active) {
      setFlowStep(e.stepSetup, e.stepSetupState, "is-done", "Copilot session is active");
    } else if (checklist >= 2) {
      setFlowStep(e.stepSetup, e.stepSetupState, "is-active", `Ready to start (${checklist}/3 checks complete)`);
    } else {
      setFlowStep(e.stepSetup, e.stepSetupState, "is-pending", `Complete setup checklist (${checklist}/3)`);
    }

    if (capture.error) {
      setFlowStep(e.stepCapture, e.stepCaptureState, "is-warn", "Capture error, fix source/permissions");
    } else if (capture.live && transcriptReady) {
      setFlowStep(e.stepCapture, e.stepCaptureState, "is-done", "Live capture + transcript mirror moving");
    } else if (capture.live) {
      setFlowStep(e.stepCapture, e.stepCaptureState, "is-active", "Capture live, waiting for transcript lines");
    } else if (S.active) {
      setFlowStep(e.stepCapture, e.stepCaptureState, "is-active", "Start Share Audio to begin capture");
    } else {
      setFlowStep(e.stepCapture, e.stepCaptureState, "is-pending", "Capture not started");
    }

    if (busy) {
      setFlowStep(e.stepAsk, e.stepAskState, "is-active", "Copilot is generating response");
    } else if (question) {
      setFlowStep(e.stepAsk, e.stepAskState, "is-done", "Question draft is ready");
    } else {
      setFlowStep(e.stepAsk, e.stepAskState, "is-pending", "Use transcript line or type your question");
    }

    if (hasAnswer) {
      setFlowStep(e.stepAnswer, e.stepAnswerState, "is-done", "Latest guidance available");
    } else if (busy) {
      setFlowStep(e.stepAnswer, e.stepAnswerState, "is-active", "Waiting for model response");
    } else {
      setFlowStep(e.stepAnswer, e.stepAnswerState, "is-pending", "No response yet");
    }
  };

  const setFlowBadge = () => {
    if (!e.flow) return;
    const capture = captureSignals();
    const checks = checklistCount();
    const transcriptReady = hasTranscript();
    let text = "Flow: setup pending";
    let cls = "";

    if (capture.error) {
      text = "Flow: capture error";
      cls = "is-warn";
    } else if (S.active && capture.live && transcriptReady) {
      text = "Flow: capture + copilot live";
      cls = "is-live";
    } else if (S.active && capture.live && !transcriptReady) {
      text = "Flow: capture live, waiting transcript";
      cls = "is-warn";
    } else if (S.active && !capture.live) {
      text = "Flow: copilot live, start capture";
      cls = "is-warn";
    } else if (!S.active && capture.live) {
      text = "Flow: capture live, start copilot";
      cls = "is-warn";
    } else if (!S.active && checks >= 2) {
      text = "Flow: ready to start copilot";
      cls = "is-live";
    }

    e.flow.textContent = text;
    e.flow.classList.remove("is-live", "is-warn");
    if (cls) e.flow.classList.add(cls);
    renderFlowLane();
    renderRuntimeStrip();
  };

  const tail = (input, maxChars) => {
    const text = String(input || "").trim();
    return text.length > maxChars ? text.slice(text.length - maxChars) : text;
  };

  const link = () => {
    const base = `${location.origin}${location.pathname}`;
    const params = new URLSearchParams();
    params.set("session", String(S.sid || ""));
    params.set("view", "interview");
    return `${base}?${params.toString()}`;
  };

  const getPreset = () => SOURCE_PRESETS[S.preset] || SOURCE_PRESETS.manual;

  const inferPresetFromSource = (sourceValue) => {
    const source = String(sourceValue || "");
    if (source === SOURCE_PRESETS.meet.source) return "meet";
    if (source === "window_audio" && (S.preset === "zoom" || S.preset === "teams")) return S.preset;
    return "manual";
  };

  const syncQuickSource = () => {
    if (!e.qsrc) return;
    e.qsrc.value = S.src;
    e.qsrc.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const renderPresetUi = () => {
    const preset = getPreset();
    const cards = [
      [e.presetMeet, "meet"],
      [e.presetZoom, "zoom"],
      [e.presetTeams, "teams"],
      [e.presetCustom, "manual"]
    ];

    cards.forEach(([btn, key]) => {
      if (!btn) return;
      btn.classList.toggle("is-active", S.preset === key);
    });

    if (e.presetTag) {
      e.presetTag.textContent = `Preset: ${preset.label} ${preset.badge ? `| ${preset.badge}` : ""}`;
    }
    if (e.presetSourceHint) {
      e.presetSourceHint.textContent = `Recommended source: ${preset.sourceHint || "Use selected source"}`;
    }
    if (e.presetTip) {
      e.presetTip.textContent = `Tip: ${preset.tip || "Confirm transcript mirror before asking Copilot."}`;
    }

    const checks = Array.isArray(preset.checks) && preset.checks.length >= 3 ? preset.checks : SOURCE_PRESETS.manual.checks;
    if (e.check1Label) e.check1Label.textContent = checks[0];
    if (e.check2Label) e.check2Label.textContent = checks[1];
    if (e.check3Label) e.check3Label.textContent = checks[2];

    const checkNodes = [
      [e.check1, "check1"],
      [e.check2, "check2"],
      [e.check3, "check3"]
    ];
    checkNodes.forEach(([node, key]) => {
      if (!node) return;
      node.checked = !!S.checks[key];
      const row = node.closest(".icv2-onboarding-check");
      if (row) row.classList.toggle("is-done", !!S.checks[key]);
    });

    if (e.checksStatus) {
      const completed = checklistCount();
      e.checksStatus.textContent =
        completed >= 3
          ? "Checklist: 3/3 complete. You are ready to share audio."
          : `Checklist: ${completed}/3 complete. Finish onboarding before interview starts.`;
    }

    if (e.presetStatus) {
      const sourceLabel = e.src?.selectedOptions?.[0]?.textContent || S.src;
      const capture = captureSignals();
      const stateLabel = capture.error ? "Capture state: issue detected." : capture.live ? "Capture state: live." : "Capture state: idle.";
      e.presetStatus.textContent = `Preset: ${preset.label}. Active source: ${sourceLabel}. ${stateLabel}`;
    }

    if (e.presetChecklist) {
      e.presetChecklist.textContent = "";
      preset.steps.forEach((step) => {
        const li = document.createElement("li");
        li.textContent = step;
        e.presetChecklist.appendChild(li);
      });
    }

    renderRuntimeStrip();
  };

  const applyPreset = (presetId, announce) => {
    const key = SOURCE_PRESETS[presetId] ? presetId : "manual";
    const presetChanged = key !== S.preset;
    S.preset = key;
    const preset = getPreset();
    if (preset.source) {
      S.src = preset.source;
    }
    if (presetChanged) {
      CHECK_KEYS.forEach((checkKey) => {
        S.checks[checkKey] = false;
      });
    }
    render();
    syncQuickSource();
    if (announce) {
      status(`Preset applied: ${preset.label}.`, false);
    }
  };

  const render = () => {
    if (e.role) e.role.value = S.role;
    if (e.tl) e.tl.value = S.tl;
    if (e.sl) e.sl.value = S.sl;
    if (e.lang) e.lang.value = S.lang;
    if (e.stealth) e.stealth.checked = !!S.stealth;
    if (e.src) e.src.value = S.src;
    if (e.model) e.model.value = S.model;
    if (e.len) e.len.value = S.len;
    if (e.pa) e.pa.checked = !!S.auto;
    if (e.pq) e.pq.checked = !!S.showq;
    if (e.pl) e.pl.checked = !!S.showlen;
    if (e.pp) e.pp.checked = !!S.prompter;
    if (e.pi) e.pi.checked = !!S.pip;
    if (e.injDevice) e.injDevice.value = S.injDevice || "default";
    if (e.lenWrap) e.lenWrap.style.display = S.showlen ? "grid" : "none";
    if (e.start) e.start.textContent = S.active ? "End Interview Copilot" : "Start Interview Copilot";
    if (e.shareLink) e.shareLink.value = link();
    if (e.copyShare) e.copyShare.disabled = !S.sid;

    if (e.meta) {
      const m = getModel();
      e.meta.textContent = `${m[2]} | ${routeLabel(m[0])}`;
    }

    document.body.classList.toggle("icv2-prompter", !!S.prompter);

    // Main stealth toggle is the source of truth; keep copilot state aligned without forcing it ON.
    if (e.mainStealth) {
      const mainStealthEnabled = !!e.mainStealth.checked;
      if (!!S.stealth !== mainStealthEnabled) {
        S.stealth = mainStealthEnabled;
        if (e.stealth) {
          e.stealth.checked = mainStealthEnabled;
        }
      }
    }

    renderPresetUi();
    setFlowBadge();
    save();
  };

  const post = async (path, body) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(data.error || res.statusText || "request_failed"));
    return data;
  };

  const get = async (path) => {
    const res = await fetch(path, { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(data.error || res.statusText || "request_failed"));
    return data;
  };

  const waitJob = async (jobId) => {
    for (let i = 0; i < 140; i += 1) {
      const data = await get(`/api/jobs/${encodeURIComponent(jobId)}`);
      const job = data.job || data;
      const st = String(job.status || "").toLowerCase();
      if (["completed", "failed", "error", "cancelled", "canceled"].includes(st)) {
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("Timed out waiting for job.");
  };

  const readJob = (job) => {
    const x = job && typeof job === "object" ? job : {};
    const raw = x.result ?? x.output ?? x.response ?? x.raw ?? x;

    if (typeof raw === "string" && raw.trim()) return raw.trim();
    for (const key of ["reply", "text", "message", "error"]) {
      if (typeof raw[key] === "string" && raw[key].trim()) return raw[key].trim();
      if (typeof x[key] === "string" && x[key].trim()) return x[key].trim();
    }
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return "No textual reply.";
    }
  };

  const append = (text, label) => {
    if (!e.answer) return;
    const time = new Date().toLocaleTimeString();
    const chunk = `[${time}] ${label || "Copilot"}\n${String(text || "").trim() || "(empty)"}`;
    const prev = String(e.answer.textContent || "").trim();
    e.answer.textContent = prev ? `${prev}\n\n${chunk}` : chunk;
    if (S.auto) e.answer.scrollTop = e.answer.scrollHeight;
    renderFlowLane();
  };

  const prompt = (question) => {
    const m = getModel();
    const lenInstruction =
      S.len === "concise"
        ? "Answer in 3-5 bullets."
        : S.len === "detailed"
          ? "Answer with deeper reasoning and one follow-up."
          : "Answer with balanced detail.";
    const visibilityInstruction = S.showq
      ? "You may restate the question in one short line."
      : "Do not restate the question.";
    const preset = getPreset();

    return [
      "Interview Copilot run context",
      `Role target: ${S.role || "Unknown"}`,
      `Time limit: ${S.tl} minutes`,
      `Language: ${S.lang}`,
      `Capture preset: ${preset.label}`,
      `Parallel audio lanes target: ${Math.max(1, Number(S.sl || 1))}`,
      `Onboarding checklist completed: ${checklistCount()}/3`,
      `Model preference: ${m[1]} (${m[2]})`,
      `Stealth mode: ${S.stealth ? "on" : "off"}`,
      `Response instruction: ${lenInstruction}`,
      visibilityInstruction,
      "",
      "Transcript context:",
      tail(e.qrt?.textContent || "", 2600) || "(No transcript yet)",
      "",
      "Question:",
      question,
      "",
      "Give practical interview guidance and include one strong follow-up."
    ].join("\n");
  };

  const ask = async () => {
    if (busy) return;
    const question = String(e.q?.value || "").trim();
    if (!question) return status("Type a question first.", true);

    busy = true;
    if (e.ask) {
      e.ask.disabled = true;
      e.ask.textContent = "Running...";
    }

    const model = getModel();
    let routeText = `/api/chat model=${model[0]}`;
    status(`Running ${model[1]} route...`, false);

    try {
      const provider = routeProvider(model[0]);
      const fullPrompt = prompt(question);
      let response;

      if (provider === "openai") {
        routeText = `/api/providers/openai/run model=${model[0]}`;
        try {
          response = await post("/api/providers/openai/run", {
            prompt: fullPrompt,
            model: model[0],
            timeoutMs: model[0] === "gpt-5.2-instant" ? 70000 : 90000
          });
        } catch (routeErr) {
          const msg = String(routeErr?.message || routeErr || "").toLowerCase();
          const routeMissing = msg.includes("not found") || msg.includes("cannot post") || msg.includes("404");
          if (!routeMissing) {
            throw routeErr;
          }
          routeText = `/api/chat fallback (openai route unavailable) model=${model[0]}`;
          response = await post("/api/chat", { message: fullPrompt });
        }
      } else if (provider) {
        routeText = `/api/providers/external/run provider=${provider} model=${model[0]}`;
        try {
          response = await post("/api/providers/external/run", {
            provider,
            prompt: fullPrompt,
            model: model[0],
            passIfUnavailable: true,
            maxTokens: S.len === "detailed" ? 1100 : 700,
            temperature: 0.2
          });
        } catch (routeErr) {
          const msg = String(routeErr?.message || routeErr || "").toLowerCase();
          const providerDown = msg.includes("unavailable") || msg.includes("disabled") || msg.includes("not found");
          if (!providerDown) {
            throw routeErr;
          }
          routeText = `/api/chat fallback (external route unavailable) provider=${provider} model=${model[0]}`;
          response = await post("/api/chat", { message: fullPrompt });
        }
      } else {
        response = await post("/api/chat", { message: fullPrompt });
      }

      let out = String(response.reply || response.message || "").trim();
      if (response.mode === "queued" && response.job?.id) {
        out = readJob(await waitJob(response.job.id));
        routeText = `${routeText} job=${response.job.id}`;
      }

      append(out || "No reply.", model[1]);
      if (e.routeDebug) e.routeDebug.textContent = `Route: ${routeText}`;
      status("Copilot response completed.", false);
    } catch (err) {
      append(`Error: ${String(err.message || err)}`, `${model[1]} (error)`);
      if (e.routeDebug) e.routeDebug.textContent = `Route: ${routeText} (error)`;
      status(`Copilot run failed: ${String(err.message || err)}`, true);
    } finally {
      busy = false;
      if (e.ask) {
        e.ask.disabled = false;
        e.ask.textContent = "Ask Copilot";
      }
      renderFlowLane();
    }
  };

  const share = () => {
    syncQuickSource();
    if (!e.qstart) return status("Share Audio unavailable.", true);
    e.qstart.click();
    status(`Share Audio sent to transcript pipeline (${getPreset().label} preset).`, false);
    setFlowBadge();
  };

  const stop = () => {
    if (!e.qstop) return status("Stop unavailable.", true);
    e.qstop.click();
    status("Audio capture stop requested.", false);
    setFlowBadge();
  };

  const useLast = () => {
    if (e.quse) {
      e.quse.click();
      const mirroredQuestion = String(e.qq?.value || "").trim();
      if (mirroredQuestion && e.q) {
        e.q.value = mirroredQuestion;
        e.q.focus();
        return status("Latest transcript line inserted.", false);
      }
    }

    const lines = String(e.qrt?.textContent || "")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const last = lines.length ? lines[lines.length - 1] : "";
    if (!last) return status("No transcript line available yet.", true);

    if (e.q) {
      e.q.value = `From live transcript: "${last}"\n\nWhat is the strongest concise response?`;
      e.q.focus();
    }
    status("Latest transcript line inserted.", false);
  };

  const copy = async () => {
    const value = String(e.shareLink?.value || "").trim();
    if (!value) return status("Session link unavailable.", true);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      status("Session sharing link copied.", false);
    } catch (err) {
      status(`Copy failed: ${String(err.message || err)}`, true);
    }
  };

  const open = (dialog) => {
    if (!dialog) return;
    if (dialog.showModal) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
    }
  };

  const pip = () => {
    const url = `${location.origin}${location.pathname}?ui=simple&session=${encodeURIComponent(S.sid || "")}`;
    const win = window.open(url, "asolaria_interview_pip", "popup=yes,width=460,height=760,left=20,top=20");
    status(win ? "Picture-in-Picture view opened." : "Could not open PiP window.", !win);
  };

  const injStatus = (text, isError) => {
    if (!e.injStatus) return;
    e.injStatus.textContent = String(text || "").trim() || "Idle.";
    e.injStatus.classList.remove("is-live", "is-error");
    e.injStatus.classList.add(isError ? "is-error" : "is-live");
  };

  const refreshInjDevices = async () => {
    if (!e.injDevice || !navigator.mediaDevices?.enumerateDevices) return;

    try {
      const current = String(S.injDevice || e.injDevice.value || "default");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => String(d.kind || "") === "audiooutput");

      e.injDevice.textContent = "";
      const systemDefault = document.createElement("option");
      systemDefault.value = "default";
      systemDefault.textContent = "System default";
      e.injDevice.appendChild(systemDefault);

      outputs.forEach((d, i) => {
        const option = document.createElement("option");
        option.value = d.deviceId || `device_${i}`;
        option.textContent = d.label && d.label.trim() ? d.label : `Audio Output ${i + 1}`;
        e.injDevice.appendChild(option);
      });

      if (Array.from(e.injDevice.options).some((o) => o.value === current)) {
        e.injDevice.value = current;
        S.injDevice = current;
      } else {
        e.injDevice.value = "default";
        S.injDevice = "default";
      }
      save();
      injStatus(`Loaded ${outputs.length} output device(s).`, false);
    } catch (err) {
      injStatus(`Device refresh failed: ${String(err.message || err)}`, true);
    }
  };

  const pickLikelyBridgeDevice = () => {
    if (!e.injDevice) return null;
    const keys = ["vb-audio", "cable", "virtual", "loopback", "blackhole", "voicemeeter", "line 1", "line 2", "stereo mix"];
    const options = Array.from(e.injDevice.options || []);
    for (const opt of options) {
      const text = String(opt.textContent || opt.label || "").toLowerCase();
      if (keys.some((key) => text.includes(key))) return opt;
    }
    return null;
  };

  const speakInjected = async (text) => {
    const value = String(text || "").trim();
    if (!value) {
      injStatus("Type injection text first.", true);
      return false;
    }

    try {
      const payload = await post("/api/voice/speak", { text: value });
      const mode = String(payload?.mode || "").trim().toLowerCase();
      const outputPath = String(payload?.outputPath || "").trim();
      if (!outputPath || mode === "browser-client" || mode === "fallback-text") {
        injStatus(
          "Server voice file unavailable. Set voice output mode to server/kitty_tts for bridge injection.",
          true
        );
        return false;
      }
      const audio = new Audio(`/api/voice/latest?v=${Date.now()}`);
      const device = String(S.injDevice || "default");
      if (device !== "default" && typeof audio.setSinkId === "function") {
        try {
          await audio.setSinkId(device);
        } catch {
          // Keep default sink if explicit selection fails.
        }
      }
      await audio.play();
      injStatus(`Injected voice (${value.length} chars).`, false);
      return true;
    } catch (err) {
      injStatus(`Injection failed: ${String(err.message || err)}`, true);
      return false;
    }
  };

  const selfTestInject = async () => {
    const phrase = `Asolaria bridge self test ${new Date().toLocaleTimeString()}. Please confirm transcription.`;
    if (e.injText) e.injText.value = phrase;
    const ok = await speakInjected(phrase);
    if (ok) {
      status("Self-test injected. Verify this line appears in live transcript.", false);
    } else {
      status("Self-test could not inject bridge audio. Check voice output mode/device.", true);
    }
  };

  const waitForTranscript = async (needle, timeoutMs = 18000) => {
    const target = String(needle || "").toLowerCase().trim();
    if (!target) return false;
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const text = String(e.qrt?.textContent || e.tm?.textContent || "").toLowerCase();
      if (text.includes(target)) return true;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    return false;
  };

  const runBridgeWizard = async () => {
    try {
      injStatus("Wizard: refreshing output devices...", false);
      await refreshInjDevices();

      const recommendation = pickLikelyBridgeDevice();
      if (recommendation) {
        e.injDevice.value = recommendation.value;
        S.injDevice = String(recommendation.value || "default");
        save();
        injStatus(`Wizard: selected likely bridge output "${String(recommendation.textContent || "").trim()}".`, false);
      } else {
        injStatus("Wizard: no obvious virtual cable label found. Using current output selection.", false);
      }

      syncQuickSource();
      if (e.qstart) e.qstart.click();

      const phrase = `Asolaria injection wizard check ${new Date().toLocaleTimeString()}`;
      if (e.injText) e.injText.value = phrase;
      await speakInjected(phrase);
      injStatus("Wizard: injected test phrase. Waiting for transcript confirmation...", false);

      const ok = await waitForTranscript(phrase, 20000);
      if (ok) {
        injStatus("Wizard success: injected phrase detected in transcript bridge.", false);
        status("Bridge wizard confirmed end-to-end injection + transcript path.", false);
      } else {
        injStatus(
          "Wizard partial: phrase not detected yet. Ensure meeting mic uses the same virtual cable and capture is active.",
          true
        );
        status("Bridge wizard needs manual audio routing check.", true);
      }
    } catch (err) {
      injStatus(`Wizard failed: ${String(err.message || err)}`, true);
    }
  };

  const sync = () => {
    if (e.ts) e.ts.textContent = String(e.qrs?.textContent || "Idle").trim() || "Idle";
    if (e.tm) e.tm.textContent = String(e.qrt?.textContent || "").trim() || "Transcript will appear here while capture is active.";
    setFlowBadge();
  };

  MODELS.forEach((model) => {
    const option = document.createElement("option");
    option.value = model[0];
    option.textContent = model[1] + (model[2].includes("Pro Plan Only") ? " (Pro Plan Only)" : "");
    e.model?.appendChild(option);
  });

  if (e.start) {
    e.start.onclick = () => {
      if (S.active) {
        S.active = false;
        status("Interview Copilot session ended.", false);
      } else {
        S.active = true;
        if (!S.sid) S.sid = D.sid;
        status(`Interview Copilot active (${S.tl} min, ${S.lang}).`, false);
      }
      render();
    };
  }

  if (e.share) e.share.onclick = share;
  if (e.stop) e.stop.onclick = stop;
  if (e.ask) e.ask.onclick = ask;
  if (e.useLast) e.useLast.onclick = useLast;
  if (e.clear) {
    e.clear.onclick = () => {
      if (e.q) e.q.value = "";
      status("Question cleared.", false);
    };
  }
  if (e.copyShare) e.copyShare.onclick = copy;
  if (e.prefs) e.prefs.onclick = () => open(e.prefDlg);
  if (e.hotkeys) e.hotkeys.onclick = () => open(e.hkDlg);
  if (e.pipBtn) e.pipBtn.onclick = pip;

  if (e.presetMeet) e.presetMeet.onclick = () => applyPreset("meet", true);
  if (e.presetZoom) e.presetZoom.onclick = () => applyPreset("zoom", true);
  if (e.presetTeams) e.presetTeams.onclick = () => applyPreset("teams", true);
  if (e.presetCustom) e.presetCustom.onclick = () => applyPreset("manual", true);
  if (e.applyPreset) e.applyPreset.onclick = () => applyPreset(S.preset, true);
  if (e.startPresetCapture) {
    e.startPresetCapture.onclick = () => {
      applyPreset(S.preset, false);
      share();
    };
  }
  if (e.resetChecks) {
    e.resetChecks.onclick = () => {
      CHECK_KEYS.forEach((checkKey) => {
        S.checks[checkKey] = false;
      });
      render();
      status("Onboarding checklist reset.", false);
    };
  }

  [
    [e.check1, "check1"],
    [e.check2, "check2"],
    [e.check3, "check3"]
  ].forEach(([node, key]) => {
    if (!node) return;
    node.onchange = () => {
      S.checks[key] = !!node.checked;
      renderPresetUi();
      setFlowBadge();
      save();
    };
  });

  if (e.injSpeak) e.injSpeak.onclick = () => speakInjected(e.injText?.value || "");
  if (e.injTest) e.injTest.onclick = () => selfTestInject();
  if (e.injWizard) e.injWizard.onclick = () => runBridgeWizard();
  if (e.injRefresh) e.injRefresh.onclick = () => refreshInjDevices();

  if (e.role) {
    e.role.oninput = () => {
      S.role = String(e.role.value || "").slice(0, 180);
      save();
    };
  }
  if (e.tl) e.tl.onchange = () => { S.tl = n(e.tl.value, 5, 180, S.tl); render(); };
  if (e.sl) e.sl.onchange = () => { S.sl = n(e.sl.value, 1, 12, S.sl); render(); };
  if (e.lang) e.lang.onchange = () => { S.lang = String(e.lang.value || "English"); render(); };
  if (e.stealth) {
    e.stealth.onchange = () => {
      S.stealth = !!e.stealth.checked;
      if (e.mainStealth && !!e.mainStealth.checked !== S.stealth) {
        e.mainStealth.checked = S.stealth;
        e.mainStealth.dispatchEvent(new Event("change", { bubbles: true }));
      }
      render();
    };
  }
  if (e.mainStealth) {
    e.mainStealth.onchange = () => {
      S.stealth = !!e.mainStealth.checked;
      if (e.stealth) e.stealth.checked = S.stealth;
      render();
    };
  }
  if (e.src) {
    e.src.onchange = () => {
      S.src = String(e.src.value || D.src);
      const inferredPreset = inferPresetFromSource(S.src);
      if (inferredPreset !== S.preset) {
        S.preset = inferredPreset;
        CHECK_KEYS.forEach((checkKey) => {
          S.checks[checkKey] = false;
        });
      }
      render();
      syncQuickSource();
    };
  }
  if (e.model) e.model.onchange = () => { S.model = String(e.model.value || D.model); render(); };
  if (e.len) e.len.onchange = () => { S.len = String(e.len.value || "balanced"); render(); };
  if (e.pa) e.pa.onchange = () => { S.auto = !!e.pa.checked; render(); };
  if (e.pq) e.pq.onchange = () => { S.showq = !!e.pq.checked; render(); };
  if (e.pl) e.pl.onchange = () => { S.showlen = !!e.pl.checked; render(); };
  if (e.pp) e.pp.onchange = () => { S.prompter = !!e.pp.checked; render(); };
  if (e.pi) e.pi.onchange = () => { S.pip = !!e.pi.checked; render(); };
  if (e.injDevice) {
    e.injDevice.onchange = () => {
      S.injDevice = String(e.injDevice.value || "default");
      save();
    };
  }

  if (e.q) {
    e.q.addEventListener("input", () => {
      renderFlowLane();
    });
    e.q.addEventListener("keydown", (ev) => {
      if (ev.ctrlKey && ev.key === "Enter") {
        ev.preventDefault();
        ask();
      }
    });
  }

  window.addEventListener("keydown", (ev) => {
    const key = String(ev.key || "").toLowerCase();

    if (ev.ctrlKey && !ev.shiftKey && key === "k") {
      ev.preventDefault();
      e.q?.focus();
      e.q?.select();
      return;
    }

    if (ev.ctrlKey && !ev.shiftKey && (key === "/" || key === "?")) {
      ev.preventDefault();
      open(e.hkDlg);
      return;
    }

    if (!(ev.ctrlKey && ev.shiftKey)) return;
    if (key === "i") {
      ev.preventDefault();
      e.start?.click();
    } else if (key === "a") {
      ev.preventDefault();
      share();
    } else if (key === "s") {
      ev.preventDefault();
      stop();
    } else if (key === "y") {
      ev.preventDefault();
      ask();
    } else if (key === "p") {
      ev.preventDefault();
      S.prompter = !S.prompter;
      render();
      status(`Prompter mode ${S.prompter ? "enabled" : "disabled"}.`, false);
    }
  });

  sync();
  setInterval(sync, 900);
  refreshOptionalRuntimeChips();
  setInterval(refreshOptionalRuntimeChips, 15000);
  refreshInjDevices();
  render();
  status("Interview Copilot ready. Start when you are.", false);
})();
