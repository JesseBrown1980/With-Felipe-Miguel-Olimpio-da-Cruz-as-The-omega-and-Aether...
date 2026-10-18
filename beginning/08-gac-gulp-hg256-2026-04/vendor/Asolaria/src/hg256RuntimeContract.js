const crypto = require("crypto");
const zlib = require("zlib");

const DIALECT = "BEHCS_HG256";
const LIVE_BASE = "47D";
const OVERLAY_MODE = "49D_PROPOSAL_ONLY";
const CANON_VERSION = "hg256-base256-canon.v1";
const RUNTIME_TRANCHE_ID = "Q1_Q5_RUNTIME_WIRING_V1";
const BOUNDARY_POLICY_ID = "hg256-boundary-policy.v1";
const TRANSPORT_POLICY_ID = "hg256-transport-envelope.v1";
const WHITE_ROOM_POLICY_ID = "white-room-consume-contract.v1";
const GC_POLICY_ID = "gc-append-only-2000.v1";

const DEFAULT_DENY_FLAGS = Object.freeze([
  "LOCAL_ONLY",
  "TRANSPORT=NO_REMOTE",
  "RELEASE=DENY_UNTIL_PROOFS",
  "PROMOTION=DENY_UNTIL_PROOFS",
  ":4913_BLOCKED",
  "D49_SEAL_DENY",
  "NO_PUBLIC_READY_CLAIMS",
  "NO_SECURITY_GUARANTEES",
  "NO_FAKE_GREEN",
  "NO_HISTORY_REWRITE",
  "NO_COMPACTION_WITHOUT_OWNER_SIG",
  "SKIPPED_NEVER_PASS"
]);

const DEFAULT_SKIPPED_CHECKS = Object.freeze([
  "remote_transport",
  "independent_review",
  "d49_seal"
]);

const DEFAULT_POLICY_IDS = Object.freeze([
  TRANSPORT_POLICY_ID,
  BOUNDARY_POLICY_ID,
  WHITE_ROOM_POLICY_ID,
  GC_POLICY_ID
]);

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function hashStable(value) {
  return sha256Text(stableStringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function isoOffset(baseIso, offsetMs) {
  const base = Date.parse(baseIso || nowIso());
  return new Date((Number.isFinite(base) ? base : Date.now()) + offsetMs).toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

function clampInt(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function clipText(value, maxChars = 240) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function normalizeGlyphToken(value, fallback) {
  const normalized = String(value || fallback || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || String(fallback || "UNKNOWN").toUpperCase();
}

function encodeGlyphTransportMap(glyphs = {}) {
  const out = {};
  for (const [key, value] of Object.entries(glyphs)) {
    out[key] = Buffer.from(String(value || ""), "utf8").toString("hex");
  }
  return out;
}

function normalizeWriteScope(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const allowlist = new Set([
    "read_only",
    "lane_bounded",
    "repo_bounded",
    "owner_gate_required"
  ]);
  return allowlist.has(normalized) ? normalized : "lane_bounded";
}

function normalizeTextArray(value, maxItems = 12, maxChars = 120) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => clipText(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

function toNonNegativeIntOrNull(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return Math.round(numeric);
}

function parseLooseProofBudget(value) {
  if (typeof value === "string") {
    const match = value.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) {
      return null;
    }
    const trackedFiles = Number(match[1]);
    const maxTrackedFiles = Number(match[2]);
    return {
      trackedFiles,
      maxTrackedFiles,
      remainingFiles: Math.max(0, maxTrackedFiles - trackedFiles)
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const trackedFiles = toNonNegativeIntOrNull(
    value.trackedFiles ?? value.tracked ?? value.current ?? value.fileCount ?? value.count
  );
  const maxTrackedFiles = toNonNegativeIntOrNull(
    value.maxTrackedFiles ?? value.max ?? value.limit ?? value.capacity
  );
  let remainingFiles = toNonNegativeIntOrNull(
    value.remainingFiles ?? value.remaining
  );

  if (remainingFiles === null && trackedFiles !== null && maxTrackedFiles !== null) {
    remainingFiles = Math.max(0, maxTrackedFiles - trackedFiles);
  }

  if (trackedFiles === null && maxTrackedFiles === null && remainingFiles === null) {
    return null;
  }

  return {
    trackedFiles: trackedFiles ?? 0,
    maxTrackedFiles: maxTrackedFiles ?? 0,
    remainingFiles: remainingFiles ?? Math.max(0, (maxTrackedFiles ?? 0) - (trackedFiles ?? 0))
  };
}

function normalizeSecondaryContextKind(value, fallback = "secondary") {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "shadow" || normalized === "mirror" || normalized === "archive" || normalized === "secondary") {
    return normalized;
  }
  return fallback;
}

function normalizeSecondaryContextRefs(source = {}) {
  const refs = [];
  const pushRefs = (entries, fallbackKind) => {
    if (!Array.isArray(entries)) {
      return;
    }
    for (const entry of entries) {
      if (refs.length >= 8) {
        break;
      }
      if (typeof entry === "string") {
        const ref = clipText(entry, 220);
        if (!ref) {
          continue;
        }
        refs.push({
          kind: normalizeSecondaryContextKind(fallbackKind, "secondary"),
          ref
        });
        continue;
      }
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const ref = clipText(entry.ref || entry.path || entry.id || entry.key || "", 220);
      if (!ref) {
        continue;
      }
      refs.push({
        kind: normalizeSecondaryContextKind(entry.kind || entry.type || fallbackKind, "secondary"),
        ref
      });
    }
  };

  pushRefs(source.secondaryContextRefs, "secondary");
  pushRefs(source.contextRefs, "secondary");
  pushRefs(source.shadowRefs, "shadow");
  pushRefs(source.mirrorRefs, "mirror");
  pushRefs(source.archiveRefs, "archive");

  const deduped = [];
  const seen = new Set();
  for (const item of refs) {
    const key = `${item.kind}|${item.ref}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push({
      kind: item.kind,
      ref: item.ref,
      contextClass: "secondary",
      promotionState: "non_promoted",
      promoted: false
    });
    if (deduped.length >= 8) {
      break;
    }
  }
  return deduped;
}

function summarizeSecondaryContextRefs(refs = []) {
  if (!Array.isArray(refs) || !refs.length) {
    return "";
  }
  const counts = { shadow: 0, mirror: 0, archive: 0, secondary: 0 };
  for (const item of refs) {
    const kind = normalizeSecondaryContextKind(item?.kind, "secondary");
    counts[kind] += 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${kind}:${count}`)
    .join(",");
}

function normalizeSelfBuildController(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const activeLane = clipText(source.activeLane || source.laneId || source.lane || "", 96);
  const nextQueueReadyLane = clipText(
    source.nextQueueReadyLane || source.nextLane || source.queueLane || "",
    96
  );
  const guardStatus = clipText(
    source.guardStatus || source.guard?.status || source.guardSummary?.status || "",
    32
  ).toLowerCase();
  const guardReasons = normalizeTextArray(
    source.guardReasons || source.guard?.reasons || source.guardSummary?.reasons || source.reasons,
    6,
    96
  );
  const tasks = normalizeTextArray(
    source.tasks || source.recommendedTasks || source.controllerTasks,
    6,
    140
  );
  const proofBudget = parseLooseProofBudget(
    source.proofBudget
      ?? source.fileCapGuard
      ?? source.fileCap
      ?? source.guard?.fileCap
      ?? source.guardSummary?.fileCap
  );
  const secondaryContextRefs = normalizeSecondaryContextRefs(source);
  const packetType = clipText(source.packetType || source.type || "", 96);
  const hasSignal = Boolean(
    packetType
      || activeLane
      || nextQueueReadyLane
      || guardStatus
      || guardReasons.length
      || tasks.length
      || proofBudget
      || secondaryContextRefs.length
      || source.localOnly !== undefined
      || source.bounded !== undefined
      || source.noPromotionClaims !== undefined
  );

  if (!hasSignal) {
    return null;
  }

  return {
    packetType: packetType || "self_build_controller_packet.v1",
    activeLane,
    nextQueueReadyLane,
    guardStatus: guardStatus || "unknown",
    guardReasons,
    proofBudget,
    secondaryContextRefs,
    localOnly: source.localOnly !== false,
    bounded: source.bounded !== false,
    noPromotionClaims: source.noPromotionClaims !== false,
    tasks
  };
}

function buildSelfBuildControllerLanguage(controller = null) {
  if (!controller) {
    return null;
  }
  const budget = controller.proofBudget
    ? `${controller.proofBudget.trackedFiles}/${controller.proofBudget.maxTrackedFiles}`
    : "unknown";
  const reasons = controller.guardReasons.length
    ? `|reasons=${controller.guardReasons.slice(0, 3).join("+")}`
    : "";
  const secondaryContext = summarizeSecondaryContextRefs(controller.secondaryContextRefs);
  const secondarySuffix = secondaryContext ? `|secondary=${secondaryContext}` : "";
  const secondaryHuman = secondaryContext ? ` secondary ${secondaryContext}.` : "";
  return {
    human: clipText(
      `Controller truth lane ${controller.activeLane || "unknown"} next ${controller.nextQueueReadyLane || "none"} guard ${controller.guardStatus} budget ${budget}.${secondaryHuman}`,
      240
    ),
    agent: clipText(
      `BEHCS_CTRL|type=${controller.packetType}|lane=${controller.activeLane || "none"}|next=${controller.nextQueueReadyLane || "none"}|guard=${controller.guardStatus}|budget=${budget}|local=${controller.localOnly ? 1 : 0}|bounded=${controller.bounded ? 1 : 0}|nopromo=${controller.noPromotionClaims ? 1 : 0}${reasons}${secondarySuffix}`,
      320
    ),
    device: clipText(
      `controller truth lane=${controller.activeLane || "none"} next=${controller.nextQueueReadyLane || "none"} guard=${controller.guardStatus} budget=${budget} local_only=${controller.localOnly ? 1 : 0} bounded=${controller.bounded ? 1 : 0} no_promotion=${controller.noPromotionClaims ? 1 : 0}${secondaryContext ? ` secondary=${secondaryContext}` : ""}`,
      320
    )
  };
}

function normalizeToolContract(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    commands: normalizeTextArray(source.commands, 12, 160),
    globs: normalizeTextArray(source.globs, 8, 160),
    roots: normalizeTextArray(source.roots, 8, 220),
    routes: normalizeTextArray(source.routes, 8, 160),
    notes: normalizeTextArray(source.notes, 8, 220)
  };
}

function normalizeBossChannels(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const scheduler = source.scheduler && typeof source.scheduler === "object" ? source.scheduler : {};
  const mailbox = source.mailbox && typeof source.mailbox === "object" ? source.mailbox : {};
  const meeting = source.meeting && typeof source.meeting === "object" ? source.meeting : {};
  return {
    scheduler: {
      kind: clipText(scheduler.kind || "omnischeduler", 64),
      listRoute: clipText(scheduler.listRoute || "", 180),
      upcomingRoute: clipText(scheduler.upcomingRoute || "", 180),
      createRoute: clipText(scheduler.createRoute || "", 180),
      cadence: clipText(scheduler.cadence || "derived.omnicalendar", 120),
      notes: normalizeTextArray(scheduler.notes, 6, 180)
    },
    mailbox: {
      kind: clipText(mailbox.kind || "omnimailbox", 64),
      pendingPath: clipText(mailbox.pendingPath || "", 220),
      processorPath: clipText(mailbox.processorPath || "", 220),
      escalateTarget: clipText(mailbox.escalateTarget || "", 120),
      notes: normalizeTextArray(mailbox.notes, 6, 180)
    },
    meeting: {
      kind: clipText(meeting.kind || "omni_digital_google_meet", 64),
      roomRuntime: clipText(meeting.roomRuntime || "", 220),
      roomLog: clipText(meeting.roomLog || "", 220),
      transportRuntime: clipText(meeting.transportRuntime || "", 220),
      algorithm: clipText(meeting.algorithm || "brown_hilbert_expansion", 120),
      roomMode: clipText(meeting.roomMode || "infinite_rooms", 120),
      notes: normalizeTextArray(meeting.notes, 6, 180)
    }
  };
}

function buildChildLaunchPrompt(packet = {}) {
  const lines = [
    "[BEHCS_CHILD_CAPSULE]",
    `qid=${packet.qId || "Q6_OMNISPINDLE_OPENCODE_CHILD"}`,
    `capsule_id=${packet.capsuleId || "omnispindle-opencode-child"}`,
    `parent_lane=${packet.parentLaneId || "unknown"}`,
    `child_lane=${packet.childLaneId || "unknown"}`,
    `child_slot=${packet.childIndex || 1}`,
    `ttl_ms=${packet.ttlMs || 90000}`,
    `token_budget=${packet.tokenBudget || 1200}`,
    `write_scope=${packet.writeScope || "lane_bounded"}`,
    `seal_sha256=${packet.sealSha256 || ""}`,
    packet.labels?.length ? `labels=${packet.labels.join(",")}` : "",
    packet.toolContract?.commands?.length ? `tools.commands=${packet.toolContract.commands.join(" | ")}` : "",
    packet.toolContract?.globs?.length ? `tools.globs=${packet.toolContract.globs.join(" | ")}` : "",
    packet.toolContract?.roots?.length ? `tools.roots=${packet.toolContract.roots.join(" | ")}` : "",
    packet.toolContract?.routes?.length ? `tools.routes=${packet.toolContract.routes.join(" | ")}` : "",
    packet.bossChannels?.scheduler?.upcomingRoute ? `boss.scheduler=${packet.bossChannels.scheduler.upcomingRoute}` : "",
    packet.bossChannels?.mailbox?.pendingPath ? `boss.mailbox=${packet.bossChannels.mailbox.pendingPath}` : "",
    packet.bossChannels?.meeting?.roomRuntime ? `boss.meeting=${packet.bossChannels.meeting.roomRuntime}` : "",
    packet.selfBuildController?.activeLane ? `self_build.active_lane=${packet.selfBuildController.activeLane}` : "",
    packet.selfBuildController?.nextQueueReadyLane ? `self_build.next_lane=${packet.selfBuildController.nextQueueReadyLane}` : "",
    packet.selfBuildController?.guardStatus ? `self_build.guard=${packet.selfBuildController.guardStatus}` : "",
    packet.selfBuildController?.proofBudget
      ? `self_build.budget=${packet.selfBuildController.proofBudget.trackedFiles}/${packet.selfBuildController.proofBudget.maxTrackedFiles}`
      : "",
    packet.selfBuildController?.secondaryContextRefs?.length
      ? `self_build.secondary=${summarizeSecondaryContextRefs(packet.selfBuildController.secondaryContextRefs)}`
      : "",
    "",
    "OBJECTIVE",
    packet.objective || "Execute the bounded child task.",
    packet.instructions ? `\nINSTRUCTIONS\n${packet.instructions}` : "",
    packet.toolContract?.notes?.length ? `\nOPERATING_NOTES\n- ${packet.toolContract.notes.join("\n- ")}` : "",
    packet.bossChannels?.meeting?.algorithm
      ? `\nBOSS_CHANNELS\n- scheduler=${packet.bossChannels.scheduler.upcomingRoute || "unbound"}\n- mailbox=${packet.bossChannels.mailbox.pendingPath || "unbound"}\n- meeting=${packet.bossChannels.meeting.roomRuntime || "unbound"}\n- meeting_algorithm=${packet.bossChannels.meeting.algorithm}`
      : "",
    "\nRETURN",
    "Reply concisely, stay inside capsule scope, and report blockers instead of widening."
  ].filter(Boolean);

  return lines.join("\n");
}

function buildCanonLock(options = {}) {
  const at = options.ts || nowIso();
  const owner = String(options.owner || "jesse");
  const agentPid = String(options.agentPid || process.pid);
  const devicePid = String(options.devicePid || "jesse-desktop");
  const packetSha256 = String(options.packetSha256 || "");
  const proofRef = String(options.proofRef || "reports/crypto/capsule.verify.json");
  const verifyStatus = String(options.verifyStatus || "pass_local_only");

  return {
    version: CANON_VERSION,
    dialect: DIALECT,
    liveBase: LIVE_BASE,
    overlayMode: OVERLAY_MODE,
    d37: {
      authorityRootId: String(options.authorityRootId || "jesse.override.local"),
      owner,
      operatorRole: String(options.operatorRole || "chief"),
      agentPid,
      devicePid,
      waiverScopeId: String(options.waiverScopeId || "continuation_only"),
      signerId: String(options.signerId || "jesse.override"),
      proofRef,
      packetSha256
    },
    d44: {
      runTs: at,
      verificationTs: String(options.verificationTs || at),
      heartbeatTtlS: Number(options.heartbeatTtlS || 300),
      traceId: String(options.traceId || makeId("trace")),
      verifyLogRef: String(options.verifyLogRef || proofRef),
      verifyStatus
    },
    d45: {
      windowStartTs: String(options.windowStartTs || at),
      windowEndTs: String(options.windowEndTs || isoOffset(at, 4 * 60 * 60 * 1000)),
      windowPolicyId: String(options.windowPolicyId || "local-window.q1-q5.v1"),
      reason: String(options.reason || "runtime_wiring_execution"),
      allowRemote: false,
      allowPromotion: false
    },
    d46: {
      keyCustody: String(options.keyCustody || "local_only_operator_managed"),
      keyRef: String(options.keyRef || "vault://owner/crypto-capsule/local-signing"),
      publicKeyRef: String(options.publicKeyRef || "vault://owner/crypto-capsule/public-key"),
      egressScrubRef: String(options.egressScrubRef || "docs/HG256_BOUNDARY_POLICY.md#local-egress"),
      rotationIntervalDays: Number(options.rotationIntervalDays || 30),
      revokeOnCompromise: true,
      replaceOnExpiry: true
    },
    d47: {
      scopeBoundary: String(options.scopeBoundary || "lane_host_artifact_specific"),
      lanesAllowed: Array.isArray(options.lanesAllowed) && options.lanesAllowed.length
        ? options.lanesAllowed.map((item) => String(item))
        : ["instant_agent_spawner", "hook_event_store", "crypto_capsule_white_room"],
      denyCrossBoundary: true,
      boundaryRulesRef: String(options.boundaryRulesRef || "docs/HG256_BOUNDARY_POLICY.md"),
      revocationPointerRef: String(options.revocationPointerRef || "reports/crypto/capsule.revocation.json"),
      gate4913Required: false
    }
  };
}

function buildRouteHookEnvelope(options = {}) {
  const ts = String(options.ts || nowIso());
  const route = String(options.route || "runtime");
  const routeStage = String(options.routeStage || "build");
  const owner = String(options.owner || "jesse");
  const agentId = String(options.agentId || "");
  const role = String(options.role || "");
  const constructionId = String(options.constructionId || "");
  const packetSha256 = String(options.packetSha256 || hashStable(options.packetSource || { route, routeStage, constructionId, agentId }));
  const payloadSha256 = String(options.payloadSha256 || hashStable(options.payloadSource || {}));
  const fingerprint = String(options.fingerprint || "");
  const denyFlags = Array.isArray(options.denyFlags) && options.denyFlags.length
    ? options.denyFlags.map((item) => String(item))
    : [...DEFAULT_DENY_FLAGS];
  const skippedChecks = Array.isArray(options.skippedChecks)
    ? options.skippedChecks.map((item) => String(item))
    : [...DEFAULT_SKIPPED_CHECKS];
  const policyIds = Array.isArray(options.policyIds) && options.policyIds.length
    ? options.policyIds.map((item) => String(item))
    : [...DEFAULT_POLICY_IDS];
  const atlasBinding = options.atlasBinding && typeof options.atlasBinding === "object"
    ? {
      atlasId: String(options.atlasBinding.atlasId || ""),
      surfaceRegistryId: String(options.atlasBinding.surfaceRegistryId || ""),
      promotionQueueId: String(options.atlasBinding.promotionQueueId || ""),
      laneId: String(options.atlasBinding.laneId || ""),
      laneStatus: String(options.atlasBinding.laneStatus || ""),
      laneCurrentStage: String(options.atlasBinding.laneCurrentStage || ""),
      laneNextStage: String(options.atlasBinding.laneNextStage || ""),
      roleSurfaceId: String(options.atlasBinding.roleSurfaceId || ""),
      matchingSurfaceIds: Array.isArray(options.atlasBinding.matchingSurfaceIds)
        ? options.atlasBinding.matchingSurfaceIds.map((item) => String(item)).slice(0, 24)
        : [],
      matchingGroupIds: Array.isArray(options.atlasBinding.matchingGroupIds)
        ? options.atlasBinding.matchingGroupIds.map((item) => String(item)).slice(0, 24)
        : [],
      sourcePaths: Array.isArray(options.atlasBinding.sourcePaths)
        ? options.atlasBinding.sourcePaths.map((item) => String(item)).slice(0, 16)
        : []
    }
    : null;
  const selfBuildController = normalizeSelfBuildController(
    options.selfBuildController || options.selfBuild || options.controllerTruth || options.controller
  );
  const selfBuildLanguage = buildSelfBuildControllerLanguage(selfBuildController);
  const scopeHashParts = [
    RUNTIME_TRANCHE_ID,
    options.qId || "",
    route,
    routeStage,
    constructionId,
    agentId,
    packetSha256,
    atlasBinding?.laneId || "",
    (atlasBinding?.matchingSurfaceIds || []).join(",")
  ];
  if (selfBuildController) {
    const secondarySummary = summarizeSecondaryContextRefs(selfBuildController.secondaryContextRefs);
    scopeHashParts.push(
      selfBuildController.packetType || "",
      selfBuildController.activeLane || "",
      selfBuildController.guardStatus || "",
      secondarySummary
    );
  }
  const scopeHash = sha256Text(scopeHashParts.join("|")).slice(0, 24);
  const glyph256 = {
    route: `HG256:ROUTE:${normalizeGlyphToken(route, "RUNTIME")}`,
    stage: `HG256:STAGE:${normalizeGlyphToken(routeStage, "BUILD")}`,
    state: "HG256:STATE:LOCAL_ONLY",
    check: "HG256:CHECK:SKIPPED_NEVER_PASS",
    tranche: `HG256:TRANCHE:${normalizeGlyphToken(RUNTIME_TRANCHE_ID, "Q1_Q5_RUNTIME_WIRING_V1")}`
  };

  return {
    evtId: String(options.evtId || makeId("rt")),
    ts,
    trancheId: String(options.trancheId || RUNTIME_TRANCHE_ID),
    qId: String(options.qId || "Q4_TRANSPORT_ENVELOPE"),
    owner,
    pid: String(options.agentPid || process.pid),
    devicePid: String(options.devicePid || "jesse-desktop"),
    agentId,
    role,
    constructionId,
    canonVer: CANON_VERSION,
    dialect: DIALECT,
    runtimeBase: LIVE_BASE,
    overlayMode: OVERLAY_MODE,
    route,
    routeStage,
    capsuleId: String(options.capsuleId || "runtime-envelope"),
    packetSha256,
    payloadSha256,
    fingerprint,
    scopeHash,
    atlas: atlasBinding,
    ...(selfBuildController ? { selfBuildController, selfBuildLanguage } : {}),
    failClosed: options.failClosed !== false,
    driftFlag: Boolean(options.driftFlag),
    policyIds,
    denyFlags,
    skippedChecks,
    transport: {
      glyphEncoding: "utf8_hex_envelope",
      asciiSafeTransport: true,
      confusablePolicy: "NFKC+mixed_script+zero_width_fail_closed",
      glyph256,
      glyph256Transport: encodeGlyphTransportMap(glyph256)
    },
    canon: buildCanonLock({
      ts,
      owner,
      agentPid: options.agentPid,
      devicePid: options.devicePid,
      packetSha256,
      proofRef: options.proofRef,
      verifyStatus: options.verifyStatus,
      operatorRole: options.operatorRole,
      authorityRootId: options.authorityRootId,
      signerId: options.signerId,
      waiverScopeId: options.waiverScopeId,
      traceId: options.traceId,
      boundaryRulesRef: options.boundaryRulesRef,
      revocationPointerRef: options.revocationPointerRef,
      lanesAllowed: options.lanesAllowed
    })
  };
}

function buildHierarchicalChildCapsule(options = {}) {
  const parentLaneId = String(options.parentLaneId || options.spindleId || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
  const childIndex = clampInt(options.childIndex || options.childSlot || 1, 1, 1, 6);
  const childLaneId = String(options.childLaneId || `${parentLaneId}:opencode:${childIndex}`)
    .trim()
    || `${parentLaneId}:opencode:${childIndex}`;
  const tokenBudget = clampInt(options.tokenBudget, 1200, 100, 120000);
  const ttlMs = clampInt(options.ttlMs, 90000, 15000, 15 * 60 * 1000);
  const writeScope = normalizeWriteScope(options.writeScope);
  const objective = clipText(options.objective || options.prompt || options.goal, 4000);
  const instructions = clipText(options.instructions || "", 4000);
  const labels = normalizeTextArray(
    options.labels && Array.isArray(options.labels)
      ? options.labels
      : ["behcs", "omnispindle", "opencode", parentLaneId],
    12,
    64
  );
  const toolContract = normalizeToolContract(options.toolContract);
  const bossChannels = normalizeBossChannels(options.bossChannels);
  const selfBuildController = normalizeSelfBuildController(
    options.selfBuildController || options.selfBuild || options.controllerTruth || options.controller
  );
  const selfBuildLanguage = buildSelfBuildControllerLanguage(selfBuildController);
  const qId = String(options.qId || "Q6_OMNISPINDLE_OPENCODE_CHILD");
  const trancheId = String(options.trancheId || "Q6_OMNISPINDLE_OPENCODE_CHILD_V1");
  const capsuleId = String(options.capsuleId || "omnispindle-opencode-child");
  const role = String(options.role || `omnispindle-${parentLaneId}`);
  const constructionId = String(options.constructionId || `omnispindle:${parentLaneId}:${childIndex}`);
  const language = {
    human: clipText(`Spindle ${parentLaneId} child ${childIndex} executes a bounded OpenCode task under ${writeScope}.`, 220),
    agent: clipText(`BEHCS|q=${qId}|parent=${parentLaneId}|child=${childLaneId}|slot=${childIndex}|ttl=${ttlMs}|budget=${tokenBudget}|scope=${writeScope}`, 260),
    device: clipText(`dispatch opencode child parent=${parentLaneId} child=${childLaneId} ttl_ms=${ttlMs} token_budget=${tokenBudget} write_scope=${writeScope}`, 260)
  };
  if (selfBuildLanguage) {
    language.controller = selfBuildLanguage;
  }
  const packetSource = {
    parentLaneId,
    childLaneId,
    childIndex,
    tokenBudget,
    ttlMs,
    writeScope,
    labels,
    toolContract,
    bossChannels,
    ...(selfBuildController ? { selfBuildController } : {}),
    objective
  };
  const payloadSource = {
    objective,
    instructions,
    languageAgent: language.agent,
    ...(selfBuildLanguage ? { languageControllerAgent: selfBuildLanguage.agent } : {}),
    toolContract,
    bossChannels
  };

  const routeHook = buildRouteHookEnvelope({
    ...options,
    qId,
    trancheId,
    route: String(options.route || "omnispindle_opencode_child"),
    routeStage: String(options.routeStage || "dispatch"),
    capsuleId,
    role,
    constructionId,
    packetSource,
    payloadSource,
    ...(selfBuildController ? { selfBuildController } : {}),
    lanesAllowed: Array.isArray(options.lanesAllowed) && options.lanesAllowed.length
      ? options.lanesAllowed
      : ["omnispindle", "opencode", "hook_event_store", "crypto_capsule_white_room"]
  });

  const sealSha256 = hashStable({
    routeHook,
    parentLaneId,
    childLaneId,
    childIndex,
    tokenBudget,
    ttlMs,
    writeScope,
    labels,
    language,
    ...(selfBuildController ? { selfBuildController, selfBuildLanguage } : {}),
    toolContract,
    bossChannels,
    objective,
    instructions
  });

  const packet = {
    qId,
    trancheId,
    capsuleId,
    parentLaneId,
    childLaneId,
    childIndex,
    tokenBudget,
    ttlMs,
    writeScope,
    labels,
    language,
    ...(selfBuildController ? { selfBuildController, selfBuildLanguage } : {}),
    toolContract,
    bossChannels,
    objective,
    instructions,
    routeHook,
    sealSha256
  };

  return {
    ...packet,
    launchPrompt: buildChildLaunchPrompt({
      ...packet,
      sealSha256
    })
  };
}

module.exports = {
  DIALECT,
  LIVE_BASE,
  OVERLAY_MODE,
  CANON_VERSION,
  RUNTIME_TRANCHE_ID,
  BOUNDARY_POLICY_ID,
  TRANSPORT_POLICY_ID,
  WHITE_ROOM_POLICY_ID,
  GC_POLICY_ID,
  DEFAULT_DENY_FLAGS,
  DEFAULT_SKIPPED_CHECKS,
  DEFAULT_POLICY_IDS,
  stableStringify,
  sha256Text,
  hashStable,
  encodeGlyphTransportMap,
  normalizeSelfBuildController,
  buildSelfBuildControllerLanguage,
  buildCanonLock,
  buildRouteHookEnvelope,
  buildHierarchicalChildCapsule
};
