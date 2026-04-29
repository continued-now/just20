# Just 20

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

## Quick start

```sh
npm ci
npm run verify
npm run start
```

## Real-device testing

Expo Go is not enough for Just 20. The workout flow uses native modules (`react-native-vision-camera`, `react-native-fast-tflite`, and worklets), so camera/body-tracking tests must run in a Just 20 development build.

### Android phone over USB

1. Enable Developer Options and USB debugging on the Android phone.
2. Plug the phone into this Mac and approve the trust/debug prompt.
3. Run:

```sh
npm run android:device
```

If more than one physical Android device is connected, run:

```sh
ANDROID_SERIAL=<device-serial> npm run android:device
```

### Android emulator webcam smoke test

The emulator webcam path is useful for smoke tests, but not reliable enough to validate body tracking. Use:

```sh
npm run android:webcam
```

### iPhone

iPhone testing also requires a Just 20 development build. Install full Xcode, open it once to finish setup, plug in the iPhone, tap Trust, then run:

```sh
npm run ios -- --device
```

After the dev build is installed, scan the Metro/dev-client QR from `npm run start`. A QR that uses `just20://...` will not open until the Just 20 dev build exists on the phone.

For native iOS builds, install CocoaPods first and then run `cd ios && pod install`.
