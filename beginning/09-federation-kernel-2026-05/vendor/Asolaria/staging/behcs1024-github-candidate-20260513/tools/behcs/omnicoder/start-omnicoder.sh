#!/data/data/com.termux/files/usr/bin/sh
set -u
ROOT=${ANDROID_ASOLARIA_ROOT}
APP=$ROOT/omnicoder
LOG=$APP/omnicoder.log
PID=$APP/omnicoder.pid
PORT=${OMNICODER_PORT:-8789}
mkdir -p "$APP"
if [ -f "$PID" ]; then
  OLD=$(cat "$PID" 2>/dev/null || true)
  if [ -n "$OLD" ]; then kill "$OLD" 2>/dev/null || true; fi
fi
nohup node "$APP/omnicoder-server.mjs" > "$LOG" 2>&1 &
echo $! > "$PID"
sleep 2
echo "OMNICODER started pid=$(cat "$PID") url=http://127.0.0.1:$PORT/"
/system/bin/am start -a android.intent.action.VIEW -d "http://127.0.0.1:$PORT/" >/dev/null 2>&1 || true
tail -n 20 "$LOG" 2>/dev/null || true
