/**
 * Uploads Routes — extracted from server.js (ADR-0001 strangler-fig)
 */
const express = require("express");
const router = express.Router();
const { saveUploadedImage } = require("../src/imageStore");
const { saveUploadedFile } = require("../src/fileStore");

const { requirePermission } = require("../middleware/auth");

function createUploadsRouter({ respondError }) {
  router.post("/image", requirePermission("write"), (req, res) => {
    try {
      const uploaded = saveUploadedImage({ fileName: req.body?.fileName, dataUrl: req.body?.dataUrl });
      res.json({ ok: true, image: uploaded });
    } catch (error) { respondError(res, error, 400); }
  });

  router.post("/file", requirePermission("write"), (req, res) => {
    try {
      const uploaded = saveUploadedFile({ fileName: req.body?.fileName, dataUrl: req.body?.dataUrl });
      res.json({ ok: true, file: uploaded });
    } catch (error) { respondError(res, error, 400); }
  });

  return router;
}

module.exports = createUploadsRouter;
