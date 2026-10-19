#!/usr/bin/env bash
set -euo pipefail

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs |
    sh -s -- -y --profile minimal --default-toolchain none
  export PATH="${HOME}/.cargo/bin:${PATH}"
fi

rustup toolchain install 1.81 --profile minimal --component rustfmt --component clippy
rustup run 1.81 cargo fetch --locked
