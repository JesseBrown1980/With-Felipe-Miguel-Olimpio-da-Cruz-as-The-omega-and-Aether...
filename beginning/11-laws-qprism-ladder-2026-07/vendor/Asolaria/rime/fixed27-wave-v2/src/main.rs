use new_rime_fixed27_wave::{
    measurement_receipt, structural_receipt, verify, write_frozen, Backend,
};
use std::fs;
use std::path::Path;

fn main() {
    let mut arguments = std::env::args().skip(1);
    let command = arguments.next().unwrap_or_else(|| "receipt".to_string());
    let report = verify().unwrap_or_else(|error| {
        eprintln!("RIME-TRIT-WAVE|status=FAIL|error={error}");
        std::process::exit(1);
    });
    match command.as_str() {
        "receipt" => print!("{}", structural_receipt(&report)),
        "measure" => print!("{}", measurement_receipt(&report)),
        "photo" => print!(
            "{}",
            String::from_utf8(report.constellation.output.photo().to_vec())
                .expect("strict trit ASCII")
        ),
        "store" => {
            let root = Path::new("runtime-store");
            let payload = report.constellation.output.photo();
            for backend in Backend::ALL {
                let path = write_frozen(root, backend, "fixed27-values-v2", &payload)
                    .expect("frozen backend write");
                println!("STORE|backend={backend:?}|path={}", path.display());
            }
        }
        "seal" => {
            let seat = arguments.next().unwrap_or_else(|| "acer".to_string());
            if !seat
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte == b'-')
            {
                eprintln!("seat must contain lowercase ASCII letters and hyphens only");
                std::process::exit(2);
            }

            fs::create_dir_all("receipts").expect("create receipts directory");
            fs::create_dir_all("sgram/runtime").expect("create SGRAM runtime directory");
            fs::write(
                "receipts/rime-wave-structural-v2.hbp",
                structural_receipt(&report),
            )
            .expect("write structural receipt");
            fs::write(
                format!("receipts/rime-wave-measure-{seat}-v2.hbp"),
                measurement_receipt(&report),
            )
            .expect("write measurement receipt");

            let payload = report.constellation.output.photo();
            fs::write("sgram/runtime/rime-wave-state-v2.trit", payload)
                .expect("write SGRAM state photo");
            for backend in Backend::ALL {
                write_frozen(
                    Path::new("runtime-store"),
                    backend,
                    "fixed27-values-v2",
                    &payload,
                )
                .expect("write immutable backend projection");
            }
            println!("SEAL|schema=RIME-TRIT-WAVE-V2|seat={seat}|status=PASS");
        }
        other => {
            eprintln!("unknown command {other}; use receipt, measure, photo, store, or seal");
            std::process::exit(2);
        }
    }
}
