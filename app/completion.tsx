import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import {
  getSessionRecoverySummary,
  getStreak,
  getBestCompletedTime,
  getCompletedDaysThisWeek,
  getCompletedRepsToday,
  getCompletedSetsToday,
  getUserSeed,
  type RecoveryType,
  type SessionRecoverySummary,
  type TrackingMethod,
} from '../lib/db';
import { awardWorkoutXp, getXp, type WorkoutXpReward } from '../lib/xp';
import { syncCompletionToCloud } from '../lib/social';
import { getOrCreateUser } from '../lib/user';
import { buildSharePayload, recordGrowthEvent } from '../lib/growth';
import { evaluateBadgeUnlocks, type BadgeUnlockResult } from '../lib/badges';
import { getDailyQuote } from '../lib/quotes';
import { isMilestoneDay, MILESTONE_COPY } from '../lib/milestones';
import { MilestoneCelebration } from '../components/MilestoneCelebration';
import { BadgeUnlockCelebration } from '../components/BadgeUnlockCelebration';
import { scheduleSharedJust20StatusUpdate } from '../lib/widgetStatus';
import { BrandLogo } from '../components/BrandLogo';
import { devLog } from '../lib/diagnostics';
import { getEquippedCosmetics, getProofCardTheme, type ProofCardThemeId } from '../lib/shop';
import { useGrowthImageShare } from '../hooks/useGrowthImageShare';

const CARD_BG = '#0F0F0F';
const WEEKLY_CHEST_TARGET = 5;
type LocationStatus = 'idle' | 'loading' | 'added' | 'denied' | 'error';
type CompletionLoadResult = {
  streakCurrent: number;
  isPersonalBest: boolean;
  setsToday: number;
  completedRepsToday: number;
  completedDaysThisWeek: number;
  totalSessions: number;
  inviteCode: string;
  dailyQuote: string;
  recoverySummary: SessionRecoverySummary | null;
  reward: WorkoutXpReward | null;
  badgeRewards: BadgeUnlockResult[];
  totalXp: number;
};

export default function CompletionScreen() {
  const {
    reps,
    duration,
    sessionId,
    nudgesUsed,
    mode,
    duelTarget,
    manualAdjustments,
    trackingMethod,
    recoveryType,
    repairedDate,
    targetReps,
  } = useLocalSearchParams<{
    reps: string;
    duration: string;
    sessionId?: string;
    nudgesUsed?: string;
    mode?: string;
    duelTarget?: string;
    manualAdjustments?: string;
    trackingMethod?: TrackingMethod;
    recoveryType?: RecoveryType;
    repairedDate?: string;
    targetReps?: string;
  }>();
  const router = useRouter();
  const shotRef = useRef<ViewShot>(null);
  const rewardEventRunRef = useRef<{
    eventId: string;
    promise: Promise<CompletionLoadResult>;
  } | null>(null);
  const { shareGrowthPayload, visualShareElement } = useGrowthImageShare();

  const repCount = parseInt(reps ?? '20', 10);
  const durationMs = parseInt(duration ?? '0', 10);
  const durationSec = Math.round(durationMs / 1000);
  const nudgeCountAtCompletion = Math.max(0, parseInt(nudgesUsed ?? '0', 10) || 0);
  const manualAdjustmentCount = Math.max(0, parseInt(manualAdjustments ?? '0', 10) || 0);
  const sessionTrackingMethod: TrackingMethod =
    trackingMethod === 'manual' || trackingMethod === 'camera_adjusted' ? trackingMethod : 'camera';
  const sessionRecoveryType: RecoveryType =
    recoveryType === 'streak_patch' || recoveryType === 'debt_set' ? recoveryType : 'none';
  const sessionTargetReps = Math.max(20, parseInt(targetReps ?? '20', 10) || 20);
  const sessionEventId = sessionId
    ? `${mode ?? 'daily'}:${sessionId}`
    : `${mode ?? 'daily'}:${repCount}:${durationMs}:${nudgeCountAtCompletion}:${manualAdjustmentCount}`;
  const workoutMode = mode === 'test' ? 'test' : mode === 'duel' ? 'duel' : 'daily';
  const isTestMode = workoutMode === 'test';
  const isDuelMode = workoutMode === 'duel';
  const duelTargetSec = Math.max(10, parseInt(duelTarget ?? '60', 10) || 60);

  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isPB, setIsPB] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [setsToday, setSetsToday] = useState(1);
  const [dailyQuote, setDailyQuote] = useState('');
  const [completedRepsToday, setCompletedRepsToday] = useState(repCount);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [totalSessions, setTotalSessions] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [reward, setReward] = useState<WorkoutXpReward | null>(null);
  const [animatedRewardXp, setAnimatedRewardXp] = useState(0);
  const [badgeRewards, setBadgeRewards] = useState<BadgeUnlockResult[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [completedDaysThisWeek, setCompletedDaysThisWeek] = useState(0);
  const [recoverySummary, setRecoverySummary] = useState<SessionRecoverySummary | null>(null);
  const [proofThemeId, setProofThemeId] = useState<ProofCardThemeId | null>(null);
  const proofTheme = getProofCardTheme(proofThemeId);

  // Hold the card for 2s before revealing buttons
  useEffect(() => {
    const t = setTimeout(() => setButtonsVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    getEquippedCosmetics()
      .then((equipped) => {
        if (mounted) setProofThemeId(equipped.proofCardTheme);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const rewardXpTotal =
    (reward?.daily ?? 0) +
    (reward?.milestone ?? 0) +
    (recoverySummary?.recoveryXpAwarded ?? 0) +
    badgeRewards.reduce((sum, badge) => sum + badge.xpAwarded, 0);

  useEffect(() => {
    if (rewardXpTotal <= 0) {
      setAnimatedRewardXp(0);
      return;
    }

    setAnimatedRewardXp(0);
    const startedAt = Date.now();
    const countDurationMs = 850;
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / countDurationMs);
      setAnimatedRewardXp(Math.round(rewardXpTotal * progress));
      if (progress >= 1) clearInterval(timer);
    }, 30);

    return () => clearInterval(timer);
  }, [rewardXpTotal]);

  // Streak + personal best + sets today + user profile
  useEffect(() => {
    let mounted = true;

    const existingRun = rewardEventRunRef.current;
    const promise =
      existingRun?.eventId === sessionEventId
        ? existingRun.promise
        : (async (): Promise<CompletionLoadResult> => {
            const numericSessionId = Number.parseInt(sessionId ?? '', 10);
            const [s, best, sets, dailyReps, daysThisWeek, seed, user, recovery] =
              await Promise.all([
                getStreak(),
                getBestCompletedTime(),
                getCompletedSetsToday(),
                getCompletedRepsToday(),
                getCompletedDaysThisWeek(),
                getUserSeed(),
                getOrCreateUser(),
                getSessionRecoverySummary(
                  Number.isFinite(numericSessionId) ? numericSessionId : null
                ),
              ]);
            let earned: WorkoutXpReward | null = null;
            if (repCount >= 20) {
              // XP claims are date-idempotent in storage; this promise keeps React effect replay from
              // racing the claim while still allowing the screen to receive the eventual result.
              earned = await awardWorkoutXp(s.current, {
                nudgesUsed: nudgeCountAtCompletion,
                trackingMethod: sessionTrackingMethod,
                manualAdjustments: manualAdjustmentCount,
              });
              void syncCompletionToCloud(s.current);
            }

            const unlockedBadges =
              sessionRecoveryType === 'none'
                ? await evaluateBadgeUnlocks({
                    event: isTestMode ? 'monthly_test_completed' : 'workout_completed',
                    reps: repCount,
                    durationMs,
                    mode: workoutMode,
                    manualAdjustments: manualAdjustmentCount,
                    trackingMethod: sessionTrackingMethod,
                    nudgesUsed: nudgeCountAtCompletion,
                    eventId: sessionEventId,
                  })
                : [];
            const xp = await getXp();
            scheduleSharedJust20StatusUpdate();

            return {
              streakCurrent: s.current,
              isPersonalBest:
                repCount >= 20 && best !== null && durationMs > 0 && durationMs <= best,
              setsToday: sets,
              completedRepsToday: Math.max(dailyReps, repCount),
              completedDaysThisWeek: daysThisWeek,
              totalSessions: s.totalSessions,
              inviteCode: user.inviteCode,
              dailyQuote: getDailyQuote(seed),
              recoverySummary: recovery,
              reward: earned,
              badgeRewards: unlockedBadges,
              totalXp: xp.totalEarned,
            };
          })();

    if (existingRun?.eventId !== sessionEventId) {
      rewardEventRunRef.current = { eventId: sessionEventId, promise };
    }

    promise
      .then((result) => {
        if (!mounted) return;
        setStreak(result.streakCurrent);
        setSetsToday(result.setsToday);
        setCompletedRepsToday(result.completedRepsToday);
        setCompletedDaysThisWeek(result.completedDaysThisWeek);
        setTotalSessions(result.totalSessions);
        setInviteCode(result.inviteCode);
        setDailyQuote(result.dailyQuote);
        setRecoverySummary(result.recoverySummary);
        setIsPB(result.isPersonalBest);
        setReward(result.reward);
        setBadgeRewards(result.badgeRewards);
        setTotalXp(result.totalXp);
      })
      .catch((error) => {
        if (rewardEventRunRef.current?.eventId === sessionEventId) {
          rewardEventRunRef.current = null;
        }
        devLog('completion_rewards_failed', {
          message: error instanceof Error ? error.message : String(error),
        });
        // Completion proof card should stay usable even if rewards/social state fails.
      });

    return () => {
      mounted = false;
    };
  }, [
    durationMs,
    isTestMode,
    manualAdjustmentCount,
    nudgeCountAtCompletion,
    repCount,
    sessionEventId,
    sessionId,
    sessionRecoveryType,
    sessionTrackingMethod,
    workoutMode,
  ]);

  // Show milestone celebration 2.4s after load (just after buttons appear)
  useEffect(() => {
    if (streak > 0 && isMilestoneDay(streak)) {
      const t = setTimeout(() => setShowMilestone(true), 2400);
      return () => clearTimeout(t);
    }
  }, [streak]);

  async function handleAddLocation() {
    if (locationStatus === 'loading') return;
    setLocationStatus('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      const parts = place
        ? [place.district || place.subregion || place.street, place.city || place.region].filter(
            Boolean
          )
        : [];

      if (parts.length) {
        setLocationName(parts.join(', '));
        setLocationStatus('added');
      } else {
        setLocationStatus('error');
      }
    } catch {
      setLocationStatus('error');
    }
  }

  async function handleShareInvite() {
    const payload = isTestMode
      ? buildSharePayload('monthly_test', {
          reps: repCount,
          durationSeconds: durationSec > 0 ? durationSec : null,
          inviteCode,
        })
      : isDuelMode
        ? buildSharePayload('duel', {
            inviteCode,
            targetSeconds: durationSec > 0 ? durationSec : duelTargetSec,
            streakDays: streak,
            source: 'completion',
          })
        : buildSharePayload('challenge', {
            inviteCode,
            streakDays: streak,
            challengeDays: 7,
            source: 'completion',
          });
    const shared = await shareGrowthPayload(payload, 'completion_invite');
    if (!shared) devLog('share_invite_failed', { surface: 'completion_invite' });
  }

  async function handleInstagramShare() {
    if (!shotRef.current) return;
    setSharing(true);
    try {
      await recordGrowthEvent({
        eventType: 'share_opened',
        context: 'completion',
        source: 'completion',
        campaign: 'proof_card',
        inviteCode,
        metadata: { surface: 'proof_card', platform: 'instagram_story' },
      });
      const uri = await (shotRef.current as any).capture();
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        try {
          await Linking.openURL('instagram-stories://share');
        } catch {
          await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        }
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      }
    } catch (error) {
      await recordGrowthEvent({
        eventType: 'share_failed',
        context: 'completion',
        source: 'completion',
        campaign: 'proof_card',
        inviteCode,
        metadata: {
          surface: 'proof_card',
          platform: 'instagram_story',
          message: error instanceof Error ? error.message : String(error),
        },
      });
      devLog('instagram_share_failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSharing(false);
    }
  }

  async function handleSystemProofShare() {
    if (!shotRef.current) return;
    setSharing(true);
    try {
      await recordGrowthEvent({
        eventType: 'share_opened',
        context: 'completion',
        source: 'completion',
        campaign: 'proof_card',
        inviteCode,
        metadata: { surface: 'proof_card', platform: 'system_share' },
      });
      const uri = await (shotRef.current as any).capture();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      } else {
        await Share.share({ message: `Just did ${repCount} pushups on Just 20. #just20` });
      }
    } catch (error) {
      await recordGrowthEvent({
        eventType: 'share_failed',
        context: 'completion',
        source: 'completion',
        campaign: 'proof_card',
        inviteCode,
        metadata: {
          surface: 'proof_card',
          platform: 'system_share',
          message: error instanceof Error ? error.message : String(error),
        },
      });
      devLog('system_proof_share_failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSharing(false);
    }
  }

  const isStreakMilestone = streak > 0 && isMilestoneDay(streak);
  const milestoneLine = isStreakMilestone ? (MILESTONE_COPY[streak] ?? '').split('\n')[1] : null;

  const displayReps =
    sessionRecoveryType !== 'none'
      ? repCount
      : isTestMode
        ? repCount
        : isDuelMode
          ? repCount
          : setsToday > 1
            ? completedRepsToday
            : repCount;
  const repLabel =
    sessionRecoveryType === 'streak_patch'
      ? `streak patch · target ${sessionTargetReps}`
      : sessionRecoveryType === 'debt_set'
        ? `debt set · target ${sessionTargetReps}`
        : isTestMode
          ? 'test reps'
          : isDuelMode
            ? 'duel reps'
            : setsToday > 1
              ? `pushups · ${setsToday} sets`
              : 'pushups';
  const tagline = isTestMode
    ? 'monthly receipt, no hiding.'
    : isDuelMode
      ? 'duel receipt, clean reps only.'
      : setsToday > 1
        ? `built different, ${setsToday} sets strong.`
        : 'built different, one set at a time.';
  const proofLabel = isTestMode ? 'Monthly Test' : isDuelMode ? 'Duel Proof' : 'Proof Card';
  const recoveryCopy = getRecoveryCopy(recoverySummary, sessionRecoveryType, repairedDate ?? null);
  const inviteLabel = isTestMode
    ? 'Share test'
    : isDuelMode
      ? 'Call a rematch'
      : totalSessions === 1
        ? 'Bring a friend'
        : 'Start a challenge';
  const inviteSub = isTestMode
    ? 'Turn the 30-day test into a receipt.'
    : isDuelMode
      ? 'Make someone beat this time.'
      : 'Make this a 7-day pushup pact.';
  const chestDays = Math.min(completedDaysThisWeek, WEEKLY_CHEST_TARGET);
  const chestProgress = (chestDays / WEEKLY_CHEST_TARGET) * 100;
  const badgeTease =
    badgeRewards.length > 0
      ? `${badgeRewards[0].definition.icon} ${badgeRewards[0].definition.name} unlocked`
      : isStreakMilestone
        ? 'Milestone badge is live'
        : 'Next badges track streaks, clean reps, and consistency';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: proofTheme.cardBg }]}>
      <ScrollView
        contentContainerStyle={[styles.screenContent, { backgroundColor: proofTheme.cardBg }]}
        showsVerticalScrollIndicator={false}
      >
        <ViewShot
          ref={shotRef}
          options={{ format: 'png', quality: 1.0 }}
          style={[styles.card, { backgroundColor: proofTheme.cardBg }]}
        >
          <View style={styles.cardTop}>
            <BrandLogo size="sm" />
            <Text style={styles.tagline}>{tagline}</Text>
          </View>
          <View
            style={[
              styles.proofStamp,
              { backgroundColor: proofTheme.stampBg, borderColor: proofTheme.stampBorder },
            ]}
          >
            <Text style={[styles.proofStampText, { color: proofTheme.stampText }]}>
              {proofLabel}
            </Text>
          </View>

          <View style={styles.repBlock}>
            <Text style={styles.repNum}>{displayReps}</Text>
            <Text style={styles.repLabel}>{repLabel}</Text>
          </View>

          <View style={styles.pillRow}>
            {isPB && (
              <View style={[styles.pill, styles.pbPill]}>
                <Text style={styles.pillText}>Personal Best 🏆</Text>
              </View>
            )}
            {durationSec > 0 && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>in {durationSec}s</Text>
              </View>
            )}
            {sessionTrackingMethod !== 'camera' && (
              <View style={[styles.pill, styles.manualPill]}>
                <Text style={styles.pillText}>
                  {sessionTrackingMethod === 'manual' ? 'Manual save' : 'Count fixed manually'}
                </Text>
              </View>
            )}
            {recoveryCopy && (
              <View style={[styles.pill, styles.recoveryPill]}>
                <Text style={styles.pillText}>{recoveryCopy}</Text>
              </View>
            )}
            {recoverySummary && recoverySummary.recoveryXpAwarded > 0 && (
              <View style={[styles.pill, styles.xpPill]}>
                <Text style={styles.pillText}>
                  +{recoverySummary.recoveryXpAwarded} recovery XP
                </Text>
              </View>
            )}
            {reward && reward.daily > 0 && (
              <View style={[styles.pill, styles.xpPill]}>
                <Text style={styles.pillText}>
                  +{reward.daily} XP · {reward.label}
                </Text>
              </View>
            )}
            {reward && reward.milestone > 0 && (
              <View style={[styles.pill, styles.xpPill]}>
                <Text style={styles.pillText}>+{reward.milestone} milestone XP</Text>
              </View>
            )}
            {badgeRewards.map((badge) => (
              <View key={badge.definition.id} style={[styles.pill, styles.badgePill]}>
                <Text style={styles.pillText}>
                  {badge.definition.icon} {badge.definition.name} +{badge.xpAwarded} XP
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.proofGrid}>
            <View
              style={[
                styles.proofMetric,
                { backgroundColor: proofTheme.metricBg, borderColor: proofTheme.metricBorder },
              ]}
            >
              <Text style={styles.proofMetricValue}>
                {durationSec > 0 ? `${durationSec}s` : '—'}
              </Text>
              <Text style={styles.proofMetricLabel}>time</Text>
            </View>
            <View
              style={[
                styles.proofMetric,
                { backgroundColor: proofTheme.metricBg, borderColor: proofTheme.metricBorder },
              ]}
            >
              <Text style={styles.proofMetricValue}>{streak}</Text>
              <Text style={styles.proofMetricLabel}>streak</Text>
            </View>
            <View
              style={[
                styles.proofMetric,
                { backgroundColor: proofTheme.metricBg, borderColor: proofTheme.metricBorder },
              ]}
            >
              <Text style={styles.proofMetricValue}>{reward?.daily ?? 0}</Text>
              <Text style={styles.proofMetricLabel}>xp</Text>
            </View>
          </View>

          {locationName ? (
            <Text style={[styles.location, { color: proofTheme.subtleText }]}>
              @ {locationName}
            </Text>
          ) : null}

          {/* Streak display — prominent "DAY X" identity marker */}
          {streak > 0 && (
            <View style={styles.streakBlock}>
              <Text style={[styles.streakDay, { color: proofTheme.accent }]}>DAY {streak}</Text>
              {isStreakMilestone && milestoneLine ? (
                <Text style={styles.streakMilestone}>{milestoneLine}</Text>
              ) : (
                <Text style={styles.streakFlame}>🔥</Text>
              )}
            </View>
          )}

          <View style={styles.cardBottom}>
            {dailyQuote ? <Text style={styles.dailyQuote}>{`"${dailyQuote}"`}</Text> : null}
            <Text style={[styles.hashtag, { color: proofTheme.subtleText }]}>#just20</Text>
          </View>
        </ViewShot>

        <View style={[styles.actions, { backgroundColor: proofTheme.cardBg }]}>
          {buttonsVisible ? (
            <>
              <View style={styles.rewardMoment}>
                <View style={styles.rewardMomentTop}>
                  <View>
                    <Text style={styles.rewardMomentTitle}>Reward unlocked</Text>
                    <Text style={styles.rewardMomentTotal}>Total XP {totalXp}</Text>
                  </View>
                  <Text style={styles.rewardMomentBadge}>+{animatedRewardXp} XP</Text>
                </View>
                <View style={styles.rewardMomentGrid}>
                  <View style={styles.rewardTile}>
                    <Text style={styles.rewardTileValue}>+{animatedRewardXp}</Text>
                    <Text style={styles.rewardTileLabel}>XP earned</Text>
                  </View>
                  <View style={styles.rewardRingTile}>
                    <View style={styles.rewardRing}>
                      <Text style={styles.rewardRingValue}>{streak}</Text>
                    </View>
                    <Text style={styles.rewardTileLabel}>day streak</Text>
                  </View>
                  <View style={styles.rewardTile}>
                    <Text style={styles.rewardTileValue}>
                      {chestDays}/{WEEKLY_CHEST_TARGET}
                    </Text>
                    <Text style={styles.rewardTileLabel}>chest</Text>
                    <View style={styles.rewardChestTrack}>
                      <View style={[styles.rewardChestFill, { width: `${chestProgress}%` }]} />
                    </View>
                  </View>
                </View>
                <Text style={styles.badgeTeaseText}>{badgeTease}</Text>
              </View>
              {!locationName && (
                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={handleAddLocation}
                  disabled={locationStatus === 'loading'}
                  activeOpacity={0.75}
                >
                  <Text style={styles.locationBtnText}>
                    {locationStatus === 'loading'
                      ? 'Adding location...'
                      : locationStatus === 'denied'
                        ? 'Location skipped'
                        : locationStatus === 'error'
                          ? 'Location unavailable'
                          : 'Add location to card'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.igBtn, sharing && styles.igBtnDisabled]}
                onPress={handleSystemProofShare}
                disabled={sharing}
                activeOpacity={0.85}
              >
                {sharing ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.igBtnText}>Share proof card</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.doAnotherBtn, sharing && styles.igBtnDisabled]}
                onPress={handleInstagramShare}
                disabled={sharing}
                activeOpacity={0.85}
              >
                <Text style={styles.doAnotherBtnText}>Post to Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doAnotherBtn}
                onPress={() => router.replace('/workout')}
                activeOpacity={0.8}
              >
                <Text style={styles.doAnotherBtnText}>Do another set 🔥</Text>
              </TouchableOpacity>
              {inviteCode ? (
                <View style={styles.inviteBanner}>
                  <Text style={styles.inviteLabel}>{inviteLabel}</Text>
                  <Text style={styles.inviteCode}>{inviteCode}</Text>
                  <Text style={styles.inviteSub}>{inviteSub}</Text>
                  <TouchableOpacity onPress={handleShareInvite} activeOpacity={0.8}>
                    <Text style={styles.inviteShareText}>
                      {isTestMode
                        ? 'Share test →'
                        : isDuelMode
                          ? 'Share duel →'
                          : 'Share challenge →'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/squad' as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.inviteShareText}>Invite to squad →</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.6}>
                <Text style={styles.skipText}>skip →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ height: 80 }} />
          )}
        </View>
      </ScrollView>

      <MilestoneCelebration
        streak={streak}
        visible={showMilestone}
        onDismiss={() => setShowMilestone(false)}
      />
      <BadgeUnlockCelebration rewards={badgeRewards} />
      {visualShareElement}
    </SafeAreaView>
  );
}

function getRecoveryCopy(
  recovery: SessionRecoverySummary | null,
  fallbackType: RecoveryType,
  fallbackDate: string | null
): string | null {
  const recoveryType = recovery?.recoveryType ?? fallbackType;
  if (recoveryType === 'none') return null;

  const repaired = recovery?.repairedDate ?? fallbackDate;
  const dateLabel = repaired ? ` for ${repaired}` : '';

  if (recoveryType === 'streak_patch') {
    if (recovery?.recoveryStatus === 'completed') return `Streak Patch saved${dateLabel}`;
    return `Streak Patch attempted${dateLabel}`;
  }

  if (recovery?.recoveryStatus === 'completed') return `Debt cleared${dateLabel}`;
  if (recovery?.recoveryStatus === 'active' || recovery?.recoveryStatus === 'pending') {
    return `Debt Set started${dateLabel}`;
  }
  return `Debt Set attempted${dateLabel}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CARD_BG },
  screenContent: {
    paddingBottom: spacing.xl,
  },
  card: {
    minHeight: 560,
    backgroundColor: CARD_BG,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + spacing.lg,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  cardTop: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    gap: 2,
  },
  proofStamp: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.48)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,107,53,0.13)',
  },
  proofStampText: {
    color: colors.streak,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  repBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  repNum: {
    fontSize: 128,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 118,
    letterSpacing: -8,
  },
  repLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pbPill: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  xpPill: {
    backgroundColor: colors.streak,
    borderColor: colors.streak,
  },
  badgePill: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  recoveryPill: {
    backgroundColor: colors.ice,
    borderColor: colors.ice,
  },
  manualPill: {
    backgroundColor: '#6F6F6F',
    borderColor: '#6F6F6F',
  },
  pillText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  proofGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  proofMetric: {
    minWidth: 76,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  proofMetricValue: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  proofMetricLabel: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rewardMoment: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: spacing.sm,
  },
  rewardMomentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rewardMomentTitle: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rewardMomentTotal: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  rewardMomentBadge: {
    color: colors.yellow,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  rewardMomentGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rewardTile: {
    flex: 1,
    minHeight: 66,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.sm,
    justifyContent: 'center',
    gap: 2,
  },
  rewardRingTile: {
    flex: 1,
    minHeight: 66,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,159,28,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,28,0.28)',
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rewardTileValue: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  rewardTileLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: colors.streak,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,159,28,0.2)',
  },
  rewardRingValue: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  rewardChestTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  rewardChestFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.brand,
  },
  badgeTeaseText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: fontSize.xs,
    fontWeight: '800',
    textAlign: 'center',
  },
  location: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  // New prominent streak identity block
  streakBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  streakDay: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.streak,
    letterSpacing: -1,
  },
  streakFlame: {
    fontSize: 24,
  },
  streakMilestone: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  cardBottom: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
    gap: 4,
  },
  tagline: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
  },
  dailyQuote: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 4,
  },
  hashtag: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '700',
    letterSpacing: 1,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: CARD_BG,
  },
  igBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  igBtnDisabled: { opacity: 0.6 },
  igBtnText: {
    color: '#000000',
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  locationBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  locationBtnText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  doAnotherBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  doAnotherBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: fontSize.sm,
    fontWeight: '500',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  inviteBanner: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  inviteLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  inviteSub: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.48)',
    fontWeight: '600',
  },
  inviteShareText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.streak,
    marginTop: 2,
  },
});
