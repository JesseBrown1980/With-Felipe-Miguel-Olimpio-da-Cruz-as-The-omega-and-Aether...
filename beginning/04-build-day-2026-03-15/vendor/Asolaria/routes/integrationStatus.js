/**
 * Integration Status Routes — extracted from server.js (ADR-0001 strangler-fig)
 * Read-only status endpoints for all integration services.
 */
const express = require("express");
const router = express.Router();
const { respondError, inferHttpStatusForError, asInt } = require("../lib/helpers");

function createIntegrationStatusRouter(ctx) {
  const {
    getGithubIntegrationStatus, githubPolicy,
    getSymphonyIntegrationStatus, fetchSymphonyLiveState,
    getAbacusIntegrationStatus, getAbacusOperatingStrategy,
    getAbacusPacketPresets, listAbacusWorkPackets,
    getAugmentContextStatus, getGeminiApiConfigSummary, geminiApiPolicy,
    getSlackIntegrationStatus, slackPolicy
  } = ctx;

  // Slack
  router.get("/slack/status", async (_req, res) => {
    try { return res.json({ ok: true, status: await getSlackIntegrationStatus(slackPolicy) }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // GitHub
  router.get("/github/status", async (_req, res) => {
    try { return res.json({ ok: true, status: await getGithubIntegrationStatus(githubPolicy) }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // Symphony
  router.get("/symphony/status", async (_req, res) => {
    try {
      const status = getSymphonyIntegrationStatus();
      return res.json({ ok: true, status, liveState: await fetchSymphonyLiveState({ status }) });
    } catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // Abacus
  router.get("/abacus/status", (_req, res) => {
    try { return res.json({ ok: true, status: getAbacusIntegrationStatus() }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  router.get("/abacus/strategy", (_req, res) => {
    try { return res.json({ ok: true, strategy: getAbacusOperatingStrategy() }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  router.get("/abacus/presets", (_req, res) => {
    try { return res.json({ ok: true, presets: getAbacusPacketPresets() }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  router.get("/abacus/packets", (req, res) => {
    try {
      const limit = asInt(req.query?.limit, 25, 1, 500);
      return res.json({ ok: true, packets: listAbacusWorkPackets(limit) });
    } catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // Augment Context
  router.get("/augment-context/status", (_req, res) => {
    try { return res.json({ ok: true, status: getAugmentContextStatus() }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // Gemini API
  router.get("/gemini_api/status", async (_req, res) => {
    try { return res.json({ ok: true, status: getGeminiApiConfigSummary(geminiApiPolicy) }); }
    catch (error) { return respondError(res, error, 400); }
  });

  // Google
  router.get("/google/status", async (_req, res) => {
    try { return res.json({ ok: true, status: await ctx.getGoogleIntegrationStatus(ctx.googlePolicy) }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // Google Workspace CLI
  router.get("/google_workspace_cli/status", async (req, res) => {
    try {
      if (!ctx.googlePolicy.enabled) return respondError(res, "Google integration is disabled by policy.", 403);
      const account = String(req.query?.account || "").trim();
      const status = await ctx.getGoogleWorkspaceCliStatus({ account, timeoutMs: 30000 });
      return res.json({ ok: true, status });
    } catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // Microsoft
  router.get("/microsoft/status", async (_req, res) => {
    try { return res.json({ ok: true, status: await ctx.getMicrosoftIntegrationStatus(ctx.microsoftPolicy) }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // Atlassian
  router.get("/atlassian/status", async (_req, res) => {
    try { return res.json({ ok: true, status: await ctx.getAtlassianIntegrationStatus(ctx.atlassianPolicy) }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // HubSpot
  router.get("/hubspot/status", async (_req, res) => {
    try { return res.json({ ok: true, status: ctx.getHubSpotIntegrationStatus(ctx.hubspotPolicy) }); }
    catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  // GCP
  router.get("/gcp/status", (_req, res) => {
    try { return res.json({ ok: true, status: ctx.getGcpConfigSummary(ctx.gcpPolicy) }); }
    catch (error) { return respondError(res, error, 400); }
  });

  // Vertex
  router.get("/vertex/status", (_req, res) => {
    try {
      if (!ctx.vertexPolicy.enabled) {
        return res.json({ ok: true, status: { enabled: false, configured: false, note: "Vertex integration disabled by policy." } });
      }
      return res.json({ ok: true, status: { ...ctx.getVertexConfigSummary(ctx.vertexPolicy), budget: ctx.getVertexBudgetStatus(ctx.vertexPolicy) } });
    } catch (error) { return respondError(res, error, 400); }
  });

  router.get("/vertex/budget/status", (_req, res) => {
    try { return res.json({ ok: true, status: ctx.getVertexBudgetStatus(ctx.vertexPolicy) }); }
    catch (error) { return respondError(res, error, 400); }
  });

  // External providers
  router.get("/external/status", (_req, res) => {
    try {
      return res.json({
        ok: true, status: ctx.getExternalProviderStatus(),
        mcpCache: ctx.getExternalMcpCacheStatus(),
        mcpPolicyPresets: ctx.getExternalMcpPolicyPresets(),
        mcpTokenReductionProfiles: ctx.getExternalMcpTokenReductionProfiles()
      });
    } catch (error) { return respondError(res, error, 400); }
  });

  // Gemini Live
  router.get("/gemini_live/status", async (_req, res) => {
    try {
      return res.json({ ok: true, status: { text: ctx.getGeminiLiveStatus(ctx.vertexPolicy), audio: ctx.getGeminiLiveAudioStatus(ctx.vertexPolicy) } });
    } catch (error) { return respondError(res, error, 400); }
  });

  // OpenAI Web Chat
  router.get("/openai_web_chat/status", async (_req, res) => {
    try { return res.json({ ok: true, status: ctx.getOpenAiWebChatPolicySummary() }); }
    catch (error) { return respondError(res, error, 400); }
  });

  // ContactOut
  router.get("/contactout/status", async (_req, res) => {
    try { return res.json({ ok: true, status: ctx.getContactOutPolicySummary() }); }
    catch (error) { return respondError(res, error, 400); }
  });

  // Gemini Enterprise Web
  router.get("/gemini_enterprise_web/status", async (_req, res) => {
    try { return res.json({ ok: true, status: ctx.getGeminiEnterpriseWebPolicySummary() }); }
    catch (error) { return respondError(res, error, 400); }
  });

  // MQTT
  router.get("/mqtt/status", async (_req, res) => {
    try {
      const status = ctx.getMqttIntegrationStatus();
      const localBroker = await ctx.getLocalMqttBrokerStatus().catch(() => null);
      const browserRealtime = await ctx.buildMqttBrowserRealtimePacket({ includeWorldPreview: false }).catch(() => null);
      return res.json({ ok: true, status, localBroker, browserRealtime });
    } catch (error) { return respondError(res, error, inferHttpStatusForError(error, 500)); }
  });

  return router;
}

module.exports = createIntegrationStatusRouter;
