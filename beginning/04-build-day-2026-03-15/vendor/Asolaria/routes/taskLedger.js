const express = require("express");
const {
  getTaskLedgerSummary,
  getTaskLedgerState,
  listTaskLedgerTasks,
  getTaskLedgerTask,
  createTaskLedgerTask,
  updateTaskLedgerTask,
  deleteTaskLedgerTask,
  listTaskLedgerEvents,
  addTaskLedgerEvent
} = require("../src/taskLedgerStore");

function createTaskLedgerRouter({ respondError, inferHttpStatusForError }) {
  const router = express.Router();

  function sendError(res, error) {
    const status = inferHttpStatusForError(error);
    return respondError(res, error, status);
  }

  // GET /summary
  router.get("/summary", (_req, res) => {
    try {
      const summary = getTaskLedgerSummary();
      return res.json({ ok: true, summary });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // GET /state
  router.get("/state", (req, res) => {
    try {
      const q = req.query || {};
      const result = getTaskLedgerState({
        projectScope: q.projectScope || q.scope,
        projectMarker: q.projectMarker,
        includeArchived: q.includeArchived !== undefined ? q.includeArchived !== "false" : undefined,
        taskStatus: q.taskStatus || q.status,
        taskPriority: q.taskPriority || q.priority,
        taskQuery: q.taskQuery || q.q,
        taskLimit: q.taskLimit || q.limit,
        eventLimit: q.eventLimit,
        eventTaskId: q.eventTaskId,
        eventType: q.eventType,
        eventActor: q.eventActor,
        eventSince: q.eventSince,
        eventUntil: q.eventUntil
      });
      return res.json({ ok: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // GET /tasks
  router.get("/tasks", (req, res) => {
    try {
      const q = req.query || {};
      const tasks = listTaskLedgerTasks({
        status: q.status,
        priority: q.priority,
        query: q.query || q.q,
        includeArchived: q.includeArchived !== undefined ? q.includeArchived !== "false" : undefined,
        projectScope: q.projectScope || q.scope,
        projectMarker: q.projectMarker,
        limit: q.limit
      });
      return res.json({ ok: true, count: tasks.length, tasks });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // GET /tasks/:id
  router.get("/tasks/:id", (req, res) => {
    try {
      const q = req.query || {};
      const task = getTaskLedgerTask(req.params.id, {
        includeEvents: q.includeEvents !== undefined ? q.includeEvents !== "false" : false,
        eventLimit: q.eventLimit
      });
      if (!task) {
        return res.status(404).json({ ok: false, error: "Task not found." });
      }
      return res.json({ ok: true, task });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // POST /tasks
  router.post("/tasks", (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = createTaskLedgerTask(body);
      return res.json({ ok: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // PATCH /tasks/:id
  router.patch("/tasks/:id", (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { patch, ...options } = body;
      const result = updateTaskLedgerTask(req.params.id, patch || body, {
        actor: options.actor || options.by,
        source: options.source,
        note: options.note,
        type: options.type
      });
      return res.json({ ok: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // DELETE /tasks/:id
  router.delete("/tasks/:id", (req, res) => {
    try {
      const q = req.query || {};
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = deleteTaskLedgerTask(req.params.id, {
        hard: q.hard === "true" || body.hard === true,
        actor: body.actor || q.actor,
        source: body.source || q.source,
        note: body.note
      });
      return res.json({ ok: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // POST /tasks/:id/events
  router.post("/tasks/:id/events", (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = addTaskLedgerEvent(req.params.id, body);
      return res.json({ ok: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  return router;
}

module.exports = createTaskLedgerRouter;
