const {
  getColonyMemoryStatus,
  searchColonyMemory,
  buildColonyMemoryContextForPrompt
} = require("../../src/colonyMemoryStore");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}`);
  }
}

function run() {
  const status = getColonyMemoryStatus({});
  assert(status.ok === true, "status ok");
  assert(status.enabled === true, "status enabled");
  assert(Number(status.schemaFiles || 0) >= 3, "status counts schema files");
  assert(Number(status.exampleFiles || 0) >= 3, "status counts example files");

  const search = searchColonyMemory("colony registry transport epoch provenance", { limit: 6 });
  const matches = Array.isArray(search.matches) ? search.matches : [];
  assert(search.ok === true, "search ok");
  assert(matches.length >= 1, "search returns matches");
  assert(
    matches.some((row) =>
      String(row.source || "").includes("colony-registry")
      || String(row.title || "").toLowerCase().includes("transport epoch")
      || String(row.source || "").includes("draft-promotion-policy")
    ),
    "search finds contract files"
  );

  const context = buildColonyMemoryContextForPrompt("transport epoch provenance", { costMode: "balanced" });
  assert(/Colony memory contracts:/i.test(context), "prompt context has colony memory header");
  assert(/transport/i.test(context), "prompt context includes transport material");

  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
