#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${1:-JamfulPlay}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMULATOR="$SDK_ROOT/emulator/emulator"
ADB="$SDK_ROOT/platform-tools/adb"
CONFIG="$HOME/.android/avd/$AVD_NAME.avd/config.ini"

if [[ ! -x "$EMULATOR" ]]; then
  echo "Android emulator binary not found at: $EMULATOR" >&2
  exit 1
fi

if [[ ! -x "$ADB" ]]; then
  echo "adb binary not found at: $ADB" >&2
  exit 1
fi

if ! "$EMULATOR" -webcam-list | grep -q "Camera 'webcam0'"; then
  echo "No host webcam named webcam0 is available to the Android emulator." >&2
  "$EMULATOR" -webcam-list >&2 || true
  exit 1
fi

if [[ -f "$CONFIG" ]]; then
  /usr/bin/perl -0pi -e 's/^hw\.camera\.front=.*/hw.camera.front=webcam0/m; s/^hw\.camera\.back=.*/hw.camera.back=none/m' "$CONFIG"
fi

if "$ADB" devices | grep -q '^emulator-[0-9].*device$'; then
  current_avd="$("$ADB" shell getprop ro.boot.qemu.avd_name 2>/dev/null | tr -d '\r' || true)"
  if [[ "$current_avd" == "$AVD_NAME" ]]; then
    echo "Restarting $AVD_NAME with host webcam..."
    "$ADB" emu kill >/dev/null 2>&1 || true
    sleep 3
  fi
fi

(
  for _ in $(seq 1 90); do
    if "$ADB" devices | grep -q '^emulator-[0-9].*device$'; then
      booted="$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
      if [[ "$booted" == "1" ]]; then
        "$ADB" shell input keyevent 82 >/dev/null 2>&1 || true
        npx expo run:android
        exit $?
      fi
    fi
    sleep 2
  done

  echo "Timed out waiting for $AVD_NAME to boot." >&2
  exit 1
) &

echo "Starting $AVD_NAME with webcam0. Keep this process open while testing."
exec "$EMULATOR" @"$AVD_NAME" \
  -camera-front webcam0 \
  -camera-back none \
  -no-snapshot-load \
  -no-snapshot-save
