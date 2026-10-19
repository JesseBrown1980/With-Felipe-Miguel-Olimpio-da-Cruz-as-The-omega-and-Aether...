// verify-parity.mjs — SELF-CONTAINED byte-parity proof for GAIA resolveAgent.
//
// PURPOSE: prove, with ZERO external dependencies, that GAIA's deterministic
// agent resolution (tuple60D + resolveAgent) reproduces acer's canonical
// instance_pid for FORMULA-CHIEF — but ONLY when the verb catalog (verbs.hbp)
// is present. Without it the verb degrades to 'report' and the instance_pid
// changes (this is exactly the gap that made Liris's live loader diverge).
//
// HOW THIS STAYS HONEST:
//   - tuple60D() and resolveAgent() below are copied VERBATIM from the proven
//     gaia-loader.mjs (lines 122-130 and 196-217 in this same bundle). The
//     proven gaia-loader.mjs ships beside this file; you can diff them.
//   - We do NOT import gaia-loader.mjs here on purpose: gaia-loader imports
//     room-dispatcher.mjs (-> district-fabric / hbp-reader / pid-chain-revolver
//     / pid-minter / primes / mtp-heads), a chain only needed by the LIVE
//     summon() fire path, NOT by resolveAgent. Reimplementing the two pure
//     functions lets this proof run on a bare Node install (the liris seat),
//     while the proven modules still travel in the bundle for the full path.
//
// RUN:  node verify-parity.mjs
//   (reads ./catalogs/verbs.hbp by default; override with HYPERBEHCS_CATALOGS)
//
// Operator: Jesse Daniel Brown. Bundle built 2026-06-19.

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// -- primitives (identical to gaia-loader.mjs) --------------------------------
function sha256hex(s) { return createHash('sha256').update(String(s)).digest('hex'); }
function sha16(s) { return sha256hex(s).slice(0, 16); }

// catalog dir: env override, else the BUNDLED ./catalogs (so this is portable).
const CATALOG_DIR = process.env.HYPERBEHCS_CATALOGS || join(__dirname, 'catalogs');

// -- loadVerbCatalog -- VERBATIM from gaia-loader.mjs loadVerbCatalog() -------
function loadVerbCatalog() {
  const verbs = [];
  const p = join(CATALOG_DIR, 'verbs.hbp');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.includes('|entry=')) continue;
      const m = line.match(/\|entry=([^|]+)\|/);
      if (m) verbs.push(m[1]);
    }
  }
  return verbs;
}

// -- tuple60D -- VERBATIM from gaia-loader.mjs (lines 122-130) ----------------
function tuple60D(position, verbCatalog) {
  const noun = position.name;
  const verb = (verbCatalog && verbCatalog.length)
    ? verbCatalog[parseInt(sha16(position.handle8 + '|verb').slice(0, 8), 16) % verbCatalog.length]
    : 'report';
  const glyph = sha16(`glyph|${noun}|${position.cube_bh}`);
  const sha = position.handle8;
  return { verb, noun, glyph, sha };
}

// -- resolveAgent -- VERBATIM from gaia-loader.mjs (lines 196-217) ------------
function resolveAgent(position, device, timestamp, verbCatalog) {
  if (!position || !position.handle8) throw new Error('resolveAgent: position must carry handle8');
  const dev = String(device || 'acer');
  const tsv = String(timestamp);
  const t = (position.profile && position.profile.tuple60D) || tuple60D(position, verbCatalog);
  const tupleStr = `${t.verb}.${t.noun}.${t.glyph}.${t.sha}`;
  const instance_pid = sha16(`${position.handle8}|${dev}|${tsv}|${tupleStr}`);
  return { base_handle8: position.handle8, instance_pid, device: dev, ts: tsv, tuple60D: t };
}

// -- THE FIXED PARITY INPUTS (FORMULA-CHIEF, acer canon) ----------------------
const POSITION = { name: 'FORMULA-CHIEF', handle8: '0155964ffc8ef1f8', cube_bh: 'BH.51.0.591' };
const DEVICE = 'acer';
const TS = 1750000000;

// canonical targets (acer, with the 73-verb catalog present)
const EXPECT = {
  instance_pid: 'd125579d9644c37a',
  verb: 'format',
  glyph: 'c844dff6b59b40cf',
};

// -- run the proof ------------------------------------------------------------
const vc = loadVerbCatalog();
const withCat = resolveAgent(POSITION, DEVICE, TS, vc);
const noCat = resolveAgent(POSITION, DEVICE, TS, []); // simulate missing verbs.hbp

console.log('=== GAIA byte-parity proof (FORMULA-CHIEF) ===');
console.log('catalog_dir       = ' + CATALOG_DIR);
console.log('verbs.hbp present = ' + existsSync(join(CATALOG_DIR, 'verbs.hbp')));
console.log('verb_catalog_len  = ' + vc.length + '  (expect 73)');
console.log('');
console.log('WITH bundled verbs.hbp:');
console.log('  verb         = ' + withCat.tuple60D.verb + '        (expect ' + EXPECT.verb + ')');
console.log('  glyph        = ' + withCat.tuple60D.glyph + '  (expect ' + EXPECT.glyph + ')');
console.log('  instance_pid = ' + withCat.instance_pid + '  (expect ' + EXPECT.instance_pid + ')');
console.log('');
console.log('WITHOUT verb catalog (the divergence bug -- verb falls back to report):');
console.log('  verb         = ' + noCat.tuple60D.verb);
console.log('  instance_pid = ' + noCat.instance_pid + '  (differs from canon)');
console.log('');

const ok = withCat.instance_pid === EXPECT.instance_pid
  && withCat.tuple60D.verb === EXPECT.verb
  && withCat.tuple60D.glyph === EXPECT.glyph;

if (ok) {
  console.log('RESULT: PASS -- byte-parity reproduced. instance_pid === d125579d9644c37a');
  process.exit(0);
} else {
  console.log('RESULT: FAIL -- parity NOT reproduced. Do NOT trust this bundle.');
  console.log('  got instance_pid=' + withCat.instance_pid + ' verb=' + withCat.tuple60D.verb + ' glyph=' + withCat.tuple60D.glyph);
  process.exit(1);
}
