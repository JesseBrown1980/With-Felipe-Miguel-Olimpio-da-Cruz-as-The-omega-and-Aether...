# BEHCS-1024 Remake + GitHub 200-Step Improvement Plan

Status: active planning artifact, not a public release.
Created: 2026-05-13
Owner frame: Acer + Liris federation, operator-governed.
Primary repo: `${ASOLARIA_ROOT}`
Remote target: `origin` -> `https://github.com/JesseBrown1980/Asolaria.git`

## Current Baseline

- LAW-001 remains active and not superseded. Ports `4947` and `4950` are constitutional bus surfaces.
- Acer and Liris have bidirectional bus proof and fast health behavior.
- Acer and Liris have GNN sidecars live on `4792`, with startup persistence.
- C03 is closed as `C03_DIVERGENCE_DOCUMENTED_CLOSED_BY_QUINTET_AUTH`, not as "hash never broke".
- Remaining P0 blockers are physical/operator: Falcon ADB and E: SOVLINUX mount.
- The worktree is dirty. GitHub work must use partial, proof-bound promotion. Do not push the whole tree.

## Non-Waivable Bounds

- No secret, private topology, token, raw runtime, raw hookwall, raw GNN edge, or device-proof dump.
- Hidden, shadow, stealth, restricted, and secret tiers expose metadata-only receipts.
- GitHub promotion requires sanitization and partial file selection.
- Public wording must avoid unsupported claims like universal readiness, unhackable status, or finished 49D runtime.
- Every green dashboard label must map to a triggerable route, receipt, and proof hash, or be marked not wired.

## Phase Index

| Phase | Steps | Theme |
|---|---:|---|
| P01 | 1-10 | Baseline freeze and proof inventory |
| P02 | 11-20 | Git dirty-tree segmentation |
| P03 | 21-30 | BEHCS-1024 access-tier contract |
| P04 | 31-40 | Dashboard trigger-proof parity |
| P05 | 41-50 | LAW-001 and bus durability |
| P06 | 51-60 | GNN, Omnishannon, and anomaly routing |
| P07 | 61-70 | MCP and tool authority |
| P08 | 71-80 | GitHub connector and partial commit path |
| P09 | 81-90 | Public/private projection discipline |
| P10 | 91-100 | Remake tree contract |
| P11 | 101-110 | Test and validator harness |
| P12 | 111-120 | White-room rebuild and replay |
| P13 | 121-130 | Liris mirror parity |
| P14 | 131-140 | Falcon mirror parity |
| P15 | 141-150 | Aether and phone/device observers |
| P16 | 151-160 | Security and redaction gates |
| P17 | 161-170 | GitHub issue/release workflow |
| P18 | 171-180 | Documentation and absorbability |
| P19 | 181-190 | Release candidate staging |
| P20 | 191-200 | Promotion, rollback, and governance |

## 200-Step Checklist

### P01 - Baseline Freeze And Proof Inventory

1. [ ] Record current Acer daemon set with PID, port, command, and health endpoint.
2. [ ] Record current Liris daemon set from pulled bus receipts, not assumption.
3. [ ] Record GNN `4792` proof for Acer and Liris with same inference payload.
4. [ ] Record LAW-001 `4947` and `4950` proof on Acer.
5. [ ] Record latest Liris LAW-001 receipt pulled into Acer.
6. [ ] Record C03 closure label and quintet authorization source.
7. [ ] Record remaining physical blockers as non-code holds.
8. [ ] Generate a baseline artifact manifest for only the files changed in this session.
9. [ ] Run syntax checks on changed PowerShell, JavaScript, and Python files.
10. [ ] Emit `EVT-BEHCS1024-BASELINE-FROZEN` with hashes and blocker list.

### P02 - Git Dirty-Tree Segmentation

11. [ ] Classify dirty files into current-session, prior-user, generated-report, runtime-noise, and unknown.
12. [ ] Build a partial-commit candidate list for bus, GNN, startup, and plan artifacts only.
13. [ ] Exclude runtime inboxes, lock files, logs, screenshots, and local proof blobs from GitHub promotion.
14. [ ] Identify untracked files that are source code versus generated evidence.
15. [ ] Identify tracked docs that reference ignored `data/`, `runtime/`, `logs/`, or host-specific paths.
16. [ ] Produce a no-push GitHub readiness report for the partial candidate list.
17. [ ] Run `git diff --check` on the partial candidate list.
18. [ ] Run targeted syntax checks on the partial candidate list.
19. [ ] Create a rollback note for each source file in the partial candidate list.
20. [ ] Emit `EVT-BEHCS1024-GIT-SEGMENTATION-READY`.

### P03 - BEHCS-1024 Access-Tier Contract

21. [ ] Treat `PUBLIC`, `${BEHCS_DEVICE_SERIAL}`, `STEALTH`, `HIDDEN`, `SHADOW`, and `SECRET` as policy surfaces.
22. [ ] Preserve metadata-only behavior for non-public tiers.
23. [ ] Verify Acer `GET /api/access-tier/matrix` returns 36 tier-scope rows.
24. [ ] Verify Acer `POST /api/access-tier/probe` accepts hidden PID metadata-only probe.
25. [ ] Verify Acer shadow drive metadata-only probe.
26. [ ] Verify Acer stealth USB metadata-only probe.
27. [ ] Add any missing proof fields: `pathRef`, `sha16`, `age_s`, `authority_scope`.
28. [ ] Add surprise scoring fields from the LeWM directive.
29. [ ] Add corrective action fields for stale, missing, or decorative rows.
30. [ ] Emit `EVT-ACER-ACCESS-TIER-PROBE-MATRIX-VERIFIED`.

### P04 - Dashboard Trigger-Proof Parity

31. [ ] Inventory dashboard cards that mention BEHCS-1024 or access tiers.
32. [ ] Mark each card as triggerable, not wired, or decorative-only.
33. [ ] Ensure triggerable cards call real safe endpoints.
34. [ ] Ensure not-wired cards do not display as ready.
35. [ ] Ensure decorative-only cards are reported as bugs unless intentionally mocked.
36. [ ] Attach latest proof hash to each triggerable card.
37. [ ] Add age and last-probe status to each triggerable card.
38. [ ] Verify dashboard API and UI agree on card state.
39. [ ] Capture one backend proof and one UI proof for the same card.
40. [ ] Emit `EVT-ACER-DASHBOARD-TRIGGER-PROOF-PASS`.

### P05 - LAW-001 And Bus Durability

41. [ ] Confirm `tools/behcs/behcs-bus.js` fast health default remains active.
42. [ ] Confirm `BEHCS_HEALTH_DEEP=1` still enables deep health when needed.
43. [ ] Confirm `/behcs/send`, `/publish`, and `/behcs/publish` all accept valid envelopes.
44. [ ] Confirm body-only envelopes do not trigger `payload.slice` failure.
45. [ ] Confirm `4947` and `4950` both survive bus restart.
46. [ ] Confirm bus supervisor observes both LAW-001 ports.
47. [ ] Confirm inbox GC does not delete unpulled proof receipts.
48. [ ] Confirm Acer can post to Liris and Liris can post to Acer.
49. [ ] Add a bus smoke command to the operator runbook.
50. [ ] Emit `EVT-LAW001-DURABILITY-VERIFIED`.

### P06 - GNN, Omnishannon, And Anomaly Routing

51. [ ] Keep `tools/Start-GnnSidecar.ps1` as the canonical GNN launcher.
52. [ ] Keep Anaconda Python as the Acer GNN interpreter unless a better verified env replaces it.
53. [ ] Preserve idempotent behavior: do not spawn duplicate GNN sidecars.
54. [ ] Preserve restart behavior behind explicit `-Restart`.
55. [ ] Add a canonical GNN inference smoke payload.
56. [ ] Bind GNN sidecar status into dashboard or supervisor status.
57. [ ] Route access-tier surprise scores through GNN anomaly labels.
58. [ ] Route Omnishannon summaries into the same proof receipt schema.
59. [ ] Add drift or stale-proof detection for GNN receipts.
60. [ ] Emit `EVT-GNN-OMNISHANNON-ROUTING-READY`.

### P07 - MCP And Tool Authority

61. [ ] Inventory local MCP servers and bridge surfaces.
62. [ ] Verify Acer MCP bridge `4793` health.
63. [ ] Separate MCP protocol claims from OpenAI remote MCP and WebMCP claims.
64. [ ] Ensure tool authority routes require local policy checks.
65. [ ] Ensure GitHub-related tools never expose tokens.
66. [ ] Ensure filesystem tools remain under allowlisted roots.
67. [ ] Add MCP smoke checks to readiness, but do not block non-MCP daemon health.
68. [ ] Document which MCP routes are internal-only.
69. [ ] Add fail-closed behavior for missing MCP config.
70. [ ] Emit `EVT-MCP-AUTHORITY-BASELINE-VERIFIED`.

### P08 - GitHub Connector And Partial Commit Path

71. [ ] Verify `origin` remote without reading secrets.
72. [ ] Verify GitHub connector status endpoint behavior locally.
73. [ ] Verify gateway authority allows read-only GitHub status and repo listing only where configured.
74. [ ] Keep GitHub PAT references in vault docs only; do not expose values.
75. [ ] Re-run the existing Original Hermes GitHub readiness pattern for the BEHCS-1024 tranche.
76. [ ] Generate a partial commit manifest for BEHCS-1024 remake work.
77. [ ] Mark whole-worktree push as denied until dirty tree is segmented.
78. [ ] Prepare a branch name for the remake tranche.
79. [ ] Prepare a commit message that names only verified files.
80. [ ] Emit `EVT-GITHUB-PARTIAL-COMMIT-PLAN-READY`.

### P09 - Public/Private Projection Discipline

81. [ ] Use `docs/PUBLIC_PROJECTION_MAP.md` as the public projection source of truth.
82. [ ] Block public docs from linking to ignored runtime sources.
83. [ ] Replace private path references with tracked projection targets.
84. [ ] Label every public projection as live, proposal, example, or redacted.
85. [ ] Include SHA-256 provenance for every generated projection.
86. [ ] Include redaction method for every generated projection.
87. [ ] Deny internal ports, hostnames, IPs, usernames, and command lines in public outputs.
88. [ ] Deny raw logs, raw hookwall events, raw GNN edges, and device proofs in public outputs.
89. [ ] Add a projection validation command.
90. [ ] Emit `EVT-PUBLIC-PROJECTION-GATES-READY`.

### P10 - Remake Tree Contract

91. [ ] Define the new remake root contract before copying any code.
92. [ ] Use `specs/`, `projections/`, `examples/`, `public/`, and `tools/` as public-safe buckets.
93. [ ] Keep live `data/`, `runtime/`, `logs/`, and `captures/` private by default.
94. [ ] Create a tracked remake README with scope limits.
95. [ ] Create a tracked remake runbook with local-only commands.
96. [ ] Create a tracked remake manifest schema.
97. [ ] Add a source-to-projection mapping for each included artifact.
98. [ ] Add a denied-source mapping for each excluded private artifact class.
99. [ ] Add a proof that the remake can be read without hidden runtime files.
100. [ ] Emit `EVT-BEHCS1024-REMAKE-TREE-CONTRACT-READY`.

### P11 - Test And Validator Harness

101. [ ] Add or reuse validators for bus health.
102. [ ] Add or reuse validators for GNN sidecar inference.
103. [ ] Add or reuse validators for access-tier matrix shape.
104. [ ] Add or reuse validators for access-tier probe safety.
105. [ ] Add or reuse validators for dashboard triggerability.
106. [ ] Add or reuse validators for public projection leakage.
107. [ ] Add or reuse validators for GitHub partial manifest safety.
108. [ ] Add or reuse validators for PowerShell launcher syntax.
109. [ ] Add or reuse validators for JavaScript syntax.
110. [ ] Emit `EVT-BEHCS1024-VALIDATOR-HARNESS-READY`.

### P12 - White-Room Rebuild And Replay

111. [ ] Define a white-room rebuild input set that excludes raw private runtime data.
112. [ ] Rebuild BEHCS-1024 public-safe contract from tracked sources only.
113. [ ] Rebuild access-tier matrix from source constants or sanitized fixtures.
114. [ ] Replay one LAW-001 receipt through the validator path.
115. [ ] Replay one GNN inference receipt through the validator path.
116. [ ] Replay one dashboard trigger receipt through the validator path.
117. [ ] Replay one C03 documented-divergence receipt through the validator path.
118. [ ] Fail closed if any replay requires private data.
119. [ ] Save white-room rebuild report under `reports/`.
120. [ ] Emit `EVT-WHITE-ROOM-BEHCS1024-REPLAY-PASS`.

### P13 - Liris Mirror Parity

121. [ ] Consume latest Liris daemon status from bus, not memory.
122. [ ] Consume latest Liris GNN status from bus.
123. [ ] Consume latest Liris dashboard status from bus.
124. [ ] Consume latest Liris access-tier matrix receipt from bus when available.
125. [ ] Mark missing Liris access-tier evidence as pending, not failed.
126. [ ] Request Liris metadata-only hidden PID probe.
127. [ ] Request Liris metadata-only shadow drive probe.
128. [ ] Request Liris metadata-only stealth USB probe.
129. [ ] Compare Acer and Liris proof schema fields.
130. [ ] Emit `EVT-LIRIS-MIRROR-PARITY-REQUESTED`.

### P14 - Falcon Mirror Parity

131. [ ] Keep Falcon ADB as a physical blocker until actual device proof exists.
132. [ ] Do not infer Falcon live state from stale ADB or IP.
133. [ ] Request safe Falcon observation only after operator restores ADB.
134. [ ] Mirror BEHCS-1024 access-tier matrix on Falcon when reachable.
135. [ ] Separate Falcon message proof from visual proof.
136. [ ] Separate Falcon keyboard/control proof from executor proof.
137. [ ] Keep no-root, no-flash, no-private-app-data extraction boundary.
138. [ ] Add Falcon proof receipts only when observed.
139. [ ] Compare Falcon against Acer and Liris after live proof.
140. [ ] Emit `EVT-FALCON-MIRROR-PARITY-BLOCKED-PHYSICAL`.

### P15 - Aether And Phone/Device Observers

141. [ ] Keep Aether heartbeat as observer evidence, not Acer evidence.
142. [ ] Record Aether heartbeat freshness and device memory/load fields.
143. [ ] Add Aether observer lane to access-tier proof context only if non-sensitive.
144. [ ] Separate phone observer proof from desktop dashboard proof.
145. [ ] Avoid SMB/WinRM dependency for federation file/control routes.
146. [ ] Prefer BEHCS bus bearer-token or vault-token routes for federation auth.
147. [ ] Mark phone relays as observer paths unless they trigger safe probes.
148. [ ] Add stale observer detection.
149. [ ] Add observer redaction policy.
150. [ ] Emit `EVT-AETHER-OBSERVER-LANE-CLASSIFIED`.

### P16 - Security And Redaction Gates

151. [ ] Run a targeted secret scan on partial commit candidates.
152. [ ] Run a targeted PII scan on public/remake candidates.
153. [ ] Run an internal topology scan on public/remake candidates.
154. [ ] Deny any raw token, PAT, API key, session ID, or credential value.
155. [ ] Deny local usernames and absolute private paths in public docs.
156. [ ] Deny internal IP and port claims in public docs unless abstracted.
157. [ ] Deny raw evidence bundles in public docs.
158. [ ] Require explicit skipped-check banners.
159. [ ] Produce a redaction report.
160. [ ] Emit `EVT-SECURITY-REDACTION-GATES-PASS`.

### P17 - GitHub Issue/Release Workflow

161. [ ] Create a local issue template for BEHCS-1024 remake work.
162. [ ] Create a local pull request template for partial promotion.
163. [ ] Create labels for `behcs-1024`, `remake`, `projection`, `proof`, and `operator-hold`.
164. [ ] Draft GitHub issue text without posting until approved.
165. [ ] Draft GitHub PR body without posting until approved.
166. [ ] Include validation output in PR body.
167. [ ] Include denied files/classes in PR body.
168. [ ] Include rollback plan in PR body.
169. [ ] Include physical/operator blockers in PR body.
170. [ ] Emit `EVT-GITHUB-WORKFLOW-DRAFT-READY`.

### P18 - Documentation And Absorbability

171. [ ] Add a public-safe BEHCS-1024 overview.
172. [ ] Add a glossary for access tiers and proof receipts.
173. [ ] Add a local operator quickstart.
174. [ ] Add a developer quickstart that does not require private runtime files.
175. [ ] Add dashboard trigger-proof examples.
176. [ ] Add GNN sidecar startup notes.
177. [ ] Add LAW-001 bus durability notes.
178. [ ] Add GitHub partial-promotion notes.
179. [ ] Add non-goals and denied claims.
180. [ ] Emit `EVT-DOCS-ABSORBABILITY-DRAFT-READY`.

### P19 - Release Candidate Staging

181. [ ] Build a local-only release candidate file list.
182. [ ] Verify every file in the release candidate is tracked or intentionally generated.
183. [ ] Verify every public doc link resolves inside tracked public-safe buckets.
184. [ ] Verify all validators pass on the release candidate.
185. [ ] Verify no private runtime directory is required.
186. [ ] Verify no physical blocker is represented as solved.
187. [ ] Verify no unsupported promotion language exists.
188. [ ] Verify branch diff contains only intended files.
189. [ ] Prepare a dry-run summary.
190. [ ] Emit `EVT-BEHCS1024-REMAKE-RC-DRY-RUN-PASS`.

### P20 - Promotion, Rollback, And Governance

191. [ ] Require operator approval before staging.
192. [ ] Require operator approval before commit.
193. [ ] Require operator approval before push.
194. [ ] Use partial commit only; do not push the whole dirty tree.
195. [ ] Tag the commit message with BEHCS-1024 remake scope.
196. [ ] Preserve rollback instructions in the PR body.
197. [ ] Monitor bus and daemon health after commit.
198. [ ] Monitor GitHub issue/PR feedback after push.
199. [ ] Update `TASKS.md` with final promotion outcome.
200. [ ] Emit `EVT-BEHCS1024-REMAKE-GITHUB-PLAN-COMPLETE`.

## First Executable Slice

Execute steps 1-20 first. This creates the baseline freeze and Git segmentation needed before any GitHub operation. The first slice must not stage, commit, push, publish, or copy private runtime files.
