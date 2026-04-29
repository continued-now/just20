# Just 20 UX Improvement Audit

Date: April 28, 2026

Scope: App UX, landing page UX, and cross-flow product clarity based on the current codebase. This is a design/product audit, not a bug report. No changes were made to the app in this pass.

## Executive Summary

Just 20 already has a strong core loop: daily pushups, camera-counted reps, XP, streak pressure, badges, and social sharing. The biggest UX opportunity is not adding more mechanics. It is making the primary loop feel calmer, more obvious, and more rewarding in the exact moments where the user is deciding whether to continue.

The highest-impact improvements are:

1. Make workout readiness unmistakable before the user starts.
2. Reduce completion-screen decision overload after the reward moment.
3. Turn Streaks into the obvious home for badges, progress, and Test Me.
4. Simplify Squad so the best viral action is obvious.
5. Make XP and notification modes easier to understand without reading a paragraph.

The current product direction is good. The UX risk is that Just 20 may feel feature-rich before it feels effortless. For a viral habit app, the first daily win should feel almost impossible to mess up.

## Priority Table

| Priority | Area | Current friction | Recommended fix | Effort |
| --- | --- | --- | --- | --- |
| P0 | Workout camera | Users can get stuck in "Waiting for camera..." or tracking uncertainty without a clear rescue path. | Add a visible readiness checklist and camera recovery actions. | Medium |
| P0 | Workout tracking | Technical pose readouts are useful for debugging but can make normal users question reliability. | Convert readouts into friendly confidence states; move angles/confidence behind dev/debug mode. | Low |
| P1 | Completion | Too many actions compete after finishing: location, Instagram, another set, invite, skip, badge popups. | Use one primary action at a time and group secondary actions. | Medium |
| P1 | Streaks/Badges | Badges are available, but still feel like a separate case rather than part of the main streak habit. | Make Streaks a hub with Streak and Badges segments. | Medium |
| P1 | Squad | Squad mixes friend streaks, rooms, duels, wrapped, pets, invite codes, buddies, and leaderboard. | Reorder into one primary viral CTA plus progressive sections. | Medium |
| P1 | Test Me | Monthly Test is meaningful but buried inside Squad. | Surface it on Home and Streaks when available, with cooldown context. | Low |
| P2 | Settings | Notification modes are fun but require too much interpretation. | Rename modes around user intent and add a clear "Recommended" badge. | Low |
| P2 | Home | Daily status copy can be ambiguous when reminders are off or the scheduled window is not active. | Add a compact "Today plan" card with time, reward, and next action. | Low |
| P2 | Manual rep adjustment | Always-visible "+ rep / - rep" may reduce trust in camera counting. | Hide under "Fix count" or show only after tracking confidence drops. | Low |
| P2 | Badges | Rarity says "Soon", which can feel unfinished. | Replace with "Rarity coming after launch" or "Early badge". | Low |
| P2 | Landing | Hero is playful, but some headings can still feel dense at larger sizes. | Use slightly looser heading line-height and tighter max-width per section. | Low |

## Detailed Recommendations

### 1. Workout Readiness Should Feel Like A Green Light

Observed in: `app/workout.tsx`

The workout screen has many good states already: permission handling, camera fallback, calibration, model loading, frame timeout messaging, and body-in-frame quality. The UX issue is that these states are scattered across button labels, notes, and calibration cards. If the camera is not ready, the user may not know whether to wait, move, restart the emulator, recalibrate, or leave.

Recommended implementation:

- Add a pre-start readiness card above the Start button with 3 or 4 rows: Camera on, Body visible, Tracking ready, Window active.
- Each row should show a simple state: checking, ready, needs help.
- When a row needs help, show one direct action: Allow camera, Recalibrate, Retry camera, Switch camera, or Emulator webcam setup.
- Keep the Start button disabled until the readiness card is green, but make the reason visually obvious.

Why this matters:

- This follows visibility of system status and error recovery heuristics.
- It protects the most important promise in the app: "the camera can see me and this will count."
- It lowers frustration during emulator and real-device testing.

Good copy direction:

- "Camera is warming up..."
- "Step back until shoulders, hips, and hands are visible."
- "Tracking looks clean. Start when ready."
- "No frames coming in. Restart the Android emulator with webcam enabled."

Alternative:

- Keep the current layout, but replace the single note with a compact "Need help?" panel that appears after 4 seconds of no frames or poor tracking.

### 2. Make Tracking Feedback Friendly, Not Diagnostic

Observed in: `app/workout.tsx`

The live readout currently exposes phase, confidence percentage, and elbow angle. This is useful for us, but normal users may interpret "72%" or "74 degrees" as a failure state. For a fitness consumer app, the user should see confidence, not machinery.

Recommended implementation:

- Default UI should show friendly states: "Tracking clean", "Move closer", "Show hands and shoulders", "Great depth", "One more clean rep."
- Put raw confidence, phase, FPS, inference timing, and elbow angle behind a developer/debug flag.
- Keep the skeleton overlay because it builds trust, but avoid making users read pose metrics while exercising.

Why this matters:

- Most users do not want to debug a model. They want to feel seen.
- Friendly feedback keeps the body-tracking feature premium instead of fragile.

Alternative:

- Keep the current readout in Test Me only, where stricter judging is part of the product promise.

### 3. Completion Needs A Clear Reward Hierarchy

Observed in: `app/completion.tsx`

The completion screen is exciting, but it currently asks the user to process many things immediately: proof card, PB, XP, badge unlocks, location, Instagram, another set, invite/challenge, and skip. This can dilute the reward moment.

Recommended implementation:

- Stage the flow into three beats: celebrate, share, continue.
- First 1 to 2 seconds: proof card and XP/badge animation only.
- Then show one primary CTA: "Share proof card" or "Post to Instagram."
- Put "Do another set", "Add location", and "Invite friend" into secondary chips or a bottom sheet.
- Rename "skip" to "Done for today" so it does not feel like dismissing the reward.

Why this matters:

- Habit apps work best when reward feedback is immediate and decision-light.
- Viral sharing gets stronger when the share action is the obvious next step, not one option among five.

Alternative:

- Keep all actions but visually group them: Share actions, Workout actions, Social actions.

### 4. Streaks Should Become The Progress Hub

Observed in: `app/(tabs)/streak.tsx`, `app/badges.tsx`, `app/(tabs)/profile.tsx`, `components/BottomTabBar.tsx`

The bottom nav now has Streaks, which is the right direction. The next UX step is making Streaks the obvious home for all long-term progress. Right now, Badges are accessible through a pill and Profile quick action, but the mental model is still a little split.

Recommended implementation:

- Add a top segmented control inside Streaks: "Streak" and "Badges."
- Keep Badges as a full screen internally, but present it as a tab within the Streaks hub.
- Add a small "new" dot or count when badges unlock.
- Keep Profile focused on identity, settings, and account details, not primary progress discovery.

Why this matters:

- Streaks and badges are both progress identity systems. They should reinforce each other.
- This reduces navigation ambiguity and makes badge collecting feel central.

Alternative:

- Add a "Badge case" card near the top of Streaks with next badge, unlocked count, and a "View all" action.

### 5. Squad Needs One Obvious Viral Action

Observed in: `app/(tabs)/squad.tsx`

Squad has a lot of strong concepts: friend streaks, async duel, weekly wrapped, monthly test, streak pet, rooms, invite code, add buddy, buddy list, leaderboard, and rank preview. The risk is Hick's Law: more choices can slow action.

Recommended implementation:

- Make the top of Squad only about one primary action: "Start a 7-day challenge."
- Below that, show two secondary cards: "Duel a friend" and "Share weekly receipt."
- Move Squad Room, Add Buddy, Leaderboard, and Rank Preview into clearly labeled sections lower on the page.
- Use progressive disclosure for backend-preview features with labels like "Preview" or "Coming with live sync."

Why this matters:

- Viral products need a simple default share action.
- Users should not have to decide what kind of social loop they are in on first visit.

Alternative:

- Keep the current cards but reorder them by lifecycle: Invite, Compete, Celebrate, Manage.

### 6. Monthly Test Should Not Be Buried

Observed in: `app/(tabs)/squad.tsx`, `app/workout.tsx`

Monthly Test is a strong retention mechanic. It turns body tracking into a progress ritual and creates a share-worthy receipt. Right now it lives inside Squad, which makes it feel social instead of personal progression.

Recommended implementation:

- Show "Test Me" on Home when available, below the daily CTA or after completion.
- Show it in Streaks as a progress card: "Monthly benchmark available" or "Next test in 12 days."
- If the test counts toward daily completion when the user does 20 or more reps, state that clearly.
- If it does not count, state that before start.

Why this matters:

- A 30-day benchmark is a retention anchor.
- It also provides proof of progress beyond streak count.

Alternative:

- Keep Test Me in Squad but add a Streaks card that deep-links into the Squad module.

### 7. Notification Modes Need User-Intent Labels

Observed in: `app/(tabs)/settings.tsx`, `app/onboarding.tsx`

The current modes are memorable: Set a time, No excuses, Get annoyed. The descriptions explain the behavior, but users may still need to read carefully to understand XP and reminder consequences.

Recommended implementation:

- Make the default mode visually marked as "Recommended."
- Rename or subtitle modes around intent:
- "Set time + backup nudges" for default.
- "Set time only" for strict.
- "Random nudges" for flexible.
- Keep the playful names as smaller subtitles if desired.
- Add a small XP preview row on each card: "On time: +18 XP", "Late after nudges: lower XP", "Strict miss: +5 XP."

Why this matters:

- Good settings UX reduces interpretation.
- Users should understand the bargain before notification permission is involved.

Alternative:

- Keep names unchanged but add a comparison table at the top of settings.

### 8. Home Could Show A Clearer "Today Plan"

Observed in: `app/(tabs)/index.tsx`

Home is visually clean and mascot-forward. The status line changes based on completion, nudges, strict mode, scheduled fallback, and countdown. It works, but it can compress too much logic into one sentence.

Recommended implementation:

- Add a small "Today plan" card with three fields: Time window, Reward, Next action.
- Example: "8am window", "+18 XP on time", "Fallback nudges after 8:10am."
- When reminders are off, show: "No reminders set" plus "Turn on" CTA.
- Keep the big DO IT NOW CTA as the primary action.

Why this matters:

- Users should always understand today's contract.
- The app is built around commitment mechanics, so the contract should be visible.

Alternative:

- Add a "Why this XP?" tooltip on Home and Completion only.

### 9. Manual Rep Controls Should Preserve Trust

Observed in: `app/workout.tsx`

The visible "- rep" and "+ rep" buttons are practical, especially while tracking is still improving. But if they are always visible during the workout, they can imply the camera counter is expected to be wrong.

Recommended implementation:

- Replace the two buttons with one smaller "Fix count" chip.
- Tapping it expands "-1" and "+1" controls.
- Auto-show it only if tracking confidence drops, the user pauses, or the model has not counted for several seconds.
- Keep manual adjustment disclosure on completion, but make it human: "Count fixed manually."

Why this matters:

- Trust is essential for body tracking.
- Manual recovery should feel like a safety net, not the primary workflow.

Alternative:

- Hide manual controls behind a long press on the rep counter.

### 10. Badge Rarity Should Avoid Placeholder Language

Observed in: `app/badges.tsx`

The badge modal currently shows "Soon" for rarity. Because badges are a delight system, placeholder wording can make the badge case feel unfinished.

Recommended implementation:

- Replace "Soon" with "Early badge" before backend rarity exists.
- Or show "Rarity unlocks after launch" as the value, not just body text.
- For hidden badges, show clearer progress language when possible: "Secret, but not random. Keep streaking."

Why this matters:

- Badges should feel collectible and intentional from day one.
- "Soon" can feel like a missing feature rather than a planned rollout.

Alternative:

- Hide the rarity stat entirely until backend user counts exist.

### 11. Stats Should Be Either Integrated Or Discoverable

Observed in: `app/(tabs)/stats.tsx`, `app/(tabs)/_layout.tsx`

There is a Stats screen, but it is hidden from the tab bar. Some of its content overlaps with Streaks. This is not necessarily wrong, but it creates a product question: is Stats a future screen or legacy surface?

Recommended implementation:

- Fold useful stats into Streaks, especially speed trend, monthly test progress, best time, and consistency.
- If a separate Stats screen remains, link to it from Streaks and Profile with a clear "Analytics" label.
- Avoid duplicating basic streak cards in multiple places unless each screen has a distinct purpose.

Why this matters:

- Duplication can make the product feel less cohesive.
- Analytics are valuable, but they should support the streak story.

Alternative:

- Keep Stats hidden until speed analytics and monthly test trends are richer.

### 12. Landing Page Can Be More Scannable Without Losing Playfulness

Observed in: `landing/index.html`, `landing/styles.css`

The landing page has a strong playful direction. Some headings still carry a lot of visual weight, especially with large type, tight line-height, and compact letter spacing. The page is charming, but a few sections could breathe more.

Recommended implementation:

- Increase heading line-height slightly from roughly `0.96` to `1.02` on larger headings.
- Cap hero heading measure a bit tighter, around 9 to 11 words per line depending on viewport.
- Give section headings a little more vertical separation from body text.
- Keep Fredoka/Nunito style, but use the rounder face for short expressive words and the cleaner face for longer sentence headings.

Why this matters:

- Playful typography still needs readability.
- A viral landing page should be skimmed in seconds.

Alternative:

- Keep typography unchanged, but shorten the longest h2 copy and rely on subheads for nuance.

## Recommended Rollout

### Phase 1: Smooth The Core Loop

- Add workout readiness checklist and recovery actions.
- Replace technical tracking readout with friendly states.
- Hide manual rep controls behind "Fix count."
- Simplify completion action hierarchy.

This phase protects activation and trust.

### Phase 2: Clarify Progress And Rewards

- Make Streaks a progress hub with badges integrated.
- Surface Monthly Test on Home and Streaks.
- Improve badge rarity copy.
- Integrate useful Stats into Streaks or add a visible Analytics link.

This phase strengthens retention.

### Phase 3: Sharpen Viral Sharing

- Simplify Squad around one primary invite action.
- Make proof-card sharing the obvious completion CTA.
- Add share previews for badges, weekly wrapped, and monthly test.
- Tighten landing page heading rhythm and scan path.

This phase improves distribution.

## Product Questions To Decide Later

No blocking questions for this audit. These are the decisions I would clarify before implementation:

- Should a Monthly Test with 20 or more clean reps count as the daily completion?
- Should manual counting become an explicit accessibility/fallback mode, or remain a hidden correction tool?
- Should Badges remain inside Streaks, or eventually become a dedicated bottom-nav item if collecting becomes central?
- Should strict "No excuses" mode be opt-in only after a user has completed at least one day, to avoid early churn?
- Should social features with simulated/local behavior be labeled as previews until backend sync is live?

## My Recommendation

Start with Phase 1. The best version of Just 20 is not the app with the most mechanics. It is the app where a user can open the camera, understand instantly that tracking is working, finish 20, and get a reward moment that feels worth sharing.

After that, make Streaks the main progress hub and make Squad less busy. That should make the app feel more premium, more trustworthy, and more viral without weakening the playful personality.
