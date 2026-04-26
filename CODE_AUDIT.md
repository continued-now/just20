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

- [ ] Add a test setup.
  - There is no test script. Add Jest or Vitest for pure logic and keep React Native UI tests separate.
  - First targets: `lib/poseDetection.ts`, `lib/milestones.ts`, date helpers, streak repair eligibility, freeze consumption, and chest availability.

- [ ] Add linting and formatting.
  - Add ESLint and Prettier scripts so basic style and hook dependency issues are caught consistently.
  - `typecheck` is now available; add `lint` and `test`.

- [ ] Make database migrations versioned.
  - Current migrations are `ALTER TABLE` calls inside try/catch. That works early, but it becomes hard to audit as schema changes grow.
  - Add a `schema_meta` table with a version number and named migration functions.

- [ ] Validate and sanitize user-facing inputs.
  - Username and invite codes should have explicit length, character, and profanity/abuse constraints before social features are real.
  - Make invite-code parsing accept pasted text with spaces or dashes, but store one normalized form.

- [ ] Add loading and error states for startup.
  - Root initialization can fail silently. The app should show a recoverable error state if SQLite, notification setup, or user-profile creation fails.

- [ ] Make camera fallback actionable.
  - If no front camera is available, the workout screen shows a dark fallback but still leaves the user without a clear fix.
  - Show "No front camera found" and offer a manual entry or retry path.

- [ ] Recheck app-store permission copy.
  - The app needs clear `Info.plist` and Android permission rationales for camera, notifications, media library, and any optional location use.

### P2 - Product and UX Polish

- [ ] Add onboarding before notification requests.
  - The app asks for notification permission during root init. Explain the value first, then request permission at the moment the user opts in.

- [ ] Add manual correction for rep counting.
  - Camera-based counting will be imperfect. Let users add or subtract a rep before saving, and log that the set was manually adjusted.

- [ ] Improve completion sharing.
  - Add a generic system share path in addition to Instagram.
  - Consider saving to media only after the user chooses a destination.

- [ ] Separate "completed a set" from "completed daily target."
  - The code treats 20 reps as the daily target and displays extra sets as `setsToday * 20`. If users do 21 or 25 reps, the share card can under-report.
  - Store total reps by day and completed sets separately.

- [ ] Add observability for local failures.
  - At minimum, add structured console logs in dev for database, notification, camera model, and sharing failures. Later, add crash/error reporting.

- [ ] Revisit notification tone controls.
  - The aggressive tone is the product hook, but users should have a setting for intensity, quiet hours, and maximum daily nudges.

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
