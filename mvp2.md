# MVP2: Multi-Workout Expansion

Date: 2026-04-27

## Executive Summary

MVP2 expands Just20 from a pushup-only daily habit into a small, focused movement platform while preserving the core identity: one simple daily challenge, verified when possible, streaked over time, and shareable after completion.

The initial expansion should add two workout types: squats and pullups. These are simple, recognizable, and fit the no-gym or minimal-equipment ethos. Pushups remain the default. Squats become the lower-friction alternative, while pullups become the high-difficulty/high-XP option.

The product should not become a generic fitness library. MVP2 should feel like "choose today's 20" rather than "browse workouts." The user picks one daily movement, completes the required reps, earns XP based on difficulty, and keeps the same streak system alive.

## MVP2 Goals

- Let users select pushups, squats, or pullups for the daily challenge.
- Keep one unified daily streak across workout types.
- Add workout-specific XP so harder movements feel more rewarding.
- Support optional profile calibration for sex: male, female, prefer not to say.
- Use sex only for fairer XP/difficulty balancing, never for exclusion or judgment.
- Keep the app fast: open -> choose movement -> complete -> share receipt.
- Prepare the model for future non-camera activities like "Just20 Run."

## Non-Goals

- Do not add a full workout library.
- Do not add complex training plans in MVP2.
- Do not split the app into male/female experiences.
- Do not require users to disclose sex.
- Do not require camera tracking for every workout.
- Do not change the brand into a general fitness tracker.

## Core Product Model

### Daily Challenge

Each day, the user completes one qualifying challenge:

| Workout | Default target | Tracking style | Relative difficulty | MVP2 role |
|---|---:|---|---|---|
| Pushups | 20 reps | Camera-assisted + manual fallback | Medium-high | Default Just20 action |
| Squats | 20 reps | Camera-assisted if available + manual fallback | Medium | Easier daily alternative |
| Pullups | 5-10 reps | Manual MVP first, camera later | High | High-XP challenge option |

The daily streak should count if the user completes any qualifying daily challenge. This keeps the habit flexible while preserving the "show up daily" promise.

### Workout Selection

Recommended UX:

1. Home shows one primary CTA: "Do today's 20."
2. Tapping opens a lightweight workout picker.
3. Default selected workout is the user's last completed movement or pushups for new users.
4. Picker shows three cards: Pushups, Squats, Pullups.
5. Each card shows target reps, estimated XP, and tracking method.
6. The user starts immediately.

Workout picker copy:

- Pushups: "The classic. 20 reps. Camera verified."
- Squats: "Leg day. 20 reps. Lower friction, solid XP."
- Pullups: "Hard mode. Fewer reps, bigger XP."

## Sex-Based Calibration

### Profile Options

Users can choose:

- Male
- Female
- Prefer not to say

This should be optional and editable in settings. The app should explain why it asks:

"We use this only to tune difficulty and XP so different movements feel fair. You can skip it."

### Product Principle

Sex should never reduce the user's dignity, visibility, streak eligibility, or ability to compete. It should only adjust expected difficulty. The user should also be able to override difficulty with a manual calibration setting later.

### XP Balancing Rationale

The user suggestion is directionally right: pushups and pullups can be meaningfully harder for many female users on average because upper-body strength norms differ across populations. But individual fitness varies a lot. A fair product should use sex as a light starting calibration, not a hard rule.

Recommended MVP2 approach:

- Store sex as optional profile metadata.
- Use it only in XP calculations and default target suggestions.
- Let "prefer not to say" use neutral XP values.
- Later, replace or refine sex-based defaults with performance-based calibration.

## XP System Proposal

### Base XP By Workout

| Workout | Base XP | Why |
|---|---:|---|
| Squats | 14 XP | Accessible, lower technical barrier, still meaningful. |
| Pushups | 18 XP | Core Just20 challenge and medium-high effort. |
| Pullups | 32 XP | Higher strength requirement and equipment dependency. |

### Sex Calibration Multiplier

| Profile selection | Pushups | Squats | Pullups | Notes |
|---|---:|---:|---:|---|
| Male | 0.92x | 1.00x | 0.95x | Slightly lower upper-body XP bonus because baseline difficulty may be lower on average. |
| Female | 1.08x | 1.00x | 1.12x | Slightly higher upper-body XP bonus because baseline difficulty may be higher on average. |
| Prefer not to say | 1.00x | 1.00x | 1.00x | Neutral default. |

Important: keep the multiplier small. A giant sex-based difference will feel unfair, reductive, and easy to game. A 5-12% adjustment is enough to communicate fairness without letting profile choice dominate the XP economy.

### Example XP Outcomes

| Workout | Male | Female | Prefer not to say |
|---|---:|---:|---:|
| Squats | 14 XP | 14 XP | 14 XP |
| Pushups | 17 XP | 19 XP | 18 XP |
| Pullups | 30 XP | 36 XP | 32 XP |

Rounded XP should use whole numbers.

### Other XP Modifiers

MVP2 should keep existing timing/nudge modifiers:

- Strict scheduled window: bonus XP.
- Default window: normal XP.
- Completion after nudges: reduced XP.
- Manual-only completion: slight reduction if fraud prevention matters later.
- Personal best or milestone day: bonus XP.

Suggested formula:

```text
xp = round(baseWorkoutXp * sexMultiplier * timingMultiplier * trackingMultiplier) + milestoneBonus
```

Suggested timing multipliers:

| Completion context | Multiplier |
|---|---:|
| Strict no-excuses window | 1.20x |
| Default set-time window | 1.00x |
| After 1-3 nudges | 0.90x |
| After 4-10 nudges | 0.75x |
| After 11+ nudges | 0.60x |

Suggested tracking multipliers:

| Tracking method | Multiplier |
|---|---:|
| Camera verified | 1.00x |
| Manual count | 0.85x |
| Trusted manual streak save | 0.75x |

## Data Model Additions

### User Profile

Add:

```ts
type Sex = 'male' | 'female' | 'prefer_not_to_say';

type UserProfile = {
  sex?: Sex;
  difficultyCalibration?: 'default' | 'easier' | 'harder';
};
```

Recommended storage behavior:

- Default to undefined until user chooses.
- Treat undefined the same as prefer_not_to_say in XP logic.
- Show a gentle prompt after the user completes several workouts, not during first-run onboarding.

### Workout Type

Add:

```ts
type WorkoutType = 'pushups' | 'squats' | 'pullups';
```

Session records should include:

```ts
type WorkoutSession = {
  id: string;
  workoutType: WorkoutType;
  targetReps: number;
  completedReps: number;
  trackingMethod: 'camera' | 'manual' | 'trusted_manual';
  xpEarned: number;
  sexMultiplierApplied?: number;
  completedAt: string;
};
```

### Streak Logic

Daily streak should be movement-agnostic:

- Completing pushups, squats, or pullups counts for the same daily streak.
- Streak detail view should show the movement completed that day.
- Share card should include movement type: "Day 12: 20 pushups" or "Day 12: 8 pullups."

## UI/UX Changes

### Home

Home should still center the streak and daily action.

Recommended states:

- No workout complete: "Choose today's 20."
- Default selected movement known: "Pushups today?"
- Window active: "Your pushup window is open."
- Completed: "Day locked: 20 squats."

### Workout Picker

Card layout:

| Card element | Details |
|---|---|
| Movement name | Pushups, Squats, Pullups |
| Target | 20 reps, 20 reps, 5-10 reps |
| XP | Estimated XP after profile and timing modifiers |
| Tracking | Camera, camera/manual, manual MVP |
| Difficulty | Classic, steady, hard mode |

Keep this picker extremely fast. No browsing, filtering, or workout descriptions beyond one line.

### Completion Screen

Completion receipt should adapt:

- "20 pushups verified"
- "20 squats locked"
- "8 pullups. hard mode."

Share copy examples:

- "Day 9 locked: 20 pushups. Your move."
- "20 squats. No gym. No negotiation."
- "8 pullups on Just20. Hard mode counted."

### Streak Screen

Add movement breakdown:

- This week: 3 pushup days, 2 squat days, 1 pullup day.
- Favorite movement.
- Hard-mode completions.
- Pullup PR if applicable.

Do not let breakdown overwhelm the streak. The streak remains the hero.

### Settings/Profile

Add optional calibration section:

- Sex: Male / Female / Prefer not to say.
- Difficulty: Default / Easier / Harder.
- Explain: "Used only to tune XP and future target suggestions."

Avoid showing "male gets less XP" as blunt settings copy. Instead, show estimated XP on workout cards and a tooltip explaining calibration.

## Tracking Strategy

### Pushups

- Keep current camera-assisted tracking.
- Manual fallback remains available.
- Camera verification gives full XP.

### Squats

MVP2 recommendation:

- Start with manual or simple camera-assisted tracking.
- Later camera logic can use hip/knee angle and vertical movement.
- Calibration should ask user to stand sideways or full-body in frame.

Squat tracking requirements:

- Detect hips, knees, ankles.
- Count rep when user moves from standing to squat depth and back to standing.
- Use a depth threshold, but allow calibration because bodies and camera angles vary.

### Pullups

MVP2 recommendation:

- Manual-first.
- Camera-assisted pullup tracking can come later because pullup bars, camera placement, and occlusion make it harder.

Pullup tracking later:

- Detect shoulders, elbows, wrists.
- Count rep when chin/shoulder line rises relative to bar/wrist line if visible.
- May need an alternate "selfie side" setup.
- Consider pairing with Apple Watch/phone motion later, but do not block MVP2 on that.

## Fairness And Trust Risks

### Risk: Sex-based XP feels unfair or gameable

Mitigation:

- Make sex optional.
- Use small multipliers.
- Add performance calibration later.
- Do not rank users purely by raw XP without context.

### Risk: Users feel boxed into gender categories

Mitigation:

- Include "prefer not to say."
- Keep copy practical and nonjudgmental.
- Consider adding "custom calibration" later instead of adding more identity categories into the product surface.

### Risk: Pushup brand gets diluted

Mitigation:

- Keep pushups as the default and flagship.
- Keep the app name/identity around "Just20."
- Describe expansion as "choose today's 20" rather than "fitness library."

### Risk: Squats become an easy streak loophole

Mitigation:

- Lower squat XP.
- Make streak count flexible but badge harder completions separately.
- Add weekly quests that reward variety or hard mode without forcing it.

## Monetization Opportunities

MVP2 unlocks better monetization without needing a generic paywall:

- Premium movement packs later, but keep pushups/squats/pullups free.
- XP shop cosmetics tied to movement identity: pushup flame, squat stamp, pullup hard-mode badge.
- Paid team challenges for offices/classes/creators.
- Premium analytics: PRs, form history, movement breakdown, advanced calibration.
- Premium "strict mode" leagues with verified completions.

## MVP2 Implementation Plan

### Phase 1: Product Foundation

- Add `WorkoutType`.
- Add workout type to session records.
- Add optional sex field to user profile.
- Add XP calculation by workout type and calibration.
- Update completion screen and share copy with movement type.

### Phase 2: Workout Picker

- Add pre-workout picker.
- Default to pushups for new users.
- Remember last selected workout.
- Show estimated XP per workout.
- Route selected workout type into workout screen.

### Phase 3: Squats

- Add squat manual flow first.
- Add camera-assisted squat detection if confidence is acceptable.
- Add squat-specific calibration copy and feedback.

### Phase 4: Pullups

- Add pullup manual flow.
- Use higher XP and "hard mode" identity.
- Add pullup PR and hard-mode share receipt.
- Defer camera tracking until setup reliability is better.

### Phase 5: Progress And Social

- Add movement breakdown to streak screen.
- Add movement-specific badges.
- Add friend challenges: "I did pullups today. Match me."
- Add squad filters by movement and hard-mode completions.

## Future Running Platform: Just20 Run

Running should be an adjacent mode, not part of MVP2. The concept fits the brand if it becomes "just 20 minutes" instead of "just 20 reps."

### Core Concept

"Go for a run. 20 minutes. No camera needed."

Running would count as a qualifying daily challenge, but use duration/distance verification instead of camera tracking.

### Why Running Fits

- Keeps the Just20 naming logic.
- Expands beyond strength into cardio.
- Works when camera tracking is awkward.
- Makes the app useful outdoors, while pushups/squats/pullups stay indoor-friendly.

### Running MVP

| Feature | MVP approach |
|---|---|
| Target | 20 minutes moving time |
| Verification | GPS + motion/activity permission |
| XP | Base 22 XP, adjusted by completion context |
| Streak | Counts toward same daily streak |
| Share receipt | Route map optional, privacy-safe by default |
| Privacy | Hide exact start/end location unless user explicitly shares |

### Running XP

Suggested base:

- 20-minute run/walk: 22 XP.
- 20-minute run with continuous pace: 26 XP.
- Manual run entry: 14 XP.

Running should not use sex multipliers at MVP. Performance varies widely by training level, and pace-based calibration is cleaner.

### Running Integrations

Possible integrations:

- Apple Health / HealthKit for workouts, steps, heart rate, and distance.
- Google Fit / Health Connect for Android activity data.
- Strava later for social proof and route sharing.
- Apple Watch / Wear OS later for better run verification.

### Running UX

Home picker later becomes:

- Strength: Pushups, Squats, Pullups.
- Cardio: Run 20.

Run screen:

- Start run.
- Timer and distance.
- Pause/resume.
- Finish after 20 minutes.
- Share "20 minutes done" receipt.

### Running Privacy Rules

- Never share exact GPS route by default.
- Offer share card options: time only, distance only, city only, route map.
- Hide home/work endpoints automatically if route sharing is added.

### Strategic Caution

Running can make Just20 bigger, but it can also dilute the product. Add it only after the daily strength loop is working. The app should first prove that users can build a viral habit around one daily verified action.

## Recommended Product Positioning

MVP1:

"20 pushups a day. Verified."

MVP2:

"Choose today's 20: pushups, squats, or hard-mode pullups."

Future:

"20 reps or 20 minutes. One daily promise."

The product should always come back to the same emotional contract: do one hard-enough thing today, prove it, keep the streak alive, and make a friend want to match you.
