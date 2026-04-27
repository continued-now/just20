# OAuth and Account Linking Plan

## Goal

Let users start Just20 with almost no signup friction, keep streaks attached to a durable anonymous UUID, and later link that progress to Google OAuth, Sign in with Apple, or a laptop/web session when they choose.

The product principle is:

- Start now, no account required.
- Never lose streaks because the user skipped signup.
- Make account linking feel like a backup/boost, not a wall.
- Let users claim their stats across phone, laptop, and future devices.

## Identity Model

### Anonymous first

On first launch, create a local `device_user_id` UUID and store it in secure device storage.

Recommended storage:

- iOS: Keychain via `expo-secure-store`.
- Android: Encrypted shared preferences via `expo-secure-store`.
- Web/laptop later: secure HTTP-only session cookie plus local fallback identifier.

This ID owns all early app progress:

- Streaks
- Completion history
- XP
- Calibration preferences
- Notification preferences
- Invite/referral attribution
- Local camera/body-tracking settings

The user should not see an account screen before doing their first workout.

### Server user record

Create a backend `users` table where every user starts as anonymous.

Example fields:

```sql
users
- id uuid primary key
- anonymous_id text unique not null
- primary_auth_identity_id uuid null
- created_at timestamptz not null
- last_seen_at timestamptz not null
- display_name text null
- avatar_url text null
- account_state text not null -- anonymous, linked, deleted
```

The app's local `device_user_id` maps to `users.anonymous_id`.

### Auth identities

Each OAuth provider account should be stored separately from the user record so one user can link multiple sign-in methods later.

```sql
auth_identities
- id uuid primary key
- user_id uuid references users(id)
- provider text not null -- google, apple
- provider_subject text not null
- email text null
- email_verified boolean not null default false
- created_at timestamptz not null
- last_used_at timestamptz not null
- unique(provider, provider_subject)
```

Use the provider subject (`sub`) as the stable OAuth identifier. Do not use email as the primary key because emails can change or be hidden by Apple private relay.

## Signup Flow

### Phase 1: Zero-friction start

1. App launches.
2. If no local UUID exists, generate one.
3. Create or fetch anonymous server user in the background.
4. User can immediately start workouts.
5. Account linking is presented only after meaningful value moments.

Good moments to ask:

- After first completion.
- After a 3-day streak.
- Before switching phones.
- When opening a future web/laptop dashboard.
- When trying to share or join competitive/social features.

Suggested copy:

> Back up your streak so it survives new phones.

Avoid copy like:

> Create an account to continue.

### Phase 2: Link Google or Apple

When the user taps "Back up my streak":

1. Start OAuth flow with Google or Apple.
2. Backend validates the provider token.
3. Backend checks whether that provider identity already exists.
4. If it does not exist, attach provider identity to the current anonymous user.
5. If it exists, run the merge flow below.
6. Return a session token to the app.
7. Keep the same local UUID for continuity.

### Phase 3: Laptop/web claiming

For laptop/web access, support two low-friction paths:

- Sign in with Google or Apple on web.
- Scan a QR code from the phone to pair the laptop session.

Recommended QR flow:

1. Laptop shows a short-lived pairing code or QR.
2. Phone scans it while already tied to the local UUID/user.
3. Backend exchanges the pairing code for a web session linked to the same user.
4. Laptop can show stats, streaks, history, and share cards without forcing credentials if the user is already holding the phone.

This is useful for users who do not want to sign in but still want to view or export progress on a laptop.

## Merge Rules

Account linking can reveal two different user records:

- Current anonymous phone user.
- Existing OAuth-linked user.

Never silently discard progress. Use deterministic merge rules.

Recommended merge behavior:

- Completion history: union by workout date and completion timestamp.
- Streak: recompute from merged completion history, not from stored streak counters.
- XP: sum XP events, then dedupe by event id.
- Notification settings: prefer the current device settings.
- Calibration settings: keep per-device, not global.
- Display name/avatar: prefer OAuth profile only if user has not customized one.
- Referrals: preserve original attribution; do not overwrite invite source after first claim.

Use an append-only event log for important stats when possible.

```sql
user_events
- id uuid primary key
- user_id uuid references users(id)
- event_type text not null -- workout_completed, xp_awarded, streak_freeze_used
- event_key text null -- idempotency key
- occurred_at timestamptz not null
- payload jsonb not null default '{}'
- unique(user_id, event_key)
```

For a workout completion, the `event_key` could be:

```text
completion:{local_completion_id}
```

or:

```text
completion:{yyyy-mm-dd}:{source_device_id}
```

The key should prevent accidental duplicate XP/streak credit when offline events sync more than once.

## Session and Token Strategy

Mobile:

- Store session refresh token in secure storage.
- Keep anonymous UUID even after OAuth linking.
- Treat OAuth linking as attaching an identity, not replacing the app user.

Web/laptop:

- Use secure HTTP-only cookies.
- Use short-lived access tokens server-side where possible.
- Support session revocation from settings later.

Backend:

- Validate Google ID tokens against Google public keys.
- Validate Apple identity tokens against Apple public keys.
- Verify `aud`, `iss`, `exp`, and nonce.
- Store provider subject, not raw provider tokens.

## Apple Sign In Notes

Apple may only provide name on the first authorization. Save it if provided, but do not depend on receiving it later.

Apple may provide a private relay email. Treat it as contact metadata, not identity.

On iOS, if Google login is offered, Sign in with Apple should also be offered for App Store compliance.

## Google OAuth Notes

Use the minimum scope:

```text
openid email profile
```

Avoid requesting calendar, fitness, contacts, or drive scopes unless a future feature truly needs them.

## UX Placement

Recommended account prompts:

- Completion screen: "Back up today's streak"
- Streak screen: "Protect your streak"
- Settings: "Account and backup"
- Laptop/web landing page: "Continue with Google", "Continue with Apple", or "Pair with phone"

Avoid blocking:

- Onboarding
- First camera permission flow
- First workout
- First completion

Account linking should feel like saving progress, not paying a toll.

## Offline Behavior

The app should keep working offline.

Local-first requirements:

- Queue completion events locally.
- Queue XP events locally.
- Sync when network returns.
- Use idempotency keys for each queued event.
- Show "Backed up" or "Waiting to sync" status in settings.

If a user completes a workout offline before linking OAuth, those events still belong to the anonymous UUID and should merge once linked.

## Privacy and Safety

Only collect auth data needed for account recovery and sync.

Recommended stored fields:

- Provider
- Provider subject
- Verified email if available
- Display name/avatar if available

Avoid storing:

- Raw OAuth access tokens long-term
- Camera frames
- Body pose frames
- Location unless explicitly needed for share-card features

For deletion:

- Support deleting auth identity only.
- Support deleting the full account and all server-side stats.
- Keep local-only reset available from settings.

## Implementation Phases

### Phase 0: Prep

- Add local secure UUID creation.
- Add backend anonymous user creation.
- Add event IDs to completions and XP awards.
- Add sync status in settings.

### Phase 1: Anonymous cloud backup

- Sync streaks, completions, and XP to the backend by anonymous UUID.
- Add conflict-safe sync and event deduping.
- Keep app fully usable without OAuth.

### Phase 2: OAuth linking

- Add Google OAuth.
- Add Sign in with Apple.
- Link provider identities to existing anonymous users.
- Add merge logic for existing OAuth accounts.

### Phase 3: Laptop access

- Add web session support.
- Add Google/Apple login on web.
- Add phone-to-laptop QR pairing.
- Show read-only stats and share/export tools first.

### Phase 4: Account management

- Add linked providers screen.
- Add unlink provider.
- Add revoke sessions.
- Add delete account.
- Add export data.

## Open Decisions

- Backend provider: Supabase, Firebase Auth, Clerk, Auth0, or custom OAuth validation.
- Whether laptop mode is web-only or a desktop app later.
- Whether social features require OAuth or can remain anonymous.
- Whether XP/shop purchases require a linked account before purchase.

## Recommended Default

Use anonymous-first identity with a server-backed UUID, then add OAuth as optional backup.

For fastest integration later:

- Use Supabase Auth or Firebase Auth if speed matters most.
- Use custom OAuth validation if owning the identity layer is strategically important.
- Keep all product stats in Just20-owned tables either way, keyed by internal `users.id`.

The most important architectural rule is that streaks belong to the internal Just20 user, not directly to Google, Apple, email, or a single device.
