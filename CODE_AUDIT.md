# Just20 Code Audit and Worklist

Audit date: 2026-04-26

## Current Read

Just20 has a strong app loop: notifications push the user into a camera workout, a local rep counter records a completed set, streak state drives rewards, and the completion screen creates a shareable card. The codebase is small and understandable, which is a good place to be.

The main risk is that several production-facing behaviors are still implemented as prototypes: local date math, notification bookkeeping, social features, privacy permissions, and the Supabase scaffold. These should be hardened before more growth mechanics are layered on top.

## Priority Worklist

### P0 - Fix Before Shipping

- [x] Centralize local-date handling.
  - Today, streaks, sessions, weekly chest eligibility, and cloud sync use `toISOString().split('T')[0]` in several places. That computes the UTC date, not the user's local date, so late-night users can lose or gain streak days incorrectly.
  - Create a `lib/dates.ts` helper for local day keys, offset days, week starts, and day differences.
  - Replace usages in `lib/db.ts`, `lib/coins.ts`, `lib/social.ts`, and calendar screens.

- [x] Make streak and freeze updates transactional.
  - `saveSession` inserts a session and then mutates streak state in separate operations. If an app crash happens between those calls, sessions and streaks can diverge.
  - Wrap completion insert, streak update, freeze spend/earn, and coin awards in a transaction or make the operation idempotent from session rows.

- [x] Stop `cancelAllNudges` from cancelling non-nudge notifications.
  - `cancelAllNudges` currently calls `cancelAllScheduledNotificationsAsync`, which also removes the streak-at-risk notification and any future feature notifications.
  - Store nudge identifiers or tag nudge notifications with `data.type = 'nudge'`, then cancel only those.

- [x] Avoid requesting location permission on every completion.
  - Completion currently asks for foreground location just to decorate a share card. That is a high-friction permission at the exact moment the user should be sharing.
  - Make location opt-in from settings or a share-card toggle, and keep the default share card location-free.

- [ ] Replace mock/social preview states with explicit disabled or real backend states.
  - The squad screen shows static leaderboard names, simulated rank, and locally-linked buddies whose completion status is always pending.
  - Either wire real Supabase data or label the section as a local preview and keep it out of core user decisions.

### P1 - Improve Reliability and Maintainability

- [x] Add a test setup.
  - Added a no-dependency Node test harness for pure logic.
  - First covered targets: date helpers and user/invite validation.

- [x] Add linting and formatting.
  - Added Expo ESLint, Prettier config, and `lint`, `format`, `format:check`, and `test` scripts.
  - `verify` now runs typecheck, lint, tests, native-config sync, and Expo Doctor.

- [x] Make database migrations versioned.
  - Replaced anonymous `ALTER TABLE` try/catch calls with a `schema_meta` version and named migration runner.

- [x] Validate and sanitize user-facing inputs.
  - Added username constraints, invite-code normalization, pasted-code parsing, and shared validation helpers.

- [x] Add loading and error states for startup.
  - Root initialization now shows a recoverable startup error with retry.

- [x] Make camera fallback actionable.
  - Workout fallback now explains camera state, supports retry, and offers manual counting for eligible modes.

- [x] Recheck app-store permission copy.
  - Updated camera, photo library, and optional location copy in app config and synced native iOS plist text.

### P2 - Product and UX Polish

- [x] Add onboarding before notification requests.
  - Notification permission is requested from onboarding/settings after the user opts in, not during root startup.

- [x] Add manual correction for rep counting.
  - Workout mode supports add/subtract controls, manual mode, and adjusted tracking metadata.

- [x] Improve completion sharing.
  - Added generic system proof-card sharing in addition to Instagram, without forcing a media-library save first.

- [x] Separate "completed a set" from "completed daily target."
  - Completion cards now use total completed reps for the day instead of multiplying completed sets by 20.

- [x] Add observability for local failures.
  - Local failures now use structured dev logs across startup, database migrations, notifications, camera/model readiness, workout save, and sharing paths.

- [x] Revisit notification tone controls.
  - Settings now include notification mode, lock-in tone, quiet-hours display, and maximum daily nudge caps.

## Suggested Next Implementation Order

1. Add `lib/dates.ts` and convert all streak/session/week calculations to local day keys.
2. Add a `typecheck` script plus a minimal unit-test setup for pure logic.
3. Fix nudge cancellation and notification counting.
4. Remove automatic location permission from completion.
5. Add versioned SQLite migrations.
6. Decide whether social is shipping now or later; either wire Supabase fully or gate the preview.

## Notes From This Audit

- `npx tsc --noEmit` passes.
- Existing `developmentplan.md` is useful as a growth roadmap. This file is the engineering worklist.
- Several previously modified app files now also include fixes from this pass.
