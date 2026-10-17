//! The two upstream caller_pid / slot / syscall_no derivations, each on its own lane and each its
//! own function (OWNER-RULES 7d). Both are reproduced unchanged in what they compute from their
//! cited upstream lines; neither launches anything (the launch site is a separate gated step).

/// Host8 spawn-gate syscall number (host8-serve/src/main.rs:1129 `SYS_SPAWN_GATED`).
pub const SYS_SPAWN_GATED: u8 = 9;

/// Kernel EXEC syscall number (kernel/boot/src/init.rs:150 `SYSCALL_EXEC`).
pub const SYSCALL_EXEC: u8 = 3;

/// Kernel envelope-dispatch syscall number (kernel/boot/src/init.rs:151 `SYSCALL_ENVELOPE_DISPATCH`).
pub const SYSCALL_ENVELOPE_DISPATCH: u8 = 10;

/// A (caller_pid, slot, syscall_no) triple fed to the spawn gate / hookwall context.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PidSource {
    pub caller_pid: u64,
    pub slot: u8,
    pub syscall_no: u8,
}

/// Host8 launch-plan lane (host8-serve/src/main.rs:1224-1235): `caller_pid` is the hex parse of the
/// first 16 chars of `instance_pid`, `slot` is `room_id % 64`, `syscall_no` is `SYS_SPAWN_GATED` (9).
/// Upstream passes `room_id = room_id_from_pid(&instance_pid)` (main.rs:1205).
pub fn host8_launch_plan_pid_source(instance_pid: &str, room_id: u32) -> PidSource {
    let caller_pid =
        u64::from_str_radix(&instance_pid[..instance_pid.len().min(16)], 16).unwrap_or(0);
    PidSource {
        caller_pid,
        slot: (room_id % 64) as u8,
        syscall_no: SYS_SPAWN_GATED,
    }
}

/// Kernel init-table lane (kernel/core/src/syscall/mod.rs:291,311 + kernel/boot/src/init.rs:149-163):
/// `caller_pid` is 0 (the synthesized `HookContext`), `syscall_no` is `SYSCALL_EXEC` (3) for an `EXEC`
/// type-prefix and `SYSCALL_ENVELOPE_DISPATCH` (10) otherwise, and `slot` is `syscall_no - 1`.
pub fn kernel_init_pid_source(type_prefix: &[u8; 4]) -> PidSource {
    let syscall_no = if type_prefix == b"EXEC" {
        SYSCALL_EXEC
    } else {
        SYSCALL_ENVELOPE_DISPATCH
    };
    PidSource {
        caller_pid: 0,
        slot: syscall_no - 1,
        syscall_no,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rooms::room_id_from_pid;

    #[test]
    fn upstream_syscall_numbers() {
        assert_eq!(SYS_SPAWN_GATED, 9);
        assert_eq!(SYSCALL_EXEC, 3);
        assert_eq!(SYSCALL_ENVELOPE_DISPATCH, 10);
    }

    #[test]
    fn host8_lane_hex_prefix_room_slot_and_syscall_9() {
        // instance_pid "deadbeef" -> room_id 2488 (rooms.rs parity vector) -> slot 2488 % 64 = 56.
        let src = host8_launch_plan_pid_source("deadbeef", room_id_from_pid("deadbeef"));
        assert_eq!(src.caller_pid, 0xdeadbeef);
        assert_eq!(src.slot, 56);
        assert_eq!(src.syscall_no, 9);
    }

    // Upstream's instance_pid is always sha16 (16 lowercase hex, main.rs:1201-1202); the next two
    // tests drive the `[..len().min(16)]` and `unwrap_or(0)` of main.rs:1224-1225 with other inputs.
    #[test]
    fn host8_lane_takes_only_the_first_16_hex_chars() {
        let src = host8_launch_plan_pid_source("0155964ffc8ef1f8_tail_ignored", 0);
        assert_eq!(src.caller_pid, 0x0155964ffc8ef1f8);
        assert_eq!(src.slot, 0);
        assert_eq!(src.syscall_no, 9);
    }

    #[test]
    fn host8_lane_non_hex_pid_falls_back_to_zero() {
        let src = host8_launch_plan_pid_source("not-hex-at-all!!", 5);
        assert_eq!(src.caller_pid, 0);
        assert_eq!(src.slot, 5);
    }

    #[test]
    fn kernel_lane_exec_is_caller_zero_slot_2_syscall_3() {
        let src = kernel_init_pid_source(b"EXEC");
        assert_eq!(src.caller_pid, 0);
        assert_eq!(src.syscall_no, 3);
        assert_eq!(src.slot, 2);
    }

    #[test]
    fn kernel_lane_non_exec_is_caller_zero_slot_9_syscall_10() {
        let src = kernel_init_pid_source(b"SPWN");
        assert_eq!(src.caller_pid, 0);
        assert_eq!(src.syscall_no, 10);
        assert_eq!(src.slot, 9);
    }

    #[test]
    fn host8_lane_full_upstream_chain_for_formula_chief() {
        // main.rs:1200-1235 on upstream's node vectors (main.rs:1669-1676): CHIEF row (main.rs:1586)
        // -> seat -> tuple60d -> instance_pid -> room_id_from_pid -> (caller_pid, slot, syscall).
        use crate::identity::{resolve_instance_pid, seat_from_row, tuple60d};
        use crate::rooms::room_folder_name;
        use alloc::string::ToString;
        let chief = "CHIEF|FORMULA-CHIEF|PID=0155964ffc8ef1f8|HILBERT=1339|LAYER=chief|CLASS=level3_chief|GLYPH_BEHCS1024=591|CUBE_BH=BH.51.0.591|role=x|reports_to=COL-ASOLARIA-HELM";
        let seat = seat_from_row(chief, "f").expect("chief parses");
        let (verb, noun, glyph, sha) = tuple60d(
            &seat.name,
            &seat.handle8,
            &seat.cube_bh,
            &["format".to_string()],
        );
        let instance_pid = resolve_instance_pid(
            &seat.handle8,
            "acer",
            "1750000000",
            &verb,
            &noun,
            &glyph,
            &sha,
        );
        assert_eq!(instance_pid, "d125579d9644c37a");
        let room_id = room_id_from_pid(&instance_pid);
        assert_eq!(room_id, 3188);
        assert_eq!(room_folder_name(room_id), "omni-room-behcs-256-3188");
        let src = host8_launch_plan_pid_source(&instance_pid, room_id);
        assert_eq!(src.caller_pid, 0xd125579d9644c37a);
        assert_eq!(src.caller_pid, 15_070_548_062_407_803_770);
        assert_eq!(src.slot, 52);
        assert_eq!(src.syscall_no, 9);
    }

    #[test]
    fn the_two_lanes_compute_different_caller_pids() {
        // Host8 lane derives caller_pid from the PID hex; the kernel init lane pins it to 0. The PID
        // and room are the upstream chain values from the test above.
        let host8 = host8_launch_plan_pid_source("d125579d9644c37a", 3188);
        let kernel = kernel_init_pid_source(b"EXEC");
        assert_eq!(host8.caller_pid, 15_070_548_062_407_803_770);
        assert_eq!(kernel.caller_pid, 0);
    }
}
