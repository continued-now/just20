# Just20 Viral Growth Plan — Competitor-Informed Feature Roadmap

## Context

Just20 is a daily 20-pushup habit app with a solid core loop: aggressive escalating notifications → camera-based rep detection → streak reward. The mascot, freeze mechanic, and shareable completion cards are the foundation. What's missing is the **social gravity** and **progression depth** that turns a good habit app into one users recruit their friends into.

This plan copies the highest-leverage mechanics from Duolingo, Habitica, Finch, Snapchat, and BeReal — adapted to Just20's "brutal accountability" personality — and sequences them by viral impact vs. engineering cost.

---

## Competitor Mechanics Audit (What to Copy)

### Duolingo (Highest Priority — most proven)
- **Streak Society**: Milestone unlocks at 7 / 30 / 100 / 365 days with visible status
- **Streak Repair**: 48-hour window to "buy back" a broken streak (paid or earned currency)
- **Leaderboard Leagues**: Weekly tier rankings (Bronze → Diamond); top 3 promoted, bottom 3 demoted
- **Friend Streaks**: Shared streak counter between 2 users; 22% higher daily completion
- **Streak At Risk Notification**: Personalised copy triggered at 9pm if not complete; framed as loss
- **Friend Updates**: Push notification when a friend hits 30, 100, 365 days → social proof cascade

### Habitica
- **Accountability Squad (Party System)**: 3–5 friends share a collective "squad streak"; one miss hurts the group
- **Boss Battles**: Weekly challenge where the whole squad must all complete — shared stakes

### Finch
- **Mascot Pet Growth**: Current mascot emoji already exists; evolve it visually across streak milestones (egg → sprout → full flame → inferno) so progress is visible at a glance — no guilt/punishment, only positive visual evolution

### Snapchat / BeReal
- **Social Proof Feed**: Friends' completion timestamps visible ("Liam did it 2h ago") — FOMO without comparison shame
- **Streak as Social Currency**: Displayed prominently on any shareable card, framed as identity ("Day 47")

### Notion / Community
- **Challenge Templates**: Users create named 20-min challenges ("100 days of morning push") and invite friends to join; viral invite loop

---

## Prioritised Implementation Phases

### Phase 1 — Streak Depth & Loss Aversion ✅ COMPLETE
**Goal**: Make the existing streak feel more valuable and more painful to lose.

#### 1A. Streak Milestone Celebrations
- Full-screen confetti modal + shareable badge at 7 / 14 / 21 / 30 / 60 / 90 / 100 / 365 days
- Files: `components/MilestoneCelebration.tsx` (new), `lib/milestones.ts` (new), `app/completion.tsx`
- Copy: "7 DAYS. You're not normal." / "30 DAYS. The floor fears you."

#### 1B. Streak Repair (Duolingo "Fix Streak")
- When user misses 1–2 days and had a meaningful streak (≥7), offer a one-time free repair
- Repair sets last_completed_date = yesterday; completing today continues the streak
- Limited to once every 30 days
- Files: `app/streak-repair.tsx` (new), `lib/db.ts`, `app/(tabs)/index.tsx`

#### 1C. "Streak At Risk" Notification
- 9pm notification if not completed — framed as imminent loss of streak
- Copy: "Your X-day streak dies tonight. 3 hours left."
- Files: `lib/notifications.ts`, `app/_layout.tsx`

#### 1D. Milestone Progress on Streak Tab
- Progress bar toward next milestone below the hero section
- "X days until [milestone]" label
- Files: `app/(tabs)/streak.tsx`, `lib/milestones.ts`

---

### Phase 2 — Mascot Evolution & Visual Progression
**Goal**: Make the mascot grow visually with streak progress so identity becomes tied to consistency. Finch proved pet attachment = 22% Day 30 retention.

#### 2A. Mascot Evolution Stages
- Mascot changes visual form based on streak tier:
  - 0–6 days: 🥚 Egg / dormant form
  - 7–29 days: 🔥 Small flame (current emoji mascot)
  - 30–99 days: 🔥🔥 Double flame / more dramatic
  - 100–364 days: 💀🔥 Skull flame / "cursed" aesthetic
  - 365+ days: 👑🔥 Crown flame / legend status
- Files: `components/Mascot.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/streak.tsx`

#### 2B. Evolution Teaser on Home Screen
- Below the mascot: "Next evolution in X days"
- Files: `app/(tabs)/index.tsx`

---

### Phase 3 — Social Loop & Friend Mechanics
**Goal**: Every user becomes an acquisition channel. Duolingo gets 80% of users from organic/friend loops.

#### 3A. Friend Invite + Shared Streak
- Invite up to 3 friends via deep link
- "Buddy Streak" — only increments when BOTH complete on the same day
- **Backend requirement**: Supabase free tier (users, buddy_streaks tables)
- Files: `lib/social.ts` (new), `app/invite.tsx` (new), `app/(tabs)/index.tsx`, `lib/db.ts`

#### 3B. Social Proof Feed (BeReal-Inspired)
- Home screen strip: "3 of your friends did it today" / "Alex finished 12 min ago"
- No comparison numbers — presence proof only (FOMO without shame)
- Files: `app/(tabs)/index.tsx`

#### 3C. Challenge Invites (Notion Template Virality)
- Create named challenges ("30-day morning push with Jake"), share as deep link
- Recipients install app and join the challenge; private leaderboard visible to challenge members
- Files: `app/challenge.tsx` (new), `app/challenge/[id].tsx` (new)

#### 3D. Friend Update Notifications
- Push to friends when user hits 30/100/365 days
- Copy: "Your friend [Name] just hit 100 days. Embarrassing."
- Files: `lib/notifications.ts`

---

### Phase 4 — XP / Currency & Variable Rewards
**Goal**: Meta-game layer that extends DAU beyond the core habit.

#### 4A. "Rep Coins" Currency
- Earn: completing daily (10), streak milestones (50), first-time milestones (100), buddy streak (15)
- Spend: streak repair (200), mascot accessories (100–500), freeze tokens (150)
- Files: `lib/db.ts`, `lib/coins.ts` (new), `app/(tabs)/streak.tsx`

#### 4B. Weekly Variable Reward Chest
- Sunday: users who completed ≥5 days unlock a chest with random coin drop (10–100)
- Variable ratio schedule is more addictive than fixed rewards
- Files: `app/(tabs)/index.tsx`, `app/chest-open.tsx` (new)

#### 4C. Weekly Leaderboard (Duolingo League)
- Weekly ranking by days completed; resets Monday
- User sees their rank + 5 people above/below
- Low-effort version: friends-only leaderboard (no backend needed)
- Files: `app/(tabs)/leaderboard.tsx` (new)

---

### Phase 5 — Onboarding Viral Loop
**Goal**: First 60 seconds determine if users invite anyone. Current onboarding has none.

#### 5A. Onboarding Flow (4 screens)
- Screen 1: "20 pushups. Every day. No excuses." — mascot egg visual
- Screen 2: Streak calendar example — "Miss a day? You have freeze tokens."
- Screen 3: "Invite a friend to keep each other accountable" — invite prompt during onboarding
- Screen 4: Notification permission — "Let us annoy you until you do it"
- Files: `app/onboarding/` (new), `app/_layout.tsx`, `lib/db.ts`

#### 5B. Share Card Enhancement
- Streak number prominent ("DAY 47"), mascot evolution tier visible
- Make it a flex, not a receipt
- Files: `app/completion.tsx`

---

## Notification Strategy

| Trigger | Timing | Copy Style | Status |
|---------|--------|------------|--------|
| Streak at risk | 9pm (if not done) | Loss framing | ✅ Phase 1 |
| Friend completed | Within 1hr | FOMO/social | Phase 3 |
| Buddy streak endangered | 8pm | Guilt/social | Phase 3 |
| Milestone reached | Post-workout | Celebration | ✅ Phase 1 |
| Friend milestone | Same day | Social proof | Phase 3 |
| Weekly chest | Sunday 10am | Variable reward | Phase 4 |

---

## Backend Requirement

Phases 1 & 2: fully local (SQLite). Phases 3+: Supabase free tier.
Tables needed: `users`, `buddy_streaks`, `challenges`.

---

## Viral Loop Summary

```
User completes → Milestone card → Share to TikTok/IG Stories
                                        ↓
                                  New user installs
                                        ↓
                               Onboarding → Friend invite
                                        ↓
                          Buddy streak created → both committed
                                        ↓
                      Friend milestone notification → loop repeats
```

---

## Success Metrics (Target)

| Metric | Current (est.) | 90-day Target |
|--------|---------------|---------------|
| Day 1 retention | ~25% | 40% |
| Day 7 retention | ~12% | 22% |
| Day 30 retention | ~6% | 18% |
| K-factor (viral coefficient) | ~0 | 0.4+ |
| DAU/MAU | unknown | 35%+ |
| Streak > 7 days | unknown | 30% of active users |

---

## Implementation Order

1. ✅ **Phase 1**: Streak milestones, streak repair, at-risk notification, milestone progress bar
2. **Phase 2**: Mascot evolution tiers (2 days)
3. **Phase 3**: Supabase setup + buddy streaks + friend invites (1 week)
4. **Phase 4**: Rep coins + weekly chest + leaderboard (1 week)
5. **Phase 5**: Onboarding flow + share card polish (3 days)

Total estimated: ~3–4 weeks to full viral loop.
