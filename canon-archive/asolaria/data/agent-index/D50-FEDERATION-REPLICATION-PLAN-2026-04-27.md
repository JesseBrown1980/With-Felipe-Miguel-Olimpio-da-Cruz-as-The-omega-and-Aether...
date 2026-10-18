# D50 Federation Replication Plan

Date: 2026-04-27  
Wave: 17  
Council result: `PLAN_ONLY=3`, `HOLD=3`  
Boundary: no broadcast, no remote write, no auth mutation

## Verdict

The D50 record should not be broadcast automatically under HOLD.

Safe posture:

- Keep the Acer record local and discoverable.
- Queue replication as a future action.
- Require peer vote confirmation before transmission.
- Treat Falcon, Gaia, Aether, and Liris as separate surfaces with their own evidence class.

## Replication Method

When HOLD is lifted or a read-class peer packet is explicitly authorized:

1. Send only hashes and artifact paths first.
2. Wait for peer acknowledgement.
3. Send full artifacts only if the peer requests them.
4. Record the replication event as D50-tracked.
5. Do not mutate peer state directly.

## Guardrails

- No network broadcast from this plan.
- No credential movement.
- No auth profile switching.
- No remote file write.
- No server start.
- No runtime binding.

## Queue

Pending target surfaces:

- Liris: already has its own D50 record; compare hashes before mirroring.
- Falcon: hold until reachable and not merely simulated.
- Gaia: hold until LAW-001 surface is reachable or explicitly downgraded.
- Aether: simulation-only unless live handshake exists.

