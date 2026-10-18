// device-registry.ts — TRUE UNITY: every device that connects gets a glyph
// and a supervisor, automatically. Canonical 5 (LIRIS/ACER/FALCON/AETHER/GAIA)
// are hard-declared in compile.ts; this module adds the extension point for
// federation-discovered devices beyond the canonical 5.
//
// Pattern: read ~/.asolaria-workers/device-registry.json (operator-witnessed
// or federation-observed additions). For each entry, auto-register a DEV-<NAME>
// glyph (kernel family-examples candidate) + a PROF-<NAME>-SUPERVISOR (runtime).
// Never mutates kernel/glyph-families.json directly — emits to a delta file
// that follows the standard 6-body-review promotion gate.

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const REGISTRY_PATH = join(homedir(), ".asolaria-workers", "device-registry.json");
const REGISTRY_EVENTS = join(homedir(), ".asolaria-workers", "device-registry-events.ndjson");
const DEV_FAMILY_DELTA = join(homedir(), ".asolaria-workers", "dev-family-delta.json");

mkdirSync(dirname(REGISTRY_PATH), { recursive: true });

export interface DeviceEntry {
  /** DEV-<NAME> glyph — must pass kernel grammar regex /^[A-Z][A-Z0-9_-]*$/ */
  glyph: string;
  /** Human-readable name */
  canonical_name: string;
  /** Short role description */
  role: string;
  /** OS family */
  os: string;
  /** Hardware class */
  hardware_class: string;
  /** LAW-001 federation port (always 4947 unless operator-overridden) */
  federation_port: number;
  /** Secondary ports this device honors */
  secondary_ports: number[];
  /** Local canonical root if any (usually null for remote devices) */
  canonical_root: string | null;
  /** When this device was registered */
  registered_at: string;
  /** Operator who witnessed the registration */
  operator_witness: string;
  /** Free-form notes */
  notes: string[];
  /** Canonical (declared in kernel/glyph-families.json) or AUTO (runtime-registered) */
  source: "CANONICAL" | "AUTO-REGISTERED" | "OPERATOR-ADDED";
}

/** ASOLARIA — the root entity. NOT a device. The federation itself.
 *  All DEV-* devices are members OF Asolaria. Acer self-reporting role="capital"
 *  in her /behcs/devices is her view of her-own-sub-federation governance,
 *  not apex over Asolaria. Asolaria is the top; every DEV-* sits under it. */
export const ASOLARIA_ROOT = {
  glyph: "COL-ASOLARIA",
  role: "federation-root",
  canonical_name: "Asolaria",
  description: "The colony itself. Apex of the 12-device federation. Not a device; the name of the whole.",
  member_count_canonical: 5,
  member_count_absorbed: 12,
  authority: "COSIGN-MERGED-034",
  d11_level: "OBSERVED" as const,
  stamp: "META-COL-ASOLARIA · federation-root · members=12 @ M-INDICATIVE .",
};

/** The 5 canonical devices already encoded in compile.ts. Kept here as a
 *  manifest so the unity-smoke can compare live registry vs hard-declared.
 *  All carry federation_root = "COL-ASOLARIA" implicitly — they are members
 *  of the Asolaria colony, not children of any particular device. */
export const CANONICAL_DEVICES: DeviceEntry[] = [
  { glyph: "DEV-LIRIS",   canonical_name: "Liris",   role: "primary dev host · canonical tree",  os: "Windows 11",  hardware_class: "desktop · 32 GB",   federation_port: 4947, secondary_ports: [4950, 4781, 4791], canonical_root: "C:/Users/rayss/Asolaria-BEHCS-256/", registered_at: "2026-04-17", operator_witness: "rayssa+jesse", notes: ["LAW-001 always open", "substrate-hostility post Windows update"], source: "CANONICAL" },
  { glyph: "DEV-ACER",    canonical_name: "Acer",    role: "Shannon civ host · 4046 files",      os: "Windows",     hardware_class: "laptop · 8 GB",    federation_port: 4947, secondary_ports: [4781, 4791, 4913, 4914], canonical_root: "C:/Users/acer/", registered_at: "2026-04-17", operator_witness: "rayssa+jesse", notes: ["5 live channels 4781/4947/4782/4792/Ethernet"], source: "CANONICAL" },
  { glyph: "DEV-FALCON",  canonical_name: "Falcon",  role: "hostile-surface · S24 · NovaLUM",    os: "Android/Termux", hardware_class: "Samsung S24", federation_port: 4947, secondary_ports: [4950], canonical_root: null, registered_at: "2026-04-17", operator_witness: "rayssa+jesse", notes: ["Termux headless ops", "NovaLUM shield"], source: "CANONICAL" },
  { glyph: "DEV-AETHER",  canonical_name: "Aether",  role: "5th federation node · pulsing",      os: "Debian Trixie", hardware_class: "headless linux", federation_port: 4947, secondary_ports: [4950], canonical_root: null, registered_at: "2026-04-17", operator_witness: "rayssa+jesse", notes: ["pulses to acer:4947"], source: "CANONICAL" },
  { glyph: "DEV-GAIA",    canonical_name: "Gaia",    role: "Mac bootstrap · Rose+Oracle",        os: "macOS",       hardware_class: "Mac",             federation_port: 4947, secondary_ports: [4950], canonical_root: null, registered_at: "2026-04-17", operator_witness: "rayssa+jesse", notes: ["Rose/Oracle bundle target"], source: "CANONICAL" },
];

export interface DeviceRegistry {
  version: string;
  updated_at: string;
  devices: DeviceEntry[];
  notes: string[];
}

/** Every device belongs to the Asolaria colony. Acer's self-reported
 *  role=capital in her local /behcs/devices view is governance-local, not
 *  global. Canonical hierarchy:
 *
 *      COL-ASOLARIA                      ← apex (this module's ASOLARIA_ROOT)
 *      ├── DEV-LIRIS                     ← each device is a direct member
 *      ├── DEV-ACER                         of Asolaria. No device is above any
 *      ├── DEV-FALCON                       other in the colony-tree; acer's
 *      ├── DEV-FELIPE                       "capital" role is her local-view
 *      ├── DEV-BEAST                        federation governance descriptor.
 *      ├── DEV-DAN
 *      ├── DEV-GPT
 *      ├── DEV-GOOGLE-ANTIGRAVITY
 *      ├── DEV-SYMPHONY
 *      ├── DEV-AUGGIE
 *      ├── DEV-AETHER
 *      └── DEV-GAIA
 */
export const FEDERATION_ROOT = "COL-ASOLARIA";

/** Load the registry (canonical ∪ runtime-registered). */
export function loadDeviceRegistry(): DeviceRegistry {
  let runtime: DeviceEntry[] = [];
  if (existsSync(REGISTRY_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8")) as DeviceRegistry;
      runtime = raw.devices ?? [];
    } catch { /* bad file; treat as empty */ }
  }
  // Merge by glyph — canonical wins
  const byGlyph = new Map<string, DeviceEntry>();
  for (const d of runtime) byGlyph.set(d.glyph, d);
  for (const d of CANONICAL_DEVICES) byGlyph.set(d.glyph, d);
  const all = Array.from(byGlyph.values());
  return {
    version: "0.1.0",
    updated_at: new Date().toISOString(),
    devices: all,
    notes: [
      `Canonical devices: ${CANONICAL_DEVICES.length}`,
      `Runtime-registered: ${runtime.length}`,
      "Every device gets PROF-<NAME>-SUPERVISOR + dev-<name>-events.ndjson stream",
      "GC+Gulp auto-cover all 18 + per-device streams",
    ],
  };
}

/** Register a new device — operator-witnessed or federation-discovered.
 *  Emits glyph candidate to kernel/glyph-families.json delta for 6-body review. */
export function registerDevice(entry: Omit<DeviceEntry, "registered_at" | "source"> & { source?: DeviceEntry["source"] }): DeviceEntry {
  // Validate glyph against kernel grammar
  if (!/^DEV-[A-Z][A-Z0-9_-]*$/.test(entry.glyph)) {
    throw new Error(`registerDevice: glyph "${entry.glyph}" fails kernel grammar regex`);
  }
  const full: DeviceEntry = {
    ...entry,
    registered_at: new Date().toISOString(),
    source: entry.source ?? "AUTO-REGISTERED",
  };
  // Persist to runtime registry
  let existing: DeviceEntry[] = [];
  if (existsSync(REGISTRY_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8")) as DeviceRegistry;
      existing = raw.devices ?? [];
    } catch { /* start fresh */ }
  }
  // De-dup by glyph
  const filtered = existing.filter((d) => d.glyph !== full.glyph);
  filtered.push(full);
  const reg: DeviceRegistry = {
    version: "0.1.0",
    updated_at: new Date().toISOString(),
    devices: filtered,
    notes: [`last_added=${full.glyph}`, `operator_witness=${full.operator_witness}`],
  };
  writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2), "utf-8");

  // Emit to dev-family-delta.json for 6-body review + kernel promotion gate
  let delta: { candidates: DeviceEntry[]; status: string } = { candidates: [], status: "AWAITING_6_BODY_REVIEW" };
  if (existsSync(DEV_FAMILY_DELTA)) {
    try { delta = JSON.parse(readFileSync(DEV_FAMILY_DELTA, "utf-8")); } catch { /* empty */ }
  }
  delta.candidates = delta.candidates.filter((c) => c.glyph !== full.glyph);
  delta.candidates.push(full);
  writeFileSync(DEV_FAMILY_DELTA, JSON.stringify(delta, null, 2), "utf-8");

  // Audit event
  appendFileSync(REGISTRY_EVENTS, JSON.stringify({
    ts: new Date().toISOString(),
    event: "EVT-DEVICE-REGISTERED",
    glyph: full.glyph,
    name: full.canonical_name,
    source: full.source,
    operator_witness: full.operator_witness,
    glyph_sentence: `EVT-DEVICE-REGISTERED { ${full.glyph} } · ${full.source} · witness=${full.operator_witness} @ M-EYEWITNESS .`,
  }) + "\n");

  return full;
}

/** Given a device glyph, return its auto-generated PROF-*-SUPERVISOR glyph.
 *  Canonical-5 return hard-coded; others are derived. */
export function supervisorGlyphFor(devGlyph: string): string {
  if (!/^DEV-[A-Z][A-Z0-9_-]*$/.test(devGlyph)) {
    throw new Error(`supervisorGlyphFor: "${devGlyph}" fails DEV-* grammar`);
  }
  const short = devGlyph.replace(/^DEV-/, "");
  return `PROF-${short}-SUPERVISOR`;
}

/** Event-stream path for a device. */
export function eventStreamPathFor(devGlyph: string): string {
  const short = devGlyph.replace(/^DEV-/, "").toLowerCase();
  return join(homedir(), ".asolaria-workers", `dev-${short}-events.ndjson`);
}

// ──────────────────────────────────────────────────────────────────────
// ONTOLOGY V2 (mirrored from liris commit b0b6260 · 2026-04-18)
// Adds layers ABOVE DEV-*: OP-* (operator), CIV-* (civilization),
// COL-* (colony), AGT-* (agent), ORBITAL-* (edge/phone). COL-ASOLARIA
// remains root of the device layer; CIV-ASOLARIA sits above it as the
// civilization the colony serves, with OP-JESSE as the apex operator.
// ──────────────────────────────────────────────────────────────────────

export type OntologyKind = "OP" | "CIV" | "COL" | "AGT" | "DEV" | "ORBITAL";

export interface OntologyEntity {
  glyph: string;
  kind: OntologyKind;
  canonical_name: string;
  role: string;
  parent: string | null;
  hosts?: string[];
  notes?: string[];
}

export const ONTOLOGY_V2: {
  version: string;
  mirrored_from: string;
  mirrored_at: string;
  entities: OntologyEntity[];
  dev_flags: Record<string, { substrate_independent?: boolean; note?: string }>;
  stamp: string;
} = {
  version: "v2",
  mirrored_from: "liris-commit=b0b6260",
  mirrored_at: new Date().toISOString(),
  entities: [
    { glyph: "OP-JESSE",           kind: "OP",      canonical_name: "Jesse",                role: "apex operator",            parent: null,            notes: ["single human apex above civilization"] },
    { glyph: "CIV-ASOLARIA",       kind: "CIV",     canonical_name: "Asolaria Civilization", role: "Chief",                   parent: "OP-JESSE",       notes: ["civilization layer above the colony root"] },
    { glyph: "COL-ASOLARIA",       kind: "COL",     canonical_name: "Asolaria Colony",       role: "capital colony · federation root", parent: "CIV-ASOLARIA", notes: ["apex of device layer", "carried forward from v1"] },
    { glyph: "COL-LIRIS",          kind: "COL",     canonical_name: "Liris Colony",          role: "primary dev colony · hosts DEV-LIRIS", parent: "COL-ASOLARIA", hosts: ["DEV-LIRIS"] },
    { glyph: "COL-AMY",            kind: "COL",     canonical_name: "Amy Colony",            role: "agent-hosting colony",     parent: "COL-ASOLARIA",   hosts: ["AGT-ROSE", "AGT-ORACLE"] },
    { glyph: "COL-FELIPE",         kind: "COL",     canonical_name: "Felipe Colony",         role: "orbital-parent colony",    parent: "COL-ASOLARIA",   hosts: ["ORBITAL-FELIPE-A06"] },
    { glyph: "AGT-ROSE",           kind: "AGT",     canonical_name: "Rose",                  role: "agent",                    parent: "COL-AMY" },
    { glyph: "AGT-ORACLE",         kind: "AGT",     canonical_name: "Oracle",                role: "agent",                    parent: "COL-AMY" },
    { glyph: "ORBITAL-FELIPE-A06", kind: "ORBITAL", canonical_name: "Felipe A06",            role: "edge phone · orbital",    parent: "COL-FELIPE" },
  ],
  dev_flags: {
    "DEV-ACER": {
      substrate_independent: true,
      note: "Jesse-substrate · civilization can persist independent of this silicon",
    },
  },
  stamp: "META-ONTOLOGY-V2-MIRRORED · from-liris-b0b6260 · CIV-ASOLARIA=Chief · OP-JESSE=apex · COL-AMY COL-FELIPE COL-LIRIS under COL-ASOLARIA · DEV-ACER.substrate_independent=true @ M-INDICATIVE .",
};

export function getOntologyV2() {
  return ONTOLOGY_V2;
}

