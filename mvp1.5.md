# MVP1.5: Test Me And Pushup Progress Analytics

Date: 2026-04-27

## Executive Summary

MVP1.5 should make Just20 feel more like a performance habit, not just a daily checkbox. The core addition is a monthly "Test Me" mode where users can measure how many accurate pushups they can do unbroken every 30 days.

The second addition is progress analytics. Since Just20 already tracks the time it takes to finish 20 pushups, the app can show users whether they are getting faster, more consistent, and more accurate over time. This creates a stronger reason to return beyond streak preservation.

MVP1.5 should remain pushup-only. This is the bridge between MVP1 and MVP2: improve tracking trust, audio feedback, and personal progress before adding squats, pullups, or running.

## MVP1.5 Goals

- Add a "Test Me" mode available once every 30 days.
- Count how many accurate pushups a user can complete unbroken.
- Make rep validation stricter in test mode than normal daily mode.
- Use audio feedback to announce counted reps and rejected reps.
- Save test results as benchmark snapshots.
- Add analytics for daily 20-pushup speed, consistency, and trend over time.
- Make progress visible and shareable without overcomplicating the home screen.

## Non-Goals

- Do not add squats, pullups, or running in MVP1.5.
- Do not turn daily mode into a punishing strict test.
- Do not make Test Me required for streak survival.
- Do not create public leaderboards yet.
- Do not require audio to complete a normal workout.
- Do not use test results to shame weaker users.

## Feature 1: Test Me Mode

### Concept

"Every 30 days, see how many clean pushups you can do unbroken."

Test Me is a periodic benchmark. The user enters a stricter mode where the app counts only accurate pushups. The result becomes a monthly stat: max clean unbroken pushups.

### Eligibility

| Rule | Behavior |
|---|---|
| First test | Available once the user has completed at least one normal Just20 workout. |
| Cooldown | After a valid test, next test unlocks 30 days later. |
| Retest | If the user exits before doing 3 counted reps, do not consume the monthly attempt. |
| Missed month | If the user skips a month, they can test whenever they return. |
| Streak impact | Test Me can count for the daily streak only if the user reaches at least 20 clean reps. |

### Entry Points

- Home: small secondary card when test is available.
- Streak screen: "Monthly Test" progress card.
- Completion screen: if user finishes normal 20 quickly, suggest "Test yourself next time."
- Notification later: optional monthly test unlock notification.

### UX Flow

1. User taps "Test Me."
2. App explains the rules in one screen.
3. User calibrates camera position.
4. App starts a 3-second countdown.
5. User performs as many clean pushups as possible without stopping.
6. Audio announces counted reps.
7. App ends test when the user quits, loses form for too long, or pauses beyond the allowed rest window.
8. Result screen shows total clean reps, rejected reps, form score, previous best, and next unlock date.

### Test Rules

| Rule | MVP1.5 behavior |
|---|---|
| Clean rep | Full down/up phase detected with confidence above strict threshold. |
| Unbroken | User cannot rest longer than 5 seconds in top plank position. |
| Form loss | If body leaves frame for 3 seconds, warning. If missing for 8 seconds, test ends. |
| Manual adjustment | Disabled in Test Me mode. |
| Minimum score | Result saves if at least 3 clean reps are counted. |
| Daily credit | Counts as daily completion if clean reps >= 20. |

### Strict Counting

Normal daily mode should stay forgiving enough to preserve habit momentum. Test Me mode should be stricter because it creates a benchmark.

Suggested stricter thresholds:

| Signal | Normal mode | Test Me mode |
|---|---:|---:|
| Minimum pose confidence | Medium | High |
| Required body in frame | Helpful | Required |
| Down-phase depth | Flexible | Required |
| Up-phase lockout | Flexible | Required |
| Manual rep adjustment | Allowed | Disabled |
| Low-confidence rep | May count | Rejected or warning |

Rep rejection reasons should be simple:

- "Too shallow"
- "Lock out"
- "Body out of frame"
- "Hold steady"
- "Rep not counted"

## Audio Feedback

### Purpose

Audio makes the test feel real. The user should not have to look at the screen while doing pushups.

### Audio Behavior

| Event | Audio |
|---|---|
| Countdown | "Three, two, one, go." |
| Clean rep counted | Speak the rep number: "One", "Two", "Three." |
| Rejected rep | Short cue plus reason: "Too shallow" or "Not counted." |
| Form warning | "Body out of frame" or "Straighten up." |
| Rest warning | "Keep moving." |
| New personal best | "New best." |
| Test end | "Test complete." |

### Audio Settings

Add a lightweight setting:

- Audio coaching: Off / Count only / Count + form cues.

Default recommendation:

- Normal daily mode: Count only or off.
- Test Me mode: Count + form cues.

### Implementation Notes

- Use platform text-to-speech if available.
- Keep phrases short to avoid lag.
- Do not speak every form detail; only speak actionable cues.
- Haptics can reinforce counted reps where supported.

## Test Result Screen

### Primary Result

Show:

- Clean reps counted.
- Previous best.
- Difference from last test.
- Form score.
- Next test unlock date.

Example:

```text
32 clean pushups
+5 vs last test
New monthly best
Next test unlocks May 27
```

### Secondary Detail

Show:

- Rejected reps.
- Longest clean streak inside test.
- Average seconds per rep.
- Best 20-rep split inside the test.

### Share Copy

Examples:

- "Monthly Test: 32 clean pushups. Verified by Just20."
- "I just hit 32 unbroken pushups. Test me again in 30 days."
- "New Just20 benchmark: 32 clean reps. Your move."

## Feature 2: Pushup Progress Analytics

### Concept

Every daily workout already has valuable timing data. MVP1.5 should turn that into simple analytics:

- How fast can the user finish 20?
- Are they improving?
- Are they more consistent?
- How does their monthly test compare to daily workouts?

### Core Metrics

| Metric | Meaning |
|---|---|
| Best 20 time | Fastest verified completion of 20 pushups. |
| Average 20 time | Average completion time over selected period. |
| Median 20 time | More stable view of typical speed. |
| 7-day trend | Whether the user is getting faster or slower recently. |
| 30-day trend | Longer-term progress. |
| Consistency score | How often the user completes without manual adjustment or missed days. |
| Rep pace | Average seconds per rep. |
| Test max | Max clean unbroken pushups from Test Me. |
| Test trend | Change in Test Me result over time. |

### Analytics Views

#### Streak Screen Summary

Add a small "Progress" card:

```text
20-pushup speed
Best: 0:42
30-day avg: 1:08
Trend: 12% faster
```

#### Dedicated Stats Screen

The hidden/basic stats screen can evolve into a richer analytics page:

- Speed chart over time.
- Best time badge.
- Monthly Test history.
- Average pace.
- Accuracy/tracking quality.
- Calendar heatmap.

#### Completion Screen

After each workout, show one insight:

- "Fastest 20 yet."
- "8 seconds faster than your 30-day average."
- "Cleanest tracking this week."
- "You are 12% faster than your first week."

## Data Model Additions

### Session Fields

Add or confirm these fields exist:

```ts
type WorkoutSession = {
  id: string;
  completedAt: string;
  reps: number;
  targetReps: number;
  durationMs: number;
  repTimestamps: number[];
  manualAdjustments: number;
  trackingConfidenceAvg?: number;
  trackingConfidenceMin?: number;
  mode: 'daily' | 'test_me';
};
```

### Test Me Result

Add:

```ts
type TestMeResult = {
  id: string;
  completedAt: string;
  cleanReps: number;
  rejectedReps: number;
  durationMs: number;
  bestTwentySplitMs?: number;
  avgSecondsPerRep: number;
  formScore: number;
  endedReason: 'user_quit' | 'rest_timeout' | 'body_lost' | 'form_lost' | 'completed';
};
```

### Analytics Helpers

Add helper functions:

```ts
getBestTwentyTime()
getAverageTwentyTime(days: number)
getMedianTwentyTime(days: number)
getSpeedTrend(days: number)
getTestMeEligibility()
getLatestTestMeResult()
getBestTestMeResult()
getTestMeHistory()
```

## Scoring And Analytics Formulas

### Best 20 Time

Use the fastest session with:

- `targetReps >= 20`
- `reps >= 20`
- `durationMs > 0`
- daily or Test Me mode both eligible if 20 clean reps are available.

### Best 20 Split During Test Me

If the user does more than 20 reps in Test Me:

```text
bestTwentySplit = shortest time between any rep N and rep N+20
```

For MVP1.5, this can be simplified:

```text
firstTwentySplit = timestamp(rep 20) - testStart
```

### Speed Trend

Suggested MVP formula:

```text
recentAvg = average duration over last 7 completed daily sessions
baselineAvg = average duration over previous 7 completed daily sessions
trendPercent = (baselineAvg - recentAvg) / baselineAvg
```

Positive trend means faster.

### Consistency Score

Suggested MVP formula:

```text
consistency = completedDays / availableDays
accuracyBonus = sessionsWithoutManualAdjustments / completedSessions
score = round((consistency * 0.7 + accuracyBonus * 0.3) * 100)
```

Keep this private. It is useful for self-awareness but could feel judgmental if overexposed.

### Form Score For Test Me

Suggested MVP formula:

```text
formScore = round((cleanReps / max(cleanReps + rejectedReps, 1)) * 100)
```

Later, include depth, lockout, body-in-frame, and confidence.

## XP Impact

Test Me should reward effort without letting one benchmark dominate the XP economy.

Suggested XP:

| Result | XP |
|---|---:|
| Complete valid test, 3-19 clean reps | 10 XP |
| Complete 20+ clean reps | Normal daily XP + 10 bonus |
| New personal best | +15 bonus |
| Monthly test completed on unlock day | +5 bonus |

Test Me should not penalize users for doing fewer reps than last time. The emotional point is measurement, not punishment.

## UI Placement

### Home

When available:

```text
Monthly Test unlocked
How many clean pushups can you do?
[TEST ME]
```

When locked:

```text
Next Test Me unlocks in 12 days
Keep training your daily 20.
```

### Streak

Add a benchmark card:

```text
Monthly Test
Best: 32 clean reps
Last: 27
Next: May 27
```

### Stats

Add analytics cards:

- Best 20 time.
- 7-day average.
- 30-day trend.
- Monthly test history.
- Accuracy/form score.

## Notifications

Optional future notifications:

- "Monthly Test unlocked. Time to see what changed."
- "30 days ago: 27 clean reps. Ready to beat it?"

Keep this opt-in. Do not make test notifications part of the aggressive daily nudge system.

## Privacy And Safety

- Test results are private by default.
- Sharing is explicit.
- Do not publish leaderboards in MVP1.5.
- Add safety copy: stop if you feel pain, dizziness, or discomfort.
- Do not encourage users to retest repeatedly while fatigued.

## Implementation Plan

### Phase 1: Data Foundation

- Add `mode` to workout sessions.
- Persist rep timestamps for every daily workout if not already saved.
- Add `TestMeResult` storage.
- Add eligibility helper for 30-day cooldown.

### Phase 2: Test Me Flow

- Add entry card on Home or Streak.
- Add rules/interstitial screen.
- Reuse workout camera view with `mode='test_me'`.
- Disable manual rep adjustments in test mode.
- Add stricter pose thresholds.
- Add end conditions: user quit, rest timeout, body lost, form lost.

### Phase 3: Audio Feedback

- Add audio coaching setting.
- Speak counted reps in Test Me.
- Add short rejection cues.
- Add "new best" and "test complete."

### Phase 4: Results And Sharing

- Add Test Me result screen.
- Save result and next unlock date.
- Add share receipt.
- If clean reps >= 20, also mark daily workout complete.

### Phase 5: Analytics

- Add stats helper functions.
- Add progress card to Streak.
- Improve Stats screen with speed trend and Test Me history.
- Add completion insights after normal daily workouts.

## Success Metrics

- Test Me unlock views.
- Test Me starts.
- Valid Test Me completions.
- Percentage of users who share Test Me result.
- Users with improved Test Me score month over month.
- Users who view progress analytics after a completion.
- 30-day retention for users who complete a Test Me vs users who do not.

## Product Positioning

MVP1:

"20 pushups a day. Verified."

MVP1.5:

"Train daily. Test monthly. Watch yourself get dangerous."

MVP2:

"Choose today's 20."

The Test Me feature gives the streak a deeper reason to exist: every day of training leads toward a measurable monthly proof point.
