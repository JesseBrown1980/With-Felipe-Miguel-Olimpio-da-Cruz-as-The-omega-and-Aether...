#!/bin/sh
# Runs the shadowcat binary with a private, empty /root, so its fixed output folder
# /root/_horizon/shadowcat/out (src/main.rs:551) is made in memory and the real /root is never
# written. Copies stdout, shadowcat.hbp and shadowcat.hbi into <out-dir>.
# Needs Linux, util-linux unshare and user namespaces (unprivileged, or run as root).
# Usage: tools/horizon.sh <shadowcat-binary> <out-dir>
set -eu
if [ $# -ne 2 ]; then
  echo "usage: tools/horizon.sh <shadowcat-binary> <out-dir>" >&2
  exit 2
fi
# The binary and <out-dir> are opened before the mount, so either may itself lie under /root.
exec unshare --user --map-root-user --mount sh -c '
  set -eu
  exec 3<"$1" 4<"$2"
  mount -t tmpfs tmpfs /root
  /proc/self/fd/3 >/proc/self/fd/4/stdout
  cp /root/_horizon/shadowcat/out/shadowcat.hbp /root/_horizon/shadowcat/out/shadowcat.hbi /proc/self/fd/4/
' sh "$1" "$2"
