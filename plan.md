# Just 20 Usability Plan

## Summary
Make Just 20 usable as a closed-beta MVP: a tester can install it on a real device, complete onboarding, grant permissions, do 20 pushups with trustworthy camera tracking, recover if tracking fails, receive XP/streak/badge feedback, and come back tomorrow. Assume **closed beta / founder testing** first, not public App Store launch.

## Key Changes
- **Real-device test path:** keep Android emulator for smoke tests, but make physical-device testing the default for body tracking. Add clear docs/scripts for Android USB install now; finish iPhone install once full Xcode is available.
- **Workout trust layer:** add a single camera readiness panel covering permission, camera device, model loaded, frames arriving, body in frame, and tracking quality. Disable “Start” until ready, unless user chooses a clearly labeled fallback.
- **Manual fallback:** add a “Count manually today” path when tracking fails. It should preserve the streak, award reduced XP, mark the session as manually counted, and exclude “clean rep” badges.
- **Session metadata:** extend saved sessions to track `tracking_method`, `manual_adjustments`, `tracking_quality`, `camera_ready_ms`, `model_load_ms`, and workout mode. Use migrations so existing local data survives.
- **Startup/recovery UX:** replace silent root-init failures with a recoverable error screen for SQLite/user-profile setup, and add retry actions for notification/camera/model failures.
- **Social honesty:** keep local invite/squad UI, but label backend-dependent status as preview/local-only until Supabase or another backend is active.

## Implementation Plan
- **Build/test readiness:** update README with “Expo Go will not work” guidance, add device-build instructions, add a QR/dev-client note, and keep `npm run verify` as the preflight command.
- **Workout screen:** consolidate scattered camera/model/calibration states into one readiness state machine: `permission_needed`, `loading_model`, `camera_missing`, `waiting_for_frames`, `calibrating`, `ready`, `tracking_unstable`, `manual_mode`.
- **Persistence:** migrate `sessions` to include tracking metadata and expose typed helpers from `lib/db.ts`; pass metadata from workout to completion, XP, and badges.
- **Rewards:** make XP rules explicit: camera-counted clean set gets full XP, manual fallback gets reduced XP, manual corrections disclose on completion, strict monthly test mode does not allow manual count.
- **Diagnostics:** add dev-only structured logs for model load, camera frames, permission denial, save failure, notification scheduling, and share failure. No production analytics backend required yet.
- **Notifications:** verify default mode remains “set a time, 10-minute window + fallback nudges,” and add user-facing settings copy that avoids internal terms like “fallback” where it feels too technical.
- **Distribution prep:** prepare Android internal testing and iOS development-build instructions. iOS physical install remains blocked until full Xcode is installed and selected.

## Test Plan
- `npm run verify` must pass after each implementation batch.
- Android emulator smoke test: app launches, onboarding works, home tabs render, workout screen reaches either camera-ready or clear fallback state.
- Android physical-device test: front camera preview appears, model loads, body tracking overlay appears, reps count, completion saves XP/streak/badges.
- iPhone physical-device test after Xcode: same as Android, plus iOS permission prompts and share/location/photo flows.
- Failure scenarios: camera denied, no camera device, no frames, model load failure, poor lighting, body out of frame, app background/foreground during workout, interrupted workout save.
- Persistence scenarios: first install, upgrade with existing SQLite DB, duplicate completion today, manual fallback session, clean camera session, test-mode session.

## Assumptions
- Priority is **usable closed beta**, not full public launch compliance.
- No backend is required for the first usability pass; streaks, XP, badges, and local invites stay SQLite/local-first.
- Expo Go is out of scope because native camera/TFLite modules require a development build.
- iOS real-device install waits on full Xcode. Everything else that can be prepared locally should be done first.
