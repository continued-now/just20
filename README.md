# just20

Force yourself to do 20 pushups, repeatedly, every day.

Cross-platform iOS + Android app built with Expo (React Native). On-device pose estimation via MoveNet/TFLite — no cloud required.

## Core features
- Front camera + on-device push-up counting with form validation
- 20 random nudge notifications daily, escalating in aggression
- Emoji mascot that gets progressively angrier as the day goes on
- Streak tracking with freeze mechanics
- Shareable completion cards for TikTok / Instagram

## Stack
- Expo (bare workflow) + Expo Router v3
- react-native-vision-camera v4 + react-native-fast-tflite (MoveNet Lightning)
- expo-notifications
- expo-sqlite + drizzle-orm
- NativeWind (Tailwind for RN)
- react-native-reanimated 3 + Lottie
