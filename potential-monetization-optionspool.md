# Just20 Potential Monetization Options Pool

## Idea: Put Money On It

This document explores a future monetization path where users opt into paid accountability challenges. The core emotional hook is simple:

> If you say you will do it, put money on it.

Users would commit money into a challenge pool. People who complete the challenge share the prize pool. People who fail lose eligibility. Sponsors can increase the prize pool or subsidize entry in exchange for branded challenge exposure.

This should not be MVP monetization. It should be considered only after Just20 has enough real usage data to understand completion behavior, failure rates, retention, fraud risk, and whether users want financial stakes.

## Short Opinion

The idea is strong from a behavior and marketing perspective, but risky from a legal, App Store, payments, and trust perspective.

The strongest version is not "pay $5, maybe win more." That can look like gambling, a lottery, or regulated real-money gaming depending on structure and location.

The safer version is:

- Skill-based fitness accountability challenge.
- Clear rules.
- Objective completion criteria.
- No random winner selection.
- No misleading earnings claims.
- Sponsor-funded bonus pool where possible.
- User entry treated carefully with legal review.
- Geofenced availability if needed.
- Strong anti-fraud controls.
- Apple App Store compliance review before launch.

This could become a major growth and revenue lever, but only after the product has enough users and proof that the challenge format works without cash.

## Why This Could Work

Just20 already has the right ingredients:

- Daily measurable behavior.
- Camera-based proof of work.
- Streak loss aversion.
- Escalating nudges.
- Shareable completion proof.
- Challenge identity.
- Social pressure.

Money adds a new layer of commitment. For some users, a $5 commitment will create more accountability than notifications alone. For sponsors, a 30-day challenge creates repeated exposure instead of a one-time ad impression.

## Core Model

Example:

- 5,000 users join a 30-day challenge.
- Each user commits $5.
- Gross entry pool: $25,000.
- Platform fee: $2,500.
- Prize pool: $22,500.
- Users must complete the required daily task for 30 days.
- Users who miss without an allowed freeze lose eligibility.
- Remaining eligible users split the prize pool.

If 2,250 users complete the challenge, each receives $10.

If 4,500 users complete the challenge, each receives $5.

If almost everyone completes, the payout can be close to or below the original entry amount unless sponsor money is added.

## Sponsor-Boosted Version

The sponsor version is more attractive and safer for the user story.

Example:

- 5,000 users enter at $5.
- Entry pool: $25,000.
- Sponsor contributes $5,000.
- Platform keeps a fixed fee or a share, such as $2,500.
- Prize pool becomes $27,500.
- If 2,750 users complete, each receives $10.
- Sponsor receives 30 days of branded challenge exposure.

The sponsor could appear in:

- Challenge landing page.
- Challenge title image.
- Completion card watermark.
- Daily challenge status screen.
- Leaderboard header.
- Post-challenge recap card.

The ad should feel like part of the event, not a banner ad. A subtle watermark is the right direction.

## The Best Positioning

Do not position this as gambling or passive winnings.

Position it as:

- "Commitment challenge."
- "Accountability pool."
- "Finishers split the pool."
- "Complete the challenge, earn your share."
- "Sponsor-boosted prize pool."

Avoid:

- "Bet on yourself."
- "Win cash."
- "Make money doing pushups."
- "Guaranteed profit."
- "Turn $5 into $50."

The product should sell discipline and accountability, not easy money.

## Major Risks

### 1. App Store Risk

Apple's App Review Guidelines treat gambling, contests, sweepstakes, lotteries, and real-money gaming as highly regulated. Apple says these features should only be included after fully vetting legal obligations, and that review may take extra time. Apple's rules also say contests/sweepstakes need official rules, must make clear Apple is not involved, and apps may not use in-app purchase to buy credit or currency for real-money gaming.

Implication:

- Do not assume this can bypass Apple fees casually.
- Do not sell in-app "challenge credits" if those credits connect to real-money payouts.
- Do not launch this without App Store and payments counsel.
- Expect extra App Review scrutiny.

Source: [Apple App Review Guidelines, section 5.3](https://developer.apple.com/appstore/resources/approval/guidelines.html)

### 2. Gambling / Lottery / Contest Risk

A paid prize pool can trigger gambling, lottery, sweepstakes, or contest rules depending on jurisdiction.

The key distinction is usually:

- Chance-based prize: higher risk, often requires no purchase necessary or heavy compliance.
- Skill-based contest: potentially more viable, but rules still vary by state/country.
- Real-money gaming: highest risk and may require licensing/geofencing.

Just20 should avoid random prize selection. Winners should be determined by objective completion of a defined fitness challenge.

Source: [FTC Lottery & Sweepstakes resources](https://www.ftc.gov/lottery-sweepstakes)

### 3. Payment Processing Risk

Stripe, PayPal, Apple, and other processors may restrict gambling, betting, cash prizes, stored value, or money transmission-like flows.

This model may require:

- A payments provider that supports contest payouts.
- Identity verification for winners.
- Tax reporting.
- Fraud review.
- Chargeback handling.
- Clear refund rules.

### 4. Tax and Reporting Risk

Cash prizes can create tax obligations for users and the business.

Potential needs:

- Winner tax forms.
- Annual reporting thresholds.
- Prize terms.
- Sponsor invoice handling.
- Revenue recognition split between platform fee and prize liability.

### 5. Fraud Risk

Once cash is involved, people will try to cheat.

Risks:

- Fake rep completion.
- Multiple accounts.
- Device clock manipulation.
- Shared accounts.
- Bot signups.
- Chargebacks after losing.
- Collusion.
- Users exploiting freeze rules.

Cash challenges require stricter proof than normal Just20.

## When To Consider This

Do not build this until the app has enough data.

Minimum gates:

| Gate | Target Before Cash Pools |
|---|---:|
| Monthly active users | 10,000+ |
| 30-day active users with 7+ completions | 2,000+ |
| Day 7 retention | 20%+ |
| Day 30 retention | 10%+ |
| Share rate after completion | 10%+ |
| Free challenge join rate | 20%+ of active users |
| Free 30-day challenge completion rate | Known from at least 2 cohorts |
| Failed despite nudges rate | Measured |
| Camera completion fraud reports | Low |
| Support burden | Manageable |

The most important number is not total users. It is how many users start a challenge and fail despite nudges. That determines whether the prize economics and accountability value are real.

## Data Needed First

Before launching money pools, track:

- Challenge start rate.
- Challenge completion rate.
- Daily drop-off curve.
- Failure reasons.
- Freeze usage rate.
- Completion time of day.
- Number of nudges before completion.
- Users who complete only after high-intensity nudges.
- Users who ignore all nudges.
- Share rate from challenge screens.
- Invite conversion from challenge cards.
- Fraud flags.
- Support complaints.

Useful derived metrics:

- Expected finisher count.
- Expected payout per finisher.
- Expected platform fee.
- Expected sponsor exposure.
- Cost per completed challenge.
- Challenge-driven retention lift.
- Challenge-driven invite rate.

## MVP Before Money: Free Commitment Challenges

Build the behavior before adding cash.

### Phase 1: Free 7-Day Challenge

Rules:

- Join free.
- Complete Just20 daily for 7 days.
- Streak freezes do not count as completion.
- Finishers earn a badge and share card.
- Invite friends into the same challenge.

KPIs:

- Join rate from active users: 20%+
- Day 7 challenge completion: 25%+
- Share rate from finishers: 20%+
- Invites per challenger: 0.5+

### Phase 2: Sponsored Free Challenge

Rules:

- Sponsor pays a flat fee.
- Users enter free.
- Finishers receive non-cash rewards, discounts, merch raffle, or app currency.
- Sponsor appears on challenge surfaces.

KPIs:

- Sponsor impressions per user.
- Completion card shares.
- Cost per engaged participant.
- Sponsor renewal interest.

### Phase 3: Deposit-Like Commitment Test Without Cash Prize

This requires legal review, but is simpler than a prize pool.

Possible structure:

- User pays $5 to enter a 30-day challenge.
- If they complete, they receive Pro credit, merch credit, or a sponsor reward.
- If they fail, no cash payout occurs.

This tests willingness to put money behind commitment without immediately creating a pooled cash prize.

## Cash Pool Version

Only consider after free and sponsored challenges work.

### Challenge Rules

Example challenge:

- Duration: 30 days.
- Entry: $5.
- Required action: one verified Just20 workout per day.
- Streak freezes: not accepted for prize eligibility.
- Grace period: optional, but should be explicit.
- Winners: all users who complete every required day.
- Payout: prize pool divided equally among finishers.
- Sponsor bonus: added to prize pool or partly retained as sponsorship revenue.

### Payout Math

Basic formula:

```
gross_entry_pool = entry_fee * participants
platform_fee = gross_entry_pool * platform_take_rate
base_prize_pool = gross_entry_pool - platform_fee
sponsor_bonus = sponsor_contribution * prize_pool_allocation
total_prize_pool = base_prize_pool + sponsor_bonus
payout_per_finisher = total_prize_pool / finishers
```

Example:

| Metric | Value |
|---|---:|
| Participants | 5,000 |
| Entry fee | $5 |
| Gross entry pool | $25,000 |
| Platform fee | 10% / $2,500 |
| Base prize pool | $22,500 |
| Sponsor contribution | $5,000 |
| Sponsor amount added to prize pool | $5,000 |
| Total prize pool | $27,500 |
| Finishers | 2,750 |
| Payout per finisher | $10 |

### The Important Economic Truth

Users only reliably walk away with more than they put in if:

- Enough people fail, or
- A sponsor adds money to the prize pool, or
- The platform lowers its fee, or
- Rewards are non-cash and sponsor-subsidized.

Do not promise users they will make money. The honest promise is:

> Finishers split the pool. Sponsor boosts can make the pool larger.

## Sponsorship Model

### Sponsorship Package

Starter offer:

- $2,500 to $5,000 for one 30-day challenge.
- Sponsor logo on challenge page.
- Subtle watermark on completion cards.
- Sponsor mention in challenge announcement.
- Post-campaign report.

Premium offer:

- $10,000+ for category exclusivity.
- Branded challenge name.
- Sponsor-funded prize boost.
- Custom badge.
- Creator integration.
- Recap video or highlight reel.

### Sponsor Metrics

Report:

- Challenge participants.
- Daily active challenge users.
- Total challenge screen impressions.
- Completion card shares.
- Estimated social reach.
- Completion rate.
- Average days active per participant.
- Clicks to sponsor link, if included.
- Cost per engaged participant.

### Sponsor Fit

Good sponsor categories:

- Fitness apparel.
- Protein/snack brands.
- Hydration brands.
- Gym chains.
- Fitness creators.
- Wearables.
- Productivity brands.
- Men's health / wellness brands, handled carefully.

Avoid early:

- Gambling.
- Alcohol.
- Payday lending.
- Extreme supplement claims.
- Anything that weakens trust.

## Product Requirements

Cash or sponsor-backed challenges need:

- Challenge creation/admin system.
- Challenge rules engine.
- Verified daily completion ledger.
- Fraud flags.
- Eligibility state.
- Prize pool display.
- Sponsor asset management.
- Payment collection.
- Payouts.
- Refund policy.
- Terms acceptance.
- Support tools.
- Dispute resolution.
- Audit logs.

## Fraud Controls

Required before cash:

- Server-side daily completion records.
- Device clock tamper detection.
- One account per user controls.
- Phone/email verification.
- Optional identity verification for payouts.
- Camera proof confidence score.
- Suspicious completion review.
- Rate limits.
- Chargeback lockout.
- No offline completion for prize eligibility unless synced before a deadline.

## User Experience

Challenge screen should show:

- Days remaining.
- Completion status today.
- Prize pool.
- Number of active participants.
- Estimated payout range.
- Rules.
- Sponsor badge if sponsored.
- "Apple is not a sponsor" disclosure where required.
- Tax/legal disclaimer where required.

Copy examples:

- "30 days. No freezes. Finishers split the pool."
- "Complete today to stay eligible."
- "Prize pool boosted by [Sponsor]."
- "Your $5 is not a lottery ticket. You earn eligibility by completing the challenge."
- "Miss today and you are out of the cash pool."

## Recommended Roadmap

### Stage 1: Instrumentation

Add analytics for:

- Nudge count before completion.
- Failure despite nudges.
- Challenge joins.
- Challenge completions.
- Freeze usage.
- Share and invite conversion.

### Stage 2: Free Challenges

Launch 7-day and 30-day free challenges.

Goal:

- Prove people want the challenge structure.
- Measure completion rates.
- Learn whether challenges increase retention.

### Stage 3: Sponsor-Backed Free Challenge

Run one sponsor-backed challenge with no user entry fee.

Goal:

- Sell the engaged-user exposure.
- Validate branded completion cards.
- Build a sponsor case study.

### Stage 4: Legal and Payment Review

Before any cash pool:

- Hire sweepstakes/contest/gaming counsel.
- Review App Store rules.
- Review payment processor rules.
- Decide allowed jurisdictions.
- Create official rules template.
- Define tax/reporting process.

### Stage 5: Small Cash Pilot

Run a limited invite-only pilot.

Constraints:

- Small participant cap.
- One jurisdiction if needed.
- Clear rules.
- Manual fraud review.
- Manual support coverage.
- Sponsor-funded bonus preferred.

### Stage 6: Scale If Metrics Work

Scale only if:

- Fraud is manageable.
- Support is manageable.
- App Review is stable.
- Users understand the rules.
- Sponsor ROI is clear.
- Challenge users retain better than normal users.

## Open Questions

- Is this a skill contest, sweepstakes, gaming product, or something else legally?
- Can users pay entry through Apple, or must this be web-based?
- If web-based, does Apple permit linking or steering for this use case?
- Which jurisdictions are allowed?
- Are cash payouts allowed by the chosen payment processor?
- What identity checks are required before payout?
- What happens if the app's rep counter incorrectly fails a user?
- How are refunds handled?
- What happens if a user chargebacks after losing?
- Do users prefer cash prizes, sponsor rewards, Pro credits, or social status?

## Recommendation

Treat "put money on it" as a high-upside future monetization track, not the next thing to build.

The best path is:

1. Build free challenge mechanics.
2. Measure failure and completion rates.
3. Add sponsor-backed free challenges.
4. Use sponsor money to increase rewards.
5. Only then test user-funded pools with legal review.

The sponsor-funded version is probably the cleanest business path. It lets users feel like the prize pool is bigger than what they contributed, gives sponsors repeated exposure, and reduces the need to frame the app as real-money gaming.

If this works, it could become Just20's strongest monetization engine: users get accountability, sponsors get repeated attention, and Just20 earns from running the challenge economy.

## Updated Direction: No Cash Prize Pool

The better model is not a cash prize pool. It is a paid commitment challenge with sponsor-funded perks.

User flow:

- User pays a small commitment fee, such as $5.
- User joins a 30-day sponsored challenge.
- If the user completes the challenge, they receive a partial refund, app credit, or reward value.
- Sponsor provides exclusive discount codes, product samples, protein drinks, merch, or other perks.
- Sponsor pays Just20 for repeated exposure to highly engaged users.
- Just20 keeps the challenge operating margin and sponsorship revenue.

This is cleaner than a pooled payout because users are not competing for each other's lost money. The user pays to create commitment, then gets a meaningful reward if they finish.

Example:

| Item | Amount |
|---|---:|
| Participants | 5,000 |
| User commitment fee | $5 |
| Gross user commitment revenue | $25,000 |
| Completion rebate | $3 |
| Completion rate | 60% |
| Rebate cost | $9,000 |
| Net commitment revenue | $16,000 |
| Sponsor fee | $10,000-$25,000 |
| Gross challenge revenue | $26,000-$41,000 |

The user story becomes:

> Pay $5 to prove you will finish. Complete the challenge and get $3 back plus sponsor rewards worth more than the remaining $2.

This is easier to explain than "you might win money." It also supports sponsor ROI because the sponsor is getting a motivated, repeated-engagement audience.

## Category-Exclusive Sponsorship Model

At around 100,000 MAU, category exclusivity becomes sellable if challenge participation and completion are strong.

The sponsor is not buying all app attention. They are buying category exclusivity across commitment challenges. For example, one protein powder company can become the exclusive protein sponsor for three consecutive 30-day challenges.

### Recommended Deal Structure

Package:

- 3-month commitment.
- 3 sponsored 30-day challenges.
- Category exclusivity during the term.
- One primary challenge per month.
- Sponsor branding on eligible challenge surfaces.
- Sponsor discount or reward for finishers.
- Monthly performance report.

Example categories:

- Protein powder.
- Ready-to-drink protein.
- Hydration.
- Gym apparel.
- Wearables.
- Supplements, with careful claims review.
- Gym chain / local fitness franchise.

Avoid overlapping categories. For example:

- Do not sell two protein powder sponsors at the same time.
- A protein powder sponsor and hydration sponsor can coexist.
- An apparel sponsor and protein sponsor can coexist.

### What Sponsors Might Pay at 100,000 MAU

These ranges assume Just20 can show meaningful challenge participation, completion, daily engagement, and share-card distribution.

| Sponsor Tier | Monthly Challenge Participants | 3-Month Category Exclusive Fee |
|---|---:|---:|
| Case-study deal | 2,500-5,000 per month | $10,000-$25,000 |
| Solid category exclusive | 5,000-10,000 per month | $25,000-$75,000 |
| Strong proven package | 10,000-20,000 per month | $75,000-$150,000 |
| Breakout / high-conversion category | 20,000+ per month | $150,000-$300,000+ |

At 100,000 MAU, a realistic starting ask for a protein company would be:

- $15,000-$25,000 for 3 months as a discounted first case-study deal.
- $50,000-$75,000 for 3 months after challenge slots consistently fill.
- $100,000+ for 3 months after Just20 proves strong engagement, social reach, and sponsor-attributed sales.
- $150,000-$300,000 for 3 months only if the app has 20,000+ monthly sponsored challenge entrants, high redemption, and real viral reach.

The strongest pricing argument is not MAU. It is participant-days.

Example:

- 10,000 monthly challenge participants.
- 30-day challenge.
- 65% average daily active challenge engagement.
- 195,000 monthly participant-days.
- 585,000 participant-days across 3 months.
- Plus completion cards, push/email surfaces, and sponsor code redemptions.

That is more valuable than a one-off ad campaign because the sponsor is repeatedly attached to the user's discipline ritual.

Pricing intuition:

- A $50,000 sponsor fee on 585,000 participant-days is about $0.085 per participant-day.
- A $100,000 sponsor fee on 585,000 participant-days is about $0.17 per participant-day.
- A $150,000 sponsor fee on 1,000,000+ participant-days becomes plausible if social sharing and sponsor code redemption are strong.

The sponsor fee should move up only when Just20 can prove that challenge users are not passive impressions. They are repeatedly opening the app, seeing the sponsor, completing workouts, sharing branded proof, and redeeming the sponsor offer.

### Challenge Inventory at 100,000 MAU

Do not run unlimited sponsored challenges. Scarcity makes the inventory valuable and keeps the user experience clear.

Recommended live inventory:

| Challenge Type | Concurrent Count | Purpose |
|---|---:|---|
| Sponsored category challenge | 3 | Revenue and scarcity |
| Evergreen paid commitment challenge | 1 | Overflow monetization |
| Free monthly challenge | 1 | Top-of-funnel growth |
| Private friend/squad challenges | Unlimited within limits | Viral loop |

This gives the app 5 visible challenge lanes without making the product feel like an ad marketplace.

### Category Limited Concurrent Model

Run only three sponsored categories at a time.

Example month:

- Protein Challenge by Brand A.
- Hydration Challenge by Brand B.
- Apparel Challenge by Brand C.
- Just20 Open Challenge, not sponsored.
- Free Community Challenge.

Each sponsored challenge has limited slots.

Suggested cap at 100,000 MAU:

- 2,500 slots for first sponsor tests.
- 5,000 slots for reliable sponsors.
- 10,000 slots for strong sponsors.
- 15,000+ only when support, fraud, and sponsor reporting are proven.

Scarcity copy:

- "5,000 slots."
- "This month's protein challenge is full."
- "Join the waitlist for next month."
- "Sponsor rewards reserved for finishers."

### User Allocation Rules

To avoid confusion and burnout:

- A user can join only one paid commitment challenge at a time.
- A user can join one sponsored challenge and one free/community challenge at the same time only if the daily requirement is the same.
- A user cannot stack multiple sponsor rewards from the same workout unless explicitly allowed.
- Private squad challenges can run in parallel, but should inherit the user's main completion.

This keeps the product simple:

> Do your Just20 today. That one completion advances your streak, your challenge, and your squad.

### Overflow Plan For Users Who Miss Sponsored Slots

When a sponsored challenge fills, send users to:

1. Waitlist for the next sponsor challenge.
2. Open paid commitment challenge with no sponsor reward.
3. Free community challenge.
4. Private squad challenge.

The waitlist is useful for sponsors. It proves excess demand.

Sponsor report should include:

- Filled slots.
- Waitlist size.
- Waitlist conversion next month.
- Completion rate.
- Completion card shares.
- Discount redemptions.

### Challenge Economics Without Cash Pool

Example 1: 5,000 slot challenge

| Metric | Value |
|---|---:|
| Entrants | 5,000 |
| User fee | $5 |
| Gross commitment revenue | $25,000 |
| Completion rate | 60% |
| $3 completion rebate cost | $9,000 |
| Payment/platform/support reserve | $3,000 |
| Net commitment margin | $13,000 |
| Sponsor fee | $15,000 |
| Gross margin before fixed costs | $28,000 |

Example 2: 10,000 slot challenge

| Metric | Value |
|---|---:|
| Entrants | 10,000 |
| User fee | $5 |
| Gross commitment revenue | $50,000 |
| Completion rate | 60% |
| $3 completion rebate cost | $18,000 |
| Payment/platform/support reserve | $6,000 |
| Net commitment margin | $26,000 |
| Sponsor fee | $25,000-$50,000 |
| Gross margin before fixed costs | $51,000-$76,000 |

At 100,000 MAU, three category-limited sponsored challenges could look like:

| Category | Slots | Sponsor Fee | Net Commitment Margin | Total |
|---|---:|---:|---:|---:|
| Protein | 10,000 | $40,000 | $26,000 | $66,000 |
| Hydration | 5,000 | $20,000 | $13,000 | $33,000 |
| Apparel | 5,000 | $20,000 | $13,000 | $33,000 |
| Total Monthly | 20,000 | $80,000 | $52,000 | $132,000 |

This is the upside case. It requires strong demand, clean operations, and sponsor proof. A more conservative 100,000 MAU case is one 5,000-10,000 slot sponsor challenge per month producing $25,000-$75,000 gross.

### Sponsor Deliverables

For a 3-month exclusive category deal, include:

- 3 monthly branded challenges.
- Challenge page logo and brand line.
- Sponsor watermark on completion cards.
- Sponsor reward shown on signup screen.
- Sponsor discount code for finishers.
- Optional product sample redemption for finishers.
- Monthly recap report.
- End-of-campaign case study.

Do not include:

- Ads during camera rep counting.
- Sponsor claims in health guidance.
- Forced purchase from sponsor.
- Misleading reward values.

### Sponsor Reporting

Sponsors will renew if reporting is clear.

Report:

- Registered participants.
- Paid participants.
- Waitlist size.
- Completion rate.
- Participant-days.
- Average daily challenge opens.
- Notification interactions.
- Completion card shares.
- Estimated social reach.
- Reward redemptions.
- Discount code conversion.
- Repeat challenge join rate.
- Cost per engaged participant.
- Cost per finisher.

Best headline metric:

> Your brand was attached to 195,000 verified workout days this month.

### Pricing Logic

Price based on engaged participant-days, not just impressions.

Simple formula:

```
sponsor_fee = participant_days * engaged_day_rate + exclusivity_premium
```

Starting assumptions:

- Engaged participant-day rate: $0.05-$0.25.
- Category exclusivity premium: 25%-100%.
- Case-study discount for first sponsor: 30%-50%.

Example:

- 195,000 participant-days.
- $0.10 per participant-day.
- Base value: $19,500.
- 50% exclusivity premium: $9,750.
- Suggested monthly sponsor value: $29,250.
- 3-month deal: about $87,750.

This is why $50,000-$100,000 for a 3-month exclusive category deal becomes plausible once the metrics are proven.

### Sales Strategy

Start with founder-led sales.

Target:

- Challenger protein brands.
- New RTD protein drinks.
- DTC hydration brands.
- Smaller supplement brands that cannot afford huge creator deals.
- Fitness apparel brands that want community proof.

Pitch:

> We do not sell passive impressions. We sell 30 days of repeated exposure while users prove discipline. Your brand becomes the reward for finishing.

Initial offer:

- $15,000-$25,000 for 3 months.
- Limited category exclusivity.
- Case-study pricing.
- Sponsor provides discount/reward.
- Just20 provides challenge operations and report.

Renewal offer:

- $50,000-$75,000 for 3 months if slots fill and reporting is clean.
- $100,000+ for 3 months if 10,000+ monthly paid entrants participate and redemption data is strong.
- $150,000-$300,000 for 3 months only with 20,000+ monthly entrants, strong social reach, and clear sponsor sales lift.
- Add larger challenge caps.
- Add category lockout.
- Add seasonal tentpole challenge.

### Operational Guardrails

Do not sell more inventory than the app can support.

Before running 3 concurrent sponsored challenges:

- Challenge completion ledger must be server-side.
- Payments and rebates must be reliable.
- Sponsor reward codes must be unique or abuse-resistant.
- Support queue must be manageable.
- Fraud rules must be clear.
- Challenge terms must be accepted at signup.
- Sponsor assets must be reviewed before launch.

Before selling category exclusivity:

- Define categories in writing.
- Define exact exclusivity period.
- Define excluded surfaces.
- Define minimum deliverables.
- Define make-good terms if the challenge fails to fill.
- Define sponsor cancellation and brand safety rules.

### Recommended 100,000 MAU Plan

Month 1:

- Run one 5,000-slot protein sponsor challenge.
- Run one open paid commitment challenge.
- Run one free community challenge.
- Goal: prove payment, rebate, reward redemption, and reporting.

Month 2:

- Add hydration sponsor if support is clean.
- Keep protein as exclusive category.
- Cap each sponsored challenge at 5,000-7,500.
- Start waitlists.

Month 3:

- Add third category sponsor, likely apparel or gym.
- Sell 3-month renewal to the strongest category.
- Publish internal case study.

Month 4-6:

- Move to 3 concurrent sponsored categories.
- Sell 3-month exclusivity packages.
- Keep one open challenge for overflow users.
- Keep one free challenge for growth.

Do not exceed three sponsored categories until the challenge dashboard, support tooling, and sponsor reporting are boringly reliable.
