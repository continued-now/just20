# Just20 MVP 3.0: Feature Blocking

## Concept

MVP 3.0 adds an opt-in "Feature Blocking" layer that makes Just20 harder to ignore as the day goes on.

The promise:

> Social media can wait. Your 20 cannot.

The feature should feel like a challenge users choose, not a punishment forced on them. The viral angle is simple: let users vote on how aggressive the app should become when they dodge their 20.

## Product Goal

Make Just20 more effective by increasing friction around procrastination while preserving user trust.

Feature Blocking should:

- Increase daily workout completion.
- Increase notification opt-in.
- Create shareable/funny moments.
- Create content users want to vote on.
- Give Pro a meaningful future monetization surface.

## Core Idea

As the day progresses, Just20 escalates from reminders to commitment pressure.

Early day:

- Funny nudges.
- Mascot mild annoyance.
- "You still have time."

Middle day:

- Loss-framed streak reminders.
- Stronger mascot mood.
- Prompt to start workout.

Late day:

- "Lock-in Mode" prompt.
- In-app gate when opening Just20.
- Optional focus/app-blocking instructions or integrations.
- Social accountability prompt: "Tell your buddy you are dodging it."

## Important Platform Reality

Full app blocking is not straightforward.

iOS:

- Apps generally cannot block other apps directly.
- Possible adjacent routes:
  - Shortcuts automation.
  - Focus Mode guidance.
  - Screen Time instructions.
  - Managed Device / parental-control APIs are not appropriate for a normal consumer fitness app unless carefully approved and scoped.

Android:

- More possible, but still sensitive.
- Possible adjacent routes:
  - Usage Access permission.
  - Accessibility permission.
  - Overlay/persistent prompt.
  - App usage detection.
  - Deep links to Digital Wellbeing settings.

Recommendation:

- Start with opt-in "Lock-in Mode" inside Just20.
- Add guided social-media blocking setup later.
- Avoid claiming Just20 can block all social apps until implementation is real and app-store safe.

## MVP 3.0 Scope

### Free Version

- Progressive nudge ladder.
- Late-day "Lock-in Mode" prompt.
- In-app lock screen when user opens Just20 before completing.
- Social accountability prompt.
- Manual instructions for setting phone app limits.

### Pro Version Later

- Custom nudge intensity.
- Custom blocked-app list guidance.
- More aggressive lock-in schedules.
- Buddy-enforced lock-in.
- Squad penalty mode.
- Premium lock screens and share cards.

## Feature Blocking Ladder

### Stage 1: Casual Reminder

Timing:

- Morning to early afternoon.

Trigger:

- User has not completed today's 20.

Behavior:

- Standard notification.
- Friendly but direct copy.

Example:

> The floor is available whenever you stop negotiating.

### Stage 2: Annoyed Reminder

Timing:

- Midday.

Trigger:

- User has ignored several nudges.

Behavior:

- Stronger notification copy.
- Mascot gets visibly annoyed.
- Home screen status becomes more direct.

Example:

> We both know you saw the last 9 reminders.

### Stage 3: Streak Threat

Timing:

- Evening.

Trigger:

- Current streak is active and workout is incomplete.

Behavior:

- Loss-framed notification.
- Streak at risk card.
- One-tap "Do it now" CTA.

Example:

> Your 14-day streak dies tonight. Dramatic, but accurate.

### Stage 4: Lock-in Mode Prompt

Timing:

- After nudge 10, or after 8pm.

Trigger:

- User has not completed workout.

Behavior:

- Ask user to opt into stronger enforcement.
- Explain what will happen.

Example:

> Lock-in Mode?
> We will make ignoring this more annoying until your 20 are done.

Options:

- "Lock me in"
- "Not today"

### Stage 5: Feature Blocking Lite

Timing:

- After opt-in.

Behavior:

- When opening Just20, user sees a full-screen gate:
  - current streak
  - time left
  - "Start workout"
  - "I accept shame" dismiss option
- Show optional instruction card:
  - "Block Instagram for 30 minutes"
  - "Open Screen Time"
  - "Open Digital Wellbeing"

Important:

- Do not trap users.
- Always include a clear dismiss or settings path.
- Keep the tone funny, not abusive.

### Stage 6: Social Pressure

Timing:

- Late day if still incomplete.

Behavior:

- Prompt user to notify buddy or group.
- Optional share card:
  - "I am dodging my 20."
  - "Hold me accountable."

Example:

> Tell your buddy you are currently losing to the floor.

## User Voting Marketing Angle

The feature should be built in public with user voting.

Main content idea:

> We are adding Lock-in Mode. How annoying should Just20 get after Nudge 10?

Voting formats:

- Instagram Story polls.
- TikTok comment voting.
- X polls.
- Reddit feedback threads.
- In-app poll later.

Poll examples:

1. What should happen after Nudge 10?
   - More aggressive notifications
   - Lock-in Mode
   - Shame card
   - Buddy alert

2. Should Just20 block social media until your pushups are done?
   - Yes, save me from myself
   - No, I am weak but free

3. Which app should Just20 roast first?
   - Instagram
   - TikTok
   - YouTube
   - X

4. What should the button say when you refuse?
   - "I accept shame"
   - "I fear the floor"
   - "Let me be weak"
   - "Tomorrow me can suffer"

5. How brutal should Lock-in Mode be?
   - Gentle
   - Annoying
   - Unhinged
   - Legally questionable

## Viral Post Concepts

### Post 1: Feature Announcement

Hook:

> We might add a feature that blocks social media until you do 20 pushups.

Structure:

1. Show Just20 notification.
2. Show user ignoring it and opening Instagram.
3. Cut to proposed lock screen.
4. Ask viewers to vote.

CTA:

> Should this be allowed? Vote in comments.

KPI:

- Comments per 1,000 views.
- Saves.
- Shares.
- Poll responses.

### Post 2: User Voting

Hook:

> You decide how annoying this app gets.

Structure:

1. Show four possible punishments.
2. Ask viewers to rank them.
3. Promise to build the winner.

CTA:

> Comment 1, 2, 3, or 4.

KPI:

- Comment rate above 2%.
- At least 100 votes before implementation.

### Post 3: Prototype Demo

Hook:

> I ignored 10 reminders. Then Just20 did this.

Structure:

1. Screen recording of reminders.
2. Show Lock-in Mode.
3. Show pushup counter.
4. Show completion card.

CTA:

> Would this make you do your 20?

KPI:

- 3-second hold above 55%.
- Share rate above 1%.
- Install/waitlist conversion.

### Post 4: Social App Roast

Hook:

> Instagram is not blocked. You are just being called out.

Structure:

1. User opens social app.
2. Just20 reminder appears.
3. User does pushups.
4. App says "That was not so hard."

CTA:

> Tag someone who needs this.

KPI:

- Tags/comments per 1,000 views.

## MVP Implementation Ideas

### Phase A: No Real App Blocking

Build first:

- Nudge counter awareness.
- Lock-in Mode opt-in screen.
- Late-day in-app gate.
- User voting content.
- Manual blocking guide.

Why:

- Fast to build.
- Low app-store risk.
- Enough for viral demo.
- Lets users validate demand.

### Phase B: Guided Blocking Setup

Add:

- iOS Screen Time guide.
- iOS Focus guide.
- Android Digital Wellbeing guide.
- One-tap deep links where available.

Why:

- Gives users a practical path without risky permissions.

### Phase C: Android Experimental Blocking

Only if demand is strong:

- Usage Access detection.
- Optional overlay or redirect.
- Clear consent and settings.
- Android-only beta.

Why:

- More technically possible, but higher risk and support burden.

## Product Safety Rules

- Feature Blocking must be opt-in.
- User can always turn it off.
- No permanent lockouts.
- No blocking emergency/system apps.
- No health or medical claims.
- No body-shaming.
- No dark-pattern purchase pressure.
- Keep the joke aimed at procrastination, not the user as a person.

## Success Metrics

### Product KPIs

- Lock-in prompt view rate.
- Lock-in opt-in rate.
- Completion rate after Lock-in prompt.
- Completion rate after Nudge 10.
- Notification permission opt-in rate.
- Day 7 retention.
- Settings disable rate.

Targets:

- Lock-in opt-in: 20-35% of eligible users.
- Completion after Lock-in prompt: 40%+.
- Disable rate: under 10%.
- Day 7 retention lift: +10-20% relative.

### Marketing KPIs

- Poll responses.
- Comments per 1,000 views.
- Shares per 1,000 views.
- Waitlist/install clicks from voting posts.
- Creator replies.

Targets:

- 100+ votes before building.
- 2%+ comment rate on voting posts.
- 1%+ share rate on prototype posts.
- 10 creator replies if pitched as a challenge.

## Week-by-Week Rollout

### Week 1: Validate the Idea Publicly

Actions:

- Post voting content on Instagram/TikTok.
- Ask whether social-media blocking is too much.
- Run Story polls for copy and intensity.
- Collect comments into categories:
  - wants blocking
  - wants funny nudges only
  - app-store/platform concerns
  - privacy concerns
- Create mockups of Lock-in Mode.

KPIs:

- 3 voting posts shipped.
- 100 poll/comment votes.
- 1 post above normal account average views.
- At least 20 qualitative comments.

### Week 2: Build Lock-in Mode Lite

Actions:

- Add opt-in Lock-in Mode prompt.
- Add in-app gate when user opens Just20 late and incomplete.
- Add nudge-stage copy.
- Add setting to turn it off.
- Record prototype demo.

KPIs:

- Feature complete in beta.
- No blocker bugs.
- 10 testers try it.
- 30% tester opt-in.

### Week 3: Prototype Marketing Push

Actions:

- Publish demo: "I ignored 10 reminders. Then this happened."
- Repost tester reactions.
- Ask users to vote on the next escalation.
- Invite creators to try Lock-in Mode.

KPIs:

- 5 posts shipped.
- 1 post above 2,000 views.
- 1%+ share rate on best post.
- 25 beta installs or signups.
- 5 creator replies.

### Week 4: Decide Whether to Expand

Actions:

- Compare completion rate for users who opted into Lock-in Mode vs users who did not.
- Review disable rate and complaints.
- Decide whether to add guided Screen Time/Digital Wellbeing setup.
- Add winning copy from user votes.

KPIs:

- Completion lift measured.
- Disable rate under 10%.
- 20%+ opt-in among eligible users.
- Clear yes/no decision on Phase B.

## Monetization Tie-In

Do not paywall basic Lock-in Mode immediately. It is too valuable as a viral hook.

Free:

- Basic Lock-in Mode.
- Default escalation ladder.
- In-app gate.

Pro later:

- Custom intensity.
- Buddy-enforced lock-in.
- Squad penalty mode.
- Custom blocked-app guides.
- Premium lock screens.
- Advanced completion analytics.

Upsell line:

> Make it harder to quit.

## Final Recommendation

Build MVP 3.0 as "Lock-in Mode Lite," not true app blocking at first.

The viral promise can still be:

> Should Just20 block your social media until your 20 are done?

But the first shipped version should be:

- opt-in,
- in-app,
- funny,
- dismissible,
- measurable,
- and safe for app-store review.

If users vote strongly for real blocking and opt-in data proves it improves completion, explore platform-specific blocking next.
