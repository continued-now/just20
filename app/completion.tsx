import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { getStreak, getBestCompletedTime, getCompletedSetsToday, getUserSeed } from '../lib/db';
import { awardWorkoutCoins } from '../lib/coins';
import { syncCompletionToCloud } from '../lib/social';
import { getOrCreateUser } from '../lib/user';
import { getDailyQuote } from '../lib/quotes';
import { isMilestoneDay, MILESTONE_COPY } from '../lib/milestones';
import { MilestoneCelebration } from '../components/MilestoneCelebration';

const CARD_BG = '#0F0F0F';
type LocationStatus = 'idle' | 'loading' | 'added' | 'denied' | 'error';

export default function CompletionScreen() {
  const { reps, duration } = useLocalSearchParams<{ reps: string; duration: string }>();
  const router = useRouter();
  const shotRef = useRef<ViewShot>(null);

  const repCount = parseInt(reps ?? '20', 10);
  const durationMs = parseInt(duration ?? '0', 10);
  const durationSec = Math.round(durationMs / 1000);

  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isPB, setIsPB] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [setsToday, setSetsToday] = useState(1);
  const [dailyQuote, setDailyQuote] = useState('');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [totalSessions, setTotalSessions] = useState(0);
  const [inviteCode, setInviteCode] = useState('');

  // Hold the card for 2s before revealing buttons
  useEffect(() => {
    const t = setTimeout(() => setButtonsVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Streak + personal best + sets today + user profile
  useEffect(() => {
    (async () => {
      const [s, best, sets, seed, user] = await Promise.all([
        getStreak(),
        getBestCompletedTime(),
        getCompletedSetsToday(),
        getUserSeed(),
        getOrCreateUser(),
      ]);
      setStreak(s.current);
      setSetsToday(sets);
      setTotalSessions(s.totalSessions);
      setInviteCode(user.inviteCode);
      setDailyQuote(getDailyQuote(seed));
      if (repCount >= 20 && best !== null && durationMs > 0 && durationMs <= best) {
        setIsPB(true);
      }
      // Award daily coins + milestone bonus, sync status to cloud
      await awardWorkoutCoins(s.current);
      syncCompletionToCloud(s.current); // fire-and-forget
    })();
  }, []);

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
        ? [
            place.district || place.subregion || place.street,
            place.city || place.region,
          ].filter(Boolean)
        : [];

      if (parts.length) {
        setLocationName(parts.join(', '));
        setLocationStatus('added');
      } else {
        setLocationStatus('error');
      }
    } catch (_) {
      setLocationStatus('error');
    }
  }

  async function handleShareInvite() {
    const text = `I just did 20 pushups with Just20 🔥\n\nJoin me — add me with code: ${inviteCode}\n\n#just20 #fitness`;
    try { await Share.share({ message: text }); } catch { /* dismissed */ }
  }

  async function handleInstagramShare() {
    if (!shotRef.current) return;
    setSharing(true);
    try {
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
    } catch (_) {
    } finally {
      setSharing(false);
    }
  }

  const isStreakMilestone = streak > 0 && isMilestoneDay(streak);
  const milestoneLine = isStreakMilestone
    ? (MILESTONE_COPY[streak] ?? '').split('\n')[1]
    : null;

  const displayReps = setsToday > 1 ? setsToday * 20 : repCount;
  const repLabel = setsToday > 1 ? `pushups · ${setsToday} sets` : 'pushups';
  const tagline = setsToday > 1
    ? `built different, ${setsToday} sets strong.`
    : 'built different, one set at a time.';

  return (
    <SafeAreaView style={styles.safe}>
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1.0 }} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.brand}>just20</Text>
          <Text style={styles.tagline}>{tagline}</Text>
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
        </View>

        {locationName ? <Text style={styles.location}>@ {locationName}</Text> : null}

        {/* Streak display — prominent "DAY X" identity marker */}
        {streak > 0 && (
          <View style={styles.streakBlock}>
            <Text style={styles.streakDay}>DAY {streak}</Text>
            {isStreakMilestone && milestoneLine ? (
              <Text style={styles.streakMilestone}>{milestoneLine}</Text>
            ) : (
              <Text style={styles.streakFlame}>🔥</Text>
            )}
          </View>
        )}

        <View style={styles.cardBottom}>
          {dailyQuote ? <Text style={styles.dailyQuote}>"{dailyQuote}"</Text> : null}
          <Text style={styles.hashtag}>#just20</Text>
        </View>
      </ViewShot>

      <View style={styles.actions}>
        {buttonsVisible ? (
          <>
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
              onPress={handleInstagramShare}
              disabled={sharing}
              activeOpacity={0.85}
            >
              {sharing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.igBtnText}>Post to Instagram</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doAnotherBtn}
              onPress={() => router.replace('/workout')}
              activeOpacity={0.8}
            >
              <Text style={styles.doAnotherBtnText}>Do another set 🔥</Text>
            </TouchableOpacity>
            {totalSessions === 1 && inviteCode ? (
              <View style={styles.inviteBanner}>
                <Text style={styles.inviteLabel}>Bring a friend</Text>
                <Text style={styles.inviteCode}>{inviteCode}</Text>
                <TouchableOpacity onPress={handleShareInvite} activeOpacity={0.8}>
                  <Text style={styles.inviteShareText}>Share your code →</Text>
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

      <MilestoneCelebration
        streak={streak}
        visible={showMilestone}
        onDismiss={() => setShowMilestone(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CARD_BG },
  card: {
    flex: 1,
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
  brand: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: -0.5,
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
  pillText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
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
  inviteShareText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.streak,
    marginTop: 2,
  },
});
