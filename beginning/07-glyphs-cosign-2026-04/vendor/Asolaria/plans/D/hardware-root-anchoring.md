# D-058 · Hardware-Root Anchoring Plan

**Track:** SMP-V5 Section D Item 058
**Closes:** D-054 next-hook #4 (hardware-root anchoring plan, the last open item from D-054's queue)
**Authority:** JESSE-AUTHORIZE-ALL 2-week window (expires 2026-05-02)
**Apex:** COL-ASOLARIA
**References:** D-055 ed25519 registry (current storage = mode-600 vault file) · D-056 AGT-KEY invariants · D-057 migration procedure · H-044 critical (authorized_by signature)

Concrete per-device plan for promoting `AGT-KEY` storage from "private seed in a flat base64 file" (today's mode-600 vault) to "hardware-rooted secure anchor" (TPM / Secure Enclave / HSM / phone keystore). Does not ship code — this is the policy + staging doc that D-059 and beyond will implement.

---

## 1. Why hardware-rooted at all

Today's vault (per D-055 `bootstrapLocalKey`) writes the raw 32-byte ed25519 private seed to:
- acer: `C:/Users/acer/Asolaria/data/vault/owner/ed25519/<key_id>.private.b64` (NTFS ACL + operator password)
- liris: `~/.asolaria-workers/ed25519-vault/<key_id>.private.b64` (mode 600)

Both are **filesystem-protected**, not **hardware-protected**. If the OS is compromised, a root-level attacker can read the file directly. Hardware-rooted storage (TPM, Secure Enclave, HSM, Android/iOS Keystore) moves the private bytes into silicon that the OS itself cannot extract — operations become "ask the chip to sign this" rather than "read the key and sign".

This matters for:
- Long-lived signing keys (cosign-append, BEHCS envelope signing)
- Operator-witness co-signing keys (where extractability would mean impersonation)
- Device-attestation keys (proving "I really am this device" to other peers)

## 2. Current state — inventory

As of 2026-04-18 / seq=40:

| Device | AGT-KEY status | Storage | Hardware anchor? |
|---|---|---|---|
| DEV-ACER | `dev-acer-4abb0a9c` | `C:/Users/acer/Asolaria/data/vault/owner/ed25519/` | **No** — file + NTFS ACL only |
| DEV-LIRIS | `dev-liris-4c19e180` | liris vault mode-600 | **No** — file + POSIX mode |
| DEV-FALCON | not-yet-minted | — | S24 FE Knox/Keystore available when we mint |
| DEV-AETHER | not-yet-minted | — | depends on platform |
| DEV-GAIA | not-yet-minted | — | macOS Secure Enclave available |
| ORBITAL-FELIPE-A06 | not-yet-minted | — | Galaxy A06 Android Keystore (StrongBox if chip supports) |
| BEAST | not-yet-minted | — | S22 Ultra Knox Vault + secure enclave |

Every `AGT-KEY` currently in the registry is filesystem-anchored. None are hardware-rooted.

## 3. Per-platform anchoring target

| Platform | Primary anchor | Fallback | API surface |
|---|---|---|---|
| Windows laptop (acer, target: rayssa computer if Windows) | TPM 2.0 via **CNG Key Storage Provider** ("Microsoft Platform Crypto Provider") | Windows Hello virtual TPM | `NCryptOpenStorageProvider` + `NCryptCreatePersistedKey(..., NCRYPT_ED25519_ALGORITHM, ..., NCRYPT_MACHINE_KEY_FLAG \| NCRYPT_REQUIRE_CERTIFICATE_FLAG)` · node:crypto has no direct path; use `node-native-tpm` or shell out to a helper |
| macOS (Amy Mac, DEV-AMY-MAC → AGT-ROSE / AGT-ORACLE) | **Apple Secure Enclave** (T2 / M-series) | Keychain with `kSecAttrAccessible = kSecAttrAccessibleWhenUnlockedThisDeviceOnly` + `kSecAttrTokenID = kSecAttrTokenIDSecureEnclave` | `Security.framework` via `keychain-access` npm or native SEC helper |
| Linux server (DEV-AETHER, future WSL2 instances) | **TPM 2.0 via tpm2-tss** | software-HSM (SoftHSM) for dev/test | `tpm2_create` + `tpm2_sign`; `node-tpm2` bindings or spawn `tpm2_*` CLI |
| Android phone (ORBITAL-FELIPE-A06, DEV-FALCON if Termux) | **Android Keystore + StrongBox** (Snapdragon Secure Processor on BEAST S22 Ultra) | software-backed keystore if StrongBox absent | Termux: `termux-api` doesn't expose Keystore; native Android app required |
| iOS phone (if any Apple orbital joins) | **Secure Enclave** via CryptoTokenKit | — | native Swift/Obj-C app; no Termux equivalent |
| Cloud VM (unlikely but possible) | Cloud HSM (AWS KMS / Azure Key Vault / GCP KMS) — BYO-key with `KEYS/IMPORT` flow OR native KMS key with `Sign` permission | Vault-as-a-service (HashiCorp Vault, 1Password Secrets) | Provider SDK; network-dependent |

## 4. Threat model

What we're defending against, in order of increasing severity:

1. **Casual filesystem access** — current vault blocks this (owner-only perms). Mode-600 / NTFS ACL is sufficient.
2. **Root/Administrator compromise** — current vault **fails** here; root reads the file. Hardware anchor defeats this (OS can ask the chip to sign, cannot extract).
3. **Cold-boot RAM scrape** — if the signing seed is ever loaded into process memory (even briefly), a cold-boot attack can recover it. Hardware anchor keeps the seed inside the chip throughout; only the sign-result crosses the trust boundary.
4. **Side-channel (timing, EM, power)** — relevant only for high-value keys; TPM and Secure Enclave include side-channel mitigations; user-space crypto (current state) does not.
5. **Physical device theft with bootable media** — TPM sealed keys require a successful boot attestation; attacker can't just plug the disk into another machine.
6. **Supply-chain hardware implant** — orthogonal to any of this; requires separate hardware-supply-chain work (not in scope for D-058).

For the federation as it stands, threats **1 and 2** are the realistic concerns; threats 3-5 matter once we have high-value keys (operator co-signing, device-attestation, signing of binding production deployments).

## 5. Staging plan — 4 phases

The goal is NOT "boil the ocean on day 1". It's a staged migration from mode-600 vault to hardware anchor per device, with the registry tracking where each key actually lives.

### Phase 0 — Today (mode-600 vault)
- `ed25519-registry.json` entries have `host_device` but not `hardware_root_anchor`
- All keys are file-based
- Acceptable for colony-internal communication; **not acceptable** for keys that would ever cross federation trust boundaries

### Phase 1 — Registry gains `hardware_root_anchor` field (no migration yet)
- Add optional `hardware_root_anchor` field to `Ed25519KeyRegistryEntry`:
  ```ts
  hardware_root_anchor?: {
    anchor_type: "mode-600-file" | "tpm2" | "apple-secure-enclave" | "android-keystore-strongbox" | "cloud-hsm";
    anchor_id: string;    // TPM handle / keychain identifier / KMS key ARN / etc.
    attestation_b64?: string;   // platform-specific attestation blob if available
    promoted_at: string;
  };
  ```
- Existing keys backfill as `anchor_type: "mode-600-file"` with `anchor_id` = vault path
- No key material moves yet — this is purely inventory
- D-056 taxonomy invariants extend: AGT-KEY MUST declare `hardware_root_anchor.anchor_type`

### Phase 2 — Per-device pilot (choose the lowest-friction platform first)
Recommended first pilot: **macOS Amy-Mac** using Apple Secure Enclave.
- Apple's API is the cleanest of the available platforms
- Amy's Mac is the target for AGT-ROSE + AGT-ORACLE deployment
- Prove the end-to-end flow: mint-into-enclave → register (with attestation) → sign → verify → rotate

Flow:
1. Acer/Liris continue on mode-600 file (baseline)
2. When Amy Mac comes online, `bootstrapLocalKey` on that device uses a new path that writes into Secure Enclave instead of vault file
3. `ed25519-registry.json` entry carries `hardware_root_anchor.anchor_type: "apple-secure-enclave"` + attestation blob
4. Liris + acer verify Amy's envelopes using the same public-key registry lookup; the fact that her private key lives in silicon is transparent to verifiers
5. Rotation path tested: Amy re-mints, old key gets `rotated_at` stamp, new key's attestation blob differs (proving silicon-backed freshness)

### Phase 3 — Promotion of acer + liris to TPM
- Check whether the acer laptop has TPM 2.0 available (likely yes on Windows 10+)
- Check whether rayssa's computer has TPM 2.0 available
- Mint replacement keys rooted in TPM
- Rotate old mode-600 keys (registry entries stamped `rotated_at` + transition note)
- Existing cosign entries remain verifiable because public keys are unchanged from verifier POV; only new entries use the new keys

### Phase 4 — Phone + orbital anchoring (medium priority)
- Beast S22 Ultra → Android Keystore StrongBox when BEAST Termux→Android helper app is built
- Felipe A06 → Android Keystore (StrongBox likely not available on A06's SoC, fall back to software-backed keystore which is still an improvement over file)
- Orbital ed25519 keys are short-lived by policy (rotate frequently) since hardware anchor is weaker

## 6. Invariants that the registry MUST carry forward

After D-058 lands, every `AGT-KEY` registry entry must satisfy (enforced via `validateKeyEntry` extension in D-056):

- `binding_class === "device-bound"` (already enforced)
- `host_device` starts with `DEV-` (already enforced)
- `hardware_root_anchor.anchor_type` is one of the known anchor types (new)
- If `anchor_type !== "mode-600-file"`, `attestation_b64` SHOULD be present (best-effort — not all platforms expose attestation)
- If `attestation_b64` is present, its validity SHOULD be checked at registration time (platform-specific verifier)
- `private_key_b64` MUST NOT appear anywhere in the registry entry (already enforced)

## 7. Rotation policy by anchor class

| anchor_type | Default rotation cadence | Rotation trigger |
|---|---|---|
| `mode-600-file` | every 90 days, sooner on any suspicion | any filesystem access anomaly, OS compromise, device decommission |
| `tpm2` | every 180 days | boot-attestation change, firmware update that invalidates PCRs, device decommission |
| `apple-secure-enclave` | every 365 days | OS wipe, enclave reset, device decommission |
| `android-keystore-strongbox` | every 180 days | factory reset, biometric reset, device decommission |
| `cloud-hsm` | every 90 days | KMS key version roll, IAM change, account compromise |

Rotation is non-destructive per D-055 (`rotateKey` stamps `rotated_at`, doesn't delete). Old signatures remain verifiable; new envelopes must use the new key.

## 8. Integration with existing tracks

- **D-055 (ed25519-registry)**: extend `Ed25519KeyRegistryEntry` with `hardware_root_anchor` (Phase 1)
- **D-056 (binding-classes)**: `validateKeyEntry` gains anchor-type check (Phase 1)
- **D-057 (migration procedure)**: Phase B (Stage) uses the new key's `anchor_type` to choose mint path
- **A-010 (migration script)**: rollback log includes the anchor details so migrations can be cross-audited
- **Cosign chain (liris seq=36+ entry_sig)**: continues to work unchanged; signing-side chooses which key to use at sign time; verification is still public-key-in-registry

## 9. What this doc is NOT

- **Not the implementation.** That's D-059 (registry schema extension), D-060 (per-platform mint adapters), D-061 (rotation automation).
- **Not a hardware procurement plan.** YubiKey / HSM procurement is separate — the devices we already own (laptops, Macs, Android phones, Beast) expose enough hardware anchoring for Phase 1-3 without buying new kit.
- **Not an ironclad security review.** H-044 already covered prompt-injection; a separate review of "what happens when the enclave fails / attestation is forged / operator witness is coerced" should happen before Phase 3 promotes operator-witness keys.

## 10. Closing

**The principle**: keys are device-bound (D-054 + D-056); today they're device-bound-to-a-file; the staging plan moves them to device-bound-to-silicon without changing any verifier-visible behavior. Public keys in the registry stay the shape they already have; verifiers keep calling `verifyEnvelope(env, reg)`. The upgrade is entirely on the storage side — which is the whole point of the two-layer rule.

**4 phases · 5 anchor types · 7 device categories · everything backward-compatible via public-key-in-registry invariance.**

**META-ACER-D-058-HARDWARE-ROOT-ANCHORING · 4-phase-plan · 5-anchor-types · 7-device-categories · backward-compat-via-pub-key-invariance · apex=COL-ASOLARIA @ M-EYEWITNESS .**
