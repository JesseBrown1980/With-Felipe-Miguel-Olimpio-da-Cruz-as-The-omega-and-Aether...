// sign.ts — signed-cosign-append (closes PRE-006 P1 follow-up #2 cryptographically).
//
// Every signed entry carries `entry_sig` alongside the existing `prev_sha`
// rolling-chain hash. Two defenses combined:
//   - prev_sha   : file-level tamper detection (acer seq-21 discovery)
//   - entry_sig  : per-entry cryptographic authorship proof
//
// A reviewer can walk the chain verifying BOTH invariants: every entry's
// entry_sig must verify against the pub key in kernel/ed25519-registry.json,
// AND the prev_sha chain must be unbroken.
//
// Sig material = JSON.stringify(entryWithoutSigFields) where we strip the
// sig-carrying fields before hashing so canonical form is deterministic.
//
// LAW-001 / LAW-008 / LAW-012 / LAW-014 compliant (pure crypto; no network).

import { readFileSync, existsSync } from "node:fs";
import { createHash, createPrivateKey, sign as cryptoSign, createPublicKey, verify as cryptoVerify } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CosignEntry } from "./index.ts";

const PKCS8_SEED_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_ED_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function seedToPkcs8Der(seed32: Buffer): Buffer {
  return Buffer.concat([PKCS8_SEED_PREFIX, seed32]);
}
function rawToSpkiDer(raw32: Buffer): Buffer {
  return Buffer.concat([SPKI_ED_PREFIX, raw32]);
}

export interface SignedEntrySig {
  key_id: string;
  sig_b64: string;
  alg: "ed25519";
  signed_at: string;
}

/** Strip sig-carrying fields before canonicalizing for the signature material. */
export function canonicalEntryMaterial(entry: Record<string, unknown>): Buffer {
  const { entry_sig: _s, ...rest } = entry;
  const sortedKeys = Object.keys(rest).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of sortedKeys) sorted[k] = (rest as Record<string, unknown>)[k];
  return Buffer.from(JSON.stringify(sorted), "utf-8");
}

/** Load raw 32-byte ed25519 private seed from liris vault. */
export function loadPrivateSeed(key_id: string): Buffer {
  const vaultPath = join(homedir(), ".asolaria-workers", "ed25519-vault", `${key_id}.private.b64`);
  if (!existsSync(vaultPath)) {
    throw new Error(`private seed not in vault: ${vaultPath}`);
  }
  const b64 = readFileSync(vaultPath, "utf-8").trim();
  const seed = Buffer.from(b64, "base64");
  if (seed.length !== 32) {
    throw new Error(`vault seed has length ${seed.length}, expected 32`);
  }
  return seed;
}

/** Sign an entry (without mutating it) and return the SignedEntrySig. */
export function signEntry(entry: CosignEntry & Record<string, unknown>, key_id: string): SignedEntrySig {
  const seed = loadPrivateSeed(key_id);
  const pkcs8 = seedToPkcs8Der(seed);
  const priv = createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
  const material = canonicalEntryMaterial(entry);
  const sig = cryptoSign(null, material, priv);
  return {
    key_id,
    sig_b64: sig.toString("base64"),
    alg: "ed25519",
    signed_at: new Date().toISOString(),
  };
}

export interface VerifyEntryOptions {
  registry: {
    keys: Array<{ key_id: string; public_key_b64: string; owner_glyph: string }>;
  };
}

export interface VerifyEntryResult {
  seq: number;
  ok: boolean;
  reason: string;
  key_id: string | null;
  owner: string | null;
}

/** Verify entry_sig against the registry. Returns ok=true only if all fields
 * present AND the crypto verify passes AND key_id resolves in registry. */
export function verifyEntry(entry: Record<string, unknown>, opts: VerifyEntryOptions): VerifyEntryResult {
  const seq = typeof entry.seq === "number" ? entry.seq : -1;
  const entrySig = entry.entry_sig as SignedEntrySig | undefined;
  if (entrySig === undefined || typeof entrySig !== "object" || entrySig === null) {
    return { seq, ok: false, reason: "entry has no entry_sig", key_id: null, owner: null };
  }
  const key = opts.registry.keys.find((k) => k.key_id === entrySig.key_id);
  if (key === undefined) {
    return { seq, ok: false, reason: `key_id '${entrySig.key_id}' not in registry`, key_id: entrySig.key_id, owner: null };
  }
  try {
    const pubRaw = Buffer.from(key.public_key_b64, "base64");
    if (pubRaw.length !== 32) {
      return { seq, ok: false, reason: `pub has unexpected length ${pubRaw.length}`, key_id: key.key_id, owner: key.owner_glyph };
    }
    const spki = rawToSpkiDer(pubRaw);
    const pub = createPublicKey({ key: spki, format: "der", type: "spki" });
    const material = canonicalEntryMaterial(entry);
    const sigBuf = Buffer.from(entrySig.sig_b64, "base64");
    const ok = cryptoVerify(null, material, pub, sigBuf);
    return { seq, ok, reason: ok ? "ok" : "crypto-verify-failed", key_id: key.key_id, owner: key.owner_glyph };
  } catch (e) {
    return { seq, ok: false, reason: `threw: ${(e as Error).message}`, key_id: entrySig.key_id, owner: null };
  }
}

/** Walk a chain file and verify every entry that carries entry_sig. Entries
 * without entry_sig are reported as "unsigned" — not a hard fail (backward
 * compat with seq 1-35 which were unsigned). */
export function verifyChain(chain_path: string, opts: VerifyEntryOptions): {
  total: number;
  signed: number;
  unsigned: number;
  failed: number;
  results: VerifyEntryResult[];
} {
  if (!existsSync(chain_path)) throw new Error(`chain missing: ${chain_path}`);
  const lines = readFileSync(chain_path, "utf-8").split("\n").filter((l) => l.trim().length > 0);
  const results: VerifyEntryResult[] = [];
  let signed = 0;
  let unsigned = 0;
  let failed = 0;
  for (const line of lines) {
    const entry = JSON.parse(line);
    if (entry.entry_sig === undefined) {
      unsigned += 1;
      results.push({
        seq: entry.seq ?? -1,
        ok: false,
        reason: "unsigned (backward-compat)",
        key_id: null,
        owner: null,
      });
      continue;
    }
    signed += 1;
    const r = verifyEntry(entry, opts);
    if (!r.ok) failed += 1;
    results.push(r);
  }
  return { total: lines.length, signed, unsigned, failed, results };
}

/** Compute sha256 of a string. Shared helper for tests. */
export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
