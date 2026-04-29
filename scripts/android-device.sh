#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="com.anonymous.just20"
METRO_PORT="${METRO_PORT:-8081}"
ADB="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}/platform-tools/adb"

if [[ ! -x "$ADB" ]]; then
  echo "adb not found at: $ADB" >&2
  echo "Install Android Studio SDK platform-tools or set ANDROID_HOME." >&2
  exit 1
fi

"$ADB" start-server >/dev/null

mapfile -t PHYSICAL_DEVICES < <("$ADB" devices | awk '$2 == "device" && $1 !~ /^emulator-/ { print $1 }')

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  TARGET="$ANDROID_SERIAL"
elif [[ "${#PHYSICAL_DEVICES[@]}" -eq 1 ]]; then
  TARGET="${PHYSICAL_DEVICES[0]}"
else
  echo "Expected one USB Android device, found ${#PHYSICAL_DEVICES[@]}." >&2
  echo "Plug in a phone, enable USB debugging, tap Trust/Allow, then rerun." >&2
  echo "If multiple phones are connected, set ANDROID_SERIAL=<serial>." >&2
  "$ADB" devices -l >&2
  exit 1
fi

echo "Installing Just 20 development build on Android device: $TARGET"
"$ADB" -s "$TARGET" reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT" >/dev/null 2>&1 || true

cd "$PROJECT_ROOT"
ANDROID_SERIAL="$TARGET" npx expo run:android --port "$METRO_PORT" --app-id "$APP_ID"
