/**
 * Guardian Routes — extracted from server.js (ADR-0001 Phase 3)
 * Owner alerting, approval workflow, SMTP/WhatsApp config.
 */
const express = require("express");
const router = express.Router();
const { asBool, asInt, respondError } = require("../lib/helpers");
const { requirePermission } = require("../middleware/auth");
const settings = require("../lib/settings");

function createGuardianRouter(ctx) {
  const {
    getGuardianStatusSummary, getGuardianAlertStats,
    readGuardianProfile, bootstrapGuardianProfile, updateGuardianProfile,
    readGuardianSmtpConfig, setGuardianSmtpConfig,
    readGuardianWhatsAppConfig, setGuardianWhatsAppConfig,
    listGuardianAlerts, listApprovals, getApprovalById
  } = ctx;

  router.get("/status", (_req, res) => {
    const s = settings.get();
    res.json({
      ok: true,
      settings: {
        guardianMode: s.guardianMode, guardianAlertsEnabled: s.guardianAlertsEnabled,
        guardianRiskThreshold: s.guardianRiskThreshold, guardianAutoBlockCritical: s.guardianAutoBlockCritical,
        guardianNotifyPolicy: s.guardianNotifyPolicy, guardianRequireOwnerForCritical: s.guardianRequireOwnerForCritical
      },
      summary: getGuardianStatusSummary(),
      alerts: getGuardianAlertStats()
    });
  });

  router.get("/profile", (_req, res) => {
    res.json({ ok: true, profile: readGuardianProfile() || bootstrapGuardianProfile({}) });
  });

  router.post("/profile/bootstrap", requirePermission("admin"), (_req, res) => {
    res.json({ ok: true, profile: bootstrapGuardianProfile({}) });
  });

  router.post("/profile/update", requirePermission("admin"), (req, res) => {
    try {
      const profile = updateGuardianProfile({
        ownerName: req.body?.ownerName, aliases: req.body?.aliases, contacts: req.body?.contacts
      });
      res.json({ ok: true, profile });
    } catch (error) { respondError(res, error, 400); }
  });

  router.get("/smtp", (_req, res) => {
    res.json({ ok: true, smtp: readGuardianSmtpConfig() });
  });

  router.post("/smtp", requirePermission("admin"), (req, res) => {
    try {
      const smtp = setGuardianSmtpConfig({
        host: req.body?.host, port: req.body?.port, secure: req.body?.secure,
        user: req.body?.user, pass: req.body?.pass, from: req.body?.from, to: req.body?.to,
        clear: asBool(req.body?.clear, false)
      });
      res.json({ ok: true, smtp });
    } catch (error) { respondError(res, error, 400); }
  });

  router.get("/whatsapp", (_req, res) => {
    res.json({ ok: true, whatsapp: readGuardianWhatsAppConfig() });
  });

  router.post("/whatsapp", requirePermission("admin"), (req, res) => {
    try {
      const whatsapp = setGuardianWhatsAppConfig({
        accountSid: req.body?.accountSid, authToken: req.body?.authToken,
        fromNumber: req.body?.fromNumber || req.body?.from, toNumber: req.body?.toNumber || req.body?.to,
        clear: asBool(req.body?.clear, false)
      });
      res.json({ ok: true, whatsapp });
    } catch (error) { respondError(res, error, 400); }
  });

  router.get("/alerts", (req, res) => {
    const limit = asInt(req.query?.limit, 30, 1, 200);
    res.json({ ok: true, alerts: listGuardianAlerts(limit) });
  });

  router.get("/approvals", (req, res) => {
    const limit = asInt(req.query?.limit, 30, 1, 200);
    const status = String(req.query?.status || "pending").trim().toLowerCase();
    res.json({ ok: true, approvals: listApprovals({ status, limit }) });
  });

  router.get("/approvals/:id", (req, res) => {
    const approval = getApprovalById(req.params.id);
    if (!approval) return respondError(res, "Approval not found.", 404);
    res.json({ ok: true, approval });
  });

  // decide, webhook, whatsapp/inbound stay inline — heavy deps (task ledger sync, resume, webhook verify)

  return router;
}

module.exports = createGuardianRouter;
