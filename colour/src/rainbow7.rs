//! Port of the band addressing of stone-to-moss @f032bc0
//! `experiments/seat1/rainbow7/rainbow7_bank.py`: seven band labels (`:11`) times the 81 records,
//! band-major (`:48-50`), 567 addresses. The bank entries, the index rows and the manifest are
//! canonical-JSON bytes upstream (`:19-20,51-58,61-87`) and are produced by the vendored Python.

/// `BANDS` (`rainbow7_bank.py:11`).
pub const BANDS: [&str; 7] = [
    "red", "orange", "yellow", "green", "blue", "indigo", "violet",
];

/// Records per band (`rainbow7_bank.py:27`).
pub const RECORDS: usize = 81;

/// `address` (`rainbow7_bank.py:50`): `rainbow7/{band}/site-{i:03d}`.
pub fn address(band_index: usize, record: usize) -> String {
    format!("rainbow7/{}/site-{record:03}", BANDS[band_index])
}

/// All 567 addresses in the order `build` writes them (`rainbow7_bank.py:48-50`).
pub fn addresses() -> Vec<String> {
    (0..BANDS.len())
        .flat_map(|band| (0..RECORDS).map(move |i| address(band, i)))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn five_hundred_sixty_seven_addresses() {
        let all = addresses();
        assert_eq!(all.len(), 567);
        assert_eq!(all[0], "rainbow7/red/site-000");
        assert_eq!(all[81], "rainbow7/orange/site-000");
        assert_eq!(all[566], "rainbow7/violet/site-080");
    }
}
