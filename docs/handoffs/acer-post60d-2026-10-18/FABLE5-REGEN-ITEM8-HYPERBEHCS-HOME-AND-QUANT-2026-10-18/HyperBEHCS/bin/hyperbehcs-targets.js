#!/usr/bin/env node
"use strict";

const targets = require("../lib/hyperbehcs-targets.cjs");

try {
  const { report, reportPath } = targets.writeTargetReport();
  console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: String(error?.stack || error) }, null, 2));
  process.exitCode = 1;
}
