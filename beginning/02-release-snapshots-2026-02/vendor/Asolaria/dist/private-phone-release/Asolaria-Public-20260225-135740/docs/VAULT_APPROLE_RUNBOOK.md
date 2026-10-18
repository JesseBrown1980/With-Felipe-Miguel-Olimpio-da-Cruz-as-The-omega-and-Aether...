# Vault AppRole Runbook

This scaffolds machine identities for connectors with least-privilege access.

## Files

- Vault server config: `infra/vault/vault.hcl`
- AppRole setup script: `infra/vault/setup-connectors.ps1`
- Generated policy files: `infra/vault/policies/*.hcl`
- Generated role credentials (local only):
  - `data/vault/owner/approle/<connector>/role_id.txt`
  - `data/vault/owner/approle/<connector>/secret_id.txt`

## Start local Vault

```powershell
Set-Location C:\Users\acer\Asolaria
$env:VAULT_ADDR = "http://127.0.0.1:8200"
vault server -config=infra/vault/vault.hcl
```

## Initialize and unseal (first run)

```powershell
vault operator init -format=json | Out-File -Encoding UTF8 data/vault/owner/vault-init.json
vault operator unseal <UNSEAL_KEY>
vault login <ROOT_TOKEN>
```

Protect `data/vault/owner/vault-init.json` with strict ACL and never publish it.

## Generate per-connector AppRoles

```powershell
Set-Location C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\infra\vault\setup-connectors.ps1
```

The script is idempotent and updates policies/roles if rerun.
