//! The Shannon-gate boot fixture of Shannon-and-the-gnns-stage@32f9670 `pipeline/shannon-boot.mjs`
//! (:30-170): `bootShannon`, the `shannon:gate:check` bus listener, `checkShannonGate` (the
//! LX-328/329/331/332/333 evaluator), `selfTest` and the HBPv1 `emitFixtureRestored` row.
//!
//! Boundary inputs: the profile is a JSON file upstream (:38-45); reading and parsing it is the
//! caller's (no JSON here), and [`ProfileSource`] carries the outcome. `loadedAt` and the fixture
//! path are caller inputs. Three upstream lines carry third-party data and are not reproduced:
//! the AUTHORITY comment (:20), the self-test `approvedBy` value (:118) and the row's `cosign=`
//! value (:155); [`ShannonGate::self_test`] and [`fixture_restored_row`] take the last two as
//! operator-supplied inputs.

use crate::jsvalue::{le_one, JsValue};
use crate::sha::sha256hex;
use std::fs::{create_dir_all, OpenOptions};
use std::io::{self, Write};
use std::path::Path;

/// `SHANNON_PID_CANON` (:30).
pub const SHANNON_PID_CANON: &str = "AGT-SHANNON-PID-HD16C-A04-W1024-P01-N00001";
/// `RULE_ANCHORS` (:31).
pub const RULE_ANCHORS: [&str; 5] = ["LX-328", "LX-329", "LX-331", "LX-332", "LX-333"];
/// The `brown_hilbert_hash` default (:55).
pub const DEFAULT_BROWN_HILBERT_HASH: &str = "H421B85FD07C14FB4";
/// `emitFixtureRestored` default `anchor` (:135).
pub const DEFAULT_ANCHOR: &str = "FIXTURE-RESTORED-SHANNON-R1-PID-2026-05-19";
/// `emitFixtureRestored` default `prevHash` (:136).
pub const DEFAULT_PREV_HASH: &str = "seq190-multitrack-rollup";
/// The self-test `approvalRef` (:119).
pub const SELF_TEST_APPROVAL_REF: &str = "ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11";

/// The profile fields `bootShannon` reads (:47-55): a string, or `None` when absent. Profiles
/// whose fields hold other JSON types are outside this port's domain.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ProfileDoc {
    /// `doc.agent_pid_current`.
    pub agent_pid_current: Option<String>,
    /// `doc.role`.
    pub role: Option<String>,
    /// `doc.supervisor_pid`.
    pub supervisor_pid: Option<String>,
    /// `doc.prof_pid`.
    pub prof_pid: Option<String>,
    /// `doc.resume_packet?.last_rotation?.brown_hilbert_hash`.
    pub last_rotation_brown_hilbert_hash: Option<String>,
}

/// What reading the profile file gave (:39-45), decided by the caller. A file whose JSON is
/// `null` has no outcome here: upstream reads `doc.agent_pid_current` of `null` (:47) and throws a
/// TypeError, so the caller handles that file (an empty [`ProfileDoc`] would give `pid_mismatch`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ProfileSource {
    /// `existsSync(path)` was false; `resolved_path` is `resolve(profile)`.
    NotFound {
        /// `resolve(profile)`.
        resolved_path: String,
    },
    /// `JSON.parse` threw with `message`.
    ParseError {
        /// `e.message`.
        message: String,
    },
    /// The parsed profile.
    Doc(ProfileDoc),
}

/// `registeredProfile` (:50-58).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RegisteredProfile {
    /// `role`.
    pub role: Option<String>,
    /// `supervisor_pid`.
    pub supervisor_pid: Option<String>,
    /// `prof_pid`.
    pub prof_pid: Option<String>,
    /// `agent_pid` (always [`SHANNON_PID_CANON`]).
    pub agent_pid: String,
    /// `brown_hilbert_hash`.
    pub brown_hilbert_hash: String,
    /// `loadedAt`.
    pub loaded_at: String,
}

/// `bootShannon` result (:41, :45, :48, :64); `ruleAnchors` of a success is [`RULE_ANCHORS`].
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Boot {
    /// `{ ok: true, profile, ruleAnchors }`.
    Ok(RegisteredProfile),
    /// `{ ok: false, reason }`.
    Failed(String),
}

/// `checkShannonGate` result (:70-100). The first two outcomes carry no `status` or
/// `approvalState` (`None`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GateVerdict {
    /// `granted`.
    pub granted: bool,
    /// `status`.
    pub status: Option<&'static str>,
    /// `approvalState`.
    pub approval_state: Option<&'static str>,
    /// `reason`.
    pub reason: &'static str,
    /// `ruleAnchors`.
    pub rule_anchors: Vec<&'static str>,
}

impl GateVerdict {
    fn new(
        granted: bool,
        status: Option<&'static str>,
        approval_state: Option<&'static str>,
        reason: &'static str,
        rule_anchors: &[&'static str],
    ) -> Self {
        GateVerdict {
            granted,
            status,
            approval_state,
            reason,
            rule_anchors: rule_anchors.to_vec(),
        }
    }

    fn blocked(reason: &'static str, anchor: &'static str) -> Self {
        GateVerdict::new(
            false,
            Some("blocked"),
            Some("leader_required"),
            reason,
            &[anchor],
        )
    }
}

/// `approval.<key>` on a `null` approval throws a TypeError (:80).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ApprovalIsNull;

/// One `selfTest` result row `{ name, ok, detail }` (:107-126).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SelfTestRow {
    /// `name`.
    pub name: &'static str,
    /// `ok`.
    pub ok: bool,
    /// `detail`.
    pub detail: String,
}

/// `selfTest()` result (:128-129).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SelfTest {
    /// `allGreen`.
    pub all_green: bool,
    /// `results`.
    pub results: Vec<SelfTestRow>,
}

/// The module state: `registeredProfile` (:35) and the `shannon:gate:check` listeners on
/// `shannonBus` (:34), one added by every successful boot (:60-63).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ShannonGate {
    registered: Option<RegisteredProfile>,
    listeners: usize,
}

impl ShannonGate {
    /// Module load: nothing registered, no listeners.
    pub fn new() -> Self {
        Self::default()
    }

    /// `registeredProfile`.
    pub fn registered_profile(&self) -> Option<&RegisteredProfile> {
        self.registered.as_ref()
    }

    /// The number of `shannon:gate:check` listeners.
    pub fn listeners(&self) -> usize {
        self.listeners
    }

    /// `bootShannon({ profile })` (:38-65) with the file outcome in `source` and `loadedAt`
    /// (`new Date().toISOString()`) from the caller.
    pub fn boot(&mut self, source: &ProfileSource, loaded_at: &str) -> Boot {
        let doc = match source {
            ProfileSource::NotFound { resolved_path } => {
                return Boot::Failed(format!("profile_not_found:{resolved_path}"))
            }
            ProfileSource::ParseError { message } => {
                return Boot::Failed(format!("profile_parse_error:{message}"))
            }
            ProfileSource::Doc(doc) => doc,
        };
        if doc.agent_pid_current.as_deref() != Some(SHANNON_PID_CANON) {
            let shown = doc.agent_pid_current.as_deref().unwrap_or("undefined");
            return Boot::Failed(format!("pid_mismatch:{shown}!={SHANNON_PID_CANON}"));
        }
        let hash = doc
            .last_rotation_brown_hilbert_hash
            .as_deref()
            .filter(|h| !h.is_empty())
            .unwrap_or(DEFAULT_BROWN_HILBERT_HASH);
        let profile = RegisteredProfile {
            role: doc.role.clone(),
            supervisor_pid: doc.supervisor_pid.clone(),
            prof_pid: doc.prof_pid.clone(),
            agent_pid: SHANNON_PID_CANON.to_string(),
            brown_hilbert_hash: hash.to_string(),
            loaded_at: loaded_at.to_string(),
        };
        self.registered = Some(profile.clone());
        self.listeners += 1;
        Boot::Ok(profile)
    }

    /// `checkShannonGate(action, tier = 1, approval = {})` (:69-101). Pass
    /// [`JsValue::Undefined`] for an omitted argument.
    pub fn check(
        &self,
        action: &JsValue,
        tier: &JsValue,
        approval: &JsValue,
    ) -> Result<GateVerdict, ApprovalIsNull> {
        if self.registered.is_none() {
            return Ok(GateVerdict::new(false, None, None, "gate_not_booted", &[]));
        }
        if !action.truthy() {
            return Ok(GateVerdict::new(
                false,
                None,
                None,
                "action_required",
                &["LX-328"],
            ));
        }
        let tier_le_one = match tier {
            JsValue::Undefined => true,
            other => le_one(other),
        };
        if tier_le_one {
            return Ok(GateVerdict::new(
                true,
                Some("dry_run_ready"),
                Some("dry_run_only"),
                "",
                &["LX-328"],
            ));
        }
        if matches!(approval, JsValue::Null) {
            return Err(ApprovalIsNull);
        }
        if !approval.get("mode").is_str("approved_run") {
            return Ok(GateVerdict::blocked("mode_not_approved_run", "LX-329"));
        }
        if !approval.get("explicitApproval").truthy() {
            return Ok(GateVerdict::blocked(
                "execution_approval_required",
                "LX-331",
            ));
        }
        if !approval.get("authorityMode").is_str("asolaria_primary") {
            return Ok(GateVerdict::blocked(
                "authority_mode_not_asolaria_primary",
                "LX-332",
            ));
        }
        if !approval.get("approvedBy").truthy() || !approval.get("approvalRef").truthy() {
            return Ok(GateVerdict::blocked(
                "execution_approval_reference_required",
                "LX-333",
            ));
        }
        Ok(GateVerdict::new(
            true,
            Some("approved_ready"),
            Some("leader_approved"),
            "",
            &RULE_ANCHORS,
        ))
    }

    /// `shannonBus.emit('shannon:gate:check', req)` (:60-63): one verdict per listener, each
    /// `checkShannonGate(req?.action, req?.tier, req?.approval)`. A listener's TypeError
    /// propagates out of `emit`.
    pub fn bus_check(&self, req: &JsValue) -> Result<Vec<GateVerdict>, ApprovalIsNull> {
        (0..self.listeners)
            .map(|_| self.check(req.get("action"), req.get("tier"), req.get("approval")))
            .collect()
    }

    /// `selfTest()` (:104-130) with the profile outcome of the default path in `source` and the
    /// happy-path `approvedBy` (:118, operator-supplied) in `approved_by`.
    pub fn self_test(
        &mut self,
        source: &ProfileSource,
        loaded_at: &str,
        approved_by: &str,
    ) -> SelfTest {
        let mut results = Vec::new();
        let boot = self.boot(source, loaded_at);
        let (ok, detail) = match &boot {
            Boot::Ok(profile) => (true, profile.agent_pid.clone()),
            Boot::Failed(reason) => (false, reason.clone()),
        };
        results.push(SelfTestRow {
            name: "boot",
            ok,
            detail,
        });
        let detail = |v: &GateVerdict| {
            if v.reason.is_empty() {
                v.status.unwrap_or("").to_string()
            } else {
                v.reason.to_string()
            }
        };
        let t1 = self
            .check(
                &JsValue::str("shannon:status"),
                &JsValue::int(1),
                &JsValue::Undefined,
            )
            .expect("default approval");
        results.push(SelfTestRow {
            name: "LX-328-baseline",
            ok: t1.granted && t1.status == Some("dry_run_ready"),
            detail: detail(&t1),
        });
        let approval = |approval_ref: &str| {
            JsValue::object(vec![
                ("mode", JsValue::str("approved_run")),
                ("explicitApproval", JsValue::Bool(true)),
                ("authorityMode", JsValue::str("asolaria_primary")),
                ("approvedBy", JsValue::str(approved_by)),
                ("approvalRef", JsValue::str(approval_ref)),
            ])
        };
        let action = JsValue::str("usb_raw_io.write");
        let t2 = self
            .check(&action, &JsValue::int(2), &approval(SELF_TEST_APPROVAL_REF))
            .expect("object approval");
        results.push(SelfTestRow {
            name: "tier-2-happy",
            ok: t2.granted && t2.status == Some("approved_ready"),
            detail: detail(&t2),
        });
        let blocked = self
            .check(&action, &JsValue::int(2), &approval(""))
            .expect("object approval");
        results.push(SelfTestRow {
            name: "LX-333-blocked",
            ok: !blocked.granted && blocked.reason == "execution_approval_reference_required",
            detail: blocked.reason.to_string(),
        });
        SelfTest {
            all_green: results.iter().all(|r| r.ok),
            results,
        }
    }
}

/// The `emitFixtureRestored` row body (:138-164) and its `row_hash = sha256(body)` (:165).
/// `cosign` is the operator-supplied value of the `cosign=` field (:155).
pub fn fixture_restored_row(anchor: &str, prev_hash: &str, cosign: &str) -> (String, String) {
    let antecedents = format!(
        "antecedents=DAN-HOOKS-LINEAGE-CANON-PID-2026-05-19,{SHANNON_PID_CANON},LX-328,LX-329,LX-331,LX-332,LX-333,seq191-shannon-r1-boot"
    );
    let pid = format!("pid={anchor}");
    let prev = format!("prev_hash={prev_hash}");
    let cosign = format!("cosign={cosign}");
    let row: [&str; 55] = [
        "HBPv1",
        "layer=fixture-restoration",
        &pid,
        "prof=shannon-gate-boot-fixture",
        "supervisor=nereus-cp76",
        "tuple=fixture:shannon:gate:boot",
        "triple_quant=unspecified",
        "polar_quant=unspecified",
        "js_quant=unspecified",
        "turbo_quant=unspecified",
        "json=0",
        "runtime=0",
        "promote=1",
        "status=FIXTURE_RESTORED",
        &antecedents,
        "chain_id=COHORT-R-FIXTURE-RESTORATION",
        "sequence=191",
        &prev,
        "cohort=R",
        "phase=R1",
        "fixture_class=real-free",
        "describe_only=1",
        &cosign,
        "rule_anchors=LX-328|LX-329|LX-331|LX-332|LX-333",
        "endpoint=0",
        "provider=0",
        "mcp=0",
        "usb_write=0",
        "device_write=0",
        "dispatch=0",
        "route=0",
        "shell=0",
        "terminal=0",
        "file_write=1",
        "memory_write=0",
        "tool_execute=0",
        "skill_execute=0",
        "mcp_execute=0",
        "webmcp_execute=0",
        "provider_call=0",
        "endpoint_open=0",
        "browser_control=0",
        "keyboard_control=0",
        "screenshot_capture=0",
        "network_call=0",
        "webhook_open=0",
        "cron_create=0",
        "device_read=0",
        "usb_read=0",
        "private_surface_export=0",
        "hidden_surface_export=0",
        "restricted_surface_export=0",
        "secret_surface_export=0",
        "repo_publish=0",
        "package_release=0",
    ];
    let body = row.join("|");
    let row_hash = sha256hex(&body);
    (body, row_hash)
}

/// `emitFixtureRestored({ hbpPath, anchor, prevHash })` (:133-170) result.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FixtureEmit {
    /// `row_hash`.
    pub row_hash: String,
    /// The appended line, `${body}|row_hash=${row_hash}\n`.
    pub line: String,
}

/// `emitFixtureRestored` (:133-170): creates the parent directory and appends the row.
pub fn emit_fixture_restored(
    hbp_path: &Path,
    anchor: &str,
    prev_hash: &str,
    cosign: &str,
) -> io::Result<FixtureEmit> {
    let (body, row_hash) = fixture_restored_row(anchor, prev_hash, cosign);
    let line = format!("{body}|row_hash={row_hash}\n");
    if let Some(parent) = hbp_path.parent() {
        create_dir_all(parent)?;
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(hbp_path)?;
    file.write_all(line.as_bytes())?;
    Ok(FixtureEmit { row_hash, line })
}
