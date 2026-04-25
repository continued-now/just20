import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Mascot } from '../components/Mascot';
import { colors, fontSize, radius, spacing } from '../constants/theme';

export default function CompletionScreen() {
  const { reps, duration } = useLocalSearchParams<{ reps: string; duration: string }>();
  const router = useRouter();
  const shotRef = useRef<ViewShot>(null);

  const repCount = parseInt(reps ?? '20', 10);
  const durationSec = Math.round(parseInt(duration ?? '0', 10) / 1000);

  async function handleShare() {
    if (!shotRef.current) return;
    try {
      const uri = await shotRef.current.capture!();
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (_) {}
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95 }} style={styles.card}>
        <Text style={styles.brand}>just20</Text>
        <Mascot mood="celebrating" size={160} />
        <Text style={styles.headline}>
          {repCount >= 20 ? `${repCount} pushups done!` : `${repCount} reps today`}
        </Text>
        {durationSec > 0 && (
          <Text style={styles.sub}>finished in {durationSec}s</Text>
        )}
        <Text style={styles.tagline}>built different, one set at a time.</Text>
      </ViewShot>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share 📲</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/')}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
  },
  brand: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
  },
  headline: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: fontSize.md,
    color: colors.subtext,
    fontWeight: '500',
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  actions: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  shareBtn: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  doneBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  doneBtnText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
