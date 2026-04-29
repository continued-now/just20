#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${1:-Just20}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMULATOR="$SDK_ROOT/emulator/emulator"
ADB="$SDK_ROOT/platform-tools/adb"
CONFIG="$HOME/.android/avd/$AVD_NAME.avd/config.ini"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
METRO_PORT="${METRO_PORT:-8081}"
APP_ID="com.anonymous.just20"
OLD_APP_ID="com.anonymous.just20jake"

set_config_value() {
  local key="$1"
  local value="$2"

  if grep -q "^$key=" "$CONFIG"; then
    /usr/bin/perl -0pi -e "s/^\\Q$key\\E=.*/$key=$value/m" "$CONFIG"
  else
    printf '%s=%s\n' "$key" "$value" >> "$CONFIG"
  fi
}

grant_camera_permission_when_installed() {
  local serial="$1"

  (
    for _ in {1..90}; do
      if "$ADB" -s "$serial" shell pm path "$APP_ID" >/dev/null 2>&1; then
        "$ADB" -s "$serial" shell pm grant "$APP_ID" android.permission.CAMERA >/dev/null 2>&1 || true
        exit 0
      fi
      sleep 1
    done
  ) &
}

target_serial() {
  "$ADB" devices | awk '$2 == "device" { print $1 }' | while read -r serial; do
    local avd_name
    avd_name="$("$ADB" -s "$serial" shell getprop ro.boot.qemu.avd_name 2>/dev/null | tr -d '\r' || true)"
    if [[ "$avd_name" == "$AVD_NAME" ]]; then
      printf '%s\n' "$serial"
      return 0
    fi
  done
}

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
  set_config_value "hw.camera.front" "webcam0"
  set_config_value "hw.camera.back" "none"
fi

metro_pids="$(lsof -tiTCP:"$METRO_PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$metro_pids" ]]; then
  echo "Stopping existing Metro listener on port $METRO_PORT to avoid stale project paths..."
  kill $metro_pids >/dev/null 2>&1 || true
  sleep 1
fi

echo "Refreshing generated Android autolinking cache..."
rm -rf \
  "$PROJECT_ROOT/android/build/generated/autolinking" \
  "$PROJECT_ROOT/android/app/build/generated/autolinking"

existing_serial="$(target_serial || true)"
if [[ -n "$existing_serial" ]]; then
  echo "Restarting $AVD_NAME with host webcam..."
  "$ADB" -s "$existing_serial" emu kill >/dev/null 2>&1 || true
  sleep 3
fi

(
  for _ in $(seq 1 90); do
    serial="$(target_serial || true)"
    if [[ -n "$serial" ]]; then
      booted="$("$ADB" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
      if [[ "$booted" == "1" ]]; then
        "$ADB" -s "$serial" shell input keyevent 82 >/dev/null 2>&1 || true
        "$ADB" -s "$serial" uninstall "$OLD_APP_ID" >/dev/null 2>&1 || true
        "$ADB" -s "$serial" reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT" >/dev/null 2>&1 || true
        grant_camera_permission_when_installed "$serial"
        cd "$PROJECT_ROOT"
        ANDROID_SERIAL="$serial" npx expo run:android --port "$METRO_PORT" --app-id "$APP_ID"
        "$ADB" -s "$serial" shell pm grant "$APP_ID" android.permission.CAMERA >/dev/null 2>&1 || true
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
