const fs = require("node:fs");
const path = require("node:path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendNdjson(filePath, row) {
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8");
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return String(fs.readFileSync(filePath, "utf8") || "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function formatTranscriptLine(entry) {
  return `[${entry.step}] ${entry.from} -> ${entry.to}: ${entry.text}`;
}

function defaultScript() {
  return [
    { from: "scriptor", to: "writer", text: "hello" },
    { from: "writer", to: "scriptor", text: "hi" },
    { from: "scriptor", to: "writer", text: "how are you" },
    { from: "writer", to: "scriptor", text: "i am fine" },
    { from: "scriptor", to: "writer", text: "test complete" },
    { from: "writer", to: "scriptor", text: "transcript saved" }
  ];
}

function runSelfRelayConversation(options = {}) {
  const outputDir = path.resolve(options.outputDir || path.join(process.cwd(), "runtime", "demo-self-chat"));
  ensureDir(outputDir);
  const taskId = String(options.taskId || "IX-521").trim();
  const chain = Array.isArray(options.chain) && options.chain.length > 0
    ? options.chain.map((entry) => String(entry || "").trim()).filter(Boolean)
    : ["IX-520", taskId];

  const messageBoxPath = path.join(outputDir, "message-box.ndjson");
  const relayLogPath = path.join(outputDir, "relay-log.ndjson");
  const transcriptPath = path.join(outputDir, "transcript.txt");

  fs.writeFileSync(messageBoxPath, "", "utf8");
  fs.writeFileSync(relayLogPath, "", "utf8");
  fs.writeFileSync(transcriptPath, "", "utf8");

  const script = Array.isArray(options.script) && options.script.length > 0
    ? options.script
    : defaultScript();

  const transcriptEntries = [];
  script.forEach((turn, index) => {
    const step = index + 1;
    const envelope = {
      taskId,
      chain,
      step,
      from: String(turn.from || "").trim(),
      to: String(turn.to || "").trim(),
      text: String(turn.text || "").trim(),
      ts: new Date().toISOString()
    };
    appendNdjson(messageBoxPath, envelope);
    appendNdjson(relayLogPath, {
      step,
      taskId,
      type: "writer_pinged",
      target: "writer",
      source: envelope.from,
      via: "message-box",
      ts: envelope.ts
    });
    transcriptEntries.push(envelope);
    fs.appendFileSync(transcriptPath, `${formatTranscriptLine(envelope)}\n`, "utf8");
  });

  return {
    ok: true,
    taskId,
    outputDir,
    messageBoxPath,
    relayLogPath,
    transcriptPath,
    messages: readNdjson(messageBoxPath),
    relays: readNdjson(relayLogPath),
    transcript: String(fs.readFileSync(transcriptPath, "utf8") || "").trim().split(/\r?\n/g).filter(Boolean)
  };
}

module.exports = {
  defaultScript,
  runSelfRelayConversation
};

if (require.main === module) {
  const result = runSelfRelayConversation();
  console.log(JSON.stringify({
    ok: result.ok,
    outputDir: result.outputDir,
    messageCount: result.messages.length,
    relayCount: result.relays.length,
    transcript: result.transcript
  }, null, 2));
}
