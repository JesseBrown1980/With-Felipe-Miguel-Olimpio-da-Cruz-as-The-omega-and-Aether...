use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Backend {
    Local,
    Sgram,
    CloudManifest,
}

impl Backend {
    pub const ALL: [Self; 3] = [Self::Local, Self::Sgram, Self::CloudManifest];

    const fn directory(self) -> &'static str {
        match self {
            Self::Local => "local",
            Self::Sgram => "sgram",
            Self::CloudManifest => "cloud-manifest",
        }
    }
}

pub fn write_frozen(
    root: &Path,
    backend: Backend,
    key: &str,
    payload: &[u8],
) -> Result<PathBuf, String> {
    if payload.len() != 27 || payload.iter().any(|byte| !b"-.+".contains(byte)) {
        return Err("storage accepts one strict 27-trit RIME state only".into());
    }
    if key.is_empty()
        || !key
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
    {
        return Err("storage key must be a non-empty safe token".into());
    }
    let directory = root.join(backend.directory());
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let path = directory.join(format!("{key}.rime3"));
    if path.exists() {
        let existing = fs::read(&path).map_err(|error| error.to_string())?;
        if existing != payload {
            return Err(format!(
                "immutable RIME key already differs: {}",
                path.display()
            ));
        }
        return Ok(path);
    }
    fs::write(&path, payload).map_err(|error| error.to_string())?;
    Ok(path)
}

pub fn read_frozen(path: &Path) -> Result<Vec<u8>, String> {
    let payload = fs::read(path).map_err(|error| error.to_string())?;
    if payload.len() != 27 || payload.iter().any(|byte| !b"-.+".contains(byte)) {
        return Err("stored RIME state is not exactly 27 strict trits".into());
    }
    Ok(payload)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RimeState;

    #[test]
    fn local_sgram_and_cloud_manifest_round_trip_the_same_frozen_change() {
        let root =
            std::env::temp_dir().join(format!("new-rime-fixed27-wave-{}", std::process::id()));
        let payload = RimeState::seeded().photo();
        for backend in Backend::ALL {
            let path = write_frozen(&root, backend, "test-state", &payload).unwrap();
            assert_eq!(read_frozen(&path).unwrap(), payload);
        }
        fs::remove_dir_all(root).unwrap();
    }
}
