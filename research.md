# just20 UI/UX Audit and Virality Research

Date: 2026-04-27

Scope: React Native app UI/UX across onboarding, home, workout, completion/share, streak, squad, settings, bottom navigation, theme, and notification copy. Landing page consistency is considered only where it affects the app brand system.

## Sources Used

- Apple Human Interface Guidelines, Onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding
- Apple Human Interface Guidelines, Notifications: https://developer.apple.com/design/human-interface-guidelines/notifications/
- Apple Human Interface Guidelines, Privacy: https://developer.apple.com/design/human-interface-guidelines/privacy/
- Apple App Store User Privacy and Data Use: https://developer.apple.com/app-store/user-privacy-and-data-use/
- Android Accessibility, Touch target size: https://support.google.com/accessibility/android/answer/7101858
- Android Developers, Layouts and navigation patterns: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- Material Design, Onboarding: https://m1.material.io/growth-communications/onboarding.html
- Stanford Behavior Design Lab, Fogg Behavior Model: https://behaviordesign.stanford.edu/resources/fogg-behavior-model
- Nielsen Norman Group, 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- Duolingo Blog, Friend Streak: https://blog.duolingo.com/friend-streak/
- Duolingo Blog, Streak and habit research: https://blog.duolingo.com/how-duolingo-streak-builds-habit/
- Reforge, Growth Loops are the New Funnels: https://www.reforge.com/blog/growth-loops
- Reforge, Product-Led Growth: https://www.reforge.com/blog/product-led-growth

## Executive Summary

just20 already has several strong viral-app ingredients: a simple daily behavior, visual streak identity, social accountability, shareable completion cards, XP, rewards, and a memorable tone. The main product opportunity is not adding more mechanics. It is sequencing the mechanics better so a new user gets a fast win before the app asks for notifications, social sharing, location, or commitment.

The current UX sometimes feels like it is selling the streak system before the user has experienced the "20 pushups done" reward. Industry guidance points toward a tighter loop: first action, immediate celebration, contextual permission request, share/invite moment, and then daily reactivation. just20 should optimize for "time to first completed set" and "first share/invite after success" as much as visual polish.

## Highest-Leverage Improvement Areas

### 1. Shorten onboarding into a first-win path

Code signals:

- `app/onboarding.tsx:28` sets `TOTAL_STEPS = 5`.
- `app/onboarding.tsx:145` asks for a username before the first workout.
- `app/onboarding.tsx:177` teaches streak/freezes before the user has completed day one.
- `app/onboarding.tsx:218` explains schedule mechanics before the first pushup.
- `app/onboarding.tsx:258` asks for notification permission as the final onboarding action.

Research tie-in:

- Apple recommends onboarding that is fast, fun, optional, and preferably interactive.
- Material recommends driving first-session actions that increase engagement and retention, and its Quickstart model prioritizes the first key action.
- Fogg's model says behavior happens when motivation, ability, and a prompt converge. New users have motivation, but ability is fragile; every extra screen reduces ability.

Recommendation:

- Move to a 2-step onboarding: value promise -> set default time or "start now".
- Make username optional after first completion, not before.
- Show streak/freezes only after the first workout or as lightweight contextual tips.
- Ask for notification permission after the user selects a reminder time or completes the first set.
- Main activation metric: median time from first open to first saved workout.

Priority: P1

### 2. Make the home screen a single next-best-action surface

Code signals:

- `app/(tabs)/index.tsx:73` computes detailed status text across reminder modes.
- `app/(tabs)/index.tsx:136` shows a countdown "DO IT NOW" banner.
- `app/(tabs)/index.tsx:172` also shows a bottom "DO IT NOW" CTA.
- `app/(tabs)/index.tsx:148` shows social proof as a small text strip.

Research tie-in:

- Nielsen Norman's aesthetic/minimalist heuristic says every extra unit of information competes with the relevant information.
- Android's navigation guidance recommends one highest-importance action at a time for prominent action controls.

Recommendation:

- Collapse home into one primary state: "Do today's 20", "Window open", "Done today", or "Streak at risk".
- Use either the countdown banner or bottom CTA as primary, not both.
- Turn the social strip into a stronger card only when it changes behavior: friend did it, friend is waiting, or invite unlocks a streak.
- Hide implementation language like "fallback nudges" from the home headline; reserve it for settings.

Priority: P1

### 3. Build the viral loop around the completion moment

Code signals:

- `app/completion.tsx:125` share copy is generic and only includes an invite code.
- `app/completion.tsx:130` Instagram sharing saves the image and opens Instagram, but does not provide a deep link or referral URL.
- `app/completion.tsx:219` reveals share actions after a fixed 2-second delay.
- `app/completion.tsx:259` only shows the invite banner on the first total session.
- `lib/user.ts:38` builds share text without a URL/deep link.

Research tie-in:

- Reforge's growth-loop framework emphasizes closed loops where one user's success produces the input for another user.
- Duolingo reports that friend streaks are a powerful social commitment mechanic, and shared streak users are more likely to complete daily lessons.
- Product-led growth works best when the product itself acquires, activates, engages, and retains users through the user experience.

Recommendation:

- Add a real referral/deep link, not only a manual code.
- Generate share copy based on context: first set, personal best, day 7, friend challenge, strict-window win.
- Make the share card look like a collectible receipt: day number, time, XP, "catch me" challenge, link/code.
- Add one-tap "challenge a friend to 20" after every meaningful success, not only first session.
- Track: share-sheet opened, share completed if available, referral link opened, referral activation, buddy streak started.

Priority: P1

### 4. Replace simulated social proof with honest product states

Code signals:

- `app/(tabs)/squad.tsx:46` seeds static mock leaderboard entries.
- `app/(tabs)/squad.tsx:189` says buddy streaks are 22% more likely to survive the week.
- `app/(tabs)/squad.tsx:200` displays a "Weekly Leaderboard" preview before real global rankings exist.
- `app/(tabs)/squad.tsx:223` shows "Top X% of all Just20 users" from a deterministic simulated rank.

Research tie-in:

- Social commitment is powerful, but fake precision can damage trust.
- Duolingo's 22% friend-streak claim is specific to Duolingo learners and daily lessons; just20 should not present it as just20 data until measured.
- Nielsen Norman's consistency and trust heuristics support keeping system status and claims clear.

Recommendation:

- Label mock ranking as "preview" in dev builds only, or remove it from production UI.
- Replace the 22% line with "Buddy streaks turn this into a shared promise" until just20 has real data.
- Prioritize real buddy status over global rankings: "Jake finished today", "2 buddies pending", "nudge friend".
- Create a future experiment for friend streak uplift and only add a percentage after internal measurement.

Priority: P1

### 5. Make notifications motivational, controllable, and less risky

Code signals:

- `lib/notifications.ts:28` defines escalating notification tiers.
- `lib/notifications.ts:56` uses harsh copy like disappointment/shame.
- `lib/notifications.ts:206` schedules "streak at risk" messages.
- `app/onboarding.tsx:258` frames permission as "We will keep you honest."
- `app/(tabs)/settings.tsx:127` exposes notification style selection with edgy labels.

Research tie-in:

- Apple recommends concise, valuable notifications and warns against repeated notifications for the same thing.
- Apple privacy guidance emphasizes consent, control, and requesting access when value is clear.
- Fogg's prompt must match the user's context. Too many or too harsh prompts can reduce motivation and lead to opt-outs.

Recommendation:

- Keep the edgy brand, but make intensity user-selectable: Chill, Coach, Menace.
- Add a hard daily cap and quiet hours in UI.
- Use reminder actions where possible: "Start 20", "Snooze 15m", "Skip today".
- Move aggressive copy to an opt-in mode, not the default.
- Add a "why we ask" pre-permission screen after first value.

Priority: P1

### 6. Simplify Streak Center into one daily quest plus one long-term carrot

Code signals:

- `app/(tabs)/streak.tsx:172` starts a rich Streak Center.
- `app/(tabs)/streak.tsx:221` shows status cards for at-risk, freeze bank, and chest.
- `app/(tabs)/streak.tsx:250` includes perfect week.
- `app/(tabs)/streak.tsx:295` includes next milestone and XP reward rules.
- `app/(tabs)/streak.tsx:325` includes league identity.
- `app/(tabs)/streak.tsx:357` includes stats.
- `app/(tabs)/streak.tsx:364` includes receipts/heatmap.
- `app/(tabs)/streak.tsx:395` includes a warning card.

Research tie-in:

- Duolingo's streak system works because it keeps the daily commitment simple while layering flexibility, celebration, and social status.
- Nielsen Norman's recognition-over-recall and minimalist-design heuristics suggest reducing simultaneous concepts.

Recommendation:

- Above the fold, show only: current streak, today's state, one CTA, one next reward.
- Move league identity, heatmap, XP rules, and stats into expandable sections or a "More progress" page.
- Turn "Perfect Week" into the daily quest card when relevant.
- Add stronger celebrations at day 3, 7, 14, 30, 100 with contextual share prompts.
- Make freeze mechanics reassuring, not purely punitive.

Priority: P2

### 7. Treat workout/camera calibration as trust-building UX

Code signals:

- `app/workout.tsx:931` requests camera permission from the workout screen.
- `app/workout.tsx:957` shows calibration when the body is not in frame or when requested.
- `app/workout.tsx:990` uses the camera tap layer for secondary tracking.
- `app/workout.tsx:1015` displays phase, confidence, and elbow angle.
- `app/workout.tsx:1039` always exposes a calibration button before start.
- `app/workout.tsx:1050` shows secondary tracking only after tapping another body.

Research tie-in:

- Camera-based tracking is a high-trust interaction. Users need system status, plain-language recovery, and control.
- Nielsen Norman's visibility of system status and error-recovery heuristics are directly relevant here.

Recommendation:

- Add a preflight checklist: camera visible, whole body in frame, hands/shoulders detected, enough light.
- Convert confidence/angle debug text into a friendly "tracking quality" meter for normal users.
- Keep advanced diagnostics behind a dev/debug toggle.
- Show "Tap another person to track them too" only as a small contextual hint when multiple bodies are likely, not as a persistent option.
- Add a non-camera/manual fallback path so users can still complete the daily habit when tracking fails.

Priority: P2

### 8. Tighten accessibility, touch targets, and semantics

Code signals:

- `components/BottomTabBar.tsx:48` uses `TouchableOpacity` without accessibility role/state labels.
- `app/(tabs)/streak.tsx:261` has small day-ring press targets.
- Many buttons rely on color/emojis and custom typography without explicit accessibility labels.
- `constants/theme.ts:16` defines font sizes but not a minimum touch target or accessibility token.

Research tie-in:

- Android recommends interactive targets of at least 48x48dp, with enough spacing.
- Nielsen Norman highlights visibility of status, consistency, recognition, and clear exits as basic usability.

Recommendation:

- Add accessibility roles, labels, hints, and selected state to bottom tabs and major CTAs.
- Create a `touchTarget` token of at least 48 and apply it to icon buttons, tab items, day rings, and inline links.
- Ensure copy does not rely only on emoji or color to convey state.
- Add reduced-motion handling for looping streak animations.

Priority: P2

### 9. Unify the visual system between app and landing page

Code signals:

- `constants/theme.ts:1` defines a small palette but no semantic depth for reward, danger, quest, social, or premium.
- App screens mostly use heavy font weights with default system fonts.
- `app/completion.tsx:26` uses a separate black share-card visual language.
- `app/workout.tsx:1139` uses another high-contrast camera overlay language.

Research tie-in:

- Apple and Android both emphasize consistency and platform conventions.
- Material onboarding guidance calls for visual continuity across characters, environments, typography, and buttons.

Recommendation:

- Expand theme tokens: surface, surfaceRaised, textMuted, actionPrimary, danger, reward, social, quest, xp, coin, focus.
- Define type roles: display, headline, title, body, caption, button.
- Preserve expressive brand tone, but make screens feel like one product family.
- Add shared components for card, pill, CTA, empty state, and reward banner.

Priority: P2

### 10. Turn settings into defaults plus advanced control

Code signals:

- `app/(tabs)/settings.tsx:127` exposes three notification style cards immediately.
- `app/(tabs)/settings.tsx:187` has a separate daily reminders switch.
- `app/(tabs)/settings.tsx:216` has reschedule controls.
- `app/(tabs)/settings.tsx:222` has a destructive clear-all control near normal settings.

Research tie-in:

- Apple recommends reasonable defaults and postponing nonessential setup.
- Nielsen Norman's user-control heuristic supports clear exits, but minimalist design says advanced controls should not compete with primary tasks.

Recommendation:

- Default to "Set a time + fallback nudges."
- Show only time, notifications on/off, and tone by default.
- Move random/strict modes, clear-all, and reschedule debugging into "Advanced reminders."
- Make "No excuses" feel like a power-user challenge with explicit XP upside and clear recovery rules.

Priority: P3

## Suggested Implementation Order

1. Activation rewrite: shorten onboarding, defer username/social, ask notification permission in context, route to first workout faster.
2. Home rewrite: one primary action, one status, one social nudge, no duplicated CTAs.
3. Share/referral loop: deep link/referral URL, contextual share copy, recurring friend-challenge moments.
4. Squad trust cleanup: remove fake rankings/claims from production and focus on real buddy states.
5. Notification tone/settings: intensity selector, cap, quiet hours, safer default copy.
6. Streak Center simplification: daily quest above the fold, progressive disclosure below.
7. Workout calibration UX: preflight checklist, friendly quality meter, manual fallback.
8. Accessibility pass: touch target token, roles/states/hints, reduced motion.
9. Theme system pass: shared components and semantic tokens.

## Metrics To Add Before Heavy Iteration

- Activation: first open -> first workout started, first open -> first workout completed.
- Permission: notification pre-prompt shown, permission accepted, permission denied.
- Workout trust: camera permission accepted, model loaded, calibration success, manual adjustment count, abandonment during workout.
- Retention: day 1, day 3, day 7 completion; streak at risk recovery.
- Virality: share opened, share completed, invite code copied, referral link opened, buddy linked, buddy streak day 1.
- Notification health: scheduled, delivered if available, tapped, snoozed, disabled.

## Product Principle

The best version of just20 should feel like this loop:

Open -> do 20 -> feel proud -> show receipt -> pull in a friend -> return tomorrow.

Every screen should either make that loop easier, make it more rewarding, or make it more shareable. Anything else should be delayed, hidden, or removed.
