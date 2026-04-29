# Just 20 Tracking Performance and Licensing Audit

## Executive Summary

Just 20 should keep the current on-device camera stack: VisionCamera frame processors, TensorFlow Lite, MoveNet SinglePose Lightning, and native frame resizing. This is commercially reasonable based on the direct dependency licenses and it matches the pattern used by screen-time-for-pushups competitors: front-camera pose detection, local exercise verification, calibration guidance, and a strict no-cheat loop.

The most important reliability improvement is not adding a heavier model immediately. It is making the existing model stricter about when a rep is allowed to count, lighter per inference, and more resilient when tracking temporarily drops.

## Pushscroll / Competitor Tracking Notes

Publicly available Pushscroll materials do not disclose the exact model or SDK. The App Store listing says Pushscroll uses pose detection to count reps and supports pushups/squats as screen-time unlock actions:

- https://apps.apple.com/us/app/pushscroll-screen-time-control/id6741765734

Observed product pattern to emulate:

- Use camera-based pose detection rather than manual counting.
- Make tracking feel like a gate: reps unlock something, so false positives are more damaging than slightly slower counting.
- Keep detection on-device where possible and be explicit about camera privacy.
- Give setup guidance: camera facing the user, full body visible, good lighting, fitted clothing.
- Expect edge cases. App Store reviews mention undercounting and occasional poor-form acceptance, which suggests we should bias Just 20 toward confidence-gated counting and clear recalibration.

Related competitors reinforce the same pattern:

- Repscroll says its front camera tracks pushup time and verifies form: https://repscroll.com/
- PushLock says camera AI counts reps on-device with no video stored/sent: https://pushlockapp.com/

## Current Just 20 Stack

| Layer | Current choice | Why it fits |
| --- | --- | --- |
| Camera | `react-native-vision-camera` | High-performance native camera with frame processors. |
| Inference | `react-native-fast-tflite` | Runs bundled `.tflite` models on-device from React Native. |
| Frame prep | `vision-camera-resize-plugin` | Native/GPU/SIMD resize and RGB conversion before inference. |
| Pose model | MoveNet SinglePose Lightning | Built for latency-sensitive fitness-style movement tracking. |
| Rep logic | Local elbow-angle phase state | Minimal, explainable, and fast enough to run every inference. |

MoveNet SinglePose is designed for movement/fitness activities. The model card says Lightning can run over 50 FPS on most modern laptops, Thunder is more accurate but slower, and the model is licensed under Apache License 2.0:

- https://storage.googleapis.com/movenet/MoveNet.SinglePose%20Model%20Card.pdf

TensorFlow’s MoveNet guide says Lightning is intended for latency-critical use cases and MoveNet variants run faster than real time on many devices:

- https://tensorflow.google.cn/hub/tutorials/movenet?hl=en

## Changes Implemented

| Area | Change | Expected impact |
| --- | --- | --- |
| Input buffer | Use `uint8` resize output unless the loaded model reports `float32`. | Cuts pose input buffer size vs always using `float32`, reducing per-frame allocation/copy work. |
| Rep reliability | Added confidence and tracking-quality gates before a frame can move the rep state machine. | Reduces false positives from partial bodies, background people, or shaky frames. |
| Test mode strictness | Monthly test mode uses a higher confidence threshold. | Keeps benchmark/test reps stricter than normal daily reps. |
| Crop recovery | Primary crop unlocks and recenters after sustained tracking loss. | Recovers when the user leaves/re-enters frame without requiring a manual restart. |
| Secondary tracking | Tapped secondary body inference is throttled separately. | Prevents the optional second skeleton from doubling inference load every active frame. |
| Calibration text | Updated setup guidance around front-facing camera, full body, lighting, and fitted clothing. | Mirrors competitor setup guidance while keeping the UI simple. |

## Commercial License Position

This is not legal advice, but the direct tracking stack is commercially friendly:

| Component | Checked license | Commercial-use posture |
| --- | --- | --- |
| MoveNet SinglePose model | Apache-2.0 | Commercial use generally allowed with notice/license obligations. |
| `react-native-vision-camera` | MIT | Commercial use generally allowed with notice/license obligations. |
| `react-native-fast-tflite` | MIT | Commercial use generally allowed with notice/license obligations. |
| TensorFlow Lite runtime | Apache-2.0 | Commercial use generally allowed with notice/license obligations. |
| `vision-camera-resize-plugin` | MIT | Commercial use generally allowed with notice/license obligations. |
| `react-native-worklets-core` | MIT | Commercial use generally allowed with notice/license obligations. |

Before App Store / Play Store release, add a full third-party notices screen or bundled notices file. The current lockfile includes mostly MIT/Apache/BSD/ISC licenses, but also some transitive MPL-2.0 build/runtime packages and a few unknown/unlicense entries. Those are not in the direct pose-tracking stack, but they should be reviewed before monetization.

## Remaining Improvement Opportunities

1. Test MoveNet Thunder as an optional accuracy mode for strong devices. Use it only if measured inference stays under the frame budget.
2. Add a small in-app tracking diagnostics mode hidden behind dev settings: inference ms, update FPS, model input type, tracking quality.
3. Build a pose replay test harness with a small set of consenting test clips, then regression-test false positives/false negatives before every release.
4. Consider MediaPipe/BlazePose later if Just 20 needs richer 33-point form analysis, but only after checking model/license terms and native integration cost.
5. Add formal third-party notices generation before commercial launch.
