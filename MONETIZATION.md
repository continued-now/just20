# Just20 Monetization Plan

## Goal

Just20 should remain viral at the top of the funnel while earning enough to cover backend, notification, storage, moderation, analytics, and development costs. The product should not monetize the basic promise too early: 20 pushups every day, local rep counting, streak tracking, and share cards should stay free enough that users keep inviting friends.

The paid layer should monetize commitment, identity, social accountability, and recovery from missed days.

## Positioning

Just20 is not a general fitness app. It is a daily accountability app with a clear identity:

- One simple habit: 20 pushups every day.
- A strong emotional hook: the app will annoy you until you do it.
- Proof of work: camera-based rep counting and shareable completion cards.
- Social pressure: buddy streaks, squads, challenges, and public streak identity.

The business should sell stronger accountability and better self-expression, not basic access.

## Monetization Principles

1. Keep the daily workout loop free.
   - Users must be able to complete pushups, maintain a streak, and share completion cards without paying.
   - The free loop powers Instagram/TikTok sharing and friend invites.

2. Charge for commitment amplifiers.
   - Streak repair, extra freeze tokens, squad accountability, advanced challenges, and progress identity are the most natural paid surfaces.

3. Do not charge for trust-critical health or camera features.
   - Rep counting should not feel paywalled or dishonest.
   - The app should stay credible as an on-device privacy-first product.

4. Monetize after value is felt.
   - Best payment moments: after a 7-day streak, after a missed day, after joining a squad, after a milestone, or when creating a challenge.

5. Keep viral sharing mostly free.
   - Watermarked cards can be free.
   - Premium card styles, animated cards, custom themes, and advanced exports can be paid.

## Recommended Business Model

### Free Tier

Free should be generous enough to grow the user base.

Included:

- Daily 20-pushup workout.
- On-device camera rep counting.
- Basic streak tracking.
- Basic mascot states.
- Standard completion card with Just20 watermark.
- 20 daily nudges.
- One buddy link.
- Basic streak repair, limited to one free repair every 30 days after a 7-day streak.
- Basic stats: current streak, best streak, last 7 days, last 30 days.

Purpose:

- Drive habit formation.
- Encourage organic sharing.
- Make the app useful before any payment.

### Just20 Pro

Subscription for people who want more accountability, identity, and progression.

Suggested starting price:

- Monthly: $4.99
- Annual: $29.99 to $39.99
- Intro offer after day 7: first month $1.99 or 7-day free trial

Included:

- Unlimited buddy links or up to 20 buddies.
- Squad streaks for groups of 3-5.
- Advanced challenge creation.
- More mascot evolution stages.
- Premium completion card designs.
- Animated share cards or short video exports.
- Custom nudge intensity presets.
- Quiet hours and schedule control.
- Advanced stats: completion rate, weekly consistency, best time, missed-day patterns.
- More streak repair options.
- Monthly recap cards.

Best upsell moments:

- User hits a 7-day streak: "Make it harder to quit."
- User shares a milestone card: "Unlock premium cards."
- User adds a second buddy: "Squads are Pro."
- User misses a day: "Repair and protect your streak."
- User opens the streak tab after 14+ days: "Get advanced streak protection."

### Consumables

Consumables can work, but they need guardrails so the app does not feel predatory.

Possible purchases:

- Streak repair token: $0.99
- 3 repair tokens: $1.99
- Freeze pack: $0.99 to $1.99
- Premium card pack: $1.99
- Mascot accessory pack: $1.99

Rules:

- Never sell unlimited streak repairs.
- Do not sell a repair if the user has not built a meaningful streak.
- Keep earned tokens available so payment is optional, not coercive.
- Make repair tokens less attractive than Pro, so subscription remains the main business.

### Challenge Passes

Challenge passes can become a strong social monetization surface.

Free:

- Join challenges.
- Create one simple private challenge.
- Up to 3 participants.

Pro:

- Create unlimited challenges.
- Invite larger groups.
- Custom challenge names, banners, and share cards.
- Private leaderboard.
- Weekly recap.
- Challenge completion certificates.

Paid one-off:

- Branded challenge pack: $2.99
- 30-day premium challenge: $4.99

Good challenge examples:

- 30-Day Morning Push.
- 100 Days No Excuses.
- Squad vs. Squad Week.
- Office Pushup War.
- Brother Bet Challenge.

### Brand and Creator Partnerships

Once the app has repeat sharing, sponsorship can be added carefully.

Potential offers:

- Sponsored challenge templates.
- Fitness creator challenge packs.
- Gym or supplement brand milestone badges.
- Campus or company challenges.

Rules:

- Do not put ads in the workout flow.
- Do not sell user health/camera data.
- Keep sponsorships as optional challenge content or card themes.

## What Should Be Free vs Paid

| Feature | Free | Pro | Consumable |
|---|---:|---:|---:|
| Daily workout | Yes | Yes | No |
| Camera rep counting | Yes | Yes | No |
| Basic streak | Yes | Yes | No |
| Basic share card | Yes | Yes | No |
| Premium share cards | Limited | Yes | Card packs |
| One buddy | Yes | Yes | No |
| Multiple buddies | No | Yes | No |
| Squad streaks | Preview | Yes | No |
| Basic challenges | Limited | Yes | Challenge pass |
| Streak repair | Limited earned | More generous | Yes |
| Freeze tokens | Earned | More generous | Yes |
| Advanced stats | No | Yes | No |
| Nudge customization | Basic | Full | No |
| Mascot evolution | Basic | Full | Accessories |

## Server Cost Strategy

The app should remain mostly local until social features require cloud sync.

Local-only:

- Workout sessions.
- Rep counts.
- Streak calculations.
- Coins.
- Mascot state.
- Basic stats.

Cloud-required:

- User profile sync.
- Buddy links.
- Squad streaks.
- Challenge membership.
- Friend completion status.
- Push notification fan-out for friend events.
- Subscription entitlement sync.
- Abuse controls and invite-code uniqueness.

Cost controls:

- Store daily completion status, not every rep event, in the cloud.
- Keep raw camera data entirely on-device.
- Sync one row per user per day for completion.
- Use edge functions only for social fan-out and entitlement validation.
- Cache buddy status locally and refresh on app open or pull-to-refresh.
- Limit free-tier buddy links and challenge creation.
- Rate-limit invite code lookups.
- Avoid realtime subscriptions until the app proves retention.

Suggested Supabase tables:

- `users`
- `user_entitlements`
- `daily_completions`
- `buddy_links`
- `squads`
- `squad_members`
- `challenges`
- `challenge_members`
- `repair_tokens`
- `notification_events`

## Revenue Targets

Early target assumptions:

- Free-to-paid conversion: 2-5%.
- Monthly Pro price: $4.99.
- Annual Pro price: $29.99-$39.99.
- Consumable attach rate: 1-3% of active users monthly.

Example monthly scenarios:

| Monthly Active Users | Paid Conversion | Paying Users | Monthly Pro Revenue at $4.99 |
|---:|---:|---:|---:|
| 1,000 | 2% | 20 | $99.80 |
| 10,000 | 3% | 300 | $1,497 |
| 50,000 | 4% | 2,000 | $9,980 |
| 100,000 | 5% | 5,000 | $24,950 |

This ignores app-store fees, taxes, churn, refunds, and annual-plan discounts. Actual net revenue may be meaningfully lower.

## Key Metrics

### Product Metrics

- Day 1 retention.
- Day 7 retention.
- Day 30 retention.
- Completion rate per active user.
- Average streak length.
- Percentage of users with streak greater than 7 days.
- Notification permission opt-in rate.
- Camera workout completion rate.

### Viral Metrics

- Share card creation rate.
- Share completion rate.
- Invites sent per active user.
- Invite conversion rate.
- Buddy link creation rate.
- Challenge join rate.
- K-factor.

### Monetization Metrics

- Trial start rate.
- Trial-to-paid conversion.
- Free-to-paid conversion.
- Monthly churn.
- Annual-plan share.
- ARPDAU.
- ARPPU.
- LTV.
- Refund rate.
- Streak repair purchase rate.
- Pro upgrade reason.

### Cost Metrics

- Backend cost per MAU.
- Push notification events per DAU.
- Database reads/writes per DAU.
- Edge function invocations per DAU.
- Storage per user.
- Support requests per 1,000 users.

## Pricing Experiments

Run pricing tests only after the app has enough active users to compare behavior.

Experiment 1: Pro price

- A: $3.99 monthly / $24.99 annual.
- B: $4.99 monthly / $34.99 annual.
- C: $7.99 monthly / $49.99 annual.

Measure:

- Trial start rate.
- Trial conversion.
- Churn.
- Revenue per active user.

Experiment 2: Upgrade moment

- A: Offer Pro after 7-day streak.
- B: Offer Pro after first buddy invite.
- C: Offer Pro after first missed day.

Measure:

- Conversion.
- Retention after offer.
- User complaints/refunds.

Experiment 3: Share-card monetization

- A: Free basic card plus Pro themes.
- B: Free basic card plus one-off card packs.
- C: Pro-only animated cards.

Measure:

- Share rate.
- Upgrade rate.
- Viral coefficient.

## Recommended Launch Sequence

### Phase 1: Free Viral Core

Ship:

- Daily workout.
- Rep counter.
- Streak.
- Notifications.
- Completion card.
- Basic mascot.
- Basic Instagram sharing.

Do not monetize yet except maybe a hidden entitlement system.

Goal:

- Validate retention and sharing.

### Phase 2: Pro Foundation

Ship:

- In-app purchase infrastructure.
- Entitlement sync.
- Pro paywall.
- Premium card themes.
- Nudge customization.
- Advanced stats.

Goal:

- Start covering costs without hurting viral sharing.

### Phase 3: Social Monetization

Ship:

- Buddy streaks.
- Squads.
- Challenge creation.
- Friend completion feed.

Monetize:

- One buddy free.
- Squads and larger challenges in Pro.

Goal:

- Turn virality into recurring social retention.

### Phase 4: Consumables and Recaps

Ship:

- Repair tokens.
- Freeze packs.
- Monthly recap cards.
- Premium mascot accessories.

Goal:

- Increase revenue from highly engaged users without forcing payment on everyone.

### Phase 5: Partnerships

Ship:

- Sponsored challenges.
- Creator challenge templates.
- Branded card packs.

Goal:

- Add non-subscription revenue after organic engagement exists.

## Paywall Copy Ideas

### After 7-Day Streak

Headline:

You made it 7 days. Now make it harder to quit.

Benefits:

- Build squad streaks with friends.
- Unlock premium share cards.
- Customize how annoying the app gets.
- Get deeper streak stats.

CTA:

Start Pro

### After First Buddy Invite

Headline:

One buddy is good. A squad is dangerous.

Benefits:

- Add more buddies.
- Create squad streaks.
- Run private challenges.
- Track who showed up today.

CTA:

Unlock Squads

### After Missed Day

Headline:

Your streak can survive this.

Benefits:

- Use repair tokens.
- Earn extra freeze protection.
- See missed-day patterns.

CTA:

Repair Streak

Important:

- Keep this respectful. Pressure can be funny, but payment pressure should not feel exploitative.

## Instagram Growth and Monetization Link

Instagram should not just drive installs. It should also reinforce paid identity.

Content pillars:

- Proof posts: user completion cards, milestone cards, squad wins.
- Challenge posts: "Can you survive 7 days?"
- Mascot posts: aggressive reminder memes.
- Transformation posts: "Day 1 vs Day 30."
- Social pressure posts: buddy streak screenshots.

Paid feature tie-ins:

- Premium milestone card templates.
- Animated story exports.
- Squad challenge badges.
- Monthly recap cards.

Free users should still share with a Just20 watermark. Pro users can unlock richer cards, more styles, and animated exports.

## Risks

### Risk: Paywall kills virality

Mitigation:

- Keep basic sharing free.
- Paywall customization and social depth, not core proof.

### Risk: Streak repair feels predatory

Mitigation:

- Let users earn repairs.
- Limit paid repair frequency.
- Do not shame users on the payment screen.

### Risk: Backend costs grow faster than revenue

Mitigation:

- Keep local-first architecture.
- Sync daily summaries, not raw events.
- Limit free social graph size.
- Add Pro limits for large squads and challenges.

### Risk: Social features need moderation

Mitigation:

- Keep early social features private by invite code.
- Add report/block before public leaderboards.
- Avoid global chat.

### Risk: App-store rejection or user complaints over notification tone

Mitigation:

- Add tone controls.
- Use clear notification permission copy.
- Avoid abusive or discriminatory copy.

## Immediate Implementation Tasks

- [ ] Add entitlement model: free, pro monthly, pro annual.
- [ ] Choose in-app purchase provider.
- [ ] Add a simple paywall screen.
- [ ] Add premium share-card theme gates.
- [ ] Add notification intensity settings.
- [ ] Add backend tables for users, entitlements, completions, buddies, and squads.
- [ ] Add analytics events for share, invite, completion, streak milestone, paywall view, trial start, subscription start, repair purchase.
- [ ] Add server-cost dashboard.
- [ ] Add App Store and Play Store subscription metadata.
- [ ] Update privacy policy to describe local camera processing and optional cloud social sync.

## First Paid Feature Recommendation

Start with Pro share-card customization plus nudge controls.

Reason:

- It does not break the free core loop.
- It supports Instagram growth.
- It is simple compared with full squad backend monetization.
- It gives paying users visible status without making free users feel blocked.

Second paid feature:

- Squad streaks and challenge creation.

Third paid feature:

- Streak repair and freeze token packs, with strict limits.
