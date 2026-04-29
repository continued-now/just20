# XP Shop Ideas

XP is currently tracked as a progression signal only. It should stay earned-only for now so it feels credible: users get XP from showing up, hitting the scheduled window, avoiding nudges, and reaching streak milestones.

## Core Principle

XP should measure discipline. Coins can become the spendable currency later. Keeping them separate gives the product two loops:

- XP = status, progression, leagues, reputation, proof.
- Coins = shop spending, consumables, cosmetics, experiments.

This avoids making the main streak feel pay-to-win while still leaving room for monetization.

## Short-Term Uses

- Profile levels based on lifetime XP.
- XP leagues like Spark, Iron, Obsidian, Mythic.
- Weekly XP leaderboard among buddies.
- XP recap cards after workouts.
- XP multipliers for strict-mode completions.
- XP penalties for needing too many nudges.
- XP badges for perfect weeks, morning consistency, and no-excuses streaks.

## MVP Layer Implemented

The first in-app XP layer treats XP as lifetime status, not spendable currency.

- XP now maps to visible levels and titles.
- The level progress card appears on Home, Completion, and Profile.
- Profile links to a locked XP Shop preview.
- The XP Shop preview shows future cosmetic/status unlocks by level.
- Coins are positioned as the future spending currency.

This keeps the reward loop simple: do pushups, earn XP, climb levels, unlock eligibility for better-looking status items later.

## Initial Level Ladder

- Level 1: Starter Sprout, 0 XP.
- Level 2: Tiny Spark, 25 XP.
- Level 3: Floor Regular, 75 XP.
- Level 4: Habit Bean, 150 XP.
- Level 5: No-Excuses Rookie, 275 XP.
- Level 6: Pushup Goblin, 450 XP.
- Level 7: Window Hitter, 700 XP.
- Level 8: Squad Spark, 1000 XP.
- Level 9: Badge Collector, 1400 XP.
- Level 10: Form Gremlin, 1900 XP.
- Level 11: Streak Creature, 2500 XP.
- Level 12: Tiny Machine, 3200 XP.
- Level 13: Floor Menace, 4100 XP.
- Level 14: Iron Sprout, 5200 XP.
- Level 15: Nudge Dodger, 6500 XP.
- Level 16: Habit Goblin, 8100 XP.
- Level 17: Tiny Legend, 10000 XP.
- Level 18: Mythic Bean, 12300 XP.
- Level 19: Ancient Egg, 15000 XP.
- Level 20: Just 20 Icon, 18200 XP.

After Level 20, the app can continue generating "Overtime Legend" levels so long-term users always have another bar to fill.

## Future Shop Sinks

- Mascot skins, flame colors, badge frames, and completion-card themes.
- Custom notification voices or notification copy packs.
- Streak-card templates for Instagram/TikTok sharing.
- Workout room backgrounds or animated overlays.
- Limited seasonal titles like "Floor Menace" or "No-Excuses Mode."
- Cosmetic buddy leaderboard borders.
- One-time challenge entry tickets funded by coins, unlocked by XP level.

## Monetization Tie-Ins

- Premium cosmetic packs purchasable with cash, but gated by XP level so they still require earned status.
- Season pass with XP milestones, cosmetic rewards, and weekly challenges.
- Sponsored challenges: brand funds a challenge week, users earn exclusive cosmetics for completion.
- Creator/fitness influencer collab packs with custom notification copy and share-card themes.
- Team challenges for offices, gyms, clubs, and schools with paid private leaderboards.
- Premium analytics: streak risk, best completion window, consistency score, nudge dependency trend.
- Paid recovery toolkit: form tips, pushup plans, mobility warmups, and progression programs.

## Guardrails

- Do not sell XP directly.
- Do not let cash buy leaderboard position.
- Be careful with paid streak repairs; if used, cap them hard and make them feel like insurance, not cheating.
- Keep strict-mode XP highest because it rewards commitment, not spending.
- Make social flexes about earned consistency, not purchased items.

## Possible Economy Split

- XP unlocks eligibility and status.
- Coins buy shop items.
- Cash buys premium cosmetic bundles, subscriptions, or seasonal passes.
- Streak freezes remain earned, rare, and capped.

## Product Hooks

- "Earned, not bought" messaging around XP.
- Share cards that show strict-mode XP bonuses.
- Weekly leaderboard reset to keep newer users competitive.
- Buddy challenges where both people earn bonus XP only if both complete.
- XP streak insurance as a long-term monetization experiment, but only if it does not cheapen the core streak.

## Zwift x Duolingo XP Gate Plan

This layer should borrow the best economy shape from Zwift and Duolingo without copying either product directly.

Competitive pattern notes:

- Zwift uses XP to move users through a visible level ladder, and each level can unlock gear, jerseys, bikes, or accessories.
- Zwift also uses streak behavior to accelerate XP progress, so consistency makes the level ladder move faster.
- Duolingo uses daily quests, monthly challenges, streak milestones, leagues, XP boosts, and highly animated/shareable moments to make progress feel alive.
- Duolingo has also moved some challenge goals away from pure XP grinding and toward daily quest completion, which is a useful guardrail for Just 20.

### Economy Principle

XP should gate eligibility. Coins should handle spending. Streaks and clean form should accelerate progression.

- XP never goes down.
- XP unlocks access to status, cosmetics, special animations, profile titles, and shop eligibility.
- Coins are spent on unlocked cosmetic items later.
- Clean camera-tracked sessions earn the best XP.
- Manual saves preserve the streak but do not qualify for XP multipliers, strict badges, clean-rep cosmetics, or high-rarity unlocks.
- Paid products can decorate status, but should not create status.

### XP Gate Structure

Every few levels should unlock something psychologically legible.

- Levels 1-3: onboarding identity. Starter title, first profile frame, first badge shelf background.
- Levels 4-6: early retention. Completion glow, basic badge frames, first alternate flame style.
- Levels 7-10: social unlocks. Better share cards, squad banner preview, weekly leaderboard styling.
- Levels 11-15: commitment cosmetics. Rare profile titles, animated badge frames, streak flame variants, stricter monthly-test styling.
- Levels 16-20: high-status flex. Premium-looking proof cards, hidden-gem reveal variants, seasonal icon eligibility, sponsor challenge skins.
- Level 20+: overtime prestige. Repeatable "Overtime Legend" levels with numbered prestige marks, seasonal cosmetics, and share-card upgrades.

Each level should have one visible reward row even if the reward is "eligibility unlocked" rather than a live purchasable item.

### Just 20 Streak XP Acceleration

Use a Zwift-like streak accelerator, but tune it for daily pushups.

- Base completion XP remains determined by reminder mode, nudges used, and tracking method.
- Weekly momentum begins after 3 completed days in the same local week.
- 3-day week: award a one-time +30 XP momentum bonus.
- 5-day week: award a one-time +75 XP momentum bonus.
- 7-day week: award a one-time +150 XP perfect-week bonus and upgrade the weekly chest.
- Consecutive perfect weeks add a small capped bonus: +5 XP per clean daily session in week 2, +8 in week 3, +10 in week 4 and beyond.
- Cap all weekly momentum bonuses so users cannot farm multiple completions per day for ladder abuse.

This keeps daily streaks meaningful while making "I came back all week" feel materially different.

### Duolingo-Style Quest Layer

Add daily and monthly quests so XP does not become pure grinding.

Daily quests should be easy, medium, hard:

- Easy: complete today's 20.
- Medium: complete inside the scheduled window, use camera tracking, or complete with no manual adjustment.
- Hard: beat yesterday's time, keep form quality above threshold, invite/nudge a buddy, or complete without backup nudges.

Monthly challenges should be quest-count based, not raw XP based:

- Example: complete 40 quests this month.
- Example: hit 12 camera-clean sessions.
- Example: complete 4 weekly momentum milestones.
- Example: take the monthly "Test Me" session.

Rewards can include XP, coins, cosmetic eligibility, badge progress, or one limited boost.

### XP Boosts Without Grind Abuse

Use boosts carefully. They should create excitement, not unhealthy time pressure.

- Boosts apply to the next eligible workout, not to unlimited activity inside a timer.
- A boost can multiply only the base daily XP, not badge XP, milestone XP, or social XP.
- Boosts should not apply to manual saves.
- Boosts should be capped at one active boost at a time.
- Boost examples: "Clean Rep Boost" 1.25x, "Window Hit Boost" 1.5x, "Buddy Boost" both users get +10 XP if both complete today.
- Avoid broad 2x/3x boosts until the economy has enough telemetry to prevent inflation.

This gets the Duolingo dopamine of a boost without turning Just 20 into an XP farming app.

### Shop Unlock Categories

Map level gates to specific unlock families:

- Badge cosmetics: frames, shelves, hidden-gem glows, rarity rings.
- Proof-card cosmetics: background styles, typography packs, animated overlays.
- Streak cosmetics: flame color, flame character, calendar stamps.
- Profile identity: titles, status labels, level plate styles.
- Squad cosmetics: team banners, buddy leaderboard borders, room themes.
- Notification flavor: cute reminder copy packs and mascot tone packs.
- Monthly-test cosmetics: strict-mode aura, result card frames, personal-record stamps.
- Sponsor drops: limited challenge skins, partner badges, seasonal proof-card templates.

### Monetization Direction

Paid monetization should sit around cosmetics and events, not habit shortcuts.

- Free users can earn meaningful XP levels and basic cosmetics.
- Premium can provide more cosmetic variety, extra proof-card templates, deeper analytics, and seasonal progression tracks.
- Sponsors can fund challenge cosmetics unlocked through participation, not direct purchase.
- A seasonal pass can reward quest completion, not raw XP accumulation alone.
- Cash purchases can require XP-level eligibility so status remains earned.

### Implementation Sequence

1. Add level-gated reward rows to the current XP Shop preview.
2. Add weekly momentum bonus accounting to XP events.
3. Add daily quest definitions and a local quest progress table.
4. Add monthly quest challenge progress.
5. Add next-workout-only boost inventory.
6. Add cosmetic unlock inventory once actual cosmetics are designed.
7. Add leaderboard/league mechanics only after backend identity is active.

### Product Guardrails

- Do not let users buy XP.
- Do not let users buy perfect-week status.
- Do not let manual fallback trigger boosts, strict badges, or clean-rep cosmetics.
- Do not make the app feel punishing if someone only completes one honest set.
- Do not over-optimize for XP in a way that makes users ignore form quality.
- Keep the core promise: just 20, every day, with increasingly satisfying proof that you showed up.

## Streak Patch and Debt Set Recovery Plan

This is the recovery loop for users who miss a day. The goal is to prevent churn without making "daily" feel optional.

### Naming

- Streak Patch: the urgent one-day recovery mission.
- Debt Set: the gentler two-day repayment plan.
- Clean Streak: days completed on the actual day with eligible tracking.
- Active Streak: streak count that may include patches, freezes, or debt-set repairs.

### Core Principle

Users should be able to recover commitment, but not rewrite history.

- A clean day remains the highest-status behavior.
- A patched day can preserve the active streak.
- A debt-set repair can preserve the active streak after repayment is complete.
- Neither patched days nor debt-set days should count toward clean-streak badges.
- The app should be transparent that a day was repaired, not completed cleanly.

### Streak Patch

Streak Patch is the dramatic save-now option.

- Available only when the user missed exactly one day.
- Must be started the next day.
- Requires 40 total pushups: 20 for today plus 20 to patch yesterday.
- Can include a random 10-minute "Patch Window" for higher recovery XP.
- If completed inside the Patch Window, the user can recover up to 100% of the missed-day XP.
- If completed outside the Patch Window, the user can preserve the active streak but should recover only 60-70% of missed-day XP.
- Manual mode can preserve the active streak but should earn only small recovery XP and should not qualify for clean-rep rewards.
- Limit to 1 Streak Patch per week or 3 per month.
- No stacking: missing 2 days should not allow a 60-rep full repair.

Suggested copy:

- "Patch window open. Do 40 now and reclaim yesterday."
- "Yesterday is patchable. Pay it back with 40 today."
- "Saved, but not spotless. Your active streak lives."

### Debt Set

Debt Set is the gentler repayment plan for users who cannot or should not do 40 in one session.

- Available only when the user missed exactly one day.
- Must begin the next day.
- Requires today's normal 20 plus 10 extra today, then tomorrow's normal 20 plus 10 extra tomorrow.
- The missed day stays in a pending-patched state until both debt sets are complete.
- If either debt day is missed, the repair fails.
- Cannot start another Debt Set while one is active.
- Must complete within 48 hours.
- Debt Set should earn less recovery XP than Streak Patch because it has less urgency.
- Manual counts can help preserve the active streak but should not earn full recovery XP or clean-rep eligibility.

Suggested copy:

- "Debt Set started. 10 extra today, 10 extra tomorrow."
- "Half paid. Come back tomorrow to lock the patch."
- "Debt cleared. Active streak restored."

### Recovery Reward Hierarchy

- Clean day: 20 on the actual day. Full XP, clean streak, clean badges, full quest eligibility.
- Streak Patch inside Patch Window: 40 next day. Active streak preserved, up to 100% missed XP, no clean-streak badge credit.
- Streak Patch outside Patch Window: 40 next day. Active streak preserved, 60-70% missed XP, no clean-streak badge credit.
- Debt Set completed on schedule: 30 today plus 30 tomorrow. Active streak restored, 50-60% missed XP, no clean-streak badge credit.
- Debt Set with manual counts: active streak restoration only or 20-30% missed XP, no clean-rep rewards.
- Freeze: active streak preserved, 0 missed-day XP, no clean-streak badge credit.
- Missed without repair: active streak breaks.

### XP and Badge Rules

- Recovery XP should be recorded as a separate XP event source, not normal daily workout XP.
- Recovery XP should not be multiplied by boosts.
- Recovery XP should not count toward perfect-week bonuses.
- Patched days should not unlock badges requiring clean streaks, no-excuses windows, or camera-clean form.
- Patched days can unlock lower-tier consistency badges that explicitly allow repairs.
- Badge copy should distinguish "stayed alive" from "perfect."

### UX Flow

1. User opens app after missing yesterday.
2. App shows a recovery card before the normal workout CTA.
3. User chooses Streak Patch or Debt Set.
4. Streak Patch opens a 40-rep workout mode.
5. Debt Set opens a 30-rep workout mode and creates a pending debt state.
6. Completion screen explains what was repaired, what XP was recovered, and what remains ineligible.
7. Calendar marks repaired days with a patched visual, not the same mark as clean days.

### Implementation Notes

- Add explicit recovery metadata to sessions: `recovery_type`, `repaired_date`, `recovery_status`, and `recovery_xp_awarded`.
- Add a recovery ledger table or local-first state object so pending Debt Sets survive app restarts.
- Add streak calculations that can return both clean streak and active streak.
- Add XP event sources: `streak_patch`, `debt_set`, and `freeze_recovery`.
- Add UI states: available, active, pending, completed, failed, expired.
- Keep recovery local-first for MVP, then sync it to backend identity later.

### Guardrails

- Do not let recovery become the default schedule.
- Do not allow unlimited debt stacking.
- Do not allow recovery for more than one missed day at a time.
- Do not hide repaired status from the user.
- Do not award clean badges for repaired days.
- Do not make recovery copy shamey. It should feel like "not over" rather than "you failed."
