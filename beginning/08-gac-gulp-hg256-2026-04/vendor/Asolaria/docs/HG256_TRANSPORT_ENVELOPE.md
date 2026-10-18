# HG256 Transport Envelope

```text
GLYPH256: {POLICY=hg256-transport-envelope.v1}{ENCODING=UTF8_HEX_ENVELOPE}{ASCII_SAFE=TRUE}
```

## Required Fields

- `evtId`
- `ts`
- `trancheId`
- `qId`
- `owner`
- `pid`
- `devicePid`
- `agentId`
- `constructionId`
- `canonVer`
- `route`
- `routeStage`
- `scopeHash`
- `packetSha256`
- `payloadSha256`
- `denyFlags[]`
- `skippedChecks[]`
- `policyIds[]`
- `transport.glyph256`
- `transport.glyph256Transport`
- `canon.d37`
- `canon.d44`
- `canon.d45`
- `canon.d46`
- `canon.d47`

## Transport Rules

- Live symbolic tags may be `HG256:*`.
- Transport must be ASCII-safe through a UTF-8 hex envelope.
- The envelope is not a secrecy claim.
- `packetSha256` and `payloadSha256` must be present before a route hook is considered complete.
- `denyFlags` are mandatory in local-only mode.
- `skippedChecks` must stay explicit and never imply pass.

## Stage Semantics

- `cache`
  - capture cache state and fingerprint only
- `spawn`
  - bind the route envelope to the new agent
- `process`
  - bind the input payload hash
- `complete`
  - bind the output payload hash
- `build`
  - build artifact path inside white-room flow
- `consume`
  - consume/verify artifact path inside white-room flow
