# Just 20 Design Language

## North Star
Just 20 should feel like a tiny daily reward toy: playful, warm, readable, and a little mischievous. The system should avoid generic fitness-app coldness and avoid casino-like pressure. The visual center is the green toggle logo, cream surfaces, chunky rounded cards, XP/streak warmth, and cute reward motion.

## Core Tokens
- Brand green: `#58CC02`
- Brand dark: `#3F9700`
- Cream page: `#FFF8DF`
- Cream card: `#FFFDF2`
- Ink: `#21321E`
- Muted text: `#697865`
- Streak orange: `#FF9F1C`
- Action blue: `#1CB0F6`
- Reward yellow: `#FFD43B`
- Pink accent: `#FF5D8F`

## Shape And Layout
- Use large rounded cards as the default surface: native `radius.lg`, web `1.6rem-2.4rem`.
- Use pill buttons for lightweight actions and chunky rounded rectangles for primary app actions.
- Keep page padding generous, especially near safe areas and bottom tabs.
- Use cream/green/soft-orange surfaces instead of pure white whenever possible.

## Typography
- Web uses `Nunito` for most text and `Fredoka` as a playful accent.
- Native currently uses platform fonts, so compensate with heavier weights, short lines, clear hierarchy, and rounded cards.
- Headlines should be bold, tight, and friendly. Body copy should stay spacious and easy to scan.

## Color Usage
- Green means brand, progress, completion, and primary positive action.
- Orange means streak, urgency, XP, and daily heat.
- Blue means recovery, patched days, and utility/help moments.
- Pink/red should be reserved for warnings, errors, or high-energy accents.
- Dark cards should use `colors.darkCard`, not raw black.

## Motion
- Use motion as a reward cue, not as constant noise.
- Badge unlocks can use anticipation, reveal, and afterglow.
- Landing pages can use ambient float/glow animation, but app flows should stay fast and snappy.
- Always keep animations finite for reward moments and avoid blocking the user longer than necessary.

## Copy Tone
- Speak to the athlete, not the builder.
- Use user-facing words like "squad", "check-ins", "proof card", "streak", and "camera tracking".
- Avoid surfaced internal terms like "backend", "local-first", "prototype", "dev build", or "growth loop".
